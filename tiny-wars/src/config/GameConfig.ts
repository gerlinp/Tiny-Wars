import Phaser from 'phaser'
import { BootScene }     from '@scenes/BootScene'
import { PreloadScene }  from '@scenes/PreloadScene'
import { MainMenuScene } from '@scenes/MainMenuScene'
import { DeckBuilderScene } from '@scenes/DeckBuilderScene'
import { BattleScene }   from '@scenes/BattleScene'
import { UIScene }       from '@scenes/UIScene'
import { ResultScene }   from '@scenes/ResultScene'
import { GAME_WIDTH, CANVAS_HEIGHT } from '@data/GameConstants'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: CANVAS_HEIGHT,
  parent: 'app',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  fps: {
    target: 30,
    forceSetTimeOut: false,
  },
  scene: [BootScene, PreloadScene, MainMenuScene, DeckBuilderScene, BattleScene, UIScene, ResultScene],
}
