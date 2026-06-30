import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MAP_EDITOR_KING_GARRISON_SYNC_END,
  MAP_EDITOR_KING_GARRISON_SYNC_START,
  MAP_EDITOR_KING_UNIT_SYNC_END,
  MAP_EDITOR_KING_UNIT_SYNC_START,
  MAP_EDITOR_KING_VISUAL_SYNC_END,
  MAP_EDITOR_KING_VISUAL_SYNC_START,
  MAP_EDITOR_LAYOUT_SYNC_END,
  MAP_EDITOR_LAYOUT_SYNC_START,
  MAP_EDITOR_SPAWN_SYNC_END,
  MAP_EDITOR_SPAWN_SYNC_START,
  MAP_EDITOR_SYNC_END,
  MAP_EDITOR_SYNC_START,
  buildMapEditorCatalog,
  extractDefaultSpawnZonesBlock,
  extractMapEditorGeneratedBlock,
  extractMapEditorKingGarrisonBlock,
  extractMapEditorKingUnitEditorBlock,
  extractMapEditorKingVisualBlock,
  extractMapEditorLayoutBlock,
  formatDefaultSpawnZonesBlock,
  formatMapEditorGeneratedBlock,
  formatMapEditorKingGarrisonBlock,
  formatMapEditorKingUnitEditorBlock,
  formatMapEditorKingVisualBlock,
  formatMapEditorLayoutBlock,
} from '../src/tools/mapEditorCatalog.ts'
import { MAP_EDITOR_CATALOG_ORDER } from '../src/tools/mapEditorOverrides.ts'

const ROOT = resolve(import.meta.dirname, '..')
const MAP_EDITOR_HTML = resolve(ROOT, 'public/map-editor.html')

function replaceBlock(
  html: string,
  startMarker: string,
  endMarker: string,
  block: string,
): string {
  const start = html.indexOf(startMarker)
  const end = html.indexOf(endMarker)
  if (start < 0 || end < 0) {
    console.error('map-editor.html is missing sync markers:', startMarker, endMarker)
    process.exit(1)
  }
  return html.slice(0, start) + block + html.slice(end + endMarker.length)
}

function main(): void {
  let html = readFileSync(MAP_EDITOR_HTML, 'utf8')
  const layoutBlock = formatMapEditorLayoutBlock()
  const kingVisualBlock = formatMapEditorKingVisualBlock()
  const kingGarrisonBlock = formatMapEditorKingGarrisonBlock()
  const kingUnitBlock = formatMapEditorKingUnitEditorBlock()
  const spawnBlock = formatDefaultSpawnZonesBlock()
  const catalogBlock = formatMapEditorGeneratedBlock()

  const catalogIds = new Set(buildMapEditorCatalog().map(e => e.id))
  const missingFromOrder = [...catalogIds].filter(id => !MAP_EDITOR_CATALOG_ORDER.includes(id))
  if (missingFromOrder.length > 0) {
    console.warn('Add to MAP_EDITOR_CATALOG_ORDER in mapEditorOverrides.ts:', missingFromOrder.join(', '))
  }

  const layoutCurrent = extractMapEditorLayoutBlock(html)
  const kingVisualCurrent = extractMapEditorKingVisualBlock(html)
  const kingGarrisonCurrent = extractMapEditorKingGarrisonBlock(html)
  const kingUnitCurrent = extractMapEditorKingUnitEditorBlock(html)
  const spawnCurrent = extractDefaultSpawnZonesBlock(html)
  const catalogCurrent = extractMapEditorGeneratedBlock(html)

  const unchanged =
    layoutCurrent === layoutBlock &&
    kingVisualCurrent === kingVisualBlock &&
    kingGarrisonCurrent === kingGarrisonBlock &&
    kingUnitCurrent === kingUnitBlock &&
    spawnCurrent === spawnBlock &&
    catalogCurrent === catalogBlock

  if (unchanged) {
    console.log('map-editor.html already up to date')
    return
  }

  if (layoutCurrent !== layoutBlock) {
    html = replaceBlock(html, MAP_EDITOR_LAYOUT_SYNC_START, MAP_EDITOR_LAYOUT_SYNC_END, layoutBlock)
    console.log('Updated map-editor.html layout constants block')
  }
  if (kingVisualCurrent !== kingVisualBlock) {
    html = replaceBlock(html, MAP_EDITOR_KING_VISUAL_SYNC_START, MAP_EDITOR_KING_VISUAL_SYNC_END, kingVisualBlock)
    console.log('Updated map-editor.html king visual offset block')
  }
  if (kingGarrisonCurrent !== kingGarrisonBlock) {
    html = replaceBlock(html, MAP_EDITOR_KING_GARRISON_SYNC_START, MAP_EDITOR_KING_GARRISON_SYNC_END, kingGarrisonBlock)
    console.log('Updated map-editor.html king garrison block')
  }
  if (kingUnitCurrent !== kingUnitBlock) {
    html = replaceBlock(html, MAP_EDITOR_KING_UNIT_SYNC_START, MAP_EDITOR_KING_UNIT_SYNC_END, kingUnitBlock)
    console.log('Updated map-editor.html king unit editor block')
  }
  if (spawnCurrent !== spawnBlock) {
    html = replaceBlock(html, MAP_EDITOR_SPAWN_SYNC_START, MAP_EDITOR_SPAWN_SYNC_END, spawnBlock)
    console.log('Updated map-editor.html default spawn zones block')
  }
  if (catalogCurrent !== catalogBlock) {
    html = replaceBlock(html, MAP_EDITOR_SYNC_START, MAP_EDITOR_SYNC_END, catalogBlock)
    console.log('Updated map-editor.html generated catalog block')
  }

  writeFileSync(MAP_EDITOR_HTML, html)
}

main()
