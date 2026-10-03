# Roadmap

The next tasks, in order, up to 1.0. Each ends with something that opens on an iPhone from GitHub Pages, with an integration test for every rule it adds.

1.0 is the MVP: one room, one window, three times of day, rain, a cat, one kettle, an electric heater, a thermos, a caddy and spoon, ten tea bowls in their own looks, three teas, a cloth and two figurines, with heating, temperature, pouring, brewing, bitterness, the first sip, and the gods' plaque.

## Tests

1. The slowest tests are measured, and the user decides what to make faster.

## Feel

1. Lids move as physical objects.
2. The stream is drawn as particles, bends with the finger, splashes, and lets its last drops fall after release.
3. A hot vessel makes the player say "oh, hot" and pull the hand back.

## Sound

1. Sounds by material: water whose volume follows the flow, ceramic, the kettle's hum rising with its temperature, dry leaves, rain.
2. The last drops of a pour have their own sound, and no two plays of a sound are exactly alike.
3. Haptics on devices with the Vibration API, and none on iPhone.

## The whole ritual on screen

1. The figurines take offerings in the room, and an offering shows the figurine's glow and pose, with a resonant sound.
2. The gods' plaque shows their mood in the corner, with deadpan barks.
3. The game's text ships in the agreed languages.
   - Which languages does the text ship in? The user answers.

## Atmosphere

1. The window is its own layer. The time of day changes during play, with light that changes over two to five seconds.
2. Rain runs on the glass, with its ambient loop.
3. Rare window events come with a cooldown, from a seeded random source.

## The cat

1. The cat sleeps, wakes, moves, settles and is petted, at two spots.
2. It walks, never teleports: it looks, walks, turns and settles.
3. Petting gives no reward. The cat keeps a safe distance from hot tea and now and then nudges a bowl.
   - The rule of whether an item fits moves into the game logic, with the geometry of the surfaces, so that the cat can nudge a bowl.
4. Its habits follow the time of day and the weather.

## Memory

1. The world keeps a history of rituals and follows its first rules from "How the world remembers" in `docs/world-bible.md`.
2. The game installs to the home screen and plays offline.

## Polish

1. The art pass makes the room an illustrated diorama.
   - Do the kettle, the caddy and the figurines get more detailed models? The user answers.
   - Where does the modelled sunflower stand in the garden? The user answers.
2. The game runs well on older iPhones, keeps to the safe areas, follows reduced motion and hints at portrait in landscape.
3. A balance pass follows the playtests.

## 1.0

1. Everything above is stable on current iOS Safari and Android Chrome, and people who did not build the game end a visit as "The feeling" in `docs/world-bible.md` says.
   - Does a separate teapot join the MVP, or does the kettle stay the brewing vessel? The user answers.

## After 1.0

Guests with memory. The Warm, Rainy and Veranda rooms. A flame heater with a continuous control. The dog. More window scenes and weathers. More figurines and teas. A second infusion. More world rules and unanswered questions.
