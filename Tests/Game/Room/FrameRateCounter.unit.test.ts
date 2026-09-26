import assert from 'node:assert/strict'
import test from 'node:test'
import { FrameRateCounter } from '../../../Apps/Game/Room/Views/FrameRateCounter.ts'

const framesInHalfASecondAtEightFramesASecond = 4

test('frameRate_whenTheSettingsChangeWhileItIsShown_keepsItsReading', () => {
  const page = new PageWithOneElement()
  const counter = new FrameRateCounter(page.container)
  counter.show(true)
  for (let frame = 0; frame < framesInHalfASecondAtEightFramesASecond; frame += 1) counter.frameDrawn(1 / 8)

  counter.show(true)

  assert.equal(page.element.textContent, '8 fps')
})

test('frameRate_whenHidden_showsNoReading', () => {
  const page = new PageWithOneElement()
  const counter = new FrameRateCounter(page.container)
  counter.show(true)
  for (let frame = 0; frame < framesInHalfASecondAtEightFramesASecond; frame += 1) counter.frameDrawn(1 / 8)

  counter.show(false)

  assert.equal(page.element.hidden, true)
  assert.equal(page.element.textContent, '')
})

class PageWithOneElement {
  readonly element = { className: '', hidden: false, textContent: '' }
  readonly container = { ownerDocument: { createElement: () => this.element }, append: () => {} } as unknown as HTMLElement
}
