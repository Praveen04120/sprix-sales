import { Candidate, CalendarEvent, GoogleFormConfig, AppSettings } from '@/types';

export const initialSettings: AppSettings = {
  googleFormId: '',
  googleFormUrl: '',
  googleSheetId: '',
  googleSheetUrl: '',
  appsScriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL || '',
  lastSyncTime: null,
};

export const initialGoogleFormConfig: GoogleFormConfig = {
  formId: '',
  formName: 'Sprix Inside Sales Application',
  formUrl: '',
  responseSheetName: 'Candidates',
  responseCount: 0,
  lastSync: 'Not synced yet',
  fields: [],
};

// Production dataset: starts empty and populates strictly with real Google Sheets / Form data
export const initialCandidates: Candidate[] = [];

// Production calendar events: populated strictly with real scheduled hiring activities
export const initialCalendarEvents: CalendarEvent[] = [];
