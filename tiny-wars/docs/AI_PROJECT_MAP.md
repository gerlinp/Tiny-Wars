# Game Project Map

## 1. Project Snapshot

- Tiny Wars is a browser/mobile real-time lane battler inspired by Clash Royale.
- Core loop: build/select an 8-card deck -> spend elixir -> deploy troops, buildings, or spells -> units march, target, fight, destroy towers -> crowns/end result.
- Engine/framework: Phaser 4.1, Vite, TypeScript 6, Vitest.
- Runtime entry: `src/main.ts` creates `new Phaser.Game(gameConfig)`.
- Scene config: `src/config/GameConfig.ts` targets 30 FPS and registers all scenes.
- Local run: from `tiny-wars/`, run `npm install` once, then `npm run dev`.
- Build: from `tiny-wars/`, run `npm run build`.
- Tests: from `tiny-wars/`, run `npm test`; focused tests live under `tests/`.
- Map editor sync: run `npm run sync:map-editor` after changing cards/assets used by the editor.
- Native wrappers: Capacitor dependencies and `capacitor.config.ts` exist, but browser/Vite is the main inspected flow.
- Networking: PeerJS data channels exchange deploy/rematch/name messages; there is no inspected authoritative server.
- Assets: source pack is in repo sibling `tiny-wars-assets/`; runtime manifests use an assets URL prefix.
- Development stage: Prototype/MVP likely, based on `0.0.0`, placeholder fallbacks, editor tooling, and many focused behavior tests; exact release status is Unknown / needs verification.

## 2. Repository Directory Map

```text
tiny-wars/
  package.json                 Scripts, Phaser/Vite/Vitest/PeerJS dependencies.
  vite.config.ts               Vite aliases and Vitest config. Add aliases here and in tsconfig together.
  tsconfig.json                Strict TypeScript and path aliases.
  capacitor.config.ts          Capacitor app wrapper config. Do not put gameplay logic here.
  index.html                   Browser host page for the Phaser game.

  public/                      Static files served by Vite.
    map.json                   Exported active arena/map config loaded by PreloadScene.
    map-editor.html            Standalone map/unit editor with generated sync blocks.
    layout-editor.html         Layout helper page.
    sw.js                      Service worker registered by src/main.ts.
    icons.svg, favicon.svg     Static UI/browser assets.

  scripts/                     Node/Vite tooling, not runtime game logic.
    syncMapEditorCatalog.ts    Regenerates map-editor generated blocks.
    mergeSpawnZones.ts         Map/spawn-zone utility.
    make-lizard-flying-sprites.sh Asset pipeline helper for lizard flying sprites.

  docs/                        Project documentation.
    unused-unit-cr-mapping.md  Card/art/reference mapping notes.
    AI_PROJECT_MAP.md          This guide. Update when architecture or recipes change.

  src/
    main.ts                    Browser entry; registers service worker and starts Phaser.
    config/                    Phaser game configuration only.
      GameConfig.ts            Canvas size, FPS, scenes list.

    scenes/                    Screen-level orchestration and Phaser input/render bridges.
      BootScene.ts             Minimal terrain preload, then PreloadScene.
      PreloadScene.ts          Loads map, assets, audio; registers animations; validates deck avatars.
      MainMenuScene.ts         Play/online/deck entry points and URL room auto-join.
      TransitionLoadingScene.ts Short loading screen before BattleScene.
      BattleScene.ts           Match scene: owns simulator, input controller, render pools, UI bridge.
      UIScene.ts               HUD scene: elixir, hand, timer, crowns, dev toggle.
      DeckBuilderScene.ts      Collection/deck UI and localStorage persistence.
      PvPLobbyScene.ts         PeerJS room/join/matchmaking UI.
      ResultScene.ts           Win/loss/rematch/menu flow.

    core/                      Pure or mostly pure gameplay simulation. Add behavior here, not in rendering.
      GameSimulator.ts         Match tick, tower placement, deploy validation/spawning.
      GameState.ts             Runtime state shape.
      types.ts                 Core enums, stats, card definitions, events.
      entities/                Runtime entity classes.
      DeploySystem.ts          Deploy zones, lane unlocks, spawn layouts.
      ElixirSystem.ts          Elixir generation and grants.
      CombatSystem.ts          Death cleanup, crowns, overtime, tiebreak.
      TargetSelection.ts       Shared sticky-target acquisition helpers.
      Movement.ts              World/grid movement helpers and bridge approach helpers.
      LaneMovement.ts          Lane march goals and Java-reference lane step logic.
      FlowField.ts             Per-goal Dijkstra flow field.
      FlowFieldManager.ts      One flow field per tower, tower objective selection.
      Pathfinder.ts            A* fallback for non-tower paths and blocked goals.
      EntityGeometry.ts        Hitboxes, combat radii, surface distances.
      AreaDamage.ts            Splash damage, heal, slow application.
      TroopCollision.ts        Collision resolution and ally push.
      TroopAvoidance.ts        Local ally avoidance and walkable clamping.
      AttackSlots.ts           Deterministic melee slot geometry.
      BoomerangSystem.ts       Gnoll projectile runtime state.
      HookSystem.ts            Harpoon Shark hook runtime state.
      BotAI.ts                 Solo opponent deploy decisions.
      PvPNetwork.ts            PeerJS message transport.

    data/                      Static game data and asset manifests. Prefer data-only changes here.
      CardData.ts              Card ids, stats, costs, deck visibility/default deck.
      CardAbilities.ts         Hardcoded special ability constants.
      GameConstants.ts         Grid, map, elixir, tower, movement constants.
      TowerData.ts             King/princess tower stats.
      AssetManifest.ts         Card sprites, avatars, effects, animation metadata.
      AudioManifest.ts         SFX definitions and card-to-SFX rules.
      MapConfig.ts             map.json interface.
      DefaultMapConfig.ts      Built-in fallback map config.
      ActiveMapConfig.ts       Loaded map config singleton.
      SpawnZones.ts            Painted/fallback deploy-zone maps.
      TerrainManifest.ts       Terrain texture metadata.
      PlayerDeck.ts            Deck and collection sort persistence.
      ProjectileConstants.ts   Projectile travel timing constants.
      BombTowerMeleeLayout.ts  Bomb tower melee slot layout.
      KingTowerMeleeLayout.ts  King tower melee slot layout.
      PrincessTowerMeleeLayout.ts Princess tower melee slot layout.
      CompositeAvatarLayout.ts Composite portrait layout data.

    input/                     Player input translated to gameplay requests.
      CardDeployController.ts  Card selection, aim preview, deploy call, PvP deploy callback.

    rendering/                 Phaser visuals only. Keep gameplay decisions out.
      EntitySprite.ts          Troop/building sprite, animation, health bar, composite sync.
      TowerSprite.ts           Crown tower visuals.
      TileMapRenderer.ts       Terrain drawing from TerrainMap.
      TerrainMap.ts            Terrain cell/type/autotile logic.
      AnimationRegistry.ts     Registers Phaser animations from manifests.
      ProjectilePools.ts       Visual projectile/effect pools.
      VFXPools.ts              Death, dust, heal, explosion pools.
      PlacementGhost.ts        Deploy preview.
      DeployZoneOverlay.ts     Deploy-zone highlight.
      HealthBar.ts             Entity/tower health bars.
      assetDisplaySize.ts      Visual scaling and combat/placement radius helpers.
      towerRenderPosition.ts   Tower render/combat anchor geometry.
      towerGarrison.ts         King/tower garrison visual constants.

    ui/                        Phaser HUD/menu/card UI components and layout helpers.
      CardHand.ts, CardSlot.ts In-match card hand.
      DeckCard.ts, DeckSlot.ts Deck builder cards/slots.
      CardInfoModal.ts         Card details modal.
      ElixirBar.ts             Elixir HUD.
      TimerDisplay.ts          Match timer HUD.
      CrownCounter.ts          Crown HUD.
      cardPortrait.ts          Card portrait composition.
      cardHandLayout.ts        Hand layout constants.
      loadingScreenUi.ts       Loading screen bar/timing helpers.
      loadingScreenUnit.ts     Loading screen animated unit.
      loadingScreenUnitPick.ts Loading screen unit selection.
      SceneButton.ts           Menu button helpers.

    audio/                     Runtime SFX playback/mixing.
      SoundManager.ts          Unlocks audio and plays categorized SFX.
      SfxMix.ts                Voice limiting, detune, volume rules.

    debug/                     Developer overlays/toggles.
      DevMode.ts               Dev mode flag.
      DevModeOverlay.ts        Debug rendering over match state.

    tools/                     Shared generators for public/map-editor.html.
      mapEditorCatalog.ts      Builds editor catalog and generated blocks from game data.
      mapEditorOverrides.ts    Editor-only labels/order/metadata.

  tests/                       Vitest coverage by system. Add behavior tests near the affected system.
    core/                      Simulation, movement, targeting, combat, deploy, abilities.
    data/                      Manifests, constants, deck persistence.
    rendering/                 Render helper/layout logic.
    ui/                        UI layout helpers.
    audio/                     SFX mix rules.
    tools/                     Map editor sync/catalog checks.

tiny-wars-assets/              Source art/audio pack at repo root. Do not add gameplay code here.
```

## 3. Architecture at a Glance

Startup:

`src/main.ts` -> `gameConfig` in `src/config/GameConfig.ts` -> `BootScene` -> `PreloadScene` -> `MainMenuScene`.

Scene flow:

`MainMenuScene` -> solo play uses `TransitionLoadingScene` -> `BattleScene` + launched `UIScene` -> `ResultScene`.

`MainMenuScene` -> `DeckBuilderScene` edits `PlayerDeck` localStorage -> back/play.

`MainMenuScene` -> `PvPLobbyScene` creates/joins `PvPNetwork` -> `TransitionLoadingScene` -> `BattleScene` with `pvpNetwork`.

Main match loop:

`BattleScene.update(delta)` -> `GameSimulator.tick(delta)` -> entities/towers tick -> collision/projectile systems -> deaths/crowns/time checks -> `BattleScene` consumes `GameState.events` for visuals/SFX -> sprites/tower/UI snapshots are synced.

Player input to gameplay:

`UIScene` card tap -> `BattleScene.uiScene.onCardSelected` -> `CardDeployController.selectCard` -> arena pointer down/move/up -> `GameSimulator.deployCard` -> `CardSystem.consumeCard` after success -> optional `PvPNetwork.sendDeploy`.

Gameplay systems:

Card definitions in `CardData.ts` feed `CardSystem`, `GameSimulator.deployCard`, deck builder UI, map editor catalog, and asset lookup.

Runtime state lives in `GameState`: entity/tower maps, elixir, crowns, phase, events, flow fields, active boomerangs, and active hooks. Rendering mirrors this state but does not own it.

Units/buildings/spells:

`GameSimulator.deployCard` creates `Troop`, `Building`, or `Spell` from `CardDefinition`. Troops own movement, targeting, attacks, and card-specific mechanics. Buildings own lifetime decay and attacks. Spells apply on delayed impact.

Movement/navigation:

Ground tower marching uses `FlowFieldManager` and `FlowField`; non-tower movement and recovery can use `Pathfinder`, `Movement`, `LaneMovement`, and `TroopAvoidance`. Air units bypass ground pathing.

Combat/targeting:

`Troop`, `Building`, and `Tower` use `TargetSelection.refreshStickyTarget` or local priority logic. Damage events are emitted into `GameState.events`; `CombatSystem.resolveDeaths` removes entities and handles crowns/king activation.

Assets:

`PreloadScene` loads `AssetManifest`, `TerrainManifest`, `AudioManifest`, tower images, map config, and UI assets. `AnimationRegistry` registers animations. `EntitySprite`, `TowerSprite`, `cardPortrait`, and projectile pools resolve loaded keys.

Multiplayer:

`PvPNetwork` sends `{ type: 'DEPLOY', cardId, gridPos, pos }`, `REMATCH`, and `HELLO` through PeerJS. Each client simulates locally. Opponent deploys are mirrored in `BattleScene` by Y coordinate (`GRID_ROWS - 1 - y`, `GAME_HEIGHT - y`). No full state synchronization, rollback, or server authority was found.

## 4. Source of Truth by System

| System | Source-of-truth files | Main responsibility | Do not duplicate / common mistake |
|---|---|---|---|
| Game startup/scenes | `src/main.ts`, `src/config/GameConfig.ts`, `src/scenes/BattleScene.ts`, `src/scenes/UIScene.ts` | Phaser boot, preload, menu, battle, UI, lobby, result flow. | Do not put simulation rules in scenes; `BattleScene` should orchestrate and render. |
| Match state/tick | `src/core/GameSimulator.ts`, `src/core/GameState.ts` | State creation, tower placement, ticking systems, deployment. | Do not create another match store in UI/rendering. |
| Data contracts | `src/core/types.ts` | Owners, card/entity types, stats, events, bot action shape. | Keep runtime-only state out of `CardDefinition`/`EntityStats` unless it is static data. |
| Unit spawning | `src/core/GameSimulator.ts`, `src/core/DeploySystem.ts`, `src/data/CardData.ts` | Validate deploys, spend elixir, create entities, spread swarms. | Do not spawn Phaser sprites directly as gameplay entities. |
| Unit movement | `src/core/entities/Troop.ts`, `src/core/FlowFieldManager.ts`, `src/core/Movement.ts`, `src/core/LaneMovement.ts`, `src/core/TroopAvoidance.ts` | Marching, chasing, bridge crossing, local avoidance, stuck recovery. | Do not regress smooth 360-degree movement to grid snapping. |
| Pathfinding/bridges/lanes | `src/core/FlowField.ts`, `src/core/FlowFieldManager.ts`, `src/core/Pathfinder.ts`, `src/data/GameConstants.ts`, `src/rendering/TerrainMap.ts` | Walkability, river/bridge routing, tower objective costs. | Do not update only visuals when changing bridges; update constants/map/pathing/tests too. |
| Targeting | `src/core/entities/Troop.ts`, `src/core/TargetSelection.ts`, `src/core/entities/Building.ts`, `src/core/entities/Tower.ts` | Sticky target retention, nearest valid enemy, tower activation rules. | Do not add a parallel targeting helper in rendering. |
| Combat/damage/death | `src/core/entities/Troop.ts`, `src/core/entities/Building.ts`, `src/core/entities/Tower.ts`, `src/core/entities/Spell.ts`, `src/core/AreaDamage.ts`, `src/core/CombatSystem.ts` | Attacks, splash, spells, heals/slows, death cleanup, crowns. | Do not apply gameplay damage from projectile visual callbacks. |
| Special abilities | `src/data/CardAbilities.ts`, `src/core/entities/Troop.ts`, `src/core/BoomerangSystem.ts`, `src/core/HookSystem.ts` | Card-specific mechanics: charge, dash, hook, boomerang, spawn minions, monk heal, chain damage. | Do not invent generic flags unless an existing pattern supports it. |
| Troop collision/slots | `src/core/TroopCollision.ts`, `src/core/TroopAvoidance.ts`, `src/core/AttackSlots.ts`, `src/core/EntityGeometry.ts` | Body separation, ally push, melee approach slots, combat radii. | Do not use sprite dimensions as gameplay hitboxes. |
| Cards/deck/hand | `src/data/CardData.ts`, `src/core/CardSystem.ts`, `src/data/PlayerDeck.ts`, `src/ui/CardHand.ts`, `src/scenes/DeckBuilderScene.ts` | Definitions, randomized hand cycle, persistence, deck builder. | Do not add a card only to UI; it must exist in `CARD_DEFINITIONS` and assets. |
| Elixir/resources | `src/core/ElixirSystem.ts`, `src/data/GameConstants.ts`, `src/core/GameSimulator.ts` | Regeneration, max/start values, elixir card grants, deploy spending. | Do not deduct elixir in `CardDeployController`; simulator owns spend-on-success. |
| Buildings/objectives | `src/core/entities/Building.ts`, `src/core/entities/Tower.ts`, `src/data/TowerData.ts`, `src/data/CardData.ts`, `src/rendering/TowerSprite.ts` | Crown towers, deployable building lifetime/combat/footprints. | Do not confuse tower entities with building cards. |
| UI/HUD | `src/scenes/UIScene.ts`, `src/ui/CardHand.ts`, `src/ui/CardSlot.ts`, `src/input/CardDeployController.ts` | Card selection, HUD, deck UI, overlays, modals. | Do not make UI mutate `GameState` directly. |
| Rendering/VFX | `src/rendering/EntitySprite.ts`, `src/rendering/ProjectilePools.ts`, `src/rendering/AnimationRegistry.ts`, `src/scenes/BattleScene.ts`, `src/data/AssetManifest.ts` | Sprites, animations, projectiles, health bars, terrain. | Visual projectile impacts should play effects/SFX, not decide damage. |
| Audio | `src/data/AudioManifest.ts`, `src/audio/SoundManager.ts`, `src/audio/SfxMix.ts` | SFX manifest, card-to-sound mapping, voice limits. | Add new SFX to the manifest and preload path, not directly in `BattleScene`. |
| Networking | `src/core/PvPNetwork.ts`, `src/scenes/PvPLobbyScene.ts`, `src/scenes/BattleScene.ts`, `src/scenes/ResultScene.ts` | PeerJS room/join/matchmaking, deploy/rematch/name messages. | Do not assume server authority or synced full state exists. |
| Asset configuration | `src/data/AssetManifest.ts`, `src/rendering/AnimationRegistry.ts`, `src/rendering/renderingUtils.ts`, `src/scenes/PreloadScene.ts` | Texture keys, avatars, sheets, animation registration, fallback rules. | Card-hand avatars must be explicit; never use placeholders for hand icons. |
| Map/config/editor | `src/data/MapConfig.ts`, `src/data/ActiveMapConfig.ts`, `src/data/DefaultMapConfig.ts`, `src/data/SpawnZones.ts`, `src/tools/mapEditorCatalog.ts`, `src/tools/mapEditorOverrides.ts`, `public/map-editor.html` | Load/export arena data, spawn zones, editor generated catalog. | Do not hand-edit generated blocks in `map-editor.html`. |
| Save/config data | `src/data/PlayerDeck.ts`, `public/map.json` | localStorage deck/sort; active map config. | Deck must remain exactly `DECK_SIZE` unique known card ids. |

## 5. Important Data Models and Contracts

### CardDefinition

Path: `src/core/types.ts`

Purpose: Static card contract consumed by gameplay, UI, assets, and tooling.

Important fields: `id`, `displayName`, `description`, `elixirCost`, `cardType`, `stats`, `spellStats`, `elixirGain`, `deployCount`, `textureKeyPlayer`, `textureKeyBot`, `addedAt`.

Created by: helper functions in `src/data/CardData.ts`, then exported as `CARD_DEFINITIONS`.

Read/changed by: `CardSystem`, `GameSimulator`, `DeckBuilderScene`, `PlayerDeck`, `AssetManifest`, map editor tooling, tests.

Constraints:

- Every card in `CARD_DEFINITIONS_BASE` must have a matching `CARD_ADDED_AT` entry.
- `DEFAULT_DECK` filters `DECK_EXCLUDED_CARD_IDS`; `COLLECTION_HIDDEN_CARD_IDS` hides internal spawn-only cards.
- `textureKeyPlayer`/`textureKeyBot` must match keys in `AssetManifest.ts`.

### EntityStats

Path: `src/core/types.ts`

Purpose: Static troop/building combat and movement stats.

Important fields: `maxHp`, `speed`, `damage`, `attackRate`, `attackRange`, `unitType`, `attackType`, optional `lifetimeMs`, `splashRadius`, `deathSplashRadius`, `targetsBuildingsOnly`, `targetPriority`, `suicideOnAttack`, `armorHp`, `pushWeight`.

Created by: `src/data/CardData.ts`.

Read/changed by: `Troop`, `Building`, combat helpers, UI/modal, editor catalog.

Constraints:

- Speeds are grid cells/sec; most cards use `crSpeedToCellsPerSec`.
- Runtime state such as cooldowns, targets, armor remaining, dash state, hooks, and minion timers belongs in entity/system classes, not here.

### SpellStats

Path: `src/core/types.ts`

Purpose: Static spell impact behavior.

Important fields: `damage`, `radius`, `duration`, `effect`, `groundOnly`, `delivery`, `spawnCardId`, `spawnCount`.

Created by: `src/data/CardData.ts`.

Read/changed by: `GameSimulator.deployCard`, `Spell`, `BattleScene` spell VFX branches.

Constraints:

- `delivery` controls visual flight timing in `GameSimulator`/`BattleScene`.
- Spawn spells require `spawnCardId` to point to a card with `stats`.

### GameState

Path: `src/core/GameState.ts`

Purpose: Authoritative runtime state for a match.

Important fields: `tick`, `elapsedMs`, `playerElixir`, `botElixir`, `playerCrowns`, `botCrowns`, `enemyLaneDeploy`, `entities`, `towers`, `events`, `phase`, `winner`, optional `flowFields`, `boomerangs`, `hooks`.

Created by: `createInitialGameState`, then owned by `GameSimulator`.

Read/changed by: entities, systems, `BattleScene`, UI snapshot creation, tests.

Constraints:

- Rendering consumes and clears `events`; do not use events as persistent state.
- `entities` contains troops/buildings/spells; `towers` contains crown towers.

### GameEvent

Path: `src/core/types.ts`

Purpose: Simulation-to-render/audio event stream.

Important variants: `DEPLOY`, `SPELL_CAST`, `SPELL_IMPACT`, `DAMAGE`, `HEAL`, `HEAL_AURA`, `BOOMERANG`, `HOOK`, `DEATH`, `CROWN_LOST`.

Created by: `GameSimulator`, `Troop`, `Building`, `Tower`, `Spell`, `AreaDamage`, `CombatSystem`, `BoomerangSystem`, `HookSystem`.

Read/changed by: `BattleScene`.

Constraints:

- Events should describe what happened in simulation; gameplay effects must already be applied before render callbacks run.

### CardAssetBundle

Path: `src/data/AssetManifest.ts`

Purpose: Per-card textures, animation clips, card-hand avatars, composite settings, footprints.

Important fields: `cardId`, `avatar`, `avatarBackdrop`, `animated`, `contentFill`, `footprintWidthRatio`, `footprintHeightRatio`, `attackHitFrame`, `tintBotSide`, `editorSpritePath`, `avatarHandScale`, `avatarCropRatio`, `avatarFocusY`, `avatarBuildingFit`, plus `player`/`bot` side assets.

Created by: `CARD_ASSET_BUNDLES` in `AssetManifest.ts`.

Read/changed by: `PreloadScene`, `AnimationRegistry`, `EntitySprite`, `cardPortrait`, `assetDisplaySize`, map editor tooling, tests.

Constraints:

- Every deck card needs an explicit `avatar`; `PreloadScene` validates `DEFAULT_DECK`.
- Runtime-generated/palette-swapped textures use empty `path` sentinels and `editorSpritePath` for editor fallback.

### HandState

Path: `src/core/CardSystem.ts`

Purpose: UI-safe view of current hand cycle.

Important fields: `hand`, `nextCard`, `selectedIndex`.

Created by: `CardSystem.snapshot`.

Read/changed by: `UIScene`, `CardHand`, `CardDeployController`.

Constraints:

- `CardSystem.consumeCard` is called only after successful deploy.
- Deck ids must be unique; constructor throws on duplicates or unknown ids.

### MapConfig

Path: `src/data/MapConfig.ts`

Purpose: Shape of `public/map.json` and built-in fallback map data.

Important fields: `version`, river rows, bridge columns, tower rows/cols, deploy row bounds, `spawnZones`, `terrainOverrides`, `decorations`, tower health/visual offsets.

Created by: `public/map.json`, `DefaultMapConfig`, map editor.

Read/changed by: `PreloadScene`, `ActiveMapConfig`, `GameSimulator`, `TerrainMap`, `SpawnZones`, rendering layers.

Constraints:

- `PreloadScene` falls back to `DEFAULT_MAP_CONFIG` when `map.json` fails.
- Changing map geometry may require updates to constants, render, deploy, and pathing tests.

### PvPMessage

Path: `src/core/PvPNetwork.ts`

Purpose: PeerJS data-channel message contract.

Important variants: `READY`, `DEPLOY`, `REMATCH`, `HELLO`.

Created by: `PvPNetwork.sendDeploy`, `sendRematch`, connection setup.

Read/changed by: `PvPNetwork`, `PvPLobbyScene`, `BattleScene`, `ResultScene`.

Constraints:

- `DEPLOY` carries both `gridPos` and optional precise `pos`; PvP mirror logic in `BattleScene` depends on both for determinism.
- `READY` exists in the type but no inspected handler uses it; Unknown / needs verification before extending.

## 6. Common Change Recipes

### Recipe: Add a new troop card

Likely files:

- `src/data/CardData.ts`
- `src/data/AssetManifest.ts`
- `src/data/CardAbilities.ts` if it has special mechanics
- `src/rendering/AnimationRegistry.ts` only if it needs new VFX registration
- `src/scenes/BattleScene.ts` only if it needs custom projectile/VFX/audio routing
- `src/tools/mapEditorOverrides.ts` if it should have editor order/labels/metadata
- `tests/data/AssetManifest.test.ts`, plus a focused test under `tests/core/`

Steps:

1. Copy the closest `troop(...)` entry in `CARD_DEFINITIONS_BASE`.
2. Add a stable `CARD_ADDED_AT` entry.
3. Set `EntityStats`; use `crSpeedToCellsPerSec` for movement.
4. Add or confirm `deployCount`.
5. Add a matching `CardAssetBundle` in `AssetManifest.ts` with player/bot side assets and explicit card-hand `avatar`.
6. Add ability constants and `Troop` logic only if existing generic fields cannot express the mechanic.
7. Add editor ordering in `MAP_EDITOR_CATALOG_ORDER` if needed.
8. Run `npm run sync:map-editor`.
9. Add/adjust tests.

Existing examples to copy:

- Basic melee: `warrior`
- Swarm: `skeleton`, `skeleton_army`, `villagers`
- Ranged: `archer`, `elite_archer`
- Building-only: `troll`, `pig_rider`, `pig`, `air_boat`
- Special mechanics: `lancer`, `thief`, `gnoll`, `monk`, `harpoon_shark`, `spider`, `voodoo_shaman`

Validate:

- Card appears in deck builder and hand.
- Cost deducts once and card cycles once.
- Correct spawn count and spread.
- Unit acquires targets, crosses bridges, attacks, dies, and cleans up.
- Asset tests pass and no card avatar fallback is used.
- `npm test`; run `npm run build` if imports/types changed.

Common breakage:

- Missing `CARD_ADDED_AT`.
- Missing explicit avatar.
- Card id in `CardData` not matching `AssetManifest`.
- Adding damage in VFX callbacks instead of simulation.
- Forgetting map editor sync.

### Recipe: Add a new spell card

Likely files:

- `src/data/CardData.ts`
- `src/data/AssetManifest.ts`
- `src/core/entities/Spell.ts`
- `src/scenes/BattleScene.ts`
- `src/data/ProjectileConstants.ts`
- `tests/core/entities/Spell.test.ts`

Steps:

1. Copy `arrows`, `tnt`, or `goblin_barrel` in `CardData.ts`.
2. Define `SpellStats`, especially `delivery`, `groundOnly`, and optional spawn fields.
3. Add asset/avatar definitions in `AssetManifest.ts`.
4. If visual delivery differs from existing `arrows` or `rocket`, add timing constants and a `BattleScene` event branch.
5. If impact behavior differs from damage/spawn, extend `Spell.apply` with a focused test.

Validate:

- Spell can be played in legal zones.
- Elixir is spent once.
- Visual impact timing matches actual damage timing.
- Ground-only and tower radius checks behave correctly.
- Spawned troops use correct count and positions.

Common breakage:

- Visual projectile reaches before/after simulation impact.
- Spawn spell points to hidden/missing card stats.
- Forgetting tower surface-distance checks.

### Recipe: Change unit stats or deck availability

Likely files:

- `src/data/CardData.ts`
- `src/data/PlayerDeck.ts` if deck size/sort/persistence changes
- `src/tools/mapEditorOverrides.ts` and `public/map-editor.html` sync if editor-visible
- Existing focused tests in `tests/core/` or `tests/data/`

Steps:

1. Edit the card entry in `CARD_DEFINITIONS_BASE`.
2. Keep `CARD_ADDED_AT` stable for existing ids.
3. Use `DECK_EXCLUDED_CARD_IDS` for temporary match exclusion.
4. Use `COLLECTION_HIDDEN_CARD_IDS` for internal spawn-only cards.
5. Run `npm run sync:map-editor` if stats/order/editor data changed.

Validate:

- Deck builder still loads valid 8-card decks.
- `PlayerDeck` migrations still accept old saved ids if needed.
- Tests for affected behavior pass.

Common breakage:

- Renaming a card id without localStorage migration.
- Changing stats but not tests that encode behavior.

### Recipe: Change targeting priority

Likely files:

- `src/core/types.ts`
- `src/core/entities/Troop.ts`
- `src/core/TargetSelection.ts`
- `src/core/entities/Building.ts`
- `src/core/entities/Tower.ts`
- `tests/core/TargetSelection.test.ts`
- `tests/core/TroopTargeting.test.ts`

Steps:

1. Read current `DEFAULT_TARGET_PRIORITY` and `Troop.refreshCombatTarget`.
2. Decide whether the change is troop-only, building-only, tower-only, or shared sticky targeting.
3. Prefer adding static card data (`targetPriority`, `targetsBuildingsOnly`) only when it truly belongs to card config.
4. Update the smallest target acquisition function.
5. Add a focused test for acquisition and sticky retention.

Validate:

- King towers remain invalid until active.
- Building-only troops ignore enemy troops.
- Troops do not oscillate between targets every tick.

Common breakage:

- Bypassing `isAttackableTower`.
- Making towers use troop-specific priority.
- Forgetting target retention in `refreshStickyTarget`.

### Recipe: Fix movement, bridge traversal, or collision

Likely files:

- `src/core/entities/Troop.ts`
- `src/core/Movement.ts`
- `src/core/LaneMovement.ts`
- `src/core/FlowField.ts`
- `src/core/FlowFieldManager.ts`
- `src/core/Pathfinder.ts`
- `src/core/TroopAvoidance.ts`
- `src/core/TroopCollision.ts`
- `src/data/GameConstants.ts`
- Tests: `tests/core/Movement.test.ts`, `tests/core/LaneMovement.test.ts`, `tests/core/BridgeFunnel.test.ts`, `tests/core/Pathfinder.test.ts`, `tests/core/TroopAvoidance.test.ts`, `tests/core/TroopCollision.test.ts`

Steps:

1. Consult the Java reference for gameplay movement/pathing behavior before changing rules.
2. Identify whether the bug is tower march, target chase, river walkability, local avoidance, collision, or stuck recovery.
3. Change the narrowest helper or `Troop` branch.
4. Preserve smooth `moveTowardDirect`/flow-field movement unless explicitly asked to change it.
5. Add a regression test for the stuck/crossing/combat scenario.

Validate:

- Ground units cross bridges and do not enter water.
- Air units ignore ground pathing as intended.
- Melee swarms do not accordion, hard block, or drift off bridges.
- Units can still chase acquired targets.

Common breakage:

- Fixing terrain render but not grid walkability.
- Using sprite bounds as collision geometry.
- Removing intentional Tiny-Wars deviations from the Java reference.

### Recipe: Add or change a building

Likely files:

- `src/data/CardData.ts`
- `src/core/entities/Building.ts`
- `src/data/GameConstants.ts`
- `src/data/AssetManifest.ts`
- `src/rendering/EntitySprite.ts`
- `src/rendering/assetDisplaySize.ts`
- `tests/core/Building.test.ts`
- `tests/core/BuildingCombat.test.ts`

Steps:

1. Copy `wood_tower` if the new building attacks and has lifetime decay.
2. Set `CardType.BUILDING` stats including `lifetimeMs`, `attackRange`, `attackType`, optional splash/death splash.
3. Confirm footprint logic in `Building` and `buildingBlockedCells` applies.
4. Add asset bundle and optional composite rendering.
5. Rebuild flow fields when placed/dead remains through `GameSimulator`.

Validate:

- Building snaps to cell center.
- Blocks/unblocks grid cells.
- Decays over lifetime and death splash applies once.
- Flow fields update after placement and death.

Common breakage:

- Letting precise pointer position place buildings off-grid.
- Forgetting to unblock pathing cells.
- Adding tower behavior to building card logic.

### Recipe: Change elixir/resource generation

Likely files:

- `src/core/ElixirSystem.ts`
- `src/data/GameConstants.ts`
- `src/core/GameSimulator.ts`
- `tests/core/ElixirSystem.test.ts`
- `tests/core/GameSimulator.test.ts`

Steps:

1. Change regen constants in `GameConstants.ts` or phase logic in `ElixirSystem.ts`.
2. Keep spend-on-success in `GameSimulator.deployCard`.
3. Update tests for battle/overtime/tiebreak rates and max cap.

Validate:

- Elixir never exceeds `ELIXIR_MAX`.
- Failed deploy does not spend.
- Elixir card grants cap correctly.

Common breakage:

- Duplicating spend in input/UI.
- Resetting fractional accumulators incorrectly.

### Recipe: Add animation, projectile visual, or sound

Likely files:

- `src/data/AssetManifest.ts`
- `src/rendering/AnimationRegistry.ts`
- `src/rendering/EntitySprite.ts`
- `src/rendering/ProjectilePools.ts`
- `src/data/ProjectileConstants.ts`
- `src/data/AudioManifest.ts`
- `src/audio/SoundManager.ts`
- `src/scenes/PreloadScene.ts`
- `tests/data/AudioManifest.test.ts`
- `tests/data/AssetManifest.test.ts`

Steps:

1. Add manifest entries and preload them in `PreloadScene` if not covered by existing manifest iteration.
2. Register animations in `AnimationRegistry`.
3. Route render-only VFX/SFX from `BattleScene` events.
4. Add SFX mapping in `AudioManifest`; expose through `SoundManager` if a new category is needed.

Validate:

- Asset key exists before use.
- Missing in-map textures may use placeholders, but card-hand avatars may not.
- Effects do not apply gameplay damage.

Common breakage:

- Adding a loaded texture but not registering its animation.
- Referencing a runtime URL path not available in Vite output.

### Recipe: Add or change a map, lane, bridge, or spawn zone

Likely files:

- `public/map.json`
- `public/map-editor.html`
- `src/data/MapConfig.ts`
- `src/data/DefaultMapConfig.ts`
- `src/data/SpawnZones.ts`
- `src/data/GameConstants.ts`
- `src/rendering/TerrainMap.ts`
- `src/rendering/TileMapRenderer.ts`
- `src/core/DeploySystem.ts`
- `src/core/FlowFieldManager.ts`
- `scripts/syncMapEditorCatalog.ts`
- `tests/data/SpawnZones.test.ts`
- `tests/rendering/TerrainMap.test.ts`
- movement/deploy tests in `tests/core/`

Steps:

1. Decide whether the change belongs in static constants, `public/map.json`, or editor-generated blocks.
2. Update `MapConfig` only when the JSON shape changes.
3. Keep terrain visuals, grid walkability, deploy zones, and bridge columns consistent.
4. If editor constants/catalog are affected, run `npm run sync:map-editor`.
5. Add tests for spawn zones and pathing.

Validate:

- `PreloadScene` can load `map.json` and fallback config still works.
- Deploy overlay matches deploy validation.
- Ground units route through bridges.

Common breakage:

- Editing generated blocks by hand.
- Changing bridge visuals without updating pathing constants.

### Recipe: Add a multiplayer message or synced field

Likely files:

- `src/core/PvPNetwork.ts`
- `src/scenes/PvPLobbyScene.ts`
- `src/scenes/BattleScene.ts`
- `src/scenes/ResultScene.ts`
- `tests/core/PvPNetwork.test.ts`

Steps:

1. Extend `PvPMessage`.
2. Add send and receive handling in `PvPNetwork.setupConn`.
3. Decide which scene owns the callback.
4. Keep deterministic deploy mirroring if gameplay state is affected.
5. Add/extend network tests with the PeerJS stub.

Validate:

- Host and guest both handle message order.
- Disconnect still ends/cleans up correctly.
- No assumption of server authority is introduced.

Common breakage:

- Adding local-only state that diverges between peers.
- Forgetting Y-coordinate mirroring for opponent gameplay actions.

## 7. Existing Design Decisions to Preserve

### Decision: Simulation Owns Gameplay, Scenes Own Presentation

Current approach:

`GameSimulator` and entity/system classes mutate `GameState`; `BattleScene` handles Phaser input, visuals, audio, and UI snapshots.

Why it exists:

This keeps behavior testable in Vitest without Phaser and lets rendering consume `GameEvent`s.

Do not change unless:

There is a deliberate architecture change with tests covering simulation and rendering boundaries.

### Decision: Smooth Movement With Lane/Flow Guidance

Current approach:

Tiny-Wars uses continuous world-space movement (`moveTowardDirect`, local avoidance, flow fields) while preserving lane/bridge goals.

Why it exists:

Workspace rules and comments document this as an intentional deviation from the Java grid-step reference.

Do not change unless:

The user explicitly asks to replace smooth movement; otherwise consult Java only to understand intended rules.

### Decision: Card Data Plus Explicit Asset Manifest

Current approach:

`CardData.ts` defines gameplay stats/costs, while `AssetManifest.ts` defines sprite sheets, animations, portraits, and visual metadata.

Why it exists:

Gameplay data is shared by sim/UI/tooling; asset definitions are consumed by preload/render/editor tests.

Do not change unless:

A new source-of-truth plan replaces both and updates tests/tooling.

### Decision: Card-Hand Avatars Never Placeholder

Current approach:

`getCardAvatarDef`, `cardAvatarKey`, `resolveCardAvatar`, and `PreloadScene` validate explicit card portraits.

Why it exists:

The card UI must show dedicated portraits, not in-map fallback textures.

Do not change unless:

A human selects a new portrait source for a card.

### Decision: PvP Syncs Actions, Not Full State

Current approach:

PeerJS sends deploy/rematch/name messages; both clients run local simulation and mirror opponent deploy coordinates.

Why it exists:

Simple online play without a server.

Do not change unless:

Adding authoritative server, rollback, or state reconciliation intentionally.

### Decision: Map Editor Generated Blocks Are Tool-Owned

Current approach:

`scripts/syncMapEditorCatalog.ts` writes marked generated blocks in `public/map-editor.html` from `src/tools/mapEditorCatalog.ts`.

Why it exists:

Game data and editor catalog must stay aligned.

Do not change unless:

The editor sync format itself is being redesigned.

## 8. Current Known Gaps, Risks, and TODOs

- `src/core/PvPNetwork.ts`: `READY` exists in `PvPMessage` but no inspected handler uses it. Confidence: high.
- `src/core/PvPNetwork.ts` and `src/scenes/BattleScene.ts`: PvP has no full state sync, authority, rollback, or desync detection. Confidence: high.
- `src/data/CardData.ts`: `wood_tower` is kept in code but excluded from match decks by `DECK_EXCLUDED_CARD_IDS` with comment "card/building code kept for when bugs are fixed." Confidence: high.
- `src/core/Pathfinder.ts`: A* still exists as fallback even though `FlowFieldManager` is primary for tower march navigation. This is not necessarily dead code. Confidence: medium.
- `src/rendering/TntPool.ts`: standalone `TntPool` appears duplicated; `BattleScene` imports `TntPool` from `src/rendering/ProjectilePools.ts`, not this file. Confidence: high.
- `src/data/GameConstants.ts`: `TROOP_COLLISION_WIDTH_RATIO` and `TROOP_COLLISION_HEIGHT_RATIO` are deprecated and used only for building footprint sizing in `assetDisplaySize`. Confidence: high.
- `src/core/HookSystem.ts`: `hookVisualTargets` is deprecated; use `hookRopeEndPosition`/`hookAnchorPosition`. Confidence: high.
- `src/core/DeploySystem.ts`: `troopDeployPortraitOffsets` is deprecated; use `troopSwarmPortraitLayout`. Confidence: high.
- `src/data/TerrainManifest.ts`: `TERRAIN_GRASS` is a deprecated alias; renderer uses `TERRAIN_COLOR1`. Confidence: high.
- `src/rendering/ProjectilePools.ts`, `src/rendering/EntitySprite.ts`, `src/rendering/TntPool.ts`, `src/rendering/PlacementGhost.ts`: in-map visuals may fall back to placeholder textures. This is allowed for map sprites but not card-hand avatars. Confidence: high.
- `src/scenes/PreloadScene.ts`: runtime asset URLs use an assets URL prefix, while inspected physical source pack is `tiny-wars-assets/` at repo root. The exact copy/symlink/deploy pipeline for assets is Unknown / needs verification.
- `docs/unused-unit-cr-mapping.md`: appears stale in places, including "Currently wired (25 cards)" while `CardData.ts` now defines more card ids. Confidence: high.
- `public/map-editor.html`: large hand-maintained editor with generated blocks. Fragile if edited manually outside markers. Confidence: high.

## 9. Fast Navigation Index

| I need to... | Start here |
|---|---|
| Start/run/build/test the game | `package.json` |
| Understand scene flow | `src/config/GameConfig.ts`, `src/scenes/MainMenuScene.ts` |
| Change match tick/deploy spawning | `src/core/GameSimulator.ts` |
| Add or tune a card | `src/data/CardData.ts` |
| Add card sprites or avatars | `src/data/AssetManifest.ts` |
| Change special unit ability constants | `src/data/CardAbilities.ts` |
| Change unit movement | `src/core/entities/Troop.ts`, `src/core/Movement.ts` |
| Change bridge/lane behavior | `src/core/LaneMovement.ts`, `src/data/GameConstants.ts` |
| Change tower march pathing | `src/core/FlowFieldManager.ts`, `src/core/FlowField.ts` |
| Change target acquisition | `src/core/entities/Troop.ts`, `src/core/TargetSelection.ts` |
| Change damage/death/crowns | `src/core/CombatSystem.ts`, `src/core/AreaDamage.ts` |
| Change spells | `src/core/entities/Spell.ts`, `src/data/CardData.ts` |
| Change elixir | `src/core/ElixirSystem.ts`, `src/data/GameConstants.ts` |
| Change deploy zones | `src/core/DeploySystem.ts`, `src/data/SpawnZones.ts` |
| Change map terrain/rendering | `src/rendering/TerrainMap.ts`, `src/rendering/TileMapRenderer.ts` |
| Change deck persistence | `src/data/PlayerDeck.ts` |
| Change hand/HUD UI | `src/scenes/UIScene.ts`, `src/ui/CardHand.ts` |
| Change deck builder | `src/scenes/DeckBuilderScene.ts` |
| Change projectile visuals | `src/scenes/BattleScene.ts`, `src/rendering/ProjectilePools.ts` |
| Change animation registration | `src/rendering/AnimationRegistry.ts` |
| Change SFX | `src/data/AudioManifest.ts`, `src/audio/SoundManager.ts` |
| Change PvP messages | `src/core/PvPNetwork.ts` |
| Change map editor catalog | `src/tools/mapEditorCatalog.ts`, `src/tools/mapEditorOverrides.ts`, `scripts/syncMapEditorCatalog.ts` |
| Debug current match state visually | `src/debug/DevModeOverlay.ts` |

## 10. Instructions for Future LLMs

Read this file first.

For a focused task, inspect only the files named in the relevant recipe or navigation entry before expanding scope.

Do not create a second system when one already exists.

Do not refactor unrelated code while completing a focused gameplay task.

Preserve existing naming, data flow, and authority boundaries.

Update this document whenever a change affects architecture, file locations, data contracts, or implementation recipes.

When uncertain, identify the smallest source-of-truth file and trace outward from it.
