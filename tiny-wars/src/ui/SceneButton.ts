import Phaser from 'phaser'
import { CINZEL_FONT } from './cardHandLayout'

const MENU_BUTTON_SRC_W = 64

// Wide 3-slice button (192×64 source) — full-width bars stacked in a column.
export const WIDE_BUTTON_SCALE = 3.2
const WIDE_BUTTON_SRC_W = 192
const WIDE_BUTTON_SRC_H = 64

export function wideButtonDisplayWidth(): number {
  return WIDE_BUTTON_SRC_W * WIDE_BUTTON_SCALE
}

export function wideButtonDisplayHeight(): number {
  return WIDE_BUTTON_SRC_H * WIDE_BUTTON_SCALE
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

export interface MenuButtonHandle {
  button: Phaser.GameObjects.Image
  label: Phaser.GameObjects.Text
  setVisible(visible: boolean): void
}

export interface WideButtonOptions {
  /** Multiply tint applied over the button art for colour variants. */
  tint?: number
}

// Deep tones matching the deck builder's BACK/CLEAR/SAVE footer buttons.
export const DEEP_BLUE   = 0x2e4480  // primary/confirm (deck builder's active-slot blue)
export const DEEP_RED    = 0x8b3a3a  // destructive/cancel (deck builder's CLEAR)
export const DEEP_PURPLE = 0x44324f  // neutral/back (deck builder's BACK)
export const DEEP_GREEN  = 0x2e7d32  // affirmative/go (deck builder's SAVE)

export function createWideButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  fontSize: string,
  depth: number,
  onPress: () => void,
  opts: WideButtonOptions = {},
): MenuButtonHandle {
  const texture = opts.tint === DEEP_RED ? 'button_red_wide' : 'button_blue_wide'
  return makeSceneButton(scene, x, y, texture, WIDE_BUTTON_SCALE, label, fontSize, depth, onPress, opts.tint)
}

function darkenTint(tint: number, factor = 0.87): number {
  const r = Math.round(((tint >> 16) & 0xff) * factor)
  const g = Math.round(((tint >> 8) & 0xff) * factor)
  const b = Math.round((tint & 0xff) * factor)
  return (r << 16) | (g << 8) | b
}

function makeSceneButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  texture: string,
  scale: number,
  label: string,
  fontSize: string,
  depth: number,
  onPress: () => void,
  baseTint = 0xffffff,
): MenuButtonHandle {
  const btn = scene.add.image(x, y, texture)
    .setInteractive({ useHandCursor: true })
    .setScale(scale)
    .setDepth(depth)
  if (baseTint !== 0xffffff) btn.setTint(baseTint)
  // The art fills rows 0–56 of the 64px frame with a 3D lip at the bottom,
  // so the pressable face is centred ~8 source px above the frame centre.
  const text = scene.add.text(x, y - 8 * scale, label, {
    fontSize,
    fontFamily: CINZEL_FONT,
    fontStyle: 'bold',
    color: '#ffffff',
    stroke: '#000022',
    strokeThickness: 7,
  }).setOrigin(0.5).setDepth(depth + 1)
  const hoverTint = darkenTint(baseTint)
  btn.on('pointerup', onPress)
  btn.on('pointerover', () => btn.setTint(hoverTint))
  btn.on('pointerout',  () => baseTint === 0xffffff ? btn.clearTint() : btn.setTint(baseTint))
  return {
    button: btn,
    label: text,
    setVisible: (visible: boolean) => {
      btn.setVisible(visible)
      text.setVisible(visible)
    },
  }
}
