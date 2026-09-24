import assert from 'node:assert/strict'
import test from 'node:test'
import { captionLinesFor } from '../../../Apps/Game/Room/RoomTexts.ts'

test('caption_ofAnOffering_namesTheFigurineAndThenTheGods', () => {
  const lines = captionLinesFor([
    { type: 'figurineAcceptedTea', figurineId: 'dragon', response: 'glow' },
    { type: 'godsMoodChanged', delta: 2, satisfaction: 52, remark: 'acceptTheOffering' },
  ], 7)

  assert.deepEqual(lines, ['The dragon glows softly.', 'The offering is accepted.'])
})

test('caption_ofASipThatMovesTheGods_leavesTheGodsUnnamed', () => {
  const lines = captionLinesFor([
    { type: 'teaTasted', cupId: 'bowl1', verdict: { temperature: 'pleasant', strength: 'balanced', bitterness: 'soft', reaction: 'contentSigh' } },
    { type: 'godsMoodChanged', delta: 4, satisfaction: 54, remark: 'pleasedWithTheTea' },
  ], 7)

  assert.equal(lines.length, 1)
  assert.ok(!lines.some((line) => line.includes('gods')), lines.join(' / '))
})

test('caption_ofABurntClothWashedBackToNew_marvelsAtTheWorld', () => {
  const lines = captionLinesFor([{ type: 'burntClothWashedBackToNew' }], 7)

  assert.equal(lines.length, 1)
  assert.ok(burntClothLines.includes(lines[0] ?? ''), lines.join(' / '))
})

const burntClothLines = [
  "Amazing. A burnt cloth washes back to new. I think I'll stay in this world.",
  'Not a trace of the fire. This world forgives things. I could live here.',
  "Scorched a minute ago, good as new now. I'm not leaving this place.",
  'Burnt, rinsed, reborn. What a kind little world.',
]
