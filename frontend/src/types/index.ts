export type EventType = 'busy' | 'interview' | 'lunch' | 'ooo' | 'focus';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: EventType;
  description?: string;
  isFree?: boolean;
}

export interface WorkingHours {
  start: string;
  end: string;
}

export interface PanelMember {
  id: string;
  name: string;
  email: string;
  provider?: 'google' | 'microsoft' | 'slack' | 'demo';
  role: string;
  department: string;
  avatar: string;
  skills: string[];
  timezone: string;
  workingHours: WorkingHours;
  eventsByDate: Record<string, CalendarEvent[]>;
}

export interface TimeInterval {
  startMinutes: number;
  endMinutes: number;
}

export interface FormattedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  panelMemberIds: string[];
  isOptimal?: boolean;
}

export type CandidateStage = 
  | 'Screening' 
  | 'Technical Round 1' 
  | 'Technical Round 2' 
  | 'System Design' 
  | 'Cultural & Leadership' 
  | 'Offer Evaluation';

export interface CandidateExperienceRecord {
  title: string;
  company: string;
  period: string;
  bullets: string[];
}

export interface CandidateProjectRecord {
  title: string;
  organization: string;
  period: string;
  bullets: string[];
}

export interface CandidateEducationRecord {
  degree: string;
  institution: string;
  period: string;
  score?: string;
}

export interface CandidateCertification {
  title: string;
  issuer?: string;
  date?: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  experienceYears: number;
  currentStage: CandidateStage;
  skills: string[];
  avatar?: string;
  appliedDate: string;
  atsScore?: number;
  resumeFileName?: string;
  resumeText?: string;
  summary?: string;
  experienceRecords?: CandidateExperienceRecord[];
  projectRecords?: CandidateProjectRecord[];
  educationRecords?: CandidateEducationRecord[];
  certifications?: CandidateCertification[];
  achievements?: string[];
  outliers?: Array<{ title: string; content: string }>;
  generatedQuestions?: any[];
}


export type InterviewStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type InterviewDeliveryMode = 'in-person' | 'google-meet' | 'teams-meeting' | 'google_meet' | 'teams_meeting' | 'offline';

export interface ScheduledInterview {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateRole: string;
  candidateAtsScore?: number;
  interviewType: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  location: string;
  buildingFloor?: string;
  deliveryMode?: InterviewDeliveryMode;
  meetUrl?: string;
  googleCalendarLink?: string;
  externalEventId?: string;
  provider?: 'google' | 'microsoft' | 'slack' | 'demo';
  panelMembers: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
  }[];
  status: InterviewStatus;
  agenda?: string;
  createdAt: string;
}

export interface MicrosoftGraphConfig {
  isMockMode: boolean;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  authStatus: 'connected' | 'disconnected' | 'mocked';
  lastSyncedAt?: string;
  connected?: boolean;
}

export interface GoogleCalendarConfig {
  isMockMode: boolean;
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
  connectedEmail?: string;
  authStatus: 'connected' | 'disconnected' | 'mocked';
  autoCreateMeet?: boolean;
  scopes?: string[];
  lastSyncedAt?: string;
  userEmail?: string;
  calendarId?: string;
  connected?: boolean;
}

export interface SlackConfig {
  webhookUrl?: string;
  botToken?: string;
  channel?: string;
  notifyOnSchedule: boolean;
  notifyOnCancel: boolean;
  connected?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  provider: 'google' | 'microsoft' | 'slack' | 'demo';
  avatar?: string;
  accessToken?: string;
}

