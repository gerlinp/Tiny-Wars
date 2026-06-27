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

/** Bomb spell — slow arcing flight matching CR's ~4s cross-map travel time. */
export const ROCKET_MIN_FLIGHT_MS = 1000
export const ROCKET_MAX_FLIGHT_MS = 4000
export const ROCKET_SPEED_PX_PER_SEC = 215

export function rocketFlightMs(distancePx: number): number {
  const byDistance = (distancePx / ROCKET_SPEED_PX_PER_SEC) * 1000
  return Math.round(
    Math.max(ROCKET_MIN_FLIGHT_MS, Math.min(ROCKET_MAX_FLIGHT_MS, byDistance)),
  )
}

/** Arrows spell — rain duration before impact (Clash-style volley). */
export const ARROWS_RAIN_MS = 650

export function arrowsRainMs(): number {
  return ARROWS_RAIN_MS
}

/** @deprecated Use rocketFlightMs */
export const tntFlightMs = rocketFlightMs
