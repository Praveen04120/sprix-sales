# Sprix Hiring Platform - Google Sheets & Apps Script Setup

This document explains how to connect your **Google Forms** and **Google Sheets** to the **Sprix Hiring Platform** without using any external databases.

---

## 1. Create the Google Spreadsheet

1. Open [Google Sheets](https://sheets.new) and create a new spreadsheet named:  
   `Sprix Hiring Master Database 2026`
2. Copy the **Spreadsheet ID** from the browser URL:  
   `https://docs.google.com/spreadsheets/d/`**`<YOUR_SPREADSHEET_ID>`**`/edit`

---

## 2. Install the Google Apps Script

1. In your spreadsheet, click **Extensions** > **Apps Script**.
2. Delete any existing code in `Code.gs`.
3. Copy and paste the entire content of [`google_apps_script/Code.gs`](./Code.gs) into the editor.
4. From the function dropdown at the top, select `setupSheets` and click **Run**.
5. Grant the standard Google authorization when prompted.
6. Check your spreadsheet: you will see 6 sheets automatically created and formatted with Sprix Blue headers:
   - `Candidates`
   - `Round2_Interviews`
   - `Training`
   - `Final_Evaluation`
   - `Calendar`
   - `Settings`

---

## 3. Deploy as a Web App

1. In the Apps Script editor, click the blue **Deploy** button (top right) > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description**: `Sprix Hiring Platform API`
   - **Execute as**: `Me (your google account)`
   - **Who has access**: `Anyone` *(Note: this enables your Vercel server-side route handler to communicate with the sheet)*
4. Click **Deploy**.
5. Copy the **Web App URL** (starts with `https://script.google.com/macros/s/.../exec`).

---

## 4. Configure in Sprix Platform

You can connect in two ways:

### Option A: In the Sprix Platform Settings UI (No redeploy needed)
1. Open your Sprix Platform dashboard.
2. Go to **Settings** (in the sidebar).
3. Paste the **Apps Script Web App URL**, **Google Sheet ID**, and **Google Form ID**.
4. Toggle from **Demo Mode** to **Live Google Sheets Mode**.
5. Click **Save Settings** and **Test Connection**.

### Option B: Via Environment Variables (for Vercel deployment)
Add the following in your `.env.local` or Vercel Environment Variables:
```env
APP_PASSWORD=sprix2026
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_SHEET_ID=YOUR_SPREADSHEET_ID
GOOGLE_FORM_ID=YOUR_GOOGLE_FORM_ID
NEXT_PUBLIC_DEMO_MODE=false
```

---

## 5. Google Form Integration

1. Create or open your Google Form for hiring applications.
2. In the Form, go to the **Responses** tab and click **Link to Sheets**.
3. Choose **Select existing spreadsheet** and choose your `Sprix Hiring Master Database 2026`.
4. New candidates submitting the form will appear directly in the spreadsheet and will be fetched automatically by the Sprix Hiring Platform.
