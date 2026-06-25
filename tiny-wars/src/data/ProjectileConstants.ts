/** Arrow flight timing — aligned with Java reference hit speeds (archer 1.2s, towers ~1.0s @ 30fps). */
export const ARROW_MIN_FLIGHT_MS = 380
export const ARROW_MAX_FLIGHT_MS = 950
/** Visible flight ≈ 40% of attack cooldown, same pacing as Java shot GIFs. */
export const ARROW_FLIGHT_FRACTION = 0.42
export const ARROW_SPEED_PX_PER_SEC = 200

export function arrowFlightMs(distancePx: number, attackRate: number): number {
  const attackMs = 1000 / Math.max(attackRate, 0.1)
  const byCooldown = attackMs * ARROW_FLIGHT_FRACTION
  const byDistance = (distancePx / ARROW_SPEED_PX_PER_SEC) * 1000
  return Math.round(
    Math.max(ARROW_MIN_FLIGHT_MS, Math.min(ARROW_MAX_FLIGHT_MS, Math.max(byCooldown, byDistance))),
  )
}
