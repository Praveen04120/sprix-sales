import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseConfigured, mapDbToSettings } from '@/lib/supabase';
import { safeString } from '@/lib/normalize';
import { initialSettings } from '@/data/seedData';

export const dynamic = 'force-dynamic';

const DEFAULT_SHEET_ID = '1E_WrVvh4LBCM60tfLjL3gx1QLw4LLPy1nA60mirzUKQ';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    if (supabase) {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          isSupabaseConnected: true,
          settings: mapDbToSettings(data),
        });
      }
    }

    // Fallback if Supabase not configured or table not yet initialized
    return NextResponse.json({
      success: true,
      isSupabaseConnected: isSupabaseConfigured(),
      settings: {
        ...initialSettings,
        appsScriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL || '',
        googleSheetId: process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID,
        googleFormId: process.env.GOOGLE_FORM_ID || '',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch platform settings';
    return NextResponse.json({
      success: false,
      error: msg,
      settings: initialSettings,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const appsScriptUrl = safeString(body.appsScriptUrl);
    const googleSheetId = safeString(body.googleSheetId) || DEFAULT_SHEET_ID;
    const googleSheetUrl = safeString(body.googleSheetUrl);
    const googleFormId = safeString(body.googleFormId);
    const googleFormUrl = safeString(body.googleFormUrl);

    const supabase = getSupabaseServerClient();
    let persistedToSupabase = false;

    if (supabase) {
      const { error: upsertError } = await supabase
        .from('platform_settings')
        .upsert({
          id: 'default',
          apps_script_url: appsScriptUrl,
          google_sheet_id: googleSheetId,
          google_sheet_url: googleSheetUrl,
          google_form_id: googleFormId,
          google_form_url: googleFormUrl,
          updated_at: new Date().toISOString(),
        });

      if (!upsertError) {
        persistedToSupabase = true;
        try {
          await supabase
            .from('platform_activity')
            .insert({
              action_type: 'SETTINGS_UPDATE',
              description: 'Recruiter updated integration settings',
              metadata: {
                appsScriptUrl: appsScriptUrl ? 'configured' : 'empty',
                googleSheetId,
                googleFormId,
              },
            });
        } catch {}
      } else {
        console.error('Supabase settings upsert error:', upsertError);
      }
    }

    return NextResponse.json({
      success: true,
      persistedToSupabase,
      isSupabaseConnected: isSupabaseConfigured(),
      message: persistedToSupabase
        ? 'Settings saved and synchronized to Supabase across all devices'
        : 'Settings saved locally. Connect Supabase for multi-device sync.',
      settings: {
        appsScriptUrl,
        googleSheetId,
        googleSheetUrl,
        googleFormId,
        googleFormUrl,
        lastSyncTime: null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save settings';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
