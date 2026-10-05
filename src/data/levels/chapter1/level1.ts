import { LevelConfig } from '@/types'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'

/**
 * 卷一 · 《巨鹿破黄巾》（15 波紧凑战役）
 * - 镇守五行统帅：张角（木 · 梅雨瘴林）
 * - 必掉宿命神兵主材：【太平青木髓】 -> 定向铸造关羽本命神兵【青龙偃月刀】
 * - 必掉将魂：【木之将魂】
 */
export const level1Config: LevelConfig = {
  id: 'chapter1_level1',
  chapterId: 'chapter1',
  name: '卷一 · 巨鹿破黄巾（张角）',
  type: 'main',
  map: {
    path: [
      { x: 0, y: 380 },       // 入场（第9行左缘）
      { x: 220, y: 380 },     // (col 5, row 9)
      { x: 220, y: 180 },     // (col 5, row 4)
      { x: 500, y: 180 },     // (col 12, row 4)
      { x: 500, y: 460 },     // (col 12, row 11)
      { x: 780, y: 460 },     // (col 19, row 11)
      { x: 780, y: 260 },     // (col 19, row 6)
      { x: 1060, y: 260 },    // (col 26, row 6)
      { x: 1060, y: 380 },    // (col 26, row 9)
      { x: 1280, y: 380 }     // 出场（第9行右缘）
    ],
    spawnPoint: { x: 0, y: 380 },
    exitPoint: { x: 1280, y: 380 },
    deployableAreas: [
      { x: 240, y: 200, width: 240, height: 160 },  // 格(6-11,5-8)：24格
      { x: 520, y: 80, width: 240, height: 80 },    // 格(13-18,2-3)：12格
      { x: 520, y: 480, width: 240, height: 80 },   // 格(13-18,12-13)：12格
      { x: 800, y: 280, width: 240, height: 160 }   // 格(20-25,7-10)：24格
    ],
    terrainAreas: [
      { type: 'grass', area: { x: 0, y: 0, width: 1280, height: 720 } },
      { type: 'mountain', area: { x: 240, y: 70, width: 330, height: 100 } },
      { type: 'river', area: { x: 850, y: 150, width: 95, height: 390 } },
      { type: 'forest', area: { x: 40, y: 460, width: 220, height: 130 } }
    ],
    defaultTerrain: 'grass'
  },
  waves: EndlessModeManager.generateCampaign15Waves(
    'enemy_boss_caoren',
    'enemy_boss_zhangliao',
    'enemy_boss_zhangjiao'
  ),
  rewards: {
    gold: 200,
    experience: 150
  },
  playerStartHealth: 20,
  playerStartCost: 20,
  playerMaxCost: 9999
}

export default level1Config