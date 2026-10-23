import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Plus,
  Trash2,
  FileText,
  User,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Award,
  Layers,
} from './icons';
import type { Candidate } from '../types';

interface ResumePreviewEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedData: any;
  onSaveCandidate: (candidate: Candidate, openQuestionsImmediately?: boolean) => void;
}

export const ResumePreviewEditorModal: React.FC<ResumePreviewEditorModalProps> = ({
  isOpen,
  onClose,
  extractedData,
  onSaveCandidate,
}) => {
  const { isNeo } = useTheme();

  const [candidateName, setCandidateName] = useState(extractedData?.candidate_name || 'Candidate Applicant');
  const [email, setEmail] = useState(extractedData?.email || '');
  const [phone, setPhone] = useState(extractedData?.phone || '');
  const [position, setPosition] = useState(extractedData?.position || 'Senior Full Stack Engineer');
  const [department, setDepartment] = useState(extractedData?.department || 'General Engineering');
  const [experienceYears, setExperienceYears] = useState(extractedData?.experience_years || 3.0);
  const [atsScore, setAtsScore] = useState(extractedData?.ats_score || 92.0);
  const [summary, setSummary] = useState(extractedData?.summary || '');

  const [experienceRecords, setExperienceRecords] = useState<any[]>(
    extractedData?.experience_records || [
      {
        title: 'Full Stack Engineer',
        company: 'Software Solutions Inc',
        period: '2023 - Present',
        bullets: ['Architected scalable APIs and interactive UI features.'],
      },
    ]
  );

  const [projectRecords, setProjectRecords] = useState<any[]>(
    extractedData?.project_records || []
  );

  const [educationRecords, setEducationRecords] = useState<any[]>(
    extractedData?.education_records || []
  );

  const [skillsList, setSkillsList] = useState<string[]>(
    extractedData?.skills_list || ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker']
  );

  const [newSkillInput, setNewSkillInput] = useState('');
  const [certifications, setCertifications] = useState<any[]>(extractedData?.certifications || []);
  const [achievements, setAchievements] = useState<string[]>(extractedData?.achievements || []);

  if (!isOpen || !extractedData) return null;

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !skillsList.includes(trimmed)) {
      setSkillsList([...skillsList, trimmed]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
  };

  const handleSave = (openQuestions: boolean = false) => {
    const candidate: Candidate = {
      id: extractedData.id || `cand-${Date.now()}`,
      name: candidateName.trim() || 'Candidate Applicant',
      email: email.trim() || `${candidateName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      phone: phone.trim() || '+1 (555) 000-0000',
      position: position.trim(),
      department: department.trim(),
      experienceYears: Number(experienceYears),
      currentStage: extractedData.current_stage || 'Screening',
      skills: skillsList,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 9000000000)}?w=150&auto=format&fit=crop&q=80`,
      appliedDate: new Date().toISOString().split('T')[0],
      atsScore: Number(atsScore),
      resumeFileName: extractedData.filename || 'resume.pdf',
      resumeText: extractedData.raw_text || '',
      summary: summary.trim(),
      experienceRecords,
      projectRecords,
      educationRecords,
      certifications,
      achievements,
      outliers: extractedData.outliers || [],
    };

    onSaveCandidate(candidate, openQuestions);
    onClose();
  };

  // -------------------------------------------------------------
  // MODERN THEME
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative text-slate-900 dark:text-slate-100 overflow-hidden transition-all">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-950/40">
            <div className="space-y-1.5 flex-1 mr-4">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
                  <Sparkles className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
                  ATS Extracted Master Resume Preview
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  ATS Score: {atsScore}%
                </span>
              </div>

              {/* Editable Name & Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Candidate Name</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full font-bold text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-medium bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs font-medium bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Professional Summary */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Professional Summary</span>
              </div>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Enter or refine professional summary..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
              />
            </div>

            {/* 2. Work Experience */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Work Experience ({experienceRecords.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExperienceRecords([
                      ...experienceRecords,
                      {
                        title: 'Software Engineer',
                        company: 'Company Name',
                        period: '2023 - 2025',
                        bullets: ['Demonstrated core technical responsibilities.'],
                      },
                    ]);
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Role</span>
                </button>
              </div>

              <div className="space-y-3">
                {experienceRecords.map((exp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={exp.title || ''}
                        onChange={(e) => {
                          const updated = [...experienceRecords];
                          updated[idx].title = e.target.value;
                          setExperienceRecords(updated);
                        }}
                        placeholder="Job Title"
                        className="font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 flex-1 text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={exp.period || ''}
                        onChange={(e) => {
                          const updated = [...experienceRecords];
                          updated[idx].period = e.target.value;
                          setExperienceRecords(updated);
                        }}
                        placeholder="Date Range"
                        className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 w-36 text-slate-700 dark:text-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setExperienceRecords(experienceRecords.filter((_, i) => i !== idx));
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={exp.company || ''}
                      onChange={(e) => {
                        const updated = [...experienceRecords];
                        updated[idx].company = e.target.value;
                        setExperienceRecords(updated);
                      }}
                      placeholder="Company Name"
                      className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 w-full"
                    />

                    {/* Bullets */}
                    <div className="space-y-1.5 pt-1">
                      {exp.bullets?.map((b: string, bIdx: number) => (
                        <div key={bIdx} className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={b}
                            onChange={(e) => {
                              const updated = [...experienceRecords];
                              updated[idx].bullets[bIdx] = e.target.value;
                              setExperienceRecords(updated);
                            }}
                            className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 text-slate-700 dark:text-slate-300"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...experienceRecords];
                              updated[idx].bullets = updated[idx].bullets.filter((_: any, bi: number) => bi !== bIdx);
                              setExperienceRecords(updated);
                            }}
                            className="text-slate-400 hover:text-red-500 text-xs px-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...experienceRecords];
                          if (!updated[idx].bullets) updated[idx].bullets = [];
                          updated[idx].bullets.push('Added bullet point.');
                          setExperienceRecords(updated);
                        }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline pt-0.5 cursor-pointer"
                      >
                        + Add Bullet Point
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Projects */}
            {projectRecords.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Projects & Architecture ({projectRecords.length})</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {projectRecords.map((proj, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={proj.title || ''}
                          onChange={(e) => {
                            const updated = [...projectRecords];
                            updated[idx].title = e.target.value;
                            setProjectRecords(updated);
                          }}
                          placeholder="Project Title"
                          className="font-bold text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 flex-1 text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={proj.period || ''}
                          onChange={(e) => {
                            const updated = [...projectRecords];
                            updated[idx].period = e.target.value;
                            setProjectRecords(updated);
                          }}
                          placeholder="Duration"
                          className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 w-32 text-slate-700 dark:text-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Education */}
            {educationRecords.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Education & Qualifications</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {educationRecords.map((edu, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1"
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{edu.degree}</div>
                      <div className="text-[11px] text-slate-500">{edu.institution}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{edu.period} {edu.score ? `• ${edu.score}` : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Skills Matrix */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">
                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Extracted Skills Matrix ({skillsList.length})</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {skillsList.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-slate-400 hover:text-red-500 cursor-pointer ml-1"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Skill Input */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  placeholder="Add skill (e.g. AWS, Python, Kubernetes)..."
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 w-72 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Candidate profile will be saved to persistent database.
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
              >
                Save Candidate
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-600/25 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save & Generate AI Questions</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEO-BRUTALISM THEME
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#111726] border-4 border-black dark:border-white max-w-4xl w-full max-h-[90vh] flex flex-col shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#fff] relative text-black dark:text-white font-mono overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-4 border-black dark:border-white bg-[#FACC15] text-black flex items-start justify-between">
          <div className="flex-1 mr-4">
            <div className="flex items-center space-x-2">
              <span className="bg-black text-white px-2 py-0.5 font-black text-xs uppercase tracking-wider">
                ATS RESUME PREVIEW & EDITOR
              </span>
              <span className="bg-white text-black border-2 border-black px-2 py-0.5 font-black text-xs">
                SCORE: {atsScore}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <div>
                <label className="block text-[10px] font-black uppercase">NAME</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full font-black text-sm bg-white border-2 border-black p-1 text-black focus:bg-yellow-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-bold bg-white border-2 border-black p-1 text-black focus:bg-yellow-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase">PHONE</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs font-bold bg-white border-2 border-black p-1 text-black focus:bg-yellow-100"
                />
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 border-2 border-black bg-red-500 text-white font-black hover:bg-red-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Summary */}
          <div>
            <label className="block text-xs font-black uppercase mb-1">
              PROFESSIONAL SUMMARY
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-2 text-xs font-mono bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 text-black dark:text-white focus:bg-yellow-50"
            />
          </div>

          {/* Experience */}
          <div>
            <div className="flex items-center justify-between border-b-2 border-black dark:border-white pb-1 mb-2">
              <span className="text-xs font-black uppercase">WORK EXPERIENCE ({experienceRecords.length})</span>
              <button
                type="button"
                onClick={() => {
                  setExperienceRecords([
                    ...experienceRecords,
                    {
                      title: 'Role Designation',
                      company: 'Organization Name',
                      period: '2023 - 2025',
                      bullets: ['Key engineering responsibility.'],
                    },
                  ]);
                }}
                className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#FACC15] text-black border-2 border-black cursor-pointer"
              >
                + ADD ROLE
              </button>
            </div>

            <div className="space-y-3">
              {experienceRecords.map((exp, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={exp.title || ''}
                      onChange={(e) => {
                        const updated = [...experienceRecords];
                        updated[idx].title = e.target.value;
                        setExperienceRecords(updated);
                      }}
                      placeholder="Title"
                      className="font-black text-xs bg-white dark:bg-black border-2 border-black p-1 flex-1 text-black dark:text-white"
                    />
                    <input
                      type="text"
                      value={exp.period || ''}
                      onChange={(e) => {
                        const updated = [...experienceRecords];
                        updated[idx].period = e.target.value;
                        setExperienceRecords(updated);
                      }}
                      placeholder="Period"
                      className="text-xs bg-white dark:bg-black border-2 border-black p-1 w-32 text-black dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setExperienceRecords(experienceRecords.filter((_, i) => i !== idx))}
                      className="px-2 py-1 bg-red-500 text-white font-black text-xs border border-black cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="text"
                    value={exp.company || ''}
                    onChange={(e) => {
                      const updated = [...experienceRecords];
                      updated[idx].company = e.target.value;
                      setExperienceRecords(updated);
                    }}
                    placeholder="Company"
                    className="text-xs bg-white dark:bg-black border-2 border-black p-1 w-full text-black dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div>
            <div className="text-xs font-black uppercase border-b-2 border-black dark:border-white pb-1 mb-2">
              SKILLS MATRIX ({skillsList.length})
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {skillsList.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs font-black uppercase bg-yellow-200 text-black border-2 border-black flex items-center space-x-1"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-1 text-red-600 font-black cursor-pointer"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="ADD NEW SKILL..."
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                className="text-xs bg-white dark:bg-slate-900 border-2 border-black p-1 w-64 text-black dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3 py-1 bg-black text-white font-black text-xs uppercase border-2 border-black cursor-pointer"
              >
                + ADD
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-4 border-black dark:border-white bg-slate-200 dark:bg-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border-2 border-black font-black uppercase text-xs bg-white text-black hover:bg-slate-100 cursor-pointer"
          >
            CANCEL
          </button>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2 border-2 border-black font-black uppercase text-xs bg-white text-black hover:bg-yellow-100 cursor-pointer"
            >
              SAVE CANDIDATE
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-4 py-2 border-2 border-black font-black uppercase text-xs bg-[#FACC15] hover:bg-yellow-400 text-black shadow-[3px_3px_0px_0px_#000] cursor-pointer"
            >
              SAVE &amp; GENERATE AI QUESTIONS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
