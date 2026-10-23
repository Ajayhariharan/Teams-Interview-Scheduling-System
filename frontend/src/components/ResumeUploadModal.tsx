import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Upload, FileText, X, Sparkles, RefreshCw, AlertCircle } from './icons';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractSuccess: (extractedData: any) => void;
}

export const ResumeUploadModal: React.FC<ResumeUploadModalProps> = ({
  isOpen,
  onClose,
  onExtractSuccess,
}) => {
  const { isNeo } = useTheme();
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState('Senior Full Stack Engineer');
  const [department, setDepartment] = useState('General Engineering');
  const [candidateNameInput, setCandidateNameInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a resume file (PDF, DOCX, or TXT).');
      return;
    }

    setIsExtracting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_role', targetRole);
      formData.append('department', department);
      if (candidateNameInput.trim()) {
        formData.append('candidate_name', candidateNameInput.trim());
      }

      const res = await fetch('http://localhost:8000/api/ats/parse-preview', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Extraction failed' }));
        throw new Error(data.detail || 'Resume extraction failed');
      }

      const data = await res.json();
      onExtractSuccess(data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to extract resume details.');
    } finally {
      setIsExtracting(false);
    }
  };

  // -------------------------------------------------------------
  // MODERN THEME
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-slate-100 transition-all">
          <button
            type="button"
            onClick={onClose}
            disabled={isExtracting}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Upload Candidate Resume</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI extraction powered by Gemini 2.5 Flash ATS engine
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center space-x-2 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Role *
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                disabled={isExtracting}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="Senior Full Stack Engineer">Senior Full Stack Engineer</option>
                <option value="Staff Backend Engineer">Staff Backend Engineer</option>
                <option value="Senior Frontend Engineer">Senior Frontend Engineer</option>
                <option value="Principal Cloud Architect">Principal Cloud Architect</option>
                <option value="Data Engineer & Analytics">Data Engineer & Analytics</option>
                <option value="Product Design Lead">Product Design Lead</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={isExtracting}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Candidate Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-detect from resume"
                  value={candidateNameInput}
                  onChange={(e) => setCandidateNameInput(e.target.value)}
                  disabled={isExtracting}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            {/* Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Resume Document (PDF, DOCX, TXT) *
              </label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !isExtracting && document.getElementById('sug-resume-file-input')?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <input
                  id="sug-resume-file-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isExtracting}
                />
                {file ? (
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB • Ready to extract</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mb-1">
                      <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Click to browse or drag & drop resume
                    </p>
                    <p className="text-[11px] text-slate-500">Supports PDF, DOCX, TXT files up to 15MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isExtracting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isExtracting || !file}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting Details (AI)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract & Preview Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEO-BRUTALISM THEME
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
      <div className="bg-white dark:bg-[#111726] border-4 border-black dark:border-white max-w-lg w-full p-6 shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#fff] relative text-black dark:text-white font-mono">
        <button
          type="button"
          onClick={onClose}
          disabled={isExtracting}
          className="absolute top-4 right-4 p-1 border-2 border-black bg-red-500 text-white font-black hover:bg-red-600 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 pb-3 mb-4 border-b-2 border-black dark:border-white">
          <div className="w-8 h-8 bg-yellow-300 border-2 border-black flex items-center justify-center text-black font-black">
            <Upload className="w-4 h-4 stroke-[3]" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wider">
              UPLOAD RESUME (ATS AI)
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
              GEMINI 2.5 FLASH AI PARSING PIPELINE
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-3 p-2 bg-red-100 text-red-900 border-2 border-red-600 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-black uppercase mb-1">
              TARGET ROLE *
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              disabled={isExtracting}
              className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-white p-2 text-xs font-mono text-black dark:text-white focus:bg-[#FEF9C3]"
            >
              <option value="Senior Full Stack Engineer">Senior Full Stack Engineer</option>
              <option value="Staff Backend Engineer">Staff Backend Engineer</option>
              <option value="Senior Frontend Engineer">Senior Frontend Engineer</option>
              <option value="Principal Cloud Architect">Principal Cloud Architect</option>
              <option value="Data Engineer & Analytics">Data Engineer & Analytics</option>
              <option value="Product Design Lead">Product Design Lead</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-black uppercase mb-1">
                DEPARTMENT
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={isExtracting}
                className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-white p-2 text-xs font-mono text-black dark:text-white focus:bg-[#FEF9C3]"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1">
                NAME (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="Auto-detect"
                value={candidateNameInput}
                onChange={(e) => setCandidateNameInput(e.target.value)}
                disabled={isExtracting}
                className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-white p-2 text-xs font-mono text-black dark:text-white focus:bg-[#FEF9C3]"
              />
            </div>
          </div>

          {/* Dropzone */}
          <div>
            <label className="block text-xs font-black uppercase mb-1">
              RESUME FILE *
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isExtracting && document.getElementById('sug-resume-file-neo')?.click()}
              className={`border-2 border-dashed p-5 text-center cursor-pointer transition ${
                isDragOver
                  ? 'bg-yellow-200 border-black'
                  : 'bg-slate-50 dark:bg-slate-900 border-black dark:border-white hover:bg-yellow-50 dark:hover:bg-slate-800'
              }`}
            >
              <input
                id="sug-resume-file-neo"
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={handleFileChange}
                disabled={isExtracting}
              />
              {file ? (
                <div className="flex flex-col items-center space-y-1">
                  <FileText className="w-6 h-6 text-black dark:text-white" />
                  <p className="text-xs font-black text-black dark:text-white">{file.name}</p>
                  <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB • READY</p>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-1">
                  <Upload className="w-6 h-6 text-black dark:text-white mb-1" />
                  <p className="text-xs font-black uppercase text-black dark:text-white">
                    CLICK TO BROWSE OR DRAG RESUME
                  </p>
                  <p className="text-[10px] text-slate-500">PDF, DOCX, TXT UP TO 15MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isExtracting || !file}
              className="w-full py-3 bg-[#FACC15] hover:bg-yellow-400 text-black font-black uppercase tracking-wider text-xs border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>EXTRACTING DETAILS WITH GEMINI AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>EXTRACT & PREVIEW DETAILS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
