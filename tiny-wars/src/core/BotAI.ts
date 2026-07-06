import type { GameState } from './GameState'
import type { CardSystem } from './CardSystem'
import type { BotAction, CardDefinition, Vec2 } from './types'
import type { Entity } from './entities/Entity'
import { Owner, CardType, EntityKind, UnitType, AttackType } from './types'
import {
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  RIVER_ROW_END,
  BOT_DEPLOY_ROW_MAX,
  PLAYER_TOWER_COLS,
  DEPLOY_LANE_SPLIT_COL,
  ELIXIR_MAX,
} from '@data/GameConstants'
import type { BotDifficulty } from '@data/BotDecks'
import { CARD_DEFINITIONS } from '@data/CardData'
import { listTroopDeployCells } from './DeploySystem'

interface BotProfile {
  thinkMinMs: number
  thinkMaxMs: number
  /** Chance a think falls back to a fully random play (deliberate mistakes). */
  randomChance: number
  /** Elixir banked before starting an unprovoked push. */
  bankElixir: number
  /** React to player troops crossing onto the bot's half. */
  defends: boolean
  /** Aim spells at troop clusters / low towers instead of firing randomly. */
  aimsSpells: boolean
  /** Pick counter cards (splash vs swarms, swarms vs tanks, anti-air). */
  counters: boolean
}

const PROFILES: Record<BotDifficulty, BotProfile> = {
  EASY:   { thinkMinMs: 3000, thinkMaxMs: 5500, randomChance: 1,    bankElixir: 0, defends: false, aimsSpells: false, counters: false },
  NORMAL: { thinkMinMs: 2000, thinkMaxMs: 4000, randomChance: 0.25, bankElixir: 6, defends: true,  aimsSpells: true,  counters: false },
  HARD:   { thinkMinMs: 900,  thinkMaxMs: 1800, randomChance: 0,    bankElixir: 8, defends: true,  aimsSpells: true,  counters: true  },
}

interface ThreatCluster {
  center: Vec2          // grid cell
  count: number
  totalHp: number
  maxUnitHp: number
  hasAir: boolean
  /** Deepest row reached (lower = closer to the bot towers). */
  frontRow: number
}

const CLUSTER_RADIUS_CELLS = 3
const TANK_HP_THRESHOLD = 1800

export class BotAI {
  private readonly profile: BotProfile
  private thinkCooldownMs: number

  constructor(readonly difficulty: BotDifficulty = 'NORMAL') {
    this.profile = PROFILES[difficulty]
    this.thinkCooldownMs = this.profile.thinkMinMs
  }

  tick(deltaMs: number, state: GameState, cardSystem: CardSystem): BotAction | null {
    this.thinkCooldownMs -= deltaMs
    if (this.thinkCooldownMs > 0) return null
    this.thinkCooldownMs =
      this.profile.thinkMinMs + Math.random() * (this.profile.thinkMaxMs - this.profile.thinkMinMs)

    const playable = cardSystem.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.elixirCost <= state.botElixir)
    if (playable.length === 0) return null

    // Elixir cards are pure value — always play them first.
    const elixirCard = playable.find(({ card }) => card.cardType === CardType.ELIXIR)
    if (elixirCard) return this.actionAt(elixirCard, { x: 0, y: 0 })

    if (Math.random() < this.profile.randomChance) {
      return this.randomAction(playable, state)
    }

    const threat = this.profile.defends ? findThreatCluster(state) : null
    if (threat) {
      const defense = this.defendAction(playable, threat)
      if (defense) return defense
    }

    return this.attackAction(playable, state)
  }

  reset(): void {
    this.thinkCooldownMs = this.profile.thinkMinMs
  }

  // ─── Random play (EASY, and NORMAL's mistake rolls) ───────────────────────

  private randomAction(
    playable: { card: CardDefinition; index: number }[],
    state: GameState,
  ): BotAction | null {
    const chosen = playable[Math.floor(Math.random() * playable.length)]!
    if (chosen.card.cardType === CardType.SPELL) {
      return this.actionAt(chosen, {
        x: Math.floor(Math.random() * GRID_COLS),
        y: Math.floor(Math.random() * GRID_ROWS),
      })
    }
    const cells = listTroopDeployCells(Owner.BOT, state.enemyLaneDeploy)
    if (cells.length === 0) return null
    return this.actionAt(chosen, cells[Math.floor(Math.random() * cells.length)]!)
  }

  // ─── Defense ───────────────────────────────────────────────────────────────

  private defendAction(
    playable: { card: CardDefinition; index: number }[],
    threat: ThreatCluster,
  ): BotAction | null {
    // Spell value: a clustered swarm is worth clearing with area damage.
    if (this.profile.aimsSpells && threat.count >= 3) {
      const spell = playable.find(
        ({ card }) =>
          card.cardType === CardType.SPELL &&
          ((card.spellStats?.damage ?? 0) > 0 || (card.spellStats?.spawnCount ?? 0) > 0),
      )
      if (spell) return this.actionAt(spell, threat.center)
    }

    const troops = playable.filter(
      ({ card }) => card.cardType === CardType.TROOP && !card.stats?.targetsBuildingsOnly,
    )
    if (troops.length === 0) return null

    const pick = this.profile.counters ? pickCounter(troops, threat) : troops[0]!
    if (!pick) return null

    // Drop the defender between the threat and the tower it is marching on —
    // ranged units sit further back so they shoot before being reached.
    const isRanged = (pick.card.stats?.attackRange ?? 0) >= 3
    const backoff = isRanged ? 4 : 2
    const cell = clampBotCell({
      x: threat.center.x + jitter(1),
      y: threat.frontRow - backoff,
    })
    return this.actionAt(pick, cell)
  }

  // ─── Offense ───────────────────────────────────────────────────────────────

  private attackAction(
    playable: { card: CardDefinition; index: number }[],
    state: GameState,
  ): BotAction | null {
    // Bank elixir before committing to a push (a full bar is pure waste, so spend then).
    if (state.botElixir < this.profile.bankElixir && state.botElixir < ELIXIR_MAX) return null

    const laneCol = pickAttackLaneCol(state)

    // Finisher — lob a damage spell straight onto a tower it can destroy.
    if (this.profile.aimsSpells) {
      const finisher = findTowerFinisher(playable, state)
      if (finisher) return finisher
    }

    const troops = playable.filter(({ card }) => card.cardType === CardType.TROOP)
    if (troops.length === 0) return null

    // Building-targeters charge straight past troops — send them from the bridge.
    const rusher = troops.find(({ card }) => card.stats?.targetsBuildingsOnly)
    if (rusher) {
      return this.actionAt(rusher, clampBotCell({ x: laneCol + jitter(1), y: BOT_DEPLOY_ROW_MAX }))
    }

    if (this.profile.counters) {
      // HARD builds pushes: tank from the back so support and elixir accumulate
      // behind it, then support troops stacked behind the existing push.
      const push = frontmostBotPushRow(state)
      if (push === null) {
        const tank = troops.reduce((a, b) =>
          (b.card.stats?.maxHp ?? 0) > (a.card.stats?.maxHp ?? 0) ? b : a)
        return this.actionAt(tank, clampBotCell({ x: laneCol + jitter(1), y: 3 }))
      }
      const support =
        troops.find(({ card }) => (card.stats?.attackRange ?? 0) >= 3 || card.stats?.splashRadius) ??
        troops[0]!
      return this.actionAt(support, clampBotCell({ x: laneCol + jitter(1), y: push - 2 }))
    }

    // NORMAL: any troop at the river edge in the chosen lane.
    const chosen = troops[Math.floor(Math.random() * troops.length)]!
    return this.actionAt(chosen, clampBotCell({
      x: laneCol + jitter(2),
      y: BOT_DEPLOY_ROW_MAX - Math.floor(Math.random() * 3),
    }))
  }

  private actionAt(pick: { card: CardDefinition; index: number }, cell: Vec2): BotAction {
    return { cardId: pick.card.id, handIndex: pick.index, position: cell }
  }
}

// ─── State reading helpers ─────────────────────────────────────────────────────

function cellOf(entity: Entity): Vec2 {
  return {
    x: Math.floor(entity.position.x / CELL_SIZE),
    y: Math.floor(entity.position.y / CELL_SIZE),
  }
}

/** Player troops on (or crossing onto) the bot's half, grouped around the deepest one. */
function findThreatCluster(state: GameState): ThreatCluster | null {
  const invaders = [...state.entities.values()].filter(
    e => e.owner === Owner.PLAYER && e.kind === EntityKind.TROOP && e.isAlive &&
         cellOf(e).y <= RIVER_ROW_END,
  )
  if (invaders.length === 0) return null

  const deepest = invaders.reduce((a, b) => (cellOf(b).y < cellOf(a).y ? b : a))
  const anchor = cellOf(deepest)
  const cluster = invaders.filter(e => {
    const c = cellOf(e)
    return Math.abs(c.x - anchor.x) <= CLUSTER_RADIUS_CELLS &&
           Math.abs(c.y - anchor.y) <= CLUSTER_RADIUS_CELLS
  })

  return {
    center: anchor,
    count: cluster.length,
    totalHp: cluster.reduce((sum, e) => sum + e.hp, 0),
    maxUnitHp: Math.max(...cluster.map(e => e.hp)),
    hasAir: cluster.some(e => cardStats(e)?.unitType === UnitType.AIR),
    frontRow: anchor.y,
  }
}

function cardStats(entity: Entity) {
  return entity.cardId ? CARD_DEFINITIONS[entity.cardId]?.stats : undefined
}

/** Column of the weakest surviving player princess tower (or toward the king). */
function pickAttackLaneCol(state: GameState): number {
  const princesses = [...state.towers.values()].filter(
    t => t.owner === Owner.PLAYER && !t.isKing && t.isAlive,
  )
  if (princesses.length === 0) return DEPLOY_LANE_SPLIT_COL - 1 // straight at the king
  const weakest = princesses.reduce((a, b) => (b.hp < a.hp ? b : a))
  return Math.floor(weakest.position.x / CELL_SIZE) < DEPLOY_LANE_SPLIT_COL
    ? PLAYER_TOWER_COLS[0]
    : PLAYER_TOWER_COLS[1]
}

/** Row of the bot troop furthest along its push (highest row = nearest the river). */
function frontmostBotPushRow(state: GameState): number | null {
  let front: number | null = null
  for (const e of state.entities.values()) {
    if (e.owner !== Owner.BOT || e.kind !== EntityKind.TROOP || !e.isAlive) continue
    const row = Math.floor(e.position.y / CELL_SIZE)
    if (row <= BOT_DEPLOY_ROW_MAX && (front === null || row > front)) front = row
  }
  return front
}

/** A damage spell that can outright destroy a player tower right now. */
function findTowerFinisher(
  playable: { card: CardDefinition; index: number }[],
  state: GameState,
): BotAction | null {
  for (const pick of playable) {
    const damage = pick.card.spellStats?.damage ?? 0
    if (pick.card.cardType !== CardType.SPELL || damage <= 0) continue
    for (const tower of state.towers.values()) {
      if (tower.owner !== Owner.PLAYER || !tower.isAlive || tower.hp > damage) continue
      return {
        cardId: pick.card.id,
        handIndex: pick.index,
        position: {
          x: Math.floor(tower.position.x / CELL_SIZE),
          y: Math.floor(tower.position.y / CELL_SIZE),
        },
      }
    }
  }
  return null
}

// ─── Counter selection (HARD) ─────────────────────────────────────────────────

function pickCounter(
  troops: { card: CardDefinition; index: number }[],
  threat: ThreatCluster,
): { card: CardDefinition; index: number } | null {
  const canHitAir = ({ card }: { card: CardDefinition }) =>
    card.stats?.attackType !== AttackType.GROUND_ONLY

  const pool = threat.hasAir ? troops.filter(canHitAir) : troops
  if (pool.length === 0) return null // can't touch it — save the elixir

  if (threat.count >= 4) {
    // Swarm — splash first, then ranged so it thins the pack before contact.
    const splash = pool.find(({ card }) => card.stats?.splashRadius)
    if (splash) return splash
    const ranged = pool.find(({ card }) => (card.stats?.attackRange ?? 0) >= 3)
    if (ranged) return ranged
  }

  if (threat.maxUnitHp >= TANK_HP_THRESHOLD) {
    // Tank — surround it with a swarm for max DPS per elixir.
    const swarm = pool.find(({ card }) => (card.deployCount ?? 1) >= 3)
    if (swarm) return swarm
    return pool.reduce((a, b) => {
      const dps = ({ card }: { card: CardDefinition }) =>
        (card.stats?.damage ?? 0) * (card.stats?.attackRate ?? 0) * (card.deployCount ?? 1)
      return dps(b) > dps(a) ? b : a
    })
  }

  // Small threat — cheapest answer wins the elixir trade.
  return pool.reduce((a, b) => (b.card.elixirCost < a.card.elixirCost ? b : a))
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function clampBotCell(cell: Vec2): Vec2 {
  return {
    x: Math.min(GRID_COLS - 1, Math.max(0, Math.round(cell.x))),
    y: Math.min(BOT_DEPLOY_ROW_MAX, Math.max(0, Math.round(cell.y))),
  }
}

function jitter(range: number): number {
  return Math.round((Math.random() * 2 - 1) * range)
}

// Re-export Owner so callers don't need a separate import
export { Owner }
