// src/sitemap-parser.ts
import * as xml2js from "xml2js";
import { AxiosInstance } from "axios";

interface SitemapUrlEntry {
  loc: string[];
  // Potentially other fields like lastmod, changefreq, priority, but loc is the primary one
}

interface SitemapResult {
  urlset?: {
    url: SitemapUrlEntry[];
  };
  // Add support for sitemap index files if needed in the future
  // sitemapindex?: {
  //   sitemap: SitemapUrlEntry[];
  // };
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

  if (verbose) console.log(`Fetching sitemap from ${sitemapUrl}`);

  try {
    const response = await axiosInstance.get(sitemapUrl);
    const parser = new xml2js.Parser();
    const result: SitemapResult = await parser.parseStringPromise(
      response.data
    );

    if (result.urlset && result.urlset.url) {
      const urls = result.urlset.url.map((u) => u.loc[0]);
      if (verbose) console.log(`Found ${urls.length} URLs in sitemap.`);
      return urls;
    }
    // TODO: Add support for sitemap index files (result.sitemapindex)
    if (verbose)
      console.log("No URLs found in sitemap or sitemap format not recognized.");
    return [];
  } catch (error: any) {
    console.error(
      `Failed to fetch or parse sitemap from ${sitemapUrl}: ${error.message}`
    );
    return []; // Return empty array on error to allow fallback or graceful failure
  }
}
