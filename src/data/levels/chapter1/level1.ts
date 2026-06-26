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
    path: [
      { x: 0, y: 360 },
      { x: 200, y: 360 },
      { x: 200, y: 200 },
      { x: 500, y: 200 },
      { x: 500, y: 400 },
      { x: 800, y: 400 },
      { x: 800, y: 250 },
      { x: 1100, y: 250 },
      { x: 1280, y: 360 }
    ],
    spawnPoint: { x: 0, y: 360 },
    exitPoint: { x: 1280, y: 360 },
    deployableAreas: [
      { x: 150, y: 280, width: 100, height: 80 },
      { x: 350, y: 150, width: 100, height: 50 },
      { x: 600, y: 350, width: 100, height: 80 },
      { x: 900, y: 200, width: 100, height: 50 }
    ],
    // 地形区域配置
    terrainAreas: [
      // 整体背景草地
      { type: 'grass', area: { x: 0, y: 0, width: 1280, height: 720 } },
      // 山地障碍（路径上方）
      { type: 'mountain', area: { x: 250, y: 100, width: 300, height: 60 } },
      // 河流区域（路径右侧）
      { type: 'river', area: { x: 850, y: 280, width: 150, height: 200 } },
      // 森林区域（左下角）
      { type: 'forest', area: { x: 50, y: 500, width: 200, height: 150 } }
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