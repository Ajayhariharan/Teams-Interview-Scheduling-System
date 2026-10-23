import type { ScheduledInterview } from '../types';

export const DEFAULT_OFFLINE_VENUES = [
  { id: 'room-1', name: 'Conference Room 3A (Tower B)', floor: '3rd Floor, Tower B, HQ Campus' },
  { id: 'room-2', name: 'Engineering Interview Room 102', floor: '1st Floor, Innovation Hub' },
  { id: 'room-3', name: 'Executive Boardroom 405', floor: '4th Floor, Main Building' },
  { id: 'room-4', name: 'Tech Discussion Room 2B', floor: '2nd Floor, R&D Wing' },
  { id: 'room-5', name: 'Discussion Pod 14', floor: 'Ground Floor, Talent Centre' },
];

/**
 * Builds a comprehensive, professional interview invitation text with online meeting links (Google Meet / Teams)
 */
export function buildProfessionalInvitationText(interview: ScheduledInterview): string {
  const isTeams = interview.deliveryMode === 'teams-meeting' || interview.provider === 'microsoft' || (interview.meetUrl ? interview.meetUrl.includes('teams.microsoft.com') : false);
  const platform = isTeams ? 'Microsoft Teams' : 'Google Meet';
  const meetUrl = interview.meetUrl || (isTeams ? 'https://teams.microsoft.com' : 'https://meet.google.com/new');
  
  const panelList = interview.panelMembers
    .map((p, idx) => `  ${idx + 1}. ${p.name} — ${p.role} (${p.email})`)
    .join('\n');

  return `INTERVIEW INVITATION: ${interview.interviewType.toUpperCase()} — ${interview.candidateName.toUpperCase()}
======================================================================

Dear ${interview.candidateName},

You have been scheduled for an official interview session with our panel. Below are the confirmed details:

SESSION DETAILS:
----------------------------------------------------------------------
• Candidate Name:    ${interview.candidateName}
• Candidate Email:   ${interview.candidateEmail}
• Position / Role:   ${interview.candidateRole}
• Interview Stage:   ${interview.interviewType}
• Date:              ${interview.date}
• Time:              ${interview.startTime} – ${interview.endTime} (${interview.durationMinutes} Minutes)
• Status:            Confirmed & Calendar Slots Locked

JOIN ONLINE MEETING (${platform.toUpperCase()}):
----------------------------------------------------------------------
• Meeting Platform:  ${platform}
• Video Join Link:   ${meetUrl}
• Venue / Room:      ${interview.location} (${interview.buildingFloor || (isTeams ? 'Microsoft 365 Cloud' : 'Google Workspace Online')})

INTERVIEW PANEL EVALUATORS:
----------------------------------------------------------------------
${panelList || '  • Panel Team Assigned'}

AGENDA & TOPICS:
----------------------------------------------------------------------
${interview.agenda ? interview.agenda.split('\n').map(line => `• ${line}`).join('\n') : '• Technical evaluation, architecture review, and live discussion.'}

IMPORTANT INSTRUCTIONS:
----------------------------------------------------------------------
• Please join the meeting 5 minutes prior to the scheduled start time.
• Ensure your camera, microphone, and internet connection are tested beforehand.
• Keep your resume, project portfolio, and any relevant work samples ready for discussion.
• For any technical difficulties or reschedule requests, reply directly to this invitation.

Best regards,
Talent Acquisition Team
Interview Panel Scheduling Engine`;
}

/**
 * Builds a standard email subject line for interview invitations
 */
export function buildProfessionalEmailSubject(interview: ScheduledInterview): string {
  const isTeams = interview.deliveryMode === 'teams-meeting' || interview.provider === 'microsoft' || (interview.meetUrl ? interview.meetUrl.includes('teams.microsoft.com') : false);
  const platform = isTeams ? 'Microsoft Teams' : 'Google Meet';
  return `Interview Invitation: ${interview.interviewType} — ${interview.candidateName} (${platform})`;
}

/**
 * Generates standard RFC 5545 iCalendar (.ics) content for an interview.
 */
export function generateICalendarFile(interview: ScheduledInterview): string {
  const cleanDate = interview.date.replace(/-/g, '');
  
  const parseTimeTo24h = (t: string) => {
    if (t.includes('AM') || t.includes('PM')) {
      const parts = t.trim().split(/[:\s]/);
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = parts[2] || parts[parts.length - 1];
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}${minutes}00`;
    }
    const [h, m] = t.split(':');
    return `${h.padStart(2, '0')}${m.padStart(2, '0')}00`;
  };

  const dtStart = `${cleanDate}T${parseTimeTo24h(interview.startTime)}`;
  const dtEnd = `${cleanDate}T${parseTimeTo24h(interview.endTime)}`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const isTeams = interview.deliveryMode === 'teams-meeting' || interview.provider === 'microsoft' || (interview.meetUrl ? interview.meetUrl.includes('teams.microsoft.com') : false);
  const platform = isTeams ? 'Microsoft Teams' : 'Google Meet';
  const meetUrl = interview.meetUrl || (isTeams ? 'https://teams.microsoft.com' : 'https://meet.google.com/new');

  const attendeeLines = [
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=${interview.candidateName}:mailto:${interview.candidateEmail}`,
    ...interview.panelMembers.map(
      (p) => `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${p.name}:mailto:${p.email}`
    ),
  ].join('\r\n');

  const summary = `${platform} Interview: ${interview.candidateName} — ${interview.interviewType}`;
  const rawDescription = buildProfessionalInvitationText(interview);
  const escapedDescription = rawDescription.replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Interview Panel Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:interview-${interview.id}@company.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${escapedDescription}`,
    `LOCATION:${meetUrl || interview.location}`,
    `URL:${meetUrl}`,
    `ORGANIZER;CN=Talent Acquisition:mailto:talent-acquisition@company.com`,
    attendeeLines,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${summary} in 15 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return icsContent;
}

/**
 * Triggers a browser download of the generated .ics file.
 */
export function downloadICSFile(interview: ScheduledInterview) {
  const icsContent = generateICalendarFile(interview);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Interview_${interview.candidateName.replace(/\s+/g, '_')}_${interview.date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
