import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT, GAME_TITLE } from './constants'

// 场景导入
import { BootScene, PreloadScene, TitleScene, BattleScene, HeroListScene, EquipmentScene, SaveScene, LevelSelectScene, SettlementScene } from '@/scenes'

// Phaser游戏配置
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,  // 自动选择渲染器（WebGL优先）
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',  // DOM容器ID
  title: GAME_TITLE,
  backgroundColor: '#1a1a2e',  // 深蓝色背景

  // 物理系统配置（暂时不需要）
  physics: {
    default: 'arcade',
    arcade: {
      debug: false  // 开发时可设置为true查看调试信息
    }
  },

  // 场景配置
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    HeroListScene,
    EquipmentScene,
    SaveScene,
    LevelSelectScene,
    SettlementScene,
    BattleScene
  ],

  // 渲染配置
  render: {
    pixelArt: false,  // 不使用像素艺术模式
    antialias: true
  },

  // 输入配置
  input: {
    mouse: true,
    touch: true,
    keyboard: true
  },

  // 音频配置（后续添加）
  audio: {
    disableWebAudio: false
  },

  // 性能配置
  fps: {
    target: 60,
    forceSetTimeOut: false
  }
}

export default gameConfig