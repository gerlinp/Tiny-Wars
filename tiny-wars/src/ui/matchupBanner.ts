import Phaser from 'phaser'
import type { PvPNetwork } from '@core/PvPNetwork'
import { loadPlayerName } from '@data/PlayerName'
import { CINZEL_FONT } from './cardHandLayout'

/** "X vs Y" line for the match intro — bot match when no network is given. */
export function matchupLabel(net: PvPNetwork | null, botLabel?: string): string {
  const localLabel = net?.localName || loadPlayerName() || 'Player'
  const oppLabel = net
    ? (net.opponentName || 'Opponent')
    : botLabel ? `Bot (${botLabel})` : 'Bot'
  return `${localLabel}  vs  ${oppLabel}`
}

/** Plain "X vs Y" / "Battle Start!" text — no backing art, heavy drop shadow so it
 *  pops off the arena without needing a banner image behind it. */
export function createMatchupBanner(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: CINZEL_FONT,
    fontSize: '64px',
    fontStyle: 'bold',
    color: '#ffffff',
    stroke: '#223355',
    strokeThickness: 8,
    shadow: { offsetX: 4, offsetY: 6, color: '#000000', blur: 10, fill: true },
  }).setOrigin(0.5).setDepth(951).setScrollFactor(0)
}

const BANNER_TEXTURE = 'carved_panel'

export interface BannerPopupOptions {
  width?: number
  height?: number
  fontSize?: string
  color?: string
}

export interface BannerPopup {
  container: Phaser.GameObjects.Container
  text: Phaser.GameObjects.Text
  image: Phaser.GameObjects.Image
  setText(value: string): void
  setColor(color: string): void
  /** Fades the whole banner (art + text) out, swaps the text, then fades back in. */
  swapTo(value: string, duration?: number, onMid?: () => void): void
  fadeIn(duration?: number, onComplete?: () => void): void
  fadeOut(duration?: number, onComplete?: () => void): void
  destroy(): void
}

/** A wide carved-wood plaque with centred text — used for match intro and end-game reveals. */
export function createBannerPopup(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: BannerPopupOptions = {},
): BannerPopup {
  const width  = opts.width  ?? 620
  const height = opts.height ?? 150

  const image = scene.add.image(0, 0, BANNER_TEXTURE).setDisplaySize(width, height)
  const label = scene.add.text(0, 0, text, {
    fontFamily: CINZEL_FONT,
    fontSize: opts.fontSize ?? '56px',
    fontStyle: 'bold',
    color: opts.color ?? '#3a2c1a',
    stroke: '#00000055',
    strokeThickness: 4,
    align: 'center',
  }).setOrigin(0.5)

  const container = scene.add.container(x, y, [image, label]).setDepth(951).setScrollFactor(0)

  const setText = (value: string) => label.setText(value)
  const setColor = (color: string) => label.setColor(color)

  const swapTo = (value: string, duration = 220, onMid?: () => void) => {
    scene.tweens.add({
      targets: container,
      alpha: 0,
      duration,
      onComplete: () => {
        label.setText(value)
        onMid?.()
        scene.tweens.add({ targets: container, alpha: 1, duration })
      },
    })
  }

  const fadeIn = (duration = 300, onComplete?: () => void) => {
    container.setAlpha(0)
    scene.tweens.add({ targets: container, alpha: 1, duration, onComplete })
  }

  const fadeOut = (duration = 300, onComplete?: () => void) => {
    scene.tweens.add({ targets: container, alpha: 0, duration, onComplete })
  }

  return {
    container,
    text: label,
    image,
    setText,
    setColor,
    swapTo,
    fadeIn,
    fadeOut,
    destroy: () => container.destroy(),
  }
}
