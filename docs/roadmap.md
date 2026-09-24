# Roadmap to 1.0

Each version ends with something that can be opened on an iPhone from GitHub Pages and with integration tests for every rule it adds. A version adds one layer. The layers follow the order in which the game becomes playable, then tactile, then alive, then personal.

1.0 is the MVP of the GDD: one room, one window, three times of day, rain, a cat, one kettle, an electric heater, a thermos, a caddy and spoon, three bowls, three teas, a cloth and two figurines, with heating, temperature, pouring, brewing, bitterness, the first sip, the gods' plaque and the option to simply stay.

## 0.1 — Simulation core (this version)

- The ritual as a headless simulation in TypeScript that imports nothing: heating, cooling, the thermos, pouring with spills and overflow, scooping and tipping leaves, brewing with strength and bitterness, tasting, offerings, the gods, wiping and drying, finishing, resting and leaving.
- Fixed-step time, identical results at any frame rate.
- Content as data: sencha, oolong and shou puerh, the clay kettle, the thermos, tea bowls, the electric plate, the dragon and the toad, the quiet room.
- Integration tests for every rule, plus a content balance test that brews each tea by the book.
- A ritual bench: a debug page with buttons and sliders over the core, published on GitHub Pages, so the rules can be tried on a phone.
- GitHub Actions: type-check and tests on every push, deploy to Pages from the default branch.

## 0.2 — First touch

- Phaser (version chosen and pinned when it is added), with a Vite build in the same pipeline.
- A portrait scene with placeholder shapes: table, kettle, heater, thermos, caddy, spoon, three bowls, two figurines, cloth.
- Every 0.1 command reachable by gesture: drag to the heater, tap the switch, tilt to pour with a vertical drag, scoop and tip, drag a bowl to a figurine or to the viewer.
- A presenter that turns state into cues: steam and kettle sound levels from temperature, liquor colour from strength, liquid level from volume, as pure functions with unit tests.
- The game at the root of the site, the bench under `/bench/`.
- A browser smoke test in CI that loads the game and completes one ritual.

## 0.3 — The room

- A small 3D room in Three.js, seen from above at an angle: floor, two walls cut away like a dollhouse, the window, the counter with the heater and the tap, the shelf with the caddy and the bowls, the low table with the cushion, the figurines on the windowsill, and a walker.
- A tap on the floor walks there around the furniture. A tap on a piece of furniture walks to it and shows it close up. A tap elsewhere returns to the room.
- Two hands: pick up and put down, one item per hand, known to the simulation, so the rules can say what is out of reach.
- The table close-up hosts the tactile ritual from 0.2.
- Flat colours in the style of Big Walk, with one place to swap in generated textures.

## 0.4 — Feel

- The five phases of every grab: lift, lag by weight class, resistance, contact bounce, settle.
- Sockets and allowed areas, spring-back from forbidden places.
- Lids as physical objects.
- The stream: particles, bending with the finger, splash, final drops after release.
- Steam particles driven by temperature. The liquid level rising and rippling.
- The hot vessel: "oh, hot", the hand pulls back.
- Camera micro-zoom towards the object being held.

## 0.5 — Sound

- Audio unlocked on the first touch, as iOS Safari requires.
- Sound families by material: water (volume follows flow), ceramic, the kettle's hum rising with temperature, dry leaves, cloth, rain.
- The last drops as their own sound. No two consecutive plays exactly alike.
- Haptics as a progressive enhancement on devices that implement the Vibration API. None on iPhone.

## 0.6 — The whole ritual on screen

- The first sip scene: raise, pause, sip, reaction, a small result card.
- Offering scene: the figurine's glow, pose and resonant sound.
- The gods' plaque in the corner and the deadpan remarks.
- Cleanup with the cloth, then "The tea is ready": Stay, Leave. Stay fades the UI completely.
- Text in the languages agreed for the game (open question).

## 0.7 — Atmosphere

- The window as its own layer. Sunset, dawn and night with light that changes over two to five seconds.
- Rain on the glass and its ambient loop.
- Rare window events with a cooldown, from a seeded random source so tests stay deterministic.

## 0.8 — The cat

- States: sleeping, awake, moving, settling, being petted. Two spots.
- Moves by walking, never by teleporting: look, walk, turn, settle.
- Petting without a reward loop. Keeps a safe distance from hot tea. Occasionally nudges a bowl.
- Habits by time of day and weather.

## 0.9 — Memory

- The room persists between sessions on the device: object positions, the gods, figurine satisfaction, the cat's habits.
- A ritual history and the first world rules from world-memory.md.
- Installable to the home screen, playable offline.

## 0.10 — Polish

- The art pass: the illustrated diorama, three teas' liquor colours, three bowls, the optional thermometer as an object.
- Performance on older iPhones, safe areas, reduced motion, a landscape hint.
- A balance pass from playtests.

## 1.0 — MVP

- Everything above stable on current iOS Safari and on Android Chrome, playtested, with the GDD's success criterion met by people who did not build it.

## After 1.0

Guests with memory. The Warm, Rainy and Veranda rooms. A flame heater with a continuous control. The dog. More window scenes and weathers. More figurines and teas. A second infusion. More world rules and unanswered questions.
