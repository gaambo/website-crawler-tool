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
    This installs all necessary dependencies for running and developing the tool.

---

## Usage

All options are configured via CLI flags.

### Quick Start

**Crawl a website and run all default tests:**
```bash
npm start -- --url https://example.com
```

**Example with more options:**
```bash
npm start -- --url https://example.com --sitemap https://example.com/sitemap.xml --checks headings --concurrency 10 --output ./reports
```

### For Development (Recommended for quick iteration)

Use `npm run dev` to execute the tool directly from TypeScript source using `ts-node`. This doesn't require a separate build step.

```bash
npm run dev -- --url https://example.com
```

### Using as a Global Command (Optional, for convenience)

If you want to use `website-crawler` as a global command in your terminal:

1.  **Build the project first:**
    ```bash
    npm run build
    ```
2.  **Link the package:**
    ```bash
    npm link
    ```
    Now you can run the tool using the `website-crawler` command:
    ```bash
    website-crawler --url https://example.com
    ```
    To unlink, you can run `npm unlink website-crawler-tool` in the project directory.


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

---

## Development Workflow

This project is written in TypeScript. The source files are located in the `src/` directory and compiled to JavaScript in the `dist/` directory (which is gitignored).

### Key NPM Scripts

-   **`npm run dev`**: Runs the crawler directly from TypeScript source using `ts-node`. This is generally the fastest way to test changes during development.
    ```bash
    npm run dev -- [options...]
    ```
-   **`npm run build`**: Compiles the TypeScript code from `src/` to JavaScript in `dist/`. This is necessary before using `npm link` or if you want to run the pure JavaScript version.
    ```bash
    npm run build
    ```
-   **`npm start`**: A convenience script that first runs `npm run build` and then executes the compiled application from `dist/index.js`. 
    ```bash
    npm start -- [options...]
    ```
-   **`npm run format`**: Formats the TypeScript code in the `src/` directory using Prettier.
    ```bash
    npm run format
    ```

For a full list of CLI options that can be passed after `--`, see the "CLI Options" section below.

---

## Output

The tool generates the following CSV files in the specified output directory:

-   `headings.csv`: Lists all pages with skipped heading levels.
-   `images.csv`: Lists all pages with images that have missing or empty `alt` attributes.
-   `errors.csv`: Lists all URLs that could not be crawled due to network or HTTP errors.
