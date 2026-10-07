# Provenance, Licenses & Safe Adaptation

## What the skill may learn from

It may study:
- public documentation
- APIs
- architectural concepts
- algorithms described in papers or public docs
- examples whose license permits reuse
- conceptual workflows
- parameter taxonomies
- public-domain / permissively licensed shader libraries

## What it should not do

Do not:
- copy proprietary source code
- copy UI assets
- redistribute commercial software binaries
- paste large sections of copyrighted documentation
- reproduce an artist's signature style as a style preset
- embed unlicensed fonts or media

## Adaptation rule

Prefer:

```text
source
→ concept / API / method
→ independently reasoned implementation
```

Keep a third-party notice when code is actually incorporated.

## User-supplied assets

Treat user files as authoritative when exact:
- fonts
- logos
- photos
- videos
- SVGs
are required.

Do not invent replacements silently.

## Third-party material studied (V5)

The full ledger of repositories studied, their licences and what each contributed is `repo-analysis.md`.

- AGPL and GPL code (Hydra, P5LIVE, PixelController) and proprietary code (GSAP) were read for **concepts only**; no code from them is in the skill.
- Formulas (parametric curves, attractors, Kepler's equation, the superformula, the OKLab matrices, edge-blend ramps, the Chladni equation) are public mathematics. Every implementation in `recipes/` and `scripts/` was written independently and tested.
- Permissively licensed projects (MIT, BSD, ISC, Apache) informed the design; no source was copied, so no third-party notice is required.
- Documentation and book material (the TouchDesigner introduction, the VJ manifesto) is summarised in original words and cited by name, never reproduced.
