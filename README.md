# Copilot Infinite

Keeps the Copilot agent loop alive. Adds Discord-backed tools so the agent can notify you and ask questions on your phone while working autonomously in VS Code.

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
