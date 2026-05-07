import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getStore } from "@netlify/blobs";
import nodemailer from "nodemailer";

const EVENT = JSON.parse(readFileSync(join(process.cwd(), "data", "soutenance.json"), "utf8"));
const EVENT_ID = EVENT.event_id;
const EVENT_TITLE = `Soutenance de thèse - ${EVENT.candidate}`;
const THESIS_TITLE = EVENT.thesis_title;
const EVENT_START_UTC = EVENT.start_utc;
const EVENT_END_UTC = EVENT.end_utc;
const LOCATION = EVENT.location_label;
const ZOOM_URL = EVENT.zoom_url;
const ZOOM_MEETING_ID = EVENT.zoom_meeting_id;
const ZOOM_PASSCODE = EVENT.zoom_passcode;
const DEFAULT_FROM = "leo.denis@polytechnique.edu";

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

const parseForm = (body) => {
  const raw = body || "";
  const params = new URLSearchParams(raw);
  const out = {};
  for (const [key, value] of params.entries()) out[key] = value;
  return out;
};

const normalize = (value) => String(value || "").trim();
const normalizeEmail = (value) => normalize(value).toLowerCase();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const hashEmail = (email) => createHash("sha256").update(email).digest("hex");

const parseSecure = (value, port) => {
  if (typeof value === "string" && value.trim() !== "") {
    return ["1", "true", "yes"].includes(value.trim().toLowerCase());
  }
  return Number(port) === 465;
};

const requiredEnv = (key) => {
  const value = process.env[key];
  if (!value || String(value).trim() === "") {
    throw new Error(`${key} is not set`);
  }
  return value;
};

const formatName = ({ firstName, lastName }) => `${firstName} ${lastName}`.trim();

const escapeIcs = (value) =>
  String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const foldIcsLine = (line) => {
  const chunks = [];
  let rest = line;
  while (rest.length > 74) {
    chunks.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
};

const createIcs = ({ attendeeEmail, attendeeName, fromEmail }) => {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const uid = `${EVENT_ID}-${hashEmail(attendeeEmail).slice(0, 16)}@leo-denis.eu`;
  const description = [
    `Soutenance de thèse de Léo Denis: ${THESIS_TITLE}`,
    `Zoom: ${ZOOM_URL}`,
    `ID de réunion: ${ZOOM_MEETING_ID}`,
    `Code secret: ${ZOOM_PASSCODE}`,
  ].join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Léo Denis//Soutenance RSVP//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${EVENT_START_UTC}`,
    `DTEND:${EVENT_END_UTC}`,
    `SUMMARY:${escapeIcs(EVENT_TITLE)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(LOCATION)}`,
    `ORGANIZER;CN=Léo Denis:mailto:${fromEmail}`,
    `ATTENDEE;CN=${escapeIcs(attendeeName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${attendeeEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(foldIcsLine)
    .join("\r\n");
};

const buildEmail = ({ firstName, inPerson }) => {
  const attendanceLine = inPerson
    ? "Vous avez indiqué prévoir d'assister à la soutenance en présentiel. Le lieu exact vous sera confirmé dès qu'il sera disponible."
    : "Vous pourrez assister à la soutenance en visioconférence avec les informations Zoom ci-dessous.";
  const safeFirstName = escapeHtml(firstName);

  const text = [
    `Bonjour ${firstName},`,
    "",
    "Merci pour votre RSVP à ma soutenance de thèse.",
    "",
    `Titre : ${THESIS_TITLE}`,
    `Date : ${EVENT.date_label}`,
    `Heure : ${EVENT.time_label} (${EVENT.timezone_label})`,
    `Lieu : ${LOCATION}`,
    "",
    attendanceLine,
    "",
    `Lien Zoom : ${ZOOM_URL}`,
    `ID de réunion : ${ZOOM_MEETING_ID}`,
    `Code secret : ${ZOOM_PASSCODE}`,
    "",
    "Une invitation calendrier est jointe à cet email.",
    "",
    "Bien cordialement,",
    "Léo Denis",
  ].join("\n");

  const html = `
    <p>Bonjour ${safeFirstName},</p>
    <p>Merci pour votre RSVP à ma soutenance de thèse.</p>
    <p>
      <strong>Titre :</strong> ${THESIS_TITLE}<br>
      <strong>Date :</strong> ${EVENT.date_label}<br>
      <strong>Heure :</strong> ${EVENT.time_label} (${EVENT.timezone_label})<br>
      <strong>Lieu :</strong> ${LOCATION}
    </p>
    <p>${attendanceLine}</p>
    <p>
      <strong>Zoom :</strong> <a href="${ZOOM_URL}">${ZOOM_URL}</a><br>
      <strong>ID de réunion :</strong> ${ZOOM_MEETING_ID}<br>
      <strong>Code secret :</strong> ${ZOOM_PASSCODE}
    </p>
    <p>Une invitation calendrier est jointe à cet email.</p>
    <p>Bien cordialement,<br>Léo Denis</p>
  `;

  return { text, html };
};

const sendConfirmationEmail = async ({ firstName, lastName, email, inPerson }) => {
  const host = requiredEnv("SMTP_HOST");
  const port = Number(requiredEnv("SMTP_PORT"));
  const user = requiredEnv("SMTP_USER");
  const pass = requiredEnv("SMTP_PASS");
  const fromEmail = normalizeEmail(process.env.SMTP_FROM || DEFAULT_FROM);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid port number");
  }
  if (!fromEmail.endsWith("@polytechnique.edu")) {
    throw new Error("SMTP_FROM must be an @polytechnique.edu address");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: parseSecure(process.env.SMTP_SECURE, port),
    auth: { user, pass },
  });

  const attendeeName = formatName({ firstName, lastName });
  const { text, html } = buildEmail({ firstName, inPerson });
  const ics = createIcs({ attendeeEmail: email, attendeeName, fromEmail });

  await transporter.sendMail({
    from: fromEmail,
    replyTo: fromEmail,
    to: email,
    subject: "Confirmation RSVP - Soutenance de thèse Léo Denis",
    text,
    html,
    attachments: [
      {
        filename: "soutenance-leo-denis.ics",
        content: ics,
        contentType: "text/calendar; charset=utf-8; method=REQUEST",
      },
    ],
  });
};

export default async function handler(request) {
  if (request.method !== "POST") {
    return json(405, { ok: false, message: "Method not allowed" });
  }

  const fields = parseForm(await request.text());

  if (fields["bot-field"]) {
    return json(200, { ok: true, ignored: true, message: "Merci, votre RSVP est enregistré." });
  }

  if (fields.event_id !== EVENT_ID) {
    return json(400, { ok: false, message: "Formulaire RSVP inconnu." });
  }

  const firstName = normalize(fields.first_name);
  const lastName = normalize(fields.last_name);
  const email = normalizeEmail(fields.email);
  const inPerson = fields.in_person === "yes";

  if (!firstName || !lastName || !email) {
    return json(400, { ok: false, message: "Merci de renseigner votre prénom, votre nom et votre adresse email." });
  }
  if (!isEmail(email)) {
    return json(400, { ok: false, message: "L'adresse email renseignée n'est pas valide." });
  }

  const store = getStore("soutenance-rsvps");
  const key = `${EVENT_ID}/${hashEmail(email)}`;
  const now = new Date().toISOString();
  const payload = {
    event_id: EVENT_ID,
    first_name: firstName,
    last_name: lastName,
    email,
    in_person: inPerson,
    created_at: now,
    user_agent: request.headers.get("user-agent") || "",
  };

  let reservation;
  try {
    reservation = await store.setJSON(key, { ...payload, status: "pending" }, { onlyIfNew: true });
  } catch (err) {
    console.error("RSVP dedupe reservation failed:", err);
    return json(500, { ok: false, message: "Le service RSVP est temporairement indisponible. Merci de réessayer plus tard." });
  }

  if (!reservation.modified) {
    return json(200, {
      ok: true,
      duplicate: true,
      message: "Votre RSVP est déjà enregistré pour cette adresse email.",
    });
  }

  try {
    await sendConfirmationEmail({ firstName, lastName, email, inPerson });
    await store.setJSON(key, { ...payload, status: "confirmed", confirmed_at: new Date().toISOString() });
  } catch (err) {
    console.error("RSVP confirmation email failed:", err);
    try {
      await store.delete(key);
    } catch (deleteErr) {
      console.error("Failed to release RSVP dedupe key after email error:", deleteErr);
    }
    return json(500, { ok: false, message: "Le RSVP n'a pas pu être confirmé par email. Merci de réessayer plus tard." });
  }

  return json(200, {
    ok: true,
    message: "Merci, votre RSVP est confirmé. Un email de confirmation vient de vous être envoyé.",
  });
}
