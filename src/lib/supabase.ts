import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Candidate, CalendarEvent, AppSettings, Stage, CandidateStatus, AdminNote, StageHistoryItem } from '@/types';
import { safeString, safeNumber, deriveStageFromStatus, normalizeCandidate, normalizeCalendarEvent } from './normalize';

/**
 * Clean and normalize Supabase project base URL.
 * Automatically strips trailing slashes or /rest/v1/ suffix if provided.
 */
function cleanSupabaseUrl(raw: string): string {
  let cleaned = (raw || '').trim();
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

/**
 * Check if Supabase credentials are configured in current environment.
 */
export function isSupabaseConfigured(): boolean {
  const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith('http'));
}

/**
 * Server-side Supabase client with privileged service-role permissions.
 * STRICTLY for use in Next.js Server Components, Route Handlers, and Server Actions.
 * Never exposed to browser bundles.
 */
let cachedServerClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (cachedServerClient) {
    return cachedServerClient;
  }

  const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '');
  const serviceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  cachedServerClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedServerClient;
}

/**
 * Client-side / Public Supabase client using anon key.
 */
let cachedBrowserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!url || !anonKey || !url.startsWith('http')) {
    return null;
  }

  if (cachedBrowserClient) {
    return cachedBrowserClient;
  }

  cachedBrowserClient = createClient(url, anonKey);
  return cachedBrowserClient;
}

// ---------------------------------------------------------------------------
// DATA MAPPING: Supabase Database Rows <---> TypeScript Domain Types
// ---------------------------------------------------------------------------

export interface DbCandidateRow {
  id: string;
  candidate_code: string | null;
  source_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  role: string | null;
  application_date: string | null;
  current_stage: string;
  current_status: string;
  source: string | null;
  final_score: number | null;
  form_responses: Record<string, string> | null;
  admin_notes: AdminNote[] | null;
  history: StageHistoryItem[] | null;
  interview_date: string | null;
  interview_time: string | null;
  call_reason: string | null;
  call_status: string | null;
  interview_notes: string | null;
  joining_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCalendarEventRow {
  id: string;
  candidate_id: string | null;
  candidate_name: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface DbPlatformSettingsRow {
  id: string;
  apps_script_url: string | null;
  google_sheet_id: string | null;
  google_sheet_url: string | null;
  google_form_id: string | null;
  google_form_url: string | null;
  last_sync_time: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transforms a Supabase database row into the frontend Candidate type.
 */
export function mapDbToCandidate(row: DbCandidateRow): Candidate {
  const displayId = row.candidate_code || row.source_id || row.id;

  return normalizeCandidate({
    id: displayId,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    location: row.location || '',
    role: row.role || 'Inside Sales Representative',
    applicationDate: row.application_date || '',
    lastUpdated: row.updated_at ? new Date(row.updated_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
    currentStage: (row.current_stage as Stage) || deriveStageFromStatus(row.current_status),
    currentStatus: (row.current_status as CandidateStatus) || 'New',
    joiningDate: row.joining_date || undefined,
    finalScore: row.final_score !== null && row.final_score !== undefined ? Number(row.final_score) : null,
    formResponses: row.form_responses || {},
    adminNotes: Array.isArray(row.admin_notes) ? row.admin_notes : [],
    history: Array.isArray(row.history) ? row.history : [],
    interviewDate: row.interview_date || undefined,
    interviewTime: row.interview_time || undefined,
    callReason: row.call_reason || undefined,
    callStatus: (row.call_status as Candidate['callStatus']) || 'Scheduled',
    interviewNotes: row.interview_notes || undefined,
  });
}

/**
 * Transforms a frontend Candidate type into a Supabase database insertion / update payload.
 */
export function mapCandidateToDb(cand: Candidate): Partial<DbCandidateRow> {
  const norm = normalizeCandidate(cand);

  return {
    candidate_code: norm.id,
    source_id: norm.id,
    name: norm.name,
    email: norm.email || null,
    phone: norm.phone || null,
    location: norm.location || null,
    role: norm.role || 'Inside Sales Representative',
    application_date: norm.applicationDate || new Date().toISOString().split('T')[0],
    current_stage: norm.currentStage,
    current_status: norm.currentStatus,
    source: norm.id.includes('FR') ? 'Google Form' : 'Manual',
    final_score: norm.finalScore !== null && norm.finalScore !== undefined ? norm.finalScore : null,
    form_responses: norm.formResponses || {},
    admin_notes: norm.adminNotes || [],
    history: norm.history || [],
    interview_date: norm.interviewDate || null,
    interview_time: norm.interviewTime || null,
    call_reason: norm.callReason || null,
    call_status: norm.callStatus || 'Scheduled',
    interview_notes: norm.interviewNotes || null,
    joining_date: norm.joiningDate || null,
  };
}

/**
 * Transforms a Supabase calendar row into the frontend CalendarEvent type.
 */
export function mapDbToCalendarEvent(row: DbCalendarEventRow): CalendarEvent {
  return normalizeCalendarEvent({
    id: row.id,
    candidateId: row.candidate_id || '',
    candidateName: row.candidate_name || 'Candidate',
    type: (row.event_type as CalendarEvent['type']) || 'CALL',
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    reason: row.reason || undefined,
    notes: row.notes || undefined,
    status: (row.status as CalendarEvent['status']) || 'Scheduled',
  });
}

/**
 * Transforms a frontend CalendarEvent into a Supabase database payload.
 */
export function mapCalendarEventToDb(evt: CalendarEvent): Partial<DbCalendarEventRow> {
  const norm = normalizeCalendarEvent(evt);

  return {
    candidate_id: norm.candidateId && norm.candidateId.includes('-') && norm.candidateId.length === 36 ? norm.candidateId : null,
    candidate_name: norm.candidateName,
    event_type: norm.type,
    start_date: norm.startDate,
    end_date: norm.endDate || null,
    start_time: norm.startTime || null,
    end_time: norm.endTime || null,
    reason: norm.reason || null,
    notes: norm.notes || null,
    status: norm.status || 'Scheduled',
  };
}

/**
 * Transforms Supabase settings row to AppSettings.
 */
export function mapDbToSettings(row: DbPlatformSettingsRow | null): AppSettings {
  return {
    appsScriptUrl: row?.apps_script_url || process.env.GOOGLE_APPS_SCRIPT_URL || '',
    googleSheetId: row?.google_sheet_id || process.env.GOOGLE_SHEET_ID || '1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ',
    googleSheetUrl: row?.google_sheet_url || '',
    googleFormId: row?.google_form_id || process.env.GOOGLE_FORM_ID || '',
    googleFormUrl: row?.google_form_url || '',
    lastSyncTime: row?.last_sync_time ? new Date(row.last_sync_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
  };
}
