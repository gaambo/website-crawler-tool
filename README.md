# gaambo-accessibility-crawler

A Node.js CLI tool to crawl a website and run accessibility checks on all internal pages. It's designed to handle large sites efficiently by using concurrency controls and provides clear, actionable reports in CSV format.

---

## Important: Responsible Usage

This tool is intended for use on websites that you own or have explicit permission to test. Running a crawler can place a significant load on a web server.

**Be Cautious with Concurrency**: The `--concurrency` flag allows you to control how many requests are made in parallel. While a higher number can speed up the crawl, it also increases the load on the server. Start with a low number (e.g., the default of 5) and increase it carefully. Abusing this tool can lead to your IP being blocked or could be mistaken for a denial-of-service (DoS) attack.

---

## Features

- **Recursive Crawling**: Starts from a base URL and recursively crawls all internal links.
- **Sitemap Support**: Optionally, you can provide a sitemap URL to define the scope of the crawl.
- **Configurable Concurrency**: Control the number of parallel requests to manage load.
- **Accessibility Checks**:
  - **Heading Order Check**: Detects skipped heading levels (e.g., an `h1` followed by an `h3`).
  - **Image Alt-Text Check**: Ensures all `<img>` tags have a non-empty `alt` attribute.
- **CSV Reports**: Generates a separate CSV file for each accessibility test, plus a report for any HTTP or network errors encountered during the crawl.

---

## Installation

1.  **Clone the repository:**
```bash
    git clone git@github.com:gaambo/website-crawler-tool.git
    cd website-crawler-tool
```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

---

## Usage

All options are configured via CLI flags.

### Basic Example

Crawl a website and run all default tests:

```bash
npm start -- --url https://example.com
```
OR 
```bash
node src/index.js --url https://example.com
```

### Advanced Example

Crawl a site using its sitemap, run only the `headings` check with a concurrency of 10, and save the reports to a custom directory:

```bash
node src/index.js --url https://example.com --sitemap https://example.com/sitemap.xml --checks headings --concurrency 10 --output ./reports
```

### CLI Options

| Flag                | Description                                                                 | Default             |
| ------------------- | --------------------------------------------------------------------------- | ------------------- |
| `-u, --url <url>`   | **(Required)** The base URL to start crawling from.                         | -                   |
| `-k, --checks <list>`| A comma-separated list of checks to run.                                    | All available checks |
| `-c, --concurrency <num>`| The number of concurrent requests to make.                                  | `5`                 |
| `-o, --output <dir>`| The directory where CSV reports will be saved.                              | `./results`         |
| `-s, --sitemap [url]`| The URL of the sitemap.xml file to use for crawling.                        | -                   |
| `-v, --verbose`     | Enable verbose logging to see every URL being crawled.                      | `false`             |
| `--ignore-robots`   | Ignore the `robots.txt` file and crawl all paths.                           | `false`             |
| `-h, --help`        | Display the help menu.                                                      | -                   |

---

## Output

The tool generates the following CSV files in the specified output directory:

-   `headings.csv`: Lists all pages with skipped heading levels.
-   `images.csv`: Lists all pages with images that have missing or empty `alt` attributes.
-   `errors.csv`: Lists all URLs that could not be crawled due to network or HTTP errors.
