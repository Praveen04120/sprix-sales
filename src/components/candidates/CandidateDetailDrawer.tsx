'use client';

import React, { useState } from 'react';
import { useHiring } from '@/context/HiringContext';
import { Candidate, Stage, CandidateStatus } from '@/types';
import { safeString } from '@/lib/normalize';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  ArrowRight,
  Send,
  Briefcase,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  FileSpreadsheet,
} from 'lucide-react';

interface CandidateDetailDrawerProps {
  candidate: Candidate | null;
  onClose: () => void;
}

export default function CandidateDetailDrawer({ candidate, onClose }: CandidateDetailDrawerProps) {
  const { updateCandidate, updateStage, showToast } = useHiring();

  const [activeTab, setActiveTab] = useState<'profile' | 'form' | 'notes'>('profile');
  const [editingScore, setEditingScore] = useState(false);
  const [scoreInput, setScoreInput] = useState<string>(
    candidate?.finalScore !== null && candidate?.finalScore !== undefined ? String(candidate.finalScore) : '8.0'
  );
  const [newNote, setNewNote] = useState('');

  if (!candidate) return null;

  const isWorking = candidate.currentStage === 'WORKING' || candidate.currentStatus === 'Working';

  const handleSaveScore = () => {
    const parsed = scoreInput ? parseFloat(scoreInput) : null;
    updateCandidate(candidate.id, { finalScore: parsed }, `Updated Final Score to ${parsed}/10`);
    setEditingScore(false);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    updateCandidate(candidate.id, {}, newNote.trim());
    setNewNote('');
  };

  const cleanPhone = safeString(candidate.phone).replace(/[^0-9+]/g, '');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#01008A] to-[#000066] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg text-[#FF0198] border border-white/20">
              {safeString(candidate.name).charAt(0) || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">{candidate.name}</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/15 text-white/90">
                  {candidate.id}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/80 mt-0.5">
                {candidate.role && <span>{candidate.role}</span>}
                {candidate.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#FF0198]" />
                      {candidate.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact & Status Bar */}
        <div className="px-6 py-3 bg-[#F4F7FC] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            {candidate.phone && (
              <a
                href={`tel:${cleanPhone}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-[#01008A] font-medium shadow-xs"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{candidate.phone}</span>
              </a>
            )}

            {candidate.email && (
              <a
                href={`mailto:${candidate.email}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-[#01008A] font-medium shadow-xs"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>{candidate.email}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isWorking
                  ? 'bg-blue-100 text-[#01008A] border border-blue-200'
                  : candidate.currentStatus === 'Selected'
                  ? 'bg-emerald-100 text-emerald-800'
                  : candidate.currentStatus === 'Rejected'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {candidate.currentStatus}
            </span>
          </div>
        </div>

        {/* Tab Header */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6 shrink-0 text-sm">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 font-semibold border-b-2 transition-all ${
              activeTab === 'profile'
                ? 'border-[#01008A] text-[#01008A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Candidate Profile
          </button>
          {Object.keys(candidate.formResponses || {}).length > 0 && (
            <button
              onClick={() => setActiveTab('form')}
              className={`py-3 font-semibold border-b-2 transition-all ${
                activeTab === 'form'
                  ? 'border-[#01008A] text-[#01008A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Google Form Answers
            </button>
          )}
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 font-semibold border-b-2 transition-all ${
              activeTab === 'notes'
                ? 'border-[#01008A] text-[#01008A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Notes ({candidate.adminNotes?.length || 0})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'profile' && (
            <>
              {/* Final Score Card */}
              <div className="p-4 bg-gradient-to-r from-blue-50/70 to-pink-50/50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#01008A]">
                    Final Score
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    {candidate.finalScore !== null && candidate.finalScore !== undefined ? (
                      <span className="text-[#FF0198]">{candidate.finalScore} / 10</span>
                    ) : (
                      <span className="text-slate-400 text-sm">Not rated yet</span>
                    )}
                  </div>
                </div>

                {editingScore ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      className="w-16 p-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-center"
                    />
                    <button
                      onClick={handleSaveScore}
                      className="px-2.5 py-1.5 bg-[#01008A] text-white text-xs font-bold rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingScore(true)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1 shadow-xs"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Score</span>
                  </button>
                )}
              </div>

              {/* Working Employee Details */}
              {isWorking ? (
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#01008A]">
                    <Briefcase className="w-4 h-4" />
                    <span>Working Team Member Record</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Joining Date</span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {candidate.joiningDate || 'Existing team member'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Designation / Role</span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {candidate.role || 'Sales Representative'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Simple 3-Round Hiring Pipeline Actions */
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Hiring Stage Progress (3-Round System)
                  </div>

                  {/* Visual Stepper */}
                  <div className="flex items-center justify-between text-xs py-2">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${
                          candidate.currentStage === 'ROUND_1'
                            ? 'bg-[#01008A] text-white ring-4 ring-blue-100'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        1
                      </span>
                      <span className="text-[11px] font-semibold mt-1">Round 1</span>
                    </div>

                    <div className="h-0.5 flex-1 bg-slate-200 mx-2" />

                    <div className="flex flex-col items-center">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${
                          candidate.currentStage === 'ROUND_2'
                            ? 'bg-[#01008A] text-white ring-4 ring-blue-100'
                            : candidate.currentStage === 'ROUND_3' || candidate.currentStage === 'SELECTED'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        2
                      </span>
                      <span className="text-[11px] font-semibold mt-1">Round 2</span>
                    </div>

                    <div className="h-0.5 flex-1 bg-slate-200 mx-2" />

                    <div className="flex flex-col items-center">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${
                          candidate.currentStage === 'ROUND_3'
                            ? 'bg-[#01008A] text-white ring-4 ring-blue-100'
                            : candidate.currentStage === 'SELECTED'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        3
                      </span>
                      <span className="text-[11px] font-semibold mt-1">Round 3</span>
                    </div>
                  </div>

                  {/* Stage Shift Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => updateStage(candidate.id, 'ROUND_2', 'Round 2', 'Advanced to Phone Interview')}
                      className="px-3 py-1.5 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-semibold rounded-lg"
                    >
                      Move to Round 2
                    </button>

                    <button
                      onClick={() => updateStage(candidate.id, 'ROUND_3', 'Round 3', 'Advanced to Training & Final Evaluation')}
                      className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg"
                    >
                      Move to Round 3
                    </button>

                    <button
                      onClick={() => updateStage(candidate.id, 'SELECTED', 'Selected', 'Offer approved')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                    >
                      Mark Selected
                    </button>

                    <button
                      onClick={() => updateStage(candidate.id, 'WORKING', 'Working', 'Onboarded as Working Employee')}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#01008A] border border-blue-200 text-xs font-semibold rounded-lg"
                    >
                      Mark Working
                    </button>

                    <button
                      onClick={() => updateStage(candidate.id, 'REJECTED', 'Rejected', 'Rejected candidate')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium rounded-lg"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tab 2: Google Form Answers */}
          {activeTab === 'form' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-[#01008A]">
                ORIGINAL APPLICATION DATA (GOOGLE FORM)
              </div>

              {Object.entries(candidate.formResponses || {}).map(([key, val]) => (
                <div key={key} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    {key}
                  </span>
                  <p className="text-slate-800 font-medium whitespace-pre-wrap">{val || '—'}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Notes Log */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add internal note or call remarks..."
                  className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#01008A] text-white text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>

              <div className="space-y-2.5">
                {candidate.adminNotes && candidate.adminNotes.length > 0 ? (
                  candidate.adminNotes.map((note) => (
                    <div key={note.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="font-bold text-[#01008A]">{note.author}</span>
                        <span>{note.timestamp}</span>
                      </div>
                      <p className="text-slate-700 font-medium">{note.note}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No notes recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Candidate ID: {candidate.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-semibold"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
