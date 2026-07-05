import Phaser from 'phaser'
import { playCloudCoverReveal } from '@ui/clouds'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { CardSystem } from '@core/CardSystem'
import { BotAI } from '@core/BotAI'
import { TileMapRenderer } from '@rendering/TileMapRenderer'
import { ForestBorder } from '@rendering/ForestBorder'
import { DecorationLayer } from '@rendering/DecorationLayer'
import { EntitySprite, type AttackSync, type DashSync, type HealSync } from '@rendering/EntitySprite'
import { TowerSprite } from '@rendering/TowerSprite'
import { EffectsPool, HealEffectPool, DeathPool, DustPool } from '@rendering/VFXPools'
import { logicDisplayHeightForCard } from '@rendering/assetDisplaySize'
import { ArrowPool, ArrowsSpellPool, TntPool, BarrelPool, BoneBoomerangPool, HexFireballPool, HexTransformPool, HexShamanOrbPool, LightningShamanPool, HarpoonRopePool } from '@rendering/ProjectilePools'
import { hookAnchorPosition, hookRopeEndPosition } from '@core/HookSystem'
import { ensurePlaceholders } from '@rendering/renderingUtils'
import { CardDeployController } from '@input/CardDeployController'
import { DeployZoneOverlay } from '@rendering/DeployZoneOverlay'
import { PlacementGhost } from '@rendering/PlacementGhost'
import type { UIScene, UISnapshot } from './UIScene'
import type { Tower } from '@core/entities/Tower'
import { Troop } from '@core/entities/Troop'
import type { Building } from '@core/entities/Building'
import { Owner, EntityKind, TroopState, BuildingState, CardType } from '@core/types'
import type { EntityStats } from '@core/types'
import { usesArrowProjectile, usesCannonHit } from '@data/AudioManifest'
import { getAttackWindupMs, getRunLeapPose, GOBLIN_DYNAMITE_SHEET, GARRISON_CANNON_BALL, type AnimClip } from '@data/AssetManifest'
import { arrowFlightMs, rocketFlightMs } from '@data/ProjectileConstants'
import { CARD_DEFINITIONS } from '@data/CardData'
import { loadPlayerDeck } from '@data/PlayerDeck'
import { createMatchupBanner, matchupLabel } from '@ui/matchupBanner'
import { GAME_HEIGHT, CELL_SIZE, GRID_ROWS } from '@data/GameConstants'
import { DevMode } from '@debug/DevMode'
import { DevModeOverlay } from '@debug/DevModeOverlay'
import { isRangedAttacker, isMeleeAttacker } from '@core/CombatHelpers'
import type { GameState } from '@core/GameState'
import type { Entity } from '@core/entities/Entity'
import type { Vec2 } from '@core/types'
import type { PvPNetwork } from '@core/PvPNetwork'
import { SoundManager } from '@audio/SoundManager'

export class BattleScene extends Phaser.Scene {
  private grid!: Grid
  private simulator!: GameSimulator
  private playerCardSystem!: CardSystem
  private botCardSystem: CardSystem | null = null
  private botAI: BotAI | null = null
  private pvpNetwork: PvPNetwork | null = null
  private sprites: Map<string, EntitySprite> = new Map()
  private towerSprites: Map<string, TowerSprite> = new Map()
  private effects!: EffectsPool
  private deaths!: DeathPool
  private dust!: DustPool
  private arrows!: ArrowPool
  private hexFireballs!: HexFireballPool
  private hexTransforms!: HexTransformPool
  private hexShamanOrbs!: HexShamanOrbPool
  private lightningShaman!: LightningShamanPool
  private healEffects!: HealEffectPool
  private boneBoomerangs!: BoneBoomerangPool
  private harpoonRopes!: HarpoonRopePool
  private arrowsSpell!: ArrowsSpellPool
  private tntProjectiles!: TntPool
  private barrelProjectiles!: BarrelPool
  private deployCtrl!: CardDeployController
  private deployOverlay!: DeployZoneOverlay
  private placementGhost!: PlacementGhost
  private devOverlay!: DevModeOverlay
  private entityCardIds = new Map<string, string>()
  private sounds!: SoundManager
  /** Sim time is frozen until the match intro ("X vs Y" → "Battle Start!") finishes. */
  private battleStarted = false

  constructor() {
    super({ key: 'BattleScene' })
  }

  init(data: { pvpNetwork?: PvPNetwork }): void {
    this.pvpNetwork = data?.pvpNetwork ?? null
  }

  create(): void {
    ensurePlaceholders(this)

    // Match-start reveal — the arena begins under cloud cover that blows apart
    // (solo and PvP both enter through this create).
    playCloudCoverReveal(this, this.scale.width, this.scale.height)
    this.runMatchIntro()

    this.grid      = new Grid()
    this.simulator = new GameSimulator(this.grid)
    this.playerCardSystem = new CardSystem(loadPlayerDeck())
    if (!this.pvpNetwork) {
      // Solo only — in PvP the opponent's cards arrive via network, not a local deck
      this.botCardSystem = new CardSystem()
      this.botAI         = new BotAI()
    }

    if (this.pvpNetwork) {
      this.pvpNetwork.onDeploy = (cardId, gridPos, pos) => {
        const card = CARD_DEFINITIONS[cardId]
        if (card) {
          // Mirror the opponent's Y coordinate so their bottom-half deploy
          // lands in our top half (bot zone). GRID_ROWS - 1 - y is the reflection.
          const mirroredCell = { x: gridPos.x, y: GRID_ROWS - 1 - gridPos.y }
          // Mirror the precise world position the same way (GAME_HEIGHT - y) so both clients
          // spawn the unit at the identical spot and the sim stays deterministic.
          const mirroredPrecise = pos ? { x: pos.x, y: GAME_HEIGHT - pos.y } : undefined
          this.simulator.deployCard(Owner.BOT, card, mirroredCell, mirroredPrecise)
        }
      }
      this.pvpNetwork.onDisconnected = () => {
        this.simulator.state.phase = 'ENDED'
        this.simulator.state.winner = Owner.PLAYER
      }
    }

    this.sprites  = new Map()
    this.effects  = new EffectsPool(this)
    this.deaths   = new DeathPool(this)
    this.dust     = new DustPool(this)
    this.arrows   = new ArrowPool(this)
    this.hexFireballs = new HexFireballPool(this, this.effects)
    this.hexTransforms = new HexTransformPool(this)
    this.hexShamanOrbs = new HexShamanOrbPool(this)
    this.lightningShaman = new LightningShamanPool(this)
    this.healEffects = new HealEffectPool(this)
    this.boneBoomerangs = new BoneBoomerangPool(this)
    this.harpoonRopes = new HarpoonRopePool(this)
    this.arrowsSpell = new ArrowsSpellPool(this)
    this.tntProjectiles = new TntPool(this)
    this.barrelProjectiles = new BarrelPool(this)
    this.sounds = new SoundManager(this)

    // Tile map
    new TileMapRenderer(this).draw()
    new ForestBorder(this).draw()
    new DecorationLayer(this).draw()

    // Place tower sprites
    for (const tower of this.simulator.state.towers.values()) {
      this.addTowerSprite(tower)
    }

    // Camera — fixed, shows the full 24×43 map at once (no scrolling, matching Java layout)
    this.cameras.main.setScroll(0, 0)

    this.deployOverlay  = new DeployZoneOverlay(this)
    this.placementGhost = new PlacementGhost(this)
    this.devOverlay     = new DevModeOverlay(this)
    this.devOverlay.setVisible(DevMode.enabled)

    this.deployCtrl = new CardDeployController(
      this,
      this.playerCardSystem,
      this.simulator,
      this.grid,
      this.deployOverlay,
      this.placementGhost,
    )

    if (this.pvpNetwork) {
      this.deployCtrl.onDeploy = (cardId, gridPos, worldPos) => {
        this.pvpNetwork!.sendDeploy(cardId, gridPos, worldPos)
      }
    }

    // Drag-to-aim on the arena — deploy on pointer up so touch users can aim precisely.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isUIArea(p.y)) return
      this.deployCtrl.handleMapPointerDown(p.x, p.y)
    })

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.isUIArea(p.y)) {
        if (p.isDown) this.deployCtrl.cancelAimPointer()
        this.placementGhost.hide()
        return
      }
      this.deployCtrl.handlePointerMove(p.x, p.y)
    })

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.isUIArea(p.y)) {
        this.deployCtrl.cancelAimPointer()
        return
      }
      this.deployCtrl.handleMapPointerUp(p.x, p.y)
    })

    // Launch UI scene in parallel
    this.scene.launch('UIScene')
    const uiScene = this.scene.get('UIScene') as UIScene
    uiScene.onCardSelected = (i) => {
      this.deployCtrl.selectCard(i, this.simulator.state.playerElixir)
    }
    uiScene.onDevModeToggle = () => {
      this.devOverlay.setVisible(DevMode.enabled)
    }
    if (this.pvpNetwork) {
      const net = this.pvpNetwork
      // UIScene.create() runs on the next frame after launch() — defer setPvP until then
      uiScene.events.once('create', () => {
        uiScene.setPvP(true, net.localName, net.opponentName)
      })
      net.onOpponentName = (name) => uiScene.setOpponentName(name)
    }
  }

  /**
   * Match intro: once the clouds disperse, "X vs Y" pops in over the arena,
   * flips to "Battle Start!", and sim time unfreezes on the flip.
   */
  private runMatchIntro(): void {
    const banner = createMatchupBanner(
      this, this.scale.width / 2, GAME_HEIGHT / 2, matchupLabel(this.pvpNetwork),
    )
    banner.setAlpha(0).setScale(0.8)

    // playCloudCoverReveal's whiteout backdrop is gone by ~2300ms and the arena reads as
    // revealed — bring the matchup in right then, while the last clouds drift off-screen.
    this.time.delayedCall(2400, () => {
      this.tweens.add({
        targets: banner,
        alpha: 1,
        scale: 1,
        duration: 250,
        ease: 'Back.easeOut',
      })
    })

    // Hold the matchup until a second after the last clouds clear (~3400ms), then
    // flash the battle start and unfreeze the sim.
    this.time.delayedCall(3400 + 1000, () => {
      banner.setText('Battle Start!')
      banner.setScale(0.3)
      this.sounds.playWarHorn()
      this.tweens.add({
        targets: banner,
        scale: 1,
        duration: 300,
        ease: 'Back.easeOut',
      })
      this.battleStarted = true
      this.tweens.add({
        targets: banner,
        alpha: 0,
        delay: 700,
        duration: 300,
        onComplete: () => banner.destroy(),
      })
    })
  }

  update(_time: number, delta: number): void {
    if (this.simulator.state.phase === 'ENDED') {
      this.endGame()
      return
    }

    // Tick the simulation (dt 0 during the intro — arena renders but time is frozen)
    const state = this.simulator.tick(this.battleStarted ? delta : 0)

    // Bot AI (solo only — in PvP opponent actions come via network)
    if (this.battleStarted && this.botAI && this.botCardSystem) {
      const botAction = this.botAI.tick(delta, state, this.botCardSystem)
      if (botAction) {
        const card = this.botCardSystem.hand[botAction.handIndex]
        if (card && this.simulator.deployCard(Owner.BOT, card, botAction.position)) {
          this.botCardSystem.consumeCard(botAction.handIndex)
        }
      }
    }

    // Consume simulation events
    for (const event of state.events) {
      switch (event.type) {
        case 'DEPLOY': {
          const card = CARD_DEFINITIONS[event.cardId]
          const entity = state.entities.get(event.entityId)
          if (
            entity &&
            entity.kind !== EntityKind.SPELL &&
            card?.cardType !== CardType.SPELL
          ) {
            this.entityCardIds.set(event.entityId, event.cardId)
            const sprite = new EntitySprite(
              this,
              entity.position.x,
              entity.position.y,
              event.cardId,
              entity.owner,
            )
            this.sprites.set(entity.id, sprite)
            this.dust.spawn(entity.position.x, entity.position.y, logicDisplayHeightForCard(event.cardId))
          }
          break
        }
        case 'SPELL_CAST': {
          if (event.cardId === 'arrows') {
            const def = CARD_DEFINITIONS.arrows!
            const radiusPx = def.spellStats!.radius * CELL_SIZE
            this.arrowsSpell.spawn(
              event.to,
              event.owner,
              radiusPx,
              event.flightMs,
              () => this.sounds.playArrowHit(),
            )
          } else if (event.cardId === 'goblin_barrel') {
            const kingSprite = this.getKingTowerSprite(event.owner)
            const from = kingSprite?.fireCannonAt(event.to)
              ?? kingSprite?.getCannonMuzzle()
              ?? (event.owner === Owner.PLAYER
                ? this.getPlayerKingLaunchPos()
                : this.getBotKingLaunchPos())
            this.barrelProjectiles.spawn(
              from,
              event.to,
              event.owner,
              event.flightMs,
              () => this.effects.spawn(event.to.x, event.to.y),
            )
          } else {
            const kingSprite = this.getKingTowerSprite(event.owner)
            const from = kingSprite?.fireCannonAt(event.to)
              ?? kingSprite?.getCannonMuzzle()
              ?? (event.owner === Owner.PLAYER
                ? this.getPlayerKingLaunchPos()
                : this.getBotKingLaunchPos())
            this.tntProjectiles.spawn(from, event.to, event.owner, event.flightMs)
          }
          break
        }
        case 'SPELL_IMPACT': {
          if (event.cardId !== 'goblin_barrel') {
            this.effects.spawn(event.position.x, event.position.y, event.radius)
          }
          break
        }
        case 'DAMAGE': {
          const flash = () => this.flashTarget(event.targetId)
          const attacker = event.attackerId ? this.findEntity(state, event.attackerId) : null
          let from = event.chainFrom ?? (event.attackerId ? this.entityPosition(state, event.attackerId) : null)
          const to = this.visualTargetPoint(state, event.targetId)
          const attackerCardId = event.attackerId
            ? (this.entityCardIds.get(event.attackerId) ?? attacker?.cardId ?? '')
            : ''

          if (attacker?.kind === EntityKind.TOWER && to) {
            const towerSprite = this.towerSprites.get(attacker.id)
            const tower = attacker as Tower
            if (tower.isKing) {
              towerSprite?.fireCannonAt(to)
              from = towerSprite?.getCannonMuzzle() ?? from
            } else {
              towerSprite?.onAttackImpact(to)
              from = towerSprite?.getArrowOrigin() ?? from
            }
          } else if (event.attackerId) {
            const aimPoint = to ? { x: to.x, y: to.y } : undefined
            this.sprites.get(event.attackerId)?.onAttackImpact(aimPoint)
          }

          if (attackerCardId === 'wood_tower' && to && !event.splash) {
            const splashR = (attacker?.stats as EntityStats | undefined)?.splashRadius ?? 1.5
            const attackerId = event.attackerId
            const owner = attacker!.owner
            const sprite = attackerId ? this.sprites.get(attackerId) : null
            const lobDelayMs = sprite?.getBombTowerLobDelayMs() ?? getAttackWindupMs('bomb_fish', owner)
            const target = { x: to.x, y: to.y }
            const targetId = event.targetId

            this.time.delayedCall(lobDelayMs, () => {
              const launchFrom = (attackerId ? this.sprites.get(attackerId)?.getBombLaunchPoint() : null)
                ?? (attackerId ? this.sprites.get(attackerId)?.getBombCrewOrigin() : null)
              if (!launchFrom) {
                flash()
                return
              }
              const flightMs = rocketFlightMs(Math.hypot(target.x - launchFrom.x, target.y - launchFrom.y))
              this.tntProjectiles.spawn(launchFrom, target, owner, flightMs, () => {
                this.sounds.playCannonHit()
                this.effects.spawn(target.x, target.y, splashR * CELL_SIZE)
                this.flashTarget(targetId)
              })
            })
          } else if (
            attacker?.kind === EntityKind.TOWER
            && (attacker as Tower).isKing
            && from
            && to
            && !event.splash
          ) {
            const flightMs = arrowFlightMs(
              Math.hypot(to.x - from.x, to.y - from.y),
              this.getAttackRate(attacker),
            )
            this.tntProjectiles.spawn(from, to, attacker.owner, flightMs, () => {
              this.sounds.playCannonHit()
              flash()
              this.effects.spawn(to.x, to.y)
            }, 'flat', {
              projectileKey: GARRISON_CANNON_BALL.key,
              spinAnimKey: '',
            })
          } else if (attacker && from && to && isRangedAttacker(attacker) && !event.splash && attackerCardId !== 'gnoll') {
            const attackRate = this.getAttackRate(attacker)
            const cardId = this.entityCardIds.get(attacker.id) ?? attacker.cardId ?? ''
            if (cardId === 'goblin_demolisher') {
              const splashR = (attacker.stats as EntityStats).splashRadius ?? 1.5
              const launchFrom = event.attackerId
                ? this.sprites.get(event.attackerId)?.getProjectileOrigin() ?? from
                : from
              const flightMs = arrowFlightMs(
                Math.hypot(to.x - launchFrom.x, to.y - launchFrom.y),
                attackRate,
              )
              this.tntProjectiles.spawn(launchFrom, to, attacker.owner, flightMs, () => {
                this.sounds.playCannonHit()
                this.effects.spawn(to.x, to.y, splashR * CELL_SIZE)
                flash()
              }, 'straight', {
                projectileKey: GOBLIN_DYNAMITE_SHEET.key,
                spinAnimKey: GOBLIN_DYNAMITE_SHEET.animKey,
                displaySize: 64,
              })
            } else if (cardId === 'elder_shaman') {
              this.hexTransforms.spawn(from, to, attacker.owner, attackRate, flash)
            } else if (cardId === 'lightning_shaman') {
              this.lightningShaman.spawn(from, to, attacker.owner, attackRate, flash)
            } else if (cardId === 'wizard' || cardId === 'voodoo_shaman') {
              this.hexShamanOrbs.spawn(from, to, cardId, attacker.owner, attackRate, flash)
            } else if (cardId === 'lizard' || cardId === 'torch_goblin' || cardId === 'bomb_fish' || cardId === 'spider') {
              this.hexFireballs.spawn(
                from,
                to,
                attacker.owner,
                attackRate,
                flash,
                cardId === 'spider'       ? { projectileTint: 0x55ee44, explosionTint: 0x44dd33 } :
                cardId === 'torch_goblin' ? { projectileTint: 0xffcc22, explosionTint: 0xff8800 } :
                undefined,
              )
            } else if (
              attacker
              && from
              && to
              && !event.splash
              && usesArrowProjectile(
                cardId,
                attacker.kind,
                attacker.kind === EntityKind.TOWER ? (attacker as Tower).isKing : false,
              )
            ) {
              this.spawnArrowHit(from, to, attacker.owner, attackRate, flash)
            } else {
              flash()
            }
          } else {
            flash()
            if (!event.splash && attacker && isMeleeAttacker(attacker)) {
              const cardId = this.entityCardIds.get(attacker.id) ?? attacker.cardId ?? ''
              if (usesCannonHit(cardId)) {
                this.sounds.playCannonHit()
              } else {
                this.sounds.playMeleeStrike(cardId)
              }
            }
          }
          break
        }
        case 'HEAL': {
          const target = this.entityPosition(state, event.targetId)
          const healer = event.healerId ? this.findEntity(state, event.healerId) : null
          const owner = healer?.owner ?? Owner.PLAYER
          if (target) this.healEffects.spawnOnUnit(target.x, target.y, owner)
          break
        }
        case 'BOOMERANG': {
          const aim = {
            x: event.from.x + event.dir.x * event.travelLimitPx,
            y: event.from.y + event.dir.y * event.travelLimitPx,
          }
          this.sprites.get(event.throwerId)?.onAttackImpact(aim)
          break
        }
        case 'HOOK': {
          const aim = this.visualTargetPoint(state, event.targetId)
          this.sprites.get(event.throwerId)?.onAttackImpact(aim ?? undefined)
          break
        }
        case 'HEAL_AURA': {
          this.healEffects.spawn(event.position.x, event.position.y, event.owner, event.radius)
          break
        }
        case 'DEATH': {
          if (event.deathSplashRadius) {
            this.effects.spawn(
              event.position.x,
              event.position.y,
              event.deathSplashRadius * CELL_SIZE * 1.5,
            )
          }
          const sprite = this.sprites.get(event.entityId)
          if (sprite) {
            this.deaths.spawn(event.position.x, event.position.y, sprite.getFlipX())
            sprite.destroy()
            this.sprites.delete(event.entityId)
            this.entityCardIds.delete(event.entityId)
          }
          break
        }
        case 'CROWN_LOST': {
          this.updateTowerSprite(event.towerId, event.owner)
          this.effects.spawn(
            ...this.getTowerPos(event.towerId)
          )
          this.deployCtrl.refreshDeployOverlay()
          break
        }
      }
    }
    state.events = []

    this.boneBoomerangs.syncFromState(state.boomerangs ?? [])
    this.harpoonRopes.syncFromState(
      state.hooks ?? [],
      hookId => {
        const hook = state.hooks?.find(h => h.id === hookId)
        return hook ? hookAnchorPosition(state, hook) : null
      },
      hookId => {
        const hook = state.hooks?.find(h => h.id === hookId)
        return hook ? hookRopeEndPosition(state, hook) : null
      },
    )

    // Sync sprite positions each frame
    for (const [id, sprite] of this.sprites) {
      const entity = state.entities.get(id)
      if (entity) {
        let anim: AnimClip = 'idle'
        let moveSpeed = 1.5
        let attackSync: AttackSync | undefined
        let dashSync: DashSync | undefined
        let healSync: HealSync | undefined

        const cardId = this.entityCardIds.get(id) ?? entity.cardId ?? ''

        if (entity.kind === EntityKind.TROOP) {
          const troop = entity as Troop
          moveSpeed = troop.isBoomerangAnchored(state) ? 0 : troop.getEffectiveSpeed()
          const aimPoint = this.aimPointForTroop(troop) ?? undefined
          const hookPhase = troop.getHookPhase()
          const dashPhase = troop.getDashPhase()
          if (hookPhase) {
            dashSync = { phase: 'windup', aimPoint }
          } else if (dashPhase) {
            dashSync = {
              phase: dashPhase,
              aimPoint,
              leapPose: dashPhase === 'leap' ? getRunLeapPose(cardId, entity.owner) ?? undefined : undefined,
            }
          } else if (troop.state === TroopState.SPAWNING) {
            anim = 'idle'
          } else if (troop.isHealBurstActive() && cardId === 'monk' && troop.state === TroopState.WALKING) {
            healSync = { aimPoint: this.aimPointForTroop(troop) ?? undefined }
          } else if (troop.state === TroopState.WALKING) {
            anim = 'run'
          } else if (troop.state === TroopState.ATTACKING) {
            // Pig uses its run sheet as the attack clip — keep showing run between swings
            // so it looks active rather than standing idle while hammering the tower.
            if (cardId === 'pig') anim = 'run'
            attackSync = {
              cooldownMs: troop.getAttackCooldownMs(),
              // Boomerang throw clip is driven by BOOMERANG event only — not cooldown windup.
              windupMs: cardId === 'gnoll' ? 0 : getAttackWindupMs(cardId, entity.owner),
              aimPoint,
            }
          }
        } else if (entity.kind === EntityKind.BUILDING) {
          const building = entity as Building
          if (building.state === BuildingState.ATTACKING) {
            const aimPoint = this.aimPointForBuilding(building) ?? undefined
            attackSync = {
              cooldownMs: building.getAttackCooldownMs(),
              windupMs: cardId === 'wood_tower'
                ? getAttackWindupMs('bomb_fish', entity.owner)
                : getAttackWindupMs(cardId, entity.owner),
              aimPoint,
            }
          }
        }

        sprite.update(
          entity.position.x,
          entity.position.y,
          entity.kind === EntityKind.TROOP
            ? (entity as Troop).getHpFraction()
            : entity.hp / entity.maxHp,
          anim,
          moveSpeed,
          this.shouldShowHealthBar(entity),
          attackSync,
          dashSync,
          healSync,
        )
      }
    }

    // Sync tower health bars — garrison combat anims fire on DAMAGE impact, not during wind-up.
    for (const [id, towerSprite] of this.towerSprites) {
      const tower = state.towers.get(id)
      if (tower) {
        towerSprite.update(
          tower.position.x,
          tower.position.y,
          tower.hp / tower.maxHp,
          tower.hasBeenDamaged,
        )
      }
    }

    // Update UI
    const uiScene = this.scene.get('UIScene') as UIScene
    const snapshot: UISnapshot = {
      playerElixir: state.playerElixir,
      botElixir:    state.botElixir,
      playerCrowns: state.playerCrowns,
      botCrowns:    state.botCrowns,
      elapsedMs:    state.elapsedMs,
      phase:        state.phase,
      hand:         this.playerCardSystem.snapshot,
    }
    uiScene.updateState(snapshot)

    if (DevMode.enabled) {
      this.devOverlay.update(state, this.grid, this.entityCardIds)
    }
  }

  private getAttackRate(entity: Entity): number {
    if (entity.kind === EntityKind.TOWER) return (entity as Tower).stats.attackRate
    return (entity as Troop | Building).stats.attackRate
  }

  private spawnArrowHit(
    from: Vec2,
    to: Vec2,
    owner: Owner,
    attackRate: number,
    onImpact?: () => void,
  ): void {
    this.arrows.spawn(from, to, owner, attackRate, () => {
      this.sounds.playArrowHit()
      onImpact?.()
    })
  }

  /** Troops/towers: after combat hit. Buildings: any HP loss (decay or combat). */
  private shouldShowHealthBar(entity: Entity): boolean {
    if (entity.kind === EntityKind.BUILDING) {
      return entity.hp < entity.maxHp
    }
    return entity.hasBeenDamaged
  }

  private findEntity(state: GameState, id: string): Entity | null {
    return state.entities.get(id) ?? state.towers.get(id) ?? null
  }

  private entityPosition(state: GameState, id: string): Vec2 | null {
    const entity = this.findEntity(state, id)
    return entity ? entity.position : null
  }

  /** Strike / projectile endpoint — hull centre for air boat, sim position otherwise. */
  private visualTargetPoint(state: GameState, targetId: string): Vec2 | null {
    const entity = this.findEntity(state, targetId)
    if (!entity) return null
    if (entity.cardId === 'air_boat') {
      return this.sprites.get(targetId)?.getAimPoint() ?? entity.position
    }
    return entity.position
  }

  private aimPointForTroop(troop: Troop): Vec2 | null {
    const simAim = troop.getAttackAimPoint()
    if (!simAim) return null
    const target = troop.getAimTarget()
    if (target?.cardId === 'air_boat') {
      return this.sprites.get(target.id)?.getAimPoint() ?? simAim
    }
    return simAim
  }

  private aimPointForBuilding(building: Building): Vec2 | null {
    const simAim = building.getAttackAimPoint()
    if (!simAim) return null
    const target = building.getAimTarget()
    if (target?.cardId === 'air_boat') {
      return this.sprites.get(target.id)?.getAimPoint() ?? simAim
    }
    return simAim
  }

  private flashTarget(targetId: string): void {
    const sprite = this.sprites.get(targetId)
    if (sprite) {
      sprite.flashDamage()
      return
    }

    const tower = this.simulator.state.towers.get(targetId)
    if (tower?.isAlive) {
      this.towerSprites.get(targetId)?.flashDamage()
    }
  }

  private addTowerSprite(tower: Tower): void {
    this.towerSprites.set(tower.id, new TowerSprite(this, tower))
  }

  private updateTowerSprite(towerId: string, owner: Owner): void {
    const towerSprite = this.towerSprites.get(towerId)
    if (!towerSprite) return
    towerSprite.setDestroyed(owner)
  }

  private getTowerPos(towerId: string): [number, number] {
    const towerSprite = this.towerSprites.get(towerId)
    return towerSprite ? [towerSprite.image.x, towerSprite.image.y] : [240, 427]
  }

  private getKingTowerSprite(owner: Owner): TowerSprite | null {
    for (const [id, sprite] of this.towerSprites) {
      const tower = this.simulator.state.towers.get(id)
      if (tower?.owner === owner && tower.isKing && tower.isAlive) {
        return sprite
      }
    }
    return null
  }

  private getPlayerKingLaunchPos(): Vec2 {
    for (const [id, sprite] of this.towerSprites) {
      const tower = this.simulator.state.towers.get(id)
      if (tower?.owner === Owner.PLAYER && tower.isKing) {
        return { x: sprite.image.x, y: sprite.image.y }
      }
    }
    return { x: 240, y: 427 }
  }

  private getBotKingLaunchPos(): Vec2 {
    for (const [id, sprite] of this.towerSprites) {
      const tower = this.simulator.state.towers.get(id)
      if (tower?.owner === Owner.BOT && tower.isKing) {
        return { x: sprite.image.x, y: sprite.image.y }
      }
    }
    return { x: 240, y: 193 }
  }

  private isUIArea(screenY: number): boolean {
    return screenY >= GAME_HEIGHT
  }

  private endGame(): void {
    this.deployCtrl.deselect()
    this.scene.stop('UIScene')
    const winner = this.simulator.state.winner
    const pvpNetwork = this.pvpNetwork
    this.pvpNetwork = null
    // Pass network to ResultScene so rematch can reuse the connection
    this.scene.start('ResultScene', { winner, pvpNetwork })
  }
}
