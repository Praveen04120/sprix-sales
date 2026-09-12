import { NextRequest, NextResponse } from 'next/server';

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

  if (appsScriptUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      let fetchUrl = appsScriptUrl;
      try {
        const urlObj = new URL(appsScriptUrl);
        if (sheetId && !urlObj.searchParams.has('sheetId')) {
          urlObj.searchParams.set('sheetId', sheetId);
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
        return NextResponse.json({
          success: true,
          candidates: data.candidates || [],
          calendar: data.calendar || [],
          totalCandidates: data.totalCandidates || (data.candidates ? data.candidates.length : 0),
          sheetTitle: data.sheetTitle || 'Google Sheet',
          sheetId: data.sheetId || sheetId,
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      } else {
        throw new Error(data.error || 'Google Apps Script returned an error response');
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

  // If no endpoint configured yet, return clean empty state without mock data
  return NextResponse.json({
    success: false,
    unconfigured: true,
    error: 'Google Apps Script URL is not configured yet. Please configure in Settings.',
    candidates: [],
    calendar: [],
    lastSyncTime: null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const paramUrl = searchParams.get('appsScriptUrl');
    const headerUrl = req.headers.get('x-apps-script-url');
    const appsScriptUrl = (body.appsScriptUrl || paramUrl || headerUrl || process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();

    const paramSheetId = searchParams.get('sheetId');
    const headerSheetId = req.headers.get('x-sheet-id');
    const sheetId = (body.sheetId || paramSheetId || headerSheetId || process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID).trim();

    if (appsScriptUrl) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      // Clean body to send to Google Apps Script
      const scriptPayload = { ...body };
      delete scriptPayload.appsScriptUrl;
      if (sheetId && !scriptPayload.sheetId) {
        scriptPayload.sheetId = sheetId;
      }

      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptPayload),
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeoutId);

      const rawText = await res.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Google Apps Script returned non-JSON response: ${rawText.slice(0, 100)}`);
      }

      return NextResponse.json(data);
    }

    return NextResponse.json({
      success: false,
      error: 'Google Apps Script URL is not configured. Unable to persist mutation to Google Sheets.',
      action: body.action,
    }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Action failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
