import * as fs from "fs";
import * as path from "path";

/**
 * Parses URL list files in JSON or CSV format.
 *
 * JSON format: Array of URLs or object with "urls" property
 * ["https://example.com", "https://example.com/about"]
 * or {"urls": ["https://example.com", "https://example.com/about"]}
 *
 * CSV format: Single column with URLs (optional header row)
 * https://example.com
 * https://example.com/about
 */
export async function parseUrlList(filePath: string): Promise<string[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`URL list file not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, "utf-8");

  switch (ext) {
    case ".json":
      return parseJsonUrlList(content);
    case ".csv":
      return parseCsvUrlList(content);
    default:
      throw new Error(
        `Unsupported file format: ${ext}. Only .json and .csv files are supported.`
      );
  }
}

function parseJsonUrlList(content: string): string[] {
  try {
    const data = JSON.parse(content);

    if (Array.isArray(data)) {
      return data.filter((item: any) => typeof item === "string");
    } else if (data.urls && Array.isArray(data.urls)) {
      return data.urls.filter((item: any) => typeof item === "string");
    } else {
      throw new Error(
        'JSON must be an array of URLs or have an "urls" array property'
      );
    }
  } catch (error: any) {
    throw new Error(`Invalid JSON format: ${error.message}`);
  }
}

function parseCsvUrlList(content: string): string[] {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  if (lines.length === 0) {
    return [];
  }

  const urls: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header row if it contains "url" and comma
    if (i === 0 && line.includes("url") && line.includes(",")) {
      continue;
    }

    // Extract first column (URL) - CSV should only have one column with URLs
    const url = line.split(",")[0].trim().replace(/"/g, "");

    if (url && url.startsWith("http")) {
      urls.push(url);
    }
  }

  return urls;
}
