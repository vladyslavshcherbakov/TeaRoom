import assert from 'node:assert/strict'
import test from 'node:test'
import { actionIconSvg } from '../../../Apps/Game/Room/Rendering/Controls/ActionIcons.ts'
import type { ActionKind } from '../../../Apps/Game/Room/ActionMenu.ts'
import type { CarriedShape } from '../../../Apps/Game/Room/CarriedShapes.ts'

const everyActionKind: readonly ActionKind[] = ['take', 'putAway', 'openTheLid', 'sip', 'pourInto', 'scoopFrom', 'tipLeavesInto', 'putDownHere', 'putOnTheHeater', 'putInTheSink', 'fillWithWater', 'wash']
const everyShape: readonly CarriedShape[] = ['kettle', 'thermos', 'caddy', 'bowl', 'spoon', 'cloth']

test('actionIcon_ofEveryActionWithEveryItem_isAPictureWithEveryNumberSet', () => {
  const brokenIcons = everyActionKind.flatMap((kind) => everyShape.flatMap((item) => everyShape.map((target) => ({ kind, item, target, svg: actionIconSvg({ kind, item, target }) }))))
    .filter(({ svg }) => !svg.startsWith('<svg') || /undefined|NaN/.test(svg))

  assert.deepEqual(brokenIcons.map(({ kind, item, target }) => `${kind} ${item} ${target}`), [])
})

test('actionIcon_ofPuttingDownTwoDifferentItems_showsWhichItem', () => {
  const kettleIcon = actionIconSvg({ kind: 'putDownHere', item: 'kettle', target: null })
  const bowlIcon = actionIconSvg({ kind: 'putDownHere', item: 'bowl', target: null })

  assert.notEqual(kettleIcon, bowlIcon)
})

test('actionIcon_ofTakingAnyItem_isTheSameHand', () => {
  const takingIcons = new Set(everyShape.map((item) => actionIconSvg({ kind: 'take', item, target: null })))

  assert.equal(takingIcons.size, 1)
})
