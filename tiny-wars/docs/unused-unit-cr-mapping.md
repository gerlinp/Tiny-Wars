# Unused unit assets → Clash Royale card references

Inventory of Tiny Swords unit art in `tiny-wars-assets` (symlinked at `public/assets`) compared against cards wired in [`AssetManifest.ts`](../src/data/AssetManifest.ts) and [`CardData.ts`](../src/data/CardData.ts).

**Last reviewed:** June 2026

---

## Currently used

**Active deck (8 cards):** `warrior`, `archer`, `skeleton`, `lancer`, `wizard`, `torch_goblin`, `arrows`, `tnt`

| Tiny-Wars card | Asset folder | CR mapping |
|---|---|---|
| Warrior | `Units/*/Warrior/` | Knight (melee) |
| Archers | `Factions/Knights/Troops/Archer/` | Archers (×2 deploy) |
| Skeletons | `Enemy Pack/.../Skull/` | Skeletons (×3 deploy) |
| Spear Goblins | `Enemy Pack/.../Spear Goblin/` | Spear Goblins (×3 deploy) |
| Troll | `Enemy Pack/.../Troll/` | Giant (building tank) |
| Elite Archer | `Units/*/Archer/` | Musketeer |
| Pawn | `Units/*/Pawn/` | Tanky melee (high HP) |
| Lancer | `Units/*/Lancer/` | Prince |
| Wizard | `Enemy Pack/.../Hex Shaman/` | Wizard (splash ranged) |
| Torch Goblin | `Enemy Pack/.../Torch Goblin/` | Fast ranged goblin |
| Arrows | Archer `Arrow.png` | Arrows spell |
| Rocket | `Enemy Pack/.../Bomb/` | Rocket spell |

**Coded but not in default deck:** `elite_archer` (Musketeer), `pawn` (tanky melee), `spear_goblin` (Spear Goblins), `troll` (Giant stats — deck builder only).

**Coded but excluded from deck:** `wood_tower` → Bomb Tower (`Factions/Goblins/Buildings/Wood_Tower/`).

**Enemy Pack wired:** Skull (Skeletons), Spear Goblin, Troll, Torch Goblin, Hex Shaman (Wizard), Bomb (Rocket). **~19 animated enemy units** still unused.

---

## Tier 1 — Best fits

Full Idle/Run/Attack sheets, a matching card-hand portrait (or obvious Human Avatar pick), and a clear deck-role gap.

| Unused asset | CR reference | Elixir | Why |
|---|---|---:|---|
| **Pig Rider Spear Goblin** | Hog Rider | 4 | Fast single unit rushing towers. Deck has no win condition. |
| **Bomb Fish** | Wall Breakers | 2 | Runs in and shoots bombs at buildings. Portrait: `Enemy Avatars/Bomb Fish.png`. |
| **Monk** | Battle Healer | 4 | Only unused knight unit; has `Heal` + `Heal_Effect` clips. Support role missing from deck. Pick portrait from `Human Avatars/` (e.g. `Avatars_02` or `Avatars_06`). |
| **Minotaur** | P.E.K.K.A | 7 | Slow hammer brute — big single-target tank. |
| **Harpoon Shark** | Hunter | 4 | Throws harpoons at medium range. Portrait: `Harpoon Shark.png`; projectile: `Harpoon.png`. |
| **Barrel** (Goblin faction) | Goblin Barrel | 3 | Rolling barrel — spell or deployable. `Factions/Goblins/Troops/Barrel/`. |
| **Wood Tower** (already coded) | Bomb Tower | 4 | Fully wired; excluded via `DECK_EXCLUDED_CARD_IDS`. |

---

## Tier 2 — Good fits

Strong art/behavior match; more design or tuning work.

| Unused asset | CR reference | Elixir | Why |
|---|---|---:|---|
| **Turtle** | Guards | 3 | Shell hide (`Guard_In` / `Guard_Out`) = shielded defensive melee. Best Guards fit now that Skull → Skeletons. |
| **Thief** | Bandit or Goblins | 2–3 | Fast knife attacks — dash melee or cheap cycle. |
| **Gnome** | Goblins or Bats | 2 | Tiny, very fast hammer swipes — ground or air swarm. |
| **Bear** | Giant | 5 | Big slow melee — building-focused tank (distinct from wired Troll). |
| **Gnoll** | Musketeer | 4 | Throws bones at range; `Gnoll_Bone.png` projectile included. |
| **Paddle Shark** | Barbarians | 5 | Oar melee rush; deploy ×2 like Barbarians. |
| **Panda** | Mega Knight or Valkyrie | 4–7 | Martial arts melee with `Guard` stance. |
| **Spider** | Bats or Graveyard | 2–5 | Fast small attacker — best as cheap air swarm. |
| **Snake** | Bats (swarm) or Poison (spell) | 2–4 | No snake troop in CR; swarm or future poison spell. |
| **Lizard** | Mega Minion or Inferno Dragon | 3–4 | `Lizard_Hit` spikes = area denial / defensive damage. |
| **Dynamite goblin** (TNT faction) | Fireball or building goblin | 4 | Distinct from fish `Bomb/` used for Rocket. `Factions/Goblins/Troops/TNT/Dynamite/`. |

---

## Tier 3 — Buildings and vehicles

| Unused asset | CR reference | Elixir | Why |
|---|---|---:|---|
| **Cannon** | Cannon | 3 | Directional cannon + `Cannon_Ball.png`. |
| **Pirate Tower** | Tesla or Inferno Tower | 4–5 | Ground/water tower variants. |
| **Fish Hut** | Furnace or spawner | — | Hut building; could spawn fish units. |
| **Goblin Hut** | Goblin Hut | 5 | Literal match; spawns goblins over time. |
| **Boat / Seahorse Boat** | *(no direct match)* | — | Transport/invasion — custom mechanic or Battle Ram–style push. |
| **Root Troll** (dead tree, skull spikes) | Tombstone or Graveyard | 3–5 | Spooky spawner / skeleton theme. |

---

## Unused clips on in-deck units

Polish opportunities, not new cards.

| In-deck unit | Unused sheets | Possible use |
|---|---|---|
| **Warrior** | `Warrior_Guard`, `Warrior_Attack2` | Knight shield / combo attack |
| **Lancer** | All `*_Defence` directional holds | Prince charge wind-up / Dark Prince shield |
| **Pawn** | Tool variants (Axe, Pickaxe, Wood, …) | RTS economy — poor CR fit unless reskinned |
| **Hex Shaman** | `Transformation Spell`, `Explosion Spell` | Witch skeleton spawn or second spell |
| **Skeletons** | `Skull_Guard.png` | Block pose only — not wired (Guards reserved for Turtle) |
| **Spear Goblins** | `Spear Goblin_Attack Strong.png` | Alternate wind-up throw — not wired (`Attack Fast` used) |

---

## Suggested expansion order

Given the current deck (knights + skeleton swarm + spells + enemy ranged):

1. **Hog Rider** (Pig Rider) — win condition
2. **P.E.K.K.A** (Bear / Minotaur) — big tank
3. **Battle Healer** (Monk) — support
4. **Wall Breakers** (Bomb Fish) — building pressure
5. **Re-enable Bomb Tower** (Wood Tower) — building slot
6. **Guards** (Turtle) — defensive counter

---

## Pawn sprites (two art lines)

| Sprite | Path | Suggested CR card | Notes |
|---|---|---|---|
| Hooded worker | `Units/*/Pawn/` | **Knight** (3) plain, or **Rascals** (5) knife variant | Not miner. `Avatars_05`. |
| Blonde soldier | `Factions/Knights/Troops/Pawn/Pawn_Blue.png` | **Royal Recruits** (7, ×2) | Swing combat anims; `Avatars_06`. Barbarians reserved for Paddle Shark. |

---

## Portrait inventory

Before wiring any new card, pick a dedicated portrait per [card-avatars rule](../../.cursor/rules/card-avatars.mdc) — never use idle sheets as placeholders. **Numbered enemy avatars do not match file order** — verify art before assigning.

### Enemy Avatars — wired

| Portrait | Card | Notes |
|---|---|---|
| `Enemy Avatars_01.png` | `skeleton` | |
| `Enemy Avatars_06.png` | `thief` | Hooded thief |
| `Enemy Avatars_08.png` | `turtle` | Turtle head |
| `Enemy Avatars_09.png` | `minotaur` | |
| `Enemy Avatars_12.png` | `panda` | Straw hat |
| `Enemy Avatars_13.png` | `lizard` | |
| `Enemy Avatars_16.png` | `troll` | |
| `Bomb Fish.png` | `bomb_fish` | |
| `Hex Shaman.png` | `wizard` | |
| `Pig Rider.png` | `pig_rider` | |
| `Spear Goblin.png` | `spear_goblin` | |
| `Torch Goblin.png` | `torch_goblin` | |

### Enemy Avatars — reserved (no card yet)

| Portrait | Intended unit | Suggested role |
|---|---|---|
| `Enemy Avatars_07.png` | Snake | Swarm / poison spell |
| **`Enemy Avatars_10.png`** | **Gnoll** | Musketeer-style ranged (`Enemy Pack/Enemies/Gnoll/`) |
| `Enemy Avatars_11.png` | Spider | Bats swarm |
| `Enemy Avatars_14.png` | (hyena/gnoll alt — verify art) | — |
| `Enemy Avatars_15.png` | Gnome | Goblins / cheap swarm |
| `Harpoon Shark.png` | Harpoon Shark | Hunter |
| `Paddle Shark.png` | Paddle Shark | Barbarians ×2 |

### Human Avatars — wired

`Avatars_01` Warrior · `Avatars_02` Lancer · `Avatars_03` Elite Archer · `Avatars_05` Pawn · Knights Archer uses faction sprite (not human avatar folder)

---

## Balance standard (Arena 26)

All new cards use **Clash Royale level 14** stats — the Arena 26 (“Royal Road”) baseline already defined in the codebase:

| Source | Location |
|---|---|
| Reference level | `BALANCE_REFERENCE_LEVEL = 14` in [`GameConstants.ts`](../src/data/GameConstants.ts) |
| Card stats | [`CardData.ts`](../src/data/CardData.ts) — copy L14 HP/damage from [Liquipedia](https://liquipedia.net/clashroyale/) or Java reference (`java-clash-reference.mdc`) |
| Movement | `crSpeedToCellsPerSec(CR_SPEED.*)` — use the CR speed tier verbatim (e.g. Fast = 90) |
| Range | `attackRange` in **grid cells**, matching CR range numbers (e.g. Archers 5.0, Skeletons 0.5) |
| Attack speed | `attackRate = 1 / hitSpeedSeconds` (e.g. Skeletons 1/1.1) |
| Multi-deploy | `deployCount` on the card (Archers ×2, Skeletons ×3) |
| Regression tests | Lock L14 values in [`GameConstants.test.ts`](../src/data/GameConstants.test.ts) |

**Do not guess stats from memory** — look up the CR card, then add a test assertion for HP, damage, elixir, and deploy count.

---

## Recently wired: Skeletons (`skeleton`)

**Status:** Done (June 2026) · **Asset:** `Enemy Pack/Enemies/Skull/` · **Portrait:** `Enemy Avatars_01.png` · **CR:** [Skeletons](https://liquipedia.net/clashroyale/Skeletons) L14

| Stat | CR L14 | Tiny-Wars |
|---|---:|---|
| Elixir | 1 | `elixirCost: 1` |
| Count | ×3 | `deployCount: 3` |
| HP / Damage | 108 / 108 | `maxHp` / `damage` |
| Hit speed | 1.1 s | `attackRate: 1 / 1.1` |
| Speed | Fast (90) | `CR_SPEED.fast` |
| Range | Melee 0.5 | `attackRange: 0.5` |

**Sheets:** `Skull_Idle` (8), `Skull_Run` (6), `Skull_Attack` (7) · `tintBotSide` · `mapHeightScale: 0.88` · `attackHitFrame: 4` · `Skull_Guard.png` not wired.

**Deck:** default slot (replaced `pawn`); `pawn` remains in deck builder.

---

## Recently wired: Spear Goblins (`spear_goblin`)

**Status:** Done (June 2026) · **Asset:** `Enemy Pack/Enemies/Goblin Raiders/Spear Goblin/` · **Portrait:** `Spear Goblin.png` · **CR:** [Spear Goblins](https://liquipedia.net/clashroyale/Spear_Goblins) L14

| Stat | CR L14 | Tiny-Wars |
|---|---:|---|
| Elixir | 2 | `elixirCost: 2` |
| Count | ×3 | `deployCount: 3` |
| HP / Damage | 176 / 108 | `maxHp` / `damage` |
| Hit speed | 1.7 s | `attackRate: 1 / 1.7` |
| Speed | Very Fast (120) | `CR_SPEED.veryFast` |
| Range | 5.0 | `attackRange: 5.0` |

**Sheets:** `Spear Goblin_Idle` (8), `Spear Goblin_Run` (6), `Spear Goblin_Attack Fast` (7) @ 256×256 · `tintBotSide` · `mapHeightScale: 0.88` · `attackHitFrame: 4` · `Attack Strong` not wired.

**Deck:** deck builder only (default 8 unchanged).

---

## Implementation notes

- Pull stats from the Java Clash Royale reference at **level 14** (`BALANCE_REFERENCE_LEVEL` in `GameConstants.ts`), same as existing cards in `CardData.ts`.
- Enemy Pack units with one palette: use `tintBotSide: true` (see Torch Goblin / Wizard).
- Add bundle entry in `AssetManifest.ts`, card in `CardData.ts`, and tests in `AssetManifest.test.ts` / behavior tests as needed.
