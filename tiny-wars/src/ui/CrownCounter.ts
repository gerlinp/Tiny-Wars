import Phaser from 'phaser'

const CROWN_COLOR_ACTIVE   = 0xffcc00
const CROWN_COLOR_INACTIVE = 0x443300

export class CrownCounter {
  private playerCrowns: Phaser.GameObjects.Rectangle[]
  private botCrowns: Phaser.GameObjects.Rectangle[]
  private playerLabel: Phaser.GameObjects.Text
  private botLabel: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, cx: number, y: number) {
    this.playerLabel = scene.add.text(cx - 60, y, 'YOU', {
      fontSize: '10px', color: '#aabbff',
    }).setOrigin(0.5).setDepth(50)

    this.botLabel = scene.add.text(cx + 60, y, 'BOT', {
      fontSize: '10px', color: '#ffaabb',
    }).setOrigin(0.5).setDepth(50)

    this.playerCrowns = this.makeCrowns(scene, cx - 60, y + 12)
    this.botCrowns    = this.makeCrowns(scene, cx + 60, y + 12)
  }

  private makeCrowns(scene: Phaser.Scene, cx: number, y: number): Phaser.GameObjects.Rectangle[] {
    const crowns: Phaser.GameObjects.Rectangle[] = []
    for (let i = 0; i < 3; i++) {
      const x = cx - 18 + i * 18
      const r = scene.add.rectangle(x, y, 12, 14, CROWN_COLOR_INACTIVE, 1)
        .setDepth(50)
        .setStrokeStyle(1, 0x886600)
      crowns.push(r)
    }
    return crowns
  }

  update(playerCrowns: number, botCrowns: number): void {
    for (let i = 0; i < 3; i++) {
      this.playerCrowns[i]!.setFillStyle(i < playerCrowns ? CROWN_COLOR_ACTIVE : CROWN_COLOR_INACTIVE)
      this.botCrowns[i]!.setFillStyle(i < botCrowns ? CROWN_COLOR_ACTIVE : CROWN_COLOR_INACTIVE)
    }
    void this.playerLabel
    void this.botLabel
  }
}
