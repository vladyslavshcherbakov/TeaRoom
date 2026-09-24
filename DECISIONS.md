# Decisions

## Decisions and their reasons

**TypeScript for a mobile Safari game.** The target is the mobile browser. Rejected: a native iOS app, because it would not run in the browser. Rejected: Phaser, which carried the 2D table in 0.2 and was removed when the game became a walkable 3D room.

**The simulation is a functional core with an imperative shell.** Commands and time go in, a new state and events come out, and nothing in `Shared/Simulation` knows about Three.js, the DOM or the clock. This keeps every rule testable without a browser, and lets AI-assisted changes to the presentation leave the rules alone. Rejected: game objects that hold their own state inside the renderer, because rules then live in meshes and cannot be tested headless.

**The architecture skills' MVVM is mapped, not copied.** The scene plays the view and the view model at once: it forwards taps as commands and draws the state it is given. The presenter from those skills stays as a pure mapping from state to presentation cues (steam, sound level, colour), arriving in 0.2. Rejected: view models per object, because a game loop that redraws every frame has no binding problem for them to solve.

**Player decisions are commands, consequences are events.** One command per decision, one event per thing the presentation or the world memory must react to. This gives replays, logs for debugging, and the ritual history the world memory will be built from. Rejected: an event bus where objects call each other, because one action has many consequences and the order would be decided by subscription order.

**Content is data in a `Catalog`.** A new tea, vessel, heater, figurine or room is a definition, not code. Rejected: a class per tea, because every new tea would need new code and a new review of the rules.

**Fixed simulation step of 0.05 s.** Cooling and brewing are not linear in time, so integrating once per frame gives different results at 30 and 60 frames per second. Twenty steps a second is well below what a phone can compute and fine enough for the curves. Rejected: variable steps, because the same ritual would taste different on a slower phone.

**Cooling is applied before heating in a step.** Heating caps at boiling, so cooling after it would keep a working kettle forever just below 100 °C.

**The simulation logs every decision, and the presentation decides where the lines go.** Events say what happened. The log says why: the temperature a judgement was made at, the value a refusal was decided on, what a pour left behind. Handlers collect lines in the draft, so the core stays free of side effects, and `RitualSession` writes them to an injected `RitualLog`. Each line carries the simulated time to the millisecond, and the sink adds the wall-clock time. The bench shows the log on the page, because Safari's console on an iPhone needs a Mac to open. Rejected: logging from the presentation by reading events, because the presentation never sees the values that decided the outcome.

**Broken content is caught before a room opens: loudly in development, quietly for players.** A definition that names a missing heater, vessel, figurine or tea is a developer's mistake no player can fix. `RitualSession.open` checks the whole catalog first. A development build throws with every problem listed, so the mistake cannot be missed. A player's build logs each problem at error level and returns `unavailable`, and the presentation shows a quiet screen instead of crashing mid-ritual. Rejected: throwing from `definitionIn` in a player's build, because the game would stop at the first lookup with nothing on screen.

**Taps become decisions in a class that does not know the renderer.** `RoomNavigator` receives what a tap hit and decides what happens. The scene only raycasts and draws. Every tap rule is then testable in Node. Rejected: logic inside input handlers, because it could only be checked in a browser.

**Items are put down by choosing a hand, then tapping anywhere on a surface.** People do not think in grids, so the item lands exactly where the finger touched, and `Placement.ts` refuses only what cannot be: over the edge, on the heater, on another item. A refused spot keeps the item in hand and the hand chosen, so the next tap can try again. Rejected: snapping to sockets, because it decides for the player where a bowl belongs.

**Pouring is aimed with two fingers.** The player chooses the hand with the vessel and taps the target. Then one finger moves the vessel over the table and the other holds a button that tilts it, so the pour is both a place and a gesture, and missing the bowl wets the table. The finger moves the vessel by its change of position, never to where it touches, so it does not hide what it moves. The tilt can go past the splashing flow, because holding too long is a small, visible mistake. `AimedPour.ts` holds this state apart from `RoomPlay`, and knows no Three.js. Rejected: holding a finger on the target, the first version, because the pour could not miss and so had nothing to learn.

**The kettle shows its water in a glass gauge on its side, and inside when its lid is open.** The kettle is clay and opaque. A gauge window, as on many kettles, shows the level from any side without opening the lid. The body has an opening under the lid, so an open kettle shows whether it is empty, how high the water stands and its colour. The water's surface is drawn as a disc as wide as the round body at that height.

**The spoon and the cloth are carried in the hands like any item.** Taking one fills a hand, and the player sees it in a corner of the close-up, so the hands tell the truth about what is held. With the spoon's hand chosen, a tap on the open caddy scoops and a tap on a vessel tips. With the cloth's hand chosen, a stroke on the tea table wipes it. The simulation checks that the tool is in a hand, and that wiping happens at the ritual place, where the wet table is. Rejected: the first version, where the tools stayed on the table and a pale circle marked the one in use, because a tool held by nothing hid what the hands were doing.

**In a close-up, what the keeper holds is drawn in the bottom corners of the view, and the items are the hands.** The player sees what they carry, so no label names it. A tap on an item chooses its hand, and an invisible area around it makes the tap forgiving. The held items are drawn in a second pass over the room, after its depth is cleared, so furniture near the camera never cuts through them. The scene therefore clears to a colour instead of drawing a background, since a background clears the screen on every pass. Rejected: buttons with the item's name, because the words stood in for what the room can show.

**Tasting is a Sip button.** In a close-up the keeper is hidden, so there is no face to lift the bowl to. The button appears only while the chosen hand holds a tea bowl with tea in it. The first sip scene of 0.6 replaces it.

**The kettle's water comes from the tap at the counter, and the kettle starts empty.** Filling the kettle is the first step of a ritual. The keeper holds the kettle under the tap, so the vessel must be in a hand at the tap's place. Water that overflows runs into the sink and does not wet the table, because the table is where the ritual's spills count.

**An item taken by a tap is chosen at once.** Taking something is nearly always followed by using it or putting it back, so the next tap already acts with it. A chosen vessel aims a pour only when it holds something, because otherwise a tap on the next bowl would aim a pour from an empty bowl instead of taking it.

**The sink is the tap's touch area.** The tap itself is thin, and a tap beside it landed on the counter top, where it put the chosen kettle down. The sink under the tap catches those taps instead, and while the water runs the vessel under the tap belongs to the tap too, so the next tap closes it.

**The heater's switch is its own target on the counter's front.** With the kettle on the plate, a tap on the plate lands on the kettle and lifts it. A separate switch keeps "take the kettle" and "switch the heater" apart, and gives the switch a touch target of its own.

**The room begins the ritual with the first tea of the catalog.** Carrying needs the ritual phase, and the room has no tea choice yet. The room logs which tea it chose. It stays so until the room offers a choice of tea.

**UI tests run on WebKit and read the ritual log.** WebKit is the engine of iOS Safari, the game's main target. The tests read the `[ritual]` lines from the browser console instead of calling into the game, so the product carries no test hooks. `@playwright/test` is pinned to the version whose Chromium is preinstalled in the agent environment, so the same tests run there and in CI.

**The room is real 3D in Three.js, seen from above at an angle, and controlled by taps.** A 3D room lets the camera change later, to first person or over the shoulder, by changing only the camera module and the tap rules. Seen from above, the whole small room fits a portrait phone, and one thumb is enough: a tap on the floor walks there, a tap on furniture walks to it and shows it close up. Rejected: isometric 2D sprites, because another camera would mean redrawing every picture. Rejected: first person as the start, because it needs looking around with a second gesture and a model of the hands.

**Pinching zooms the camera, the room's zoom is kept, and each close-up starts unzoomed.** The zoom only scales the camera's distance to what it looks at, so the view keeps its angle and its subject. The room's zoom is the player's choice, so it stays while the keeper walks and comes back after a close-up, and the camera flies into a close-up from wherever the player left it. A close-up starts at its usual distance because it is framed to show the whole piece of furniture. `Camera/CameraZoom.ts` keeps the two zooms apart. Rejected: resetting the zoom on every change of view, the first version, because the camera jumped out and back in on each walk. Safari's own page zoom is turned off so the pinch reaches the game. Rejected: pinching while a pour is aimed, because the first finger already moves the vessel.

**Surfaces are flat colours now and textures later, through one class.** `RoomMaterials` maps each surface name to a material. Generated textures replace a colour there without touching the models.

**Room logic that does not need Three.js does not import it.** Paths, walking, camera poses and tap decisions are plain TypeScript, so tests run in Node without a browser.

**A refused command is an event, not an exception.** A player trying to pour from a closed thermos is part of play, and the presentation answers it materially with a spring-back. Rejected: throwing, because a gesture would need a try block and a missed catch would stop the game.

**The gods judge the water when it meets the leaves, and the first drinkable sip, once per ritual.** Judging each heater switch-off would reward switching the heater on and off. The water that meets the leaves is the water the tea is made with. A sip that is too hot to drink is not judged, because the player is supposed to wait.

**No single moment costs the gods more than 3 points.** The GDD requires that mistakes lower the mood slightly and never reset it.

**Tests run on Node's built-in runner, with TypeScript run directly by Node.** The core needs no packages at all, and Node 22.18 strips types on its own. The only development packages are TypeScript for type-checking and `@types/node`. Rejected: Vitest, because it adds a toolchain for what `node --test` already does. It can come in with Vite in 0.2 if the presentation tests need it.

**The ritual bench stays next to the game.** It drives the simulation with plain controls and shows the log on the page, which is the quickest way to check a rule on a phone without playing through the scene.

**GitHub Actions tests every push and deploys to Pages from the default branch.** The workflow reads the default branch from the event instead of naming `main`, so it keeps working if the default branch is renamed. Action versions are the Node 24 majors (`checkout@v5`, `setup-node@v5`, `upload-pages-artifact@v5`, `deploy-pages@v5`), because GitHub is removing the Node 20 runtime from its runners in September 2026.

**Three.js and Vite are pinned to exact versions, and CI installs from the lockfile.** A game's feel depends on the renderer's timing and input handling, so an update is a deliberate change with its own commit, not a side effect of a fresh install.

**Both pages are built by Vite.** The room at the root of the site and the bench under `/bench/` are two Vite builds from `build.sh`, with no config file: the command line says everything. `import.meta.env.DEV` tells the game whether it is a development build. Rejected: building the bench with the TypeScript compiler alone, because two build tools for two pages would be two pipelines to keep working.

**No haptics on iPhone.** iOS Safari does not implement the Vibration API, and the checkbox-switch workaround is reported to stop working from iOS 26.5. Haptics stay a progressive enhancement for browsers that have the API.
