import { describe, it, expect } from 'vitest';
import {
  timeToMinutes,
  minutesToTime,
  formatMinutesTo12Hour,
  mergeIntervals,
  getFreeIntervalsForMember,
  intersectTwoIntervalLists,
  intersectAllPanelMembers,
  generateDiscreteSlots,
  findCommonAvailableSlots,
} from './availabilityEngine';
import { PanelMember } from '../types';

describe('Deterministic Availability Engine', () => {
  it('correctly converts time strings to minutes and back', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:00')).toBe(540);
    expect(timeToMinutes('10:30')).toBe(630);
    expect(timeToMinutes('17:45')).toBe(1065);

    expect(minutesToTime(540)).toBe('09:00');
    expect(minutesToTime(630)).toBe('10:30');

    expect(formatMinutesTo12Hour(540)).toBe('9:00 AM');
    expect(formatMinutesTo12Hour(720)).toBe('12:00 PM');
    expect(formatMinutesTo12Hour(780)).toBe('1:00 PM');
    expect(formatMinutesTo12Hour(870)).toBe('2:30 PM');
  });

  it('merges overlapping and contiguous intervals', () => {
    const intervals = [
      { startMinutes: 540, endMinutes: 600 },
      { startMinutes: 580, endMinutes: 660 },
      { startMinutes: 720, endMinutes: 780 },
    ];
    const merged = mergeIntervals(intervals);
    expect(merged).toEqual([
      { startMinutes: 540, endMinutes: 660 },
      { startMinutes: 720, endMinutes: 780 },
    ]);
  });

  it('computes free intervals for a single panel member', () => {
    const member: PanelMember = {
      id: 'p1',
      name: 'Arun Kumar',
      email: 'arun@example.com',
      role: 'Staff Engineer',
      department: 'Engineering',
      avatar: '',
      skills: ['React', 'TypeScript'],
      timezone: 'UTC+05:30',
      workingHours: { start: '09:00', end: '18:00' }, // 540 to 1080
      eventsByDate: {
        '2026-09-18': [
          { id: '1', title: 'Daily Standup', startTime: '09:00', endTime: '10:00', type: 'busy' },
          { id: '2', title: 'Lunch Break', startTime: '12:00', endTime: '13:00', type: 'lunch' },
          { id: '3', title: 'Architecture Review', startTime: '15:00', endTime: '18:00', type: 'busy' },
        ],
      },
    };

    const free = getFreeIntervalsForMember(member, '2026-09-18');
    // Expected free: 10:00 - 12:00 (600 - 720), 13:00 - 15:00 (780 - 900)
    expect(free).toEqual([
      { startMinutes: 600, endMinutes: 720 },
      { startMinutes: 780, endMinutes: 900 },
    ]);
  });

  it('calculates the exact 3-member intersection from user scenario', () => {
    // Member 1: Free 10:00-12:00, 13:00-15:00
    const m1: PanelMember = {
      id: 'm1',
      name: 'Panel Member 1',
      email: 'm1@example.com',
      role: 'Senior Engineer',
      department: 'Engineering',
      avatar: '',
      skills: ['Go', 'Kubernetes'],
      timezone: 'UTC+05:30',
      workingHours: { start: '09:00', end: '18:00' },
      eventsByDate: {
        '2026-09-18': [
          { id: 'e1', title: 'Meeting 1', startTime: '09:00', endTime: '10:00', type: 'busy' },
          { id: 'e2', title: 'Lunch', startTime: '12:00', endTime: '13:00', type: 'lunch' },
          { id: 'e3', title: 'Busy Afternoon', startTime: '15:00', endTime: '18:00', type: 'busy' },
        ],
      },
    };

    // Member 2: Free 09:00-11:00, 12:00-14:00
    const m2: PanelMember = {
      id: 'm2',
      name: 'Panel Member 2',
      email: 'm2@example.com',
      role: 'Lead Architect',
      department: 'Engineering',
      avatar: '',
      skills: ['Architecture', 'System Design'],
      timezone: 'UTC+05:30',
      workingHours: { start: '09:00', end: '18:00' },
      eventsByDate: {
        '2026-09-18': [
          { id: 'e4', title: 'Sync', startTime: '11:00', endTime: '12:00', type: 'busy' },
          { id: 'e5', title: 'Product Review', startTime: '14:00', endTime: '16:00', type: 'busy' },
          { id: 'e6', title: 'Wrap up', startTime: '16:00', endTime: '18:00', type: 'busy' },
        ],
      },
    };

    // Member 3: Free 10:30-13:00, 14:00-16:00
    const m3: PanelMember = {
      id: 'm3',
      name: 'Panel Member 3',
      email: 'm3@example.com',
      role: 'Engineering Manager',
      department: 'Engineering',
      avatar: '',
      skills: ['Management', 'People'],
      timezone: 'UTC+05:30',
      workingHours: { start: '09:00', end: '18:00' },
      eventsByDate: {
        '2026-09-18': [
          { id: 'e7', title: '1-on-1s', startTime: '09:00', endTime: '10:30', type: 'busy' },
          { id: 'e8', title: 'Staff Meeting', startTime: '13:00', endTime: '14:00', type: 'busy' },
          { id: 'e9', title: 'Out of office', startTime: '16:00', endTime: '18:00', type: 'ooo' },
        ],
      },
    };

    const common = intersectAllPanelMembers([m1, m2, m3], '2026-09-18');
    // Common intersection:
    // P1: [10:00-12:00], [13:00-15:00]
    // P2: [09:00-11:00], [12:00-14:00]
    // P3: [10:30-13:00], [14:00-16:00]
    // Intersection: [10:30 - 11:00] (30 mins = 630 to 660)
    expect(common).toEqual([
      { startMinutes: 630, endMinutes: 660 },
    ]);

    // 60-minute duration slot generation will return 0 slots because window is only 30m
    const slots60 = generateDiscreteSlots(common, '2026-09-18', ['m1', 'm2', 'm3'], {
      durationMinutes: 60,
    });
    expect(slots60.length).toBe(0);

    // 30-minute duration slot generation will return exactly 1 slot: 10:30 AM - 11:00 AM
    const slots30 = generateDiscreteSlots(common, '2026-09-18', ['m1', 'm2', 'm3'], {
      durationMinutes: 30,
    });
    expect(slots30.length).toBe(1);
    expect(slots30[0].startTime).toBe('10:30 AM');
    expect(slots30[0].endTime).toBe('11:00 AM');
  });

  it('generates multiple discrete slots when free interval is larger than duration', () => {
    const common = [{ startMinutes: 600, endMinutes: 780 }]; // 10:00 to 13:00 (180 mins)
    const slots = generateDiscreteSlots(common, '2026-09-18', ['m1'], {
      durationMinutes: 60,
      stepMinutes: 30,
    });

    // Slots: 10:00-11:00, 10:30-11:30, 11:00-12:00, 11:30-12:30, 12:00-13:00
    expect(slots.length).toBe(5);
    expect(slots[0].startTime).toBe('10:00 AM');
    expect(slots[0].endTime).toBe('11:00 AM');
    expect(slots[4].startTime).toBe('12:00 PM');
    expect(slots[4].endTime).toBe('1:00 PM');
  });
});

