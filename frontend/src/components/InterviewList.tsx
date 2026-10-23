import React, { useState } from 'react';
import type { ScheduledInterview, Candidate } from '../types';
import { downloadICSFile, buildProfessionalInvitationText } from '../services/teamsService';
import { CandidateQuestionsModal } from './CandidateQuestionsModal';
import { isInterviewPast, getInterviewEffectiveStatus } from '../utils/interviewTime';
import {
  Calendar,
  Clock,
  Download,
  Building,
  MapPin,
  Search,
  Trash2,
  Users,
  Copy,
  Check,
  Plus,
  Layers,
  Sparkles,
  Video,
} from './icons';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from './Avatar';

interface InterviewListProps {
  interviews: ScheduledInterview[];
  candidates?: Candidate[];
  onCancelInterview: (id: string) => void;
  onScheduleNew: () => void;
}

export const InterviewList: React.FC<InterviewListProps> = ({
  interviews,
  candidates = [],
  onCancelInterview,
  onScheduleNew,
}) => {
  const { isNeo } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [interviewToDelete, setInterviewToDelete] = useState<ScheduledInterview | null>(null);
  const [selectedInterviewForQuestions, setSelectedInterviewForQuestions] = useState<ScheduledInterview | null>(null);

  const filteredInterviews = interviews.filter((interview) => {
    const matchesSearch =
      interview.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.candidateRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.panelMembers.some((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const effectiveStatus = getInterviewEffectiveStatus(interview);
    const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyInvite = (interview: ScheduledInterview) => {
    const inviteText = buildProfessionalInvitationText(interview);
    navigator.clipboard.writeText(inviteText);
    setCopiedId(interview.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const confirmCancel = () => {
    if (interviewToDelete) {
      onCancelInterview(interviewToDelete.id);
      setInterviewToDelete(null);
    }
  };

  const getCandidateDetails = (interview: ScheduledInterview) => {
    const matched = candidates.find(
      (c) =>
        c.name.toLowerCase() === interview.candidateName.toLowerCase() ||
        c.email.toLowerCase() === interview.candidateEmail.toLowerCase() ||
        c.id === interview.candidateId
    );
    return {
      candidateId: matched?.id,
      skills: matched?.skills || ['System Architecture', 'Core Problem Solving', 'APIs & Databases', 'Reliability'],
      experienceYears: matched?.experienceYears || 4,
      summary: matched?.summary || '',
      experienceRecords: matched?.experienceRecords,
      projectRecords: matched?.projectRecords,
      rawResumeText: matched?.resumeText || '',
      initialQuestions: matched?.generatedQuestions,
    };
  };


  // -------------------------------------------------------------
  // OLD THEME (Modern / 21st.dev Style)
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="space-y-6 pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-21st transition-all">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Scheduled Interviews
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Click on any candidate or the <span className="font-semibold text-emerald-600 dark:text-emerald-400">10 Questions</span> button to view tailored questions based on their JD & Resume.
            </p>
          </div>

          <button
            type="button"
            onClick={onScheduleNew}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-600/25 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Check Availability & Book</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate, room, or panelist..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
            {['all', 'scheduled', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition whitespace-nowrap cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Interview Cards List */}
        {filteredInterviews.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-21st">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-200">No Interviews Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'No interviews match your search and filter criteria.'
                : 'You have not scheduled any panel interviews yet.'}
            </p>
            <button
              onClick={onScheduleNew}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
            >
              Check Panel Availability
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredInterviews.map((interview) => {
              const isCancelled = interview.status === 'cancelled';
              const isPast = isInterviewPast(interview.date, interview.endTime);
              const effectiveStatus = getInterviewEffectiveStatus(interview);
              const isCompleted = effectiveStatus === 'completed';

              return (
                <div
                  key={interview.id}
                  className={`bg-white dark:bg-slate-900/90 border rounded-2xl p-5 shadow-21st transition-all ${
                    isCancelled
                      ? 'border-slate-200/60 dark:border-slate-800/60 opacity-60'
                      : isCompleted
                      ? 'border-slate-200 dark:border-slate-800/90 bg-slate-50/40 dark:bg-slate-900/40'
                      : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Candidate & Interview Type */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 flex-wrap">
                        {/* Candidate Name clickable for Questions */}
                        <button
                          type="button"
                          onClick={() => setSelectedInterviewForQuestions(interview)}
                          className="text-base font-extrabold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 tracking-tight transition flex items-center gap-1.5 cursor-pointer text-left"
                          title="Click to view 10 tailored interview questions"
                        >
                          <span>{interview.candidateName}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700">
                            <Sparkles className="w-2.5 h-2.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                            10 AI Qs
                          </span>
                        </button>

                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{interview.candidateRole}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCancelled
                              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                              : isCompleted
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                          }`}
                        >
                          {isCancelled ? 'CANCELLED' : isCompleted ? (isPast && interview.status !== 'completed' ? 'ENDED' : 'COMPLETED') : 'SCHEDULED'}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{interview.interviewType}</div>

                      {/* Date, Time & Venue */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 pt-1">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-mono">{interview.date}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span className="font-mono">
                            {interview.startTime} – {interview.endTime} ({interview.durationMinutes}m)
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span className="font-bold text-slate-800 dark:text-white">{interview.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Panelists */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-cyan-400" />
                        <span>Panel ({interview.panelMembers.length})</span>
                      </span>
                      <div className="flex items-center -space-x-2 overflow-hidden">
                        {interview.panelMembers.map((member) => (
                          <Avatar
                            key={member.id}
                            name={member.name}
                            avatar={member.avatar}
                            email={member.email}
                            size="md"
                            className="inline-block ring-2 ring-white dark:ring-slate-900 shadow-xs"
                          />
                        ))}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs font-medium">
                        {interview.panelMembers.map((p) => p.name.split(' ')[0]).join(', ')}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      {/* Video Join Button (Google Meet / Teams) */}
                      {(() => {
                        const isTeams = interview.deliveryMode === 'teams-meeting' || interview.provider === 'microsoft' || (interview.meetUrl ? interview.meetUrl.includes('teams.microsoft.com') : false);
                        const targetMeetUrl = interview.meetUrl || (isTeams ? 'https://teams.microsoft.com' : 'https://meet.google.com/new');
                        return isPast || isCancelled ? (
                          <div
                            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed select-none opacity-70"
                            title="Interview time has ended. Meeting room link is closed."
                          >
                            <Video className="w-3.5 h-3.5 text-slate-400" />
                            <span>Meeting Ended</span>
                          </div>
                        ) : (
                          <a
                            href={targetMeetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                              isTeams
                                ? 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            }`}
                            title={`Join Live Online ${isTeams ? 'Microsoft Teams' : 'Google Meet'} Video Meeting`}
                          >
                            <Video className={`w-3.5 h-3.5 ${isTeams ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                            <span>Join {isTeams ? 'Teams' : 'Meet'}</span>
                          </a>
                        );
                      })()}

                      {/* 10 AI Questions Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedInterviewForQuestions(interview)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 transition cursor-pointer shadow-xs"
                        title="View 10 Tailored Questions"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>10 Qs</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyInvite(interview)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        title="Copy Interview Details"
                      >
                        {copiedId === interview.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Details</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadICSFile(interview)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        title="Download .ICS Calendar File"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>.ICS</span>
                      </button>

                      {!isCancelled && !isPast && (
                        <button
                          type="button"
                          onClick={() => setInterviewToDelete(interview)}
                          className="p-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30 transition cursor-pointer"
                          title="Cancel Interview"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Footer notes */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>Location: {interview.buildingFloor || 'Main Campus'}</span>
                    </div>
                    <div>
                      Candidate: {interview.candidateEmail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* In-Page Delete / Cancellation Confirmation Modal (Modern Style) */}
        {interviewToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-900 dark:text-slate-100 space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cancel Interview?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This action will free up all panel calendar slots.
                  </p>
                </div>
              </div>

              {/* Target preview */}
              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1.5 text-xs">
                <p>
                  <span className="text-slate-400">Candidate:</span>{' '}
                  <strong className="font-bold text-slate-900 dark:text-white">{interviewToDelete.candidateName}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Role:</span>{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">{interviewToDelete.candidateRole}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Schedule:</span>{' '}
                  <span className="font-mono">{interviewToDelete.date} ({interviewToDelete.startTime} - {interviewToDelete.endTime})</span>
                </p>
                <p>
                  <span className="text-slate-400">Venue:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{interviewToDelete.location}</span>
                </p>
              </div>

              <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
                Are you sure you want to cancel this interview? The room reservation and calendar blocks will be released.
              </p>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInterviewToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Keep Interview
                </button>

                <button
                  type="button"
                  onClick={confirmCancel}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm cursor-pointer"
                >
                  Yes, Cancel Interview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 10 AI Questions Modal */}
        {selectedInterviewForQuestions && (() => {
          const details = getCandidateDetails(selectedInterviewForQuestions);
          return (
            <CandidateQuestionsModal
              isOpen={true}
              onClose={() => setSelectedInterviewForQuestions(null)}
              candidateId={details.candidateId}
              candidateName={selectedInterviewForQuestions.candidateName}
              role={selectedInterviewForQuestions.candidateRole}
              skills={details.skills}
              experienceYears={details.experienceYears}
              interviewRound={selectedInterviewForQuestions.interviewType}
              location={selectedInterviewForQuestions.location}
              summary={details.summary}
              experienceRecords={details.experienceRecords}
              projectRecords={details.projectRecords}
              rawResumeText={details.rawResumeText}
              initialQuestions={details.initialQuestions}
            />
          );
        })()}

      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW THEME (Neo-Brutalism High-Contrast Style)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Bar with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-wider uppercase">
            SCHEDULED INTERVIEWS ({filteredInterviews.length})
          </h1>
          <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#FACC15] text-black border-2 border-black shadow-[1px_1px_0px_0px_#000]">
            10 AI QUESTIONS ENABLED
          </span>
        </div>

        {/* Search input with border-2 border-black */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-black dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate, role, venue, panel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 pl-9 pr-3 py-2 text-xs font-mono text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-[#FEF9C3] dark:focus:bg-slate-800 transition"
            />
          </div>

          <button
            type="button"
            onClick={onScheduleNew}
            className="p-2 bg-[#FACC15] hover:bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition shrink-0 cursor-pointer"
            title="Schedule New Interview"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {['all', 'scheduled', 'completed', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 text-xs font-black uppercase tracking-wider border-2 border-black dark:border-slate-700 transition cursor-pointer ${
              statusFilter === status
                ? 'bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_#000]'
                : 'bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-slate-100'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Interview Cards List */}
      {filteredInterviews.length === 0 ? (
        <div className="bg-white dark:bg-[#111726] border-2 border-black dark:border-slate-700 p-12 text-center shadow-[4px_4px_0px_0px_#000]">
          <h3 className="text-base font-black uppercase tracking-wider text-black dark:text-white">
            No Scheduled Interviews Found
          </h3>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-2 max-w-sm mx-auto mb-4">
            No interviews currently match the specified filters. Check panel availability to schedule a new interview.
          </p>
          <button
            onClick={onScheduleNew}
            className="px-4 py-2 bg-[#FACC15] hover:bg-yellow-400 text-black font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
          >
            Schedule Interview
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInterviews.map((interview, index) => {
            const isCancelled = interview.status === 'cancelled';
            const isPast = isInterviewPast(interview.date, interview.endTime);
            const effectiveStatus = getInterviewEffectiveStatus(interview);
            const isCompleted = effectiveStatus === 'completed';

            return (
              <div
                key={interview.id}
                className={`bg-white dark:bg-[#111726] border-2 border-black dark:border-slate-700 shadow-[4px_4px_0px_0px_#000] p-4 transition-all relative ${
                  isCancelled
                    ? 'border-l-6 border-l-red-500 opacity-70'
                    : isCompleted
                    ? 'border-l-6 border-l-slate-400 opacity-80'
                    : 'border-l-6 border-l-emerald-500'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Index Box + Candidate Details */}
                  <div className="flex items-start sm:items-center space-x-3.5">
                    <div
                      className={`w-10 h-10 border-2 border-black flex items-center justify-center font-black text-xs shrink-0 shadow-[1px_1px_0px_0px_#000] ${
                        index === 0 && !isCancelled && !isCompleted
                          ? 'bg-[#FACC15] text-black'
                          : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-white'
                      }`}
                    >
                      #{index + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        {/* Clickable candidate name */}
                        <button
                          type="button"
                          onClick={() => setSelectedInterviewForQuestions(interview)}
                          className="font-black text-sm sm:text-base text-black dark:text-white hover:text-amber-500 tracking-wide uppercase flex items-center gap-1.5 cursor-pointer text-left"
                          title="Click to view 10 AI Questions"
                        >
                          <span>{interview.candidateName}</span>
                          <span className="bg-[#FACC15] text-black border border-black text-[9px] px-1.5 py-0.5 font-black shadow-[1px_1px_0px_0px_#000] flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 stroke-[3]" />
                            <span>10 Qs</span>
                          </span>
                        </button>

                        {/* Status Tag Pill */}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                            isCancelled
                              ? 'bg-red-50 text-red-800 border-red-500 dark:bg-red-950 dark:text-red-300'
                              : isCompleted
                              ? 'bg-slate-100 text-slate-800 border-slate-500 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {isCancelled ? 'CANCELLED' : isCompleted ? (isPast && interview.status !== 'completed' ? 'ENDED' : 'COMPLETED') : 'SCHEDULED'}
                        </span>

                        <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-black dark:border-slate-700">
                          {interview.interviewType}
                        </span>
                      </div>

                      {/* Details line */}
                      <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        Role: <strong className="text-black dark:text-white font-bold">{interview.candidateRole}</strong> • {interview.date} ({interview.startTime} - {interview.endTime}) • <span className="text-emerald-700 dark:text-emerald-400 font-bold">{interview.location} ({interview.buildingFloor || '4th Floor'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics + Square Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
                    {/* Micro Attribute Columns */}
                    <div className="hidden sm:flex items-center space-x-3 text-right font-mono text-[11px]">
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">PANEL</div>
                        <div className="font-black text-black dark:text-white">{interview.panelMembers.length}/3</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">VENUE</div>
                        <div className="font-black text-emerald-600 dark:text-emerald-400">CONFIRMED</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">DURATION</div>
                        <div className="font-black text-blue-600 dark:text-blue-400">{interview.durationMinutes}m</div>
                      </div>
                    </div>

                    {/* Square Action Buttons with 2px Black Border */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {/* Video Join Button (Google Meet / Teams) */}
                      {(() => {
                        const isTeams = interview.deliveryMode === 'teams-meeting' || interview.provider === 'microsoft' || (interview.meetUrl ? interview.meetUrl.includes('teams.microsoft.com') : false);
                        const targetMeetUrl = interview.meetUrl || (isTeams ? 'https://teams.microsoft.com' : 'https://meet.google.com/new');
                        return isPast || isCancelled ? (
                          <div
                            className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-2 border-slate-400 dark:border-slate-600 font-black text-xs uppercase flex items-center gap-1 cursor-not-allowed select-none opacity-60"
                            title="Interview time has ended. Meeting room link is closed."
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>MEETING ENDED</span>
                          </div>
                        ) : (
                          <a
                            href={targetMeetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-2.5 py-1.5 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer font-black text-xs uppercase flex items-center gap-1 ${
                              isTeams ? 'bg-[#BAE6FD] hover:bg-[#7DD3FC]' : 'bg-[#A7F3D0] hover:bg-[#6EE7B7]'
                            }`}
                            title={`Join Online ${isTeams ? 'Microsoft Teams' : 'Google Meet'} Meeting`}
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>JOIN {isTeams ? 'TEAMS' : 'MEET'}</span>
                          </a>
                        );
                      })()}

                      {/* 10 AI Questions button */}
                      <button
                        type="button"
                        onClick={() => setSelectedInterviewForQuestions(interview)}
                        className="px-2.5 py-1.5 bg-[#FACC15] hover:bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer font-black text-xs uppercase flex items-center gap-1"
                        title="View 10 Tailored Questions"
                      >
                        <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>10 Qs</span>
                      </button>

                      {/* Copy details */}
                      <button
                        type="button"
                        onClick={() => handleCopyInvite(interview)}
                        className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 border-2 border-black dark:border-slate-700 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
                        title="Copy Interview Invitation"
                      >
                        {copiedId === interview.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {/* Download .ICS */}
                      <button
                        type="button"
                        onClick={() => downloadICSFile(interview)}
                        className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-black dark:text-white border-2 border-black dark:border-slate-700 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
                        title="Download .ICS Calendar File"
                      >
                        <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </button>

                      {/* Cancel Interview - Opens in-page confirmation */}
                      {!isCancelled && !isPast && (
                        <button
                          type="button"
                          onClick={() => setInterviewToDelete(interview)}
                          className="p-2 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 border-2 border-black dark:border-slate-700 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
                          title="Cancel Interview"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Panel Attendees row */}
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-black dark:text-white">Panelists:</span>
                    <div className="flex items-center space-x-1.5">
                      {interview.panelMembers.map((member) => (
                        <span
                          key={member.id}
                          className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-black dark:border-slate-700 text-[10px] font-bold text-black dark:text-white"
                        >
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong className="text-black dark:text-white">{interview.interviewType}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-Page Delete / Cancellation Confirmation Modal */}
      {interviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111726] border-3 border-black dark:border-slate-700 max-w-md w-full p-6 shadow-[8px_8px_0px_0px_#000] relative text-black dark:text-white space-y-4 font-mono">
            <div className="flex items-center space-x-3 pb-3 border-b-2 border-black dark:border-slate-700">
              <div className="w-9 h-9 bg-red-100 dark:bg-red-950/80 border-2 border-red-600 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-black dark:text-white">
                  CANCEL INTERVIEW?
                </h3>
                <p className="text-[11px] text-slate-500">
                  This action will release the room reservation.
                </p>
              </div>
            </div>

            {/* Target interview details preview */}
            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-3.5 space-y-1.5 text-xs">
              <p>
                <span className="text-slate-500 uppercase">CANDIDATE:</span>{' '}
                <strong className="font-bold text-black dark:text-white">{interviewToDelete.candidateName}</strong>
              </p>
              <p>
                <span className="text-slate-500 uppercase">ROLE:</span>{' '}
                <strong className="text-blue-600 dark:text-blue-400">{interviewToDelete.candidateRole}</strong>
              </p>
              <p>
                <span className="text-slate-500 uppercase">SCHEDULE:</span>{' '}
                <span>{interviewToDelete.date} ({interviewToDelete.startTime} - {interviewToDelete.endTime})</span>
              </p>
              <p>
                <span className="text-slate-500 uppercase">VENUE:</span>{' '}
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">{interviewToDelete.location}</span>
              </p>
            </div>

            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed font-bold">
              Are you sure you want to cancel this interview? All panel member calendar slots will be freed.
            </p>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setInterviewToDelete(null)}
                className="px-4 py-2 text-xs font-black uppercase border-2 border-black dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              >
                KEEP INTERVIEW
              </button>

              <button
                type="button"
                onClick={confirmCancel}
                className="px-4 py-2 text-xs font-black uppercase bg-red-600 hover:bg-red-700 text-white border-2 border-black dark:border-slate-700 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
              >
                YES, CANCEL INTERVIEW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10 AI Questions Modal */}
      {selectedInterviewForQuestions && (() => {
        const details = getCandidateDetails(selectedInterviewForQuestions);
        return (
          <CandidateQuestionsModal
            isOpen={true}
            onClose={() => setSelectedInterviewForQuestions(null)}
            candidateId={details.candidateId}
            candidateName={selectedInterviewForQuestions.candidateName}
            role={selectedInterviewForQuestions.candidateRole}
            skills={details.skills}
            experienceYears={details.experienceYears}
            interviewRound={selectedInterviewForQuestions.interviewType}
            location={selectedInterviewForQuestions.location}
            summary={details.summary}
            experienceRecords={details.experienceRecords}
            projectRecords={details.projectRecords}
            rawResumeText={details.rawResumeText}
            initialQuestions={details.initialQuestions}
          />
        );
      })()}

    </div>
  );
};
