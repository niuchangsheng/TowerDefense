import { LevelConfig } from '@/types'

/**
 * 第一章第一关：黄巾营地
 */
export const level1Config: LevelConfig = {
  id: 'chapter1_level1',
  chapterId: 'chapter1',
  name: '黄巾营地',
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
    // 每格可站 1 个兵种或武将（均占 1 格 40×40）。
    deployableAreas: [
      { x: 240, y: 200, width: 240, height: 160 },  // 格(6-11,5-8)：24格
      { x: 520, y: 80, width: 240, height: 80 },    // 格(13-18,2-3)：12格
      { x: 520, y: 480, width: 240, height: 80 },   // 格(13-18,12-13)：12格
      { x: 800, y: 400, width: 240, height: 80 }    // 格(20-25,10-11)：12格
    ],
    // 地形区域配置
    terrainAreas: [
      // 整体背景草地
      { type: 'grass', area: { x: 0, y: 0, width: 1280, height: 720 } },
      // 山地障碍（北方群峦）
      { type: 'mountain', area: { x: 240, y: 70, width: 330, height: 100 } },
      // 河流区域（东方清溪，南北流向，道路架木栈道穿行）
      { type: 'river', area: { x: 850, y: 150, width: 95, height: 390 } },
      // 森林区域（西南密林，松篁茂盛）
      { type: 'forest', area: { x: 40, y: 460, width: 220, height: 130 } }
    ],
    defaultTerrain: 'grass'
  },
  waves: [
    {
      waveNumber: 1,
      enemies: [
        { enemyId: 'enemy_normal_metal', count: 5, spawnDelay: 0 },
        { enemyId: 'enemy_normal_fire', count: 3, spawnDelay: 2000 }
      ],
      spawnInterval: 1000,
      delayBeforeWave: 3000
    },
    {
      waveNumber: 2,
      enemies: [
        { enemyId: 'enemy_normal_wood', count: 5, spawnDelay: 0 },
        { enemyId: 'enemy_normal_water', count: 3, spawnDelay: 2000 },
        { enemyId: 'enemy_normal_earth', count: 2, spawnDelay: 4000 }
      ],
      spawnInterval: 1000,
      delayBeforeWave: 5000
    },
    {
      waveNumber: 3,
      enemies: [
        { enemyId: 'enemy_normal_metal', count: 3, spawnDelay: 0 },
        { enemyId: 'enemy_normal_fire', count: 3, spawnDelay: 1500 },
        { enemyId: 'enemy_elite_water', count: 1, spawnDelay: 3000 }
      ],
      spawnInterval: 1000,
      delayBeforeWave: 8000
    }
  ],
  rewards: {
    gold: 100,
    experience: 50
  },
  playerStartHealth: 20,
  playerStartCost: 20
}

export default level1Config