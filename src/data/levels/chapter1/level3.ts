import { LevelConfig } from '@/types'

/**
 * 第一章第三关：黄巾首领
 */
export const level3Config: LevelConfig = {
  id: 'chapter1_level3',
  chapterId: 'chapter1',
  name: '黄巾首领',
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
      { x: 100, y: 320, width: 100, height: 80 },
      { x: 300, y: 150, width: 100, height: 50 },
      { x: 500, y: 450, width: 100, height: 80 },
      { x: 850, y: 250, width: 100, height: 80 }
    ],
    terrainAreas: [
      { type: 'grass', area: { x: 0, y: 0, width: 1280, height: 720 } },
      { type: 'mountain', area: { x: 500, y: 100, width: 200, height: 80 } },
      { type: 'swamp', area: { x: 900, y: 400, width: 100, height: 100 } }
    ],
    defaultTerrain: 'grass'
  },
  waves: [
    {
      waveNumber: 1,
      enemies: [
        { enemyId: 'enemy_normal_metal', count: 8, spawnDelay: 0 },
        { enemyId: 'enemy_normal_fire', count: 5, spawnDelay: 1500 }
      ],
      spawnInterval: 700,
      delayBeforeWave: 3000
    },
    {
      waveNumber: 2,
      enemies: [
        { enemyId: 'enemy_normal_wood', count: 6, spawnDelay: 0 },
        { enemyId: 'enemy_normal_water', count: 6, spawnDelay: 2000 },
        { enemyId: 'enemy_elite_earth', count: 2, spawnDelay: 5000 }
      ],
      spawnInterval: 700,
      delayBeforeWave: 5000
    },
    {
      waveNumber: 3,
      enemies: [
        { enemyId: 'enemy_normal_metal', count: 5, spawnDelay: 0 },
        { enemyId: 'enemy_elite_fire', count: 2, spawnDelay: 2000 },
        { enemyId: 'enemy_boss_water', count: 1, spawnDelay: 6000 }
      ],
      spawnInterval: 600,
      delayBeforeWave: 10000
    }
  ],
  rewards: {
    gold: 300,
    experience: 150
  },
  playerStartHealth: 25,
  playerStartCost: 25
}

export default level3Config