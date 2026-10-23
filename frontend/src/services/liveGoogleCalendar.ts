import type { CalendarEvent } from '../types';

const API_BASE = 'http://localhost:8000';

function parseIsoToLocalTime(isoStr: string | undefined, fallback: string): string {
  if (!isoStr) return fallback;
  try {
    const d = new Date(isoStr);
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

export async function fetchLiveMyEvents(date: string, accessToken: string): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`${API_BASE}/api/calendar/my-events?date=${encodeURIComponent(date)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      console.warn('Failed to fetch live Google events, status:', res.status);
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
    console.warn('Error fetching live Google events:', err);
    return [];
  }
}

export async function fetchLiveFreeBusy(
  emails: string[],
  timeMin: string,
  timeMax: string,
  accessToken: string
): Promise<Record<string, CalendarEvent[]>> {
  try {
    // Try panel-events first to get actual event titles (e.g. "Team Sync")
    const res = await fetch(`${API_BASE}/api/calendar/panel-events`, {

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

    if (res.ok) {
      const data = await res.json();
      const calendars = data.calendars || {};
      const result: Record<string, CalendarEvent[]> = {};

      for (const [email, events] of Object.entries<any>(calendars)) {
        result[email.toLowerCase()] = (events || []).map((evt: any) => ({
          ...evt,
          title: evt.title && evt.title !== 'Google Calendar Busy Block' ? evt.title : 'Busy Meeting',
          startTime: parseIsoToLocalTime(evt.startRaw || evt.start, evt.startTime || '09:00'),
          endTime: parseIsoToLocalTime(evt.endRaw || evt.end, evt.endTime || '10:00'),
        }));
      }
      return result;
    }

    // Fallback to legacy freebusy endpoint
    const fallbackRes = await fetch(`${API_BASE}/api/calendar/freebusy`, {
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

    if (!fallbackRes.ok) {
      console.warn('Failed to fetch Google free/busy status:', fallbackRes.status);
      return {};
    }
    const data = await fallbackRes.json();
    const calendars = data.calendars || {};
    const result: Record<string, CalendarEvent[]> = {};

    for (const [email, calData] of Object.entries<any>(calendars)) {
      const busyList = calData.busy || [];
      result[email.toLowerCase()] = busyList.map((b: { start: string; end: string }, index: number) => {
        const startTime = parseIsoToLocalTime(b.start, '09:00');
        const endTime = parseIsoToLocalTime(b.end, '10:00');
        return {
          id: `fb-${email}-${index}`,
          title: 'Busy Meeting',
          startTime,
          endTime,
          type: 'busy' as const,
          description: `Busy (${startTime} - ${endTime})`,
        };
      });
    }

    return result;
  } catch (err) {
    console.warn('Error querying Google Free/Busy API:', err);
    return {};
  }
}

export async function createLiveGoogleEvent(
  params: {
    title: string;
    startTime: string; // ISO string
    endTime: string;   // ISO string
    attendees: string[];
    description: string;
    location?: string;
    createMeet?: boolean;
  },
  accessToken: string
) {
  try {
    const res = await fetch(`${API_BASE}/api/calendar/events`, {
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
        description: params.description,
        location: params.location || 'Google Meet Video Call',
        create_meet: params.createMeet ?? true,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create Google Calendar event');
    }
    const data = await res.json();
    return data.event;
  } catch (err) {
    console.error('Error creating live Google Calendar event:', err);
    throw err;
  }
}

export async function deleteLiveGoogleEvent(eventId: string, accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/calendar/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.ok;
  } catch (err) {
    console.warn('Error deleting live Google Calendar event:', err);
    return false;
  }
}

