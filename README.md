# Tea Room

A small, calm ritual game for the mobile browser. You heat water, brew tea, pour it, offer some to the tea figurines, taste it, tidy up and stay for a while. Nothing is won or lost.

The design is in [docs/game-design.md](docs/game-design.md). The plan up to 1.0 is in [docs/roadmap.md](docs/roadmap.md).

## Status

Version 0.1: the simulation core and a debug page, the ritual bench, that drives it. There is no art or sound yet.

## Project layout

| Path | What it holds |
|---|---|
| `Shared/Simulation/` | The rules of the world: definitions, state, physics, judgements, commands and events. Imports nothing outside itself. |
| `Shared/Content/` | Teas, vessels, heaters, figurines and rooms as data. |
| `Apps/Bench/` | The ritual bench: a debug page over the simulation. |
| `Tests/` | Integration and unit tests, mirroring `Shared/`. |
| `docs/` | How the game behaves. |

## Requirements

Node.js 22.18 or newer. It runs TypeScript directly, so the tests need no build step.

## Test

```sh
npm install
./test.sh
```

`test.sh` type-checks everything and runs every test with Node's built-in test runner.

## Build and run locally

```sh
./build.sh
npx http-server dist
```

`build.sh` compiles the bench and the simulation into `dist/`. Open the printed address on a phone on the same network to try it.

## Deploy

GitHub Actions runs `.github/workflows/test-and-deploy.yml` on every push and pull request: install, `./test.sh`, `./build.sh`. On a push to the default branch it publishes `dist/` to GitHub Pages.

Pages must be enabled once in the repository settings: Settings → Pages → Build and deployment → Source: GitHub Actions.
