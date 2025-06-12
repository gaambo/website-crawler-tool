// src/robots-handler.ts
import robotsParser, { Robot } from "robots-parser"; // Use Robot type as suggested
import { AxiosInstance } from "axios";
import { URL } from "url";

class RobotsHandler {
  private axiosInstance: AxiosInstance;
  private verbose: boolean;
  private robots: Robot | null = null;

  constructor(axiosInstance: AxiosInstance, verbose: boolean = false) {
    this.axiosInstance = axiosInstance;
    this.verbose = verbose;
  }

  async initialize(
    baseUrl: string,
    ignoreRobots: boolean = false
  ): Promise<void> {
    if (ignoreRobots) {
      if (this.verbose)
        console.log("Ignoring robots.txt as per configuration.");
      this.robots = null; // Explicitly null means allow all, effectively
      return;
    }

    const robotsUrl = new URL("/robots.txt", baseUrl).href;
    if (this.verbose) console.log(`Fetching robots.txt from ${robotsUrl}`);

    try {
      const response = await this.axiosInstance.get(robotsUrl, {
        responseType: "text",
      });
      this.robots = robotsParser(robotsUrl, response.data);
      if (this.verbose) console.log("Successfully parsed robots.txt");
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        if (this.verbose)
          console.log("robots.txt not found. Crawling all paths.");
      } else {
        console.error(
          `Failed to fetch or parse robots.txt from ${robotsUrl}: ${error.message}`
        );
      }
      // If robots.txt is missing or fails to parse, we allow crawling all paths by keeping this.robots as null.
      this.robots = null;
    }
  }

  isAllowed(url: string, userAgent: string): boolean {
    if (!this.robots) {
      return true; // If no robots.txt, or it failed to parse, or we're ignoring it, allow all
    }
    return this.robots.isAllowed(url, userAgent) || false; // Ensure boolean return, as isAllowed can return undefined
  }
}

export default RobotsHandler;
