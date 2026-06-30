/** Per-layer nudge in game pixels — tuned in map-editor composite export, synced here. */
export interface CompositeLayerOffset {
  x: number
  y: number
}

/** Defaults for composite cards (wood_tower, air_boat). Editor copies from export. */
export const COMPOSITE_LAYER_OFFSETS: Readonly<
  Record<string, Readonly<Record<string, CompositeLayerOffset>>>
> = {
  wood_tower: {
    platform: { x: 4, y: 323 },
    bomber: { x: 6, y: 533 },
  },
  air_boat: {
    hull: { x: 0, y: 0 },
    crew: { x: 0, y: 0 },
  },
}
