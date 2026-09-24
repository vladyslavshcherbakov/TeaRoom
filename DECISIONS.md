# Decisions

## Decisions and their reasons

**TypeScript for a mobile Safari game, Phaser for the presentation from 0.2.** The GDD names the stack, and a 2D diorama with sprites, tweens, particles and audio is what Phaser is for. Rejected: a native iOS app, because the target is the mobile browser. Rejected: a hand-written canvas renderer, because particles, tweens and audio would be rewritten from scratch.

**The simulation is a functional core with an imperative shell.** Commands and time go in, a new state and events come out, and nothing in `Shared/Simulation` knows about Phaser, the DOM or the clock. This keeps every rule testable without a browser, and lets AI-assisted changes to the presentation leave the rules alone. Rejected: game objects that hold their own state inside Phaser, because rules then live in sprites and cannot be tested headless.

**The architecture skills' MVVM is mapped, not copied.** A Phaser scene plays the view and the view model at once: it forwards gestures as commands and draws the state it is given. The presenter from those skills stays as a pure mapping from state to presentation cues (steam, sound level, colour), arriving in 0.2. Rejected: view models per object, because a game loop that redraws every frame has no binding problem for them to solve.

**Player decisions are commands, consequences are events.** One command per decision, one event per thing the presentation or the world memory must react to. This gives replays, logs for debugging, and the ritual history the world memory will be built from. Rejected: an event bus where objects call each other, because one action has many consequences and the order would be decided by subscription order.

**Content is data in a `Catalog`.** A new tea, vessel, heater, figurine or room is a definition, not code. Rejected: a class per tea, because every new tea would need new code and a new review of the rules.

**Fixed simulation step of 0.05 s.** Cooling and brewing are not linear in time, so integrating once per frame gives different results at 30 and 60 frames per second. Twenty steps a second is well below what a phone can compute and fine enough for the curves. Rejected: variable steps, because the same ritual would taste different on a slower phone.

**Cooling is applied before heating in a step.** Heating caps at boiling, so cooling after it would keep a working kettle forever just below 100 °C.

**The simulation logs every decision, and the presentation decides where the lines go.** Events say what happened. The log says why: the temperature a judgement was made at, the value a refusal was decided on, what a pour left behind. Handlers collect lines in the draft, so the core stays free of side effects, and `RitualSession` writes them to an injected `RitualLog`. Each line carries the simulated time to the millisecond, and the sink adds the wall-clock time. The bench shows the log on the page, because Safari's console on an iPhone needs a Mac to open. Rejected: logging from the presentation by reading events, because the presentation never sees the values that decided the outcome.

**Broken content is caught before a room opens: loudly in development, quietly for players.** A definition that names a missing heater, vessel, figurine or tea is a developer's mistake no player can fix. `RitualSession.open` checks the whole catalog first. A development build throws with every problem listed, so the mistake cannot be missed. A player's build logs each problem at error level and returns `unavailable`, and the presentation shows a quiet screen instead of crashing mid-ritual. Rejected: throwing from `definitionIn` in a player's build, because the game would stop at the first lookup with nothing on screen.

**Touches become commands in one class that does not know Phaser.** `TableTouches` receives touches in scene coordinates and sends commands to the session. The scene forwards pointer events and paints. This keeps every gesture rule testable in Node with a real session, and the bugs a gesture can have (a vessel jumping away from the finger, a pour starting by accident) are caught by tests instead of by playing. Rejected: gesture logic inside Phaser input handlers, because it could only be checked in a browser.

**Pouring is a press from above.** One finger has to both carry the vessel and tilt it. Over a target the vessel stops at a hover line, and pressing further down tilts it. A pour only starts when the vessel reached the target from above, so carrying a bowl past the kettle on the way to the viewer pours nothing. Rejected: a separate tilt control, because it breaks the one-hand, one-object feel the GDD asks for.

**A refused command is an event, not an exception.** A player trying to pour from a closed thermos is part of play, and the presentation answers it materially with a spring-back. Rejected: throwing, because a gesture would need a try block and a missed catch would stop the game.

**The gods judge the water when it meets the leaves, and the first drinkable sip, once per ritual.** Judging each heater switch-off would reward switching the heater on and off. The water that meets the leaves is the water the tea is made with. A sip that is too hot to drink is not judged, because the player is supposed to wait.

**No single moment costs the gods more than 3 points.** The GDD requires that mistakes lower the mood slightly and never reset it.

**Tests run on Node's built-in runner, with TypeScript run directly by Node.** The core needs no packages at all, and Node 22.18 strips types on its own. The only development packages are TypeScript for type-checking and `@types/node`. Rejected: Vitest, because it adds a toolchain for what `node --test` already does. It can come in with Vite in 0.2 if the presentation tests need it.

**The ritual bench stays next to the game.** It drives the simulation with plain controls and shows the log on the page, which is the quickest way to check a rule on a phone without playing through the scene.

**GitHub Actions tests every push and deploys to Pages from the default branch.** The workflow reads the default branch from the event instead of naming `main`, so it keeps working if the default branch is renamed. Action versions are the Node 24 majors (`checkout@v5`, `setup-node@v5`, `upload-pages-artifact@v5`, `deploy-pages@v5`), because GitHub is removing the Node 20 runtime from its runners in September 2026.

**Phaser and Vite are pinned to exact versions, and CI installs from the lockfile.** A game's feel depends on the renderer's timing and input handling, so an update is a deliberate change with its own commit, not a side effect of a fresh install. Phaser is 4.x, the current major, whose API is close to 3.x and whose types ship in the package.

**Both pages are built by Vite.** The game at the root of the site and the bench under `/bench/` are two Vite builds from `build.sh`, with no config file: the command line says everything. `import.meta.env.DEV` tells the game whether it is a development build. Rejected: building the bench with the TypeScript compiler alone, because two build tools for two pages would be two pipelines to keep working.

**No haptics on iPhone.** iOS Safari does not implement the Vibration API, and the checkbox-switch workaround is reported to stop working from iOS 26.5. Haptics stay a progressive enhancement for browsers that have the API.
