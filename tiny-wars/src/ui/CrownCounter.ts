import Phaser from 'phaser'
import { CINZEL_FONT } from './cardHandLayout'

const CROWN_COLOR_ACTIVE   = 0xffcc00
const CROWN_COLOR_INACTIVE = 0x443300

const GROUP_X_OFFSET = 130   // distance each score panel sits from screen centre
const CROWN_Y_OFFSET  = 14   // crowns sit below the label by this many px

export class CrownCounter {
  private playerCrowns: Phaser.GameObjects.Rectangle[]
  private botCrowns: Phaser.GameObjects.Rectangle[]

  constructor(scene: Phaser.Scene, cx: number, y: number) {
    const leftX  = cx - GROUP_X_OFFSET
    const rightX = cx + GROUP_X_OFFSET

    const panelW = 66
    const panelH = 34
    const panelY = y + CROWN_Y_OFFSET / 2

    // Score panel backgrounds — subtle dark box like a fighting game
    scene.add.rectangle(leftX,  panelY, panelW, panelH, 0x000011, 0.65)
      .setDepth(49).setStrokeStyle(1, 0x223366, 0.6)
    scene.add.rectangle(rightX, panelY, panelW, panelH, 0x000011, 0.65)
      .setDepth(49).setStrokeStyle(1, 0x223366, 0.6)

    const labelShadow = { offsetX: 0, offsetY: 1, color: '#000000', blur: 5, stroke: true, fill: true }

    scene.add.text(leftX, y, 'YOU', {
      fontSize: '11px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#aabbff', stroke: '#000022', strokeThickness: 2,
      shadow: labelShadow,
    }).setOrigin(0.5).setDepth(50)

    scene.add.text(rightX, y, 'BOT', {
      fontSize: '11px', fontFamily: CINZEL_FONT, fontStyle: 'bold',
      color: '#ffaabb', stroke: '#000022', strokeThickness: 2,
      shadow: labelShadow,
    }).setOrigin(0.5).setDepth(50)

    this.playerCrowns = this.makeCrowns(scene, leftX,  y + CROWN_Y_OFFSET)
    this.botCrowns    = this.makeCrowns(scene, rightX, y + CROWN_Y_OFFSET)
  }

  private makeCrowns(scene: Phaser.Scene, cx: number, y: number): Phaser.GameObjects.Rectangle[] {
    const crowns: Phaser.GameObjects.Rectangle[] = []
    for (let i = 0; i < 3; i++) {
      const x = cx - 18 + i * 18
      scene.add.rectangle(x + 1, y + 2, 12, 14, 0x000000, 0.65).setDepth(49)
      const r = scene.add.rectangle(x, y, 12, 14, CROWN_COLOR_INACTIVE, 1)
        .setDepth(50)
        .setStrokeStyle(1.5, 0x221100)
      crowns.push(r)
    }
    return crowns
  }

  update(playerCrowns: number, botCrowns: number): void {
    for (let i = 0; i < 3; i++) {
      this.playerCrowns[i]!.setFillStyle(i < playerCrowns ? CROWN_COLOR_ACTIVE : CROWN_COLOR_INACTIVE)
      this.botCrowns[i]!.setFillStyle(i < botCrowns ? CROWN_COLOR_ACTIVE : CROWN_COLOR_INACTIVE)
    }
  }
}
