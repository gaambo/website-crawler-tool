// src/sitemap-parser.ts
import * as xml2js from "xml2js";
import { AxiosInstance } from "axios";

interface SitemapUrlEntry {
  loc: string[];
  // Potentially other fields like lastmod, changefreq, priority, but loc is the primary one
}

interface SitemapIndexEntry {
  loc: string[];
  // lastmod?: string[];
}

interface SitemapResult {
  urlset?: {
    url: SitemapUrlEntry[];
  };
  sitemapindex?: {
    sitemap: SitemapIndexEntry[];
  };
}

const MAX_SITEMAP_DEPTH = 10;

function safeResolveUrl(candidate: string, base: string): string | undefined {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return undefined;
  }
}

async function parseSitemapInternal(
  sitemapUrl: string,
  axiosInstance: AxiosInstance,
  verbose: boolean,
  visitedSitemaps: Set<string>,
  depth: number
): Promise<string[]> {
  if (depth > MAX_SITEMAP_DEPTH) {
    if (verbose) {
      console.warn(
        `Max sitemap nesting depth (${MAX_SITEMAP_DEPTH}) reached at ${sitemapUrl}`
      );
    }
    return [];
  }

  if (visitedSitemaps.has(sitemapUrl)) {
    if (verbose) console.log(`Skipping already-visited sitemap: ${sitemapUrl}`);
    return [];
  }
  visitedSitemaps.add(sitemapUrl);

  if (verbose) console.log(`Fetching sitemap from ${sitemapUrl}`);

  try {
    const response = await axiosInstance.get(sitemapUrl);
    const parser = new xml2js.Parser({
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });
    const result: SitemapResult = await parser.parseStringPromise(
      response.data
    );

    if (result.urlset?.url?.length) {
      const urls = result.urlset.url
        .map((u) => u.loc?.[0])
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .map((u) => safeResolveUrl(u, sitemapUrl))
        .filter((u): u is string => typeof u === "string");

      if (verbose) console.log(`Found ${urls.length} URLs in sitemap.`);
      return urls;
    }

    if (result.sitemapindex?.sitemap?.length) {
      const childSitemaps = result.sitemapindex.sitemap
        .map((s) => s.loc?.[0])
        .filter((u): u is string => typeof u === "string" && u.length > 0)
        .map((u) => safeResolveUrl(u, sitemapUrl))
        .filter((u): u is string => typeof u === "string");

      if (verbose)
        console.log(
          `Found ${childSitemaps.length} child sitemaps in sitemap index.`
        );

      const nestedUrls = await Promise.all(
        childSitemaps.map((childUrl) =>
          parseSitemapInternal(
            childUrl,
            axiosInstance,
            verbose,
            visitedSitemaps,
            depth + 1
          )
        )
      );

      const flattened = nestedUrls.flat();
      if (verbose)
        console.log(
          `Resolved ${flattened.length} URLs from sitemap index ${sitemapUrl}`
        );
      return flattened;
    }

    if (verbose)
      console.log("No URLs found in sitemap or sitemap format not recognized.");
    return [];
  } catch (error: any) {
    console.error(
      `Failed to fetch or parse sitemap from ${sitemapUrl}: ${error.message}`
    );
    return [];
  }
}

export async function parseSitemap(
  sitemapUrl: string | undefined,
  axiosInstance: AxiosInstance,
  verbose: boolean = false
): Promise<string[]> {
  if (!sitemapUrl) {
    if (verbose)
      console.log("No sitemap URL provided, skipping sitemap parsing.");
    return [];
  }

  return parseSitemapInternal(
    sitemapUrl,
    axiosInstance,
    verbose,
    new Set<string>(),
    0
  );
}
