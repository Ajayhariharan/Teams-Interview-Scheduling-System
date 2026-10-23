import type { Candidate, CandidateStage, GoogleCalendarConfig, MicrosoftGraphConfig, PanelMember, ScheduledInterview } from '../types';

const DEFAULT_PANEL_MEMBERS: PanelMember[] = [];

const DEFAULT_CANDIDATES: Candidate[] = [
  {
    id: 'cand-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 234-5678',
    position: 'Software Developer',
    department: 'Web Platforms',
    experienceYears: 4,
    currentStage: 'Technical Round 1',
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'Tailwind CSS'],
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    appliedDate: '2026-09-10',
    atsScore: 92.4,
  },
  {
    id: 'cand-2',
    name: 'Emily Watson',
    email: 'emily.watson@example.com',
    phone: '+1 (555) 345-6789',
    position: 'Staff Backend Engineer',
    department: 'Core Infrastructure',
    experienceYears: 8,
    currentStage: 'System Design',
    skills: ['Go', 'Kafka', 'PostgreSQL', 'Distributed Systems', 'gRPC'],
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    appliedDate: '2026-09-08',
    atsScore: 96.8,
  },
];

const DEFAULT_SCHEDULED_INTERVIEWS: ScheduledInterview[] = [
  {
    id: 'interview-init-1',
    candidateId: 'cand-2',
    candidateName: 'Emily Watson',
    candidateEmail: 'emily.watson@example.com',
    candidateRole: 'Staff Backend Engineer',
    candidateAtsScore: 96.8,
    interviewType: 'System Design Deep Dive',
    date: '2026-09-19',
    startTime: '02:00 PM',
    endTime: '03:00 PM',
    durationMinutes: 60,
    deliveryMode: 'google-meet',
    meetUrl: 'https://meet.google.com/wat-son-sys',
    location: 'Google Meet Video Call',
    buildingFloor: 'Google Cloud Meet',
    panelMembers: [
      {
        id: 'panel-2',
        name: 'Priya Sharma',
        email: 'priya.sharma@sample.org',
        role: 'Staff Backend & Cloud Engineer',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      },
      {
        id: 'panel-3',
        name: 'Karthik Raj',
        email: 'karthik.raj@sample.org',
        role: 'Principal Solutions Architect',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
    ],
    status: 'scheduled',
    agenda: 'Evaluation of high-throughput distributed event streaming architecture and whiteboard system design.',
    createdAt: '2026-09-15T14:30:00Z',
  },
  {
    id: 'interview-init-2',
    candidateId: 'cand-1',
    candidateName: 'John Doe',
    candidateEmail: 'john.doe@example.com',
    candidateRole: 'Software Developer',
    candidateAtsScore: 92.4,
    interviewType: 'Frontend Architecture & Coding',
    date: '2026-09-18',
    startTime: '10:30 AM',
    endTime: '11:30 AM',
    durationMinutes: 60,
    deliveryMode: 'google-meet',
    meetUrl: 'https://meet.google.com/doe-tech-one',
    location: 'Google Meet Video Call',
    buildingFloor: 'Google Cloud Meet',
    panelMembers: [
      {
        id: 'panel-1',
        name: 'Arun Kumar',
        email: 'arun.kumar@sample.org',
        role: 'Principal Frontend Architect',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      {
        id: 'panel-3',
        name: 'Karthik Raj',
        email: 'karthik.raj@sample.org',
        role: 'Principal Solutions Architect',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
    ],
    status: 'scheduled',
    agenda: 'Deep dive on React concurrency, TypeScript state patterns, and interactive canvas components.',
    createdAt: '2026-09-16T09:00:00Z',
  },
];

const STORAGE_KEYS = {
  PANEL_MEMBERS: 'ips_panel_members_v2',
  CANDIDATES: 'ips_candidates_v3',
  INTERVIEWS: 'ips_interviews_v5',
  GRAPH_CONFIG: 'ips_graph_config_v2',
  GOOGLE_CONFIG: 'ips_google_config_v2',
};

export class CalendarService {
  private static getPanelStorageKey(provider?: string): string {
    return provider ? `ips_panel_members_${provider}_v3` : 'ips_panel_members_v3';
  }

  public static getPanelMembers(provider?: string): PanelMember[] {
    const key = this.getPanelStorageKey(provider);
    const data = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEYS.PANEL_MEMBERS);
    if (!data) {
      return DEFAULT_PANEL_MEMBERS;
    }
    try {
      const parsed: PanelMember[] = JSON.parse(data);
      // Clean out any legacy mock sample members (e.g. panel-1, panel-2, etc.)
      const realOnly = parsed.filter(
        (m) => !m.id.startsWith('panel-') && m.email && m.email.includes('@')
      );
      if (provider) {
        return realOnly.filter((m) => !m.provider || m.provider === provider);
      }
      return realOnly;
    } catch {
      return DEFAULT_PANEL_MEMBERS;
    }
  }

  public static async fetchPanelMembersFromDb(provider?: string): Promise<PanelMember[]> {
    try {
      const url = provider
        ? `http://localhost:8000/api/panel-members?provider=${encodeURIComponent(provider)}`
        : 'http://localhost:8000/api/panel-members';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const members: PanelMember[] = data.panelMembers || [];
        const key = this.getPanelStorageKey(provider);
        localStorage.setItem(key, JSON.stringify(members));
        return members;
      }
    } catch (err) {
      console.warn('Could not fetch panel members from backend DB:', err);
    }
    return this.getPanelMembers(provider);
  }

  public static async savePanelMemberToDb(member: PanelMember, provider?: string): Promise<void> {
    try {
      const prov = provider || member.provider || 'google';
      await fetch(`http://localhost:8000/api/panel-members?provider=${encodeURIComponent(prov)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...member, provider: prov }),
      });
    } catch (err) {
      console.warn('Could not save panel member to DB:', err);
    }
  }

  public static async deletePanelMemberFromDb(memberId: string, provider?: string): Promise<void> {
    try {
      const url = provider
        ? `http://localhost:8000/api/panel-members/${encodeURIComponent(memberId)}?provider=${encodeURIComponent(provider)}`
        : `http://localhost:8000/api/panel-members/${encodeURIComponent(memberId)}`;
      await fetch(url, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Could not delete panel member from DB:', err);
    }
  }

  public static async syncPanelMembersToDb(members: PanelMember[], provider?: string): Promise<void> {
    try {
      const url = provider
        ? `http://localhost:8000/api/panel-members/sync?provider=${encodeURIComponent(provider)}`
        : 'http://localhost:8000/api/panel-members/sync';
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(members),
      });
    } catch (err) {
      console.warn('Could not sync panel members to DB:', err);
    }
  }

  public static savePanelMembers(members: PanelMember[], provider?: string) {
    const key = this.getPanelStorageKey(provider);
    localStorage.setItem(key, JSON.stringify(members));
    localStorage.setItem(STORAGE_KEYS.PANEL_MEMBERS, JSON.stringify(members));
    // Asynchronously sync to backend SQLite database
    this.syncPanelMembersToDb(members, provider).catch(() => {});
  }

  public static async fetchAccountProfile(
    email: string,
    token?: string
  ): Promise<{ name: string; email: string; avatar: string; department: string; role?: string; jobTitle?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`http://localhost:8000/auth/lookup?email=${encodeURIComponent(cleanEmail)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        let finalName = data.name || '';
        let finalRole = data.role || data.jobTitle || '';

        // If name has a designation attached (e.g. "ALEX M - TECHNICAL LEAD")
        if (finalName.includes(' - ') || finalName.includes(' – ') || finalName.includes(' — ') || finalName.includes(' | ')) {
          const parts = finalName.split(/\s+[-–—|]\s+/);
          if (parts.length >= 2) {
            finalName = parts[0].trim();
            if (!finalRole) {
              const extracted = parts.slice(1).join(' - ').trim();
              finalRole = extracted.length > 3 && extracted === extracted.toUpperCase()
                ? extracted.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                : extracted;
            }
          }
        } else if (finalName.includes('(') && finalName.includes(')')) {
          const match = finalName.match(/^(.*?)\s*\((.*?)\)$/);
          if (match) {
            finalName = match[1].trim();
            if (!finalRole) {
              const extracted = match[2].trim();
              finalRole = extracted.length > 3 && extracted === extracted.toUpperCase()
                ? extracted.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                : extracted;
            }
          }
        }

        return {
          ...data,
          name: finalName,
          role: finalRole,
          jobTitle: finalRole,
        };
      }
    } catch (err) {
      console.warn('Account lookup API warning:', err);
    }

    // Fallback format
    const username = cleanEmail.split('@')[0] || 'Panel Member';
    let name = username;
    if (username.includes('.')) {
      name = username.split('.').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    } else if (username.length > 3 && username[username.length - 1].match(/[a-z]/i)) {
      name = `${username.slice(0, -1).charAt(0).toUpperCase() + username.slice(1, -1)} ${username.slice(-1).toUpperCase()}`;
    } else {
      name = username.charAt(0).toUpperCase() + username.slice(1);
    }

    return {
      email: cleanEmail,
      name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=256&bold=true`,
      department: '',
      role: '',
      jobTitle: '',
    };
  }


  public static getCandidates(): Candidate[] {
    const data = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(DEFAULT_CANDIDATES));
      return DEFAULT_CANDIDATES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_CANDIDATES;
    }
  }

  public static async fetchCandidatesFromDb(): Promise<Candidate[]> {
    try {
      const res = await fetch('http://localhost:8000/api/ats/candidates');
      if (res.ok) {
        const data = await res.json();
        const cands: Candidate[] = data.candidates || [];
        if (cands.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(cands));
          return cands;
        }
      }
    } catch (err) {
      console.warn('Could not fetch candidates from backend DB:', err);
    }
    return this.getCandidates();
  }

  public static saveCandidates(candidates: Candidate[]) {
    localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(candidates));
  }

  public static async addCandidateToDb(candidate: Candidate): Promise<void> {
    try {
      await fetch('http://localhost:8000/api/ats/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate),
      });
    } catch (err) {
      console.warn('Could not save candidate to DB:', err);
    }
  }

  public static async deleteCandidateFromDb(candidateId: string): Promise<void> {
    try {
      await fetch(`http://localhost:8000/api/ats/candidates/${encodeURIComponent(candidateId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Could not delete candidate from DB:', err);
    }
  }

  public static async parseResumePreview(
    file: File,
    targetRole: string = 'Senior Full Stack Engineer',
    department: string = 'General Engineering',
    candidateName?: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_role', targetRole);
    formData.append('department', department);
    if (candidateName) {
      formData.append('candidate_name', candidateName);
    }

    const res = await fetch('http://localhost:8000/api/ats/parse-preview', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to parse resume' }));
      throw new Error(err.detail || 'Failed to parse resume');
    }

    return await res.json();
  }

  public static async generateAiQuestions(payload: {
    candidateId?: string;
    candidateName: string;
    role: string;
    skills?: string[];
    experienceYears?: number;
    summary?: string;
    experienceRecords?: any[];
    projectRecords?: any[];
    rawResumeText?: string;
  }): Promise<any> {
    const res = await fetch('http://localhost:8000/api/ats/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to generate questions' }));
      throw new Error(err.detail || 'Failed to generate questions');
    }

    return await res.json();
  }

  public static async fetchCandidateQuestions(candidateId: string): Promise<any> {
    const res = await fetch(`http://localhost:8000/api/ats/candidates/${encodeURIComponent(candidateId)}/questions`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch candidate questions' }));
      throw new Error(err.detail || 'Failed to fetch candidate questions');
    }
    return await res.json();
  }

  public static async saveCandidateQuestionsToDb(candidateId: string, questions: any[]): Promise<void> {
    try {
      await fetch(`http://localhost:8000/api/ats/candidates/${encodeURIComponent(candidateId)}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });
    } catch (err) {
      console.warn('Could not persist updated questions to backend DB:', err);
    }
  }

  public static updateCandidateQuestions(candidateId: string, questions: any[]): Candidate[] {
    const candidates = this.getCandidates();
    const updated = candidates.map((c) =>
      c.id === candidateId ? { ...c, generatedQuestions: questions } : c
    );
    this.saveCandidates(updated);
    this.saveCandidateQuestionsToDb(candidateId, questions).catch(() => {});
    return updated;
  }

  public static updateCandidateStage(candidateId: string, newStage: CandidateStage): Candidate[] {
    const candidates = this.getCandidates();
    const updated = candidates.map((c) => (c.id === candidateId ? { ...c, currentStage: newStage } : c));
    this.saveCandidates(updated);
    // Asynchronously update stage in backend DB
    fetch('http://localhost:8000/api/ats/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, new_stage: newStage }),
    }).catch(() => {});
    return updated;
  }



  private static getInterviewStorageKey(provider?: string): string {
    return provider ? `ips_interviews_${provider}_v5` : STORAGE_KEYS.INTERVIEWS;
  }

  public static getScheduledInterviews(provider?: string): ScheduledInterview[] {
    const key = this.getInterviewStorageKey(provider);
    const data = localStorage.getItem(key) || (provider ? null : localStorage.getItem(STORAGE_KEYS.INTERVIEWS));
    if (!data) {
      if (provider === 'microsoft') {
        return [];
      }
      return DEFAULT_SCHEDULED_INTERVIEWS;
    }
    try {
      const parsed: ScheduledInterview[] = JSON.parse(data);
      if (provider) {
        return parsed.filter((i) => !i.provider || i.provider === provider);
      }
      return parsed;
    } catch {
      return DEFAULT_SCHEDULED_INTERVIEWS;
    }
  }

  public static async fetchInterviewsFromDb(provider?: string): Promise<ScheduledInterview[]> {
    try {
      const url = provider
        ? `http://localhost:8000/api/interviews?provider=${encodeURIComponent(provider)}`
        : 'http://localhost:8000/api/interviews';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const interviews: ScheduledInterview[] = data.interviews || [];
        const key = this.getInterviewStorageKey(provider);
        localStorage.setItem(key, JSON.stringify(interviews));
        return interviews;
      }
    } catch (err) {
      console.warn('Could not fetch interviews from backend DB:', err);
    }
    return this.getScheduledInterviews(provider);
  }

  public static saveScheduledInterviews(interviews: ScheduledInterview[], provider?: string) {
    const key = this.getInterviewStorageKey(provider);
    localStorage.setItem(key, JSON.stringify(interviews));
    localStorage.setItem(STORAGE_KEYS.INTERVIEWS, JSON.stringify(interviews));
  }

  public static async recordInterviewToDb(interview: ScheduledInterview, provider?: string): Promise<void> {
    try {
      const prov = provider || interview.provider || 'google';
      await fetch(`http://localhost:8000/api/interviews?provider=${encodeURIComponent(prov)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...interview, provider: prov }),
      });
    } catch (err) {
      console.warn('Could not save interview to backend DB:', err);
    }
  }

  public static async cancelInterviewInDb(interviewId: string): Promise<void> {
    try {
      await fetch(`http://localhost:8000/api/interviews/${encodeURIComponent(interviewId)}/cancel`, {
        method: 'PUT',
      });
    } catch (err) {
      console.warn('Could not cancel interview in backend DB:', err);
    }
  }

  public static async deleteInterviewFromDb(interviewId: string): Promise<void> {
    try {
      await fetch(`http://localhost:8000/api/interviews/${encodeURIComponent(interviewId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Could not delete interview in backend DB:', err);
    }
  }


  public static getGraphConfig(): MicrosoftGraphConfig {
    const data = localStorage.getItem(STORAGE_KEYS.GRAPH_CONFIG);
    if (!data) {
      const initial: MicrosoftGraphConfig = {
        isMockMode: true,
        tenantId: 'contoso.onmicrosoft.com',
        clientId: '7f91a823-3b60-449e-8c33-91283d789012',
        clientSecret: '••••••••••••••••••••',
        authStatus: 'mocked',
        lastSyncedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.GRAPH_CONFIG, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return {
        isMockMode: true,
        tenantId: '',
        clientId: '',
        clientSecret: '',
        authStatus: 'mocked',
      };
    }
  }

  public static saveGraphConfig(config: MicrosoftGraphConfig) {
    localStorage.setItem(STORAGE_KEYS.GRAPH_CONFIG, JSON.stringify(config));
  }

  public static getGoogleConfig(): GoogleCalendarConfig {
    const data = localStorage.getItem(STORAGE_KEYS.GOOGLE_CONFIG);
    if (!data) {
      const initial: GoogleCalendarConfig = {
        isMockMode: true,
        clientId: '61829374921-googleclient.apps.googleusercontent.com',
        clientSecret: '••••••••••••••••••••',
        redirectUri: 'http://localhost:8000/auth/google/callback',
        connectedEmail: 'recruiter@sample.org',
        authStatus: 'connected',

        autoCreateMeet: true,
        scopes: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.freebusy',
        ],
        lastSyncedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.GOOGLE_CONFIG, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return {
        isMockMode: true,
        clientId: '',
        clientSecret: '',
        authStatus: 'disconnected',
      };
    }
  }

  public static saveGoogleConfig(config: GoogleCalendarConfig) {
    localStorage.setItem(STORAGE_KEYS.GOOGLE_CONFIG, JSON.stringify(config));
  }

  public static resetToDefaults() {
    localStorage.removeItem(STORAGE_KEYS.PANEL_MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.CANDIDATES);
    localStorage.removeItem(STORAGE_KEYS.INTERVIEWS);
    localStorage.removeItem(STORAGE_KEYS.GRAPH_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_CONFIG);
    window.location.reload();
  }
}
