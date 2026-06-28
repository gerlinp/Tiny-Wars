import { CELL_SIZE } from '@data/GameConstants'

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

/**
 * Clash Royale Rocket — 350 tiles/min (~3.6s to princess tower, ~4s to king tower).
 * Not Giant Snowball (800) — the Bomb spell is the 6-elixir Rocket equivalent.
 * @see https://clashroyale.fandom.com/wiki/User_blog:AesDragon/Hidden_card_stats:_Projectile_travel_speeds
 */
export const ROCKET_LOB_SPEED_CELLS_PER_MIN = 350
/** @deprecated Use ROCKET_LOB_SPEED_CELLS_PER_MIN */
export const SPELL_LOB_SPEED_CELLS_PER_MIN = ROCKET_LOB_SPEED_CELLS_PER_MIN
export const ROCKET_MIN_FLIGHT_MS = 1200
export const ROCKET_MAX_FLIGHT_MS = 6500

export function rocketFlightMs(distancePx: number): number {
  const distanceCells = distancePx / CELL_SIZE
  const byCrSpeed = (distanceCells / ROCKET_LOB_SPEED_CELLS_PER_MIN) * 60_000
  return Math.round(
    Math.max(ROCKET_MIN_FLIGHT_MS, Math.min(ROCKET_MAX_FLIGHT_MS, byCrSpeed)),
  )
}

/** Arrows spell — rain duration before impact (Clash-style volley). */
export const ARROWS_RAIN_MS = 650

export function arrowsRainMs(): number {
  return ARROWS_RAIN_MS
}

/** @deprecated Use rocketFlightMs */
export const tntFlightMs = rocketFlightMs
