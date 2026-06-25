import { WuXing } from './wuxing.types'
import { Rarity, HeroStats } from './hero.types'

// 装备基础接口
export interface EquipmentBase {
  id: string
  name: string
  rarity: Rarity
  bonuses: Partial<HeroStats>  // 属性加成
}

// 武器
export interface Weapon extends EquipmentBase {
  type: 'weapon'
}

// 神器
export interface Artifact extends EquipmentBase {
  type: 'artifact'
  gemSocket: {
    requiredWuXing: WuXing      // 需要的宝石五行属性（相生）
    currentGem: string | null   // 当前镶嵌的宝石ID
  }
  activatedEffect: string | null  // 激活的效果ID
}

// 装备（联合类型）
export type Equipment = Weapon | Artifact

// 宝石
export interface Gem {
  id: string
  wuXing: WuXing
  level: number  // 宝石等级 (1-5)
}

// 宝石合成配置
export interface GemSynthesisConfig {
  inputLevel: number      // 输入宝石等级
  outputLevel: number     // 输出宝石等级
  inputCount: number      // 需要的输入宝石数量
}

// 宝石合成规则（固定为3个低级合成1个高级）
export const GEM_SYNTHESIS_RULE: GemSynthesisConfig = {
  inputLevel: 1,    // 实际使用时会动态计算
  outputLevel: 2,
  inputCount: 3
}

// 获取下一级宝石等级
export function getNextGemLevel(currentLevel: number): number | null {
  if (currentLevel >= 5) return null
  return currentLevel + 1
}