#!/usr/bin/env node
// src/index.ts

// Global handler for unhandled promise rejections.
// This catches any promises that are rejected but do not have a .catch() handler.
// It's crucial for preventing silent failures and ensuring all errors are logged.
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // TODO: Consider more sophisticated error logging or exit strategy
  process.exit(1);
});

// Global handler for uncaught synchronous exceptions.
// This is a last resort for errors not caught by try...catch blocks.
// Helps in logging critical errors before the process terminates.
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // TODO: Consider more sophisticated error logging or exit strategy
  process.exit(1);
});

import { Command } from "commander";
import Crawler from "./crawler.js";
import {
  checks as availableChecks,
  determineEnabledChecks,
} from "./checks/index.js"; // Renamed 'checks' to 'availableChecks' for clarity here
import { ensureOutputDirectory } from "./output.js"; // ensureOutputDirectory is used implicitly by writeResults, but good to have if needed directly
import { parseUrlList } from "./url-list-parser.js";

// Define an interface for the command line options
interface CliOptions {
  url?: string;
  sitemap?: string;
  urlList?: string;
  concurrency: string;
  output: string;
  verbose?: boolean;
  ignoreRobots?: boolean;
  checks?: string; // Comma-separated string of check names
}

const program = new Command();

program
  .version("1.0.0")
  .description("A CLI tool to crawl a website and run accessibility checks.")
  .option("-u, --url <url>", "The base URL to start crawling from.")
  .option(
    "-s, --sitemap <url>",
    "The URL of the sitemap to crawl. Overrides --url if both provided for starting points."
  )
  .option(
    "-l, --url-list <file>",
    "File containing list of URLs to crawl (JSON or CSV format)."
  )
  .option("-c, --concurrency <number>", "Number of concurrent requests.", "5")
  .option("-o, --output <directory>", "Directory to save results.", "./results")
  .option("-v, --verbose", "Enable verbose logging.")
  .option("--ignore-robots", "Ignore robots.txt rules.")
  .option(
    "-k, --checks <list>",
    "Comma-separated list of checks to run (e.g., Headings,Images). Runs all if not specified."
  );

program.parse(process.argv);

async function main() {
  const options = program.opts<CliOptions>();

  if (!options.url && !options.sitemap && !options.urlList) {
    console.error(
      "Error: You must provide either a URL with -u, a sitemap URL with -s, or a URL list file with -l."
    );
    program.help(); // Show help and exit
    process.exit(1);
  }

  let urlList: string[] | undefined;
  let baseUrlForCrawler: string;

  if (options.urlList) {
    try {
      urlList = await parseUrlList(options.urlList);
      if (urlList.length === 0) {
        console.error("Error: No valid URLs found in the URL list file.");
        process.exit(1);
      }
      baseUrlForCrawler = urlList[0];
      if (options.verbose) {
        console.log(
          `Loaded ${urlList.length} URLs from file: ${options.urlList}`
        );
      }
    } catch (error: any) {
      console.error(`Error parsing URL list file: ${error.message}`);
      process.exit(1);
    }
  } else {
    // If only sitemap is given, use it as the base URL for domain extraction, etc.
    // but the sitemap URL itself will be used for fetching the sitemap.
    baseUrlForCrawler = options.url || options.sitemap!;
  }

  const requestedCheckNames = options.checks ? options.checks.split(",") : [];
  const enabledChecks = determineEnabledChecks(
    requestedCheckNames,
    options.verbose
  );

  if (enabledChecks.length === 0 && requestedCheckNames.length > 0) {
    console.error("Error: No valid checks were selected. Aborting.");
    console.log(
      `Available checks are: ${availableChecks.map((c) => c.name).join(", ")}`
    );
    process.exit(1);
  }

  // Ensure output directory exists (though writeResults also does this)
  ensureOutputDirectory(options.output);

  const crawler = new Crawler({
    ...options, // Spread original options
    url: baseUrlForCrawler, // Explicitly pass the determined base URL
    urlList, // Pass the parsed URL list if available
    concurrency: options.concurrency, // Already correct type via parseInt in Crawler or string here
    checks: enabledChecks, // Pass the array of enabled check *objects*
    availableChecksForOutput: availableChecks, // Pass all check *objects* for output module
  });

  await crawler.start();
}

main().catch((error) => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});
