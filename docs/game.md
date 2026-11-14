# How the game behaves

## An evening

1. **Dusk.** A rumour says what became of yesterday's guest, and the window shows it. On the first evening the rumour introduces the teahouse.
2. **The guest speaks.** The guest names the trouble in their own words: what happened, who they are in it, what they hold, and what happens if nothing is done.
3. **Brewing.** The keeper picks a leaf, takes the kettle off the coals, holds the steep and picks a bowl.
4. **Cups.** Before each cup the keeper says one line out of those offered. The pet fed last evening whispers.
5. **Decision.** The guest says aloud what they will do, and leaves. They may leave a thing on the shelf.
6. **Feeding.** The rest of the tea goes to one of the three pets.
7. **Night.** The next evening follows from the ending. An ending with no next evening ends the story.

## Light

- An evening has three times: dusk, twilight and night. It only moves forward.
- It is dusk while the rumour is told, twilight from the guest's first beat, and night from the beat where the guest leaves. A line moves it on earlier with a cue.
- The window shows the sunset at dusk, the last light at twilight, and at night the moon as yesterday's ending left it.
- The room darkens toward night away from the lantern, and the lantern's light on the guest and the counter grows.

## Brewing

- Nothing is random. Brewing decides what the keeper can do in the talk, never a chance of success.
- **Leaf.** Each tea strengthens one kind of reply: red sympathy, white a question, smoked an objection. A strengthened reply that does not hurt trust raises trust by one more, and the choice shows it before it is taken.
- **Water.** The kettle heats by itself and the steam thickens. Each tea has a range of heat. No helper shows it: the keeper judges by eye.
- **Steep.** The steep runs while the finger holds, and the liquor darkens. Lifting the finger pours. An interrupted hold only pauses. Each tea has a range.
- **Cups.** Water and steep both in range give three cups, anything else gives two. A guest whose tea runs out before they ask for advice comes back the next evening.
- **Bowl.** The bowl says how the keeper sees the guest, and a guest may answer it: the clay bowl raises trust, the celadon bowl resolve, the mended bowl attachment.
- The ranges, the times and the cup counts are in `Shared/Content/Brewing.ts`.

## The talk

- The replies are of three kinds: ask, sympathise, object. The last cup asks for direct advice.
- The guest carries trust, resolve and attachment, and facts about what was said. They last through every visit of the story.
- A reply's outcome is the first one whose condition holds, so the same advice is taken or refused by what the guest carries.
- The first cup of the archer's wife branches the talk three ways. The second cup changes what she carries. The third asks for advice.
- A bad talk is never a loss: the story goes on, heavier.

## Pets

- Three clay pets live on the tea board: the toad, Pi Xiu and Budai.
- Only the pet fed last evening whispers, once at each cup, and only the keeper hears it. Before the first evening the grandmother fed Budai.
- A fed pet shines, the others are dull.
- Budai also smooths the keeper's first reply that hurts trust in a talk.
- A pet that the elixir of immortality was poured over never goes dull.

## The archer's wife

| Her decision | When | The next evening |
|---|---|---|
| She waits for her husband | "Wait" with trust not below zero | Two days later the couple comes, pours the elixir out, and leaves a pair of bowls |
| She drinks in panic | "Wait" with trust below zero, or advice refused on her second evening | Four days later Mei tells what happened and leaves the wife's cup. The moon has a silhouette |
| She leaves the flask | "Leave it here" with trust of two or more | The apprentice comes with the red bow, for the flask on the shelf |
| She comes back | "Leave it here" refused on the first evening, or the tea ran out | She returns the next evening with one more trust, and asks for advice at once |
| She drinks | "Drink" | The husband comes and asks what the keeper told her. The moon has a silhouette |
| She pours it out | "Pour it out", offered only after the keeper asked what she wants | The husband comes, already knowing. The toad is immortal, the empty flask stays on the shelf |

The thresholds are in `Shared/Content/Stories/ArcherWife/WifeEvenings.ts`.

## Writing a line

- A line is one string. A line break starts a new beat, and the player reads one beat at a time.
- The scene changes with the beat that tells of the change, never before it. A beat starts with its cues: `[show flask]` puts a thing on the counter, `[hide]` takes it away, `[mood wife-open]` changes the portrait, `[shine toad]` makes a pet shine, `[time night]` moves the evening on. The portrait of an answer changes on its first beat without a cue.
- A beat wrapped in `*asterisks*` is a stage direction. `{speaker}` at the start of a beat names who says it, when it is not the visit's guest.
- Events are named outright: who came, what happened, what they hold. Feelings and conclusions are never said: the player draws them.
- A guest's opening is at most nine beats, an answer at most four, and a beat fits two or three lines on a phone.
- A line ends on a fact or a gesture, never on a maxim. Each guest has their own habits of speech.
- A clue is told once in a scene.
- Tea is called "чай", never "лист".
- The speech is plain modern Russian with no rustic or archaic words, and the things named belong to a Chinese tale, not to a Russian village.
- A pet remarks on what it sees. It never tells the keeper what to ask, and never repeats a reply the keeper is offered.
- The moment a guest decides gets its own words about what is done, not a passing remark.
