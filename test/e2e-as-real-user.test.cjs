// Acceptance test for the bundled `e2e-as-real-user` skill.
// Validates SKILL.md ships with the expected structure: intent
// vocabulary, surface support, translation rules, report output,
// and hand-off rules.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SKILL_PATH = path.join(__dirname, '..', 'skills', 'e2e-as-real-user', 'SKILL.md');

test('e2e-as-real-user SKILL.md exists', () => {
  assert.ok(fs.existsSync(SKILL_PATH), `Missing: ${SKILL_PATH}`);
});

const body = fs.existsSync(SKILL_PATH) ? fs.readFileSync(SKILL_PATH, 'utf-8') : '';

test('frontmatter declares name: e2e-as-real-user', () => {
  assert.match(body, /^---[\s\S]*?\nname:\s*e2e-as-real-user\s*\n/m);
});

test('description triggers on verify / happy path / smoke test', () => {
  const m = body.match(/description:\s*['"]?([\s\S]*?)['"]?\n---/);
  assert.ok(m, 'no description');
  const desc = m[1].toLowerCase();
  assert.ok(/verify|happy.path|smoke/.test(desc), 'description must mention verify/happy-path/smoke triggers');
});

test('declares both web and ios surfaces', () => {
  assert.match(body, /web/i);
  assert.match(body, /ios/i);
  assert.match(body, /agent-browser/);
  assert.match(body, /app_agent|copilot-ios/);
});

test('reads scenarios / happy-paths from user-stories', () => {
  assert.match(body, /user-stories/);
  assert.match(body, /\.specs\/scenarios|happy-paths/);
});

test('declares an intent vocabulary table', () => {
  assert.match(body, /Intent vocabulary/i);
  for (const intent of ['goto', 'login as', 'fill', 'click', 'expect text', 'expect url', 'wait for text']) {
    assert.match(body, new RegExp(intent), `intent vocabulary missing: ${intent}`);
  }
});

test('declares Given/When/Then translation rules', () => {
  assert.match(body, /Given/);
  assert.match(body, /When/);
  assert.match(body, /Then/);
  assert.match(body, /Translation rules/i);
});

test('writes a report to .tmp/e2e/report.md', () => {
  assert.match(body, /\.tmp\/e2e\/report\.md/);
});

test('uses ask_user when app URL / device is missing (does not guess)', () => {
  assert.match(body, /ask_user/);
  assert.match(body, /do NOT guess|don't guess/i);
});

test('does NOT auto-merge / auto-deploy on green', () => {
  // The SKILL says "Do **not** auto-merge / auto-deploy on green."
  // Accept either explicit form per-verb.
  assert.match(body, /(do\s*\*\*not\*\*|don't|do not)[\s\S]{0,40}auto-merge/i);
  assert.match(body, /auto-deploy/);
  assert.match(body, /(do\s*\*\*not\*\*|don't|do not)[\s\S]{0,80}auto-deploy/i);
});

test('hands off back to spec-driven-dev for the test gate', () => {
  assert.match(body, /spec-driven-dev/);
});

test('hands off forward to demo-video for marketing reuse', () => {
  assert.match(body, /demo-video/);
});

test('explicitly distinguishes itself from agent-browser, demo-video, and unit tests', () => {
  assert.match(body, /What this skill is NOT/i);
  assert.match(body, /agent-browser/);
  assert.match(body, /demo-video/);
});
