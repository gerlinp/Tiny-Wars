import Phaser from 'phaser'
import { SHAMAN_PALETTES, SHAMAN_FIRE_PALETTES, type PaletteMap } from '@data/ShamanPalettes'
import { FRAME_W, FRAME_H } from '@data/AssetManifest'

function buildLookup(palette: PaletteMap): Map<number, readonly [number, number, number]> {
  const map = new Map<number, readonly [number, number, number]>()
  for (const [src, dst] of palette) {
    map.set(src, [(dst >> 16) & 0xFF, (dst >> 8) & 0xFF, dst & 0xFF])
  }
  return map
}

function recolorCanvas(
  img: HTMLImageElement | HTMLCanvasElement,
  lookup: Map<number, readonly [number, number, number]>,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 16) continue
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]
    const rep = lookup.get(key)
    if (rep) { d[i] = rep[0]; d[i + 1] = rep[1]; d[i + 2] = rep[2] }
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

// Top FIRE_ZONE_RATIO of each frame gets the fire palette; the rest gets the robe palette.
// Skull, hat, and any pixel whose hex isn't in either palette pass through unchanged.
const FIRE_ZONE_RATIO = 0.40

function recolorCanvasWithFireZone(
  img: HTMLImageElement | HTMLCanvasElement,
  robeLookup: Map<number, readonly [number, number, number]>,
  fireLookup: Map<number, readonly [number, number, number]>,
  frameWidth: number,
  frameHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = imageData.data
  const framesPerRow = Math.floor(img.width / frameWidth)
  const numRows      = Math.floor(img.height / frameHeight)
  const fireZonePx   = Math.floor(frameHeight * FIRE_ZONE_RATIO)

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < framesPerRow; col++) {
      const ox = col * frameWidth
      const oy = row * frameHeight
      for (let py = oy; py < oy + frameHeight; py++) {
        const inFireZone = (py - oy) < fireZonePx
        for (let px = ox; px < ox + frameWidth; px++) {
          const i = (py * canvas.width + px) * 4
          if (d[i + 3] < 16) continue
          const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]
          const rep = (inFireZone ? fireLookup : robeLookup).get(key)
          if (rep) { d[i] = rep[0]; d[i + 1] = rep[1]; d[i + 2] = rep[2] }
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

function swapSpriteSheet(
  scene: Phaser.Scene,
  sourceKey: string,
  targetKey: string,
  palette: PaletteMap,
  frameWidth: number,
  frameHeight: number,
): void {
  if (scene.textures.exists(targetKey)) return
  const img = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement
  const canvas = recolorCanvas(img, buildLookup(palette))
  scene.textures.addSpriteSheet(targetKey, canvas as unknown as HTMLImageElement, { frameWidth, frameHeight })
}

function swapBodySpriteSheet(
  scene: Phaser.Scene,
  sourceKey: string,
  targetKey: string,
  robePalette: PaletteMap,
  firePalette: PaletteMap,
  frameWidth: number,
  frameHeight: number,
): void {
  if (scene.textures.exists(targetKey)) return
  const img = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement
  const canvas = recolorCanvasWithFireZone(
    img, buildLookup(robePalette), buildLookup(firePalette), frameWidth, frameHeight,
  )
  scene.textures.addSpriteSheet(targetKey, canvas as unknown as HTMLImageElement, { frameWidth, frameHeight })
}

function swapImage(
  scene: Phaser.Scene,
  sourceKey: string,
  targetKey: string,
  palette: PaletteMap,
): void {
  if (scene.textures.exists(targetKey)) return
  const img = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement
  const canvas = recolorCanvas(img, buildLookup(palette))
  scene.textures.addImage(targetKey, canvas as unknown as HTMLImageElement)
}

const HEX_FX_FRAME = 128

/** Generate all palette-swapped shaman textures from the loaded base sprites. */
export function generateAllShamanTextures(scene: Phaser.Scene): void {
  for (const [cardId, palettes] of Object.entries(SHAMAN_PALETTES)) {
    const firePalette = SHAMAN_FIRE_PALETTES[cardId]
    for (const [side, palette] of [
      ['blue', palettes.player],
      ['red',  palettes.bot],
    ] as const) {
      for (const anim of ['idle', 'run', 'attack'] as const) {
        if (firePalette) {
          swapBodySpriteSheet(
            scene, `hex_shaman_base_${anim}`, `${cardId}_${side}_${anim}`,
            palette, firePalette, FRAME_W, FRAME_H,
          )
        } else {
          swapSpriteSheet(scene, `hex_shaman_base_${anim}`, `${cardId}_${side}_${anim}`, palette, FRAME_W, FRAME_H)
        }
      }
    }
    // Projectile + explosion: card-identity fire color, same for both factions
    if (firePalette) {
      swapSpriteSheet(scene, 'hex_shaman_projectile', `${cardId}_projectile`, firePalette, HEX_FX_FRAME, HEX_FX_FRAME)
      swapSpriteSheet(scene, 'hex_shaman_explosion',  `${cardId}_explosion`,  firePalette, HEX_FX_FRAME, HEX_FX_FRAME)
    }
    // Avatar portrait uses player palette only
    swapImage(scene, 'hex_shaman_base_avatar', `avatar_${cardId}`, palettes.player)
  }
}
