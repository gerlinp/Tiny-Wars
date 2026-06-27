#!/usr/bin/env bash
# Baby Dragon — recolor leg/feet pixels to ground-shadow (#161C2E).
# Keeps all green body, tail, frill, yellow trim, and the purple underbelly.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LIZARD="$ROOT/public/assets/Enemy Pack/Enemies/Caveborn/Lizard"
SHADOW="#161C2E"

recolor_bottom_feet() {
  magick "$1" \
    -region 192x58+0+134 -fuzz 12% -fill "$SHADOW" -opaque "#693D5B" \
    -region 192x44+0+148 -fuzz 10% -fill "$SHADOW" -opaque "#FFFFFF" \
    -region 192x44+0+148 -fuzz 10% -fill "$SHADOW" -opaque "#FFED44" \
    "$1"
}

recolor_standing_legs() {
  magick "$1" \
    -region 24x32+76+105 -fuzz 8% -fill "$SHADOW" -opaque "#3CBE57" \
    -region 24x32+76+105 -fuzz 8% -fill "$SHADOW" -opaque "#4B867B" \
    -region 24x32+76+105 -fuzz 6% -fill "$SHADOW" -opaque "#FFFFFF" \
    -region 20x32+100+105 -fuzz 8% -fill "$SHADOW" -opaque "#3CBE57" \
    -region 20x32+100+105 -fuzz 8% -fill "$SHADOW" -opaque "#4B867B" \
    -region 20x32+100+105 -fuzz 6% -fill "$SHADOW" -opaque "#FFFFFF" \
    -region 20x32+100+105 -fuzz 10% -fill "$SHADOW" -opaque "#FFED44" \
    "$1"
}

recolor_idle_front_legs() {
  magick "$1" \
    -region 22x20+100+108 -fuzz 10% -fill "$SHADOW" -opaque "#FFED44" \
    "$1"
}

process_idle_frame() {
  local src="$1" dest="$2"
  cp "$src" "$dest"
  recolor_bottom_feet "$dest"
  recolor_idle_front_legs "$dest"
}

process_attack_frame() {
  local src="$1" dest="$2" idx="$3"
  cp "$src" "$dest"
  recolor_bottom_feet "$dest"
  if (( idx == 0 || idx == 1 || idx == 8 )); then
    recolor_standing_legs "$dest"
  fi
}

build_sheet() {
  local src="$1" dest="$2" count="$3" kind="$4"
  local tmp
  tmp="$(mktemp -d)"
  local frames=()
  local i x
  for ((i = 0; i < count; i++)); do
    x=$((i * 192))
    magick "$src" -crop 192x192+"${x}"+0 +repage "$tmp/in_$i.png"
    if [[ "$kind" == "idle" ]]; then
      process_idle_frame "$tmp/in_$i.png" "$tmp/out_$i.png"
    else
      process_attack_frame "$tmp/in_$i.png" "$tmp/out_$i.png" "$i"
    fi
    frames+=("$tmp/out_$i.png")
  done
  magick "${frames[@]}" +append "$dest"
  rm -rf "$tmp"
}

build_sheet "$LIZARD/Lizard_Idle.png"   "$LIZARD/Lizard_Idle_Flying.png"   7 idle
build_sheet "$LIZARD/Lizard_Attack.png" "$LIZARD/Lizard_Attack_Flying.png" 9 attack

echo "Wrote $LIZARD/Lizard_Idle_Flying.png and Lizard_Attack_Flying.png"
