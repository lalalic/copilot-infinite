import * as vscode from 'vscode';
import { LoopConfiguration } from './config';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';
const DISCORD_INTENTS = (1 << 0) | (1 << 9) | (1 << 15); // GUILDS | GUILD_MESSAGES | MESSAGE_CONTENT

export type DiscordConnectionState =
  | { status: 'disabled' }
  | { status: 'not-configured' }
  | { status: 'connecting' }
  | { status: 'online' }
  | { status: 'error'; message: string };

export interface DiscordAnswerMessage {
  rawAnswer: string;
}

export class DiscordService implements vscode.Disposable {
  private ws: WebSocket | undefined;
  private connectPromise: Promise<void> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private heartbeatJitterTimeout: ReturnType<typeof setTimeout> | undefined;
  private reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  private sequence: number | null = null;
  private cachedToken: string | undefined;
  private intentionalClose = false;
  private reconnectAttempt = 0;
  private resolvedChannelId: string | undefined;
  private resolvedChannelSource: string | undefined; // tracks what config value was resolved
  private readonly answerEmitter = new vscode.EventEmitter<DiscordAnswerMessage>();
  private readonly connectionStateEmitter = new vscode.EventEmitter<DiscordConnectionState>();

  readonly onDidReceiveAnswer = this.answerEmitter.event;
  readonly onDidChangeConnectionState = this.connectionStateEmitter.event;

  constructor(private readonly configuration: LoopConfiguration) {}

  reset(): void {
    this.intentionalClose = true;
    this.connectPromise = undefined;
    this.cachedToken = undefined;
    this.sequence = null;
    this.reconnectAttempt = 0;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.heartbeatJitterTimeout) {
      clearTimeout(this.heartbeatJitterTimeout);
      this.heartbeatJitterTimeout = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.ws) {
      const ws = this.ws;
      this.ws = undefined;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try { ws.close(); } catch {}
    }
  }

  async connect(): Promise<void> {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    const token = await this.configuration.getDiscordBotToken();
    if (!token) {
      throw new Error('Loop Discord bot token is not configured.');
    }

    this.cachedToken = token;
    this.intentionalClose = false;
    this.setConnectionState({ status: 'connecting' });
    console.log('[Loop] Connecting to Discord Gateway...');

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let settled = false;

      const connectTimeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.cleanupWs();
          this.setConnectionState({ status: 'error', message: 'Discord connection timed out after 10 seconds.' });
          this.scheduleReconnect();
          reject(new Error('Discord connection timed out after 10 seconds.'));
        }
      }, 10_000);

      const ws = new WebSocket(DISCORD_GATEWAY_URL);
      this.ws = ws;

      ws.onmessage = (event) => {
        let payload: { op: number; d: unknown; s: number | null; t: string | null };
        try {
          payload = JSON.parse(String(event.data));
        } catch {
          return;
        }

        if (payload.s !== null && payload.s !== undefined) {
          this.sequence = payload.s;
        }

        switch (payload.op) {
          case 10: { // Hello
            const hello = payload.d as { heartbeat_interval: number };
            this.startHeartbeat(hello.heartbeat_interval);
            this.sendGateway(ws, {
              op: 2,
              d: {
                token,
                intents: DISCORD_INTENTS,
                properties: { os: 'vscode', browser: 'loop', device: 'loop' }
              }
            });
            break;
          }
          case 0: // Dispatch
            if (payload.t === 'READY') {
              clearTimeout(connectTimeout);
              if (!settled) {
                settled = true;
                this.reconnectAttempt = 0; // Reset backoff on success
                console.log('[Loop] Discord Gateway connected');
                this.setConnectionState({ status: 'online' });
                resolve();
              }
            } else if (payload.t === 'MESSAGE_CREATE') {
              this.handleGatewayMessage(payload.d as {
                author: { bot?: boolean };
                channel_id: string;
                content: string;
              });
            }
            break;
          case 7: // Reconnect request
          case 9: { // Invalid Session
            clearTimeout(connectTimeout);
            if (!settled) {
              settled = true;
              this.cleanupWs();
              const msg = 'Discord Gateway requested reconnect.';
              this.setConnectionState({ status: 'error', message: msg });
              this.scheduleReconnect();
              reject(new Error(msg));
            }
            break;
          }
        }
      };

      ws.onerror = () => {
        clearTimeout(connectTimeout);
        if (!settled) {
          settled = true;
          this.cleanupWs();
          const msg = 'Discord WebSocket connection error.';
          this.setConnectionState({ status: 'error', message: msg });
          this.scheduleReconnect();
          reject(new Error(msg));
        }
      };

      ws.onclose = () => {
        this.stopHeartbeat();
        clearTimeout(connectTimeout);
        if (settled && !this.intentionalClose) {
          // Connection was established then dropped — reconnect
          console.log('[Loop] Discord WebSocket closed unexpectedly, scheduling reconnect...');
          this.connectPromise = undefined;
          this.cachedToken = undefined;
          this.setConnectionState({ status: 'connecting' });
          this.scheduleReconnect();
        }
      };
    });

    return this.connectPromise;
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) { return; }
    this.connectPromise = undefined;
    this.cachedToken = undefined;

    // Exponential backoff: 2s, 4s, 8s, 16s, 30s max
    const baseDelay = Math.min(2000 * Math.pow(2, this.reconnectAttempt), 30_000);
    const jitter = Math.random() * 2000;
    const delay = baseDelay + jitter;
    this.reconnectAttempt++;

    console.log(`[Loop] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempt})...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = undefined;
      if (!this.intentionalClose) {
        void this.connect().catch((err) => {
          console.error('[Loop] Auto-reconnect failed:', (err as Error).message);
          // scheduleReconnect already called inside connect() on failure — no need to retry here
        });
      }
    }, delay);
  }

  private cleanupWs(): void {
    this.stopHeartbeat();
    if (this.ws) {
      const ws = this.ws;
      this.ws = undefined;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try { ws.close(); } catch {}
    }
  }

  async postMessage(content: string): Promise<void> {
    if (!this.configuration.discordEnabled) {
      throw new Error('Loop Discord delivery is disabled.');
    }

    const channelId = await this.resolveChannelId();
    if (!channelId) {
      throw new Error('Loop Discord channel is not configured.');
    }

    const token = this.cachedToken || await this.configuration.getDiscordBotToken();
    if (!token) {
      throw new Error('Loop Discord bot token is not configured.');
    }

    const chunks = splitDiscordMessage(content, 2000);
    for (const chunk of chunks) {
      const response = await fetch(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: chunk }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error ${response.status}: ${errorText}`);
      }
    }
  }

  dispose(): void {
    this.reset();
    this.answerEmitter.dispose();
    this.connectionStateEmitter.dispose();
  }

  private handleGatewayMessage(data: {
    author: { bot?: boolean };
    channel_id: string;
    content: string;
  }): void {
    if (data.author.bot) {
      return;
    }
    // Use resolved channel ID if available, fall back to raw config
    const expectedId = this.resolvedChannelId || this.configuration.discordChannelId;
    if (data.channel_id !== expectedId) {
      return;
    }
    const rawAnswer = (data.content || '').trim();
    if (!rawAnswer) {
      return;
    }
    this.answerEmitter.fire({ rawAnswer });
  }

  private async resolveChannelId(): Promise<string> {
    const configured = this.configuration.discordChannelId;
    if (!configured) {
      return '';
    }

    // Pure numeric = already a channel ID
    if (/^\d+$/.test(configured)) {
      this.resolvedChannelId = configured;
      this.resolvedChannelSource = configured;
      return configured;
    }

    // If we already resolved this name, return cached
    if (this.resolvedChannelId && this.resolvedChannelSource === configured) {
      return this.resolvedChannelId;
    }

    // Resolve channel name → ID via Discord API
    const token = this.cachedToken || await this.configuration.getDiscordBotToken();
    if (!token) {
      return '';
    }

    const channelName = configured.replace(/^#/, '').toLowerCase();

    try {
      // Get bot's guilds
      const guildsRes = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
        headers: { 'Authorization': `Bot ${token}` },
      });
      if (!guildsRes.ok) {
        throw new Error(`Failed to fetch guilds: ${guildsRes.status}`);
      }
      const guilds: { id: string }[] = await guildsRes.json() as { id: string }[];

      // Search each guild for the channel by name
      for (const guild of guilds) {
        const channelsRes = await fetch(`${DISCORD_API_BASE}/guilds/${guild.id}/channels`, {
          headers: { 'Authorization': `Bot ${token}` },
        });
        if (!channelsRes.ok) { continue; }
        const channels: { id: string; name: string; type: number }[] =
          await channelsRes.json() as { id: string; name: string; type: number }[];
        // type 0 = text channel
        const match = channels.find(c => c.name.toLowerCase() === channelName && c.type === 0);
        if (match) {
          this.resolvedChannelId = match.id;
          this.resolvedChannelSource = configured;
          return match.id;
        }
      }

      throw new Error(`Channel "${configured}" not found in any guild the bot belongs to.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to resolve channel name "${configured}": ${msg}`);
    }
  }

  private sendGateway(ws: WebSocket, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private startHeartbeat(intervalMs: number): void {
    this.stopHeartbeat();
    this.heartbeatJitterTimeout = setTimeout(() => {
      this.heartbeatJitterTimeout = undefined;
      this.sendHeartbeat();
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), intervalMs);
    }, Math.random() * intervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatJitterTimeout) {
      clearTimeout(this.heartbeatJitterTimeout);
      this.heartbeatJitterTimeout = undefined;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private sendHeartbeat(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendGateway(this.ws, { op: 1, d: this.sequence });
    }
  }

  private setConnectionState(state: DiscordConnectionState): void {
    this.connectionStateEmitter.fire(state);
  }
}

export async function attemptDiscordDelivery(
  task: () => Promise<void>
): Promise<'success' | 'fail'> {
  try {
    await task();
    return 'success';
  } catch {
    return 'fail';
  }
}

function splitDiscordMessage(content: string, maxLength: number): string[] {
  if (content.length <= maxLength) {
    return [content];
  }

  const chunks: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitAt = remaining.lastIndexOf('\n', maxLength);
    if (splitAt <= 0) {
      splitAt = maxLength;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n/, '');
  }

  return chunks;
}
