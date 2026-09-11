'use client';

import React from 'react';
import { useHiring } from '@/context/HiringContext';
import {
  Layers,
  ExternalLink,
  RefreshCw,
  Edit,
  FileSpreadsheet,
  ShieldCheck,
  Settings as SettingsIcon,
} from 'lucide-react';

export default function GoogleFormsView() {
  const { settings, triggerSync, syncStatus, candidates, setActiveTab } = useHiring();

  const formUrl = settings.googleFormUrl || '';
  const editUrl = formUrl.replace('/viewform', '/edit');
  const sheetUrl = settings.googleSheetUrl || '';

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#01008A] text-xs font-semibold uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Google Workspace Connected</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Google Forms & Sheets Integration
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Candidate applications flow directly from your Google Form into Google Sheets and sync into this platform.
          </p>
        </div>

        <button
          onClick={() => triggerSync()}
          disabled={syncStatus.isSyncing}
          className="px-4 py-2.5 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin text-[#FF0198]' : ''}`} />
          <span>Sync Latest Responses</span>
        </button>
      </div>

      {/* Connected Form Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Live Connected Integration
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-2">
              Sprix Hiring Form & Master Sheet
            </h3>
            {settings.googleFormId ? (
              <p className="text-xs text-slate-500">
                Form ID: <code className="font-mono text-slate-700">{settings.googleFormId}</code>
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Form ID not entered yet. Configure in Settings.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {formUrl && (
              <a
                href={formUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-white border border-slate-200 hover:border-[#01008A] text-slate-700 hover:text-[#01008A] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Form</span>
              </a>
            )}

            {formUrl && (
              <a
                href={editUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-white border border-slate-200 hover:border-[#01008A] text-slate-700 hover:text-[#01008A] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Form (Google)</span>
              </a>
            )}

            <button
              onClick={() => setActiveTab('settings')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-[#01008A]" />
              <span>Configure URLs</span>
            </button>
          </div>
        </div>

        {/* Metadata Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Candidate Records</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{candidates.length}</div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Target Sheet</span>
            <div className="text-sm font-bold text-[#01008A] mt-0.5 flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Candidates</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Last Sync</span>
            <div className="text-sm font-bold text-slate-800 mt-0.5">{syncStatus.lastSync}</div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Google Spreadsheet</span>
            <div className="mt-0.5">
              {sheetUrl ? (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#01008A] hover:underline font-semibold flex items-center gap-1 truncate"
                >
                  <span>Open Sheet</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </div>
          </div>
        </div>

        {/* Architecture Guarantee */}
        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#01008A]">
            <ShieldCheck className="w-4 h-4 text-[#FF0198]" />
            <span>Immutable Source Data Principle</span>
          </div>
          <p>
            When candidates submit Google Forms, responses are saved directly into your Google Sheet. The Sprix platform reads this data dynamically without ever overwriting original responses. Internal recruitment statuses, phone interview records, scores, and notes are managed safely.
          </p>
        </div>
      </div>
    </div>
  );
}
