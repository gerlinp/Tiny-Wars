import { describe, it, expect } from 'vitest'
import { troopDeployPositions, troopSwarmPortraitLayout } from '@core/DeploySystem'
import { CELL_SIZE, TROOP_DEPLOY_SPREAD_CELLS } from '@data/GameConstants'

const RING_RADIUS = TROOP_DEPLOY_SPREAD_CELLS * CELL_SIZE * 0.38

describe('DeployLayout', () => {
  it('forms a compact circular cluster for large swarms', () => {
    const center = { x: 100, y: 200 }
    const positions = troopDeployPositions(center, 14, TROOP_DEPLOY_SPREAD_CELLS)
    expect(positions).toHaveLength(14)

    const dists = positions.map(p => Math.hypot(p.x - center.x, p.y - center.y))
    expect(dists.some(d => d < 1)).toBe(true)
    expect(Math.max(...dists)).toBeGreaterThan(RING_RADIUS)
    expect(new Set(positions.map(p => Math.round(p.y))).size).toBeGreaterThan(1)
  })

  it('places small groups evenly on a single ring', () => {
    const center = { x: 50, y: 50 }
    const positions = troopDeployPositions(center, 3, TROOP_DEPLOY_SPREAD_CELLS)
    expect(positions).toHaveLength(3)

    for (const p of positions) {
      const d = Math.hypot(p.x - center.x, p.y - center.y)
      expect(d).toBeCloseTo(RING_RADIUS, 4)
    }
  })

  it('swarm portrait keeps units large enough to overlap like in-game deploy', () => {
    const unitH = 73
    const unitW = 73
    const { offsets, fitScale } = troopSwarmPortraitLayout(
      14,
      TROOP_DEPLOY_SPREAD_CELLS,
      80,
      100,
      unitW,
      unitH,
    )
    expect(offsets).toHaveLength(14)

    const minDist = Math.min(
      ...offsets.flatMap((a, i) =>
        offsets.slice(i + 1).map(b => Math.hypot(a.x - b.x, a.y - b.y)),
      ),
    )
    const portraitUnitH = unitH * fitScale
    expect(minDist).toBeLessThan(portraitUnitH * 0.85)
  })
})
