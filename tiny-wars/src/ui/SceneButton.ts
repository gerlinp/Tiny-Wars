import Phaser from 'phaser'
import { CINZEL_FONT } from './cardHandLayout'

export const MENU_BUTTON_SCALE = 2
const MENU_BUTTON_SRC_W = 64

export function menuButtonDisplayWidth(): number {
  return MENU_BUTTON_SRC_W * MENU_BUTTON_SCALE
}

/** Center X positions for N menu buttons in a horizontal row. */
export function menuButtonRowCenters(screenWidth: number, count: number, gap: number): number[] {
  const btnW = menuButtonDisplayWidth()
  const rowW = count * btnW + (count - 1) * gap
  const startX = screenWidth / 2 - rowW / 2 + btnW / 2
  return Array.from({ length: count }, (_, i) => startX + i * (btnW + gap))
}

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
    .setScale(MENU_BUTTON_SCALE)
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
