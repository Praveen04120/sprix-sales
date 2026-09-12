import { NextRequest, NextResponse } from 'next/server';

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

    // Allow generous 45-second timeout to accommodate Google Apps Script cold-start latency
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
        error: 'Google Apps Script endpoint not found (HTTP 404). Your Web App deployment may have expired, changed, or been deleted. In Google Sheets, click Extensions > Apps Script > Deploy > Manage deployments, choose "New version", and copy the updated URL.',
      }, { status: 502 });
    }

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        success: false,
        error: 'Access denied (HTTP ' + res.status + '). Ensure your Google Apps Script deployment has "Who has access" set to "Anyone".',
      }, { status: 502 });
    }

    const rawText = await res.text();

    // Check if Google returned an HTML login or error page instead of JSON
    if (rawText.includes('<!DOCTYPE html>') || rawText.includes('<html')) {
      if (rawText.includes('accounts.google.com') || rawText.includes('ServiceLogin') || rawText.includes('Sign in')) {
        return NextResponse.json({
          success: false,
          error: 'Google Apps Script redirected to a Google sign-in page. Please re-deploy your Web App with "Who has access: Anyone".',
        }, { status: 502 });
      }
      if (rawText.includes('Page not found') || rawText.includes('file you have requested does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'Google Drive reports this script does not exist. Please check that you copied the complete Web App URL including the "/exec" suffix.',
        }, { status: 502 });
      }
      return NextResponse.json({
        success: false,
        error: 'Google Apps Script returned HTML instead of JSON. Ensure your script code ends with ContentService.createTextOutput(...).setMimeType(ContentService.MimeType.JSON).',
      }, { status: 502 });
    }

    let data: Record<string, unknown>;
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
