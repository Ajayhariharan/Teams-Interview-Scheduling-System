import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Candidate, FormattedSlot, PanelMember, ScheduledInterview, AuthUser, CalendarEvent } from '../types';
import { findCommonAvailableSlots } from '../utils/availabilityEngine';
import { DEFAULT_OFFLINE_VENUES } from '../services/teamsService';
import { MultiPanelTimeline } from './MultiPanelTimeline';
import { SlotPicker } from './SlotPicker';
import { BookingConfirmationModal } from './BookingConfirmationModal';
import { fetchLiveMyEvents, fetchLiveFreeBusy, createLiveGoogleEvent } from '../services/liveGoogleCalendar';
import { fetchLiveMicrosoftEvents, fetchLiveMicrosoftPanelEvents, createLiveMicrosoftEvent } from '../services/liveMicrosoftCalendar';
import { SlackService } from '../services/slackService';
import { Avatar } from './Avatar';
import {
  Calendar as CalendarIcon,
  User,
  Users,
  Building,
  MapPin,
  Sparkles,
  ChevronRight,
  Plus,
  AlertTriangle,
  Zap,
  Video,
  RefreshCw,
  Check,
  AlertCircle,
} from './icons';
import { useTheme } from '../context/ThemeContext';

export interface SchedulerWizardProps {
  candidates: Candidate[];
  panelMembers: PanelMember[];
  currentUser?: AuthUser | null;
  onUpdatePanelMembers?: (members: PanelMember[]) => void;
  onScheduleSuccess: (interview: ScheduledInterview) => void;
  onViewInterviews: () => void;
  onAddCandidateRequest: () => void;
}

function convert12To24(time12: string): string {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return time12;
  let [_, hStr, mStr, meridian] = match;
  let hours = parseInt(hStr, 10);
  if (meridian) {
    meridian = meridian.toUpperCase();
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
  }
  return `${hours.toString().padStart(2, '0')}:${mStr}`;
}

export const SchedulerWizard: React.FC<SchedulerWizardProps> = ({
  candidates,
  panelMembers,
  currentUser,
  onUpdatePanelMembers,
  onScheduleSuccess,
  onViewInterviews,
  onAddCandidateRequest,
}) => {
  const { isNeo } = useTheme();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Quick Date presets for this week
  const quickDates = useMemo(() => {
    const dates: string[] = [];
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  // Form State
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    candidates[0]?.id || ''
  );
  const [interviewType, setInterviewType] = useState<string>('Technical System Architecture & Live Coding');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [bufferMinutes, setBufferMinutes] = useState<number>(0);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(DEFAULT_OFFLINE_VENUES[0].id);

  // Selected Panel Member IDs (Default to current user or first panel)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    if (currentUser?.email) return [currentUser.email];
    if (panelMembers.length > 0) return [panelMembers[0].id];
    return [];
  });

  const [selectedSlot, setSelectedSlot] = useState<FormattedSlot | null>(null);
  const [agenda, setAgenda] = useState<string>(
    'Technical deep dive, live coding evaluation, architecture design, and Q&A session.'
  );

  // Live Google / Microsoft Calendar Sync State
  const [isSyncingCalendar, setIsSyncingCalendar] = useState<boolean>(false);

  // Booking Modal State
  const [bookedInterview, setBookedInterview] = useState<ScheduledInterview | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Auto-select candidate if none chosen
  useEffect(() => {
    if (!selectedCandidateId && candidates.length > 0) {
      setSelectedCandidateId(candidates[0].id);
    }
  }, [candidates, selectedCandidateId]);

  // Ensure current user / active panel member is always selected by default
  useEffect(() => {
    if (panelMembers.length > 0) {
      const userPanel = currentUser?.email
        ? panelMembers.find((m) => m.email.toLowerCase() === currentUser.email.toLowerCase() || m.id === currentUser.email)
        : panelMembers[0];
      const targetId = userPanel?.id || panelMembers[0].id;

      setSelectedMemberIds((prev) => {
        const valid = prev.filter(id =>
          panelMembers.some(
            m => m.id === id || (m.email && m.email.toLowerCase() === id.toLowerCase())
          )
        );
        if (valid.length === 0) {
          return [targetId];
        }
        return valid;
      });
    }
  }, [currentUser, panelMembers]);

  // Sync Live Calendar Events for the selected date (Google or Microsoft)
  const syncLiveCalendar = async () => {
    if (!currentUser?.accessToken) return;
    setIsSyncingCalendar(true);
    try {
      const isMicrosoft = currentUser.provider === 'microsoft';
      const realEvents = isMicrosoft
        ? await fetchLiveMicrosoftEvents(selectedDate, currentUser.accessToken)
        : await fetchLiveMyEvents(selectedDate, currentUser.accessToken);

      // Query availability for other panel members with emails
      const otherEmails = panelMembers
        .filter((m) => m.email && m.email.toLowerCase() !== currentUser.email.toLowerCase())
        .map((m) => m.email);

      let freeBusyMap: Record<string, CalendarEvent[]> = {};
      if (otherEmails.length > 0) {
        const startOfDay = new Date(`${selectedDate}T00:00:00`);
        const endOfDay = new Date(`${selectedDate}T23:59:59`);
        const timeMin = startOfDay.toISOString();
        const timeMax = endOfDay.toISOString();

        freeBusyMap = isMicrosoft
          ? await fetchLiveMicrosoftPanelEvents(otherEmails, timeMin, timeMax, currentUser.accessToken)
          : await fetchLiveFreeBusy(otherEmails, timeMin, timeMax, currentUser.accessToken);
      }

      if (onUpdatePanelMembers) {
        const userExists = panelMembers.some(
          (m) => m.id === currentUser.email || m.email.toLowerCase() === currentUser.email.toLowerCase()
        );

        let updated: PanelMember[];
        if (!userExists) {
          const bg = currentUser.provider === 'microsoft' ? '0078d4' : (currentUser.provider === 'slack' ? '4a154b' : '10b981');
          const userPanel: PanelMember = {
            id: currentUser.email,
            name: currentUser.name,
            email: currentUser.email,
            role: 'Lead Recruiter & Panelist',
            department: 'Talent & Engineering',
            avatar: currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=${bg}&color=fff&size=256&bold=true`,
            skills: ['Live Calendar Availability', 'Hiring Decisions', 'Technical Interviews'],
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC+05:30 (IST)',
            workingHours: { start: '09:00', end: '18:00' },
            eventsByDate: {
              [selectedDate]: realEvents || [],
            },
          };
          updated = [userPanel, ...panelMembers];
        } else {
          updated = panelMembers.map((m) => {
            if (m.id === currentUser.email || m.email.toLowerCase() === currentUser.email.toLowerCase()) {
              return {
                ...m,
                eventsByDate: {
                  ...m.eventsByDate,
                  [selectedDate]: realEvents || [],
                },
              };
            }
            const memberEmail = m.email.toLowerCase();
            if (freeBusyMap[memberEmail] && freeBusyMap[memberEmail].length > 0) {
              return {
                ...m,
                eventsByDate: {
                  ...m.eventsByDate,
                  [selectedDate]: freeBusyMap[memberEmail],
                },
              };
            }
            return m;
          });
        }
        onUpdatePanelMembers(updated);
      }
    } catch (err) {
      console.warn('Could not sync real calendar events:', err);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  useEffect(() => {
    if (currentUser?.accessToken) {
      syncLiveCalendar();
    }
  }, [selectedDate, currentUser?.accessToken, currentUser?.provider]);

  // Current Candidate
  const currentCandidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) || candidates[0],
    [candidates, selectedCandidateId]
  );

  // Selected Venue
  const currentVenue = useMemo(
    () => DEFAULT_OFFLINE_VENUES.find((v) => v.id === selectedVenueId) || DEFAULT_OFFLINE_VENUES[0],
    [selectedVenueId]
  );

  // Filter selected panel members
  const selectedPanelList = useMemo(
    () =>
      panelMembers.filter(
        (m) =>
          selectedMemberIds.includes(m.id) ||
          (m.email && selectedMemberIds.some((s) => s.toLowerCase() === m.email.toLowerCase()))
      ),
    [panelMembers, selectedMemberIds]
  );

  // Deterministic Availability Engine Execution
  const availabilityResult = useMemo(() => {
    if (selectedPanelList.length === 0) {
      return { commonIntervals: [], slots: [], memberFreeIntervals: {} };
    }
    return findCommonAvailableSlots(
      selectedPanelList,
      selectedDate,
      {
        durationMinutes,
        stepMinutes: 30,
        bufferMinutes,
      }
    );
  }, [selectedPanelList, selectedDate, durationMinutes, bufferMinutes]);

  // Toggle Panel Member Selection
  const togglePanelMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      const exists = prev.some(
        (p) =>
          p === id ||
          p.toLowerCase() === id.toLowerCase() ||
          panelMembers.some(
            (m) =>
              (m.id === id || m.email.toLowerCase() === id.toLowerCase()) &&
              (m.id === p || m.email.toLowerCase() === p.toLowerCase())
          )
      );
      if (exists) {
        if (prev.length <= 1) return prev; // Keep at least 1
        return prev.filter(
          (mId) =>
            mId !== id &&
            mId.toLowerCase() !== id.toLowerCase() &&
            !panelMembers.some(
              (m) =>
                (m.id === id || m.email.toLowerCase() === id.toLowerCase()) &&
                (m.id === mId || m.email.toLowerCase() === mId.toLowerCase())
            )
        );
      } else {
        return [...prev, id];
      }
    });
    setSelectedSlot(null); // Reset slot choice when panel changes
  };

  const selectAllMembers = () => {
    setSelectedMemberIds(panelMembers.map((m) => m.id));
    setSelectedSlot(null);
  };

  // Handle Real Google / Microsoft Calendar Booking
  const handleConfirmSchedule = async () => {
    if (!selectedSlot || !currentCandidate) return;

    setIsBookingLoading(true);
    setBookingError(null);

    try {
      let meetUrl = '';
      let calendarLink = '';
      let createdExternalEventId = '';
      const isMicrosoft = currentUser?.provider === 'microsoft';

      if (currentUser?.accessToken) {
        const start24 = convert12To24(selectedSlot.startTime);
        const end24 = convert12To24(selectedSlot.endTime);
        const startIso = new Date(`${selectedDate}T${start24}:00`).toISOString();
        const endIso = new Date(`${selectedDate}T${end24}:00`).toISOString();

        const attendeeEmails = [
          currentCandidate.email,
          ...selectedPanelList.map((m) => m.email),
        ].filter(Boolean);

        const panelListFormatted = selectedPanelList
          .map((m, idx) => `  ${idx + 1}. ${m.name} (${m.role}) - ${m.email}`)
          .join('\n');

        const eventDescription = `OFFICIAL INTERVIEW INVITATION: ${interviewType.toUpperCase()}
--------------------------------------------------
Candidate: ${currentCandidate.name} (${currentCandidate.email})
Role: ${currentCandidate.position}
Stage: ${interviewType}
Date: ${selectedDate}
Time: ${selectedSlot.startTime} – ${selectedSlot.endTime} (${selectedSlot.durationMinutes} Minutes)
Status: Confirmed & Calendar Blocked

INTERVIEW PANEL EVALUATORS:
${panelListFormatted || '  • Panel Team Assigned'}

AGENDA & TOPICS:
${agenda || 'Technical assessment, architecture review, and live evaluation.'}

INSTRUCTIONS FOR PARTICIPANTS:
• Please join 5 minutes prior to the scheduled start time using the online meeting link attached.
• Ensure your camera, microphone, and internet connection are tested.
• Have your portfolio, resume, and code samples accessible if requested.

Best regards,
Talent Acquisition Team`;

        if (isMicrosoft) {
          try {
            const msEvent = await createLiveMicrosoftEvent(
              {
                title: `${interviewType}: ${currentCandidate.name}`,
                startTime: startIso,
                endTime: endIso,
                attendees: attendeeEmails,
                description: eventDescription,
                location: 'Microsoft Teams Meeting',
                createTeams: true,
              },
              currentUser.accessToken
            );
            if (msEvent) {
              meetUrl = msEvent.teamsLink || '';
              calendarLink = msEvent.htmlLink || '';
              createdExternalEventId = msEvent.id || '';
            }
          } catch (err: any) {
            console.warn('Real Microsoft Teams booking notice:', err);
            setBookingError(err.message || 'Microsoft Teams creation notice');
          }
        } else {
          try {
            const liveEvent = await createLiveGoogleEvent(
              {
                title: `${interviewType}: ${currentCandidate.name}`,
                startTime: startIso,
                endTime: endIso,
                attendees: attendeeEmails,
                description: eventDescription,
                location: 'Google Meet Video Call',
                createMeet: true,
              },
              currentUser.accessToken
            );

            if (liveEvent) {
              meetUrl = liveEvent.meetUrl || liveEvent.hangoutLink || liveEvent.conferenceData?.entryPoints?.[0]?.uri || '';
              calendarLink = liveEvent.htmlLink || '';
              createdExternalEventId = liveEvent.id || '';
            }
          } catch (err: any) {
            console.warn('Real Google Calendar API booking notice:', err);
            setBookingError(err.message || 'Google Calendar creation notice');
          }
        }
      }

      if (!meetUrl) {
        meetUrl = isMicrosoft ? 'https://teams.microsoft.com' : 'https://meet.google.com/new';
      }

      const defaultDeliveryMode = isMicrosoft ? 'teams-meeting' : 'google-meet';
      const defaultPlatformName = isMicrosoft ? 'Microsoft Teams Meeting' : 'Google Meet Video Call';

      const newInterview: ScheduledInterview = {
        id: `interview-${Date.now()}`,
        candidateId: currentCandidate.id,
        candidateName: currentCandidate.name,
        candidateEmail: currentCandidate.email,
        candidateRole: currentCandidate.position,
        candidateAtsScore: currentCandidate.atsScore,
        interviewType,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        durationMinutes: selectedSlot.durationMinutes,
        deliveryMode: meetUrl ? defaultDeliveryMode : 'in-person',
        meetUrl: meetUrl || undefined,
        googleCalendarLink: calendarLink || undefined,
        externalEventId: createdExternalEventId || undefined,
        provider: currentUser?.provider || (isMicrosoft ? 'microsoft' : 'google'),
        location: meetUrl ? defaultPlatformName : currentVenue.name,
        buildingFloor: meetUrl ? (isMicrosoft ? 'Microsoft 365 Cloud' : 'Google Workspace Online') : currentVenue.floor,
        panelMembers: selectedPanelList.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          avatar: m.avatar,
        })),
        status: 'scheduled',
        agenda,
        createdAt: new Date().toISOString(),
      };


      // Add as local busy event immediately
      if (currentUser?.email && onUpdatePanelMembers) {
        const updated = panelMembers.map((m) => {
          if (m.id === currentUser.email || selectedMemberIds.includes(m.id)) {
            const dateEvts = m.eventsByDate[selectedDate] || [];
            return {
              ...m,
              eventsByDate: {
                ...m.eventsByDate,
                [selectedDate]: [
                  ...dateEvts,
                  {
                    id: newInterview.id,
                    title: `${interviewType} (${currentCandidate.name})`,
                    startTime: convert12To24(selectedSlot.startTime),
                    endTime: convert12To24(selectedSlot.endTime),
                    type: 'interview' as const,
                    isFree: false,
                  },
                ],
              },
            };
          }
          return m;
        });
        onUpdatePanelMembers(updated);
      }

      onScheduleSuccess(newInterview);
      setBookedInterview(newInterview);
      setIsConfirmationOpen(true);

      // Notify Slack workspace asynchronously
      SlackService.notifyInterviewScheduled(newInterview);

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error('Failed to schedule interview:', err);
      alert(`Booking error: ${err.message}`);
    } finally {
      setIsBookingLoading(false);
    }
  };

  const isMicrosoft = currentUser?.provider === 'microsoft';
  const isSlack = currentUser?.provider === 'slack';

  // -------------------------------------------------------------
  // OLD THEME (Modern / 21st.dev Style)
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="space-y-6 pb-16">
        {/* Main Grid: Left Control Panel + Right Timeline & Slots */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-4 space-y-5">
            {/* 1. Candidate Selection Card */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-21st space-y-4 transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">1. Candidate & Round</h2>
                </div>
                <button
                  type="button"
                  onClick={onAddCandidateRequest}
                  className="flex items-center space-x-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Candidate</label>
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium transition"
                  >
                    {candidates.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.name} ({cand.email}) — {cand.position}
                      </option>
                    ))}
                  </select>
                </div>

                {currentCandidate && (
                  <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center space-x-3 shadow-xs">
                    <img
                      src={currentCandidate.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentCandidate.name)}`}
                      alt={currentCandidate.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-300 dark:border-slate-700 ring-2 ring-emerald-500/20"
                    />
                    <div className="truncate text-xs">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{currentCandidate.name}</p>
                      <p className="text-slate-500 dark:text-slate-400 truncate">{currentCandidate.email}</p>
                      <span className="inline-block mt-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {currentCandidate.position}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Interview Round</label>
                  <input
                    type="text"
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* 2. Date & Duration Card */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-21st space-y-4 transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CalendarIcon className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">2. Date & Duration</h2>
                </div>
                {currentUser?.accessToken && (
                  <button
                    onClick={syncLiveCalendar}
                    disabled={isSyncingCalendar}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <RefreshCw className={`w-3 h-3 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                      <span>{isSyncingCalendar ? 'Syncing...' : 'Sync'}</span>
                    </span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlot(null);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>

                {/* Quick Date Select Buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickDates.map((dStr) => {
                    const d = new Date(dStr);
                    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                    const isSelected = selectedDate === dStr;
                    return (
                      <button
                        key={dStr}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dStr);
                          setSelectedSlot(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {dayLabel}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[30, 45, 60, 90].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setDurationMinutes(mins);
                          setSelectedSlot(null);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          durationMinutes === mins
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                            : 'bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Buffer Time</label>
                  <select
                    value={bufferMinutes}
                    onChange={(e) => setBufferMinutes(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  >
                    <option value={0}>0 mins (Exact duration)</option>
                    <option value={10}>10 mins buffer</option>
                    <option value={15}>15 mins buffer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Panel Members Selection */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-21st space-y-4 transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-md bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">3. Active Panelists ({selectedMemberIds.length})</h2>
                </div>
                <button
                  type="button"
                  onClick={selectAllMembers}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition cursor-pointer"
                >
                  Select All
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {panelMembers.map((member) => {
                  const isSelected = selectedMemberIds.includes(member.id);

                  return (
                    <div
                      key={member.id}
                      onClick={() => togglePanelMember(member.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500/50 shadow-xs'
                          : 'bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Avatar
                          name={member.name}
                          avatar={member.avatar}
                          email={member.email}
                          size="md"
                        />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{member.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{member.email}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-2 transition ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Timeline, Discrete Slots & Schedule Execution */}
          <div className="lg:col-span-8 space-y-6">
            <MultiPanelTimeline
              selectedMembers={selectedPanelList}
              date={selectedDate}
              commonIntervals={availabilityResult.commonIntervals}
              selectedSlot={selectedSlot}
              onSlotSelect={(slot) => setSelectedSlot(slot)}
              availableSlots={availabilityResult.slots}
              provider={currentUser?.provider}
            />

            <SlotPicker
              slots={availabilityResult.slots}
              selectedSlot={selectedSlot}
              onSelectSlot={(slot) => setSelectedSlot(slot)}
              panelMembers={panelMembers}
              durationMinutes={durationMinutes}
            />

            {/* Agenda & Confirmation Bar */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-21st space-y-4 transition-all">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Interview Agenda & Notes (Sent in {isMicrosoft ? 'Microsoft Teams' : 'Google Calendar'} Invitation)
                </label>
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  placeholder="Notes, whiteboard links, or candidate instructions..."
                />
              </div>

              {bookingError && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Note: {bookingError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {selectedSlot ? (
                    <span>
                      Selected Slot: <strong className="text-slate-900 dark:text-white font-mono">{selectedSlot.startTime} – {selectedSlot.endTime}</strong> ({selectedSlot.durationMinutes} mins)
                    </span>
                  ) : (
                    <span>Select an available time slot above to proceed with scheduling.</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!selectedSlot || isBookingLoading}
                  onClick={handleConfirmSchedule}
                  className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition shadow-lg cursor-pointer ${
                    selectedSlot && !isBookingLoading
                      ? (isMicrosoft ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/25' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25')
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isBookingLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating {isMicrosoft ? 'Microsoft Teams Meeting' : 'Google Calendar Event'}...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Lock Slot & Sync to {isMicrosoft ? 'Microsoft Teams' : 'Google Calendar'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Confirmation Modal */}
        <BookingConfirmationModal
          interview={bookedInterview}
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
          onViewInterviews={onViewInterviews}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Main Grid: Left Control Panel + Right Timeline & Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-4 space-y-5">
          {/* 1. Candidate Selection Card */}
          <div className="bg-white dark:bg-[#111726] border-2 border-black dark:border-slate-700 p-5 shadow-[4px_4px_0px_0px_#000] space-y-4 transition-all">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center font-black text-xs">
                  1
                </div>
                <h2 className="text-xs sm:text-sm font-black text-black dark:text-white uppercase tracking-wider">
                  CANDIDATE & ROUND
                </h2>
              </div>
              <button
                type="button"
                onClick={onAddCandidateRequest}
                className="text-xs font-mono font-bold text-black dark:text-white hover:underline uppercase cursor-pointer"
              >
                + NEW
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div>
                <label className="block text-xs font-black text-black dark:text-white uppercase mb-1">
                  Select Candidate
                </label>
                <select
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-2 text-xs font-bold text-black dark:text-white focus:outline-none focus:bg-[#FEF9C3] transition"
                >
                  {candidates.map((cand) => (
                    <option key={cand.id} value={cand.id}>
                      {cand.name} — {cand.position}
                    </option>
                  ))}
                </select>
              </div>

              {currentCandidate && (
                <div className="border-2 border-black dark:border-slate-700 p-3 bg-[#FEF9C3] dark:bg-yellow-950/30 flex items-center space-x-3 shadow-[2px_2px_0px_0px_#000]">
                  <img
                    src={currentCandidate.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentCandidate.name)}`}
                    alt={currentCandidate.name}
                    className="w-9 h-9 object-cover border-2 border-black"
                  />
                  <div className="truncate text-xs">
                    <p className="font-black text-black dark:text-white truncate uppercase">{currentCandidate.name}</p>
                    <p className="text-[10px] text-slate-700 dark:text-slate-300 truncate">{currentCandidate.email}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-black dark:text-white uppercase mb-1">
                  Interview Round
                </label>
                <input
                  type="text"
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-2 text-xs font-bold text-black dark:text-white focus:outline-none focus:bg-[#FEF9C3] transition"
                />
              </div>
            </div>
          </div>

          {/* 2. Date & Duration Card */}
          <div className="bg-white dark:bg-[#111726] border-2 border-black dark:border-slate-700 p-5 shadow-[4px_4px_0px_0px_#000] space-y-4 transition-all">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center font-black text-xs">
                  2
                </div>
                <h2 className="text-xs sm:text-sm font-black text-black dark:text-white uppercase tracking-wider">
                  DATE & DURATION
                </h2>
              </div>
              {currentUser?.accessToken && (
                <button
                  onClick={syncLiveCalendar}
                  disabled={isSyncingCalendar}
                  className="text-xs font-mono font-bold text-black dark:text-white hover:underline uppercase cursor-pointer"
                >
                  {isSyncingCalendar ? 'SYNCING...' : 'SYNC'}
                </button>
              )}
            </div>

            <div className="space-y-3 font-mono">
              <div>
                <label className="block text-xs font-black text-black dark:text-white uppercase mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-2 text-xs font-bold text-black dark:text-white focus:outline-none focus:bg-[#FEF9C3] transition"
                />
              </div>

              {/* Quick Date Select Buttons */}
              <div className="grid grid-cols-3 gap-1">
                {quickDates.slice(0, 3).map((dStr) => (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(dStr);
                      setSelectedSlot(null);
                    }}
                    className={`py-1 text-[10px] font-black uppercase font-mono border-2 border-black transition ${
                      selectedDate === dStr
                        ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_#000]'
                        : 'bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-slate-100'
                    }`}
                  >
                    {dStr.split('-')[1]}/{dStr.split('-')[2]}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-black text-black dark:text-white uppercase mb-1">
                  Duration
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setDurationMinutes(mins);
                        setSelectedSlot(null);
                      }}
                      className={`py-2 text-xs font-black uppercase font-mono border-2 border-black transition ${
                        durationMinutes === mins
                          ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_#000]'
                          : 'bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-slate-100'
                      }`}
                    >
                      {mins}M
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-black dark:text-white uppercase mb-1">
                  Buffer Time
                </label>
                <select
                  value={bufferMinutes}
                  onChange={(e) => setBufferMinutes(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-2 text-xs font-bold text-black dark:text-white focus:outline-none focus:bg-[#FEF9C3] transition"
                >
                  <option value={0}>0 MINS</option>
                  <option value={10}>10 MINS</option>
                  <option value={15}>15 MINS</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Panel Members Selection */}
          <div className="bg-white dark:bg-[#111726] border-2 border-black dark:border-slate-700 p-5 shadow-[4px_4px_0px_0px_#000] space-y-4 transition-all">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center font-black text-xs">
                  3
                </div>
                <h2 className="text-xs sm:text-sm font-black text-black dark:text-white uppercase tracking-wider">
                  PANEL ({selectedMemberIds.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={selectAllMembers}
                className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 hover:underline uppercase"
              >
                SELECT ALL
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {panelMembers.map((member) => {
                const isSelected = selectedMemberIds.includes(member.id);

                return (
                  <div
                    key={member.id}
                    onClick={() => togglePanelMember(member.id)}
                    className={`flex items-center justify-between p-2.5 border-2 border-black dark:border-slate-700 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FEF9C3] dark:bg-yellow-950/40 shadow-[2px_2px_0px_0px_#000]'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate font-mono">
                      <Avatar
                        name={member.name}
                        avatar={member.avatar}
                        email={member.email}
                        size="sm"
                        isNeo={true}
                      />
                      <div className="truncate">
                        <p className="text-xs font-black text-black dark:text-white truncate uppercase">{member.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{member.email}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 border-2 border-black flex items-center justify-center shrink-0 ml-2 font-black text-xs ${
                        isSelected ? 'bg-[#FACC15] text-black' : 'bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Timeline, Discrete Slots & Schedule Execution */}
        <div className="lg:col-span-8 space-y-6">
          <MultiPanelTimeline
            selectedMembers={selectedPanelList}
            date={selectedDate}
            commonIntervals={availabilityResult.commonIntervals}
            selectedSlot={selectedSlot}
            onSlotSelect={(slot) => setSelectedSlot(slot)}
            availableSlots={availabilityResult.slots}
          />

          <SlotPicker
            slots={availabilityResult.slots}
            selectedSlot={selectedSlot}
            onSelectSlot={(slot) => setSelectedSlot(slot)}
            panelMembers={panelMembers}
            durationMinutes={durationMinutes}
          />

          {/* Agenda & Confirmation Bar */}
          <div className="bg-white dark:bg-[#111726] border-2 border-black dark:border-slate-700 p-5 shadow-[4px_4px_0px_0px_#000] space-y-4 font-mono transition-all">
            <div>
              <label className="block text-xs font-black text-black dark:text-white uppercase mb-1">
                INTERVIEW AGENDA / INSTRUCTIONS ({isMicrosoft ? 'MICROSOFT TEAMS INVITATION' : 'GOOGLE CALENDAR INVITATION'})
              </label>
              <textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={2}
                className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-2.5 text-xs text-black dark:text-white focus:outline-none focus:bg-[#FEF9C3] transition"
                placeholder="Candidate instructions, problem prompt, notes..."
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t-2 border-black dark:border-slate-700">
              <div className="text-xs">
                {selectedSlot ? (
                  <span>
                    SELECTED: <strong className="font-black text-black dark:text-white">{selectedSlot.startTime} – {selectedSlot.endTime}</strong> ({selectedSlot.durationMinutes}M)
                  </span>
                ) : (
                  <span className="text-slate-500">CHOOSE AN AVAILABLE TIME SLOT ABOVE</span>
                )}
              </div>

              <button
                type="button"
                disabled={!selectedSlot || isBookingLoading}
                onClick={handleConfirmSchedule}
                className={`px-6 py-3 text-xs font-black uppercase font-mono border-2 border-black transition shadow-[3px_3px_0px_0px_#000] cursor-pointer ${
                  selectedSlot && !isBookingLoading
                    ? 'bg-[#FACC15] hover:bg-yellow-400 text-black active:translate-x-0.5 active:translate-y-0.5'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-400 cursor-not-allowed shadow-none'
                }`}
              >
                {isBookingLoading
                  ? 'CREATING EVENT...'
                  : `LOCK SLOT & SYNC TO ${isMicrosoft ? 'MICROSOFT TEAMS' : 'GOOGLE CALENDAR'}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      <BookingConfirmationModal
        interview={bookedInterview}
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onViewInterviews={onViewInterviews}
      />
    </div>
  );
};
