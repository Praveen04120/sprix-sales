'use client';

import React, { useState, useMemo } from 'react';
import { useHiring } from '@/context/HiringContext';
import { Candidate, Stage, CandidateStatus } from '@/types';
import { matchesCandidateQuery, safeString, safeLower } from '@/lib/normalize';
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  Download,
  CheckCircle2,
  Briefcase,
  Star,
  Users,
} from 'lucide-react';

export default function CandidatesView() {
  const {
    candidates,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    setSelectedCandidate,
    addCandidate,
    showToast,
  } = useHiring();

  const [showAddModal, setShowAddModal] = useState(false);

  // Manual Candidate Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [role, setRole] = useState('Inside Sales Representative');
  const [joiningDate, setJoiningDate] = useState('');
  const [status, setStatus] = useState<CandidateStatus>('Working');
  const [finalScore, setFinalScore] = useState<string>('8.0');
  const [notes, setNotes] = useState('');

  const filterTabs: Array<{ id: string; label: string }> = [
    { id: 'All', label: 'All' },
    { id: 'Round 1', label: 'Round 1' },
    { id: 'Round 2', label: 'Round 2' },
    { id: 'Round 3', label: 'Round 3' },
    { id: 'Selected', label: 'Selected' },
    { id: 'Rejected', label: 'Rejected' },
    { id: 'Working', label: 'Working' },
  ];

  // Filter and search logic
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // Filter tab
      if (statusFilter !== 'All') {
        if (statusFilter === 'Round 1' && c.currentStage !== 'ROUND_1' && c.currentStatus !== 'Round 1') {
          return false;
        }
        if (statusFilter === 'Round 2' && c.currentStage !== 'ROUND_2' && c.currentStatus !== 'Round 2') {
          return false;
        }
        if (statusFilter === 'Round 3' && c.currentStage !== 'ROUND_3' && c.currentStatus !== 'Round 3') {
          return false;
        }
        if (statusFilter === 'Selected' && c.currentStage !== 'SELECTED' && c.currentStatus !== 'Selected') {
          return false;
        }
        if (statusFilter === 'Rejected' && c.currentStage !== 'REJECTED' && c.currentStatus !== 'Rejected') {
          return false;
        }
        if (statusFilter === 'Working' && c.currentStage !== 'WORKING' && c.currentStatus !== 'Working') {
          return false;
        }
      }

      // Search across Name, Phone, Email, ID safely
      if (searchQuery) {
        if (!matchesCandidateQuery(c, searchQuery)) {
          return false;
        }
      }

      return true;
    });
  }, [candidates, statusFilter, searchQuery]);

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Candidate Name is required', 'error');
      return;
    }

    const nextId = `SPRIX-${String(candidates.length + 1).padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    // Derive stage
    let stage: Stage = 'ROUND_1';
    if (status === 'Working') stage = 'WORKING';
    else if (status === 'Round 2') stage = 'ROUND_2';
    else if (status === 'Round 3') stage = 'ROUND_3';
    else if (status === 'Selected') stage = 'SELECTED';
    else if (status === 'Rejected') stage = 'REJECTED';

    const parsedScore = finalScore ? parseFloat(finalScore) : null;

    const newCandidate: Candidate = {
      id: nextId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      location: location.trim(),
      role: role.trim(),
      joiningDate: joiningDate || (status === 'Working' ? today : undefined),
      applicationDate: today,
      lastUpdated: 'Just now',
      currentStage: stage,
      currentStatus: status,
      finalScore: parsedScore,
      formResponses: {
        'Full Name': name.trim(),
        'Phone Number': phone.trim(),
        'Email Address': email.trim(),
        'Location': location.trim(),
        'Role': role.trim(),
      },
      adminNotes: notes ? [
        {
          id: 'n1',
          timestamp: 'Just now',
          author: 'Admin',
          note: notes,
        }
      ] : [],
      history: [
        {
          stage,
          status,
          timestamp: 'Just now',
          notes: status === 'Working' ? 'Added directly as Working Employee' : 'Manually registered',
        }
      ]
    };

    addCandidate(newCandidate);
    setShowAddModal(false);

    // Reset Form
    setName('');
    setPhone('');
    setEmail('');
    setLocation('');
    setRole('Inside Sales Representative');
    setJoiningDate('');
    setStatus('Working');
    setFinalScore('8.0');
    setNotes('');
  };

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Phone', 'Email', 'Location', 'Role', 'Status', 'Joining Date', 'Final Score'];
    const rows = filteredCandidates.map((c) => [
      safeString(c.id),
      `"${safeString(c.name)}"`,
      `"${safeString(c.phone)}"`,
      `"${safeString(c.email)}"`,
      `"${safeString(c.location)}"`,
      `"${safeString(c.role)}"`,
      safeString(c.currentStatus),
      safeString(c.joiningDate),
      c.finalScore !== null && c.finalScore !== undefined ? String(c.finalScore) : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `sprix_candidates_${safeLower(statusFilter).replace(/\s+/g, '_')}.csv`;
    link.click();
    showToast('Exported CSV file', 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Name, Phone, Email..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#01008A]/15 focus:border-[#01008A] shadow-xs"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#01008A] hover:bg-[#000066] text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 text-[#FF0198]" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {filterTabs.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#01008A] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        <span className="text-xs text-slate-400 ml-auto hidden sm:inline whitespace-nowrap font-medium">
          {filteredCandidates.length} candidate{filteredCandidates.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Candidates Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Candidate ID</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Status / Round</th>
                <th className="py-3.5 px-4">Joining Date</th>
                <th className="py-3.5 px-4">Final Score</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400 text-sm">
                    No candidates found. Click &quot;+ Add Candidate&quot; to register a candidate or employee.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => (
                  <tr
                    key={cand.id}
                    onClick={() => setSelectedCandidate(cand)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[#01008A]">
                      {cand.id}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-[#01008A]">
                        {cand.name}
                      </div>
                      {cand.role && (
                        <div className="text-[11px] text-slate-400">{cand.role}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {cand.phone || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {cand.email || '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
                          cand.currentStatus === 'Working'
                            ? 'bg-blue-100 text-[#01008A] border border-blue-200'
                            : cand.currentStatus === 'Selected'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cand.currentStatus === 'Rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : cand.currentStatus === 'Round 3'
                            ? 'bg-purple-100 text-purple-800'
                            : cand.currentStatus === 'Round 2'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {cand.currentStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {cand.joiningDate || '—'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {cand.finalScore !== null && cand.finalScore !== undefined ? (
                        <span className="font-black text-[#FF0198] px-2 py-0.5 bg-pink-50 border border-pink-100 rounded-md">
                          {cand.finalScore} / 10
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCandidate(cand);
                        }}
                        className="px-3 py-1 bg-white hover:bg-[#01008A] text-slate-700 hover:text-white rounded-lg border border-slate-200 text-xs font-semibold transition-colors shadow-xs"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: MANUALLY ADD CANDIDATE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Add Candidate / Working Employee
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new applicant or directly register an existing team member with their final score.
            </p>

            <form onSubmit={handleCreateCandidate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Candidate Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location / City</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Delhi NCR, Mumbai"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Skills / Role</label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Inside Sales Representative"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CandidateStatus)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Working">Working (Existing Employee)</option>
                    <option value="Round 1">Round 1 (Screening)</option>
                    <option value="Round 2">Round 2 (Phone Interview)</option>
                    <option value="Round 3">Round 3 (Training & Evaluation)</option>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Direct Final Score entry out of 10 */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#01008A]">
                    Final Score (0–10)
                  </label>
                  <span className="text-sm font-black text-[#01008A] bg-white px-2 py-0.5 rounded border border-blue-200">
                    {finalScore || '0'} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={finalScore}
                  onChange={(e) => setFinalScore(e.target.value)}
                  className="w-full accent-[#01008A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Background</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Employee history, performance, or application notes..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
