const xml2js = require("xml2js");

async function parseSitemap(sitemapUrl, axiosInstance, verbose = false) {
  if (!sitemapUrl) {
    return [];
  }

  if (verbose) console.log(`Fetching sitemap from ${sitemapUrl}`);
  try {
    const response = await axiosInstance.get(sitemapUrl);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);

    if (result.urlset && result.urlset.url) {
      const urls = result.urlset.url.map((u) => u.loc[0]);
      if (verbose) console.log(`Found ${urls.length} URLs in sitemap.`);
      return urls;
    }
    if (verbose)
      console.log("No URLs found in sitemap or sitemap format not recognized.");
    return [];
  } catch (error) {
    console.error(
      `Failed to fetch or parse sitemap from ${sitemapUrl}: ${error.message}`
    );
    return []; // Return empty array on error to allow fallback or graceful failure
  }
}

module.exports = { parseSitemap };
