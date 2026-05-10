---
name: user-stories
description: 'Define user stories, scenarios, happy paths, and connect them to demos. Use when: writing user stories, creating acceptance scenarios, designing E2E happy paths, or bridging stories to demo-video storyboards. Reads `.specs/spec.md` (`## Must-haves`) as the input when present.'
---

# User Stories Skill

End-to-end methodology for defining what an app does (stories),
proving it works (scenarios), demonstrating full journeys (happy
paths), and recording those journeys as demos.

## Input — read `.specs/spec.md` first (if it exists)

The upstream skill `clarify-idea` writes the lifecycle spec to
`.specs/spec.md`. Each unchecked bullet under `## Must-haves (v0)`
is the natural seed for one user story (US-NN). Before starting a
fresh interview, **read `.specs/spec.md`** and ask the user whether
to:

  1. Convert each `## Must-haves (v0)` bullet into a US-NN row
     (default — keeps stage 1 → stage 4 traceable), or
  2. Author stories from scratch (only when the spec is missing or
     pre-dates this convention).

If `.specs/spec.md` is missing, optionally route to `clarify-idea`
first, then come back. Do **not** invent must-haves — the spec is the
source of truth.

## Artifact Hierarchy

```
Story  →  Scenarios  →  Happy Path  →  Storyboard  →  Demo Video
(what)    (proof)       (journey)      (script)       (output)
```

| Artifact | Granularity | Format | Lives in |
|---|---|---|---|
| **User Story** | One business need | As a / I want / so that | `.specs/stories.md` |
| **Scenario** | One path through a story | Given / When / Then | `.specs/scenarios/us-NN-*.md` |
| **Happy Path** | End-to-end journey across stories | Numbered Given/When/Then steps + exit criteria | `.specs/scenarios/happy-paths.md` |
| **Storyboard** | Demo script for recording | DSL (`step`, `spotlight`, `say`, `agent-browser`) | `.market/assets/demos/<slug>/storyboard.md` |
| **Demo Video** | Recorded clips + narration | mp4 | `.market/assets/demos/<slug>/clips/` |

## File Layout

```
.specs/
├── spec.md                       # ← input: clarify-idea (fresh or update mode)
├── stories.md                    # All stories (lean — goal + value only)
├── track.md                      # Test status per scenario ID
└── scenarios/
    ├── us-01-welcome.md          # Scenarios for US-01
    ├── us-02-chat.md             # Scenarios for US-02
    ├── ...
    └── happy-paths.md            # E2E journeys (HP-01, HP-02, ...)
```

Every US-NN should trace back to one `## Must-haves` bullet in
`.specs/spec.md` (one-to-one or many-to-one). Note the source bullet
on the story line so the trace is explicit:

```markdown
## US-02: Chat with the agent
**Source:** `.specs/spec.md` → "Chat input + streaming response"
**As a** user, **I want to** ...
```

## 1. Writing User Stories

One story = one user goal. No implementation details.

```markdown
## US-NN: <Title>
**As a** <role>, **I want to** <capability>,
**so that** <business value>.
```

Rules:
- Keep stories **independent** — each delivers value on its own
- One file (`stories.md`) holds all stories — scan the full list at a glance
- No acceptance criteria here — those are scenarios

## 2. Writing Scenarios

One scenario = one concrete path through a story, with preconditions.

```markdown
## S-NN.M: <Short description>
**Given** <precondition>
**When** <action>
**Then** <observable outcome>
**And** <additional outcomes>
```

Rules:
- File per story: `scenarios/us-NN-<slug>.md`
- ID format: `S-<story>.<sequence>` (e.g., S-02.1, S-02.2)
- Cover: happy path, edge cases, error cases, negative cases
- Each scenario = one row in `track.md`
- A story should have **3–6 scenarios** (1 happy + edges)

### Scenario Types

| Type | Purpose | Example |
|---|---|---|
| Happy path | Normal successful flow | S-02.1: Send and receive |
| Edge case | Boundary condition | S-06.3: History > 50 messages |
| Negative | Invalid input / error | S-02.4: Empty input guard |
| Integration | Depends on external system | S-09.1: Tool execution indicator |

## 3. Writing Happy Paths

A happy path is an **end-to-end journey** that crosses multiple
stories. It proves the product works as a whole, not just individual
features.

```markdown
## HP-NN: <Title> (`demo-slug`)
**Covers:** US-01, US-02, US-09, ...

**Given** <global precondition>

1. **When** <action 1>
   **Then** <outcome 1>

2. **When** <action 2>
   **Then** <outcome 2>
   **And** <outcome 2b>

...

**Exit criteria:** <what proves the journey succeeded>
```

Rules:
- File: `scenarios/happy-paths.md` (all journeys in one file)
- ID format: `HP-<sequence>` (e.g., HP-01)
- Each maps to a demo slug — the journey IS the demo
- Numbered steps in sequence (not parallel)
- **Exit criteria** = the definition of done
- 4–6 steps is ideal (too many = split into two journeys)
- Reference the demo slug in parentheses after the title

### Happy Path → Demo Mapping

Every happy path should map to exactly one demo slug. The mapping
table at the bottom of `happy-paths.md` makes this explicit:

```markdown
| Happy Path | Demo Slug | Stories Covered | Priority |
|-----------|-----------|-----------------|----------|
| HP-01 | `zero-to-letter` | US-01, US-02, US-09 | P0 |
```

## 4. From Happy Path to Storyboard

The storyboard translates a happy path into demo-video DSL. This is
where the `demo-video` skill takes over.

### Translation Rules

| Happy Path concept | Storyboard DSL |
|---|---|
| **Given** (precondition) | Setup commands at `## Step 1` |
| **When** I type | `agent-browser click <selector>` + `agent-browser keyboard type "<text>"` + `agent-browser press Enter` |
| **When** I click | `agent-browser click <selector>` |
| **Then** X appears | `spotlight selector="<css>" text="<label>"` + `wait ms=N` |
| Narration | `say text="<short sentence>"` |
| Exit criteria | Final spotlight + closing `say` |
| Step boundary | Each numbered step → one `## Step N:` block |

### Authoring Flow

```
1. Read happy-paths.md → pick a journey (e.g., HP-01)
2. Read .demo-runtime.md → get selectors, scenarios, action recipes
3. Translate each HP step into a storyboard step:
   - Use ONLY selectors from the manifest
   - Use action recipes verbatim where they fit
   - Add spotlight + say for "Then" outcomes
   - Add wait for timing / hold beats
4. Save to .market/assets/demos/<slug>/storyboard.md
5. Preview → confirm with user → execute via run.sh
```

### Example: HP-01 → Storyboard

Happy path step:
```
2. **When** I type "Design a simple insurance renewal letter" and press Enter
   **Then** my message appears with 👤 avatar
   **And** the PAOR indicator shows "Planning"
```

Storyboard DSL:
```markdown
## Step 2: Type the prompt

  step title="One prompt. One letter."
  agent-browser click textarea
  agent-browser keyboard type "Design a simple insurance renewal letter"
  wait ms=300
  agent-browser press Enter
  say text="One prompt is all it takes."
  wait ms=2000
  spotlight selector=".paor-active" text="AI is planning"
  wait ms=1500
  clear
```

## 5. Tracking

`track.md` tracks all scenarios (unit-level + happy paths):

```markdown
| Scenario | Description | Status | Notes |
|----------|-------------|--------|-------|
| S-01.1 | Welcome visible | ✅ | Round 1 |
| HP-01 | Zero to Letter | — | Not tested |
```

Legend: ✅ Pass | ❌ Fail | ⏸ Deferred | — Not tested

## Workflow Summary

```
  Spec       →     Define          →     Prove          →     Demo
  ─────────          ──────          ─────          ────
  .specs/spec.md   stories.md       scenarios/       happy-paths.md
  ## Must-haves    (one US per      (3-6 per US)     (E2E journeys)
     bullets       must-have)                              │
                                                           ▼
                                                    storyboard.md
                                                    (demo-video DSL)
                                                           │
                                                           ▼
                                                    demo.mp4 + clips/
```

## When to Use This Skill

- "Write user stories for feature X" → Section 1 (after reading `.specs/spec.md`)
- "Add scenarios for US-05" → Section 2
- "Define E2E happy paths" → Section 3
- "How do I turn this into a demo?" → Section 4
- "Track test coverage" → Section 5

## Related skills / agents

- [`clarify-idea`](../clarify-idea/SKILL.md) — produces and evolves
  `.specs/spec.md` (fresh + update modes). Run this first when starting
  a new feature; re-run in update mode when must-haves change, then
  mirror the change here as a new US-NN or strike-through on an
  existing one.
- [`e2e-as-real-user`](../e2e-as-real-user/SKILL.md) — consumes
  `scenarios/us-NN-*.md` and `scenarios/happy-paths.md` to drive the
  live app like a real user (web + iOS).
- [`demo-video`](../demo-video/SKILL.md) — consumes `happy-paths.md`
  to author storyboards.
- [`spec-driven-dev`](../../agents/spec-driven-dev.agent.md) (agent,
  stage 4) — routes to `e2e-as-real-user` against scenarios produced
  by this skill.
