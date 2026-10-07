# Libraries and tools for animation, generative art and live visuals

The AI VJ Generator engine has no runtime dependencies (except JSZip for export) and its core must stay MIT-compatible. Use this file to: (1) recommend tools for the user's wider pipeline, (2) translate ideas from these tools into the engine's JSON and GLSL, and (3) respect licenses. **Licenses change: confirm the license of the exact version before recommending any code reuse.**

## Web: rendering and animation

| Library | What it is | License (check version) | Role for this project |
|---|---|---|---|
| three.js | 3D for the web (WebGL; WebGPU renderer in recent versions) | MIT | Future 3D / anamorphic module |
| regl, twgl.js, OGL | Thin WebGL wrappers | MIT | Possible base for the WebGL compositor |
| PixiJS | Fast 2D WebGL renderer | MIT | Alternative 2D renderer; reference |
| p5.js | Creative-coding sketchbook (Processing for the web) | LGPL-2.1 | Learning and sketching; not bundled |
| GSAP | Timeline animation | Free under GreenSock's own license (not OSI open source) | Reference for timeline/easing design only |
| anime.js | Lightweight animation engine | MIT | Reference for stagger and easing APIs |
| Motion (motion.dev) | JS/React animation (springs, layout) | MIT | Reference for spring physics |
| Theatre.js | Visual timeline editor for web animation | Core Apache-2.0; studio under AGPL (verify) | Reference for keyframe UI |
| Motion Canvas | Code-driven motion graphics with a live editor | MIT | Reference for separating library and editor |
| Lottie (lottie-web) / Rive | Vector animation playback | MIT runtimes | Import of designed vector animations (future layer) |
| troika-three-text | SDF text for three.js | MIT | Crisp 3D type in the anamorphic module |
| postprocessing (pmndrs) | Effect stack for three.js | Zlib | Reference for bloom, glitch, chromatic effects |

## Shaders

| Resource | What it is | License | Role |
|---|---|---|---|
| *The Book of Shaders* (Gonzalez Vivo, Lowe) | Step-by-step guide: shaping functions, noise, cellular, fractals, patterns | Text online; code examples vary | Teaching reference for GLSL recipes |
| Shadertoy | Community of real-time shaders | Per shader (default CC BY-NC-SA 3.0) | Study only; never paste a Shadertoy shader into a project without its license |
| Inigo Quilez's articles | SDF, noise, raymarching, smooth minimum | Articles; code license per article | Technique reference for SDF recipes |
| LYGIA | Large modular shader library (GLSL, HLSL, WGSL, MSL…) | Prosperity License / Patron license (not MIT) | Reference or optional user-installed adapter; never vendored |
| glslify | Module system for GLSL | MIT | Possible build step when shaders are modularized |
| ISF (Interactive Shader Format) | GLSL + JSON metadata for VJ effects, used by several VJ apps | Spec open; shaders vary | Future import format: thousands of existing effects with declared parameters |

## Live coding and VJ software

| Tool | What it is | License | Role |
|---|---|---|---|
| Hydra (hydra-synth) | Live-coding video synth in the browser, modular like analog video synths | AGPL-3.0 | Conceptual reference only: chaining sources → transforms → outputs |
| cables.gl | Node-based visual programming for WebGL | Open source (verify current license) | Reference for patch-based UI |
| TouchDesigner | Node-based real-time platform | Proprietary (free non-commercial tier) | Destination: Web Render TOP loads this generator; Movie File In reads the PNG export |
| Resolume Arena / Avenue (+ Wire, Alley) | VJ and media-server software | Proprietary | Main destination: PNG → Alley → DXV3 |
| Notch, Unreal Engine (nDisplay) | Real-time 3D for stages and LED volumes | Proprietary | Destination for 3D shows; out of this engine's scope |
| vvvv, Max/Jitter, Isadora | Visual programming for media | Proprietary / mixed | References for performance patching |
| Synesthesia | Shader-based VJ app (supports ISF-like scenes) | Proprietary | Reference for audio-reactive shader UX |

## Audio analysis

| Library | What | License | Role |
|---|---|---|---|
| Web Audio API (AnalyserNode) | Built into browsers | — | What the engine uses now |
| Meyda | Audio features (RMS, spectral centroid, chroma…) | MIT | Possible richer audio bands |
| Tone.js | Web Audio framework with transport and scheduling | MIT | Reference for BPM transport |
| Essentia.js | Music information retrieval (beat tracking, key) | AGPL-3.0 | Reference only (license) |

## Rules

1. **Reference vs dependency.** Learning from a library is always fine. Copying code into the engine requires a permissive license (MIT, BSD, ISC, Apache-2.0, Zlib) and attribution.
2. **Copyleft (GPL, AGPL, LGPL) and non-commercial (CC BY-NC) code never enters the MIT core.**
3. **When the user asks "how do I do X in tool Y"**, answer for their tool, then show how the same idea maps to the engine's JSON if it helps.
4. **Do not invent APIs.** If unsure of a library's current API or license, say so and point to its documentation.
