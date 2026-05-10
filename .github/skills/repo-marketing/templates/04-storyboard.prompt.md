# Prompt: Step 4 — storyboard.md

You are adding **visual treatment** to a scene-based script. The
storyboard is the bridge between *what is said* and *what we render*.

## Inputs

- `./script.md` (verify hash)
- `../../research.md` for brand palette and tone
- `../../assets/demo/` (list contents — these are real product captures
  you can reference)
- `../../assets/` (logo, screenshots from README)

## What you produce

Fill the skeleton at `templates/04-storyboard.md`. **One block per
scene**, in the same order as script.md.

### Per-scene fields

```
## Scene N
- visual: "<one sentence describing what we see>"
- asset_hint: "<concrete description so step 5 can resolve to a file>"
- transition_in:  <fade | cut | slide-left | slide-up | zoom>
- transition_out: <fade | cut | slide-left | slide-up | zoom>
- bgm_intensity:  <silent | low | mid | high>
- caption_style:  <bold-bottom | minimal-top | karaoke | none>
```

### `visual` rules

- One sentence. Concrete, present tense.
- Describe **subject** + **action** + **mood** (e.g. "terminal with
  install command typing out, dim background, single accent color").
- **Layout-agnostic** — same description must work at 16:9, 9:16, 1:1.
  Don't say "logo on the left" (left doesn't exist in 9:16). Say
  "logo prominent" or "logo centered".

### `asset_hint` rules

`asset_hint` MUST resolve to a real file. There are exactly three
allowed prefixes:

- `cache:<intent-slug>` — the demo clip captured at step 3.5 for the
  matching scene's `demo_intent`. Resolves at step 5 against
  `./demo-cache.md` (this video's cache, NOT a global inventory).
  Use this for every Demo scene.
- `static:<path>` — a file that exists outside the demo cache, e.g.
  the repo logo, a marketing poster, or a screenshot copied into
  `<repo>/.market/assets/`. The path is verbatim.
- `generated:<description>` — procedural visual rendered by Remotion
  (no file). Step 5 sets `props.background = null` and adds
  `props.generated = "<description>"`.

If a Demo scene's `demo_intent` does not have a captured clip in
`./demo-cache.md` (file is null), **STOP**. Run the demo-video skill in
intent mode for this video, then continue. Do not ship a storyboard
that references an uncaptured intent.

**Legacy:** old repos may still have `clip:<id>` referencing a global
`<repo>/.market/demo-inventory.md`. Step 5 still resolves those for
back-compat. New storyboards MUST use `cache:<intent-slug>` instead.

### `transition_in` / `transition_out`

- Default `cut` for fast pacing (hook, demo, cta).
- `fade` between sections of different intent (problem → solution).
- `slide-left` / `slide-up` for sequential reveals (feature 1 → 2 → 3).
- `zoom` is a strong accent — use sparingly (≤ 1 per video).

### `bgm_intensity`

- `silent` for the hook scene (let the voice land)
- `low` for problem / demo (don't compete with voiceover)
- `mid` for solution / feature scenes
- `high` for CTA / outro

### `caption_style`

Captions exist only to make a sentence land — they do NOT exist to mirror the voiceover. The default is **`none` for any scene that shows a real product screenshot**; the spoken VO carries the message and the screenshot speaks for itself.

- `none` (DEFAULT for Demo / Feature / Solution scenes that use a real screenshot background, or any scene with `featureShot: true`). Captions on top of a screenshot create double-text and obscure UI; let the VO and the visual do the work.
- `bold-bottom` for Hook / CTA / Outro scenes (no real-product background, message must be readable on mute).
- `minimal-top` for Problem scenes that need a single short label.
- `karaoke` reserved for high-energy CTA only.

If you set a screenshot scene to anything other than `none`, you must justify it in one line in the storyboard ("caption needed because…"). Otherwise leave it `none`.

## Constraints

- **Never reference assets that don't exist** in `../../assets/` or
  `../../assets/demo/`. Use `generated:` prefix for procedural visuals.
- **Cap visual sentence at 25 words.**
- **Do NOT add timestamps** — durations are computed at step 5.

## Front-matter

```yaml
---
from: ./script.md
from_hash: <sha256-of-script.md>
generated_at: <ISO-8601>
step: 4-storyboard
---
```
