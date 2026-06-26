import Phaser from 'phaser'
import { createLoadingWalker } from '@ui/loadingScreenUnit'
import { pickRandomLoadingUnitId } from '@ui/loadingScreenUnitPick'
import {
  BATTLE_LOADING_MS,
  createLoadingBar,
  loadingLayoutY,
  setLoadingProgress,
} from '@ui/loadingScreenUi'

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
    this.add.rectangle(0, 0, width, height, 0x1a1a2e).setOrigin(0)

    const layout = loadingLayoutY(height)
    const bars = createLoadingBar(this, width, layout.barY, layout.labelY)
    createLoadingWalker(this, pickRandomLoadingUnitId(), width / 2, layout.walkerY)

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
