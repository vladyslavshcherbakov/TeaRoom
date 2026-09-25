# Simulation rules

These are the rules the simulation core follows. The numbers that differ per tea, vessel, heater, figurine or room live in the content definitions under `Shared/Content/`. The numbers that are the same everywhere are named constants next to the rule that uses them.

Units: temperature in °C, volume in millilitres, leaves in grams, time in seconds. Strength, bitterness, the gods' satisfaction and a figurine's satisfaction run from 0 to 100.

## Time

The world advances in fixed steps of 0.05 s, whatever the frame rate. A frame hands over its elapsed time and the core runs as many whole steps as fit, carrying the remainder to the next frame. The same session played at 30 and at 60 frames per second ends in the same state.

## Places and hands

A room has places, such as the counter, the shelf and the tea table. Each item that can be carried — every vessel, the caddy, the spoon and the cloth — is either on a surface at a spot of a place, or in one of the keeper's two hands. The spot keeps the exact position where the item was put down, so the room can show it there.

The keeper stands at one place, or at none while walking. An item is within reach when it is in a hand, or on a surface at the place where the keeper stands.

- Picking up needs the item within reach and a free hand. The first free hand takes it, and an open lid of the vessel or the caddy closes. Picking up the kettle from the heater lifts it off, and the water is judged if the heater was on.
- Putting down needs the item in a hand and the spot at the keeper's place.
- The heater's switch and the heater plate need the keeper at the heater's place. Putting a vessel on the heater takes it from the hand or from the same surface.
- Pouring needs the source and the target within reach. Walking away ends a pour.
- Lids, tasting and scooping need the item within reach. The spoon and the cloth are carried like any item: scooping and tipping leaves need the spoon in a hand, and wiping needs the cloth in a hand. The figurines are at the ritual place, so offering needs the keeper there. Wiping needs the keeper at a place with a puddle.

## Heat

A vessel on a working heater gains `degreesPerSecondPerLitre × 1000 / volume` degrees per second, up to 100 °C. Less water heats faster. Water that has reached the boil on a working heater boils away at the heater's `boilingAwayMlPerSecond`, 3 ml/s for the electric plate, so half a minute of boiling takes a ninth of a full kettle, until it is lifted off, switched off or boiled dry.

Every vessel closes a share of the gap to the room's temperature each second: `coolingPerSecond`, multiplied by the lid's `coolingMultiplierWhenOpen` while its lid is open. The thermos keeps heat far better than the kettle, and an open lid loses it faster. Cooling is applied before heating, so a vessel on a working heater still reaches boiling.

A vessel with a metal shell, the thermos, may stand on the heater too. On a working heater its metal heats to red in 20 seconds, and off a working heater it cools back in a minute. From a fifth of red heat it is too hot to hold, and picking it up, opening its lid and closing it are refused with `tooHotToHold`.

When the water on the heater first reaches the lower edge of the chosen tea's good range, the core announces it once per switch-on. This is the moment for two faint haptic pulses where the device has them.

## Judging water

Each tea defines an ideal temperature, a good range and a wider acceptable range. Water is `ideal` inside the good range, `slightlyCool` or `slightlyHot` between the good and acceptable ranges, and `tooCool` or `tooHot` outside them. Switching the heater off, or lifting the kettle off a working heater, reports this judgement. The gods judge the water only once per ritual, at the moment leaves and water first meet, because that is the water the tea is actually made with.

## Pouring

Flow follows tilt: nothing below 10°, a linear rise to the vessel's `maxPourMlPerSecond` at 45°. Above 80% of full flow a tenth of the stream splashes onto the table. The share of the stream that misses the opening also lands on the table. A target that is full overflows onto the table, and the core reports the first overflow of a pour. Temperature, strength and bitterness travel with the liquid and mix by volume in the target.

A vessel cannot be poured while it stands on the heater. A vessel whose lid must be open to pour, or to be poured into, refuses while that lid is closed.

## The sink and the tap

A room may have a sink with a tap, at one spot of one of its places, with the temperature of the tap's water and its flow in ml per second. The quiet room's sink is on the counter, its water is 18 °C at 50 ml/s, and its kettle starts empty.

The keeper puts an item from a hand into the sink while standing at the sink's place. One item fits at a time. A vessel or the cloth may go in, and the caddy and the spoon may not. Putting an item in turns the tap on if it is off. The keeper turns the tap on and off only at the sink's place.

The tap runs until it is turned off, also after the keeper walks away. It fills the vessel in the sink. A vessel whose lid must be open to be filled goes in with its lid closed too, and then the water runs over the lid down the drain until the lid is opened, and over it again if the lid is closed. The tap water mixes by volume with what the vessel holds. Once the vessel is full, the rest runs over the rim down the drain: the core reports the first overflow, and the table stays dry. The water running over the rim carries out what the vessel held, so tea in it fades towards the tap's water and hot water cools towards the tap's temperature, and the leaves in it are washed out: every full vessel's worth of water that runs over takes all but a seventh of them, and below 0.1 g none are left. A tea bowl that the tap ran over while it stood in the sink is emptied as it leaves the sink, because it was rinsed and its water poured away. The kettle and the thermos keep their water, because they are filled at the sink. With nothing in the sink, the water runs down the drain.

An item leaves the sink when it is picked up or put on the heater. Picking it up closes an open lid, as it does for any item. A vessel in the sink cannot be poured from or into.

## Leaves and brewing

The caddy opens, the spoon scoops `capacity × depth` grams, and the spoon tips everything it holds into a vessel that can hold leaves and whose lid is open. The kettle and the tea bowls can hold leaves, so tea may be brewed right in a bowl. Leaves stay in their vessel when it is poured from.

A brew starts when leaves and water first share a vessel, whichever arrives second. While it lasts:

- The leaf ratio is the grams per 100 ml divided by the tea's ideal grams per 100 ml.
- The heat factor is 0 at 40 °C, 1 at the tea's ideal temperature, and at most 1.5.
- Strength closes `strengthRatePerSecond × leaf ratio × heat factor` of the remaining gap to 100 each second, so it rises fast and then levels off.
- Bitterness grows by `bitternessPerSecond × leaf ratio × heat factor` each second, multiplied by `bitternessMultiplierAfterIdealTime` once the steep passes the tea's ideal time, and by `1 + bitternessGainPerDegreeAboveGood × degrees above the good range` when the water is too hot.

Tea poured out of the brewing vessel stops changing, apart from cooling. When the brewing vessel is emptied, that brew ends, and new water starts a new one.

## Tasting

A sip takes 20 ml, and it says whether the bowl held leaves. The verdict has four parts.

| Part | Values |
|---|---|
| Temperature | `tooHot` above 70 °C, `pleasant` from 45 to 70 °C, `lukewarm` from 30 to 45 °C, `cold` below 30 °C |
| Strength | `none` while it is still plain water, below 5, `weak` below the tea's balanced range, `balanced` inside it, `rich` up to 15 above it, `heavy` beyond, `extreme` from 98, the ceiling that a pile of leaves reaches within a minute |
| Bitterness | `soft` below 25, `noticeable` from 25, `high` from 45, `overbrewed` from 70 |
| Reaction | `waitsForItToCool` if too hot, else `strongGrimace` if overbrewed, else `grimace` if high bitterness or heavy or extreme strength, else `shrug` if plain water, weak or cold, else `contentSigh` |

## Offerings

A bowl set before a figurine goes entirely into its saucer. Each figurine accepts one offering per ritual. The figurine's satisfaction changes by 4 for any tea, plus 4 per point of its hidden affinity for that tea, plus 4 when the strength is in its preferred range, minus 4 when the bitterness is 45 or more. Near-plain water earns 1. The figurine answers with `glow` from 12, `subtle` from 6, and `barely` below that.

## The gods

The gods start at 50 in 0.1. Persistence arrives in 0.9.

| Moment | Change | Remark |
|---|---|---|
| Water meets leaves, `ideal` | +3 | `temperatureIsPerfect` |
| Water meets leaves, slightly off | 0 | `pretendNotToNotice` |
| Water meets leaves, too far off | −1 | `understandProbably` |
| First sip with a `contentSigh` | +4 | `pleasedWithTheTea` |
| First sip with a `shrug` | 0 | `pretendNotToNotice` |
| First sip with a `grimace` | −1 | `understandProbably` |
| First sip with a `strongGrimace` | −2 | `veryOverbrewed` |
| First sip too hot to drink | nothing yet: the next sip is the first | — |
| A pour that spilled 5 ml or more | −1 | `weWillTellNoOne` |
| An offering the figurine liked | + half its satisfaction gain, rounded up | `acceptTheOffering` |
| An offering that gained the figurine nothing | 0 | `understandProbably` |
| Finishing with a dry table and every lid closed | +2 | `appreciateTheCalm` |

No single moment costs more than 3 points, and the value stays between 0 and 100.

## The table

Spilled liquid makes a puddle on the place where it falls: around the vessel it was poured at when that vessel stands on a surface, otherwise where the keeper stands. Each place has its own puddle, and a puddle that dries up is gone. The wet area evaporates at 0.1 ml per second, so a full puddle of 30 ml dries by itself in five minutes. A wipe over the whole table removes 80% of the wetness when the stroke is 50 cm/s or slower, 30% at 200 cm/s or faster, and a share in between for speeds in between. A wipe over a part of the table removes `1 − (1 − that share)^part`, so many short wipes remove as much as one long wipe over the same area. The puddle has a tea strength, mixed by volume from every spill. The cloth takes in the water it wipes up, and tea stains it: 20 ml of the strongest tea stain it fully, and weaker tea or less of it stains it in proportion. A clean cloth dries at 0.1 ml per second, and a fully stained one at 0.03 ml per second, with a stain in between drying in between. A cloth in the sink under the running tap loses a full stain in 3 seconds and soaks up the tap water, up to the 40 ml it holds. The keeper wrings it out as it leaves the sink, down to 8 ml.

The cloth may lie on the heater, like the kettle. On a working heater a wet cloth steams dry at 2 ml per second, and a dry one chars, fully in a minute. Charring stops when the heater is off or the cloth is lifted, and what is charred stays charred. The tap washes a full charring out in 5 seconds, and the cloth is as good as new. The gods do not care about the cloth. A cloth laid down in the puddle soaks it up at 0.5 ml per second while it lies there. It stops when the puddle is gone, when it holds 40 ml, or when it is picked up. The presentation says when the cloth lands in the puddle with `soakUpThePuddle`, because only the room knows where the puddle is. The command needs the cloth lying on a place's surface, the keeper there, and a puddle on that place.

## Phases

`settingUp` accepts only choosing the mood and beginning. `ritual` accepts everything except beginning again and leaving. Finishing ends any pour, switches the heater off and moves to `resting`, where the room keeps cooling and drying, and the keeper can still walk, take and put down items, change the mood and leave. Leaving moves to `ended`, where time stops and every command is refused.
