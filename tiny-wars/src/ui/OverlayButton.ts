import Phaser from 'phaser'
import { CINZEL_FONT } from './cardHandLayout'

export interface OverlayButtonOptions {
  width?: number
  height?: number
  fontSize?: string
  fill?: number
  stroke?: number
}

/** Plain rect+text button for overlay menus (Settings, Pause) — no sprite
 *  assets, so it can be sized to fit a compact panel instead of the fixed
 *  large scale of the in-game sprite buttons. */
export function createOverlayButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onPress: () => void,
  opts: OverlayButtonOptions = {},
): Phaser.GameObjects.Container {
  const width = opts.width ?? 240
  const height = opts.height ?? 64
  const fill = opts.fill ?? 0x2e4480
  const stroke = opts.stroke ?? 0x6688cc

  const bg = scene.add.rectangle(0, 0, width, height, fill, 1).setStrokeStyle(3, stroke)
  const text = scene.add.text(0, 0, label, {
    fontSize: opts.fontSize ?? '32px',
    fontFamily: CINZEL_FONT,
    fontStyle: 'bold',
    color: '#ffffff',
  }).setOrigin(0.5)

  const container = scene.add.container(x, y, [bg, text])
  bg.setInteractive({ useHandCursor: true })
  bg.on('pointerup', onPress)
  bg.on('pointerover', () => bg.setFillStyle(fill, 0.75))
  bg.on('pointerout', () => bg.setFillStyle(fill, 1))

  return container
}
