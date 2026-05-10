---
name: knowledge-lib
description: 'Build and maintain a personal knowledge library using LLMs. Use when: researching a topic, compiling knowledge from URLs/books/papers into wiki, organizing learnings, curating and reviewing entries, Q&A against accumulated knowledge. No RAG needed — LLM reads markdown directly. Inspired by Karpathy 6-step knowledge base workflow + autoresearch loop.'
---

# Knowledge Library Builder

LLM-compiled knowledge wiki: feed raw sources → LLM "compiles" into structured Markdown wiki → query and expand over time. Combines Karpathy's [6-step knowledge workflow](https://x.com/karpathy) (ingest → compile → Q&A → output → lint → tools) with [autoresearch](https://github.com/karpathy/autoresearch) iterative refinement. No RAG needed — modern LLMs can read the wiki directly.

## Quick Start

1. Give a topic, URL, or source material
2. Agent researches and extracts key knowledge
3. Knowledge is structured into `.tmp/knowledge/<topic>.md`
4. Review periodically — promote good entries, let weak ones sink

## Knowledge Library Structure

```
.tmp/knowledge/
├── index.md              # Master index with topic links + summaries
├── <topic-slug>.md       # One file per topic (compiled wiki entry)
├── raw/                  # Unmodified source material (webpages, papers, notes)
└── output/               # Generated reports, slides, charts
```

**Key insight**: `raw/` holds originals untouched. Wiki entries are *compiled* by the LLM from raw sources. Human feeds sources → LLM writes wiki → human reviews.

### Entry Format

Each knowledge entry follows this structure:

```markdown
# <Topic Title>

**Source**: <URL or reference>
**Date**: <when researched>
**Status**: seed | growing | mature | stale

## TL;DR
<1-3 sentence summary — the "what" and "why this matters">

## Key Insights
- <bullet points of the most important takeaways>

## Details
<deeper explanation, organized by subtopic>

## Connections
- Related: [[other-topic]] — <how they connect>

## Open Questions
- <things not yet understood or worth exploring further>
```

## Workflow

### 1. Research (gather raw material)

Given input (topic, URL, paper, book, repo):

- **URL/webpage**: Fetch and extract key content
- **Repo**: Read README, skim structure, identify core patterns
- **Topic**: Search web, fetch multiple sources, triangulate
- **Book/paper**: Read excerpt by excerpt with LLM (like [reader3](https://github.com/karpathy/reader3))

Extract:
- What is this about? (domain)
- Why does it matter? (significance)
- What are the key ideas? (insights)
- What's actionable? (takeaways)
- What connects to things we already know? (connections)

### 2. Distill (write the entry)

Create `.tmp/knowledge/<topic-slug>.md` using the entry format above.

If this is the first entry, also create `.tmp/knowledge/index.md` with a table header: `| Topic | Status | Summary |`

If the library already exists, append the new entry to the index table.

**Distillation rules (from Karpathy's approach):**
- Append-only at first — dump everything, process later
- One idea per bullet point
- Concrete > abstract (examples, numbers, commands > vague descriptions)
- Always capture the source URL
- Tag with status: `seed` (just captured), `growing` (being refined), `mature` (solid), `stale` (needs refresh)

### 3. Connect (cross-reference)

After creating an entry:
- Scan existing entries in `index.md`
- Add `[[topic]]` links in the Connections section
- Update the index with the new entry
- Group related topics if patterns emerge

### 4. Review (gravity-driven curation)

Periodically review the library (like Karpathy's "review" phase):
- **Promote**: Entries you keep coming back to → refine, expand, mark as `mature`
- **Sink**: Entries that don't hold up → leave as-is, they'll naturally become stale
- **Merge**: Related entries covering the same ground → combine into one
- **Prune**: Entries that are factually wrong or superseded → update or mark `stale`
- **Spawn**: An entry raises new questions → create new `seed` entries

### 5. Refine (autoresearch loop)

For entries you want to deepen, run the experiment loop:

```
LOOP UNTIL SATISFIED:
  1. Read the current entry
  2. Identify a gap (missing detail, unclear explanation, stale info)
  3. Research the gap (fetch more sources, test claims, try commands)
  4. Make ONE focused improvement to the entry
  5. Check: did the entry get better? (clearer, more accurate, more actionable)
  6. If yes → KEEP. If no → REVERT.
```

### 6. Q&A (query the wiki)

Once the wiki reaches scale, use it as a knowledge base for complex questions:
- Feed relevant entries as context to the LLM
- LLM cross-references, synthesizes, and cites sources
- Karpathy found: no RAG needed — LLM reading markdown directly works great when the wiki is well-organized
- Output is not limited to text — can generate reports, slides (Marp), charts (matplotlib), or new wiki entries
- **Each query deposits back**: outputs can be archived into the wiki, making it thicker over time

### 7. Lint (periodic quality check)

Run an LLM lint pass on the wiki periodically:
- Check for stale facts, broken links, outdated info
- Verify consistency across entries
- Flag entries with no connections (orphans)
- Suggest merges for overlapping topics

## Principles

From Karpathy's patterns:

1. **LLM compiles, human curates** — You feed raw sources. LLM writes the wiki. You review and approve. Like a compiler: raw → structured.
2. **No RAG, just markdown** — Modern LLMs have large enough context windows. Organized markdown wiki > vector database for most personal knowledge.
3. **One file per topic** — CTRL+F within a file, `index.md` across files. Flat structure.
4. **Append first, curate later** — Don't over-organize upfront. Dump into `raw/`, compile later.
5. **Gravity-driven** — Important knowledge gets revisited and refined. Unimportant sinks.
6. **Each query deposits** — Q&A outputs can be archived back into wiki. The library grows with use.
7. **Concrete and actionable** — Commands, code snippets, specific numbers. "How to do X" > "X is interesting."
8. **Simplicity over structure** — No databases, no tags taxonomy. Markdown files + index is enough.

## Anti-Patterns

- **Hoarding without distilling** — saving URLs without extracting insights = bookmarks, not knowledge
- **Over-categorizing** — spending more time organizing than learning. Flat files + index is enough.
- **Perfectionism on first pass** — `seed` status exists for a reason. Capture fast, refine later.
- **Ignoring connections** — isolated entries miss the compounding value of cross-references
- **Never reviewing** — the library degrades without periodic curation passes
