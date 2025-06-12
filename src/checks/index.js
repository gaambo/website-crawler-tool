const headingsCheck = require("./headings");
const imagesCheck = require("./images");

const checks = [headingsCheck, imagesCheck];

function determineEnabledChecks(requestedCheckNames = [], verbose = false) {
  if (!requestedCheckNames || requestedCheckNames.length === 0) {
    if (verbose)
      console.log(
        "No specific checks requested, enabling all available checks."
      );
    return checks; // Return all available check objects
  }

  const availableCheckNames = checks.map((c) => c.name);
  const enabledChecks = [];

  for (const requestedName of requestedCheckNames) {
    const checkIndex = availableCheckNames.indexOf(requestedName);
    if (checkIndex !== -1) {
      enabledChecks.push(checks[checkIndex]);
    } else {
      console.warn(
        `Warning: Unknown check '${requestedName}' will be ignored.`
      );
    }
  }

  if (verbose) {
    console.log(
      `Enabled checks by CheckService: ${enabledChecks
        .map((c) => c.name)
        .join(", ")}`
    );
  }
  return enabledChecks;
}

// To add a new check, import it here and add it to the array.
module.exports = {
  determineEnabledChecks,
  checks,
};
