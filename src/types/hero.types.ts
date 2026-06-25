import { WuXing } from './wuxing.types'

// 稀有度
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

// 稀有度中文名称
export const RarityNames: Record<Rarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说'
}

// 英雄属性
export interface HeroStats {
  attack: number      // 攻击力
  attackSpeed: number // 攻击速度（每秒攻击次数）
  attackRange: number // 攻击范围（游戏单位）
}

// 装备槽位
export type EquipmentSlot = 'weapon' | 'artifact'

// 英雄配置（数据层）
export interface HeroConfig {
  id: string
  name: string
  wuXing: WuXing
  rarity: Rarity
  baseStats: HeroStats
  deploymentCost: number
  passiveSkillId: string
  activeSkillId: string
  unlockSoulStoneCount: number
  starUpgradeRequirements: number[]  // [2星需要, 3星需要, 4星需要, 5星需要]
}

// 英雄实体（运行时）
export interface Hero extends HeroConfig {
  level: number           // 当前等级 (1-60)
  star: number            // 当前星级 (1-5)
  experience: number      // 当前经验
  equipment: {
    weapon: string | null   // 装备ID
    artifact: string | null // 神器ID
  }
  isUnlocked: boolean     // 是否已解锁
}

// 已部署的英雄（战斗中）
export interface DeployedHero {
  heroId: string
  instanceId: string      // 唯一实例ID
  position: { x: number; y: number }
  currentCooldown: number // 技能冷却时间
  lastAttackTime: number  // 上次攻击时间
  isSkillAuto: boolean    // 主动技能是否自动释放
}

// 英雄等级配置
export interface HeroLevelConfig {
  level: number
  expRequired: number
  statMultiplier: number  // 属性倍率（相对于基础属性）
}

// 经验奖励配置
export interface ExpRewardConfig {
  normalEnemy: number
  eliteEnemy: number
  bossEnemy: number
}