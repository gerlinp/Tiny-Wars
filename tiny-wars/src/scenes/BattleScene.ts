import Phaser from 'phaser'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { CardSystem } from '@core/CardSystem'
import { BotAI } from '@core/BotAI'
import { CARD_DEFINITIONS } from '@data/CardData'
import { TileMapRenderer } from '@rendering/TileMapRenderer'
import { EntitySprite } from '@rendering/EntitySprite'
import { TowerSprite } from '@rendering/TowerSprite'
import { EffectsPool } from '@rendering/EffectsPool'
import { ArrowPool } from '@rendering/ArrowPool'
import { ensurePlaceholders } from '@rendering/PlaceholderFactory'
import { CardDeployController } from '@input/CardDeployController'
import { DeployZoneOverlay } from '@rendering/DeployZoneOverlay'
import { PlacementGhost } from '@rendering/PlacementGhost'
import type { UIScene, UISnapshot } from './UIScene'
import type { Tower } from '@core/entities/Tower'
import { Troop } from '@core/entities/Troop'
import type { Building } from '@core/entities/Building'
import { Owner, EntityKind, TroopState, BuildingState } from '@core/types'
import type { AnimClip } from '@data/AssetManifest'
import { GAME_HEIGHT } from '@data/GameConstants'
import { DevMode } from '@debug/DevMode'
import { DevModeOverlay } from '@debug/DevModeOverlay'
import { isRangedAttacker } from '@core/CombatHelpers'
import type { GameState } from '@core/GameState'
import type { Entity } from '@core/entities/Entity'
import type { Vec2 } from '@core/types'

export class BattleScene extends Phaser.Scene {
  private grid!: Grid
  private simulator!: GameSimulator
  private playerCardSystem!: CardSystem
  private botCardSystem!: CardSystem
  private botAI!: BotAI
  private sprites: Map<string, EntitySprite> = new Map()
  private towerSprites: Map<string, TowerSprite> = new Map()
  private effects!: EffectsPool
  private arrows!: ArrowPool
  private deployCtrl!: CardDeployController
  private deployOverlay!: DeployZoneOverlay
  private placementGhost!: PlacementGhost
  private devOverlay!: DevModeOverlay
  private entityCardIds = new Map<string, string>()

  constructor() {
    super({ key: 'BattleScene' })
  }

  create(): void {
    ensurePlaceholders(this)

    this.grid      = new Grid()
    this.simulator = new GameSimulator(this.grid)
    this.playerCardSystem = new CardSystem()
    this.botCardSystem    = new CardSystem()
    this.botAI    = new BotAI()
    this.sprites  = new Map()
    this.effects  = new EffectsPool(this)
    this.arrows   = new ArrowPool(this)

    // Tile map
    new TileMapRenderer(this).draw()

    // Place tower sprites
    for (const tower of this.simulator.state.towers.values()) {
      this.addTowerSprite(tower)
    }

    // Camera — fixed, shows the full 24×43 map at once (no scrolling, matching Java layout)
    this.cameras.main.setScroll(0, 0)

    this.deployOverlay  = new DeployZoneOverlay(this)
    this.placementGhost = new PlacementGhost(this)
    this.devOverlay     = new DevModeOverlay(this)

    this.deployCtrl = new CardDeployController(
      this,
      this.playerCardSystem,
      this.simulator,
      this.grid,
      this.deployOverlay,
      this.placementGhost,
    )

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
  }

  update(_time: number, delta: number): void {
    if (this.simulator.state.phase === 'ENDED') {
      this.endGame()
      return
    }

    // Tick the simulation
    const state = this.simulator.tick(delta)

    // Bot AI
    const botAction = this.botAI.tick(delta, state, this.botCardSystem)
    if (botAction) {
      const card = CARD_DEFINITIONS[botAction.cardId]
      if (card) {
        this.simulator.deployCard(Owner.BOT, card, botAction.position)
      }
    }

    // Consume simulation events
    for (const event of state.events) {
      switch (event.type) {
        case 'DEPLOY': {
          const entity = state.entities.get(event.entityId)
          if (entity && entity.kind !== EntityKind.SPELL) {
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
        case 'DAMAGE': {
          const flash = () => this.flashTarget(event.targetId)
          const attacker = event.attackerId ? this.findEntity(state, event.attackerId) : null
          const from = event.attackerId ? this.entityPosition(state, event.attackerId) : null
          const to = this.entityPosition(state, event.targetId)

          if (attacker && from && to && isRangedAttacker(attacker)) {
            const attackRate = this.getAttackRate(attacker)
            this.arrows.spawn(from, to, attacker.owner, attackRate, flash)
          } else {
            flash()
          }
          break
        }
        case 'DEATH': {
          const sprite = this.sprites.get(event.entityId)
          if (sprite) {
            this.effects.spawn(event.position.x, event.position.y)
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
        case 'SPELL_IMPACT': {
          this.effects.spawn(event.position.x, event.position.y)
          break
        }
      }
    }
    state.events = []

    // Sync sprite positions each frame
    for (const [id, sprite] of this.sprites) {
      const entity = state.entities.get(id)
      if (entity) {
        let anim: AnimClip = 'idle'
        let moveSpeed = 1.5
        if (entity.kind === EntityKind.TROOP) {
          const troop = entity as Troop
          moveSpeed = troop.stats.speed
          if (troop.state === TroopState.ATTACKING) anim = 'attack'
          else if (troop.state === TroopState.WALKING) anim = 'run'
        } else if (entity.kind === EntityKind.BUILDING) {
          const building = entity as Building
          if (building.state === BuildingState.ATTACKING) anim = 'attack'
        }
        sprite.update(
          entity.position.x,
          entity.position.y,
          entity.hp / entity.maxHp,
          anim,
          moveSpeed,
          this.shouldShowHealthBar(entity),
        )
      }
    }

    // Sync tower health bars
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

    const towerSprite = this.towerSprites.get(targetId)
    if (towerSprite) {
      towerSprite.flashDamage()
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

  private isUIArea(screenY: number): boolean {
    return screenY >= GAME_HEIGHT
  }

  private endGame(): void {
    this.deployCtrl.deselect()
    this.scene.stop('UIScene')
    const winner = this.simulator.state.winner
    this.scene.start('ResultScene', { winner })
  }
}
