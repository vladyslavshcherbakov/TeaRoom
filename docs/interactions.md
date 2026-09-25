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
| Fill in the sink | choose the kettle's hand, tap the tap or the sink, and open the kettle's lid; tap the tap again to turn it off, and tap the kettle to take it | `putInTheSink`, `turnTheTapOn`, `turnTheTapOff` | `putInTheSink`, `tapTurnedOn`, `vesselOverflowed`, `tapTurnedOff` |
| Heat | tap the switch on the counter's front | `switchHeaterOn`, `switchHeaterOff` | `heaterSwitchedOn`, `targetTemperatureReached`, `heaterSwitchedOff` with a water judgement |
| Pour | choose the hand with the vessel, tap the target, then move the vessel with one finger and hold the tilt button with another | `startPouring`, `adjustPour` on every tilt change, `stopPouring` | `pourStarted`, `vesselOverflowed`, `pourFinished` with poured and spilled millilitres |
| Scoop leaves | take the spoon, choose its hand, then tap the open caddy | `scoopTea` with a full spoon's depth | `teaScooped` |
| Tip leaves | with the spoon's hand chosen, tap the open kettle | `tipSpoonInto` | `leavesAdded`, then `brewStarted` once leaves and water meet |
| Taste | choose the hand with a tea bowl, then tap Sip | `tasteCup` | `teaTasted` with a verdict and a reaction |
| Offer | choose the hand with a tea bowl, then tap a figurine | `offerCup` | `figurineAcceptedTea` with a response |
| Wipe | take the cloth, choose its hand, then stroke the tea table with a finger | `wipeTable` for every 2 cm of the stroke, with that piece's speed and covered share | `tableWiped` |
| Soak | put the cloth down in the puddle on the tea table | `putDown`, then `soakUpThePuddle` | `putDown`, `clothLaidInThePuddle` |
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
| Tap an item in a close-up | A bowl, the spoon and the cloth answer a tap in an invisible area half as wide again as they are, so a small item at the back of a shelf is easy to hit. The keeper takes it into the first free hand, and that hand is chosen at once, so the item can be used or put back with the next tap. A soft warm glow, twice as wide as the item, breathes slowly behind the chosen item in its corner, so the player sees which item a tap will use. |
| Tap an item the keeper holds, in a bottom corner of a close-up | That hand is chosen, and its item rises a little. A second tap lets go of the choice. Leaving the close-up lets go of it too, and in the room nothing is chosen: a tap on the keeper's hands does nothing there. |
| Tap a surface in a close-up with a hand chosen | The item goes down exactly where the finger touched, if it fits. It does not fit over the edge, on the heater or on another item, and then it stays in the hand, still chosen. |
| Tap the heater with a hand chosen | The kettle or the cloth in that hand goes on the heater. |
| Tap the switch under the heater | The heater switches on or off. The plate glows while it is on. |
| Tap the lid of a kettle, thermos or caddy, standing or held in a corner of the close-up | The lid opens or closes. An open lid lies on the surface beside its item, and on a held item it sits ajar on the rim. Taking an item closes its lid. |
| Tap the spoon or the cloth | The keeper takes it into a free hand, like any item. It shows in a corner of the close-up and is put down like any item. |
| Tap the open caddy with the spoon's hand chosen | A full spoon of leaves is scooped, and the leaves show on the spoon. |
| Tap a vessel with the spoon's hand chosen | The spoon's leaves are tipped into it. With an empty spoon there is nothing to tip, so the vessel is taken into the free hand, as is any other item. |
| Tap Sip, shown while the chosen hand holds a tea bowl with something in it | The keeper takes a sip and says in one line how it feels, for six seconds: too hot, bitter, thin, just right. Plain water with no tea in it gets its own line. Each feeling has four phrases, and each device keeps one voice: the same phrase for the same feeling every time, while another device says another. |
| Tap a figurine with a hand chosen | In the close-up of the tea table, the tea bowl in that hand is offered to it. The figurines stand on the sill behind the table, so from anywhere else a tap on them leaves the keeper where they are, and the room answers with a line that it keeps the sill for itself. The line changes with every such tap. A caption shows the figurine's response and the gods' remark. This is the only moment the game names the gods: everywhere else their mood changes in silence, and the player discovers them. |
| Stroke the tea table with the cloth's hand chosen | The cloth moves under the finger, and the table is wiped as it goes, so the puddle shrinks while the finger moves. Each 2 cm piece of the stroke is wiped at its own speed. Only the part of a piece where the cloth is over the puddle counts, and the share it covers is that length times the cloth's 20 cm width over the puddle's area. A slow stroke dries more. The cloth darkens as it takes in water and dries again by itself. A tap on a surface puts the cloth down, like any item, anywhere it fits, and a tap on another item takes that item into the free hand. Put down in the puddle, it soaks it up while it lies there: the puddle shrinks slowly, and the cloth darkens as it takes the water in. |
| Tap the tap or the sink under it with a hand chosen | That hand's item goes into the empty sink under the tap, and the water runs. With the vessel's lid closed it runs over the lid down the drain, and the player opens the lid in the sink, by tapping it, to let the water in. The kettle's water gauge rises. The water keeps running while the keeper is away. With no hand chosen, or with something already in the sink, a tap on the tap or the sink turns the water on or off. A tap on the item in the sink takes it back into a hand, with its lid closed, and the tap keeps running until it is turned off. |
| Tap a vessel on a surface with the hand of another vessel chosen, when the chosen vessel holds something | The pour begins to be aimed: the chosen vessel hovers over the target, 22 cm to its left on the screen with its spout turned towards it, so it is never hidden behind the furniture, and a round tilt button with a teapot appears. The first time, a short note explains the gesture: drag to move, hold the teapot button to tilt, tap anywhere to stop. It is not shown again on that device. |
| Drag a finger anywhere while aiming | The vessel moves with the finger, keeping its height above the target. Only the change of the finger's position counts, so the finger never hides the vessel. |
| Hold the tilt button while aiming | The vessel tilts by 30° a second up to 37°, just below the tilt where a tenth of the stream would splash, so a steady pour into the middle of a bowl keeps the table dry. Past 10° it pours. The share of the stream that lands inside the target's opening goes in, the rest falls on the table. Releasing the button tilts the vessel back by 70° a second, and the pour stops when it is upright. A pour that spilled 5 ml or more gets a line from the keeper. |
| Tap anywhere while aiming, without dragging | The aiming ends. On a free spot of a surface the vessel is put down there, anywhere else it returns to its hand. |

Items in hand are drawn in the keeper's hands in the room. In a close-up, where the keeper is hidden, they are drawn in the bottom corners of the screen, the first hand on the left and the second on the right, tilted towards the viewer so a bowl's tea shows. Nothing names them: the player sees what they carry. The vessel being aimed is drawn over the target, tipped by its tilt, with its stream falling straight down from the spout. A stream from a spout or the tap grows down from it as the water falls, and when it stops, its tail leaves the spout and falls after it. An item in the sink stands under the tap's spout. While a vessel's lid is closed, the stream from the tap ends on the lid, and with nothing in the sink it ends in the sink. Once it is full, the water creeps down its side at 12 cm/s, beside the gauge towards the spout, and ends at its base, in the sink. While a vessel heats on a working plate, its water moves: a faint shimmer from 40 °C, a simmer from 55 °C and a boil from 95 °C, seen on the open kettle's water and in its gauge. Steam rises from 60 °C: from the kettle's spout, and from its opening too while its lid is open. Lifted off the plate, the water goes still, and the steam stays while the water is hot. Water is the same pale, nearly clear blue everywhere: inside the kettle, in its gauge, in a bowl and in a stream. Tea blends from it into its own colour as it grows stronger. Weak tea is see-through, so the bowl's inside, its glaze and its painting, colours what the player sees, and strong tea hides it. In the glass bowls the tea shows through the walls. The kettle has a dark glass gauge on its side, where the pale water rises as it fills. With its lid open, the kettle shows its inside: dark clay when it is empty, otherwise the surface of the water or the tea, higher and wider the more it holds. Items standing on furniture cast no shadows. The nine tea bowls have their own looks: white, pearl, sky blue with a crackle of fine dark lines in its glaze, dark blue mended with gold in the kintsugi way, its seams running down from the rim and shining like metal, yellow, green marble with pale veins, a metal glaze in temper colours that shift from gold to violet to blue as the light moves over it, fluted clear glass that bends what is behind it and shows the tea inside, and clear glass covered in small round bumps you could feel with a fingertip, with a gilded rim. Each bowl has walls of real thickness and stands on a foot ring, so its inside bottom sits clear of the table. The white one has a kohaku koi painted on its bottom, seen from above as a real carp is: white with red patches, a scaled back, a blunt head with eyes and barbels, fins with rays and a forked tail. The pearl one has a pink lotus painted on its bottom, seen from above: four rings of pointed petals with veins, blushing towards their tips, a ring of golden stamens and a green seed pod with its seeds. The yellow one has a grey heron painted on its bottom, standing on one leg in the water among reeds, with its black plume and yellow bill. The caddy is a tin with a rim, a label and a lid with a knob. With its lid open, it shows loose leaves heaped from the bottom, and the heap sinks as the spoon takes from it. The spoon shows the leaves it holds. The cloth is a soft linen tea towel: woven threads, a stitched hem and two blue stripes near one end, lying in a loose fold with small ripples and edges that sag onto the surface. It darkens as it takes in water, and wiping up tea turns it a little yellow. Left on the working heater, it steams while it is wet. Dry, it burns in stages as it chars: a thread of smoke first, then a dark scorch that spreads from the middle with ragged edges and more smoke, then glowing embers in the scorch, and a small flame only once it is four fifths charred. Washed in the sink, it turns clean again, burnt or not. Taking a cloth out of the sink that went in burnt, the keeper marvels at it in one line, in the keeper's own words for this device. The leaves look like the tea: thin dark green needles for sencha, rolled balls for oolong, dark brown chunks for shou puerh.

The room begins the ritual with the first tea of the catalog when it opens, until the tea can be chosen in the room.

The pour gesture maps tilt to flow: below 10° nothing pours, the flow grows linearly to full at 45°, and above 80% of full flow a tenth of the stream splashes. The presentation reports which share of the stream lands inside the target opening, because only the presentation knows the geometry.

## Protocols still to be written in full

The protocols below are specified by the GDD and wait for their presentation version: pick up and place (0.4), open lid as a physical object (0.4), hot vessel touch — "oh, hot" — with the hand pulling back (0.4), pet the animal (0.8), change the time of day with a slow light transition (0.7), remain (0.6).
