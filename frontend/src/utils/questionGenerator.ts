export interface InterviewQuestion {
  id: number;
  category: 'Core Architecture & Depth' | 'Applied Problem Solving & Debugging' | 'System Design & Scalability' | 'Behavioral & Leadership';
  difficulty: 'Medium' | 'Advanced' | 'Lead / Principal';
  question: string;
  suggestedFollowUp?: string;
  rationale?: string;
  expectedSignals?: string[];
}

export interface CandidateQuestionProfile {
  candidateName: string;
  role: string;
  skills: string[];
  experienceYears?: number;
  interviewRound?: string;
  totalQuestions: number;
  generatedAt: string;
  questions: InterviewQuestion[];
}

/**
 * Natural, Conversational Panel Interview Question Generator
 * Generates 10 concise, direct questions with practical follow-up probes.
 */
export function generateCandidateQuestions(
  candidateName: string,
  role: string,
  skills: string[] = [],
  experienceYears: number = 4,
  interviewRound: string = 'Technical Round'
): CandidateQuestionProfile {
  const normalizedRole = role.toLowerCase();
  const primarySkill = skills[0] || (normalizedRole.includes('frontend') || normalizedRole.includes('react') ? 'React' : 'Backend Architecture');
  const secondarySkill = skills[1] || (skills.length > 0 ? skills[0] : 'System Design');
  const databaseSkill = skills.find(s => ['postgresql', 'mongodb', 'mysql', 'redis', 'sql', 'dynamodb', 'cassandra', 'database'].some(k => s.toLowerCase().includes(k))) || 'PostgreSQL';

  const isSenior = experienceYears >= 5 || normalizedRole.includes('senior') || normalizedRole.includes('lead') || normalizedRole.includes('principal');
  const isFrontend = normalizedRole.includes('frontend') || normalizedRole.includes('ui') || normalizedRole.includes('react') || normalizedRole.includes('web');
  const isDevOps = normalizedRole.includes('devops') || normalizedRole.includes('cloud') || normalizedRole.includes('sre') || normalizedRole.includes('infrastructure');
  const cloudSkill = skills.find(s => ['aws', 'gcp', 'azure', 'cloud'].some(k => s.toLowerCase().includes(k))) || (skills.length > 1 ? skills[1] : 'Cloud Infrastructure');

  const questions: InterviewQuestion[] = [];

  // ==========================================
  // Category 1: Core Architecture & Depth (3 Questions)
  // ==========================================
  if (isFrontend) {
    questions.push({
      id: 1,
      category: 'Core Architecture & Depth',
      difficulty: isSenior ? 'Lead / Principal' : 'Advanced',
      question: `In ${primarySkill}, how do you manage client-side state and caching to prevent unnecessary re-renders at scale?`,
      suggestedFollowUp: 'How do you profile and diagnose slow render cycles in production?'
    });

    questions.push({
      id: 2,
      category: 'Core Architecture & Depth',
      difficulty: 'Advanced',
      question: `When building reusable UI component libraries with ${secondarySkill}, how do you ensure strict type safety and backward compatibility?`,
      suggestedFollowUp: 'How do you handle breaking changes across multiple consumer applications?'
    });

    questions.push({
      id: 3,
      category: 'Core Architecture & Depth',
      difficulty: 'Medium',
      question: 'What techniques do you use to optimize Core Web Vitals like LCP and INP on heavy user-facing pages?',
      suggestedFollowUp: 'What is your strategy for lazy loading and code splitting dynamic modules?'
    });
  } else if (isDevOps) {
    questions.push({
      id: 1,
      category: 'Core Architecture & Depth',
      difficulty: isSenior ? 'Lead / Principal' : 'Advanced',
      question: `In ${primarySkill}, how do you design zero-downtime rolling deployments and canary releases with automated rollback health checks?`,
      suggestedFollowUp: 'How do you route traffic across canary and stable versions during rollout?'
    });

    questions.push({
      id: 2,
      category: 'Core Architecture & Depth',
      difficulty: 'Advanced',
      question: `In ${cloudSkill}, how do you enforce least-privilege IAM policies, secrets rotation, and automated drift detection?`,
      suggestedFollowUp: 'How do you secure cross-account resource access in production?'
    });

    questions.push({
      id: 3,
      category: 'Core Architecture & Depth',
      difficulty: 'Medium',
      question: 'How do you configure centralized distributed tracing, logging, and SLA alerting across microservices with high event throughput?',
      suggestedFollowUp: 'How do you prevent alert fatigue while keeping MTTR low?'
    });
  } else {
    questions.push({
      id: 1,
      category: 'Core Architecture & Depth',
      difficulty: isSenior ? 'Lead / Principal' : 'Advanced',
      question: `In ${primarySkill}, how do you design asynchronous request handling and connection pooling under heavy traffic?`,
      suggestedFollowUp: 'How do you prevent thread starvation or event-loop blocking when dependencies slow down?'
    });

    questions.push({
      id: 2,
      category: 'Core Architecture & Depth',
      difficulty: 'Advanced',
      question: `In ${databaseSkill}, how do you design indexes and query execution paths to avoid table locking and slow queries?`,
      suggestedFollowUp: 'How do you troubleshoot deadlocks or slow queries under concurrent transactions?'
    });


    questions.push({
      id: 3,
      category: 'Core Architecture & Depth',
      difficulty: 'Medium',
      question: 'How do you handle resilient service-to-service communication using retries, exponential backoff, and circuit breakers?',
      suggestedFollowUp: 'How do you ensure state-mutating requests remain idempotent when retrying?'
    });
  }

  // ==========================================
  // Category 2: Applied Problem Solving & Debugging (3 Questions)
  // ==========================================
  questions.push({
    id: 4,
    category: 'Applied Problem Solving & Debugging',
    difficulty: 'Advanced',
    question: `Tell us about the toughest production bug or memory leak you personally investigated in ${primarySkill}. How did you trace and resolve it?`,
    suggestedFollowUp: 'What automated tests or monitoring did you set up to ensure it never happens again?'
  });

  questions.push({
    id: 5,
    category: 'Applied Problem Solving & Debugging',
    difficulty: 'Medium',
    question: 'If a critical background job processing records fails midway through a batch of 100,000 items, how do you design recovery without creating duplicate data?',
    suggestedFollowUp: 'How do you handle unprocessable or corrupt payloads that fail repeatedly?'
  });

  questions.push({
    id: 6,
    category: 'Applied Problem Solving & Debugging',
    difficulty: isSenior ? 'Lead / Principal' : 'Advanced',
    question: `If you need to refactor a mission-critical legacy module while traffic is growing rapidly, what is your phased migration plan?`,
    suggestedFollowUp: 'How do you verify data consistency between the old and new services before full cutover?'
  });

  // ==========================================
  // Category 3: System Design & Scalability (2 Questions)
  // ==========================================
  questions.push({
    id: 7,
    category: 'System Design & Scalability',
    difficulty: isSenior ? 'Lead / Principal' : 'Advanced',
    question: `How would you design a real-time notification engine for ${role} that reliably dispatches alerts over WebSockets and email?`,
    suggestedFollowUp: 'How do you handle connection storms when thousands of users reconnect at the same time?'
  });

  questions.push({
    id: 8,
    category: 'System Design & Scalability',
    difficulty: 'Advanced',
    question: 'How do you structure multi-tenant data isolation at the database and cache layers while keeping infrastructure costs optimized?',
    suggestedFollowUp: 'How do you protect the system from noisy-neighbor tenants consuming excessive shared resources?'
  });

  // ==========================================
  // Category 4: Behavioral & Leadership (2 Questions)
  // ==========================================
  questions.push({
    id: 9,
    category: 'Behavioral & Leadership',
    difficulty: 'Medium',
    question: 'Tell us about a time you had a strong technical disagreement with a team member on architecture or product scope. How did you resolve it?',
    suggestedFollowUp: 'How did you keep the team aligned once the final decision was made?'
  });

  questions.push({
    id: 10,
    category: 'Behavioral & Leadership',
    difficulty: isSenior ? 'Lead / Principal' : 'Medium',
    question: `How do you mentor engineers, conduct constructive code reviews, and help the team maintain high sprint velocity?`,
    suggestedFollowUp: 'What steps do you take when team deliverables are falling behind schedule?'
  });

  return {
    candidateName,
    role,
    skills,
    experienceYears,
    interviewRound,
    totalQuestions: questions.length,
    generatedAt: new Date().toISOString(),
    questions,
  };
}
