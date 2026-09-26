# Roadmap to 1.0

Each version ends with something that can be opened on an iPhone from GitHub Pages and with integration tests for every rule it adds. A version adds one layer. The layers follow the order in which the game becomes playable, then tactile, then alive, then personal.

1.0 is the MVP of the GDD: one room, one window, three times of day, rain, a cat, one kettle, an electric heater, a thermos, a caddy and spoon, six tea bowls in different glazes, three teas, a cloth and two figurines, with heating, temperature, pouring, brewing, bitterness, the first sip, the gods' plaque and the option to simply stay.

## Next: fix what the review found

A review of the whole code found the problems below. Each package comes in its own commits with its tests, and is pushed before the next one starts. A helper that the engine will own is written so that it moves into the engine unchanged.

### 1. Bugs

- A key press skips the checks a tap has. The keys choose a hand, sip and open the close look while a pour is aimed, and act after the keeper died. `RoomPlay` holds one mode, and every input asks it.
- A cancelled pointer counts as a lifted finger, so it taps.
- A drag that leaves the aim plane throws the aimed vessel to the edge of its area.
- A key held while the window loses focus stays held, so the pour keeps running.
- Every change of the settings resets the frame rate counter.
- A continued visit shuffles the bowls again, so a bowl added by an update lands on a taken spot.
- A tap on a full spot while aiming keeps the hand chosen.
- Two open lids can lie inside each other.
- The cloth's corners reach past its footprint.
- The thermos's opening in its layout is wider than its drawn mouth.
- Whether a vessel has a lid is written twice, in its definition and in its layout, and nothing compares them.
- The height a lying lid rests at is agreed only in prose.
- The thermos and the caddy have no forgiving touch area.
- What overflows a vessel lands on the table as the stream, not as the mixture.
- A save's empty fields and its cross-references, such as the heater's item against the item's place, are not checked.
- A phrase with no lines crashes a frame, and phrase keys are plain strings.
- A key hold and a finger hold are timed by different clocks.
- Two glow paths share one stand-in material.

### 2. Tests that pass when the game breaks, and missing tests

- The helpers of `TestRitual` ignore refusals in the arrange, so a failed setup passes, and one helper can loop forever.
- A sink test never turns the tap on. No test checks that an open lid cools faster.
- The first browser test passes when the tap does nothing. The furniture test walks to one side of each piece. The continue test hardcodes the entrance and waits a second per tap.
- A refused put-down is checked without its reason. Presenter tests arrange states the game cannot reach.
- Refusal reasons, reach checks, rows of the taste table, achievements, stores and some paths of `RoomPlay` have no test.
- Setups are copied between files, and places are given as raw coordinates.
- Tests assert log sentences, texts copied from `EnglishTexts.ts`, numbers of the real catalog and odd literals.
- Some tests have two acts, some repeat others, and `Heating.integration.test.ts` holds six features.

### 3. Test speed and CI

- `CarriedItems.integration.test.ts`, the slowest file, builds every model once per test, not inside its loops.
- Boiling tests wait for their event instead of twenty minutes of simulated time.
- `RitualSession.advance` steps on one copy of the state per call, not one per step.
- The two type-checks run beside the tests.
- A failed UI test keeps its trace, and CI uploads it. Every job has a timeout.
- The browser cache is keyed by the browser's revision. A deployment that has started is never cancelled. A pull request from a branch of this repository runs once.
- Chromium in CI asks for software WebGL by name. The artifact's assembler fails on a file it would drop.
- The browser jobs stop reinstalling system packages on every run.

### 4. Rules in the code instead of conventions

- Where an item is lives in one field, `location`, and only `moveItem` changes it. The heater and the sink are kinds of location.
- The heater's mode is one value, not three flags.
- Only `takeLiquidFrom` and `emptyTheVessel` lower what a vessel holds.
- `RoomPlay` asks the session whether a command would be refused, through `wouldRefuse`, instead of repeating the simulation's rules. Numbers that the view and the rules share are written once.
- `Apps/` imports the simulation through one public file.
- A kind of tap target is one entry in a table, and views tag meshes with the same values.
- Every kept value is one `browserStore` with its decoder. A new setting is one entry in a table of settings.
- Everything the keeper says is one entry in `remarksInOrder`.
- A type named by two files has its own file, and no two files import each other.
- Distances on the floor, clamps and easings come from one file.

### 5. The carried items

- Every size of a shape is written once. A vessel is its profile, and its liquid, its overflow, its opening and its footprint come from the profile.
- `ItemContents` knows no shape by name. What only one shape shows is a display of its look, and the ash of a crumbled item is part of its look.
- `ItemParts` groups its fields, and `CarriedModel` keeps what was built apart from what changes each frame.

### 6. The presentation

- `RoomScene` keeps rendering, raycasting and forwarding. Its decisions about first person, sitting and which controls show move to classes without Three.js. `RoomScene` and `TestRoom` assemble the room with the same code, so the paths from remarks to achievements and from death to the forgotten visit are tested.
- `RoomPlay` is split along its seams: aiming, the cloth, tap counts and the router.
- The page's controls and the canvas paintings each come from one kit, and the paintings use one random source.
- Each view's styles live beside the view, not in `index.html`.
- Names, member order and dead code, as the review lists them.

### 7. Folders

- `Views/Paintings/`, `Views/Controls/` and subfolders of `Views/Carried/`, as moves only.

### 8. Documents

- README, this roadmap, `docs/world-memory.md` and `docs/game-design.md` say what is true now.
- The long paragraphs of `docs/interactions.md` become sections and tables. Entries in DECISIONS.md lose their history.

## Then: the engine

The reason is in DECISIONS.md, "The code becomes a reusable engine and a tea game on top of it".

### What the engine is

The engine is the part of the code that knows no tea. It has two halves, with one rule each:

- `Shared/Engine/` imports nothing outside itself, and no browser API.
- `Apps/Engine/` imports only `Shared/Engine/` and Three.js.

The tea game is `Shared/Simulation/`, `Shared/Content/` and `Apps/Game/`, and it imports the engine. A test reads every import and fails when the engine imports the game.

`Shared/Engine/` holds:

- A session: opening, resuming, dispatching a command, advancing in fixed steps with an accumulator, and living through an absence in larger fixed steps.
- The command pipeline. Each command type has one entry in a table: its checks and what it does. The engine runs the checks in order. It turns the first refusal into an `actionRefused` event with its reason and its log line, and otherwise applies the command. A command without an entry does not compile. `wouldRefuse(command)` runs the checks on a copy.
- The draft that a command or a step writes: the state, the events and the log lines, with `note`, `noteDetail` and `refuse`.
- The step, as an ordered list of systems that the game gives, such as cooling, brewing and pouring.
- The world report: it steps a copy ahead and gives the rates of whatever values the game names.
- Saved states: the check of a save's shape, and the migrations oldest first, with the version.
- The catalog: definitions by kind, `definitionIn`, and the check of every reference before a room opens, with the checks the game gives.
- `DeepReadonly`, a seeded random source and small arithmetic.

`Apps/Engine/` holds:

- Input: taps, strokes, pinches, holds, keys, the mouse, sticks, a held arrow and taps in a row.
- The frame: a loop with a real clock and a world clock, the frame budget and the frame rate.
- The browser: the storage, stores with decoders and migrations, full screen.
- A table of settings and the screen built from it. The same for the debug menu.
- Texts: typed keys, phrases with lines, placeholders and a voice.
- Achievements and remarks as tables of what earns them, with their store, their list and their notice.
- The page's controls: sheets, buttons, rows, a button that acts while held, and a notice that fades.
- Rendering with Three.js: layers and touch areas, tap targets on meshes and the raycast, glow, edge smoothing, the close look's stage, a registry of materials by surface, a kit for canvas paintings, levels of detail, the camera's zoom and first-person look, walking on a floor grid, and the sun's place by the hour.

The tea game keeps its own rules and looks: items, hands and reach, liquids, leaves, heat, the tap, the cloth, the checks of its commands, its content, `RoomPlay`, the room's layout and arrangements, the carried shapes and their parts, the paintings, the presenter and the words.

The engine does not have physics of bodies, collisions, networking, or a way to change state that suits thousands of objects each frame. A shooter or a platformer adds them when it exists.

### Steps

Each step keeps every test green and is pushed on its own.

1. Draw the line with moves only. Files that already know no tea move to `Shared/Engine/` and `Apps/Engine/`: `DeepReadonly`, `SeededRandom`, `ClampedToShare`, `BrowserStorage` and the store kit, `FrameBudget`, `FrameRate`, `PlayTime`, `HeldArrow`, `TapsInARow`, `TapTargetAmong`, `Walking/`, `Camera/CameraZoom.ts`, `Camera/FirstPersonLook.ts`, `Sky/DaylightCycle.ts`, `Views/RoomLayers.ts`, `Views/RoomGlow.ts`, `Views/EdgeSmoothing.ts`, `Views/InspectionStage.ts`, `Views/KeyboardAndMouse.ts`, `Views/Joysticks.ts` and the controls' kit. Add the test of imports.
2. The command pipeline. `ApplyCommand.ts` becomes the table of the tea game's commands. Each handler in `Ritual/*Commands.ts` loses its first lines of checks, and its entry lists them. `ItemRefusals.ts` stays in the game and uses the engine's type of a check.
3. The session and the step. `RitualSession.ts`, `Draft.ts`, `RitualLog.ts` and `SimulationStep.ts` split into the engine's session, draft, log and fixed step, and the game's list of systems. `ReturnAfterAbsence.ts` keeps only the game's restock.
4. The world report and saved states. `WorldReport.ts` and `FittedSavedState.ts` split into the engine's mechanism and the game's values, fields and migrations. `Catalog.ts` moves, and `CatalogProblems.ts` keeps only the game's checks.
5. The presentation's tables. Settings, the debug menu, texts, achievements and remarks become engine tables with the game's entries. `Texts.ts` moves, and `EnglishTexts.ts` stays.
6. The scene and the start. `RoomScene.ts` splits into the engine's host, with the renderer, the passes, the raycast, pointer events and the frame loop, and the game's room. `RoomMain.ts` splits into the engine's start, which opens or resumes and offers to continue, and the game's choices.
7. A second game in the tests. `Tests/Engine/` plays a small game that is not about tea, such as a counter or a board of pieces. It checks the fixed step at 30 and 60 frames a second, the pipeline's order of checks and its refusals, `wouldRefuse`, migrations of a save, the world report's rates and an absence.
8. CONTRIBUTING.md describes the layers `Shared/Engine` ← `Shared/Simulation` ← `Shared/Content` ← `Apps/Engine` ← `Apps/Game`, and where a new mechanic goes in each.

### The tests

- `Tests/Simulation/`, `Tests/Content/` and the room's integration tests keep their bodies. Their imports change, and `TestRitual` and `TestRoom` build the game through the engine.
- Tests of the mechanism move to `Tests/Engine/` and play the small game: fixed steps at two frame rates, the logging format, a save's shape, and opening a room with broken content in a development build and in a player's build.
- Unit tests of files that move go with them: gestures, keyboard shortcuts, held arrows, taps in a row, the frame budget, the frame rate, time played, the camera's zoom and look, the sun, tap targets, the settings and the visit store.
- About 40 source files move or split, about 25 handlers lose their checks to the table, about 20 test files move, about 10 are rewritten, and about 10 engine test files are new.

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
