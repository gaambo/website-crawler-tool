import chalk from "chalk";
import ora, { Ora } from "ora";

export interface CliUiOptions {
  verbose?: boolean;
  isInteractiveTerminal?: boolean;
}

export class CliUi {
  private verbose: boolean;
  private isInteractiveTerminal: boolean;
  private spinner?: Ora;

  constructor(options: CliUiOptions = {}) {
    this.verbose = options.verbose ?? false;
    this.isInteractiveTerminal =
      options.isInteractiveTerminal ?? !!process.stdout.isTTY;
  }

  startSpinner(text: string): void {
    if (this.spinner) return;

    this.spinner = ora({
      text,
      // Ora defaults to discarding stdin, which can disable terminal SIGINT
      // (Ctrl+C) by putting the TTY into raw mode. We don't need raw stdin.
      discardStdin: false,
    }).start();
  }

  stopSpinner(): void {
    if (!this.spinner) return;
    this.spinner.stop();
    this.spinner = undefined;
  }

  renderProgress(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
      return;
    }

    // Keep existing behavior: update the same line when not using a spinner.
    // (This is a no-op in many non-TTY environments, but harmless.)
    process.stdout.write(`${text} \r`);
  }

  log(message: string): void {
    console.log(message);
  }

  error(message: string): void {
    console.error(message);
  }

  verboseLog(message: string): void {
    if (!this.verbose) return;
    console.log(message);
  }

  verboseError(message: string): void {
    if (!this.verbose) return;
    console.error(message);
  }

  getInteractiveTerminal(): boolean {
    return this.isInteractiveTerminal;
  }

  formatCrawlerProgress(counts: CrawlerProgressCounts): string {
    return formatCrawlerProgress(counts, this.isInteractiveTerminal);
  }

  renderCrawlerProgress(counts: CrawlerProgressCounts): void {
    this.renderProgress(this.formatCrawlerProgress(counts));
  }

  startCrawlerProgressSpinner(counts: CrawlerProgressCounts): void {
    this.startSpinner(this.formatCrawlerProgress(counts));
  }

  formatCrawlFinished(visitedCount: number, errorCount: number): string {
    return formatCrawlFinished(
      visitedCount,
      errorCount,
      this.isInteractiveTerminal
    );
  }
}

export interface CrawlerProgressCounts {
  crawledCount: number;
  pendingCount: number;
  activeCount: number;
  errorCount: number;
}

export function formatCrawlerProgress(
  counts: CrawlerProgressCounts,
  useColor: boolean
): string {
  const { crawledCount, pendingCount, activeCount, errorCount } = counts;

  if (!useColor) {
    return `Crawled: ${crawledCount} | Queued: ${pendingCount} | Active: ${activeCount} | Errors: ${errorCount}`;
  }

  const label = chalk.dim;
  const sep = chalk.dim(" | ");

  const crawled = `${label("Crawled:")} ${chalk.greenBright.bold(
    String(crawledCount)
  )}`;
  const queued = `${label("Queued:")} ${chalk.yellowBright.bold(
    String(pendingCount)
  )}`;
  const active = `${label("Active:")} ${chalk.cyanBright.bold(
    String(activeCount)
  )}`;
  const errors = `${label("Errors:")} ${
    errorCount > 0
      ? chalk.redBright.bold(String(errorCount))
      : chalk.greenBright.bold(String(errorCount))
  }`;

  return `${crawled}${sep}${queued}${sep}${active}${sep}${errors}`;
}

export function formatCrawlFinished(
  visitedCount: number,
  errorCount: number,
  useColor: boolean
): string {
  if (!useColor) {
    const errorLabel =
      errorCount === 0 ? "No crawl errors." : "Crawl errors found.";
    return `\nCrawl finished. Visited ${visitedCount} unique pages. ${errorLabel}`;
  }

  const finished = chalk.greenBright.bold("Crawl finished.");
  const visited = `${chalk.dim("Visited")} ${chalk.greenBright.bold(
    String(visitedCount)
  )} ${chalk.dim("unique pages.")}`;

  return `\n${finished} ${visited}`;
}

export function formatReportSaved(
  reportName: string,
  fileName: string,
  useColor: boolean
): string {
  if (!useColor) {
    return `${reportName} report saved to ${fileName}`;
  }

  return `${chalk.greenBright(reportName)} ${chalk.dim(
    "report saved to"
  )} ${chalk.cyanBright.bold(fileName)}`;
}

export function formatCrawlErrorsSaved(
  errorCount: number,
  fileName: string,
  useColor: boolean
): string {
  if (!useColor) {
    return `Crawl errors (${errorCount}) report saved to ${fileName}`;
  }

  return `${chalk.redBright(`Crawl errors (${errorCount})`)} ${chalk.dim(
    "report saved to"
  )} ${chalk.cyanBright.bold(fileName)}`;
}

export function formatAllReportsSaved(
  outputDir: string,
  useColor: boolean
): string {
  if (!useColor) {
    return `All reports saved in ${outputDir}`;
  }

  return `${chalk.greenBright("All reports saved in")} ${chalk.cyanBright.bold(
    outputDir
  )}`;
}
