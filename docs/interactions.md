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
| Walk to a place | tap a piece of furniture, the keeper arrives | `standAt` with the place, or with none when walking away | `keeperMoved` |
| Take an item | tap it in a close-up | `pickUp` | `pickedUp` with the hand |
| Put an item down | select it in a hand, then tap a surface | `putDown` with the exact spot | `putDown` |
| Choose the mood | pick presets before or during the ritual | `chooseAtmosphere` | `atmosphereChanged` |
| Begin | pick a tea | `beginRitual` | `ritualBegan` |
| Open or close a lid | tap the lid | `openVesselLid`, `closeVesselLid`, `openCaddy`, `closeCaddy` | `vesselLidOpened`, `vesselLidClosed`, `caddyOpened`, `caddyClosed` |
| Put the kettle on the heater | choose the kettle's hand, then tap the heater | `placeOnHeater` | `placedOnHeater` |
| Lift the kettle off | tap the kettle on the heater | `pickUp` | `takenOffHeater` with a water judgement if the heater was on, then `pickedUp` |
| Fill from the tap | choose the kettle's hand, tap the tap, and open the kettle's lid; tap the tap again to close it | `startFillingFromTap`, `stopFillingFromTap` | `fillingStarted`, `vesselOverflowed`, `fillingFinished` with filled and overflowed millilitres |
| Heat | tap the switch on the counter's front | `switchHeaterOn`, `switchHeaterOff` | `heaterSwitchedOn`, `targetTemperatureReached`, `heaterSwitchedOff` with a water judgement |
| Pour | choose the hand with the vessel, tap the target, then move the vessel with one finger and hold the tilt button with another | `startPouring`, `adjustPour` on every tilt change, `stopPouring` | `pourStarted`, `vesselOverflowed`, `pourFinished` with poured and spilled millilitres |
| Scoop leaves | take the spoon, choose its hand, then tap the open caddy | `scoopTea` with a full spoon's depth | `teaScooped` |
| Tip leaves | with the spoon's hand chosen, tap the open kettle | `tipSpoonInto` | `leavesAdded`, then `brewStarted` once leaves and water meet |
| Taste | choose the hand with a tea bowl, then tap Sip | `tasteCup` | `teaTasted` with a verdict and a reaction |
| Offer | choose the hand with a tea bowl, then tap a figurine | `offerCup` | `figurineAcceptedTea` with a response |
| Wipe | take the cloth, choose its hand, then stroke the tea table with a finger | `wipeTable` with the stroke's speed and covered share | `tableWiped` |
| Finish | tap "Finish" | `finishRitual` | `ritualFinished` |
| Leave | tap "Leave" while resting | `leaveRoom` | `roomLeft` |

Every change to the gods' plaque arrives as `godsMoodChanged` with a remark. The presentation turns the remark into a short line of text.

## Gestures in the room

A touch that moves less than 12 px and lasts under half a second is a tap.

A press that moves less than 12 px is a tap when the finger lifts, unless it started a pour. A press that moves further does nothing.

| Gesture | What it does |
|---|---|
| Tap the floor | The keeper walks there, around the furniture. |
| Tap a piece of furniture, or anything on it | The keeper walks to it, and the camera shows it close up. |
| Tap the floor or empty space in a close-up | The camera returns to the room. |
| Pinch with two fingers, or turn the mouse wheel | The camera moves closer or farther along its line of sight, from half to 1.6 times its usual distance. The first finger's press does not count as a tap. The room keeps its zoom while the keeper walks to furniture, and gets it back after the close-up. Each close-up starts at its usual distance, and its own zoom is forgotten when the player leaves it. There is no pinch while a pour is being aimed. |
| Tap an item in a close-up | The keeper takes it into the first free hand, and that hand is chosen at once, so the item can be used or put back with the next tap. A soft warm glow pulses behind the chosen item in its corner, so the player sees which item a tap will use. |
| Tap an item the keeper holds: in a bottom corner of a close-up, or in the keeper's hands in the room | That hand is chosen, and in a close-up its item rises a little. A second tap lets go of the choice. |
| Tap a surface in a close-up with a hand chosen | The item goes down exactly where the finger touched, if it fits. It does not fit over the edge, on the heater or on another item, and then it stays in the hand, still chosen. |
| Tap the heater with a hand chosen | The vessel in that hand goes on the heater. |
| Tap the switch under the heater | The heater switches on or off. The plate glows while it is on. |
| Tap the lid of a kettle, thermos or caddy, standing or held in a corner of the close-up | The lid opens or closes. An open lid lies on the surface beside its item, and on a held item it sits ajar on the rim. Taking an item closes its lid. |
| Tap the spoon or the cloth | The keeper takes it into a free hand, like any item. It shows in a corner of the close-up and is put down like any item. |
| Tap the open caddy with the spoon's hand chosen | A full spoon of leaves is scooped, and the leaves show on the spoon. |
| Tap a vessel with the spoon's hand chosen | The spoon's leaves are tipped into it. With an empty spoon there is nothing to tip, so the vessel is taken into the free hand, as is any other item. |
| Tap Sip, shown while the chosen hand holds a tea bowl with tea in it | The keeper takes a sip. A caption shows the taste for four seconds. |
| Tap a figurine with a hand chosen | The tea bowl in that hand is offered to it. A caption shows the figurine's response and the gods' remark. This is the only moment the game names the gods: everywhere else their mood changes in silence, and the player discovers them. |
| Stroke the tea table with the cloth's hand chosen | The table is wiped. The stroke's length over time is its speed, and a stroke of 1.5 m covers the whole table. A slow stroke dries more. A tap with the cloth does nothing. |
| Tap the tap or the sink under it with a hand chosen | The keeper holds that hand's vessel under the tap, and the water runs. With the vessel's lid closed it runs over the lid into the sink, and the player opens the lid under the tap, by tapping it, to let the water in. The kettle's water gauge rises. A second tap on the tap, the sink or the vessel under the tap closes it, and a tap on its lid opens or closes the lid. |
| Tap a vessel on a surface with the hand of another vessel chosen, when the chosen vessel holds something | The pour begins to be aimed: the chosen vessel hovers over the target with its spout 22 cm to the left, and a round tilt button with a teapot appears. The first time, a short note explains the gesture: drag to move, hold the teapot button to tilt, tap anywhere to stop. It is not shown again on that device. |
| Drag a finger anywhere while aiming | The vessel moves with the finger, keeping its height above the target. Only the change of the finger's position counts, so the finger never hides the vessel. |
| Hold the tilt button while aiming | The vessel tilts by 30° a second up to 55°. Past 10° it pours, and past about 38° a tenth of the stream splashes. The share of the stream that lands inside the target's opening goes in, the rest falls on the table. Releasing the button tilts the vessel back by 70° a second, and the pour stops when it is upright. |
| Tap anywhere while aiming, without dragging | The aiming ends, and the vessel returns to its hand. |

Items in hand are drawn in the keeper's hands in the room. In a close-up, where the keeper is hidden, they are drawn in the bottom corners of the screen, the first hand on the left and the second on the right, tilted towards the viewer so a bowl's tea shows. Nothing names them: the player sees what they carry. The vessel being aimed is drawn over the target, tipped by its tilt, with its stream falling straight down from the spout. A vessel under the tap is drawn beneath the tap's spout. Once it is full, or while its lid is closed, the water runs down its side into the sink. The kettle has a glass gauge on its side that shows how full it is. With its lid open, the kettle shows its inside: dark clay when it is empty, otherwise the surface of the water or the tea, higher and wider the more it holds. Items standing on furniture cast no shadows. The six tea bowls have their own glazes: white, pearl, sky blue, blue, yellow and emerald. The caddy is a tin with a rim, a label and a lid with a knob. With its lid open, it shows loose leaves heaped from the bottom, and the heap sinks as the spoon takes from it. The spoon shows the leaves it holds. The leaves look like the tea: thin dark green needles for sencha, rolled balls for oolong, dark brown chunks for shou puerh.

The room begins the ritual with the first tea of the catalog when it opens, until the tea can be chosen in the room.

The pour gesture maps tilt to flow: below 10° nothing pours, the flow grows linearly to full at 45°, and above 80% of full flow a tenth of the stream splashes. The presentation reports which share of the stream lands inside the target opening, because only the presentation knows the geometry.

## Protocols still to be written in full

The protocols below are specified by the GDD and wait for their presentation version: pick up and place (0.4), open lid as a physical object (0.4), hot vessel touch — "oh, hot" — with the hand pulling back (0.4), pet the animal (0.8), change the time of day with a slow light transition (0.7), remain (0.6).
