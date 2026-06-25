import { WuXing } from './wuxing.types'

// 敌人类型
export type EnemyType = 'normal' | 'elite' | 'boss' | 'flying' | 'fast' | 'highDefense' | 'selfDestruct'

// 敌人类型中文名称
export const EnemyTypeNames: Record<EnemyType, string> = {
  normal: '普通',
  elite: '精英',
  boss: 'Boss',
  flying: '飞行',
  fast: '高速',
  highDefense: '高防',
  selfDestruct: '自爆'
}

// 敌人配置（数据层）
export interface EnemyConfig {
  id: string
  name: string
  wuXing: WuXing
  type: EnemyType
  baseHealth: number
  baseSpeed: number
  rewardCost: number  // 击杀奖励的部署费用
  dropTable: DropItem[]
}

// 敌人实体（运行时）
export interface Enemy extends EnemyConfig {
  instanceId: string        // 唯一实例ID
  currentHealth: number
  maxHealth: number
  speed: number
  position: { x: number; y: number }
  pathProgress: number      // 路径进度 (0-1)
  isActive: boolean         // 是否活跃
}

// 掉落物品
export interface DropItem {
  type: 'soulStone' | 'equipment' | 'gem' | 'gold'
  itemId?: string           // 装备/宝石/魂石的ID
  heroId?: string           // 魂石对应的英雄ID
  amount?: number           // 数量
  probability: number       // 掉落概率 (0-1)
}

// 波次配置
export interface WaveConfig {
  waveNumber: number
  enemies: WaveEnemyConfig[]
  spawnInterval: number     // 敌人生成间隔（毫秒）
  delayBeforeWave: number   // 波次开始前的延迟（毫秒）
}

// 波次中的敌人配置
export interface WaveEnemyConfig {
  enemyId: string           // 敌人配置ID
  count: number             // 数量
  spawnDelay?: number       // 相对于波次开始的延迟
}