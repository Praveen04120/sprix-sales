'use client';

import React, { useState } from 'react';
import { useHiring } from '@/context/HiringContext';
import {
  Settings,
  FileSpreadsheet,
  Link,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function SettingsView() {
  const { settings, updateSettings, showToast } = useHiring();

  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.appsScriptUrl || '');
  const [sheetId, setSheetId] = useState(settings.googleSheetId || '');
  const [sheetUrl, setSheetUrl] = useState(settings.googleSheetUrl || '');
  const [formId, setFormId] = useState(settings.googleFormId || '');
  const [formUrl, setFormUrl] = useState(settings.googleFormUrl || '');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      appsScriptUrl: appsScriptUrl.trim(),
      googleSheetId: sheetId.trim(),
      googleSheetUrl: sheetUrl.trim(),
      googleFormId: formId.trim(),
      googleFormUrl: formUrl.trim(),
    });
  };

  const handleTestConnection = async () => {
    if (!appsScriptUrl.trim()) {
      setTestStatus('Please enter your Google Apps Script URL first.');
      return;
    }

    setTesting(true);
    setTestStatus('Testing endpoint connection...');
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl: appsScriptUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus('Connection successful! Google Apps Script is responding.');
        showToast('Connected to Google Apps Script successfully!', 'success');
      } else {
        setTestStatus(`Error: ${data.error || 'Connection failed'}`);
        showToast(data.error || 'Connection failed', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network failure';
      setTestStatus(`Failed to connect: ${msg}`);
      showToast('Connection failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#01008A] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            System Configuration
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Platform Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Connect your production Google Sheets data layer, Apps Script endpoint, and Google Form.
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
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
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
                  placeholder="e.g. 1TOz0X0j9yjC6OR_rLo8oMm..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Sheet URL</label>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                  placeholder="e.g. 1FAIpQLScSprix..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Form URL</label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>

              {testStatus && (
                <span className="text-xs font-medium text-slate-600">
                  {testStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Security & Password Information */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-4 h-4 text-[#01008A]" />
            <h2 className="font-bold uppercase tracking-wider">
              Portal Access Security
            </h2>
          </div>

          <p className="text-slate-600 leading-relaxed">
            The platform is secured with your private administrator password. Password verification is strictly processed server-side through Next.js HTTP-only cookies, ensuring sensitive credentials are never leaked in client-side bundles.
          </p>

          <p className="text-slate-500">
            To update the access password in production, configure the <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">APP_PASSWORD</code> environment variable in your Vercel Project Settings.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
