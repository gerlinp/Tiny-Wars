import { DAMAGE_FIRE_GRID } from '@data/AssetManifest'

export function damageFireTier(hpFraction: number): number {
  if (hpFraction > 0.75) return 0
  if (hpFraction > 0.50) return 1
  if (hpFraction > 0.25) return 2
  return 3
}

export function pickDamageFireGridCell(
  existing: readonly { col: number; row: number }[],
  cols = DAMAGE_FIRE_GRID.cols,
  rows = DAMAGE_FIRE_GRID.rows,
  rng: () => number = Math.random,
): { col: number; row: number } {
  const usedRows = new Set(existing.map(s => s.row))
  const unusedRows = Array.from({ length: rows }, (_, i) => i).filter(r => !usedRows.has(r))
  const row = unusedRows.length > 0
    ? unusedRows[Math.floor(rng() * unusedRows.length)]!
    : Math.floor(rng() * rows)
  const col = Math.floor(rng() * cols)
  return { col, row }
}
