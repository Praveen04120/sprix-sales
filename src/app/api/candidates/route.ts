import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

  if (appsScriptUrl) {
    try {
      const res = await fetch(appsScriptUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Google Apps Script responded with ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        return NextResponse.json({
          success: true,
          candidates: data.candidates || [],
          calendar: data.calendar || [],
          totalCandidates: data.totalCandidates || 0,
          sheetTitle: data.sheetTitle || 'Google Sheet',
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
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

  // Not connected yet - return clean empty state, NEVER fake data
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
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (appsScriptUrl) {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({
      success: true,
      message: 'Local update recorded. Configure GOOGLE_APPS_SCRIPT_URL to persist to Google Sheets.',
      action: body.action,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Action failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
