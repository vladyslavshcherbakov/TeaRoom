# Game logic rules

The rules the game logic follows. Numbers that differ per tea, vessel, heater, figurine or room live in the definitions under `Shared/Content/`. Numbers that are the same everywhere are named constants beside the rule that uses them. Units: °C, millilitres, grams and seconds. Strength, bitterness and a figurine's satisfaction run from 0 to 100.

## Time

- The world advances in fixed steps of 0.05 s, whatever the frame rate. A frame hands over its time, the world takes as many whole steps as fit, and the rest waits for the next frame. A session played at 30 and at 60 frames per second ends in the same state.
- The ritual has no phases. Every command is accepted from the moment the room opens, and the world never stops.

## Places and hands

- A room has places, such as the counter, the shelf and the tea table. Every carried item, each vessel, the caddy among them, the spoon and each cloth, is on a surface at a spot of a place, on the heater, in the sink, or in one of the player's hands. The spot keeps the exact position where the item was put down.
- The player has two hands, and a middle hand that grows when both are full. The player stands at one place, or at none while walking. An item is within reach when it is in a hand, or at the place where the player stands.
- An action on an item checks, in this order, that the item exists, that it has not crumbled to ash, and that it is within reach, then whatever else it needs. It is refused with the reason of the first check that fails. The heater, the thermostat and the tap check first that the player stands at their place.

| Action | Needs | What happens |
|---|---|---|
| Pick up | The item within reach and a free hand | The first free hand takes it. An open lid closes. From the heater it is lifted off, from the sink it leaves the sink, and a cloth lying in a puddle stops soaking it. |
| Put down | The item in a hand, and the spot at the player's place | It stands at the spot. |
| Grow a middle hand, `pickUpWithAMiddleHand` | The checks of picking up, both hands full and no middle hand yet | The middle hand grows and takes the item at once. Every refusal names `pickUpWithAMiddleHand`. If the item cannot be taken, such as a spoon that crumbles or a thermos too hot to hold, no hand grows. The middle hand is gone as soon as it lets go of its item, however it lets go, with `middleHandVanished`. |
| Put on the heater | The player at the heater's place, and the item in a hand or on the same surface | Taken from a surface or the sink, it is lifted as picking up lifts it. |
| Pour | The source and the target within reach | Walking away ends the pour. |
| Lids, tasting, scooping | The item within reach | Scooping and tipping need the spoon in a hand. |
| Wipe | The cloth in a hand, and the player at a place with a puddle | |
| Soak up a puddle | The cloth lying on the surface, the player there, and a puddle there | A cloth in a hand is refused with `alreadyInHand`. |
| A puddle reaches the cloth, `puddleReachesTheCloth` | The cloth lying on the surface and a puddle there, wherever the player stands | The cloth starts soaking as if it were laid in the puddle. |
| Offer | The player at the ritual place, where the figurines are | |

A spoon that crumbled on the heater is gone for the rest of the ritual, and every action with it is refused with `burntAway`.

## Heat

- A vessel on a working heater gains `degreesPerSecondPerLitre × 1000 / volume` degrees a second, up to 100 °C, so less water heats faster. While its lid is open, the gain is multiplied by the lid's `heatingMultiplierWhenOpen`.
- Every vessel closes a share of the gap to the room's temperature each second: its `coolingPerSecond`, multiplied by the lid's `coolingMultiplierWhenOpen` while the lid is open. Cooling comes before heating in a step, so a vessel on a working heater still reaches the boil.
- Water at the boil on a working heater boils away at the heater's `boilingAwayMlPerSecond`, until it is lifted off, the heater is switched off, or it boils dry. A vessel that boils dry says so once with `boiledDry`, and says whether it was filled to the brim and lost water only by boiling since. Pouring from it, a sip, an offering and rinse water poured away count as taking water. Boiling dry starts the count again.
- The thermos has a metal shell. On a working heater its metal heats to red in 45 seconds, and off a working heater it cools back in a minute and a half. From a fifth of red heat it is too hot to hold, which it says once with `metalGlowsTooHotToHold`, and picking it up and opening or closing its lid are refused with `tooHotToHold`.

### The thermostat

- Its target runs from the heater's `lowestC` to `highestC`, and it starts at the highest. The player sets, starts and stops it at the heater's place with `setTheThermostat`, `startTheThermostat` and `stopTheThermostat`.
- A working thermostat heats the water on the plate to the target, then leaves the plate cold until the water has cooled `heatsAgainBelowTheTargetByC` below it, and heats again. With nothing on the plate, or an empty vessel, the plate stays cold. It keeps working while the player is away.
- Starting it while the heater boils by hand hands the heater to it. While it works, the heater's switch switches the heater and the thermostat off, and `switchHeaterOn` is refused with `heaterAlreadyOn`. Stopping the thermostat also switches the heater off.
- The heater switched on by hand with `holdsTheThermostatsTarget` heats no higher than the target and works until it is switched off. The room asks for that in nerd mode. Without it the heater heats to the boil.

### Switching the heater off

Switching the heater off reports:

- how long it was in use since it was last switched on, and the energy it used: its `powerWatts` for the seconds the plate heated;
- each item that sat on it while it worked, with its seconds;
- the seconds and the energy it wasted, working with nothing on it or with something not made for the heater. Only the kettle is made for the heater, empty or not.

## Pouring

- Flow follows tilt: nothing below 10°, and a linear rise to the vessel's `maxPourMlPerSecond` at 45°.
- A target's opening takes a stream of up to its `takesAStreamOfUpToMlPerSecond`. A faster stream splashes a tenth of itself onto the table. The share of the stream that misses the opening lands on the table too.
- The stream mixes into what the target holds before anything runs over, so what overflows is the mixture. A full target overflows onto the table, and the first overflow of a pour is reported.
- Temperature, strength, teas and bitterness travel with the liquid and mix by volume in the target.
- A vessel cannot be poured while it stands on the heater. A vessel whose lid must be open to pour, or to be poured into, refuses while that lid is closed. The lid of a vessel being poured from or into cannot be closed until the pour ends.
- A vessel in the sink can be poured from and into. What a pour into a vessel in the sink misses or runs over, and what a vessel in the sink pours with nothing below it, runs down the drain.

## Teas in a liquid

- A liquid keeps the strength each tea gave it, and together they make its strength. Plain water has no tea.
- Leaves steeping in water credit what they add to their own tea, so leaves of several teas in one vessel make a blend. Leaves never pour: they stay in their vessel, and only the liquid carries its teas.
- Mixing averages each tea's strength by volume. Plain water dilutes the strength and keeps the blend, and a part poured out keeps the blend of the whole.

## The sink and the tap

- A room may have a sink at one spot of one of its places, with the tap's water temperature and flow. The quiet room's sink is on the counter.
- The player puts an item from a hand into the sink at the sink's place. One item fits at a time. A vessel or a cloth may go in, and the spoon may not. The tap stays as it was.
- The player turns the tap on and off at the sink's place, whatever the hands hold. It runs until it is turned off, also while the player is away.
- The tap fills the vessel in the sink, mixing by volume. While a lid that must be open to fill is closed, the water runs over the lid down the drain.
- Once the vessel is full, the rest runs over the rim down the drain. The first overflow is reported, and the table stays dry. The water running over carries out what the vessel held: tea fades towards the tap's water, hot water cools towards the tap's temperature, and each full vessel's worth of water that runs over washes out all but a seventh of the leaves, of every tea alike. Below 0.1 g no leaves are left, and the last ones washed out report `lastLeavesWashedOut`.
- A tea bowl or the caddy that the tap ran over is emptied as it leaves the sink. The kettle and the thermos keep their water.
- With nothing in the sink, the water runs down the drain. Turning the tap off reports how long it ran, how much went down the drain since it opened, and whether anything stood in the sink meanwhile.
- An item leaves the sink when it is picked up or put on the heater, and an open lid closes, as for any item taken.

## Leaves and brewing

- A room keeps its tea in caddies. A caddy is a vessel with a lid, and the room says which tea and how many grams it holds. The room opens with every caddy full.
- The spoon scoops `capacity × depth` grams from an open caddy, and tips everything it holds into a vessel that can hold leaves and whose lid is open. A spoon that is not full may scoop from any caddy and holds the grams of each tea.
- Leaves only come out of a caddy: tipping the spoon over a caddy is refused with `caddyTakesNoLeaves`. Scooping from a vessel the room keeps no tea in is refused with `notACaddy`.
- The kettle and the tea bowls hold leaves, of several teas at once. Leaves stay in their vessel when it is poured from.
- Water poured into the open caddy brews all its leaves at once, so its tea turns extremely strong within seconds. A sip of heavy or extreme tea straight from the caddy kills the player with `playerDied`. The same tea poured into a bowl first is only drunk with a grimace.
- In the sink with its lid open, the tap fills a caddy and washes every leaf out, and it has no tea until the player returns.

A brew starts when leaves and water first share a vessel, whichever arrives second. While it lasts, each second:

| Part | Rule |
|---|---|
| Leaf ratio | A tea's grams per 100 ml over its ideal grams per 100 ml. |
| Heat factor | 0 at 40 °C, 1 at the tea's ideal temperature, at most 1.5. |
| Stirring | ×2 for strength and bitterness while the vessel stands on a working heater at 100 °C. |
| Strength | Each tea closes `strengthRatePerSecond × leaf ratio × heat factor × stirring` of the gap to 100, credited to that tea. If the teas together would close more than the gap, they share it in those proportions. |
| Bitterness | Each tea adds `bitternessPerSecond × leaf ratio × heat factor × stirring`, times its `bitternessMultiplierAfterIdealTime` once its own leaves have steeped its `idealSeconds`, and times `1 + bitternessGainPerDegreeAboveGood × degrees above its good range` in water too hot for it. |
| Steeping time | Each tea's leaves count their own time from when they met the water. Leaves of a new tea start from nothing, and more of a tea already steeping go on from its time. |

Tea poured out of the brewing vessel stops changing, apart from cooling. When the brewing vessel is emptied, the brew ends, and new water starts a new one.

## Tasting

A sip takes 40 ml and says whether the bowl held leaves. Nothing is judged before a sip.

| Part | Values |
|---|---|
| Temperature | `tooHot` above 93 °C, `pleasant` from 45 °C, `lukewarm` from 30 °C, `cold` below 30 °C |
| Strength | `none` for plain water, below 5 or with no tea, `weak` below the blend's balanced range, `balanced` inside it, `rich` up to 15 above it, `heavy` beyond, `extreme` from 98 |
| Bitterness | `soft` below 25, `noticeable` from 25, `high` from 45, `overbrewed` from 70 |
| Reaction | `waitsForItToCool` if too hot, else `strongGrimace` if overbrewed, else `grimace` if high bitterness or heavy or extreme strength, else `shrug` if plain water, weak or cold, else `contentSigh` |

The blend's balanced range is the average of the balanced ranges of the teas in the sip, each weighted by its share of the strength. A tea bowl filled from the boiling kettle in the quiet room is too hot to sip for about six seconds.

## Offerings

A bowl set before a figurine goes wholly into its saucer. Each figurine accepts one offering a ritual.

| Satisfaction | Points |
|---|---|
| Plain water | 1, and nothing else counts |
| Any tea | 4 |
| Affinity | 4 for each point of the figurine's hidden affinity for the teas of the offering, each weighted by its share of the strength |
| Strength in the figurine's preferred range | 4 |
| Bitterness 45 or more | −4 |

The figurine answers with `glow` from 12 points, `subtle` from 6, and `barely` below that.

## Puddles and the cloth

- Spilled liquid lies where it falls. A stream that misses its target falls where the room says it lands, with `adjustPour`. When the room names no spot, because no top is under the spout, the missed water is lost and leaves no puddle. What splashes off a vessel on a surface, or overflows it, lies around it.
- Liquid that falls inside a puddle joins it, and the puddle's centre moves towards it by volume. Liquid that falls elsewhere starts a new puddle there. A puddle is 25 cm in radius at 30 ml and grows with the square root of its volume, with no limit. Two puddles on the same top that touch run into one, which keeps the larger one's name, and a cloth that soaked the other soaks it.
- A puddle takes the temperature and the tea strength of what was spilled, mixed by volume with what already lay there, and so does a puddle that another runs into. It closes 3% of the gap to the room's temperature a second, and it evaporates at 0.1 ml a second at room temperature, twice as fast at 90 °C, and in proportion between. A puddle that dries up is gone.
- A wipe works on each puddle the cloth passes over. A wipe over the whole puddle removes 80% of it at 50 cm/s or slower, 30% at 200 cm/s or faster, and in proportion between. A wipe over a share of it removes `1 − (1 − that removal)^share`, so short wipes remove as much as one long wipe over the same area.
- A wipe takes its share of the puddle however wet the cloth is. The cloth takes in what it wiped up to the 40 ml it holds. Tea stains it by all it wiped: 20 ml of the strongest tea stain it fully, and less in proportion. It dries at 0.1 ml a second clean and at 0.03 ml a second fully stained.
- A cloth laid down in a puddle takes at once what a slow wipe over the share of the puddle under it takes. Then it soaks the puddle up at 0.5 ml a second, until the puddle is gone, or it is picked up or put on the heater. A full cloth keeps soaking up what it dries off. The room says when the cloth lands in the puddle, and which share it covers, with `soakUpThePuddle`, and when a spreading puddle reaches a lying cloth with `puddleReachesTheCloth`. A cloth soaks one puddle at a time.
- Under the running tap a cloth loses a full stain in 10 seconds, soaks up to 40 ml, and loses a full charring in 5 seconds. It is wrung out to 8 ml as it leaves the sink.
- A room may hold several cloths, each with its own water, stain and charring. `wipeTable` and `soakUpThePuddle` name the cloth and the puddle.

## Charring

- On a working heater a wet cloth steams dry at 2 ml a second, and a dry one chars, fully in half a minute. Charring stops when the heater is off or the cloth is lifted, and what is charred stays charred. Lifting the cloth off the heater reports how charred it is.
- On a working heater the spoon chars, fully in 20 seconds. From four fifths charred it burns: taken then, it crumbles to ash with the leaves on it, and it is gone. Taken earlier, it stays as charred as it was.

## The debug menu's shortcut

`fillWithBoilingWater` fills a vessel to its capacity with clean water at 100 °C, wherever it is. Leaves and tea in it are gone. It needs no reach and no open lid.

## Saving and returning

- A saved state is resumed only when it fits the game: the same version, every field the game reads with its kind of value, and what names an item agrees with that item. No hand, heater or sink holds two items, the middle hand holds something only once it has grown, a pour runs between the room's vessels, and the player stands at one of the room's places or at none. It holds exactly the room's vessels, each of the same definition, its cloths, its figurines and its heater, a time of day and a weather the room offers, and puddles only on the room's places. A saved state that does not fit is not resumed, and the room opens anew.
- On the player's return a running pour stops, and the world lives through the time away in steps of 1 s, up to twelve hours. What happened meanwhile is logged and not shown.
- Then the house is restocked. A spoon that crumbled waits at its starting place again, clean and empty. Each caddy is poured out, with its wet leaves, and refilled where it stands with its own tea. The return says whether the spoon came back and whether a caddy was empty.
- Last, the time of day moves on to the next one the room offers, in the order dawn, morning, day, sunset, dusk, night, and round again. The return lands at a share through it that the room passes in, and reports `atmosphereChanged`.
