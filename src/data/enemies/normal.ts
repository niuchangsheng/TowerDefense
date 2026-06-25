import { EnemyConfig } from '@/types'

/**
 * 普通敌人配置
 * 黄巾兵（五种五行属性）
 */
export const normalEnemies: EnemyConfig[] = [
  {
    id: 'enemy_normal_metal',
    name: '黄巾兵（金）',
    wuXing: 'metal',
    type: 'normal',
    baseHealth: 100,
    baseSpeed: 50,
    rewardCost: 1,
    dropTable: []
  },
  {
    id: 'enemy_normal_wood',
    name: '黄巾兵（木）',
    wuXing: 'wood',
    type: 'normal',
    baseHealth: 100,
    baseSpeed: 50,
    rewardCost: 1,
    dropTable: []
  },
  {
    id: 'enemy_normal_water',
    name: '黄巾兵（水）',
    wuXing: 'water',
    type: 'normal',
    baseHealth: 100,
    baseSpeed: 50,
    rewardCost: 1,
    dropTable: []
  },
  {
    id: 'enemy_normal_fire',
    name: '黄巾兵（火）',
    wuXing: 'fire',
    type: 'normal',
    baseHealth: 100,
    baseSpeed: 50,
    rewardCost: 1,
    dropTable: []
  },
  {
    id: 'enemy_normal_earth',
    name: '黄巾兵（土）',
    wuXing: 'earth',
    type: 'normal',
    baseHealth: 100,
    baseSpeed: 50,
    rewardCost: 1,
    dropTable: []
  }
]

/**
 * 精英敌人配置
 */
export const eliteEnemies: EnemyConfig[] = [
  {
    id: 'enemy_elite_metal',
    name: '黄巾将领（金）',
    wuXing: 'metal',
    type: 'elite',
    baseHealth: 300,
    baseSpeed: 40,
    rewardCost: 3,
    dropTable: []
  },
  {
    id: 'enemy_elite_water',
    name: '黄巾将领（水）',
    wuXing: 'water',
    type: 'elite',
    baseHealth: 300,
    baseSpeed: 40,
    rewardCost: 3,
    dropTable: []
  }
]

/**
 * Boss敌人配置
 */
export const bossEnemies: EnemyConfig[] = [
  {
    id: 'enemy_boss_zhangjiao',
    name: '张角',
    wuXing: 'fire',
    type: 'boss',
    baseHealth: 1000,
    baseSpeed: 30,
    rewardCost: 10,
    dropTable: []
  }
]

/**
 * 敌人索引
 * 用于快速查找敌人配置
 */
export const enemyConfigs: Map<string, EnemyConfig> = new Map([
  ...normalEnemies.map(e => [e.id, e] as [string, EnemyConfig]),
  ...eliteEnemies.map(e => [e.id, e] as [string, EnemyConfig]),
  ...bossEnemies.map(e => [e.id, e] as [string, EnemyConfig])
])

/**
 * 根据ID获取敌人配置
 */
export function getEnemyConfig(id: string): EnemyConfig | undefined {
  return enemyConfigs.get(id)
}