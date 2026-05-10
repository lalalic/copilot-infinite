import * as vscode from 'vscode';
import { LoopConfiguration } from './config';
import { DiscordService, attemptDiscordDelivery } from './discord';
import {
  AskQuestionsInput,
  QuestionSessionRegistry,
  createAskQuestionsToolResult,
  formatQuestionForDiscord,
} from './questions';

export interface ReportInput {
  message: string;
}

export class ReportTool implements vscode.LanguageModelTool<ReportInput> {
  constructor(
    private readonly configuration: LoopConfiguration,
    private readonly discord: DiscordService
  ) {}

  async prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<ReportInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    return { invocationMessage: 'Reporting to Discord' };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ReportInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const message = options.input.message?.trim();
    if (!message) {
      throw new Error('The message field is required.');
    }

    const discordConfigured = await this.configuration.isDiscordConfigured();
    if (discordConfigured) {
      const delivery = await attemptDiscordDelivery(() => this.discord.postMessage(message));
      if (delivery === 'fail') {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart('report delivery failed — Discord error.')
        ]);
      }
    }

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart('report delivered.')
    ]);
  }
}

export class AskQuestionsTool implements vscode.LanguageModelTool<AskQuestionsInput> {
  constructor(
    private readonly configuration: LoopConfiguration,
    private readonly discord: DiscordService,
    private readonly registry: QuestionSessionRegistry
  ) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<AskQuestionsInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.PreparedToolInvocation> {
    const count = options.input.questions?.length ?? 0;
    const discordConfigured = await this.configuration.isDiscordConfigured();
    const preview = options.input.questions
      ?.slice(0, 3)
      .map((q, i) => `${i + 1}. ${q.header}: ${q.question}`)
      .join('\n') ?? '';

    return {
      invocationMessage: discordConfigured ? 'Sending questions to Discord' : 'Questions',
      confirmationMessages: {
        title: `Ask ${count} question${count === 1 ? '' : 's'}`,
        message: new vscode.MarkdownString(
          `Ask the following question set?\n\n\`\`\`text\n${preview}\n\`\`\``
        )
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<AskQuestionsInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const questions = options.input.questions ?? [];
    if (!questions.length) {
      throw new Error('At least one question is required.');
    }

    const discordConfigured = await this.configuration.isDiscordConfigured();

    if (!discordConfigured) {
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          'Discord is not configured or disabled. Use the builtin ask-questions tool instead.'
        )
      ]);
    }

    if (this.registry.getPendingSessions().some((s) => s.answerMode === 'discord')) {
      throw new Error('Loop only supports one active Discord question session at a time.');
    }

    const discordSession = this.registry.createSession({ questions }, token, 'discord');
    const discordDelivery = await attemptDiscordDelivery(() =>
      this.discord.postMessage(formatQuestionForDiscord(discordSession))
    );

    if (discordDelivery === 'success') {
      const result = await discordSession.completion;
      return createAskQuestionsToolResult(questions, result.answers, 'discord');
    }

    this.registry.disposeSession(discordSession.id);
    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(
        'Discord delivery failed. Use the builtin ask-questions tool instead.'
      )
    ]);
  }
}
