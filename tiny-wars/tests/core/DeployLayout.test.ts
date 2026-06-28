import { describe, it, expect } from 'vitest'
import { troopDeployPositions, troopSwarmPortraitLayout } from '@core/DeploySystem'
import { TROOP_DEPLOY_SPREAD_CELLS } from '@data/GameConstants'

describe('DeployLayout', () => {
  it('forms a grid cluster for large swarms', () => {
    const positions = troopDeployPositions({ x: 100, y: 200 }, 14, TROOP_DEPLOY_SPREAD_CELLS)
    expect(positions).toHaveLength(14)
    const ys = new Set(positions.map(p => p.y))
    expect(ys.size).toBeGreaterThan(1)
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
