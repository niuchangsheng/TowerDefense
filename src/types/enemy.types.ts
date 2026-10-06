import { WuXing } from './wuxing.types'
import { EnemyAffix } from './affix'

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

// 敌人配置（数据层 —— 敌军五大基础属性：生命、防御、移速、韧性、刚毅）
export interface EnemyConfig {
  id: string
  name: string
  title?: string                 // 统帅称号（如【天公将军】）
  wuXing: WuXing
  type: EnemyType
  baseHealth: number             // 生命 (hp)
  baseDefense?: number           // 防御 (defense，减免非真伤)
  baseSpeed: number              // 移动速度 (moveSpeed)
  baseTenacity?: number          // 韧性 (tenacity — 反暴击几率，0~1)
  baseFortitude?: number         // 刚毅 (fortitude — 反暴击伤害，0~1.5)
  rewardCost: number             // 击杀奖励的军费
  dropTable: DropItem[]
  maxAegisGrids?: number         // Boss 五行铁壁格数 (3~5格)
  weaknessReactions?: string[]   // Boss 命脉弱点相生反应列表（命中削 2 格铁壁 + 3s 瘫痪）
  mechanicDesc?: string          // 统帅专属机制描述
}

// 敌人实体（运行时）
export interface Enemy extends EnemyConfig {
  instanceId: string        // 唯一实例ID
  currentHealth: number
  maxHealth: number
  defense: number           // 初始防御值
  speed: number             // 初始移动速度
  tenacity: number          // 初始韧性值
  fortitude: number         // 初始刚毅值
  position: { x: number; y: number }
  pathProgress: number      // 路径进度 (0-1)
  isActive: boolean         // 是否活跃
  affixes?: EnemyAffix[]    // 专属词缀（无尽模式高波次精英/首领）
  shieldBrokenUntil?: number // 铁壁护盾破碎脆弱易伤结束时间戳（毫秒）
  aegisParalyzedUntil?: number // 命脉弱点相生触发的 3s 瘫痪结束时间戳（毫秒）
  currentAegisGrids?: number // 当前剩余五行铁壁格数
  octagonalLockActive?: boolean // 是否启用【一重烽火·八门重锁】（连续两次相同相生反应破壁效率减半）
  lastAegisReactionType?: string // 上一次命中五行铁壁的相生反应类型
  phase2Awakened?: boolean   // Boss 半血狂暴重铸铁壁是否已触发
  isBerserk?: boolean       // 是否进入雷怒暴走状态
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