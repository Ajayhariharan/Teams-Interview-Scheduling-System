import React, { useState, useEffect } from 'react';
import type { CalendarEvent, EventType, PanelMember, AuthUser } from '../types';
import { CalendarService } from '../services/calendarService';
import { fetchLiveMyEvents } from '../services/liveGoogleCalendar';
import { fetchLiveMicrosoftEvents } from '../services/liveMicrosoftCalendar';
import { Avatar } from './Avatar';
import {
  Users,
  Plus,
  Trash2,
  Clock,
  Calendar,
  X,
  UserCheck,
  CheckCircle,
  Sparkles,
  Check,
} from './icons';
import { useTheme } from '../context/ThemeContext';

export interface PanelManagerProps {
  panelMembers: PanelMember[];
  currentUser?: AuthUser | null;
  onUpdatePanelMembers: (members: PanelMember[]) => void;
  onDeleteEvent?: (eventId: string, member: PanelMember, date: string, eventObj?: CalendarEvent) => Promise<void>;
  onDeleteMember?: (memberId: string, memberEmail: string) => Promise<void>;
}

export const PanelManager: React.FC<PanelManagerProps> = ({
  panelMembers,
  currentUser,
  onUpdatePanelMembers,
  onDeleteEvent,
  onDeleteMember,
}) => {
  const { isNeo } = useTheme();
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    currentUser?.email || panelMembers[0]?.id || ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Add Member Modal State (Only Account ID & Role required)
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [newPanelEmail, setNewPanelEmail] = useState('');
  const [newPanelRole, setNewPanelRole] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<PanelMember | null>(null);
  const [eventToDelete, setEventToDelete] = useState<{ event: CalendarEvent; date: string } | null>(null);

  // Auto-fetched Account Profile Preview State
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<{
    name: string;
    email: string;
    avatar: string;
    department: string;
    role?: string;
    jobTitle?: string;
  } | null>(null);

  // Debounced profile fetching as user types account ID
  useEffect(() => {
    const cleanEmail = newPanelEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
      setPreviewProfile(null);
      return;
    }

    let isMounted = true;
    setIsFetchingProfile(true);

    const timer = setTimeout(async () => {
      try {
        const profile = await CalendarService.fetchAccountProfile(
          cleanEmail,
          currentUser?.accessToken
        );
        if (isMounted) {
          setPreviewProfile(profile);
          if (profile?.role || profile?.jobTitle) {
            setNewPanelRole(profile.role || profile.jobTitle || '');
          }
        }
      } catch (err) {
        console.warn('Profile fetch error:', err);
      } finally {
        if (isMounted) setIsFetchingProfile(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [newPanelEmail, currentUser?.accessToken]);

  const currentMember = panelMembers.find((m) => m.id === selectedMemberId || m.email.toLowerCase() === selectedMemberId.toLowerCase()) || panelMembers[0];
  const dayEvents = currentMember?.eventsByDate[selectedDate] || [];

  // Live sync events from Google Calendar / Microsoft Graph for the logged in user on selected date
  useEffect(() => {
    const token = currentUser?.accessToken;
    if (!token || !currentMember || !currentUser?.email) return;
    const isCurrentUser = currentMember.email.toLowerCase() === currentUser.email.toLowerCase();
    if (!isCurrentUser) return;

    let isMounted = true;
    const syncMemberEvents = async () => {
      try {
        let liveEvents: CalendarEvent[] = [];
        if (currentUser.provider === 'microsoft') {
          liveEvents = await fetchLiveMicrosoftEvents(selectedDate, token);
        } else if (currentUser.provider === 'google') {
          liveEvents = await fetchLiveMyEvents(selectedDate, token);
        }

        if (isMounted && liveEvents) {
          const prov = currentUser?.provider || 'google';
          const updated = panelMembers.map((m) => {
            if (m.id === currentMember.id || m.email.toLowerCase() === currentMember.email.toLowerCase()) {
              return {
                ...m,
                eventsByDate: {
                  ...m.eventsByDate,
                  [selectedDate]: liveEvents,
                },
              };
            }
            return m;
          });
          onUpdatePanelMembers(updated);
          CalendarService.savePanelMembers(updated, prov);
        }
      } catch (err) {
        console.warn('Live calendar sync in PanelManager notice:', err);
      }
    };

    syncMemberEvents();

    return () => {
      isMounted = false;
    };
  }, [selectedDate, currentMember?.email, currentUser?.accessToken, currentUser?.provider, currentUser?.email]);

  const handleCreatePanelMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newPanelEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    // Use fetched profile or resolve on the fly
    const profile = previewProfile || await CalendarService.fetchAccountProfile(
      cleanEmail,
      currentUser?.accessToken
    );

    const prov = currentUser?.provider || 'google';
    const resolvedRole = newPanelRole.trim() || profile?.role || profile?.jobTitle || 'Interviewer';

    const newMember: PanelMember = {
      id: cleanEmail,
      name: profile.name,
      email: cleanEmail,
      provider: prov,
      role: resolvedRole,
      department: profile.department,
      avatar: profile.avatar,
      skills: ['Live Calendar Availability', 'System Architecture', 'Coding Evaluation'],
      timezone: 'UTC+05:30 (IST)',
      workingHours: { start: '09:00', end: '18:00' },
      eventsByDate: {},
    };

    const exists = panelMembers.some((m) => m.email.toLowerCase() === cleanEmail);
    const updated = exists
      ? panelMembers.map((m) => (m.email.toLowerCase() === cleanEmail ? { ...m, ...newMember } : m))
      : [...panelMembers, newMember];

    onUpdatePanelMembers(updated);
    CalendarService.savePanelMembers(updated, prov);
    CalendarService.savePanelMemberToDb(newMember, prov);
    setSelectedMemberId(newMember.id);
    setIsAddPanelOpen(false);
    setNewPanelEmail('');
    setNewPanelRole('');
    setPreviewProfile(null);
  };

  const handleDeleteEvent = async (eventId: string, date: string, eventObj?: CalendarEvent) => {

    if (!currentMember) return;

    if (onDeleteEvent) {
      await onDeleteEvent(eventId, currentMember, date, eventObj);
    } else {
      const prov = currentUser?.provider || 'google';
      const updated = panelMembers.map((m) => {
        if (m.id === currentMember.id) {
          const existingForDate = m.eventsByDate[date] || [];
          return {
            ...m,
            eventsByDate: {
              ...m.eventsByDate,
              [date]: existingForDate.filter((e) => e.id !== eventId),
            },
          };
        }
        return m;
      });

      onUpdatePanelMembers(updated);
      CalendarService.savePanelMembers(updated, prov);
    }
  };

  const handleDeleteMember = async (memberId: string, memberEmail: string) => {
    if (panelMembers.length <= 1) return;
    if (onDeleteMember) {
      await onDeleteMember(memberId, memberEmail);
    } else {
      const prov = currentUser?.provider || 'google';
      const updated = panelMembers.filter(
        (m) => m.id !== memberId && m.email.toLowerCase() !== memberEmail.toLowerCase()
      );
      onUpdatePanelMembers(updated);
      CalendarService.savePanelMembers(updated, prov);
      CalendarService.deletePanelMemberFromDb(memberId, prov);
      CalendarService.deletePanelMemberFromDb(memberEmail, prov);
      if (selectedMemberId === memberId) {
        setSelectedMemberId(updated[0]?.id || '');
      }
    }
  };


  // -------------------------------------------------------------
  // OLD THEME (Modern / 21st.dev Style)
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-21st transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Verified Panel Members ({panelMembers.length})
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active account profiles synced for deterministic multi-calendar availability intersection.
            </p>
          </div>

          <button
            onClick={() => {
              setIsAddPanelOpen(true);
              setNewPanelEmail('');
              setPreviewProfile(null);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Panel Member</span>
          </button>
        </div>

        {/* Grid Layout: Left Panel List + Right Calendar Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Panel Members List */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              Organization Panelists ({panelMembers.length})
            </h2>

            <div className="space-y-2">
              {panelMembers.map((member) => {
                const isSelected = selectedMemberId === member.id || selectedMemberId === member.email;
                const isCurrentUser = currentUser?.email && member.email.toLowerCase() === currentUser.email.toLowerCase();

                return (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`rounded-2xl p-3.5 border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/80 shadow-sm'
                        : 'bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <Avatar
                        name={member.name}
                        avatar={member.avatar}
                        email={member.email}
                        size="lg"
                        className="ring-2 ring-emerald-500/20"
                      />
                      <div className="truncate text-xs">
                        <div className="flex items-center space-x-1.5">
                          <p className="font-extrabold text-slate-900 dark:text-white truncate">{member.name}</p>
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{member.email}</p>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    {!isCurrentUser && panelMembers.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMemberToDelete(member);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        title="Remove panel member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Schedule Viewer & Event Adder */}
          {currentMember && (
            <div className="lg:col-span-8 space-y-5">
              {/* Member Schedule Header Card */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-21st flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
                <div className="flex items-center space-x-3.5">
                  <img
                    src={currentMember.avatar}
                    alt={currentMember.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30 ring-2 ring-emerald-500/20"
                  />
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">{currentMember.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{currentMember.email}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{currentMember.role}{currentMember.department ? ` • ${currentMember.department}` : ''}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Date:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Day's Busy Blocks */}
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-21st space-y-3 transition-all">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Scheduled Events on {selectedDate}</span>
                  </h3>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Live Calendar Sync Active</span>
                </div>

                {dayEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No busy meetings or events found on this date. Full working hours (09:00 - 18:00 IST) are available!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {dayEvents.map((evt) => {
                      let typeBadge = 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700';
                      if (evt.type === 'lunch') typeBadge = 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700';
                      if (evt.type === 'interview') typeBadge = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700';

                      return (
                        <div
                          key={evt.id}
                          className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{evt.title}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${typeBadge}`}>
                                {evt.type}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {evt.startTime} – {evt.endTime}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => setEventToDelete({ event: evt, date: selectedDate })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>


        {/* Add Panel Member Modal (Asks ONLY Account ID & Role; Fetches Name & PFP) */}
        {isAddPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-slate-900 dark:text-white">
              <button
                onClick={() => setIsAddPanelOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold">Add Organization Panel Member</h3>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your colleague's account email. Their real name and profile picture are fetched automatically from their account.
              </p>

              <form onSubmit={handleCreatePanelMember} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Account ID / Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. example@company.com"
                    value={newPanelEmail}
                    onChange={(e) => setNewPanelEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Role / Position in Interview *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer / Lead Architect"
                    value={newPanelRole}
                    onChange={(e) => setNewPanelRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {/* Auto-Fetched Profile Preview Card */}
                {isFetchingProfile && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-400 animate-pulse">
                    Fetching account profile, position & picture...
                  </div>
                )}

                {previewProfile && !isFetchingProfile && (
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/70 rounded-2xl flex items-center space-x-3 shadow-xs">
                    <img
                      src={previewProfile.avatar}
                      alt={previewProfile.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-emerald-400 dark:border-emerald-600 shrink-0"
                    />
                    <div className="truncate flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate">
                          {previewProfile.name}
                        </span>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{previewProfile.email}</p>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        {newPanelRole || previewProfile.role || previewProfile.jobTitle || 'Interviewer'}{previewProfile.department ? ` • ${previewProfile.department}` : ''}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddPanelOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    + Add to Panel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Member Confirmation Modal (Modern Style) */}
        {memberToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-900 dark:text-slate-100 space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Remove Panel Member?
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This will remove their availability from the scheduler.
                  </p>
                </div>
              </div>

              {/* Target member preview */}
              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
                <Avatar
                  name={memberToDelete.name}
                  avatar={memberToDelete.avatar}
                  email={memberToDelete.email}
                  size="lg"
                />
                <div className="truncate text-xs space-y-0.5">
                  <p className="font-extrabold text-slate-900 dark:text-white truncate">{memberToDelete.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{memberToDelete.email}</p>
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                    {memberToDelete.role}{memberToDelete.department ? ` • ${memberToDelete.department}` : ''}
                  </p>
                </div>
              </div>

              <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
                Are you sure you want to delete this panel member from the team and database?
              </p>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDeleteMember(memberToDelete.id, memberToDelete.email);
                    setMemberToDelete(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm cursor-pointer"
                >
                  Yes, Remove Panelist
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Event Confirmation Modal (Modern Style) */}
        {eventToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-900 dark:text-slate-100 space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cancel / Delete Meeting?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This will release the slot and delete the event from real calendars.
                  </p>
                </div>
              </div>

              {/* Target event preview */}
              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-1.5 text-xs">
                <p>
                  <span className="text-slate-400">Event:</span>{' '}
                  <strong className="font-bold text-slate-900 dark:text-white">{eventToDelete.event.title}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Date:</span>{' '}
                  <span className="font-mono">{eventToDelete.date}</span>
                </p>
                <p>
                  <span className="text-slate-400">Time:</span>{' '}
                  <span className="font-mono">{eventToDelete.event.startTime} – {eventToDelete.event.endTime}</span>
                </p>
                <p>
                  <span className="text-slate-400">Type:</span>{' '}
                  <span className="uppercase font-semibold text-emerald-600 dark:text-emerald-400">{eventToDelete.event.type}</span>
                </p>
              </div>

              <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
                Are you sure you want to delete this meeting? It will be removed from your Outlook / Google calendar and timeline.
              </p>

              {/* Action buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEventToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Keep Meeting
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleDeleteEvent(eventToDelete.event.id, eventToDelete.date, eventToDelete.event);
                    setEventToDelete(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm cursor-pointer"
                >
                  Yes, Delete Meeting
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  }

  // -------------------------------------------------------------
  // NEW THEME (Neo-Brutalism High-Contrast Style)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-16 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-wider uppercase">
            ORGANIZATION PANEL MEMBERS ({panelMembers.length})
          </h1>
          <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1">
            Real user accounts synced for live availability verification.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddPanelOpen(true);
            setNewPanelEmail('');
            setPreviewProfile(null);
          }}
          className="flex items-center space-x-2 px-4 py-2 text-xs font-black uppercase font-mono bg-[#FACC15] hover:bg-yellow-400 text-black border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ADD PANEL MEMBER</span>
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Panel Members */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-black dark:text-white px-1">
            PANEL MEMBERS ({panelMembers.length})
          </h2>

          <div className="space-y-2">
            {panelMembers.map((member) => {
              const isSelected = selectedMemberId === member.id || selectedMemberId === member.email;
              const isCurrentUser = currentUser?.email && member.email.toLowerCase() === currentUser.email.toLowerCase();

              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`p-3.5 border-2 border-black transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#FEF08A] dark:bg-yellow-950/60 shadow-[3px_3px_0px_0px_#000]'
                      : 'bg-white dark:bg-slate-900 shadow-[2px_2px_0px_0px_#000]'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Avatar
                      name={member.name}
                      avatar={member.avatar}
                      email={member.email}
                      size="lg"
                      isNeo={true}
                    />
                    <div className="truncate text-xs">
                      <div className="flex items-center space-x-1.5">
                        <p className="font-black text-black dark:text-white truncate uppercase">{member.name}</p>
                        {isCurrentUser && (
                          <span className="px-1 py-0.2 bg-black text-white text-[9px] font-black">YOU</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{member.email}</p>
                      <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                        {member.role}
                      </span>
                    </div>
                  </div>

                  {!isCurrentUser && panelMembers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberToDelete(member);
                      }}
                      className="p-1.5 border-2 border-black bg-white dark:bg-slate-900 text-red-600 hover:bg-red-100 cursor-pointer shrink-0 shadow-[1px_1px_0px_0px_#000]"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Member Inspector */}
        {currentMember && (
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white dark:bg-slate-900 border-3 border-black dark:border-slate-700 p-5 shadow-[4px_4px_0px_0px_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <img
                  src={currentMember.avatar}
                  alt={currentMember.name}
                  className="w-12 h-12 border-2 border-black shrink-0"
                />
                <div>
                  <h2 className="text-base font-black uppercase text-black dark:text-white">{currentMember.name}</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{currentMember.email}</p>
                  <p className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                    {currentMember.role}{currentMember.department ? ` • ${currentMember.department}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase">DATE:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-2 border-black p-1.5 text-xs text-black dark:text-white font-mono"
                />
              </div>
            </div>

            {/* Events List */}
            <div className="bg-white dark:bg-slate-900 border-3 border-black dark:border-slate-700 p-5 shadow-[4px_4px_0px_0px_#000] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-black">
                <h3 className="text-xs font-black uppercase text-black dark:text-white">
                  CALENDAR EVENTS ON {selectedDate}
                </h3>
                <span className="text-[10px] font-black bg-emerald-300 text-black px-1.5 py-0.5 border border-black">
                  LIVE SYNC ACTIVE
                </span>
              </div>

              {dayEvents.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  NO BUSY BLOCKS. ALL WORKING HOURS (09:00 - 18:00 IST) ARE FREE.
                </p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="bg-slate-50 dark:bg-slate-950 border-2 border-black p-2.5 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-black uppercase">{evt.title}</span>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                          {evt.startTime} – {evt.endTime}
                        </div>
                      </div>
                      <button
                        onClick={() => setEventToDelete({ event: evt, date: selectedDate })}
                        className="p-1 border border-black bg-red-100 text-red-700 cursor-pointer"
                        title="Delete event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Colleague Modal (Asks ONLY Account ID & Role; Fetches Name & PFP) */}
      {isAddPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#111726] border-3 border-black dark:border-slate-700 max-w-md w-full p-6 space-y-4 shadow-[8px_8px_0px_0px_#000] relative text-black dark:text-white">
            <button
              onClick={() => setIsAddPanelOpen(false)}
              className="absolute top-4 right-4 p-1.5 border-2 border-black bg-white dark:bg-slate-900 text-black dark:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-black uppercase tracking-wider">ADD PANEL MEMBER</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Provide account email. The real name & profile picture will be resolved automatically.
            </p>

            <form onSubmit={handleCreatePanelMember} className="space-y-4 text-xs">
              <div>
                <label className="block font-black uppercase mb-1">Account ID / Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. example@company.com"
                  value={newPanelEmail}
                  onChange={(e) => setNewPanelEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-black p-2 focus:bg-[#FEF9C3]"
                />
              </div>

              <div>
                <label className="block font-black uppercase mb-1">Role / Position *</label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer / Lead Architect"
                  value={newPanelRole}
                  onChange={(e) => setNewPanelRole(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-black p-2 focus:bg-[#FEF9C3] font-bold"
                />
              </div>

              {/* Auto-Fetched Profile Preview Card */}
              {isFetchingProfile && (
                <div className="p-3 bg-yellow-100 border-2 border-black text-xs font-black uppercase animate-pulse">
                  FETCHING ACCOUNT PROFILE, POSITION & PFP...
                </div>
              )}

              {previewProfile && !isFetchingProfile && (
                <div className="p-3 bg-emerald-200 border-2 border-black flex items-center space-x-3 shadow-[2px_2px_0px_0px_#000]">
                  <img
                    src={previewProfile.avatar}
                    alt={previewProfile.name}
                    className="w-10 h-10 border-2 border-black shrink-0"
                  />
                  <div className="truncate flex-1 text-black">
                    <div className="font-black text-xs uppercase truncate flex items-center gap-1">
                      <span>{previewProfile.name}</span>
                      <Check className="w-3.5 h-3.5 stroke-[3] text-black" />
                    </div>
                    <div className="text-[10px] font-mono truncate">{previewProfile.email}</div>
                    <div className="text-[10px] font-black uppercase text-emerald-900">
                      {newPanelRole || previewProfile.role || previewProfile.jobTitle || 'Interviewer'}{previewProfile.department ? ` • ${previewProfile.department}` : ''}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddPanelOpen(false)}
                  className="px-4 py-2 border-2 border-black bg-white dark:bg-slate-900 font-black uppercase cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FACC15] hover:bg-yellow-400 text-black font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                >
                  + ADD MEMBER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal (Neo Style) */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111726] border-3 border-black dark:border-slate-700 max-w-md w-full p-6 shadow-[8px_8px_0px_0px_#000] relative text-black dark:text-white space-y-4 font-mono">
            <div className="flex items-center space-x-3 pb-3 border-b-2 border-black dark:border-slate-700">
              <div className="w-9 h-9 bg-red-100 dark:bg-red-950/80 border-2 border-red-600 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-black dark:text-white">
                  REMOVE PANEL MEMBER?
                </h3>
                <p className="text-[11px] text-slate-500">
                  This will release them from all interview allocations.
                </p>
              </div>
            </div>

            {/* Target member details preview */}
            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-3.5 flex items-center space-x-3">
              <Avatar
                name={memberToDelete.name}
                avatar={memberToDelete.avatar}
                email={memberToDelete.email}
                size="lg"
                isNeo={true}
              />
              <div className="truncate text-xs">
                <p className="font-black text-black dark:text-white uppercase truncate">{memberToDelete.name}</p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{memberToDelete.email}</p>
                <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 truncate">
                  {memberToDelete.role}{memberToDelete.department ? ` • ${memberToDelete.department}` : ''}
                </p>
              </div>
            </div>

            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed font-bold">
              Are you sure you want to remove this panel member from the team?
            </p>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 text-xs font-black uppercase border-2 border-black dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              >
                KEEP PANELIST
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDeleteMember(memberToDelete.id, memberToDelete.email);
                  setMemberToDelete(null);
                }}
                className="px-4 py-2 text-xs font-black uppercase bg-red-600 hover:bg-red-700 text-white border-2 border-black dark:border-slate-700 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
              >
                YES, REMOVE PANELIST
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal (Neo Style) */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111726] border-3 border-black dark:border-slate-700 max-w-md w-full p-6 shadow-[8px_8px_0px_0px_#000] relative text-black dark:text-white space-y-4 font-mono">
            <div className="flex items-center space-x-3 pb-3 border-b-2 border-black dark:border-slate-700">
              <div className="w-9 h-9 bg-red-100 dark:bg-red-950/80 border-2 border-red-600 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-black dark:text-white">
                  CANCEL / DELETE MEETING?
                </h3>
                <p className="text-[11px] text-slate-500">
                  This will release the slot and delete the event from real calendars.
                </p>
              </div>
            </div>

            {/* Target event details preview */}
            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-3.5 space-y-1.5 text-xs">
              <p>
                <span className="text-slate-500 uppercase">EVENT:</span>{' '}
                <strong className="font-bold text-black dark:text-white">{eventToDelete.event.title}</strong>
              </p>
              <p>
                <span className="text-slate-500 uppercase">DATE:</span>{' '}
                <span>{eventToDelete.date}</span>
              </p>
              <p>
                <span className="text-slate-500 uppercase">TIME:</span>{' '}
                <span>{eventToDelete.event.startTime} – {eventToDelete.event.endTime}</span>
              </p>
              <p>
                <span className="text-slate-500 uppercase">TYPE:</span>{' '}
                <span className="uppercase font-bold text-emerald-600 dark:text-emerald-400">{eventToDelete.event.type}</span>
              </p>
            </div>

            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed font-bold">
              Are you sure you want to delete this meeting? It will be removed from your Outlook / Google calendar and timeline.
            </p>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 text-xs font-black uppercase border-2 border-black dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              >
                KEEP MEETING
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleDeleteEvent(eventToDelete.event.id, eventToDelete.date, eventToDelete.event);
                  setEventToDelete(null);
                }}
                className="px-4 py-2 text-xs font-black uppercase bg-red-600 hover:bg-red-700 text-white border-2 border-black dark:border-slate-700 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
              >
                YES, DELETE MEETING
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


