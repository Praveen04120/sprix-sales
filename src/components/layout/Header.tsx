'use client';

import React from 'react';
import { useHiring } from '@/context/HiringContext';
import {
  RefreshCw,
  Search,
  LogOut,
  Menu,
  Database,
  FileSpreadsheet,
} from 'lucide-react';

export default function Header() {
  const {
    activeTab,
    setActiveTab,
    syncStatus,
    triggerSync,
    settings,
    searchQuery,
    setSearchQuery,
    setIsAuthenticated,
    sidebarOpen,
    setSidebarOpen,
    showToast,
  } = useHiring();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sprix_authenticated');
    }
    setIsAuthenticated(false);
    showToast('Logged out of Sprix portal', 'info');
  };

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Sprix Hiring Dashboard', desc: 'Overview across Round 1, Round 2, and Round 3' };
      case 'today':
        return { title: "Today's Schedule & Call Tracker", desc: 'Daily activities, scheduled interviews, and calls' };
      case 'candidates':
        return { title: 'All Candidates & Employees', desc: 'Central directory of applicants, rounds, and working employees' };
      case 'round1':
        return { title: 'Round 1 — Application Screening', desc: 'Screen incoming Google Form applications' };
      case 'round2':
        return { title: 'Round 2 — Phone Interviews', desc: 'Schedule and evaluate telephonic interviews' };
      case 'round3':
        return { title: 'Round 3 — Training & Final Evaluation', desc: '3–4 day training and final 0–10 score evaluation' };
      case 'calendar':
        return { title: 'Hiring Calendar', desc: 'Scheduled interviews, training, and evaluations' };
      case 'google-forms':
        return { title: 'Google Forms & Sheets', desc: 'Real connected Google Form and response spreadsheet' };
      case 'settings':
        return { title: 'Platform Settings', desc: 'Manage Google Sheets integration and configuration' };
      default:
        return { title: 'Sprix Hiring Platform', desc: 'Internal recruitment portal' };
    }
  };

  const pageInfo = getPageTitle(activeTab);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Mobile Menu & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base lg:text-lg font-bold text-slate-900 leading-none">
            {pageInfo.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 mt-1 truncate max-w-xs md:max-w-md">
            {pageInfo.desc}
          </p>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="hidden md:flex items-center relative max-w-xs w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (activeTab !== 'candidates' && e.target.value.trim().length > 0) {
              setActiveTab('candidates');
            }
          }}
          placeholder="Search candidates (Name, Phone, Email)..."
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#01008A]/15 focus:border-[#01008A] transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Right Controls: Sync & Logout */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Connection Status Indicator */}
        {settings.appsScriptUrl ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Google Sheets Live</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
            <FileSpreadsheet className="w-3 h-3 text-slate-500" />
            <span>Google Sheets</span>
          </div>
        )}

        {/* Sync Button */}
        <button
          onClick={() => triggerSync()}
          disabled={syncStatus.isSyncing}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
            syncStatus.isSyncing
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white hover:bg-slate-50 text-[#01008A] border-slate-200 hover:border-[#01008A]/40 shadow-xs'
          }`}
          title="Fetch latest responses from Google Sheets"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin text-[#FF0198]' : 'text-[#01008A]'}`} />
          <span className="hidden sm:inline">Sync</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          title="Sign out of portal"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
