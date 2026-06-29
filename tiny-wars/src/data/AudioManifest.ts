export interface SfxDef {
  key: string
  path: string
}

/** Default strike sound for all melee troops (attackRange ≤ 2 cells). */
export const MELEE_HIT_SFX: SfxDef = {
  key: 'sfx_melee_hit',
  path: 'assets/Audio/SFX/Combat/melee_hit.mp3',
}

export function getCombatSfx(): readonly SfxDef[] {
  return [MELEE_HIT_SFX]
}
