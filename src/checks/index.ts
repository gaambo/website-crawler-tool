// src/checks/index.ts
import { CheerioAPI } from "cheerio";
import headingsCheck from "./headings";
import imagesCheck from "./images";

// Define the structure of a CSV header
export interface CsvHeader {
  id: string;
  title: string;
}

// Define the base structure for any issue reported by a check
// 'url' will be added automatically by the PageProcessor before results are stored
export interface CheckIssueBase {
  [key: string]: any; // Allows for various properties depending on the check
}

// Define the signature for a check function
export interface CheckFunction {
  ($: CheerioAPI, pageUrl?: string): CheckIssueBase[];
}

// Define the structure of a Check object
export interface Check {
  key: string; // CLI-friendly, file-friendly identifier
  name: string;
  description: string;
  check: CheckFunction;
  csvHeaders: CsvHeader[];
}

const allChecks: Check[] = [headingsCheck, imagesCheck];

function determineEnabledChecks(
  requestedChecks: string[] = [],
  verbose: boolean = false
): Check[] {
  if (!requestedChecks || requestedChecks.length === 0) {
    if (verbose) {
      console.log(
        "No specific checks requested, enabling all available checks."
      );
    }
    return allChecks; // Return all available check objects
  }

  const enabledChecks: Check[] = [];

  for (const requestedCheck of requestedChecks) {
    const found = allChecks.find((c) => c.key === requestedCheck);
    if (found) {
      enabledChecks.push(found);
    } else {
      console.warn(
        `Warning: Unknown check '${requestedCheck}' will be ignored.`
      );
    }
  }

  if (verbose) {
    console.log(
      `Enabled checks: ${enabledChecks.map((c) => c.name).join(", ")}`
    );
  }
  return enabledChecks;
}

// To add a new check, import it here and add it to the allChecks array.
export { determineEnabledChecks, allChecks as checks };
