// Original robe colors of the Hex Shaman base sprite
const S  = 0x4F4F70  // robe shadow
const M  = 0xA479CD  // robe midtone
const N  = 0xEBAAEA  // robe main
const H  = 0xFDB2FC  // robe highlight

// A palette is an ordered list of [sourceRGB, destRGB] pairs
export type PaletteMap = ReadonlyArray<readonly [number, number]>

// ── Default Hex Shaman colors — robe only re-tinted blue/red, necklace untouched (Pig Shaman) ──
const BLUE_ROBE: PaletteMap = [
  [S, 0x10245A], [M, 0x2454D3], [N, 0x579AFF], [H, 0xC9E3FF],
]
const RED_ROBE: PaletteMap = [
  [S, 0x5A1019], [M, 0xB71931], [N, 0xF24F61], [H, 0xFFD0D6],
]

export const SHAMAN_PALETTES: Record<string, { player: PaletteMap; bot: PaletteMap }> = {
  pig_shaman:       { player: BLUE_ROBE, bot: RED_ROBE },
}

// ── Fire palettes — card-identity VFX colors, same for both factions ─────────
// Applied to the projectile orb and explosion sprites so the fire always
// reads as the card type regardless of which team is casting.

/** Per-card fire palette for projectile + explosion sprites. Not faction-specific. */
export const SHAMAN_FIRE_PALETTES: Record<string, PaletteMap> = {}
