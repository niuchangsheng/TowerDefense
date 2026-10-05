import { LevelConfig } from '@/types'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'

/**
 * 卷二 · 《樊城破八门》（15 波紧凑战役）
 * - 镇守五行统帅：曹仁（金 · 朔风凛冽）
 * - 必掉宿命神兵主材：【八门庚金铁】 -> 定向铸造马超本命神兵【虎头湛金枪】
 * - 必掉将魂：【金之将魂】
 */
export const level2Config: LevelConfig = {
  id: 'chapter1_level2',
  chapterId: 'chapter1',
  name: '卷二 · 樊城破八门（曹仁）',
  type: 'main',
  map: {
    path: [
      { x: 0, y: 300 },
      { x: 260, y: 300 },
      { x: 260, y: 180 },
      { x: 580, y: 180 },
      { x: 580, y: 460 },
      { x: 900, y: 460 },
      { x: 900, y: 300 },
      { x: 1280, y: 300 }
    ],
    spawnPoint: { x: 0, y: 300 },
    exitPoint: { x: 1280, y: 300 },
    deployableAreas: [
      { x: 280, y: 200, width: 280, height: 160 },
      { x: 600, y: 160, width: 280, height: 160 },
      { x: 600, y: 340, width: 280, height: 100 },
      { x: 920, y: 320, width: 240, height: 160 }
    ],
    terrainAreas: [
      { type: 'grass', area: { x: 0, y: 0, width: 1280, height: 720 } },
      { type: 'forest', area: { x: 100, y: 400, width: 150, height: 100 } },
      { type: 'river', area: { x: 700, y: 200, width: 100, height: 200 } }
    ],
    defaultTerrain: 'grass'
  },
  waves: EndlessModeManager.generateCampaign15Waves(
    'enemy_boss_zhangjiao',
    'enemy_boss_dongzhuo',
    'enemy_boss_caoren'
  ),
  rewards: {
    gold: 240,
    experience: 160
  },
  playerStartHealth: 20,
  playerStartCost: 20,
  playerMaxCost: 9999
}

/**
 * 卷三 · 《合淝威逍遥》（15 波紧凑战役）
 * - 镇守五行统帅：张辽（水 · 寒潮暴雪）
 * - 必掉宿命神兵主材：【逍遥寒泉玉】 -> 定向铸造赵云本命神兵【龙胆亮银枪】
 * - 必掉将魂：【水之将魂】
 */
export const level3Config: LevelConfig = {
  id: 'chapter1_level3',
  chapterId: 'chapter1',
  name: '卷三 · 合淝威逍遥（张辽）',
  type: 'main',
  map: {
    path: [
      { x: 0, y: 420 },
      { x: 220, y: 420 },
      { x: 220, y: 220 },
      { x: 500, y: 220 },
      { x: 500, y: 500 },
      { x: 780, y: 500 },
      { x: 780, y: 300 },
      { x: 1060, y: 300 },
      { x: 1060, y: 420 },
      { x: 1280, y: 420 }
    ],
    spawnPoint: { x: 0, y: 420 },
    exitPoint: { x: 1280, y: 420 },
    deployableAreas: [
      { x: 240, y: 240, width: 240, height: 160 },
      { x: 520, y: 120, width: 240, height: 160 },
      { x: 520, y: 320, width: 240, height: 160 },
      { x: 800, y: 320, width: 240, height: 160 }
    ],
    terrainAreas: [
      { type: 'grass', area: { x: 0, y: 0, width: 1280, height: 720 } },
      { type: 'mountain', area: { x: 500, y: 100, width: 200, height: 80 } },
      { type: 'river', area: { x: 860, y: 180, width: 120, height: 340 } }
    ],
    defaultTerrain: 'grass'
  },
  waves: EndlessModeManager.generateCampaign15Waves(
    'enemy_boss_caoren',
    'enemy_boss_lvbu',
    'enemy_boss_zhangliao'
  ),
  rewards: {
    gold: 280,
    experience: 180
  },
  playerStartHealth: 20,
  playerStartCost: 20,
  playerMaxCost: 9999
}

/**
 * 卷四 · 《焚城讨董卓》（15 波紧凑战役）
 * - 镇守五行统帅：董卓（土 · 黄沙漫天）
 * - 必掉宿命神兵主材：【西凉镇岳铜】 -> 定向铸造张飞本命神兵【丈八蛇矛】
 * - 必掉将魂：【土之将魂】
 */
export const level4Config: LevelConfig = {
  id: 'chapter1_level4',
  chapterId: 'chapter1',
  name: '卷四 · 焚城讨董卓（董卓）',
  type: 'main',
  map: {
    path: [
      { x: 0, y: 340 },
      { x: 260, y: 340 },
      { x: 260, y: 180 },
      { x: 540, y: 180 },
      { x: 540, y: 460 },
      { x: 820, y: 460 },
      { x: 820, y: 260 },
      { x: 1060, y: 260 },
      { x: 1060, y: 340 },
      { x: 1280, y: 340 }
    ],
    spawnPoint: { x: 0, y: 340 },
    exitPoint: { x: 1280, y: 340 },
    deployableAreas: [
      { x: 280, y: 200, width: 240, height: 160 },
      { x: 560, y: 160, width: 240, height: 160 },
      { x: 560, y: 340, width: 240, height: 100 },
      { x: 840, y: 280, width: 200, height: 160 }
    ],
    terrainAreas: [
      { type: 'grass', area: { x: 0, y: 0, width: 1280, height: 720 } },
      { type: 'mountain', area: { x: 280, y: 80, width: 280, height: 90 } }
    ],
    defaultTerrain: 'grass'
  },
  waves: EndlessModeManager.generateCampaign15Waves(
    'enemy_boss_zhangjiao',
    'enemy_boss_zhangliao',
    'enemy_boss_dongzhuo'
  ),
  rewards: {
    gold: 320,
    experience: 200
  },
  playerStartHealth: 20,
  playerStartCost: 20,
  playerMaxCost: 9999
}

/**
 * 卷五 · 《虎牢战温侯》（15 波紧凑战役）
 * - 镇守五行统帅：吕布（火 · 赤地焚风）
 * - 必掉宿命神兵主材：【赤兔焚天晶】 -> 定向铸造黄忠本命神兵【宝雕射日弓】
 * - 必掉将魂：【火之将魂】
 */
export const level5Config: LevelConfig = {
  id: 'chapter1_level5',
  chapterId: 'chapter1',
  name: '卷五 · 虎牢战温侯（吕布）',
  type: 'main',
  map: {
    path: [
      { x: 0, y: 380 },
      { x: 220, y: 380 },
      { x: 220, y: 180 },
      { x: 500, y: 180 },
      { x: 500, y: 460 },
      { x: 780, y: 460 },
      { x: 780, y: 260 },
      { x: 1060, y: 260 },
      { x: 1060, y: 380 },
      { x: 1280, y: 380 }
    ],
    spawnPoint: { x: 0, y: 380 },
    exitPoint: { x: 1280, y: 380 },
    deployableAreas: [
      { x: 240, y: 200, width: 240, height: 160 },
      { x: 520, y: 80, width: 240, height: 80 },
      { x: 520, y: 480, width: 240, height: 80 },
      { x: 800, y: 280, width: 240, height: 160 }
    ],
    terrainAreas: [
      { type: 'grass', area: { x: 0, y: 0, width: 1280, height: 720 } },
      { type: 'mountain', area: { x: 240, y: 70, width: 330, height: 100 } }
    ],
    defaultTerrain: 'grass'
  },
  waves: EndlessModeManager.generateCampaign15Waves(
    'enemy_boss_caoren',
    'enemy_boss_dongzhuo',
    'enemy_boss_lvbu'
  ),
  rewards: {
    gold: 400,
    experience: 250
  },
  playerStartHealth: 20,
  playerStartCost: 20,
  playerMaxCost: 9999
}

export default level2Config