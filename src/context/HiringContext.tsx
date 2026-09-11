'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Candidate,
  CalendarEvent,
  AppSettings,
  Stage,
} from '@/types';
import { initialSettings } from '@/data/seedData';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface HiringContextType {
  candidates: Candidate[];
  calendarEvents: CalendarEvent[];
  settings: AppSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCandidate: Candidate | null;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  isLoading: boolean;
  loadError: string | null;
  syncStatus: { isSyncing: boolean; lastSync: string; error: string | null };
  fetchLatestData: () => Promise<void>;
  triggerSync: () => Promise<void>;
  addCandidate: (candidate: Candidate) => void;
  updateCandidate: (id: string, updates: Partial<Candidate>, note?: string) => void;
  updateStage: (id: string, stage: Stage, status: string, note?: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateCallStatus: (candidateId: string, eventId: string | null, status: 'Completed' | 'Scheduled' | 'Pending' | 'Missed', reason?: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  toasts: ToastState[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const HiringContext = createContext<HiringContextType | undefined>(undefined);

const STORAGE_KEY_REAL_CANDIDATES = 'sprix_prod_candidates';
const STORAGE_KEY_REAL_EVENTS = 'sprix_prod_calendar_events';
const STORAGE_KEY_SETTINGS = 'sprix_prod_settings';

export function HiringProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sprix_authenticated') === 'true';
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [syncStatus, setSyncStatus] = useState<{
    isSyncing: boolean;
    lastSync: string;
    error: string | null;
  }>({
    isSyncing: false,
    lastSync: 'Not synced',
    error: null,
  });

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch real data from backend API
  const fetchLatestData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/candidates', { cache: 'no-store' });
      const data = await res.json();

      if (data.success && Array.isArray(data.candidates)) {
        setCandidates(data.candidates);
        setCalendarEvents(data.calendar || []);
        setSyncStatus({
          isSyncing: false,
          lastSync: data.lastSyncTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          error: null,
        });
        localStorage.setItem(STORAGE_KEY_REAL_CANDIDATES, JSON.stringify(data.candidates));
        localStorage.setItem(STORAGE_KEY_REAL_EVENTS, JSON.stringify(data.calendar || []));
      } else if (data.unconfigured) {
        // Not connected to Google Sheets yet: read local real records if any exist
        const saved = localStorage.getItem(STORAGE_KEY_REAL_CANDIDATES);
        const savedEvents = localStorage.getItem(STORAGE_KEY_REAL_EVENTS);
        if (saved) {
          setCandidates(JSON.parse(saved));
        } else {
          setCandidates([]);
        }
        if (savedEvents) {
          setCalendarEvents(JSON.parse(savedEvents));
        } else {
          setCalendarEvents([]);
        }
      } else {
        throw new Error(data.error || 'Unable to load candidate data');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load candidate data';
      setLoadError(msg);
      // Fallback only to previously saved real records in local cache, never fake data
      try {
        const saved = localStorage.getItem(STORAGE_KEY_REAL_CANDIDATES);
        if (saved) setCandidates(JSON.parse(saved));
      } catch {}
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialization
  useEffect(() => {
    // Check saved settings
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch {}

    // Check server authentication
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {});

    fetchLatestData();
  }, [fetchLatestData]);

  // Persist real candidates
  const persistCandidates = useCallback((newCandidates: Candidate[]) => {
    setCandidates(newCandidates);
    try {
      localStorage.setItem(STORAGE_KEY_REAL_CANDIDATES, JSON.stringify(newCandidates));
    } catch {}
  }, []);

  const persistEvents = useCallback((newEvents: CalendarEvent[]) => {
    setCalendarEvents(newEvents);
    try {
      localStorage.setItem(STORAGE_KEY_REAL_EVENTS, JSON.stringify(newEvents));
    } catch {}
  }, []);

  // Trigger sync with live Google Sheets
  const triggerSync = async () => {
    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl: settings.appsScriptUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to sync with Google Sheets');
      }

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncStatus({ isSyncing: false, lastSync: now, error: null });

      if (data.data && Array.isArray(data.data.candidates)) {
        persistCandidates(data.data.candidates);
        if (data.data.calendar) persistEvents(data.data.calendar);
      } else {
        await fetchLatestData();
      }

      showToast('Google Sheets synchronized successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Synchronization failed';
      setSyncStatus((prev) => ({ ...prev, isSyncing: false, error: msg }));
      showToast(msg, 'error');
    }
  };

  // Manually add candidate
  const addCandidate = useCallback(
    async (candidate: Candidate) => {
      const updated = [candidate, ...candidates];
      persistCandidates(updated);
      showToast(`Added candidate ${candidate.name}`, 'success');

      // Post to Google Apps Script if connected
      fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_CANDIDATE', candidate }),
      }).catch(() => {});
    },
    [candidates, persistCandidates, showToast]
  );

  // Update candidate fields
  const updateCandidate = useCallback(
    (id: string, updates: Partial<Candidate>, note?: string) => {
      const now = new Date().toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      setCandidates((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== id) return c;
          const newNotes = [...(c.adminNotes || [])];
          if (note) {
            newNotes.unshift({
              id: Math.random().toString(36).substring(2, 9),
              timestamp: now,
              author: 'Admin',
              note,
            });
          }
          return {
            ...c,
            ...updates,
            lastUpdated: now,
            adminNotes: newNotes,
          };
        });

        persistCandidates(updated);
        setSelectedCandidate((curr) => (curr && curr.id === id ? { ...curr, ...updates, lastUpdated: now } : curr));
        return updated;
      });

      showToast('Candidate updated successfully', 'success');

      // Send update to Google Apps Script
      fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CANDIDATE',
          candidateId: id,
          updates: {
            currentStatus: updates.currentStatus,
            finalScore: updates.finalScore,
            joiningDate: updates.joiningDate,
            role: updates.role,
            callReason: updates.callReason,
            callStatus: updates.callStatus,
            notes: note,
          },
        }),
      }).catch(() => {});
    },
    [persistCandidates, showToast]
  );

  // Update stage in 3-round architecture
  const updateStage = useCallback(
    (id: string, stage: Stage, status: string, note?: string) => {
      updateCandidate(id, { currentStage: stage, currentStatus: status }, note);
    },
    [updateCandidate]
  );

  // Add Calendar Event
  const addCalendarEvent = useCallback(
    (eventData: Omit<CalendarEvent, 'id'>) => {
      const newEvent: CalendarEvent = {
        id: `evt-${Date.now()}`,
        ...eventData,
      };

      const updated = [newEvent, ...calendarEvents];
      persistEvents(updated);
      showToast('Activity scheduled on calendar', 'success');

      fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_CALENDAR_EVENT', event: newEvent }),
      }).catch(() => {});
    },
    [calendarEvents, persistEvents, showToast]
  );

  // Update Call status and reason for Today's Dashboard
  const updateCallStatus = useCallback(
    (
      candidateId: string,
      eventId: string | null,
      callStatus: 'Completed' | 'Scheduled' | 'Pending' | 'Missed',
      reason?: string
    ) => {
      // Update candidate record
      updateCandidate(candidateId, {
        callStatus,
        ...(reason ? { callReason: reason } : {}),
      });

      // Update calendar event if matched
      if (eventId) {
        setCalendarEvents((prev) => {
          const updated = prev.map((e) =>
            e.id === eventId
              ? { ...e, status: callStatus, ...(reason ? { reason } : {}) }
              : e
          );
          persistEvents(updated);
          return updated;
        });

        fetch('/api/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE_CALL_STATUS',
            eventId,
            status: callStatus,
            reason,
          }),
        }).catch(() => {});
      }

      showToast(`Call status updated to ${callStatus}`, 'info');
    },
    [updateCandidate, persistEvents, showToast]
  );

  // Update Settings
  const updateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        try {
          localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      showToast('Settings saved successfully', 'success');
    },
    [showToast]
  );

  return (
    <HiringContext.Provider
      value={{
        candidates,
        calendarEvents,
        settings,
        activeTab,
        setActiveTab,
        selectedCandidate,
        setSelectedCandidate,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        selectedDate,
        setSelectedDate,
        isLoading,
        loadError,
        syncStatus,
        fetchLatestData,
        triggerSync,
        addCandidate,
        updateCandidate,
        updateStage,
        addCalendarEvent,
        updateCallStatus,
        updateSettings,
        toasts,
        showToast,
        removeToast,
        isAuthenticated,
        setIsAuthenticated,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </HiringContext.Provider>
  );
}

export function useHiring() {
  const context = useContext(HiringContext);
  if (!context) {
    throw new Error('useHiring must be used within a HiringProvider');
  }
  return context;
}
