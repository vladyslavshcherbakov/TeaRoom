# Simulation rules

These are the rules the simulation core follows. The numbers that differ per tea, vessel, heater, figurine or room live in the content definitions under `Shared/Content/`. The numbers that are the same everywhere are named constants next to the rule that uses them.

Units: temperature in °C, volume in millilitres, leaves in grams, time in seconds. Strength, bitterness and a figurine's satisfaction run from 0 to 100.

## Time

The world advances in fixed steps of 0.05 s, whatever the frame rate. A frame hands over its elapsed time and the core runs as many whole steps as fit, carrying the remainder to the next frame. The same session played at 30 and at 60 frames per second ends in the same state.

## Places and hands

A room has places, such as the counter, the shelf and the tea table. Each item that can be carried — every vessel, the caddy among them, the spoon and the cloth — is either on a surface at a spot of a place, or in one of the keeper's hands: the two hands, and a middle hand that can grow when both are full. A spoon that crumbled on the heater is gone for the rest of the ritual, and every action with it is refused with `burntAway`. The spot keeps the exact position where the item was put down, so the room can show it there.

The keeper stands at one place, or at none while walking. An item is within reach when it is in a hand, or on a surface at the place where the keeper stands.

- Picking up needs the item within reach and a free hand. The first free hand takes it, and an open lid of the vessel closes. Picking up the kettle from the heater lifts it off, and the water is judged if the heater was on.
- Putting down needs the item in a hand and the spot at the keeper's place.
- With both hands full, `pickUpWithAMiddleHand` grows a middle hand that takes the item at once, as picking up would. It is refused while a hand is free or a middle hand is already there, and if the item cannot be taken, for a spoon that crumbles or a thermos too hot to hold, no hand grows. The middle hand is gone as soon as it lets go of its item, however it lets go, and says so with `middleHandVanished`. A saved state from before the middle hand gets an empty one that has not grown.
- The heater's switch and the heater plate need the keeper at the heater's place. Putting a vessel on the heater takes it from the hand or from the same surface.
- Pouring needs the source and the target within reach. Walking away ends a pour.
- Lids, tasting and scooping need the item within reach. The spoon and the cloth are carried like any item: scooping and tipping leaves need the spoon in a hand, and wiping needs the cloth in a hand. The figurines are at the ritual place, so offering needs the keeper there. Wiping needs the keeper at a place with a puddle.

## Heat

A vessel on a working heater gains `degreesPerSecondPerLitre × 1000 / volume` degrees per second, up to 100 °C, multiplied by the lid's `heatingMultiplierWhenOpen` while its lid is open, because the steam carries heat away. Less water heats faster. An open kettle, thermos or caddy keeps three quarters of the heat. Water that has reached the boil on a working heater boils away at the heater's `boilingAwayMlPerSecond`, 16 ml/s for the electric plate, so a full kettle of 800 ml boils dry 50 seconds after it comes to the boil, about 97 seconds after it is switched on with cold tap water, until it is lifted off, switched off or boiled dry. A vessel that boils dry says so once with `boiledDry`, and says whether it was filled to the brim and lost water since only by boiling. Pouring from it, a sip, an offering or rinse water poured away count as taking water, and boiling dry starts the count anew.

Every vessel closes a share of the gap to the room's temperature each second: `coolingPerSecond`, multiplied by the lid's `coolingMultiplierWhenOpen` while its lid is open. The thermos keeps heat far better than the kettle, the tin caddy keeps it worse, at twice the kettle's rate, and an open lid loses it faster. Cooling is applied before heating, so a vessel on a working heater still reaches boiling.

A vessel with a metal shell, the thermos, may stand on the heater too. On a working heater its metal heats to red in 20 seconds, and off a working heater it cools back in a minute. From a fifth of red heat it is too hot to hold, which it says once with `metalGlowsTooHotToHold`, and picking it up, opening its lid and closing it are refused with `tooHotToHold`.

The heater has a thermostat with a target temperature, from `lowestC` to `highestC` of its definition, 40 to 100 °C for the electric plate, which starts at 100 °C. The keeper sets it and starts or stops it at the heater's place, with `setTheThermostat`, `startTheThermostat` and `stopTheThermostat`. A working thermostat measures the water in the vessel on the plate. It heats until the water reaches the target, then leaves the plate cold until the water has cooled `heatsAgainBelowTheTargetByC` below the target, 2 °C, and heats again. With nothing on the plate, or an empty vessel, it leaves the plate cold. Starting it while the heater boils by hand hands the heater to the thermostat. Switching the heater on by hand while the thermostat waits turns the thermostat off, and the heater heats to the boil. Switching the heater off, or stopping the thermostat, switches both off. The heater switched on by hand with `holdsTheThermostatsTarget` heats the water on it no higher than the thermostat's target, so it holds the water there, and works until it is switched off. The room asks for that in nerd mode. Without it the heater heats to the boil. The thermostat keeps working while the keeper is away. The heater is in use from the moment it is switched on or its thermostat started until both are off, and its energy counts only the seconds the plate heated.

When the water on the heater first reaches the lower edge of the chosen tea's good range, the core announces it once per switch-on. This is the moment for two faint haptic pulses where the device has them.

Switching the heater off, by hand or by finishing the ritual, reports how long it was in use since it was last switched on, and the energy it used: its `powerWatts` for the seconds the plate heated, 2000 W for the electric plate. It also reports whether the keeper switched it off, each item that sat on it while it worked, with the seconds it sat there, and the seconds and energy it wasted: the time it worked with nothing on it or with something not made for the heater. Only the kettle is made for the heater, so the thermos, the spoon and the cloth waste its energy, and an empty kettle does not.

## Judging water

Each tea defines an ideal temperature, a good range and a wider acceptable range. Water is `ideal` inside the good range, `slightlyCool` or `slightlyHot` between the good and acceptable ranges, and `tooCool` or `tooHot` outside them. Switching the heater off, or lifting the kettle off a working heater, reports this judgement.

## Pouring

Flow follows tilt: nothing below 10°, a linear rise to the vessel's `maxPourMlPerSecond` at 45°. Each vessel's opening takes a stream of up to `takesAStreamOfUpToMlPerSecond`, and a faster stream splashes a tenth of itself onto the table. So how fast a vessel can be filled depends on both: the kettle pours up to 45 ml/s, a tea bowl or the thermos neck takes 20 ml/s cleanly, the kettle's opening 40 ml/s, and the wide caddy 60 ml/s, so the kettle fills the caddy at full tilt. The share of the stream that misses the opening also lands on the table. A target that is full overflows onto the table, and the core reports the first overflow of a pour. Temperature, strength and bitterness travel with the liquid and mix by volume in the target.

A vessel cannot be poured while it stands on the heater. A vessel whose lid must be open to pour, or to be poured into, refuses while that lid is closed.

## The sink and the tap

A room may have a sink with a tap, at one spot of one of its places, with the temperature of the tap's water and its flow in ml per second. The quiet room's sink is on the counter, its water is 18 °C at 50 ml/s, and its kettle starts empty.

The keeper puts an item from a hand into the sink while standing at the sink's place. One item fits at a time. A vessel, the caddy among them, or the cloth may go in, and the spoon may not. Putting an item in leaves the tap as it was: a closed tap stays closed until the keeper turns it on. The keeper turns the tap on and off only at the sink's place, whatever the hands hold.

The tap runs until it is turned off, also after the keeper walks away. It fills the vessel in the sink. A vessel whose lid must be open to be filled goes in with its lid closed too, and then the water runs over the lid down the drain until the lid is opened, and over it again if the lid is closed. The tap water mixes by volume with what the vessel holds. Once the vessel is full, the rest runs over the rim down the drain: the core reports the first overflow, and the table stays dry. The water running over the rim carries out what the vessel held, so tea in it fades towards the tap's water and hot water cools towards the tap's temperature, and the leaves in it are washed out: every full vessel's worth of water that runs over takes all but a seventh of them, and below 0.1 g none are left. A tea bowl that the tap ran over while it stood in the sink is emptied as it leaves the sink, because it was rinsed and its water poured away. The kettle and the thermos keep their water, because they are filled at the sink. With nothing in the sink, the water runs down the drain. Turning the tap off reports how long it was open, how much of its water ran down the drain since it opened, whatever went into the sink or came out of it meanwhile, and whether anything stood in the sink while it ran.

An item leaves the sink when it is picked up or put on the heater. Picking it up closes an open lid, as it does for any item. A vessel in the sink cannot be poured from or into.

## Leaves and brewing

The caddy is a vessel with a lid, and the room's leaves lie in it: the ritual fills it with the room's `caddyGrams` of the chosen tea. It opens, the spoon scoops `capacity × depth` grams, and the spoon tips everything it holds into a vessel that can hold leaves and whose lid is open. The kettle and the tea bowls can hold leaves, so tea may be brewed right in a bowl. Leaves stay in their vessel when it is poured from. Water poured into the open caddy brews all its leaves at once, so its tea turns extremely strong within seconds. The keeper may pour it out or sip it straight from the caddy. A sip of heavy or extreme tea straight from the caddy kills the keeper and reports `keeperDied`. The same tea poured into a bowl first is only extremely strong. In the sink with its lid open, the tap fills the caddy and washes every leaf out, and the room has no tea left. The last leaves washed out of any vessel report `lastLeavesWashedOut`.

A brew starts when leaves and water first share a vessel, whichever arrives second. While it lasts:

- The leaf ratio is the grams per 100 ml divided by the tea's ideal grams per 100 ml.
- The heat factor is 0 at 40 °C, 1 at the tea's ideal temperature, and at most 1.5.
- The boil stirs the leaves while their vessel stands on a working heater at 100 °C, and doubles both strength and bitterness per second. Leaves may go into the kettle before the water, or while it stands on the heater.
- Strength closes `strengthRatePerSecond × leaf ratio × heat factor × stirring` of the remaining gap to 100 each second, so it rises fast and then levels off.
- Bitterness grows by `bitternessPerSecond × leaf ratio × heat factor × stirring` each second, multiplied by `bitternessMultiplierAfterIdealTime` once the steep passes the tea's ideal time, and by `1 + bitternessGainPerDegreeAboveGood × degrees above the good range` when the water is too hot.

Tea poured out of the brewing vessel stops changing, apart from cooling. When the brewing vessel is emptied, that brew ends, and new water starts a new one.

## Tasting

A sip takes 20 ml, and it says whether the bowl held leaves. The verdict has four parts.

| Part | Values |
|---|---|
| Temperature | `tooHot` above 93 °C, `pleasant` from 45 to 93 °C, `lukewarm` from 30 to 45 °C, `cold` below 30 °C |
| Strength | `none` while it is still plain water, below 5, `weak` below the tea's balanced range, `balanced` inside it, `rich` up to 15 above it, `heavy` beyond, `extreme` from 98, the ceiling that a pile of leaves reaches within a minute |
| Bitterness | `soft` below 25, `noticeable` from 25, `high` from 45, `overbrewed` from 70 |
| Reaction | `waitsForItToCool` if too hot, else `strongGrimace` if overbrewed, else `grimace` if high bitterness or heavy or extreme strength, else `shrug` if plain water, weak or cold, else `contentSigh` |

A tea bowl filled from a boiling kettle stays above 93 °C for about five seconds after the pour, so only a keeper who hurries sips it too hot.

## Offerings

A bowl set before a figurine goes entirely into its saucer. Each figurine accepts one offering per ritual. The figurine's satisfaction changes by 4 for any tea, plus 4 per point of its hidden affinity for that tea, plus 4 when the strength is in its preferred range, minus 4 when the bitterness is 45 or more. Near-plain water earns 1. The figurine answers with `glow` from 12, `subtle` from 6, and `barely` below that.

## The table

Spilled liquid makes a puddle on the place where it falls. A stream that misses its target falls where the presentation says it lands, reported with `adjustPour`, because only the room knows where the spout is. What overflows a vessel on a surface lies around that vessel. A pour with nothing to say where it lands spills around its target, or where the keeper stands. Each place has its own puddle, and a puddle that dries up is gone. The wet area evaporates at 0.1 ml per second, so a full puddle of 30 ml dries by itself in five minutes. A wipe over the whole table removes 80% of the wetness when the stroke is 50 cm/s or slower, 30% at 200 cm/s or faster, and a share in between for speeds in between. A wipe over a part of the table removes `1 − (1 − that share)^part`, so many short wipes remove as much as one long wipe over the same area. The puddle has a tea strength, mixed by volume from every spill. The cloth takes in the water it wipes up, and tea stains it: 20 ml of the strongest tea stain it fully, and weaker tea or less of it stains it in proportion. A clean cloth dries at 0.1 ml per second, and a fully stained one at 0.03 ml per second, with a stain in between drying in between. A cloth in the sink under the running tap loses a full stain in 10 seconds, a tenth each second, and soaks up the tap water, up to the 40 ml it holds. The keeper wrings it out as it leaves the sink, down to 8 ml.

A room may hold more than one cloth, each with its own id. Each keeps its own water, stain and charring, and `wipeTable` and `soakUpThePuddle` name the cloth they use. The cloth may lie on the heater, like the kettle. On a working heater a wet cloth steams dry at 2 ml per second, and a dry one chars, fully in a minute. Charring stops when the heater is off or the cloth is lifted, and what is charred stays charred. Lifting the cloth off the heater reports how charred it is. The tap washes a full charring out in 5 seconds, and the cloth is as good as new. A cloth laid down in the puddle soaks it up at 0.5 ml per second while it lies there. It stops when the puddle is gone, when it holds 40 ml, or when it is picked up. The presentation says when the cloth lands in the puddle with `soakUpThePuddle`, because only the room knows where the puddle is. The command needs the cloth lying on a place's surface, the keeper there, and a puddle on that place.

The spoon may lie on the heater too. On a working heater it chars, fully in 20 seconds, and charring stops when the heater is off or the spoon is lifted. From four fifths charred it burns, 16 seconds after it went on a working plate: taken then, it crumbles to ash in the hand, the leaves on it are lost with it, and it is gone. Taken earlier, it is saved and stays as charred as it was.

## Phases

`settingUp` accepts only choosing the mood and beginning. `ritual` accepts everything except beginning again and leaving. Finishing ends any pour, switches the heater off and moves to `resting`, where the room keeps cooling and drying, and the keeper can still walk, take and put down items, change the mood and leave. Leaving moves to `ended`, where time stops and every command is refused.

## Returning

A session can be saved as its plain state and resumed later. The saved state must fit the game that reads it. It fits when it has the same version and every field the game reads, with the same kind of value. A vessel or a figurine new to the room joins at its starting place. One the room no longer has is left out, and a hand, the heater or the sink that held it is emptied. A saved state that does not fit is not resumed, and the room opens anew.

On the keeper's return the world first lives through the absence. A pour that was running stops. Then the room steps through the time away in fixed steps of 1 s, up to twelve hours, by which time everything has settled: tea goes cold even in the thermos, leaves go on steeping and turn bitter, a kettle left on the working heater boils dry, a cloth on it burns, and a running tap keeps running. Longer absences live only their first twelve hours. What happened while away is logged and is not shown.

Then the house is restocked. A spoon that crumbled to ash waits at its starting place again, clean and empty. The caddy is refilled where it stands, with the chosen tea up to the room's full amount, after any water or tea in it is poured out along with its wet leaves. The return says whether the spoon came back and whether the caddy was empty, so the keeper can remark on it.

Last, the day moves on. The time of day becomes the next one the room offers, in the order dawn, morning, day, sunset, dusk, night, and after the last one the day starts again. The return is placed at a share through the new time of day that the presentation passes in, and it reports `atmosphereChanged`.
