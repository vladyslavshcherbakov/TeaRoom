# The Teahouse on the Pass

A conversation game with tea brewing for the mobile browser. You keep a small teahouse on a mountain pass in a fairy-tale past. In the evening a guest from a legend comes on the eve of a turn in their story. You brew tea, answer with one of three lines, give one direct piece of advice, and the next evening you see what came of it.

The first story is the archer's wife: one evening with her, and the evening that follows from its ending. The game's text is Russian.

Play it on a phone: <https://vladyslavshcherbakov.github.io/TeaRoom/>.

How the game behaves is in [docs/game.md](docs/game.md). The next tasks and the open questions are in [ROADMAP.md](ROADMAP.md). How to change the code is in [CONTRIBUTING.md](CONTRIBUTING.md).

## Project layout

| Path | What it holds |
|---|---|
| `Shared/Engine/` | The simulation of any game: the session, the command book, the fixed step, saves, the catalog. |
| `Shared/GameLogic/` | The rules of the teahouse: definitions, state, judgements, commands and events. It knows no browser. |
| `Shared/Content/` | The teas, bowls and pets, and the visits of each story, as data. |
| `Apps/Engine/` | The engine in the browser: texts, stores, sound, settings and the page's controls. |
| `Apps/Game/Presentation/` | The presenters that turn the state into the lines to read, the choices and what the scene shows. |
| `Apps/Game/Texts/` | Every text the player reads, as keys and values. |
| `Apps/Game/Teahouse/` | The page: the view model, the drawing in SVG and DOM, and the pictures in `Art/`. Served at the site's root. |
| `Tests/` | The tests of the engine and of the conventions, and the helpers they share in `Support/`. |
| `Scripts/` | The build and test scripts that CI runs too. |
| `docs/` | How the game behaves. |

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
node --test Tests/Game/CodeConventions.integration.test.ts
```

The first line only type-checks the game logic and the apps with their tests. The second runs one test file.

## Run locally

```sh
npx vite Apps/Game/Teahouse --host
```

The command prints an address that a phone on the same network can open.

## Build

```sh
Scripts/build.sh
```

`Scripts/build.sh` builds the teahouse into `dist/`.

```sh
Scripts/build-artifact.sh
```

`Scripts/build-artifact.sh` builds the teahouse into `dist-artifact/TeaCeremony.html` with every log call and its text taken out: one file with the page, its styles, its pictures and its script, as a Claude artifact takes it. Claude publishes that file to the same artifact each time.

## Deploy

GitHub Actions runs `.github/workflows/test-and-deploy.yml` on every push and on every pull request, except those that change only what its `paths-ignore` lists, such as documents and the artifact's scripts. Two jobs run side by side: `Scripts/test.sh` and `Scripts/build.sh`. On a push to the default branch, once both pass, it publishes `dist/` to GitHub Pages at <https://vladyslavshcherbakov.github.io/TeaRoom/>.

Pages must be enabled once in the repository settings: Settings → Pages → Build and deployment → Source: GitHub Actions.
