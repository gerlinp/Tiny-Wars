import Phaser from 'phaser'
import type { PvPNetwork } from '@core/PvPNetwork'
import { loadPlayerName } from '@data/PlayerName'
import { CINZEL_FONT } from './cardHandLayout'

/** "X vs Y" line for the match intro — bot match when no network is given. */
export function matchupLabel(net: PvPNetwork | null): string {
  const localLabel = net?.localName || loadPlayerName() || 'Player'
  const oppLabel = net ? (net.opponentName || 'Opponent') : 'Bot'
  return `${localLabel}  vs  ${oppLabel}`
}

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
  }).setOrigin(0.5).setDepth(951).setScrollFactor(0)
}
