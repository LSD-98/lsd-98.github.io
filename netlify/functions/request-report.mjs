import { sign } from "./_jwt.mjs";

const REPORT_ID = "fund_architecture_report";
const TOKEN_TTL_SECONDS = 15 * 60;
const ACCESS_PAGE = "/fund-architecture-report-access/";
const THANKS_PAGE = "/fund-architecture-thanks/";

const redirect = (location) => ({
  statusCode: 302,
  headers: { Location: location },
  body: "",
});

const parseForm = (body, isBase64) => {
  const raw = isBase64 ? Buffer.from(body, "base64").toString("utf8") : body || "";
  const params = new URLSearchParams(raw);
  const out = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
};

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const fields = parseForm(event.body, event.isBase64Encoded);

  // Honeypot: bots tend to fill every field. Silently accept but skip logging.
  const isBot = Boolean(fields["bot-field"]);

  const required = ["full_name", "job_title", "company", "email", "consent"];
  for (const key of required) {
    if (!fields[key] || String(fields[key]).trim() === "") {
      return redirect(`${ACCESS_PAGE}?error=missing_${key}`);
    }
  }
  if (!isEmail(fields.email)) {
    return redirect(`${ACCESS_PAGE}?error=invalid_email`);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not set");
    return redirect(`${ACCESS_PAGE}?error=server_config`);
  }

  // Fire-and-forget webhook to Google Sheets. Do not block the redirect.
  if (!isBot && process.env.SHEETS_WEBHOOK_URL) {
    const userAgent = event.headers["user-agent"] || event.headers["User-Agent"] || "";
    const payload = {
      timestamp: new Date().toISOString(),
      report_id: REPORT_ID,
      full_name: fields.full_name,
      job_title: fields.job_title,
      company: fields.company,
      email: fields.email,
      report_language: fields.report_language || "",
      consent: fields.consent,
      source_page: fields.source_page || "",
      user_agent: userAgent,
    };
    try {
      await fetch(process.env.SHEETS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Log but do not fail the download: we do not want Sheets downtime to block users.
      console.error("Sheets webhook failed:", err);
    }
  }

  const token = sign(
    {
      rid: REPORT_ID,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    },
    secret
  );

  return redirect(`${THANKS_PAGE}?token=${encodeURIComponent(token)}`);
}
