import type { CalendarEvent, FormattedSlot, PanelMember, TimeInterval, WorkingHours } from '../types';

/**
 * Converts a time string "HH:mm" (24-hour) to minutes from midnight (00:00 = 0).
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: "${timeStr}". Expected "HH:mm".`);
  }
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight to "HH:mm" (24-hour format).
 */
export function minutesToTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const hrs = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Converts minutes from midnight to formatted 12-hour time string (e.g., "10:30 AM").
 */
export function formatMinutesTo12Hour(minutes: number): string {
  const normalized = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const hrs24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hrs24 >= 12 ? 'PM' : 'AM';
  const hrs12 = hrs24 % 12 === 0 ? 12 : hrs24 % 12;
  return `${hrs12}:${String(mins).padStart(2, '0')} ${period}`;
}

/**
 * Merges overlapping or contiguous time intervals.
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];

  // Sort by start time
  const sorted = [...intervals].sort((a, b) => a.startMinutes - b.startMinutes);
  const merged: TimeInterval[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = merged[merged.length - 1];

    if (current.startMinutes <= prev.endMinutes) {
      // Overlap or touching, merge them
      prev.endMinutes = Math.max(prev.endMinutes, current.endMinutes);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Computes the free time intervals for a single panel member within their working hours.
 */
export function getFreeIntervalsForMember(
  member: PanelMember,
  date: string,
  customWorkingHours?: WorkingHours
): TimeInterval[] {
  const workingHours = customWorkingHours || member.workingHours;
  const workStart = timeToMinutes(workingHours.start);
  const workEnd = timeToMinutes(workingHours.end);

  if (workStart >= workEnd) return [];

  const events = member.eventsByDate[date] || [];
  
  // Collect busy intervals within working hours
  const busyIntervals: TimeInterval[] = [];
  for (const event of events) {
    if (event.isFree) continue; // Skip events flagged as free

    const eventStart = Math.max(workStart, timeToMinutes(event.startTime));
    const eventEnd = Math.min(workEnd, timeToMinutes(event.endTime));

    if (eventStart < eventEnd) {
      busyIntervals.push({ startMinutes: eventStart, endMinutes: eventEnd });
    }
  }

  const mergedBusy = mergeIntervals(busyIntervals);

  // Invert busy intervals to find free intervals
  const freeIntervals: TimeInterval[] = [];
  let currentStart = workStart;

  for (const busy of mergedBusy) {
    if (currentStart < busy.startMinutes) {
      freeIntervals.push({
        startMinutes: currentStart,
        endMinutes: busy.startMinutes,
      });
    }
    currentStart = Math.max(currentStart, busy.endMinutes);
  }

  if (currentStart < workEnd) {
    freeIntervals.push({
      startMinutes: currentStart,
      endMinutes: workEnd,
    });
  }

  return freeIntervals;
}

/**
 * Mathematically intersects two lists of non-overlapping sorted time intervals.
 */
export function intersectTwoIntervalLists(
  intervalsA: TimeInterval[],
  intervalsB: TimeInterval[]
): TimeInterval[] {
  const result: TimeInterval[] = [];
  let i = 0;
  let j = 0;

  while (i < intervalsA.length && j < intervalsB.length) {
    const a = intervalsA[i];
    const b = intervalsB[j];

    const overlapStart = Math.max(a.startMinutes, b.startMinutes);
    const overlapEnd = Math.min(a.endMinutes, b.endMinutes);

    if (overlapStart < overlapEnd) {
      result.push({ startMinutes: overlapStart, endMinutes: overlapEnd });
    }

    // Advance the interval with earlier end time
    if (a.endMinutes < b.endMinutes) {
      i++;
    } else if (b.endMinutes < a.endMinutes) {
      j++;
    } else {
      i++;
      j++;
    }
  }

  return result;
}

/**
 * Computes the common intersection of free intervals across N panel members.
 */
export function intersectAllPanelMembers(
  panelMembers: PanelMember[],
  date: string,
  commonWorkingHours?: WorkingHours
): TimeInterval[] {
  if (panelMembers.length === 0) return [];

  // Get free intervals for the first member
  let commonFree = getFreeIntervalsForMember(panelMembers[0], date, commonWorkingHours);

  // Sequentially intersect with all other members
  for (let i = 1; i < panelMembers.length; i++) {
    const memberFree = getFreeIntervalsForMember(panelMembers[i], date, commonWorkingHours);
    commonFree = intersectTwoIntervalLists(commonFree, memberFree);
    if (commonFree.length === 0) break; // Early exit if no common free time remaining
  }

  return commonFree;
}

/**
 * Options for generating discrete interview slots from free intervals.
 */
export interface SlotGenerationOptions {
  durationMinutes: number; // e.g. 30, 45, 60, 90
  stepMinutes?: number;    // e.g. 15 or 30 (default: 30)
  bufferMinutes?: number;  // buffer after/before interview (default: 0)
}

/**
 * Slices continuous common free intervals into concrete, bookable interview slots.
 */
export function generateDiscreteSlots(
  commonIntervals: TimeInterval[],
  date: string,
  panelMemberIds: string[],
  options: SlotGenerationOptions
): FormattedSlot[] {
  const { durationMinutes, stepMinutes = 30, bufferMinutes = 0 } = options;
  const slots: FormattedSlot[] = [];
  const totalRequiredTime = durationMinutes + bufferMinutes;

  for (const interval of commonIntervals) {
    let slotStart = interval.startMinutes;

    // Check if entire required window fits inside interval
    while (slotStart + totalRequiredTime <= interval.endMinutes) {
      const slotEnd = slotStart + durationMinutes;

      // Identify optimal morning (10:00 - 12:00) or early afternoon (14:00 - 16:00) slots
      const isOptimal = 
        (slotStart >= 600 && slotEnd <= 720) || 
        (slotStart >= 840 && slotEnd <= 960);

      slots.push({
        id: `slot-${date}-${slotStart}-${slotEnd}`,
        date,
        startTime: formatMinutesTo12Hour(slotStart),
        endTime: formatMinutesTo12Hour(slotEnd),
        startMinutes: slotStart,
        endMinutes: slotEnd,
        durationMinutes,
        panelMemberIds,
        isOptimal,
      });

      slotStart += stepMinutes;
    }
  }

  return slots;
}

/**
 * Main Deterministic Engine function:
 * Checks N panel members' calendars on a given date and returns all valid interview slots.
 */
export function findCommonAvailableSlots(
  panelMembers: PanelMember[],
  date: string,
  options: SlotGenerationOptions,
  commonWorkingHours?: WorkingHours
): {
  commonIntervals: TimeInterval[];
  slots: FormattedSlot[];
  memberFreeIntervals: Record<string, TimeInterval[]>;
} {
  const memberFreeIntervals: Record<string, TimeInterval[]> = {};
  
  for (const member of panelMembers) {
    memberFreeIntervals[member.id] = getFreeIntervalsForMember(member, date, commonWorkingHours);
  }

  const commonIntervals = intersectAllPanelMembers(panelMembers, date, commonWorkingHours);
  const panelMemberIds = panelMembers.map(m => m.id);
  const slots = generateDiscreteSlots(commonIntervals, date, panelMemberIds, options);

  return {
    commonIntervals,
    slots,
    memberFreeIntervals,
  };
}

