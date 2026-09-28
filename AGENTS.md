# Agent instructions

> Before you start a task, read ROADMAP.md. Before you change code, read CONTRIBUTING.md.

At the start of a conversation and after each compaction, before it writes code, an agent reads these eight skills completely, with every file in each skill's folder: collaborating-with-the-user, collaborating-on-code, planning-and-verifying-code-changes, setting-up-projects, structuring-app-features, testing-behaviour, writing-code and writing-commits. It reads no other skill at that point, whatever else the tool offers. An agent that gives work to another agent tells it to do the same.

An agent may commit without asking, on the working branch. It may push only the branch named for the session. It asks every time before a force-push or any other rewrite of history.

An agent that publishes the Claude artifact builds it itself with `Scripts/build-artifact.sh`, because CI does not build it.

After every push that changes the game, an agent builds and publishes the Claude artifact to the same link. A push changes the game when it changes a file under `Apps/` or `Shared/`, `package.json` or `package-lock.json`. A push of documents, tests or CI alone leaves the artifact as it is.

After a commit that adds or changes lines the player reads, an agent lists them for the user to review.

An agent changes CONTRIBUTING.md only when a change alters the layers, the entry point or interface of a component, or the architecture, or adds a new kind of flow, such as a new kind of tutorial or a multiplayer mode. A new rule, member, file or check inside an existing flow leaves it as it is.
