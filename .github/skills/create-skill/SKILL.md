---
name: create-skill
description: create a skill with agent assistant
---

skill is a markdown file with yaml front matter, which defines a skill for a capability.

# file structure
/.github/skills/<skill-name>/
  - SKILL.md                  # the main file for the skill, which defines the skill and how to use it
  - [reference folder/files]  # e.g. code snippets, test cases, etc.
  - [scripts folder/files]    # e.g. test scripts, deployment scripts, etc.
  - [templates folder/files]  # e.g. code templates, documentation templates, etc.



# SKILL.md structure example
```markdown
---
name: <skill-name: must be same as the folder name>
description: <a brief description of the skill, what it can do, when to use it>
---

<overall description of the skill>

<how to use the skill>

<workflow of the skill, if needed>
<other details, e.g. limitations, best practices, etc.>
```