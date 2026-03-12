declare module "robots-parser" {
  export interface Robot {
    isAllowed(url: string, userAgent?: string): boolean | undefined;
    isDisallowed(url: string, userAgent?: string): boolean | undefined;
    getMatchingLineNumber(url: string, userAgent?: string): number;
    getCrawlDelay(userAgent?: string): number | undefined;
    getSitemaps(): string[];
    getPreferredHost(): string | null;
  }

  export default function robotsParser(
    robotsUrl: string,
    robotsTxt: string
  ): Robot;
}
