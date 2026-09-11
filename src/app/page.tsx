'use client';

import React from 'react';
import { useHiring } from '@/context/HiringContext';
import LoginView from '@/components/auth/LoginView';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import DashboardView from '@/components/dashboard/DashboardView';
import TodayView from '@/components/today/TodayView';
import CandidatesView from '@/components/candidates/CandidatesView';
import Round1View from '@/components/round1/Round1View';
import Round2View from '@/components/round2/Round2View';
import Round3View from '@/components/round3/Round3View';
import CalendarView from '@/components/calendar/CalendarView';
import GoogleFormsView from '@/components/google-forms/GoogleFormsView';
import SettingsView from '@/components/settings/SettingsView';
import CandidateDetailDrawer from '@/components/candidates/CandidateDetailDrawer';

export default function Home() {
  const { isAuthenticated, activeTab, selectedCandidate, setSelectedCandidate } = useHiring();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#F5F8FC] flex text-slate-800">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'today' && <TodayView />}
          {activeTab === 'candidates' && <CandidatesView />}
          {activeTab === 'round1' && <Round1View />}
          {activeTab === 'round2' && <Round2View />}
          {activeTab === 'round3' && <Round3View />}
          {activeTab === 'calendar' && <CalendarView />}
          {activeTab === 'google-forms' && <GoogleFormsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Candidate Profile Drawer */}
      {selectedCandidate && (
        <CandidateDetailDrawer
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </div>
  );
}
