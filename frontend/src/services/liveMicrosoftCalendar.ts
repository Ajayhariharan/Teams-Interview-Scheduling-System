import type { CalendarEvent } from '../types';

const API_BASE = 'http://localhost:8000';

function parseIsoToLocalTime(isoStr: string | undefined, fallback: string): string {
  if (!isoStr) return fallback;
  try {
    let normalized = isoStr;
    if (!normalized.endsWith('Z') && !normalized.includes('+') && !normalized.includes('-')) {
      normalized = `${normalized}Z`;
    }
    const d = new Date(normalized);
    if (isNaN(d.getTime())) {
      if (isoStr.includes('T')) {
        return isoStr.split('T')[1].substring(0, 5);
      }
      return fallback;
    }
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return fallback;
  }
}

export async function fetchLiveMicrosoftEvents(date: string, accessToken: string): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`${API_BASE}/api/calendar/microsoft/my-events?date=${encodeURIComponent(date)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      console.warn('Failed to fetch live Microsoft events, status:', res.status);
      return [];
    }
    const data = await res.json();
    const rawEvents = data.events || [];
    return rawEvents.map((evt: any) => ({
      ...evt,
      startTime: parseIsoToLocalTime(evt.startRaw, evt.startTime),
      endTime: parseIsoToLocalTime(evt.endRaw, evt.endTime),
    }));
  } catch (err) {
    console.warn('Error fetching live Microsoft events:', err);
    return [];
  }
}

export async function fetchLiveMicrosoftPanelEvents(
  emails: string[],
  timeMin: string,
  timeMax: string,
  accessToken: string
): Promise<Record<string, CalendarEvent[]>> {
  try {
    const res = await fetch(`${API_BASE}/api/calendar/microsoft/panel-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        emails,
        time_min: timeMin,
        time_max: timeMax,
      }),
    });

    if (!res.ok) {
      console.warn('Failed to fetch Microsoft panel events:', res.status);
      return {};
    }
    const data = await res.json();
    const calendars = data.calendars || {};
    const result: Record<string, CalendarEvent[]> = {};

    for (const [email, events] of Object.entries<any>(calendars)) {
      result[email.toLowerCase()] = (events || []).map((evt: any) => ({
        ...evt,
        title: evt.title || 'Busy Meeting',
        startTime: parseIsoToLocalTime(evt.startRaw, evt.startTime || '09:00'),
        endTime: parseIsoToLocalTime(evt.endRaw, evt.endTime || '10:00'),
      }));
    }

    return result;
  } catch (err) {
    console.warn('Error querying Microsoft Panel Events API:', err);
    return {};
  }
}

export async function createLiveMicrosoftEvent(
  params: {
    title: string;
    startTime: string; // ISO string
    endTime: string; // ISO string
    attendees: string[];
    description?: string;
    location?: string;
    createTeams?: boolean;
  },
  accessToken: string
): Promise<{
  id: string;
  title: string;
  teamsLink?: string;
  htmlLink?: string;
}> {
  const res = await fetch(`${API_BASE}/api/calendar/microsoft/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      title: params.title,
      start_time: params.startTime,
      end_time: params.endTime,
      attendees: params.attendees,
      description: params.description || '',
      location: params.location || 'Microsoft Teams Meeting',
      create_teams: params.createTeams ?? true,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Microsoft Teams creation failed (status ${res.status})`);
  }

  const data = await res.json();
  const event = data.event || {};
  return {
    id: event.id || `ms-${Date.now()}`,
    title: event.title || params.title,
    teamsLink: event.teamsLink,
    htmlLink: event.htmlLink,
  };
}

export async function deleteLiveMicrosoftEvent(eventId: string, accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/calendar/microsoft/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.ok;
  } catch (err) {
    console.warn('Error deleting live Microsoft event:', err);
    return false;
  }
}

