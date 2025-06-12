const axios = require("axios");
const cheerio = require("cheerio");
const pLimit = require("p-limit");
const { URL } = require("url");
const { writeResults } = require("./output");
const { parseSitemap } = require("./sitemap-parser");
const PageProcessor = require("./page-processor");
const RobotsHandler = require("./robots-handler");

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

    // Initialize axiosInstance first as RobotsHandler and SitemapParser depend on it
    this.axiosInstance = axios.create({
      headers: {
        "User-Agent":
          "gaambo-accessibility-crawler/1.0 (+https://github.com/gaambo)",
      },
    });

    this.robotsHandler = new RobotsHandler(this.axiosInstance, this.verbose);

    // Enabled checks (array of objects) are now passed in options.checks
    this.checks = options.checks;
    this.availableChecksForOutput = options.availableChecksForOutput; // For report headers

    // Initialize results object dynamically based on the names of the enabled checks
    this.results = {
      errors: [],
    };
    this.checks.forEach((checkObject) => {
      this.results[checkObject.name] = [];
    });

    this.pageProcessor = new PageProcessor(
      this.checks,
      this.domain,
      this.verbose
    );
  }

  async start() {
    await this.robotsHandler.initialize(this.baseURL, this.ignoreRobots);
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
    await writeResults(
      this.results,
      this.availableChecksForOutput,
      this.outputDir
    );
  }

  async crawlAndQueue(url) {
    if (
      !this.robotsHandler.isAllowed(
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

      const { pageResults, newLinks: extractedLinks } =
        this.pageProcessor.processPage(url, response.data);

      // Merge page check results into main results
      for (const checkName in pageResults) {
        if (pageResults[checkName].length > 0) {
          // this.results[checkName] should already be initialized
          this.results[checkName].push(...pageResults[checkName]);
        }
      }
      // Add extracted links to the main newLinks set for this crawlPage call
      extractedLinks.forEach((link) => newLinks.add(link));
    } catch (error) {
      this.results.errors.push({ url, message: error.message });
      if (this.verbose)
        console.error(`Error crawling ${url}: ${error.message}`);
    }
    return [...newLinks];
  }

  async getInitialUrls() {
    if (this.sitemapUrl) {
      const sitemapUrls = await parseSitemap(
        this.sitemapUrl,
        this.axiosInstance,
        this.verbose
      );
      if (sitemapUrls.length > 0) {
        return sitemapUrls;
      }
      if (this.verbose)
        console.log(
          "Sitemap was empty or failed to parse, falling back to base URL."
        );
    }
    return [this.baseURL];
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
}

module.exports = Crawler;
