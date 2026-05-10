const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// Intercept require('vscode') with our mock
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'vscode') {
    return require.resolve('./vscode-mock.cjs');
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Require the test-specific bundle (built by test/run.mjs)
const {
  QuestionSessionRegistry,
  formatQuestionForDiscord,
} = require('./out/questions.js');

// Helper: create a mock CancellationToken
function mockToken() {
  return {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  };
}

// Helper: make a simple question
function q(header, question, opts) {
  return { header, question, ...opts };
}

describe('formatQuestionForDiscord', () => {
  it('formats a single question cleanly', () => {
    const registry = new QuestionSessionRegistry();
    const session = registry.createSession(
      { questions: [q('Next', 'What should I do next?')] },
      mockToken(),
      'discord'
    );
    const msg = formatQuestionForDiscord(session);
    assert.ok(msg.includes('What should I do next?'));
    assert.ok(!msg.includes('1.'), 'single question should not be numbered');
    assert.ok(!msg.includes('Reply with one answer per line'));
  });

  it('formats multiple questions numbered with instructions', () => {
    const registry = new QuestionSessionRegistry();
    const session = registry.createSession(
      {
        questions: [
          q('Name', 'What is your name?'),
          q('Color', 'What color?'),
          q('Size', 'What size?'),
        ],
      },
      mockToken(),
      'discord'
    );
    const msg = formatQuestionForDiscord(session);
    assert.ok(msg.includes('1. What is your name?'));
    assert.ok(msg.includes('2. What color?'));
    assert.ok(msg.includes('3. What size?'));
    assert.ok(msg.includes('Reply with one answer per line'));
  });

  it('shows options with letter labels', () => {
    const registry = new QuestionSessionRegistry();
    const session = registry.createSession(
      {
        questions: [
          q('Pick', 'Choose one', {
            options: [
              { label: 'Alpha', recommended: true },
              { label: 'Beta', description: 'the second one' },
            ],
          }),
        ],
      },
      mockToken(),
      'discord'
    );
    const msg = formatQuestionForDiscord(session);
    assert.ok(msg.includes('a) Alpha [recommended]'));
    assert.ok(msg.includes('b) Beta'));
    assert.ok(msg.includes('the second one'));
  });
});

describe('tryResolveNextDiscordAnswer — single question', () => {
  let registry;

  beforeEach(() => {
    registry = new QuestionSessionRegistry();
  });

  it('resolves a single freeform answer', () => {
    registry.createSession(
      { questions: [q('Next', 'What next?')] },
      mockToken(),
      'discord'
    );
    const outcome = registry.tryResolveNextDiscordAnswer('build the tests');
    assert.ok(outcome.accepted);
    assert.ok(outcome.result);
    assert.equal(outcome.result.answers['Next'].freeText, 'build the tests');
  });

  it('resolves option by label', () => {
    registry.createSession(
      {
        questions: [
          q('Choice', 'Pick one', {
            options: [{ label: 'Yes' }, { label: 'No' }],
            allowFreeformInput: false,
          }),
        ],
      },
      mockToken(),
      'discord'
    );
    const outcome = registry.tryResolveNextDiscordAnswer('Yes');
    assert.ok(outcome.accepted);
    assert.deepEqual(outcome.result.answers['Choice'].selected, ['Yes']);
  });

  it('resolves option by number', () => {
    registry.createSession(
      {
        questions: [
          q('Choice', 'Pick one', {
            options: [{ label: 'Yes' }, { label: 'No' }],
            allowFreeformInput: false,
          }),
        ],
      },
      mockToken(),
      'discord'
    );
    const outcome = registry.tryResolveNextDiscordAnswer('2');
    assert.ok(outcome.accepted);
    assert.deepEqual(outcome.result.answers['Choice'].selected, ['No']);
  });

  it('returns error when no pending session', () => {
    const outcome = registry.tryResolveNextDiscordAnswer('hello');
    assert.ok(!outcome.accepted);
    assert.ok(outcome.message.includes('No pending'));
  });
});

describe('tryResolveNextDiscordAnswer — multiple questions', () => {
  let registry;

  beforeEach(() => {
    registry = new QuestionSessionRegistry();
    registry.createSession(
      {
        questions: [
          q('Name', 'What is your name?'),
          q('Color', 'What color?'),
          q('Size', 'What size?'),
        ],
      },
      mockToken(),
      'discord'
    );
  });

  it('resolves all 3 answers from newline-separated reply', () => {
    const outcome = registry.tryResolveNextDiscordAnswer('Alice\nblue\nlarge');
    assert.ok(outcome.accepted, outcome.message);
    assert.equal(outcome.result.answers['Name'].freeText, 'Alice');
    assert.equal(outcome.result.answers['Color'].freeText, 'blue');
    assert.equal(outcome.result.answers['Size'].freeText, 'large');
  });

  it('strips leading numbers from answers', () => {
    const outcome = registry.tryResolveNextDiscordAnswer('1. Alice\n2. blue\n3. large');
    assert.ok(outcome.accepted, outcome.message);
    assert.equal(outcome.result.answers['Name'].freeText, 'Alice');
    assert.equal(outcome.result.answers['Color'].freeText, 'blue');
    assert.equal(outcome.result.answers['Size'].freeText, 'large');
  });

  it('rejects too few answers', () => {
    const outcome = registry.tryResolveNextDiscordAnswer('Alice\nblue');
    assert.ok(!outcome.accepted);
    assert.ok(outcome.message.includes('Expected 3'));
    assert.ok(outcome.shouldNotifyDiscord);
  });

  it('accepts extra answers (ignores trailing)', () => {
    const outcome = registry.tryResolveNextDiscordAnswer('Alice\nblue\nlarge\nextra');
    assert.ok(outcome.accepted, outcome.message);
    assert.equal(Object.keys(outcome.result.answers).length, 3);
  });

  it('skips blank lines', () => {
    const outcome = registry.tryResolveNextDiscordAnswer('Alice\n\nblue\n\nlarge');
    assert.ok(outcome.accepted, outcome.message);
    assert.equal(outcome.result.answers['Name'].freeText, 'Alice');
    assert.equal(outcome.result.answers['Color'].freeText, 'blue');
    assert.equal(outcome.result.answers['Size'].freeText, 'large');
  });
});

describe('tryResolveNextDiscordAnswer — multi-question with options', () => {
  let registry;

  beforeEach(() => {
    registry = new QuestionSessionRegistry();
    registry.createSession(
      {
        questions: [
          q('Confirm', 'Proceed?', {
            options: [{ label: 'Yes' }, { label: 'No' }],
            allowFreeformInput: false,
          }),
          q('Reason', 'Why?'),
        ],
      },
      mockToken(),
      'discord'
    );
  });

  it('resolves option + freeform in one reply', () => {
    const outcome = registry.tryResolveNextDiscordAnswer('Yes\nbecause reasons');
    assert.ok(outcome.accepted, outcome.message);
    assert.deepEqual(outcome.result.answers['Confirm'].selected, ['Yes']);
    assert.equal(outcome.result.answers['Reason'].freeText, 'because reasons');
  });

  it('resolves option by number in multi-answer', () => {
    const outcome = registry.tryResolveNextDiscordAnswer('2\nchanged my mind');
    assert.ok(outcome.accepted, outcome.message);
    assert.deepEqual(outcome.result.answers['Confirm'].selected, ['No']);
    assert.equal(outcome.result.answers['Reason'].freeText, 'changed my mind');
  });
});
