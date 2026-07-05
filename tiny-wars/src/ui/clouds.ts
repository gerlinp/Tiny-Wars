import Phaser from 'phaser'

/**
 * Big decorative clouds — slow horizontal drift on menus, and a full-screen
 * cover that disperses to reveal the arena when a match starts (solo and PvP).
 */

const CLOUD_FRAME_COUNT = 8

export function cloudTextureKey(index: number): string {
  return `cloud_${index + 1}`
}

/** Queue all cloud frames — call from PreloadScene. */
export function preloadClouds(load: Phaser.Loader.LoaderPlugin, assetPrefix = 'assets/'): void {
  for (let i = 0; i < CLOUD_FRAME_COUNT; i++) {
    const n = `${i + 1}`.padStart(2, '0')
    load.image(cloudTextureKey(i), `${assetPrefix}Terrain/Decorations/Clouds/Clouds_${n}.png`)
  }
}

function randomCloudKey(scene: Phaser.Scene): string {
  const idx = Math.floor(Math.random() * CLOUD_FRAME_COUNT)
  const key = cloudTextureKey(idx)
  return scene.textures.exists(key) ? key : cloudTextureKey(0)
}

/**
 * Slow-drifting oversized clouds for menu backdrops. Clouds are wider than the
 * screen fraction given so they read partly off-screen; they wrap horizontally.
 * Cleans itself up on scene shutdown.
 */
export function createDriftingClouds(
  scene: Phaser.Scene,
  width: number,
  height: number,
  depth = 0,
  count = 5,
): void {
  if (!scene.textures.exists(cloudTextureKey(0))) return

  const clouds: { img: Phaser.GameObjects.Image; speed: number }[] = []
  for (let i = 0; i < count; i++) {
    const img = scene.add.image(
      Math.random() * width * 1.6 - width * 0.3,
      (i + 0.5) * (height / count) + (Math.random() - 0.5) * height * 0.1,
      randomCloudKey(scene),
    ).setDepth(depth).setAlpha(0.9)
    // Huge — between 1.4× and 2.4× screen width; each cloud dominates the screen
    // and always hangs partly off both edges.
    const w = width * (1.4 + Math.random() * 1.0)
    img.setDisplaySize(w, w * (256 / 576))
    clouds.push({ img, speed: 6 + Math.random() * 8 })  // px/sec, gentle drift
  }

  const onUpdate = (_time: number, deltaMs: number) => {
    for (const c of clouds) {
      c.img.x += (c.speed * deltaMs) / 1000
      const half = c.img.displayWidth / 2
      if (c.img.x - half > width) c.img.x = -half
    }
  }
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate)
  })
}

/**
 * High-speed transition clouds — Persona-style rush: giant clouds streak across
 * the screen horizontally as if the camera were on a fast train. Continuous while
 * the scene lives; cleans itself up on shutdown.
 */
export function createSpeedingClouds(
  scene: Phaser.Scene,
  width: number,
  height: number,
  depth = 0,
  count = 10,
): void {
  if (!scene.textures.exists(cloudTextureKey(0))) return

  interface Streak { img: Phaser.GameObjects.Image; speed: number }
  const streaks: Streak[] = []

  const respawn = (s: Streak, initial = false) => {
    const w = width * (0.9 + Math.random() * 1.1)
    s.img.setTexture(randomCloudKey(scene))
    s.img.setDisplaySize(w, w * (256 / 576) * 0.8)
    s.img.y = Math.random() * height
    // Start fully off the left edge (or anywhere when seeding the first frame).
    s.img.x = initial ? Math.random() * width : -s.img.displayWidth / 2 - Math.random() * width * 0.25
    s.speed = 1000 + Math.random() * 800  // px/sec — train-window rush
    s.img.setAlpha(0.85 + Math.random() * 0.15)
  }

  for (let i = 0; i < count; i++) {
    const img = scene.add.image(0, 0, cloudTextureKey(0)).setDepth(depth)
    const streak: Streak = { img, speed: 0 }
    respawn(streak, true)
    streaks.push(streak)
  }

  const onUpdate = (_t: number, deltaMs: number) => {
    for (const s of streaks) {
      s.img.x += (s.speed * deltaMs) / 1000
      if (s.img.x - s.img.displayWidth / 2 > width) respawn(s)
    }
  }
  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate)
  })
}

const COVER_ROWS = 6
const COVER_COLS = 3
const COVER_COL_X = [0.15, 0.5, 0.85] as const

/**
 * A dense grid of giant overlapping clouds — every cell overlaps its neighbours
 * several times over, so the blanket is solid cloud with nothing visible through it.
 * Fully deterministic: the same clouds appear in the same places on every transition.
 */
function coverCloudLayout(width: number, height: number) {
  const rowH = height / COVER_ROWS
  const slots: Array<{ row: number; cx: number; cy: number; w: number; h: number; dir: number; frame: number; flip: boolean }> = []
  for (let row = 0; row < COVER_ROWS; row++) {
    for (let col = 0; col < COVER_COLS; col++) {
      slots.push({
        row,
        cx: width * COVER_COL_X[col]!,
        cy: (row + 0.5) * rowH,
        w: width * 1.1,
        h: rowH * 3.2,
        dir: (row + col) % 2 === 0 ? -1 : 1,  // alternate exit sides
        frame: (row * COVER_COLS + col) % CLOUD_FRAME_COUNT,
        flip: (row + col) % 2 === 1,
      })
    }
  }
  return slots
}

/**
 * Static full cover — the blanket sitting in place (loading screens live under it,
 * with their UI drawn above). Same deterministic layout as close/reveal.
 */
export function showCloudCoverStatic(
  scene: Phaser.Scene,
  width: number,
  height: number,
  depth = 900,
): void {
  if (!scene.textures.exists(cloudTextureKey(0))) return
  addCoverBackdrop(scene, width, height, depth - 1, 1)
  for (const slot of coverCloudLayout(width, height)) {
    scene.add.image(slot.cx, slot.cy, cloudTextureKey(slot.frame))
      .setDepth(depth)
      .setScrollFactor(0)
      .setFlipX(slot.flip)
      .setDisplaySize(slot.w, slot.h)
  }
}

/** Full-screen white backdrop under the cover clouds — guarantees an opaque whiteout. */
function addCoverBackdrop(
  scene: Phaser.Scene,
  width: number,
  height: number,
  depth: number,
  alpha: number,
): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(width / 2, height / 2, width, height, 0xffffff)
    .setDepth(depth)
    .setScrollFactor(0)
    .setAlpha(alpha)
}

/**
 * Loading-screen close-in: the row clouds sweep in and blanket the screen during
 * the final moments of loading, so the battle's cover-reveal reads as one sequence.
 */
export function playCloudCoverClose(
  scene: Phaser.Scene,
  width: number,
  height: number,
  durationMs = 700,
  depth = 900,
): void {
  if (!scene.textures.exists(cloudTextureKey(0))) return

  const backdrop = addCoverBackdrop(scene, width, height, depth - 1, 0)
  scene.tweens.add({ targets: backdrop, alpha: 1, duration: durationMs, ease: 'Quad.easeIn' })

  for (const slot of coverCloudLayout(width, height)) {
    const startX = slot.dir < 0 ? -slot.w * 0.75 : width + slot.w * 0.75
    const img = scene.add.image(startX, slot.cy, cloudTextureKey(slot.frame))
      .setDepth(depth)
      .setScrollFactor(0)
      .setFlipX(slot.flip)
    img.setDisplaySize(slot.w, slot.h)
    scene.tweens.add({
      targets: img,
      x: slot.cx,
      delay: slot.row * 60,
      duration: durationMs,
      ease: 'Cubic.easeOut',
    })
  }
}

/**
 * Match-start reveal: the board begins blanketed by one giant cloud per row
 * ({@link COVER_ROWS} rows) which then clear out over ~3 seconds to start the game.
 */
export function playCloudCoverReveal(
  scene: Phaser.Scene,
  width: number,
  height: number,
  depth = 900,
  holdMs = 500,
): void {
  if (!scene.textures.exists(cloudTextureKey(0))) return

  // Opaque whiteout underneath — the map fades in beneath the dispersing clouds
  // instead of appearing abruptly through gaps in the cloud art.
  const backdrop = addCoverBackdrop(scene, width, height, depth - 1, 1)
  scene.tweens.add({
    targets: backdrop,
    alpha: 0,
    delay: holdMs + 300,
    duration: 1500,
    ease: 'Quad.easeInOut',
    onComplete: () => backdrop.destroy(),
  })

  for (const slot of coverCloudLayout(width, height)) {
    const img = scene.add.image(slot.cx, slot.cy, cloudTextureKey(slot.frame))
      .setDepth(depth)
      .setScrollFactor(0)
      .setFlipX(slot.flip)
    img.setDisplaySize(slot.w, slot.h)

    const targetX = slot.dir < 0 ? -slot.w * 0.75 : width + slot.w * 0.75
    scene.tweens.add({
      targets: img,
      x: targetX,
      alpha: 0,
      delay: holdMs + slot.row * 160,
      duration: 2100,
      ease: 'Cubic.easeInOut',
      onComplete: () => img.destroy(),
    })
  }
}
