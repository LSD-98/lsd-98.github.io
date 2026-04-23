/**
 * Minimal webhook receiving JSON submissions from the Netlify function
 * `request-report` and appending a row to the existing Google Sheet.
 *
 * Deploy:
 *   Extensions > Apps Script > New deployment > Web app
 *   - Execute as: Me
 *   - Who has access: Anyone
 * Copy the deployment URL and set it as SHEETS_WEBHOOK_URL in Netlify env vars.
 */

var SHEET_ID = '1mq7NBLO2Yx12ELAXVicKQysRHbtmfVbXpYxr6ZSATNQ';
var SHEET_NAME = 'Submissions'; // Created automatically if missing.

var HEADERS = [
  'Timestamp',
  'Report ID',
  'Full name',
  'Job title',
  'Company',
  'Email',
  'Language',
  'Consent',
  'Source page',
  'User agent'
];

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet_();
    sheet.appendRow([
      payload.timestamp || new Date().toISOString(),
      payload.report_id || '',
      payload.full_name || '',
      payload.job_title || '',
      payload.company || '',
      payload.email || '',
      payload.report_language || '',
      payload.consent || '',
      payload.source_page || '',
      payload.user_agent || ''
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
