'use client';

import React, { useState, useEffect } from 'react';
import { useHiring } from '@/context/HiringContext';
import {
  FileSpreadsheet,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Laptop,
  Check,
} from 'lucide-react';

export default function SettingsView() {
  const { settings, updateSettings, showToast, fetchLatestData, isSupabaseConnected } = useHiring();

  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.appsScriptUrl || '');
  const [sheetId, setSheetId] = useState(settings.googleSheetId || '');
  const [sheetUrl, setSheetUrl] = useState(settings.googleSheetUrl || '');
  const [formId, setFormId] = useState(settings.googleFormId || '');
  const [formUrl, setFormUrl] = useState(settings.googleFormUrl || '');
  const [testStatus, setTestStatus] = useState<{ text: string; isSuccess: boolean } | null>(null);
  const [testing, setTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings.appsScriptUrl) setAppsScriptUrl(settings.appsScriptUrl);
    if (settings.googleSheetId) setSheetId(settings.googleSheetId);
    if (settings.googleSheetUrl) setSheetUrl(settings.googleSheetUrl);
    if (settings.googleFormId) setFormId(settings.googleFormId);
    if (settings.googleFormUrl) setFormUrl(settings.googleFormUrl);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const cleanUrl = appsScriptUrl.trim();
    try {
      await updateSettings({
        appsScriptUrl: cleanUrl,
        googleSheetId: sheetId.trim(),
        googleSheetUrl: sheetUrl.trim(),
        googleFormId: formId.trim(),
        googleFormUrl: formUrl.trim(),
      });
      if (cleanUrl) {
        await fetchLatestData(cleanUrl, sheetId.trim());
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const cleanUrl = appsScriptUrl.trim();
    if (!cleanUrl) {
      setTestStatus({ text: 'Please enter your Google Apps Script URL first.', isSuccess: false });
      return;
    }

    setTesting(true);
    setTestStatus({ text: 'Testing connection to Google Apps Script & Google Sheets...', isSuccess: false });
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          appsScriptUrl: cleanUrl,
          sheetId: sheetId.trim()
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const sheetTitle = data.data?.sheetTitle || 'Google Sheet';
        const count = data.data?.totalCandidates !== undefined ? data.data.totalCandidates : (data.data?.candidates?.length || 0);
        const successMsg = `Connected successfully! Spreadsheet: "${sheetTitle}" (${count} candidate records loaded)`;
        setTestStatus({ text: successMsg, isSuccess: true });
        showToast('Google Apps Script connection verified!', 'success');
      } else {
        const errorMsg = data.error || 'Connection failed';
        setTestStatus({ text: `Error: ${errorMsg}`, isSuccess: false });
        showToast(errorMsg, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network failure';
      setTestStatus({ text: `Failed to connect: ${msg}`, isSuccess: false });
      showToast('Connection failed: ' + msg, 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#01008A] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              System Configuration
            </span>
            {isSupabaseConnected ? (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Supabase Connected (Cross-Device Sync Active)</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                <Database className="w-3 h-3 text-amber-600" />
                <span>Supabase Ready (Awaiting Credentials)</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Platform Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Central settings saved to Supabase and shared persistently across all recruiter laptops.
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="text-left sm:text-right text-xs text-slate-500">
          <div className="flex items-center sm:justify-end gap-1 font-semibold text-slate-700">
            <Laptop className="w-3.5 h-3.5 text-[#01008A]" />
            <span>Cross-Device Persistence</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isSupabaseConnected
              ? 'Synced via Supabase PostgreSQL'
              : 'Add Supabase keys to enable sync'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Google Integration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#01008A]" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Google Apps Script & Sheets Integration
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Google Apps Script Web App URL (doGet/doPost Endpoint) *
              </label>
              <input
                type="url"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#01008A]/15 focus:border-[#01008A] focus:outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                URL of your deployed Google Apps Script (<code className="font-mono">google_apps_script/Code.gs</code>) deployed with access set to Anyone.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Sheet ID</label>
                <input
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="e.g. 1E_WrVvh4LBCM60tfLjL3..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#01008A]/15 focus:border-[#01008A] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Sheet URL</label>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#01008A]/15 focus:border-[#01008A] focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Form ID</label>
                <input
                  type="text"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder="e.g. 1FAIpQLSfAGnQDROOOR..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#01008A]/15 focus:border-[#01008A] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Form URL</label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://forms.gle/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#01008A]/15 focus:border-[#01008A] focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Verifying...' : 'Test Connection'}</span>
                </button>
              </div>

              {testStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                    testStatus.isSuccess
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testStatus.isSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="leading-relaxed">{testStatus.text}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Database Storage Architecture */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 text-slate-800">
            <Database className="w-4 h-4 text-[#01008A]" />
            <h2 className="font-bold uppercase tracking-wider">
              Supabase Central Persistence Engine
            </h2>
          </div>

          <p className="text-slate-600 leading-relaxed">
            All candidate profiles, stage progressions (Round 1 → Round 2 → Round 3), 0–10 evaluation scores, scheduled calls, and these integration settings are stored in your central Supabase PostgreSQL database.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono text-[11px] text-slate-600">
            <div>• candidates: Core candidate records, contact info, stages, scores</div>
            <div>• candidate_rounds: Round 1, 2, 3 progression records</div>
            <div>• training_records: Training days, attendance, and final evaluation feedback</div>
            <div>• calendar_events: Scheduled phone interviews, calls, and meetings</div>
            <div>• platform_settings: Shared integration endpoints (multi-device synchronized)</div>
            <div>• platform_activity: Audit logging for candidate and status updates</div>
          </div>
        </div>

        {/* Section 3: Portal Access Security */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-4 h-4 text-[#01008A]" />
            <h2 className="font-bold uppercase tracking-wider">
              Portal Access Security
            </h2>
          </div>

          <p className="text-slate-600 leading-relaxed">
            Recruiter access is secured via server-side password validation and HTTP-only session cookies. Sensitive database keys (Service Role) are processed strictly within server route handlers and never exposed in client bundles.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{isSaving ? 'Saving Settings...' : 'Save Settings (Sync Across Devices)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
