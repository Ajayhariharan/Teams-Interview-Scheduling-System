import { describe, it, expect } from 'vitest';
import { isInterviewPast, getInterviewEffectiveStatus } from './interviewTime';

describe('interviewTime utility', () => {
  const refDate = new Date('2026-10-01T12:00:00Z');

  it('correctly identifies past interview dates', () => {
    // 2026-09-30 11:30 AM is before 2026-10-01
    expect(isInterviewPast('2026-09-30', '11:30 AM', refDate)).toBe(true);
    expect(isInterviewPast('2026-09-30', '05:00 PM', refDate)).toBe(true);
  });

  it('correctly identifies future interview dates', () => {
    // 2026-10-05 10:00 AM is after 2026-10-01
    expect(isInterviewPast('2026-10-05', '10:00 AM', refDate)).toBe(false);
  });

  it('computes effective status accurately', () => {
    expect(getInterviewEffectiveStatus({ status: 'cancelled', date: '2026-09-30', endTime: '11:30 AM' }, refDate)).toBe('cancelled');
    expect(getInterviewEffectiveStatus({ status: 'scheduled', date: '2026-09-30', endTime: '11:30 AM' }, refDate)).toBe('completed');
    expect(getInterviewEffectiveStatus({ status: 'scheduled', date: '2026-10-05', endTime: '11:30 AM' }, refDate)).toBe('scheduled');
    expect(getInterviewEffectiveStatus({ status: 'completed', date: '2026-10-05', endTime: '11:30 AM' }, refDate)).toBe('completed');
  });
});

