import type { ScheduledInterview, SlackConfig } from '../types';

const API_BASE = 'http://localhost:8000';
const STORAGE_KEY = 'sug_slack_config_v1';

const DEFAULT_SLACK_CONFIG: SlackConfig = {
  webhookUrl: '',
  botToken: '',
  channel: '#interviews',
  notifyOnSchedule: true,
  notifyOnCancel: true,
  connected: false,
};

export class SlackService {
  public static getSlackConfig(): SlackConfig {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return DEFAULT_SLACK_CONFIG;
    }
    try {
      return { ...DEFAULT_SLACK_CONFIG, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SLACK_CONFIG;
    }
  }

  public static saveSlackConfig(config: SlackConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  public static async getBackendStatus(): Promise<{
    configured: boolean;
    has_webhook: boolean;
    has_bot_token: boolean;
    webhook_url?: string;
    bot_token_preview?: string;
    channel: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/api/slack/status`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not query Slack backend status:', e);
    }
    return {
      configured: false,
      has_webhook: false,
      has_bot_token: false,
      channel: '#interviews',
    };
  }

  public static async testSlackConnection(params?: {
    webhookUrl?: string;
    botToken?: string;
    channel?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const config = this.getSlackConfig();
      const webhook_url = params?.webhookUrl !== undefined ? params.webhookUrl : config.webhookUrl;
      const bot_token = params?.botToken !== undefined ? params.botToken : config.botToken;
      const channel = params?.channel !== undefined ? params.channel : config.channel;

      const res = await fetch(`${API_BASE}/api/slack/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_url: webhook_url || undefined,
          bot_token: bot_token || undefined,
          channel: channel || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Test alert failed' };
      }
      return { success: true, message: data.message || 'Notification sent to Slack!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect to backend' };
    }
  }

  public static async notifyInterviewScheduled(
    interview: ScheduledInterview,
    overrideConfig?: Partial<SlackConfig>
  ): Promise<boolean> {
    const config = { ...this.getSlackConfig(), ...overrideConfig };
    if (!config.notifyOnSchedule) return false;

    try {
      const res = await fetch(`${API_BASE}/api/slack/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview,
          action: 'scheduled',
          webhook_url: config.webhookUrl || undefined,
          bot_token: config.botToken || undefined,
          channel: config.channel || undefined,
        }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to send Slack scheduled alert:', err);
      return false;
    }
  }

  public static async notifyInterviewCancelled(
    interview: ScheduledInterview,
    overrideConfig?: Partial<SlackConfig>
  ): Promise<boolean> {
    const config = { ...this.getSlackConfig(), ...overrideConfig };
    if (!config.notifyOnCancel) return false;

    try {
      const res = await fetch(`${API_BASE}/api/slack/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interview,
          action: 'cancelled',
          webhook_url: config.webhookUrl || undefined,
          bot_token: config.botToken || undefined,
          channel: config.channel || undefined,
        }),
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to send Slack cancelled alert:', err);
      return false;
    }
  }
}
