// src/output.ts
import * as fs from "fs";
import * as path from "path";
import { createObjectCsvWriter } from "csv-writer";
import { Check, CsvHeader, CheckIssueBase } from "./checks/index.js";
import {
  CliUi,
  formatAllReportsSaved,
  formatCrawlErrorsSaved,
  formatReportSaved,
} from "./cli-ui.js";

interface ResultsObject {
  errors: CheckIssueBase[]; // Assuming errors will also have a 'url' and 'message'
  [checkName: string]: CheckIssueBase[];
}

// Ensures the output directory exists
export function ensureOutputDirectory(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

// Writes the results to CSV files
export async function writeResults(
  results: ResultsObject,
  availableChecks: Check[],
  outputDir: string,
  ui?: CliUi
): Promise<void> {
  ensureOutputDirectory(outputDir);

  const useColor = ui?.getInteractiveTerminal() ?? !!process.stdout.isTTY;

  // Write errors to a separate CSV
  if (results.errors && results.errors.length > 0) {
    const errorHeaders: CsvHeader[] = [
      { id: "url", title: "URL" },
      { id: "message", title: "Error Message" },
    ];
    const errorWriter = createObjectCsvWriter({
      path: path.join(outputDir, "crawl_errors.csv"),
      header: errorHeaders,
      alwaysQuote: true,
    });
    await errorWriter.writeRecords(results.errors);

    const message = formatCrawlErrorsSaved(
      results.errors.length,
      "crawl_errors.csv",
      useColor
    );
    if (ui) ui.log(message);
    else console.log(message);
  }

  // Write results for each check
  for (const check of availableChecks) {
    const checkResults = results[check.key];

    if (checkResults && checkResults.length > 0) {
      // Construct CSV headers: 'url' first, then specific check headers
      const reportHeaders: CsvHeader[] = [
        { id: "url", title: "URL" },
        ...check.csvHeaders,
      ];

      const csvWriter = createObjectCsvWriter({
        path: path.join(outputDir, `${check.key}.csv`),
        header: reportHeaders,
        alwaysQuote: true,
      });

      await csvWriter.writeRecords(checkResults);

      const message = formatReportSaved(
        check.name,
        `${check.key}.csv`,
        useColor
      );
      if (ui) ui.log(message);
      else console.log(message);
    }
  }

  const finalMessage = formatAllReportsSaved(outputDir, useColor);
  if (ui) ui.log(finalMessage);
  else console.log(finalMessage);
}
