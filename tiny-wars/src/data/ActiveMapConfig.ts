import type { MapConfig } from './MapConfig'

let _config: MapConfig | null = null

export function setActiveMapConfig(c: MapConfig): void {
  _config = c
}

export function getActiveMapConfig(): MapConfig | null {
  return _config
}
