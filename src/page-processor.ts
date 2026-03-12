// src/page-processor.ts
import * as cheerio from "cheerio"; // Use import * as for cheerio
import { URL } from "url";
import { Check, CheckIssueBase } from "./checks/index.js"; // Import our Check type

interface PageResults {
  [checkName: string]: CheckIssueBase[];
}

interface ProcessedPageData {
  pageResults: PageResults;
  newLinks: string[];
}

class PageProcessor {
  private enabledChecks: Check[];
  private baseDomain: string;
  private verbose: boolean;

  constructor(
    enabledChecks: Check[],
    baseDomain: string,
    verbose: boolean = false
  ) {
    this.enabledChecks = enabledChecks;
    this.baseDomain = baseDomain;
    this.verbose = verbose;
  }

  async processPage(
    url: string,
    htmlContent: string
  ): Promise<ProcessedPageData> {
    const $ = cheerio.load(htmlContent);
    const pageResults: PageResults = {};
    const newLinksSet: Set<string> = new Set();

    // Run enabled checks
    for (const check of this.enabledChecks) {
      try {
        const issues = await check.check($, url); // Pass URL to checks if they need it
        if (issues.length > 0) {
          // Add the page URL to each issue before storing if not already present
          // (Our current checks don't add it, PageProcessor used to, let's ensure it's there)
          const issuesWithUrl = issues.map((issue) => ({ url, ...issue }));
          if (!pageResults[check.key]) {
            pageResults[check.key] = [];
          }
          pageResults[check.key].push(...issuesWithUrl);
        }
      } catch (e: any) {
        console.error(
          `Error running check "${check.name}" on ${url}: ${e.message}`
        );
        // Optionally, add to a specific error collection for this page
      }
    }

    // Extract internal links
    $("a[href]").each((i, link) => {
      const href = $(link).attr("href");
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, url).href.split("#")[0];
        if (new URL(absoluteUrl).hostname === this.baseDomain) {
          newLinksSet.add(absoluteUrl);
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    });

    return { pageResults, newLinks: [...newLinksSet] };
  }
}

export default PageProcessor;
