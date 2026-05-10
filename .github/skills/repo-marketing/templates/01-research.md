---
from: <UPSTREAM-PATH>
from_hash: <SHA256>
generated_at: <ISO-8601>
step: 1-research
---

# Research: <REPO NAME>

## Identity

- **name**: <repo name>
- **one_liner**: <≤ 12 words, what the user GETS — not what the system does>
- **tagline**: <≤ 8 words, punchier, aspirational allowed>
- **github_url**: <https://github.com/...>
- **homepage**: <url or none>
- **license**: <SPDX>
- **stars**: <number or unknown>
- **primary_language**: <e.g. TypeScript — internal only, do not reference downstream>
- **last_release**: <vX.Y.Z @ YYYY-MM-DD or none>
- **repo_type**: <ios-app | android-app | web-app | cli | library | chrome-extension | vscode-extension | other>

## Core promise (one paragraph)

<4–6 sentences. Open with the OUTCOME the user reaches. State the PAIN
that disappears. State the PRICE REFRAME (why pay, what they avoid
paying). State the CONSTRAINT REMOVED (why this works where the obvious
alternative does not). No internal terminology. No file names. No
schema words. Read it aloud — if it sounds like release notes, rewrite.>

## Problem

- **who_hurts**: <named persona, specific — not "developers">
- **status_quo**: <what they did before, named tools and workflow>
- **why_now**: <trigger event in their week that makes them search>

## Core features → benefits

Two clauses per bullet: `<feature>` — `<one-sentence user benefit>`.
If you cannot write the benefit clause, the feature does not belong here.

- <feature> — <user benefit>
- <feature> — <user benefit>
- <feature> — <user benefit>

## Differentiators

Each bullet must name a competitor and the specific gap this product
fills against it. Vague claims like "more flexible" are banned.

- <bullet, comparative against named competitor>
- <bullet, comparative against named competitor>
- <bullet, comparative against named competitor>

## Pricing reframe

<One paragraph. State competitor prices and this product's price in the
same sentence. If meaningfully cheaper, state as a ratio (e.g. "≈10×
cheaper for occasional users"). If free, state the monetization model
so the buyer trusts it will not flip.>

## Competitors

| Name | One-liner | Price | Works on user's setup? | Gap |
|------|-----------|-------|------------------------|-----|
| <name> | <one-liner> | <free / $X/mo> | <yes/no + caveat> | <the one thing they fail at> |
| <name> | <one-liner> | <…> | <…> | <…> |
| <name> | <one-liner> | <…> | <…> | <…> |

## Proof

- **install**:
  ```bash
  <one-line install command>
  ```
- **usage**:
  ```<lang>
  <minimal usage snippet>
  ```
- **screenshots**: <paths from README, e.g. `docs/img/hero.png`>
- **testimonials**: <name + quote, only if real>
- **metrics**: <e.g. "2.3k stars, 12k npm downloads/week" — only if verified>

## Audience (ICP)

- **persona**: <specific archetype>
- **lives_where**: <Twitter / HN / Reddit / Indie Hackers / etc>
- **pays_for**: <related products they already buy>
- **trigger_to_install**: <what just happened in their week>

## Risks / what NOT to claim

3–6 things hooks must avoid saying — overclaims, privacy traps,
regulatory traps, comparisons legal would block, stale features.

- <risk>
- <risk>
- <risk>

## Brand

- **voice**: <playful | friendly | authoritative | technical | news | documentary>
- **voice_rationale**: <one sentence>
- **palette**: [`#RRGGBB`, `#RRGGBB`, …]
- **tone_references**: <e.g. "Stripe docs", "Cursor launch video">

## Sources

1. <url>
2. <url>
