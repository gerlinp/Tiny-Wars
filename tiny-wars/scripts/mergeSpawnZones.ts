import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildClashStyleSpawnZones } from '../src/data/SpawnZones.ts'

const ROOT = resolve(import.meta.dirname, '..')
const MAP_JSON = resolve(ROOT, 'public/map.json')

const map = JSON.parse(readFileSync(MAP_JSON, 'utf8')) as Record<string, unknown>
map.spawnZones = buildClashStyleSpawnZones()
writeFileSync(MAP_JSON, `${JSON.stringify(map, null, 2)}\n`)
console.log(`Updated ${MAP_JSON} with ${Object.keys(map.spawnZones as object).length} spawn zone cells`)
