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

// 神器专属共鸣配置（严格对齐 Wuxing_System_Design.md 第4、5、10章）
export interface ExclusiveResonanceConfig {
  heroId?: string                  // 专属神将ID
  heroName: string                 // 专属神将称号/名
  hiddenSkillName: string          // 神兵进化主动战法名
  baseSkillName?: string           // 未佩戴神兵时的原始主动战法名
  baseSkillDesc?: string           // 未佩戴神兵时的原始技能与被动描述
  evolvedSkillDesc?: string        // 佩戴专属神兵后的主动与被动技能质变描述
  sameEffectTitle?: string         // 2★ 同源槽特效名称（如【青龙木毒】）
  sameEffectDesc: string           // 同源宝石共鸣机制总述
  sameLevelDescs?: Record<number, string> // Lv.1 ~ Lv.5 同源宝石精确成长描述
  generatingEffectTitle?: string   // 4★ 相生槽特效名称（如【沧海润木】）
  generatingEffectDesc: string     // 相生宝石滋养机制总述（相生共鸣 + 战法引信）
  generatingLevelDescs?: Record<number, string> // Lv.1 ~ Lv.5 相生宝石精确成长描述
  ultimateName?: string            // 5★ 双Lv.5终极大招名称（如《青龙啸天》）
  ultimateDesc: string             // 5★ 双Lv.5神石终极大招完整描述
  guardianBeast?: string           // 五行守护圣兽法相名
  poemQuote?: string               // 终极大招 0.35s 暗场切入诗号
}

// 宝石基础属性词条类型（严格取自我方五大基础属性池）
export type GemStatType = 'attack' | 'attackRange' | 'attackSpeed' | 'critRate' | 'critDamage'

// 宝石单条随机属性词条
export interface GemAffix {
  stat: GemStatType
  value: number        // 词条数值（百分比或固定射程像素）
  min: number          // 该等级区间下限
  max: number          // 该等级区间上限
  isPercentage: boolean
}

// 神器（支持 2★ 同源槽 sameSocket 与 4★ 相生槽 generatingSocket 双孔位，兼容单孔 gemSocket）
export interface Artifact extends EquipmentBase {
  type: 'artifact'
  gemSocket: {
    requiredWuXing: WuXing        // 神器主五行属性（同源槽要求五行）
    allowedWuXings?: WuXing[]     // 允许镶嵌的宝石五行（同源 + 相生）
    currentGem: string | null     // 当前镶嵌的主/同源宝石ID
    sameGem?: string | null       // 2★【同源槽】镶嵌的宝石ID
    generatingGem?: string | null // 4★【相生槽】镶嵌的宝石ID
  }
  bossMaterialName?: string       // 统帅宿命主材名称（一生仅需铸造1把）
  exclusiveResonance?: ExclusiveResonanceConfig // 专属器灵共鸣配置
  activatedEffect: string | null    // 激活的效果ID
}

// 武将神器共鸣状态
export interface HeroResonanceInfo {
  isExclusive: boolean
  hasResonance: boolean
  resonanceType: ResonanceType
  gemLevel: number
  sameGemLevel?: number
  generatingGemLevel?: number
  hasDualLv5Ultimate?: boolean     // 同源槽 + 相生槽均镶嵌 Lv.5 宝石时解锁第 4 阶【圣兽法相终极大招】
  artifact: Artifact | null
  gem: Gem | null
  sameGem?: Gem | null
  generatingGem?: Gem | null
  resonanceConfig?: ExclusiveResonanceConfig
}

// 装备（联合类型）
export type Equipment = Weapon | Artifact

// 宝石（每颗宝石固定携带 2 条来自我方五大基础属性的随机词条）
export interface Gem {
  id: string
  wuXing: WuXing
  level: number         // 宝石等级 (1-5)
  affixes?: GemAffix[]  // 2 条随机基础属性词条
}

// 宝石合成配置
export interface GemSynthesisConfig {
  inputLevel: number      // 输入宝石等级
  outputLevel: number     // 输出宝石等级
  inputCount: number      // 需要的输入宝石数量
}

// 宝石合成规则（固定为3个低级合成1个高级，支持指定主石 100% 继承词条类型）
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