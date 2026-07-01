// Original robe and necklace colors of the Hex Shaman base sprite
const S  = 0x4F4F70  // robe shadow
const M  = 0xA479CD  // robe midtone
const N  = 0xEBAAEA  // robe main
const H  = 0xFDB2FC  // robe highlight
const NS = 0xAF9E93  // necklace shadow
const NM = 0xF6D6A1  // necklace main
const NX = 0xFFFFFF  // necklace shine

// A palette is an ordered list of [sourceRGB, destRGB] pairs
export type PaletteMap = ReadonlyArray<readonly [number, number]>

// ── Blue 1 - Cobalt  /  Red 1 - Scarlet  (Fire Shaman) ──────────────────────
const COBALT: PaletteMap = [
  [S, 0x10245A], [M, 0x2454D3], [N, 0x579AFF], [H, 0xC9E3FF],
]
const SCARLET: PaletteMap = [
  [S, 0x5A1019], [M, 0xB71931], [N, 0xF24F61], [H, 0xFFD0D6],
]

// ── Blue 2 - Cyan  /  Red 2 - Ember  (Elder Shaman) ─────────────────────────
const CYAN: PaletteMap = [
  [S, 0x083F59], [M, 0x007FA8], [N, 0x22C7E8], [H, 0xB9F7FF],
  [NS, 0x07566F], [NM, 0x12B9D6], [NX, 0xB9FAFF],
]
const EMBER: PaletteMap = [
  [S, 0x5B2407], [M, 0xC94D00], [N, 0xFF8A20], [H, 0xFFD7AD],
  [NS, 0x773005], [NM, 0xE56B11], [NX, 0xFFE0A8],
]

// ── Blue 3 - Indigo  /  Red 3 - Rose  (Lightning Shaman) ────────────────────
const INDIGO: PaletteMap = [
  [S, 0x25133F], [M, 0x5530A1], [N, 0x966EF0], [H, 0xE3D5FF],
  [NS, 0x687080], [NM, 0xB8C0CC], [NX, 0xF1F5F9],
]
const ROSE: PaletteMap = [
  [S, 0x541336], [M, 0xA72A70], [N, 0xEA5BB8], [H, 0xFFD2EF],
  [NS, 0x687080], [NM, 0xB8C0CC], [NX, 0xF1F5F9],
]

// ── Blue 4 - Death  /  Red 4 - Death  (Voodoo / Death Shaman) ───────────────
// Uses Blue1/Red1 robe with silver necklace (matches PDF "Death Shaman")
const DEATH_BLUE: PaletteMap = [
  [S, 0x10245A], [M, 0x2454D3], [N, 0x579AFF], [H, 0xC9E3FF],
  [NS, 0x687080], [NM, 0xB8C0CC], [NX, 0xF1F5F9],
]
const DEATH_RED: PaletteMap = [
  [S, 0x5A1019], [M, 0xB71931], [N, 0xF24F61], [H, 0xFFD0D6],
  [NS, 0x687080], [NM, 0xB8C0CC], [NX, 0xF1F5F9],
]

export const SHAMAN_PALETTES: Record<string, { player: PaletteMap; bot: PaletteMap }> = {
  wizard:           { player: COBALT, bot: SCARLET  },
  elder_shaman:     { player: CYAN,   bot: EMBER    },
  lightning_shaman: { player: INDIGO, bot: ROSE     },
  voodoo_shaman:    { player: DEATH_BLUE, bot: DEATH_RED },
}

// ── Fire palettes — card-identity VFX colors, same for both factions ─────────
// Applied to the projectile orb and explosion sprites so the fire always
// reads as the card type regardless of which team is casting.

// Fire Shaman: warm red→orange→yellow ramp (PDF page 2)
const FIRE_ORANGE: PaletteMap = [
  [S, 0x5A1A08], [M, 0xB72A14], [N, 0xF06A1A], [H, 0xFFC94A], [NX, 0xFFF4C7],
]

// Electro Shaman: teal edge → cyan → yellow charge → white core (PDF page 4)
const LIGHTNING_BLUE: PaletteMap = [
  [S, 0x184C70], [M, 0x1D9DC3], [N, 0x73E8FF], [H, 0xFFF071], [NX, 0xFFFFE5],
]

// Voodoo / Death Shaman: deep teal shadow → spectral green (PDF page 5)
const VOODOO_GREEN: PaletteMap = [
  [S, 0x163B35], [M, 0x28705D], [N, 0x58C28A], [H, 0xA7F2B8], [NX, 0xE8FFE8],
]

/** Per-card fire palette for projectile + explosion sprites. Not faction-specific. */
export const SHAMAN_FIRE_PALETTES: Record<string, PaletteMap> = {
  wizard:           FIRE_ORANGE,
  lightning_shaman: LIGHTNING_BLUE,
  voodoo_shaman:    VOODOO_GREEN,
}
