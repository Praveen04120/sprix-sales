'use client';

import React, { useState } from 'react';
import { useHiring } from '@/context/HiringContext';
import { Candidate } from '@/types';
import {
  GraduationCap,
  Award,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Star,
  ArrowRight,
} from 'lucide-react';

export default function Round3View() {
  const { candidates, updateCandidate, updateStage, setSelectedCandidate, showToast } = useHiring();

  const round3Candidates = candidates.filter((c) => c.currentStage === 'ROUND_3');

  const [selectedForEval, setSelectedForEval] = useState<Candidate | null>(null);
  const [score, setScore] = useState<number>(8.5);
  const [feedback, setFeedback] = useState('');

  const handleOpenEval = (cand: Candidate) => {
    setSelectedForEval(cand);
    setScore(cand.finalScore !== null && cand.finalScore !== undefined ? cand.finalScore : 8.5);
    setFeedback(cand.evaluationFeedback || '');
  };

  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForEval) return;

    updateCandidate(
      selectedForEval.id,
      {
        finalScore: score,
        evaluationFeedback: feedback,
        currentStage: 'SELECTED',
        currentStatus: 'Selected',
      },
      `Completed Round 3 Evaluation. Score: ${score}/10. Selected!`
    );

    setSelectedForEval(null);
    showToast(`Candidate ${selectedForEval.name} Selected with score ${score}/10!`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 text-xs font-semibold uppercase tracking-wider mb-2">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Final Stage</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Round 3: Training & Final Evaluation
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Candidates who passed Round 2 undergo 3–4 days of training and their final pitch evaluation. Enter their final score out of 10 and approve selection.
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-[#01008A]">{round3Candidates.length}</div>
          <div className="text-xs text-slate-400 font-medium">In Round 3</div>
        </div>
      </div>

      {/* Candidate Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {round3Candidates.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            No candidates currently in Round 3. Shortlist candidates from Round 2 to move them here.
          </div>
        ) : (
          round3Candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-[#01008A]/30 transition-all space-y-4 flex flex-col justify-between"
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

                  {cand.finalScore !== null && cand.finalScore !== undefined ? (
                    <span className="font-black text-[#FF0198] px-2 py-0.5 bg-pink-50 rounded text-xs border border-pink-100">
                      {cand.finalScore} / 10
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Training / In Review
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-600 font-medium">
                    Applied: {cand.applicationDate}
                  </div>
                  {cand.evaluationFeedback && (
                    <p className="text-slate-700 italic pt-1 border-t border-slate-200/60">
                      &quot;{cand.evaluationFeedback}&quot;
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedCandidate(cand)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  View Profile
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEval(cand)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:border-[#01008A] text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 shadow-xs"
                  >
                    <Award className="w-3.5 h-3.5 text-[#FF0198]" />
                    <span>Rate (0–10)</span>
                  </button>

                  <button
                    onClick={() => {
                      updateStage(cand.id, 'SELECTED', 'Selected', 'Selected in Round 3');
                      showToast(`Selected ${cand.name}!`, 'success');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs"
                  >
                    Select & Hire
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Evaluation Modal */}
      {selectedForEval && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Final Evaluation & Score (0–10)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Candidate: <strong>{selectedForEval.name}</strong> ({selectedForEval.id})
            </p>

            <form onSubmit={handleSaveEvaluation} className="space-y-4">
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#01008A]">
                    Overall Score (0–10)
                  </label>
                  <span className="text-lg font-black text-[#01008A] bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-xs">
                    {score} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={score}
                  onChange={(e) => setScore(parseFloat(e.target.value))}
                  className="w-full accent-[#01008A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Evaluator Feedback / Remarks
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Sales pitch mastery, objection handling, closing capability..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForEval(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#01008A] hover:bg-[#000066] text-white text-xs font-bold rounded-xl"
                >
                  Approve & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
