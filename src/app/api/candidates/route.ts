import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseServerClient,
  isSupabaseConfigured,
  mapDbToCandidate,
  mapCandidateToDb,
  mapDbToCalendarEvent,
  mapCalendarEventToDb,
  DbCandidateRow,
  DbCalendarEventRow,
} from '@/lib/supabase';
import { safeString, safeNumber, normalizeCandidate, normalizeCalendarEvent, deriveStageFromStatus } from '@/lib/normalize';
import { Candidate, CalendarEvent, Stage } from '@/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const DEFAULT_SHEET_ID = '1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paramUrl = searchParams.get('appsScriptUrl');
  const headerUrl = req.headers.get('x-apps-script-url');
  const appsScriptUrl = (paramUrl || headerUrl || process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();

  const paramSheetId = searchParams.get('sheetId');
  const headerSheetId = req.headers.get('x-sheet-id');
  const sheetId = (paramSheetId || headerSheetId || process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID).trim();

  let activeAppsScriptUrl = appsScriptUrl;
  let activeSheetId = sheetId;
  const supabase = getSupabaseServerClient();

  // 1. If Supabase is connected, attempt to fetch persistent data from Supabase
  if (supabase) {
    try {
      // Check if apps_script_url is in platform_settings if not provided in request
      if (!activeAppsScriptUrl) {
        const { data: dbSettings } = await supabase
          .from('platform_settings')
          .select('apps_script_url, google_sheet_id')
          .eq('id', 'default')
          .maybeSingle();
        if (dbSettings?.apps_script_url) {
          activeAppsScriptUrl = dbSettings.apps_script_url.trim();
          if (dbSettings.google_sheet_id) {
            activeSheetId = dbSettings.google_sheet_id.trim();
          }
        }
      }

      const [candResult, eventResult] = await Promise.all([
        supabase
          .from('candidates')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('calendar_events')
          .select('*')
          .order('start_date', { ascending: true }),
      ]);

      if (!candResult.error && Array.isArray(candResult.data)) {
        // Supabase is connected and responsive: return database records as single source of truth
        const candidates: Candidate[] = candResult.data.map((row: DbCandidateRow) => mapDbToCandidate(row));
        const calendar: CalendarEvent[] = (eventResult.data || []).map((row: DbCalendarEventRow) => mapDbToCalendarEvent(row));

        return NextResponse.json({
          success: true,
          source: 'supabase',
          candidates,
          calendar,
          totalCandidates: candidates.length,
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    } catch (dbErr) {
      console.warn('Supabase read attempt encountered error, falling back to Google Apps Script:', dbErr);
    }
  }

  // 2. If Supabase is empty, read from Google Apps Script if URL provided or saved in settings
  if (activeAppsScriptUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      let fetchUrl = activeAppsScriptUrl;
      try {
        const urlObj = new URL(activeAppsScriptUrl);
        if (activeSheetId) {
          if (!urlObj.searchParams.has('sheetId')) {
            urlObj.searchParams.set('sheetId', activeSheetId);
          }
          if (!urlObj.searchParams.has('spreadsheetId')) {
            urlObj.searchParams.set('spreadsheetId', activeSheetId);
          }
        }
        fetchUrl = urlObj.toString();
      } catch {}

      const res = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*' },
        signal: controller.signal,
        redirect: 'follow',
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Google Apps Script responded with HTTP ${res.status}`);
      }

      const rawText = await res.text();
      if (rawText.includes('<!DOCTYPE html>') || rawText.includes('<html')) {
        throw new Error('Google Apps Script returned HTML instead of JSON. Ensure deployment access is set to "Anyone".');
      }

      const data = JSON.parse(rawText);
      if (data.success) {
        const rawCandidates = Array.isArray(data.candidates) ? data.candidates : [];
        const rawCalendar = Array.isArray(data.calendar) ? data.calendar : [];

        // If Supabase is connected, safely populate Supabase with this initial Google Sheet dataset
        if (supabase && rawCandidates.length > 0) {
          try {
            for (let i = 0; i < rawCandidates.length; i++) {
              const normCand = normalizeCandidate(rawCandidates[i], i);
              const dbRow = mapCandidateToDb(normCand);
              await supabase
                .from('candidates')
                .upsert(dbRow, { onConflict: 'candidate_code' });
            }
          } catch (importErr) {
            console.warn('Failed initial auto-seed into Supabase:', importErr);
          }
        }

        return NextResponse.json({
          success: true,
          source: 'google_sheets',
          candidates: rawCandidates.map((c: any, idx: number) => normalizeCandidate(c, idx)),
          calendar: rawCalendar.map((e: any, idx: number) => normalizeCalendarEvent(e, idx)),
          totalCandidates: data.totalCandidates || rawCandidates.length,
          sheetTitle: data.sheetTitle || 'Google Sheet',
          sheetId: data.sheetId || sheetId,
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        const errStr = String(data.error || 'Google Apps Script returned an error response');
        let enhancedError = errStr;
        if (errStr.includes('Unable to open active spreadsheet')) {
          enhancedError = 'Google Apps Script deployment is running an older version. Please update Code.gs in Apps Script editor, run testSpreadsheetAccess once to authorize, then deploy a New Version.';
        }
        throw new Error(enhancedError);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reach Google Apps Script';
      return NextResponse.json({
        success: false,
        error: message,
        candidates: [],
        calendar: [],
      }, { status: 502 });
    }
  }

  // 3. Clean unconfigured state
  return NextResponse.json({
    success: false,
    unconfigured: true,
    error: isSupabaseConfigured()
      ? 'Supabase database is connected but contains no candidate records yet. Sync with Google Sheets or click "+ Add Candidate" to begin.'
      : 'Google Apps Script and Supabase are not configured yet. Configure in Settings.',
    candidates: [],
    calendar: [],
    lastSyncTime: null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = safeString(body.action);

    const supabase = getSupabaseServerClient();
    const appsScriptUrl = safeString(body.appsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL);
    const sheetId = safeString(body.sheetId || process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID);

    let supabaseSuccess = false;
    let savedCandidateId: string | null = null;

    // -------------------------------------------------------------------------
    // ACTION: ADD_CANDIDATE
    // -------------------------------------------------------------------------
    if (action === 'ADD_CANDIDATE') {
      const candData: Candidate = body.candidate;
      if (!candData || !candData.name) {
        return NextResponse.json({ success: false, error: 'Candidate name is required' }, { status: 400 });
      }

      const normalized = normalizeCandidate(candData);

      if (supabase) {
        const dbPayload = mapCandidateToDb(normalized);

        const { data: inserted, error: insertError } = await supabase
          .from('candidates')
          .insert(dbPayload)
          .select('id, candidate_code')
          .single();

        if (!insertError && inserted) {
          supabaseSuccess = true;
          savedCandidateId = inserted.candidate_code || inserted.id;

          // Insert round tracking records
          const candDbId = inserted.id;
          try {
            await supabase.from('candidate_rounds').upsert([
              { candidate_id: candDbId, round_number: 1, status: normalized.currentStage === 'ROUND_1' ? 'In Progress' : 'Passed' },
              { candidate_id: candDbId, round_number: 2, status: normalized.currentStage === 'ROUND_2' ? 'Scheduled' : normalized.currentStage === 'ROUND_1' ? 'Pending' : 'Passed' },
              { candidate_id: candDbId, round_number: 3, status: normalized.currentStage === 'ROUND_3' ? 'In Progress' : normalized.currentStage === 'SELECTED' ? 'Passed' : 'Pending' },
            ], { onConflict: 'candidate_id, round_number' });
          } catch {}

          // If final score exists, populate training records
          if (normalized.finalScore !== null && normalized.finalScore !== undefined) {
            try {
              await supabase.from('training_records').upsert({
                candidate_id: candDbId,
                final_score: normalized.finalScore,
                training_status: normalized.currentStage === 'WORKING' ? 'Completed' : 'In Training',
              }, { onConflict: 'candidate_id' });
            } catch {}
          }

          // Record in Audit Trail
          try {
            await supabase.from('platform_activity').insert({
              action_type: 'CANDIDATE_ADD',
              candidate_id: candDbId,
              description: `Candidate ${normalized.name} added (${normalized.currentStatus})`,
              metadata: { stage: normalized.currentStage, score: normalized.finalScore },
            });
          } catch {}
        } else {
          console.error('Supabase candidate insertion error:', insertError);
        }
      }

      // Optional async relay to Google Apps Script if configured
      relayToAppsScript(appsScriptUrl, sheetId, {
        action: 'ADD_CANDIDATE',
        candidate: normalized,
      });

      return NextResponse.json({
        success: true,
        persistedToSupabase: supabaseSuccess,
        id: savedCandidateId || normalized.id,
        message: `Candidate ${normalized.name} registered successfully`,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: BULK_IMPORT (Migrate/Sync batch of candidates to Supabase)
    // -------------------------------------------------------------------------
    if (action === 'BULK_IMPORT') {
      const candidatesList: any[] = Array.isArray(body.candidates) ? body.candidates : [];
      const eventsList: any[] = Array.isArray(body.calendar) ? body.calendar : [];

      let importedCandidates = 0;
      let importedEvents = 0;

      if (supabase && candidatesList.length > 0) {
        for (let i = 0; i < candidatesList.length; i++) {
          const normCand = normalizeCandidate(candidatesList[i], i);
          if (!normCand.name) continue;

          const dbPayload = mapCandidateToDb(normCand);
          const { data: upsertedCand, error: candErr } = await supabase
            .from('candidates')
            .upsert(dbPayload, { onConflict: 'candidate_code' })
            .select('id')
            .single();

          if (!candErr && upsertedCand) {
            importedCandidates++;
            const candDbId = upsertedCand.id;

            try {
              await supabase.from('candidate_rounds').upsert([
                { candidate_id: candDbId, round_number: 1, status: normCand.currentStage === 'ROUND_1' ? 'In Progress' : 'Passed' },
                { candidate_id: candDbId, round_number: 2, status: normCand.currentStage === 'ROUND_2' ? 'Scheduled' : normCand.currentStage === 'ROUND_1' ? 'Pending' : 'Passed' },
                { candidate_id: candDbId, round_number: 3, status: normCand.currentStage === 'ROUND_3' ? 'In Progress' : normCand.currentStage === 'SELECTED' ? 'Passed' : 'Pending' },
              ], { onConflict: 'candidate_id, round_number' });
            } catch {}

            if (normCand.finalScore !== null && normCand.finalScore !== undefined) {
              try {
                await supabase.from('training_records').upsert({
                  candidate_id: candDbId,
                  final_score: normCand.finalScore,
                  training_status: normCand.currentStage === 'WORKING' ? 'Completed' : 'In Training',
                }, { onConflict: 'candidate_id' });
              } catch {}
            }
          }
        }
      }

      if (supabase && eventsList.length > 0) {
        for (let j = 0; j < eventsList.length; j++) {
          const normEvt = normalizeCalendarEvent(eventsList[j], j);
          const dbEvt = mapCalendarEventToDb(normEvt);
          const { error: evtErr } = await supabase.from('calendar_events').insert(dbEvt);
          if (!evtErr) importedEvents++;
        }
      }

      return NextResponse.json({
        success: true,
        importedCandidates,
        importedEvents,
        message: `Successfully synchronized ${importedCandidates} candidates to Supabase`,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: UPDATE_CANDIDATE
    // -------------------------------------------------------------------------
    if (action === 'UPDATE_CANDIDATE') {
      const candidateId = safeString(body.candidateId);
      const updates = body.updates || {};

      if (!candidateId) {
        return NextResponse.json({ success: false, error: 'Candidate ID is required' }, { status: 400 });
      }

      if (supabase) {
        // Find existing candidate by code or ID
        const { data: existing } = await supabase
          .from('candidates')
          .select('id, candidate_code, admin_notes, history, current_stage, current_status, final_score')
          .or(`candidate_code.eq."${candidateId}",source_id.eq."${candidateId}"`)
          .maybeSingle();

        const candUuid = existing?.id;

        const dbUpdates: Record<string, any> = {};
        if (updates.currentStatus) {
          dbUpdates.current_status = safeString(updates.currentStatus);
          dbUpdates.current_stage = deriveStageFromStatus(updates.currentStatus);
        }
        if (updates.finalScore !== undefined) {
          dbUpdates.final_score = safeNumber(updates.finalScore, null);
        }
        if (updates.joiningDate !== undefined) dbUpdates.joining_date = safeString(updates.joiningDate);
        if (updates.role !== undefined) dbUpdates.role = safeString(updates.role);
        if (updates.callReason !== undefined) dbUpdates.call_reason = safeString(updates.callReason);
        if (updates.callStatus !== undefined) dbUpdates.call_status = safeString(updates.callStatus);
        if (updates.evaluationFeedback !== undefined) dbUpdates.interview_notes = safeString(updates.evaluationFeedback);

        // Append admin note if provided
        if (updates.notes && existing) {
          const nowStr = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const newNotes = [
            {
              id: Math.random().toString(36).substring(2, 9),
              timestamp: nowStr,
              author: 'Admin',
              note: safeString(updates.notes),
            },
            ...(Array.isArray(existing.admin_notes) ? existing.admin_notes : []),
          ];
          dbUpdates.admin_notes = newNotes;
        }

        let updateQuery = supabase.from('candidates').update(dbUpdates);
        if (candUuid) {
          updateQuery = updateQuery.eq('id', candUuid);
        } else {
          updateQuery = updateQuery.eq('candidate_code', candidateId);
        }

        const { error: updateError } = await updateQuery;
        if (!updateError) {
          supabaseSuccess = true;

          // If candidate UUID found, update training records or rounds
          if (candUuid) {
            if (dbUpdates.final_score !== undefined || updates.evaluationFeedback) {
              try {
                await supabase.from('training_records').upsert({
                  candidate_id: candUuid,
                  final_score: dbUpdates.final_score,
                  evaluation_feedback: safeString(updates.evaluationFeedback),
                }, { onConflict: 'candidate_id' });
              } catch {}
            }

            try {
              await supabase.from('platform_activity').insert({
                action_type: 'STATUS_CHANGE',
                candidate_id: candUuid,
                description: `Candidate updated: status=${updates.currentStatus || 'unchanged'}, score=${updates.finalScore ?? 'unchanged'}`,
                metadata: updates,
              });
            } catch {}
          }
        } else {
          console.error('Supabase candidate update error:', updateError);
        }
      }

      // Optional async relay to Google Apps Script
      relayToAppsScript(appsScriptUrl, sheetId, {
        action: 'UPDATE_CANDIDATE',
        candidateId,
        updates,
      });

      return NextResponse.json({
        success: true,
        persistedToSupabase: supabaseSuccess,
        message: 'Candidate updated successfully',
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: ADD_CALENDAR_EVENT
    // -------------------------------------------------------------------------
    if (action === 'ADD_CALENDAR_EVENT') {
      const eventData: CalendarEvent = body.event;
      if (!eventData || !eventData.startDate) {
        return NextResponse.json({ success: false, error: 'Start date is required' }, { status: 400 });
      }

      const normalizedEvt = normalizeCalendarEvent(eventData);

      if (supabase) {
        const dbEvtPayload = mapCalendarEventToDb(normalizedEvt);

        const { error: evtInsertErr } = await supabase
          .from('calendar_events')
          .insert(dbEvtPayload);

        if (!evtInsertErr) {
          supabaseSuccess = true;
          try {
            await supabase.from('platform_activity').insert({
              action_type: 'CALENDAR_UPDATE',
              description: `Scheduled ${normalizedEvt.type} on ${normalizedEvt.startDate} for ${normalizedEvt.candidateName}`,
              metadata: { eventId: normalizedEvt.id, date: normalizedEvt.startDate },
            });
          } catch {}
        } else {
          console.error('Supabase calendar event insert error:', evtInsertErr);
        }
      }

      relayToAppsScript(appsScriptUrl, sheetId, {
        action: 'ADD_CALENDAR_EVENT',
        event: normalizedEvt,
      });

      return NextResponse.json({
        success: true,
        persistedToSupabase: supabaseSuccess,
        message: 'Event scheduled successfully',
      });
    }

    // -------------------------------------------------------------------------
    // ACTION: UPDATE_CALL_STATUS
    // -------------------------------------------------------------------------
    if (action === 'UPDATE_CALL_STATUS') {
      const eventId = safeString(body.eventId);
      const status = safeString(body.status);
      const reason = safeString(body.reason);

      if (supabase && eventId) {
        // If eventId matches UUID format, update directly
        if (eventId.length === 36 && eventId.includes('-')) {
          try {
            await supabase
              .from('calendar_events')
              .update({
                status,
                ...(reason ? { reason } : {}),
              })
              .eq('id', eventId);
          } catch {}
        }
      }

      relayToAppsScript(appsScriptUrl, sheetId, {
        action: 'UPDATE_CALL_STATUS',
        eventId,
        status,
        reason,
      });

      return NextResponse.json({
        success: true,
        message: 'Call status updated',
      });
    }

    return NextResponse.json({
      success: false,
      error: `Unsupported action: ${action}`,
    }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Action failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * Safely forwards mutations to Google Apps Script without blocking the user
 * or crashing if Apps Script endpoint is cold or down.
 */
function relayToAppsScript(url: string, sheetId: string, payload: Record<string, any>) {
  if (!url || !url.startsWith('https://script.google.com')) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  const cleanPayload = { ...payload, sheetId };

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanPayload),
    signal: controller.signal,
  })
    .then((res) => res.text())
    .catch((err) => {
      console.warn('Apps Script relay non-fatal error:', err?.message || err);
    })
    .finally(() => clearTimeout(timeoutId));
}
