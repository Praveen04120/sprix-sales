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
import {
  safeString,
  safeLower,
  normalizeCandidate,
  normalizeCalendarEvent,
} from '@/lib/normalize';

interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface HiringContextType {
  candidates: Candidate[];
  calendarEvents: CalendarEvent[];
  settings: AppSettings;
  isSupabaseConnected: boolean;
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
  fetchLatestData: (overrideUrl?: string, overrideSheetId?: string) => Promise<void>;
  triggerSync: () => Promise<void>;
  addCandidate: (candidate: Candidate) => Promise<void>;
  updateCandidate: (id: string, updates: Partial<Candidate>, note?: string) => void;
  updateStage: (id: string, stage: Stage, status: string, note?: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateCallStatus: (candidateId: string, eventId: string | null, status: 'Completed' | 'Scheduled' | 'Pending' | 'Missed', reason?: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
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
 * Merge candidate lists stably without producing duplicates or crashing on non-string types.
 */
function mergeCandidateRecords(existing: Candidate[], incoming: Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>();

  for (let i = 0; i < existing.length; i++) {
    const c = normalizeCandidate(existing[i], i);
    const key = safeLower(c.id) || safeLower(c.email);
    if (key) map.set(key, c);
  }

  for (let j = 0; j < incoming.length; j++) {
    const inc = normalizeCandidate(incoming[j], existing.length + j);
    const key = safeLower(inc.id) || safeLower(inc.email);
    if (!key) continue;

    const prev = map.get(key);
    if (prev) {
      const noteMap = new Map<string, AdminNote>();
      (prev.adminNotes || []).forEach((n) => {
        const nKey = safeString(n.id) || safeString(n.note);
        if (nKey) noteMap.set(nKey, n);
      });
      (inc.adminNotes || []).forEach((n) => {
        const nKey = safeString(n.id) || safeString(n.note);
        if (nKey) noteMap.set(nKey, n);
      });

      map.set(key, {
        ...prev,
        ...inc,
        currentStatus: inc.currentStatus || prev.currentStatus,
        currentStage: inc.currentStage || prev.currentStage,
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
  for (let i = 0; i < existing.length; i++) {
    const e = normalizeCalendarEvent(existing[i], i);
    if (e.id) map.set(safeString(e.id), e);
  }
  for (let j = 0; j < incoming.length; j++) {
    const inc = normalizeCalendarEvent(incoming[j], existing.length + j);
    if (inc.id) {
      const existingEvt = map.get(safeString(inc.id));
      map.set(safeString(inc.id), existingEvt ? { ...existingEvt, ...inc } : inc);
    }
  }
  return Array.from(map.values());
}

export function HiringProvider({ children }: { children: React.ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
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

  const persistCandidates = useCallback((newCandidates: Candidate[]) => {
    const normalized = newCandidates.map((c, idx) => normalizeCandidate(c, idx));
    setCandidates(normalized);
    try {
      localStorage.setItem(STORAGE_KEY_REAL_CANDIDATES, JSON.stringify(normalized));
    } catch {}
  }, []);

  const persistEvents = useCallback((newEvents: CalendarEvent[]) => {
    const normalized = newEvents.map((e, idx) => normalizeCalendarEvent(e, idx));
    setCalendarEvents(normalized);
    try {
      localStorage.setItem(STORAGE_KEY_REAL_EVENTS, JSON.stringify(normalized));
    } catch {}
  }, []);

  // Fetch real data from backend API (Supabase primary, Google Sheets secondary)
  const fetchLatestData = useCallback(async (overrideUrl?: string, overrideSheetId?: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      let activeUrl = safeString(overrideUrl) || safeString(settings.appsScriptUrl);
      let activeSheetId = safeString(overrideSheetId) || safeString(settings.googleSheetId);

      const searchParams = new URLSearchParams();
      if (activeUrl) searchParams.set('appsScriptUrl', activeUrl);
      if (activeSheetId) searchParams.set('sheetId', activeSheetId);
      const queryUrl = searchParams.toString() ? `/api/candidates?${searchParams.toString()}` : '/api/candidates';

      const res = await fetch(queryUrl, {
        cache: 'no-store',
        headers: {
          ...(activeUrl ? { 'x-apps-script-url': activeUrl } : {}),
          ...(activeSheetId ? { 'x-sheet-id': activeSheetId } : {}),
        },
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.candidates)) {
        const rawIncomingCand = data.candidates.map((c: any, idx: number) => normalizeCandidate(c, idx));
        const rawIncomingEvt = (data.calendar || []).map((e: any, idx: number) => normalizeCalendarEvent(e, idx));

        // If data loaded from Supabase or Google Sheets
        if (data.source === 'supabase') {
          // Supabase is authoritative
          persistCandidates(rawIncomingCand);
          persistEvents(rawIncomingEvt);
        } else {
          // Merge with current state
          const mergedCand = mergeCandidateRecords(candidates, rawIncomingCand);
          const mergedEvt = mergeEventRecords(calendarEvents, rawIncomingEvt);
          persistCandidates(mergedCand);
          persistEvents(mergedEvt);
        }

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
          let localCands: Candidate[] = [];
          let localEvts: CalendarEvent[] = [];

          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                localCands = parsed.map((c, idx) => normalizeCandidate(c, idx));
                setCandidates(localCands);
              }
            } catch {}
          }
          if (savedEvents) {
            try {
              const parsedEvts = JSON.parse(savedEvents);
              if (Array.isArray(parsedEvts) && parsedEvts.length > 0) {
                localEvts = parsedEvts.map((e, idx) => normalizeCalendarEvent(e, idx));
                setCalendarEvents(localEvts);
              }
            } catch {}
          }

          // Auto-migrate local records to Supabase so they are immediately available across all recruiter devices
          if (localCands.length > 0 || localEvts.length > 0) {
            fetch('/api/candidates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'BULK_IMPORT',
                candidates: localCands,
                calendar: localEvts,
              }),
            }).catch(() => {});
          }
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
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setCandidates(parsed.map((c, idx) => normalizeCandidate(c, idx)));
            }
          }
        } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  }, [candidates, calendarEvents, settings.appsScriptUrl, settings.googleSheetId, persistCandidates, persistEvents]);

  // Initialization: Load Shared Settings from Supabase Backend (Multi-Device Sync)
  useEffect(() => {
    async function initPlatform() {
      // 1. Fetch shared settings from Supabase backend
      let activeUrl = '';
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
          setIsSupabaseConnected(Boolean(data.isSupabaseConnected));
          activeUrl = safeString(data.settings.appsScriptUrl);
          try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(data.settings));
          } catch {}
        }
      } catch {
        // Fallback to local cache if network drops
        try {
          const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setSettings(parsed);
            if (parsed.appsScriptUrl) activeUrl = safeString(parsed.appsScriptUrl);
          }
        } catch {}
      }

      // 2. Check server session cookie
      fetch('/api/auth/session')
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) {
            setIsAuthenticated(true);
          }
        })
        .catch(() => {});

      // 3. Load persistent candidate records
      fetchLatestData(activeUrl);
    }

    initPlatform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger sync with live Google Sheets (Strictly READ-ONLY on Google Sheet)
  const triggerSync = async () => {
    const targetUrl = safeString(settings.appsScriptUrl);
    const targetSheetId = safeString(settings.googleSheetId);
    if (!targetUrl) {
      showToast('Please configure your Google Apps Script URL in Settings first.', 'error');
      return;
    }

    setSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          appsScriptUrl: targetUrl,
          sheetId: targetSheetId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to sync with Google Sheets');
      }

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncStatus({ isSyncing: false, lastSync: now, error: null });

      if (data.data && Array.isArray(data.data.candidates)) {
        const incomingCand = data.data.candidates.map((c: any, idx: number) => normalizeCandidate(c, idx));
        const incomingEvt = (data.data.calendar || []).map((e: any, idx: number) => normalizeCalendarEvent(e, idx));

        const mergedCand = mergeCandidateRecords(candidates, incomingCand);
        const mergedEvt = mergeEventRecords(calendarEvents, incomingEvt);
        persistCandidates(mergedCand);
        persistEvents(mergedEvt);
      } else {
        await fetchLatestData(targetUrl, targetSheetId);
      }

      const msg = data.syncedToSupabase
        ? `Synced with Google Sheets and saved to Supabase! Last synced: ${now}`
        : `Synced with Google Sheets. Last synced: ${now}`;
      showToast(msg, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Synchronization failed';
      setSyncStatus((prev) => ({ ...prev, isSyncing: false, error: msg }));
      showToast(msg, 'error');
    }
  };

  // Manually add candidate (Persistent to Supabase)
  const addCandidate = useCallback(
    async (candidate: Candidate) => {
      const normalized = normalizeCandidate(candidate, candidates.length);
      const updated = [normalized, ...candidates];
      persistCandidates(updated);

      try {
        const res = await fetch('/api/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ADD_CANDIDATE',
            candidate: normalized,
            appsScriptUrl: safeString(settings.appsScriptUrl),
            sheetId: safeString(settings.googleSheetId),
          }),
        });
        const result = await res.json();
        if (result.success) {
          if (result.id && result.id !== normalized.id) {
            setCandidates((prev) =>
              prev.map((c) => (c.id === normalized.id ? { ...c, id: safeString(result.id) } : c))
            );
          }
          showToast(`Candidate ${normalized.name} registered and saved persistently`, 'success');
        } else {
          showToast(`Saved locally: ${result.error || 'Database pending'}`, 'info');
        }
      } catch {
        showToast(`Candidate ${normalized.name} saved locally`, 'info');
      }
    },
    [candidates, settings.appsScriptUrl, settings.googleSheetId, persistCandidates, showToast]
  );

  // Update candidate fields (Persistent to Supabase)
  const updateCandidate = useCallback(
    (id: string, updates: Partial<Candidate>, note?: string) => {
      const now = new Date().toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const safeId = safeString(id);

      setCandidates((prev) => {
        const updated = prev.map((c) => {
          if (safeString(c.id) !== safeId) return c;
          const newNotes = [...(c.adminNotes || [])];
          if (note && safeString(note)) {
            newNotes.unshift({
              id: Math.random().toString(36).substring(2, 9),
              timestamp: now,
              author: 'Admin',
              note: safeString(note),
            });
          }
          return normalizeCandidate({
            ...c,
            ...updates,
            lastUpdated: now,
            adminNotes: newNotes,
          });
        });

        persistCandidates(updated);
        setSelectedCandidate((curr) =>
          curr && safeString(curr.id) === safeId ? { ...curr, ...updates, lastUpdated: now } : curr
        );
        return updated;
      });

      showToast('Candidate updated', 'success');

      // Persist to Supabase backend API
      fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CANDIDATE',
          candidateId: safeId,
          updates: {
            currentStatus: updates.currentStatus,
            finalScore: updates.finalScore,
            joiningDate: updates.joiningDate,
            role: updates.role,
            callReason: updates.callReason,
            callStatus: updates.callStatus,
            evaluationFeedback: updates.evaluationFeedback,
            notes: note,
          },
          appsScriptUrl: safeString(settings.appsScriptUrl),
          sheetId: safeString(settings.googleSheetId),
        }),
      }).catch((err) => {
        console.warn('Candidate update persistence warning:', err);
      });
    },
    [settings.appsScriptUrl, settings.googleSheetId, persistCandidates, showToast]
  );

  // Update stage in 3-round architecture
  const updateStage = useCallback(
    (id: string, stage: Stage, status: string, note?: string) => {
      updateCandidate(id, { currentStage: stage, currentStatus: status }, note);
    },
    [updateCandidate]
  );

  // Add Calendar Event (Persistent to Supabase)
  const addCalendarEvent = useCallback(
    async (eventData: Omit<CalendarEvent, 'id'>) => {
      const newEvent: CalendarEvent = normalizeCalendarEvent({
        id: `evt-${Date.now()}`,
        ...eventData,
      });

      const updated = [newEvent, ...calendarEvents];
      persistEvents(updated);
      showToast('Activity scheduled on calendar', 'success');

      fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_CALENDAR_EVENT',
          event: newEvent,
          appsScriptUrl: safeString(settings.appsScriptUrl),
          sheetId: safeString(settings.googleSheetId),
        }),
      }).catch((err) => {
        console.warn('Calendar event persistence warning:', err);
      });
    },
    [calendarEvents, settings.appsScriptUrl, settings.googleSheetId, persistEvents, showToast]
  );

  // Update Call status and reason for Today's Dashboard (Persistent to Supabase)
  const updateCallStatus = useCallback(
    (
      candidateId: string,
      eventId: string | null,
      callStatus: 'Completed' | 'Scheduled' | 'Pending' | 'Missed',
      reason?: string
    ) => {
      updateCandidate(candidateId, {
        callStatus,
        ...(reason ? { callReason: safeString(reason) } : {}),
      });

      if (eventId) {
        const safeEvtId = safeString(eventId);
        setCalendarEvents((prev) => {
          const updated = prev.map((e) =>
            safeString(e.id) === safeEvtId
              ? { ...e, status: callStatus, ...(reason ? { reason: safeString(reason) } : {}) }
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
            eventId: safeEvtId,
            status: callStatus,
            reason: safeString(reason),
            appsScriptUrl: safeString(settings.appsScriptUrl),
            sheetId: safeString(settings.googleSheetId),
          }),
        }).catch(() => {});
      }

      showToast(`Call status updated to ${callStatus}`, 'info');
    },
    [updateCandidate, settings.appsScriptUrl, settings.googleSheetId, persistEvents, showToast]
  );

  // Update Settings: Persists to Supabase for Cross-Device Shared Configuration
  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      const merged: AppSettings = { ...settings, ...newSettings };
      setSettings(merged);

      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(merged));
      } catch {}

      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        });
        const data = await res.json();
        if (data.success) {
          setIsSupabaseConnected(Boolean(data.isSupabaseConnected));
          showToast(data.message || 'Settings saved successfully', 'success');
        } else {
          showToast(`Saved locally: ${data.error || 'Failed to sync with Supabase'}`, 'info');
        }
      } catch (err: unknown) {
        showToast('Settings saved locally', 'info');
      }

      if (newSettings.appsScriptUrl || newSettings.googleSheetId) {
        fetchLatestData(
          safeString(newSettings.appsScriptUrl || settings.appsScriptUrl),
          safeString(newSettings.googleSheetId || settings.googleSheetId)
        );
      }
    },
    [settings, fetchLatestData, showToast]
  );

  return (
    <HiringContext.Provider
      value={{
        candidates,
        calendarEvents,
        settings,
        isSupabaseConnected,
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
