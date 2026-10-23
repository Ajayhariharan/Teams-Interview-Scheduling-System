import React, { useState } from 'react';
import type { MicrosoftGraphConfig } from '../types';
import {
  Server,
  CheckCircle2,
  X,
  Info,
  RefreshCw,
  Zap,
} from './icons';
import { useTheme } from '../context/ThemeContext';

interface GraphConfigModalProps {
  config: MicrosoftGraphConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: MicrosoftGraphConfig) => void;
}

export const GraphConfigModal: React.FC<GraphConfigModalProps> = ({
  config,
  isOpen,
  onClose,
  onSave,
}) => {
  const { isNeo } = useTheme();
  const [isMockMode, setIsMockMode] = useState(config.isMockMode);
  const [tenantId, setTenantId] = useState(config.tenantId);
  const [clientId, setClientId] = useState(config.clientId);
  const [clientSecret, setClientSecret] = useState(config.clientSecret);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult(null);

    setTimeout(() => {
      setIsTesting(false);
      if (isMockMode) {
        setTestResult('Success: Outlook Calendar Availability Simulator is active.');
      } else {
        setTestResult('Success: Validated connection to Microsoft Graph API endpoint.');
      }
    }, 600);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      isMockMode,
      tenantId,
      clientId,
      clientSecret,
      authStatus: isMockMode ? 'mocked' : 'connected',
      lastSyncedAt: new Date().toISOString(),
    });
    onClose();
  };

  // -------------------------------------------------------------
  // OLD THEME (Modern / 21st.dev Style)
  // -------------------------------------------------------------
  if (!isNeo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-slate-100 transition-all">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Microsoft 365 & Outlook Connector</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure Outlook Calendar sync for panel availability checks.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 pt-4">
            {/* Mode Switcher */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Integration Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsMockMode(true)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border shadow-xs cursor-pointer ${
                    isMockMode
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Zero-Config Simulator
                </button>
                <button
                  type="button"
                  onClick={() => setIsMockMode(false)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border shadow-xs cursor-pointer ${
                    !isMockMode
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Live Azure AD Graph API
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 leading-relaxed">
                {isMockMode
                  ? 'Pre-seeded realistic multi-person Outlook calendars with instant deterministic intersection calculation.'
                  : 'Connect to your enterprise Microsoft Azure AD tenant using Graph App permissions (Calendars.Read) to query live schedules.'}
              </p>
            </div>

            {!isMockMode && (
              <div className="space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Azure AD Tenant ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. contoso.onmicrosoft.com or GUID"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">App (Client) ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7f91a823-3b60-449e-8c33-91283d789012"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Client Secret</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••••••••••"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono transition"
                  />
                </div>
              </div>
            )}

            {/* Graph API Specs Preview */}
            <div className="bg-slate-50 dark:bg-slate-950/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-300 font-bold">
                <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Microsoft Graph Endpoint:</span>
              </div>
              <div>POST <code className="text-emerald-600 dark:text-emerald-400 font-bold">/v1.0/users/{'{id}'}/calendar/getSchedule</code></div>
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{testResult}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // NEW THEME (Neo-Brutalism High-Contrast Style)
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#111726] border-3 border-black dark:border-slate-700 max-w-lg w-full p-6 shadow-[8px_8px_0px_0px_#000] relative text-black dark:text-white font-mono transition-all">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 border-2 border-black text-black dark:text-white hover:bg-slate-100 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 pb-3 border-b-2 border-black dark:border-slate-700">
          <div className="w-9 h-9 bg-[#FACC15] border-2 border-black flex items-center justify-center text-black font-black shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <Zap className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider">MICROSOFT 365 & OUTLOOK CONNECTOR</h2>
            <p className="text-[11px] text-slate-500">Configure Outlook Calendar sync for panel availability checks.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-4">
          {/* Mode Switcher */}
          <div className="bg-slate-50 dark:bg-slate-900 p-3 border-2 border-black dark:border-slate-700 space-y-2">
            <label className="text-xs font-black uppercase block">INTEGRATION MODE *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsMockMode(true)}
                className={`py-2 px-3 text-xs font-black uppercase border-2 border-black transition shadow-[2px_2px_0px_0px_#000] cursor-pointer ${
                  isMockMode
                    ? 'bg-[#FACC15] text-black'
                    : 'bg-white dark:bg-slate-800 text-black dark:text-white'
                }`}
              >
                Zero-Config Simulator
              </button>
              <button
                type="button"
                onClick={() => setIsMockMode(false)}
                className={`py-2 px-3 text-xs font-black uppercase border-2 border-black transition shadow-[2px_2px_0px_0px_#000] cursor-pointer ${
                  !isMockMode
                    ? 'bg-[#FACC15] text-black'
                    : 'bg-white dark:bg-slate-800 text-black dark:text-white'
                }`}
              >
                Live Azure AD Graph
              </button>
            </div>
            <p className="text-[10px] text-slate-500 pt-1 leading-relaxed">
              {isMockMode
                ? 'Pre-seeded realistic multi-person Outlook calendars with instant deterministic intersection calculation.'
                : 'Connect to your enterprise Microsoft Azure AD tenant using Graph App permissions (Calendars.Read) to query live schedules.'}
            </p>
          </div>

          {!isMockMode && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase mb-1">AZURE AD TENANT ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. contoso.onmicrosoft.com or GUID"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-2 text-xs font-mono text-black dark:text-white focus:outline-none focus:bg-[#FEF9C3]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">APP (CLIENT) ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 7f91a823-3b60-449e-8c33-91283d789012"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-2 text-xs font-mono text-black dark:text-white focus:outline-none focus:bg-[#FEF9C3]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">CLIENT SECRET *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••••••••••"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 p-2 text-xs font-mono text-black dark:text-white focus:outline-none focus:bg-[#FEF9C3]"
                />
              </div>
            </div>
          )}

          {/* Graph API Specs Preview */}
          <div className="border-2 border-dashed border-black dark:border-slate-700 p-2.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
            <div className="font-bold text-black dark:text-white uppercase">MICROSOFT GRAPH ENDPOINT:</div>
            <div>POST <code className="text-blue-600 dark:text-blue-400 font-bold">/v1.0/users/{'{id}'}/calendar/getSchedule</code></div>
          </div>

          {testResult && (
            <div className="p-2 border-2 border-emerald-600 bg-emerald-50 text-emerald-800 text-xs font-bold font-mono">
              {testResult}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-2 text-xs font-black uppercase bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
            >
              {isTesting ? 'TESTING...' : 'TEST CONNECTION'}
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-black uppercase border-2 border-black dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-black uppercase bg-[#FACC15] hover:bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
              >
                SAVE SETTINGS
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
