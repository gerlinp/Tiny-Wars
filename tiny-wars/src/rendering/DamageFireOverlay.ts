import Phaser from 'phaser'
import { DAMAGE_FIRE_GRID, DAMAGE_FIRE_SHEETS } from '@data/AssetManifest'
import { CELL_SIZE } from '@data/GameConstants'
import { damageFireTier, pickDamageFireGridCell } from './renderingUtils'

export { damageFireTier, pickDamageFireGridCell } from './renderingUtils'

const FIRE_DEPTH = 5.8
const FIRE_DISPLAY = CELL_SIZE * 1.1
/** Vertical band on the structure facade where fires are placed (fraction of height). */
const GRID_TOP_FRAC = 0.12
const GRID_HEIGHT_FRAC = 0.38

export interface DamageFireAnchor {
  centerX: number
  anchorY: number
  width: number
  height: number
  origin: 'bottom' | 'center'
}

interface FireSlot {
  sprite: Phaser.GameObjects.Sprite
  col: number
  row: number
  tierIndex: number
}

function gridPosition(anchor: DamageFireAnchor, col: number, row: number): { x: number; y: number } {
  const top = anchor.origin === 'bottom'
    ? anchor.anchorY - anchor.height
    : anchor.anchorY - anchor.height / 2
  const gridTop = top + anchor.height * GRID_TOP_FRAC
  const gridHeight = anchor.height * GRID_HEIGHT_FRAC
  const left = anchor.centerX - anchor.width / 2
  const cellW = anchor.width / DAMAGE_FIRE_GRID.cols
  const cellH = gridHeight / DAMAGE_FIRE_GRID.rows

  return {
    x: left + (col + 0.5) * cellW,
    y: gridTop + (row + 0.5) * cellH,
  }
}

export class DamageFireOverlay {
  private readonly slots: FireSlot[] = []
  private activeTiers = 0

  constructor(private readonly scene: Phaser.Scene) {}

  sync(anchor: DamageFireAnchor, hpFraction: number, alive: boolean): void {
    const tier = alive ? damageFireTier(hpFraction) : 0

    while (this.activeTiers < tier) {
      this.spawnFire(this.activeTiers, anchor)
      this.activeTiers++
    }

    const visible = tier > 0
    for (const slot of this.slots) {
      const pos = gridPosition(anchor, slot.col, slot.row)
      slot.sprite.setPosition(pos.x, pos.y).setVisible(visible)
    }
  }

  hide(): void {
    for (const slot of this.slots) slot.sprite.setVisible(false)
  }

  destroy(): void {
    for (const slot of this.slots) slot.sprite.destroy()
    this.slots.length = 0
    this.activeTiers = 0
  }

  private spawnFire(tierIndex: number, anchor: DamageFireAnchor): void {
    const def = DAMAGE_FIRE_SHEETS[tierIndex]
    if (!def || !this.scene.textures.exists(def.key)) return
    if (!this.scene.anims.exists(def.animKey)) return

    const cell = pickDamageFireGridCell(this.slots)
    const pos = gridPosition(anchor, cell.col, cell.row)
    const sprite = this.scene.add.sprite(pos.x, pos.y, def.key, 0)
      .setDepth(FIRE_DEPTH)
      .setDisplaySize(FIRE_DISPLAY, FIRE_DISPLAY)
      .play(def.animKey)

    this.slots.push({ sprite, col: cell.col, row: cell.row, tierIndex })
  }
}
