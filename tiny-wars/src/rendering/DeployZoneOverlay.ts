import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from '@data/GameConstants'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import type { LaneUnlocks } from '@core/DeploySystem'
import { EMPTY_LANE_UNLOCKS, LOCAL_OWNER, deployOverlayRects, type DeployOverlayRect } from '@core/DeploySystem'
import type { Owner } from '@core/types'

export class DeployZoneOverlay {
  private readonly scene: Phaser.Scene
  private readonly baseZone: Phaser.GameObjects.Rectangle
  private readonly expandedZones: Phaser.GameObjects.Rectangle[] = []
  private hint: Phaser.GameObjects.Text
  private mode: 'troop' | 'elixir' | 'spell' = 'troop'
  private friendlyRect: DeployOverlayRect = { x: 0, y: 0, w: GAME_WIDTH, h: 0, kind: 'friendly' }

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.syncExpandedZones(LOCAL_OWNER, EMPTY_LANE_UNLOCKS)

    this.baseZone = scene.add.rectangle(0, 0, GAME_WIDTH, 0, 0x44cc66, 0.18)
      .setOrigin(0)
      .setDepth(2)
      .setVisible(false)

    this.hint = scene.add.text(GAME_WIDTH / 2, 0, 'Select a card', {
      fontSize: '13px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#88cc99',
      stroke: '#003322',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(3).setVisible(false)
  }

  syncExpandedZones(localOwner: Owner, unlocks: LaneUnlocks): void {
    for (const zone of this.expandedZones) zone.destroy()
    this.expandedZones.length = 0

    const rects = deployOverlayRects(localOwner, unlocks)
    const friendly = rects.find(r => r.kind === 'friendly')
    if (friendly) this.friendlyRect = friendly

    for (const rect of rects) {
      if (rect.kind === 'friendly') continue
      this.expandedZones.push(
        this.scene.add.rectangle(rect.x, rect.y, rect.w, rect.h, 0x66dd88, 0.22)
          .setOrigin(0)
          .setDepth(2)
          .setVisible(this.baseZone.visible),
      )
    }
  }

  show(mode: 'troop' | 'elixir' | 'spell' = 'troop'): void {
    this.mode = mode
    if (mode === 'elixir') {
      this.baseZone
        .setPosition(0, 0)
        .setSize(GAME_WIDTH, GAME_HEIGHT)
        .setFillStyle(0xcc44ff, 0.08)
        .setVisible(true)
      this.setExpandedVisible(false)
      this.hint
        .setText('Tap anywhere to use')
        .setPosition(GAME_WIDTH / 2, GAME_HEIGHT - 36)
        .setColor('#ddaaff')
        .setVisible(true)
      return
    }

    if (mode === 'spell') {
      this.baseZone
        .setPosition(0, 0)
        .setSize(GAME_WIDTH, GAME_HEIGHT)
        .setFillStyle(0xff8844, 0.07)
        .setVisible(true)
      this.setExpandedVisible(false)
      this.hint
        .setText('Tap anywhere to cast')
        .setPosition(GAME_WIDTH / 2, GAME_HEIGHT - 36)
        .setColor('#ffbb88')
        .setVisible(true)
      return
    }

    this.baseZone
      .setPosition(this.friendlyRect.x, this.friendlyRect.y)
      .setSize(this.friendlyRect.w, this.friendlyRect.h)
      .setFillStyle(0x44cc66, 0.18)
      .setVisible(true)
    this.setExpandedVisible(true)
    this.hint
      .setText('Select a card')
      .setPosition(GAME_WIDTH / 2, this.friendlyRect.y + this.friendlyRect.h - 30)
      .setColor('#88cc99')
      .setVisible(true)
  }

  private setExpandedVisible(visible: boolean): void {
    for (const z of this.expandedZones) z.setVisible(visible)
  }

  hide(): void {
    this.baseZone.setVisible(false)
    this.setExpandedVisible(false)
    this.hint.setVisible(false)
  }

  showHint(): void {
    if (!this.baseZone.visible) this.hint.setVisible(true)
  }

  hideHint(): void {
    if (this.mode === 'troop') this.hint.setVisible(false)
  }
}
