import { CheerioAPI } from "cheerio";

interface SeoMetaRecord {
  title: string;
  titleLength: number;
  h1: string;
  metaDescription: string;
  metaDescriptionLength: number;
  canonicalUrl: string;
  metaRobots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  ogSiteName: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  hreflangAlternates: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getTitleTag($: CheerioAPI): string {
  const rawTitle = $("title").first().text() || "";
  return normalizeWhitespace(rawTitle);
}

function getPrimaryH1($: CheerioAPI): string {
  const fromMain = $("main h1").first().text() || "";
  const normalizedFromMain = normalizeWhitespace(fromMain);
  if (normalizedFromMain) return normalizedFromMain;

  const firstH1 = $("h1").first().text() || "";
  return normalizeWhitespace(firstH1);
}

function getMetaContentByName($: CheerioAPI, name: string): string {
  const target = name.toLowerCase();
  let content = "";

  $("meta").each((_, el) => {
    if (content) return;

    const metaName = $(el).attr("name");
    if (!metaName) return;

    if (metaName.toLowerCase() === target) {
      content = $(el).attr("content") || "";
    }
  });

  return normalizeWhitespace(content);
}

function getMetaContentByProperty($: CheerioAPI, property: string): string {
  const target = property.toLowerCase();
  let content = "";

  $("meta").each((_, el) => {
    if (content) return;

    const metaProperty = $(el).attr("property");
    if (!metaProperty) return;

    if (metaProperty.toLowerCase() === target) {
      content = $(el).attr("content") || "";
    }
  });

  return normalizeWhitespace(content);
}

function getCanonicalUrl($: CheerioAPI): string {
  const href = $("link[rel='canonical']").first().attr("href") || "";
  return normalizeWhitespace(href);
}

function getHreflangAlternates($: CheerioAPI): string {
  const alternates: string[] = [];

  $("link[rel='alternate'][hreflang]").each((_, el) => {
    const hreflang = normalizeWhitespace($(el).attr("hreflang") || "");
    const href = normalizeWhitespace($(el).attr("href") || "");
    if (!hreflang && !href) return;

    if (hreflang && href) {
      alternates.push(`${hreflang}:${href}`);
      return;
    }

    alternates.push(hreflang || href);
  });

  return alternates.join(" | ");
}

const seoMetaCheck = {
  key: "seo-meta",
  name: "SEO Meta",
  description:
    "Extracts common SEO metadata (title, description, canonical, robots, Open Graph, Twitter cards, hreflang).",
  check: ($: CheerioAPI): SeoMetaRecord[] => {
    const title = getTitleTag($);
    const h1 = getPrimaryH1($);

    const metaDescription = getMetaContentByName($, "description");

    const canonicalUrl = getCanonicalUrl($);
    const metaRobots = getMetaContentByName($, "robots");

    const ogTitle = getMetaContentByProperty($, "og:title");
    const ogDescription = getMetaContentByProperty($, "og:description");
    const ogImage = getMetaContentByProperty($, "og:image");
    const ogUrl = getMetaContentByProperty($, "og:url");
    const ogType = getMetaContentByProperty($, "og:type");
    const ogSiteName = getMetaContentByProperty($, "og:site_name");

    const twitterCard = getMetaContentByName($, "twitter:card");
    const twitterTitle = getMetaContentByName($, "twitter:title");
    const twitterDescription = getMetaContentByName($, "twitter:description");
    const twitterImage = getMetaContentByName($, "twitter:image");

    const hreflangAlternates = getHreflangAlternates($);

    return [
      {
        title,
        titleLength: title.length,
        h1,
        metaDescription,
        metaDescriptionLength: metaDescription.length,
        canonicalUrl,
        metaRobots,
        ogTitle,
        ogDescription,
        ogImage,
        ogUrl,
        ogType,
        ogSiteName,
        twitterCard,
        twitterTitle,
        twitterDescription,
        twitterImage,
        hreflangAlternates,
      },
    ];
  },
  csvHeaders: [
    { id: "title", title: "Title" },
    { id: "titleLength", title: "Title Length" },
    { id: "h1", title: "H1" },
    { id: "metaDescription", title: "Meta Description" },
    { id: "metaDescriptionLength", title: "Meta Description Length" },
    { id: "canonicalUrl", title: "Canonical URL" },
    { id: "metaRobots", title: "Meta Robots" },
    { id: "ogTitle", title: "OG Title" },
    { id: "ogDescription", title: "OG Description" },
    { id: "ogImage", title: "OG Image" },
    { id: "ogUrl", title: "OG URL" },
    { id: "ogType", title: "OG Type" },
    { id: "ogSiteName", title: "OG Site Name" },
    { id: "twitterCard", title: "Twitter Card" },
    { id: "twitterTitle", title: "Twitter Title" },
    { id: "twitterDescription", title: "Twitter Description" },
    { id: "twitterImage", title: "Twitter Image" },
    { id: "hreflangAlternates", title: "Hreflang Alternates" },
  ],
};

export default seoMetaCheck;
