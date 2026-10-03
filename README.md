# Tea Room

A small, calm ritual game for the mobile browser. You heat water, brew tea, pour it, taste it, tidy up and stay for a while. Nothing is won or lost.

Play it on a phone: <https://vladyslavshcherbakov.github.io/TeaRoom/>.

The world the game grows from is in [docs/world-bible.md](docs/world-bible.md), and how the game behaves is in [docs/](docs). The next tasks up to 1.0 and the open questions are in [ROADMAP.md](ROADMAP.md). How to change the code is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Project layout

| Path | What it holds |
|---|---|
| `Shared/GameLogic/` | The rules of the world: definitions, state, physics, judgements, commands and events. Imports nothing outside itself. |
| `Shared/Content/` | Teas, vessels, heaters, figurines and rooms as data. |
| `Apps/Game/Room/` | The walkable room in Three.js: layout, paths, camera and models. Served at the site's root. |
| `Apps/Game/Presentation/` | The presenter that turns the simulation's state into what vessels show, how each tea looks, and the tea's texts. |
| `Apps/Game/Texts/` | Every text the player reads, as keys and values. |
| `Tests/` | The tests of the game logic, of the content and of the game, the browser tests, and the helpers they share in `Support/`. The room's tests lie in one flat folder, one file for each feature of the room. |
| `Scripts/` | The build and test scripts that CI runs too. |
| `docs/` | How the game behaves, and the plan. |

## Requirements

Node.js 22.18 or newer. It runs TypeScript directly, so the tests need no build step.

## Test

```sh
npm ci
Scripts/test.sh
```

`Scripts/test.sh` type-checks everything and runs every test with Node's built-in test runner, side by side, and fails when any of them fails. It prints one line for each step that passed, and everything a failed step printed.

```sh
npx --no-install tsc -p tsconfig.json && npx --no-install tsc -p Apps/tsconfig.json
node --test Tests/Game/Room/Wiping.integration.test.ts
```

The first line only type-checks the game logic and the apps with their tests. The second runs one test file, here the wiping tests.

```sh
Scripts/test-ui.sh
```

`Scripts/test-ui.sh` builds the site and plays it in a browser with Playwright, on iPhone WebKit and Android Chromium. The scenarios of play run on Android Chromium as two projects of their own, one for the room view and one for first person, and the scenarios of a project run one after another. `--project=` runs one project, as `Tests/Browser/playwright.config.ts` names it. The browsers are installed once with `npx playwright install webkit chromium`.

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

`Scripts/build-artifact.sh` builds the room into `dist-artifact/TeaCeremony.html` with every log call and its text taken out: one file with the page, its styles and its script, as a Claude artifact takes it. Claude publishes that file to the same artifact each time.

## Deploy

GitHub Actions runs `.github/workflows/test-and-deploy.yml` on every push and on every pull request, except those that change only what its `paths-ignore` lists, such as documents and the artifact's scripts. A push to a branch with an open pull request is tested merged with the pull request's base. A pull request from a branch of this repository runs when it opens, and each later push to it is tested by that push. Three jobs run side by side: `Scripts/test.sh`, `Scripts/test-ui.sh` once for each Playwright project, and `Scripts/build.sh`. On a push to the default branch, once all three pass, it publishes `dist/` to GitHub Pages at <https://vladyslavshcherbakov.github.io/TeaRoom/>.

Pages must be enabled once in the repository settings: Settings → Pages → Build and deployment → Source: GitHub Actions.
