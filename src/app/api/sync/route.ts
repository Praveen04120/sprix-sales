import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseConfigured, mapCandidateToDb, mapDbToCandidate } from '@/lib/supabase';
import { safeString, normalizeCandidate, normalizeCalendarEvent, safeLower } from '@/lib/normalize';
import { Candidate, CalendarEvent } from '@/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const DEFAULT_SHEET_ID = '1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ';

export async function POST(req: NextRequest) {
  try {
    const { appsScriptUrl, sheetId } = await req.json().catch(() => ({ appsScriptUrl: '', sheetId: '' }));
    const targetUrl = (appsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
    const targetSheetId = (sheetId || process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID).trim();

    if (!targetUrl) {
      return NextResponse.json({
        success: false,
        error: 'Google Apps Script Web App URL is not configured. Please enter your endpoint URL in Settings.',
      }, { status: 400 });
    }

    // Validate URL format and attach sheetId parameter
    let fetchUrl: string;
    try {
      const urlObj = new URL(targetUrl);
      if (targetSheetId && !urlObj.searchParams.has('sheetId')) {
        urlObj.searchParams.set('sheetId', targetSheetId);
      }
      fetchUrl = urlObj.toString();
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid Google Apps Script URL format. URL should begin with https://script.google.com/macros/s/...',
      }, { status: 400 });
    }

    // 45-second timeout for Google Apps Script cold-start
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let res: Response;
    try {
      res = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
        signal: controller.signal,
        redirect: 'follow',
        cache: 'no-store',
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof Error && (fetchErr.name === 'AbortError' || fetchErr.message.includes('aborted'))) {
        return NextResponse.json({
          success: false,
          error: 'Google Apps Script timed out after 45 seconds during cold start. Please verify your script is active and retry.',
        }, { status: 504 });
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    // Check specific HTTP failure statuses
    if (res.status === 404) {
      return NextResponse.json({
        success: false,
        error: 'Google Apps Script endpoint not found (HTTP 404). Please verify your Web App URL in Settings.',
      }, { status: 502 });
    }

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        success: false,
        error: 'Access denied (HTTP ' + res.status + '). Ensure your Google Apps Script deployment has "Who has access" set to "Anyone".',
      }, { status: 502 });
    }

    const rawText = await res.text();

    if (rawText.includes('<!DOCTYPE html>') || rawText.includes('<html')) {
      return NextResponse.json({
        success: false,
        error: 'Google Apps Script returned HTML instead of JSON. Ensure your script is deployed as a Web App accessible to "Anyone".',
      }, { status: 502 });
    }

    let data: Record<string, any>;
    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Unable to parse Google Apps Script JSON response: ' + rawText.slice(0, 150),
      }, { status: 502 });
    }

    if (data.success === false && data.error) {
      return NextResponse.json({
        success: false,
        error: `Google Apps Script error: ${data.error}`,
      }, { status: 502 });
    }

    const rawIncomingCandidates = Array.isArray(data.candidates) ? data.candidates : [];
    const rawIncomingCalendar = Array.isArray(data.calendar) ? data.calendar : [];

    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowIso = new Date().toISOString();

    const supabase = getSupabaseServerClient();
    let syncedToSupabase = false;

    // -------------------------------------------------------------------------
    // SUPABASE DATA SYNCHRONIZATION WITH PRESERVATION OF OPERATIONAL DATA
    // -------------------------------------------------------------------------
    if (supabase) {
      try {
        // Fetch existing Supabase candidates to prevent overwriting recruiter changes
        const { data: existingDbCandidates } = await supabase
          .from('candidates')
          .select('*');

        const existingMap = new Map<string, any>();
        (existingDbCandidates || []).forEach((row) => {
          if (row.candidate_code) existingMap.set(safeLower(row.candidate_code), row);
          if (row.source_id) existingMap.set(safeLower(row.source_id), row);
          if (row.email) existingMap.set(safeLower(row.email), row);
          if (row.phone) existingMap.set(safeString(row.phone).replace(/[^0-9]/g, ''), row);
        });

        for (let i = 0; i < rawIncomingCandidates.length; i++) {
          const normIncoming = normalizeCandidate(rawIncomingCandidates[i], i);
          const emailKey = safeLower(normIncoming.email);
          const phoneKey = safeString(normIncoming.phone).replace(/[^0-9]/g, '');
          const idKey = safeLower(normIncoming.id);

          const existingMatch = existingMap.get(idKey) || (emailKey ? existingMap.get(emailKey) : null) || (phoneKey ? existingMap.get(phoneKey) : null);

          if (!existingMatch) {
            // New Candidate: insert fresh record
            const dbRow = mapCandidateToDb(normIncoming);
            const { data: newRow } = await supabase
              .from('candidates')
              .insert(dbRow)
              .select('id')
              .single();

            if (newRow) {
              try {
                await supabase.from('candidate_rounds').upsert([
                  { candidate_id: newRow.id, round_number: 1, status: 'In Progress' },
                  { candidate_id: newRow.id, round_number: 2, status: 'Pending' },
                  { candidate_id: newRow.id, round_number: 3, status: 'Pending' },
                ]);
              } catch {}
            }
          } else {
            // Existing Candidate: PRESERVE statuses, scores, notes, and training
            const mergedResponses = {
              ...(existingMatch.form_responses || {}),
              ...(normIncoming.formResponses || {}),
            };

            await supabase
              .from('candidates')
              .update({
                form_responses: mergedResponses,
                // Only update phone/location if existing was blank
                phone: existingMatch.phone || normIncoming.phone || null,
                location: existingMatch.location || normIncoming.location || null,
              })
              .eq('id', existingMatch.id);
          }
        }

        // Update last sync time in platform_settings
        try {
          await supabase
            .from('platform_settings')
            .upsert({
              id: 'default',
              last_sync_time: nowIso,
              updated_at: nowIso,
            });
        } catch {}

        // Log audit activity
        try {
          await supabase
            .from('platform_activity')
            .insert({
              action_type: 'SYNC',
              description: `Google Sheets synced (${rawIncomingCandidates.length} applicants processed, zero production Sheet changes)`,
              metadata: { count: rawIncomingCandidates.length, sheetId: targetSheetId },
            });
        } catch {}

        syncedToSupabase = true;
      } catch (syncErr) {
        console.error('Supabase sync processing error:', syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      syncedToSupabase,
      message: 'Google Sheets synchronization completed successfully (Strictly Read-Only on Sheet)',
      data: {
        ...data,
        candidates: rawIncomingCandidates.map((c: any, idx: number) => normalizeCandidate(c, idx)),
        calendar: rawIncomingCalendar.map((e: any, idx: number) => normalizeCalendarEvent(e, idx)),
      },
      timestamp: nowFormatted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync request failed';
    return NextResponse.json({
      success: false,
      error: `Unable to sync with Google Sheets: ${message}`,
    }, { status: 500 });
  }
}
