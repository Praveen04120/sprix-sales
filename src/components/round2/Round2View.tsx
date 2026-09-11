'use client';

import React, { useState } from 'react';
import { useHiring } from '@/context/HiringContext';
import { Candidate } from '@/types';
import {
  PhoneCall,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  Plus,
} from 'lucide-react';

export default function Round2View() {
  const { candidates, updateCandidate, updateStage, setSelectedCandidate, addCalendarEvent, showToast } = useHiring();
  const [schedulingCandidate, setSchedulingCandidate] = useState<Candidate | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00 AM');
  const [reason, setCallReason] = useState('Round 2 Phone Interview');
  const [notes, setNotes] = useState('');

  const round2Candidates = candidates.filter((c) => c.currentStage === 'ROUND_2');

  const handleOpenScheduleModal = (cand: Candidate) => {
    setSchedulingCandidate(cand);
    setDate(cand.interviewDate || new Date().toISOString().split('T')[0]);
    setTime(cand.interviewTime || '11:00 AM');
    setCallReason(cand.callReason || 'Round 2 Phone Interview');
    setNotes(cand.interviewNotes || '');
  };

  const handleSaveInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingCandidate) return;

    updateCandidate(schedulingCandidate.id, {
      interviewDate: date,
      interviewTime: time,
      callReason: reason,
      interviewNotes: notes,
      callStatus: 'Scheduled',
    });

    addCalendarEvent({
      candidateId: schedulingCandidate.id,
      candidateName: schedulingCandidate.name,
      type: 'INTERVIEW',
      startDate: date,
      startTime: time,
      reason: reason,
      notes: notes,
      status: 'Scheduled',
    });

    setSchedulingCandidate(null);
    showToast(`Interview scheduled for ${schedulingCandidate.name}`, 'success');
  };

  const handleAdvanceToRound3 = (cand: Candidate) => {
    updateStage(
      cand.id,
      'ROUND_3',
      'Round 3',
      'Passed Round 2 Phone Interview. Advanced to Round 3 Training & Evaluation.'
    );
    showToast(`Advanced ${cand.name} to Round 3!`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-2">
            <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
            <span>Telephonic Screening</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Round 2: Phone Interviews
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Conduct telephonic evaluations. Log call notes, voice pitch assessments, and move successful candidates to Round 3.
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-[#01008A]">{round2Candidates.length}</div>
          <div className="text-xs text-slate-400 font-medium">In Round 2</div>
        </div>
      </div>

      {/* Candidate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {round2Candidates.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            No candidates currently in Round 2.
          </div>
        ) : (
          round2Candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-[#01008A]/30 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-[#01008A] bg-blue-50 px-2 py-0.5 rounded">
                      {cand.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{cand.name}</h3>
                    <p className="text-xs text-slate-400">{cand.location} • {cand.phone}</p>
                  </div>

                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                    Round 2
                  </span>
                </div>

                {/* Interview Info */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-4 text-slate-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#01008A]" />
                      {cand.interviewDate || 'Date Not Set'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {cand.interviewTime || '11:00 AM'}
                    </span>
                  </div>

                  {cand.callReason && (
                    <div className="text-slate-700 font-medium pt-1 border-t border-slate-200/60">
                      <strong>Reason:</strong> {cand.callReason}
                    </div>
                  )}

                  {cand.interviewNotes && (
                    <p className="text-slate-600 italic">
                      &quot;{cand.interviewNotes}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedCandidate(cand)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  View Profile
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenScheduleModal(cand)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:border-[#01008A] text-slate-700 text-xs font-semibold rounded-lg"
                  >
                    Schedule Call
                  </button>

                  <button
                    onClick={() => handleAdvanceToRound3(cand)}
                    className="px-3.5 py-1.5 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Pass to Round 3</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FF0198]" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Interview Modal */}
      {schedulingCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Schedule Round 2 Phone Interview
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Candidate: <strong>{schedulingCandidate.name}</strong> ({schedulingCandidate.id})
            </p>

            <form onSubmit={handleSaveInterview} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interview Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="11:30 AM"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Call</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setCallReason(e.target.value)}
                  placeholder="Round 2 Phone Interview"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Call Notes / Instructions</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sales pitch test, objections to review..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSchedulingCandidate(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Schedule Interview
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
