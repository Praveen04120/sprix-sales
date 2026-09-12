import { Candidate, CalendarEvent, Stage, CandidateStatus, AdminNote, StageHistoryItem } from '@/types';

/**
 * Safely converts ANY value (string, number, boolean, Date, object, null, undefined)
 * to a clean, trimmed string. Guaranteed to never throw "is not a function".
 */
export function safeString(val: unknown, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallback;
    return val.toISOString().split('T')[0];
  }
  try {
    return String(val).trim();
  } catch {
    return fallback;
  }
}

/**
 * Safely converts any value to a trimmed lowercase string.
 */
export function safeLower(val: unknown): string {
  return safeString(val).toLowerCase();
}

/**
 * Safely converts any value to a finite number, or returns fallback.
 */
export function safeNumber(val: unknown, fallback: number | null = null): number | null {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? fallback : val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
}

/**
 * Derives the active hiring stage safely from any status string.
 */
export function deriveStageFromStatus(statusVal: unknown): Stage {
  const s = safeString(statusVal).toUpperCase();
  if (s.includes('WORK')) return 'WORKING';
  if (s.includes('ROUND 3') || s.includes('TRAIN') || s.includes('FINAL')) return 'ROUND_3';
  if (s.includes('ROUND 2') || s.includes('PHONE') || s.includes('INTERVIEW')) return 'ROUND_2';
  if (s.includes('SELECT') || s.includes('HIRE') || s.includes('OFFER')) return 'SELECTED';
  if (s.includes('REJECT')) return 'REJECTED';
  return 'ROUND_1';
}

/**
 * Normalizes a raw candidate object from Google Sheets, Apps Script, or local cache
 * into a strictly typed, crash-proof Candidate object.
 */
export function normalizeCandidate(raw: any, index: number = 0): Candidate {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `SPRIX-${String(index + 1).padStart(4, '0')}`,
      name: `Applicant ${index + 1}`,
      phone: '',
      email: '',
      location: '',
      applicationDate: '',
      lastUpdated: '',
      currentStage: 'ROUND_1',
      currentStatus: 'New',
      finalScore: null,
      formResponses: {},
      adminNotes: [],
      history: [],
    };
  }

  // Safe ID resolution
  const rawId = safeString(raw.id);
  const rawEmail = safeString(raw.email);
  const id = rawId || (rawEmail ? `SPRIX-${rawEmail.split('@')[0]}` : `SPRIX-${String(index + 1).padStart(4, '0')}`);

  // Safe Name resolution
  let name = safeString(raw.name);
  if (!name && rawEmail) {
    name = rawEmail.split('@')[0];
  }
  if (!name) {
    name = `Candidate ${id}`;
  }

  const phone = safeString(raw.phone);
  const location = safeString(raw.location);
  const applicationDate = safeString(raw.applicationDate);
  const lastUpdated = safeString(raw.lastUpdated) || applicationDate || new Date().toISOString().split('T')[0];
  const currentStatus = safeString(raw.currentStatus) || 'New';
  const currentStage = (raw.currentStage && typeof raw.currentStage === 'string') 
    ? (raw.currentStage as Stage) 
    : deriveStageFromStatus(currentStatus);

  const finalScore = safeNumber(raw.finalScore, null);
  const joiningDate = safeString(raw.joiningDate) || undefined;
  const role = safeString(raw.role) || undefined;
  const interviewDate = safeString(raw.interviewDate) || undefined;
  const interviewTime = safeString(raw.interviewTime) || undefined;
  const callReason = safeString(raw.callReason) || undefined;
  const callStatus = (safeString(raw.callStatus) || 'Scheduled') as Candidate['callStatus'];
  const interviewNotes = safeString(raw.interviewNotes) || undefined;

  // Normalize form responses safely into a string-to-string dictionary
  const formResponses: Record<string, string> = {};
  if (raw.formResponses && typeof raw.formResponses === 'object') {
    for (const [k, v] of Object.entries(raw.formResponses)) {
      const safeKey = safeString(k);
      if (safeKey) {
        formResponses[safeKey] = safeString(v);
      }
    }
  }

  // Normalize admin notes
  const adminNotes: AdminNote[] = [];
  if (Array.isArray(raw.adminNotes)) {
    for (let i = 0; i < raw.adminNotes.length; i++) {
      const n = raw.adminNotes[i];
      if (n && typeof n === 'object') {
        adminNotes.push({
          id: safeString(n.id) || `note-${id}-${i}`,
          timestamp: safeString(n.timestamp),
          author: safeString(n.author, 'Admin'),
          note: safeString(n.note),
        });
      } else if (typeof n === 'string') {
        adminNotes.push({
          id: `note-${id}-${i}`,
          timestamp: lastUpdated,
          author: 'Admin',
          note: safeString(n),
        });
      }
    }
  }

  // Normalize history
  const history: StageHistoryItem[] = [];
  if (Array.isArray(raw.history)) {
    for (const h of raw.history) {
      if (h && typeof h === 'object') {
        history.push({
          stage: deriveStageFromStatus(h.stage || h.status),
          status: safeString(h.status, 'Updated'),
          timestamp: safeString(h.timestamp),
          notes: safeString(h.notes) || undefined,
        });
      }
    }
  }

  return {
    id,
    name,
    phone,
    email: rawEmail,
    location,
    applicationDate,
    lastUpdated,
    currentStage,
    currentStatus,
    joiningDate,
    role,
    finalScore,
    formResponses,
    interviewDate,
    interviewTime,
    callReason,
    callStatus,
    interviewNotes,
    adminNotes,
    history,
  };
}

/**
 * Normalizes a raw calendar event object into a strictly typed, crash-proof CalendarEvent.
 */
export function normalizeCalendarEvent(raw: any, index: number = 0): CalendarEvent {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `evt-${Date.now()}-${index}`,
      candidateId: '',
      candidateName: 'Candidate',
      type: 'CALL',
      startDate: new Date().toISOString().split('T')[0],
      status: 'Scheduled',
    };
  }

  const id = safeString(raw.id) || `evt-${Date.now()}-${index}`;
  const candidateId = safeString(raw.candidateId);
  const candidateName = safeString(raw.candidateName, 'Candidate');
  const type = (safeString(raw.type) || 'CALL') as CalendarEvent['type'];
  const startDate = safeString(raw.startDate) || new Date().toISOString().split('T')[0];
  const endDate = safeString(raw.endDate) || undefined;
  const startTime = safeString(raw.startTime) || undefined;
  const endTime = safeString(raw.endTime) || undefined;
  const reason = safeString(raw.reason) || undefined;
  const notes = safeString(raw.notes) || undefined;
  const status = (safeString(raw.status) || 'Scheduled') as CalendarEvent['status'];

  return {
    id,
    candidateId,
    candidateName,
    type,
    startDate,
    endDate,
    startTime,
    endTime,
    reason,
    notes,
    status,
  };
}

/**
 * Crash-proof search query matcher across Name, Phone, Email, and ID.
 */
export function matchesCandidateQuery(c: Candidate, query: string): boolean {
  const cleanQ = safeLower(query);
  if (!cleanQ) return true;

  return (
    safeLower(c.name).includes(cleanQ) ||
    safeLower(c.phone).includes(cleanQ) ||
    safeLower(c.email).includes(cleanQ) ||
    safeLower(c.id).includes(cleanQ) ||
    safeLower(c.location).includes(cleanQ) ||
    safeLower(c.role).includes(cleanQ)
  );
}
