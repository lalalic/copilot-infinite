---
name: build-ai-app-review
description: "Quality review checklist for AI app architectures built with the 5-layer pattern. Catches over-engineering, skill bloat, missing quality gates, and topology issues. Use when: reviewing an architecture.md, auditing agent/skill files, before implementation begins."
---

# Architecture Review — Quality Checklist

Run this review after Phase 3 (Implement Definitions) and before Phase 4 (Implementation). Catches common design mistakes before they become code.

## 1. Topology Review

### Agent Count Check
| Count | Verdict |
|-------|---------|
| 3-7 agents | **Healthy** — focused, comprehensible |
| 8-12 agents | **Watch** — is every agent earning its place? |
| 13+ agents | **RED FLAG** — likely over-decomposed. Can agents be merged? |

**Ask for each agent**: "If I remove this agent and give its job to another, does the system break?" If no → merge.

### Flow Complexity
- [ ] Can you explain the full flow in 3 sentences?
- [ ] Is there exactly ONE orchestrator? (Multiple orchestrators = multi-headed monster)
- [ ] Do any agents have zero inbound connections? (orphan — never invoked)
- [ ] Do any agents have zero outbound results? (dead end — output goes nowhere)
- [ ] Are adversarial loops capped? (max 3 rounds — infinite loops are real)

### Interactive vs Silent
- [ ] Is the orchestrator the ONLY interactive agent? (ideal)
- [ ] If other agents are interactive: is it justified? (brainstorm helper = OK, data processor = NOT OK)
- [ ] Do silent agents never ask user questions or show progress directly?

## 2. Skill Bloat Review (THE MOST COMMON PROBLEM)

### Count Check
| Count | Verdict |
|-------|---------|
| 3-8 skills | **Healthy** — each skill has clear purpose |
| 9-15 skills | **Watch** — are some just agent capabilities dressed as skills? |
| 16+ skills | **RED FLAG** — skill bloat. Most "skills" should be inline. |

### The Skill Litmus Test
For EACH skill, ask these 3 questions. If any answer is NO → it's probably NOT a skill:

1. **Is it shared?** — Used by 2+ agents? If only one agent uses it → inline in that agent's prompt.
2. **Is it reference material?** — Too detailed to fit in an agent prompt? (specs, formulas, command recipes) If it's short (< 20 lines) → inline it.
3. **Would an agent actually read this file?** — Does the agent need to look up specific values, patterns, or commands? If it's just a label for a capability ("topic-matching") → it's NOT a skill, it's a responsibility.

### Common Skill Anti-Patterns

**❌ Capability-as-Skill**: "user-profile", "calendar-generation", "competitor-analysis" — these are agent responsibilities, not separate reference documents. They belong INLINE in the agent prompt.

**❌ One-Liner Skill**: If the entire "skill" is one sentence ("Filter videos where followers < 1000 and engagement > 10x"), it's a rule, not a skill. Put it in the agent.

**❌ Duplicate Skills**: "hook-writing" in skill file AND full hook section in agent prompt → the knowledge exists in two places. Pick one.

**❌ Granular Decomposition**: Breaking "video production" into 12 separate skills (script-generation, hook-writing, template-selection, camera-guidance, material-selection, video-assembly, tts-generation, voice-cloning, bgm-matching, audio-mixing, text-overlay, caption-burning) when 3-4 well-scoped skills would cover it.

### How to Fix Skill Bloat
1. **List all "skills"** from the architecture
2. **Apply the 3 questions** above to each
3. **Collapse** related skills into broader reference documents:
   - "hook-writing" + "script-generation" + "template-selection" → **script-templates** (one skill)
   - "bgm-matching" + "audio-mixing" + "tts-generation" → **audio-production** (one skill)
   - "video-assembly" + "text-overlay" + "caption-burning" → **ffmpeg-recipes** (one skill)
4. **Delete** capability labels that aren't real reference documents
5. **Target**: 4-8 actual SKILL.md files, not 46 line items

## 3. Agent Quality Review

For each agent file, check:

### Prompt Quality
- [ ] **Clear role**: First sentence defines who the agent IS
- [ ] **Goal statement**: What success looks like (not just "help with X")
- [ ] **Procedure**: Step-by-step, not vague guidance
- [ ] **Output format**: Defined structure, not "return the result"
- [ ] **Constraints/Rules**: Explicit boundaries (what NOT to do)
- [ ] **Skill references**: Points to SKILL.md files, not duplicated content

### I/O Contract
- [ ] Input defined (what data it needs)
- [ ] Output defined (structured return format)
- [ ] Sync/Async declared
- [ ] Interactive/Silent declared
- [ ] Skippable flag set
- [ ] Dependencies listed

### Scope
- [ ] Does exactly one job (not a jack-of-all-trades)
- [ ] Doesn't duplicate another agent's responsibility
- [ ] Has a clear trigger condition ("Use when:")

## 4. Architecture.md Review

- [ ] **Topology diagram** present with all agents + data flows
- [ ] **All I/O contracts** populated (not "TBD" or "same as above")
- [ ] **Skills inventory** is the REAL list (not inflated capability labels)
- [ ] **Tools requiring implementation** lists actual code work needed
- [ ] **Acceptance criteria** are testable by an agent (not "system works well")
- [ ] **State model** defines who reads/writes what

## 5. User Stories Review (CRITICAL)

The architecture must serve real end-users. If you can't walk through a user story from "open app" to "see result", the architecture is theoretical — not practical.

### Story Coverage
- [ ] **Happy path** story exists: user's most common action → successful result
- [ ] **Stuck/confused** story exists: user doesn't know what to do → system guides them
- [ ] **Edge case** story exists: unusual input or failure → graceful handling
- [ ] **Repeat user** story exists: user comes back → system remembers/improves

### Story Quality
For each user story, check:
- [ ] Written from **user's perspective** (not "Agent A sends to Agent B")
- [ ] Starts with a **concrete user action** ("User taps Create Video", not "system initializes")
- [ ] Ends with a **visible result** the user can see in the UI
- [ ] Includes **timing expectations** where relevant (e.g., "within 10 seconds")
- [ ] Maps to specific agent flow (can trace story → orchestrator → sub-agents)

### Story-to-Architecture Traceability
For each user story, verify:
- [ ] Every step in the story maps to at least one agent
- [ ] No agent is unreachable from any story (if an agent has no user story touching it → why does it exist?)
- [ ] Interactive agents are only triggered when the story involves user interaction
- [ ] Async agents have clear "user sees result later" moments in the story

### Red Flags
| Flag | Problem |
|------|---------|
| No user stories at all | Architecture is academic, not practical |
| Stories only describe happy path | Will break on first real user |
| Stories say "system does X" | Not user-perspective — rewrite |
| Agent exists but no story touches it | Orphan agent — maybe unnecessary |
| Story requires 10+ steps | Too complex — simplify the flow |

## 6. Red Flags Summary

| Red Flag | What It Means |
|----------|--------------|
| 46+ skills listed | Confused skills with agent capabilities |
| No adversarial loop | First-draft quality will ship |
| 3+ interactive agents | User gets confused about who they're talking to |
| No Mermaid topology showed to user | Architecture wasn't discussed before implementation |
| Agents with no output consumer | Orphan work — nobody uses the result |
| Skills that are 1-3 lines | These are rules, not skills |
| Duplicate knowledge (skill + agent prompt) | Maintenance nightmare |
| No acceptance criteria | Can't verify the architecture works |
| No user stories | Architecture is theoretical, won't survive real users |
| Agent not reachable from any user story | Orphan agent — probably unnecessary |

## How to Use This Review

1. Open the architecture.md
2. Walk through each section above
3. For each [ ] checkbox: mark pass or fail
4. For each failed check: document the specific issue
5. Present findings to user: "Found 3 issues. Biggest: skill bloat (46 → should be 6). Fix?"
6. Apply fixes
7. Re-run review until all critical checks pass

**This review should take 10-15 minutes, not hours.** If the architecture is solid, most checks pass quickly.
