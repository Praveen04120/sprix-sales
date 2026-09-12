'use client';

import React, { useState, useMemo } from 'react';
import { useHiring } from '@/context/HiringContext';
import { safeString } from '@/lib/normalize';
import {
  Calendar as CalendarIcon,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  User,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Award,
  Edit2,
} from 'lucide-react';

export default function TodayView() {
  const {
    calendarEvents,
    candidates,
    selectedDate,
    setSelectedDate,
    updateCallStatus,
    addCalendarEvent,
    setSelectedCandidate,
    showToast,
  } = useHiring();

  const [showLogCallModal, setShowLogCallModal] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [callTime, setCallTime] = useState('11:00 AM');
  const [callReason, setCallReason] = useState('Round 2 Interview');
  const [callStatus, setCallStatus] = useState<'Completed' | 'Scheduled' | 'Pending' | 'Missed'>('Completed');

  // Format date helper
  const formattedSelectedDate = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    } catch {}
    return selectedDate;
  }, [selectedDate]);

  // Quick navigation buttons: Yesterday, Today, Tomorrow
  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Scheduled activities on selected date
  const scheduledActivities = useMemo(() => {
    return calendarEvents.filter((evt) => {
      if (evt.startDate === selectedDate) return true;
      if (evt.endDate && evt.startDate <= selectedDate && selectedDate <= evt.endDate) return true;
      return false;
    });
  }, [calendarEvents, selectedDate]);

  // Calls logged or scheduled on selected date
  const callsForDate = useMemo(() => {
    // Collect from calendar events of type CALL or INTERVIEW
    const eventCalls = scheduledActivities
      .filter((e) => e.type === 'CALL' || e.type === 'INTERVIEW')
      .map((e) => ({
        id: e.id,
        candidateId: e.candidateId,
        candidateName: e.candidateName,
        time: e.startTime || '11:00 AM',
        reason: e.reason || e.notes || 'Round 2 Interview',
        status: (e.status || 'Completed') as 'Completed' | 'Scheduled' | 'Pending' | 'Missed',
      }));

    // Also include candidates whose interviewDate matches selectedDate
    const candidateInterviews = candidates
      .filter((c) => c.interviewDate === selectedDate)
      .map((c) => ({
        id: `cand-${c.id}`,
        candidateId: c.id,
        candidateName: c.name,
        time: c.interviewTime || '11:00 AM',
        reason: c.callReason || 'Round 2 Phone Interview',
        status: (c.callStatus || 'Completed') as 'Completed' | 'Scheduled' | 'Pending' | 'Missed',
      }));

    // Deduplicate by candidateId
    const seen = new Set<string>();
    const merged: typeof eventCalls = [];
    [...eventCalls, ...candidateInterviews].forEach((item) => {
      if (!seen.has(item.candidateId)) {
        seen.add(item.candidateId);
        merged.push(item);
      }
    });

    return merged;
  }, [scheduledActivities, candidates, selectedDate]);

  const handleSaveLogCall = (e: React.FormEvent) => {
    e.preventDefault();
    const cand = candidates.find((c) => c.id === selectedCandidateId);
    if (!cand) {
      showToast('Please select a candidate', 'error');
      return;
    }

    addCalendarEvent({
      candidateId: cand.id,
      candidateName: cand.name,
      type: 'CALL',
      startDate: selectedDate,
      startTime: callTime,
      reason: callReason,
      notes: callReason,
      status: callStatus,
    });

    updateCallStatus(cand.id, null, callStatus, callReason);
    setShowLogCallModal(false);
    setSelectedCandidateId('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Date Selector Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#01008A] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            Daily Activity Tracker
          </span>
          <h1 className="text-2xl font-black text-[#01008A] tracking-tight mt-1.5">
            TODAY&apos;S DASHBOARD
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {formattedSelectedDate}
          </p>
        </div>

        {/* Date Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs sm:text-sm font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#01008A]/20"
          />

          <button
            onClick={handleSetToday}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Today
          </button>

          <button
            onClick={handleNextDay}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowLogCallModal(true)}
            className="px-4 py-2 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all ml-2"
          >
            <Plus className="w-3.5 h-3.5 text-[#FF0198]" />
            <span>Log Call / Activity</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: TODAY'S SCHEDULE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Today&apos;s Schedule</h2>
            <p className="text-xs text-slate-500">
              Meetings, phone calls, and training activities scheduled for {selectedDate}
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-[#01008A] rounded-full">
            {scheduledActivities.length} Scheduled
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {scheduledActivities.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No meetings or activities scheduled for this date. Click &quot;Log Call / Activity&quot; above to add one.
            </div>
          ) : (
            scheduledActivities.map((evt) => (
              <div
                key={evt.id}
                className="p-4 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-[#01008A] shadow-xs">
                    {evt.type === 'CALL' || evt.type === 'INTERVIEW' ? (
                      <PhoneCall className="w-4 h-4 text-emerald-600" />
                    ) : evt.type === 'TRAINING' ? (
                      <GraduationCap className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Award className="w-4 h-4 text-[#FF0198]" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#01008A]">
                        {evt.startTime || 'Time TBD'}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {evt.candidateName}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">
                        {safeString(evt.type).replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 font-medium mt-0.5">
                      <strong>Reason:</strong> {evt.reason || evt.notes || 'Round 2 Interview'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      evt.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : evt.status === 'Missed'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {evt.status || 'Scheduled'}
                  </span>

                  <button
                    onClick={() => {
                      const cand = candidates.find((c) => c.id === evt.candidateId);
                      if (cand) setSelectedCandidate(cand);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-xs"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: "WHO DID I CALL TODAY?" (TODAY'S CALLS) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Who Did I Call Today?</h2>
            <p className="text-xs text-slate-500">
              Complete record of candidates called on {selectedDate} with reason and outcome
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full">
            {callsForDate.length} Calls Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Reason for Call</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {callsForDate.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                    No calls recorded for this date.
                  </td>
                </tr>
              ) : (
                callsForDate.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {call.candidateName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {call.time}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {call.reason}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={call.status}
                        onChange={(e) =>
                          updateCallStatus(
                            call.candidateId,
                            call.id.startsWith('evt-') ? call.id : null,
                            e.target.value as any,
                            call.reason
                          )
                        }
                        className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        <option value="Completed">Completed</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Pending">Pending</option>
                        <option value="Missed">Missed</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          const cand = candidates.find((c) => c.id === call.candidateId);
                          if (cand) setSelectedCandidate(cand);
                        }}
                        className="px-2.5 py-1 text-slate-600 hover:text-[#01008A] hover:bg-blue-50 rounded font-semibold text-xs transition-colors"
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

      {/* Modal: Log Call / Activity */}
      {showLogCallModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Log Call or Activity
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Record a call or meeting for <strong>{selectedDate}</strong>
            </p>

            <form onSubmit={handleSaveLogCall} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Candidate *</label>
                <select
                  required
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id}) • {c.currentStatus}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    required
                    value={callTime}
                    onChange={(e) => setCallTime(e.target.value)}
                    placeholder="11:30 AM"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Call Status</label>
                  <select
                    value={callStatus}
                    onChange={(e) => setCallStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Pending">Pending</option>
                    <option value="Missed">Missed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Call *</label>
                <input
                  type="text"
                  required
                  value={callReason}
                  onChange={(e) => setCallReason(e.target.value)}
                  placeholder="e.g. Round 2 Interview, Follow-up, Joining Confirmation"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLogCallModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Call Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
