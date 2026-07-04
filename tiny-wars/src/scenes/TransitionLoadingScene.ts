import Phaser from 'phaser'
import { createLoadingWalker } from '@ui/loadingScreenUnit'
import { pickRandomLoadingUnitId } from '@ui/loadingScreenUnitPick'
import {
  BATTLE_LOADING_MS,
  createLoadingBar,
  loadingLayoutY,
  setLoadingProgress,
} from '@ui/loadingScreenUi'
import { createWaterBackground } from '@ui/menuBackground'
import { createSpeedingClouds, playCloudCoverClose } from '@ui/clouds'

interface TransitionData {
  next: string
  data?: object
}

/** Short loading screen with a random walker — used before entering battle. */
export class TransitionLoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TransitionLoadingScene' })
  }

  create(data: TransitionData): void {
    const { width, height } = this.scale
    createWaterBackground(this, width, height)
    createSpeedingClouds(this, width, height)

    const layout = loadingLayoutY(height)
    const bars = createLoadingBar(this, width, layout.barY, layout.labelY)
    createLoadingWalker(this, pickRandomLoadingUnitId(), width / 2, layout.walkerY)

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: BATTLE_LOADING_MS,
      onUpdate: (tween) => setLoadingProgress(bars, tween.getValue() ?? 0),
    })

    // Clouds sweep in to blanket the screen just before the arena appears —
    // BattleScene then plays the matching cover-reveal.
    const CLOUD_CLOSE_MS = 800
    this.time.delayedCall(Math.max(0, BATTLE_LOADING_MS - CLOUD_CLOSE_MS), () => {
      playCloudCoverClose(this, width, height, CLOUD_CLOSE_MS - 100)
    })

    this.time.delayedCall(BATTLE_LOADING_MS, () => {
      if (data.data !== undefined) {
        this.scene.start(data.next, data.data)
      } else {
        this.scene.start(data.next)
      }
    })
  }
}
