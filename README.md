# SPRIX Hiring Management Platform

Production internal candidate hiring management platform built specifically for **Sprix**. Integrates directly with real Google Forms and Google Sheets via a dedicated Google Apps Script API layer, backed by **Supabase PostgreSQL** for multi-device data persistence and cross-laptop synchronization.

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

## ⚡ Cross-Device Data Persistence (Supabase Architecture)

The platform uses Supabase PostgreSQL as the central operational persistence layer:

1. **Shared Platform Settings**:
   - Google Apps Script URL, Sheet ID, and Form ID saved on **Laptop A** are automatically stored in the `platform_settings` table and instantly available on **Laptop B**, **Laptop C**, and any authorized device.
2. **Persistent Candidate Operational Records**:
   - Custom candidate statuses, Round 2 phone interview notes, Round 3 training progress, and 0–10 final scores are saved to Supabase and persist across browser reloads, redeployments, and device switches.
3. **Strictly Read-Only Google Sheets Sync**:
   - The production Google Sheet (`1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ`) remains 100% untouched and safe.
   - Synchronizing with Google Sheets imports new incoming form responses into Supabase without overwriting recruiter notes, training progress, or updated candidate statuses.
4. **Calendar & Today's Schedule**:
   - Scheduled phone interviews, screening calls, and training sessions persist in `calendar_events`.

---

## 🗄️ Database Tables (Supabase Schema)

The database schema is defined in [`supabase/schema.sql`](./supabase/schema.sql):

- **`candidates`**: Core applicant records, contact info, stages, statuses, 0–10 final scores, notes, and dynamic Google Form answers.
- **`candidate_rounds`**: Granular progression records for Round 1, Round 2, and Round 3.
- **`training_records`**: Round 3 training duration, attendance, evaluation remarks, and final scores.
- **`calendar_events`**: Scheduled calls, interviews, training sessions, and meetings.
- **`platform_settings`**: Cross-device integration settings singleton (`id = 'default'`).
- **`platform_activity`**: Audit trail logging candidate status transitions, score updates, and system sync events.

---

## 🚀 Setup & Deployment Guide

### 1. Supabase Setup

1. Log in to [Supabase](https://supabase.com) and create a new project (e.g., `sprix-hiring-platform`).
2. Go to **SQL Editor** in your Supabase Dashboard.
3. Open [`supabase/schema.sql`](./supabase/schema.sql), copy its complete contents, paste into the SQL Editor, and click **Run**.
4. Go to **Project Settings > API** and copy:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon / public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role key** (`SUPABASE_SERVICE_ROLE_KEY`)

### 2. Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
```

Configure `.env.local`:
```env
APP_PASSWORD=PraveenSPRIX@123

# Supabase Keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Integration
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
GOOGLE_SHEET_ID=1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ
GOOGLE_FORM_ID=
```

```bash
# 3. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📊 Google Sheets & Apps Script Setup

1. In your Google Spreadsheet (where your Google Form responses land), open **Extensions > Apps Script**.
2. Replace existing code with the contents of [`google_apps_script/Code.gs`](./google_apps_script/Code.gs).
3. Click **Deploy > New deployment > Web app**.
4. Set **Execute as: Me** and **Who has access: Anyone**.
5. Copy the Web App URL and paste it into the in-app **Settings** page or `.env.local`.

---

## 🌐 Deploy to Vercel

1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), import the repository `Praveen04120/sprix-sales`.
3. Add the following **Environment Variables** in Vercel Project Settings:
   - `APP_PASSWORD`: `PraveenSPRIX@123`
   - `NEXT_PUBLIC_SUPABASE_URL`: *(Your Supabase project URL)*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: *(Your Supabase anon key)*
   - `SUPABASE_SERVICE_ROLE_KEY`: *(Your Supabase service role key)*
   - `GOOGLE_APPS_SCRIPT_URL`: *(Your deployed Google Apps Script URL)*
   - `GOOGLE_SHEET_ID`: `1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ`
   - `GOOGLE_FORM_ID`: *(Your Google Form ID)*
4. Deploy!
