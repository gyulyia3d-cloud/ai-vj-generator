# Delivery

The deliverable is the generator with the project loaded, plus the briefing summary. Pick the path for the environment you are in.

## 1. Write the project file

Save the PROJECT JSON as `<kebab-name>.aivj.json` (in the user's project folder in Claude Code, or in the working directory in claude.ai).

## 2. Build the HTML

From the skill folder (`<skill>` = the directory containing this SKILL.md):

```bash
python <skill>/scripts/make_artifact.py project.aivj.json --out out/project.html
```

or, with Node:

```bash
node <skill>/scripts/make-artifact.mjs project.aivj.json --out out/project.html
```

Add `--artifact` to drop the `<html>/<head>/<body>` wrapper when publishing as a claude.ai Artifact (the platform adds its own). Both scripts validate the JSON shape and escape `</script>` inside strings.

No scripts available: copy `assets/engine.html` and replace the marker `/*__PROJECT_JSON__*/` inside `<script type="application/json" id="project">` with the minified JSON.

## 3. Hand it over

| Environment | Do |
|---|---|
| Claude Code with the Artifact tool | Build with `--artifact`, publish it with `capabilities: {downloads: true}` so ZIP export and WebM saving work, icon `video`. Link the user. |
| Claude Code without artifacts | Build without `--artifact`; tell the user to open the file in a browser. Microphone input and output windows need an http origin: from the cloned repository (not the skill folder) run `node scripts/serve.mjs`. |
| claude.ai with code execution | Build without `--artifact`, present the HTML file for download. |
| No tools | Give the JSON in a code block and tell the user: open the generator (GitHub Pages or local `app/index.html`) → PROJETO → paste → Importar no modo Briefing. |

Inside a claude.ai Artifact: microphone and pop-up output windows are refused by the sandbox; audio reactivity works with an uploaded audio file, output via fullscreen. Say this once when relevant.

## 4. Summary block (always last)

```
PROJECT       name · artist
ART DIRECTION one line from the grammar
CANVAS        W×H · aspect · target
FPS           30
DURATION      N bars = S s = F frames
BPM           …
AUDIO         autonomous / reactive (which layers)
LOOP          seamless on · mode
COMPOSITIONS  01 NAME — hypothesis …
LAYERS        primary per composition
OUTPUT        transport + status from the truth table
EXPORT        recommended export mode and Resolume steps
```

Then ask only what is still open (for example: "Me manda o pitch do LED para eu calibrar a espessura das linhas?").
