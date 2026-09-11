import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { appsScriptUrl } = await req.json().catch(() => ({ appsScriptUrl: '' }));
    const targetUrl = appsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!targetUrl) {
      return NextResponse.json({
        success: false,
        error: 'Google Apps Script Web App URL is not configured. Please paste your endpoint in Settings.',
      }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: `Google Apps Script returned HTTP status ${res.status}`,
      }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      message: 'Google Sheets synchronization completed successfully',
      data: data,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sync request failed';
    return NextResponse.json({
      success: false,
      error: `Unable to sync with Google Sheets: ${message}`,
    }, { status: 500 });
  }
}
