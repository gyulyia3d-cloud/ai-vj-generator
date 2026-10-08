---
name: how-to-use
description: Explain everything the AI VJ Generator can do inside Claude chat, in English or Brazilian Portuguese. The user types /how-to-use. It also runs once, automatically, on the first use after installation.
disable-model-invocation: true
---

# /how-to-use

1. Ask which language to use if the conversation has not set one: **English** or **Português (Brasil)**. Reply in that language.
2. Read `../ai-vj-generator/references/how-to-use.md` and present the section in that language: what the skill does, the commands, the flow, what you get back, and how to open the output viewer. Keep it short and scannable. End with the next step: `/vj <briefing>`.
3. Make sure the first-run marker exists so this does not repeat on its own: write an empty file `../ai-vj-generator/.first-run` (relative to this skill's base directory).
