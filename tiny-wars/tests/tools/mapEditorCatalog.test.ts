import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildMapEditorCatalog,
  buildMapEditorConstants,
  buildMapEditorLayoutConstants,
  extractMapEditorGeneratedBlock,
  extractMapEditorLayoutBlock,
  formatMapEditorGeneratedBlock,
  formatMapEditorLayoutBlock,
} from '../../src/tools/mapEditorCatalog.ts'

const MAP_EDITOR_HTML = resolve(import.meta.dirname, '../../public/map-editor.html')

describe('mapEditorCatalog sync', () => {
  it('includes wood_tower with pirate tower art and bomb tower label', () => {
    const entry = buildMapEditorCatalog().find(e => e.id === 'wood_tower')
    expect(entry?.name).toBe('Bomb Tower')
    expect(entry?.path).toContain('Pirate Tower_Ground.png')
    expect(entry?.isBuilding).toBe(true)
    expect(entry?.attackRange).toBe(7)
    expect(entry?.elixirCost).toBe(4)
  })

  it('exports bomb tower bomber paths from bomb_fish idle sheets', () => {
    const constants = buildMapEditorConstants()
    expect(constants.bombTowerBomberPaths.player).toContain('Bomb Fish_Idle.png')
    expect(constants.bombTowerDeckYFrac).toBe(0.82)
    expect(constants.compositeLayerOffsets.wood_tower?.platform).toEqual({ x: 2, y: 287 })
    expect(constants.compositeLayerOffsets.wood_tower?.bomber).toEqual({ x: 4, y: 431 })
    expect(constants.cardDisplayVisualScale.wood_tower).toBe(1)
  })

  it('exports king tower layout from GameConstants', () => {
    const layout = buildMapEditorLayoutConstants()
    expect(layout.kingLogicCol).toBe(11.5)
    expect(layout.kingSpriteCenterOffsetX).toBe(0)
    expect(layout.bridgeCenterCol).toBe(12)
    expect(layout.bridgeSpan).toBe(7)
    expect(layout.leftBridgeStart).toBe(1)
    expect(layout.rightBridgeStart).toBe(16)
  })

  it('map-editor.html layout block matches GameConstants', () => {
    const html = readFileSync(MAP_EDITOR_HTML, 'utf8')
    const onDisk = extractMapEditorLayoutBlock(html)
    expect(onDisk).not.toBeNull()
    expect(onDisk).toBe(formatMapEditorLayoutBlock())
  })

  it('map-editor.html generated block matches source of truth', () => {
    const html = readFileSync(MAP_EDITOR_HTML, 'utf8')
    const onDisk = extractMapEditorGeneratedBlock(html)
    expect(onDisk).not.toBeNull()
    expect(onDisk).toBe(formatMapEditorGeneratedBlock())
  })
})
