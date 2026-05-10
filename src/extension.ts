import * as vscode from 'vscode';
import { hostname } from 'node:os';
import { LoopConfiguration } from './config';
import { DiscordService, DiscordConnectionState, attemptDiscordDelivery } from './discord';
import { QuestionSessionRegistry, formatQuestionForDiscord, presentLocalAnswerPrompt } from './questions';
import { ReportTool, AskQuestionsTool } from './tools';

const REPORT_TOOL_NAME = 'report_to_discord';
const DISCORD_ASK_TOOL_NAME = 'ask_questions_to_discord';
const SET_DISCORD_TOKEN_COMMAND = 'copilot-infinite.setDiscordBotToken';
const CLEAR_DISCORD_TOKEN_COMMAND = 'copilot-infinite.clearDiscordBotToken';
const TOGGLE_DISCORD_ENABLED_COMMAND = 'copilot-infinite.toggleDiscordEnabled';
const ANSWER_PENDING_QUESTION_COMMAND = 'copilot-infinite.answerPendingQuestion';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const configuration = new LoopConfiguration(context);
  const registry = new QuestionSessionRegistry();
  const discord = new DiscordService(configuration);
  const discordStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  discordStatusItem.name = 'Loop Discord Status';

  context.subscriptions.push(discord, registry, discordStatusItem);

  const renderDiscordStatus = (state: DiscordConnectionState): void => {
    switch (state.status) {
      case 'disabled':
        discordStatusItem.command = TOGGLE_DISCORD_ENABLED_COMMAND;
        discordStatusItem.text = '$(circle-slash)';
        discordStatusItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        discordStatusItem.tooltip = 'Loop Discord delivery is disabled. Click to enable it.';
        break;
      case 'not-configured':
        discordStatusItem.command = SET_DISCORD_TOKEN_COMMAND;
        discordStatusItem.text = '$(comment-discussion)';
        discordStatusItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        discordStatusItem.tooltip = 'Loop Discord is enabled but not fully configured. Click to set the bot token.';
        break;
      case 'connecting':
        discordStatusItem.command = TOGGLE_DISCORD_ENABLED_COMMAND;
        discordStatusItem.text = '$(sync~spin)';
        discordStatusItem.color = undefined;
        discordStatusItem.tooltip = 'Loop is connecting the Discord bot. Click to disable it.';
        break;
      case 'online':
        discordStatusItem.command = TOGGLE_DISCORD_ENABLED_COMMAND;
        discordStatusItem.text = '$(comment-discussion)';
        discordStatusItem.color = new vscode.ThemeColor('statusBar.foreground');
        discordStatusItem.tooltip = 'Loop Discord bot is connected. Click to disable it.';
        break;
      case 'error':
        discordStatusItem.command = SET_DISCORD_TOKEN_COMMAND;
        discordStatusItem.text = '$(error)';
        discordStatusItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
        discordStatusItem.tooltip = `${state.message} Click to update the bot token.`;
        break;
    }
    discordStatusItem.show();
  };

  let refreshInProgress = false;
  const refreshDiscordPresence = async (): Promise<void> => {
    if (refreshInProgress) { return; }
    refreshInProgress = true;
    try {
      if (!vscode.workspace.workspaceFolders?.length) {
        discord.reset();
        renderDiscordStatus({ status: 'disabled' });
        return;
      }
      if (!configuration.discordEnabled) {
        discord.reset();
        renderDiscordStatus({ status: 'disabled' });
        return;
      }
      if (!(await configuration.isDiscordConfigured())) {
        discord.reset();
        renderDiscordStatus({ status: 'not-configured' });
        return;
      }
      renderDiscordStatus({ status: 'connecting' });
      try {
        await discord.connect();
        await attemptDiscordDelivery(() => discord.postMessage(`🟢 Copilot Infinite connected — ${getWorkspaceName()} on ${getMachineName()}.`));
      } catch (error) {
        renderDiscordStatus({ status: 'error', message: asError(error, 'Discord connection failed.').message });
      }
    } finally {
      refreshInProgress = false;
    }
  };

  const synchronizeAgentFile = async (): Promise<void> => {
    await syncLoopAgentMarkdown(configuration);
  };

  // File sentinel watcher: Stop hook writes .github/hooks/.session-stopped → we post to Discord
  const sentinelWorkspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (sentinelWorkspaceFolder) {
    const sentinelPattern = new vscode.RelativePattern(sentinelWorkspaceFolder, '.github/hooks/.session-stopped');
    const sentinelWatcher = vscode.workspace.createFileSystemWatcher(sentinelPattern);
    context.subscriptions.push(sentinelWatcher);
    const handleSessionStopped = (uri: vscode.Uri) => {
      if (configuration.discordEnabled) {
        void attemptDiscordDelivery(() => discord.postMessage('⏸ Agent session ended.'));
      }
      void vscode.workspace.fs.delete(uri, { useTrash: false });
    };
    sentinelWatcher.onDidCreate(handleSessionStopped);
    sentinelWatcher.onDidChange(handleSessionStopped);
  }

  context.subscriptions.push(
    discord.onDidChangeConnectionState((state) => {
      renderDiscordStatus(state);
      if (state.status === 'online') {
        const pendingDiscord = registry.getOnlyPendingDiscordSession();
        if (pendingDiscord) {
          console.log(`[Loop] Reconnected — re-sending pending question ${pendingDiscord.id}`);
          void attemptDiscordDelivery(() =>
            discord.postMessage(`(reconnected) ${formatQuestionForDiscord(pendingDiscord)}`)
          );
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('copilot-infinite.discord')) {
        void refreshDiscordPresence();
      }
      if (event.affectsConfiguration('copilot-infinite.discord.enabled')) {
        void synchronizeAgentFile();
        const status = configuration.discordEnabled ? 'enabled' : 'disabled';
        void appendUserSteerMessage(`Discord has been ${status}.`);
      }
    })
  );

  context.subscriptions.push(
    discord.onDidReceiveAnswer((answer) => {
      void (async () => {
        try {
          if (!registry.getOnlyPendingDiscordSession()) {
            // A message starting with ! is a loop-restart command
            if (answer.rawAnswer.startsWith('!')) {
              const forceRestart = answer.rawAnswer.startsWith('!!');
              if (!forceRestart && registry.getPendingSessions().length > 0) {
                await attemptDiscordDelivery(() => discord.postMessage(`⚠️ Waiting for your answer — reply here to continue, or send \`!!\` to force-restart anyway.`));
                return;
              }
              const rawCommand = forceRestart ? answer.rawAnswer.slice(2) : answer.rawAnswer.slice(1);
              const restartQuery = rawCommand.trim() || 'check user-steer.md and continue';
              await attemptDiscordDelivery(() => discord.postMessage(`🔄 Restarting loop: ${restartQuery}`));
              await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: `@neverstop ${restartQuery}`,
                isPartialQuery: false
              });
              return;
            }
            try {
              await appendUserSteerMessage(answer.rawAnswer);
              await attemptDiscordDelivery(() => discord.postMessage('📌 Steer saved.'));
            } catch (error) {
              console.error('[Loop] Failed to save steer:', error);
              await attemptDiscordDelivery(() => discord.postMessage('❌ Steer save failed.'));
            }
            return;
          }

          const outcome = registry.tryResolveNextDiscordAnswer(answer.rawAnswer);

          if (!outcome.accepted) {
            if (outcome.shouldNotifyDiscord) {
              await attemptDiscordDelivery(() => discord.postMessage(outcome.message));
            }
            return;
          }

          // Confirm answer received
          await attemptDiscordDelivery(() => discord.postMessage('✅ Answer received.'));
        } catch (error) {
          console.error('[Loop] onDidReceiveAnswer error:', error);
        }
      })();
    })
  );

  // Watch user-steer.md — notify Discord when agent clears it (= processed)
  let lastSteerLength = 0;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const steerPattern = new vscode.RelativePattern(workspaceFolder, '.github/user-steer.md');
    const steerWatcher = vscode.workspace.createFileSystemWatcher(steerPattern);
    context.subscriptions.push(steerWatcher);
    steerWatcher.onDidChange(async (uri) => {
      try {
        const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
        const newLength = content.trim().length;
        if (lastSteerLength > 0 && newLength === 0 && configuration.discordEnabled) {
          await attemptDiscordDelivery(() => discord.postMessage('✅ Steer processed.'));
        }
        lastSteerLength = newLength;
      } catch { /* file may have been deleted */ }
    });
    // Initialize length
    try {
      const steerUri = vscode.Uri.joinPath(workspaceFolder.uri, '.github', 'user-steer.md');
      const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(steerUri));
      lastSteerLength = content.trim().length;
    } catch { /* no file yet */ }
  }

  context.subscriptions.push(
    vscode.lm.registerTool(REPORT_TOOL_NAME, new ReportTool(configuration, discord))
  );
  context.subscriptions.push(
    vscode.lm.registerTool(DISCORD_ASK_TOOL_NAME, new AskQuestionsTool(configuration, discord, registry))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(TOGGLE_DISCORD_ENABLED_COMMAND, async () => {
      try {
        const nextEnabled = !configuration.discordEnabled;
        if (!nextEnabled) {
          await attemptDiscordDelivery(() => discord.postMessage(`🔴 Copilot Infinite disconnecting — ${getWorkspaceName()}.`));
          discord.reset();
        }
        await configuration.setDiscordEnabled(nextEnabled);
        void refreshDiscordPresence();
      } catch (error) {
        console.error('[Loop] Toggle Discord failed:', error);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(SET_DISCORD_TOKEN_COMMAND, async () => {
      const saved = await configuration.promptToSetDiscordBotToken();
      if (!saved) { return; }
      discord.reset();
      void refreshDiscordPresence();
      void vscode.window.showInformationMessage('Loop Discord bot token saved for the current workspace.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(CLEAR_DISCORD_TOKEN_COMMAND, async () => {
      await configuration.clearDiscordBotToken();
      discord.reset();
      void refreshDiscordPresence();
      void vscode.window.showInformationMessage('Loop Discord bot token cleared for the current workspace.');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(ANSWER_PENDING_QUESTION_COMMAND, async (sessionId?: string) => {
      const session = sessionId
        ? registry.getSession(sessionId)
        : registry.getOnlyPendingSession() ?? registry.getOnlyPendingDiscordSession();
      if (!session || session.state !== 'pending') {
        void vscode.window.showInformationMessage('No pending Loop question session is available.');
        return;
      }
      if (session.answerMode === 'discord') {
        // Switch Discord session to local fallback
        session.answerMode = 'vscode';
        void attemptDiscordDelivery(() => discord.postMessage('↩️ Switched to local answer.'));
      }
      await presentLocalAnswerPrompt(session, registry);
    })
  );

  void refreshDiscordPresence();
  void synchronizeAgentFile();
}

export function deactivate(): void {}

// --- Agent markdown sync ---

async function syncLoopAgentMarkdown(configuration: LoopConfiguration): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) { return; }

  const agentsDir = vscode.Uri.joinPath(workspaceFolder.uri, '.github', 'agents');
  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(agentsDir);
  } catch {
    return;
  }

  const status = configuration.discordEnabled ? 'enabled' : 'disabled';
  for (const [name, type] of entries) {
    if (type !== vscode.FileType.File || !name.endsWith('.agent.md')) { continue; }
    const fileUri = vscode.Uri.joinPath(agentsDir, name);
    let currentContent: string;
    try {
      currentContent = new TextDecoder().decode(await vscode.workspace.fs.readFile(fileUri));
    } catch {
      continue;
    }
    const nextContent = renderLoopAgentMarkdown(currentContent, status);
    if (nextContent !== currentContent) {
      await vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(nextContent));
    }
  }
}

function renderLoopAgentMarkdown(content: string, discordStatus: 'enabled' | 'disabled'): string {
  // Update the discord status line
  return content.replace(
    /^(# discord\n- status: )(enabled|disabled)$/m,
    `$1${discordStatus}`
  );
}

// --- Workspace helpers ---

async function appendUserSteerMessage(message: string): Promise<void> {
  const trimmed = message.trim();
  if (!trimmed) { return; }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) { return; }

  const userSteerUri = vscode.Uri.joinPath(workspaceFolder.uri, '.github', 'user-steer.md');
  const entry = `\n[Discord ${new Date().toISOString()}]\n${trimmed}\n`;

  let existingContent = '';
  try {
    existingContent = new TextDecoder().decode(await vscode.workspace.fs.readFile(userSteerUri));
  } catch {
    existingContent = '';
  }

  await vscode.workspace.fs.writeFile(userSteerUri, new TextEncoder().encode(`${existingContent}${entry}`));
}



function asError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('disallowed intents')) {
      return new Error(
        'Discord rejected the bot intents. Enable the Message Content intent for this bot in the Discord Developer Portal, then rerun the connection test.'
      );
    }
    return error;
  }
  return new Error(fallbackMessage);
}

function getWorkspaceName(): string {
  if (vscode.workspace.name) {
    return vscode.workspace.name;
  }
  const folders = vscode.workspace.workspaceFolders;
  if (folders?.length) {
    return folders[0].name;
  }
  return 'unknown workspace';
}

function getMachineName(): string {
  return hostname();
}
