# Prompt: Step 1 — research.md

You are doing **product research** on a code repository to feed a
marketing video pipeline. Your output is a single `research.md` file
that downstream steps will treat as ground truth.

## CRITICAL: Write from the buyer's perspective, not the engineer's

`research.md` is read by hook writers, scriptwriters and storyboarders
whose audience is **the person who would install or pay for this
product**, not the person who maintains it. If a paragraph reads like
release notes, internal architecture, or implementation history, it
does not belong here.

Two failure modes to actively avoid:

1. **Source-code spelunking masquerading as research.** Sentences like
   "the bootstrap turn calls send_suggestion which..." are useless to a
   buyer. Translate every internal mechanism into "what the user gets"
   before writing it down. If you cannot translate it, drop it.
2. **Feature lists with no benefit.** "Cross-meeting memory" is a
   feature; "remembers what you promised last week without you typing a
   note" is a benefit. Every core feature MUST be paired with a
   one-sentence user benefit phrased in plain language.

Mandatory rule: **never reference internal file names, function names,
schema fields, or commit messages in `research.md`**. Cite them in your
own working notes if you need to, then leave them out of the artifact.
The downstream marketing agents have no idea what those things are and
will repeat them in scripts.

## Inputs you will read

In this order, in parallel where possible:

1. **Repo root**: `README.md`, `LICENSE`, top-level `*.md`,
   `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` /
   `Package.swift` / `manifest.json` / `xcodeproj`. **Read for the user
   story, not the implementation.** When the README slips into
   architecture, skip it.
2. **Recent activity**: last ~20 commits, last 10 issues (open + closed),
   latest release. Use this to infer **what users were complaining
   about** and **what just got fixed for them**, not to list internal
   refactors.
3. **Web search** for **competitors** — search "{repo name} alternatives"
   and "{one-liner from README} vs". Pull 3–5 named competitors with
   real prices.
4. **Repo screenshots**: any image files referenced in README; record
   their relative paths under "Proof".

## What you write

Fill the skeleton at `templates/01-research.md` exactly. Every section
listed there must be present (use "TBD" only if absolutely no signal
exists — and explain why).

### Field-level guidance

- **`repo_type`** — pick ONE of: `ios-app`, `android-app`, `web-app`,
  `cli`, `library`, `chrome-extension`, `vscode-extension`, `other`.
  Heuristics:
  - `Package.swift` + iOS deployment target → `ios-app`
  - `manifest.json` with `manifest_version` → `chrome-extension`
  - `package.json` with `vscode` engines field → `vscode-extension`
  - `bin` field in `package.json` or top-level executable → `cli`
  - presence of frontend framework (React/Vue/Svelte) + no `bin` → `web-app`
  - exports without bin/UI → `library`
- **One-liner**: ≤ 12 words, written as **what the user gets**, not
  what the system does. "Stop forgetting what you promised in meetings."
  Not "Live captions piped through an LLM."
- **Tagline**: ≤ 8 words. Punchier. Aspirational allowed.
- **Core promise (one paragraph)**: open with the **outcome** the user
  reaches. Then state the **pain that disappears**. Then state the
  **price reframe** (why pay, what they avoid paying). Then state the
  **constraint that gets removed** (why this works where the obvious
  alternative does not). 4–6 sentences. No internal terminology.
- **Problem**: who hurts (named persona, not "developers"), what they
  did before (status quo), why now (trigger event).
- **Core features → benefits**: bullet list, **two clauses per bullet**:
  `<feature>` — `<one-sentence user benefit>`. The benefit clause is
  required; if you cannot write one, the feature is not a marketing
  feature and belongs in internal notes.
- **Differentiators**: 3–5 bullets. Each must be **comparative against
  a named competitor** ("no enterprise license required, unlike
  Microsoft Copilot which gates on tenant"). Vague claims like "more
  flexible" are banned.
- **Pricing reframe**: state competitor prices and your price in the
  same sentence. If the product is meaningfully cheaper, say so as a
  ratio ("≈10× cheaper for occasional users"). If it is free, state the
  monetization model so the buyer trusts it will not flip.
- **Competitors table**: columns = name | one-liner | price |
  works on user's setup? | gap. The "gap" column is the single thing
  the competitor fails at that this product solves.
- **Proof**: install command, basic usage snippet, screenshot file
  paths from README, named testimonials/users if any, any concrete
  metric (downloads, stars, GitHub uses).
- **Audience (ICP)**: who buys this. Be specific (e.g. "indie iOS
  devs shipping side projects who need crash reporting under $20/mo",
  not "developers"). Include the **buying trigger** — what just
  happened in their week that made them search.
- **Risks / what NOT to claim**: list 3–6 things hooks must avoid
  saying (overclaims, privacy traps, regulatory traps, comparisons
  that legal would block, stale features that no longer exist).
- **Brand voice**: pick ONE primary from `playful` / `friendly` /
  `authoritative` / `technical` / `news` / `documentary`. Justify
  in one sentence.
- **Color palette**: 2–4 hex colors derived from logo / README badges
  / common screenshot accents.

## Constraints

- **Never invent metrics** (stars, downloads, users). If not found, omit.
- **Never quote testimonials you didn't read.** OK to omit the field.
- **Never reference internal symbols, file paths, function names, or
  schema fields in the artifact.** This is the #1 review failure.
- **Cite competitor sources inline** as `<n>` footnotes if the user
  may want to verify (links go in a `## Sources` section at the bottom).
- Length target: **300–600 lines** total. Concise, scannable.

## Self-check before writing

Before saving, re-read every paragraph and ask:
- Would a non-engineer prospect understand this sentence?
- Does this sentence describe **what the user gets** or **how the system
  works**? If the latter, rewrite or delete.
- Have I named the alternative the user would otherwise pick, and the
  specific gap this product fills against it?
- Have I given a concrete price comparison (or explained the
  monetization if free)?

If any answer is no, fix that paragraph before continuing.

## Front-matter

Prepend this YAML block (replace placeholders, sha256 of nothing for the
input is fine if input is the whole repo — use `repo:HEAD-sha`):

```yaml
---
from: <repo-url-or-path>
from_hash: <sha256-or-repo:HEAD-short-sha>
generated_at: <ISO-8601>
step: 1-research
---
```
