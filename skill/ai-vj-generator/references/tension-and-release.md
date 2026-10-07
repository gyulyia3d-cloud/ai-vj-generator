# Tension, release, grammar of passage (V7)

Why: a set where every layer is equally dense and pretty reads as wallpaper. Drama needs one thing that dominates, room for it to land, and rules for how pieces hand over to each other. Sources studied: editorial print recipes (one focal event, one release zone), launch-film motion analysis, animation-principles collections, explanation-design principles. Concepts only.

## 1. One focal event, one release zone

Every composition names, in its contract:
- `focalEvent`: the single audacious thing (an oversized word, an extreme crop, a scale break, a collision of two systems). Everything else supports or releases it.
- `releaseZone`: a deliberately quiet region (low density, low contrast) that gives the event room. Typical 25–55% of the surface for stage work; less on facades seen from far.
- `unresolvedEdge` (optional): one edge that stays open (a fade before the frame, a cropped word, a broken alignment).
- `tension`: `relaxed` (one event, wide release, sparse support), `balanced` (one event, structured support), `assertive` (the event is the point; release is short and hard). Default relaxed for ambient/lounge, balanced for gigs, assertive for drops.

Rule: two focal events in one composition = two compositions. If the focal event cannot be named in a sentence, the piece has no hierarchy: cut layers until it can.

## 2. Hierarchy ladders (extends craft-and-finish)

Opacity ladder for "persistent context": primary 1.0, context 0.4, structure 0.15. Introduce a new idea by dimming the previous one, not by removing it. Density ramps over the loop: start sparse, add layers, peak, strip back (progressive complexity); never constant density.

## 3. Controlled imperfection (stable seed)

Pick 0–2 for clean work, 2–3 for tactile work. Each is small and seeded (same seed, same flaw):
registration drift (a channel 1–3 px off, LED: sub-pixel offset of an additive copy), uneven density (6–12% brightness variation by noise), dry-edge breakup (1–4% of the edge), halftone/dot drift, a broken gesture (a line that does not close, gap 4–12%), a late layer (one element 1–2 frames behind). Never move the focal element or the grid, never reduce readability below viewing distance.

## 4. Banned list (anti-cliché)

`banned` is a short list written per briefing of effects the piece must not use, chosen to force an original solution. Typical candidates to ban when they are not the idea: shockwave rings on every hit, particle bursts, RGB split everywhere, camera shake, lens flares, neon glow, grid floors, flashing backgrounds, bouncy easing, random glitch. The validator warns when `meta.contract.banned` is missing.

## 5. Grammar of passage between compositions (transitions)

Six rules from analysing professional launch films, translated:
1. The foreground becomes the transition: an element of the outgoing piece scales/wipes through the frame while the next is already in place; no empty gap.
2. One persistent actor: a shape, a word, a line or a colour keeps identity across compositions of a set.
3. Density comes from hierarchy: one primary move, supporting staggers, fine tertiary detail, overlapping; do not start and stop the whole frame on every beat.
4. Change speed, do not drift: readable target, fast exit, slowing arrival.
5. A hard cut works when subject, scale, direction and material match and motion continues through the cut.
6. Cause then effect: every gesture visibly produces a result.

Mechanisms (pick by argument of the concept, never by lottery): fly-through (foreground scales past the camera), logo/shape-as-portal (its hole grows into the next frame), selection→expansion, materialising result (shell first, regions fill in order), persistent rails (lines survive a content swap), exploded layers, registered decomposition, wall→one actor (overload collapses to one subject), carousel emphasis, perspective fold, colour-field takeover (once per set), tile wipe (chapter break, sparingly). Engine transitions available today: `cut fade wipe glitch` plus `zoom` (foreground flies through), `slide`, `iris` (shape-as-portal), `blinds` (V7). One wipe direction and one title position per sequence.

## 6. Emotion → motion parameters

| Intent | Timing | Easing | Amplitude / texture |
|---|---|---|---|
| Calm, elegant | long (1.5–4 beats per move), few events | slow in/out, no overshoot | large soft shapes, fades and mask wipes over movement |
| Power, confidence | on the beat, short anticipation, heavy settle | fast out, hard stop | scale contrast, slow push-ins, low-frequency weight |
| Excitement, energy | syncopated, off-beats, 1/8–1/16 | snap, small overshoot | density ramps, accents on `uHit`, fast travel via integrated time |
| Tension, suspense | long hold then sudden break; accelerate towards the drop | ease-in only | narrowing frame, rising pitch of detail, removing then returning |
| Joy, play | bounce, secondary action abundant | spring with overshoot 1.05–1.1 | rounded forms, colour variety within the palette |
| Urgency | continuous, no rests, shortened holds | linear/step | high contrast, small repeated motifs, strobe only inside flash limits |

Brand/energy axes (energy low↔high, tone serious↔playful): squash and stretch 0–10% (low) vs 20–40% (high); anticipation 50–100 ms vs 150–300 ms; part timing 400–800 ms vs 100–250 ms; serious = direct near-linear paths and minimal secondary action, playful = curved paths and abundant secondary action. Timeline shape for a gesture: 20:50:30 anticipation:action:follow-through.

## 7. Rhythm as composition

Treat the set like a score: tempo (bars per composition), meter (4/4 grid), phrasing (action–rest–action), syncopation (accent off the beat for surprise), polyrhythm (two layers on different divisions, e.g. 1/4 against 3/16), breathing (alternate active and rest sections), dynamics (pianissimo gives fortissimo its power). Every composition needs at least one rest.

## 8. Linked representations

When a layer shows data (spectrum, scope, counter), it must be driven by the real signal that also drives the image, so viewer sees cause and effect. A decorative gauge that moves randomly is a lie; cut it.
