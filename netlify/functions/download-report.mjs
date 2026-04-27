import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verify } from "./_jwt.mjs";
import { reportDownloadsEnabled } from "./_report-downloads.mjs";

const REPORT_ID = "fund_architecture_report";

// At runtime on Netlify, process.cwd() is /var/task and the PDFs are
// bundled at /var/task/netlify/functions/assets/ via included_files in
// netlify.toml. Using process.cwd() avoids the import.meta.url pitfall
// when esbuild transpiles ESM to CJS.
const ASSETS_DIR = join(process.cwd(), "netlify", "functions", "assets");

const FILES = {
  fr: {
    path: join(ASSETS_DIR, "fund-architecture-report-fr.pdf"),
    filename: "Rapport - Finance Durable et Structuration des Fonds.pdf",
  },
  en: {
    path: join(ASSETS_DIR, "fund-architecture-report-en.pdf"),
    filename: "Report - Sustainable Finance and Fund Structuring.pdf",
  },
};

export async function handler(event) {
  if (!reportDownloadsEnabled()) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "text/plain" },
      body: "Report downloads are currently unavailable.",
    };
  }

  const lang = (event.queryStringParameters && event.queryStringParameters.lang) || "";
  const token = (event.queryStringParameters && event.queryStringParameters.token) || "";

  if (!FILES[lang]) {
    return { statusCode: 400, body: "Unknown language" };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not set");
    return { statusCode: 500, body: "Server not configured" };
  }

  const payload = verify(token, secret);
  if (!payload || payload.rid !== REPORT_ID) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "text/plain" },
      body: "Access denied. The download link has expired or is invalid. Please resubmit the form.",
    };
  }

  const file = FILES[lang];
  const buffer = readFileSync(file.path);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
    },
    body: buffer.toString("base64"),
    isBase64Encoded: true,
  };
}
