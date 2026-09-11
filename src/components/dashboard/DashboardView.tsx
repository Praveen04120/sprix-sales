'use client';

import React from 'react';
import { useHiring } from '@/context/HiringContext';
import {
  Users,
  FileSpreadsheet,
  PhoneCall,
  GraduationCap,
  CheckCircle2,
  Calendar,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';

export default function DashboardView() {
  const { candidates, setActiveTab, triggerSync, syncStatus, loadError, fetchLatestData } = useHiring();

  // Metrics based strictly on the 3-round architecture
  const totalApplications = candidates.length;
  const round1Count = candidates.filter((c) => c.currentStage === 'ROUND_1').length;
  const round2Count = candidates.filter((c) => c.currentStage === 'ROUND_2').length;
  const round3Count = candidates.filter((c) => c.currentStage === 'ROUND_3').length;
  const shortlistedCount = candidates.filter(
    (c) =>
      c.currentStatus === 'Shortlisted' ||
      c.currentStage === 'ROUND_2' ||
      c.currentStage === 'ROUND_3' ||
      c.currentStage === 'SELECTED'
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Error state if Google connection fails */}
      {loadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Unable to load candidate data: {loadError}</span>
          </div>
          <button
            onClick={() => fetchLatestData()}
            className="px-3 py-1 bg-white border border-rose-300 hover:bg-rose-100 rounded-lg font-semibold text-rose-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Brand Title Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#01008A] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            Sprix Talent Operations
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#01008A] tracking-tight mt-2">
            SPRIX HIRING
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Candidate hiring pipeline across Round 1, Round 2, and Round 3.
          </p>
        </div>

        {/* Action Shortcuts: Today & All Candidates */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveTab('today')}
            className="px-5 py-3 bg-[#01008A] hover:bg-[#000066] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md flex items-center gap-2 transition-all group cursor-pointer"
          >
            <Clock className="w-4 h-4 text-[#FF0198]" />
            <span>Open Today&apos;s Schedule</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs sm:text-sm font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#01008A]" />
            <span>All Candidates</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid (Total Applications, Round 1, Round 2, Round 3, Shortlisted) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* TOTAL APPLICATIONS */}
        <div
          onClick={() => setActiveTab('candidates')}
          className="p-6 bg-white border border-slate-200 hover:border-[#01008A]/40 rounded-2xl shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Applications
            </span>
            <Users className="w-4 h-4 text-[#01008A]" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-3">{totalApplications}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">All registered candidates</div>
        </div>

        {/* ROUND 1 */}
        <div
          onClick={() => setActiveTab('round1')}
          className="p-6 bg-white border border-blue-200 bg-blue-50/20 hover:border-blue-400 rounded-2xl shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
              Round 1
            </span>
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-900 mt-3">{round1Count}</div>
          <div className="text-[11px] text-blue-600 mt-1 font-medium">Application Screening</div>
        </div>

        {/* ROUND 2 */}
        <div
          onClick={() => setActiveTab('round2')}
          className="p-6 bg-white border border-amber-200 bg-amber-50/20 hover:border-amber-400 rounded-2xl shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Round 2
            </span>
            <PhoneCall className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-900 mt-3">{round2Count}</div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">Phone Interview</div>
        </div>

        {/* ROUND 3 */}
        <div
          onClick={() => setActiveTab('round3')}
          className="p-6 bg-white border border-purple-200 bg-purple-50/20 hover:border-purple-400 rounded-2xl shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
              Round 3
            </span>
            <GraduationCap className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-3xl font-black text-purple-900 mt-3">{round3Count}</div>
          <div className="text-[11px] text-purple-700 mt-1 font-medium">Training & Final Evaluation</div>
        </div>

        {/* TOTAL SHORTLISTED */}
        <div
          onClick={() => setActiveTab('candidates')}
          className="p-6 bg-white border border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 rounded-2xl shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Shortlisted
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-900 mt-3">{shortlistedCount}</div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">Passed Initial Screening</div>
        </div>
      </div>

      {/* Two Direct Navigation Cards: TODAY & ALL CANDIDATES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Card 1: TODAY'S DASHBOARD */}
        <div
          onClick={() => setActiveTab('today')}
          className="p-6 bg-white border border-slate-200 hover:border-[#01008A] rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#01008A] bg-blue-50 px-2.5 py-0.5 rounded-full">
                Daily Operations
              </span>
              <Calendar className="w-4 h-4 text-[#01008A]" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#01008A] transition-colors">
              Today&apos;s Dashboard
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Check all interviews, calls, and training activities scheduled for today or any selected date. View who you need to call and log call outcomes.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#01008A]">
            <span>View Today&apos;s Schedule & Calls</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: ALL CANDIDATES */}
        <div
          onClick={() => setActiveTab('candidates')}
          className="p-6 bg-white border border-slate-200 hover:border-[#01008A] rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Central Directory
              </span>
              <Users className="w-4 h-4 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#01008A] transition-colors">
              All Candidates
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Access the complete candidate roster including applicants across Round 1, Round 2, Round 3, and existing working team members with final scores.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#01008A]">
            <span>Browse All {totalApplications} Candidates</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
