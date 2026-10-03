# Contributing

How Tea Room is built and how to change it, seen from above. The README says what the game is and holds every command. `docs/` says how the game behaves, and `docs/world-bible.md` holds the lore and the secrets the game grows from: read it before you design a new feature. ROADMAP.md holds the next tasks and the open questions. Reasons live in the bodies of the commits.

## Done

- A change is done when CI is green on its commit. CI runs every check on every push that can change the game: both type-checks, every test, the build and the UI tests on both browsers. A push of only what `paths-ignore` in the workflow lists, such as documents and the artifact's scripts, runs no CI and is done once pushed. The artifact build is not part of it: the agent that publishes the artifact runs it.
- Before a push, run only the checks that the change can break, and leave the rest to CI. The README section "Test" has a command for each check.

| The change | Run before the push |
|---|---|
| Only documents | Nothing. |
| Texts, a setting, a constant, a move or a rename | The type-check, and the test files that name what changed. |
| A rule, a decision or arithmetic, in `Shared` or in `Apps/Game/Room` outside `Rendering/` | The test files of that feature while you work, then `Scripts/test.sh` once. |
| Drawing in `Rendering/` | The type-check, and the test files that name what changed. |
| The UI tests, their support files, or the gestures, picking and `Host` they drive | The type-check and the UI project that the change touches. |

- Every change to a source or test file also runs `CodeConventions`, `ImportCycles`, `GameLogicBoundary` and `EngineBoundary` in `Tests/Game/`.
- A UI test runs locally only for the last row, or to find the cause of a CI failure.
- A screenshot answers one question about a new or changed look that no test sees, such as a shape, a material or a pose. Choose the pose first, then take one shot.
- The build runs locally only when the change touches `index.html`, the styles or the Vite configuration. The type-check catches the rest of what the build would.
- After a push, look at CI once, when it has finished.
- Every new rule has an integration test.
- A bug fix comes with a test that fails without the fix.
- A commit holds one whole change: its code, its tests, and every line of the README, `docs/`, CONTRIBUTING.md and ROADMAP.md that the change makes true or false. A piece found missing after the commit is amended into it before the push, and never follows it as a commit of its own.
- A push carries only finished commits, and one push may carry several.
- A commit message says what the change does. A reason in it is one the user gave or a fact that someone measured. It holds no judgement of the user's work and no motive the user did not state.
- A change that finishes a task of ROADMAP.md removes the task.

## The layers

| Layer | What it is | Its entry point |
|---|---|---|
| `Shared/Engine` | The simulation of any game: the session that runs a game's rules, the command book, the systems of the fixed step, the tables of components, saves, the report and the catalog. It knows no game and no browser. | `Session.ts` |
| `Apps/Engine` | The engine in the browser: input, the camera and walking, stores, settings, texts, barks, achievements, the page's controls, sound in `Audio/`, and in `Rendering/` the host, layers, looks, glow, picking and levels of detail over Three.js. | `Rendering/Host.ts` |
| `Shared/GameLogic` | The tea game's world and its rules, given to the engine's session. Commands and time go in, the world changes and events come out. It knows no browser, no clock and no Three.js. | `TeaSession`, reached from outside only through `GameLogic.ts` |
| `Shared/Content` | The teas, vessels, heaters, figurines and rooms, as data in a `Catalog`. | `DefaultCatalog.ts` |
| `Apps/Game/Presentation` | What the room shows of the state: fill, colour, steam, the look of each tea, the feeling of a sip. | `WorldPresenter.ts` |
| `Apps/Game/Texts` | Every word the player reads, as a key and a value. | `EnglishTexts.ts` |
| `Apps/Game/Room` | The walkable room in Three.js: taps, walking, the camera, the models and the controls on the page. | `RoomMain.ts` |

Dependencies point towards `Shared/GameLogic`, and everything may use the engine, which uses nothing of the game. No word of the tea game appears in the engine, and `Tests/Game/EngineBoundary.integration.test.ts` checks both. The root `tsconfig.json` checks `Shared` without the browser's types.

### The engine

The simulation is neither an entity-component system nor a tree. The world is one plain object, and the game defines its shape. Many things of one kind live in tables of components keyed by an entity id, and `World.ts` queries across the tables. The rest of the world is plain fields.

Only commands and systems change the world, and they change it in place. A refusal undoes nothing: a rule refuses before its first change.

- A command goes through the command book. Its rule checks it, then carries it out or refuses it with a reason.
- A system of the fixed step changes the world as time passes. `Session` runs the game's systems once a step, and with a longer step through an absence.

Commands and systems write events, and the session returns them. A game gives `Session` its `GameRules`: the command book, the systems, the length of a step and of an absence step, and the report's reporters. It gives `levelOpening` its checks of the content and `fittedSave` its save format.

The browser side is a tree: the scene graph of Three.js. `Host` owns the renderer and the loop of frames. It gives the game's frame the real time and the world time, and draws the passes that the game declares in `Layers`. `Picking` finds what a finger touched.

### The game logic

`Definitions/` holds the content's types, `State/` the state, `Chemistry/` pure arithmetic of liquids, heat and brewing, `Judgement/` pure decision tables, and `Simulation/` the commands, their handlers, the systems of the fixed step in `Systems.ts` and `TeaSession`.

The room opens or resumes a session, sends one command for each decision of the player, advances time once a frame, draws the state and reacts to the events. It never writes the state. To know whether something would be refused, it asks the session and does not repeat a rule.

### The room

A tap travels like this. `RoomScene` draws the room and hands every press to `TouchInput`, which tells a tap from a stroke, a pinch or a hold. `PlayerController` decides what the press means in its current mode, such as free, choosing from a menu, aiming a pour or looking closely. A tap on a thing opens a menu of the actions that the session would not refuse, and a chosen action sends its commands to the session. `RoomVisit` turns the events into what the player says, the achievements, the saved visit and the death screen.

The files of `Apps/Game/Room` outside `Rendering/` decide, import neither Three.js nor `Rendering/`, and are tested in Node. `RoomMain` alone builds the room and wires `Rendering/`, where `RoomScene` draws it. The root holds the entry points: `RoomMain`, `PlayerController`, `RoomVisit`, the session's port, the modes, the menu and the settings. Their parts are in `Input/`, `Gestures/`, `Layout/`, `Shapes/`, `NewGame/`, `Stores/`, `Reactions/`, `Shown/`, `Screen/`, `Sounds/` and `Debug/`. `Rendering/` only draws what they decided and reports what the finger did. `Camera/` holds the camera, and the engine walks the floor.

## Adding a kind of thing

Most kinds of thing are closed sets: a union or a record keyed by one. Add the member, and the compiler lists every place that must answer for it. The flows below name only what the compiler cannot find.

- **Content**, such as a tea, a tea bowl, a figurine or a room: its definition in `Shared/Content`, and its look in the room. The content tests run every definition of the real catalog.
- **A mechanic**: first answer who acts on what, when it is available, which gesture starts it, what the player sees and hears while it lasts, when it is done, what an early lift or a change of mind does, what a clumsy try produces, and what lingers after. Then its arithmetic in `Chemistry/`, its decisions in `Judgement/`, a command with its events and its rule in `Simulation/CommandBook.ts`, and its rule in `docs/game-logic.md`. In the room it needs a tap target, its action in the menu, and its gesture in `docs/interactions.md`. Pouring is the mechanic to copy, and the sink is the feature of the room to copy.
- **A kind of carried item**, beside a vessel, the spoon and a cloth: start at `Simulation/ItemKinds.ts`. The compiler does not list where it is held and found in `State/WhereItemsAre.ts`, the check of its place in `CatalogProblems.ts`, or its lines in `WorldReport.ts`.
- **A shape of carried item**, such as a teapot: start at `CarriedShapes.ts`. The compiler does not list the places that treat a shape as a role, so search for `carriedShapeOf`. `CarriedItems.integration.test.ts` checks what every shape promises.
- **A system of the fixed step**, something the world does by itself as time passes: a function of the draft and the seconds in `Simulation/Systems.ts`, placed in `teaSchedule` where its order matters, and a line in `WorldReport.ts` for what it changes.
- **A piece another game would need too**, such as a kind of input, a service or a way to draw: it goes to `Shared/Engine` or `Apps/Engine` in the engine's words, and the tea game gives it what is about tea.
- **A secret of the world**: game logic. Its condition reads the state, its trace is an event, and what it remembers is saved in `SessionState` and lived through during an absence. Its engine in `Shared/Engine` comes with the first secret.
- **An action in the menu**: its member in `ActionMenu.ts`, its words in `EnglishTexts.ts`, and the list in `PlayerController` that offers it when `wouldRefuse` finds no refusal.
- **A setting, an achievement, a bark, a button on the screen or a mode of `PlayerController`**: add the member to its closed set, and the compiler lists the rest.
- **A model from outside**, such as the sparrow: one GLB in `Apps/Game/Room/Models/`, its colours baked into vertex colours and no image in it, loaded through the engine's `Rendering/AnimatedModel.ts` by a model in `Rendering/`, which gives it its name, file, height and what is its own. Its author's credit, when its licence asks for one, goes in the debug menu.
- **A sound**: its file in `Apps/Game/Room/Sounds/`, Opus in WebM, as small as it can be without an audible loss: 64 kbit/s, or 40 kbit/s in mono when the source has no stereo, and lower only while no difference can be heard. Only the silence at its start is cut, and only when the user asks. Its gain is the strictest of three limits: −24 LUFS on average, −18 LUFS for its loudest 400 ms, and a peak of −1.5 dB. Its member goes in `RoomSounds.ts`. The compiler then asks for its line in `RoomSoundFiles.ts`. A sound that lasts is decided in `soundsLastingIn`, and a sound of a moment is started where its moment is decided.

## Policies

### The world

- Time arrives in fixed steps of the world, never by a frame's duration. Randomness, when it comes, is a seeded source passed in.
- A refused command is an event with a reason, never an exception and never silence.
- Every decision writes a log line where it is taken. The game logic collects its lines, and `TeaSession` passes them to the log it was given.
- An item's place lives only in its `location`, a liquid carries the teas it is made of, and a caddy is found through its room's content.
- Before the first release no save is migrated: a save that does not fit the game starts the visit over.

### The room

- The game logic emits ids, and the presentation turns them into words. A text key is built from a typed union. A line the player may hear more than once has several variants.
- Everything the player says is a bark, the short line of a character that games call so, earned by an event of the simulation or by a fact only the room knows.
- Every value kept in the browser has its own store with a decoder. It is a convenience: the game works when the storage is gone.
- `Rendering/RoomLayers.ts` declares the passes, and `roomLayers` decides in which pass a thing is drawn and whether it takes taps. Only the engine's `Rendering/Layers.ts` sets a layer.
- A new way to log uses a name that the silent build of the artifact knows.

### The code

- Source files use only erasable TypeScript syntax. Relative imports end in `.ts`, in `.webm` for a sound, or in `.glb?url` for a model.
- A closed set answers for its members. Code never compares with one member to decide what runs.
- A word of the tea game names only the tea game: "ritual" only the tea ritual, "chemistry" the tea game's liquids, heat and brewing.
- A type that two files name has its own file, and no two files import each other.
- `Tests/Game/CodeConventions.integration.test.ts`, `ImportCycles` and `GameLogicBoundary` read the source files, and a failing one names the convention it guards.

## Rules the code cannot show

- The user decides, and only the user changes: the game's version in `GameVersion.ts`, the touch area's size in `smallestTouchAreaPixels`, the paintings on the bowls and the thermos, the parts of the book of instructions, the player's starting height, achievements shown at first, the rules of Sommelier, Gourmet and The Usual, Please, the heater's switch that never takes over from the thermostat, and debug settings that outlast a new game.
- The first target is mobile Safari: no Vibration API, and sound only as Opus in WebM, which it plays from iOS 17.5 and macOS 15.4.
- Three.js, Vite and TypeScript stay pinned in `package.json`, and an update of one of them is a commit of its own. `@playwright/test` stays at the version whose Chromium the agent's environment has.
- Only `nextHeaterMode` changes the heater's mode. Only `takeLiquidFrom` and `emptyTheVessel` lower what a vessel holds, apart from boiling away.
- Nothing is drawn through anything else. Every spot a thing is drawn at comes from `Placement.ts` or is checked against what stands there, and a new spot is checked in a close-up next to its neighbours.
- Every model and every look is built by a function from its data, with nothing taken from a running game.
- The setting for the glow names only lamps, never hot metal.
- The sparrow's credit, under CC BY 4.0, stays in the debug menu with its links.
- A warm-up of the shaders draws through `RoomScene`'s `render()`, shadow map first.
- A sun that moves during play joins the shadow pose in `RoomScene`'s `render()`.
- The garden in `Rendering/Garden.ts` stays instanced, simple and without shadows.
- The invisible touch areas keep a layer of their own in `RoomLayers.ts`.
- Sound unlocks on pointerup, touchend, click and keydown, never on pointerdown, and Web Audio sets an audio element's loudness, never its `volume`: `Audio/SoundBoard.ts`.
- A material in `MaterialCache` depends only on its key. A look that comes to depend on something that changes adds it to the key.
- Nothing frees a model's resources. The first mechanic that removes a model gives the model a record of its resources in `Host`, frees the record in one call, and adds a browser test that rebuilds the model twice and compares the counts.
- `Scripts/silent-build.vite.config.mjs` removes the call of `exposeTheProbe` by its name.
- `Apps/tsconfig.json` keeps its own empty `exclude`.
- The workflow's actions stay on their Node 24 majors. The browsers' cache key comes from `playwright install --dry-run`, never from `browsers.json`.
- Screenshots and scratch output stay outside the repository, and files are staged by name.

## Tests

- A behaviour gets an integration test. A pure function gets a unit test once its numbers stop moving.
- The game logic is tested through `Tests/Support/TestTeaSession.ts` over a test catalog with round numbers, content over the real catalog, and the room through `Tests/Support/TestRoom.ts`, which taps and presses the real play over the quiet room.
- The performance tests in `Tests/Performance/` measure only this project's code, never Three.js or the browser, each against a budget written as a number with room for a busy machine.
- The browser tests in `Tests/Browser/` play the built site on iPhone WebKit and Android Chromium and read the log lines from the console.
- CI runs the scripts named in the README section "Deploy" on every push and pull request.
