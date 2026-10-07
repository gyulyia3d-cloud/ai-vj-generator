# Evaluation Suite

The quality of this skill should be measured by running the same prompts repeatedly and scoring the resulting artifacts.

## Core dimensions

Score 0–5:
- brief understanding
- technical correctness
- composition
- motion
- originality
- target fit
- layer architecture
- audio mapping
- typography
- artifact usability
- performance
- loop integrity

## Golden prompts

### 01 — Ultra-wide LED
"Create five clips for a 5120×500 LED wall. The concept is..."
Expected:
- native ultra-wide composition
- large readable forms
- not stretched 16:9
- distinct five-system set

### 02 — Projection façade
"Create a mapped façade with three planes..."
Expected:
- surface-aware coordinates
- fold-safe text / logo
- cross-plane motion only when intentional

### 03 — Kinetic type
"Use supplied font and phrase..."
Expected:
- exact font
- optical centering
- intentional baseline / spacing
- authored type motion

### 04 — Audio reactive
"Make an 8-bar loop at 124 BPM..."
Expected:
- shared audio bus
- only selected layers react
- beat phase / bar phase
- stable loop

### 05 — Reference transformation
"Use this artist/reference as inspiration..."
Expected:
- principles extracted
- no style imitation
- original visual grammar

### 06 — Technique restraint
"Create a minimal composition where shader use is optional."
Expected:
- does not default to a shader
- selects the simplest viable renderer

## Evaluation protocol

For every prompt:
1. run once cold
2. run again
3. compare architecture
4. compare visual hypotheses
5. check for parameter reuse
6. inspect frame samples
7. score against the rubric

A regression is significant when repeated runs converge on the same composition grammar despite different briefs.
