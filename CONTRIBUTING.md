# Contributing

How to change the code of Tea Room. The README says what the game is and holds every command. `docs/` says how the game behaves. DECISIONS.md holds the reasons, the corrections that stuck and the open questions, and `docs/roadmap.md` holds the plan.

## Done

A change is done when the commands in the README sections "Test" and "Build" pass, and every new rule has an integration test. CI runs the same scripts from `Scripts/`.

## Architecture

The layers are `Shared/Simulation` (the rules, imports nothing outside itself) ← `Shared/Content` (data) ← `Apps/*` (presentation). Dependencies point toward `Shared/Simulation`.

`Apps/Game` is the game, and `Apps/Bench` is the ritual bench, a debug page over the simulation. Both are type-checked by `Apps/tsconfig.json` and built by Vite from `Scripts/build.sh`. The root `tsconfig.json` type-checks `Shared` and `Tests`.

External dependencies: Three.js for the room, pinned in `package.json`. Vite, TypeScript, Playwright and `@types` packages for development. The simulation imports none of them.

Before designing a new feature, read `docs/world-bible.md`. It holds the lore, the living systems and the secrets the game grows from.

### The simulation

- `Definitions/` are the content types and the `Catalog`. Look definitions up with `definitionIn`.
- `State/` is the mutable-inside, readonly-outside `SessionState`.
- `Physics/` holds pure functions over small values: liquid, heat, pouring, brewing, the tap, the table and the cloth.
- `Judgement/` holds pure decision tables: water, taste, offering, the gods.
- `Ritual/` holds commands, events and handlers, the fixed-step `SimulationStep`, and `RitualSession`, the only object a presentation talks to.

A presentation opens a room with `RitualSession.open(catalog, roomId, log, isDevelopmentBuild)`, shows a quiet screen when the room is `unavailable`, calls `session.dispatch(command)` for each player decision and `session.advance(seconds)` once per frame, renders `session.state`, and reacts to the returned events. It never writes state.

### The game

`Apps/Game/Room` is the walkable 3D room in Three.js, served at the site's root. `Apps/Game/Table/TablePresenter.ts` turns the ritual's state into what the room shows: fill, liquor colour, steam, brew stage, the cloth's wetness, stain and charring. `Table/TeaLooks.ts` holds how each tea looks. `Apps/Game/Texts/EnglishTexts.ts` holds every text the player reads, and `Table/TableTexts.ts` and `Room/RoomTexts.ts` turn the simulation's ids into its keys. `RoomTexts.ts` also decides which events and room remarks become a caption.

In the room:

- `Room/RoomLayout.ts` holds every position in metres.
- `Room/RoomPlay.ts` is the only place that turns presses into ritual commands: taking, choosing a hand, putting down, lids, the heater, the sink and its tap, pouring, the spoon, sipping, offering and wiping. It hands walking and close-ups to `Room/RoomNavigator.ts`, and an aimed pour to `Room/AimedPour.ts`.
- `Room/RoomGestures.ts` tells taps, strokes, pinches and the aiming finger apart before they reach `RoomPlay`.
- `Room/Placement.ts` decides whether an item fits where the player tapped.
- None of these knows Three.js.
- `Room/Walking/` finds paths on the floor grid and moves the walker. `Room/Camera/` computes where the camera looks and keeps the zooms. `Room/Sky/` computes where the sun stands at each hour of the day.
- `Room/Views/` builds the meshes. `RoomModel.ts` builds the room. `CarriedItems.ts` builds the items the keeper can carry, placed from the ritual's state every frame and, in a close-up, held in the corners of the view, with their parts in `Views/Carried/`: the meshes, what an item holds, the water streams, the chosen glow and the cloth's fire. `SipButton.ts`, `PourControls.ts` and `RoomCaption.ts` are the controls and the caption, and `RoomLights.ts` lights the room from the sun's place.
- `Room/Views/RoomMaterials.ts` is the one place that decides how each surface looks. Paintings and generated textures, such as `KoiPainting.ts` and `LotusPainting.ts`, are drawn on canvases and used there.
- `Views/RoomLayers.ts` names the render layers.
- `RoomScene.ts` renders, raycasts and forwards pointer events to `RoomGestures`. `RoomMain.ts` opens the ritual session.

### Adding content

A tea, a vessel, a figurine or a room:

1. Add the definition to the matching file in `Shared/Content/` and register it in `DefaultCatalog.ts`.
2. Run the tests. `Tests/Content/DefaultCatalog.unit.test.ts` runs `problemsOpeningRoom` over every room, and `Tests/Content/TeaBalance.integration.test.ts` brews every tea by the book.

### Adding a mechanic

1. Add its fields to the definition types if content varies it, and to `SessionState` if the world must hold it.
2. Put its arithmetic in `Physics/` and its decisions in `Judgement/` as pure functions.
3. Add the command to `Command.ts`, the events and refusal reasons to `RitualEvent.ts`, a handler in the matching `*Commands.ts`, and the case in `ApplyCommand.ts`. Add continuous behaviour to `SimulationStep.ts`.
4. Allow or refuse it per phase in `PhaseRules.ts`.
5. Write integration tests through `TestRitual` in `Tests/Simulation/`.
6. Describe the rule in `docs/simulation.md` and the gesture in `docs/interactions.md`.

The reference mechanic is pouring: `Physics/Pouring.ts`, `Ritual/PouringCommands.ts`, `SimulationStep.continuePour` and `Tests/Simulation/Pouring.integration.test.ts`.

## Conventions

- File names are the name of their main export, in PascalCase.
- The product says "tea bowl" for the drinking vessel in content, and "cup" in the simulation's generic commands (`tasteCup`, `offerCup`).
- Test names are `subject_condition_outcome`, without a `test_` prefix.
- The simulation never reads the clock, randomness, the DOM or any browser API. Time arrives through `advance`. Randomness, when it comes, is a seeded source passed in.
- The simulation only advances in fixed steps of `RitualSession.simulationStepSeconds`. A rule never multiplies by a frame's duration.
- Every refusal is an `actionRefused` event with a reason. A handler never throws for a player mistake and never ignores a command silently.
- A gods judgement that should happen once per ritual is guarded by `godsJudgementsMade`.
- Source files use only erasable TypeScript syntax: no enums, namespaces or constructor parameter properties. Relative imports end in `.ts`.
- Every action on an item first checks that it is within reach through `Ritual/Reach.ts`. Every action with the spoon or the cloth checks that it is in a hand, and wiping and offering check that the keeper stands at the ritual place. A new action gets the same checks.
- Every id the simulation looks up in the catalog is checked by `problemsOpeningRoom` in `Definitions/CatalogProblems.ts`. A new reference between definitions gets a check there.
- Every decision writes a log line where it is taken: `note(draft, ...)` for the story, `noteDetail(draft, ...)` for frequent raw input such as tilt changes. `refuse` logs by itself. The simulation never writes to the console. `RitualSession` passes the lines to the `RitualLog` it was given.
- Text the player reads is not in the simulation. The simulation emits ids, and the presentation turns them into words. Every such word lives in `Apps/Game/Texts/EnglishTexts.ts` as a key and a value, read through `Texts.ts`. The bench keeps its own labels.

## Tests

- Integration tests run the real `RitualSession` over `Tests/Support/TestCatalog.ts`, whose round numbers make expected values checkable by hand. Its vessels do not cool unless a test asks for cooling.
- Content tests run the real catalog.
- Room tests in `Tests/Game/Room/` drive `RoomNavigator` and `RoomPlay` with taps and presses, `RoomPlay` over a real session in the quiet room.
- Unit tests are written only for a decision table that has stopped moving.
- End-to-end UI tests in `Tests/Browser/` play the built site with Playwright on iPhone WebKit and Android Chromium, and read the logs from the console, so the game needs no test hooks.
- CI runs `Scripts/test.sh` and `Scripts/test-ui.sh` on every push and pull request.
