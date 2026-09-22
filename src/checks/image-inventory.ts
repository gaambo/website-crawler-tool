import { CheerioAPI } from "cheerio";

interface ImageReference {
  imageUrl: string;
  sourceType: string;
  sourceAttribute: string;
  rawValue: string;
}

const imageAttributes = [
  "src",
  "srcset",
  "data-src",
  "data-srcset",
  "data-lazy-src",
  "data-lazy-srcset",
  "data-original",
  "data-original-src",
  "data-lazyload",
  "data-flickity-lazyload",
  "data-flickity-lazyload-srcset",
];

function getSrcsetUrls(value: string): string[] {
  const urls: string[] = [];
  let position = 0;

  while (position < value.length) {
    while (/[\s,]/.test(value[position])) position++;
    if (position >= value.length) break;

    const urlStart = position;
    while (position < value.length && !/\s/.test(value[position])) position++;

    let url = value.slice(urlStart, position);
    const hasTrailingComma = url.endsWith(",");
    url = url.replace(/,+$/, "");
    if (url) urls.push(url);
    if (hasTrailingComma) continue;

    let parenthesesDepth = 0;
    while (position < value.length) {
      const character = value[position++];
      if (character === "(") parenthesesDepth++;
      if (character === ")") parenthesesDepth--;
      if (character === "," && parenthesesDepth === 0) break;
    }
  }

  return urls;
}

function getUrls(value: string, attribute: string): string[] {
  if (attribute.endsWith("srcset")) {
    return getSrcsetUrls(value);
  }

  return [value.trim()];
}

function addReference(
  references: ImageReference[],
  value: string,
  attribute: string,
  sourceType: string,
  pageUrl: string
): void {
  for (const rawValue of getUrls(value, attribute)) {
    if (!rawValue || rawValue.startsWith("data:")) continue;

    try {
      const imageUrl = new URL(rawValue, pageUrl).href.split("#")[0];
      references.push({
        imageUrl,
        sourceType,
        sourceAttribute: attribute,
        rawValue,
      });
    } catch {
      // Ignore invalid image URLs.
    }
  }
}

function extractBackgroundStyleUrls(
  value: string,
  references: ImageReference[],
  pageUrl: string
): void {
  const backgroundPattern = /(?:^|;)\s*background(?:-image)?\s*:\s*([^;]+)/gi;
  const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]*))\s*\)/gi;
  let backgroundMatch: RegExpExecArray | null;

  while ((backgroundMatch = backgroundPattern.exec(value)) !== null) {
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = urlPattern.exec(backgroundMatch[1])) !== null) {
      const imageUrl = urlMatch[1] ?? urlMatch[2] ?? urlMatch[3];
      addReference(references, imageUrl, "style", "inline-style", pageUrl);
    }
  }
}

const imageInventoryCheck = {
  key: "image-inventory",
  name: "Image Inventory",
  description:
    "Lists image URLs found in HTML image elements and inline styles.",
  check: ($: CheerioAPI, pageUrl = ""): ImageReference[] => {
    const references: ImageReference[] = [];
    const baseHref = $("base[href]").first().attr("href");
    let documentBaseUrl = pageUrl;

    if (baseHref) {
      try {
        documentBaseUrl = new URL(baseHref, pageUrl).href;
      } catch {
        // Fall back to the page URL for an invalid base URL.
      }
    }

    $("img, picture source").each((_, element) => {
      const sourceType = element.tagName.toLowerCase();
      const imageElement = $(element);

      for (const attribute of imageAttributes) {
        const value = imageElement.attr(attribute);
        if (value) {
          addReference(
            references,
            value,
            attribute,
            sourceType,
            documentBaseUrl
          );
        }
      }
    });

    $("[style]").each((_, element) => {
      const style = $(element).attr("style");
      if (style) {
        extractBackgroundStyleUrls(style, references, documentBaseUrl);
      }
    });

    return references;
  },
  csvHeaders: [
    { id: "imageUrl", title: "Image URL" },
    { id: "sourceType", title: "Source Type" },
    { id: "sourceAttribute", title: "Source Attribute" },
    { id: "rawValue", title: "Raw Value" },
  ],
};

export default imageInventoryCheck;
