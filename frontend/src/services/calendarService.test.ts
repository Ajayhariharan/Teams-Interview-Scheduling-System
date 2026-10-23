import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarService } from './calendarService';
import type { Candidate } from '../types';

// Setup localStorage mock for Vitest node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('CalendarService Candidate & Resume Operations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves candidates from localStorage', () => {
    const mockCandidate: Candidate = {
      id: 'cand-test-1',
      name: 'Sarah Connor',
      email: 'sarah.c@example.com',
      phone: '+1 555-0199',
      position: 'Senior Security Architect',
      department: 'Platform Security',
      experienceYears: 8,
      currentStage: 'Screening',
      skills: ['Zero Trust', 'Rust', 'Kubernetes'],
      appliedDate: '2026-09-20',
      atsScore: 95.0,
      summary: 'Experienced security architect specializing in cloud infrastructure.',
    };

    CalendarService.saveCandidates([mockCandidate]);
    const stored = CalendarService.getCandidates();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Sarah Connor');
    expect(stored[0].atsScore).toBe(95.0);
    expect(stored[0].summary).toBe('Experienced security architect specializing in cloud infrastructure.');
  });

  it('updates candidate stage correctly', () => {
    const mockCandidate: Candidate = {
      id: 'cand-stage-1',
      name: 'John Miller',
      email: 'john.m@example.com',
      phone: '+1 555-0123',
      position: 'Backend Developer',
      department: 'Engineering',
      experienceYears: 4,
      currentStage: 'Screening',
      skills: ['Python', 'Django'],
      appliedDate: '2026-09-20',
      atsScore: 88.0,
    };

    CalendarService.saveCandidates([mockCandidate]);
    const updated = CalendarService.updateCandidateStage('cand-stage-1', 'Technical Round 2');
    expect(updated[0].currentStage).toBe('Technical Round 2');
  });

  it('handles candidate questions api call gracefully on error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(CalendarService.fetchCandidateQuestions('cand-123')).rejects.toThrow('Network error');
  });
});
