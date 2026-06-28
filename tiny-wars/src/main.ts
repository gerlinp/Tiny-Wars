import Phaser from 'phaser'
import { gameConfig } from '@config/GameConfig'
import { clearTimeout as wtClearTimeout, setTimeout as wtSetTimeout } from 'worker-timers'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {})
}

// Replace native timers before Phaser starts so the game loop (forceSetTimeOut: true)
// uses worker-based scheduling. Worker threads are not subject to the browser's
// background-tab setTimeout throttle (~1s minimum), so the game keeps running at
// full speed when the player switches tabs or windows.
window.setTimeout   = wtSetTimeout   as typeof window.setTimeout
window.clearTimeout = wtClearTimeout as typeof window.clearTimeout

new Phaser.Game(gameConfig)
