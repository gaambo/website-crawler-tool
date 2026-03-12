# AGENTS.md

## Project Overview

Node.js CLI tool that crawls websites and performs accessibility checks. Built with TypeScript, outputs CSV reports, supports recursive crawling, sitemaps, and URL lists.

Runtime requirement: Node.js >= 20.

## Architecture

Modular TypeScript structure in `src/`:

- `index.ts`: CLI entry with commander
- `crawler.ts`: Core crawling logic
- `page-processor.ts`: Test execution
- `checks/`: Individual test modules
- `output.ts`: CSV writing utilities

## Features

- Recursive crawling with concurrency control (p-limit)
- Sitemap.xml parsing support
- URL list file support (JSON/CSV)
- CLI via commander with all required flags
- CSV output with separate error reporting
- Accessibility tests: headings, images, redirects

## Commands

- `npm run dev` - Run from TypeScript source via `tsx` (use for testing)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Build then run compiled version
- `npm run format` - Format code with Prettier

## Code Style Guidelines

- **Imports**: Group external imports first, then internal imports (relative paths)
- **Formatting**: Prettier config - semicolons, double quotes, 2-space indentation
- **Types**: Use interfaces for object shapes, explicit return types for functions
- **Naming**: camelCase for variables/functions, PascalCase for classes/interfaces
- **Error Handling**: Always use try-catch for async operations, log errors before exit
- **File Structure**: One export per file, use default exports for check modules
- **Testing**: Use example urls (e.g. `https://crawler-test.com/`) for all crawl testing. NEVER USE ANY PUBLIC 3rd PARTY WEBSITE FOR TESTING OR YOU RISK BEING BANNED.

## Adding New Accessibility Checks

1. Create file in `src/checks/` following existing pattern
2. Export object with: `key`, `name`, `description`, `check` function, `csvHeaders`
3. Import and add to `allChecks` array in `src/checks/index.ts`
4. Check function takes CheerioAPI, returns array of issue objects

## CLI Usage Examples

```bash
# Basic crawl
npm start -- --url https://example.com --checks headings,images

# With sitemap and custom concurrency
npm start -- --sitemap https://example.com/sitemap.xml --concurrency 10

# URL list file
npm start -- --url-list urls.json --checks images --output ./reports
```

## Patterns

- Use async/await instead of Promise chains
- Implement proper error boundaries with process.on('unhandledRejection')
- Follow existing check module structure in `src/checks/`
- Maintain CSV output format consistency across all checks
- User-Agent: `website-crawler-tool/1.0.0`
