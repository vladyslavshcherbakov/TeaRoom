# Contributing

How to change the code of Tea Room. The README says what the game is and holds every command. `docs/` says how the game behaves. DECISIONS.md holds the reasons, the corrections that stuck and the open questions, and `docs/roadmap.md` holds the plan. `docs/world-bible.md` holds the lore, the living systems and the secrets the game grows from. Read it before you design a new feature.

## Done

A change is done when the commands in the README section "Test" and `Scripts/build.sh` from the section "Build" pass. Every new rule has an integration test.

The artifact build in the section "Build" is not part of it. The agent that publishes the artifact runs it.

A change that adds to or changes what the player can do updates `docs/` and `docs/roadmap.md` in the same commit. A planned step that is built moves from its planned version to the version in progress. A feature built outside the roadmap is added to the version in progress. Only the user closes a version.

## Architecture

### Layers

The layers are `Shared/Simulation` (the rules, imports nothing outside itself) ← `Shared/Content` (data) ← `Apps/Game` (presentation). Dependencies point toward `Shared/Simulation`.

`Apps/tsconfig.json` type-checks `Apps/Game` together with its tests in `Tests/Game`. `Scripts/build.sh` builds the game with Vite. The root `tsconfig.json` type-checks `Shared` and the other tests without the browser's types, so the simulation cannot reach the DOM.

Three.js draws the room. Vite, TypeScript, Playwright and the `@types` packages are for development. `package.json` holds their versions. The simulation imports none of them.

### The simulation

The folders of `Shared/Simulation`:

| Folder | What it holds |
|---|---|
| `Definitions/` | The content types and the `Catalog`. Look a definition up with `definitionIn`. `CatalogProblems.ts` checks a room before it opens. |
| `State/` | `SessionState`, mutable inside and readonly outside, the state a room starts in, and `FittedSavedState.ts`, which decides whether a save still fits. |
| `Physics/` | Pure functions over small values: liquid, heat, pouring, brewing, the tap's water, the table and the cloth, and charring. |
| `Judgement/` | Pure decision tables: water, taste, offering, the thermostat and the time of day. |
| `Ritual/` | Commands, events and their handlers, the fixed-step `SimulationStep`, and `RitualSession`, the only object a presentation talks to. |

The files in `Ritual/` that every action goes through:

| File | What it decides |
|---|---|
| `Ritual/ItemRefusals.ts` | The checks that actions on items share, and `wasRefusedByAnyOf`, which runs them in order. |
| `Ritual/Reach.ts` | Where an item is, and whether it is within the keeper's reach. |
| `Ritual/ItemKinds.ts` | The kinds of carried item, `ItemKindRules`, and `rulesFor`, which finds an item's rules. |
| `Ritual/VesselRules.ts`, `Ritual/SpoonRules.ts`, `Ritual/ClothRules.ts` | How a vessel, the spoon or a cloth answers each question of `ItemKindRules`. |
| `Ritual/LiftTheItem.ts` | `liftTheItem`, the one way to lift an item from where it lies. |
| `Ritual/WorldReport.ts` | The detail lines about everything that is changing, with its rates. |
| `Ritual/ReturnAfterAbsence.ts` | How the world lives through the time away. |

`ItemKindRules` asks each kind:

- whether it may sit on the heater, and whether it is made for the heater
- how it is described on the heater, what the working heater does to it, and what taking it off does
- what the running tap does to it, or `null` to keep it out of the sink
- what lifting it out of the sink does, and what taking it into a hand does
- whether it is too hot to hold, and whether it is closed against the tap

The handlers and the step ask `rulesFor` and never branch on the kind themselves.

A presentation opens a room with `RitualSession.open(catalog, roomId, log, isDevelopmentBuild)`. It resumes a saved visit with `RitualSession.resume(catalog, savedState, savedVersion, log, isDevelopmentBuild)`, then calls `session.returnAfter(awaySeconds, shareThroughTheNextTimeOfDay)`. It shows a quiet screen when the room is `unavailable`. It calls `session.dispatch(command)` for each player decision and `session.advance(seconds)` once per frame. It renders `session.state` and reacts to the returned events. It never writes state.

### The game

`Apps/Game/Room` is the walkable 3D room in Three.js, served at the site's root. `Apps/Game/Table` turns the ritual's state into what the room shows, and `Apps/Game/Texts` holds every word the player reads.

| File | What it decides |
|---|---|
| `Table/TablePresenter.ts` | Turns the ritual's state into a `TableViewState`: fill, liquor colour, steam, the water's motion, brew stage, puddles, and the cloth's wetness, stain and charring. |
| `Table/TableViewState.ts` | The types of that view state. |
| `Table/TeaLooks.ts` | How each tea looks: its leaves and the colour of its liquor. |
| `Table/TableTexts.ts` | `sipFeeling`, the one owner of a sip's feeling, and the line the keeper says for it. |
| `Texts/EnglishTexts.ts` | Every text the player reads, as a key and a value. |
| `Texts/Texts.ts` | Reads a text by its key, fills its placeholders, and picks a phrase's line for a voice. |

### In the room

The paths below start at `Apps/Game/Room/`. No file in the first four tables imports Three.js.

Taps, gestures and play:

| File | What it decides |
|---|---|
| `RoomPlay.ts` | Turns presses into ritual commands. It is the only file that does. |
| `RoomGestures.ts` | Tells taps, strokes, pinches, the aiming finger and a hold on a held item apart. |
| `TapTargetAmong.ts` | Which target a tap reaches through a forgiving touch area or past the chosen hand. |
| `RoomNavigator.ts` | Walking to the floor and to furniture, and which close-up is shown. |
| `AimedPour.ts` | An aimed pour: where the vessel hovers and how far it tilts. |
| `WipeStroke.ts` | Turns a stroke of the cloth into wipes. |
| `SipGesture.ts` | Times a sip: how far the vessel is raised and how much of the sip it still shows. |
| `ItemInspection.ts` | How a held item shown up close is turned and zoomed. |
| `TapsInARow.ts` | Counts taps in a row on one thing. |
| `KeyboardShortcuts.ts` | Turns the keys into taps and holds on the hands, a sip and the tilt of a pour. |
| `HeldArrow.ts` | When an arrow held down repeats. |
| `Placement.ts` | Whether an item fits where the player tapped, and where an open lid lies. |
| `CarriedShapes.ts` | The shape of each carried item and what it takes up on a surface. |

What the keeper says and earns:

| File | What it decides |
|---|---|
| `RoomRemarks.ts` | Which remark a fact from the room earns, and whether it is made once a visit. |
| `RoomTexts.ts` | Which events become a caption, which jokes were told this visit, and the start-over note. |
| `Achievements.ts` | Which events, remarks and states earn an achievement, and which are out of reach. |

The room, the walk and the camera:

| File | What it decides |
|---|---|
| `RoomLayout.ts` | Every position in metres. `roomLayoutFor` builds the layout of an arrangement, and `turnOfItemAt` gives the turn of an item standing on furniture. |
| `RoomArrangement.ts` | The arrangement a new game chooses at random. |
| `RoomWithVesselsShuffled.ts` | The random order of the bowls on the shelf. |
| `GameCatalog.ts` | The catalog of a new game, with the bowls in a random order, and of a continued visit, with them where the room puts them. |
| `GardenLayout.ts` | Where each plant of the garden grows, and its colour. |
| `SeededRandom.ts` | Repeatable random numbers from a seed. |
| `Walking/FloorGrid.ts` | Paths on the floor grid. |
| `Walking/Walk.ts` | Moves the walker along a path. |
| `Camera/CameraPoses.ts` | Every camera pose and the range of the zoom. |
| `Camera/CameraZoom.ts` | Keeps the room's zoom and the close-up's zoom apart. |
| `Camera/FirstPersonLook.ts` | Turns the sticks and the mouse into steps and a look in first person. |
| `Camera/FirstPersonControls.ts` | The four control schemes, which sticks each shows, and how the keys walk. |
| `Camera/KeeperHeight.ts` | The keeper's height, and the eyes' height standing or seated. |
| `Sky/DaylightCycle.ts` | Where the sun stands and how bright the lights are at each hour. |
| `Temperatures.ts` | Degrees in the unit the player chose, and one step of the thermostat. |
| `GooglyPupil.ts` | How a googly pupil rolls. |

Settings, stores and counters:

| File | What it decides |
|---|---|
| `RoomSettings.ts` | The player's settings, their defaults, and how a saved one is read. |
| `DebugSettings.ts` | The debug menu's settings. |
| `BrowserStorage.ts` | The only way to the browser's storage. It turns a blocked or full storage into a result. |
| `VisitStore.ts` | Keeps the visit, with its own `migrationsOldestFirst`. |
| `SettingsStore.ts`, `DebugSettingsStore.ts`, `AchievementStore.ts`, `PlayTimeStore.ts`, `AimHintStore.ts` | Keep the settings, the debug settings, the achievements, the time played and whether the aiming note was seen. |
| `PlayTime.ts` | Counts the time the room is played. |
| `FrameBudget.ts` | Times each part of a frame. |
| `FrameRate.ts` | Counts the frames the browser draws. |

The entry points:

| File | What it decides |
|---|---|
| `RoomMain.ts` | Opens a new room or resumes a saved visit, and saves the arrangement with it. |
| `RoomScene.ts` | Renders, raycasts, forwards pointer events to `RoomGestures`, walks and looks in first person, and saves the visit. |

The models, in `Views/`:

| File | What it builds |
|---|---|
| `Views/RoomModel.ts` | The room, its furniture, the heater, the sink, and the things on the wall. |
| `Views/RoomMaterials.ts` | How every surface looks. |
| `Views/RoomLayers.ts` | The render layers, `touchAreaOf`, `putOnLayer` and `markAsGlowing`. |
| `Views/RoomGlow.ts` | The bloom around what glows. |
| `Views/RoomLights.ts` | Lights the room from the sun's place. |
| `Views/Sky.ts` | The sky and its clouds in first person. |
| `Views/Garden.ts` | The garden around the house. |
| `Views/WalkerModel.ts` | The keeper in the room view: body colour, face, googly eyes and afro. |
| `Views/HeaterControls.ts` | The panel under the heater, with the thermostat's arrows and button in nerd mode. |
| `Views/LampDisplay.ts` | The row of nixie tubes of the heater and the kettle's thermometer. |
| `Views/SettingsGear.ts` | The gear on the wall, which turns a tooth on each change of the settings. |
| `Views/GuideBookModel.ts`, `Views/GuidePagePainting.ts` | The folio on the wall and the faint writing on its pages. |
| `Views/ProphecyInscription.ts` | The prophecy on the beam, cropped to its ink. |
| `Views/ProphecySighting.ts` | Whether the prophecy is seen whole. |
| `Views/InspectionStage.ts` | Dims the room behind an item shown up close, and lights the item. |
| `Views/EdgeSmoothing.ts` | Smooths the edges of the finished picture. |
| `Views/KoiPainting.ts`, `Views/KoiPond.ts`, `Views/LotusPainting.ts`, `Views/HeronPainting.ts`, `Views/GinkgoPainting.ts`, `Views/ToadPainting.ts`, `Views/TeaCharacterPainting.ts`, `Views/ThermosPainting.ts` | The paintings, drawn on canvases. |
| `Views/CrackleGlaze.ts`, `Views/MarbleGlaze.ts`, `Views/KintsugiGlaze.ts`, `Views/TemperBands.ts`, `Views/YixingClay.ts`, `Views/ClothWeave.ts` | The generated textures of glazes, clay and cloth. |
| `Views/PseudoRandom.ts` | A repeatable number from a seed, for the paintings. |

The carried items, in `Views/` and `Views/Carried/`:

| File | What it builds |
|---|---|
| `Views/CarriedItems.ts` | Every carried item, placed from the ritual's state each frame, held in the corners of a close-up, and drawn in the detail its size on the screen needs. |
| `Views/Carried/CarriedModel.ts` | Assembles an item's model from its shape's look in `lookByShape`. |
| `Views/Carried/CarriedShapeLook.ts` | What a shape's look answers: its parts, its steam, its leaves and its fire. |
| `Views/Carried/KettleParts.ts`, `ThermosParts.ts`, `CaddyParts.ts`, `BowlParts.ts`, `SpoonParts.ts`, `ClothParts.ts` | One shape's `CarriedShapeLook` each. |
| `Views/Carried/ItemParts.ts` | The parts a look returns, with their `levelsOfDetail`. |
| `Views/Carried/ItemContents.ts` | What an item shows of what it holds: water, tea, leaves, steam and an open lid. |
| `Views/Carried/WaterStreams.ts`, `FallingStream.ts`, `CreepingStream.ts` | The streams from a spout and the tap, and an overflow down a wall. |
| `Views/Carried/HeldInView.ts`, `InspectedInView.ts`, `AimedVessel.ts` | Where an item stands when held in a corner, shown up close, or aimed over its target. |
| `Views/Carried/ChosenGlow.ts`, `UnchosenHandVeils.ts` | The glow behind the chosen item and the veil over what the other hands hold. |
| `Views/Carried/ItemFire.ts`, `CrumblingAsh.ts` | The fire of an item burning on the heater, and the ash of one that crumbles. |
| `Views/Carried/LeafPile.ts`, `GaugeStrip.ts` | A heap of leaves, and the water in the kettle's gauge. |
| `Views/Carried/KettleShape.ts`, `BowlProfile.ts`, `RumpledClothGeometry.ts` | The kettle's, the bowl's and the cloth's geometry. |
| `Views/Carried/CarriedItemsScene.ts` | What a frame tells the carried items. |

The screen's controls, in `Views/`:

| File | What it shows |
|---|---|
| `Views/SipButton.ts`, `Views/PourControls.ts`, `Views/Joysticks.ts` | The Sip button, the pour's buttons and note, and the sticks. |
| `Views/KeyboardAndMouse.ts` | Listens to the keys and catches the mouse. |
| `Views/RoomCaption.ts` | The caption with the keeper's lines. |
| `Views/AchievementsList.ts`, `Views/AchievementNotice.ts` | The achievements' sheet and the notice of a new one. |
| `Views/SettingsScreen.ts`, `Views/DebugMenu.ts`, `Views/GuideBook.ts` | The settings, the debug menu and the book of instructions. |
| `Views/ContinueScreen.ts`, `Views/YouDiedScreen.ts` | The screen that offers to continue a visit, and the death screen. |
| `Views/FrameBudgetPanel.ts`, `Views/FrameRateCounter.ts` | The frame budget's report and the frame rate. |
| `Views/FullScreenButton.ts`, `Views/LeaveFirstPersonButton.ts` | The buttons in the top right corner. |

### Adding content

Each row names every place a new piece of content needs, and what fails when one is missing.

| New | Simulation and content | Room | What catches a missing place |
|---|---|---|---|
| Tea | Its definition in `Shared/Content/Teas.ts`, registered in `DefaultCatalog.ts` | Its look in `Table/TeaLooks.ts` | `Tests/Content/TeaBalance.integration.test.ts` brews it by the book, and `Tests/Game/Table/TeaLooks.unit.test.ts` finds its look. |
| Tea bowl | Its id in `teaBowlIds` and its spot in `onTheShelf` in `Shared/Content/Rooms.ts` | Its look in `bowlLookById` in `Views/Carried/BowlParts.ts` | The compiler lists the missing spot and look. |
| Figurine | Its definition in `Shared/Content/Figurines.ts`, registered in `DefaultCatalog.ts`, and its id in `figurineIds` in `Rooms.ts` | Its place by each window in `RoomLayout.ts`, its surface in `surfaceByFigurineId` in `Views/RoomMaterials.ts`, and its name `figurine.<id>` in `EnglishTexts.ts` | The compiler lists the place, the surface and the name. |
| Heater | Its definition in `Shared/Content/Heaters.ts`, registered in `DefaultCatalog.ts`, and the room's `heaterId` | Nothing yet | `problemsOpeningRoom` reports an unknown heater. |
| Room | Its definition in `Shared/Content/Rooms.ts`, registered in `DefaultCatalog.ts` | The game opens only the quiet room. | `Tests/Content/DefaultCatalog.unit.test.ts` runs `problemsOpeningRoom` over every room. |

A new vessel definition needs a shape in the room, as below.

### A new kind of carried item

A kind is a vessel, the spoon or a cloth. A new kind touches these places:

1. `ItemKind` and `itemKindOf` in `Ritual/ItemKinds.ts`, and a rules file with its `ItemKindRules`. The compiler lists every missing answer.
2. Where it is held and found in `Ritual/Reach.ts`: `ItemHolders`, `holderIn` and `carriedItemIdsIn`. The compiler does not list them.
3. Its state in `SessionState` and its start in `State/InitialState.ts`. The compiler lists what `SessionState` needs.
4. Where it starts in `RoomDefinition` and in `Shared/Content/Rooms.ts`, with a check of its place and its id in `CatalogProblems.ts`. Nothing lists a missing check.
5. A migration at the end of `migrationsOldestFirst` in `FittedSavedState.ts`, and fitting it to the room there, with a test that resumes an older save.
6. Its lines in `Ritual/WorldReport.ts`. Nothing catches them missing.
7. What the room shows of it in `Table/TablePresenter.ts` and `Table/TableViewState.ts`.
8. Its case in `carriedShapeOf` in `CarriedShapes.ts`. The compiler does not list it. `Tests/Game/Room/CarriedShapes.unit.test.ts` does.
9. A shape in the room, as below.

### A new shape of carried item

A shape is how the room draws an item, such as a kettle or a teapot. A new shape touches these places:

1. `CarriedShape` in `CarriedShapes.ts`, and its layout in `layoutByShape`. The compiler lists the missing layout.
2. Its vessel definition in `shapeByVesselDefinitionId` there. The compiler does not check this map. `Tests/Game/Room/CarriedShapes.unit.test.ts` does.
3. A lid in its layout exactly when its vessel definition has one. `Tests/Game/Room/CarriedShapes.unit.test.ts` checks that the two agree.
4. Its parts file in `Views/Carried/` with its `CarriedShapeLook`, registered in `lookByShape` in `CarriedModel.ts`. The compiler lists the missing look.
5. Its new surfaces in `Surface` and `lookBySurface` in `Views/RoomMaterials.ts`. The compiler lists a surface that `lookBySurface` lacks.
6. Every place that treats a shape as a role in the game: `RoomPlay.ts`, `RoomRemarks.ts` and `Achievements.ts` compare with a shape by name. Search for `carriedShapeOf`. Nothing lists these.
7. Run `Tests/Game/Room/CarriedItems.integration.test.ts`. It builds every item of the room and checks what every shape promises. An aimed item stays above the surface, and an open lid fits the place kept for it. A held item stays on a phone's screen, an overflow runs down the wall, and an item has a fire exactly when it can char.

### Adding a mechanic

In the simulation:

1. Add its fields to the definition types if content varies it, and to `SessionState` if the world must hold it.
2. Put its arithmetic in `Physics/` and its decisions in `Judgement/` as pure functions.
3. Add the command to `Command.ts`, the events and refusal reasons to `RitualEvent.ts`, a handler in the matching `*Commands.ts`, and the case in `ApplyCommand.ts`. Add continuous behaviour to `SimulationStep.ts`.
4. Write integration tests through `TestRitual` in `Tests/Simulation/`.
5. Describe the rule in `docs/simulation.md`.

The reference mechanic in the simulation is pouring: `Physics/Pouring.ts`, `Ritual/PouringCommands.ts`, `continuePour` in `SimulationStep.ts` and `Tests/Simulation/Pouring.integration.test.ts`.

In the room:

1. Add the tap target to `RoomTapTarget` in `RoomPlay.ts` and its tag to `TapTargetTag` in `Views/RoomModel.ts`, and turn the tag into the target in `tapTargetOf` in `RoomScene.ts`.
2. Add its case to `closeUpActionOn`, `furnitureOf` and `describeTarget` in `RoomPlay.ts`. These switches end in a `default`, so the compiler does not list a missing case.
3. Build its invisible touch area with `touchAreaOf`. If a tap on it must win over a forgiving touch area, teach `TapTargetAmong.ts`.
4. Put its words in `EnglishTexts.ts`, and what the keeper says about it in `RoomRemarks.ts` or `RoomTexts.ts`.
5. Write a test through `TestRoom` in `Tests/Game/Room/`, in the file for that feature of the room.
6. Describe the gesture in `docs/interactions.md`.

The reference feature in the room is the sink: `putTheChosenItemInTheSink` and `turnTheTap` in `RoomPlay.ts`, and `Tests/Game/Room/SinkInTheRoom.integration.test.ts`.

A new setting is a field in `RoomSettings` with its default and its reading in `roomSettingsFrom`, a row in `Views/SettingsScreen.ts`, and its words in `EnglishTexts.ts`. A new achievement is an id in `achievementIds`, the rule that earns it in `Achievements.ts`, and its title and text in `EnglishTexts.ts`.

## Conventions

### Names

- A file with one main type, class or function is named after it. A file of related functions or content is named after its subject, such as `Physics/Heat.ts`, `Ritual/SinkCommands.ts` or `Shared/Content/Teas.ts`. File names are in PascalCase.
- The product says "tea bowl" for the drinking vessel in content, and "cup" in the simulation's generic commands (`tasteCup`, `offerCup`).
- Test names are `subject_condition_outcome`, or `subject_outcome` when no condition is worth naming, without a `test_` prefix.
- The player never reads the word "keeper". It is the design's name for the player's character and means nothing on screen.

### The simulation

- The simulation never reads the clock, randomness, the DOM or any browser API. Time arrives through `advance`. Randomness, when it comes, is a seeded source passed in.
- The simulation only advances in fixed steps of `RitualSession.simulationStepSeconds`. A rule never multiplies by a frame's duration. A return after an absence lives through the time away in fixed steps of `absenceStepSeconds`.
- `FittedSavedState.ts` decides whether a saved state still fits the game. A new or renamed field is one more entry at the end of its `migrationsOldestFirst`, with a test that resumes a save from before it. A change it cannot see, such as a new meaning for an existing field, bumps `sessionStateVersion`.
- Every refusal is an `actionRefused` event with a reason. A handler never throws for a player mistake and never ignores a command silently.
- Every action on an item lists its checks with `wasRefusedByAnyOf` from `Ritual/ItemRefusals.ts`. The order is: the item is known, it is not burnt away, it is within reach, then whatever else the action needs. The heater, the thermostat and the tap check the keeper's place first.
- A check is a function of the draft that returns a refusal, with its reason and the values it logs, or `null`. A factory such as `isInAHand(itemId)` builds it for one item.
- A handler refuses directly only where it needs a value to go on, such as a vessel the room does not have or leaves on the spoon whose tea it does not know.
- Every action with the spoon or a cloth checks that it is in a hand, except soaking up a puddle, where the cloth lies on the surface. Offering checks that the keeper stands at the ritual place, and wiping that the keeper stands at a place with a puddle. A new action gets the same checks.
- An action that takes an item from where it lies, into a hand or onto the heater, calls `liftTheItem`. What lifting does to one kind is that kind's `takeIntoAHand` answer.
- `takeIntoTheCloth` in `Ritual/CleanupCommands.ts` is the only code that fills a cloth from a puddle. It caps what the cloth takes.
- Every id the simulation looks up in the catalog is checked by `problemsOpeningRoom` in `Definitions/CatalogProblems.ts`. A new reference between definitions gets a check there.
- `Ritual/WorldReport.ts` writes a detail line for each thing that is changing. A new living value gets a place in that report.
- A liquid carries its teas in `strengthByTeaId`, and every rule that makes or moves a liquid keeps them: `water` has none, `strengthenedBy` credits a tea, and `mixLiquids` and `splitLiquid` keep the blend. A judgement of a liquid takes its blend from `blendOf` in `Judgement/TasteJudgement.ts`, never one tea. A caddy is found through its room's `teaStock`, never by its id.

### The room

- `closeUpActionOn` in `RoomPlay.ts` is the one switch that says what a tap in a close-up does, whether it is done with the chosen item, and whether it is a control.
- A remark about a fact that only the room knows takes a `RoomRemarkKind` member and an entry in `remarksInOrder` in `RoomRemarks.ts`. It may also need a `HeardFact` member with its case in `describeFact`, and the call in `RoomPlay.ts` that reports the fact. A line about a ritual event is a case in `captionLinesOf` in `RoomTexts.ts`. Both need their lines in `EnglishTexts.ts`.
- Every value kept in the browser has its own store in `Apps/Game/Room/`, such as `AimHintStore.ts` for the aiming note. A store reaches the storage only through `BrowserStorage.ts`, and logs a read or a write that failed.
- `Views/RoomMaterials.ts` is the one place that decides how a surface looks. `lookBySurface` gives each surface its colour, its kind of material, and whether it is seen from both sides, so a new surface is one entry there.
- A surface chosen by a member of a union is a record keyed by that union in `Views/RoomMaterials.ts`, such as `surfaceByClothPattern`, `surfaceByCushionColour` and `surfaceByFigurineId`. A new member then does not compile until it has its surface.
- `colourOfACloth` gives a cloth its colour from its stain and its water. `plantMaterialFor` gives each part of a plant its colour from `colourByPlantSurface`, except a bloom, which takes its plant's colour from `GardenLayout.ts`.
- A new lamp is marked with `markAsGlowing` in `Views/RoomLayers.ts`, with a strength below 1 when what it shows must stay readable.
- Every invisible touch area is built with `touchAreaOf` in `Views/RoomLayers.ts`, and a model changes layers through `putOnLayer`.
- An item standing on furniture is turned by `turnOfItemAt` in `RoomLayout.ts`. Whatever places or draws it uses that turn.
- A new part of the frame gets a phase in `frameBudgetPhases` in `FrameBudget.ts`.

### Code

- Source files use only erasable TypeScript syntax: no enums, namespaces or constructor parameter properties. Relative imports end in `.ts`.
- Every decision writes a log line where it is taken: `note(draft, ...)` for the story, `noteDetail(draft, ...)` for frequent raw input such as tilt changes. `refuse` logs by itself, and its fourth argument holds only the values for the log.
- The room logs through `this.log`, `log` and `roomLog`. A view that can give up without drawing takes a log and says where it gave up, once per item, place or display when it runs every frame.
- The silent build for the artifact removes every call whose name is in `logFunctionNames` or `logMethodNamesOnThis` in `Scripts/silent-build.vite.config.mjs`, together with its text. A new way to log uses one of those names, or adds its name there.
- The simulation never writes to the console. `RitualSession` passes the lines to the `RitualLog` it was given.
- Text the player reads is not in the simulation. The simulation emits ids, and the presentation turns them into words. Every such word is a key and a value in `Apps/Game/Texts/EnglishTexts.ts`, read through `Texts.ts`.
- A text key is built from a typed union, such as `` `achievement.${id}.title` ``, so the type-check finds a missing text. A phrase is a list of at least one line in `englishPhrases`, and its key is typed the same way, such as `` `sip.${feeling}` ``.

## Tests

- A behaviour gets an integration test. A pure function gets a unit test once its numbers stop moving, such as a decision table, a camera pose or a gesture's arithmetic. A unit test file is named after the file it tests.
- Integration tests of the simulation run the real `RitualSession` over `Tests/Support/TestCatalog.ts`. Its round numbers make expected values checkable by hand.
- In `testCatalog`, vessels do not cool unless a test asks for cooling. Only the kettle's open lid changes how it cools, and it doubles the rate. Its room keeps everything at one place, so reach cannot fail there. A test of reach, places or lids uses `testHouseCatalog`, and a test with two cloths uses `withASecondCloth`. Its caddy holds `testGreen`, and a test of several teas adds caddies with `withMoreCaddies`, which names the tea of each.
- Content tests run the real catalog.
- Room tests in `Tests/Game/Room/` drive `RoomNavigator` and `RoomPlay` with taps and presses. `RoomPlay` runs over a real session in the default catalog's quiet room through `Tests/Support/TestRoom.ts`. There is one file for each feature of the room, and the folder is flat. `onTopOf` names a place on a piece of furniture from the quiet room's layout.
- `Tests/Game/Room/CarriedItems.integration.test.ts` builds the real Three.js model of every item and checks what every shape promises.
- End-to-end UI tests in `Tests/Browser/` play the built site with Playwright on iPhone WebKit and Android Chromium. They read the `[room]` and `[ritual]` lines from the console, so the game needs no test hooks.
- CI runs the scripts named in the README section "Deploy" on every push and on every pull request from a fork. It does not build the artifact.
