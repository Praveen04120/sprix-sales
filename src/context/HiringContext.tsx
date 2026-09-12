'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Candidate,
  CalendarEvent,
  AppSettings,
  Stage,
  AdminNote,
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
  fetchLatestData: (overrideUrl?: string) => Promise<void>;
  triggerSync: () => Promise<void>;
  addCandidate: (candidate: Candidate) => Promise<void>;
  updateCandidate: (id: string, updates: Partial<Candidate>, note?: string) => void;
  updateStage: (id: string, stage: Stage, status: string, note?: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
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

/**
 * Merge candidate lists stably without producing duplicates.
 * Prioritizes Candidate ID, then Email.
 */
function mergeCandidateRecords(existing: Candidate[], incoming: Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>();

  // Add existing candidates to map
  for (const c of existing) {
    const key = (c.id || c.email || '').trim().toLowerCase();
    if (key) map.set(key, c);
  }

  // Merge incoming candidates from Google Sheets
  for (const inc of incoming) {
    const key = (inc.id || inc.email || '').trim().toLowerCase();
    if (!key) continue;

    const prev = map.get(key);
    if (prev) {
      // Merge admin notes without duplicates
      const noteMap = new Map<string, AdminNote>();
      (prev.adminNotes || []).forEach(n => noteMap.set(n.id || n.note, n));
      (inc.adminNotes || []).forEach(n => noteMap.set(n.id || n.note, n));

      map.set(key, {
        ...prev,
        ...inc,
        // Preserve local overrides if sheet hasn't recorded them yet
        currentStatus: inc.currentStatus || prev.currentStatus,
        finalScore: inc.finalScore !== null && inc.finalScore !== undefined ? inc.finalScore : prev.finalScore,
        adminNotes: Array.from(noteMap.values()),
        formResponses: {
          ...(prev.formResponses || {}),
          ...(inc.formResponses || {}),
        },
      });
    } else {
      map.set(key, inc);
    }
  }

  return Array.from(map.values());
}

/**
 * Merge calendar events stably without duplicates.
 */
function mergeEventRecords(existing: CalendarEvent[], incoming: CalendarEvent[]): CalendarEvent[] {
  const map = new Map<string, CalendarEvent>();
  for (const e of existing) {
    if (e.id) map.set(e.id, e);
  }
  for (const inc of incoming) {
    if (inc.id) {
      map.set(inc.id, { ...(map.get(inc.id) || {}), ...inc });
    }
  }
  return Array.from(map.values());
}

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
    lastSync: 'Not synced yet',
    error: null,
  });

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persist real candidates to memory & local backup
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

  // Fetch real data from backend API with automatic URL discovery
  const fetchLatestData = useCallback(async (overrideUrl?: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      let activeUrl = overrideUrl || settings.appsScriptUrl;
      if (!activeUrl && typeof window !== 'undefined') {
        try {
          const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            if (parsed.appsScriptUrl) activeUrl = parsed.appsScriptUrl;
          }
        } catch {}
      }

      const queryUrl = activeUrl
        ? `/api/candidates?appsScriptUrl=${encodeURIComponent(activeUrl.trim())}`
        : '/api/candidates';

      const res = await fetch(queryUrl, {
        cache: 'no-store',
        headers: activeUrl ? { 'x-apps-script-url': activeUrl.trim() } : {},
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.candidates)) {
        const mergedCand = mergeCandidateRecords(candidates, data.candidates);
        const mergedEvt = mergeEventRecords(calendarEvents, data.calendar || []);

        persistCandidates(mergedCand);
        persistEvents(mergedEvt);

        const syncTime = data.lastSyncTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setSyncStatus({
          isSyncing: false,
          lastSync: syncTime,
          error: null,
        });
      } else if (data.unconfigured) {
        // Read local backup records if available; never show mock data
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem(STORAGE_KEY_REAL_CANDIDATES);
          const savedEvents = localStorage.getItem(STORAGE_KEY_REAL_EVENTS);
          if (saved) setCandidates(JSON.parse(saved));
          if (savedEvents) setCalendarEvents(JSON.parse(savedEvents));
        }
      } else {
        throw new Error(data.error || 'Unable to load candidate data');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load candidate data';
      setLoadError(msg);
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem(STORAGE_KEY_REAL_CANDIDATES);
          if (saved) setCandidates(JSON.parse(saved));
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  }, [candidates, calendarEvents, settings.appsScriptUrl, persistCandidates, persistEvents]);

  // Initialization
  useEffect(() => {
    let initialUrl = '';
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        if (parsed.appsScriptUrl) initialUrl = parsed.appsScriptUrl;
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

    fetchLatestData(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger sync with live Google Sheets
  const triggerSync = async () => {
    const targetUrl = (settings.appsScriptUrl || '').trim();
    if (!targetUrl) {
      showToast('Please configure your Google Apps Script URL in Settings first.', 'error');
      return;
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appsScriptUrl: targetUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to sync with Google Sheets');
      }

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncStatus({ isSyncing: false, lastSync: now, error: null });

      if (data.data && Array.isArray(data.data.candidates)) {
        const mergedCand = mergeCandidateRecords(candidates, data.data.candidates);
        const mergedEvt = mergeEventRecords(calendarEvents, data.data.calendar || []);
        persistCandidates(mergedCand);
        persistEvents(mergedEvt);
      } else {
        await fetchLatestData(targetUrl);
      }

      showToast(`Google Sheets synced successfully. Last synced: ${now}`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Synchronization failed';
      setSyncStatus((prev) => ({ ...prev, isSyncing: false, error: msg }));
      showToast(msg, 'error');
    }
  };

  // Manually add candidate (saved to Google Sheets immediately)
  const addCandidate = useCallback(
    async (candidate: Candidate) => {
      const updated = [candidate, ...candidates];
      persistCandidates(updated);
      showToast(`Candidate ${candidate.name} added`, 'success');

      // Post to Google Apps Script
      const activeUrl = settings.appsScriptUrl.trim();
      if (activeUrl) {
        try {
          const res = await fetch('/api/candidates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ADD_CANDIDATE',
              candidate,
              appsScriptUrl: activeUrl,
            }),
          });
          const result = await res.json();
          if (result.success && result.id) {
            // Update candidate ID if assigned by sheet
            setCandidates((prev) =>
              prev.map((c) => (c.id === candidate.id ? { ...c, id: result.id } : c))
            );
          }
        } catch {
          showToast('Failed to write candidate to Google Sheets directly. Local record retained.', 'info');
        }
      }
    },
    [candidates, settings.appsScriptUrl, persistCandidates, showToast]
  );

  // Update candidate fields (persisted to Google Sheets)
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
        setSelectedCandidate((curr) =>
          curr && curr.id === id ? { ...curr, ...updates, lastUpdated: now } : curr
        );
        return updated;
      });

      showToast('Candidate updated successfully', 'success');

      // Send update to Google Apps Script
      const activeUrl = settings.appsScriptUrl.trim();
      if (activeUrl) {
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
            appsScriptUrl: activeUrl,
          }),
        }).catch(() => {});
      }
    },
    [settings.appsScriptUrl, persistCandidates, showToast]
  );

  // Update stage in 3-round architecture
  const updateStage = useCallback(
    (id: string, stage: Stage, status: string, note?: string) => {
      updateCandidate(id, { currentStage: stage, currentStatus: status }, note);
    },
    [updateCandidate]
  );

  // Add Calendar Event (persisted to Google Sheets)
  const addCalendarEvent = useCallback(
    async (eventData: Omit<CalendarEvent, 'id'>) => {
      const newEvent: CalendarEvent = {
        id: `evt-${Date.now()}`,
        ...eventData,
      };

      const updated = [newEvent, ...calendarEvents];
      persistEvents(updated);
      showToast('Activity scheduled on calendar', 'success');

      const activeUrl = settings.appsScriptUrl.trim();
      if (activeUrl) {
        fetch('/api/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ADD_CALENDAR_EVENT',
            event: newEvent,
            appsScriptUrl: activeUrl,
          }),
        }).catch(() => {});
      }
    },
    [calendarEvents, settings.appsScriptUrl, persistEvents, showToast]
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

        const activeUrl = settings.appsScriptUrl.trim();
        if (activeUrl) {
          fetch('/api/candidates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'UPDATE_CALL_STATUS',
              eventId,
              status: callStatus,
              reason,
              appsScriptUrl: activeUrl,
            }),
          }).catch(() => {});
        }
      }

      showToast(`Call status updated to ${callStatus}`, 'info');
    },
    [updateCandidate, settings.appsScriptUrl, persistEvents, showToast]
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

      if (newSettings.appsScriptUrl) {
        fetchLatestData(newSettings.appsScriptUrl);
      }

      showToast('Settings saved successfully', 'success');
    },
    [fetchLatestData, showToast]
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
