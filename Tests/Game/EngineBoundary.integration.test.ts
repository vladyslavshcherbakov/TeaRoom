import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

type EngineFile = {
  readonly path: string
  readonly text: string
}

const repositoryFolder = fileURLToPath(new URL('../../', import.meta.url))
const importPath = /^(?:import|export) [^\n]*? from '([^']+)'/gm
const wordsOfTheTeaGame = new Set(['tea', 'teas', 'ritual', 'rituals', 'room', 'rooms', 'kettle', 'kettles', 'bowl', 'bowls', 'cup', 'cups', 'caddy', 'caddies', 'vessel', 'vessels', 'sip', 'sips', 'pour', 'pours', 'pouring', 'heater', 'heaters', 'cloth', 'cloths', 'spoon', 'spoons', 'leaf', 'leaves', 'keeper', 'thermos', 'puddle', 'puddles', 'brew', 'brewing', 'figurine', 'figurines'])

test('sharedEngine_importsNothingOutsideItself', () => {
  const importsOutside = engineFilesIn('Shared/Engine', ['.ts']).flatMap((file) => importsOf(file).filter((imported) => !isInside(file, imported, 'Shared/Engine')).map((imported) => `${file.path}: ${imported}`))

  assert.deepEqual(importsOutside, [])
})

test('appsEngine_importsOnlyTheEngineAndThreeJs', () => {
  const importsOutside = engineFilesIn('Apps/Engine', ['.ts']).flatMap((file) => importsOf(file).filter((imported) => !isThreeJs(imported) && !isInside(file, imported, 'Apps/Engine') && !isInside(file, imported, 'Shared/Engine')).map((imported) => `${file.path}: ${imported}`))

  assert.deepEqual(importsOutside, [])
})

test('engineFiles_nameNoPartOfTheTeaGame', () => {
  const wordsFound = ['Shared/Engine', 'Apps/Engine'].flatMap((folder) => engineFilesIn(folder, ['.ts', '.css'])).flatMap((file) => [...new Set(wordsIn(`${file.path} ${file.text}`).filter((word) => wordsOfTheTeaGame.has(word)))].map((word) => `${file.path}: ${word}`))

  assert.deepEqual(wordsFound, [])
})

function engineFilesIn(folder: string, extensions: readonly string[]): readonly EngineFile[] {
  return readdirSync(path.join(repositoryFolder, folder), { recursive: true, encoding: 'utf8' })
    .filter((name) => extensions.some((extension) => name.endsWith(extension)))
    .map((name) => path.join(folder, name).split(path.sep).join('/'))
    .map((file) => ({ path: file, text: readFileSync(path.join(repositoryFolder, file), 'utf8') }))
}

function importsOf(file: EngineFile): readonly string[] {
  return [...file.text.matchAll(importPath)].map((match) => match[1] ?? '')
}

function isInside(file: EngineFile, imported: string, folder: string): boolean {
  if (!imported.startsWith('.')) return false
  const importedPath = path.posix.normalize(path.posix.join(path.posix.dirname(file.path), imported))
  return importedPath.startsWith(`${folder}/`)
}

function isThreeJs(imported: string): boolean {
  return imported === 'three' || imported.startsWith('three/')
}

function wordsIn(text: string): readonly string[] {
  return text.split(/[^A-Za-z]+|(?<=[a-z])(?=[A-Z])/).map((word) => word.toLowerCase()).filter((word) => word.length > 0)
}
