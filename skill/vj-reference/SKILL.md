---
name: vj-reference
description: Analyze attached images and videos as references for a VJ project and return a reference grammar, without building anything.
argument-hint: <what the references are for, optional>
disable-model-invocation: true
---

# /vj-reference

Analyze the images and videos attached to this conversation as references. Do not build a project.

Context from the user: $ARGUMENTS

1. Invoke the `ai-vj-generator` skill. Its files are in the sibling folder `../ai-vj-generator/`.
2. Read `../ai-vj-generator/references/attachments.md` and follow its procedure for every attachment: look at it, run the measurement script, write one reference grammar per attachment (SEEN / MEASURED / PRINCIPLE / NOT TAKEN / DECISION).
3. If several attachments exist, compare them: what they share, and where they disagree (turn the disagreement into a question).
4. End with the 3–5 principles that matter most and the questions they raise. Offer to continue with `/vj`.
5. If there are no attachments, say so and ask the user to attach them.
