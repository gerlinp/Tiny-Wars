import Phaser from 'phaser'

export { BATTLE_LOADING_MS, MIN_LOADING_MS, loadingBarProgress, loadingWaitMs } from './loadingScreenDuration'

export interface LoadingBarWidgets {
  barBg: Phaser.GameObjects.Rectangle
  bar: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
}

export function loadingLayoutY(height: number): { walkerY: number; barY: number; labelY: number } {
  return {
    walkerY: height / 2 - 50,
    barY: height / 2 + 70,
    labelY: height / 2 + 94,
  }
}

export function createLoadingBar(
  scene: Phaser.Scene,
  width: number,
  barY: number,
  labelY: number,
): LoadingBarWidgets {
  const barBg = scene.add.rectangle(width / 2, barY, 300, 20, 0x333366)
  const bar = scene.add.rectangle(width / 2 - 150, barY, 0, 16, 0x6688cc)
  bar.setOrigin(0, 0.5)
  const label = scene.add.text(width / 2, labelY, 'Loading...', {
    fontSize: '14px',
    color: '#aabbff',
  }).setOrigin(0.5)
  return { barBg, bar, label }
}

export function setLoadingProgress(widgets: LoadingBarWidgets, value: number): void {
  const clamped = Math.max(0, Math.min(1, value))
  widgets.bar.width = 296 * clamped
  widgets.label.setText(`Loading... ${Math.round(clamped * 100)}%`)
}

export function startBattleLoading(scene: Phaser.Scene): void {
  scene.scene.start('TransitionLoadingScene', { next: 'BattleScene' })
}
