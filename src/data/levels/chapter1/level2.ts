import { LevelConfig } from '@/types'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'

/**
 * 卷二 · 威震虎牢（洛阳火海 · 15 波紧凑战役）
 * Wave 5 先锋统帅：张角（木·高血回血）
 * Wave 10 中军统帅：董卓（土·高韧高刚毅）
 * Wave 15 守关主帅：飞将无双 · 吕布（火·5格无双铁壁）
 */
export const level2Config: LevelConfig = {
  id: 'chapter1_level2',
  chapterId: 'chapter1',
  name: '卷二 · 威震虎牢（洛阳）',
  type: 'main',
  map: {
    path: [
      { x: 0, y: 300 },
      { x: 300, y: 300 },
      { x: 300, y: 150 },
      { x: 600, y: 150 },
      { x: 600, y: 450 },
      { x: 900, y: 450 },
      { x: 900, y: 300 },
      { x: 1280, y: 300 }
    ],
    spawnPoint: { x: 0, y: 300 },
    exitPoint: { x: 1280, y: 300 },
    deployableAreas: [
      { x: 160, y: 200, width: 120, height: 80 },
      { x: 360, y: 160, width: 200, height: 120 },
      { x: 480, y: 360, width: 120, height: 80 },
      { x: 760, y: 320, width: 120, height: 120 }
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
    'enemy_boss_lvbu'
  ),
  rewards: {
    gold: 260,
    experience: 160
  },
  playerStartHealth: 20,
  playerStartCost: 25,
  playerMaxCost: 9999
}

/**
 * 卷三 · 八门金锁（樊城之战 · 15 波紧凑战役）
 */
export const level3Config: LevelConfig = {
  id: 'chapter1_level3',
  chapterId: 'chapter1',
  name: '卷三 · 八门金锁（樊城）',
  type: 'main',
  map: {
    path: [
      { x: 0, y: 400 },
      { x: 200, y: 400 },
      { x: 200, y: 200 },
      { x: 400, y: 200 },
      { x: 400, y: 500 },
      { x: 700, y: 500 },
      { x: 700, y: 300 },
      { x: 1000, y: 300 },
      { x: 1280, y: 400 }
    ],
    spawnPoint: { x: 0, y: 400 },
    exitPoint: { x: 1280, y: 400 },
    deployableAreas: [
      { x: 80, y: 280, width: 120, height: 120 },
      { x: 240, y: 240, width: 120, height: 120 },
      { x: 480, y: 360, width: 160, height: 120 },
      { x: 800, y: 200, width: 160, height: 120 }
    ],
    terrainAreas: [
      { type: 'grass', area: { x: 0, y: 0, width: 1280, height: 720 } },
      { type: 'mountain', area: { x: 500, y: 100, width: 200, height: 80 } },
      { type: 'swamp', area: { x: 900, y: 400, width: 100, height: 100 } }
    ],
    defaultTerrain: 'grass'
  },
  waves: EndlessModeManager.generateCampaign15Waves(
    'enemy_boss_zhangliao',
    'enemy_boss_caoren',
    'enemy_boss_dongzhuo'
  ),
  rewards: {
    gold: 350,
    experience: 200
  },
  playerStartHealth: 20,
  playerStartCost: 25,
  playerMaxCost: 9999
}

export default level2Config