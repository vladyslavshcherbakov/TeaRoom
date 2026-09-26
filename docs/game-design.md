# Tea Room — game design

Tea Room is a small ritual game for the mobile browser, held in portrait. The player enters a tiny tea room, picks the mood, heats water, brews tea, pours it into bowls, offers some to tea figurines, tastes it, tidies up and stays for a while. A session lasts three to ten minutes and needs no progress.

The main feeling is calm and the pleasure of touching things. The second feeling is a dry, gentle absurdity.

Success means the player finishes with "I spent five minutes doing something with a kettle", not "I scored 87 points on a mini-game". The ideal session: the player oversteeps the tea by accident, tastes it, smiles, pours some for a figurine, the cat falls asleep by their feet, dusk falls outside, and the player leaves the phone on the table and watches the room for another minute.

## The loop

1. Enter the room and choose the time of day and the weather.
2. Choose a tea.
3. Put the kettle on the heater and switch it on.
4. Catch the moment to switch it off.
5. Optionally pour the water into the thermos to keep it hot for later.
6. Open the caddy, scoop the leaves and tip them into the kettle.
7. Let the tea steep. Nothing has to be pressed while it steeps.
8. Pour the tea into bowls. Pouring the tea out is what stops that brew.
9. Offer a bowl to a tea figurine.
10. Taste. Understand the result from the reaction, not from a score.
11. Tidy up: close the lids, wipe the table.
12. Stay, invite a guest (after 1.0) or leave.

The ritual always completes, even when every step went wrong. There is one game over, and it is a joke: a sip straight from a caddy of brewed tea kills the keeper, the screen says YOU DIED, and the game starts over. There is no other failure screen.

## Principles

### Every verb is tactile

An action is never "press a button, the state changes". It is: the finger touches an object, the object answers physically, a sound follows, a short delay, then the new state. Each interactive object goes through five phases: grab (it lifts slightly and casts a softer shadow), move (it follows the finger with a small lag), resistance (heavy things lag more: the kettle is heavier than a bowl), contact (a small bounce and a "tock" when put down) and settle (after 150–300 ms the world is still again).

The 300–1000 ms after an action are part of the action: the stream thins, the last drops fall, the ceramic clinks, the steam lingers a second longer. Only then does the next step begin.

Gestures: tap to take, open, switch or check. Drag to carry, pour or tip. Hold to heat or pour slowly. Swipe to open a curtain, lift a lid or wipe. A slow drag is the careful version of any of these.

### Mistakes are material, never interface

There is no "WRONG", no "FAIL", no "-50 POINTS". Water that is too hot shows as heavy steam and a louder kettle. A missed pour is a wet table that wants the cloth. A long steep is a dark liquor and a grimace on the first sip. When text appears, it is small and deadpan: "The gods pretend not to notice." "We will tell no one."

### The world is felt before it is measured

Temperature, strength, bitterness, the gods' satisfaction and cleanliness are real variables, but the player first sees their consequences. Without the thermometer the player reads water by steam, sound and the look of the surface, and slowly learns to recognise the right moment without numbers.

### Humour comes from taking the ritual too seriously

"The temperature is perfect. The gods are content." "Two degrees too hot. The gods pretend not to notice." "The tea is oversteeped. Very oversteeped." "The cat sat on the towel. The towel now belongs to the cat." The joke is never a meme and never loud.

### The hidden 70%

The player sees traces of systems, not the systems. Every noticeable detail may have a hidden cause the player never learns directly: a figurine that is slightly turned one morning, a light in the neighbour's window, the cat that started sleeping next to one particular figurine. The world bible holds the cause. The game does not explain it.

Ninety percent of things stay ordinary: a kettle is a kettle, rain is rain. A rare oddity carries weight only against that ordinary background. A mystery is something to notice, never a quest, a marker or a log entry.

The rules for designing these causes are in [world-memory.md](world-memory.md).

### Content is data, and the room remembers

A new tea, bowl, room, figurine or guest is a definition, not new code. Instead of many rooms, one room that becomes familiar. Instead of many characters, a few that remember.

## Presentation

UI is hidden almost all the time. There is no permanent HUD. Achievements are hidden at first: the player earns them without knowing, and sees them only after turning them on in the settings. State is shown on the objects themselves: the thermometer is a real object on the table, and the gods' satisfaction is a small plaque in a corner of the room.

The room view looks down on a small diorama. It may drift slightly closer to the kettle while it is held, or pan a little during the ritual. In first person the player walks the room and turns the view freely.

The style is a warm illustrated diorama, neither realistic nor cartoonish. Objects are slightly oversized so steam, streams and levels read well. Every object should look as if it wants to be touched.

Sound carries half of the tactility, in this order of priority: water, ceramic, kettle, cloth, surroundings. Sounds are short, soft and rarely repeat exactly.

Haptics are rare: one light pulse when a bowl is put down, a very short pulse when a lid closes, two faint pulses when the water reaches the tea's target, and nothing while pouring. iOS Safari does not implement the Web Vibration API, so on iPhone the game has no haptics and relies on sound and animation.

## Room, window and time

The player picks a finished room composition and may adjust it slightly. Rooms are never "apartments with building". Planned rooms: Quiet (minimal, big window, low table, the first-launch room), Warm (wood, lamp, shelves), Rainy (the window and the rain are the main picture) and Summer veranda (open air, wind, nature sounds).

The window is its own layer: forest, garden, city, mountains, snow or sea, with a time of day (dawn, morning, day, sunset, dusk, night) and weather (clear, cloudy, rain, heavy rain, fog, snow, light wind). Time changes light colour, window brightness, shadows, the amount of visible steam, ambient sound, the cat's behaviour and the music. A change of time fades over two to five seconds, never as a cut.

Rare window events (a passer-by, a bird, a cat outside, a swaying branch, a falling leaf, a street lamp coming on, rain starting) happen with a cooldown. An event must be pleasant even when the player misses it.

## Pets

A pet is a behavioural layer of the room, not a mini-game or a reward. The cat sleeps by the wall or near the player, lies by the feet, sits at the window, comes to the table or walks away. It sometimes nudges a perfectly placed bowl, with no penalty, and always stops at a safe distance from hot tea. The dog is calmer: it sleeps, watches, sits, comes over and lies down again. The player can pet the animal, call it, or move its spot within allowed places (by the feet, near the table, at the window, by the wall). The animal walks to the new spot, turns, and settles. A tap is never a reward loop.

## Figurines and the gods

Small figurines stand in the room: a ceramic beast, a monk, a toad, a dragon. Each has a hidden satisfaction and hidden preferences: favourite teas, a preferred strength. The player never reads these. They notice that the dragon seems to like oolong.

"The gods are content" is a small, half-joking plaque that grows for well-made tea, the right temperature, careful pouring, offerings, a tidy table and an unhurried ritual. It never drops sharply. A mistake costs at most a few points and a deadpan line.

## After the ritual

A very small prompt appears — "The tea is ready." — with three actions: Stay, Invite a guest, Leave. Stay means doing nothing: the rain continues, the curtain moves, the tea cools, the cat sleeps, the light changes. After a while the UI fades completely. There is no reward for staying.

## Guests (after 1.0)

A guest is a small, finished character, not multiplayer. The player picks the guest, the tea, the bowl and the seat. The guest sits, the ritual happens, and the guest says one dry line: "A good evening." "I would have another." "Why is the figurine looking at me?" Guests remember: a guest who once got a terribly bitter tea said "An interesting taste", and a week later the first thing they look at is the kettle.

## Session randomness

Each session may hold one to three small events: the cat crossing between bowls, a bird landing on the sill, the rain stopping, a leaf falling on the table, a street lamp coming on, the dog twitching a paw in its sleep, the kettle ticking as it cools. They never get in the way.
