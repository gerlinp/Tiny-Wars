import Phaser from 'phaser'
import { CINZEL_FONT } from '../ui/cardHandLayout'
import { createVolumeSlider } from '../ui/VolumeSlider'
import { createOverlayButton } from '../ui/OverlayButton'
import {
  loadMusicVolume,
  saveMusicVolume,
  loadSfxVolume,
  saveSfxVolume,
} from '@data/AudioSettings'

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' })
  }

  create(): void {
    const { width, height } = this.scale
    const cx = width / 2

    // Dim scrim — whatever launched us keeps rendering behind, frozen if paused.
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setDepth(0)

    const panelW = Math.min(700, width * 0.8)
    const panelH = 520
    this.add.rectangle(cx, height / 2, panelW, panelH, 0x1a1a2e, 0.96)
      .setStrokeStyle(4, 0x445588)
      .setDepth(1)

    this.add.text(cx, height / 2 - panelH / 2 + 64, 'SETTINGS', {
      fontSize: '52px',
      fontFamily: CINZEL_FONT,
      fontStyle: 'bold',
      color: '#ffdd88',
      stroke: '#000022',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(2)

    const sliderWidth = panelW - 160

    createVolumeSlider(
      this, cx, height / 2 - 60, sliderWidth,
      'MUSIC VOLUME', loadMusicVolume(),
      (value) => saveMusicVolume(value),
    ).container.setDepth(2)

    createVolumeSlider(
      this, cx, height / 2 + 60, sliderWidth,
      'SFX VOLUME', loadSfxVolume(),
      (value) => saveSfxVolume(value),
    ).container.setDepth(2)

    createOverlayButton(this, cx, height / 2 + panelH / 2 - 70, 'CLOSE', () => {
      this.scene.stop('SettingsScene')
    }, { width: 200, height: 56, fontSize: '30px' }).setDepth(2)
  }
}
