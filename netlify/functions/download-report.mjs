import { readFileSync } from "node:fs";
import { verify } from "./_jwt.mjs";

const REPORT_ID = "fund_architecture_report";

const FILES = {
  fr: {
    path: new URL("./assets/fund-architecture-report-fr.pdf", import.meta.url),
    filename: "Rapport - Finance Durable et Structuration des Fonds.pdf",
  },
  en: {
    path: new URL("./assets/fund-architecture-report-en.pdf", import.meta.url),
    filename: "Report - Sustainable Finance and Fund Structuring.pdf",
  },
};

export async function handler(event) {
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
