---
name: Spec-Driven Development
description: Enforces spec-first workflow — write user stories and happy paths before implementing, verify through UI like a real user, and auto-generate marketing videos on delivery.
applyTo: "**"
---

# Spec-Driven Development Workflow

You MUST follow this workflow for every new project, feature, or fix.

## Phase 1: Spec (before any code)

Before writing any implementation code, create or update specs in `<repo>/.specs/`:

1. **User Stories** (`stories.md`): Define what the user needs using "As a / I want / So that" format.
2. **Scenarios** (`scenarios/us-NN-*.md`): Write Given/When/Then scenarios for each story — happy path, edge cases, and negative cases.
3. **Happy Paths** (`scenarios/happy-paths.md`): Define end-to-end journeys that cross multiple stories.

Use the `user-stories` skill for structured authoring.

## Phase 2: Implement

Implement the feature or fix. Code changes come AFTER specs are written.

### Code Quality Rules

- **Max 500 lines per source file.** If a file exceeds 500 lines, refactor into smaller modules.
- **Use OOP and design patterns.** Prefer composition over inheritance. Apply patterns (Strategy, Observer, Factory, etc.) where they reduce complexity.
- **Single source of truth.** Settings, UI state, and data models must each have ONE canonical location. No duplicated definitions. Derive everything else from the source.
  - Settings: one config object/file, all consumers read from it.
  - UI: state drives rendering. No manual DOM sync — use reactive patterns.
  - Data: one model definition. API responses, storage, and display all derive from it.

## Phase 3: Verify (as a user)

After implementation, you MUST verify through the UI like a real user:

- Use `agent-browser` with `--headed` mode for visual verification.
- Take **snapshots** (`agent-browser snapshot`) after key interactions to confirm UI state.
- Walk through each scenario from `.specs/scenarios/` and confirm outcomes match.
- Record pass/fail in `.specs/track.md`.

Do NOT skip UI verification. Reading code is not verification. You must see what the user sees.

## Phase 4: Delivery Verification

Before declaring a feature done:

- Execute ALL happy paths from `.specs/scenarios/happy-paths.md` end-to-end via `agent-browser`.
- Every happy path step must produce the expected outcome.
- Update `track.md` with results.

## Phase 5: Marketing (autonomous mode)

When running autonomously and a feature is complete and verified:

- Auto-generate a demo video using the `demo-video` skill.
- The happy path IS the demo storyboard source.
- Output clips to `.market/assets/demos/<slug>/`.

## Rules

- Never implement before specs exist.
- **MUST auto-verify from the UI when** (non-negotiable):
  - a feature is declared done
  - a bug is declared fixed
  Unit / integration tests are not enough — they prove the code does
  what was written, not what the user sees. Drive the live UI with
  `agent-browser` (web/native) or capture real CLI output, attach
  screenshots / logs to `.specs/track.md` and the PR. Pure backend
  work with no user-visible surface is the only exception, and it
  must be marked `n/a` with a one-sentence rationale — never silently.
- Never deliver without UI verification.
- Snapshots are proof — attach them to track.md notes.
- If a happy path fails, fix the code, not the spec (unless the spec was wrong).
- Max 500 lines per source file — refactor when approaching the limit.
- Single source of truth for settings, UI state, and data. No duplication.
- Use OOP and design patterns to keep code modular and testable.
