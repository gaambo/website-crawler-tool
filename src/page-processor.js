const cheerio = require("cheerio");

const { URL } = require("url"); // Required for link normalization

class PageProcessor {
  constructor(enabledChecks, baseDomain, verbose = false) {
    this.enabledChecks = enabledChecks; // Now receives only enabled check objects
    this.baseDomain = baseDomain; // For identifying internal links
    this.verbose = verbose;
  }

  processPage(url, htmlContent) {
    const $ = cheerio.load(htmlContent);
    const pageResults = {};

    // Iterate over the enabled check objects directly
    for (const check of this.enabledChecks) {
      const issues = check.check($);
      if (issues.length > 0) {
        // Add the page URL to each issue
        const issuesWithUrl = issues.map((issue) => ({ url, ...issue }));
        // pageResults are already structured correctly by check.name by the previous logic
        // Ensure array exists before pushing
        if (!pageResults[check.name]) pageResults[check.name] = [];
        pageResults[check.name].push(...issuesWithUrl);
      }
    }
    const newLinks = new Set();
    $("a[href]").each((i, link) => {
      const href = $(link).attr("href");
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, url).href.split("#")[0]; // Use the current page's URL as base
        if (new URL(absoluteUrl).hostname === this.baseDomain) {
          newLinks.add(absoluteUrl);
        }
      } catch (e) {
        // Ignore invalid URLs
      }
    });

    return { pageResults, newLinks: [...newLinks] };
  }
}

module.exports = PageProcessor;
