# Creative Knowledge: visual DNA, divergence, technique, diversity, self-critique

> Load when defining the visual DNA of a composition, choosing techniques, checking diversity or critiquing (§27–§45). The weighted scoring that closes a project is in `../quality-gates.md`.

---

# 27. VISUAL DNA

Each composition must internally define:

```yaml
VISUAL_DNA:

concept:
semiotic_intent:

form:
topology:
composition:
depth:

material:
texture:
lighting:

color:
palette_logic:

motion:
animation_principle:
rhythm:
temporal_structure:

camera:
density:
energy:

audio_relationship:
transition_behavior:

technical_strategy:
```

Visual DNA is the bridge between art direction and implementation.

---

# 28. CONCEPTUAL DIVERGENCE

Generate 3–5 conceptually distinct hypotheses.

Do not use fixed categories such as:

- STRUCTURE
- FLOW
- DENSITY
- RHYTHM
- TRANSFORMATION

as mandatory concepts.

Each hypothesis should propose a different visual argument.

Example:

Briefing:

> "ancient cosmic intelligence emerging from digital matter"

Possible concepts:

```text
01 — ARCHAEOLOGICAL COMPUTATION
Digital matter behaves like an ancient artifact.

02 — COSMIC ORGANISM
The system behaves like a biological intelligence.

03 — SIGNAL AWAKENING
An invisible signal gradually organizes noise.

04 — DIGITAL FOSSIL
A computational structure crystallizes from chaotic matter.

05 — MACHINE MYTHOLOGY
Geometric systems behave like ritual structures.
```

Only after conceptual divergence should technical implementation begin.

---

# 29. TECHNIQUE SELECTION

For every concept:

```text
CONCEPT
↓
ANIMATION PRINCIPLE
↓
VISUAL GRAMMAR
↓
TECHNIQUE
```

Example:

```text
Concept:
digital fossilization

Animation:
chaos → accumulation → crystallization

Possible techniques:
SDF
particle accumulation
Voronoi
reaction-diffusion
procedural geometry
```

Select the technique that communicates the concept best.

---

# 30. TECHNIQUE DIVERSITY

Within a multi-composition output, do not allow all concepts to converge on one implementation.

Aim for structural diversity across:

- procedural geometry
- particles
- fields
- cellular systems
- typographic systems
- SDF
- raymarching
- feedback
- generative patterns
- data-like structures
- atmospheric systems
- hybrid systems

Three compositions using different parameters of the same system do not count as three truly different concepts.

---

# 31. GENERATIVE SYSTEM DESIGN

Before implementation, define:

```text
PRIMITIVES
RULES
RELATIONSHIPS
TRANSFORMATIONS
CONSTRAINTS
RANDOMNESS
SEED
TEMPORAL EVOLUTION
RENDERING METHOD
```

The system should have internal logic.

Prefer:

```text
field
→ interaction
→ transformation
→ accumulation
→ material response
```

over:

```text
noise
+ glow
+ blur
+ chromatic aberration
```

---

# 32. MATERIAL LANGUAGE

Materials can communicate meaning.

Possible material languages:

- metallic
- glass
- translucent
- liquid
- biological
- crystalline
- ceramic
- paper
- digital
- holographic
- atmospheric
- emissive
- matte
- granular

Material must correspond to concept.

For example:

```text
crystalline
→ rigidity / formation / mineralization

liquid
→ transformation / instability / flow

glass
→ fragility / transparency / distance

metal
→ machine / permanence / industriality
```

---

# 33. SPATIAL LANGUAGE

Use spatial behavior intentionally:

- planar
- layered
- volumetric
- microscopic
- monumental
- architectural
- atmospheric
- tunnel-like
- radial
- linear
- cellular
- distributed

Space affects perception.

A microscopic system and a monumental architectural system may use similar mathematical techniques but communicate completely different ideas.

---

# 34. CAMERA LANGUAGE

Camera behavior is part of art direction.

Possible behaviors:

- static
- slow push
- pull
- orbit
- macro
- microscopic
- panoramic
- tracking
- parallax
- POV
- floating
- locked-off

Do not use camera motion merely to make a static shader appear more dynamic.

---

# 35. COMPOSITION

Define:

- focal point
- visual hierarchy
- negative space
- scale
- balance
- symmetry
- asymmetry
- edge behavior
- depth
- frame occupancy
- visual flow

Aspect ratio must influence composition.

A 5120×500 LED surface is a horizontal spatial system, not a cropped 16:9 composition.

A 1080×1920 portrait display is a vertical visual field.

---

# 36. MOTION SYSTEM

For every major animated element determine:

```text
WHAT MOVES?
WHY?
WHERE?
HOW FAST?
WITH WHAT ACCELERATION?
WHAT CAUSES THE CHANGE?
WHAT IS THE RHYTHM?
WHAT IS THE RELATIONSHIP TO OTHER ELEMENTS?
```

Avoid generic:

```text
constant rotation
generic noise movement
random floating
arbitrary scaling
```

unless those behaviors are conceptually justified.

---

# 37. LOOP DESIGN

Supported:

- 1 bar
- 2 bars
- 4 bars
- 8 bars
- 16 bars

Loop grammars:

### CYCLIC

A → B → A

### MORPHOLOGICAL

A → transformation → B → transformation → A

### CONTINUOUS

No perceptible reset.

### EVENT

stable → buildup → event → recovery → stable

### EVOLUTIONARY

state A → mutation → state B → mutation → state A

The loop should be designed as a temporal composition.

---

# 38. AUDIO REACTIVITY

Audio reactivity must support hierarchy.

Normally:

- primary element reacts
- maximum 2–3 reactive layers

Possible mappings:

- scale
- intensity
- density
- deformation
- emission
- particle count
- opacity
- event probability
- movement

Do not make every element react simultaneously.

---

# 39. REFERENCE TRANSFORMATION

When the user supplies a reference:

Never ask:

> "How can I reproduce this?"

Ask:

```text
What is structurally interesting?

What is compositional?

What is chromatic?

What is temporal?

What is material?

What is semantic?

What is algorithmic?

What can be transformed into a new visual system?
```

The reference should become:

```text
REFERENCE
↓
ANALYSIS
↓
PRINCIPLE
↓
TRANSFORMATION
↓
ORIGINAL OUTPUT
```

---

# 40. VISUAL REPERTOIRE MATRIX

Maintain an internal matrix:

```text
FORM
├── geometric
├── organic
├── architectural
├── typographic
├── particulate
├── cellular
├── fluid
└── atmospheric

TOPOLOGY
├── radial
├── linear
├── branching
├── cellular
├── volumetric
├── planar
├── recursive
└── distributed

MOTION
├── growth
├── flow
├── oscillation
├── rotation
├── morphing
├── fragmentation
├── collapse
├── expansion
├── accumulation
└── diffusion

TECHNIQUE
├── SDF
├── raymarching
├── particles
├── fields
├── feedback
├── cellular systems
├── procedural geometry
├── noise
├── typography
└── hybrid systems
```

The goal is to explore combinations intelligently.

---

# 41. DIVERSITY ENGINE

Diversity must be evaluated across:

```text
concept
semiotic intent
animation principle
visual primitive
topology
spatial behavior
motion
material
composition
technique
temporal structure
```

Parameter changes alone do not constitute meaningful diversity.

Example:

```text
blue noise
→ red noise
```

NOT diverse.

```text
noise field
→ reaction diffusion
```

Potentially diverse.

```text
reaction diffusion
→ monumental SDF architecture
```

Strongly diverse.

---

# 42. GENERATION HISTORY

Track recent:

```text
concepts
techniques
motion systems
topologies
materials
compositions
dominant effects
camera behaviors
color strategies
```

Avoid repeating the same combinations.

History is used **only to avoid repetition**. It never carries parameters, palettes, names or structures into a new briefing (§1B).

The Skill should behave as if it has a working creative repertoire.

---

# 43. NOVELTY SCORE

Before final implementation:

```text
CONCEPT NOVELTY       /5
SEMIOTIC NOVELTY      /5
MOTION NOVELTY        /5
SPATIAL NOVELTY       /5
COMPOSITION NOVELTY   /5
MATERIAL NOVELTY      /5
TECHNIQUE NOVELTY     /5
TEMPORAL NOVELTY      /5
```

If the result is too close to previous work:

```text
REJECT
↓
CHANGE CONCEPTUAL STRATEGY
↓
REBUILD
```

Do not merely change color.

---

# 44. SELF-CRITIQUE

After building the artifact, inspect the actual animation.

Evaluate:

```text
Does it communicate the briefing?

Does it communicate the concept?

Is the semiotic intention readable?

Is the composition intentional?

Is there hierarchy?

Is the motion meaningful?

Is the temporal structure convincing?

Is the loop convincing?

Is the visual language coherent?

Does the technique overpower the concept?

Does it look like a preset?

Does it resemble a previous output?

Would an experienced motion designer consider the movement intentional?

Would an experienced VJ consider it useful in a set?

Does it have visual authorship?
```

If weak:

```text
DIAGNOSE
↓
MUTATE
↓
REBUILD
↓
REVIEW
```

---

# 45. MUTATION PRIORITY

When the result is weak or repetitive, mutate in this order:

```text
1. CONCEPT
2. SEMIOTIC INTENT
3. ANIMATION PRINCIPLE
4. TOPOLOGY
5. SPATIAL SYSTEM
6. MOTION SYSTEM
7. TECHNIQUE
8. MATERIAL
9. COMPOSITION
10. PARAMETERS
```

Do not begin by changing hue, speed or scale.

---
