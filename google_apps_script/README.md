# Sprix Hiring Platform - Production Google Sheets & Apps Script Setup

This document provides step-by-step instructions to connect your **real Google Forms** and **real Google Sheets** to the **Sprix Hiring Platform**.

---

## 1. Open Your Existing Google Spreadsheet
1. Open the Google Spreadsheet where your **Sprix Japan Recruitment Form** responses land.
2. Ensure you have your Form response sheet (e.g. `Form Responses 1` or `Candidates`).

---

## 2. Install & Update Google Apps Script
1. In the spreadsheet menu, click **Extensions** > **Apps Script**.
2. Replace all code in `Code.gs` with the code from [`google_apps_script/Code.gs`](./Code.gs).
3. Save the project (`Ctrl + S`).
4. In the toolbar function dropdown, select **`setupSprixSystem`** and click **Run**.
5. When prompted, click **Review permissions** > choose your Google account > **Advanced** > **Go to Untitled project (unsafe)** > **Allow**.
6. This safely creates the helper sheets without modifying or deleting your existing form responses:
   - `Sprix_Candidate_Metadata` (for Status, Final Scores 0-10, Joining Dates, Call Reasons, Notes)
   - `Sprix_Calendar` (for scheduled phone interviews, training, and calls)
   - `Sprix_Manual_Candidates` (for candidates added directly via `+ Add Candidate`)

---

## 3. Deploy as a Web App (Crucial Step)
1. In the top-right corner of the Apps Script editor, click **Deploy** > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure the deployment settings:
   - **Description**: `Sprix Production API v2.1`
   - **Execute as**: **`Me (your email)`**
   - **Who has access**: **`Anyone`** *(This allows the Next.js production server on Vercel to sync with the sheet)*
4. Click **Deploy**.
5. Copy the generated **Web app URL** (ending with `/exec`).

> [!IMPORTANT]
> If you ever update code in `Code.gs` in the future, click **Deploy** > **Manage deployments** > click the pencil icon > change version to **New version** > click **Deploy**. This ensures the live URL serves your latest code.

---

## 4. Connect to Sprix Platform
1. Open the Sprix Hiring Management platform (https://sprix-sales.vercel.app).
2. Go to **Settings** in the sidebar.
3. Paste the **Google Apps Script Web App URL**.
4. Paste your **Google Sheet ID** and **Google Form URL**.
5. Click **Test Connection** — verify that the sheet title and candidate count appear with a green checkmark.
6. Click **Save Settings**.
7. Click **Sync** in the top navigation bar to verify full data synchronization.
