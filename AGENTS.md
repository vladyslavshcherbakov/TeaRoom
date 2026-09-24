# Agent instructions

> Before changing anything described here, read its entry in DECISIONS.md.

## Workflow

Commits: yes, without asking, on the working branch. Push: only the branch named for the session. Force-push and history rewrites: ask every time.

Done means `./test.sh` and `./build.sh` both pass locally, and every new rule has an integration test.

The README has the commands. CI runs the same two scripts.

## Architecture

Layers: `Shared/Simulation` (the rules, imports nothing outside itself) ← `Shared/Content` (data) ← `Apps/*` (presentation). Dependencies point toward `Shared/Simulation`.

Apps: `Apps/Game` is the Phaser game, `Apps/Bench` the debug page. Both are type-checked by `Apps/tsconfig.json` and built by Vite from `build.sh`. In the game, `Table/TablePresenter.ts` is the only place that turns state into what is drawn, and the scene reads its `TableViewState` every frame. `Table/Touch/TableTouches.ts` is the only place that turns touches into commands, and it owns where each object is while it is held. `Table/TableLayout.ts` holds every position and size in scene coordinates. `TableScene.ts` only forwards pointer events, paints, and shows menus and reactions.

Inside the simulation:

- `Definitions/` are the content types and the `Catalog`. Look definitions up with `definitionIn`.
- `State/` is the mutable-inside, readonly-outside `SessionState`.
- `Physics/` holds pure functions over small values: liquid, heat, pouring, brewing, table.
- `Judgement/` holds pure decision tables: water, taste, offering, the gods.
- `Ritual/` holds commands, events and handlers, the fixed-step `SimulationStep`, and `RitualSession`, the only object a presentation talks to.

A presentation opens a room with `RitualSession.open(catalog, roomId, log, isDevelopmentBuild)`, shows a quiet screen when the room is `unavailable`, calls `session.dispatch(command)` for each player decision and `session.advance(seconds)` once per frame, renders `session.state`, and reacts to the returned events. It never writes state.

Adding content (a tea, a vessel, a figurine, a room):

1. Add the definition to the matching file in `Shared/Content/` and register it in `DefaultCatalog.ts`.
2. Run the tests. `Tests/Content/DefaultCatalog.unit.test.ts` runs `problemsOpeningRoom` over every room, and `Tests/Content/TeaBalance.integration.test.ts` brews every tea by the book.

Adding a mechanic:

1. Add its fields to the definition types if content varies it, and to `SessionState` if the world must hold it.
2. Put its arithmetic in `Physics/` and its decisions in `Judgement/` as pure functions.
3. Add the command to `Command.ts`, the events and refusal reasons to `RitualEvent.ts`, a handler in the matching `*Commands.ts`, and the case in `ApplyCommand.ts`. Add continuous behaviour to `SimulationStep.ts`.
4. Allow or refuse it per phase in `PhaseRules.ts`.
5. Write integration tests through `TestRitual` in `Tests/Simulation/`.
6. Describe the rule in `docs/simulation.md` and the gesture in `docs/interactions.md`.

Reference mechanic: pouring (`Physics/Pouring.ts`, `Ritual/PouringCommands.ts`, `SimulationStep.continuePour`, `Tests/Simulation/Pouring.integration.test.ts`).

External dependencies: Phaser for the game, pinned in `package.json`. Vite, TypeScript and `@types/node` for development. The simulation imports none of them.

## Rules nothing checks

- The simulation never reads the clock, randomness, the DOM or any browser API. Time arrives through `advance`. Randomness, when it comes, is a seeded source passed in.
- The simulation only advances in fixed steps of `RitualSession.simulationStepSeconds`. A rule that multiplies by the frame's duration breaks frame-rate independence.
- Every refusal is an `actionRefused` event with a reason. A handler never throws for a player mistake and never ignores a command silently.
- A gods judgement that should happen once per ritual is guarded by `godsJudgementsMade`.
- Source files use only erasable TypeScript syntax: no enums, namespaces or constructor parameter properties. Relative imports end in `.ts`. Node runs the files as they are.
- Every id the simulation looks up in the catalog is checked by `problemsOpeningRoom` in `Definitions/CatalogProblems.ts` before a session opens. A new reference between definitions gets a check there, otherwise `definitionIn` throws in front of a player.
- Every decision writes a log line where it is taken, with the values that decided it and the ids involved: `note(draft, ...)` for the story, `noteDetail(draft, ...)` for frequent raw input such as tilt changes. `refuse` logs by itself. An early return that skips a decision says so in a line. The simulation never writes to the console: `RitualSession` passes the lines, prefixed with simulated time to the millisecond, to the `RitualLog` it was given.
- Text the player reads is not in the simulation. The simulation emits ids such as remark names, and the presentation turns them into words.

## Conventions

- File names are the name of their main export, in PascalCase.
- The product says "tea bowl" for the drinking vessel in content and "cup" in the simulation's generic commands (`tasteCup`, `offerCup`).
- Test names are `subject_condition_outcome`.

## Tests

End-to-end UI tests in `Tests/Browser/` play the built site with Playwright and read the ritual log from the console, so the game needs no test hooks. Gesture tests in `Tests/Game/Table/` drive `TableTouches` with a `Finger` over a real session.

Integration tests run the real `RitualSession` over `Tests/Support/TestCatalog.ts`, whose round numbers make expected values checkable by hand. Its vessels do not cool unless a test asks for cooling. Content tests run the real catalog. Unit tests are written only for a decision table that has stopped moving.

CI runs `./test.sh` on every push and pull request.

## Open questions

- Which languages the game's text ships in. Owner: the user.
- Whether a separate teapot joins the MVP, or the kettle stays the brewing vessel. Owner: the user.
- Where the kettle's water comes from. In 0.1 it starts filled. Owner: the user.
- Whether the bench stays published after 1.0. Owner: the user.
