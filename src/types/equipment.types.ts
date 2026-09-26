import { WuXing } from './wuxing.types'
import { Rarity, HeroStats } from './hero.types'

// 装备基础接口
export interface EquipmentBase {
  id: string
  name: string
  rarity: Rarity
  bonuses: Partial<HeroStats>  // 属性加成
  image?: string               // 贴图/素材 key
  description?: string        // 装备描述/背景典故
  exclusiveHeroes?: string[]  // 专属武将列表（武将名或武将ID）
}

// 武器
export interface Weapon extends EquipmentBase {
  type: 'weapon'
}

// 专属共鸣类型：无共鸣、同源共鸣、相生滋养
export type ResonanceType = 'none' | 'same' | 'generating'

// 神器专属共鸣配置
export interface ExclusiveResonanceConfig {
  heroName: string                 // 专属神将称号/名
  hiddenSkillName: string          // 隐藏奥义技能名
  sameEffectDesc: string           // 同源宝石共鸣效果描述
  generatingEffectDesc: string     // 相生宝石滋养效果描述
  ultimateDesc: string             // 5级神石终极唤醒描述
}

// 神器
export interface Artifact extends EquipmentBase {
  type: 'artifact'
  gemSocket: {
    requiredWuXing: WuXing        // 神器主五行属性
    allowedWuXings?: WuXing[]     // 允许镶嵌的宝石五行（同源 + 相生）
    currentGem: string | null     // 当前镶嵌的宝石ID
  }
  exclusiveResonance?: ExclusiveResonanceConfig // 专属器灵共鸣配置
  activatedEffect: string | null    // 激活的效果ID
}

// 武将神器共鸣状态
export interface HeroResonanceInfo {
  isExclusive: boolean
  hasResonance: boolean
  resonanceType: ResonanceType
  gemLevel: number
  artifact: Artifact | null
  gem: Gem | null
  resonanceConfig?: ExclusiveResonanceConfig
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