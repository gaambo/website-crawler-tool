import { CheerioAPI } from "cheerio";
import axios, { AxiosInstance } from "axios";

interface RedirectIssue {
  originalUrl: string;
  finalUrl: string;
  statusCode: number;
  redirectChain: string;
}

// Shared axios instance configuration for better performance
const createAxiosInstance = (maxRedirects: number): AxiosInstance =>
  axios.create({
    timeout: 10000,
    headers: {
      "User-Agent": "website-a11y-crawler/1.0 (+https://github.com/gaambo)",
    },
    maxRedirects,
  });

/**
 * Checks if a URL redirects and captures the initial redirect status code
 * @param url The URL to check
 * @param finalUrl The final URL after following redirects (optional)
 * @returns Promise<RedirectIssue | null> - Returns redirect info or null if no redirect
 */
const checkRedirectStatus = async (
  url: string,
  finalUrl?: string
): Promise<RedirectIssue | null> => {
  try {
    // Make a request with no redirects to get the initial status
    const noRedirectInstance = createAxiosInstance(0);
    await noRedirectInstance.get(url);
    // If we get here, no redirect occurred
    return null;
  } catch (error: any) {
    if (error.response?.status >= 300 && error.response?.status < 400) {
      const location = error.response.headers.location;
      const targetUrl = finalUrl || location || url;

      return {
        originalUrl: url,
        finalUrl: targetUrl,
        statusCode: error.response.status,
        redirectChain: `${url} -> ${targetUrl}`,
      };
    }
    return null;
  }
};

const redirectsCheck = {
  key: "redirects",
  name: "URL Redirects",
  description: "Checks for URL redirects and captures final destination.",
  check: async ($: CheerioAPI, pageUrl?: string): Promise<RedirectIssue[]> => {
    if (!pageUrl) return [];
    const url = pageUrl;
    const issues: RedirectIssue[] = [];

    try {
      // Make request following redirects to get final destination
      const axiosInstance = createAxiosInstance(5);
      const response = await axiosInstance.get(url);

      const finalUrl = response.request.res.responseUrl || url;

      // Check if redirect occurred
      if (finalUrl !== url) {
        const redirectInfo = await checkRedirectStatus(url, finalUrl);
        if (redirectInfo) {
          issues.push(redirectInfo);
        }
      }
    } catch (error: any) {
      // Handle cases where the final request fails but we still want redirect info
      if (error.response?.status >= 300 && error.response?.status < 400) {
        const redirectInfo = await checkRedirectStatus(url);
        if (redirectInfo) {
          issues.push({
            ...redirectInfo,
            redirectChain: `${redirectInfo.redirectChain} (incomplete)`,
          });
        }
      }
    }

    return issues;
  },
  csvHeaders: [
    { id: "originalUrl", title: "Original URL" },
    { id: "finalUrl", title: "Final URL" },
    { id: "statusCode", title: "Status Code" },
    { id: "redirectChain", title: "Redirect Chain" },
  ],
};

export default redirectsCheck;
