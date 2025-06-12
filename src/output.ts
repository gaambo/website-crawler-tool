// src/output.ts
import * as fs from "fs";
import * as path from "path";
import { createObjectCsvWriter } from "csv-writer";
import { Check, CsvHeader, CheckIssueBase } from "./checks"; // Import types from checks/index.ts

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
  outputDir: string
): Promise<void> {
  ensureOutputDirectory(outputDir);

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
    console.log(`Crawl errors report saved to crawl_errors.csv`);
  }

  // Write results for each check
  for (const check of availableChecks) {
    const checkName = check.name;
    const checkResults = results[checkName];

    if (checkResults && checkResults.length > 0) {
      // Construct CSV headers: 'url' first, then specific check headers
      const reportHeaders: CsvHeader[] = [
        { id: "url", title: "URL" },
        ...check.csvHeaders,
      ];

      const csvWriter = createObjectCsvWriter({
        path: path.join(
          outputDir,
          `${checkName.toLowerCase().replace(/\s+/g, "_")}.csv`
        ),
        header: reportHeaders,
        alwaysQuote: true,
      });

      await csvWriter.writeRecords(checkResults);
      console.log(
        `${checkName} report saved to ${checkName
          .toLowerCase()
          .replace(/\s+/g, "_")}.csv`
      );
    }
  }
  console.log(`All reports saved in ${outputDir}`);
}
