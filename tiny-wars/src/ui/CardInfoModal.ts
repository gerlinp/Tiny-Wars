import Phaser from 'phaser'
import type { CardDefinition } from '@core/types'
import { CardType, UnitType, AttackType } from '@core/types'
import { CINZEL_FONT, NUMBER_FONT } from './cardHandLayout'
import { createCardPortrait } from './cardPortrait'
import { GAME_WIDTH, CANVAS_HEIGHT } from '@data/GameConstants'
import { CR_SPEED, crSpeedToCellsPerSec } from '@data/GameConstants'

const MODAL_W = GAME_WIDTH - 40
const MODAL_H = 380
const PORTRAIT_SIZE = 100

function speedLabel(cellsPerSec: number): string {
  if (cellsPerSec <= crSpeedToCellsPerSec(CR_SPEED.slow))   return 'Slow'
  if (cellsPerSec <= crSpeedToCellsPerSec(CR_SPEED.medium)) return 'Medium'
  if (cellsPerSec <= crSpeedToCellsPerSec(CR_SPEED.fast))   return 'Fast'
  return 'Very Fast'
}

function rangeLabel(cells: number): string {
  if (cells <= 1.5) return 'Melee'
  if (cells <= 3.5) return 'Short'
  if (cells <= 5.5) return 'Medium'
  return 'Long'
}

function targetsLabel(attackType: AttackType): string {
  if (attackType === AttackType.AIR_AND_GROUND) return 'Air & Ground'
  if (attackType === AttackType.AIR_ONLY)       return 'Air Only'
  return 'Ground Only'
}

function typeLabel(card: CardDefinition): string {
  if (card.cardType === CardType.TROOP)
    return card.deployCount && card.deployCount > 1 ? `Troop ×${card.deployCount}` : 'Troop'
  if (card.cardType === CardType.BUILDING) return 'Building'
  return 'Spell'
}

function add<T extends Phaser.GameObjects.GameObject>(container: Phaser.GameObjects.Container, obj: T): T {
  container.add(obj)
  return obj
}

export class CardInfoModal {
  private readonly backdrop: Phaser.GameObjects.Rectangle
  private readonly panel: Phaser.GameObjects.Container
  private portraits: Phaser.GameObjects.Image[] = []
  private sf = 1

  constructor(
    private readonly scene: Phaser.Scene,
    onClose: () => void,
  ) {
    this.backdrop = scene.add.rectangle(0, 0, GAME_WIDTH, CANVAS_HEIGHT, 0x000000, 0.65)
      .setOrigin(0).setDepth(200).setInteractive()
      .on('pointerdown', onClose)

    this.panel = scene.add.container(GAME_WIDTH / 2, CANVAS_HEIGHT / 2).setDepth(201)

    this.panel.add(
      scene.add.rectangle(0, 0, MODAL_W, MODAL_H, 0x0d1b3e).setStrokeStyle(2, 0x4466bb),
    )

    this.backdrop.setVisible(false)
    this.panel.setVisible(false)
  }

  show(card: CardDefinition): void {
    for (const img of this.portraits) img.destroy()
    this.portraits = []
    // Keep only the panel bg (index 0), destroy everything else
    while (this.panel.list.length > 1) {
      (this.panel.list[1] as Phaser.GameObjects.GameObject).destroy()
    }

    const scene = this.scene
    const top = -MODAL_H / 2

    // ── Portrait ──────────────────────────────────────────────────────────
    const portraitX = -MODAL_W / 2 + PORTRAIT_SIZE / 2 + 16
    const portraitY = top + PORTRAIT_SIZE / 2 + 16
    add(this.panel, scene.add.rectangle(portraitX, portraitY, PORTRAIT_SIZE, PORTRAIT_SIZE, 0x05122a)
      .setStrokeStyle(2, 0x2e4480))
    this.portraits = createCardPortrait(scene, card, 0, 0, PORTRAIT_SIZE * 0.82, PORTRAIT_SIZE * 0.82)
    for (const img of this.portraits) {
      img.setPosition(portraitX, portraitY)
      this.panel.add(img)
    }

    // ── Title / type / elixir ─────────────────────────────────────────────
    const titleX  = portraitX + PORTRAIT_SIZE / 2 + 14
    const titleW  = MODAL_W / 2 - titleX + MODAL_W / 2 - 12

    add(this.panel, scene.add.text(titleX, top + 18, card.displayName, {
      fontSize: '20px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#ffdd88', stroke: '#2a1500', strokeThickness: 4,
      wordWrap: { width: titleW },
    }).setOrigin(0, 0))

    add(this.panel, scene.add.text(titleX, top + 48, typeLabel(card), {
      fontSize: '13px', fontFamily: CINZEL_FONT,
      color: '#aabbff', backgroundColor: '#1a2d6a',
      padding: { x: 6, y: 3 },
    }).setOrigin(0, 0))

    add(this.panel, scene.add.text(titleX, top + 76, `${card.elixirCost}`, {
      fontSize: '16px', fontFamily: NUMBER_FONT, fontStyle: 'bold',
      color: '#ffffff', backgroundColor: '#5500cc',
      padding: { x: 8, y: 4 },
    }).setOrigin(0, 0))

    // ── Description ───────────────────────────────────────────────────────
    const descY = top + PORTRAIT_SIZE + 36
    add(this.panel, scene.add.text(0, descY, card.description, {
      fontSize: '15px', fontFamily: "'Philosopher', Georgia, serif",
      color: '#c8d8f0', wordWrap: { width: MODAL_W - 32 },
      lineSpacing: 4, align: 'center',
    }).setOrigin(0.5, 0))

    // ── Stats ─────────────────────────────────────────────────────────────
    const statsY = descY + 70
    this.buildStats(card, statsY)

    // ── Close button ──────────────────────────────────────────────────────
    const closeBg = add(this.panel, scene.add.rectangle(MODAL_W / 2 - 16, top + 16, 28, 28, 0x441111)
      .setStrokeStyle(1, 0xaa4444).setInteractive({ useHandCursor: true }))
    add(this.panel, scene.add.text(MODAL_W / 2 - 16, top + 16, '✕', {
      fontSize: '14px', fontFamily: CINZEL_FONT, color: '#ff8888',
    }).setOrigin(0.5))
    closeBg.on('pointerdown', (p: Phaser.Input.Pointer) => { p.event.stopPropagation(); this.hide() })

    if (this.sf !== 1) this.panel.setScrollFactor(this.sf, this.sf, true)
    this.backdrop.setVisible(true)
    this.panel.setVisible(true)
  }

  private buildStats(card: CardDefinition, startY: number): void {
    const scene  = this.scene
    const stats  = card.stats
    const spell  = card.spellStats
    const rows: [string, string][] = []

    if (stats) {
      rows.push(['HP',        `${stats.maxHp}`])
      rows.push(['Damage',    `${stats.damage}`])
      rows.push(['Hit Speed', `${(1 / stats.attackRate).toFixed(1)}s`])
      if (stats.speed > 0)
        rows.push(['Speed',   speedLabel(stats.speed)])
      rows.push(['Range',     rangeLabel(stats.attackRange)])
      rows.push(['Targets',   targetsLabel(stats.attackType)])
      if (card.cardType === CardType.TROOP && stats.unitType === UnitType.AIR)
        rows.push(['Unit',    'Flying'])
      if (stats.splashRadius)
        rows.push(['Splash',  `${stats.splashRadius} tiles`])
      if (stats.lifetimeMs)
        rows.push(['Life',    `${stats.lifetimeMs / 1000}s`])
      if (stats.chargeDistanceCells)
        rows.push(['Charge',  `×${stats.chargeDamageMultiplier} dmg`])
    }

    if (spell) {
      rows.push(['Damage',  `${spell.damage}`])
      rows.push(['Radius',  `${spell.radius} tiles`])
      if (spell.groundOnly)
        rows.push(['Targets', 'Ground Only'])
    }

    const colW = (MODAL_W - 32) / 2
    const rowH = 24
    const left = -MODAL_W / 2 + 16

    rows.forEach(([label, value], i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x   = left + col * colW
      const y   = startY + row * rowH

      add(this.panel, scene.add.text(x, y, label, {
        fontSize: '13px', fontFamily: CINZEL_FONT, color: '#8899cc',
      }).setOrigin(0, 0))

      add(this.panel, scene.add.text(x + colW - 8, y, value, {
        fontSize: '14px', fontFamily: NUMBER_FONT, fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(1, 0))
    })
  }

  setScrollFactor(x: number): void {
    this.sf = x
    this.backdrop.setScrollFactor(x)
    // propagate to existing container children
    this.panel.setScrollFactor(x, x, true)
  }

  hide(): void {
    this.backdrop.setVisible(false)
    this.panel.setVisible(false)
  }

  get visible(): boolean {
    return this.panel.visible
  }
}
