import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MAP_EDITOR_SYNC_END,
  MAP_EDITOR_SYNC_START,
  buildMapEditorCatalog,
  extractMapEditorGeneratedBlock,
  formatMapEditorGeneratedBlock,
} from '../src/tools/mapEditorCatalog.ts'
import { MAP_EDITOR_CATALOG_ORDER } from '../src/tools/mapEditorOverrides.ts'

const ROOT = resolve(import.meta.dirname, '..')
const MAP_EDITOR_HTML = resolve(ROOT, 'public/map-editor.html')

function main(): void {
  const html = readFileSync(MAP_EDITOR_HTML, 'utf8')
  const start = html.indexOf(MAP_EDITOR_SYNC_START)
  const end = html.indexOf(MAP_EDITOR_SYNC_END)

  if (start < 0 || end < 0) {
    console.error('map-editor.html is missing sync markers:', MAP_EDITOR_SYNC_START, MAP_EDITOR_SYNC_END)
    process.exit(1)
  }

  const block = formatMapEditorGeneratedBlock()
  const next = html.slice(0, start) + block + html.slice(end + MAP_EDITOR_SYNC_END.length)

  const catalogIds = new Set(buildMapEditorCatalog().map(e => e.id))
  const missingFromOrder = [...catalogIds].filter(id => !MAP_EDITOR_CATALOG_ORDER.includes(id))
  if (missingFromOrder.length > 0) {
    console.warn('Add to MAP_EDITOR_CATALOG_ORDER in mapEditorOverrides.ts:', missingFromOrder.join(', '))
  }

  if (extractMapEditorGeneratedBlock(html) === block) {
    console.log('map-editor.html catalog already up to date')
    return
  }

  writeFileSync(MAP_EDITOR_HTML, next)
  console.log('Updated map-editor.html generated catalog block')
}

main()
