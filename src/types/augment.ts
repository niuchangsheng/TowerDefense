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
 * 锦囊数值修正与被动机制
 */
export interface AugmentEffects {
  /** 全体攻击力百分比加成 (例如 0.15 = +15%) */
  attackPercentBonus?: number
  /** 全体攻击速度加成 (例如 0.2 = +20%) */
  attackSpeedBonus?: number
  /** 全体攻击范围加成 (例如 25) */
  attackRangeBonus?: number
  /** 相生相克元素反应伤害加成 (例如 0.5 = +50%) */
  reactionDamageMultiplier?: number
  /** 击杀金币/灵石获取加成 (例如 0.3 = +30%) */
  costGainBonus?: number
  /** 基地最大生命值增加 */
  baseMaxHealthBonus?: number
  /** 基地当前生命恢复 */
  baseHealthHeal?: number
  /** 相克伤害倍率加成 (原 1.5 倍基础加成) */
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
