# Roadmap to 1.0

Each version ends with something that can be opened on an iPhone from GitHub Pages and with integration tests for every rule it adds. The version in progress lists what has been built since the last version the user closed, and it collects what is built until the user closes it. The review's fixes and the engine come next. Each planned version after them adds one layer, in the order in which the game becomes tactile, then alive, then personal.

1.0 is the MVP of the GDD: one room, one window, three times of day, rain, a cat, one kettle, an electric heater, a thermos, a caddy and spoon, ten tea bowls in their own looks, three teas, a cloth and two figurines, with heating, temperature, pouring, brewing, bitterness, the first sip, the gods' plaque and the option to simply stay.

## 0.4 — The lived-in room (in progress)

- The keeper's hands show in the bottom corners of a close-up. A tap on a held item chooses its hand, the chosen item glows, and what the other hands hold is shaded.
- A taken item is chosen at once. It goes down exactly where the finger touches, if it fits, and turns its front to the side it was put down from.
- A lid opens and closes with a tap. An open lid lies on the surface beside its item, and taking the item closes it.
- A pour is aimed by a tap on the lid or the opening of a vessel, and a tap on its body takes it. The tilt stops just short of a splash, and a note explains the gesture the first time.
- The kettle stands in the sink under the tap. The tap runs until it is turned off, also while the keeper is away, and what runs over goes down the drain.
- The tap rinses a tea bowl, washes the leaves out of a vessel, and washes a cloth clean.
- Water heats, simmers and boils on the heater, and boils away until the kettle is dry. The heater's switch is its own target on the counter's front.
- Steam follows the water's temperature. The water shimmers and boils as it heats, and its level rises in the kettle's gauge and in the open kettle.
- The thermos, the spoon and the cloth can go on the heater. The thermos glows red and is too hot to take, and the spoon and the cloth char and burn. A burning spoon crumbles to ash when it is taken.
- Spilled water makes a puddle on the furniture where it fell, and each place keeps its own. A puddle dries by itself.
- The cloth wipes a puddle as it moves, and soaks one up while it lies in it. It gets wet and stained, dries by itself, and is wrung out as it leaves the sink.
- The spoon scoops leaves from the open caddy and tips them into the kettle or a tea bowl, so tea can be brewed right in a bowl.
- Each caddy holds its own tea. A liquid carries the teas it was made of, and a sip is judged, and the tea coloured, by that blend.
- The Sip button raises the bowl to the lips and sends its steam into the eyes. The keeper says in one line how it feels, in a voice chosen for the visit.
- A sip of strong tea straight from the caddy kills the keeper, and YOU DIED starts the game over.
- The keeper remarks on what the player does, and tells each joke once a visit.
- A middle hand grows after ten taps in a row on one item with both hands full.
- A hold of one second on a held item shows it up close. A finger turns it, and a pinch zooms it.
- A pinch or the mouse wheel zooms the camera, and the room keeps its zoom.
- The tea table is used from the nearer of its long sides.
- In first person the keeper walks with a stick or the keyboard, looks around with a stick or a caught mouse, and sits down at the tea table.
- On a computer, keys choose a hand, sip and tilt a pour.
- Ten tea bowls in ten looks, with glazes, glass, clay and paintings on their bottoms, stand on the shelf in a random order for each new game.
- Each tea has its own leaves and its own liquor colour.
- The thermos is a Chinese vacuum flask painted with sakura over Mount Fuji, and the caddy is a tin with its leaves heaped inside.
- A new game arranges the room at random: the window, the kitchen and the shelf, the tea table, the tools, the cushions and the cloths.
- The room opens at dawn, by day or at sunset, lit by the sun of that time.
- The visit is kept in the browser. On return the world lives through the time away, the house is restocked, and the light moves on to the next time of day.
- A garden of grass, flowers and rose bushes lies around the house, and first person shows a sky with clouds.
- Achievements are hidden until a setting shows them. Then a medal on the wall opens their sheet.
- A gear on the wall opens the settings: the keeper's body colour and face, the camera and its controls, the degrees, the picture's quality and the time played.
- Nerd mode puts a thermostat on the heater and a thermometer on the kettle, with nixie tubes.
- Lamps and red-hot metal glow into the room.
- A book of instructions hangs on the wall.
- A prophecy is written on the beam above the back window.
- Ten taps in a row on a rose bush open a debug menu.
- On a computer a button in the corner puts the page in full screen, and in first person a button leaves it.

## Next: fix what the review found

A review of the whole code found the problems below. They are fixed before the engine work starts. Each package comes in its own commits with its tests, and is pushed before the next one starts. Every item names the files it is about, so it can be found without the review. An item marked "waits for an answer" depends on a question in "Open questions" in DECISIONS.md and is not done before the user answers it.

### 1. Bugs

- A bowl that an update adds joins a continued visit on its own spot of the shelf, which `fitTheVessels` in `FittedSavedState.ts` takes from the room, even where the player has put something. So it overlaps what stands there. What it does then waits for an answer: it moves to a free spot of the shelf, or it stays out of the room.
- The thermos's opening is wider in its layout than its drawn mouth: 5 cm in `layoutByShape`, 3.4 to 4 cm in `ThermosParts.ts`. A stream on its lip counts as filling it. Fix: the layout's opening is the drawn mouth, and a test compares them for every vessel.
- Every tappable thing is hit through an area of at least 44×44 px on the screen, in every camera and zoom. It replaces the forgiving areas measured in metres.
- A save with an unknown time of day or weather still fits (`FittedSavedState.ts`).
- The arrange commands inside `Tests/Content/TeaBalance.integration.test.ts` can still be refused without the test failing.

### 2. Tests that pass when the game breaks, and missing tests

Wrong or weak tests:

- `everyFurnitureSide_inEveryArrangement_isReachedOnFootFromTheEntrance` in `Tests/Game/Room/RoomArrangements.integration.test.ts` taps each piece once, so a walled-in side passes. Fix: start next to each side and reach it.
- `kettle_whenPutDownAtTheSinksEdge_staysInHand` in `Tests/Game/Room/Placement.integration.test.ts` does not check that the reason is `theSinkIsThere`.
- `Tests/Game/Table/TablePresenter.unit.test.ts` sets `heater.itemIdOnTop` while the item lies elsewhere, a state the game cannot reach. Fix: arrange through commands.

Rules with no test:

- The achievements `burntClothWashed`, `thermosGlowing`, `bowlTriedOnTheHeater`, `roseBushTappedTenTimes` and `everythingOnTheShelf`, each with its nearest miss, and the rules of `achievementsOutOfReach`.
- Every store in `Apps/Game/Room/`: what it kept is found again, a blocked storage gives the default and a log line, and corrupt text is handled. The fake storage moves to `Tests/Support/` and is restored after each test.
- In `RoomPlay`: the heater's panel tapped with both hands full, a refused offering that keeps the hand chosen, and the wheel zooming in the room view.

Copies and brittle checks:

- Setups copied between room test files move to `Tests/Support/`: `setTheTeaTable` (four copies), `bringABowlToTheCounterAndTakeTheKettle` (two), `onTopOf` places defined again in several files, `frameSeconds`, and the screen stubs.
- Room tests name places with `onTopOf` or a named place in `TestRoom.ts`, never with raw coordinates.
- A test reads log text only when it is about the log. Today `HeaterInTheRoom`, `Carrying`, `Placement`, `ThermostatInTheRoom` and `RoomNavigator` assert log lines next to the state they already check.
- A test finds player texts through their keys. `RoomTexts.unit.test.ts` copies English lines.
- A room test reads a content value from the catalog under a name, instead of 800, 100, 3, 40 or 120 from the real content.
- A literal the reader cannot check becomes a relation from the layout: the spout's coordinates in `AimedPour.integration.test.ts`, and the liquor colours in `TablePresenter.unit.test.ts`.

Order and names:

- A test that repeats another goes: the zoom test in `CameraPoses.unit.test.ts`, which `RoomGestures` repeats.
- `Puddles.unit.test.ts` is named after the file it tests, `RoomLayout`.
- A name promises only what the body checks: the remark tests of "a different line each time", the aim tests of "from the left of the screen" and "five centimetres from both walls", and a test whose name says "a fifth" while its body checks "under a fifth". A test in `Carrying` that stands after the helpers moves up.

### 3. Rules in the code instead of conventions

These are written so that the engine takes them over unchanged.

- Where an item is lives in one field. Today it is in the item's `location`, in `keeper.hands`, in `heater.itemIdOnTop` and in `sink.itemIdInside` in `SessionState.ts`, and each command keeps them in step by hand. `location` gets the kinds "on the heater" and "in the sink", and only `moveItem` changes it, running what leaving and arriving do through `rulesFor`. It needs a migration and a new `sessionStateVersion`.
- The heater's mode is one value. `isOn`, `thermostat.isOn` and `holdsTheThermostatsTarget` in `SessionState.ts` become one of off, by hand and thermostat, with one function from a mode and an event to the next mode.
- Only `takeLiquidFrom` and `emptyTheVessel` lower what a vessel holds, apart from boiling. Today six places clear `hasOnlyBoiledDownSinceFull` by hand, and the restock in `ReturnAfterAbsence.ts` does not.
- `RoomPlay` asks the session instead of repeating the simulation's rules. `sippableCupId`, `canAimAPourAt`, `openTheLidsThePourNeeds` and `useTheSpoonOn` in `RoomPlay.ts` decide again what the simulation decides. `RitualSession.wouldRefuse(command)` runs the checks on a copy and returns the reason. Numbers that the view and the rules share are written once: `sameBoardWithinMetres` in `RoomPlay.ts` and `sameShelfBoardWithinMetres` in `Placement.ts`, and the 10° tilt in `WaterStreams.ts` and in `Physics/Pouring.ts`.
- `Apps/` reaches the simulation through one public file. Today it imports about twenty of its inner files, `Reach.ts` among them. `Definitions/CatalogProblems.ts` and `State/FittedSavedState.ts` import `Ritual/Reach.ts`, the only imports inside the simulation that point outwards. The ids and the queries of where an item is move to `State/`.
- A kind of tap target is one entry in a table. Today views tag meshes with `TapTargetTag` in `Views/RoomModel.ts`, `tapTargetOf` in `RoomScene.ts` turns a tag into a `RoomTapTarget` with a chain of checks, and `closeUpActionOn`, `furnitureOf` and `describeTarget` in `RoomPlay.ts` end in a `default`. After the change, views tag meshes with `RoomTapTarget` values, `touchAreaOf` takes the tag and marks the area forgiving, and a new kind does not compile until it answers where it stands, what a tap does in a close-up and whether it is a control.
- Every kept value is one `browserStore` with its key, its decoder from unknown to its type, and its default. `AchievementStore.ts`, `SettingsStore.ts`, `DebugSettingsStore.ts`, `PlayTimeStore.ts` and `AimHintStore.ts` repeat the same reading, parsing and logging, and `VisitStore.ts` casts what it read.
- A new setting is one entry in a table of settings. Today it is its type, its default and its reading in `RoomSettings.ts`, a row in `Views/SettingsScreen.ts`, `SettingsChoices` and a listener in `RoomScene.ts`. The same for `DebugSettings.ts` and `Views/DebugMenu.ts`.
- Everything the keeper says is one entry in `remarksInOrder` in `RoomRemarks.ts`, from a ritual event or from a fact only the room knows, with how often a visit it is said. Today the lines about events live in `RoomTexts.ts` with a second counter.
- A type named by two files has its own file, and no two files import each other. `RoomLog` lives in `RoomNavigator.ts` and about twenty files import it from there. `RitualPort` and `RoomTapTarget` live in `RoomPlay.ts`, which imports `AimedPour.ts` and `TapTargetAmong.ts`, which import them back. `ScreenPoint` lives in `RoomGestures.ts`.
- Distances on the floor, clamps and easings come from one file. The same arithmetic is written in about twenty places, and the two tests of "the cloth is over the puddle" in `RoomPlay.ts` already disagree about an empty puddle.

### 4. The carried items

- Every size of a shape is written once, in a file of plain numbers per shape, as `KettleShape.ts` already is for the kettle. `layoutByShape` in `CarriedShapes.ts` and the parts files both read it.
- A vessel is its profile: its outside and inside walls as points of radius and height. Its liquid's surface and body, its overflow's path down the wall, its opening and its footprint come from the profile, instead of being written by hand in `ThermosParts.ts`, `CaddyParts.ts`, `BowlParts.ts` and `KettleParts.ts`.
- `ItemContents.ts` and `CarriedItems.ts` know no shape by name. The kettle's water, gauge and thermometer are displays of the kettle's look, so the thermos's water also moves when it boils. The cloth's colour and pattern and the ash of a crumbled spoon are parts of their looks. `GaugeStrip.ts` is the kettle's.
- `ItemParts.ts` groups its fields, liquid, pouring and displays, and a cloth no longer invents a spout. `rimHeight` stops meaning both the opening's height and the item's height. `CarriedModel.ts` keeps what was built apart from what changes each frame.
- Small copies go into one file of lathe parts: walls, rims, discs and a radial fading texture. The kettle's and the caddy's numbers get names. `HeldInView` and `InspectedInView` are declared in the files of their names.

### 5. The presentation

- `RoomScene.ts` renders, raycasts and forwards input. Its decisions move to classes without Three.js that tests reach in Node: how the look turns in first person, when the keeper walks, sits or stands, which buttons and sticks show, and when the mouse is caught. `RoomScene.ts` and `Tests/Support/TestRoom.ts` assemble the room with the same code, so the paths from a remark to an achievement and from death to the forgotten visit are tested.
- `RoomPlay.ts` is split along its seams: the aim's set-up moves to `AimedPour.ts`, the cloth on a surface and its puddle move beside `WipeStroke.ts`, the counts of taps in a row move to `TapsInARow.ts`, and `RoomPlay` keeps the routing, the choice of a hand and the mode.
- The page's controls come from one kit: a sheet over the room, a button, a toggle row, a row of choices, an icon, a button that acts while held, and a notice that fades. Today `SettingsScreen.ts`, `AchievementsList.ts`, `GuideBook.ts`, `ContinueScreen.ts`, `DebugMenu.ts`, `PourControls.ts`, `FullScreenButton.ts`, `LeaveFirstPersonButton.ts`, `RoomCaption.ts` and `AchievementNotice.ts` each build their own.
- The canvas paintings and textures come from one kit: a canvas that throws in development when it has no context, pixel loops, colour mixing and circles. They use one seeded random source, so `Views/PseudoRandom.ts` or `SeededRandom.ts` goes. A painting's aspect comes from its canvas size. The pictures stay the same pixel for pixel.
- Each view's styles live beside the view, not in the 700 lines of `index.html`.
- `lookBySurface` in `RoomMaterials.ts` asks for a colour only from the kinds of material that use one, so a colour in the table is always the colour drawn. Which bowl hides the toad is passed to the bowls, not carried by the materials.
- `RoomModel.ts` loses its dead code (`furnitureWithinReachOf`, `isWithin`, `reachOfFurnitureMetres`). `faucet()` stops building the sink, and the builders are named by whether they add to the room.
- Names: `showTheSettings` means one thing in `RoomPlay.ts` and another in `RoomScene.ts`. `timesTapped` in `RoomRemarks.ts` counts remarks. The listeners of the controls get one suffix, and their members are named after events. `RoomPlayListener` splits into events and settings. Every store reads with `load`.
- Member order in `Garden.ts`, `HeaterControls.ts`, `SettingsGear.ts`, `WalkerModel.ts`, `LampDisplay.ts` and `DebugMenu.ts`. The settings screen is built from a list of sections, and each coat swatch gets a name for screen readers.
- Code kept only for tests goes: `visibleWidthMetres` in `CameraPoses.ts`, and `quietRoomLayout`, which moves to `Tests/Support/`.

### 6. Folders

- `Views/Paintings/` for the paintings and generated textures, `Views/Controls/` for the page's controls, and subfolders of `Views/Carried/` for the shapes, the streams, burning and the hands. Moves only, each in its own commit.

### 7. Documents

- `README.md`: "Nothing is won or lost" meets the one death, and the test tree does not mirror the code's subfolders.
- `docs/world-memory.md` still says nothing of it is built in 0.1. `docs/game-design.md` is marked as the vision, not the game as it is. Waits for an answer.
- The long paragraphs of `docs/interactions.md` become sections and tables. Entries in DECISIONS.md lose their history and keep the decision, its reason and what was rejected.

## Then: the engine

The reason is in DECISIONS.md, "The code becomes a reusable engine and a tea game on top of it".

### The level of the engine

There are three layers:

1. Three.js draws the picture and finds what a ray hits. It is not a physics library. It has no bodies, no gravity and no collisions.
2. The engine is ours. It is a thin engine for games in the mobile browser, written in TypeScript on top of Three.js. It gives a game what it needs besides drawing: a deterministic core of commands, events and fixed steps, saves, logs and content, and in the browser, input, storage, settings, texts, achievements, the page's controls and helpers for drawing with Three.js.
3. The game gives its rules, its content, its models and its words.

The engine is not a physics library, and it is not an engine like Unity or Godot. It has no editor, no import of assets, no audio, no animation system and no entity-component system. Each of them joins when a game needs it, not before.

### Physics

- The tea game's "physics", in `Shared/Simulation/Physics/`, is its rules of liquids, heat, pouring, brewing, the tap, puddles, the cloth and charring. They stay in the game. They are like the "chemistry engine" of Breath of the Wild: numbers and rules of one game, not a simulation of bodies. The review's fixes of these rules, such as the overflow of a mixture, stay in the game too.
- The geometry that knows no tea moves to the engine: circles that take up room on a surface, from `Placement.ts`, paths on a floor grid, from `Walking/`, and the raycast of tap targets, from `RoomScene.ts`. What stands where is still decided by the game.
- The engine has no bodies and no collisions. A game that needs them adds a physics library for JavaScript as one system of the fixed step, behind a small interface the game owns, so the library can be replaced. A character stays a shape that the game's code moves, and the library only keeps it out of walls.
- A game with thousands of moving objects needs another way to change its state than copying it each step. It is built with that game.

### What is already engine, how it is tied to tea, and its abstract form

Moved as it is:

| Files | What they do |
|---|---|
| `State/DeepReadonly.ts`, `Physics/ClampedToShare.ts`, `Ritual/Percent.ts`, `Ritual/RitualLog.ts` | A type that forbids writing, small arithmetic, and the log's sink. |
| `Apps/Game/Room/BrowserStorage.ts`, `HeldArrow.ts`, `TapsInARow.ts`, `SeededRandom.ts`, `Sky/DaylightCycle.ts` | The browser's storage, repeats of a held arrow, taps in a row, a seeded random source and the sun by the hour. |
| `Views/RoomLayers.ts`, `Views/EdgeSmoothing.ts`, `Views/RoomCaption.ts`, `Views/LeaveFirstPersonButton.ts` | Layers and touch areas, edge smoothing, the caption, a corner button. |

Split into the engine's mechanism and the game's entries:

| Files | Engine today | Tied to tea by | Abstract form |
|---|---|---|---|
| `Ritual/RitualSession.ts` | Opens and resumes, dispatches, advances in fixed steps with an accumulator, lives through an absence. | The tea `Catalog`, `SessionState`, `problemsOpeningRoom` and the restock. | A session over a game that gives its first state, its commands, its systems, its migrations and its checks of content. |
| `Ritual/ApplyCommand.ts` | Logs every command it receives and hands it to its handler, which checks and applies it. | A `switch` over the tea `Command`, and every handler runs its own checks. | A table with one entry per command type: its checks and what it does. The engine runs the checks in order, turns a refusal into `actionRefused` with its log line, and offers `wouldRefuse`. |
| `Ritual/Draft.ts` | The draft of a command or a step: state, events, `note`, `noteDetail`, `refuse`. | Tea helpers in the same file: `describeLiquid`, `vesselDefinitionOf`, `isClosedAgainstFilling`, `isInvolvedInPour`, and the tea events. | A draft typed by the game's state and events. The helpers move to the game. |
| `Ritual/SimulationStep.ts` | The fixed step. | The order of the tea systems is written in it. | The engine runs an ordered list of systems that the game gives. |
| `Ritual/WorldReport.ts` | Every 5 s it steps a copy one second ahead and reports the rates of what changes. | The lines of vessels, the heater, cloths, the spoon, puddles and the tap. | The engine's mechanism, with reporters the game gives. |
| `Ritual/ReturnAfterAbsence.ts` | Lives through up to twelve hours in steps of 1 s on one copy. | The restock of the spoon and the caddies. | The engine's absence, with the game's hook after it. |
| `State/FittedSavedState.ts` | Checks a save's shape, runs migrations oldest first, knows the version. | The tea fields, the migrations and the fitting of content. | The engine's check and runner, with the game's shape and migrations. |
| `Definitions/Catalog.ts`, `Definitions/CatalogProblems.ts` | Definitions by kind, `definitionIn`, `MissingDefinitionError`, every problem listed before a room opens, a throw in development and `unavailable` for players. | The kinds are teas, vessels, heaters, figurines and rooms, and the checks are tea checks. | A catalog typed by the game's kinds, and the engine's runner of the game's checks. |
| `RoomNavigator.ts`'s `RoomLog` | The room's log type. | It lives in the file of the navigator, and about twenty files import it from there. | Its own file in the engine. |
| `VisitStore.ts` and the five other stores | Keep a value, read it, migrate it, log a failure. | The visit's fields and the stores' keys. | One `browserStore` with a decoder and migrations. |
| `RoomSettings.ts`, `DebugSettings.ts`, `Views/SettingsScreen.ts`, `Views/DebugMenu.ts` | Settings, their defaults, their reading and their screens. | Every field is a tea setting. | A table of settings and the screen built from it. |
| `FrameBudget.ts`, `FrameRate.ts`, `PlayTime.ts`, `Views/FrameBudgetPanel.ts`, `Views/FrameRateCounter.ts` | Times the parts of a frame, counts frames and time played. | The list of the frame's phases, and imports of the navigator's log. | The engine with the phases the game gives. |
| `RoomGestures.ts` | Tells taps, strokes, pinches, holds and the aiming finger apart. | It calls `RoomPlay` and `ItemInspection` and knows the camera's zoom. | Gestures that report to an interface the game implements. |
| `KeyboardShortcuts.ts`, `Views/KeyboardAndMouse.ts`, `Views/Joysticks.ts` | Keys, the caught mouse and sticks. | The keys are the hands, a sip and the tilt. Imports of `FirstPersonLook` and the navigator's log. | Bindings that the game gives. |
| `TapTargetAmong.ts` | Which target a tap reaches through forgiving areas. | The kinds of `RoomTapTarget`. | Generic over the game's targets. |
| `Walking/FloorGrid.ts`, `Walking/Walk.ts`, `Camera/CameraZoom.ts`, `Camera/FirstPersonLook.ts`, `Camera/FirstPersonControls.ts` | Paths, walking, zoom, the look in first person, control schemes. | Types from `RoomLayout.ts`, `RoomNavigator.ts` and `RoomSettings.ts`. | The engine with its own small types. |
| `Texts/Texts.ts` | Typed keys, placeholders, phrases with lines, a voice. | It imports `EnglishTexts.ts` itself. | The engine takes the game's dictionary. |
| `Achievements.ts`, `AchievementStore.ts`, `Views/AchievementsList.ts`, `Views/AchievementNotice.ts` | Earns, keeps, dims what is out of reach, shows. | The tea rules sit in the same file. | A table of achievements, with what earns each and when it is out of reach. |
| `RoomRemarks.ts`, `RoomTexts.ts` | Turns facts and events into lines, once a visit or more. | The tea facts and events. | A table of remarks. |
| `Views/RoomGlow.ts`, `Views/InspectionStage.ts` | Bloom around what glows, the close look's stage. | Imports of the navigator's log, `RoomMaterials.ts` and `InspectedInView.ts`. | The engine with a log and a material passed in. |
| `Views/RoomMaterials.ts` | One registry of looks by surface. | The surfaces are the tea room's. | The engine's registry, with the game's table. |
| The canvas paintings and textures | Canvas set-up, pixel loops, colour mixing. | Each one paints a tea picture. | The engine's kit, the pictures stay in the game. |
| `Views/Carried/ItemParts.ts`'s `levelsOfDetail` and its use in `Views/CarriedItems.ts` | A simpler geometry while a part is small on the screen. | It lives inside the carried items. | An engine helper for any model. |
| `Placement.ts` | Circles that take up room on a surface. | Items, lids, the heater and the sink. | The engine's geometry of footprints, the game's rules of what stands where. |
| `RoomScene.ts` | The renderer, the passes, the raycast, pointer events and the frame loop. | Every tea view and rule is wired in it. | The engine's host, and the game's room. |
| `RoomMain.ts` | Opens a new visit or resumes one and offers to continue. | The tea room's choices. | The engine's start, and the game's choices. |

What stays in the tea game: `Shared/Simulation/Physics/`, `Judgement/`, the item kinds and their rules, the commands and their checks, `Shared/Content/`, `RoomPlay.ts`, `AimedPour.ts`, `WipeStroke.ts`, `SipGesture.ts`, `RoomLayout.ts`, `RoomArrangement.ts`, `GardenLayout.ts`, `CarriedShapes.ts`, `Views/Carried/`, `Views/RoomModel.ts`, the paintings themselves, `Apps/Game/Table/` and `EnglishTexts.ts`.

### The rules of the engine

- `Shared/Engine/` imports nothing outside itself, and no browser API.
- `Apps/Engine/` imports only `Shared/Engine/` and Three.js.
- The tea game imports the engine, never the other way. A test reads every import and fails when the engine imports the game.
- The engine holds only what the tea game already uses. It grows when a second game needs more.

### Steps

Each step keeps every test green and is pushed on its own.

1. Draw the line with moves only: the files of "Moved as it is", and the import test.
2. The command pipeline. `ApplyCommand.ts` becomes the table of the tea game's commands. Each handler in `Ritual/*Commands.ts` loses its first lines of checks to its entry. `ItemRefusals.ts` stays in the game and uses the engine's type of a check.
3. The session and the step: `RitualSession.ts`, `Draft.ts`, `SimulationStep.ts` and `ReturnAfterAbsence.ts`.
4. The world report, saved states and the catalog: `WorldReport.ts`, `FittedSavedState.ts`, `Catalog.ts` and `CatalogProblems.ts`.
5. The browser: stores, settings, texts, achievements, remarks, gestures, keys, walking and the camera.
6. Rendering: materials, glow, the close look's stage, the paintings' kit, levels of detail, footprints, the scene's host and the start.
7. A second game in the tests. `Tests/Engine/` plays a small game that is not about tea, such as a counter or a board of pieces, and imports nothing from the tea game. It checks the fixed step at 30 and 60 frames a second, the order of the checks and the refusals, `wouldRefuse`, migrations of a save, the world report's rates and an absence.
8. CONTRIBUTING.md describes the layers `Shared/Engine` ← `Shared/Simulation` ← `Shared/Content` ← `Apps/Engine` ← `Apps/Game`, and where a new mechanic goes in each.

### The tests

- `Tests/Simulation/`, `Tests/Content/` and the room's integration tests keep their bodies. Their imports change, and `TestRitual` and `TestRoom` build the game through the engine.
- Tests of the mechanisms move to `Tests/Engine/` and play the small game: fixed steps at two frame rates, the format of a log line, a save's shape, and a room with broken content in a development build and in a player's build.
- The unit tests of files that move go with them: gestures, keyboard shortcuts, held arrows, taps in a row, the frame budget, the frame rate, time played, the camera's zoom and look, the sun, tap targets, the settings and the visit store.
- About 40 source files move or split, about 25 handlers lose their checks to the table, about 20 test files move, about 10 are rewritten, and about 10 engine test files are new.

### Done when

- Every test that existed before passes. Its body is unchanged, and only its imports and its support changed.
- The new engine tests pass, and the small game in `Tests/Engine/` imports nothing from the tea game.
- The import test passes.
- The game behaves as before. Both browser projects pass, the `[ritual]` and `[room]` lines say what they said, and the room view, first person and a close-up look the same pixel for pixel, with the random choices seeded.
- Nothing is slower: `Scripts/test.sh` and a frame of the room take no longer than before.
- CONTRIBUTING.md and DECISIONS.md describe the engine.

## 0.5 — Feel

- The five phases of every grab: lift, lag by weight class, resistance, contact bounce, settle.
- Lids as physical objects.
- The stream: particles, bending with the finger, splash, final drops after release.
- The hot vessel: "oh, hot", the hand pulls back.
- Camera micro-zoom towards the object being held.

## 0.6 — Sound

- Audio unlocked on the first touch, as iOS Safari requires.
- Sound families by material: water (volume follows flow), ceramic, the kettle's hum rising with temperature, dry leaves, cloth, rain.
- The last drops as their own sound. No two consecutive plays exactly alike.
- Haptics as a progressive enhancement on devices that implement the Vibration API. None on iPhone.

## 0.7 — The whole ritual on screen

- Offering scene: the figurine's glow, pose and resonant sound.
- The gods' plaque in the corner and the deadpan remarks.
- "The tea is ready": Stay, Leave. Stay fades the UI completely.
- Text in the languages agreed for the game (open question).

## 0.8 — Atmosphere

- The window as its own layer. The time of day changes during play, with light that changes over two to five seconds.
- Rain on the glass and its ambient loop.
- Rare window events with a cooldown, from a seeded random source so tests stay deterministic.

## 0.9 — The cat

- States: sleeping, awake, moving, settling, being petted. Two spots.
- Moves by walking, never by teleporting: look, walk, turn, settle.
- Petting without a reward loop. Keeps a safe distance from hot tea. Occasionally nudges a bowl.
- Habits by time of day and weather.

## 0.10 — Memory

- A ritual history and the first world rules from world-memory.md.
- Installable to the home screen, playable offline.

## 0.11 — Polish

- The art pass: the illustrated diorama.
- Performance on older iPhones, safe areas, reduced motion, a landscape hint.
- A balance pass from playtests.

## 1.0 — MVP

- Everything above stable on current iOS Safari and on Android Chrome, playtested, with the GDD's success criterion met by people who did not build it.

## After 1.0

Guests with memory. The Warm, Rainy and Veranda rooms. A flame heater with a continuous control. The dog. More window scenes and weathers. More figurines and teas. A second infusion. More world rules and unanswered questions.
