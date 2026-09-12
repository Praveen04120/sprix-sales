# Sprix Hiring Platform - Production Google Sheets & Apps Script Setup

This document provides step-by-step instructions to connect your **real Google Forms** and **real Google Sheets** to the **Sprix Hiring Platform**.

---

## 1. Open Your Existing Google Spreadsheet
1. Open the Google Spreadsheet where your **Sprix Japan Recruitment Form** responses land.
2. Confirm your Spreadsheet ID:
   ```
   1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ
   ```

---

## 2. Update Code.gs in Google Apps Script
1. In the spreadsheet menu, click **Extensions** > **Apps Script**.
2. Replace all code in `Code.gs` with the updated code from [`google_apps_script/Code.gs`](./Code.gs).
3. Ensure `DEFAULT_SPREADSHEET_ID = '1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ';` matches your Google Sheet.
4. Save the project (`Ctrl + S`).

---

## 3. Authorize Permissions (Crucial Step)
1. In the toolbar function dropdown at the top, select **`testSpreadsheetAccess`** and click **Run**.
2. When the "Authorization Required" modal appears:
   - Click **Review Permissions**.
   - Choose your Google Account.
   - Click **Advanced** (bottom left).
   - Click **Go to Untitled project (unsafe)**.
   - Click **Allow**.
3. In the Execution log below, verify:
   ```
   SUCCESS: Opened spreadsheet "Sprix Recruitment..."
   Detected X sheet tabs:
     [1] "Form Responses 1" (X rows, Y cols)
   ```
   *This single run grants the Web App explicit `SpreadsheetApp.openById` access.*

4. *(Optional)* Select **`setupSprixSystem`** from the function dropdown and click **Run** once to ensure the helper sheets (`Sprix_Calendar`, `Sprix_Candidate_Metadata`, `Sprix_Manual_Candidates`) exist.

---

## 4. Deploy Updated Web App Version
1. In the top-right corner of the Apps Script editor, click **Deploy** > **Manage deployments**.
2. Click the **Edit (pencil)** icon next to your active Web App deployment.
3. Under **Version**, click the dropdown and choose **New version**.
4. Set description: `v2.2 - Explicit Spreadsheet ID Access`.
5. Ensure:
   - **Execute as**: **`Me (your email)`**
   - **Who has access**: **`Anyone`**
6. Click **Deploy**.
7. Copy the Web App URL (ending with `/exec`).

---

## 5. Connect to Sprix Platform
1. Open the Sprix Hiring Management platform (https://sprix-sales.vercel.app).
2. Go to **Settings** in the sidebar.
3. Paste the **Google Apps Script Web App URL**.
4. Confirm your **Google Sheet ID**: `1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ`.
5. Click **Test Connection** — verify that the sheet title and candidate records appear with a green checkmark.
6. Click **Save Settings**.
7. Click **Sync** in the top navigation bar to verify live data synchronization.

---

## Data Safety Guarantee
- **Read-Only on Production Form Responses**: Normal sync operations and candidate list queries ONLY read data using `.getValues()`. No candidate responses or form submissions are ever modified, appended, sorted, or deleted.
- **Write Isolation**: Mutation actions support targeting a separate test Google Sheet via the `sheetId` parameter if write testing is required.
