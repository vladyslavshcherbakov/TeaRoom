# Decisions

## Decisions and their reasons

**TypeScript for a mobile Safari game, Phaser for the presentation from 0.2.** The GDD names the stack, and a 2D diorama with sprites, tweens, particles and audio is what Phaser is for. Rejected: a native iOS app, because the target is the mobile browser. Rejected: a hand-written canvas renderer, because particles, tweens and audio would be rewritten from scratch.

**The simulation is a functional core with an imperative shell.** Commands and time go in, a new state and events come out, and nothing in `Shared/Simulation` knows about Phaser, the DOM or the clock. This keeps every rule testable without a browser, and lets AI-assisted changes to the presentation leave the rules alone. Rejected: game objects that hold their own state inside Phaser, because rules then live in sprites and cannot be tested headless.

**The architecture skills' MVVM is mapped, not copied.** A Phaser scene plays the view and the view model at once: it forwards gestures as commands and draws the state it is given. The presenter from those skills stays as a pure mapping from state to presentation cues (steam, sound level, colour), arriving in 0.2. Rejected: view models per object, because a game loop that redraws every frame has no binding problem for them to solve.

**Player decisions are commands, consequences are events.** One command per decision, one event per thing the presentation or the world memory must react to. This gives replays, logs for debugging, and the ritual history the world memory will be built from. Rejected: an event bus where objects call each other, because one action has many consequences and the order would be decided by subscription order.

**Content is data in a `Catalog`.** A new tea, vessel, heater, figurine or room is a definition, not code. Rejected: a class per tea, because every new tea would need new code and a new review of the rules.

**Fixed simulation step of 0.05 s.** Cooling and brewing are not linear in time, so integrating once per frame gives different results at 30 and 60 frames per second. Twenty steps a second is well below what a phone can compute and fine enough for the curves. Rejected: variable steps, because the same ritual would taste different on a slower phone.

**Cooling is applied before heating in a step.** Heating caps at boiling, so cooling after it would keep a working kettle forever just below 100 °C.

**A refused command is an event, not an exception.** A player trying to pour from a closed thermos is part of play, and the presentation answers it materially with a spring-back. Rejected: throwing, because a gesture would need a try block and a missed catch would stop the game.

**The gods judge the water when it meets the leaves, and the first drinkable sip, once per ritual.** Judging each heater switch-off would reward switching the heater on and off. The water that meets the leaves is the water the tea is made with. A sip that is too hot to drink is not judged, because the player is supposed to wait.

**No single moment costs the gods more than 3 points.** The GDD requires that mistakes lower the mood slightly and never reset it.

**Tests run on Node's built-in runner, with TypeScript run directly by Node.** The core needs no packages at all, and Node 22.18 strips types on its own. The only development packages are TypeScript for type-checking and `@types/node`. Rejected: Vitest, because it adds a toolchain for what `node --test` already does. It can come in with Vite in 0.2 if the presentation tests need it.

**The ritual bench is built with the TypeScript compiler alone.** It exists so 0.1 has something to open on a phone and a working Pages pipeline before Phaser arrives. `rewriteRelativeImportExtensions` turns the `.ts` imports into `.js` in the output. Rejected: waiting for 0.2 to set up hosting, because the pipeline would then be debugged together with the first renderer.

**GitHub Actions tests every push and deploys to Pages from the default branch.** The workflow reads the default branch from the event instead of naming `main`, so it keeps working if the default branch is renamed. Action versions are the Node 24 majors (`checkout@v5`, `setup-node@v5`, `upload-pages-artifact@v5`, `deploy-pages@v5`), because GitHub is removing the Node 20 runtime from its runners in September 2026.

**No lockfile yet.** The environment that created the repository could not reach the npm registry. CI uses `npm install` until a lockfile is committed, then switches to `npm ci`.

**No haptics on iPhone.** iOS Safari does not implement the Vibration API, and the checkbox-switch workaround is reported to stop working from iOS 26.5. Haptics stay a progressive enhancement for browsers that have the API.
