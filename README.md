# Copilot Infinite

Keeps the Copilot agent loop alive. Adds Discord-backed tools so the agent can notify you and ask questions on your phone while working autonomously in VS Code.

## Install

Download the latest `.vsix` from [GitHub Releases](https://github.com/lalalic/copilot-infinite/releases), then install in VS Code:

```bash
code --install-extension copilot-infinite-*.vsix
```

Or: Extensions sidebar → `···` menu → **Install from VSIX…**

## Tools

- **`report_to_discord`** — Post a status/result to Discord. Use when Discord is enabled.
- **`ask_questions_to_discord`** — Ask questions via Discord. Use when Discord is enabled, for questions needing mobile attention.

The built-in ask questions tool remains the primary turn-control mechanism. Discord tools are additive.

## Setup

1. Set `copilot-infinite.discord.channelId` in workspace settings.
2. Run `Copilot Infinite: Set Discord Bot Token` from the Command Palette.
3. In the Discord Developer Portal, enable the bot's **Message Content Intent**.

Discord is optional. Without it, `report_to_discord` silently succeeds and the agent uses the built-in ask questions tool for all interaction.

## Commands

- `Copilot Infinite: Set Discord Bot Token`
- `Copilot Infinite: Clear Discord Bot Token`
- `Copilot Infinite: Toggle Discord Enabled`
- `Copilot Infinite: Answer Pending Question`

## Agents

Six agent modes available in the Copilot chat agent picker:

| Agent | Description |
|-------|-------------|
| **neverstop** | Infinite loop agent — never closes its turn, keeps working autonomously using Discord (or built-in) questions for steering. |
| **spec-driven-dev** | Full-lifecycle orchestrator: spec → implement → UI-verify → deliver → monitor. |
| **explore** | Fast read-only codebase exploration and Q&A. |
| **Plan** | Researches the codebase and outlines multi-step plans — never implements. |
| **code-review** | Read-only code review against best-practice rules (file size, SRP, OOP, anti over-engineering). |
| **marketing** | Routes marketing tasks to demo-video, repo-marketing, audio-sourcing, and remotion-engine. |

## Skills

Seventeen skills the agents can invoke:

| Skill | Description |
|-------|-------------|
| **agent-browser** | Browser automation via CDP — attaches to the user's running browser. |
| **user-stories** | Define user stories, Given/When/Then scenarios, and E2E happy paths. |
| **clarify-idea** | Structured interview to produce or evolve `.specs/spec.md`. |
| **e2e-as-real-user** | Execute scenarios against the live app to verify before shipping. |
| **demo-video** | Record narrated demo clips of a live app via storyboard DSL. |
| **remotion-engine** | Render MP4 videos from declarative JSON with 13 built-in components. |
| **repo-marketing** | 8-step pipeline: research → hooks → script → storyboard → rendered MP4s. |
| **audio-sourcing** | Find and download royalty-free BGM and SFX for video projects. |
| **post-platforms** | Publish videos to YouTube, TikTok, Xiaohongshu, WeChat Channels. |
| **build-ai-app** | Architect an AI-powered app from idea to working agents. |
| **knowledge-lib** | Build a personal knowledge wiki from URLs, books, and papers. |
| **feedback** | Drop-in crash reporting and user feedback via GitHub Issues relay. |
| **feedback-triager** | Triage incoming feedback issues — classify, confirm, route. |
| **post-monitor** | Daily/weekly health digest from feedback repo and analytics backends. |
| **agent-customization** | Create/debug VS Code agent customization files. |
| **create-agent** | Guide creation of a custom `.agent.md` for a specific job. |
| **create-skill** | Create a new SKILL.md with proper structure and frontmatter. |
