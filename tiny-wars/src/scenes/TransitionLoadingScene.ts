import Phaser from 'phaser'
import type { PvPNetwork } from '@core/PvPNetwork'
import { createLoadingWalker } from '@ui/loadingScreenUnit'
import { pickRandomLoadingUnitId } from '@ui/loadingScreenUnitPick'
import {
  BATTLE_LOADING_MS,
  createLoadingBar,
  loadingLayoutY,
  setLoadingProgress,
} from '@ui/loadingScreenUi'
import { createWaterBackground } from '@ui/menuBackground'
import { showCloudCoverStatic } from '@ui/clouds'

interface TransitionData {
  next: string
  data?: { pvpNetwork?: PvPNetwork }
}

/** Short loading screen with a random walker — used before entering battle. */
export class TransitionLoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TransitionLoadingScene' })
  }

  create(data: TransitionData): void {
    const { width, height } = this.scale
    createWaterBackground(this, width, height)
    // The whole screen stays blanketed in clouds during loading — BattleScene then
    // disperses the identical cover, so the sequence reads as one continuous sky.
    showCloudCoverStatic(this, width, height)

    const layout = loadingLayoutY(height)
    const bars = createLoadingBar(this, width, layout.barY, layout.labelY)
    createLoadingWalker(this, pickRandomLoadingUnitId(), width / 2, layout.walkerY)?.setDepth(951)

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: BATTLE_LOADING_MS,
      onUpdate: (tween) => setLoadingProgress(bars, tween.getValue() ?? 0),
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
