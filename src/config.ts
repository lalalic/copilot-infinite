import * as vscode from 'vscode';
import { createHash } from 'node:crypto';

const DISCORD_TOKEN_SECRET_KEY = 'copilot-infinite.discord.botToken';

export class LoopConfiguration {
  constructor(private readonly context: vscode.ExtensionContext) {}

  get discordEnabled(): boolean {
    return this.getConfiguration().get<boolean>('discord.enabled', true);
  }

  get discordChannelId(): string {
    return this.getConfiguration().get<string>('discord.channelId', '').trim();
  }

  async isDiscordConfigured(): Promise<boolean> {
    if (!this.discordEnabled || !this.discordChannelId) {
      return false;
    }
    return Boolean(await this.getDiscordBotToken());
  }

  async getDiscordBotToken(): Promise<string> {
    // Try global key first
    const globalToken = (await this.context.secrets.get(DISCORD_TOKEN_SECRET_KEY))?.trim();
    if (globalToken) {
      return globalToken;
    }
    // Migrate from legacy workspace-scoped key if present
    const legacyKey = this.getLegacyWorkspaceScopedKey();
    const legacyToken = (await this.context.secrets.get(legacyKey))?.trim();
    if (legacyToken) {
      await this.context.secrets.store(DISCORD_TOKEN_SECRET_KEY, legacyToken);
      await this.context.secrets.delete(legacyKey);
      return legacyToken;
    }
    return '';
  }

  async setDiscordBotToken(token: string): Promise<void> {
    await this.context.secrets.store(DISCORD_TOKEN_SECRET_KEY, token);
  }

  async promptToSetDiscordBotToken(): Promise<boolean> {
    const token = await vscode.window.showInputBox({
      prompt: 'Enter the Discord bot token for Loop',
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => value.trim() ? undefined : 'Bot token is required.'
    });
    if (!token) {
      return false;
    }
    await this.setDiscordBotToken(token.trim());
    return true;
  }

  async clearDiscordBotToken(): Promise<void> {
    await this.context.secrets.delete(DISCORD_TOKEN_SECRET_KEY);
    await this.context.secrets.delete(this.getLegacyWorkspaceScopedKey());
  }

  async setDiscordEnabled(enabled: boolean): Promise<void> {
    await this.getConfiguration().update('discord.enabled', enabled, vscode.ConfigurationTarget.Workspace);
  }

  private getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('copilot-infinite');
  }

  private getLegacyWorkspaceScopedKey(): string {
    const workspaceIdentity = getWorkspaceIdentity();
    const hash = createHash('sha256').update(workspaceIdentity).digest('hex').slice(0, 12);
    return `${DISCORD_TOKEN_SECRET_KEY}.${hash}`;
  }
}

function getWorkspaceIdentity(): string {
  if (vscode.workspace.workspaceFile) {
    return vscode.workspace.workspaceFile.toString();
  }
  const folders = vscode.workspace.workspaceFolders;
  if (folders?.length) {
    return folders.map((folder) => folder.uri.toString()).sort().join('|');
  }
  return 'no-workspace';
}
