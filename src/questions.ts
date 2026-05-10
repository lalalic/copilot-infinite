import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';

export interface AskQuestion {
  header: string;
  question: string;
  multiSelect?: boolean;
  allowFreeformInput?: boolean;
  options?: AskQuestionOption[];
}

export interface AskQuestionOption {
  label: string;
  description?: string;
  recommended?: boolean;
}

export interface AskQuestionAnswer {
  selected: string[];
  freeText: string | null;
  skipped: boolean;
}

export interface AskQuestionsInput {
  questions: AskQuestion[];
}

export interface AskQuestionsResult {
  answers: Record<string, AskQuestionAnswer>;
}

export interface PendingQuestionSession {
  id: string;
  input: AskQuestionsInput;
  answerMode: 'discord' | 'vscode';
  createdAt: number;
  completion: Promise<AskQuestionsResult>;
  resolve: (result: AskQuestionsResult) => void;
  reject: (error: Error) => void;
  state: 'pending' | 'resolved' | 'cancelled';
  localPromptActive: boolean;
  cancellationDisposable: vscode.Disposable;
}

export interface ResolveOutcome {
  accepted: boolean;
  message: string;
  result?: AskQuestionsResult;
  session?: PendingQuestionSession;
  shouldNotifyDiscord?: boolean;
}

export class QuestionSessionRegistry implements vscode.Disposable {
  private readonly sessions = new Map<string, PendingQuestionSession>();

  createSession(
    input: AskQuestionsInput,
    token: vscode.CancellationToken,
    answerMode: 'discord' | 'vscode'
  ): PendingQuestionSession {
    let resolveCompletion: ((result: AskQuestionsResult) => void) | undefined;
    let rejectCompletion: ((error: Error) => void) | undefined;

    const completion = new Promise<AskQuestionsResult>((resolve, reject) => {
      resolveCompletion = resolve;
      rejectCompletion = reject;
    });

    const session: PendingQuestionSession = {
      id: createCorrelationId(),
      input,
      answerMode,
      createdAt: Date.now(),
      completion,
      resolve: (result) => { resolveCompletion?.(result); },
      reject: (error) => { rejectCompletion?.(error); },
      state: 'pending',
      localPromptActive: false,
      cancellationDisposable: token.onCancellationRequested(() => {
        this.cancelSession(session.id);
      })
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): PendingQuestionSession | undefined {
    return this.sessions.get(sessionId);
  }

  getOnlyPendingSession(): PendingQuestionSession | undefined {
    const pending = this.getPendingSessions();
    return pending.length === 1 ? pending[0] : undefined;
  }

  getOnlyPendingDiscordSession(): PendingQuestionSession | undefined {
    const pending = this.getPendingSessions().filter((s) => s.answerMode === 'discord');
    return pending.length === 1 ? pending[0] : undefined;
  }

  getPendingSessions(): PendingQuestionSession[] {
    return [...this.sessions.values()]
      .filter((s) => s.state === 'pending')
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  disposeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) { return; }
    session.cancellationDisposable.dispose();
    this.sessions.delete(sessionId);
  }

  tryResolveNextDiscordAnswer(rawAnswer: string): ResolveOutcome {
    const session = this.getOnlyPendingDiscordSession();
    if (!session) {
      return { accepted: false, message: 'No pending Discord question is waiting for an answer.', shouldNotifyDiscord: false };
    }

    const questions = session.input.questions;

    // Single question — resolve directly
    if (questions.length === 1) {
      const normalized = normalizeSingleAnswer(questions[0], rawAnswer);
      if (!normalized.ok) {
        return { accepted: false, message: normalized.error, session, shouldNotifyDiscord: true };
      }
      return this.resolveStructuredSession(
        session,
        { answers: { [questions[0].header]: normalized.result } },
        'discord'
      );
    }

    // Multiple questions — split by newline, one answer per line
    const answerLines = rawAnswer.split('\n').map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean);

    if (answerLines.length < questions.length) {
      return {
        accepted: false,
        message: `Expected ${questions.length} answers (one per line), got ${answerLines.length}. Reply with one answer per line.`,
        session,
        shouldNotifyDiscord: true
      };
    }

    const answers: Record<string, AskQuestionAnswer> = {};
    for (let i = 0; i < questions.length; i++) {
      const normalized = normalizeSingleAnswer(questions[i], answerLines[i]);
      if (!normalized.ok) {
        return { accepted: false, message: `Answer ${i + 1}: ${normalized.error}`, session, shouldNotifyDiscord: true };
      }
      answers[questions[i].header] = normalized.result;
    }

    return this.resolveStructuredSession(session, { answers }, 'discord');
  }

  tryResolveStructured(sessionId: string, result: AskQuestionsResult, source: 'discord' | 'vscode'): ResolveOutcome {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { accepted: false, message: `Pending session ${sessionId} was not found.` };
    }
    if (session.state !== 'pending') {
      return { accepted: false, message: `Pending session ${sessionId} is no longer accepting answers.` };
    }
    if (session.answerMode !== source) {
      return { accepted: false, message: `Pending session ${sessionId} is waiting for a ${session.answerMode} answer.` };
    }

    const validated = validateStructuredAnswers(session.input.questions, result);
    if (!validated.ok) {
      return { accepted: false, message: validated.error };
    }

    return this.resolveStructuredSession(session, validated.result, source);
  }

  dispose(): void {
    for (const session of this.sessions.values()) {
      session.cancellationDisposable.dispose();
    }
    this.sessions.clear();
  }

  private cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.state !== 'pending') { return; }
    session.state = 'cancelled';
    session.cancellationDisposable.dispose();
    this.sessions.delete(sessionId);
    session.reject(new vscode.CancellationError());
  }

  private resolveStructuredSession(
    session: PendingQuestionSession,
    result: AskQuestionsResult,
    source: 'discord' | 'vscode'
  ): ResolveOutcome {
    if (session.state !== 'pending') {
      return { accepted: false, message: `Pending session ${session.id} is no longer accepting answers.` };
    }
    session.state = 'resolved';
    session.cancellationDisposable.dispose();
    this.sessions.delete(session.id);
    session.resolve(result);
    return { accepted: true, message: `Accepted ${source} answer for pending session ${session.id}.`, result, session };
  }
}

export function formatQuestionForDiscord(session: PendingQuestionSession): string {
  const questions = session.input.questions;

  // Single question — keep it clean
  if (questions.length === 1) {
    return formatSingleQuestion(questions[0], undefined);
  }

  // Multiple questions — send all at once, numbered
  const parts = questions.map((q, i) => formatSingleQuestion(q, i + 1));
  parts.push('');
  parts.push('Reply with one answer per line (in order).');
  return parts.join('\n');
}

function formatSingleQuestion(question: AskQuestion, num: number | undefined): string {
  const prefix = num !== undefined ? `${num}. ` : '';
  const lines = [`${prefix}${question.question}`];

  if (question.options?.length) {
    question.options.forEach((option, i) => {
      const recommended = option.recommended ? ' [recommended]' : '';
      const description = option.description ? ` — ${option.description}` : '';
      lines.push(`   ${String.fromCharCode(97 + i)}) ${option.label}${recommended}${description}`);
    });
  }

  if (question.multiSelect) {
    lines.push('   (multiple values OK, comma-separated)');
  }

  return lines.join('\n');
}

export async function presentLocalAnswerPrompt(
  session: PendingQuestionSession,
  registry: QuestionSessionRegistry
): Promise<void> {
  if (session.state !== 'pending' || session.localPromptActive) {
    return;
  }
  session.localPromptActive = true;

  try {
    const result = await promptForAnswers(session.input.questions);
    if (!result) {
      if (session.state === 'pending') {
        void vscode.window.showInformationMessage(
          `Loop question session ${session.id} is still pending. Answer in Discord or rerun the local answer command.`
        );
      }
      return;
    }
    const outcome = registry.tryResolveStructured(session.id, result, 'vscode');
    if (!outcome.accepted) {
      void vscode.window.showInformationMessage(outcome.message);
    }
  } finally {
    session.localPromptActive = false;
  }
}

export function createAskQuestionsToolResult(
  _questions: AskQuestion[],
  answers: Record<string, AskQuestionAnswer>,
  _source: 'discord' | 'vscode'
): vscode.LanguageModelToolResult {
  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(JSON.stringify({ answers }))
  ]);
}

// --- Private helpers ---

async function promptForAnswers(questions: AskQuestion[]): Promise<AskQuestionsResult | undefined> {
  const answers: Record<string, AskQuestionAnswer> = {};
  for (const question of questions) {
    const answer = await promptForSingleQuestion(question);
    if (!answer) { return undefined; }
    answers[question.header] = answer;
  }
  return { answers };
}

async function promptForSingleQuestion(question: AskQuestion): Promise<AskQuestionAnswer | undefined> {
  if (question.options?.length) {
    const items = question.options.map((option) => ({
      label: option.label,
      description: option.description,
      detail: option.recommended ? 'Recommended' : undefined
    }));

    const picked = await vscode.window.showQuickPick(items, {
      canPickMany: Boolean(question.multiSelect),
      ignoreFocusOut: true,
      title: question.question,
      placeHolder: question.header
    });

    if (picked === undefined) {
      if (allowsFreeformInput(question)) {
        return promptForFreeformAnswer(question);
      }
      return undefined;
    }

    const picks = Array.isArray(picked) ? picked : [picked];
    if (!question.multiSelect && picks.length > 1) {
      void vscode.window.showWarningMessage(`Question ${question.header} accepts only one answer.`);
      return promptForSingleQuestion(question);
    }

    if (!picks.length) {
      return { selected: [], freeText: null, skipped: true };
    }

    return { selected: picks.map((item) => item.label), freeText: null, skipped: false };
  }

  return promptForFreeformAnswer(question);
}

async function promptForFreeformAnswer(question: AskQuestion): Promise<AskQuestionAnswer | undefined> {
  const input = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    title: question.question,
    prompt: question.header,
    placeHolder: question.multiSelect ? 'Enter a comma-separated answer' : 'Enter your answer'
  });

  if (input === undefined) { return undefined; }

  const normalized = normalizeSingleAnswer(question, input);
  if (!normalized.ok) {
    void vscode.window.showWarningMessage(normalized.error);
    return promptForFreeformAnswer(question);
  }

  return normalized.result;
}

function normalizeSingleAnswer(
  question: AskQuestion,
  rawValue: unknown
): { ok: true; result: AskQuestionAnswer } | { ok: false; error: string } {
  if (isStructuredAnswer(rawValue)) {
    const selected = Array.isArray(rawValue.selected)
      ? rawValue.selected.map((v) => String(v).trim()).filter(Boolean)
      : [];
    const freeText = typeof rawValue.freeText === 'string' ? rawValue.freeText.trim() : null;
    const skipped = Boolean(rawValue.skipped);
    return validateNormalizedAnswer(question, { selected, freeText: freeText || null, skipped });
  }

  const values = coerceRawValues(rawValue, Boolean(question.multiSelect));
  if (!values.length) {
    return { ok: true, result: { selected: [], freeText: null, skipped: true } };
  }

  if (!question.multiSelect && values.length > 1) {
    return { ok: false, error: `Question ${question.header} accepts only one answer.` };
  }

  const selected: string[] = [];
  const freeformValues: string[] = [];

  for (const value of values) {
    const resolvedOption = resolveOptionLabel(question.options, value);
    if (resolvedOption) {
      selected.push(resolvedOption);
      continue;
    }
    if (!allowsFreeformInput(question)) {
      return { ok: false, error: `Question ${question.header} does not allow freeform answers.` };
    }
    freeformValues.push(value);
  }

  if (!question.multiSelect && freeformValues.length > 1) {
    return { ok: false, error: `Question ${question.header} accepts only one freeform answer.` };
  }

  const freeText = freeformValues.length ? freeformValues.join(', ') : null;
  return validateNormalizedAnswer(question, {
    selected,
    freeText,
    skipped: selected.length === 0 && freeText === null
  });
}

function validateStructuredAnswers(
  questions: AskQuestion[],
  result: AskQuestionsResult
): { ok: true; result: AskQuestionsResult } | { ok: false; error: string } {
  if (!result.answers || typeof result.answers !== 'object') {
    return { ok: false, error: 'Structured answers must include an answers object.' };
  }

  const answers: Record<string, AskQuestionAnswer> = {};
  for (const question of questions) {
    const value = result.answers[question.header];
    if (!value) {
      return { ok: false, error: `Missing answer for question ${question.header}.` };
    }
    const normalized = normalizeSingleAnswer(question, value);
    if (!normalized.ok) { return normalized; }
    answers[question.header] = normalized.result;
  }

  return { ok: true, result: { answers } };
}

function validateNormalizedAnswer(
  question: AskQuestion,
  answer: AskQuestionAnswer
): { ok: true; result: AskQuestionAnswer } | { ok: false; error: string } {
  if (!question.multiSelect && answer.selected.length > 1) {
    return { ok: false, error: `Question ${question.header} accepts only one selected option.` };
  }
  if (answer.freeText && !allowsFreeformInput(question)) {
    return { ok: false, error: `Question ${question.header} does not allow freeform answers.` };
  }
  if (answer.skipped && (answer.selected.length > 0 || answer.freeText !== null)) {
    return { ok: false, error: `Question ${question.header} cannot be skipped and answered at the same time.` };
  }
  return { ok: true, result: answer };
}

function isStructuredAnswer(value: unknown): value is AskQuestionAnswer {
  return Boolean(value) && typeof value === 'object' && 'selected' in (value as Record<string, unknown>);
}

function resolveOptionLabel(options: AskQuestionOption[] | undefined, rawValue: string): string | undefined {
  if (!options?.length) { return undefined; }
  const trimmedValue = rawValue.trim();
  const numericIndex = Number(trimmedValue);
  if (Number.isInteger(numericIndex) && numericIndex >= 1 && numericIndex <= options.length) {
    return options[numericIndex - 1].label;
  }
  return options.find((o) => o.label.localeCompare(trimmedValue, undefined, { sensitivity: 'accent' }) === 0)?.label;
}

function allowsFreeformInput(question: AskQuestion): boolean {
  return question.allowFreeformInput !== false;
}

function coerceRawValues(rawValue: unknown, multiSelect: boolean): string[] {
  if (rawValue === null || rawValue === undefined) { return []; }
  if (Array.isArray(rawValue)) { return rawValue.map((v) => String(v).trim()).filter(Boolean); }
  if (typeof rawValue === 'number' || typeof rawValue === 'boolean') { return [String(rawValue)]; }
  if (typeof rawValue !== 'string') { return [JSON.stringify(rawValue)]; }
  const trimmed = rawValue.trim();
  if (!trimmed) { return []; }
  return multiSelect ? trimmed.split(',').map((v) => v.trim()).filter(Boolean) : [trimmed];
}

function createCorrelationId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 6);
}
