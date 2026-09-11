export type Stage =
  | 'ROUND_1'
  | 'ROUND_2'
  | 'ROUND_3'
  | 'SELECTED'
  | 'REJECTED'
  | 'WORKING';

export type CandidateStatus =
  | 'New'
  | 'Round 1'
  | 'Round 2'
  | 'Round 3'
  | 'Shortlisted'
  | 'Selected'
  | 'Rejected'
  | 'Working';

export interface AdminNote {
  id: string;
  timestamp: string;
  author: string;
  note: string;
}

export interface StageHistoryItem {
  stage: Stage;
  status: string;
  timestamp: string;
  notes?: string;
}

export interface Candidate {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  applicationDate: string;
  lastUpdated: string;
  currentStage: Stage;
  currentStatus: CandidateStatus | string;
  joiningDate?: string;
  role?: string;
  finalScore?: number | null; // 0 to 10
  // Dynamic Google Form responses (Original Application Data)
  formResponses: Record<string, string>;
  // Interview / Call details (Round 2)
  interviewDate?: string;
  interviewTime?: string;
  callReason?: string;
  callStatus?: 'Scheduled' | 'Completed' | 'Pending' | 'Missed';
  interviewNotes?: string;
  // Training & Evaluation details (Round 3)
  trainingStartDate?: string;
  trainingEndDate?: string;
  daysCompleted?: number;
  evaluationFeedback?: string;
  adminNotes?: AdminNote[];
  history?: StageHistoryItem[];
}

export interface CalendarEvent {
  id: string;
  candidateId: string;
  candidateName: string;
  type: 'INTERVIEW' | 'TRAINING' | 'FINAL_EVALUATION' | 'CALL' | 'MEETING';
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  startTime?: string; // HH:MM
  endTime?: string;
  reason?: string;
  notes?: string;
  status?: 'Scheduled' | 'Completed' | 'Pending' | 'Missed' | 'Cancelled';
}

export interface AppSettings {
  googleFormId: string;
  googleFormUrl: string;
  googleSheetId: string;
  googleSheetUrl: string;
  appsScriptUrl: string;
  lastSyncTime: string | null;
}

export interface GoogleFormConfig {
  formId: string;
  formName: string;
  formUrl: string;
  responseSheetName: string;
  responseCount: number;
  lastSync: string;
  fields: Array<{
    id: string;
    label: string;
    type: string;
  }>;
}
