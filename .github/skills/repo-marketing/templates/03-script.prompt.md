# Prompt: Step 3 — script.md

You are writing the **narration + on-screen copy** for ONE marketing
video, structured as a sequence of scenes.

## Inputs

- `../../research.md` (verify hash)
- `../../hooks.md` — find the hook entry where `picked: true` AND the
  slug matches this video's folder name (`videos/NN-<slug>/`).

## What you produce

Fill the skeleton at `templates/03-script.md`. Output is a sequence of
**6–10 scenes**, each with three fields: `voiceover`, `on_screen`,
`intent`.

### Scene structure

```
## Scene N — <Role>
- voiceover: "<one sentence, spoken aloud>"
- on_screen: "<headline shown visually, ≤ 6 words>"
- intent: <hook | problem | solution | feature | demo | proof | cta | outro>
- demo_intent: "<REQUIRED for intent: demo — one user-language sentence describing what the viewer should see happen>"
```

### `demo_intent` rule (REQUIRED for every `intent: demo` scene)

Write ONE sentence, in the **user's own language** (not your
developer voice), that describes the moment the viewer should see
on screen. Three valid shapes:

- A user prompt the viewer will see typed into the app, in quotes.
  Example: `"翻译一下：今晚六点之前我必须把 Phoenix 项目的双写打开"`
- A direct request to the app phrased as the user would say it.
  Example: `"Ask the panel what I should follow up on with Raymond."`
- A pre-canned scenario name in backticks plus a one-line user
  framing. Example: `` Replay `live_minutes_decision_action` to
  show Decisions, Action items, Open questions populating live. ``

The demo-video skill will use this sentence verbatim as the on-clip intent
banner AND as the input to its 3-act planner. **No demo_intent → no
capture → no scene background.** If you cannot write a meaningful
user-language sentence for what the demo shows, the scene is not a
demo — reclassify its `intent`.

### Required scene roles & order

| # | Role     | Required? | Notes                                                  |
|---|----------|-----------|--------------------------------------------------------|
| 1 | Hook     | yes       | Use the picked hook's `text` verbatim                  |
| 2 | Problem  | yes       | From research.md `Problem.who_hurts` + `status_quo`    |
| 3 | Solution | yes       | One sentence from research.md `Solution`               |
| 4 | Demo     | yes       | "Here's <repo> doing <task>"                           |
| 5 | Feature  | optional  | One concrete differentiator from research.md           |
| 6 | Proof    | optional  | A real metric / testimonial from research.md `Proof`   |
| 7 | CTA      | yes       | Single action: install / star / try / signup          |
| 8 | Outro    | optional  | One-line punch-out                                     |

You may add 1–2 extra Feature scenes if research.md has 3+ strong
differentiators worth highlighting. **Cap total scenes at 10.**

## Voiceover rules

- **One sentence per scene.** Period, no commas-as-pauses.
- **Spoken-word friendly**: short words, contractions OK.
- **No jargon** unless it's the user's own (check research.md
  `Audience.lives_where`).
- **Brand voice** from research.md `Brand.voice` controls tone:
  - `playful`: contractions, light verbs, occasional question
  - `friendly`: second-person ("you"), warm
  - `authoritative`: declarative, third-person, no hedging
  - `technical`: precise nouns, specific commands/APIs
  - `news`: present tense, no "we"
  - `documentary`: observational, third-person

## On-screen rules

- **≤ 6 words.** Title-case. No punctuation.
- **Different from voiceover** — adds emphasis, doesn't repeat.

## Intent rules

- Pick exactly one tag per scene from the enum.
- The tag is consumed by step 4 to pick the Remotion scene component.

## No timestamps

Do **NOT** include time ranges like `(0:00–0:05)`. Per-scene durations
are computed at step 5 (`max(2.5s, words/160s)`).

## Front-matter

```yaml
---
from: ../../research.md, ../../hooks.md
from_hash: <combined-sha256>
generated_at: <ISO-8601>
step: 3-script
hook_slug: <picked-hook-slug>
---
```
