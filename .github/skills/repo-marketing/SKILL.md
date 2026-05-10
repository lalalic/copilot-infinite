---
name: repo-marketing
description: 'Market any code repository with a deterministic pipeline of inspectable artifacts. Produces research briefs, hook angles, narration scripts, storyboards, video.json, and rendered MP4s (16:9, 9:16, 1:1). Use when: marketing a GitHub repo, library, CLI, app, or extension. Triggers: marketing video, repo trailer, product demo, launch video, social clip, promotional content.'
---

# Repo Marketing

Generate **marketing materials** for any code repo through a deterministic
8-step pipeline. Each step writes one inspectable artifact under
`<repo>/.market/` and **pauses for user review** before the next step
runs. The user can approve, hand-edit, or regenerate any artifact at
any time.

**Pipeline (v3):**

```
1. research → 2. hooks → 3. script (declares demo scenes)
                                       ↓
                         3.5. compose+execute via demo-video skill (one storyboard per cache file)
                                       ↓
                              4. storyboard → 5. video.json → 7. tts → 8. render
                                                              ↖ 6. cover (in render)
```

v1 ran a global `demo-inventory.md` BEFORE the script existed.
v2 introduced "intent mode" with a per-video `demo-cache.md`.
v3 drops both: the LLM composes a small storyboard per demo scene, the
demo-video skill executes it deterministically. The demo-video skill is
compose+execute, not intent-driven.

See [design.md](./design.md) for the full spec.

## Review gates (MANDATORY)

This skill is **review-gated by default**. After every numbered step
that says "**Pause for review**", the agent MUST stop and ask the user
to confirm or edit the artifact before proceeding to the next step. Do
not chain steps silently.

The agent may **only** chain steps without pausing if ALL of the
following are true in the current session:

1. The user has explicitly opted into autonomous mode for this run
   (e.g. "you must do all yourself", "go autonomous", "skip pauses",
   "ship it end-to-end without asking", or equivalent).
2. The user is unavailable to review interactively (e.g. they said
   they're stepping away, or the run is launched from a background
   subagent).

Otherwise, after each artifact is written, summarize what changed in
2–4 lines and ask whether to proceed, regenerate, or hand-edit. If
the user only asked for "the next step" or "this artifact", produce
exactly that artifact and stop — do not pre-render downstream
artifacts on assumption.

In autonomous mode, you must still:
- Write a single end-of-run summary listing every artifact produced
  and any decisions you made on the user's behalf.
- Flag any step where you departed from the templates (e.g. picked
  fewer hooks than research suggested, skipped a freshness recapture).

## When to use

- The user asks for a "marketing video", "trailer", "launch video",
  "demo video", or "social video" for a code repository.
- The user wants short videos (under 2 min) for YouTube / Shorts /
  TikTok / Reels / LinkedIn from a repo's existing material
  (README, screenshots, demos).
- The user wants to produce **multiple** angle videos from one repo
  (different hooks → different videos).

## When NOT to use

- Long-form content (>3 min videos, full tutorials) — use `youtube-factory`.
- Video from arbitrary materials (photos, clips) without a repo as
  source — use `content-to-remotion`.
- Posting/publishing — use `social-media-posting` afterwards.

## Prerequisites

- `node` ≥ 18 and `npm` (for Remotion)
- `edge-tts` Python package (`pip install edge-tts`) for voiceover
- `ffmpeg` (Remotion ships its own, but useful for asset prep)
- Optional: `gh` CLI for richer GitHub research
- Optional sibling skills (loaded as needed):
   - `demo-video` — capture iOS/web/CLI walkthroughs (auto-routed by `repo_type`)
  - `audio-sourcing` — find and download royalty-free BGM and SFX from artlist.io
  - `remotion-engine` — render MP4 from stream tree JSON (components, themes, templates)
  - `mermaid-diagrams` — generate architecture visuals on demand

## Procedure

The pipeline is **8 steps**, each gated by user review.

```
1. research → 2. hooks → 3. script → 4. storyboard → 5. video.json
                          \                              \
                           7. tts                         6. cover
                                                          /
                                                       8. render
```

### Phase A — Shared artifacts (run once per repo)

#### Step 0: Initialize `.market/`

If `<repo>/.market/` does not exist:

1. Run `scripts/init-market.sh <repo>` which:
   - Creates `<repo>/.market/{assets,videos}/`
   - Ensures the skill's shared Remotion project at
     the `remotion-engine/project/` has `node_modules` (one-time install,
     reused across all repos that use this skill)
   - Suggests `.market/videos/*/out/*.wav` and `*.mp4` for `<repo>/.gitignore`

#### Step 1: Research (`research.md`)

1. Read `templates/01-research.prompt.md`.
2. Gather inputs (parallel reads):
   - Repo `README.md`, top-level docs, `package.json` /
     `pyproject.toml` / `Cargo.toml`
   - Recent commits, issues, releases (via `gh` if available)
   - Web search pass for **competitors**
3. Fill the skeleton from `templates/01-research.md`.
4. Write to `<repo>/.market/research.md` with YAML front-matter
   (`from`, `from_hash`, `generated_at`, `step: 1-research`).
5. **Pause: present a summary, ask user to Approve / Edit / Regenerate
   (with steer note) / Stop.**

#### Step 1b: ~~Demo Inventory~~ (DEPRECATED in v2)

v1 wrote a global `demo-inventory.md` here and invoked the demo-video skill
in inventory mode. **Do not run this step in v2.** Demo capture is
per-video and happens at step 3.5 after each script declares its
`demo_intent`s. The legacy template `01b-demo-inventory*.md` is kept
for back-compat with old `.market/` directories only.

#### Step 2: Hooks (`hooks.md`)

1. Read `templates/02-hooks.prompt.md`.
2. Read `<repo>/.market/research.md` (verify hash).
3. Generate **5–8 candidate hooks** with fields: `slug`, `text`,
   `style`, `score`, `rationale`, `picked: false`.
4. Write to `<repo>/.market/hooks.md`.
5. **Pause: ask user to pick one or more hooks** (`picked: true`)
   to advance to Phase B.

### Phase B — Per-video artifacts (run per picked hook)

For each hook with `picked: true`:

#### Step 2.5: Spawn video folder

1. Compute next ordinal `NN` (look at existing `videos/` folders).
2. Run `scripts/spawn-video.sh <slug>` to create
   `<repo>/.market/videos/NN-<slug>/`.

#### Step 3: Script (`script.md`)

1. Read `templates/03-script.prompt.md`.
2. Read research.md + the picked hook entry.
3. Write `<repo>/.market/videos/NN-<slug>/script.md` (scene-based;
   no timestamps). **Every scene with `intent: demo` MUST also
   declare `demo_intent: "<one user-language sentence>"`.**
4. **Pause for review.**

#### Step 3.5: Demo capture (compose + execute)

The `demo-video` skill (v2) is **compose + execute**, not "intent mode".
For each scene with `intent: demo` in `script.md`:

1. Read the app's `<repo>/.demo-runtime.md` (FAIL LOUDLY if missing — the
   demo-video skill cannot operate without it). It lists verified selectors,
   replay scenarios, and any helper functions exposed by the app.
2. **Compose** a small `storyboard.md` for the scene under
   `<repo>/.market/videos/NN-<slug>/cache/<demo-id>/storyboard.md`
   (DSL grammar: see `.github/skills/demo-video/templates/storyboard.md`).
   Typical shape: a `step` line, an `agent-browser eval ...replay...`
   to trigger a scenario, a `spotlight` over the resulting element,
   then `clear`.
3. **Execute** via the demo-video skill:
   ```bash
   .github/skills/demo-video/scripts/run.sh \
     --target=extension \
     --storyboard=<repo>/.market/videos/NN-<slug>/cache/<demo-id>/storyboard.md \
     --out=<repo>/.market/videos/NN-<slug>/cache/<demo-id> \
     --url=<live-url> --extension-dir=<path> --tab=<tab-id>
   ```
4. Move/copy the produced `demo.mp4` up to the path your `video.json`
   references, e.g.
   `<repo>/.market/videos/NN-<slug>/cache/<demo-id>.mp4`.
5. **Pause: review captured clips before storyboarding.**

> Legacy `templates/03b-demo-cache.*` and `scripts/run-intent.sh` are
> from v1 (intent mode). Do not invoke them. The new flow is one
> storyboard per cache file, executed deterministically.

#### Step 4: Storyboard (`storyboard.md`)

1. Read `templates/04-storyboard.prompt.md`.
2. For each scene in script.md, add visual treatment fields
   (visual, asset_hint, transitions, bgm_intensity, caption_style).
3. **Freshness check** — before reusing `<repo>/.market/assets/demo/`,
   compare its newest file's mtime against the latest commit timestamp
   of `<repo>` (`git log -1 --format=%ct`). If demo assets predate
   the latest commit OR a `demo-video` skill is available AND the directory
   is empty, invoke `demo-video` now (routed by `research.md` `repo_type`).
   Stale screenshots are the #1 cause of "you're using old materials"
   complaints — when in doubt, recapture.
4. If `<repo>/.market/assets/bgm.mp3` is missing AND the `audio-sourcing`
   skill is available, invoke it with brand voice + scene intents.
5. Write `storyboard.md`.
6. **Pause for review.**

#### Step 5: video.json

1. Read `templates/05-video.prompt.md` + `templates/05-video.schema.json`.
2. For each storyboard scene:
   - **Resolve `asset_hint` to a concrete file path** by searching
     `assets/demo/`, `assets/`, README image refs. If no match, ask user.
   - Compute scene duration via `max(2.5, words/160s)`.
   - Map storyboard fields to schema fields.
3. Pick `voiceover.voice` from research.md Brand voice via the table
   in [design.md §2.5](./design.md).
4. Sum scene durations into `meta.duration`.
5. Validate against the JSON schema.
6. Write `video.json`.
7. **Pause for review.**

#### Step 6: Cover (parallel with step 7)

1. Run `scripts/render.sh <repo> NN-<slug>` (it renders covers first,
   then videos). Or for cover-only preview, render manually from the
   skill's Remotion project:
   ```bash
   cd <skill>/../remotion-engine/project
   npx remotion still src/index.ts Cover16x9 \
     <repo>/.market/videos/NN-<slug>/cover-16x9.png \
     --props=<repo>/.market/videos/NN-<slug>/video.json \
     --public-dir=<repo>/.market
   ```
2. **Pause for review of both cover PNGs.**

#### Step 7: TTS (parallel with step 6)

1. Run `scripts/tts-all.sh <repo> NN-<slug>` — it iterates `video.json`
   `scenes[]`, synthesizes any missing wavs, retries once on failure,
   and **asserts wav count == scenes.length** before exiting 0.
2. (Per-scene fallback for one-offs: `scripts/tts.sh <video-dir> <N> <voice> <text>`.)
3. Output: `<repo>/.market/videos/NN-<slug>/out/vo-scene-N.wav` for every scene.
4. (Auto-advance — no pause; user reviews via final video.)

#### Step 8: Render

**Optional: preview in Remotion Studio first.** Renders take a couple
of minutes and burn through CPU; a 30-second scrub in the studio
catches most layout/timing issues. Ask the user:

> "Want to preview in Remotion Studio before the full render?"

If yes:
```bash
.github/skills/repo-marketing/scripts/preview.sh <repo> NN-<slug>
```
Opens at `http://localhost:3000`. The user can scrub, adjust scene
durations in `video.json` by hand, or hit Ctrl+C to proceed.

This gate is **not enforced** — skip it for repeat renders or when
the user has said "go autonomous" / is unavailable.

1. Run `scripts/render.sh <repo> NN-<slug>` which:
   - First runs `scripts/validate.sh` (preflight: fails if any
     background asset, voiceover wav, or `_unresolved_assets` entry
     is missing; refuses to invoke remotion otherwise).
   - `cd`s into the `remotion-engine/project/` directory
   - Renders Cover{16x9,9x16}.png stills
   - Renders Main{16x9,9x16,1x1}.mp4 videos
   - Uses `--public-dir=<repo>/.market` so `video.json` paths like
     `videos/NN-<slug>/out/vo-scene-1.wav` resolve correctly.
2. **Pause: present all 3 .mp4 paths and let user preview.**

#### Step 9: Store description (`description.md`)

1. After all picked videos render, write
   `<repo>/.market/videos/NN-<slug>/description.md` (one per video) AND
   a top-level `<repo>/.market/description.md` for the store listing.
2. Source: `research.md` (current product state) + the picked hook.
3. Format: short headline, 4-6 starred bullets (one per major feature
   from research.md `core_features`), one privacy line, one
   install-steps block.
4. **Hard rule:** every claim in description.md must have a source line
   in research.md. No invented metrics, no stale features. If a v2
   feature is gone in v3, it must NOT appear in description.md.
5. **Pause for review** before pasting into the store listing.

### Re-run / staleness

Every artifact has YAML front-matter with `from` (relative path) +
`from_hash`. On re-invocation, the skill:

1. Walks the artifact tree
2. Recomputes upstream hashes
3. For each stale artifact: prints a 1-line diff summary and asks
   `Regenerate <step>? [y/N]`
4. Resumes from the first unapproved or stale step

## References

- [design.md](./design.md) — full spec, decisions, schemas
- `templates/01-research.prompt.md` … `templates/05-video.prompt.md`
- `templates/01b-demo-inventory.prompt.md` + `templates/01b-demo-inventory.md`
- `templates/05-video.schema.json` — JSON Schema for video.json
- Remotion rendering uses the **shared** `remotion-engine/project/`
  (sibling skill, not copied per-repo). Rendered against
  `<repo>/.market/` via `--public-dir`.
- `scripts/init-market.sh`, `scripts/spawn-video.sh`,
  `scripts/tts.sh`, `scripts/tts-all.sh`, `scripts/validate.sh`,
  `scripts/render.sh`, `scripts/hash-frontmatter.sh`

## Rich Scene Components (v4 Engine)

The Remotion engine includes **6 cinematic components** beyond the 8
classic intents (Hook, Problem, Solution, etc.). Use these in
`video.json` scenes via the `component` field. All are data-driven
through `scene.props`.

### BigStatement

Full-screen bold text with Apple keynote-style scale animation.
Good for dramatic single-line reveals.

```json
{ "component": "BigStatement", "props": { "headline": "Your text here", "subhead": "Optional subtitle" } }
```

### PromptTyping

Simulates typing a chat prompt character by character with a
blinking cursor. AI chat feel.

```json
{ "component": "PromptTyping", "props": { "headline": "Create an insurance letter from this PDF", "typingSpeed": 2 } }
```

### ResultFlash

Cascading result cards with glow effects. Items fly in one by one.

```json
{ "component": "ResultFlash", "props": {
    "headline": "What you get",
    "items": [
      { "icon": "📄", "label": "Template", "detail": "Production-ready" },
      { "icon": "🔍", "label": "Preview", "detail": "Instant PDF" }
    ]
} }
```

### StepTimeline

Horizontal pipeline with step-by-step activation. Shows execution
progress like a CI/CD pipeline.

```json
{ "component": "StepTimeline", "props": {
    "headline": "How it works",
    "steps": [
      { "icon": "📥", "label": "Input", "tool": "upload" },
      { "icon": "🤖", "label": "Analyze", "tool": "gpt-4" },
      { "icon": "📄", "label": "Generate" },
      { "icon": "✅", "label": "Done" }
    ]
} }
```

### ComparisonSplit

Side-by-side "Old way vs New way" with animated divider and
cascading reveals.

```json
{ "component": "ComparisonSplit", "props": {
    "headline": "",
    "leftTitle": "Manual Process",
    "rightTitle": "With AI",
    "leftItems": ["Hours of work", "Error-prone", "No consistency"],
    "rightItems": ["Minutes", "Deterministic", "Template-driven"]
} }
```

### AgentGraph

Animated node graph showing architecture or orchestration flow.
Nodes appear sequentially, edges draw in, pulses flow along connections.

```json
{ "component": "AgentGraph", "props": {
    "headline": "Architecture",
    "nodes": [
      { "id": "user", "label": "User", "icon": "👤", "x": 200, "y": 300, "type": "input" },
      { "id": "agent", "label": "Agent", "icon": "🤖", "x": 600, "y": 300, "type": "agent" },
      { "id": "tool", "label": "CLI", "icon": "⚙️", "x": 1000, "y": 300, "type": "tool" }
    ],
    "edges": [
      { "from": "user", "to": "agent" },
      { "from": "agent", "to": "tool" }
    ]
} }
```

### Atmosphere Utilities

The engine also exports reusable atmosphere effects that can be
composed in custom Remotion compositions:

- `GlowOrb` — soft floating light orb
- `GridBackground` — subtle animated grid
- `Vignette` — cinematic edge darkening
- `GradientText` — text with gradient fill
- `ParticleField` — floating particle ambiance
- `ScanLine` — sci-fi horizontal scan
- `CounterAnimation` — animated counting number

Import from `src/components/Atmosphere` in custom compositions.

## Constraints

- **Never skip the review gate** between steps. The user is the editor.
- **Never edit `<repo>/.market/research.md` or `hooks.md` automatically**
  on re-runs without showing a diff and asking.
- **Never delete `<repo>/.market/videos/NN-<slug>/` folders** on hook
  regeneration. Mark orphans, let user decide.
- **Never improvise schema** — `video.json` must validate against
  `05-video.schema.json` or the render step refuses to run.
- **English only in v1.** Multi-language is a future extension.
