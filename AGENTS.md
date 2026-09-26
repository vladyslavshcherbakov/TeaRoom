# Agent instructions

> Before you start work, read CONTRIBUTING.md, and the plan in `docs/roadmap.md` and the open questions in DECISIONS.md. Before you change code in a folder, read the decisions for that folder there.

An agent may commit without asking, on the working branch. It may push only the branch named for the session. It asks every time before a force-push or any other rewrite of history.

An agent that publishes the Claude artifact builds it itself with `Scripts/build-artifact.sh`, because CI does not build it.

An agent adds to `docs/world-bible.md` only what the user approved.
