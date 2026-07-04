/**
 * Regenerates public/map.json from DEFAULT_MAP_CONFIG (GameConstants-derived).
 * Run after changing arena geometry: `npx vite-node scripts/exportDefaultMap.ts`
 * Tower offsets below are visual-tuning values (px at current CELL_SIZE).
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { DEFAULT_MAP_CONFIG } from '../src/data/DefaultMapConfig'
import type { MapConfig } from '../src/data/MapConfig'

const config: MapConfig = {
  ...DEFAULT_MAP_CONFIG,
}

const outPath = join(dirname(fileURLToPath(import.meta.url)), '../public/map.json')
writeFileSync(outPath, JSON.stringify(config, null, 2) + '\n')
console.log(`Wrote ${outPath} (${config.riverRowStart}-${config.riverRowEnd} river, towers @ rows ${config.botTowerRow}/${config.playerTowerRow})`)
