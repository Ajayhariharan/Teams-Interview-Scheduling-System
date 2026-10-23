import React, { useState, useEffect } from 'react';
import { generateCandidateQuestions, type InterviewQuestion } from '../utils/questionGenerator';
import { CalendarService } from '../services/calendarService';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Copy,
  Check,
  Sparkles,
  Zap,
  RefreshCw,
  ArrowRight,
} from './icons';

interface CandidateQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId?: string;
  candidateName: string;
  role: string;
  skills?: string[];
  experienceYears?: number;
  interviewRound?: string;
  location?: string;
  summary?: string;
  experienceRecords?: any[];
  projectRecords?: any[];
  rawResumeText?: string;
  initialQuestions?: InterviewQuestion[];
  onQuestionsUpdated?: (candidateId: string, questions: InterviewQuestion[]) => void;
}

export const CandidateQuestionsModal: React.FC<CandidateQuestionsModalProps> = ({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  role,
  skills = ['React', 'TypeScript', 'Node.js', 'System Design'],
  experienceYears = 4,
  interviewRound = 'Technical Round',
  location = 'In-Person HQ',
  summary = '',
  experienceRecords,
  projectRecords,
  rawResumeText = '',
  initialQuestions,
  onQuestionsUpdated,
}) => {
  const { isNeo } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize or fetch questions
  useEffect(() => {
    if (!isOpen) return;

    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions);
      return;
    }

    if (candidateId) {
      setIsGenerating(true);
      CalendarService.fetchCandidateQuestions(candidateId)
        .then((data) => {
          if (data?.questions && data.questions.length > 0) {
            setQuestions(data.questions);
            CalendarService.updateCandidateQuestions(candidateId, data.questions);
            onQuestionsUpdated?.(candidateId, data.questions);
          } else {
            const fallback = generateCandidateQuestions(
              candidateName,
              role,
              skills,
              experienceYears,
              interviewRound
            );
            setQuestions(fallback.questions);
            CalendarService.updateCandidateQuestions(candidateId, fallback.questions);
            onQuestionsUpdated?.(candidateId, fallback.questions);
          }
        })
        .catch(() => {
          const fallback = generateCandidateQuestions(
            candidateName,
            role,
            skills,
            experienceYears,
            interviewRound
          );
          setQuestions(fallback.questions);
          CalendarService.updateCandidateQuestions(candidateId, fallback.questions);
          onQuestionsUpdated?.(candidateId, fallback.questions);
        })
        .finally(() => {
          setIsGenerating(false);
        });
    } else {
      const fallback = generateCandidateQuestions(
        candidateName,
        role,
        skills,
        experienceYears,
        interviewRound
      );
      setQuestions(fallback.questions);
    }
  }, [isOpen, candidateId, candidateName, role, skills, experienceYears, interviewRound, initialQuestions]);

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await CalendarService.generateAiQuestions({
        candidateId,
        candidateName,
        role,
        skills,
        experienceYears,
        summary,
        experienceRecords,
        projectRecords,
        rawResumeText,
      });

      if (res?.questions && res.questions.length > 0) {
        setQuestions(res.questions);
        if (candidateId) {
          CalendarService.updateCandidateQuestions(candidateId, res.questions);
          onQuestionsUpdated?.(candidateId, res.questions);
        }
      }
    } catch (err) {
      console.warn('Live AI question generation notice, using synthesized:', err);
      const fallback = generateCandidateQuestions(
        candidateName,
        role,
        skills,
        experienceYears,
        interviewRound
      );
      setQuestions(fallback.questions);
      if (candidateId) {
        CalendarService.updateCandidateQuestions(candidateId, fallback.questions);
        onQuestionsUpdated?.(candidateId, fallback.questions);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: `All Questions (${questions.length})` },
    { id: 'Core Architecture & Depth', label: 'Architecture & Depth' },
    { id: 'Applied Problem Solving & Debugging', label: 'Problem Solving' },
    { id: 'System Design & Scalability', label: 'System Design' },
    { id: 'Behavioral & Leadership', label: 'Behavioral & Fit' },
  ];

  const displayedQuestions = selectedCategory === 'all'
    ? questions
    : questions.filter((q) => q.category === selectedCategory);

  const handleCopySingle = (q: InterviewQuestion) => {
    const text = `Q${q.id} [${q.category}] (${q.difficulty})\nQuestion: ${q.question}${q.suggestedFollowUp ? `\n\nFollow-up: ${q.suggestedFollowUp}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = () => {
    const allText = `========================================
10 INTERVIEW QUESTIONS & FOLLOW-UPS
Candidate: ${candidateName}
Role: ${role} | Exp: ${experienceYears}+ Yrs
Round: ${interviewRound} | Venue: ${location}
========================================

` + questions.map((q) => (
      `Q${q.id}. [${q.category}] (${q.difficulty})
Question: ${q.question}${q.suggestedFollowUp ? `\nFollow-up: ${q.suggestedFollowUp}` : ''}
----------------------------------------`
    )).join('\n\n');

    navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // -------------------------------------------------------------
  // MODERN THEME
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-transparent dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-transparent">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50">
                  <Sparkles className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                  10 Tailored Interview Questions
                </span>
                <span className="text-xs text-slate-400 font-medium">• {interviewRound}</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{candidateName}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({role})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                {skills.slice(0, 5).map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50"
                title="Regenerate questions using Gemini AI"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-emerald-600' : ''}`} />
                <span>{isGenerating ? 'Generating...' : 'Regenerate'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAll}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
                title="Copy all 10 questions to clipboard"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? 'Copied All' : 'Copy All Qs'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="px-6 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-1 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Questions Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-4 max-h-[calc(90vh-190px)] divide-y divide-slate-100 dark:divide-slate-800/60">
            {isGenerating ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Synthesizing concise interview questions based on {candidateName}'s resume...
                </p>
              </div>
            ) : (
              displayedQuestions.map((q) => (
                <div key={q.id} className="pt-4 first:pt-0 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs flex items-center justify-center shrink-0 border border-emerald-300 dark:border-emerald-800">
                        {q.id}
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {q.category}
                          </span>
                          <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {q.difficulty}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                          {q.question}
                        </p>

                        {/* Follow-up Question */}
                        {q.suggestedFollowUp && (
                          <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-start space-x-2 text-xs">
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-700 dark:text-slate-300">Follow-up: </span>
                              <span className="text-slate-600 dark:text-slate-400">{q.suggestedFollowUp}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopySingle(q)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
                      title="Copy question and follow-up"
                    >
                      {copiedId === q.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Conversational panel questions &amp; follow-up probes.</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEO-BRUTALISM THEME
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-hidden transition-all font-mono">
        {/* Header */}
        <div className="px-6 py-4 border-b-4 border-black dark:border-white bg-yellow-300 dark:bg-yellow-400 text-black flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-black text-yellow-300 px-2.5 py-0.5 font-black text-xs uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 stroke-[3]" />
                <span>Panel Interview Qns</span>
              </span>
              <span className="font-mono text-xs font-black">[{interviewRound}]</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight mt-1">
              {candidateName} <span className="text-xs font-bold">/ {role}</span>
            </h2>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {skills.slice(0, 5).map((s, idx) => (
                <span key={idx} className="bg-white text-black border border-black font-bold text-[10px] px-1.5 py-0.2">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="bg-white text-black px-2.5 py-1.5 border-2 border-black font-black text-xs uppercase hover:bg-yellow-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'GEN...' : 'REGEN'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAll}
              className="bg-black text-white px-3 py-1.5 border-2 border-black font-black text-xs uppercase hover:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer flex items-center gap-1.5"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'COPIED' : 'COPY ALL'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-red-500 text-white p-1.5 border-2 border-black font-black hover:bg-red-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="px-6 py-2 bg-zinc-100 dark:bg-zinc-800 border-b-2 border-black dark:border-white flex items-center space-x-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 text-xs font-black uppercase border-2 border-black transition cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:bg-white dark:text-black'
                  : 'bg-white text-black dark:bg-zinc-900 dark:text-white hover:bg-yellow-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Questions Body */}
        <div className="p-5 overflow-y-auto space-y-4 max-h-[calc(90vh-190px)] divide-y-2 divide-black dark:divide-zinc-700">
          {isGenerating ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-black dark:text-white animate-spin" />
              <p className="text-xs font-black uppercase text-black dark:text-white">
                GENERATING CONCISE PANEL QUESTIONS...
              </p>
            </div>
          ) : (
            displayedQuestions.map((q) => (
              <div key={q.id} className="pt-3.5 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <span className="w-7 h-7 bg-black text-white dark:bg-white dark:text-black font-black text-xs flex items-center justify-center border-2 border-black dark:border-white shrink-0">
                      Q{q.id}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white px-1.5 py-0.2 border border-black">
                          {q.category}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-300 text-black px-1.5 py-0.2 border border-black">
                          {q.difficulty}
                        </span>
                      </div>
                      <p className="font-black text-sm mt-1 text-black dark:text-white leading-snug">
                        {q.question}
                      </p>

                      {/* Follow-up Probe */}
                      {q.suggestedFollowUp && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-zinc-800 border-2 border-black text-xs">
                          <span className="font-black uppercase text-amber-700 dark:text-yellow-400">FOLLOW-UP: </span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{q.suggestedFollowUp}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopySingle(q)}
                    className="bg-white dark:bg-zinc-800 text-black dark:text-white border-2 border-black dark:border-white p-1.5 hover:bg-yellow-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer shrink-0"
                    title="Copy question"
                  >
                    {copiedId === q.id ? <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 bg-zinc-200 dark:bg-zinc-800 border-t-4 border-black dark:border-white flex items-center justify-between text-xs font-bold">
          <span>INTERVIEW PANEL SCHEDULER ENGINE</span>
          <button
            type="button"
            onClick={onClose}
            className="bg-black text-white dark:bg-white dark:text-black border-2 border-black px-4 py-1 font-black uppercase hover:bg-zinc-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
