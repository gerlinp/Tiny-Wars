import Phaser from 'phaser'
import { Owner } from '@core/types'
import { HEALTH_BAR_ASSETS } from '@data/AssetManifest'
import { HealthBar } from '@rendering/HealthBar'

export { BATTLE_LOADING_MS, MIN_LOADING_MS, loadingBarProgress, loadingWaitMs } from './loadingScreenDuration'

const BAR_W = 744
const BAR_H = 56

export interface LoadingBarWidgets {
  /** Asset-based bar — null during the initial preload, before the bar sheets exist. */
  healthBar: HealthBar | null
  bar: Phaser.GameObjects.Rectangle | null
  label: Phaser.GameObjects.Text
  barX: number
  barY: number
}

export function loadingLayoutY(height: number): { walkerY: number; barY: number; labelY: number } {
  return {
    walkerY: height / 2 - 124,
    barY: height / 2 + 174,
    labelY: height / 2 + 233,
  }
}

export function createLoadingBar(
  scene: Phaser.Scene,
  width: number,
  barY: number,
  labelY: number,
): LoadingBarWidgets {
  const barX = width / 2
  const label = scene.add.text(barX, labelY, 'Loading...', {
    fontSize: '35px',
    color: '#5577bb',
  }).setOrigin(0.5).setDepth(951)

  // PreloadScene shows this bar while the bar sheets themselves are still downloading —
  // fall back to plain rectangles until the big-bar texture (and its frames) exist.
  if (scene.textures.exists(HEALTH_BAR_ASSETS.big.base.key)) {
    const healthBar = new HealthBar(scene, barX, barY, {
      barWidth: BAR_W,
      barHeight: BAR_H,
      offsetY: 0,
      depth: 950,
      variant: 'big',
      owner: Owner.PLAYER,
    })
    healthBar.update(barX, barY, 0, true)
    return { healthBar, bar: null, label, barX, barY }
  }

  scene.add.rectangle(barX, barY, BAR_W, 50, 0x333366).setDepth(950)
  const bar = scene.add.rectangle(barX - BAR_W / 2, barY, 0, 40, 0x6688cc).setDepth(951)
  bar.setOrigin(0, 0.5)
  return { healthBar: null, bar, label, barX, barY }
}

export function setLoadingProgress(widgets: LoadingBarWidgets, value: number): void {
  const clamped = Math.max(0, Math.min(1, value))
  if (widgets.healthBar) {
    widgets.healthBar.update(widgets.barX, widgets.barY, clamped, true)
  } else if (widgets.bar) {
    widgets.bar.width = 734 * clamped
  }
  widgets.label.setText(`Loading... ${Math.round(clamped * 100)}%`)
}

export function startBattleLoading(scene: Phaser.Scene): void {
  scene.scene.start('TransitionLoadingScene', { next: 'BattleScene' })
}
