// Acceptance test for the bundled `clarify-idea` skill (stage 1).
// Mirrors test/e2e-as-real-user.test.cjs.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SKILL_PATH = path.join(__dirname, '..', 'skills', 'clarify-idea', 'SKILL.md');

test('clarify-idea SKILL.md exists', () => {
  assert.ok(fs.existsSync(SKILL_PATH), `Missing: ${SKILL_PATH}`);
});

const body = fs.existsSync(SKILL_PATH) ? fs.readFileSync(SKILL_PATH, 'utf-8') : '';

test('frontmatter declares name: clarify-idea', () => {
  assert.match(body, /^---[\s\S]*?\nname:\s*clarify-idea\s*\n/m);
});

test('description triggers on vague idea / scope / spec', () => {
  const m = body.match(/description:\s*\|?([\s\S]*?)\n---/);
  assert.ok(m, 'no description');
  const desc = m[1].toLowerCase();
  assert.ok(/scope|spec|idea/.test(desc), 'description must mention scope/spec/idea');
});

test('writes spec.md as output', () => {
  assert.match(body, /spec\.md/);
});

test('declares the canonical spec.md headings', () => {
  for (const h of ['## Problem', '## Users', '## Must-haves', '## Out of scope', '## Success metric']) {
    assert.ok(body.includes(h), `spec.md skeleton missing heading: ${h}`);
  }
});

test('uses ask_user with multiSelect for at least one round', () => {
  assert.match(body, /ask_user/);
  assert.match(body, /multiSelect\s*:?\s*true/);
});

test('caps interview at 3 rounds (heuristic)', () => {
  assert.match(body, /Cap rounds at 3|3 rounds/i);
});

test('hands off to spec-driven-dev (stage 2)', () => {
  assert.match(body, /spec-driven-dev/);
});

test('hands off forward to e2e-as-real-user / build-ai-app / user-stories', () => {
  // Should reference at least one downstream skill that consumes spec.md
  const refs = ['e2e-as-real-user', 'build-ai-app', 'user-stories'];
  const matched = refs.filter((r) => body.includes(r));
  assert.ok(matched.length >= 2,
    `expected references to at least 2 downstream skills, got: ${matched.join(', ')}`);
});

test('explicitly does NOT auto-implement (preserves stage boundary)', () => {
  assert.match(body, /Do\s*\*\*not\*\*\s*start implementing/);
});

test('does NOT ask about implementation details (framework / DB / tooling)', () => {
  assert.match(body, /Never ask about implementation details/i);
});
