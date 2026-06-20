import Phaser from 'phaser'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { CardSystem } from '@core/CardSystem'
import { BotAI } from '@core/BotAI'
import { CARD_DEFINITIONS } from '@data/CardData'
import { TileMapRenderer } from '@rendering/TileMapRenderer'
import { EntitySprite } from '@rendering/EntitySprite'
import { EffectsPool } from '@rendering/EffectsPool'
import { ensurePlaceholders } from '@rendering/PlaceholderFactory'
import { cardTextureKey, towerTextureKey } from '@rendering/AssetRegistry'
import { CardDeployController } from '@input/CardDeployController'
import type { UIScene, UISnapshot } from './UIScene'
import type { Tower } from '@core/entities/Tower'
import { Owner } from '@core/types'
import { GRID_ROWS, CELL_SIZE } from '@data/GameConstants'

export class BattleScene extends Phaser.Scene {
  private grid!: Grid
  private simulator!: GameSimulator
  private playerCardSystem!: CardSystem
  private botCardSystem!: CardSystem
  private botAI!: BotAI
  private sprites: Map<string, EntitySprite> = new Map()
  private towerSprites: Map<string, Phaser.GameObjects.Image> = new Map()
  private effects!: EffectsPool
  private deployCtrl!: CardDeployController

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

    // Tile map
    new TileMapRenderer(this).draw()

    // Place tower sprites
    for (const tower of this.simulator.state.towers.values()) {
      this.addTowerSprite(tower)
    }

    // Camera — scrollable, starts at player's base (bottom)
    const worldHeight = GRID_ROWS * CELL_SIZE
    this.cameras.main.setBounds(0, 0, 480, worldHeight)
    this.cameras.main.scrollY = worldHeight - 854  // show player's base initially

    // Drag to scroll
    let lastPointerY = 0
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { lastPointerY = p.y })
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown && !this.isUIArea(p.y)) {
        const dy = lastPointerY - p.y
        this.cameras.main.scrollY += dy
        lastPointerY = p.y
      }
    })

    // Tap to deploy
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isUIArea(p.y)) return
      this.deployCtrl?.handleMapTap(p.x, p.y)
    })

    // Launch UI scene in parallel
    this.scene.launch('UIScene')
    const uiScene = this.scene.get('UIScene') as UIScene
    uiScene.onCardSelected = (i) => {
      this.deployCtrl.selectCard(i)
    }

    this.deployCtrl = new CardDeployController(
      this,
      this.playerCardSystem,
      this.simulator,
      this.cameras.main,
    )
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
          if (entity) {
            const key = cardTextureKey(event.cardId, entity.owner)
            const sprite = new EntitySprite(this, entity.position.x, entity.position.y, key, entity.owner)
            this.sprites.set(entity.id, sprite)
          }
          break
        }
        case 'DAMAGE': {
          const sprite = this.sprites.get(event.targetId)
          sprite?.flashDamage()
          break
        }
        case 'DEATH': {
          const sprite = this.sprites.get(event.entityId)
          if (sprite) {
            this.effects.spawn(event.position.x, event.position.y)
            sprite.destroy()
            this.sprites.delete(event.entityId)
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

    // Sync sprite positions each frame
    for (const [id, sprite] of this.sprites) {
      const entity = state.entities.get(id)
      if (entity) {
        sprite.update(entity.position.x, entity.position.y, entity.hp / entity.maxHp)
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
  }

  private addTowerSprite(tower: Tower): void {
    const key = towerTextureKey(tower.isKing, tower.owner)
    const img = this.add.image(tower.position.x, tower.position.y, key)
      .setDepth(4)
      .setDisplaySize(tower.isKing ? CELL_SIZE * 4 : CELL_SIZE * 3, tower.isKing ? CELL_SIZE * 4 : CELL_SIZE * 3)
    this.towerSprites.set(tower.id, img)
  }

  private updateTowerSprite(towerId: string, owner: Owner): void {
    const img = this.towerSprites.get(towerId)
    if (!img) return
    // Find the tower def to know isKing — search destroyed towers in original placement
    const key = towerTextureKey(false, owner, true) // assume princess for now; king ends game
    img.setTexture(key)
    img.setTint(0x666666)
  }

  private getTowerPos(towerId: string): [number, number] {
    const img = this.towerSprites.get(towerId)
    return img ? [img.x, img.y] : [240, 427]
  }

  private isUIArea(screenY: number): boolean {
    return screenY > this.scale.height - 120
  }

  private endGame(): void {
    this.scene.stop('UIScene')
    const winner = this.simulator.state.winner
    this.scene.start('ResultScene', { winner })
  }
}
