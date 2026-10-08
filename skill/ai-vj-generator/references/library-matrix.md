# Library Matrix

## Core browser-native foundation

### Web APIs — default
Use when:
- exact control matters
- no dependency is necessary
- the artifact must remain portable

Relevant:
- Canvas 2D
- WebGL2
- Web Audio API
- MediaDevices / getUserMedia
- MediaRecorder
- Fullscreen API
- File API
- FontFace API
- Web Workers / OffscreenCanvas when useful

### WebGL2
Use for:
- shaders
- framebuffers
- instancing
- transform feedback
- multiple render targets

### SVG
Use for:
- vector drawing
- paths
- typography masks
- scalable graphics
- line systems

## Creative coding

### p5.js
Strong for:
- generative 2D
- particles
- fields
- fast sketching
- procedural drawing

Use as a module, not as a mandatory default.

### Three.js
Strong for:
- 3D geometry
- cameras
- materials
- postprocessing
- instancing
- texture / video inputs

### PixiJS
Strong for:
- 2D scene graphs
- sprites
- textures
- meshes
- filters
- large numbers of 2D objects

### regl
Strong for:
- functional WebGL
- draw commands
- explicit framebuffers
- low-level GPU composition

### Paper.js
Useful for:
- vector path operations
- bezier systems
- procedural 2D geometry

### GSAP / anime.js
Useful for:
- deterministic-ish keyframe/timeline orchestration
- easing
- choreography
- UI / typography animation

Prefer the runtime's own normalized timeline when offline determinism is critical.

## Audio

### Web Audio API
Default live FFT / waveform path.

### Meyda
Good for:
- RMS
- amplitude spectrum
- spectral centroid
- spectral rolloff
- other spectral features

### Essentia.js
Use when deeper audio/music analysis is needed and the bundle cost is justified.

### Tone.js
Use when a project genuinely needs a high-level musical transport or synthesis layer. Do not add it just for BPM math.

## Live-code / VJ references

### Hydra
Study:
- chainable texture generators
- feedback
- audio FFT mapping
- modulation
- compositional verbs

Do not blindly port Hydra syntax; translate the system into the runtime's layer model.

### Strudel
Study:
- pattern-based time
- cycle structure
- musical pattern thinking
- event scheduling

For this skill, Strudel is mainly a conceptual reference for temporal systems.

### Resolume Wire
Study only the vocabulary of node-based abstraction and ISF. Slices, OSC, Syphon/Spout and routing are outside the product scope.

### TouchDesigner
Study:
- operator thinking
- TOP / CHOP / SOP / COMP mental model
- instancing
- feedback
- GLSL
- mapping / calibration
- render targets

### vvvv
Study:
- dataflow
- node graphs
- GPU-centric composition
- DX11 / shader thinking

### Max / Jitter
Study:
- signal flow
- graphics/audio relationship
- procedural patching
- feedback

### Notch
Study:
- GPU node / block thinking
- real-time VFX
- particles
- fields
- compositing

### Cavalry
Study:
- procedural motion
- behaviors
- fields
- parametric motion graphics
- timeline / layer thinking

### Synesthesia
Study:
- shader scene format
- audio uniforms
- modular GLSL
- parameterized scene control

## Studied for concepts (V5)

TouchDesigner's output chapters, PixelController, OSCAR, P5LIVE, anime.js, GSAP, Motion Canvas, d3, Taichi, three.js post-processing: what each contributed and under what licence is in `repo-analysis.md`. None is a runtime dependency.

## Build rule

Install only libraries needed by the chosen architecture. Bundle or vendor dependencies needed by the artifact when possible.

Do not make the artifact depend on a public CDN if the target environment may block network access.
