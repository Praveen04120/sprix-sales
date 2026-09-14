-- ==============================================================================
-- SPRIX HIRING MANAGEMENT PLATFORM — PRODUCTION DATABASE SCHEMA
-- PostgreSQL / Supabase Schema Definition
-- Version: 1.0.0 (Production)
--
-- This schema establishes the central persistent storage layer for Sprix,
-- enabling cross-device synchronization, 3-round hiring workflows,
-- calendar tracking, and shared integration settings.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Trigger Function for Automatic updated_at Timestamps
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- TABLE: candidates
-- Central candidate registry across all hiring stages and working employees
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_code TEXT UNIQUE,                       -- e.g. SPRIX-0001, SPRIX-FR-0001
  source_id TEXT,                                  -- Stable ID from Google Forms / Sheets
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  role TEXT DEFAULT 'Inside Sales Representative',
  application_date TEXT,                           -- Formatted YYYY-MM-DD or readable string
  current_stage TEXT NOT NULL DEFAULT 'ROUND_1',   -- ROUND_1, ROUND_2, ROUND_3, SELECTED, REJECTED, WORKING
  current_status TEXT NOT NULL DEFAULT 'New',      -- New, Round 1, Round 2, Round 3, Shortlisted, Selected, Rejected, Working
  source TEXT DEFAULT 'Google Form',               -- Google Form, Manual, Existing Employee
  final_score NUMERIC(4, 2),                       -- 0.00 to 10.00 score
  form_responses JSONB DEFAULT '{}'::jsonb,        -- Dynamic raw Google Form answers
  admin_notes JSONB DEFAULT '[]'::jsonb,           -- [{ id, timestamp, author, note }]
  history JSONB DEFAULT '[]'::jsonb,               -- [{ stage, status, timestamp, notes }]
  interview_date TEXT,                             -- Round 2 date
  interview_time TEXT,                             -- Round 2 time
  call_reason TEXT,                                -- Purpose of interview call
  call_status TEXT DEFAULT 'Scheduled',            -- Scheduled, Completed, Pending, Missed
  interview_notes TEXT,                            -- Recruiter call notes
  joining_date TEXT,                               -- Onboarding / start date
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidates Triggers & Indexes
DROP TRIGGER IF EXISTS set_candidates_updated_at ON candidates;
CREATE TRIGGER set_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_candidates_code ON candidates (candidate_code);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_candidates_phone ON candidates (phone);
CREATE INDEX IF NOT EXISTS idx_candidates_stage ON candidates (current_stage);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates (current_status);
CREATE INDEX IF NOT EXISTS idx_candidates_source_id ON candidates (source_id);

-- ------------------------------------------------------------------------------
-- TABLE: candidate_rounds
-- Specific round tracking and stage transitions (Round 1, 2, 3)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidate_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  round_number INT NOT NULL CHECK (round_number IN (1, 2, 3)),
  status TEXT NOT NULL DEFAULT 'Pending',          -- Pending, Scheduled, In Progress, Completed, Passed, Failed, Skipped
  scheduled_date DATE,
  completed_date DATE,
  notes TEXT,
  score NUMERIC(4, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, round_number)
);

DROP TRIGGER IF EXISTS set_candidate_rounds_updated_at ON candidate_rounds;
CREATE TRIGGER set_candidate_rounds_updated_at
BEFORE UPDATE ON candidate_rounds
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_candidate_rounds_cand ON candidate_rounds (candidate_id);

-- ------------------------------------------------------------------------------
-- TABLE: training_records
-- Round 3 Training details, attendance, evaluations, and 0-10 scoring
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  training_start_date DATE,
  training_end_date DATE,
  training_days_completed INT DEFAULT 0,
  training_status TEXT DEFAULT 'In Training',       -- In Training, Completed, Discontinued
  attendance_info JSONB DEFAULT '{}'::jsonb,
  training_notes TEXT,
  final_score NUMERIC(4, 2),                       -- 0.00 to 10.00
  evaluation_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id)
);

DROP TRIGGER IF EXISTS set_training_records_updated_at ON training_records;
CREATE TRIGGER set_training_records_updated_at
BEFORE UPDATE ON training_records
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_training_records_cand ON training_records (candidate_id);

-- ------------------------------------------------------------------------------
-- TABLE: calendar_events
-- Scheduled calls, phone interviews, training sessions, and evaluations
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  candidate_name TEXT,
  event_type TEXT NOT NULL DEFAULT 'CALL',         -- CALL, INTERVIEW, TRAINING, FINAL_EVALUATION, MEETING
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TEXT,                                 -- e.g. 11:00 AM
  end_time TEXT,
  reason TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Scheduled',        -- Scheduled, Completed, Pending, Missed, Cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER set_calendar_events_updated_at
BEFORE UPDATE ON calendar_events
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events (start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_cand ON calendar_events (candidate_id);

-- ------------------------------------------------------------------------------
-- TABLE: platform_settings
-- Cross-device shared configuration singleton (Apps Script URL, Sheet ID, Form ID)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',           -- Single configuration row
  apps_script_url TEXT,
  google_sheet_id TEXT,
  google_sheet_url TEXT,
  google_form_id TEXT,
  google_form_url TEXT,
  last_sync_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER set_platform_settings_updated_at
BEFORE UPDATE ON platform_settings
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Seed the initial singleton row if not exists
INSERT INTO platform_settings (id, google_sheet_id)
VALUES ('default', '1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- TABLE: platform_activity
-- Audit trail for candidate changes, status transitions, scores, and settings
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,                       -- STATUS_CHANGE, SCORE_UPDATE, CANDIDATE_ADD, SETTINGS_UPDATE, SYNC, CALENDAR_UPDATE
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_activity_created ON platform_activity (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_activity_cand ON platform_activity (candidate_id);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Protect data while enabling secure backend operations
-- ------------------------------------------------------------------------------

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_activity ENABLE ROW LEVEL SECURITY;

-- 1. Service Role full access policies (Used by Next.js Server Route Handlers)
CREATE POLICY "Service Role full access on candidates"
ON candidates FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR current_user = 'postgres' OR session_user = 'postgres');

CREATE POLICY "Service Role full access on candidate_rounds"
ON candidate_rounds FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR current_user = 'postgres' OR session_user = 'postgres');

CREATE POLICY "Service Role full access on training_records"
ON training_records FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR current_user = 'postgres' OR session_user = 'postgres');

CREATE POLICY "Service Role full access on calendar_events"
ON calendar_events FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR current_user = 'postgres' OR session_user = 'postgres');

CREATE POLICY "Service Role full access on platform_settings"
ON platform_settings FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR current_user = 'postgres' OR session_user = 'postgres');

CREATE POLICY "Service Role full access on platform_activity"
ON platform_activity FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR current_user = 'postgres' OR session_user = 'postgres');

-- 2. Authenticated / Anon access via Next.js backend (read & write permitted when called via application client)
-- Allows reading candidates and settings through configured Supabase clients
CREATE POLICY "Allow read access to candidates"
ON candidates FOR SELECT
USING (true);

CREATE POLICY "Allow read access to candidate_rounds"
ON candidate_rounds FOR SELECT
USING (true);

CREATE POLICY "Allow read access to training_records"
ON training_records FOR SELECT
USING (true);

CREATE POLICY "Allow read access to calendar_events"
ON calendar_events FOR SELECT
USING (true);

CREATE POLICY "Allow read access to platform_settings"
ON platform_settings FOR SELECT
USING (true);

CREATE POLICY "Allow read access to platform_activity"
ON platform_activity FOR SELECT
USING (true);

-- Allow authorized write operations (via server handler or client with anon/service key)
CREATE POLICY "Allow write operations on candidates"
ON candidates FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update operations on candidates"
ON candidates FOR UPDATE
USING (true);

CREATE POLICY "Allow write operations on candidate_rounds"
ON candidate_rounds FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update operations on candidate_rounds"
ON candidate_rounds FOR UPDATE
USING (true);

CREATE POLICY "Allow write operations on training_records"
ON training_records FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update operations on training_records"
ON training_records FOR UPDATE
USING (true);

CREATE POLICY "Allow write operations on calendar_events"
ON calendar_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update operations on calendar_events"
ON calendar_events FOR UPDATE
USING (true);

CREATE POLICY "Allow write operations on platform_settings"
ON platform_settings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update operations on platform_settings"
ON platform_settings FOR UPDATE
USING (true);

CREATE POLICY "Allow insert on platform_activity"
ON platform_activity FOR INSERT
WITH CHECK (true);
