// src/checks/headings.ts
import * as cheerio from "cheerio"; // Use import * as
import { CheerioAPI } from "cheerio"; // CheerioAPI is fine for the function signature

interface HeadingIssue {
  level: number;
  text: string;
  message: string;
}

const headingsCheck = {
  name: "Headings Check",
  description: "Checks for proper heading order (h1, h2, h3, etc.).",
  check: ($: CheerioAPI): HeadingIssue[] => {
    const issues: HeadingIssue[] = [];
    let lastLevel = 0;

    $("h1, h2, h3, h4, h5, h6").each((i, el) => {
      const element = $(el);
      const tagName = element.prop("tagName");
      if (!tagName) return; // Skip if not a valid element with a tagName

      const level = parseInt(tagName.substring(1), 10);
      const text = element.text().trim();

      if (level > lastLevel + 1) {
        issues.push({
          level,
          text,
          message: `Improper heading order: H${level} follows H${lastLevel}. Expected H${
            lastLevel + 1
          } or lower.`,
        });
      }
      lastLevel = level;
    });

    return issues;
  },
  // Define what a single result row should look like for the CSV
  // 'url' is added automatically by the PageProcessor
  csvHeaders: [
    { id: "level", title: "Level" },
    { id: "text", title: "Text" },
    { id: "message", title: "Message" },
  ],
};

export default headingsCheck;
