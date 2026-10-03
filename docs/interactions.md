# Interactions

How the player acts in the room, and what the room answers. The rules of the world behind it are in `docs/game-logic.md`.

## Presses and taps

- A press that moves less than 12 px is a tap when the finger lifts, unless it started a pour or became a hold. A press that moves further does nothing.
- A press on a held item, or on its lid, that stays within 12 px for a second is a hold: it shows the item up close, and its lifting finger is not a tap. Moving further, or a second finger, turns it back into an ordinary press.
- A finger the browser takes away, for a system gesture or an alert, never taps. If it aimed a pour, the vessel returns to its hand.
- Everything a tap can act on answers in its area on the screen: the box it covers, grown about its middle to at least 44 by 44 points, in every view and at every zoom. A thing whose middle is hidden behind something nearer has no area.
- A thing in the room takes a tap in its area only when it is drawn within a fingertip of the finger, 22 points each way, and when what the finger touched does not lie well in front of it: more than 5 cm, or more than a fingertip spans at that distance. So a tap on the counter under a book on the wall stays on the counter. The areas of the held items and of the inventory have no such limits.
- A tap on something seen goes to it, so a lid, the opening of a vessel, a control or an item seen under the finger always wins. A tap on a place, such as the floor, furniture, the heater's plate, the sink or the heater's panel, goes to the thing whose area holds the finger: a held item or a place of the inventory first, then the thing nearest the finger on the screen, then the one nearest the eyes.
- A held item answers in its hand's area, a little wider than the item and a sixth of the screen high. A tap beside it, outside that area, goes to what lies there, so a tap on nothing still leaves the close-up. A hand's area lets a tap through to what lies under it when that has a menu or is a control: a surface or the heater with something in hand, the sink, the tap, an item or a switch. A tap on the held item itself always opens its own menu.
- An item in the inventory answers in the area of its place, and that area takes every tap.
- The lid and the opening of a vessel answer only on themselves, and so do the rose bushes.

## Walking and the camera

| Gesture | What it does |
|---|---|
| Tap the floor | The player walks there, around the furniture. The player turns at most 5 radians a second: a way more than 60° to the side or behind starts with a turn on the spot, and smaller turns are made while walking. |
| Tap furniture, or anything on it | The player walks to it, and the camera shows it close up. The tea table is used from the nearer of its long sides, and the camera shows it from that side. |
| Tap the floor or nothing in a close-up | The camera returns to the room. |
| Move the mouse over the room without a button | The standing player turns to face the floor under the mouse. |
| Pinch, or turn the mouse wheel | The camera moves along its line of sight, from half to 1.6 times its usual distance. The room keeps its zoom while the player walks to furniture and after a close-up. Each close-up starts at its usual distance. There is no pinch while a pour is aimed. |

## First person

| Gesture | What it does |
|---|---|
| Push the walking stick, left unless the settings swap it, or hold W, A, S, D or the arrows | The player walks that way at walking speed, only on the floor, sliding along the furniture and the walls. Within 70 cm of furniture, taps act on it as in its close-up. Walking stops a walk to furniture that a tap started. |
| Push the looking stick, right unless the settings swap it | The view turns round, faster the further it is pushed, and tilts up to about sixty degrees. |
| Tap anything | As in the room view. The view turns towards the way until the player turns it during the walk, and turns again when the next walk starts. A standing player faces where the view looks, so a walk turns from there and not from the way of the last walk. |
| Click the room with a mouse | The first click catches the mouse, a ring marks the middle of the screen, and moving the mouse turns the view. A click or a long press acts under the ring, and with the button held a cloth in hand wipes under it. Esc lets the mouse go, and so do aiming a pour, an item up close, a menu of actions, the settings, the achievements and the debug menu. Where the page may not catch the mouse, a click acts where it points. |
| Sit at the tea table | The player sits after walking to the table by a tap, or on acting at it. The view sinks to seated eyes in 0.8 s and turns to the table on the way, and standing up raises it the same way. Walking stands the player up, and the table stays within reach until the player walks away. At the counter and the shelf the player stands. |

A pour aimed in first person tips the spout to the right of the way the player looks. In first person the player is not drawn, and held items are drawn at the edges of the view through a 30° lens of their own.

## The keys

- 1 and 2 act as a tap on the item in the left or right hand, and open its menu. Held for a second in any view, the key shows the item up close, and any of these keys closes it.
- E sips from the first hand that holds something to sip, and Space held while aiming tilts as the tilt button does.
- A key does only what a tap could do: while a pour is aimed or a sip is taken, 1, 2 and E do nothing, and after the player died no key does anything.
- When the window loses focus or the page is hidden, every held key is let go: a pour tilts back, the player stops walking, and a held hand key neither taps nor shows its item.

## Hands, the inventory and the menu

The player has two hands and an inventory of two places. The inventory is drawn at the bottom of the screen in the middle, in every view: a small wooden ledge seen a little from above, which the texts call the ledge. Whatever lies there stands small on its place, upright and turned an eighth of a turn. Nothing on it reaches the other place's item, and a cloth may hang a little over the ledge's end. With nothing on it, the ledge is seen through.

A tap on an item, a held item, a closed lid, a place of the inventory, a surface, the heater, the sink or the tap opens a small menu of what can be done there, beside the finger. A key or a tap with no point on the screen opens it low in the middle. A menu opens even with one action in it. Each action shows a flat picture of itself on its right, with the item drawn in where it tells the actions apart, such as which item goes down or what pours into what. Taking shows only a hand, opening a lid shows the item with its lid open on its hinge, and putting an item down looks the same on a table as on the ledge. A tap on an action does it and closes the menu. A tap anywhere else closes the menu and does nothing more. While it is open the player does not walk. A switch, a button, an open lid, the floor and the wall controls open no menu, whatever the hands hold.

| Tap | The menu offers |
|---|---|
| An item that is not held, or its closed lid | Take it into the first free hand, put it away in the inventory if a place is free, and open its lid if it has a closed one. Then what each held item can do with it: pour into it from a held vessel, scoop leaves from an open caddy with the spoon, tip the spoon's leaves into a vessel that takes them. |
| A held item, or its closed lid | Put it away, if the inventory has a free place, open its lid, if it has a closed one, and sip from it, if it holds something to sip. |
| A place of the inventory | Take its item into a hand. |
| A surface, with something in hand | Put each held item down where the finger touched. |
| The heater, with something in hand | Put each held item on it. |
| The sink | See the sink and the tap. |

- An item is taken into the first free hand. With both hands full it stays, and the player answers each try with a line that changes every time, about a third arm or about carrying bowls when both hands hold bowls.
- An item put away goes into the first free place of the inventory, and its lid closes. It goes on cooling there, and leaves in it steep. Only taking it into a hand reaches it again.
- An item put down stands where the finger touched, turned to face the side it was put down from, if it fits. It does not fit over an edge, on the heater, over the sink, on another item, on an open lid lying there or on top of the shelf. Then it stands at the nearest spot of the same top where it fits, no farther than `nearestSpotSearchedWithinMetres` in `Apps/Game/Room/Placement.ts`. Among the spots a little farther than the nearest, up to `snugSpotsWithinMetresOfTheNearest`, it takes the one that touches the most of the edges, the heater, the sink, other items and open lids, so that it leaves no thin gaps. With no such spot it stays in the hand, and the player says there is no room.

| Gesture | What it does |
|---|---|
| Hold a finger on a held item, or its lid, for a second | The item comes up close in the middle of the screen, over the room dimmed behind it, in any view and in any hand, but not while a pour is aimed or a sip is taken. The world goes on, and nothing about the item changes. |
| Drag while an item is up close | It turns: a hundred pixels across turn it one radian about its upright, and up and down tip it towards or away from the viewer. |
| Pinch, or the wheel, while an item is up close | It grows or shrinks, from six tenths to three times its size. The camera stays. |
| Tap while an item is up close | On the item or its lid, nothing. Anywhere else the item goes back to its hand and nothing more happens. |

Once a visit, when the last item goes onto the shelf and everything the player can carry stands there, the player says a line about the tidiness.

## Lids

- The lid of a kettle, thermos or caddy opens from the item's menu, in a hand or standing at the place where the player is. A tap on an open lid closes it at once, with no menu.
- An open lid lies on the surface beside its item where there is room, trying the left, the right, the front, the back and the diagonals, never on the heater, over the sink, past an edge, on another item or on another lid, and with no room it stands open on its hinge. A lid already lying keeps its place. On an item in the sink or in a hand, the lid stands open on its hinge.

## The heater

| Gesture | What it does |
|---|---|
| Choose to put an item on the heater | The kettle, the thermos, the cloth or the spoon goes on it. A tea bowl or the caddy is offered too, stays in the hand, and the player objects in a line that changes with every try. |
| Tap the switch under the heater | The heater switches on or off, whatever the hands hold. In nerd mode it holds the water at the thermostat's target, and without it the water boils. While the thermostat works, the switch switches both off. |
| Tap ▼ or ▲ under the heater's display, in nerd mode | The target moves a degree, from 40 to 100 °C or 104 to 212 °F. Held for half a second, an arrow steps ten degrees a second. |
| Tap the thermostat's button, in nerd mode | It starts the thermostat, and a lamp glows while it works. Tapped again, it switches the heater off. |

- The switch, the arrows and the button work whatever the hands hold, and a tap reaches them through a hand's area. From the room, a tap on any of them walks to the counter.
- On a working heater the thermos's metal glows red, and while it glows, taking it or opening its lid leaves it as it is, and the player says it is too hot to take.
- Once a visit, on the fourth or fifth different item tried on the working heater, chosen at random when the page opens, the player is teased as a tester in place of that item's own line.
- In nerd mode the kettle shows its water's temperature in whole degrees, and dashes when it is empty.
- Steam rises from the opening of a hot open vessel and from the kettle's spout as many small wisps. They swirl as rising air does, grow and fade within about two seconds, and the hotter the water, the more of them rise. Wisps of a vessel that is carried lag behind it and curl away, and during a sip they bend toward the eyes.

## The sink and the tap

The tap runs either to fill or to wash. Filling keeps the leaves and the water in a vessel, and washing rinses them out, as `docs/game-logic.md` says.

| Gesture | What it does |
|---|---|
| Tap the sink with the tap closed | The menu offers to put each held item that fits into the empty sink, and the tap stays closed. With an item in the sink, it offers to fill it or to wash it. |
| Tap the sink with the tap running | The menu offers to fill or to wash each held item that fits. The item goes into the sink, and the tap runs for what was chosen. |
| Tap the tap while it runs | The water turns off, with no menu. |
| Tap the closed tap over the empty sink | The water turns on, with no menu. |
| Tap the closed tap with an item in the sink | The menu offers to fill it or to wash it, and the tap turns on for what was chosen. |
| Tap the item in the sink | Its menu offers to take it or put it away. The water keeps running. |

- A cloth can only be washed, so its menu offers washing alone.
- Choosing to fill or to wash opens the vessel's lid. Closing it again is the player's own business. The tap never turns off by itself.

## Pouring

| Gesture | What it does |
|---|---|
| Choose to pour into a vessel on a surface or in the sink from a held vessel | The pour is aimed, even when the held vessel is empty. The held vessel hovers over the target, 22 cm to its left on the screen with its spout towards it, and the tilt button and an i button appear. The i button tells in the caption how the pour works, and the aiming goes on. A closed lid that would stop the pour opens by itself, apart from the kettle's own lid, which it pours past. The first time on a device, a short note explains the gesture. |
| Drag a finger while aiming | The vessel moves with the change of the finger's position, at its height above the target, anywhere up to 5 cm from the walls. Water that falls past the edge of the target's top, or into the sink's opening, is lost and leaves no puddle. Past the edge the stream is drawn down to the floor. The pour goes into whichever vessel on the target's board the spout is over, and a running pour carries on into it. |
| Hold the tilt button while aiming | The vessel tilts by 30° a second, up to 1° below the tilt where the target's opening starts to splash, so a steady pour into the middle of a bowl keeps the table dry. Past 10° it pours. Releasing the button tilts it back by 70° a second, and the pour stops when it is upright. |
| Tap while aiming, without dragging | The aiming ends. On a surface the vessel is put down where the finger touched or at the nearest spot that fits, as above, in an empty sink it goes into the sink, and elsewhere it returns to its hand. Into the sink with the tap running, it asks first whether to fill the vessel or to wash it. A tap on the opening of a vessel made for drinking, such as a tea bowl, also takes that vessel into a free hand. Walking away ends it the same way. |
| Tap the lid of the vessel being aimed | The lid opens or closes, and the aiming goes on. |

The room tells the game logic which share of the stream lands in the target's opening, because only the room knows where the spout is.

A drawn stream falls from the spout or the tap, and what it falls into changes on the screen only when it arrives: a vessel fills, and an item in the sink gets wet, loses its stain or its charring, as it was when the arriving water left the spout.

Where a liquid's surface shows, as in a tea bowl, the thermos or the caddy, it moves as water does, seen from above, with a top layer and a deep layer whose colour shows faintly through. A stream that lands in it lays its own colour where it falls. A stream warmer than the liquid stays on top and spreads outward from where it falls, and the top sinks at the walls. A colder stream sinks: its colour goes mostly into the deep layer, the surface is drawn in where it falls, and the deep colour spreads outward under it. A stream that runs along the wall sets the liquid turning the way it runs, and the motion calms over several seconds. Small swirls are kept alive and stretch the colours into streaks. A simmering or boiling liquid churns, and rising bubbles bring the deep colour up. Over about twenty seconds every colour evens out into the colour of the mixed liquid. Leaves steeping in it send darker colour down into the deep layer while the tea is still pale, and stop once it is rich.

## Leaves

- With the spoon in hand, the menu of the open caddy offers to scoop a full spoon, and the menu of a vessel that takes leaves offers to tip in the spoon's leaves. A closed caddy and an empty spoon offer neither.

## Tasting, dying and the figurines

- The menu of a held tea bowl, thermos or caddy with something in it offers a sip. The sip raises the vessel to the lips, and it is back in about a second and a half. Until then taps and keys do nothing.
- After a sip the player says in one line how it feels, for nine seconds or until the line is tapped away. Plain water and a bowl with leaves in it have lines of their own. Each visit has a voice chosen at random when the page opens, and the same feeling gets the same phrase during a visit.
- A sip of heavy or extreme tea straight from the caddy kills the player: YOU DIED, the player's last words and an obituary, and after four seconds a Start over button that reloads the game.
- The figurines take no tea. A tap on them, from anywhere, leaves the player where they are, and the room says in a line that changes each time that it keeps the sill for itself.

## The cloth

- A puddle lies where the water fell, on the top it fell on, and ends at the top's edges and at the sink's opening. A top can hold several puddles, and puddles that touch run into one. A puddle grows on the screen only as the drawn stream reaches the top, and a wiped puddle shrinks at once.
- With the cloth in a hand, a finger stroked over a table or the counter moves the cloth under it and wipes as it goes, each 2 cm of the stroke at its own speed. The stroke follows the top the finger touches, also where the area of an item, the sink or the tap holds the finger. The cloth goes under the things standing on the top and wipes there too. While any part of it is under a thing or an open lid, its folds settle flat to a few millimetres within about a tenth of a second, and they rise again when it comes out. Only the part over the puddle counts, and the share it covers is that length times the cloth's 20 cm width over the puddle's area.
- Put down in a puddle, the cloth soaks it up while it lies there.
- The cloth darkens by the share it holds of all the water it can take, and lightens as it dries, is washed or is wrung out, over about two seconds, never at once. Tea stains it by the tea it takes in, and the stain fades the same way.

## What the player says

- Barks of one kind, such as the answers to full hands, to a bowl put on the heater, to the figurines tapped, to a thermos too hot to take, or to a long-running tap or heater, come one at a time, each different. Once every line of a kind has been said, the player keeps quiet about it until the next visit.
- The lines about a cloth taken off the heater smouldering, or washed back to new, are said once a visit. A spill of 5 ml or more gets a line at most once in two minutes of play.
- The heater switched off after two minutes of wasted work, and the tap turned off after two minutes of running, each get a line.
- The sip lines are said every time.

## Achievements

- They are shown at first: a medal on the wall and a notice for each one earned. Turning off Show achievements in the settings hides both, and the player earns them without knowing. Turning it on again shows what was earned meanwhile, without notices.
- A tap on the medal opens a sheet with every title. A title only hints. An earned achievement is crossed out and ticked with a line on what the player did. One that cannot be earned in this room or at this moment is dimmed, with no word why.
- An achievement earned while they are shown is announced at the top of the screen for four seconds, one after another.
- They are kept in the browser for good, through new visits, death and Start over. Reset on the sheet clears them after a second tap.

`achievementIds` in `Apps/Game/Room/Achievements.ts` lists them, and the rule that earns each is beside it.

## The settings

A gear on the wall opens the settings. Each change turns the gear a tooth. While they are open the camera faces the gear. The settings are kept in the browser for good.

`roomSettingValues` in `Apps/Game/Room/RoomSettings.ts` lists every setting with what it may be and its default, and `settingsScreenRows` in `Rendering/Controls/SettingsScreen.ts` shows them.

- Body colour paints the player at once. Face picks one of six faces, named only 1 to 6: the nose, the eyes, googly eyes, the ears, an afro and a giant afro. A sparrow sits on top of the giant afro, facing backwards. At Full object detail it casts a shadow that follows its animation, and at Reduced it casts none. The settings keep the face as a list of features, so a later setting can show several at once. A new game picks the nose, the eyes or the ears at random, and a continued visit keeps the face.
- Sound plays every sound at its own loudness at Full, at half at Medium, at a quarter at Quiet, and not at all at Off. The first-visit note and the screen that offers to continue offer the same choice, and a choice there is kept as if made in the settings.
- When first person begins, the camera glides into the player's eyes in 1.5 s.
- With a mouse the game starts on the mouse and the keyboard, and on a phone on two sticks.
- Object detail Reduced draws a tea bowl smaller than 60 points on the screen with a third of its triangles and its paintings in full, and the flowers more than 3 m beyond the walls with simpler shapes. The glass bowl keeps all its triangles, and between 70 and 50 points across its glass turns smoothly from glass that bends what is behind it into plain see-through glass.
- Time in the tea room counts only the time the page is shown, over every visit, and not the screen that offers to continue or the screen after death.

## The debug menu

Ten taps in a row on a rose bush open it. Any other tap before the tenth starts the count again. It sets the player's height from 70 to 200 cm, shows or hides the frame budget, runs the time of the world twenty times faster, chooses which of the sparrow's eighteen animations it plays, and fills the kettle with boiling water. Its foot credits the sparrow's author under CC BY 4.0, with links to the model and the licence. Everything it sets is kept in the browser. `debugSettingValues` in `Apps/Game/Room/DebugSettings.ts` lists them.

## The book of instructions

A folio under the gear opens on its first page each time. Its parts say how to take things and put them away through the menu, how to pour, how to look at a held thing closely, and how to fill or wash a bowl. It says nothing of the keys, and nothing the room keeps as a find.

## The corner buttons

On a computer with a mouse, a full screen button sits in the top right corner. In first person a button beside it goes back to the room view as the finger lifts. On a touch screen both are 44 px wide.

## Sound

- Sound starts with the first touch, click or key press, as iOS Safari requires. Until then the room is silent.
- Birds sing softly all the time once the room is shown, about 20 dB under every other sound.
- The tap, a pour from a vessel, the heater, the kettle's whistle and a burning spoon or cloth last while they happen and loop without a seam. The whistle begins, a little quieter than the rest, when the water in a kettle on a working heater reaches 90 °C. A working heater hums, fading in as it is switched on and out as it is switched off. Fire begins with the embers of a smouldering spoon or cloth and lasts while it burns, and the heater's hum gives way to it.
- A sip is heard once the bowl is halfway to the lips.
- A soft whoosh plays when a table, the shelf or the counter comes close up and when its close-up is left.
- An item put down on a top, the heater or into the sink knocks softly, and an item taken from one lifts with its own sound.
- A cloth rubs while the finger moves it across a puddle and wipes water up, and falls silent a moment after. A cloth moved over a dry top, lying in a puddle or soaking up water makes no sound.
- Every button and switch on the page clicks as it is pressed, except the guide's page buttons, which rustle. A press that unlocks sound clicks as soon as sound starts. In the room, a tap on the medal, the settings gear, the guide book, the heater switch or the thermostat's buttons clicks, and so does every lid that opens or closes. A tap on the faucet does not, and a menu of actions opens in silence. Its actions click as they are pressed, as every button on the page does.
- The debug menu opens with its own sound, and each turn of a page in the guide rustles.
- The gears on the wall grind when they start to turn after a setting changes.
- An achievement that is announced plays its sound.
- Scooping leaves from a caddy and tipping them from the spoon into a vessel rustle.
- A burning spoon taken from the heater crumbles to ash under a gust of wind.
- The death screen comes with its own sound.
- A metal vessel on a working heater sounds a quiet siren once, two seconds before it grows too hot to hold.
- Sounds pause while the page is hidden.

## Saving and continuing

- The first time a browser opens the game, a note over the page says that the game teaches nothing yet and that a cup of tea is made as in real life. Its OK button has an O drawn as a round white porcelain teapot and a K wound with flowers. Under it the player can choose the sound, as in the settings. Once OK is tapped, the note never shows again in that browser, even after Start over or a death.
- The visit is saved every two seconds and when the page is hidden or left.
- While the page builds the room, it shows a spinning ring with "Loading the room", under the disclaimer on the first opening, until the room's first frame is drawn.
- When the page opens with a saved visit, a screen offers Continue and Start over, and the choice of sound from the settings. On a computer with a mouse it lists the keys.
- A tap on Continue or Start over turns that button into a spinning ring and dims the other one until the room has been built, then the screen goes.
- Continue brings the visit back as it was left, after the world has lived through the time away as `docs/game-logic.md` says. The light moves on to the next time of day at a random hour within it. The voice and the once-a-visit jokes start anew. The player says one line when the spoon came back or the caddy had been empty.
- Start over and the player's death forget the visit. When the game can no longer read the saved visit, the room opens anew and the player says the last visit did not survive.

## A new room

- The room opens at dawn, by day or at sunset, at a random moment, and the light holds still while the player stays.
- A new visit sets the bowls on the shelf in a random order, and a continued visit keeps it.
- A new game arranges the room at random, and a continued visit keeps the arrangement. `RoomArrangement.ts` lists the choices: the window, what stands beside it, the tea table's side, where the caddy and the spoon lie, and the cushions. The room has one cloth, of a random pattern, on the tea table, on the shelf's upper board or on the counter by the thermos.
- The prophecy on the beam above the window shows only in a room with the window in the back wall, from the window side of the tea table.
