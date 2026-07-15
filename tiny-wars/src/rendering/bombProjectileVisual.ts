/** Peak scale at the midpoint of lob flight — reads as maximum arc height. */
export const BOMB_ARC_PEAK_SCALE = 1.75

/** Spin animation playback during lob flight (1 = native sheet rate). */
export const BOMB_SPIN_TIME_SCALE = 1

/** On-screen size of lobbed bomb / rocket projectiles. */
export const BOMB_PROJECTILE_DISPLAY_SCALE = 2.75

/** King castle cannon shots — no mid-flight arc scale-up. */
export const TOWER_CANNON_PROJECTILE_DISPLAY_SCALE = 3.5

/** No arc exaggeration — constant size for tower lobs. */
export const FLAT_LOB_PEAK_SCALE = 1

/** Scale ramps up to the midpoint, then back down — simulates altitude during the lob. */
export function bombArcScale(t: number, peakScale = BOMB_ARC_PEAK_SCALE): number {
  const u = Math.max(0, Math.min(1, t))
  if (u <= 0.5) {
    return 1 + (peakScale - 1) * (u * 2)
  }
  return peakScale - (peakScale - 1) * ((u - 0.5) * 2)
}

export function applyBombArcDisplaySize(
  sprite: Phaser.GameObjects.Sprite,
  baseSize: number,
  t: number,
  peakScale = BOMB_ARC_PEAK_SCALE,
): void {
  const scale = bombArcScale(t, peakScale)
  sprite.setDisplaySize(baseSize * scale, baseSize * scale)
}
