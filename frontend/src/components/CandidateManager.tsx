import React, { useState } from 'react';
import type { Candidate } from '../types';
import {
  UserCheck,
  Search,
  Calendar,
  Upload,
  Sparkles,
  FileText,
  Trash2,
  AlertTriangle,
} from './icons';
import { useTheme } from '../context/ThemeContext';
import { ResumeUploadModal } from './ResumeUploadModal';
import { ResumePreviewEditorModal } from './ResumePreviewEditorModal';
import { CandidateQuestionsModal } from './CandidateQuestionsModal';

interface CandidateManagerProps {
  candidates: Candidate[];
  onAddCandidate: (candidate: Candidate) => void;
  onDeleteCandidate?: (candidateId: string) => void;
  onSelectCandidateForSchedule: (candidateId: string) => void;
}

export const CandidateManager: React.FC<CandidateManagerProps> = ({
  candidates,
  onAddCandidate,
  onDeleteCandidate,
  onSelectCandidateForSchedule,
}) => {
  const { isNeo } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  // Active extracted data for preview/editor modal
  const [activeExtractedData, setActiveExtractedData] = useState<any>(null);

  // Active candidate for questions modal
  const [activeCandidateForQuestions, setActiveCandidateForQuestions] = useState<Candidate | null>(null);

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleResumeExtractSuccess = (extractedData: any) => {
    setActiveExtractedData(extractedData);
    setIsPreviewModalOpen(true);
  };

  const handleSaveFromPreview = (candidate: Candidate, openQuestionsImmediately: boolean = false) => {
    onAddCandidate(candidate);
    setIsPreviewModalOpen(false);

    if (openQuestionsImmediately) {
      setActiveCandidateForQuestions(candidate);
      setIsQuestionsModalOpen(true);
    }
  };

  const handleViewCandidateResume = (candidate: Candidate) => {
    setActiveExtractedData({
      id: candidate.id,
      candidate_name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      position: candidate.position,
      department: candidate.department,
      experience_years: candidate.experienceYears,
      current_stage: candidate.currentStage,
      ats_score: candidate.atsScore || 90.0,
      summary: candidate.summary || '',
      experience_records: candidate.experienceRecords || [],
      project_records: candidate.projectRecords || [],
      education_records: candidate.educationRecords || [],
      skills_list: candidate.skills || [],
      certifications: candidate.certifications || [],
      achievements: candidate.achievements || [],
      outliers: candidate.outliers || [],
      filename: candidate.resumeFileName || 'resume.pdf',
      raw_text: candidate.resumeText || '',
    });
    setIsPreviewModalOpen(true);
  };

  const handleOpenQuestionsForCandidate = (candidate: Candidate) => {
    setActiveCandidateForQuestions(candidate);
    setIsQuestionsModalOpen(true);
  };

  const confirmDeleteCandidate = () => {
    if (deleteCandidateId && onDeleteCandidate) {
      onDeleteCandidate(deleteCandidateId);
    }
    setDeleteCandidateId(null);
  };

  const candidateToDelete = candidates.find((c) => c.id === deleteCandidateId);

  // -------------------------------------------------------------
  // MODERN THEME
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-21st transition-all">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Candidate Pipeline
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add candidates by uploading resumes with AI extraction, tailored interview questions, and panel scheduling.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-600/25 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Resume</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, position, or skill..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition"
          />
        </div>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-21st hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Candidate Name & Delete Trigger */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {candidate.name}
                    </h3>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                      {candidate.position}
                    </p>
                  </div>

                  {onDeleteCandidate && (
                    <button
                      type="button"
                      onClick={() => setDeleteCandidateId(candidate.id)}
                      className="text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer shrink-0"
                      title="Delete candidate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {candidate.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3 Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenQuestionsForCandidate(candidate)}
                    className="flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>10 AI Questions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewCandidateResume(candidate)}
                    className="flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Resume</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCandidateForSchedule(candidate.id)}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Check Panel Availability</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteCandidateId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-900 dark:text-slate-100">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Delete Candidate Profile</h3>
                  <p className="text-xs text-slate-500">Confirm candidate removal</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">
                Are you sure you want to remove <strong>{candidateToDelete?.name || 'this candidate'}</strong>? This candidate will be deleted from your dashboard and local database.
              </p>

              <div className="flex items-center justify-end space-x-2 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteCandidateId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteCandidate}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition shadow-sm cursor-pointer"
                >
                  Delete Candidate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resume Upload Modal */}
        <ResumeUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onExtractSuccess={handleResumeExtractSuccess}
        />

        {/* Resume Preview & Editor Modal */}
        {isPreviewModalOpen && activeExtractedData && (
          <ResumePreviewEditorModal
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            extractedData={activeExtractedData}
            onSaveCandidate={handleSaveFromPreview}
          />
        )}

        {/* 10 AI Questions Modal */}
        {isQuestionsModalOpen && activeCandidateForQuestions && (
          <CandidateQuestionsModal
            isOpen={isQuestionsModalOpen}
            onClose={() => setIsQuestionsModalOpen(false)}
            candidateId={activeCandidateForQuestions.id}
            candidateName={activeCandidateForQuestions.name}
            role={activeCandidateForQuestions.position}
            skills={activeCandidateForQuestions.skills}
            experienceYears={activeCandidateForQuestions.experienceYears}
            interviewRound={activeCandidateForQuestions.currentStage}
            summary={activeCandidateForQuestions.summary}
            experienceRecords={activeCandidateForQuestions.experienceRecords}
            projectRecords={activeCandidateForQuestions.projectRecords}
            rawResumeText={activeCandidateForQuestions.resumeText}
            initialQuestions={activeCandidateForQuestions.generatedQuestions}
            onQuestionsUpdated={(candId, newQs) => {
              const current = candidates.find((c) => c.id === candId);
              if (current) {
                const updated = { ...current, generatedQuestions: newQs };
                onAddCandidate(updated);
                setActiveCandidateForQuestions(updated);
              }
            }}
          />
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEO-BRUTALISM THEME
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-16 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-black dark:border-white p-5 bg-white dark:bg-[#111726] shadow-[4px_4px_0px_0px_#000]">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-wider uppercase">
            CANDIDATE PIPELINE ({filteredCandidates.length})
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            ADD CANDIDATES VIA RESUME UPLOAD • 10 CUSTOM QUESTIONS • PANEL AVAILABILITY
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase bg-blue-500 hover:bg-blue-400 text-white border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 stroke-[3]" />
            <span>UPLOAD RESUME</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-black dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by name, position, or skill..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 pl-9 pr-4 py-2 text-xs font-mono text-black dark:text-white placeholder:text-slate-400 focus:outline-none focus:bg-[#FEF9C3] transition"
        />
      </div>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCandidates.map((candidate) => (
          <div
            key={candidate.id}
            className="bg-white dark:bg-[#111726] border-2 border-black dark:border-slate-700 p-5 shadow-[4px_4px_0px_0px_#000] flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Candidate Name & Delete */}
              <div className="flex items-start justify-between pb-2 border-b-2 border-black dark:border-slate-700">
                <div>
                  <h3 className="font-black text-base uppercase text-black dark:text-white">{candidate.name}</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">{candidate.position}</p>
                </div>

                {onDeleteCandidate && (
                  <button
                    type="button"
                    onClick={() => setDeleteCandidateId(candidate.id)}
                    className="p-1.5 border border-black bg-red-100 hover:bg-red-200 text-red-700 cursor-pointer shrink-0"
                    title="Delete Candidate"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {candidate.skills.map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-black dark:border-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* 3 Action Buttons */}
            <div className="mt-4 pt-3 border-t-2 border-black dark:border-slate-700 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenQuestionsForCandidate(candidate)}
                  className="py-2 text-xs font-black uppercase bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black flex items-center justify-center space-x-1.5 cursor-pointer shadow-[2px_2px_0px_0px_#000]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>10 AI Qs</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleViewCandidateResume(candidate)}
                  className="py-2 text-xs font-black uppercase bg-white hover:bg-slate-100 text-black dark:bg-zinc-800 dark:text-white border-2 border-black flex items-center justify-center space-x-1.5 cursor-pointer shadow-[2px_2px_0px_0px_#000]"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>RESUME</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => onSelectCandidateForSchedule(candidate.id)}
                className="w-full py-2.5 text-xs font-black uppercase bg-[#FACC15] hover:bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
              >
                SCHEDULE INTERVIEW
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="bg-white dark:bg-[#111726] border-4 border-black dark:border-white max-w-md w-full p-5 shadow-[8px_8px_0px_0px_#000] text-black dark:text-white">
            <h3 className="text-sm font-black uppercase mb-2 border-b-2 border-black pb-1">
              DELETE CANDIDATE CONFIRMATION
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 my-3">
              Are you sure you want to delete candidate <strong>{candidateToDelete?.name}</strong>? This will remove the profile from your dashboard and local DB.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteCandidateId(null)}
                className="px-3 py-1.5 text-xs font-bold border-2 border-black hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={confirmDeleteCandidate}
                className="px-4 py-1.5 text-xs font-black uppercase bg-red-600 hover:bg-red-700 text-white border-2 border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              >
                DELETE CANDIDATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Upload Modal */}
      <ResumeUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onExtractSuccess={handleResumeExtractSuccess}
      />

      {/* Resume Preview & Editor Modal */}
      {isPreviewModalOpen && activeExtractedData && (
        <ResumePreviewEditorModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          extractedData={activeExtractedData}
          onSaveCandidate={handleSaveFromPreview}
        />
      )}

      {/* 10 AI Questions Modal */}
      {isQuestionsModalOpen && activeCandidateForQuestions && (
        <CandidateQuestionsModal
          isOpen={isQuestionsModalOpen}
          onClose={() => setIsQuestionsModalOpen(false)}
          candidateId={activeCandidateForQuestions.id}
          candidateName={activeCandidateForQuestions.name}
          role={activeCandidateForQuestions.position}
          skills={activeCandidateForQuestions.skills}
          experienceYears={activeCandidateForQuestions.experienceYears}
          interviewRound={activeCandidateForQuestions.currentStage}
          summary={activeCandidateForQuestions.summary}
          experienceRecords={activeCandidateForQuestions.experienceRecords}
          projectRecords={activeCandidateForQuestions.projectRecords}
          rawResumeText={activeCandidateForQuestions.resumeText}
          initialQuestions={activeCandidateForQuestions.generatedQuestions}
          onQuestionsUpdated={(candId, newQs) => {
            const current = candidates.find((c) => c.id === candId);
            if (current) {
              const updated = { ...current, generatedQuestions: newQs };
              onAddCandidate(updated);
              setActiveCandidateForQuestions(updated);
            }
          }}
        />
      )}
    </div>
  );
};
