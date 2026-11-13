# Contributing

How the Teahouse on the Pass is built and how to change it, seen from above. The README says what the game is and holds every command. `docs/game.md` says how the game behaves. ROADMAP.md holds the next tasks and the open questions. Reasons live in the bodies of the commits.

## Done

- A change is done when CI is green on its commit. CI runs both type-checks, every test and the build on every push that can change the game. A push of only what `paths-ignore` in the workflow lists, such as documents and the artifact's scripts, runs no CI and is done once pushed. The artifact build is not part of it: the agent that publishes the artifact runs it.
- Before a push, run only the checks that the change can break, and leave the rest to CI. The README section "Test" has a command for each check.

| The change | Run before the push |
|---|---|
| Only documents | Nothing. |
| Texts, a picture, a setting, a constant, a move or a rename | The type-check, and the test files that name what changed. |
| A rule, a decision or arithmetic, in `Shared` or in `Apps/Game/Presentation` | The test files of that feature while you work, then `Scripts/test.sh` once. |
| Drawing in `Apps/Game/Teahouse/Rendering/` | The type-check. |

- Every change to a source or test file also runs `CodeConventions`, `ImportCycles`, `GameLogicBoundary` and `EngineBoundary` in `Tests/Game/`.
- A screenshot answers one question about a new or changed look that no test sees. Choose the moment first, then take one shot.
- The build runs locally only when the change touches `index.html`, the styles, the pictures or the Vite configuration. The type-check catches the rest of what the build would.
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
| `Apps/Engine` | The engine in the browser: stores, settings, texts, barks, achievements, the page's controls and sound in `Audio/`. | — |
| `Shared/GameLogic` | The teahouse's world and its rules, given to the engine's session. Commands and time go in, the world changes and events come out. It knows no browser, no clock and no text. | `TeahouseSession`, reached from outside only through `GameLogic.ts` |
| `Shared/Content` | The teas, bowls and pets, and the visits of each story, as data in a `TeahouseCatalog`. A visit names its lines by key. | `DefaultCatalog.ts` |
| `Apps/Game/Presentation` | What the page shows of the state: the beats to read, the choices, the whisper, and the scene. Pure. | `MomentPresenter.ts`, `ScenePresenter.ts` |
| `Apps/Game/Texts` | Every word the player reads, as a key and a value. | `RussianTexts.ts` |
| `Apps/Game/Teahouse` | The page: the view model, the drawing in SVG and DOM in `Rendering/`, the pictures in `Art/`. | `TeahouseMain.ts` |

Dependencies point towards `Shared/GameLogic`, and everything may use the engine, which uses nothing of the game. No word of the tea game appears in the engine, and `Tests/Game/EngineBoundary.integration.test.ts` checks both. The root `tsconfig.json` checks `Shared` without the browser's types.

### The engine

The world is one plain object, and the game defines its shape. Only commands and systems change the world, and they change it in place. A refusal undoes nothing: a rule refuses before its first change.

- A command goes through the command book. Its rule checks it, then carries it out or refuses it with a reason.
- A system of the fixed step changes the world as time passes. `Session` runs the game's systems once a step.

Commands and systems write events, and the session returns them. A game gives `Session` its `GameRules`. It gives `levelOpening` its checks of the content.

### The game logic

`Definitions/` holds the content's types, `State/` the state, `Judgement/` pure decisions, and `Simulation/` the commands, their rules, the systems of the fixed step in `Systems.ts` and `TeahouseSession`.

An evening is one `Phase` at a time: dusk, the guest speaks, the four steps of brewing, talking, parting, feeding, night. Every command names the phase it needs and is refused in any other. The kettle heats and the leaf steeps in systems of the fixed step.

A talk is data. A visit has exchanges, an exchange has replies, and a reply has outcomes, each with a condition over what the guest carries. The first outcome whose condition holds is heard. It changes feelings, teaches facts, and leads to the next exchange or to an ending. An ending names tomorrow's visit, rumour and window.

### The page

`TeahouseMain` alone builds the page: it opens the session, creates the view model and wires `Rendering/`. `TeahouseViewModel` sends one command for each decision of the player, advances time once a frame, and keeps which beat of the moment is being read. The presenters turn the state into a view state, and `Rendering/` only shows it and reports taps and holds by what happened. The page never writes the state.

The scene is one SVG of 800 by 600. Every picture is a separate SVG file in `Art/` drawn to an agreed box, and `RoomView` and `TableView` hold the boxes.

## Adding a kind of thing

- **A visit**: its definition in `Shared/Content/Stories/<Story>/`, its member in `DefaultCatalog.ts`, its lines in `Apps/Game/Texts/Russian/`, and a portrait in `Art/` for every mood it names. The game refuses to open in development when a line or a definition that the catalog names is missing.
- **An ending**: its definition in the visit, with tomorrow's visit, rumour and window view, and its row in `docs/game.md`.
- **A tea, a bowl or a pet**: its definition in `Shared/Content/Brewing.ts`, its name and hint in `InterfaceLines.ts`, and its picture in `Art/`, named `jar-`, `bowl-` or `pet-` with its id.
- **A kind of condition**: its member in `Condition`, and the compiler asks for its answer in `ConditionJudgement.ts`.
- **A phase of the evening**: its member in `Phase`, and the compiler lists the presenters that must answer for it. Its commands go in `Simulation/` and in `CommandBook.ts`.
- **A mechanic**: first answer who acts on what, when it is available, which gesture starts it, what the player sees while it lasts, when it is done, what an early lift or an interruption does, what a clumsy try produces, and what lingers after. Then its decisions in `Judgement/`, a command with its events and its rule, and its rule in `docs/game.md`. The steep is the mechanic to copy.
- **A picture**: one SVG in `Art/`, plain SVG 1.1 with a viewBox and no script, text, filter or outside reference, drawn to the box that the view gives it.
- **A piece another game would need too**: it goes to `Shared/Engine` or `Apps/Engine` in the engine's words, and the tea game gives it what is about tea.

## Policies

### The world

- Time arrives in fixed steps of the world, never by a frame's duration. Nothing in the rules is random.
- A refused command is an event with a reason, never an exception and never silence.
- Every decision writes a log line where it is taken.
- The feelings and facts of a story live in the state and last through its visits.
- Before the first release no save is migrated.

### The page

- The game logic and the content emit ids and line keys, and the presentation turns them into words.
- Every text, name and choice arrives finished in the view state. A view builds no text and compares no state.
- Every value kept in the browser has its own store with a decoder. It is a convenience: the game works when the storage is gone.
- A new way to log uses a name that the silent build of the artifact knows.

### The code

- Source files use only erasable TypeScript syntax. Relative imports end in `.ts`.
- A closed set answers for its members. Code never compares with one member to decide what runs.
- A type that two files name has its own file, and no two files import each other.
- `Tests/Game/CodeConventions.integration.test.ts`, `ImportCycles` and `GameLogicBoundary` read the source files, and a failing one names the convention it guards.

## Rules the code cannot show

- The user decides, and only the user changes: the wording of every line the player reads once the user has accepted it, and the drawn style.
- The first target is mobile Safari: no Vibration API, and sound only as Opus in WebM.
- Vite and TypeScript stay pinned in `package.json`, and an update of one of them is a commit of its own.
- Sound unlocks on pointerup, touchend, click and keydown, never on pointerdown, and Web Audio sets an audio element's loudness, never its `volume`: `Audio/SoundBoard.ts`.
- `Apps/tsconfig.json` keeps its own empty `exclude`.
- The workflow's actions stay on their Node 24 majors.
- Screenshots and scratch output stay outside the repository, and files are staged by name.

## Tests

- A behaviour gets an integration test. A pure function gets a unit test once its numbers stop moving.
- The tests of the game logic and of the presenters are the next task in ROADMAP.md. Until then `Tests/` holds the tests of the engine and of the conventions.
- CI runs the scripts named in the README section "Deploy" on every push and pull request.
