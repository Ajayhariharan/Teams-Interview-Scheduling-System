import React, { useState, useEffect } from 'react';
import type { Candidate, CalendarEvent, GoogleCalendarConfig, MicrosoftGraphConfig, SlackConfig, PanelMember, ScheduledInterview, AuthUser } from './types';

import { CalendarService } from './services/calendarService';
import { SlackService } from './services/slackService';
import { deleteLiveGoogleEvent, fetchLiveMyEvents } from './services/liveGoogleCalendar';
import { deleteLiveMicrosoftEvent, fetchLiveMicrosoftEvents } from './services/liveMicrosoftCalendar';
import { Navbar } from './components/Navbar';
import { SchedulerWizard } from './components/SchedulerWizard';
import { InterviewList } from './components/InterviewList';
import { PanelManager } from './components/PanelManager';
import { CandidateManager } from './components/CandidateManager';
import { CalendarIntegrationsModal } from './components/CalendarIntegrationsModal';
import { LoginPage } from './components/LoginPage';
import { getInterviewEffectiveStatus } from './utils/interviewTime';

const buildCurrentUserPanel = (user: AuthUser): PanelMember => {
  const bg = user.provider === 'microsoft' ? '0078d4' : (user.provider === 'slack' ? '4a154b' : '10b981');
  const initial = (user.name || user.email || 'U').trim().charAt(0).toUpperCase();
  return {
    id: user.email,
    name: user.name || user.email.split('@')[0],
    email: user.email,
    provider: user.provider,
    role: 'Lead Recruiter & Panelist',
    department: 'Talent & Engineering',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${bg}&color=fff&size=256&bold=true`,
    skills: ['Live Calendar Availability', 'Hiring Decisions', 'Technical Interviews'],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC+05:30 (IST)',
    workingHours: { start: '09:00', end: '18:00' },
    eventsByDate: {},
  };
};

const getInitialUser = (): AuthUser | null => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('auth_token');
    const provider = (params.get('provider') as 'google' | 'microsoft' | 'slack') || 'google';
    const email = params.get('user_email');
    const name = params.get('user_name');

    if (token) {
      const fallbackEmail = provider === 'microsoft' ? 'microsoft.user@organization.com' : (provider === 'slack' ? 'slack.user@workspace.com' : 'google.user@company.com');
      const resolvedEmail = email ? decodeURIComponent(email) : fallbackEmail;
      const resolvedName = name ? decodeURIComponent(name) : (email ? decodeURIComponent(email).split('@')[0] : `${provider === 'microsoft' ? 'Microsoft' : (provider === 'slack' ? 'Slack' : 'Google')} Recruiter`);
      const defaultBg = provider === 'microsoft' ? '0078d4' : (provider === 'slack' ? '4a154b' : '10b981');
      const initial = (resolvedName || resolvedEmail || 'U').trim().charAt(0).toUpperCase();
      const resolvedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${defaultBg}&color=fff&size=256&bold=true`;

      const user: AuthUser = {
        id: resolvedEmail,
        name: resolvedName,
        email: resolvedEmail,
        avatar: resolvedAvatar,
        provider: provider,
        role: 'Recruiting & Hiring Lead',
        accessToken: token,
      };
      localStorage.setItem('sug_auth_user', JSON.stringify(user));
      window.history.replaceState({}, document.title, window.location.pathname);
      return user;
    }
  }
  const saved = localStorage.getItem('sug_auth_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
};

const getInitialPanelMembers = (user: AuthUser | null): PanelMember[] => {
  const provider = user?.provider || 'google';
  const saved = CalendarService.getPanelMembers(provider);

  if (!user) {
    return saved.filter((m) => !m.id.startsWith('panel-') && m.email && m.email.includes('@'));
  }

  const userLower = user.email.toLowerCase();
  const others = saved.filter(
    (m) =>
      !m.id.startsWith('panel-') &&
      m.email &&
      m.email.includes('@') &&
      m.email.toLowerCase() !== userLower
  );

  const existingUserPanel = saved.find(
    (m) => m.id === user.email || (m.email && m.email.toLowerCase() === userLower)
  );

  const userPanel: PanelMember = existingUserPanel
    ? {
        ...existingUserPanel,
        id: user.email,
        name: user.name || existingUserPanel.name,
        email: user.email,
        provider: user.provider,
        avatar: user.avatar || existingUserPanel.avatar,
      }
    : buildCurrentUserPanel(user);

  return [userPanel, ...others];
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getInitialUser());

  const [activeTab, setActiveTab] = useState<'schedule' | 'interviews' | 'panel' | 'candidates'>('schedule');
  
  const [panelMembers, setPanelMembers] = useState<PanelMember[]>(() => {
    const initialUser = getInitialUser();
    return getInitialPanelMembers(initialUser);
  });

  const [candidates, setCandidates] = useState<Candidate[]>(() => CalendarService.getCandidates());
  const [interviews, setInterviews] = useState<ScheduledInterview[]>(() => {
    const initialUser = getInitialUser();
    return CalendarService.getScheduledInterviews(initialUser?.provider);
  });
  const [graphConfig, setGraphConfig] = useState<MicrosoftGraphConfig>(() => CalendarService.getGraphConfig());
  const [googleConfig, setGoogleConfig] = useState<GoogleCalendarConfig>(() => {
    return CalendarService.getGoogleConfig();
  });
  const [slackConfig, setSlackConfig] = useState<SlackConfig>(() => SlackService.getSlackConfig());
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);

  // Fetch persisted panel members from backend SQLite database on mount & auth / provider change
  useEffect(() => {
    const provider = currentUser?.provider || 'google';
    CalendarService.fetchPanelMembersFromDb(provider).then((dbMembers) => {
      const validDb = (dbMembers || []).filter(
        (m) => !m.id.startsWith('panel-') && m.email && m.email.includes('@')
      );

      if (currentUser) {
        const userLower = currentUser.email.toLowerCase();
        const userPanel = buildCurrentUserPanel(currentUser);
        const others = validDb.filter(
          (m) => m.id !== currentUser.email && m.email.toLowerCase() !== userLower
        );
        const merged = [userPanel, ...others];
        setPanelMembers(merged);
        const storageKey = provider ? `ips_panel_members_${provider}_v3` : 'ips_panel_members_v3';
        localStorage.setItem(storageKey, JSON.stringify(merged));
      } else {
        setPanelMembers(validDb);
        const storageKey = provider ? `ips_panel_members_${provider}_v3` : 'ips_panel_members_v3';
        localStorage.setItem(storageKey, JSON.stringify(validDb));
      }
    });
  }, [currentUser?.email, currentUser?.provider]);

  // Fetch candidates from DB on mount
  useEffect(() => {
    CalendarService.fetchCandidatesFromDb().then((cands) => {
      if (cands && cands.length > 0) {
        setCandidates(cands);
      }
    });
  }, []);

  // Fetch provider-scoped scheduled interviews on mount & provider change
  useEffect(() => {
    const prov = currentUser?.provider || 'google';
    CalendarService.fetchInterviewsFromDb(prov).then((invs) => {
      if (invs) {
        setInterviews(invs);
      }
    });
  }, [currentUser?.provider]);

  // Sync logged in user into calendar config
  useEffect(() => {
    if (currentUser) {
      if (currentUser.provider === 'google') {
        setGoogleConfig((prev) => ({
          ...prev,
          connected: true,
          userEmail: currentUser.email,
          calendarId: 'primary',
          authStatus: 'connected',
        }));
      } else if (currentUser.provider === 'microsoft') {
        setGraphConfig((prev) => ({
          ...prev,
          connected: true,
          authStatus: 'connected',
        }));
      }
    }
  }, [currentUser?.email, currentUser?.provider]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    localStorage.setItem('sug_auth_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sug_auth_user');
    // Note: Retain organizational panel members in localStorage & SQLite so they persist across sessions
  };

  const handleScheduleSuccess = (newInterview: ScheduledInterview) => {
    const prov = currentUser?.provider || newInterview.provider || 'google';
    const updated = [newInterview, ...interviews];
    setInterviews(updated);
    CalendarService.saveScheduledInterviews(updated, prov);
    CalendarService.recordInterviewToDb(newInterview, prov);
    setCandidates(CalendarService.getCandidates());
  };

  const handleCancelInterview = async (id: string) => {
    const prov = currentUser?.provider || 'google';
    const targetInterview = interviews.find((inv) => inv.id === id);
    const updated = interviews.map((inv) =>
      inv.id === id ? { ...inv, status: 'cancelled' as const } : inv
    );
    setInterviews(updated);
    CalendarService.saveScheduledInterviews(updated, prov);
    CalendarService.cancelInterviewInDb(id);

    // If there is an active external event on Google or Microsoft calendar, delete it via API
    if (targetInterview && currentUser?.accessToken) {
      const eventIdToDelete = targetInterview.externalEventId || targetInterview.id;
      if (currentUser.provider === 'microsoft') {
        try {
          await deleteLiveMicrosoftEvent(eventIdToDelete, currentUser.accessToken);
          // Also fetch live events on date and remove any matching candidate name or stage
          const liveEvts = await fetchLiveMicrosoftEvents(targetInterview.date, currentUser.accessToken);
          for (const ev of liveEvts) {
            const evLower = ev.title.toLowerCase();
            if (
              evLower.includes(targetInterview.candidateName.toLowerCase()) ||
              evLower.includes(targetInterview.interviewType.toLowerCase())
            ) {
              await deleteLiveMicrosoftEvent(ev.id, currentUser.accessToken);
            }
          }
        } catch (err) {
          console.warn('Could not delete external Microsoft event:', err);
        }
      } else if (currentUser.provider === 'google') {
        try {
          await deleteLiveGoogleEvent(eventIdToDelete, currentUser.accessToken);
          // Also fetch live events on date and remove any matching candidate name or stage
          const liveEvts = await fetchLiveMyEvents(targetInterview.date, currentUser.accessToken);
          for (const ev of liveEvts) {
            const evLower = ev.title.toLowerCase();
            if (
              evLower.includes(targetInterview.candidateName.toLowerCase()) ||
              evLower.includes(targetInterview.interviewType.toLowerCase())
            ) {
              await deleteLiveGoogleEvent(ev.id, currentUser.accessToken);
            }
          }
        } catch (err) {
          console.warn('Could not delete external Google Calendar event:', err);
        }
      }
    }

    // Remove the cancelled interview busy event from ALL panel members' eventsByDate on the timeline
    if (targetInterview) {
      const updatedMembers = panelMembers.map((m) => {
        const dayEvents = m.eventsByDate[targetInterview.date];
        if (dayEvents && dayEvents.length > 0) {
          return {
            ...m,
            eventsByDate: {
              ...m.eventsByDate,
              [targetInterview.date]: dayEvents.filter(
                (e) =>
                  e.id !== id &&
                  e.id !== targetInterview.id &&
                  e.id !== targetInterview.externalEventId &&
                  !e.title.toLowerCase().includes(targetInterview.candidateName.toLowerCase()) &&
                  !e.title.toLowerCase().includes(targetInterview.interviewType.toLowerCase())
              ),
            },
          };
        }
        return m;
      });
      setPanelMembers(updatedMembers);
      CalendarService.savePanelMembers(updatedMembers, currentUser?.provider);
      SlackService.notifyInterviewCancelled({ ...targetInterview, status: 'cancelled' });
    }
  };


  const handleDeletePanelEvent = async (eventId: string, member: PanelMember, date: string, eventObj?: CalendarEvent) => {
    // 1. If it's a real Microsoft or Google event, delete it via live API
    if (currentUser?.accessToken) {
      if (currentUser.provider === 'microsoft') {
        try {
          await deleteLiveMicrosoftEvent(eventId, currentUser.accessToken);
        } catch (err) {
          console.warn('Could not delete external Microsoft event:', err);
        }
      } else if (currentUser.provider === 'google') {
        try {
          await deleteLiveGoogleEvent(eventId, currentUser.accessToken);
        } catch (err) {
          console.warn('Could not delete external Google Calendar event:', err);
        }
      }
    }

    // 2. Remove event from this panel member's calendar on this date
    const updatedMembers = panelMembers.map((m) => {
      if (m.id === member.id || m.email.toLowerCase() === member.email.toLowerCase()) {
        const dayEvents = m.eventsByDate[date] || [];
        return {
          ...m,
          eventsByDate: {
            ...m.eventsByDate,
            [date]: dayEvents.filter((e) => e.id !== eventId && (!eventObj || e.title !== eventObj.title)),
          },
        };
      }
      return m;
    });

    setPanelMembers(updatedMembers);
    CalendarService.savePanelMembers(updatedMembers, currentUser?.provider);

    // 3. Check if this corresponds to a scheduled interview and update interview status in DB/state
    const matchingInterview = interviews.find(
      (i) =>
        i.id === eventId ||
        i.externalEventId === eventId ||
        (eventObj &&
          i.date === date &&
          (eventObj.title.toLowerCase().includes(i.candidateName.toLowerCase()) ||
            i.interviewType.toLowerCase().includes(eventObj.title.toLowerCase())))
    );

    if (matchingInterview) {
      const prov = currentUser?.provider || 'google';
      const updatedInvs = interviews.map((inv) =>
        inv.id === matchingInterview.id ? { ...inv, status: 'cancelled' as const } : inv
      );
      setInterviews(updatedInvs);
      CalendarService.saveScheduledInterviews(updatedInvs, prov);
      CalendarService.cancelInterviewInDb(matchingInterview.id);
      SlackService.notifyInterviewCancelled({ ...matchingInterview, status: 'cancelled' });
    }
  };

  const handleDeletePanelMember = async (memberId: string, memberEmail: string) => {
    if (panelMembers.length <= 1) return;
    const prov = currentUser?.provider || 'google';
    const updated = panelMembers.filter(
      (m) => m.id !== memberId && m.email.toLowerCase() !== memberEmail.toLowerCase()
    );
    setPanelMembers(updated);
    CalendarService.savePanelMembers(updated, prov);
    CalendarService.deletePanelMemberFromDb(memberId, prov);
    CalendarService.deletePanelMemberFromDb(memberEmail, prov);
  };

  const handleUpdatePanelMembers = (updated: PanelMember[]) => {
    let merged = updated;
    if (currentUser) {
      const hasUser = updated.some(
        (m) => m.id === currentUser.email || m.email.toLowerCase() === currentUser.email.toLowerCase()
      );
      if (!hasUser) {
        const userPanel = buildCurrentUserPanel(currentUser);
        merged = [userPanel, ...updated];
      }
    }
    setPanelMembers(merged);
    CalendarService.savePanelMembers(merged, currentUser?.provider);
  };


  const handleAddCandidate = (newCandidate: Candidate) => {
    const existingIndex = candidates.findIndex((c) => c.id === newCandidate.id);
    let updated: Candidate[];
    if (existingIndex >= 0) {
      updated = [...candidates];
      updated[existingIndex] = newCandidate;
    } else {
      updated = [newCandidate, ...candidates];
    }
    setCandidates(updated);
    CalendarService.saveCandidates(updated);
    CalendarService.addCandidateToDb(newCandidate);
  };

  const handleDeleteCandidate = (candidateId: string) => {
    const updated = candidates.filter((c) => c.id !== candidateId);
    setCandidates(updated);
    CalendarService.saveCandidates(updated);
    CalendarService.deleteCandidateFromDb(candidateId);
  };

  const handleSelectCandidateForSchedule = (_candidateId: string) => {
    setActiveTab('schedule');
  };


  const handleSaveGraphConfig = (newConfig: MicrosoftGraphConfig) => {
    setGraphConfig(newConfig);
    CalendarService.saveGraphConfig(newConfig);
  };

  const handleSaveGoogleConfig = (newConfig: GoogleCalendarConfig) => {
    setGoogleConfig(newConfig);
    CalendarService.saveGoogleConfig(newConfig);
  };

  const handleSaveSlackConfig = (newConfig: SlackConfig) => {
    setSlackConfig(newConfig);
    SlackService.saveSlackConfig(newConfig);
  };

  const handleResetData = () => {
    if (window.confirm('Reset panel members, candidates, and interviews to default?')) {
      CalendarService.resetToDefaults();
      setPanelMembers(CalendarService.getPanelMembers());
      setCandidates(CalendarService.getCandidates());
      setInterviews(CalendarService.getScheduledInterviews());
      setGoogleConfig(CalendarService.getGoogleConfig());
      setGraphConfig(CalendarService.getGraphConfig());
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLoginSuccess} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-300 transition-colors w-full">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        graphConfig={graphConfig}
        googleConfig={googleConfig}
        onOpenGraphModal={() => setIsIntegrationsModalOpen(true)}
        onOpenGoogleModal={() => setIsIntegrationsModalOpen(true)}
        onResetData={handleResetData}
        scheduledCount={interviews.filter((i) => getInterviewEffectiveStatus(i) === 'scheduled').length}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {activeTab === 'schedule' && (
          <SchedulerWizard
            candidates={candidates}
            panelMembers={panelMembers}
            currentUser={currentUser}
            onUpdatePanelMembers={handleUpdatePanelMembers}
            onScheduleSuccess={handleScheduleSuccess}
            onViewInterviews={() => setActiveTab('interviews')}
            onAddCandidateRequest={() => setActiveTab('candidates')}
          />
        )}

        {activeTab === 'interviews' && (
          <InterviewList
            interviews={interviews}
            candidates={candidates}
            onCancelInterview={handleCancelInterview}
            onScheduleNew={() => setActiveTab('schedule')}
          />
        )}

        {activeTab === 'panel' && (
          <PanelManager
            panelMembers={panelMembers}
            currentUser={currentUser}
            onUpdatePanelMembers={handleUpdatePanelMembers}
            onDeleteEvent={handleDeletePanelEvent}
            onDeleteMember={handleDeletePanelMember}
          />
        )}


        {activeTab === 'candidates' && (
          <CandidateManager
            candidates={candidates}
            onAddCandidate={handleAddCandidate}
            onDeleteCandidate={handleDeleteCandidate}
            onSelectCandidateForSchedule={handleSelectCandidateForSchedule}
          />
        )}

      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 py-6 text-center text-xs text-slate-500 dark:text-slate-400 mt-auto transition-colors w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium">Interview Panel Scheduler • Real Google Calendar & Meet Sync</span>
          <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">OAuth 2.0 • Real Google Calendar API • Google Meet</span>
        </div>
      </footer>

      <CalendarIntegrationsModal
        googleConfig={googleConfig}
        graphConfig={graphConfig}
        slackConfig={slackConfig}
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        onSaveGoogleConfig={handleSaveGoogleConfig}
        onSaveGraphConfig={handleSaveGraphConfig}
        onSaveSlackConfig={handleSaveSlackConfig}
      />
    </div>
  );
};

export default App;
