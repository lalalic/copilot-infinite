# Prompt: Step 5 — video.json

You compile the script + storyboard into a strict-schema `video.json`
that the Remotion render step will consume verbatim.

## Inputs

- `./script.md`
- `./storyboard.md`
- `../../research.md` (for brand voice → TTS voice mapping)
- `../../assets/` and `../../assets/demo/` (list contents for asset
  resolution)

## What you produce

A single `video.json` file that **must validate** against
`templates/05-video.schema.json`. Use that schema as the structural
truth.

### Field-by-field derivation

#### `meta`

- `title` = `<repo name> — <hook text>` (truncate to 80 chars)
- `fps` = `30`
- `aspects` = `["16x9", "9x16", "1x1"]`
- `duration` = sum of all `scenes[].duration` (computed below)

#### `voiceover.voice` (from research.md `Brand.voice`)

| Brand voice         | edge-tts voice           |
|---------------------|--------------------------|
| playful / friendly  | `en-US-AriaNeural`       |
| authoritative       | `en-US-ChristopherNeural`|
| technical / neutral | `en-US-GuyNeural`        |
| news / documentary  | `en-GB-SoniaNeural`      |

#### Asset path convention

**All asset paths in `video.json` are relative to `<repo>/.market/`**
(the Remotion `--public-dir`). Examples:
  - `assets/bgm.mp3`            → `<repo>/.market/assets/bgm.mp3`
  - `videos/01-foo/out/vo-scene-1.wav` → `<repo>/.market/videos/01-foo/out/vo-scene-1.wav`
  - `assets/demo/screenshot.png`

Absolute http(s) URLs pass through unchanged.

#### `bgm`

- `src` = `assets/bgm.mp3` if `<repo>/.market/assets/bgm.mp3` exists;
  else omit `bgm` key entirely (renderer treats missing bgm as silent).
- `baseVolume` = `0.18`. Per-scene `bgmIntensity` will scale this.

#### `scenes[]`

For scene N (1-indexed, matching script.md / storyboard.md order):

- `id` = `scene-N`
- `start` = sum of durations of scenes 1..N-1
- `duration` = `max(2.5, words(voiceover) / (160 / 60))` rounded to
  one decimal. Where `words()` counts whitespace-separated tokens in
  the script.md `voiceover` field.
- `component` = pick from script.md `intent`:
  - `hook` → `Hook`
  - `problem` → `Problem`
  - `solution` → `Solution` (or `Feature` if scene 3 doubles as feature)
  - `feature` → `Feature`
  - `demo` → `Demo`
  - `proof` → `Testimonial`
  - `cta` → `CTA`
  - `outro` → `Outro`
- `props.headline` = script.md `on_screen`
- `props.subhead` = (optional) extracted snippet from script.md
  `voiceover` if it adds info beyond the headline
- `props.background` = result of **asset resolution** (see below)
- `voiceover.audio` = `videos/<this-folder-name>/out/vo-scene-N.wav`
  (file does not exist yet — step 7 creates it). Use the actual folder
  name, e.g. `videos/01-ship-faster/out/vo-scene-1.wav`.
- `captions` = single entry `[{ "t": 0, "text": <voiceover> }]` for
  v1. Future: per-word karaoke timings.
- `captionStyle` = storyboard.md `caption_style`
- `bgmIntensity` = storyboard.md `bgm_intensity`
- `transitionIn` = storyboard.md `transition_in`
- `transitionOut` = storyboard.md `transition_out`

### Asset resolution

For each scene, resolve `storyboard.md asset_hint` → concrete path
relative to `.market/`. The storyboard uses one of three prefixes;
resolve in this order:

1. `cache:<intent-slug>` → look up `<intent-slug>` in
   `./demo-cache.md` (THIS video's cache, not a global file). Use the
   entry's `file` field. If `file` is null the demo-video skill has not
   captured that intent yet → STOP and run intent mode first.
   - The captured file is typically an `.mp4`. The Remotion `Scene`
     component renders it via `OffthreadVideo` automatically; no
     special handling needed in `video.json`.
   - Set `props.featureShot: true` for cache-backed scenes so the
     clip fills the frame and the headline pins to the bottom plate.
2. `static:<path>` → strip the prefix; verify the file exists under
   `.market/`; use the path verbatim.
3. `generated:<description>` → set `props.background = null` and
   add `props.generated = "<description>"`.

**Legacy fallback (read-only support for v1 repos):**

- `clip:<id>` → look up in `<repo>/.market/demo-inventory.md` and use
  its patched `path`. Emit a warning that the storyboard should
  migrate to `cache:`.

If still no match → set `props.background = null` AND add the scene
to a `_unresolved_assets` array at the top level so the user can fix
and re-run.

### Auto-duration warnings

After summing durations:

- If `meta.duration` > 120s → log a warning to stderr.
- If `meta.duration` > 180s → log another warning.
- **Do not fail** — the user is the editor.

## Constraints

- **The output MUST validate against `05-video.schema.json`** —
  validate before writing.
- **Never invent props** the schema doesn't allow.
- **Never reference files** that don't exist (use `null` + `_unresolved_assets`).
- Indent with 2 spaces.

## Front-matter

JSON has no front-matter, so write a sibling file
`video.json.meta.yaml` containing:

```yaml
from: ./script.md, ./storyboard.md
from_hash: <combined-sha256>
generated_at: <ISO-8601>
step: 5-video
```

The render step ignores this file but staleness detection reads it.
