/** Pure layout math for Tiny Swords health bars (no Phaser). */

export interface HealthBarLayoutMetrics {
  baseArtH: number
  fillFrameH: number
  fillInsetX: number
  fillHeightRatio: number
}

/** When fill art is drawn at inner-track height, size from texture bands; else stretch thin fills. */
const INNER_TRACK_FILL_THRESHOLD = 0.35

export function healthBarFillDisplayHeight(barH: number, metrics: HealthBarLayoutMetrics): number {
  const textureRatio = metrics.fillFrameH / metrics.baseArtH
  if (textureRatio >= INNER_TRACK_FILL_THRESHOLD) {
    return barH * textureRatio * 0.96
  }
  return barH * metrics.fillHeightRatio
}

export function healthBarFillHorizontalInset(
  barH: number,
  capDisplayW: number,
  metrics: HealthBarLayoutMetrics,
): number {
  const borderTex = Math.max(0, (metrics.baseArtH - metrics.fillFrameH) / 2)
  const borderDisplay = barH * (borderTex / metrics.baseArtH)
  const ratioInset = capDisplayW * metrics.fillInsetX
  const textureRatio = metrics.fillFrameH / metrics.baseArtH
  if (textureRatio >= INNER_TRACK_FILL_THRESHOLD) {
    return Math.max(1, Math.round(Math.max(ratioInset, borderDisplay * 0.9)))
  }
  return Math.max(1, Math.round(ratioInset))
}

export function healthBarInnerWidth(barW: number, inset: number): number {
  return Math.max(0, barW - inset * 2)
}
