# Decisions

## Plan

The plan is in `docs/roadmap.md`.

## Decisions

### Project

**TypeScript for a mobile Safari game.** The target is the mobile browser. Rejected: a native iOS app, because it would not run in the browser. Rejected: Phaser, which carried the 2D table in 0.2 and was removed when the game became a walkable 3D room.

**The room is real 3D in Three.js, seen from above at an angle, and controlled by taps.** A 3D room lets the camera change later, to first person or over the shoulder, by changing only the camera module and the tap rules. Seen from above, the whole small room fits a portrait phone, and one thumb is enough: a tap on the floor walks there, a tap on furniture walks to it and shows it close up. Rejected: isometric 2D sprites, because another camera would mean redrawing every picture. Rejected: first person as the start, because it needs looking around with a second gesture and a model of the hands.

**Three.js and Vite are pinned to exact versions, and CI installs from the lockfile.** A game's feel depends on the renderer's timing and input handling, so an update is a deliberate change with its own commit, not a side effect of a fresh install.

**No haptics on iPhone.** iOS Safari does not implement the Vibration API, and the checkbox-switch workaround is reported to stop working from iOS 26.5. Haptics stay a progressive enhancement for browsers that have the API.

### Shared/Simulation/

**The simulation is a functional core with an imperative shell.** Commands and time go in, a new state and events come out, and nothing in `Shared/Simulation` knows about Three.js, the DOM or the clock. This keeps every rule testable without a browser, and lets AI-assisted changes to the presentation leave the rules alone. Rejected: game objects that hold their own state inside the renderer, because rules then live in meshes and cannot be tested headless.

**Player decisions are commands, consequences are events.** One command per decision, one event per thing the presentation or the world memory must react to. This gives replays, logs for debugging, and the ritual history the world memory will be built from. Rejected: an event bus where objects call each other, because one action has many consequences and the order would be decided by subscription order.

**Fixed simulation step of 0.05 s.** Cooling and brewing are not linear in time, so integrating once per frame gives different results at 30 and 60 frames per second. Twenty steps a second is well below what a phone can compute and fine enough for the curves. Rejected: variable steps, because the same ritual would taste different on a slower phone.

**Cooling is applied before heating in a step.** Heating caps at boiling, so cooling after it would keep a working kettle forever just below 100 °C.

**The simulation logs every decision, and the presentation decides where the lines go.** Events say what happened. The log says why: the temperature a judgement was made at, the value a refusal was decided on, what a pour left behind. Handlers collect lines in the draft, so the core stays free of side effects, and `RitualSession` writes them to an injected `RitualLog`. Each line carries the simulated time to the millisecond, and the sink adds the wall-clock time. The bench shows the log on the page, because Safari's console on an iPhone needs a Mac to open. Rejected: logging from the presentation by reading events, because the presentation never sees the values that decided the outcome.

**Broken content is caught before a room opens: loudly in development, quietly for players.** A definition that names a missing heater, vessel, figurine or tea is a developer's mistake no player can fix. `RitualSession.open` checks the whole catalog first. A development build throws with every problem listed, so the mistake cannot be missed. A player's build logs each problem at error level and returns `unavailable`, and the presentation shows a quiet screen instead of crashing mid-ritual. Rejected: throwing from `definitionIn` in a player's build, because the game would stop at the first lookup with nothing on screen.

**A refused command is an event, not an exception.** A player trying to pour from a closed thermos is part of play, and the presentation answers it materially with a spring-back. Rejected: throwing, because a gesture would need a try block and a missed catch would stop the game.

**The gods judge the water when it meets the leaves, and the first drinkable sip, once per ritual.** Judging each heater switch-off would reward switching the heater on and off. The water that meets the leaves is the water the tea is made with. A sip that is too hot to drink is not judged, because the player is supposed to wait.

**No single moment costs the gods more than 3 points.** The GDD requires that mistakes lower the mood slightly and never reset it.

**Boiling water boils away, and only on a working heater.** A kettle forgotten on the heater loses its water slowly, so leaving it there has a visible cost that grows with time: half a minute of boiling takes a ninth of a full kettle. The rate belongs to the heater, as the heat does. A vessel leaves the heater only by being picked up, which also judges the water, so there is one way off the plate.

**Taking an item closes its lid.** A lid is not an item of its own, so it cannot stay behind, and leaving it open while carried would float it in the air. Closing it changes the rules visibly: a closed kettle keeps its heat, and a closed thermos cannot pour until its lid is tapped open again, which works on a held item too. An open lid lies on the surface beside its item, and on a held item it sits ajar on the rim. Lifting the kettle out of the sink counts as taking it, so its lid closes too.

**The kettle's water comes from the tap at the counter, and the kettle starts empty.** Filling the kettle is the first step of a ritual. The kettle stands in the sink under the tap, and the tap runs until the keeper turns it off, also while the keeper is away. Holding it under the tap tied the keeper to the counter, and the kettle walked away with them. Water that overflows runs down the drain and does not wet the table, because the table is where the ritual's spills count. Rejected: filling a kettle held in a hand as well, because two ways to do one thing made the tap's taps ambiguous.

### Shared/Content/

**Content is data in a `Catalog`.** A new tea, vessel, heater, figurine or room is a definition, not code. Rejected: a class per tea, because every new tea would need new code and a new review of the rules.

### Apps/Game/

**The architecture skills' MVVM is mapped, not copied.** The scene plays the view and the view model at once: it forwards taps as commands and draws the state it is given. The presenter from those skills is `Table/TablePresenter.ts`, a pure mapping from state to presentation cues: fill, colour, steam and the water's motion. Rejected: view models per object, because a game loop that redraws every frame has no binding problem for them to solve.

**The game names the gods only at an offering.** Brewing, spilling and tasting are plain acts, and a remark from the gods after each one gave away the room's mystery at once. The simulation still keeps the gods' mood and emits their remarks, and the room shows a remark only together with a figurine's response to an offering. The bench shows every remark, because it is a debug page.

### Apps/Game/Texts/

**Every text the player reads is one key and one value in one file.** `Apps/Game/Texts/EnglishTexts.ts` lists them all, so the whole of the game's wording can be reviewed in one place, and a second language is a second file with the same keys. The keys are typed, so a missing text for a remark or a verdict fails the type-check. Placeholders such as `{figurine}` are filled by `textWith`.

### Apps/Game/Room/

**Taps become decisions in classes that do not know the renderer.** `RoomGestures` tells a tap from a stroke, a pinch or the finger that aims a pour. `RoomPlay` decides what a tap on what it hit means, and `RoomNavigator` walks. The scene only forwards pointer events, raycasts and draws. Every tap rule is then testable in Node. Rejected: logic inside input handlers, because it could only be checked in a browser.

**Room logic that does not need Three.js does not import it.** Paths, walking, camera poses and tap decisions are plain TypeScript, so tests run in Node without a browser.

**Items are put down by choosing a hand, then tapping anywhere on a surface.** People do not think in grids, so the item lands exactly where the finger touched, and `Placement.ts` refuses only what cannot be: over the edge, on the heater, on another item. A refused spot keeps the item in hand and the hand chosen, so the next tap can try again. Rejected: snapping to sockets, because it decides for the player where a bowl belongs.

**Pouring is aimed with two fingers.** The player chooses the hand with the vessel and taps the target. Then one finger moves the vessel over the table and the other holds a button that tilts it, and a tap without dragging ends the aiming: on a free spot of a surface it puts the vessel down there, as a tap with a chosen hand does, and anywhere else it returns the vessel to its hand. The pour is both a place and a gesture, so missing the bowl wets the table. The first aiming on a device shows a short note with the gesture, because the mode starts from an ordinary tap and was taken for a bug. The note is remembered in the browser's storage, which is a convenience: if the storage is gone, the note shows once more. The vessel starts to the left of its target on the screen, with its spout turned to it, so it is never hidden behind the furniture of the close-up. The finger moves the vessel by its change of position, never to where it touches, so it does not hide what it moves. The held tilt stops just below the splashing flow: pouring a bowl takes several seconds of holding, and a splash on every normal pour read as a leaking bowl. The table gets wet when the stream misses the opening or the bowl overflows. `AimedPour.ts` holds this state apart from `RoomPlay`, and knows no Three.js. Rejected: holding a finger on the target, the first version, because the pour could not miss and so had nothing to learn.

**The spoon and the cloth are carried in the hands like any item.** Taking one fills a hand, and the player sees it in a corner of the close-up, so the hands tell the truth about what is held. With the spoon's hand chosen, a tap on the open caddy scoops and a tap on a vessel tips. With the cloth's hand chosen, a stroke on a surface wipes it as the finger moves, and the cloth follows the finger on a render layer that taps pass through, so it never catches the stroke's own taps. A tap puts the cloth down like any item, and in the puddle it soaks the puddle up while it lies there. The room knows where the puddle is, so it tells the simulation that the cloth landed in it, as it reports the share of a stream that lands in a bowl, and the simulation moves the water from the puddle into the cloth step by step. The simulation checks that the tool is in a hand, and that wiping happens where the keeper stands, on the puddle there. Each place keeps its own puddle, spread around the vessel the stream missed, because one wet table for the whole room drew a spill at the counter on the tea table. Rejected: the first version, where the tools stayed on the table and a pale circle marked the one in use, because a tool held by nothing hid what the hands were doing.

**In a close-up, what the keeper holds is drawn in the bottom corners of the view, and the items are the hands.** The player sees what they carry, so no label names it. A tap on an item chooses its hand, and an invisible area around it makes the tap forgiving. The held items are drawn in a second pass over the room, after its depth is cleared, so furniture near the camera never cuts through them. The scene therefore clears to a colour instead of drawing a background, since a background clears the screen on every pass. Rejected: buttons with the item's name, because the words stood in for what the room can show.

**Tasting is a Sip button, answered by a feeling.** In a close-up the keeper is hidden, so there is no face to lift the bowl to. The button appears only while the chosen hand holds a tea bowl with something in it. The keeper answers each sip with one line in their own words, chosen from the verdict, because a card of temperature, strength and bitterness read like a debug report. The taste judgement tells plain water apart as a strength of `none`, so a sip of water gets its own line. Every feeling, and a spill, has four phrases, and a seed kept in the browser picks one per feeling, so a player always hears the same keeper and two players hear different ones. The seed is a convenience: without storage it lasts one visit. The simulation never sees it. The first sip scene of 0.6 replaces the button.

**A warm glow marks the chosen item.** Raising the chosen item a little was not enough to tell "held" from "held and ready to use", and a tap then did something the player did not expect. A soft glow pulses behind the chosen item in its corner. An empty spoon has nothing to tip, so a tap on a vessel takes it, as an empty vessel does not aim a pour.

**An item taken by a tap is chosen at once.** Taking something is nearly always followed by using it or putting it back, so the next tap already acts with it. A chosen vessel aims a pour only when it holds something, because otherwise a tap on the next bowl would aim a pour from an empty bowl instead of taking it.

**The sink is the tap's touch area.** The tap itself is thin, and a tap beside it landed on the counter top, where it put the chosen kettle down. The sink under the tap catches those taps instead. With a hand chosen and the sink empty, the tap puts the item in the sink, and otherwise it turns the water on or off. The item in the sink is its own target, and so is its lid.

**A kettle with a closed lid goes into the sink, and the water runs over the lid.** The player opens the lid in the sink, as at a real sink, and the water goes in from that moment. Refusing the closed kettle made the tap look broken, and opening the lid by itself took the decision from the player. Rejected: holding the water back until the lid opens, because a tap that is open and dry is not what a sink does.

**The heater's switch is its own target on the counter's front.** With the kettle on the plate, a tap on the plate lands on the kettle and lifts it. A separate switch keeps "take the kettle" and "switch the heater" apart, and gives the switch a touch target of its own.

**The room begins the ritual with the first tea of the catalog.** Carrying needs the ritual phase, and the room has no tea choice yet. The room logs which tea it chose. It stays so until the room offers a choice of tea.

**Pinching zooms the camera, the room's zoom is kept, and each close-up starts unzoomed.** The zoom only scales the camera's distance to what it looks at, so the view keeps its angle and its subject. The room's zoom is the player's choice, so it stays while the keeper walks and comes back after a close-up, and the camera flies into a close-up from wherever the player left it. A close-up starts at its usual distance because it is framed to show the whole piece of furniture. `Camera/CameraZoom.ts` keeps the two zooms apart. Rejected: resetting the zoom on every change of view, the first version, because the camera jumped out and back in on each walk. Safari's own page zoom is turned off so the pinch reaches the game. Rejected: pinching while a pour is aimed, because the first finger already moves the vessel.

### Apps/Game/Room/Views/

**The kettle shows its water in a dark glass gauge on its side, and inside when its lid is open.** The kettle is clay and opaque. A gauge window, as on many kettles, shows the level from any side without opening the lid. The body has an opening under the lid, so an open kettle shows whether it is empty, how high the water stands and its colour. The water's surface is drawn as a disc as wide as the round body at that height.

**Ten tea bowls in ten looks: white, pearl, sky blue crackle, dark blue kintsugi, yellow, green marble, temper colours, fluted glass, hobnail glass with a gilded rim, and Yixing clay.** The player chooses a bowl by its look. Each bowl's glaze, relief, rim and painting are one entry in `Views/Carried/CarriedModel.ts`. The glazes are presentation, looked up by the bowl's id. The white bowl carries a painted koi, drawn on a canvas in `Views/KoiPainting.ts` with a real carp's proportions, the pearl bowl a lotus from `Views/LotusPainting.ts`, and the yellow bowl a heron in reeds from `Views/HeronPainting.ts`, chosen over a stork in flight. The Yixing bowl carries 茶, tea, which is written the same in Chinese and Japanese. It is drawn with the device's CJK font, so it reads as a brush serif on an iPhone. Each painting is laid over its bowl's bottom as a texture. The crackle and the marble are painted on canvases in `Views/CrackleGlaze.ts` and `Views/MarbleGlaze.ts` and wrap the whole bowl, seamless around it. The kintsugi bowl's seams follow one break in `Views/KintsugiGlaze.ts`: cracks run from an impact point near the bottom to the rim, three more cut off smaller shards, and a gold patch fills a lost chip where two cracks meet. Each crack goes through the wall, so it is drawn on the inside and on the outside along the profile in `Views/Carried/BowlProfile.ts`, and crosses the rim. Cracks that wandered at random were rejected, because they ended in the middle of the glaze and a real bowl breaks into whole pieces. The gold is metal and smooth through a second painted map, so it catches the room's reflections. The blue is a glossy ruri glaze with paler runs from the rim, and the foot is bare clay without the clear coat. A plain semi-matte blue was rejected, because it looked flat and lifeless, and so were a satin glaze with clouds and a namako glaze with pale streaks. The temper-coloured bowl and the glass bowl reflect a generated room, which only their two materials use, so the rest of the room keeps its flat, soft light. The glass refracts what stands behind it through three.js transmission. Held in a corner of the close-up it is drawn in the second pass, where transmission sees nothing behind it. There it is drawn as glass seen edge-on: nearly clear where it faces the viewer, dense and darker where its wall turns away, and opaque where it catches a bright reflection, so its shape, its flutes and its bumps stay visible. A glass that was evenly see-through everywhere was rejected, because in the hand it lost its shape and looked like a ghost. Rejected: a modelled koi in relief, because it read as a toy, and a painting is what such a bowl really has.

**The thermos is a Chinese vacuum flask painted with sakura branches over Mount Fuji.** Its parts are in `thermosParts` in `Views/Carried/CarriedModel.ts`, and the painting is drawn on a canvas in `Views/ThermosPainting.ts`, chosen over peonies and over cranes with a pine. The canvas wraps the body once, with the canvas as tall for its width as the body is for its round, so the blossoms stay round, and the branch meets itself at the seam. Fuji stands on a lake, and its reflection is squashed and broken into ripples, so it reads as water and not as a mirror. A pink glow over the horizon was rejected, because the sakura is enough pink. The body's geometry starts half a turn round, so Fuji faces the front of the room and the camera in a close-up. The cup lid's origin sits as far above its rim as an open lid is lifted above the surface in `Views/Carried/ItemContents.ts`, so the open cup stands on the table. Only the neck opens, so the water shows through it, and an overflow runs over the lip, the neck and the shoulder before it reaches the body.

**Water is pale and clear, and moves only while it heats.** Plain water is a pale blue that reads as clear, and tea blends out of it as it steeps in the kettle. Streams grow from the spout and fall away, and an overflow creeps down the kettle's side, because water that appears whole in one frame reads as a drawing. The water shimmers, simmers and boils on a working heater and goes still off it, while its steam follows the temperature and so stays a while.

**Items standing on furniture cast no shadows.** Their shadows on the tea table and the shelves read as clutter at this size.

**Tea leaves are drawn as many small leaves, shaped by the tea.** A flat disc said nothing about what was in the caddy. `LeafPile.ts` heaps hundreds of small pieces with a fixed seed, so the same heap appears every time, and shows fewer of them as the caddy empties. Each tea's look, its leaves and the colour of its liquor, lives in the presentation in `Table/TeaLooks.ts`, because the simulation decides how tea behaves and not how it looks. A test checks that every tea in the catalog has a look.

**The light follows the ritual's time of day, and holds still.** The room opens at a time of day chosen at random from those the room offers, through `chooseAtmosphere`, and `Sky/DaylightCycle.ts` turns that time into the sun's position, its warmth and the lights' strength, so the light is testable in Node, and `Views/RoomLights.ts` applies it. A sun that crossed the sky during play was set aside for now, because its shadow edges crept across the room in visible steps. Sunset was dropped from the room's times of day, because the setting sun stands behind the room's left wall, no sunlight reaches the room, and nothing casts a shadow. No rule depends on the time of day yet. The sun passes behind the window wall, low on the open side at sunrise and sunset and over the wall at noon, so the room is lit all day. The noon light stays warm and a little softer than full sun, because a cold white light at noon made the room look like a hospital ward.

**The garden around the house is scenery.** `GardenLayout.ts` places every plant from a fixed seed, only outside the room's floor, so the garden is the same at every visit and never grows through the room. Only the number of sunflowers, one to four, is chosen at random in `RoomMain.ts` each time the room opens. The plants are scattered 18 metres out from the house, as far as the camera sees, with room around each one, and each flower picks its kind and colour on its own, because beds looked like blocks of colour and the flowers in them stood on top of each other. `Views/Garden.ts` draws each part of a kind of plant as one instanced mesh, the plants cast no shadows and take no taps, so a thousand plants cost little on a phone. The tall sunflowers stand off to the sides and face the camera, so they never hide the room.

**Every surface's look is decided in one class.** `RoomMaterials` maps each surface name to a material. Paintings and generated textures replace a colour there without touching the models.

### Apps/Bench/

**The ritual bench stays next to the game.** It drives the simulation with plain controls and shows the log on the page, which is the quickest way to check a rule on a phone without playing through the scene.

### Tests/

**Tests run on Node's built-in runner, with TypeScript run directly by Node.** The core needs no packages at all, and Node 22.18 strips types on its own. The only development packages are TypeScript for type-checking and `@types/node`. Rejected: Vitest, because it adds a toolchain for what `node --test` already does. Vite builds the pages and does not run the tests.

**UI tests run on WebKit and read the ritual log.** WebKit is the engine of iOS Safari, the game's main target. The tests read the `[ritual]` lines from the browser console instead of calling into the game, so the product carries no test hooks. `@playwright/test` is pinned to the version whose Chromium is preinstalled in the agent environment, so the same tests run there and in CI.

### Scripts/ and .github/

**Both pages are built by Vite.** The room at the root of the site and the bench under `/bench/` are two Vite builds from `Scripts/build.sh`, with no config file: the command line says everything. `import.meta.env.DEV` tells the game whether it is a development build. Rejected: building the bench with the TypeScript compiler alone, because two build tools for two pages would be two pipelines to keep working.

**GitHub Actions tests every push and deploys to Pages from the default branch.** The workflow reads the default branch from the event instead of naming `main`, so it keeps working if the default branch is renamed. Action versions are the Node 24 majors (`checkout@v5`, `setup-node@v5`, `upload-pages-artifact@v5`, `deploy-pages@v5`), because GitHub is removing the Node 20 runtime from its runners in September 2026. A new push to a branch cancels the run still going for the same branch, because only the newest commit is worth testing and deploying, and the older run wastes minutes.

**Every script lives in `Scripts/`, and each configuration file lives beside what it configures.** A newcomer finds every command in one folder. The root `tsconfig.json` checks `Shared` and `Tests` and is the one editors find, `Apps/tsconfig.json` adds the browser's types for the apps, and `Tests/Browser/playwright.config.ts` sits with the browser tests it runs. Rejected: scripts beside their configuration files, because the commands would then be spread over several folders.

## Corrections that stuck

### Project

**Screenshots and scratch output never go into the repository.** Twice, pictures from a browser check landed in the repository's root, because the check ran from there. Checks run from a scratch folder outside the repository, and files are staged by name.

### Apps/Game/Room/

**Nothing is drawn through anything else.** Several times a thing was placed at a fixed offset and passed through its neighbours: open lids lay in the sink's sides, on the heater and in a bowl beside them, the thermos stood through the sink's floor, and an overflow started off the vessel's wall. Every spot a thing is drawn at comes from `Placement.ts` or is checked against the furniture, the heater, the sink and the other items there, and a spot that is taken is refused or moved, never overlapped. An item's footprint in `RoomLayout.ts` is every part that reaches past its body: the kettle's spout is a second circle, which may hang over an edge, the sink or the heater, but never over another item. A change that draws something at a new spot is checked in a close-up next to its neighbours before it is done.

## Open questions

- Which languages the game's text ships in. The user answers it.
- Whether a separate teapot joins the MVP, or the kettle stays the brewing vessel. The user answers it.
- Whether the bench stays published after 1.0. The user answers it.
- Whether the type-check refuses unused locals and parameters (`noUnusedLocals`, `noUnusedParameters`). The user answers it.
- Whether the kettle, the caddy and the figurines get more detailed models. The user answers it.
