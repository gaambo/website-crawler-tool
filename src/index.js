#!/usr/bin/env node

const { Command } = require("commander");
const program = new Command();

program
  .name("gaambo-accessibility-crawler")
  .description("A CLI tool to crawl a website and run accessibility checks.")
  .version("1.0.0");

program
  .requiredOption("-u, --url <url>", "The base URL to start crawling from.")
  .option(
    "-k, --checks <list>",
    "A comma-separated list of checks to run. Defaults to all available checks."
  )
  .option(
    "-c, --concurrency <number>",
    "The number of concurrent requests",
    "5"
  )
  .option(
    "-o, --output <dir>",
    "The directory to save the CSV reports",
    "./results"
  )
  .option("-s, --sitemap [url]", "Optional URL to a sitemap.xml file")
  .option("-v, --verbose", "Enable verbose logging", false)
  .option("--ignore-robots", "Ignore the robots.txt file", false);

program.parse(process.argv);

const Crawler = require("./crawler");
const { checks, determineEnabledChecks } = require("./checks");

async function main() {
  const options = program.opts();

  console.log("Starting crawler with the following options:");
  console.log(options);

  // Basic validation
  if (isNaN(parseInt(options.concurrency))) {
    console.error("Error: Concurrency must be a number.");
    process.exit(1);
  }

  const requestedCheckNames = options.checks ? options.checks.split(",") : [];
  const enabledChecks = determineEnabledChecks(
    requestedCheckNames,
    options.verbose
  );

  if (enabledChecks.length === 0 && requestedCheckNames.length > 0) {
    console.error("Error: No valid checks were selected. Aborting.");
    console.log(
      `Available checks are: ${checks.map((c) => c.name).join(", ")}`
    );
    process.exit(1);
  }
  // Pass the array of enabled check *objects* to the Crawler
  const crawler = new Crawler({
    ...options,
    checks: enabledChecks,
    availableChecksForOutput: checks,
  });
  await crawler.start();
}

main().catch((error) => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});
