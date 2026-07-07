import Phaser from 'phaser'
import { CINZEL_FONT } from './cardHandLayout'

export interface VolumeSliderHandle {
  container: Phaser.GameObjects.Container
  setValue(value: number): void
  destroy(): void
}

/** Horizontal drag-to-set slider (track + handle), 0–1 range, with a label above it. */
export function createVolumeSlider(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  label: string,
  initialValue: number,
  onChange: (value: number) => void,
): VolumeSliderHandle {
  const trackHeight = 12
  const handleRadius = 26

  const container = scene.add.container(x, y)

  const labelText = scene.add.text(-width / 2, -46, label, {
    fontSize: '36px',
    fontFamily: CINZEL_FONT,
    fontStyle: 'bold',
    color: '#ffffff',
    stroke: '#000022',
    strokeThickness: 5,
  }).setOrigin(0, 0.5)

  const track = scene.add.rectangle(0, 0, width, trackHeight, 0x223355, 0.9).setOrigin(0.5)
  const fill = scene.add.rectangle(-width / 2, 0, width * initialValue, trackHeight, 0x66aaff, 1).setOrigin(0, 0.5)

  const handle = scene.add.circle(-width / 2 + width * initialValue, 0, handleRadius, 0xffffff)
    .setStrokeStyle(4, 0x223355)
    .setInteractive({ useHandCursor: true, draggable: true })

  scene.input.setDraggable(handle)

  const valueText = scene.add.text(width / 2 + 40, 0, `${Math.round(initialValue * 100)}%`, {
    fontSize: '32px',
    fontFamily: CINZEL_FONT,
    color: '#cccccc',
  }).setOrigin(0, 0.5)

  container.add([labelText, track, fill, handle, valueText])

  const setFromLocalX = (localX: number): void => {
    const clamped = Phaser.Math.Clamp(localX, -width / 2, width / 2)
    const value = (clamped + width / 2) / width
    handle.x = clamped
    fill.width = width * value
    valueText.setText(`${Math.round(value * 100)}%`)
    onChange(value)
  }

  handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
    setFromLocalX(dragX)
  })

  track.setInteractive({ useHandCursor: true }).on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    const localX = pointer.x - container.x
    setFromLocalX(localX)
  })

  return {
    container,
    setValue: (value: number) => {
      const clamped = Phaser.Math.Clamp(value, 0, 1)
      handle.x = -width / 2 + width * clamped
      fill.width = width * clamped
      valueText.setText(`${Math.round(clamped * 100)}%`)
    },
    destroy: () => container.destroy(),
  }
}
