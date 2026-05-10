---
name: e2e-as-real-user
description: 'Drive a real app like a real user would — to verify a happy path or scenario before shipping. Reads `.specs/scenarios/us-NN-*.md` or `.specs/scenarios/happy-paths.md` (from the user-stories skill), translates each Given/When/Then step into a deterministic intent (`login as`, `submit form`, `expect text`), and executes it against the live app. Surfaces: web (via agent-browser), iOS (via app_agent — copilot-ios). Use when: verifying a scenario / happy-path is actually green in the live app, smoke-testing a release before opening a PR, or producing a pass/fail report for the spec-driven-dev agent.'
---

# E2E as Real User

Bridges the **what** (scenarios from `user-stories`) to the **how**
(low-level browser / app driving from `agent-browser`) by introducing
an **intent vocabulary** — phrases a real user would say — and
mapping each one to a deterministic recipe.

```
user-stories             this skill                 agent-browser / app_agent
─────────────            ──────────                 ─────────────────────────
HP-01 Given/When/Then  →  intent steps           →  click @e2 / fill @e3 / ...
                          (login as, submit,         (low-level, deterministic)
                           expect text, ...)
```

## When to invoke

The user says one of:

- "Verify HP-01" / "Run the happy path"
- "Smoke test the release"
- "Does scenario S-02.1 still pass?"
- "Drive the app like a real user"
- The `spec-driven-dev` agent finished a feature and the test gate
  asks "is the UI actually working?"

## What this skill is NOT

- Not a unit-test runner (use the project's `npm test` / `pytest` /
  `gradlew test` for that — those run inside `spec-driven-dev`'s test
  gate).
- Not a low-level browser driver — that's `agent-browser`.
- Not a demo recorder — that's `demo-video`. (E2E proves it works;
  demo shows it off.)

## Inputs

1. **Required**: A scenario or happy-path file from `user-stories`.
   - `.specs/scenarios/us-NN-<slug>.md` (one scenario)
   - `.specs/scenarios/happy-paths.md` (multiple HPs)
2. **Required**: The app must be running and reachable (URL for web,
   simulator UUID for iOS). The skill does NOT start the app — it
   asks the user (`ask_user`) for the URL / device if missing.
3. **Optional**: `--surface web|ios` (default: web).
4. **Optional**: `--bail` (default: stop on first failure).

## Surfaces

### Web — via `agent-browser`

Uses the existing `agent-browser` skill. All low-level interactions go
through:

```bash
agent-browser open <url>
agent-browser snapshot -i --json
agent-browser click @<ref>
agent-browser fill @<ref> "<text>"
agent-browser get text @<ref> --json
```

See `skills/agent-browser/SKILL.md` for the full command reference.

### iOS — via `app_agent` (port from `lalalic/copilot-ios`)

Mirrors agent-browser's semantics for native iOS apps. Uses the
accessibility tree from a connected simulator / device. Recipes
identical to web except `agent-browser` → `app_agent`.

> Status: iOS surface is a **port-on-demand** — the skill defines the
> intent vocabulary that's surface-agnostic; the iOS shim is added
> when the user actually needs it. Until then, calling
> `--surface ios` instructs the agent to ask the user to install
> `app_agent` first.

## Intent vocabulary (surface-agnostic)

Each intent is **one phrase** that compiles to N low-level commands.
The agent's job is to translate Given/When/Then bullets into intents,
not to write low-level driver code.

| Intent                              | Compiles to (web example)                                            |
| ----------------------------------- | -------------------------------------------------------------------- |
| `goto <url>`                        | `agent-browser open <url>` + `snapshot -i --json`                    |
| `login as <user> [with <pw>]`       | find email field by label → fill → find password → fill → submit     |
| `fill "<label>" with "<value>"`     | snapshot → find input near label → `fill @ref "<value>"`             |
| `pick "<label>" → "<option>"`       | snapshot → find select near label → `select @ref "<option>"`         |
| `click "<label>"`                   | snapshot → find button/link with text → `click @ref`                 |
| `submit "<form-label>"`             | snapshot → find form's submit button → `click @ref`                  |
| `expect text "<phrase>"`            | snapshot → assert `<phrase>` appears in the a11y tree                |
| `expect no text "<phrase>"`         | snapshot → assert `<phrase>` does NOT appear                         |
| `expect url matches "<regex>"`      | `agent-browser get url --json` → regex match                         |
| `expect element "<label>" visible`  | snapshot → find label → `agent-browser is visible @ref --json`       |
| `wait for text "<phrase>" [<n>s]`   | poll snapshot up to `n` seconds (default 10s)                        |
| `screenshot as "<name>"`            | `agent-browser screenshot <name>.png`                                |
| `then`                              | re-snapshot before next intent                                       |

If a scenario step doesn't fit any intent, the agent should:
1. Add a new entry to this table (open a PR for the skill).
2. Or fall back to a raw `agent-browser` command and document it.

## Translation rules (Given/When/Then → intents)

- **Given** the user is on `/login` → `goto /login`
- **Given** the user is logged in as Alice → `login as alice`
- **When** they fill the email field with "x@y.z" → `fill "Email" with "x@y.z"`
- **When** they click "Submit" → `click "Submit"`
- **Then** they see "Welcome" → `expect text "Welcome"`
- **Then** the URL is /dashboard → `expect url matches "^/dashboard"`
- **Then** the error banner is gone → `expect no text "Error"`

When the scenario uses **And** / **But**, treat it as the previous
keyword.

## Execution loop

For each scenario / happy-path step:

1. Echo the intent (so the user sees what's being attempted).
2. Compile to low-level command(s).
3. Execute via `run_in_terminal`.
4. Parse output. On failure, capture screenshot + a11y snapshot to
   `.tmp/e2e/<scenario>-<step>.{png,json}`.
5. Append PASS / FAIL line to `.tmp/e2e/report.md`.
6. If `--bail` and FAIL, stop. Otherwise continue.

After all steps:

- Print summary: `<scenario>: N/M passed`.
- If any failed, paste the first 3 failures inline + path to
  `.tmp/e2e/report.md`.

## Output

`.tmp/e2e/report.md`:

```markdown
# E2E Report — <date>

## HP-01: First-time signup
- ✅ goto /signup
- ✅ fill "Email" with "alice@example.com"
- ✅ fill "Password" with "********"
- ✅ click "Sign up"
- ❌ expect text "Welcome, alice"
       found: "Welcome, undefined"
       screenshot: .tmp/e2e/hp-01-step5.png
       snapshot:   .tmp/e2e/hp-01-step5.json

**Result: 4/5 passed.**
```

The report is the artifact `spec-driven-dev` reads to decide whether
the test gate passes.

## Heuristics

- **Always re-snapshot after a click / fill that triggers navigation**
  — refs from the previous snapshot are stale.
- **Prefer label-based selection over CSS** — labels reflect what a
  real user sees; CSS reflects implementation. Mirrors the
  agent-browser philosophy.
- **One intent per Given/When/Then bullet** — don't merge. Easier to
  pinpoint failures.
- **Use `wait for text` instead of `sleep`** — sleep is brittle; text
  polling is deterministic.
- **Don't auto-fix tests** — if a step fails, report and stop (or
  continue if `--bail` is off). Auto-fixing E2E hides bugs.
- **Don't re-implement what `agent-browser` already does** — if you're
  about to write a snapshot parser, it already exists.

## Failure modes

| Symptom                                    | Fix                                                          |
| ------------------------------------------ | ------------------------------------------------------------ |
| `agent-browser` not found                  | Install: `npx agent-browser` or follow agent-browser SKILL.md |
| App URL not provided / unreachable         | `ask_user` for the URL; do NOT guess `localhost:3000`.       |
| Scenario file missing                      | Route to `user-stories` skill to author one, then resume.    |
| Intent has no mapping                      | Add to the table OR fall back to raw `agent-browser` cmd.    |
| Selector ambiguous (>1 element matches)    | Use `nth(N)` qualifier OR ask user to add a label/test-id.   |
| All steps fail at step 1                   | Likely the app isn't running. Stop early, tell the user.     |

## Hand-off

After the report is written:

- **All green** → tell `spec-driven-dev` (or the user) the test gate
  passes. Suggest next: open the PR, or call `demo-video` to record
  the same happy path as a marketing clip.
- **Failures** → tell the user which step failed, paste the report
  excerpt, and ask whether to (a) re-run after a fix, (b) update the
  scenario (intent was wrong), or (c) open a bug.

Do **not** auto-merge / auto-deploy on green. Leave the gating
decision to the human or to `spec-driven-dev`.

## Related skills / agents

- [`user-stories`](../user-stories/SKILL.md) — produces the scenarios
  & happy-paths this skill consumes.
- [`agent-browser`](../agent-browser/SKILL.md) — low-level web driver.
- `app_agent` (planned, port from
  [`lalalic/copilot-ios`](https://github.com/lalalic/copilot-ios)) —
  iOS surface.
- [`spec-driven-dev`](../../agents/spec-driven-dev.agent.md) — the
  agent that calls this skill as part of its "Verify" stage.
- [`demo-video`](../demo-video/SKILL.md) — once a happy path is green,
  reuse it as a demo storyboard.
