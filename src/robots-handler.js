const robotsParser = require("robots-parser");
const { URL } = require("url");

class RobotsHandler {
  constructor(axiosInstance, verbose = false) {
    this.axiosInstance = axiosInstance;
    this.verbose = verbose;
    this.robots = null;
  }

  async initialize(baseUrl, ignoreRobots = false) {
    if (ignoreRobots) {
      if (this.verbose)
        console.log("Ignoring robots.txt as per configuration.");
      this.robots = null; // Explicitly null means allow all
      return;
    }

    const robotsUrl = new URL("/robots.txt", baseUrl).href;
    if (this.verbose) console.log(`Fetching robots.txt from ${robotsUrl}`);

    try {
      const response = await this.axiosInstance.get(robotsUrl);
      this.robots = robotsParser(robotsUrl, response.data);
      if (this.verbose) console.log("Successfully parsed robots.txt");
    } catch (error) {
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

  isAllowed(url, userAgent) {
    if (!this.robots) {
      return true; // If no robots.txt or it failed to parse, or if ignoring, allow all
    }
    return this.robots.isAllowed(url, userAgent);
  }
}

module.exports = RobotsHandler;
