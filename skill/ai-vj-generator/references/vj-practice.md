# VJ practice: the craft around the files

What separates content that "looks good in the preview" from content that works on a night: how a VJ performs, what a gig actually is, how to design clips for mixing, and how to deliver. Load for clip packs, live sets, anything a person will operate in front of a crowd, and when writing the delivery notes.

## 1. The performer's frame

A VJ is a performer who mixes live to the room: eyes on the crowd, the screen and the DJ, hands on controllers. Content is an instrument, not a video to watch end to end. The practical consequences for what you build:

- **Clips are played, not screened.** They start on a beat, loop without a visible seam, and get layered, tinted, masked and cut. Build for being mixed (negative space, one hero, alpha or white-alpha, clean first and last frames).
- **A set has an energy ladder.** Quiet openers, builders, peak clips, breakers, reset clips. A pack that is all peaks leaves the performer nowhere to go; a pack that is all ambience cannot carry a drop.
- **Always include the exits:** a clean **black**, a neutral **hold** (something calm and brand-safe), and a **panic** clip that is safe on any wall. These are not decoration; they are the performer's safety net.
- **Controls are the performance.** Expose the few parameters a VJ would play (speed, density, one colour, one distortion, one reveal), not a debugger's worth. Name them in the artist's language.
- **Tempo is relative.** A loop that closes at 4 bars at 128 BPM drifts at 140; the media server's BPM sync absorbs it, but a loop that depends on one tempo is fragile. Prefer phase-driven motion and loops that read at any tempo in the genre's range (`briefing/diagnosis.md` §4).

## 2. Kinds of gig, and what each demands

| Gig | What it is | Content consequence |
|---|---|---|
| **Plug and play** | the VJ connects to an existing video system (a club, a gallery) | one or two output formats, tested ahead; content that tolerates an unknown screen (safe cross, no hairlines) |
| **Full installation** | the VJ brings projectors, screens, scrims, inflatables and sets them up | content designed for the physical set; a site visit; test cards (`output-engineering.md` §8); mapping layers |
| **Specialised content** | made to measure for an event (corporate, wedding, launch, runway) | cue list, brand rules, supplied fonts and logos, approvals, a timeline |

Many gigs mix these. Clarify which one it is before building; it changes the deliverable, the schedule and the price.

## 3. The site visit and the rider

- Ask for the **technical rider** and a **stage plot**, and, when possible, a **site visit** with the lighting designer and the technician: smoke, light on the screen, equipment in front of the image and daylight can ruin a visual performance and must be solved in advance.
- Lighting influences projection; agree an **environment scheme** with the lighting designer so the two support each other (who owns the colour wash, when the screen is dimmed).
- A VJ needs a stable table with sight of at least one projection, power, and a way to hear the DJ. Say what the content needs from the room.
- The rider answers: screen type and size, pixel map, processor, input, refresh, who patches the VJ, cable runs, FOH distance, camera, strobe policy, and the line-in for audio.

## 4. Designing a pack

1. **Name the world** (one contract, one palette logic, one material logic) and make 3 to 8 clips that differ in topology, density, role and energy.
2. **Assign roles on the ladder:** opener, builder, peak, breaker, reset, plus the exits.
3. **Vary the loop length** deliberately: 2 and 4 bars for rhythmic clips, 8 to 16 for atmosphere. Do not make everything 4 bars.
4. **Make clips combinable:** a heavy peak and a quiet structure should look good stacked; verify one stack by eye.
5. **Include one unusual clip** that earns the pack its identity, and one humble clip that holds a room for a minute.
6. **Version for the surfaces you were told about** (`aspect-ratios.md`): the same world, recomposed, never stretched.

## 5. Delivery

- Folder and file names that a stressed person can read: `PROJECT/01_NAME/01_NAME_000000.png` for sequences, `PROJECT_DATA/project.json` to reopen everything (`output-targets.md`).
- State in the delivery notes: format and fps, codec, alpha or white-alpha, loop length in bars and BPM it was built at, which clips are standalone and which are layers, the safe area, the test cards, the assumptions (`meta.spec.assumed`) and what is `REQUIRES BRIDGE`.
- Give the technician a **one-page production sheet** (`PRODUCTION_SPEC.md`): pixel map, folds, zones to avoid, refresh, colour-handling stage, test-card list.
- Credit and pay: the VJ is an artist on the bill. When writing for a promoter or a client, ask for credit alongside the DJs and musicians, a clear scope and fee, and the technical requirements in writing. Specifics belong to the user's agreement, not to the skill.

## 6. Rehearsal and the first five minutes on site

1. Run the **test cards** on the real surface: grid, pixel checks, grey ramp, colour bars, moving bar, blend markers.
2. Confirm the pixel map, the refresh, who applies gamma, the white clip level.
3. Play the exits first (black, hold, panic).
4. Play one clip from each rung of the ladder, with the lighting running, from the farthest seat.
5. Fix the worst problem, not every problem; the room opens soon.

## 7. Learning resources, curated

Use these to deepen a technique, never to copy a result.

- **Shaders and maths:** *The Book of Shaders*, Inigo Quilez's articles (SDFs, domain warping, palettes), Lygia (a shader function library), hg_sdf (signed-distance functions), *The Nature of Code* (simulation), *Generative Design*, Anders Hoff's notes on generative algorithms.
- **Craft:** Tyler Hobbs on flow fields, Matt DesLauriers' canvas-sketch and workshops, *Programming Design Systems* for grids and systems, Amy Goodchild on generative natural feel, Ben Kovach on making generative art feel natural.
- **Colour:** a perceptual colour library (OKLab/OKLCH), Spectral.js for pigment-like mixing when a painterly blend is wanted.
- **Live practice:** the VJ community writing on live mixing and gigs; Resolume's official training; the standing manifesto "Respect your VJ".
- **Software lineages to borrow vocabulary from:** Hydra (chains of source, transform, blend), TouchDesigner (operators and signals), Cavalry (behaviours, falloffs, duplicators, distributions), Notch and Synesthesia (real-time worlds), Strudel and Tidal (patterns of time).
