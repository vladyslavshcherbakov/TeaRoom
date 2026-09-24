# Simulation rules

These are the rules the simulation core follows. The numbers that differ per tea, vessel, heater, figurine or room live in the content definitions under `Shared/Content/`. The numbers that are the same everywhere are named constants next to the rule that uses them.

Units: temperature in °C, volume in millilitres, leaves in grams, time in seconds. Strength, bitterness, the gods' satisfaction and a figurine's satisfaction run from 0 to 100.

## Time

The world advances in fixed steps of 0.05 s, whatever the frame rate. A frame hands over its elapsed time and the core runs as many whole steps as fit, carrying the remainder to the next frame. The same session played at 30 and at 60 frames per second ends in the same state.

## Places and hands

A room has places, such as the counter, the shelf and the tea table. Each item that can be carried — every vessel and the caddy — is either on a surface at a spot of a place, or in one of the keeper's two hands. The spot keeps the exact position where the item was put down, so the room can show it there.

The keeper stands at one place, or at none while walking. An item is within reach when it is in a hand, or on a surface at the place where the keeper stands.

- Picking up needs the item within reach and a free hand. The first free hand takes it, and an open lid of the vessel or the caddy closes. Picking up the kettle from the heater lifts it off, and the water is judged if the heater was on.
- Putting down needs the item in a hand and the spot at the keeper's place.
- The heater's switch and the heater plate need the keeper at the heater's place. Putting a vessel on the heater takes it from the hand or from the same surface.
- Pouring needs the source and the target within reach. Walking away ends a pour.
- Lids, tasting and scooping need the item within reach. The spoon and the cloth are carried like any item: scooping and tipping leaves need the spoon in a hand, and wiping needs the cloth in a hand. The wet table and the figurines are at the ritual place, so wiping and offering need the keeper there.

## Heat

A vessel on a working heater gains `degreesPerSecondPerLitre × 1000 / volume` degrees per second, up to 100 °C. Less water heats faster. Water that has reached the boil on a working heater boils away at the heater's `boilingAwayMlPerSecond`, 0.5 ml/s for the electric plate, until it is lifted off, switched off or boiled dry.

Every vessel closes a share of the gap to the room's temperature each second: `coolingPerSecond`, multiplied by the lid's `coolingMultiplierWhenOpen` while its lid is open. The thermos keeps heat far better than the kettle, and an open lid loses it faster. Cooling is applied before heating, so a vessel on a working heater still reaches boiling.

When the water on the heater first reaches the lower edge of the chosen tea's good range, the core announces it once per switch-on. This is the moment for two faint haptic pulses where the device has them.

## Judging water

Each tea defines an ideal temperature, a good range and a wider acceptable range. Water is `ideal` inside the good range, `slightlyCool` or `slightlyHot` between the good and acceptable ranges, and `tooCool` or `tooHot` outside them. Switching the heater off, or lifting the kettle off a working heater, reports this judgement. The gods judge the water only once per ritual, at the moment leaves and water first meet, because that is the water the tea is actually made with.

## Pouring

Flow follows tilt: nothing below 10°, a linear rise to the vessel's `maxPourMlPerSecond` at 45°. Above 80% of full flow a tenth of the stream splashes onto the table. The share of the stream that misses the opening also lands on the table. A target that is full overflows onto the table, and the core reports the first overflow of a pour. Temperature, strength and bitterness travel with the liquid and mix by volume in the target.

A vessel cannot be poured while it stands on the heater. A vessel whose lid must be open to pour, or to be poured into, refuses while that lid is closed.

## Tap water

A room may have a tap at one of its places, with the temperature of its water and its flow in ml per second. The quiet room's tap is at the counter, 18 °C and 50 ml/s, and its kettle starts empty.

A vessel fills from the tap while the keeper holds it in a hand at the tap's place. A vessel whose lid must be open to be filled goes under the tap with its lid closed too, and then the water runs over the lid into the sink until the lid is opened, and over it again if the lid is closed. The tap water mixes by volume with what the vessel holds. Once the vessel is full, the rest runs over the rim into the sink: the core reports the first overflow, and the table stays dry. The filling stops when the tap is closed, when the keeper walks away, and at the next step after the vessel leaves the hand. Only one vessel fills at a time, and a vessel that is filling cannot be poured.

## Leaves and brewing

The caddy opens, the spoon scoops `capacity × depth` grams, and the spoon tips everything it holds into a vessel that can hold leaves and whose lid is open.

A brew starts when leaves and water first share a vessel, whichever arrives second. While it lasts:

- The leaf ratio is the grams per 100 ml divided by the tea's ideal grams per 100 ml.
- The heat factor is 0 at 40 °C, 1 at the tea's ideal temperature, and at most 1.5.
- Strength closes `strengthRatePerSecond × leaf ratio × heat factor` of the remaining gap to 100 each second, so it rises fast and then levels off.
- Bitterness grows by `bitternessPerSecond × leaf ratio × heat factor` each second, multiplied by `bitternessMultiplierAfterIdealTime` once the steep passes the tea's ideal time, and by `1 + bitternessGainPerDegreeAboveGood × degrees above the good range` when the water is too hot.

Tea poured out of the brewing vessel stops changing, apart from cooling. When the brewing vessel is emptied, that brew ends, and new water starts a new one.

## Tasting

A sip takes 20 ml. The verdict has four parts.

| Part | Values |
|---|---|
| Temperature | `tooHot` above 70 °C, `pleasant` from 45 to 70 °C, `lukewarm` from 30 to 45 °C, `cold` below 30 °C |
| Strength | `weak` below the tea's balanced range, `balanced` inside it, `rich` up to 15 above it, `heavy` beyond |
| Bitterness | `soft` below 25, `noticeable` from 25, `high` from 45, `overbrewed` from 70 |
| Reaction | `waitsForItToCool` if too hot, else `strongGrimace` if overbrewed, else `grimace` if high bitterness or heavy strength, else `shrug` if weak or cold, else `contentSigh` |

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
| Finishing with a dry table and every lid closed | +2 | `appreciateTheCalm` |

No single moment costs more than 3 points, and the value stays between 0 and 100.

## The table

Spilled liquid makes the table wet. The wet area evaporates at 0.05 ml per second. A wipe removes 80% of the wetness it covers when the stroke is 15 cm/s or slower, 30% at 45 cm/s or faster, and a share in between for speeds in between.

## Phases

`settingUp` accepts only choosing the mood and beginning. `ritual` accepts everything except beginning again and leaving. Finishing ends any pour, switches the heater off and moves to `resting`, where the room keeps cooling and drying and only the mood can change. Leaving moves to `ended`, where time stops and every command is refused.
