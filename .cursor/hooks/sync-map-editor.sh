#!/usr/bin/env bash
# Regenerates public/map-editor.html catalog when game source files change.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.file_path // .path // empty')

if [[ -z "$file_path" ]]; then
  echo '{}'
  exit 0
fi

# Normalize to forward slashes for matching
norm="${file_path//\\//}"

should_sync=false
if [[ "$norm" == *"/tiny-wars/src/data/"* ]]; then should_sync=true; fi
if [[ "$norm" == *"/tiny-wars/src/tools/mapEditor"* ]]; then should_sync=true; fi
if [[ "$norm" == *"/tiny-wars/src/rendering/towerGarrison.ts" ]]; then should_sync=true; fi
if [[ "$norm" == *"/tiny-wars/src/rendering/BombTowerCannon.ts" ]]; then should_sync=true; fi

if [[ "$should_sync" != true ]]; then
  echo '{}'
  exit 0
fi

root="$(cd "$(dirname "$0")/../.." && pwd)"

if ! (cd "$root/tiny-wars" && npm run sync:map-editor); then
  echo '{"additional_context":"Map editor sync failed (npm run sync:map-editor). Fix errors and re-run sync before finishing."}'
  exit 0
fi

echo '{"additional_context":"Ran npm run sync:map-editor — public/map-editor.html catalog block was regenerated from CardData/AssetManifest. If you edited display order or editor-only labels, update src/tools/mapEditorOverrides.ts."}'
exit 0
