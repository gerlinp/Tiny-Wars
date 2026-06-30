import Phaser from 'phaser'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { arrowFlightMs } from '@data/ProjectileConstants'
import { clipAnimKey, GNOLL_BONE_SHEET, HARPOON_PROJECTILE_SHEET } from '@data/AssetManifest'
import { HOOK_ROPE_TEXTURE_KEY, registerHookRopeTexture } from './hookRopeTexture'
import { CELL_SIZE } from '@data/GameConstants'
import { applyBombArcDisplaySize, BOMB_PROJECTILE_DISPLAY_SCALE, BOMB_SPIN_TIME_SCALE, FLAT_LOB_PEAK_SCALE, TOWER_CANNON_PROJECTILE_DISPLAY_SCALE } from './bombProjectileVisual'
import { applyArrowSprite, arrowTextureKey } from './renderingUtils'
import type { EffectsPool } from './VFXPools'

// ─── ArrowPool ───────────────────────────────────────────────────────────────

const ARROW_POOL_SIZE = 24

export class ArrowPool {
  private pool: Phaser.GameObjects.Image[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < ARROW_POOL_SIZE; i++) {
      const img = scene.add.image(0, 0, arrowTextureKey(Owner.PLAYER))
        .setDepth(22)
        .setAlpha(0)
      applyArrowSprite(img)
      this.pool.push(img)
    }
  }

  spawn(from: Vec2, to: Vec2, owner: Owner, attackRate: number, onHit?: () => void): void {
    const img = this.pool.find(a => !a.getData('flying'))
    if (!img) {
      onHit?.()
      return
    }

    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1) {
      onHit?.()
      return
    }

    const angle = Math.atan2(dy, dx)
    const duration = arrowFlightMs(dist, attackRate)

    img.setData('flying', true)
    img.setTexture(arrowTextureKey(owner))
    applyArrowSprite(img)
    img.setPosition(from.x, from.y)
    img.setRotation(angle)
    img.clearTint()
    img.setAlpha(1)
    img.setScale(1)

    this.scene.tweens.add({
      targets: img,
      x: to.x,
      y: to.y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        img.setAlpha(0)
        img.setData('flying', false)
        onHit?.()
      },
    })
  }
}

// ─── ArrowsSpellPool ─────────────────────────────────────────────────────────

const ARROWS_SPELL_POOL_SIZE = 20
const ARROW_COUNT = 14
const STAGGER_MS = 32

export class ArrowsSpellPool {
  private pool: Phaser.GameObjects.Image[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < ARROWS_SPELL_POOL_SIZE; i++) {
      const img = this.scene.add.image(0, 0, arrowTextureKey(Owner.PLAYER))
        .setDepth(22)
        .setAlpha(0)
      applyArrowSprite(img)
      img.setData('flying', false)
      this.pool.push(img)
    }
  }

  spawn(target: Vec2, owner: Owner, radiusPx: number, flightMs: number, onHit?: () => void): void {
    const approach = radiusPx * 2.6
    const spread = radiusPx * 1.7

    for (let i = 0; i < ARROW_COUNT; i++) {
      this.scene.time.delayedCall(i * STAGGER_MS, () => {
        const img = this.pool.find(a => !a.getData('flying'))
        if (!img) return

        const landingX = target.x + (Math.random() - 0.5) * spread
        const landingY = target.y + (Math.random() - 0.5) * spread

        const fromCasterSide = owner === Owner.PLAYER ? -1 : 1
        const fromX = landingX + fromCasterSide * approach * (0.75 + Math.random() * 0.35)
        const fromY = landingY + (owner === Owner.PLAYER ? -1 : 1) * approach * (0.75 + Math.random() * 0.35)

        const dx = landingX - fromX
        const dy = landingY - fromY
        const angle = Math.atan2(dy, dx)
        const duration = Math.round(flightMs * (0.75 + Math.random() * 0.35))

        img.setData('flying', true)
        img.setTexture(arrowTextureKey(owner))
        applyArrowSprite(img)
        img.setPosition(fromX, fromY)
        img.setRotation(angle)
        img.clearTint()
        img.setAlpha(0.95)
        img.setScale(1)

        this.scene.tweens.add({
          targets: img,
          x: landingX,
          y: landingY,
          duration,
          ease: 'Linear',
          onComplete: () => {
            img.setAlpha(0)
            img.setData('flying', false)
            onHit?.()
          },
        })
      })
    }
  }
}

// ─── TntPool ─────────────────────────────────────────────────────────────────

const TNT_POOL_SIZE = 8
const TNT_PROJECTILE_DISPLAY = CELL_SIZE * BOMB_PROJECTILE_DISPLAY_SCALE
const TOWER_CANNON_PROJECTILE_DISPLAY = CELL_SIZE * TOWER_CANNON_PROJECTILE_DISPLAY_SCALE
const BOMB_SPIN_SHEET = 'bomb_spinning'

export type TntLobStyle = 'rocket' | 'flat' | 'straight'

export interface TntProjectileStyle {
  projectileKey?: string
  spinAnimKey?: string
  displaySize?: number
}

export class TntPool {
  private pool: Phaser.GameObjects.Sprite[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < TNT_POOL_SIZE; i++) {
      this.pool.push(this.createProjectile())
    }
  }

  private createProjectile(): Phaser.GameObjects.Sprite {
    const key = this.scene.textures.exists(BOMB_SPIN_SHEET) ? BOMB_SPIN_SHEET : 'placeholder_player'
    const spr = this.scene.add.sprite(0, 0, key, 0)
      .setDepth(21)
      .setOrigin(0.5, 0.5)
      .setVisible(false)
    spr.setData('flying', false)
    return spr
  }

  spawn(
    from: Vec2,
    to: Vec2,
    owner: Owner,
    flightMs: number,
    onHit?: () => void,
    lobStyle: TntLobStyle = 'rocket',
    projectileStyle?: TntProjectileStyle,
  ): void {
    const bomb = this.pool.find(b => !b.getData('flying'))
    if (!bomb) {
      onHit?.()
      return
    }

    const flat = lobStyle === 'flat'
    const straight = lobStyle === 'straight'
    const baseSize = projectileStyle?.displaySize ?? (flat ? TOWER_CANNON_PROJECTILE_DISPLAY : TNT_PROJECTILE_DISPLAY)
    const peakScale = flat ? FLAT_LOB_PEAK_SCALE : undefined

    let projectileKey = projectileStyle?.projectileKey
      ?? (this.scene.textures.exists(BOMB_SPIN_SHEET) ? BOMB_SPIN_SHEET : 'placeholder_player')
    if (!this.scene.textures.exists(projectileKey)) {
      projectileKey = this.scene.textures.exists(BOMB_SPIN_SHEET) ? BOMB_SPIN_SHEET : 'placeholder_player'
    }
    const spinKey = projectileStyle?.spinAnimKey ?? clipAnimKey('tnt', owner, 'run')

    bomb.setData('flying', true)
    bomb.setData('projectileDisplay', baseSize)
    bomb.anims.stop()
    bomb.setTexture(projectileKey, 0)
    bomb.setFrame(0)
    bomb.setDisplaySize(baseSize, baseSize)
    bomb.setPosition(from.x, from.y)
    const dx = to.x - from.x
    const dy = to.y - from.y
    bomb.setRotation(straight ? Math.atan2(dy, dx) : 0)
    bomb.setVisible(true)
    bomb.setAlpha(1)

    if (spinKey && this.scene.anims.exists(spinKey)) {
      bomb.anims.timeScale = straight ? 1 : BOMB_SPIN_TIME_SCALE
      bomb.anims.play(spinKey)
    }

    this.scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: flightMs,
      ease: 'Linear',
      onUpdate: (_tween, target) => {
        const t = (target as { t: number }).t
        bomb.setPosition(
          from.x + (to.x - from.x) * t,
          from.y + (to.y - from.y) * t,
        )
        if (!straight) {
          applyBombArcDisplaySize(bomb, baseSize, t, peakScale)
        }
      },
      onComplete: () => {
        this.finishTnt(bomb)
        onHit?.()
      },
    })
  }

  private finishTnt(bomb: Phaser.GameObjects.Sprite): void {
    const baseSize = (bomb.getData('projectileDisplay') as number | undefined) ?? TNT_PROJECTILE_DISPLAY
    bomb.setVisible(false)
    bomb.setData('flying', false)
    bomb.anims.stop()
    bomb.anims.timeScale = 1
    bomb.removeAllListeners()
    bomb.setDisplaySize(baseSize, baseSize)
    bomb.setRotation(0)
    this.scene.tweens.killTweensOf(bomb)
  }
}

// ─── BarrelPool ──────────────────────────────────────────────────────────────

const BARREL_POOL_SIZE = 6
const BARREL_PROJECTILE_DISPLAY = CELL_SIZE * BOMB_PROJECTILE_DISPLAY_SCALE
/** Full rotations completed over a typical mid-range flight (~2 s). */
const BARREL_SPIN_ROTATIONS = 2.5

export class BarrelPool {
  private pool: Phaser.GameObjects.Sprite[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < BARREL_POOL_SIZE; i++) {
      this.pool.push(this.createProjectile())
    }
  }

  private createProjectile(): Phaser.GameObjects.Sprite {
    const key = this.scene.textures.exists('barrel_blue') ? 'barrel_blue' : 'placeholder_player'
    const spr = this.scene.add.sprite(0, 0, key, 0)
      .setDepth(21)
      .setOrigin(0.5, 0.5)
      .setVisible(false)
    spr.setData('flying', false)
    return spr
  }

  spawn(
    from: Vec2,
    to: Vec2,
    owner: Owner,
    flightMs: number,
    onHit?: () => void,
  ): void {
    const barrel = this.pool.find(b => !b.getData('flying'))
    if (!barrel) {
      onHit?.()
      return
    }

    const textureKey = owner === Owner.PLAYER ? 'barrel_blue' : 'barrel_red'

    barrel.setData('flying', true)
    barrel.setTexture(textureKey, 0)
    barrel.setDisplaySize(BARREL_PROJECTILE_DISPLAY, BARREL_PROJECTILE_DISPLAY)
    barrel.setPosition(from.x, from.y)
    barrel.setRotation(0)
    barrel.setVisible(true)
    barrel.setAlpha(1)
    barrel.anims.stop()

    const totalRotation = Math.PI * 2 * BARREL_SPIN_ROTATIONS

    this.scene.tweens.add({
      targets: { t: 0 },
      t: 1,
      duration: flightMs,
      ease: 'Linear',
      onUpdate: (_tween, target) => {
        const t = (target as { t: number }).t
        barrel.setPosition(
          from.x + (to.x - from.x) * t,
          from.y + (to.y - from.y) * t,
        )
        barrel.setRotation(t * totalRotation)
        applyBombArcDisplaySize(barrel, BARREL_PROJECTILE_DISPLAY, t)
      },
      onComplete: () => {
        barrel.setVisible(false)
        barrel.setData('flying', false)
        barrel.setRotation(0)
        barrel.setDisplaySize(BARREL_PROJECTILE_DISPLAY, BARREL_PROJECTILE_DISPLAY)
        this.scene.tweens.killTweensOf(barrel)
        onHit?.()
      },
    })
  }
}

// ─── BoneBoomerangPool ───────────────────────────────────────────────────────

const BONE_POOL_SIZE = 12
const BONE_DISPLAY = CELL_SIZE * 2.4

export class BoneBoomerangPool {
  private pool: Phaser.GameObjects.Sprite[] = []
  private active = new Map<string, Phaser.GameObjects.Sprite>()

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < BONE_POOL_SIZE; i++) {
      const spr = scene.add.sprite(0, 0, GNOLL_BONE_SHEET.key, 0)
        .setDepth(22)
        .setOrigin(0.5, 0.5)
        .setVisible(false)
      spr.setData('inUse', false)
      this.pool.push(spr)
    }
  }

  spawn(id: string, owner: Owner, x: number, y: number): void {
    if (this.active.has(id)) return
    const bone = this.pool.find(s => !s.getData('inUse'))
    if (!bone || !this.scene.anims.exists(GNOLL_BONE_SHEET.animKey)) return

    bone.setData('inUse', true)
    bone.setTexture(GNOLL_BONE_SHEET.key, 0)
    bone.setPosition(x, y)
    bone.setDisplaySize(BONE_DISPLAY, BONE_DISPLAY)
    bone.setVisible(true)
    bone.setAlpha(1)
    bone.clearTint()
    if (owner === Owner.BOT) bone.setTint(0xff8888)
    bone.play(GNOLL_BONE_SHEET.animKey)
    this.active.set(id, bone)
  }

  sync(id: string, x: number, y: number, angleRad: number): void {
    const bone = this.active.get(id)
    if (!bone) return
    bone.setPosition(x, y)
    bone.setRotation(angleRad)
  }

  syncFromState(
    boomerangs: Array<{ id: string; owner: Owner; position: { x: number; y: number }; dir: { x: number; y: number } }>,
  ): void {
    const live = new Set<string>()
    for (const b of boomerangs) {
      live.add(b.id)
      if (!this.active.has(b.id)) {
        this.spawn(b.id, b.owner, b.position.x, b.position.y)
      }
      this.sync(b.id, b.position.x, b.position.y, Math.atan2(b.dir.y, b.dir.x))
    }
    for (const [id, bone] of this.active) {
      if (!live.has(id)) this.releaseBoomerang(id, bone)
    }
  }

  private releaseBoomerang(id: string, bone: Phaser.GameObjects.Sprite): void {
    bone.setVisible(false)
    bone.anims.stop()
    bone.setData('inUse', false)
    this.active.delete(id)
  }
}

// ─── HexFireballPool ─────────────────────────────────────────────────────────

const HEX_POOL_SIZE = 16
const HEX_PROJECTILE_KEY = 'hex_shaman_projectile'
const HEX_PROJECTILE_DISPLAY = 128

export interface HexFireballStyle {
  projectileTint?: number
  explosionTint?: number
}

export class HexFireballPool {
  private projectiles: Phaser.GameObjects.Sprite[] = []

  constructor(
    private scene: Phaser.Scene,
    private effects: EffectsPool,
  ) {
    for (let i = 0; i < HEX_POOL_SIZE; i++) {
      this.projectiles.push(this.createProjectile())
    }
  }

  private createProjectile(): Phaser.GameObjects.Sprite {
    const spr = this.scene.add.sprite(0, 0, HEX_PROJECTILE_KEY, 0)
      .setDepth(22)
      .setOrigin(0.5, 0.5)
      .setVisible(false)
    spr.setData('flying', false)
    return spr
  }

  spawn(
    from: Vec2,
    to: Vec2,
    _owner: Owner,
    attackRate: number,
    onHit?: () => void,
    style?: HexFireballStyle,
  ): void {
    const bolt = this.projectiles.find(p => !p.getData('flying'))
    if (!bolt) {
      onHit?.()
      return
    }

    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.hypot(dx, dy)
    if (dist < 1) {
      this.effects.spawn(to.x, to.y, undefined, style?.explosionTint)
      onHit?.()
      return
    }

    const angle = Math.atan2(dy, dx)
    const duration = arrowFlightMs(dist, attackRate)

    bolt.setData('flying', true)
    bolt.setTexture(HEX_PROJECTILE_KEY, 0)
    bolt.setDisplaySize(HEX_PROJECTILE_DISPLAY, HEX_PROJECTILE_DISPLAY)
    bolt.setPosition(from.x, from.y)
    bolt.setRotation(angle)
    bolt.setVisible(true)
    bolt.setAlpha(1)
    if (style?.projectileTint !== undefined) bolt.setTint(style.projectileTint)
    else bolt.clearTint()
    bolt.anims.stop()

    this.scene.tweens.add({
      targets: bolt,
      x: to.x,
      y: to.y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        bolt.setVisible(false)
        bolt.setData('flying', false)
        bolt.clearTint()
        this.effects.spawn(to.x, to.y, undefined, style?.explosionTint)
        onHit?.()
      },
    })
  }
}

// ─── HarpoonRopePool ─────────────────────────────────────────────────────────

const HARPOON_ROPE_POOL_SIZE = 10
const ROPE_DISPLAY_WIDTH = 3
const HARPOON_TIP_DISPLAY = 22

interface HarpoonRopeVisual {
  rope: Phaser.GameObjects.Image
  harpoon: Phaser.GameObjects.Image
}

export class HarpoonRopePool {
  private active = new Map<string, HarpoonRopeVisual>()
  private free: HarpoonRopeVisual[] = []

  constructor(private scene: Phaser.Scene) {
    registerHookRopeTexture(scene)
    for (let i = 0; i < HARPOON_ROPE_POOL_SIZE; i++) {
      this.free.push(this.createVisual())
    }
  }

  private createVisual(): HarpoonRopeVisual {
    const rope = this.scene.add.image(0, 0, HOOK_ROPE_TEXTURE_KEY)
      .setDepth(21)
      .setVisible(false)
    const harpoon = this.scene.add.image(0, 0, HARPOON_PROJECTILE_SHEET.key)
      .setDepth(22)
      .setVisible(false)
    return { rope, harpoon }
  }

  syncFromState(
    hooks: Array<{ id: string }>,
    anchorFor: (hookId: string) => { x: number; y: number } | null,
    endFor: (hookId: string) => { x: number; y: number } | null,
  ): void {
    const live = new Set<string>()

    for (const hook of hooks) {
      const from = anchorFor(hook.id)
      const to = endFor(hook.id)
      if (!from || !to) continue

      live.add(hook.id)
      let visual = this.active.get(hook.id)
      if (!visual) {
        visual = this.free.pop()
        if (!visual) continue
        this.active.set(hook.id, visual)
      }

      this.layout(visual, from, to)
      visual.rope.setVisible(true)
      visual.harpoon.setVisible(true)
    }

    for (const [id, visual] of [...this.active]) {
      if (live.has(id)) continue
      visual.rope.setVisible(false)
      visual.harpoon.setVisible(false)
      this.active.delete(id)
      this.free.push(visual)
    }
  }

  private layout(visual: HarpoonRopeVisual, from: Vec2, to: Vec2): void {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.max(2, Math.hypot(dx, dy))
    const angle = Math.atan2(dy, dx)

    visual.rope.setPosition(from.x, from.y)
    visual.rope.setOrigin(0, 0.5)
    visual.rope.setRotation(angle)
    visual.rope.setDisplaySize(len, ROPE_DISPLAY_WIDTH)
    visual.rope.setAlpha(0.92)

    visual.harpoon.setPosition(to.x, to.y)
    visual.harpoon.setRotation(angle)
    visual.harpoon.setDisplaySize(HARPOON_TIP_DISPLAY, HARPOON_TIP_DISPLAY)
    visual.harpoon.setOrigin(0.9, 0.5)
  }
}
