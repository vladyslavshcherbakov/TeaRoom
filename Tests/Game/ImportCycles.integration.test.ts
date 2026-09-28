import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repositoryFolder = fileURLToPath(new URL('../../', import.meta.url))
const sourceFolders = ['Apps', 'Shared']
const relativeImport = /^import [^\n]*? from '(\.[^']+)'/gm

test('sourceFiles_neverImportEachOtherInACycle', () => {
  const importsByFile = importsOfEverySourceFile()

  const cycles = cyclesIn(importsByFile)

  assert.deepEqual(cycles, [])
})

function importsOfEverySourceFile(): ReadonlyMap<string, readonly string[]> {
  const files = sourceFolders.flatMap((folder) => readdirSync(path.join(repositoryFolder, folder), { recursive: true, encoding: 'utf8' }).filter((file) => file.endsWith('.ts')).map((file) => path.join(folder, file)))
  return new Map(files.map((file) => [file, [...readFileSync(path.join(repositoryFolder, file), 'utf8').matchAll(relativeImport)].map((match) => path.join(path.dirname(file), match[1] ?? ''))]))
}

function cyclesIn(importsByFile: ReadonlyMap<string, readonly string[]>): readonly string[] {
  const finished = new Set<string>()
  const cycles: string[] = []
  const visit = (file: string, trail: readonly string[]): void => {
    const start = trail.indexOf(file)
    if (start >= 0) return void cycles.push([...trail.slice(start), file].join(' → '))
    if (finished.has(file)) return
    for (const imported of importsByFile.get(file) ?? []) visit(imported, [...trail, file])
    finished.add(file)
  }
  for (const file of importsByFile.keys()) visit(file, [])
  return cycles
}
