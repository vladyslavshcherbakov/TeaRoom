# World memory and the hidden 70%

This is design material for 0.9 and later. Nothing here is implemented in 0.1.

## Rule

Every noticeable detail of the world may have a hidden cause. Before designing an object, answer "why does this exist?". Then answer "does the player need to be told?". The usual answer is no: the player sees consequences.

Content grows by giving existing things memory and relationships, not by adding more things. One room that becomes familiar is worth more than twenty rooms. Four guests who remember are worth more than fifty who do not. Thirty events that can follow from earlier events are worth more than two hundred that cannot.

## Long-lived hidden state

| Memory | What it holds | Example of a visible consequence |
|---|---|---|
| Ritual history | Past rituals: tea, time of day, weather, water judgement, taste verdict, offerings | After ten evening rituals the cat takes its usual spot by itself. |
| Figurine relationship | Satisfaction per figurine, offerings received, favourite discovered | A tiny cup appears next to a figurine that was offered well many times. |
| Pet memory | Habits by time and weather, closeness to the player | In the rain the cat sleeps indoors more often. |
| Room memory | Objects moved, favourite time of day, weather history | The favourite figurine stays where the player once put it. |
| Guest memory | Last tea, last mood, remembered incidents | A guest who got a bitter tea looks at the kettle first on the next visit. |

The ritual log that feeds these memories is built from the events the simulation already emits.

## World rules

Strangeness comes from a small rule system: a condition over the hidden state, a probability, a cooldown and an effect.

```
Condition:  evening rituals > 5, cat closeness > 40, weather is rain
Probability: 0.15 per session
Cooldown:   7 days
Effect:     the figurine is found slightly turned toward the window
```

Rules only fire while the player is not looking at the affected object, and never during an action.

## Unanswered questions

Every deliberate mystery gets an entry in the team's notes, never in the game:

- Question: why does the figurine sometimes change position?
- Known facts: it never moves while the player is present.
- Observed consequences: after some rituals its position differs.
- Official explanation: none.
- Possible explanations: several, known to the team.
- Player-facing information: only the observed consequence.

The team knows the answer even when the player never will.

Not everything strange is a mystery. Ninety percent of the room stays ordinary, so the rare oddity has weight.
