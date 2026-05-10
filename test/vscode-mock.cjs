/**
 * Minimal vscode mock for testing questions.ts outside the extension host.
 * Only stubs what questions.ts actually uses.
 */
module.exports = {
  CancellationError: class CancellationError extends Error {
    constructor() { super('Cancelled'); this.name = 'CancellationError'; }
  },
  Disposable: class Disposable {
    constructor(fn) { this._fn = fn; }
    dispose() { this._fn?.(); }
    static from(...disposables) {
      return new module.exports.Disposable(() => disposables.forEach(d => d.dispose()));
    }
  },
  LanguageModelToolResult: class LanguageModelToolResult {
    constructor(parts) { this.parts = parts; }
  },
  LanguageModelTextPart: class LanguageModelTextPart {
    constructor(text) { this.text = text; }
  },
  MarkdownString: class MarkdownString {
    constructor(value) { this.value = value; }
  },
  window: {
    showQuickPick: async () => undefined,
    showInputBox: async () => undefined,
    showInformationMessage: async () => undefined,
    showWarningMessage: async () => undefined,
  },
};
