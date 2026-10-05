import { WuXing } from './wuxing.types'

/**
 * 锦囊品阶（海克斯品质）
 */
export type AugmentRarity = 'common' | 'rare' | 'epic' | 'legendary'

/**
 * 锦囊分类
 */
export type AugmentCategory = 'elemental' | 'hero' | 'general'

/**
 * 锦囊数值修正与被动机制（严格归入四大独立伤害乘区：攻击加成区 / 增伤区 / 易伤区 / 暴击区）
 */
export interface AugmentEffects {
  /** 【攻击力加成区】全体攻击力百分比加成 (例如 0.15 = +15%) */
  attackPercentBonus?: number
  /** 全体攻击速度加成 (例如 0.2 = +20%) */
  attackSpeedBonus?: number
  /** 全体攻击范围加成 (例如 25) */
  attackRangeBonus?: number
  /** 【暴击区】全体暴击率加成 (例如 0.15 = +15%) */
  critRateBonus?: number
  /** 【暴击区】全体暴击伤害加成 (例如 0.35 = +35%) */
  critDamageBonus?: number
  /** 【增伤区】五行相生反应伤害加成 (例如 0.5 = +50%，增伤区加算) */
  reactionDamageMultiplier?: number
  /** 【增伤区】全局增伤加成 (例如 0.2 = +20%，增伤区加算) */
  damageIncreaseBonus?: number
  /** 【易伤区】敌军承受易伤加成 (例如 0.3 = +30%，易伤区加算) */
  vulnerabilityBonus?: number
  /** 击杀军费获取加成 (例如 0.3 = +30%) */
  costGainBonus?: number
  /** 帅营最大生命值增加 */
  baseMaxHealthBonus?: number
  /** 帅营当前生命恢复 */
  baseHealthHeal?: number
  /** 相克伤害倍率加成（兼容保留） */
  counterMultiplierBonus?: number
  /** 专属机制标识符 */
  specialId?: string
}

/**
 * 军师锦囊（天命肉鸽词条）接口
 */
export interface Augment {
  id: string
  name: string
  subtitle?: string
  description: string
  rarity: AugmentRarity
  category: AugmentCategory
  icon?: string
  tags?: string[]
  /** 触发五行限制（若有，则需要场上有该五行英雄时才更容易刷出） */
  wuXingRequirement?: WuXing[]
  /** 英雄专属（若有，则需出战该英雄） */
  heroRequirement?: string
  /** 是否可无限重复选取（用于锦囊池耗尽后的无尽精进） */
  repeatable?: boolean
  /** 锦囊附带的数值/机制修正 */
  effects: AugmentEffects
}

/**
 * 军令与能量状态
 */
export interface StratagemState {
  currentEnergy: number
  maxEnergy: number
  readyCount: number
  rerollCount: number
  activeAugments: Augment[]
}
