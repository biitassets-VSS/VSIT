export interface TypingTestResult {
  id: string;
  profile_id: string;
  wpm: number;
  accuracy: number;
  errors: number;
  total_words: number;
  duration_minutes: number;
  created_at: string;
}

export interface DemoAssignment {
  id: string;
  profile_id: string;
  title: string;
  instructions: string;
  meeting_link?: string;
  scheduled_at?: string;
  status: 'Locked' | 'Active' | 'Submitted' | 'Under Review' | 'Completed';
  submission_url?: string;
  hr_review_notes?: string;
}

export interface ApplicantState {
  whatsapp_number: string;
  profile_completion_pct: number;
  academic_records: any[];
  professional_records: any[];
  work_history: any[];
  resume_url: string | null;
}