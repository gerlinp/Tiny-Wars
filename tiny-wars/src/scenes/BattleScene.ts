import Phaser from 'phaser'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { CardSystem } from '@core/CardSystem'
import { BotAI } from '@core/BotAI'
import { TileMapRenderer } from '@rendering/TileMapRenderer'
import { ForestBorder } from '@rendering/ForestBorder'
import { DecorationLayer } from '@rendering/DecorationLayer'
import { EntitySprite, type AttackSync, type DashSync } from '@rendering/EntitySprite'
import { TowerSprite } from '@rendering/TowerSprite'
import { EffectsPool, HealEffectPool, DeathPool } from '@rendering/VFXPools'
import { ArrowPool, ArrowsSpellPool, TntPool, BoneBoomerangPool, HexFireballPool } from '@rendering/ProjectilePools'
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
import { getAttackWindupMs, getRunLeapPose, type AnimClip } from '@data/AssetManifest'
import { rocketFlightMs, arrowFlightMs } from '@data/ProjectileConstants'
import { CARD_DEFINITIONS } from '@data/CardData'
import { loadPlayerDeck } from '@data/PlayerDeck'
import { GAME_HEIGHT, CELL_SIZE, GRID_ROWS } from '@data/GameConstants'
import { DevMode } from '@debug/DevMode'
import { DevModeOverlay } from '@debug/DevModeOverlay'
import { isRangedAttacker } from '@core/CombatHelpers'
import type { GameState } from '@core/GameState'
import type { Entity } from '@core/entities/Entity'
import type { Vec2 } from '@core/types'
import type { PvPNetwork } from '@core/PvPNetwork'

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
  private arrows!: ArrowPool
  private hexFireballs!: HexFireballPool
  private healEffects!: HealEffectPool
  private boneBoomerangs!: BoneBoomerangPool
  private arrowsSpell!: ArrowsSpellPool
  private tntProjectiles!: TntPool
  private deployCtrl!: CardDeployController
  private deployOverlay!: DeployZoneOverlay
  private placementGhost!: PlacementGhost
  private devOverlay!: DevModeOverlay
  private entityCardIds = new Map<string, string>()

  constructor() {
    super({ key: 'BattleScene' })
  }

  init(data: { pvpNetwork?: PvPNetwork }): void {
    this.pvpNetwork = data?.pvpNetwork ?? null
  }

  create(): void {
    ensurePlaceholders(this)

    this.grid      = new Grid()
    this.simulator = new GameSimulator(this.grid)
    this.playerCardSystem = new CardSystem(loadPlayerDeck())
    if (!this.pvpNetwork) {
      // Solo only — in PvP the opponent's cards arrive via network, not a local deck
      this.botCardSystem = new CardSystem()
      this.botAI         = new BotAI()
    }

    if (this.pvpNetwork) {
      this.pvpNetwork.onDeploy = (cardId, gridPos) => {
        const card = CARD_DEFINITIONS[cardId]
        if (card) {
          // Mirror the opponent's Y coordinate so their bottom-half deploy
          // lands in our top half (bot zone). GRID_ROWS - 1 - y is the reflection.
          const mirroredPos = { x: gridPos.x, y: GRID_ROWS - 1 - gridPos.y }
          this.simulator.deployCard(Owner.BOT, card, mirroredPos)
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
    this.arrows   = new ArrowPool(this)
    this.hexFireballs = new HexFireballPool(this)
    this.healEffects = new HealEffectPool(this)
    this.boneBoomerangs = new BoneBoomerangPool(this)
    this.arrowsSpell = new ArrowsSpellPool(this)
    this.tntProjectiles = new TntPool(this)

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
      this.deployCtrl.onDeploy = (cardId, gridPos) => {
        this.pvpNetwork!.sendDeploy(cardId, gridPos)
      }
    }

    // Tap to deploy — ignore taps in the HUD area at the bottom
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isUIArea(p.y)) return
      this.deployCtrl.handleMapTap(p.x, p.y)
    })

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.isUIArea(p.y)) {
        this.placementGhost.hide()
        return
      }
      this.deployCtrl.handlePointerMove(p.x, p.y)
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

  update(_time: number, delta: number): void {
    if (this.simulator.state.phase === 'ENDED') {
      this.endGame()
      return
    }

    // Tick the simulation
    const state = this.simulator.tick(delta)

    // Bot AI (solo only — in PvP opponent actions come via network)
    if (this.botAI && this.botCardSystem) {
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
          }
          break
        }
        case 'SPELL_CAST': {
          if (event.cardId === 'arrows') {
            const def = CARD_DEFINITIONS.arrows!
            const radiusPx = def.spellStats!.radius * CELL_SIZE
            this.arrowsSpell.spawn(event.to, event.owner, radiusPx, event.flightMs)
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
          this.effects.spawn(event.position.x, event.position.y)
          break
        }
        case 'DAMAGE': {
          const flash = () => this.flashTarget(event.targetId)
          const attacker = event.attackerId ? this.findEntity(state, event.attackerId) : null
          let from = event.attackerId ? this.entityPosition(state, event.attackerId) : null
          const to = this.entityPosition(state, event.targetId)
          const attackerCardId = event.attackerId
            ? (this.entityCardIds.get(event.attackerId) ?? attacker?.cardId ?? '')
            : ''

          if (attacker?.kind === EntityKind.TOWER && to) {
            const towerSprite = this.towerSprites.get(attacker.id)
            towerSprite?.onAttackImpact(to)
            from = towerSprite?.getCannonMuzzle()
              ?? towerSprite?.getArrowOrigin()
              ?? from
          } else if (event.attackerId) {
            const aimPoint = to ? { x: to.x, y: to.y } : undefined
            this.sprites.get(event.attackerId)?.onAttackImpact(aimPoint)
          }

          if (attackerCardId === 'wood_tower' && to) {
            const splashR = (attacker?.stats as EntityStats | undefined)?.splashRadius ?? 1.5
            const crewOrigin = event.attackerId
              ? this.sprites.get(event.attackerId)?.getBombCrewOrigin()
              : null
            const bombFrom = crewOrigin ?? from
            if (bombFrom) {
              const flightMs = rocketFlightMs(Math.hypot(to.x - bombFrom.x, to.y - bombFrom.y))
              this.tntProjectiles.spawn(bombFrom, to, attacker!.owner, flightMs)
            }
            this.effects.spawn(to.x, to.y, splashR * CELL_SIZE)
            flash()
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
            this.tntProjectiles.spawn(from, to, attacker.owner, flightMs, flash, 'flat')
          } else if (attacker && from && to && isRangedAttacker(attacker) && !event.splash && attackerCardId !== 'gnoll') {
            const attackRate = this.getAttackRate(attacker)
            const cardId = this.entityCardIds.get(attacker.id) ?? attacker.cardId ?? ''
            if (cardId === 'wizard' || cardId === 'lizard' || cardId === 'torch_goblin' || cardId === 'bomb_fish') {
              this.hexFireballs.spawn(from, to, attacker.owner, attackRate, flash)
            } else {
              this.arrows.spawn(from, to, attacker.owner, attackRate, flash)
            }
          } else {
            flash()
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
          break
        }
      }
    }
    state.events = []

    this.boneBoomerangs.syncFromState(state.boomerangs ?? [])

    // Sync sprite positions each frame
    for (const [id, sprite] of this.sprites) {
      const entity = state.entities.get(id)
      if (entity) {
        let anim: AnimClip = 'idle'
        let moveSpeed = 1.5
        let attackSync: AttackSync | undefined
        let dashSync: DashSync | undefined

        const cardId = this.entityCardIds.get(id) ?? entity.cardId ?? ''

        if (entity.kind === EntityKind.TROOP) {
          const troop = entity as Troop
          moveSpeed = troop.getEffectiveSpeed()
          const aimPoint = troop.getAttackAimPoint() ?? undefined
          const dashPhase = troop.getDashPhase()
          if (dashPhase) {
            dashSync = {
              phase: dashPhase,
              aimPoint,
              leapPose: dashPhase === 'leap' ? getRunLeapPose(cardId, entity.owner) ?? undefined : undefined,
            }
          } else if (troop.state === TroopState.WALKING) {
            anim = 'run'
          } else if (troop.state === TroopState.ATTACKING) {
            attackSync = {
              cooldownMs: troop.getAttackCooldownMs(),
              windupMs: getAttackWindupMs(cardId, entity.owner),
              aimPoint,
            }
          }
        } else if (entity.kind === EntityKind.BUILDING) {
          const building = entity as Building
          if (building.state === BuildingState.ATTACKING) {
            const aimPoint = building.getAttackAimPoint() ?? undefined
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
          entity.hp / entity.maxHp,
          anim,
          moveSpeed,
          this.shouldShowHealthBar(entity),
          attackSync,
          dashSync,
        )
      }
    }

    // Sync tower health bars + garrison archer attacks
    for (const [id, towerSprite] of this.towerSprites) {
      const tower = state.towers.get(id)
      if (tower) {
        const attackSync = tower.isActive() && tower.getAimPoint()
          ? {
              cooldownMs: tower.getAttackCooldownMs(),
              windupMs: getAttackWindupMs('archer', tower.owner),
              aimPoint: tower.getAimPoint(),
            }
          : undefined

        towerSprite.update(
          tower.position.x,
          tower.position.y,
          tower.hp / tower.maxHp,
          tower.hasBeenDamaged,
          attackSync,
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
