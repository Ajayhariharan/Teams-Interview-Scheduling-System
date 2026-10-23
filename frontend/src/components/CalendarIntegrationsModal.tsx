import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { X, Check, RefreshCw, GoogleIcon, MicrosoftIcon, SlackIcon, Globe, ShieldCheck, Sparkles, CheckCircle, Zap, AlertCircle } from './icons';
import type { GoogleCalendarConfig, MicrosoftGraphConfig, SlackConfig } from '../types';
import { SlackService } from '../services/slackService';

interface CalendarIntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleConfig: GoogleCalendarConfig;
  onSaveGoogleConfig: (config: GoogleCalendarConfig) => void;
  graphConfig: MicrosoftGraphConfig;
  onSaveGraphConfig: (config: MicrosoftGraphConfig) => void;
  slackConfig?: SlackConfig;
  onSaveSlackConfig?: (config: SlackConfig) => void;
}

export const CalendarIntegrationsModal: React.FC<CalendarIntegrationsModalProps> = ({
  isOpen,
  onClose,
  googleConfig,
  onSaveGoogleConfig,
  graphConfig,
  onSaveGraphConfig,
  slackConfig,
  onSaveSlackConfig,
}) => {
  const { theme, isNeo } = useTheme();
  const isDark = theme === 'dark';
  const isOld = !isNeo;

  const [activeTab, setActiveTab] = useState<'google' | 'microsoft' | 'slack'>('google');
  const [googleState, setGoogleState] = useState<GoogleCalendarConfig>({ ...googleConfig });
  const [graphState, setGraphState] = useState<MicrosoftGraphConfig>({ ...graphConfig });
  const [slackState, setSlackState] = useState<SlackConfig>(() => {
    return slackConfig || SlackService.getSlackConfig();
  });

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTestingAuth, setIsTestingAuth] = useState(false);
  const [isTestingSlack, setIsTestingSlack] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [backendSlackStatus, setBackendSlackStatus] = useState<{ configured: boolean; channel: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      SlackService.getBackendStatus().then(status => {
        setBackendSlackStatus(status);
        if (status.configured && !slackState.webhookUrl && !slackState.botToken) {
          setSlackState(prev => ({
            ...prev,
            connected: true,
            channel: status.channel || prev.channel || '#interviews',
          }));
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveGoogleConfig(googleState);
    onSaveGraphConfig(graphState);
    if (onSaveSlackConfig) {
      onSaveSlackConfig(slackState);
    }
    SlackService.saveSlackConfig(slackState);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  const handleTestGoogleOAuth = () => {
    setIsTestingAuth(true);
    setTimeout(() => {
      setGoogleState((prev) => ({
        ...prev,
        authStatus: 'connected',
        connectedEmail: prev.connectedEmail || 'recruiter@sample.org',
        lastSyncedAt: new Date().toISOString(),

      }));
      setIsTestingAuth(false);
    }, 600);
  };

  const handleTestSlack = async () => {
    setIsTestingSlack(true);
    setSlackTestResult(null);
    const res = await SlackService.testSlackConnection({
      webhookUrl: slackState.webhookUrl,
      botToken: slackState.botToken,
      channel: slackState.channel,
    });
    setSlackTestResult(res);
    setIsTestingSlack(false);
    if (res.success) {
      setSlackState(prev => ({ ...prev, connected: true }));
    }
  };

  if (isOld) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
        }`}>
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Globe size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Integrations & Notifications</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Connect Google Calendar, Microsoft Teams & Slack for automated scheduling & instant team alerts
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-2 my-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <button
              onClick={() => setActiveTab('google')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'google'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <GoogleIcon size={16} />
              <span>Google Calendar</span>
              {googleState.authStatus === 'connected' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('microsoft')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'microsoft'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <MicrosoftIcon size={16} />
              <span>Microsoft 365</span>
              {graphState.authStatus === 'connected' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('slack')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'slack'
                  ? 'bg-[#4A154B] text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <SlackIcon size={16} />
              <span>Slack Notifications</span>
              {(slackState.connected || backendSlackStatus?.configured) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>

          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${
                    googleState.authStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`} />
                  <div>
                    <div className="text-xs font-semibold">
                      OAuth Status: {googleState.authStatus === 'connected' ? 'Connected & Authorized' : 'Disconnected'}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {googleState.connectedEmail ? `Active Account: ${googleState.connectedEmail}` : 'No Google account connected'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestGoogleOAuth}
                  disabled={isTestingAuth}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={13} className={isTestingAuth ? 'animate-spin' : ''} />
                  {googleState.authStatus === 'connected' ? 'Re-authorize OAuth' : 'Authorize Now'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Google OAuth 2.0 Client ID
                </label>
                <input
                  type="text"
                  value={googleState.clientId}
                  onChange={(e) => setGoogleState({ ...googleState, clientId: e.target.value })}
                  placeholder="e.g. 1234567890-xxx.apps.googleusercontent.com"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Redirect URI (Authorized redirect URIs in Google Console)
                </label>
                <input
                  type="text"
                  value={googleState.redirectUri || 'http://localhost:8000/auth/google/callback'}
                  onChange={(e) => setGoogleState({ ...googleState, redirectUri: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'microsoft' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${
                    graphState.authStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`} />
                  <div>
                    <div className="text-xs font-semibold">
                      Status: {graphState.authStatus === 'connected' ? 'Connected (Microsoft Graph)' : 'Mock Mode Active'}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Tenant: {graphState.tenantId || 'Default Enterprise Tenant'}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Directory (Tenant) ID
                </label>
                <input
                  type="text"
                  value={graphState.tenantId}
                  onChange={(e) => setGraphState({ ...graphState, tenantId: e.target.value })}
                  placeholder="e.g. contoso.onmicrosoft.com or common"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Application (Client) ID
                </label>
                <input
                  type="text"
                  value={graphState.clientId}
                  onChange={(e) => setGraphState({ ...graphState, clientId: e.target.value })}
                  placeholder="7f91a823-3b60-449e-8c33-91283d789012"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'slack' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${
                    backendSlackStatus?.configured || slackState.webhookUrl || slackState.botToken
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500'
                  }`} />
                  <div>
                    <div className="font-semibold text-purple-900 dark:text-purple-200">
                      {backendSlackStatus?.configured
                        ? 'Connected via backend .env'
                        : (slackState.webhookUrl || slackState.botToken ? 'Custom Slack Credentials Set' : 'Slack Not Configured')}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Sends rich Block Kit alerts with Candidate details and Meet/Teams join links
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestSlack}
                  disabled={isTestingSlack}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#4A154B] hover:bg-[#3d113e] text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <SlackIcon size={14} className={isTestingSlack ? 'animate-spin' : ''} />
                  {isTestingSlack ? 'Sending...' : 'Send Test Alert'}
                </button>
              </div>

              {slackTestResult && (
                <div className={`p-2.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                  slackTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}>
                  {slackTestResult.success ? <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />}
                  <span>{slackTestResult.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Option A: Incoming Webhook URL (Easiest)
                </label>
                <input
                  type="text"
                  value={slackState.webhookUrl || ''}
                  onChange={(e) => setSlackState({ ...slackState, webhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/your/webhook/url"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <p className="text-[11px] text-zinc-500 mt-1">Directly delivers rich messages to a selected channel without OAuth scopes.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Option B: Bot User OAuth Token
                  </label>
                  <input
                    type="password"
                    value={slackState.botToken || ''}
                    onChange={(e) => setSlackState({ ...slackState, botToken: e.target.value })}
                    placeholder="xoxb-your-slack-bot-token"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Default Channel
                  </label>
                  <input
                    type="text"
                    value={slackState.channel || '#interviews'}
                    onChange={(e) => setSlackState({ ...slackState, channel: e.target.value })}
                    placeholder="#interviews or C0123456789"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Notification Triggers:</div>
                <label className="flex items-center gap-2 text-xs cursor-pointer text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={slackState.notifyOnSchedule}
                    onChange={(e) => setSlackState({ ...slackState, notifyOnSchedule: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Post message automatically when an interview is <strong>scheduled</strong></span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={slackState.notifyOnCancel}
                    onChange={(e) => setSlackState({ ...slackState, notifyOnCancel: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Post cancellation alert when an interview is <strong>cancelled</strong></span>
                </label>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check size={14} /> Saved & Synced!
                </>
              ) : (
                'Save Integrations'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Neo Theme Version
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans">
      <div className={`w-full max-w-2xl border-4 border-black p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-h-[92vh] overflow-y-auto ${
        isDark ? 'bg-[#1e293b] text-[#f8fafc]' : 'bg-[#fffdfa] text-black'
      }`}>
        <div className="flex items-center justify-between pb-4 border-b-3 border-black">
          <div>
            <span className="px-2.5 py-0.5 bg-[#fef08a] text-black border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              API & WEBHOOK CONFIGURATION
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight mt-1">Calendar & Slack Integrations</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 border-2 border-black bg-[#f43f5e] text-white hover:bg-[#e11d48] font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2.5 my-5">
          <button
            onClick={() => setActiveTab('google')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-3 border-black font-black text-xs uppercase transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer ${
              activeTab === 'google'
                ? 'bg-[#38bdf8] text-black'
                : 'bg-white text-black hover:bg-[#fed7aa]'
            }`}
          >
            <GoogleIcon size={16} />
            Google
          </button>
          <button
            onClick={() => setActiveTab('microsoft')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-3 border-black font-black text-xs uppercase transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer ${
              activeTab === 'microsoft'
                ? 'bg-[#c084fc] text-black'
                : 'bg-white text-black hover:bg-[#fbcfe8]'
            }`}
          >
            <MicrosoftIcon size={16} />
            Microsoft
          </button>
          <button
            onClick={() => setActiveTab('slack')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border-3 border-black font-black text-xs uppercase transition shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer ${
              activeTab === 'slack'
                ? 'bg-[#ec4899] text-white'
                : 'bg-white text-black hover:bg-[#fce7f3]'
            }`}
          >
            <SlackIcon size={16} />
            Slack Alerts
          </button>
        </div>

        {activeTab === 'google' && (
          <div className="space-y-4">
            <div className="p-3 border-2 border-black bg-[#dcfce7] text-black flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="font-black text-xs uppercase">
                  STATUS: {googleState.authStatus === 'connected' ? 'CONNECTED TO GOOGLE API' : 'OAUTH REQUIRED'}
                </div>
                <div className="text-[11px] font-bold text-black/70">
                  {googleState.connectedEmail || 'recruiter@sample.org'}
                </div>

              </div>
              <button
                type="button"
                onClick={handleTestGoogleOAuth}
                disabled={isTestingAuth}
                className="px-3 py-1.5 border-2 border-black bg-white hover:bg-[#fef08a] font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                {isTestingAuth ? 'Authorizing...' : 'Re-Authorize OAuth'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1">
                Google OAuth 2.0 Client ID
              </label>
              <input
                type="text"
                value={googleState.clientId}
                onChange={(e) => setGoogleState({ ...googleState, clientId: e.target.value })}
                className="w-full p-2.5 border-2 border-black bg-white text-black font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1">
                Redirect Callback URI (FastAPI Backend)
              </label>
              <input
                type="text"
                value={googleState.redirectUri || 'http://localhost:8000/auth/google/callback'}
                onChange={(e) => setGoogleState({ ...googleState, redirectUri: e.target.value })}
                className="w-full p-2.5 border-2 border-black bg-[#e2e8f0] text-black font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>
          </div>
        )}

        {activeTab === 'microsoft' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase mb-1">
                Microsoft Directory (Tenant) ID
              </label>
              <input
                type="text"
                value={graphState.tenantId}
                onChange={(e) => setGraphState({ ...graphState, tenantId: e.target.value })}
                className="w-full p-2.5 border-2 border-black bg-white text-black font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1">
                Microsoft Application (Client) ID
              </label>
              <input
                type="text"
                value={graphState.clientId}
                onChange={(e) => setGraphState({ ...graphState, clientId: e.target.value })}
                className="w-full p-2.5 border-2 border-black bg-white text-black font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
              />
            </div>
          </div>
        )}

        {activeTab === 'slack' && (
          <div className="space-y-4">
            <div className="p-3 border-2 border-black bg-[#fce7f3] text-black flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="font-black text-xs uppercase flex items-center gap-1.5">
                  <SlackIcon size={16} />
                  SLACK STATUS: {backendSlackStatus?.configured || slackState.webhookUrl || slackState.botToken ? 'READY TO NOTIFY' : 'CONFIG REQUIRED'}
                </div>
                <div className="text-[11px] font-bold text-black/70 mt-0.5">
                  Target Channel: {slackState.channel || '#interviews'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestSlack}
                disabled={isTestingSlack}
                className="px-3.5 py-1.5 border-2 border-black bg-[#ec4899] text-white hover:bg-[#db2777] font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
              >
                {isTestingSlack ? (
                  'TESTING...'
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 shrink-0 stroke-[3]" />
                    <span>TEST SLACK ALERT</span>
                  </>
                )}
              </button>
            </div>

            {slackTestResult && (
              <div className={`p-2.5 border-2 border-black font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 ${
                slackTestResult.success ? 'bg-[#86efac] text-black' : 'bg-[#fda4af] text-black'
              }`}>
                {slackTestResult.success ? <Check className="w-4 h-4 shrink-0 stroke-[3]" /> : <X className="w-4 h-4 shrink-0 stroke-[3]" />}
                <span>{slackTestResult.message}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase mb-1">
                Option A: Incoming Webhook URL (Recommended)
              </label>
              <input
                type="text"
                value={slackState.webhookUrl || ''}
                onChange={(e) => setSlackState({ ...slackState, webhookUrl: e.target.value })}
                placeholder="https://hooks.slack.com/services/your/webhook/url"
                className="w-full p-2.5 border-2 border-black bg-white text-black font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black uppercase mb-1">
                  Option B: Bot User Token (xoxb-...)
                </label>
                <input
                  type="password"
                  value={slackState.botToken || ''}
                  onChange={(e) => setSlackState({ ...slackState, botToken: e.target.value })}
                  placeholder="xoxb-••••••••••••"
                  className="w-full p-2.5 border-2 border-black bg-white text-black font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">
                  Slack Channel
                </label>
                <input
                  type="text"
                  value={slackState.channel || '#interviews'}
                  onChange={(e) => setSlackState({ ...slackState, channel: e.target.value })}
                  placeholder="#interviews"
                  className="w-full p-2.5 border-2 border-black bg-white text-black font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
                />
              </div>
            </div>

            <div className="p-3 border-2 border-black bg-[#fef08a] text-black space-y-2">
              <div className="font-black text-xs uppercase">Automatic Triggers:</div>
              <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={slackState.notifyOnSchedule}
                  onChange={(e) => setSlackState({ ...slackState, notifyOnSchedule: e.target.checked })}
                  className="w-4 h-4 border-2 border-black accent-black"
                />
                <span>Alert Slack channel on new interview scheduled</span>
              </label>
              <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={slackState.notifyOnCancel}
                  onChange={(e) => setSlackState({ ...slackState, notifyOnCancel: e.target.checked })}
                  className="w-4 h-4 border-2 border-black accent-black"
                />
                <span>Alert Slack channel when interview is cancelled</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t-3 border-black">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border-2 border-black bg-[#f1f5f9] hover:bg-[#e2e8f0] font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 border-3 border-black bg-[#4ade80] hover:bg-[#22c55e] text-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>SAVED & SYNCED</span>
              </>
            ) : (
              'SAVE INTEGRATION SETTINGS'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
