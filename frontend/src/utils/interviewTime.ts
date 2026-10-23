import type { ScheduledInterview } from '../types';

/**
 * Checks if an interview's date and end time have already passed based on current timestamp.
 * Supports both 12-hour (e.g. "11:30 AM", "03:00 PM") and 24-hour (e.g. "11:30", "15:00") formats.
 */
export function isInterviewPast(dateStr: string, endTimeStr: string, referenceDate: Date = new Date()): boolean {
  try {
    if (!dateStr || !endTimeStr) return false;
    const dateParts = dateStr.trim().split('-');
    if (dateParts.length !== 3) return false;
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10);
    const day = parseInt(dateParts[2], 10);

    let hours = 0;
    let minutes = 0;

    const cleanTime = endTimeStr.trim().toUpperCase();
    if (cleanTime.includes('AM') || cleanTime.includes('PM')) {
      const parts = cleanTime.split(/[:\s]+/);
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10) || 0;
      const ampm = parts[2] || parts[parts.length - 1];
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    } else {
      const parts = cleanTime.split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    }

    const interviewEndDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return referenceDate.getTime() > interviewEndDate.getTime();
  } catch {
    return false;
  }
}

/**
 * Returns the effective lifecycle status of an interview.
 * - 'cancelled': if explicit status is 'cancelled'
 * - 'completed': if explicit status is 'completed' OR if scheduled time has passed
 * - 'scheduled': if upcoming and active
 */
export function getInterviewEffectiveStatus(
  interview: Pick<ScheduledInterview, 'status' | 'date' | 'endTime'>,
  referenceDate: Date = new Date()
): 'scheduled' | 'completed' | 'cancelled' {
  if (interview.status === 'cancelled') return 'cancelled';
  if (interview.status === 'completed' || isInterviewPast(interview.date, interview.endTime, referenceDate)) {
    return 'completed';
  }
  return 'scheduled';
}

