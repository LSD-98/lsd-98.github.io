# Fund Architecture report gate setup

This folder contains the Google Apps Script backend for the gated Fund Architecture report access flow.

## What this backend does

- renders the dedicated report access page
- validates the required form fields and consent checkbox
- writes one submission row into Google Sheets
- writes one download row whenever a user selects FR or EN
- serves the requested FR or EN PDF through Apps Script so the files do not need to stay public on GitHub Pages

## Google setup

1. Create a Google Sheet and add a tab named `Downloads`.
2. Add the following header row:
   - `timestamp`
   - `event_type`
   - `submission_id`
   - `report_id`
   - `report_language`
   - `full_name`
   - `job_title`
   - `company`
   - `email`
   - `consent_accepted`
   - `source_page`
   - `user_agent`
3. Upload the two PDF files to Google Drive.
4. Open `FundArchitectureReportGate.gs` in Apps Script.
5. Replace:
   - `YOUR_GOOGLE_SHEET_ID`
   - `YOUR_FR_DRIVE_FILE_ID`
   - `YOUR_EN_DRIVE_FILE_ID`
6. Deploy the script as a Web App:
   - execute as: `Me`
   - who has access: `Anyone`
7. Copy the deployment URL.
8. Paste that URL into `config/_default/params.yaml` under `gated_downloads.apps_script_url`.
9. The site-side access page will send visitors to the Apps Script URL with:
   - `report_id=fund_architecture_report`
   - `source_page=/Organizational_Architectures/`

## Local file handling

The PDF files have been moved out of `content/` and into the ignored local folder `private/google-drive-upload/` so they are no longer published by Hugo. Upload those local copies to Google Drive before deploying the gate.
