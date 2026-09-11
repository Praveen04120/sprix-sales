# SPRIX Hiring Management Platform

Production internal candidate hiring management platform built specifically for **Sprix**. Integrates directly with real Google Forms and Google Sheets via a dedicated Google Apps Script API layer.

---

## 🎯 Hiring Architecture (3-Round System)

The platform organizes candidate progression strictly through three streamlined rounds:

```
Candidate Application (Google Form)
  ↓
Round 1: Application / Initial Screening
  ↓
Round 2: Phone Interview & Screening Call
  ↓
Round 3: Training + Final Evaluation (0–10 Score)
  ↓
Selected & Offered  /  Working Team Member  /  Rejected
```

- **Working Team Members**: Existing employees and onboarded candidates are marked as `Working` with direct entry of joining dates, roles, final scores (0–10), and performance notes without forcing them through the pipeline.
- **Single Stage Clarity**: Every candidate is mapped to exactly one active stage.

---

## 🚀 Key Production Features

1. **Clean Real Data Only**:
   - Zero mock data, demo modes, or placeholder candidates.
   - If Google integration is connecting or empty, shows clean zero-state without fake fallbacks.

2. **Secure Password Authentication**:
   - Protected entry portal requiring recruiter password (`APP_PASSWORD`).
   - Validated server-side via Next.js Route Handlers (`/api/auth/login`) with secure HttpOnly cookies.
   - Password is never visible in UI, helper text, or client bundles.

3. **Google Forms & Google Sheets Backend**:
   - Google Sheets serves as the primary data store.
   - Google Apps Script (`google_apps_script/Code.gs`) acts as the API layer.
   - Preserves original Google Form response columns while tracking internal statuses, final scores, and notes safely in dedicated metadata sheets.

4. **Simplified Main Dashboard**:
   - Clean, high-impact overview:
     - **Total Applications**
     - **Round 1 (Screening)**
     - **Round 2 (Phone Interviews)**
     - **Round 3 (Training & Final Evaluation)**
     - **Total Shortlisted**
   - Direct shortcuts to **Today's Dashboard** and **All Candidates**.

5. **Today's Dashboard (Daily Action Hub)**:
   - Interactive date selector (defaults to Today, supports any previous or future date).
   - **Today's Schedule**: Scheduled phone interviews, training sessions, and final evaluations for the selected date.
   - **Who Did I Call Today?**: Dedicated log of candidates contacted on that date with timestamp, reason for call, and outcome status.

6. **All Candidates & Manual Entry**:
   - Central directory containing all applicants, active candidates, and working employees.
   - Search across Candidate Name, Phone, and Email.
   - Filters: `All`, `Round 1`, `Round 2`, `Round 3`, `Selected`, `Rejected`, `Working`.
   - **[+ Add Candidate]** button: Allows direct manual registration of working team members or walk-in candidates with direct 0–10 final score input.

7. **Official Sprix Visual Identity**:
   - Sprix Deep Blue: `#01008A`
   - Sprix Vibrant Pink: `#FF0198`
   - Clean, light corporate styling with high readability and responsive design.

---

## 💻 Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your environment variables in `.env.local`:
```env
APP_PASSWORD=your_production_password
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_SHEET_ID=YOUR_GOOGLE_SHEET_ID
GOOGLE_FORM_ID=YOUR_GOOGLE_FORM_ID
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📊 Google Sheets & Apps Script Setup

1. In your Google Spreadsheet (where your Google Form responses are linked), open **Extensions > Apps Script**.
2. Replace existing code with the contents of [`google_apps_script/Code.gs`](./google_apps_script/Code.gs).
3. Click **Deploy > New deployment > Web app**.
4. Set **Execute as: Me** and **Who has access: Anyone**.
5. Copy the Web App URL into your `.env.local` as `GOOGLE_APPS_SCRIPT_URL` or paste it in the in-app **Settings** page.

---

## 🌐 Deploy to Vercel

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), import the repository.
3. Configure the Production Environment Variables in Vercel:
   - `APP_PASSWORD`: *(Your secure recruiter password, e.g. PraveenSPRIX@123)*
   - `GOOGLE_APPS_SCRIPT_URL`: *(Your deployed Google Apps Script URL)*
   - `GOOGLE_SHEET_ID`: *(Your Google Sheet ID)*
   - `GOOGLE_FORM_ID`: *(Your Google Form ID)*
4. Deploy!
