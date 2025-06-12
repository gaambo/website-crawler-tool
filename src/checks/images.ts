// src/checks/images.ts
import { CheerioAPI } from "cheerio";

interface ImageIssue {
  src: string;
  alt: string | undefined;
  message: string;
}

const imagesCheck = {
  name: "Images Check",
  description: "Checks for images with missing or empty alt attributes.",
  check: ($: CheerioAPI): ImageIssue[] => {
    const issues: ImageIssue[] = [];
    $("img").each((i, el) => {
      const element = $(el);
      const src = element.attr("src") || "N/A";
      const alt = element.attr("alt");

      if (alt === undefined || alt.trim() === "") {
        issues.push({
          src,
          alt,
          message:
            alt === undefined
              ? "Missing alt attribute."
              : "Empty alt attribute.",
        });
      }
    });
    return issues;
  },
  csvHeaders: [
    { id: "src", title: "Image Source" },
    { id: "alt", title: "Alt Text" },
    { id: "message", title: "Message" },
  ],
};

export default imagesCheck;
