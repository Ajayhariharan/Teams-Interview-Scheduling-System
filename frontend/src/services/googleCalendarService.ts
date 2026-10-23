import type { ScheduledInterview, GoogleCalendarConfig } from '../types';

export function generateGoogleMeetUrl(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const randPart = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.google.com/${randPart(3)}-${randPart(4)}-${randPart(3)}`;
}

function parseTimeTo24hCompact(timeStr: string): string {
  const clean = timeStr.trim();
  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);
  const raw = clean.replace(/[^\d:]/g, '');
  const [hStr, mStr = '00'] = raw.split(':');
  let hours = parseInt(hStr, 10) || 0;
  const minutes = parseInt(mStr, 10) || 0;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}${pad(minutes)}00`;
}

export function generateGoogleCalendarEventUrl(interview: ScheduledInterview): string {
  const cleanDate = interview.date.replace(/-/g, '');
  const startCompact = parseTimeTo24hCompact(interview.startTime);
  const endCompact = parseTimeTo24hCompact(interview.endTime);
  const dates = `${cleanDate}T${startCompact}/${cleanDate}T${endCompact}`;

  const title = `${interview.interviewType}: ${interview.candidateName}`;

  const attendeeEmails = [
    interview.candidateEmail,
    ...interview.panelMembers.map((p) => p.email),
  ].filter(Boolean);

  const lines = [
    `Interview Round: ${interview.interviewType}`,
    `Candidate: ${interview.candidateName} (${interview.candidateEmail})`,
    `Role: ${interview.candidateRole}`,
  ];

  if (interview.candidateAtsScore !== undefined) {
    lines.push(`ATS Match Score: ${interview.candidateAtsScore}%`);
  }

  if (interview.meetUrl) {
    lines.push(`Google Meet: ${interview.meetUrl}`);
  }

  if (interview.agenda) {
    lines.push(`Agenda: ${interview.agenda}`);
  }

  lines.push(`Panel: ${interview.panelMembers.map((p) => `${p.name} (${p.email})`).join(', ')}`);

  const details = lines.join('\n');
  const location = interview.meetUrl || interview.location;

  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
  if (attendeeEmails.length > 0) {
    url += `&add=${encodeURIComponent(attendeeEmails.join(','))}`;
  }

  return url;
}

export function buildGoogleOAuthUrl(config: GoogleCalendarConfig): string {
  const redirectUri = config.redirectUri || 'http://localhost:8000/auth/google/callback';
  const defaultScopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.freebusy',
    'https://www.googleapis.com/auth/userinfo.email',
  ];
  const scopes = config.scopes && config.scopes.length > 0 ? config.scopes : defaultScopes;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'select_account',
    include_granted_scopes: 'true',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
