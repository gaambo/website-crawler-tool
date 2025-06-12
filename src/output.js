const { createObjectCsvWriter } = require("csv-writer");
const fs = require("fs");
const path = require("path");

async function writeResults(results, availableChecks, outputDir) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let reportsGenerated = 0;

  // Dynamically write reports for each check
  for (const check of availableChecks) {
    const checkResults = results[check.name];
    if (checkResults && checkResults.length > 0) {
      const csvWriter = createObjectCsvWriter({
        path: path.join(outputDir, `${check.name}.csv`),
        header: check.headers,
      });

      await csvWriter.writeRecords(checkResults);
      console.log(`${check.name} report saved to ${check.name}.csv`);
      reportsGenerated++;
    }
  }

  // Write crawl errors
  if (results.errors && results.errors.length > 0) {
    const errorWriter = createObjectCsvWriter({
      path: path.join(outputDir, "errors.csv"),
      header: [
        { id: "url", title: "URL" },
        { id: "error", title: "Error" },
      ],
    });
    await errorWriter.writeRecords(results.errors);
    console.log(`Crawl errors report saved to errors.csv`);
    reportsGenerated++;
  }

  if (reportsGenerated === 0) {
    console.log("No issues found. No reports were generated.");
  } else {
    console.log(`All reports saved in ${path.resolve(outputDir)}`);
  }
}

module.exports = { writeResults };
