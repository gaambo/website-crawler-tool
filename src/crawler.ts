// src/crawler.ts
import axios, { AxiosInstance } from "axios";
import pLimit, { Limit } from "p-limit";
import { URL } from "url";
import { writeResults } from "./output.js";
import { parseSitemap } from "./sitemap-parser.js";
import PageProcessor from "./page-processor.js";
import RobotsHandler from "./robots-handler.js";
import { Check, CheckIssueBase } from "./checks/index.js";
import { CliUi } from "./cli-ui.js";

interface CrawlerOptions {
  url: string;
  concurrency: string | number; // commander might pass string
  output: string;
  sitemap?: string;
  urlList?: string[];
  verbose?: boolean;
  ignoreRobots?: boolean;
  checks: Check[]; // Array of enabled check objects
  availableChecksForOutput: Check[]; // All available check objects, for output headers
}

interface CrawlResults {
  errors: CheckIssueBase[];
  [checkName: string]: CheckIssueBase[];
}

class Crawler {
  private baseURL: string;
  private domain: string;
  private concurrency: number;
  private limit: Limit;
  private visitedUrls: Set<string>;
  private outputDir: string;
  private sitemapUrl?: string;
  private urlList?: string[];
  private verbose: boolean;
  private ignoreRobots: boolean;
  private axiosInstance: AxiosInstance;
  private robotsHandler: RobotsHandler;
  private pageProcessor: PageProcessor;
  private checks: Check[]; // Enabled checks
  private availableChecksForOutput: Check[]; // All checks for output
  private results: CrawlResults;
  private isNonRecursive: boolean;
  private isInteractiveTerminal: boolean;
  private ui: CliUi;

  constructor(options: CrawlerOptions) {
    this.baseURL = options.url;
    this.domain = new URL(this.baseURL).hostname;
    this.concurrency =
      typeof options.concurrency === "string"
        ? parseInt(options.concurrency, 10)
        : options.concurrency;
    this.limit = pLimit(this.concurrency);
    this.visitedUrls = new Set<string>();
    this.outputDir = options.output;
    this.sitemapUrl = options.sitemap;
    this.urlList = options.urlList;
    this.verbose = options.verbose || false;
    this.ignoreRobots = options.ignoreRobots || false;
    this.checks = options.checks;
    this.availableChecksForOutput = options.availableChecksForOutput;
    this.isNonRecursive = !!options.urlList;
    this.isInteractiveTerminal = !!process.stdout.isTTY;
    this.ui = new CliUi({
      verbose: this.verbose,
      isInteractiveTerminal: this.isInteractiveTerminal,
    });

    this.axiosInstance = axios.create({
      timeout: 10000, // 10 second timeout
      headers: {
        "User-Agent": "website-a11y-crawler/1.0 (+https://github.com/gaambo)",
      },
      maxRedirects: 5,
    });

    this.robotsHandler = new RobotsHandler(this.axiosInstance, this.verbose);
    this.pageProcessor = new PageProcessor(
      this.checks,
      this.domain,
      this.verbose
    );

    this.results = { errors: [] };
    this.checks.forEach((checkObject) => {
      this.results[checkObject.key] = [];
    });
  }

  async start(): Promise<void> {
    this.ui.verboseLog(
      `Starting crawl on ${this.baseURL} with concurrency ${this.concurrency}`
    );
    await this.robotsHandler.initialize(this.baseURL, this.ignoreRobots);

    const initialUrls = await this.getInitialUrls();
    if (initialUrls.length === 0) {
      this.ui.log("No initial URLs to crawl.");
      return;
    }

    initialUrls.forEach((url) => this.crawlAndQueue(url));

    if (!this.verbose && this.isInteractiveTerminal) {
      this.ui.startCrawlerProgressSpinner(this.getProgressStats());
    }

    // Main loop to wait for all crawling tasks to complete.
    // It monitors p-limit's activeCount (tasks currently running) and pendingCount (tasks in the queue).
    // The loop continues as long as there's work to be done or in the queue.
    // This is essential for handling dynamically added tasks (new links found during crawl).
    this.ui.verboseLog("Initial URLs queued. Monitoring task completion...");
    while (this.limit.activeCount > 0 || this.limit.pendingCount > 0) {
      this.logProgress();
      await new Promise((resolve) => setTimeout(resolve, 250)); // Check every 250ms
    }
    this.logProgress(); // Final log update

    this.ui.stopSpinner();

    this.ui.log(
      this.ui.formatCrawlFinished(
        this.visitedUrls.size,
        this.results.errors.length
      )
    );
    await writeResults(
      this.results,
      this.availableChecksForOutput,
      this.outputDir,
      this.ui
    );
  }

  private crawlAndQueue(url: string): void {
    // No longer async, does not return Promise

    // Allow-list for file extensions likely to serve HTML content, or no extension (clean URLs).
    const ALLOWED_EXTENSIONS = [
      "html",
      "htm",
      "php",
      "asp",
      "aspx",
      "jsp",
      "do", // Common server-side script extensions
      // Add any other specific extensions that commonly serve HTML in your target environments
    ];

    try {
      const parsedUrl = new URL(url);
      const pathName = parsedUrl.pathname;

      // Check for a file extension in the last path segment
      const lastSegment = pathName.substring(pathName.lastIndexOf("/") + 1);
      const dotIndex = lastSegment.lastIndexOf(".");

      if (dotIndex === -1 || dotIndex === 0) {
        // No extension found (e.g., /about-us) or dot is at the beginning (e.g. /.well-known/)
        // These are typically fine to crawl as they might be clean URLs or special paths.
        // if (this.verbose && dotIndex === 0) {
        //   console.log(`Processing URL with leading dot in last segment: ${url}`);
        // } else if (this.verbose && dotIndex === -1) {
        //   console.log(`Processing URL with no file extension: ${url}`);
        // }
      } else {
        // Extension found
        const extension = lastSegment.substring(dotIndex + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
          if (this.verbose) {
            this.ui.verboseLog(
              `Skipping URL with non-allowed file extension '.${extension}': ${url}`
            );
          }
          return; // Skip processing this URL
        }
      }
    } catch (e: any) {
      // If URL parsing fails, it's likely an invalid URL. Log and skip.
      if (this.verbose) {
        this.ui.verboseError(
          `Skipping invalid URL (cannot parse): ${url} - Error: ${e.message}`
        );
      }
      this.results.errors.push({ url, message: `Invalid URL: ${e.message}` });
      return;
    }

    if (
      !this.robotsHandler.isAllowed(
        url,
        this.axiosInstance.defaults.headers["User-Agent"] as string
      )
    ) {
      if (this.verbose) {
        this.ui.verboseLog(`Skipping disallowed URL: ${url}`);
      }
      return;
    }

    if (this.visitedUrls.has(url)) {
      return;
    }
    this.visitedUrls.add(url);
    this.logProgress();

    // Add the URL processing task to the p-limit queue.
    // The .catch() here is vital: it handles errors from individual page processing (processUrl).
    // This ensures that a failure on one page doesn't stop the entire crawl.
    // Errors are logged and added to the results.errors array for reporting.
    this.limit(() => this.processUrl(url)).catch((err) => {
      this.ui.verboseError(
        `Error processing task for ${url} in p-limit: ${err.message}`
      );
      // Optionally, add to a general error list or handle more gracefully
      this.results.errors.push({
        url,
        message: `Task processing error: ${err.message}`,
      });
    });
  }

  private async processUrl(url: string): Promise<void> {
    this.ui.verboseLog(`Processing: ${url}`);
    const newLinks = await this.crawlPage(url);
    if (!this.isNonRecursive) {
      newLinks.forEach((link) => this.crawlAndQueue(link)); // Queue new links without await
    }
  }

  private async crawlPage(url: string): Promise<string[]> {
    const newLinksFound: Set<string> = new Set();
    try {
      const response = await this.axiosInstance.get(url);
      // const $ = cheerio.load(response.data); // Not needed directly in Crawler anymore

      const { pageResults, newLinks: extractedLinks } =
        await this.pageProcessor.processPage(url, response.data);

      for (const checkName in pageResults) {
        if (pageResults[checkName].length > 0) {
          this.results[checkName].push(...pageResults[checkName]);
        }
      }
      extractedLinks.forEach((link) => newLinksFound.add(link));
    } catch (error: any) {
      this.results.errors.push({ url, message: error.message });
      this.ui.verboseError(`Error crawling ${url}: ${error.message}`);
    }
    return [...newLinksFound];
  }

  private async getInitialUrls(): Promise<string[]> {
    if (this.urlList) {
      return this.urlList;
    }

    if (this.sitemapUrl) {
      const sitemapUrls = await parseSitemap(
        this.sitemapUrl,
        this.axiosInstance,
        this.verbose
      );
      if (sitemapUrls.length > 0) {
        return sitemapUrls;
      }
      this.ui.verboseLog(
        "Sitemap was empty or failed to parse, falling back to base URL."
      );
    }
    return [this.baseURL];
  }

  private logProgress(): void {
    this.ui.renderCrawlerProgress(this.getProgressStats());
  }

  private getProgressStats(): {
    crawledCount: number;
    pendingCount: number;
    activeCount: number;
    errorCount: number;
  } {
    return {
      crawledCount: this.visitedUrls.size,
      pendingCount: this.limit.pendingCount,
      activeCount: this.limit.activeCount,
      errorCount: this.results.errors.length,
    };
  }
}

export default Crawler;
