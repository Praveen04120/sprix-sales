'use client';

import React from 'react';
import Image from 'next/image';
import { useHiring } from '@/context/HiringContext';
import {
  LayoutDashboard,
  Clock,
  Users,
  FileSpreadsheet,
  PhoneCall,
  GraduationCap,
  Calendar,
  Layers,
  Settings,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar() {
  const { activeTab, setActiveTab, candidates, sidebarOpen, setSidebarOpen } = useHiring();

  const round1Count = candidates.filter((c) => c.currentStage === 'ROUND_1').length;
  const round2Count = candidates.filter((c) => c.currentStage === 'ROUND_2').length;
  const round3Count = candidates.filter((c) => c.currentStage === 'ROUND_3').length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'today',
      label: "Today's Dashboard",
      icon: Clock,
      badge: null,
    },
    {
      id: 'candidates',
      label: 'All Candidates',
      icon: Users,
      badge: candidates.length > 0 ? candidates.length : null,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'round1',
      label: 'Round 1 (Screening)',
      icon: FileSpreadsheet,
      badge: round1Count > 0 ? round1Count : null,
      badgeColor: 'bg-blue-100 text-[#01008A] font-semibold',
    },
    {
      id: 'round2',
      label: 'Round 2 (Phone Interviews)',
      icon: PhoneCall,
      badge: round2Count > 0 ? round2Count : null,
      badgeColor: 'bg-amber-100 text-amber-800 font-semibold',
    },
    {
      id: 'round3',
      label: 'Round 3 (Training & Evaluation)',
      icon: GraduationCap,
      badge: round3Count > 0 ? round3Count : null,
      badgeColor: 'bg-purple-100 text-purple-800 font-semibold',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      badge: null,
    },
    {
      id: 'google-forms',
      label: 'Google Forms & Sheets',
      icon: Layers,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 h-screen z-30 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 select-none shadow-sm ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
        <div
          className="flex items-center gap-3 overflow-hidden cursor-pointer"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-white p-0.5 shadow-sm">
            <Image
              src="/sprix-logo.png"
              alt="Sprix Logo"
              width={36}
              height={36}
              className="object-contain w-full h-full"
            />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-black text-base tracking-wider text-[#01008A] leading-tight">
                SPRIX
              </span>
              <span className="text-[11px] font-medium text-slate-500 tracking-tight truncate">
                Hiring Management
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 group relative cursor-pointer ${
                isActive
                  ? 'bg-[#01008A] text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {isActive && (
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#FF0198] rounded-r-full" />
              )}
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-[#FF0198]' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {sidebarOpen && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badge !== null && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white font-semibold'
                          : item.badgeColor || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Collapse Toggle */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        {sidebarOpen && <span className="font-semibold text-slate-500">Sprix Internal</span>}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 ml-auto transition-colors cursor-pointer"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </aside>
  );
}
