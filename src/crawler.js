const axios = require("axios");
const cheerio = require("cheerio");
const pLimit = require("p-limit");
const { URL } = require("url");
const xml2js = require("xml2js");

const { writeResults } = require("./output");
const robotsParser = require("robots-parser");

class Crawler {
  constructor(options) {
    this.baseURL = options.url;
    this.domain = new URL(this.baseURL).hostname;
    this.concurrency = parseInt(options.concurrency, 10);
    this.limit = pLimit(this.concurrency);
    this.visitedUrls = new Set();
    this.outputDir = options.output;
    this.sitemapUrl = options.sitemap;
    this.verbose = options.verbose;
    this.ignoreRobots = options.ignoreRobots;
    this.robots = null;

    // Load and validate checks
    this.availableChecks = this.loadChecks();
    const requestedChecks = options.checks
      ? options.checks.split(",")
      : this.availableChecks.map((c) => c.name);
    this.checks = this.validateChecks(requestedChecks);

    // Initialize results object dynamically
    this.results = {
      errors: [],
    };
    this.checks.forEach((checkName) => {
      this.results[checkName] = [];
    });

    this.axiosInstance = axios.create({
      headers: {
        "User-Agent":
          "gaambo-accessibility-crawler/1.0 (+https://github.com/gaambo)",
      },
    });
  }

  async start() {
    await this.initializeRobotsParser();
    console.log(
      `Starting crawl on ${this.baseURL} with concurrency ${this.concurrency}`
    );
    const initialUrls = await this.getInitialUrls();

    for (const url of initialUrls) {
      if (!this.visitedUrls.has(url)) {
        this.limit(() => this.crawlAndQueue(url));
      }
    }

    await this.waitForIdle();
    console.log(
      `Crawl finished. Visited ${this.visitedUrls.size} unique pages.`
    );
    await writeResults(this.results, this.availableChecks, this.outputDir);
  }

  async crawlAndQueue(url) {
    if (
      this.robots &&
      !this.robots.isAllowed(
        url,
        this.axiosInstance.defaults.headers["User-Agent"]
      )
    ) {
      if (this.verbose) {
        console.log(`Skipping disallowed URL: ${url}`);
      }
      return;
    }

    if (this.visitedUrls.has(url)) return;
    this.visitedUrls.add(url);

    const newLinks = await this.crawlPage(url);
    if (newLinks) {
      for (const link of newLinks) {
        if (!this.visitedUrls.has(link)) {
          this.limit(() => this.crawlAndQueue(link));
        }
      }
    }
  }

  async crawlPage(url) {
    if (this.verbose) console.log(`Crawling: ${url}`);
    const newLinks = new Set();
    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      for (const check of this.availableChecks) {
        if (this.checks.includes(check.name)) {
          const issues = check.check($);
          if (issues.length > 0) {
            // Add the page URL to each issue
            const issuesWithUrl = issues.map((issue) => ({ url, ...issue }));
            this.results[check.name].push(...issuesWithUrl);
          }
        }
      }

      $("a[href]").each((i, link) => {
        const href = $(link).attr("href");
        if (!href) return;

        try {
          const absoluteUrl = new URL(href, url).href.split("#")[0];
          if (this.isInternal(absoluteUrl)) {
            newLinks.add(absoluteUrl);
          }
        } catch (e) {
          // Ignore invalid URLs
        }
      });
    } catch (error) {
      this.results.errors.push({ url, message: error.message });
      if (this.verbose)
        console.error(`Error crawling ${url}: ${error.message}`);
    }
    return [...newLinks];
  }

  async getInitialUrls() {
    if (!this.sitemapUrl) {
      return [this.baseURL];
    }

    console.log(`Fetching sitemap from ${this.sitemapUrl}`);
    try {
      const response = await this.axiosInstance.get(this.sitemapUrl);
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      const urls = result.urlset.url.map((u) => u.loc[0]);
      console.log(`Found ${urls.length} URLs in sitemap.`);
      return urls;
    } catch (error) {
      console.error(`Failed to fetch or parse sitemap: ${error.message}`);
      console.log("Falling back to crawling from base URL only.");
      return [this.baseURL];
    }
  }

  waitForIdle() {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        this.updateProgress();
        if (this.limit.activeCount === 0 && this.limit.pendingCount === 0) {
          clearInterval(interval);
          if (!this.verbose) {
            process.stdout.write("\n"); // End the progress line
          }
          resolve();
        }
      }, 100);
    });
  }

  updateProgress() {
    if (this.verbose) return;
    const crawledCount = this.visitedUrls.size;
    const pendingCount = this.limit.pendingCount;
    const activeCount = this.limit.activeCount;
    process.stdout.write(
      `Crawled: ${crawledCount} | Queued: ${pendingCount} | Active: ${activeCount} \r`
    );
  }

  async initializeRobotsParser() {
    if (this.ignoreRobots) {
      if (this.verbose) console.log("Ignoring robots.txt");
      return;
    }

    const robotsUrl = new URL("/robots.txt", this.baseURL).href;
    if (this.verbose) console.log(`Fetching robots.txt from ${robotsUrl}`);

    try {
      const response = await this.axiosInstance.get(robotsUrl);
      this.robots = robotsParser(robotsUrl, response.data);
      if (this.verbose) console.log("Successfully parsed robots.txt");
    } catch (error) {
      if (error.response && error.response.status === 404) {
        if (this.verbose)
          console.log("robots.txt not found. Crawling all paths.");
      } else {
        console.error(`Failed to fetch or parse robots.txt: ${error.message}`);
      }
      // If robots.txt is missing or fails to parse, we allow crawling all paths.
      this.robots = null;
    }
  }

  isInternal(url) {
    try {
      return new URL(url).hostname === this.domain;
    } catch (error) {
      return false;
    }
  }

  loadChecks() {
    // This will automatically load and use src/checks/index.js
    const checks = require("./checks");

    if (this.verbose) {
      console.log(`Loaded checks: ${checks.map((c) => c.name).join(", ")}`);
    }

    return checks;
  }

  validateChecks(requestedChecks) {
    const availableCheckNames = this.availableChecks.map((c) => c.name);
    const validChecks = requestedChecks.filter((checkName) => {
      const isValid = availableCheckNames.includes(checkName);
      if (!isValid) {
        console.warn(`Warning: Unknown check '${checkName}' will be ignored.`);
      }
      return isValid;
    });

    if (this.verbose) {
      console.log(`Enabled checks: ${validChecks.join(", ")}`);
    }

    return validChecks;
  }
}

module.exports = Crawler;
