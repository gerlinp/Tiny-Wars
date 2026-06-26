import Phaser from 'phaser'
import { CINZEL_FONT } from './cardHandLayout'

export function createMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  fontSize: string,
  depth: number,
  onPress: () => void,
): void {
  const btn = scene.add.image(x, y, 'button_blue')
    .setInteractive({ useHandCursor: true })
    .setScale(2)
    .setDepth(depth)
  scene.add.text(x, y, label, {
    fontSize,
    fontFamily: CINZEL_FONT,
    fontStyle: 'bold',
    color: '#ffffff',
    stroke: '#000022',
    strokeThickness: 3,
  }).setOrigin(0.5).setDepth(depth + 1)
  btn.on('pointerdown', onPress)
  btn.on('pointerover', () => btn.setTint(0xdddddd))
  btn.on('pointerout', () => btn.clearTint())
}
