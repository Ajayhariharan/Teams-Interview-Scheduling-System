import React, { useState, useRef, useEffect } from 'react';
import { Target, Calendar, Users, UserCheck, Layers, Sun, Moon, Palette, Building, LogOut, GoogleIcon, MicrosoftIcon, SlackIcon, User, Settings, Video } from './icons';
import type { AuthUser, GoogleCalendarConfig, MicrosoftGraphConfig } from '../types';
import { useTheme } from '../context/ThemeContext';

export interface NavbarProps {
  activeTab: 'schedule' | 'interviews' | 'panel' | 'candidates';
  setActiveTab: (tab: 'schedule' | 'interviews' | 'panel' | 'candidates') => void;
  graphConfig: MicrosoftGraphConfig;
  googleConfig?: GoogleCalendarConfig;
  onOpenGraphModal: () => void;
  onOpenGoogleModal?: () => void;
  onResetData?: () => void;
  scheduledCount: number;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenGraphModal,
  onOpenGoogleModal,
  scheduledCount,
  currentUser,
  onLogout,
}) => {
  const { theme, toggleTheme, isNeo, toggleDesignVariant } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Click outside to close settings dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  const renderProviderIcon = () => {
    if (!currentUser) return null;
    if (currentUser.provider === 'google') return <GoogleIcon size={14} />;
    if (currentUser.provider === 'microsoft') return <MicrosoftIcon size={14} />;
    if (currentUser.provider === 'slack') return <SlackIcon size={14} />;
    return <User size={14} />;
  };

  if (!isNeo) {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            <div
              className="flex items-center space-x-3 cursor-pointer select-none shrink-0 group"
              onClick={() => setActiveTab('schedule')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Building className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center space-x-2 flex-nowrap">
                  <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                    Interview Panel Scheduler
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
                    currentUser?.provider === 'microsoft'
                      ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200/80 dark:border-sky-500/20'
                      : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20'
                  }`}>
                    {currentUser?.provider === 'microsoft' ? 'Microsoft Teams • In-Person' : (currentUser?.provider === 'slack' ? 'Slack & Video • In-Person' : 'Google Meet • In-Person')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap hidden sm:block">
                  Deterministic Multi-Calendar Availability & Room Engine
                </p>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200/90 dark:border-slate-800 shrink-0 shadow-inner">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm shadow-slate-300 dark:shadow-emerald-600/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Check Availability</span>
              </button>

              <button
                onClick={() => setActiveTab('interviews')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all relative cursor-pointer ${
                  activeTab === 'interviews'
                    ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm shadow-slate-300 dark:shadow-emerald-600/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Interviews</span>
                {scheduledCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-400/30 shrink-0">
                    {scheduledCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('panel')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'panel'
                    ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm shadow-slate-300 dark:shadow-emerald-600/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Panel Members</span>
              </button>

              <button
                onClick={() => setActiveTab('candidates')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'candidates'
                    ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm shadow-slate-300 dark:shadow-emerald-600/30 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Candidates</span>
              </button>
            </nav>

            <div className="flex items-center space-x-2 shrink-0">
              {/* Unified Settings Dropdown */}
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer ${
                    isSettingsOpen ? 'ring-2 ring-emerald-500 bg-slate-200/80 dark:bg-slate-800' : ''
                  }`}
                  title="Settings & Preferences"
                >
                  <Settings className={`w-4 h-4 transition-transform duration-200 ${isSettingsOpen ? 'rotate-45 text-emerald-600 dark:text-emerald-400' : ''}`} />
                </button>

                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 px-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Settings & Preferences</span>
                      <span className="text-[10px] text-slate-400 font-mono">Preferences</span>
                    </div>

                    {/* Integrations */}
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        (onOpenGoogleModal || onOpenGraphModal)();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 transition cursor-pointer text-xs group"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <GoogleIcon size={13} />
                          <SlackIcon size={13} />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">Integrations</div>
                          <div className="text-[10px] text-slate-400">Google, M365 & Slack</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        Manage
                      </span>
                    </button>

                    {/* UI Design Style */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <Palette className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-slate-900 dark:text-white">Design Variant</div>
                          <div className="text-[10px] text-slate-400">{isNeo ? 'Neo-Brutalism' : 'Modern 21st'}</div>
                        </div>
                      </div>
                      <button
                        onClick={toggleDesignVariant}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs transition"
                      >
                        {isNeo ? 'Neo' : 'Modern'}
                      </button>
                    </div>

                    {/* Color Mode */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-slate-900 dark:text-white">Color Mode</div>
                          <div className="text-[10px] text-slate-400">{theme === 'dark' ? 'Dark theme' : 'Light theme'}</div>
                        </div>
                      </div>
                      <button
                        onClick={toggleTheme}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs flex items-center gap-1 transition"
                      >
                        {theme === 'dark' ? <Sun className="w-3 h-3 text-amber-400" /> : <Moon className="w-3 h-3 text-indigo-600" />}
                        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {currentUser && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  {/* Direct Meet / Teams Quick Action */}
                  <a
                    href={currentUser.provider === 'microsoft' ? 'https://teams.microsoft.com' : 'https://meet.google.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                      currentUser.provider === 'microsoft'
                        ? 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                    }`}
                    title={currentUser.provider === 'microsoft' ? 'Open Microsoft Teams' : 'Open Google Meet'}
                  >
                    <Video className={`w-3.5 h-3.5 ${currentUser.provider === 'microsoft' ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span>{currentUser.provider === 'microsoft' ? 'Teams' : 'Meet'}</span>
                  </a>

                  <div
                    className="group relative flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs cursor-pointer"
                    title={currentUser.email || currentUser.id || currentUser.name}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 ${
                      currentUser.provider === 'microsoft' ? 'bg-[#0078d4]' : (currentUser.provider === 'slack' ? 'bg-[#4a154b]' : 'bg-emerald-600')
                    }`}>
                      {(currentUser.name || currentUser.email || 'U').trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1">
                      {renderProviderIcon()}
                      <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[110px] truncate">
                        {currentUser.name}
                      </span>
                    </div>

                    {/* Rich hover tooltip showing User ID (email) */}
                    <div className="pointer-events-none absolute right-0 top-full mt-2 hidden group-hover:flex flex-col items-start bg-slate-900 dark:bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl shadow-xl border border-slate-700/80 z-50 whitespace-nowrap min-w-[210px] animate-in fade-in zoom-in-95">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Logged In Account</div>
                      <div className="font-bold text-emerald-400 text-xs mt-0.5">{currentUser.name}</div>
                      <div className="text-[11px] text-slate-200 font-mono mt-1 select-all flex items-center gap-1.5 border-t border-slate-800 pt-1 w-full">
                        <span className="text-slate-400 text-[10px] font-sans font-bold">User ID:</span> {currentUser.email || currentUser.id}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 capitalize flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Platform: {currentUser.provider || 'Google'}</span>
                      </div>
                    </div>
                  </div>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#111726] border-b-2 border-black dark:border-slate-700 transition-colors font-mono">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-2 gap-3">
          <div
            className="flex items-center space-x-3 cursor-pointer select-none shrink-0"
            onClick={() => setActiveTab('schedule')}
          >
            <div className="w-10 h-10 bg-[#FACC15] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000] text-black shrink-0">
              <Target className="w-6 h-6" />
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center space-x-2 flex-nowrap">
                <span className="font-black text-sm sm:text-base text-black dark:text-white tracking-wider uppercase whitespace-nowrap">
                  INTERVIEW <span className="text-amber-500 font-extrabold">// PANEL SCHEDULER</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#FACC15] text-black border border-black rounded-none whitespace-nowrap">
                  GOOGLE & TEAMS
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap hidden sm:block">
                In-Person & Video Interview Scheduling Engine
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider whitespace-nowrap border-2 border-black dark:border-slate-700 transition-all cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Schedule Interview</span>
            </button>

            <button
              onClick={() => setActiveTab('interviews')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider whitespace-nowrap border-2 border-black dark:border-slate-700 transition-all cursor-pointer ${
                activeTab === 'interviews'
                  ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Interviews ({scheduledCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('panel')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider whitespace-nowrap border-2 border-black dark:border-slate-700 transition-all cursor-pointer ${
                activeTab === 'panel'
                  ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Panel Members</span>
            </button>

            <button
              onClick={() => setActiveTab('candidates')}
              className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider whitespace-nowrap border-2 border-black dark:border-slate-700 transition-all cursor-pointer ${
                activeTab === 'candidates'
                  ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Candidates</span>
            </button>
          </nav>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Unified Settings Dropdown in Neo Style */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 border-2 border-black dark:border-slate-700 bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_#000] hover:bg-yellow-400 transition active:translate-x-0.5 active:translate-y-0.5 cursor-pointer font-black"
                title="Settings & Preferences"
              >
                <Settings className="w-4 h-4" />
              </button>

              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border-3 border-black dark:border-white shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#fff] z-50 p-3 space-y-3 font-mono">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-black dark:border-white">
                    <span className="text-xs font-black uppercase text-black dark:text-white">SETTINGS</span>
                    <span className="text-[9px] bg-black text-white px-1 py-0.2 uppercase font-black">PREFS</span>
                  </div>

                  {/* Integrations */}
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      (onOpenGoogleModal || onOpenGraphModal)();
                    }}
                    className="w-full flex items-center justify-between p-2 border-2 border-black bg-zinc-50 dark:bg-zinc-800 hover:bg-yellow-100 dark:hover:bg-zinc-700 text-black dark:text-white cursor-pointer text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center gap-0.5 p-1 border border-black bg-white">
                        <GoogleIcon size={12} />
                        <SlackIcon size={12} />
                      </div>
                      <div className="text-left font-black uppercase text-[11px]">
                        <div>INTEGRATIONS</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-[#FACC15] text-black px-1.5 py-0.5 border border-black uppercase">
                      OPEN
                    </span>
                  </button>

                  {/* Theme Variant */}
                  <div className="flex items-center justify-between p-2 border-2 border-black bg-zinc-50 dark:bg-zinc-800 text-xs">
                    <div className="flex items-center space-x-2">
                      <Palette className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-black text-[11px] uppercase text-black dark:text-white">DESIGN STYLE</span>
                    </div>
                    <button
                      onClick={toggleDesignVariant}
                      className="text-[10px] font-black uppercase px-2 py-0.5 border border-black bg-white text-black shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                    >
                      {isNeo ? 'NEO' : 'MODERN'}
                    </button>
                  </div>

                  {/* Dark/Light Mode */}
                  <div className="flex items-center justify-between p-2 border-2 border-black bg-zinc-50 dark:bg-zinc-800 text-xs">
                    <div className="flex items-center space-x-2">
                      {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-yellow-400" /> : <Sun className="w-3.5 h-3.5 text-black" />}
                      <span className="font-black text-[11px] uppercase text-black dark:text-white">THEME MODE</span>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="text-[10px] font-black uppercase px-2 py-0.5 border border-black bg-white text-black shadow-[1px_1px_0px_0px_#000] cursor-pointer"
                    >
                      {theme === 'dark' ? 'LIGHT' : 'DARK'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l-2 border-black dark:border-slate-700">
                {/* Direct Meet / Teams Quick Action (Neo Style) */}
                <a
                  href={currentUser.provider === 'microsoft' ? 'https://teams.microsoft.com' : 'https://meet.google.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hidden sm:flex items-center gap-1 px-2 py-1 border-2 border-black font-black text-[11px] uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer text-black ${
                    currentUser.provider === 'microsoft'
                      ? 'bg-[#BAE6FD] hover:bg-[#7DD3FC]'
                      : 'bg-[#A7F3D0] hover:bg-[#6EE7B7]'
                  }`}
                  title={currentUser.provider === 'microsoft' ? 'Open Microsoft Teams' : 'Open Google Meet'}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{currentUser.provider === 'microsoft' ? 'TEAMS' : 'MEET'}</span>
                </a>

                <div
                  className="group relative flex items-center gap-2 px-2 py-1 border-2 border-black bg-[#fef08a] text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                  title={currentUser.email || currentUser.id || currentUser.name}
                >
                  <div className="w-5 h-5 border border-black bg-black text-white font-black text-[11px] flex items-center justify-center shrink-0">
                    {(currentUser.name || currentUser.email || 'U').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-1">
                    {renderProviderIcon()}
                    <span className="max-w-[100px] truncate">{currentUser.name}</span>
                  </div>

                  {/* Rich hover tooltip showing User ID (email) in Neo style */}
                  <div className="pointer-events-none absolute right-0 top-full mt-2 hidden group-hover:flex flex-col items-start bg-white dark:bg-zinc-900 border-3 border-black text-black dark:text-white p-2.5 shadow-[4px_4px_0px_0px_#000] z-50 whitespace-nowrap font-mono animate-in fade-in min-w-[210px]">
                    <div className="text-[9px] bg-black text-white px-1 py-0.2 font-black uppercase">LOGGED IN USER</div>
                    <div className="font-black text-xs mt-1 uppercase">{currentUser.name}</div>
                    <div className="text-[11px] font-bold mt-1 text-slate-700 dark:text-slate-200 lowercase select-all border-t border-black dark:border-zinc-700 pt-1 w-full flex items-center gap-1">
                      <span className="font-black uppercase text-[10px]">USER ID: </span>{currentUser.email || currentUser.id}
                    </div>
                    <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mt-0.5">
                      PLATFORM: {currentUser.provider || 'GOOGLE'}
                    </div>
                  </div>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-1.5 border-2 border-black bg-[#f43f5e] text-white shadow-[2px_2px_0px_0px_#000] hover:bg-[#e11d48] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
