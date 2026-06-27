import { LevelConfig } from '@/types'

/**
 * 第一章第二关：黄巾营地外围
 */
export const level2Config: LevelConfig = {
  id: 'chapter1_level2',
  chapterId: 'chapter1',
  name: '黄巾营地外围',
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
      { x: 200, y: 220, width: 100, height: 80 },
      { x: 400, y: 100, width: 100, height: 50 },
      { x: 500, y: 400, width: 100, height: 80 },
      { x: 800, y: 350, width: 100, height: 80 }
    ],
    terrainAreas: [
      { type: 'grass', area: { x: 0, y: 0, width: 1280, height: 720 } },
      { type: 'forest', area: { x: 100, y: 400, width: 150, height: 100 } },
      { type: 'river', area: { x: 700, y: 200, width: 100, height: 200 } }
    ],
    defaultTerrain: 'grass'
  },
  waves: [
    {
      waveNumber: 1,
      enemies: [
        { enemyId: 'enemy_normal_metal', count: 6, spawnDelay: 0 },
        { enemyId: 'enemy_normal_fire', count: 4, spawnDelay: 1500 }
      ],
      spawnInterval: 800,
      delayBeforeWave: 3000
    },
    {
      waveNumber: 2,
      enemies: [
        { enemyId: 'enemy_normal_wood', count: 5, spawnDelay: 0 },
        { enemyId: 'enemy_normal_water', count: 5, spawnDelay: 2000 },
        { enemyId: 'enemy_normal_earth', count: 3, spawnDelay: 4000 }
      ],
      spawnInterval: 800,
      delayBeforeWave: 5000
    },
    {
      waveNumber: 3,
      enemies: [
        { enemyId: 'enemy_normal_metal', count: 4, spawnDelay: 0 },
        { enemyId: 'enemy_elite_fire', count: 1, spawnDelay: 3000 }
      ],
      spawnInterval: 800,
      delayBeforeWave: 8000
    }
  ],
  rewards: {
    gold: 150,
    experience: 80
  },
  playerStartHealth: 20,
  playerStartCost: 22
}

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

export default level2Config