# Tea Room

A small, calm ritual game for the mobile browser. You heat water, brew tea, pour it, offer some to the tea figurines, taste it, tidy up and stay for a while. Nothing is won or lost.

Play it on a phone: <https://vladyslavshcherbakov.github.io/TeaRoom/>. The ritual bench, a debug page over the simulation, is at <https://vladyslavshcherbakov.github.io/TeaRoom/bench/>.

The design is in [docs/game-design.md](docs/game-design.md). The plan up to 1.0 is in [docs/roadmap.md](docs/roadmap.md).

## Status

Version 0.3 is done: the walkable 3D room with the whole ritual, from filling the kettle at the tap to wiping the tea table. The simulation and the ritual bench from 0.1 are done.

## Project layout

| Path | What it holds |
|---|---|
| `Shared/Simulation/` | The rules of the world: definitions, state, physics, judgements, commands and events. Imports nothing outside itself. |
| `Shared/Content/` | Teas, vessels, heaters, figurines and rooms as data. |
| `Apps/Game/Room/` | The walkable room in Three.js: layout, paths, camera and models. Served at the site's root. |
| `Apps/Game/Table/` | The presenter that turns the ritual's state into what vessels show, how each tea looks, and the tea's texts. |
| `Apps/Game/Texts/` | Every text the player reads, as keys and values. |
| `Apps/Bench/` | The ritual bench: a debug page over the simulation. |
| `Tests/` | Integration, unit and browser tests, mirroring `Shared/` and `Apps/`. |
| `docs/` | How the game behaves. |

## Requirements

Node.js 22.18 or newer. It runs TypeScript directly, so the tests need no build step.

## Test

```sh
npm install
Scripts/test.sh
```

`Scripts/test.sh` type-checks everything and runs every test with Node's built-in test runner.

```sh
Scripts/test-ui.sh
```

`Scripts/test-ui.sh` builds the site and plays it in a browser with Playwright, on iPhone WebKit and Android Chromium. The browsers are installed once with `npx playwright install webkit chromium`.

## Run locally

```sh
npx vite Apps/Game/Room --host
npx vite Apps/Bench --host
```

Each command prints an address that a phone on the same network can open.

## Build

```sh
Scripts/build.sh
```

`Scripts/build.sh` builds the room into `dist/` and the bench into `dist/bench/`.

## Deploy

GitHub Actions runs `.github/workflows/test-and-deploy.yml` on every push and pull request: `npm ci`, `Scripts/test.sh`, `Scripts/test-ui.sh`. On a push to the default branch it publishes `dist/` to GitHub Pages at <https://vladyslavshcherbakov.github.io/TeaRoom/>.

Pages must be enabled once in the repository settings: Settings → Pages → Build and deployment → Source: GitHub Actions.
