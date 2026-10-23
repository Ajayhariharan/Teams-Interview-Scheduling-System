import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { GoogleIcon, MicrosoftIcon, SlackIcon, ShieldCheck, ArrowRight, Video, Info } from './icons';
import type { AuthUser } from '../types';

export type { AuthUser };

export interface LoginPageProps {
  onLogin?: (user: AuthUser) => void;
  onLoginSuccess?: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onLoginSuccess }) => {
  const { theme, isNeo } = useTheme();
  const isDark = theme === 'dark';
  const isOld = !isNeo;
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isConnectingMicrosoft, setIsConnectingMicrosoft] = useState(false);
  const [isConnectingSlack, setIsConnectingSlack] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const notifyLogin = (user: AuthUser) => {
    if (onLogin) onLogin(user);
    if (onLoginSuccess) onLoginSuccess(user);
  };

  // Immediate check if URL has OAuth parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('auth_token');
      const provider = (params.get('provider') as 'google' | 'microsoft' | 'slack') || 'google';

      if (params.get('microsoft_pending_config')) {
        setNoticeMessage(
          'Microsoft Azure AD credentials pending: Provide MICROSOFT_CLIENT_ID & TENANT_ID in backend/.env anytime, or explore using Demo Mode.'
        );
      } else if (params.get('slack_pending_config')) {
        setNoticeMessage(
          'Slack OAuth credentials pending: Provide SLACK_CLIENT_ID & SLACK_CLIENT_SECRET in backend/.env anytime, or explore Slack integration features in Demo Mode.'
        );
      } else if (params.get('auth_error')) {
        setNoticeMessage(`Authentication notice: ${decodeURIComponent(params.get('auth_error') || '')}`);
      }

      if (token) {
        const email = params.get('user_email');
        const name = params.get('user_name');
        const avatar = params.get('user_avatar');

        const fallbackEmail = provider === 'microsoft' ? 'microsoft.user@organization.com' : 'google.user@company.com';
        const resolvedEmail = email ? decodeURIComponent(email) : fallbackEmail;
        const resolvedName = name ? decodeURIComponent(name) : (email ? decodeURIComponent(email).split('@')[0] : `${provider === 'microsoft' ? 'Microsoft' : 'Google'} Recruiter`);
        const defaultBg = provider === 'microsoft' ? '0078d4' : '10b981';
        const resolvedAvatar = avatar ? decodeURIComponent(avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=${defaultBg}&color=fff`;

        const user: AuthUser = {
          id: resolvedEmail,
          name: resolvedName,
          email: resolvedEmail,
          avatar: resolvedAvatar,
          provider,
          role: 'Recruiting & Hiring Lead',
          accessToken: token,
        };
        localStorage.setItem('sug_auth_user', JSON.stringify(user));
        notifyLogin(user);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleRealGoogleLogin = () => {
    setIsConnectingGoogle(true);
    window.location.href = 'http://localhost:8000/auth/google/login';
  };

  const handleRealMicrosoftLogin = () => {
    setIsConnectingMicrosoft(true);
    window.location.href = 'http://localhost:8000/auth/microsoft/login';
  };

  const handleRealSlackLogin = () => {
    setIsConnectingSlack(true);
    window.location.href = 'http://localhost:8000/auth/slack/login';
  };

  const handleDemoLogin = (name: string, email: string, role: string, provider: 'google' | 'microsoft' | 'slack' = 'google') => {
    let bg = '10b981';
    if (provider === 'microsoft') bg = '0078d4';
    if (provider === 'slack') bg = '4a154b';

    const user: AuthUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      provider: provider,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff`,
    };
    notifyLogin(user);
  };

  if (isOld) {
    return (
      <div className={`min-h-screen w-full flex flex-col justify-between transition-colors duration-200 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
      }`}>
        {/* Header */}
        <header className={`w-full border-b px-6 py-4 flex items-center justify-between transition-colors ${
          isDark ? 'border-zinc-800/80 bg-zinc-950/80' : 'border-zinc-200/80 bg-white/80'
        } backdrop-blur-md`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
              S
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight block">Interview Scheduler</span>
              <span className="text-[11px] text-zinc-500 block -mt-0.5">Unified Google Workspace, Microsoft 365 & Slack Interview Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Google, Microsoft & Slack SSO
            </span>
          </div>
        </header>

        {/* Main Center Box */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-8 shadow-xl transition-all ${
            isDark 
              ? 'bg-zinc-900/90 border-zinc-800 shadow-2xl shadow-black/40' 
              : 'bg-white border-zinc-200/90 shadow-xl shadow-zinc-200/50'
          }`}>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Sign In to Interview Scheduler</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Connect your work account to sync panel availability, generate Google Meet / Teams calls, and send instant Slack interview notifications.
              </p>
            </div>

            {noticeMessage && (
              <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 leading-relaxed">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{noticeMessage}</span>
                  <button
                    type="button"
                    onClick={() => setNoticeMessage(null)}
                    className="block mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Triple SSO Actions: Google, Microsoft, Slack */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleRealGoogleLogin}
                disabled={isConnectingGoogle}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 font-semibold text-sm transition shadow-sm hover:shadow cursor-pointer"
              >
                <GoogleIcon className="w-4 h-4 shrink-0" />
                <span>{isConnectingGoogle ? 'Redirecting to Google...' : 'Sign In with Google Workspace'}</span>
              </button>

              <button
                type="button"
                onClick={handleRealMicrosoftLogin}
                disabled={isConnectingMicrosoft}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-sky-500/40 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-950 dark:text-sky-200 font-semibold text-sm transition shadow-sm hover:shadow cursor-pointer"
              >
                <MicrosoftIcon className="w-4 h-4 shrink-0" />
                <span>{isConnectingMicrosoft ? 'Redirecting to Microsoft...' : 'Sign In with Microsoft 365'}</span>
              </button>

              <button
                type="button"
                onClick={handleRealSlackLogin}
                disabled={isConnectingSlack}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-purple-500/40 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-950 dark:text-purple-200 font-semibold text-sm transition shadow-sm hover:shadow cursor-pointer"
              >
                <SlackIcon className="w-4 h-4 shrink-0" />
                <span>{isConnectingSlack ? 'Redirecting to Slack...' : 'Sign In with Slack'}</span>
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>Quick Demo:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('Alex Johnson (Google)', 'alex.sample@example.com', 'Lead Panelist', 'google')}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold cursor-pointer underline"
                >
                  Google
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('Demo User (Microsoft)', 'demo.user@example.com', 'Engineering Panelist', 'microsoft')}
                  className="hover:text-sky-600 dark:hover:text-sky-400 font-semibold cursor-pointer underline"
                >
                  Microsoft
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('Slack Recruiter', 'recruiter@slack-workspace.com', 'Talent Lead', 'slack')}
                  className="hover:text-purple-600 dark:hover:text-purple-400 font-semibold cursor-pointer underline"
                >
                  Slack
                </button>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-4 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
          Interview Scheduler Platform • Google Workspace, Microsoft 365 & Slack Workspace Integration
        </footer>
      </div>
    );
  }

  // Neo-Brutalism Theme
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#FACC15] dark:bg-[#0B0F19] text-black dark:text-white font-mono transition-colors">
      <header className="w-full border-b-4 border-black dark:border-slate-700 bg-white dark:bg-[#111726] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black text-white dark:bg-[#FACC15] dark:text-black flex items-center justify-center font-black text-lg">
            S
          </div>
          <span className="font-black text-sm uppercase tracking-wider">INTERVIEW SCHEDULER // SSO PORTAL</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="border-2 border-black bg-[#BBF7D0] px-2 py-0.5 text-xs font-black uppercase text-black">
            GOOGLE READY
          </span>
          <span className="border-2 border-black bg-[#BAE6FD] px-2 py-0.5 text-xs font-black uppercase text-black">
            MICROSOFT READY
          </span>
          <span className="border-2 border-black bg-[#FCE7F3] px-2 py-0.5 text-xs font-black uppercase text-black">
            SLACK READY
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#111726] border-4 border-black dark:border-slate-700 p-6 shadow-[8px_8px_0px_0px_#000] space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-lg font-black uppercase tracking-wider">SELECT LOGIN PROVIDER</h1>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Sign in with your Google Workspace, Microsoft 365, or Slack account.
            </p>
          </div>

          {noticeMessage && (
            <div className="p-3 bg-yellow-200 border-2 border-black text-black text-xs font-black uppercase">
              {noticeMessage}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRealGoogleLogin}
              disabled={isConnectingGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#A7F3D0] hover:bg-[#6EE7B7] text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span>{isConnectingGoogle ? 'CONNECTING GOOGLE...' : 'SIGN IN WITH GOOGLE WORKSPACE'}</span>
            </button>

            <button
              type="button"
              onClick={handleRealMicrosoftLogin}
              disabled={isConnectingMicrosoft}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#BAE6FD] hover:bg-[#7DD3FC] text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
            >
              <MicrosoftIcon className="w-4 h-4 shrink-0" />
              <span>{isConnectingMicrosoft ? 'CONNECTING MICROSOFT...' : 'SIGN IN WITH MICROSOFT 365'}</span>
            </button>

            <button
              type="button"
              onClick={handleRealSlackLogin}
              disabled={isConnectingSlack}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#FCE7F3] hover:bg-[#FBCFE8] text-black font-black uppercase text-xs border-2 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
            >
              <SlackIcon className="w-4 h-4 shrink-0" />
              <span>{isConnectingSlack ? 'CONNECTING SLACK...' : 'SIGN IN WITH SLACK'}</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs font-bold uppercase tracking-wider">
        INTERVIEW SCHEDULER PLATFORM • GOOGLE WORKSPACE, MICROSOFT 365 & SLACK
      </footer>
    </div>
  );
};
