import Phaser from 'phaser'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { EntitySprite, type AttackSync, type DashSync, type HealSync } from '@rendering/EntitySprite'
import { TowerSprite, type TowerAttackSync } from '@rendering/TowerSprite'
import { TileMapRenderer } from '@rendering/TileMapRenderer'
import { ForestBorder } from '@rendering/ForestBorder'
import { DecorationLayer } from '@rendering/DecorationLayer'
import { EffectsPool, DeathPool, DustPool, HealEffectPool } from '@rendering/VFXPools'
import { logicDisplayHeightForCard } from '@rendering/assetDisplaySize'
import { ensurePlaceholders } from '@rendering/renderingUtils'
import { CARD_DEFINITIONS } from '@data/CardData'
import { CELL_SIZE, GAME_HEIGHT, GAME_WIDTH } from '@data/GameConstants'
import { getAttackWindupMs, getRunLeapPose, type AnimClip } from '@data/AssetManifest'
import { Owner, EntityKind, TroopState, BuildingState, CardType } from '@core/types'
import type { CardDefinition, EntityStats, Vec2 } from '@core/types'
import type { Entity } from '@core/entities/Entity'
import { Troop } from '@core/entities/Troop'
import type { Building } from '@core/entities/Building'
import type { GameState } from '@core/GameState'

const STORAGE_KEY = 'tinyWarsTestArenaSetup'
const DEFAULT_CARD_ID = 'warrior'
const DECK_SIZE = 8
const SIDE_PANEL_W = 220
const SIDE_PANEL_TOP = 18
const PLAYER_SPAWN = { x: 7, y: 32 }
const BOT_SPAWN = { x: 7, y: 10 }

interface TestArenaBalancePatch {
  stats?: Partial<EntityStats>
  elixirCost?: number
  deployCount?: number
}

interface TestArenaSetup {
  selectedUnitId?: string
  playerDeck?: string[]
  opponentDeck?: string[]
  balancePatches?: Record<string, TestArenaBalancePatch>
}

export class TestArenaScene extends Phaser.Scene {
  private grid!: Grid
  private simulator!: GameSimulator
  private sprites = new Map<string, EntitySprite>()
  private towerSprites = new Map<string, TowerSprite>()
  private entityCardIds = new Map<string, string>()
  private effects!: EffectsPool
  private deaths!: DeathPool
  private dust!: DustPool
  private healEffects!: HealEffectPool
  private setup: TestArenaSetup = {}
  private selectedCardId = DEFAULT_CARD_ID
  private playerDeck: string[] = []
  private opponentDeck: string[] = []
  private princessTowersEnabled = true
  private kingDefeatResetQueued = false
  private domRoot: HTMLDivElement | null = null
  private domLeftPanel: HTMLDivElement | null = null
  private domRightPanel: HTMLDivElement | null = null
  private domBottomBar: HTMLDivElement | null = null
  private domPrincessBtn: HTMLButtonElement | null = null
  private onWindowResize = () => this.layoutDomControls()

  constructor() {
    super({ key: 'TestArenaScene' })
  }

  create(): void {
    ensurePlaceholders(this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyDomControls())
    this.setup = this.readSetup()
    this.selectedCardId = this.validCardId(this.setup.selectedUnitId)
    this.playerDeck = this.validDeck(this.setup.playerDeck, this.selectedCardId)
    this.opponentDeck = this.validDeck(this.setup.opponentDeck, this.selectedCardId)

    this.createWorld()
    this.registerKeyboardControls()
    this.createDomControls()
    this.renderDeckPanels()
    this.updateStatus()
  }

  update(_time: number, delta: number): void {
    const state = this.simulator.tick(delta)
    this.consumeEvents(state)
    this.syncSprites(state)
    this.syncTowers(state)
    this.updateStatus()
  }

  private createWorld(): void {
    this.grid = new Grid()
    this.simulator = new GameSimulator(this.grid)
    this.simulator.state.playerElixir = 99
    this.simulator.state.botElixir = 99
    if (!this.princessTowersEnabled) this.removePrincessTowers()

    this.sprites = new Map()
    this.towerSprites = new Map()
    this.entityCardIds = new Map()
    this.effects = new EffectsPool(this)
    this.deaths = new DeathPool(this)
    this.dust = new DustPool(this)
    this.healEffects = new HealEffectPool(this)

    new TileMapRenderer(this).draw()
    new ForestBorder(this).draw()
    new DecorationLayer(this).draw()

    for (const tower of this.simulator.state.towers.values()) {
      this.towerSprites.set(tower.id, new TowerSprite(this, tower))
    }
    this.cameras.main
      .setViewport(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .setZoom(1)
      .centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2)
  }

  private registerKeyboardControls(): void {
    this.input.keyboard?.removeAllListeners('keydown-R')
    this.input.keyboard?.removeAllListeners('keydown-T')
    this.input.keyboard?.removeAllListeners('keydown-ESC')
    this.input.keyboard?.on('keydown-R', () => this.resetArena())
    this.input.keyboard?.on('keydown-T', () => this.togglePrincessTowers())
    this.input.keyboard?.on('keydown-ESC', () => this.exitToMainMenu())
  }

  private exitToMainMenu(): void {
    const url = new URL(window.location.href)
    url.searchParams.delete('testArena')
    window.history.replaceState(null, '', url.toString())
    this.scene.start('MainMenuScene')
  }

  private createDomControls(): void {
    this.destroyDomControls()
    const root = document.createElement('div')
    root.style.position = 'fixed'
    root.style.inset = '0'
    root.style.pointerEvents = 'none'
    root.style.zIndex = '50'

    const leftPanel = this.makeDomDeckPanel('Player', true)
    const rightPanel = this.makeDomDeckPanel('Opponent', false)
    const bottomBar = this.makeDomBottomBar()

    root.appendChild(leftPanel)
    root.appendChild(rightPanel)
    root.appendChild(bottomBar)
    document.body.appendChild(root)

    this.domRoot = root
    this.domLeftPanel = leftPanel
    this.domRightPanel = rightPanel
    this.domBottomBar = bottomBar
    window.addEventListener('resize', this.onWindowResize)
    this.layoutDomControls()
  }

  private destroyDomControls(): void {
    window.removeEventListener('resize', this.onWindowResize)
    this.domPrincessBtn = null
    this.domLeftPanel = null
    this.domRightPanel = null
    this.domBottomBar = null
    if (this.domRoot) {
      this.domRoot.remove()
      this.domRoot = null
    }
  }

  private makeDomDeckPanel(title: string, isPlayer: boolean): HTMLDivElement {
    const panel = document.createElement('div')
    panel.style.position = 'fixed'
    panel.style.width = `${SIDE_PANEL_W}px`
    panel.style.padding = '10px'
    panel.style.border = `2px solid ${isPlayer ? '#3e66c8' : '#9a3838'}`
    panel.style.background = isPlayer ? 'rgba(16,34,74,0.92)' : 'rgba(64,24,24,0.92)'
    panel.style.backdropFilter = 'blur(2px)'
    panel.style.pointerEvents = 'auto'

    const header = document.createElement('div')
    header.textContent = title
    header.style.fontFamily = 'monospace'
    header.style.fontSize = '18px'
    header.style.fontWeight = '700'
    header.style.textAlign = 'center'
    header.style.marginBottom = '10px'
    header.style.color = isPlayer ? '#b8d4ff' : '#ffc2ba'
    panel.appendChild(header)
    return panel
  }

  private makeDomBottomBar(): HTMLDivElement {
    const bar = document.createElement('div')
    bar.style.position = 'fixed'
    bar.style.pointerEvents = 'auto'
    bar.style.display = 'flex'
    bar.style.justifyContent = 'center'
    bar.style.gap = '10px'
    bar.style.padding = '10px 12px'
    bar.style.border = '2px solid #304070'
    bar.style.background = 'rgba(8,9,20,0.88)'

    const resetBtn = this.makeDomActionButton('Reset [R]', () => this.resetArena())
    const princessBtn = this.makeDomActionButton('', () => this.togglePrincessTowers())
    bar.appendChild(resetBtn)
    bar.appendChild(princessBtn)

    this.domPrincessBtn = princessBtn
    return bar
  }

  private makeDomActionButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = label
    btn.style.padding = '8px 12px'
    btn.style.minHeight = '34px'
    btn.style.border = '1px solid #2a6a4a'
    btn.style.background = '#1e3a2a'
    btn.style.color = '#b8f0cc'
    btn.style.fontFamily = 'monospace'
    btn.style.fontSize = '15px'
    btn.style.cursor = 'pointer'
    btn.addEventListener('click', onClick)
    return btn
  }

  private renderDeckPanels(): void {
    this.renderDeckPanel(this.domLeftPanel, Owner.PLAYER, this.playerDeck, '#1e3a5f', '#d6e7ff')
    this.renderDeckPanel(this.domRightPanel, Owner.BOT, this.opponentDeck, '#5a2424', '#ffd8d0')
  }

  private renderDeckPanel(
    panel: HTMLDivElement | null,
    owner: Owner,
    deck: string[],
    background: string,
    color: string,
  ): void {
    if (!panel) return
    while (panel.children.length > 1) panel.removeChild(panel.lastChild!)
    for (let i = 0; i < DECK_SIZE; i++) {
      const cardId = deck[i] ?? DEFAULT_CARD_ID
      const card = CARD_DEFINITIONS[cardId]
      const label = `${i + 1}. ${card?.displayName ?? cardId} (${card?.elixirCost ?? '?'})`
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = label
      btn.style.width = '100%'
      btn.style.marginBottom = '6px'
      btn.style.padding = '7px 8px'
      btn.style.border = '1px solid #2a6a4a'
      btn.style.background = background
      btn.style.color = color
      btn.style.fontFamily = 'monospace'
      btn.style.fontSize = '14px'
      btn.style.textAlign = 'left'
      btn.style.cursor = 'pointer'
      btn.addEventListener('click', () => this.spawnCard(owner, cardId))
      panel.appendChild(btn)
    }
  }

  private layoutDomControls(): void {
    if (!this.domRoot || !this.domLeftPanel || !this.domRightPanel) return
    const canvas = this.game.canvas as HTMLCanvasElement | null
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const gap = 12
    const leftX = Math.max(8, Math.floor(rect.left - SIDE_PANEL_W - gap))
    const rightX = Math.min(window.innerWidth - SIDE_PANEL_W - 8, Math.floor(rect.right + gap))

    this.domLeftPanel.style.left = `${leftX}px`
    this.domLeftPanel.style.top = `${Math.floor(rect.top + SIDE_PANEL_TOP)}px`
    this.domRightPanel.style.left = `${rightX}px`
    this.domRightPanel.style.top = `${Math.floor(rect.top + SIDE_PANEL_TOP)}px`

    if (this.domBottomBar) {
      const barW = Math.min(980, Math.max(620, rect.width - 20))
      this.domBottomBar.style.width = `${barW}px`
      this.domBottomBar.style.left = `${Math.floor(rect.left + rect.width / 2 - barW / 2)}px`
      const bottomBarH = this.domBottomBar.getBoundingClientRect().height || 52
      const bottomY = Math.floor(Math.min(rect.bottom + 12, window.innerHeight - bottomBarH - 8))
      this.domBottomBar.style.top = `${bottomY}px`
    }
  }

  private spawnCard(owner: Owner, cardId: string): void {
    this.selectedCardId = cardId
    const card = this.cardWithOverrides(cardId)
    if (!card) return
    const cell = owner === Owner.PLAYER ? PLAYER_SPAWN : BOT_SPAWN
    const precise = {
      x: cell.x * CELL_SIZE + CELL_SIZE / 2,
      y: cell.y * CELL_SIZE + CELL_SIZE / 2,
    }
    this.simulator.state.playerElixir = 99
    this.simulator.state.botElixir = 99
    this.simulator.deployCard(owner, card, cell, precise)
  }

  private resetArena(): void {
    this.kingDefeatResetQueued = false
    this.children.removeAll()
    this.time.removeAllEvents()
    this.tweens.killAll()
    this.createWorld()
    this.updateStatus()
  }

  private togglePrincessTowers(): void {
    this.princessTowersEnabled = !this.princessTowersEnabled
    this.resetArena()
  }

  private removePrincessTowers(): void {
    for (const [id, tower] of [...this.simulator.state.towers]) {
      if (tower.isKing) continue
      for (const cell of tower.blockedCells) {
        this.grid.unblockCell(cell.x, cell.y)
      }
      this.simulator.state.towers.delete(id)
    }
    this.simulator.state.flowFields?.rebuild(this.simulator.state)
  }

  private consumeEvents(state: GameState): void {
    for (const event of state.events) {
      switch (event.type) {
        case 'DEPLOY': {
          const card = CARD_DEFINITIONS[event.cardId]
          const entity = state.entities.get(event.entityId)
          if (entity && entity.kind !== EntityKind.SPELL && card?.cardType !== CardType.SPELL) {
            this.entityCardIds.set(event.entityId, event.cardId)
            const sprite = new EntitySprite(this, entity.position.x, entity.position.y, event.cardId, entity.owner)
            this.sprites.set(entity.id, sprite)
            this.dust.spawn(entity.position.x, entity.position.y, logicDisplayHeightForCard(event.cardId))
          }
          break
        }
        case 'DAMAGE': {
          const attacker = event.attackerId ? this.findEntity(state, event.attackerId) : null
          const targetPoint = this.visualTargetPoint(state, event.targetId)
          if (attacker?.kind === EntityKind.TOWER && targetPoint) {
            this.towerSprites.get(attacker.id)?.onAttackImpact(targetPoint)
          } else if (event.attackerId) {
            this.sprites.get(event.attackerId)?.onAttackImpact(targetPoint ?? undefined)
          }
          this.flashTarget(event.targetId)
          break
        }
        case 'HEAL': {
          const target = this.entityPosition(state, event.targetId)
          const healer = event.healerId ? this.findEntity(state, event.healerId) : null
          if (target) this.healEffects.spawnOnUnit(target.x, target.y, healer?.owner ?? Owner.PLAYER)
          break
        }
        case 'HEAL_AURA':
          this.healEffects.spawn(event.position.x, event.position.y, event.owner, event.radius)
          break
        case 'SPELL_IMPACT':
          this.effects.spawn(event.position.x, event.position.y, event.radius)
          break
        case 'DEATH': {
          if (event.deathSplashRadius) {
            this.effects.spawn(event.position.x, event.position.y, event.deathSplashRadius * CELL_SIZE * 1.5)
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
          const towerSprite = this.towerSprites.get(event.towerId)
          const tower = state.towers.get(event.towerId)
          if (towerSprite && tower) {
            towerSprite.setDestroyed(tower.owner)
            if (tower.isKing && !this.kingDefeatResetQueued) {
              this.kingDefeatResetQueued = true
              this.time.delayedCall(900, () => this.resetArena())
            }
          }
          break
        }
      }
    }
    state.events = []
  }

  private syncSprites(state: GameState): void {
    for (const [id, sprite] of this.sprites) {
      const entity = state.entities.get(id)
      if (!entity) continue

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
          attackSync = {
            cooldownMs: building.getAttackCooldownMs(),
            windupMs: cardId === 'wood_tower'
              ? getAttackWindupMs('bomb_fish', entity.owner)
              : getAttackWindupMs(cardId, entity.owner),
            aimPoint: this.aimPointForBuilding(building) ?? undefined,
          }
        }
      }

      sprite.update(
        entity.position.x,
        entity.position.y,
        entity.kind === EntityKind.TROOP ? (entity as Troop).getHpFraction() : entity.hp / entity.maxHp,
        anim,
        moveSpeed,
        entity.hasBeenDamaged || entity.kind === EntityKind.BUILDING,
        attackSync,
        dashSync,
        healSync,
      )
    }
  }

  private syncTowers(state: GameState): void {
    for (const [id, sprite] of this.towerSprites) {
      const tower = state.towers.get(id)
      if (!tower) continue
      const attackSync: TowerAttackSync | undefined = tower.getAimPoint()
        ? {
            cooldownMs: tower.getAttackCooldownMs(),
            windupMs: getAttackWindupMs(tower.isKing ? 'king_tower' : 'princess_tower', tower.owner),
            aimPoint: tower.getAimPoint(),
          }
        : undefined
      sprite.update(tower.position.x, tower.position.y, tower.hp / tower.maxHp, tower.hasBeenDamaged, attackSync)
    }
  }

  private readSetup(): TestArenaSetup {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) as TestArenaSetup : {}
    } catch {
      return {}
    }
  }

  private validCardId(cardId: string | undefined): string {
    const card = cardId ? CARD_DEFINITIONS[cardId] : null
    return card?.stats && card.cardType !== CardType.SPELL ? cardId! : DEFAULT_CARD_ID
  }

  private validDeck(deck: string[] | undefined, preferredCardId: string): string[] {
    const defaults = Object.values(CARD_DEFINITIONS)
      .filter(card => card.stats && card.cardType !== CardType.SPELL)
      .map(card => card.id)
    const out: string[] = []
    const requested = deck?.length ? deck : [preferredCardId, ...defaults]
    for (const cardId of requested) {
      const valid = this.validCardId(cardId)
      out.push(valid)
      if (out.length >= DECK_SIZE) break
    }
    for (const cardId of defaults) {
      out.push(cardId)
      if (out.length >= DECK_SIZE) break
    }
    return out.slice(0, DECK_SIZE)
  }

  private cardWithOverrides(cardId: string): CardDefinition | null {
    const base = CARD_DEFINITIONS[cardId]
    if (!base?.stats) return null
    const patch = this.setup.balancePatches?.[cardId]
    return {
      ...base,
      elixirCost: patch?.elixirCost ?? base.elixirCost,
      deployCount: patch?.deployCount ?? base.deployCount,
      stats: {
        ...base.stats,
        ...(patch?.stats ?? {}),
      },
    }
  }

  private findEntity(state: GameState, id: string): Entity | null {
    return state.entities.get(id) ?? state.towers.get(id) ?? null
  }

  private entityPosition(state: GameState, id: string): Vec2 | null {
    const entity = this.findEntity(state, id)
    return entity ? entity.position : null
  }

  private visualTargetPoint(state: GameState, targetId: string): Vec2 | null {
    return this.entityPosition(state, targetId)
  }

  private aimPointForTroop(troop: Troop): Vec2 | null {
    return troop.getAttackAimPoint()
  }

  private aimPointForBuilding(building: Building): Vec2 | null {
    return building.getAttackAimPoint()
  }

  private flashTarget(id: string): void {
    const entitySprite = this.sprites.get(id)
    if (entitySprite) {
      entitySprite.flashDamage()
      return
    }
    this.towerSprites.get(id)?.flashDamage()
  }

  private updateStatus(): void {
    if (this.domPrincessBtn) {
      this.domPrincessBtn.textContent = `Princess Towers: ${this.princessTowersEnabled ? 'On' : 'Off'} [T]`
      this.domPrincessBtn.style.background = this.princessTowersEnabled ? '#1e3a5f' : '#4a2b1e'
      this.domPrincessBtn.style.color = this.princessTowersEnabled ? '#b8d4ff' : '#ffd0a0'
    }
    this.simulator.state.playerElixir = 99
    this.simulator.state.botElixir = 99
    if (this.simulator.state.elapsedMs > 170_000) this.simulator.state.elapsedMs = 0
    if (this.simulator.state.phase === 'ENDED') this.simulator.state.phase = 'BATTLE'
  }
}
