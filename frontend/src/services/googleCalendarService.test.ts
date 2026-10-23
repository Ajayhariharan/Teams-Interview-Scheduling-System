import { describe, it, expect } from 'vitest';
import { generateGoogleMeetUrl, generateGoogleCalendarEventUrl, buildGoogleOAuthUrl } from './googleCalendarService';
import type { ScheduledInterview, GoogleCalendarConfig } from '../types';

describe('Google Calendar & Google Meet Service', () => {
  it('generates standard Google Meet meeting link format (xxx-yyyy-zzz)', () => {
    const meetUrl = generateGoogleMeetUrl();
    expect(meetUrl).toMatch(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
  });

  it('generates correct direct 1-click Google Calendar TEMPLATE URL', () => {
    const interview: ScheduledInterview = {
      id: 'test-1',
      candidateId: 'cand-1',
      candidateName: 'Arun Kumar',
      candidateEmail: 'arun@example.com',
      candidateRole: 'Senior Full Stack Engineer',
      candidateAtsScore: 91.2,
      interviewType: 'Technical Round 1',
      date: '2026-09-18',
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      durationMinutes: 60,
      deliveryMode: 'google_meet',
      meetUrl: 'https://meet.google.com/abc-defg-hij',
      location: 'Google Meet Video Call',
      buildingFloor: 'Cloud Video Room',
      panelMembers: [
        { id: 'p1', name: 'Rahul Sharma', email: 'rahul@company.com', role: 'Staff Eng', avatar: '' },
        { id: 'p2', name: 'Priya Patel', email: 'priya@company.com', role: 'VP Eng', avatar: '' },
      ],
      status: 'scheduled',
      agenda: 'Architecture review',
      createdAt: '2026-09-18T00:00:00Z',
    };

    const url = generateGoogleCalendarEventUrl(interview);
    expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
    expect(url).toContain(encodeURIComponent('Technical Round 1: Arun Kumar'));
    expect(url).toContain('dates=20260918T100000/20260918T110000');
    expect(url).toContain(encodeURIComponent('arun@example.com'));
    expect(url).toContain(encodeURIComponent('rahul@company.com'));
    expect(url).toContain('91.2');
  });

  it('builds standard Google OAuth 2.0 authorization URL with required scopes', () => {
    const config: GoogleCalendarConfig = {
      isMockMode: false,
      clientId: 'test-client-id-123.apps.googleusercontent.com',
      clientSecret: 'secret',
      redirectUri: 'http://localhost:8000/auth/google/callback',
      connectedEmail: 'recruiter@company.com',
      authStatus: 'connected',
      autoCreateMeet: true,
      scopes: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.freebusy',
      ],
    };

    const oauthUrl = buildGoogleOAuthUrl(config);
    expect(oauthUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(oauthUrl).toContain('test-client-id-123.apps.googleusercontent.com');
    expect(oauthUrl).toContain('http%3A%2F%2Flocalhost%3A8000%2Fauth%2Fgoogle%2Fcallback');
    expect(oauthUrl).toContain('calendar.events');
    expect(oauthUrl).toContain('calendar.freebusy');
  });
});
