import { LevelConfig } from '@/types'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'

/**
 * 卷一 · 苍天已死（广宗之战 · 15 波紧凑战役）
 * Wave 5 先锋统帅：曹仁（金·高护甲）
 * Wave 10 中军统帅：张辽（水·高移速）
 * Wave 15 守关主帅：天公将军 · 张角（木·高血回血，晴空朗日公平决战）
 */
export const level1Config: LevelConfig = {
  id: 'chapter1_level1',
  chapterId: 'chapter1',
  name: '卷一 · 苍天已死（广宗）',
  type: 'main',
  map: {
    // 格子化路径：内部航点全部对齐 40px 格子中心（cellCenter），
    // 轴对齐折线，首尾为出屏点。敌人仍沿折线连续移动。
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
    // 部署区：格对齐矩形（宽高为 40 的整数倍），贴路不压路。
    deployableAreas: [
      { x: 240, y: 200, width: 240, height: 160 },  // 格(6-11,5-8)：24格
      { x: 520, y: 80, width: 240, height: 80 },    // 格(13-18,2-3)：12格
      { x: 520, y: 480, width: 240, height: 80 },   // 格(13-18,12-13)：12格
      { x: 800, y: 400, width: 240, height: 80 }    // 格(20-25,10-11)：12格
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
    experience: 120
  },
  playerStartHealth: 20,
  playerStartCost: 25,
  playerMaxCost: 9999
}

export default level1Config