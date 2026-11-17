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

## Third-party material

- Formulas (parametric curves, attractors, Kepler's equation, the superformula, the OKLab matrices, edge-blend ramps, the Chladni equation) are public mathematics. Every implementation in `recipes/` and `scripts/` was written independently and tested.
- Third-party shaders in `isf-library/third-party/` and the vendored JSZip keep their authors' credit and licence notice, as their licences require.
