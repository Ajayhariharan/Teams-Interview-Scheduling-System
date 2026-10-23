import React, { useState } from 'react';
import type { ScheduledInterview } from '../types';
import { downloadICSFile, buildProfessionalInvitationText, buildProfessionalEmailSubject } from '../services/teamsService';
import {
  CheckCircle,
  Copy,
  Download,
  Mail,
  Building,
  MapPin,
  X,
  Users,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Video,
} from './icons';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from './Avatar';

interface BookingConfirmationModalProps {
  interview: ScheduledInterview | null;
  isOpen: boolean;
  onClose: () => void;
  onViewInterviews: () => void;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  interview,
  isOpen,
  onClose,
  onViewInterviews,
}) => {
  const { isNeo } = useTheme();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  if (!isOpen || !interview) return null;

  const isOnline = !!interview.meetUrl;
  const isTeams = interview.deliveryMode === 'teams-meeting' || interview.provider === 'microsoft' || (interview.meetUrl ? interview.meetUrl.includes('teams.microsoft.com') : false);
  const meetTitle = isTeams ? 'Microsoft Teams' : 'Google Meet';

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // -------------------------------------------------------------
  // OLD THEME (Modern / 21st.dev Style)
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative text-slate-900 dark:text-slate-100 transition-all">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="p-6 sm:p-7 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-emerald-50/60 to-transparent dark:from-emerald-950/30">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10 shrink-0">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    {isOnline ? `${meetTitle} Video Interview Confirmed!` : 'In-Person Interview Confirmed!'}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isOnline
                      ? (isTeams
                          ? 'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30'
                          : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30')
                      : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                  }`}>
                    {isOnline ? (isTeams ? 'Teams Video' : 'Meet Video') : 'Offline'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Panel members' availability verified and {isOnline ? `${meetTitle} calendar link` : 'calendar invitations'} generated.
                </p>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 sm:p-7 space-y-5">
            {/* Main Details Card */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3.5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Candidate</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{interview.candidateName}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{interview.candidateRole} • {interview.candidateEmail}</p>
                </div>
                <div className="sm:text-right">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Round</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{interview.interviewType}</p>
                </div>
              </div>

              {/* Date and Time Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="text-slate-400">Date: </span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{interview.date}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <div>
                    <span className="text-slate-400">Time: </span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {interview.startTime} – {interview.endTime} ({interview.durationMinutes}m)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Meeting Box (if online) */}
            {isOnline && interview.meetUrl && (
              <div className={`p-4 rounded-2xl space-y-2.5 border ${
                isTeams
                  ? 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-200 dark:border-sky-500/30'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Video className={`w-4 h-4 ${isTeams ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isTeams ? 'text-sky-800 dark:text-sky-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                      {meetTitle} Video Call
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(interview.meetUrl || '', 'meetUrl')}
                    className={`flex items-center space-x-1 text-xs font-semibold hover:underline transition cursor-pointer ${
                      isTeams ? 'text-sky-700 dark:text-sky-400' : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {copiedField === 'meetUrl' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'meetUrl' ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs">
                  <div className="truncate">
                    <p className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">{interview.meetUrl}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{interview.buildingFloor || (isTeams ? 'Microsoft 365 Cloud' : 'Google Workspace Online')}</p>
                  </div>
                  <a
                    href={interview.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isTeams
                        ? 'bg-sky-600 hover:bg-sky-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join {isTeams ? 'Teams' : 'Meet'}</span>
                  </a>
                </div>
              </div>
            )}

            {/* Offline Venue Box (if physical) */}
            {!isOnline && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Offline Venue & Room
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(`${interview.location}, ${interview.buildingFloor || ''}`, 'venue')}
                    className="flex items-center space-x-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline transition cursor-pointer"
                  >
                    {copiedField === 'venue' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'venue' ? 'Copied' : 'Copy Venue'}</span>
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3.5 border border-emerald-200 dark:border-slate-800 flex items-center space-x-3 shadow-xs">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{interview.location}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{interview.buildingFloor || 'Main HQ Campus'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Panel Members Attending */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Attending Panel Members ({interview.panelMembers.length} Available)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {interview.panelMembers.map((member) => (
                  <div key={member.id} className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex items-center space-x-2.5">
                    <Avatar
                      name={member.name}
                      avatar={member.avatar}
                      email={member.email}
                      size="md"
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{member.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Download ICS & Toggle Email Preview */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                onClick={() => downloadICSFile(interview)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download .ICS Calendar Invite</span>
              </button>

              <button
                onClick={() => setShowEmailPreview(!showEmailPreview)}
                className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{showEmailPreview ? 'Hide Email Preview' : 'View Email Invitation Preview'}</span>
              </button>
            </div>

            {/* Email Preview Section */}
            {showEmailPreview && (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-700 dark:text-slate-300 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="text-slate-500 dark:text-slate-400">
                    <strong>To:</strong> {interview.candidateEmail}, {interview.panelMembers.map(p => p.email).join(', ')}
                  </div>
                  <button
                    onClick={() => handleCopy(buildProfessionalInvitationText(interview), 'emailInvite')}
                    className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {copiedField === 'emailInvite' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'emailInvite' ? 'Copied' : 'Copy Full Invite'}</span>
                  </button>
                </div>
                <div className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <strong>Subject:</strong> {buildProfessionalEmailSubject(interview)}
                </div>
                <div className="pt-1 whitespace-pre-line leading-relaxed font-sans text-xs bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 select-all">
                  {buildProfessionalInvitationText(interview)}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Check Another Slot
            </button>

            <button
              onClick={() => {
                onClose();
                onViewInterviews();
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-500 transition shadow-md cursor-pointer"
            >
              View Scheduled Interviews
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW THEME (Neo-Brutalism High-Contrast Style)
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#111726] border-3 border-black dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[8px_8px_0px_0px_#000] relative text-black dark:text-white transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 border-2 border-black dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-slate-100 transition shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 border-b-2 border-black dark:border-slate-700 bg-[#FEF08A] dark:bg-yellow-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500 border-2 border-black flex items-center justify-center text-black font-black text-lg shadow-[2px_2px_0px_0px_#000] shrink-0">
              <Check className="w-6 h-6 text-black stroke-[3]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wider uppercase">
                {isOnline ? `${meetTitle.toUpperCase()} VIDEO INTERVIEW CONFIRMED` : 'IN-PERSON INTERVIEW CONFIRMED & SLOTS LOCKED'}
              </h2>
              <p className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                Panel members' availability verified • {isOnline ? `${meetTitle} video link generated.` : 'Physical room invitation generated.'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Main Details Box */}
          <div className="bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-4 space-y-3 font-mono shadow-[3px_3px_0px_0px_#000]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">TARGET CANDIDATE</span>
                <h3 className="text-base font-black uppercase text-black dark:text-white">{interview.candidateName}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">{interview.candidateRole} • {interview.candidateEmail}</p>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] font-black uppercase text-slate-500">INTERVIEW ROUND</span>
                <p className="text-xs font-black uppercase text-black dark:text-white">{interview.interviewType}</p>
              </div>
            </div>

            {/* Date and Time Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-500">DATE:</span>
                <span className="font-black text-black dark:text-white font-mono">{interview.date}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-500">TIME:</span>
                <span className="font-black text-black dark:text-white font-mono">
                  {interview.startTime} – {interview.endTime} ({interview.durationMinutes}m)
                </span>
              </div>
            </div>
          </div>

          {/* Video Meeting Box (if online) */}
          {isOnline && interview.meetUrl && (
            <div className={`border-2 border-black p-4 space-y-2 font-mono shadow-[3px_3px_0px_0px_#000] ${
              isTeams ? 'bg-[#BAE6FD]' : 'bg-[#A7F3D0]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-black">
                  ONLINE {meetTitle.toUpperCase()} MEETING LINK *
                </span>
                <button
                  onClick={() => handleCopy(interview.meetUrl || '', 'meetUrl')}
                  className="text-[10px] font-black uppercase text-black hover:underline cursor-pointer flex items-center gap-1"
                >
                  {copiedField === 'meetUrl' ? (
                    <>
                      <span>COPIED</span>
                      <Check className="w-3 h-3 stroke-[3]" />
                    </>
                  ) : (
                    'COPY LINK'
                  )}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <p className="font-black text-black text-xs truncate max-w-md">{interview.meetUrl}</p>
                <a
                  href={interview.meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-black text-white hover:bg-slate-800 border-2 border-black shadow-[2px_2px_0px_0px_#000] font-black text-xs uppercase flex items-center gap-1 shrink-0"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>JOIN {isTeams ? 'TEAMS' : 'MEET'}</span>
                </a>
              </div>
            </div>
          )}

          {/* Offline Venue & Meeting Room Box (if offline) */}
          {!isOnline && (
            <div className="border-2 border-dashed border-black dark:border-slate-700 p-4 space-y-2 bg-[#FEF9C3] dark:bg-yellow-950/20 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-black dark:text-white">
                  PHYSICAL VENUE & ROOM DETAILS *
                </span>
                <button
                  onClick={() => handleCopy(`${interview.location}, ${interview.buildingFloor || ''}`, 'venue')}
                  className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  {copiedField === 'venue' ? (
                    <>
                      <span>COPIED</span>
                      <Check className="w-3 h-3 stroke-[3]" />
                    </>
                  ) : (
                    'COPY VENUE'
                  )}
                </button>
              </div>

              <div className="text-xs">
                <p className="font-black text-black dark:text-white text-sm">{interview.location}</p>
                <p className="text-slate-600 dark:text-slate-400">{interview.buildingFloor || 'Main HQ Campus'}</p>
              </div>
            </div>
          )}

          {/* Panel Members Attending */}
          <div className="space-y-2 font-mono">
            <span className="text-xs font-black uppercase text-black dark:text-white block">
              ATTENDING PANEL MEMBERS ({interview.panelMembers.length} AVAILABLE) *
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {interview.panelMembers.map((member) => (
                <div key={member.id} className="bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-2.5 flex items-center space-x-2 shadow-[2px_2px_0px_0px_#000]">
                  <div className="w-6 h-6 bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-black text-xs shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div className="truncate text-xs">
                    <p className="font-black text-black dark:text-white truncate uppercase">{member.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Download ICS & Toggle Email Preview */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              onClick={() => downloadICSFile(interview)}
              className="px-4 py-2.5 text-xs font-black uppercase font-mono bg-[#FACC15] hover:bg-yellow-400 text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
            >
              DOWNLOAD .ICS CALENDAR INVITE
            </button>

            <button
              onClick={() => setShowEmailPreview(!showEmailPreview)}
              className="text-xs font-mono font-bold text-black dark:text-slate-300 hover:underline uppercase cursor-pointer"
            >
              {showEmailPreview ? 'HIDE EMAIL PREVIEW' : 'VIEW EMAIL PREVIEW'}
            </button>
          </div>

          {/* Email Preview Section */}
          {showEmailPreview && (
            <div className="bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-4 text-xs font-mono text-black dark:text-slate-300 space-y-3">
              <div className="flex items-center justify-between border-b-2 border-black dark:border-slate-700 pb-2">
                <div>
                  <strong>TO:</strong> {interview.candidateEmail}, {interview.panelMembers.map(p => p.email).join(', ')}
                </div>
                <button
                  onClick={() => handleCopy(buildProfessionalInvitationText(interview), 'neoEmailInvite')}
                  className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  {copiedField === 'neoEmailInvite' ? (
                    <>
                      <span>COPIED</span>
                      <Check className="w-3 h-3 stroke-[3]" />
                    </>
                  ) : (
                    'COPY INVITATION'
                  )}
                </button>
              </div>
              <div className="border-b border-black dark:border-slate-700 pb-2">
                <strong>SUBJECT:</strong> {buildProfessionalEmailSubject(interview)}
              </div>
              <div className="pt-2 whitespace-pre-line leading-relaxed text-xs bg-slate-50 dark:bg-slate-950 p-3 border border-black dark:border-slate-700 select-all">
                {buildProfessionalInvitationText(interview)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t-2 border-black dark:border-slate-700 bg-white dark:bg-[#111726] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black uppercase font-mono border-2 border-black dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-[2px_2px_0px_0px_#000] cursor-pointer"
          >
            CHECK ANOTHER SLOT
          </button>

          <button
            onClick={() => {
              onClose();
              onViewInterviews();
            }}
            className="px-5 py-2.5 text-xs font-black uppercase font-mono bg-[#FACC15] hover:bg-yellow-400 text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
          >
            VIEW SCHEDULED INTERVIEWS
          </button>
        </div>
      </div>
    </div>
  );
};
