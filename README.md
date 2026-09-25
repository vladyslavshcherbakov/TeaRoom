# Tea Room

A small, calm ritual game for the mobile browser. You heat water, brew tea, pour it, offer some to the tea figurines, taste it, tidy up and stay for a while. Nothing is won or lost.

Play it on a phone: <https://vladyslavshcherbakov.github.io/TeaRoom/>.

The design is in [docs/game-design.md](docs/game-design.md), and how the game behaves is in [docs/](docs). The plan up to 1.0 is in [docs/roadmap.md](docs/roadmap.md). How to change the code is in [CONTRIBUTING.md](CONTRIBUTING.md), and the reasons behind it and the open questions are in [DECISIONS.md](DECISIONS.md).

## Project layout

| Path | What it holds |
|---|---|
| `Shared/Simulation/` | The rules of the world: definitions, state, physics, judgements, commands and events. Imports nothing outside itself. |
| `Shared/Content/` | Teas, vessels, heaters, figurines and rooms as data. |
| `Apps/Game/Room/` | The walkable room in Three.js: layout, paths, camera and models. Served at the site's root. |
| `Apps/Game/Table/` | The presenter that turns the ritual's state into what vessels show, how each tea looks, and the tea's texts. |
| `Apps/Game/Texts/` | Every text the player reads, as keys and values. |
| `Tests/` | Integration, unit and browser tests, mirroring `Shared/` and `Apps/`. |
| `Scripts/` | The build and test scripts that CI runs too. |
| `docs/` | How the game behaves, and the plan. |

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
```

The command prints an address that a phone on the same network can open.

## Build

```sh
Scripts/build.sh
```

`Scripts/build.sh` builds the room into `dist/`.

```sh
Scripts/build-artifact.sh
```

`Scripts/build-artifact.sh` builds the room without any logging into `dist-artifact/TeaCeremony.html`: one file with the page, its styles and its script, as a Claude artifact takes it. Claude publishes that file to the same artifact each time.

## Deploy

GitHub Actions runs `.github/workflows/test-and-deploy.yml` on every push and pull request: `npm ci`, `Scripts/test.sh`, `Scripts/test-ui.sh`. On a push to the default branch it publishes `dist/` to GitHub Pages at <https://vladyslavshcherbakov.github.io/TeaRoom/>.

Pages must be enabled once in the repository settings: Settings → Pages → Build and deployment → Source: GitHub Actions.
