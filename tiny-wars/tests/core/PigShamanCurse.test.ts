import { describe, it, expect } from 'vitest'
import { Grid } from '@core/Grid'
import { GameSimulator } from '@core/GameSimulator'
import { Troop } from '@core/entities/Troop'
import { resolveDeaths } from '@core/CombatSystem'
import { Owner, EntityKind } from '@core/types'
import type { EntityStats } from '@core/types'
import { CARD_DEFINITIONS } from '@data/CardData'
import { PIG_SHAMAN_CURSE_MS, PIG_SHAMAN_TRANSFORM_CARD_ID } from '@data/CardAbilities'

function makeSim() {
  return new GameSimulator(new Grid())
}

function spawnTroop(sim: GameSimulator, cardId: string, owner: Owner, x = 500, y = 800): Troop {
  const stats = CARD_DEFINITIONS[cardId]!.stats as EntityStats
  const troop = new Troop(owner, stats, { x, y }, new Grid(), cardId)
  sim.state.entities.set(troop.id, troop)
  return troop
}

function pigsOf(sim: GameSimulator, owner: Owner): Troop[] {
  return [...sim.state.entities.values()].filter(
    e => e.kind === EntityKind.TROOP && e.cardId === PIG_SHAMAN_TRANSFORM_CARD_ID && e.owner === owner,
  ) as Troop[]
}

describe('Pig Shaman curse (CR Mother Witch)', () => {
  it('a cursed troop that dies within the window becomes the curser\'s Pig', () => {
    const sim = makeSim()
    const victim = spawnTroop(sim, 'warrior', Owner.BOT)
    sim.state.elapsedMs = 10_000

    victim.applyCurse(Owner.PLAYER, sim.state.elapsedMs + PIG_SHAMAN_CURSE_MS)
    sim.state.elapsedMs += PIG_SHAMAN_CURSE_MS - 1 // dies just inside the window
    victim.takeDamage(victim.hp)
    resolveDeaths(sim.state)

    const pigs = pigsOf(sim, Owner.PLAYER)
    expect(pigs).toHaveLength(1)
    expect(pigs[0].position).toEqual(victim.position)
    expect(sim.state.events.some(
      e => e.type === 'DEPLOY' && e.cardId === PIG_SHAMAN_TRANSFORM_CARD_ID,
    )).toBe(true)
  })

  it('death from any source transforms — not just the shaman\'s own hit', () => {
    const sim = makeSim()
    const victim = spawnTroop(sim, 'warrior', Owner.BOT)
    victim.applyCurse(Owner.PLAYER, PIG_SHAMAN_CURSE_MS)

    // Killed by a plain takeDamage (stand-in for a spell / tower / other troop)
    victim.takeDamage(victim.hp)
    resolveDeaths(sim.state)

    expect(pigsOf(sim, Owner.PLAYER)).toHaveLength(1)
  })

  it('no Pig when the curse has expired', () => {
    const sim = makeSim()
    const victim = spawnTroop(sim, 'warrior', Owner.BOT)
    victim.applyCurse(Owner.PLAYER, PIG_SHAMAN_CURSE_MS)
    sim.state.elapsedMs = PIG_SHAMAN_CURSE_MS + 1

    victim.takeDamage(victim.hp)
    resolveDeaths(sim.state)

    expect(pigsOf(sim, Owner.PLAYER)).toHaveLength(0)
  })

  it('no Pig for an uncursed death', () => {
    const sim = makeSim()
    const victim = spawnTroop(sim, 'warrior', Owner.BOT)
    victim.takeDamage(victim.hp)
    resolveDeaths(sim.state)

    expect(pigsOf(sim, Owner.PLAYER)).toHaveLength(0)
  })

  it('the shaman\'s attack applies the curse for PIG_SHAMAN_CURSE_MS', () => {
    const sim = makeSim()
    const shaman = spawnTroop(sim, 'pig_shaman', Owner.PLAYER)
    const victim = spawnTroop(sim, 'warrior', Owner.BOT)
    sim.state.elapsedMs = 30_000

    ;(shaman as unknown as {
      dealDamageTo(state: unknown, target: unknown, splash: boolean): void
    }).dealDamageTo(sim.state, victim, false)

    expect(victim.isCursedAt(sim.state.elapsedMs)).toBe(true)
    expect(victim.isCursedAt(sim.state.elapsedMs + PIG_SHAMAN_CURSE_MS)).toBe(true)
    expect(victim.isCursedAt(sim.state.elapsedMs + PIG_SHAMAN_CURSE_MS + 1)).toBe(false)
  })

  it('a killing blow from the shaman still transforms (curse lands before death check)', () => {
    const sim = makeSim()
    const shaman = spawnTroop(sim, 'pig_shaman', Owner.PLAYER)
    const victim = spawnTroop(sim, 'warrior', Owner.BOT)
    victim.hp = 1

    ;(shaman as unknown as {
      dealDamageTo(state: unknown, target: unknown, splash: boolean): void
    }).dealDamageTo(sim.state, victim, false)
    resolveDeaths(sim.state)

    expect(victim.isAlive).toBe(false)
    expect(pigsOf(sim, Owner.PLAYER)).toHaveLength(1)
  })
})
