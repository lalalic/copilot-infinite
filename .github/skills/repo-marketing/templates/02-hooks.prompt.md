# Prompt: Step 2 — hooks.md

You are generating **10-20 candidate marketing hooks** for a code repo.
Each hook is a **single-sentence opener** designed to grab attention
in the first 3 seconds of a video.

## Inputs

- `<repo>/.market/research.md` (verify front-matter hash is current)

## What you produce

Fill the skeleton at `templates/02-hooks.md`. Generate **5–8 hooks**
covering at least 3 different `style` values — the user will pick one
or more and each picked hook spawns its own video.

### Hook fields

- **`slug`** — kebab-case, ≤ 6 words, must be unique. Used as folder
  name (e.g. `stop-paying-for-meeting-notes`).
- **`text`** — the actual sentence. ≤ 14 words. Spoken aloud in
  the first scene of the video.
- **`style`** — ONE of:
  - `curiosity` — "What if your … could just …?"
  - `pain` — direct callout of user pain
  - `contrarian` — challenges a common assumption
  - `demo` — "Here's <product> doing <task> in <time>"
  - `stat` — leads with a surprising number
- **`score`** — your predicted CTR potential 1–10. Honest, not
  inflated. Reserve 9–10 for hooks you'd genuinely click.
- **`rationale`** — 1 line explaining *why* this hook works for the
  ICP from research.md.
- **`picked`** — always `false` initially.

## Style guidance per hook style

- **curiosity**: avoid clickbait; the question must have a real answer.
- **pain**: name the specific pain in research.md `Problem.who_hurts`.
- **contrarian**: pick something the audience genuinely believes.
  Don't strawman.
- **demo**: include a time bound ("in 30 seconds", "in one command").
- **stat**: use a number actually in research.md `Proof.metrics` or
  research.md `Competitors`. **Do not invent stats.**

## Constraints

- **No emoji.** Spoken-word friendly.
- **No "introducing"** or **"meet"** openers — too generic.
- **No exclamation marks** in `text`.
- All 10-20 hooks must be **substantively different** (don't generate
  variations of the same idea).

## Front-matter

```yaml
---
from: ./research.md
from_hash: <sha256-of-research.md>
generated_at: <ISO-8601>
step: 2-hooks
---
```
