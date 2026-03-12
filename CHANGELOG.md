# Changelog

## v1.3.0

### Added

- **SEO Meta Check**: New `seo-meta` check that extracts common SEO metadata (title, description, canonical, robots, Open Graph, Twitter cards, hreflang) into `seo-meta.csv`.
- **Collect URLs Check**: New `collect` check to only collect URLs.
- **Sitemap Index Support**: The `--sitemap` option now supports sitemap indexes (e.g., `sitemap_index.xml`) and resolves nested sitemaps.

### Changed

- **CLI Output UI**: Improved progress and report output with an interactive spinner and colorized counters when running in a TTY.
- **ESM + Dev Runner**: Project is now ESM (`"type": "module"`) and the development workflow uses `tsx` (`npm run dev`).

---

## v1.2.0

### Added

- **URL List Support**: New `-l, --url-list <file>` option to crawl a specific list of URLs without recursion.
  - **URL List Parser**: Support for JSON and CSV file formats containing URL lists.
  - **Non-Recursive Mode**: When using URL lists, the crawler only processes the specified URLs and does not discover new ones.
- **Redirect Check**: New `redirects` check that detects URL redirects and captures initial redirect status codes.
  - **Redirect Status Capture**: Reports the initial HTTP status code (301, 302, etc.) used for redirection.
  - **Redirect Chain Information**: Captures original URL, final URL, status code, and redirect chain in CSV output.

### Changed

- **Async Check Support**: Updated check architecture to support async functions for HTTP-level checks.

### Documentation

- Add `AGENTS.md` file.

---

## v1.1.0

### Changed

- Each check now has a `key` property (e.g., `headings`, `images`) which is used for CLI selection and as the base for the CSV export file name.
- The CLI `-k/--check` option now accepts the check's key (e.g., `-k images` or `-k headings`).
- Output CSV files are now named after the check key (e.g., `images.csv`, `headings.csv`).
- The `name` property of each check is now used for human-readable output only, not for CLI or file selection.

### Removed

- Removed support for using the check `name` as a CLI selector. Only the `key` is now supported.

### Documentation

- Updated documentation to clarify the use of check keys for CLI and output.

---

See the README for updated usage examples.
