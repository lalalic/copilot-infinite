---
name: demo-video
description: 'Make a demo video of an app from a plain-language scene description. Reads the app''s .demo-runtime.md manifest (selectors, scenarios, action recipes), composes a storyboard.md DSL program (step / spotlight / say / caption + agent-browser or app_agent actions), executes it via run.sh which drives the live app, records the screen with overlays + TTS baked in, and splits the recording into per-step mp4 clips. Use when: making product demos, capturing B-roll for marketing videos, recording app walkthroughs, or any task that needs a polished short clip of a real app doing something. Surfaces: iOS app, web app, Chrome extension.'
---

# Demo Video Skill

Compose-and-execute a guided demo of one app and produce video clips
with overlays + narration baked in.

The agent's job (the AI work) is **authoring the storyboard**: turning
a plain-language scene description into a DSL program, using the app's
`.demo-runtime.md` manifest as the source of truth for selectors,
scenarios, and action recipes. The shell scripts execute it
deterministically.

## Inputs

| Input | Source | Required |
|---|---|---|
| Scene description (`script.md`) | One sentence or paragraph from the caller (e.g. "Show how MeetMate dissolves the language barrier in a Mandarin meeting."). Saved to `<out>/script.md` for provenance. | yes |
| Slug | Derived by the agent from the scene description — kebab-case, 3–5 words, e.g. `remove-language-barrier`. Used as the demo folder name and in clip filenames. | yes |
| App manifest | `<app-repo>/.demo-runtime.md` — see [Manifest format](#manifest-format) | yes |
| Surface | `ios` \| `web` \| `extension` (usually stated in the manifest's Surface section) | yes |
| Target context | iOS MCP URL, web URL, or extension dir (per surface) | yes |
| Out dir | default `<app-repo>/.market/assets/demos/<slug>/` (one self-contained folder per demo) | no |

`<app-repo>` is the root of the app's repo — the directory that
contains `.demo-runtime.md`. The agent should determine it from the
caller's context (current working directory, an explicit path the
caller passes, or by walking up from a known file in the app).

## Prerequisites

The execution layer (`run.sh`) needs these tools on PATH:

| Tool | Surfaces | Install |
|---|---|---|
| `agent-browser` running on Chrome port 9222 with the user's profile | web, extension | already managed by the user — never restart Chrome |
| `edge-tts` (Python) | web, extension | `pip install edge-tts` |
| `ffmpeg` | web, extension, ios | `brew install ffmpeg` |
| `npx` (for first-run esbuild of `runtimes/demo-runtime.js`) | web, extension | comes with Node |
| AppAgent MCP reachable at `--device-mcp-url` | ios | iOS device or simulator running AppAgent |
| `xcrun simctl` (simulator) OR QuickTime (device) | ios | Xcode toolchain |

**Related skills:**
- `audio-sourcing` — find and download royalty-free BGM and SFX for demo videos

`run-web.sh` auto-builds `runtimes/demo-runtime.js` from
`demo-runtime.ts` on first invocation. Subsequent runs reuse the
bundle.

## Procedure (what the agent does)

### A. Prepare and read the manifest

1. **Derive the slug** from the scene description (kebab-case,
   3–5 words). Example: "Show how MeetMate dissolves the language
   barrier" → `remove-language-barrier`.
2. **Create the out dir**: `mkdir -p <app-repo>/.market/assets/demos/<slug>`.
3. **Write `<out>/script.md`** with the scene description (one
   sentence or paragraph — the "why" of this demo, in plain
   language). This is provenance: any future re-author can read
   script.md and understand the demo's intent without parsing the
   DSL.
4. **Open `<app-repo>/.demo-runtime.md`** and harvest:
   - The **surface** + **target_url** + **prerequisites**
   - The **selectors** table (you may ONLY reference selectors that
     appear here — never invent CSS or refs)
   - The **scenarios** list (pre-canned events to dispatch)
   - The **action recipes** (drop-in DSL fragments for common patterns)

If the manifest is missing, see [When the app has no manifest yet](#when-the-app-has-no-manifest-yet).
If the app also lacks a demo harness, build that first — see
[Demo harness (app-side)](#demo-harness-app-side). Bootstrap order
for a fresh app is always: **harness → manifest → storyboard**.

### B. Compose the storyboard

Author a `storyboard.md` (typically 3–6 steps) following the DSL
grammar in [templates/storyboard.md](./templates/storyboard.md).

Authoring rules:

1. **Story arc per scene**: setup → action → reaction. Each `## Step
   N: <title>` block is one beat the viewer should grasp.
2. **Pace**: aim for 1.5–4.0s per step. Add `wait ms=…` for hold
   beats. Total demo usually 8–25s.
3. **Narration**: 0–1 short `say text="…"` per step. Keep sentences
   under 12 words. Captions read better than walls of text.
4. **Spotlight one thing per step**: `spotlight selector="…" text="…"`
   draws the eye. Use selectors from the manifest.
5. **Action verbs come from the driver**: `agent-browser
   click/fill/press/eval/keyboard type` for web/extension;
   `app_agent tap/type/swipe` for iOS. Use the manifest's "Action
   recipes" verbatim where they fit.
6. **Use scenarios** when realistic content matters more than literal
   live interaction (e.g. a long meeting transcript).
7. **End with `clear`** in any step that opened a spotlight.

Save the storyboard to `<out>/storyboard.md`. The default convention
below assumes this path; pass `--storyboard=<path>` only if you
deliberately want to keep it elsewhere.

#### Worked example

For scene description "Show how MeetMate dissolves the language
barrier in a Mandarin meeting" against
[team-mate/.demo-runtime.md](../../../team-mate/.demo-runtime.md), a
complete `storyboard.md` looks like:

```markdown
# Remove the language barrier

## Step 1: A Mandarin meeting starts

  step title="You join a Mandarin meeting"
  say text="You're in a Teams call. Everyone speaks Mandarin. You don't."
  agent-browser eval window.dispatchEvent(new CustomEvent('meetmate:replay',{detail:'translate_button_current_intent'}))
  wait ms=1500

## Step 2: MeetMate translates the floor live

  step title="Live English translation"
  spotlight selector="#aichat .caption-bar" text="Live English"
  say text="MeetMate translates the floor in real time."
  wait ms=2500
  clear

## Step 3: You reply — in your own language

  step title="Type what you mean, in Chinese"
  agent-browser click #aichat-input
  agent-browser keyboard type "我想说：能否详细介绍一下 Phoenix 项目当前的进度？"
  wait ms=600
  agent-browser press Enter

## Step 4: It speaks for you, in polished English

  step title="Polished English appears"
  spotlight selector="#aichat .meetmate-msg-body:last-child" text="Speak any language. Sound professional."
  say text="You speak. It speaks for you."
  wait ms=2500
  clear
```

Four steps → four clips (`clips/01-you-join-a-mandarin-meeting.mp4`,
…, `clips/04-polished-english-appears.mp4`).

### B.5. Preview the storyboard (optional, recommended)

Recording is destructive (it captures the live screen + holds the
user's tab hostage for ~30s). Before invoking the runner, summarize
the composed `storyboard.md` for the user:

- Total step count
- Estimated duration (sum of `wait`s + ~0.4s per command + ~2s pad)
- Any selectors not in the manifest (this should be zero — surface
  immediately if not)
- The **say** lines that will be voiced

Then ask: **"Run it now, edit the storyboard, or skip the demo?"**

Skip this gate only if the user has explicitly said "go autonomous"
or is unavailable. The check is cheap; recording mistakes are not.

### C. Execute

```bash
.github/skills/demo-video/scripts/run.sh \
  --target=ios|web|extension \
  --storyboard=<path/to/storyboard.md> \
  [--out=<dir>]                  # default: <repo>/.market/assets/demos/<slug>/
  [--device-mcp-url=http://...]  # ios only
  [--url=https://...]            # web only
  [--extension-dir=<path>]       # extension only
  [--simulator]                  # ios only: use simctl recording
```

`run.sh` dispatches to [scripts/run-ios.sh](./scripts/run-ios.sh) or
[scripts/run-web.sh](./scripts/run-web.sh). Both perform a
deterministic 7-step execution:

1. Prepare `<out>/clips`, `<out>/vo`; copy storyboard for provenance.
2. Connect target & snapshot the UI tree → bind manifest selectors to
   driver refs.
3. **TTS pre-pass (web/extension)**: edge-tts produces one wav per
   `say` line. iOS uses native AVSpeech in-recording.
4. Start screen recording (`agent-browser record` for web,
   `xcrun simctl io recordVideo` for sim, QuickTime prompt for
   physical iOS device).
5. Walk DSL: `demo *` → runtime overlays; action verbs → driver.
   The runtime logs every `step` to `events.json` with millisecond
   offsets.
6. Stop recording. Web: ffmpeg-mix the wavs at recorded offsets.
7. [scripts/clip.sh](./scripts/clip.sh) splits `demo.mp4` per `step`
   event → `clips/NN-<step-slug>.mp4`.

### D. Return

Report the output tree and the path to each clip. The caller
(marketing pipeline or human) decides which clips to use.

## Output

```
<out>/
├── script.md           # plain-language scene description (the "why")
├── storyboard.md       # DSL program composed from script.md (the "how")
├── snapshot.json       # captured UI tree
├── events.json         # runtime event timeline (ms timestamps)
├── demo.mp4            # full walkthrough — overlays + TTS baked in
└── clips/
    ├── 01-step-name.mp4
    ├── 02-step-name.mp4
    └── ...
```

## Manifest format

Every app that wants demos must ship a `.demo-runtime.md` at its repo
root. It declares what the app can demo. Required sections:

| Section | Contents |
|---|---|
| **Surface** | type (ios / web / extension), driver, target_url, prerequisites |
| **Selectors** | Table of {what → CSS selector or accessibility ref}. The agent may ONLY reference these. |
| **Scenarios** | List of pre-canned events the app supports (e.g. `window.dispatchEvent(...)`). Optional but recommended. |
| **Action recipes** | Drop-in DSL fragments for common patterns (type into chat, click toolbar, etc). |
| **Recording region** *(optional)* | Recipe for cropping to a panel/region instead of the full window. |

Template: [templates/demo-runtime.md](./templates/demo-runtime.md).
Reference example: [team-mate/.demo-runtime.md](../../../team-mate/.demo-runtime.md).

**Action recipe shape**: each line of an action recipe IS a literal
DSL line. Drop it into a storyboard step verbatim, no adaptation
needed. Multi-line recipes become multiple consecutive DSL lines
under one `## Step N:` block.

### When the app has no manifest yet

If `<app-repo>/.demo-runtime.md` is missing, do NOT proceed to
storyboard authoring. Create the manifest first:

1. Copy [templates/demo-runtime.md](./templates/demo-runtime.md) to
   `<app-repo>/.demo-runtime.md`.
2. **Discover selectors** by launching the app + driver and running a
   snapshot:
   - Web/extension: `agent-browser navigate <url>` →
     `agent-browser snapshot --json` → identify the elements a demo
     will reference (panel root, inputs, key bubbles, toolbar buttons).
   - iOS: `app_agent command=snapshot` → identify primary UI refs.
3. **Discover scenarios** by reading the app's source (search for
   `TEST_SCENARIOS`, `replay`, `dispatchEvent`, demo-mode handlers,
   or any pre-canned data the app ships).
4. **Draft action recipes** for the patterns this app's demos will
   need (typing into a chat box, opening a panel, triggering a
   scenario). Verify each recipe works against the live app before
   committing.
5. Confirm the manifest with the app developer (or the user) before
   relying on it. The manifest is a contract.

Once the manifest exists, return to step A and proceed.

## Demo harness (app-side)

**Bootstrap order for a fresh app: build the harness FIRST, then
write the manifest. The manifest's `Scenarios` table is the
harness's external surface — you can't list scenarios that don't
exist yet.**

For most demos to look real on camera, the app needs a **demo
harness** — app-internal fake-data + replay machinery that lets the
demo trigger realistic content without depending on a live backend
or a human-in-the-loop. Examples:

- A meeting app needs canned transcripts and caption sequences
- A chat app needs canned conversations
- A finance app needs canned account/transaction data
- A workflow app needs canned scenarios (approved, rejected, pending)

**The harness lives inside the app's own source code, not inside
this skill.** The skill never ships fake transcripts or mock data —
it can't know what's realistic for an arbitrary app, and it can't
plug into the app's internal state.

Reference implementation in team-mate: `TEST_SCENARIOS` in
[team-mate/src/content.js](../../../team-mate/src/content.js), triggered
via `window.dispatchEvent(new CustomEvent('meetmate:replay', {detail:'<name>'}))`.

### Pattern

A working harness has three parts:

1. **Fake data fixtures** — realistic content (transcripts, messages,
   events) hard-coded as a constant in the app source. Keep these
   close to the feature they exercise.
2. **A replay function** — walks a fixture and feeds it into the
   app's own state machinery as if it were real (same code paths the
   live data takes).
3. **An external trigger** — a custom event the app listens for, a
   URL param like `?demo=goal-binding`, a debug menu item, or a
   global function on `window`. The demo-video skill drives this trigger
   via the driver (`agent-browser eval` for web, deep-link for iOS).

### Building a harness for a new app

When an app has no harness yet, do this BEFORE writing the manifest:

1. Identify the 3–6 demos the app will need to support. For each,
   write down what the viewer should see.
2. For each demo, decide what realistic content needs to flow:
   transcripts? events? API responses? Hard-code those fixtures next
   to the feature in the app source.
3. Write a replay function per scenario that takes the fixture and
   feeds it through the same code path the live data uses. Avoid
   shortcuts that bypass the real rendering — the demo should
   exercise the actual UI, not a parallel demo-only UI.
4. Wire one external trigger (custom event, URL param, or global
   function). Pick the lowest-friction option for your driver.
5. List each scenario in `.demo-runtime.md` under "Scenarios" with
   its name, what appears, and approximate duration.

Once the harness is in place, scenarios become DSL one-liners in any
storyboard:

```
agent-browser eval window.dispatchEvent(new CustomEvent('app:replay',{detail:'<name>'}))
```

### Constraints

- The harness MUST exercise the real UI (same render path as live
  data). Demos that look different from the shipped product are
  worse than no demo.
- Fixtures should be small (one screen of content, ~10 messages, ~30s
  of transcript). If a demo needs more, split it into multiple
  scenarios.
- Triggers should be **idempotent** — calling them twice should not
  corrupt app state.
- If a scenario depends on prior state (e.g. "minutes panel after a
  full meeting arc"), encode that dependency in the scenario itself,
  not in the storyboard.

## DSL cheat sheet

Full grammar + example: [templates/storyboard.md](./templates/storyboard.md).

| Verb | Purpose |
|---|---|
| `step title="…"` | First line of every `## Step N:` block. Marks the event timeline. |
| `say text="…"` | TTS narration + caption (mixed in post for web; native AVSpeech for iOS). |
| `caption text="…"` | Bottom caption bar, no audio. |
| `spotlight selector="…" text="…"` | Dim everything else; tooltip near element. |
| `highlight selector="…"` | Brief green pulse. |
| `cursor selector="…"` | Animate fake cursor to element. |
| `annotate selector="…" text="…"` | Tooltip without dimming. |
| `wait ms=N` | Hold for N ms. |
| `clear` | Remove all overlays. |
| `agent-browser <verb> …` | Web/extension action: `click @ref`, `fill @ref "text"`, `press Enter`, `keyboard type "…"`, `eval <js>`. |
| `app_agent <verb> …` | iOS action: `tap ref=…`, `type ref=… text="…"`, `swipe direction=up`. |

## Surfaces

| Surface | Driver | Recorder |
|---|---|---|
| `ios` | AppAgent MCP (`app_agent` + `demo` tools) | `xcrun simctl io recordVideo` (sim) or QuickTime (device) |
| `web` | agent-browser (CDP, port 9222) + injected `runtimes/demo-runtime.ts` | `agent-browser record` (CDP screencast) + edge-tts post-mix |
| `extension` | same as web, with `--load-extension=<dir>` | same as web |

All three surfaces speak the **same DSL**. One storyboard, three
possible targets.

## Constraints

- Headed only on web (CDP screencast needs a visible window).
- One target per run — multi-surface = multiple invocations.
- Never close Chrome on port 9222 (agent-browser must already be
  running with the user's logged-in profile).
- English-only TTS in v1.

## References

- [design.md](./design.md) — original spec + decisions
- [runtimes/demo-runtime.ts](./runtimes/demo-runtime.ts) — web/extension runtime (overlays + event timeline)
- [templates/storyboard.md](./templates/storyboard.md) — DSL grammar + example
- `copilot-ios/AppAgent/Sources/DemoToolProvider.swift` — iOS MCP API
- `agent-browser` skill — web automation + recording
- Example manifest: [team-mate/.demo-runtime.md](../../../team-mate/.demo-runtime.md)
