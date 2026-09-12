'use client';

import React, { useState } from 'react';
import { useHiring } from '@/context/HiringContext';
import { CalendarEvent, Candidate } from '@/types';
import { safeString } from '@/lib/normalize';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  PhoneCall,
  GraduationCap,
  Award,
  Clock,
  User,
  X,
} from 'lucide-react';

export default function CalendarView() {
  const { calendarEvents, candidates, addCalendarEvent, setSelectedCandidate, showToast } = useHiring();
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);

  // New Event Form State
  const [candidateId, setCandidateId] = useState('');
  const [eventType, setEventType] = useState<'INTERVIEW' | 'TRAINING' | 'FINAL_EVALUATION'>('INTERVIEW');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('11:30');
  const [eventNotes, setEventNotes] = useState('');

  // Helpers for Month Grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 86400000));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 86400000));
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) {
      showToast('Please select a candidate', 'error');
      return;
    }

    addCalendarEvent({
      candidateId: cand.id,
      candidateName: cand.name,
      type: eventType,
      startDate,
      endDate: eventType === 'TRAINING' ? (endDate || startDate) : undefined,
      startTime,
      endTime,
      reason: eventNotes || `${safeString(eventType).replace(/_/g, ' ')} with ${cand.name}`,
      notes: eventNotes || `${safeString(eventType).replace(/_/g, ' ')} with ${cand.name}`,
      status: 'Scheduled',
    });

    setShowEventModal(false);
    setEventNotes('');
  };

  const handleEventClick = (event: CalendarEvent) => {
    const cand = candidates.find((c) => c.id === event.candidateId);
    if (cand) {
      setSelectedCandidate(cand);
    } else {
      showToast(`Event: ${event.notes || event.type}`, 'info');
    }
  };

  // Build calendar matrix (42 cells: 6 weeks)
  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push({ day: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, dateStr: dStr });
  }
  while (calendarCells.length < 35) {
    calendarCells.push({ day: null, dateStr: null });
  }

  const getEventsForDate = (dateStr: string | null) => {
    if (!dateStr) return [];
    return calendarEvents.filter((evt) => {
      if (evt.startDate === dateStr) return true;
      if (evt.endDate && evt.startDate <= dateStr && dateStr <= evt.endDate) return true;
      return false;
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Calendar Header / Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl text-[#01008A]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{monthName}</h2>
            <p className="text-xs text-slate-500">Recruitment schedules and milestones</p>
          </div>
        </div>

        {/* View mode toggle & navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
            {(['month', 'week', 'day'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                  viewMode === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setShowEventModal(true)}
            className="px-3.5 py-2 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Plus className="w-4 h-4 text-[#FF0198]" />
            <span>Schedule Event</span>
          </button>
        </div>
      </div>

      {/* MONTH VIEW GRID */}
      {viewMode === 'month' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-600 py-2.5 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {calendarCells.map((cell, idx) => {
              const dayEvents = getEventsForDate(cell.dateStr);
              const isToday =
                cell.dateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                    cell.day === null ? 'bg-slate-50/50' : 'bg-white hover:bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {cell.day !== null ? (
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          isToday
                            ? 'bg-[#01008A] text-white'
                            : 'text-slate-700'
                        }`}
                      >
                        {cell.day}
                      </span>
                    ) : (
                      <span />
                    )}

                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Event pills inside cell */}
                  <div className="space-y-1 my-1 flex-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        onClick={() => handleEventClick(evt)}
                        className={`p-1 rounded text-[10px] font-semibold truncate cursor-pointer transition-all ${
                          evt.type === 'INTERVIEW'
                            ? 'bg-blue-50 text-[#01008A] border border-blue-200 hover:bg-blue-100'
                            : evt.type === 'TRAINING'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                            : 'bg-pink-50 text-[#FF0198] border border-pink-200 hover:bg-pink-100'
                        }`}
                        title={`${evt.type}: ${evt.candidateName} (${evt.startTime || ''})`}
                      >
                        <span className="font-bold">{evt.startTime ? `${evt.startTime} ` : ''}</span>
                        <span>{evt.candidateName}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-400 font-medium pl-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK & DAY VIEWS: Schedule List */}
      {(viewMode === 'week' || viewMode === 'day') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            All Scheduled Events ({calendarEvents.length})
          </h3>

          <div className="divide-y divide-slate-100">
            {calendarEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No events currently scheduled on the calendar.
              </div>
            ) : (
              calendarEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => handleEventClick(evt)}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-50 px-3 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        evt.type === 'INTERVIEW'
                          ? 'bg-blue-100 text-[#01008A]'
                          : evt.type === 'TRAINING'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-pink-100 text-[#FF0198]'
                      }`}
                    >
                      {evt.type === 'INTERVIEW' ? (
                        <PhoneCall className="w-4 h-4" />
                      ) : evt.type === 'TRAINING' ? (
                        <GraduationCap className="w-4 h-4" />
                      ) : (
                        <Award className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{evt.candidateName}</span>
                        <span className="text-[11px] font-mono text-slate-400">{evt.candidateId}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                          {safeString(evt.type).replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{evt.notes}</p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <div className="font-semibold text-slate-800">{evt.startDate}</div>
                    <div className="text-slate-400 text-[11px]">
                      {evt.startTime} {evt.endTime ? `– ${evt.endTime}` : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Schedule Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Add Event to Hiring Calendar
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Schedule interview, multi-day training batch, or final evaluation.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Candidate *</label>
                <select
                  required
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id}) • {c.currentStage}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type *</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="INTERVIEW">Phone Interview (Round 2)</option>
                  <option value="TRAINING">Sales Training (Multi-day block)</option>
                  <option value="FINAL_EVALUATION">Final Evaluation (Round 3)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                {eventType === 'TRAINING' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="11:30 AM"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="e.g. Sales pitch evaluation, room link, or phone number"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-xl"
                >
                  Add to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
