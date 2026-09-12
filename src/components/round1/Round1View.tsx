'use client';

import React, { useState } from 'react';
import { useHiring } from '@/context/HiringContext';
import { Candidate } from '@/types';
import { matchesCandidateQuery } from '@/lib/normalize';
import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Search,
  Eye,
} from 'lucide-react';

export default function Round1View() {
  const { candidates, updateStage, setSelectedCandidate, showToast } = useHiring();
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Candidates currently in Round 1
  const round1Candidates = candidates.filter((c) => {
    if (c.currentStage !== 'ROUND_1') return false;
    if (filter !== 'All' && c.currentStatus !== filter) return false;
    if (search) {
      return matchesCandidateQuery(c, search);
    }
    return true;
  });

  const handleShortlist = (cand: Candidate) => {
    updateStage(cand.id, 'ROUND_2', 'Round 2', 'Shortlisted from Round 1 for Phone Interview');
    showToast(`Shortlisted ${cand.name} for Round 2 Phone Interview`, 'success');
  };

  const handleReject = (cand: Candidate) => {
    updateStage(cand.id, 'REJECTED', 'Rejected', 'Application screened out in Round 1');
    showToast(`Rejected ${cand.name}`, 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#01008A] text-xs font-semibold uppercase tracking-wider mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Application Screening</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Round 1: Applications
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Incoming candidates from your Google Form responses. Review form answers and shortlist qualified candidates for Round 2 Phone Interview.
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-[#01008A]">{round1Candidates.length}</div>
          <div className="text-xs text-slate-400 font-medium">Applicants in Round 1</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {['All', 'New', 'Round 1'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
                filter === st
                  ? 'bg-[#01008A] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Round 1 applicants..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01008A]/15 shadow-xs"
          />
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {round1Candidates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            No candidates currently in Round 1.
          </div>
        ) : (
          round1Candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-[#01008A]/30 transition-all space-y-4"
            >
              {/* Header Info */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#01008A] bg-blue-50 px-2 py-0.5 rounded">
                      {cand.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{cand.name}</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                      {cand.currentStatus}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>{cand.phone}</span>
                    <span>•</span>
                    <span>{cand.email}</span>
                    {cand.location && (
                      <>
                        <span>•</span>
                        <span>{cand.location}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>Applied: {cand.applicationDate}</span>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCandidate(cand)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </button>

                  <button
                    onClick={() => handleShortlist(cand)}
                    className="px-4 py-1.5 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>Shortlist to Round 2</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FF0198]" />
                  </button>

                  <button
                    onClick={() => handleReject(cand)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Reject Application"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dynamic Google Form Responses Grid */}
              {Object.keys(cand.formResponses || {}).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  {Object.entries(cand.formResponses).map(([field, answer]) => {
                    if (['Full Name', 'Phone Number', 'Email Address', 'Location'].includes(field)) {
                      return null;
                    }
                    return (
                      <div key={field} className="space-y-0.5">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          {field}
                        </span>
                        <p className="text-slate-800 font-medium whitespace-pre-wrap line-clamp-2">
                          {answer || '—'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
