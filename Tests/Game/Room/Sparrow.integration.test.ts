import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { sparrowAnimations } from '../../../Apps/Game/Room/Debug/SparrowAnimations.ts'

const glbHeaderBytes = 12
const chunkHeaderBytes = 8

test('sparrowAnimations_inTheDebugMenu_areExactlyTheAnimationsOfTheModel', () => {
  const namesInTheModel = animationNamesIn(new URL('../../../Apps/Game/Room/Models/sparrow.glb', import.meta.url))

  assert.deepEqual([...namesInTheModel].sort(), [...sparrowAnimations].sort())
})

test('sparrowModel_holdsNoImage', () => {
  const model = jsonChunkOf(new URL('../../../Apps/Game/Room/Models/sparrow.glb', import.meta.url))

  assert.deepEqual({ images: model.images ?? [], textures: model.textures ?? [] }, { images: [], textures: [] })
})

function animationNamesIn(file: URL): readonly string[] {
  return (jsonChunkOf(file).animations ?? []).map((animation) => animation.name ?? '')
}

function jsonChunkOf(file: URL): { readonly animations?: readonly { readonly name?: string }[]; readonly images?: readonly unknown[]; readonly textures?: readonly unknown[] } {
  const bytes = readFileSync(file)
  const jsonLength = bytes.readUInt32LE(glbHeaderBytes)
  return JSON.parse(bytes.subarray(glbHeaderBytes + chunkHeaderBytes, glbHeaderBytes + chunkHeaderBytes + jsonLength).toString('utf8'))
}
