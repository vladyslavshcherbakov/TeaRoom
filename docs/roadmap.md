# Roadmap to 1.0

Each version ends with something that can be opened on an iPhone from GitHub Pages and with integration tests for every rule it adds. A version adds one layer. The layers follow the order in which the game becomes playable, then tactile, then alive, then personal.

1.0 is the MVP of the GDD: one room, one window, three times of day, rain, a cat, one kettle, an electric heater, a thermos, a caddy and spoon, six tea bowls in different glazes, three teas, a cloth and two figurines, with heating, temperature, pouring, brewing, bitterness, the first sip, the gods' plaque and the option to simply stay.

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

- The window as its own layer. Dawn, day and sunset with light that changes over two to five seconds.
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

- The art pass: the illustrated diorama, three teas' liquor colours, the six bowls, the optional thermometer as an object.
- Performance on older iPhones, safe areas, reduced motion, a landscape hint.
- A balance pass from playtests.

## 1.0 — MVP

- Everything above stable on current iOS Safari and on Android Chrome, playtested, with the GDD's success criterion met by people who did not build it.

## After 1.0

Guests with memory. The Warm, Rainy and Veranda rooms. A flame heater with a continuous control. The dog. More window scenes and weathers. More figurines and teas. A second infusion. More world rules and unanswered questions.
