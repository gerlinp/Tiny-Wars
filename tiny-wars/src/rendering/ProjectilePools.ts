import Phaser from 'phaser'
import { Owner } from '@core/types'
import type { Vec2 } from '@core/types'
import { arrowFlightMs } from '@data/ProjectileConstants'
import { clipAnimKey, GNOLL_BONE_SHEET, HARPOON_PROJECTILE_SHEET, HEX_SHAMAN_TRANSFORM_SPELL_SHEET, HEX_SHAMAN_EXPLOSION_SPELL_SHEET, HEX_SHAMAN_LIGHTNING_BOLT_SHEET } from '@data/AssetManifest'
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

// ─── HexShamanOrbPool ────────────────────────────────────────────────────────

const HEX_ORB_POOL_SIZE = 12
const HEX_ORB_DISPLAY = 128
const HEX_ORB_EXPLOSION_DISPLAY = 192

export class HexShamanOrbPool {
  private pool: Array<{ orb: Phaser.GameObjects.Sprite; explosion: Phaser.GameObjects.Sprite }> = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < HEX_ORB_POOL_SIZE; i++) {
      const orb = scene.add.sprite(0, 0, 'hex_shaman_projectile', 0)
        .setDepth(22).setOrigin(0.5).setVisible(false)
      const explosion = scene.add.sprite(0, 0, 'hex_shaman_explosion', 0)
        .setDepth(22).setOrigin(0.5).setVisible(false)
      this.pool.push({ orb, explosion })
    }
  }

  spawn(
    from: Vec2,
    to: Vec2,
    cardId: string,
    _owner: Owner,
    attackRate: number,
    onHit?: () => void,
  ): void {
    const item = this.pool.find(p => !p.orb.getData('flying'))
    if (!item) { onHit?.(); return }

    // Fire color is card-identity, not faction — keys have no side suffix
    const projKey  = `${cardId}_projectile`
    const projAnim = `${cardId}_projectile_anim`
    const exKey    = `${cardId}_explosion`
    const exAnim   = `${cardId}_explosion_anim`

    const { orb, explosion } = item
    const dx = to.x - from.x
    const dy = to.y - from.y
    const d = Math.hypot(dx, dy)

    if (d < 1) {
      this.playExplosion(explosion, to, exKey, exAnim)
      onHit?.()
      return
    }

    orb.setData('flying', true)
    orb.setTexture(projKey, 0)
    orb.setDisplaySize(HEX_ORB_DISPLAY, HEX_ORB_DISPLAY)
    orb.setPosition(from.x, from.y)
    orb.setRotation(Math.atan2(dy, dx))
    orb.setVisible(true)
    orb.setAlpha(1)
    orb.play(projAnim)

    this.scene.tweens.add({
      targets: orb,
      x: to.x,
      y: to.y,
      duration: arrowFlightMs(d, attackRate),
      ease: 'Linear',
      onComplete: () => {
        orb.setVisible(false)
        orb.setData('flying', false)
        orb.anims.stop()
        this.playExplosion(explosion, to, exKey, exAnim)
        onHit?.()
      },
    })
  }

  private playExplosion(
    spr: Phaser.GameObjects.Sprite,
    pos: Vec2,
    texKey: string,
    animKey: string,
  ): void {
    if (!this.scene.textures.exists(texKey) || !this.scene.anims.exists(animKey)) return
    spr.setTexture(texKey, 0)
    spr.setDisplaySize(HEX_ORB_EXPLOSION_DISPLAY, HEX_ORB_EXPLOSION_DISPLAY)
    spr.setPosition(pos.x, pos.y)
    spr.setVisible(true)
    spr.setAlpha(1)
    spr.play(animKey)
    spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      spr.setVisible(false)
      spr.anims.stop()
    })
  }
}

// ─── HexTransformPool ────────────────────────────────────────────────────────

const HEX_TRANSFORM_POOL_SIZE = 8
const HEX_TRANSFORM_DISPLAY = CELL_SIZE * 4

export class HexTransformPool {
  private transformPool: Phaser.GameObjects.Sprite[] = []
  private explosionPool: Phaser.GameObjects.Sprite[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < HEX_TRANSFORM_POOL_SIZE; i++) {
      this.transformPool.push(
        scene.add.sprite(0, 0, HEX_SHAMAN_TRANSFORM_SPELL_SHEET.key, 0)
          .setDepth(22).setOrigin(0.5, 0.5).setVisible(false)
          .setData('playing', false),
      )
      this.explosionPool.push(
        scene.add.sprite(0, 0, HEX_SHAMAN_EXPLOSION_SPELL_SHEET.key, 0)
          .setDepth(23).setOrigin(0.5, 0.5).setVisible(false)
          .setData('playing', false),
      )
    }
  }

  spawn(
    _from: Vec2,
    to: Vec2,
    _owner: Owner,
    _attackRate: number,
    onHit?: () => void,
  ): void {
    const tspr = this.transformPool.find(p => !p.getData('playing'))
    if (!tspr
        || !this.scene.anims.exists(HEX_SHAMAN_TRANSFORM_SPELL_SHEET.animKey)
        || !this.scene.anims.exists(HEX_SHAMAN_EXPLOSION_SPELL_SHEET.animKey)) {
      onHit?.()
      return
    }

    tspr.setData('playing', true)
    tspr.setTexture(HEX_SHAMAN_TRANSFORM_SPELL_SHEET.key, 0)
    tspr.setPosition(to.x, to.y)
    tspr.setDisplaySize(HEX_TRANSFORM_DISPLAY, HEX_TRANSFORM_DISPLAY)
    tspr.setVisible(true).setAlpha(1)
    tspr.anims.stop()
    tspr.play(HEX_SHAMAN_TRANSFORM_SPELL_SHEET.animKey)
    onHit?.()

    tspr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      tspr.setVisible(false).setData('playing', false)

      const espr = this.explosionPool.find(p => !p.getData('playing'))
      if (!espr) return
      espr.setData('playing', true)
      espr.setTexture(HEX_SHAMAN_EXPLOSION_SPELL_SHEET.key, 0)
      espr.setPosition(to.x, to.y)
      espr.setDisplaySize(HEX_TRANSFORM_DISPLAY, HEX_TRANSFORM_DISPLAY)
      espr.setVisible(true).setAlpha(1)
      espr.anims.stop()
      espr.play(HEX_SHAMAN_EXPLOSION_SPELL_SHEET.animKey)
      espr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        espr.setVisible(false).setData('playing', false)
      })
    })
  }
}

// ─── LightningShamanPool ─────────────────────────────────────────────────────
// Flies the generated lightning bolt sprite, then plays the transformation
// circle + explosion spell at the impact point (same as HexTransformPool).

const LIGHTNING_POOL_SIZE = 8
const LIGHTNING_BOLT_DISPLAY = 128

export class LightningShamanPool {
  private bolts:      Phaser.GameObjects.Sprite[] = []
  private transforms: Phaser.GameObjects.Sprite[] = []
  private explosions: Phaser.GameObjects.Sprite[] = []

  constructor(private scene: Phaser.Scene) {
    for (let i = 0; i < LIGHTNING_POOL_SIZE; i++) {
      this.bolts.push(
        scene.add.sprite(0, 0, HEX_SHAMAN_LIGHTNING_BOLT_SHEET.key, 0)
          .setDepth(22).setOrigin(0.5).setVisible(false).setData('flying', false),
      )
      this.transforms.push(
        scene.add.sprite(0, 0, HEX_SHAMAN_TRANSFORM_SPELL_SHEET.key, 0)
          .setDepth(22).setOrigin(0.5).setVisible(false).setData('playing', false),
      )
      this.explosions.push(
        scene.add.sprite(0, 0, HEX_SHAMAN_EXPLOSION_SPELL_SHEET.key, 0)
          .setDepth(23).setOrigin(0.5).setVisible(false).setData('playing', false),
      )
    }
  }

  spawn(from: Vec2, to: Vec2, _owner: Owner, attackRate: number, onHit?: () => void): void {
    const bolt = this.bolts.find(b => !b.getData('flying'))
    if (!bolt
        || !this.scene.anims.exists(HEX_SHAMAN_LIGHTNING_BOLT_SHEET.animKey)
        || !this.scene.anims.exists(HEX_SHAMAN_TRANSFORM_SPELL_SHEET.animKey)
        || !this.scene.anims.exists(HEX_SHAMAN_EXPLOSION_SPELL_SHEET.animKey)) {
      onHit?.()
      return
    }

    const dx = to.x - from.x, dy = to.y - from.y
    const d = Math.hypot(dx, dy)

    bolt.setData('flying', true)
    bolt.setTexture(HEX_SHAMAN_LIGHTNING_BOLT_SHEET.key, 0)
    bolt.setDisplaySize(LIGHTNING_BOLT_DISPLAY, LIGHTNING_BOLT_DISPLAY)
    bolt.setPosition(from.x, from.y)
    bolt.setRotation(Math.atan2(dy, dx))
    bolt.setVisible(true).setAlpha(1)
    bolt.play(HEX_SHAMAN_LIGHTNING_BOLT_SHEET.animKey)

    this.scene.tweens.add({
      targets: bolt,
      x: to.x, y: to.y,
      duration: arrowFlightMs(d, attackRate),
      ease: 'Linear',
      onComplete: () => {
        bolt.setVisible(false).setData('flying', false).anims.stop()
        onHit?.()
        this.playImpact(to)
      },
    })
  }

  private playImpact(to: Vec2): void {
    const tspr = this.transforms.find(p => !p.getData('playing'))
    if (!tspr) return
    const display = CELL_SIZE * 4
    tspr.setData('playing', true)
    tspr.setTexture(HEX_SHAMAN_TRANSFORM_SPELL_SHEET.key, 0)
    tspr.setPosition(to.x, to.y).setDisplaySize(display, display)
    tspr.setVisible(true).setAlpha(1).anims.stop()
    tspr.play(HEX_SHAMAN_TRANSFORM_SPELL_SHEET.animKey)
    tspr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      tspr.setVisible(false).setData('playing', false)
      const espr = this.explosions.find(p => !p.getData('playing'))
      if (!espr) return
      espr.setData('playing', true)
      espr.setTexture(HEX_SHAMAN_EXPLOSION_SPELL_SHEET.key, 0)
      espr.setPosition(to.x, to.y).setDisplaySize(display, display)
      espr.setVisible(true).setAlpha(1).anims.stop()
      espr.play(HEX_SHAMAN_EXPLOSION_SPELL_SHEET.animKey)
      espr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        espr.setVisible(false).setData('playing', false)
      })
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
