import { describe, it, expect } from 'vitest';
import { generateCandidateQuestions } from './questionGenerator';

describe('Interview Question Generator', () => {
  it('generates exactly 10 questions for frontend candidate', () => {
    const result = generateCandidateQuestions(
      'Ananya Sharma',
      'Senior Frontend Engineer',
      ['React', 'TypeScript', 'Redux', 'Next.js'],
      5,
      'Round 1: Architecture & System Design'
    );

    expect(result.candidateName).toBe('Ananya Sharma');
    expect(result.totalQuestions).toBe(10);
    expect(result.questions).toHaveLength(10);
    
    // Check categories
    const categories = result.questions.map(q => q.category);
    expect(categories.filter(c => c === 'Core Architecture & Depth')).toHaveLength(3);
    expect(categories.filter(c => c === 'Applied Problem Solving & Debugging')).toHaveLength(3);
    expect(categories.filter(c => c === 'System Design & Scalability')).toHaveLength(2);
    expect(categories.filter(c => c === 'Behavioral & Leadership')).toHaveLength(2);
  });

  it('generates tailored questions for backend engineers', () => {
    const result = generateCandidateQuestions(
      'Vikram Patel',
      'Staff Backend Engineer',
      ['Python', 'FastAPI', 'PostgreSQL', 'Redis', 'Kafka'],
      7,
      'Technical Round 2'
    );

    expect(result.totalQuestions).toBe(10);
    expect(result.questions[0].question).toContain('Python');
    expect(result.questions[1].question).toContain('PostgreSQL');
    expect(result.questions.every(q => q.question.length > 10 && q.suggestedFollowUp)).toBe(true);

  });

  it('generates tailored questions for devops engineers', () => {
    const result = generateCandidateQuestions(
      'Suresh Nair',
      'Lead DevOps Engineer',
      ['Kubernetes', 'Terraform', 'AWS', 'Docker', 'CI/CD'],
      6,
      'Infrastructure Deep Dive'
    );

    expect(result.totalQuestions).toBe(10);
    expect(result.questions[0].question).toContain('Kubernetes');
    expect(result.questions[1].question).toContain('AWS');
  });
});

