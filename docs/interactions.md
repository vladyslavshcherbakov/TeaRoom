# Interactions

An action in Tea Room is specified as behaviour, not as a feature. A mechanic is designed only when every field below has an answer. "The player can pour water" is not a design.

## The contract of an interaction

| Field | Question it answers |
|---|---|
| Actor | Who acts: the player, the cat, a guest, the world. |
| Target | What is acted on. |
| Preconditions | When the action is available at all. |
| Input | Which gesture starts it. |
| Continuous behaviour | What happens while the gesture lasts. |
| Feedback | What the player sees, hears and feels. |
| Completion | When the action counts as done. |
| Interruption | What happens when the finger lifts early or the player changes their mind. |
| Imperfection | What a clumsy version produces. |
| State change | Which values in the world changed. |
| Aftereffect | What lingers right after: drops, steam, a clink. |
| Intent | The feeling the player should keep. |

Definition of done for a new mechanic: a gesture, a visual response, a continuous response, a sound, a state change, a completion, an interruption, an imperfect outcome, persistence where the world should remember it, a consequence elsewhere in the room, and a mobile-safe touch target.

## Touch profiles

Objects share one physics profile per weight class, so mass is felt through the finger.

| Class | Examples | Follow lag | Lift | Scale on grab |
|---|---|---|---|---|
| Light | bowl | low | 5 px | +3% |
| Medium | caddy, thermos | medium | 4 px | +3% |
| Heavy | kettle | high | 2–3 px | +2% |

Grab: `pointerdown`, then 100–150 ms without movement. The lift animation takes 120–180 ms. Nothing counts as moved before `pointerup`. On release the object snaps to a matching socket if it is over one, stays where it was put if the spot is allowed, and springs back to where it came from if the spot is forbidden. There is no red highlight and no error text.

Animation always goes anticipation, action, settle. A bowl: lift, move, descend, contact, settle. A lid: grip, lift, rotate, settle. Water: tilt, stream, transfer, final drops, stop.

## Interactions and the simulation

The simulation core receives one command per player decision and answers with events. A refused command is an `actionRefused` event with a reason, and the presentation shows it materially: the object springs back, the lid stays shut.

| Interaction | Gesture | Commands | Events the presentation reacts to |
|---|---|---|---|
| Choose the mood | pick presets before or during the ritual | `chooseAtmosphere` | `atmosphereChanged` |
| Begin | pick a tea | `beginRitual` | `ritualBegan` |
| Open or close a lid | tap the lid | `openVesselLid`, `closeVesselLid`, `openCaddy`, `closeCaddy` | `vesselLidOpened`, `vesselLidClosed`, `caddyOpened`, `caddyClosed` |
| Put the kettle on the heater | drag and release over the heater | `placeOnHeater` | `placedOnHeater` |
| Lift the kettle off | drag away from the heater | `takeOffHeater` | `takenOffHeater` with a water judgement if the heater was on |
| Heat | tap the switch | `switchHeaterOn`, `switchHeaterOff` | `heaterSwitchedOn`, `targetTemperatureReached`, `heaterSwitchedOff` with a water judgement |
| Pour | grab a vessel over a target, tilt with a vertical drag, release to stop | `startPouring`, `adjustPour` on every tilt change, `stopPouring` | `pourStarted`, `vesselOverflowed`, `pourFinished` with poured and spilled millilitres |
| Scoop leaves | drag the spoon through the open caddy | `scoopTea` with the depth reached | `teaScooped` |
| Tip leaves | tilt the spoon over the open kettle | `tipSpoonInto` | `leavesAdded`, then `brewStarted` once leaves and water meet |
| Taste | lift a bowl to the viewer | `tasteCup` | `teaTasted` with a verdict and a reaction |
| Offer | set a bowl in front of a figurine | `offerCup` | `figurineAcceptedTea` with a response |
| Wipe | swipe the cloth over the wet area | `wipeTable` with stroke speed and covered share | `tableWiped` |
| Finish | tap "Finish" | `finishRitual` | `ritualFinished` |
| Leave | tap "Leave" while resting | `leaveRoom` | `roomLeft` |

Every change to the gods' plaque arrives as `godsMoodChanged` with a remark. The presentation turns the remark into a short line of text.

## Gestures in the game

A touch that moves less than 8 px is a tap. Anything longer picks the object up, and it follows the finger at the point where it was grabbed.

| Gesture | What it does |
|---|---|
| Tap the kettle or the thermos | Opens or closes its lid. |
| Tap the caddy | Opens or closes it. |
| Tap the heater switch | Switches the heater on or off. |
| Drag the kettle onto the heater plate | Puts it on the heater. Picking it up again takes it off. |
| Carry a vessel over another from above, then press down | Pours. The vessel stops at the hover line above the target, and every pixel the finger goes further down tilts it more: 120 px is 60°. Moving sideways aims the stream. Lifting the finger or leaving the target stops the pour. A vessel carried into the target from below or from the side does not pour. |
| Dip the spoon into the open caddy from above | Scoops. The depth reached inside the caddy's mouth decides how much. Passing through the caddy from below scoops nothing. |
| Release the spoon over the open kettle | Tips the leaves in. |
| Release a bowl in front of a figurine | Offers the tea. |
| Raise a bowl into the top of the screen | Takes a sip. |
| Draw the cloth across the puddle | Wipes. The stroke's speed inside the puddle and the share of the puddle it crossed decide how much dries. |

Every object returns to its place when released, except the kettle placed on the heater. Free placement on the table arrives in 0.3.

The pour gesture maps tilt to flow: below 10° nothing pours, the flow grows linearly to full at 45°, and above 80% of full flow a tenth of the stream splashes. The presentation reports which share of the stream lands inside the target opening, because only the presentation knows the geometry.

## Protocols still to be written in full

The protocols below are specified by the GDD and wait for their presentation version: pick up and place (0.3), open lid as a physical object (0.3), hot vessel touch — "oh, hot" — with the hand pulling back (0.3), pet the animal (0.7), change the time of day with a slow light transition (0.6), remain (0.5).
