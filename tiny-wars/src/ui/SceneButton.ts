import Phaser from 'phaser'
import { CINZEL_FONT } from './cardHandLayout'

export const MENU_BUTTON_SCALE = 2
const MENU_BUTTON_SRC_W = 64

export function menuButtonDisplayWidth(): number {
  return MENU_BUTTON_SRC_W * MENU_BUTTON_SCALE
}

export interface FooterButtonRowLayout {
  centers: number[]
  scale: number
  btnW: number
}

/** Fit N sprite buttons within horizontal margins (deck builder footer, etc.). */
export function footerButtonRowLayout(
  screenWidth: number,
  count: number,
  sideMargin: number,
  gap: number,
): FooterButtonRowLayout {
  const available = screenWidth - sideMargin * 2
  const btnW = (available - gap * (count - 1)) / count
  const scale = btnW / MENU_BUTTON_SRC_W
  const startX = sideMargin + btnW / 2
  const centers = Array.from({ length: count }, (_, i) => startX + i * (btnW + gap))
  return { centers, scale, btnW }
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
  btn.on('pointerup', onPress)
  btn.on('pointerover', () => btn.setTint(0xdddddd))
  btn.on('pointerout',  () => btn.clearTint())
}
