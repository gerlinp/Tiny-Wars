import Phaser from 'phaser'

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' })
  }

  create(): void {
    const { width, height } = this.scale

    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0)

    this.add.text(width / 2, height * 0.28, 'TINY WARS', {
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffdd88',
      stroke: '#332200',
      strokeThickness: 6,
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.38, 'Clash Royale Clone', {
      fontSize: '16px',
      color: '#aaaacc',
    }).setOrigin(0.5)

    const btn = this.add.image(width / 2, height * 0.56, 'button_blue')
      .setInteractive({ useHandCursor: true })
      .setScale(2)

    this.add.text(width / 2, height * 0.56, 'VS BOT', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5)

    btn.on('pointerdown', () => {
      this.scene.start('BattleScene')
    })

    btn.on('pointerover', () => btn.setTint(0xdddddd))
    btn.on('pointerout',  () => btn.clearTint())
  }
}
