# Unused unit assets → Clash Royale card references

Inventory of Tiny Swords unit art in `tiny-wars-assets` (symlinked at `public/assets`) compared against cards wired in [`AssetManifest.ts`](../src/data/AssetManifest.ts) and [`CardData.ts`](../src/data/CardData.ts).

**Last reviewed:** June 2026

---

## Currently wired (25 cards)

**Default deck (8):** `warrior`, `archer`, `skeleton`, `lancer`, `wizard`, `torch_goblin`, `arrows`, `tnt`

| Tiny-Wars card | Asset folder | CR mapping (L14) | Deck |
|---|---|---|---|
| Warrior | `Units/*/Warrior/` | Knight | default |
| Archers | `Factions/Knights/Troops/Archer/` | Archers ×2 | default |
| Skeletons | `Enemy Pack/.../Skull/` | Skeletons ×3 | default |
| Skeleton Army | `Enemy Pack/.../Skull/` | Skeleton Army ×14 | builder |
| Lancer | `Units/*/Lancer/` | Prince (charge) | default |
| Wizard | `Enemy Pack/.../Hex Shaman/` | Wizard (splash) | default |
| Torch Goblin | `Enemy Pack/.../Torch Goblin/` | Fast ranged goblin | default |
| Arrows | Archer `Arrow.png` | Arrows spell | default |
| Bomb | `Enemy Pack/.../Bomb/` | Rocket spell | default |
| Gnoll | `Enemy Pack/.../Gnoll/` | Executioner (boomerang bone) | builder |
| Elite Archer | `Units/*/Archer/` | Musketeer | builder |
| Pawn | `Units/*/Pawn/` | Tanky melee | builder |
| Spear Goblins | `Enemy Pack/.../Spear Goblin/` | Spear Goblins ×3 | builder |
| Troll | `Enemy Pack/.../Troll/` | Giant (building-only) | builder |
| Lizard | `Enemy Pack/.../Caveborn/Lizard/` | Inferno Dragon (air splash) | builder |
| Pig Rider | `Enemy Pack/.../Pig Rider Spear Goblin/` | Hog Rider (building-only) | builder |
| Bomb Fish | `Enemy Pack/.../Bomb Fish/` | Wall Breakers (ground splash) | builder |
| Minotaur | `Enemy Pack/.../Minotaur/` | P.E.K.K.A | builder |
| Thief | `Enemy Pack/.../Thief/` | Bandit (first-hit ×2) | builder |
| Turtle | `Enemy Pack/.../Caveborn/Turtle/` | Ice Golem (death nova + slow) | builder |
| Panda | `Enemy Pack/.../Panda/` | Valkyrie (splash 2) | builder |
| Monk | `Units/*/Monk/` | Battle Healer (heal on attack + deploy) | builder |
| Bomb Tower | `Factions/Goblins/Buildings/Wood_Tower/` | Bomb Tower | excluded (`DECK_EXCLUDED_CARD_IDS`) |

**Enemy Pack wired (15 animated units):** Skull (×2 cards), Spear Goblin, Troll, Torch Goblin, Hex Shaman, Bomb (spell), Lizard, Pig Rider Spear Goblin, Bomb Fish, Minotaur, Gnoll, Thief, Turtle, Panda.

**Knights faction wired:** Warrior, Archer (×2 art lines), Pawn, Lancer, Monk.

**Backlog:** ~14 unused Enemy Pack animated folders + Goblin faction buildings/troops (Barrel, Dynamite, Cannon, etc.).

---

## Tier 1 — Best fits (remaining)

Full Idle/Run/Attack (or equivalent) sheets, a clear deck-role gap, and a portrait pick.

| Unused asset | CR reference | Elixir | Why |
|---|---|---:|---|
| **Harpoon Shark** | Hunter | 4 | Medium-range harpoon thrower. Portrait: `Harpoon Shark.png`; projectile: `Harpoon.png`. |
| **Barrel** (Goblin faction) | Goblin Barrel | 3 | Rolling barrel — spell or deployable. `Factions/Goblins/Troops/Barrel/`. |
| **Wood Tower** (already coded) | Bomb Tower | 4 | Fully wired; excluded via `DECK_EXCLUDED_CARD_IDS`. |

~~**Gnoll**~~ — done as Executioner (`gnoll` card).

---

## Tier 2 — Good fits (remaining)

Strong art/behavior match; more design or tuning work.

| Unused asset | CR reference | Elixir | Why |
|---|---|---:|---|
| **Gnome** | Goblins or Bats | 2 | Tiny, very fast hammer swipes — ground or air swarm. |
| **Bear** | Giant | 5 | Big slow melee — building-focused tank (distinct from wired Troll). |
| **Paddle Shark** | Barbarians | 5 | Oar melee rush; deploy ×2 like Barbarians. |
| **Spider** | Bats | 2 | Fast small attacker — cheap air swarm. Portrait: `Enemy Avatars_11.png`. |
| **Snake** | Bats (swarm) or Poison (spell) | 2–4 | No snake troop in CR; swarm or future poison spell. Portrait: `Enemy Avatars_07.png`. |
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

## Monk (`monk`) — Battle Healer L14

**Status:** Done (June 2026) · **Asset:** `Units/{Blue,Red} Units/Monk/` · **Portrait:** `Avatars_04.png` · **CR:** [Battle Healer](https://liquipedia.net/clashroyale/Battle_Healer) L14 · **Deck:** builder

| Stat | CR L14 | Tiny-Wars |
|---|---:|---|
| Elixir | 4 | `elixirCost: 4` |
| HP / Damage | 2274 / 196 | `maxHp` / `damage` |
| Hit speed | 1.5 s | `attackRate: 1 / 1.5` |
| Range | Melee Long (1.6) | `attackRange: 1.6` |
| Speed | Medium (60) | `CR_SPEED.medium` |
| Active heal | ~33.75 HP/pulse ×4, radius 4 | `healPerPulse: 34`, `healPulseCount: 4`, `healRadius: 4` |
| Spawn heal | ~66.75 HP/pulse ×4, radius 2.5 | `spawnHealPerPulse: 67`, `spawnHealPulseCount: 4`, `spawnHealRadius: 2.5` |

**Sheets:** `Idle` (6), `Run` (4), `Heal` (11, attack anim), `Heal_Effect` (11, VFX) · Blue/Red palettes · Test: `MonkHeal.test.ts`

---

## Unused clips on in-deck units

Polish opportunities, not new cards.

| In-deck unit | Unused sheets | Possible use |
|---|---|---|
| **Warrior** | `Warrior_Guard`, `Warrior_Attack2` | Knight shield / combo attack |
| **Lancer** | All `*_Defence` directional holds | Prince charge wind-up / Dark Prince shield |
| **Pawn** | Tool variants (Axe, Pickaxe, Wood, …) | RTS economy — poor CR fit unless reskinned |
| **Hex Shaman** | `Transformation Spell`, `Explosion Spell` | Witch skeleton spawn or second spell |
| **Skeletons** | `Skull_Guard.png` | Block pose only — unused |
| **Spear Goblins** | `Spear Goblin_Attack Strong.png` | Alternate wind-up throw — not wired (`Attack Fast` used) |
| **Turtle** | `Guard_In` / `Guard_Out` | Shell stance — not wired (Ice Golem has no guard in CR) |

---

## Suggested expansion order

Given current deck (knights + skeleton swarm + spells + enemy ranged):

1. ~~**Hog Rider** (Pig Rider)~~ — done
2. ~~**P.E.K.K.A** (Minotaur)~~ — done
3. ~~**Battle Healer** (Monk)~~ — done
4. ~~**Wall Breakers** (Bomb Fish)~~ — done
5. **Re-enable Bomb Tower** (Wood Tower) — building slot
6. ~~**Ice Golem** (Turtle)~~ — done
7. **Hunter** (Harpoon Shark) — ranged counter
8. **Spider** — portrait slot `_11` reserved

---

## Pawn sprites (two art lines)

| Sprite | Path | Suggested CR card | Notes |
|---|---|---|---|
| Hooded worker | `Units/*/Pawn/` | **Knight** (3) plain, or **Rascals** (5) knife variant | Not miner. `Avatars_05`. |
| Blonde soldier | `Factions/Knights/Troops/Pawn/Pawn_Blue.png` | **Royal Recruits** (7, ×2) | Swing combat anims; `Avatars_06` is **Thief** portrait, not this pawn. Barbarians reserved for Paddle Shark. |

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
| `Enemy Avatars_10.png` | `gnoll` | Executioner-style boomerang bone |
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
| **`Enemy Avatars_11.png`** | **Spider** | Bats swarm |
| `Enemy Avatars_14.png` | (verify art) | — |
| `Enemy Avatars_15.png` | Gnome | Goblins / cheap swarm |
| `Harpoon Shark.png` | Harpoon Shark | Hunter |
| `Paddle Shark.png` | Paddle Shark | Barbarians ×2 |

### Human Avatars — wired

| Portrait | Card |
|---|---|
| `Avatars_01.png` | Warrior |
| `Avatars_02.png` | Lancer |
| `Avatars_03.png` | Elite Archer |
| `Avatars_04.png` | Monk |
| `Avatars_05.png` | Pawn |

Knights Archer uses faction sprite (`Archer_Blue_(NoArms).png`), not the human avatar folder.

**Available for new knight cards:** any unused human avatar (e.g. `_07`, `_08`, `_09`, …).

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

## Recently wired reference cards

### Pig Rider (`pig_rider`) — Hog Rider L14

**Asset:** `Enemy Pack/.../Pig Rider Spear Goblin/` · **Portrait:** `Pig Rider.png` · **Deck:** builder

Building-only melee, very fast. `targetsBuildingsOnly: true`.

### Bomb Fish (`bomb_fish`) — Wall Breakers L14

**Asset:** `Enemy Pack/.../Bomb Fish/` · **Portrait:** `Bomb Fish.png` · **Deck:** builder

Ground-only ranged splash (`splashRadius: 1.5`). Uses wizard/lizard fireball VFX in battle.

### Minotaur (`minotaur`) — P.E.K.K.A L14

**Asset:** `Enemy Pack/.../Minotaur/` · **Portrait:** `Enemy Avatars_09.png` · **Deck:** builder

Slow heavy single-target melee.

### Thief (`thief`) — Bandit L14

**Asset:** `Enemy Pack/.../Thief/` · **Portrait:** `Enemy Avatars_06.png` · **Deck:** builder

Fast melee with opening dash (`dashRangeCells`, `firstHitDamageMultiplier: 2`).

### Turtle (`turtle`) — Ice Golem L14

**Asset:** `Enemy Pack/.../Caveborn/Turtle/` · **Portrait:** `Enemy Avatars_08.png` · **Deck:** builder

Building-only tank with death nova (`deathSplashRadius`, `deathSlowSpeedMultiplier`, `deathSlowDurationMs`). Test: `TurtleDeathNova.test.ts`.

### Panda (`panda`) — Valkyrie L14

**Asset:** `Enemy Pack/.../Panda/` · **Portrait:** `Enemy Avatars_12.png` · **Deck:** builder

Melee splash (`splashRadius: 2`).

### Skeletons (`skeleton`) — Skeletons L14

**Status:** Done · **Asset:** `Enemy Pack/.../Skull/` · **Portrait:** `Enemy Avatars_01.png` · **Deck:** default

×3 deploy, fast melee.

### Skeleton Army (`skeleton_army`) — Skeleton Army L14

**Status:** Done · **Asset:** `Enemy Pack/.../Skull/` (shared) · **Portrait:** clustered idle sprites (14) · **Deck:** builder

×14 deploy, same per-skeleton stats as `skeleton`. Spawns in a compact grid cluster.

### Spear Goblins (`spear_goblin`) — Spear Goblins L14

**Status:** Done · **Asset:** `Enemy Pack/.../Spear Goblin/` · **Portrait:** `Spear Goblin.png` · **Deck:** builder

×3 deploy, very fast ranged. `Attack Strong` not wired.

---

## Implementation notes

- Pull stats from the Java Clash Royale reference at **level 14** (`BALANCE_REFERENCE_LEVEL` in `GameConstants.ts`), same as existing cards in `CardData.ts`.
- Enemy Pack units with one palette: use `tintBotSide: true` (see Torch Goblin / Wizard).
- Knights faction units (Warrior, Pawn, Lancer, Monk): separate Blue/Red asset folders, no tint.
- Add bundle entry in `AssetManifest.ts`, card in `CardData.ts`, and tests in `AssetManifest.test.ts` / behavior tests as needed.
