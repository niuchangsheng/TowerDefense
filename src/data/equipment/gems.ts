import { Gem, GemAffix, GemStatType, WuXing } from '@/types'

/**
 * 五行灵石五大基础属性 [Min, Max] 随机区间表（Lv.1 ~ Lv.5）
 * 严格遵循【局外保下限 <= +50%】铁律：
 * - Lv.5 攻击力词条上限为 +7.0%，双槽极品满值合计 +14.0%，加上武道十境 +36.0% = 恰好 +50.0%！
 */
export const GEM_STAT_RANGES: Record<
  GemStatType,
  Record<number, { min: number; max: number; isPercentage: boolean; label: string }>
> = {
  attack: {
    1: { min: 0.010, max: 0.015, isPercentage: true, label: '攻击力' },
    2: { min: 0.016, max: 0.025, isPercentage: true, label: '攻击力' },
    3: { min: 0.026, max: 0.038, isPercentage: true, label: '攻击力' },
    4: { min: 0.039, max: 0.052, isPercentage: true, label: '攻击力' },
    5: { min: 0.053, max: 0.070, isPercentage: true, label: '攻击力' }
  },
  attackRange: {
    1: { min: 0.010, max: 0.015, isPercentage: true, label: '攻击范围' },
    2: { min: 0.016, max: 0.025, isPercentage: true, label: '攻击范围' },
    3: { min: 0.026, max: 0.038, isPercentage: true, label: '攻击范围' },
    4: { min: 0.039, max: 0.055, isPercentage: true, label: '攻击范围' },
    5: { min: 0.056, max: 0.080, isPercentage: true, label: '攻击范围' }
  },
  attackSpeed: {
    1: { min: 0.010, max: 0.020, isPercentage: true, label: '攻击速度' },
    2: { min: 0.021, max: 0.035, isPercentage: true, label: '攻击速度' },
    3: { min: 0.036, max: 0.052, isPercentage: true, label: '攻击速度' },
    4: { min: 0.053, max: 0.075, isPercentage: true, label: '攻击速度' },
    5: { min: 0.076, max: 0.100, isPercentage: true, label: '攻击速度' }
  },
  critRate: {
    1: { min: 0.010, max: 0.015, isPercentage: true, label: '暴击几率' },
    2: { min: 0.016, max: 0.025, isPercentage: true, label: '暴击几率' },
    3: { min: 0.026, max: 0.038, isPercentage: true, label: '暴击几率' },
    4: { min: 0.039, max: 0.055, isPercentage: true, label: '暴击几率' },
    5: { min: 0.056, max: 0.080, isPercentage: true, label: '暴击几率' }
  },
  critDamage: {
    1: { min: 0.020, max: 0.040, isPercentage: true, label: '暴击伤害' },
    2: { min: 0.041, max: 0.070, isPercentage: true, label: '暴击伤害' },
    3: { min: 0.071, max: 0.110, isPercentage: true, label: '暴击伤害' },
    4: { min: 0.111, max: 0.160, isPercentage: true, label: '暴击伤害' },
    5: { min: 0.161, max: 0.220, isPercentage: true, label: '暴击伤害' }
  }
}

export const ALL_GEM_STATS: GemStatType[] = [
  'attack',
  'attackRange',
  'attackSpeed',
  'critRate',
  'critDamage'
]

export const GEM_STAT_LABELS: Record<GemStatType, string> = {
  attack: '攻击力',
  attackRange: '攻击范围',
  attackSpeed: '攻击速度',
  critRate: '暴击几率',
  critDamage: '暴击伤害'
}

/**
 * 为宝石生成 2 条随机基础属性词条（允许重复抽取相同属性，如双攻击力/双暴伤）
 * @param level 宝石等级 (1~5)
 * @param minRollPercentile 保底分位值提升（无尽北伐高层掉落奖励，0 ~ 0.50，只抬高下限绝不突破 Max 上限）
 * @param inheritedStats 三合一升阶时由【主石】100% 定向继承的词条属性类型
 * @param inheritedPercentiles 三合一升阶时由【主石】继承的词条品质分位 (0 ~ 1)
 */
export function rollGemAffixes(
  level: number,
  minRollPercentile: number = 0,
  inheritedStats?: GemStatType[],
  inheritedPercentiles?: number[]
): GemAffix[] {
  const clampedLevel = Math.max(1, Math.min(5, level))
  const clampedPercentile = Math.max(0, Math.min(0.50, minRollPercentile))

  let chosenStats: GemStatType[]
  if (inheritedStats && inheritedStats.length >= 2) {
    chosenStats = [inheritedStats[0], inheritedStats[1]]
  } else {
    // 独立随机抽取 2 条（允许抽到相同属性词条堆叠）
    const first = ALL_GEM_STATS[Math.floor(Math.random() * ALL_GEM_STATS.length)]
    const second = ALL_GEM_STATS[Math.floor(Math.random() * ALL_GEM_STATS.length)]
    chosenStats = [first, second]
  }

  return chosenStats.map((stat, idx) => {
    const range = GEM_STAT_RANGES[stat][clampedLevel]
    let rawVal: number
    if (inheritedPercentiles && typeof inheritedPercentiles[idx] === 'number') {
      const pct = Math.max(clampedPercentile, Math.min(1, inheritedPercentiles[idx]))
      rawVal = range.min + (range.max - range.min) * pct
    } else {
      const effectiveMin = range.min + (range.max - range.min) * clampedPercentile
      rawVal = effectiveMin + Math.random() * (range.max - effectiveMin)
    }
    const value = range.isPercentage
      ? Number(Math.min(range.max, rawVal).toFixed(4))
      : Math.min(range.max, Math.round(rawVal))

    return {
      stat,
      value,
      min: range.min,
      max: range.max,
      isPercentage: range.isPercentage
    }
  })
}

/**
 * 计算单条词条在其等级 [Min, Max] 区间内的品质分位 (0.0 ~ 1.0)
 */
export function getAffixPercentile(affix: GemAffix): number {
  const span = affix.max - affix.min
  if (span <= 0) return 1
  return Math.max(0, Math.min(1, (affix.value - affix.min) / span))
}

/**
 * 评估宝石词条综合品相评级（普通 / 良工 / 🔥极品满Roll · 第10章 §10.3.3）
 */
export function getGemQualityRating(gem: Gem): {
  label: string
  color: string
  avgPercentile: number
} {
  if (!gem.affixes || gem.affixes.length === 0) {
    return { label: '良工', color: '#2e7d32', avgPercentile: 0.5 }
  }
  const sum = gem.affixes.reduce((acc, a) => acc + getAffixPercentile(a), 0)
  const avg = sum / gem.affixes.length
  if (avg >= 0.80) {
    return { label: '🔥 极品满Roll', color: '#c62828', avgPercentile: avg }
  } else if (avg >= 0.45) {
    return { label: '✦ 良工佳品', color: '#8a5a14', avgPercentile: avg }
  } else {
    return { label: '普通原胚', color: '#5c5549', avgPercentile: avg }
  }
}

/**
 * 格式化宝石词条展示文案（含当前数值与 [Min ~ Max] 区间）
 */
export function formatGemAffixText(affix: GemAffix): string {
  const label = GEM_STAT_LABELS[affix.stat]
  if (affix.isPercentage) {
    const valStr = `+${(affix.value * 100).toFixed(1)}%`
    const rangeStr = `[+${(affix.min * 100).toFixed(1)}% ~ +${(affix.max * 100).toFixed(1)}%]`
    return `${label} ${valStr} ${rangeStr}`
  } else {
    return `${label} +${affix.value}px [+${affix.min} ~ +${affix.max}px]`
  }
}

/**
 * 宝石配置（5×5 五行灵石矩阵）
 */
export const gems: Gem[] = [
  // 金系宝石（1-5级）
  { id: 'gem_metal_1', wuXing: 'metal', level: 1, affixes: rollGemAffixes(1, 0, ['attack', 'critRate']) },
  { id: 'gem_metal_2', wuXing: 'metal', level: 2, affixes: rollGemAffixes(2, 0, ['attack', 'critRate']) },
  { id: 'gem_metal_3', wuXing: 'metal', level: 3, affixes: rollGemAffixes(3, 0, ['attack', 'critDamage']) },
  { id: 'gem_metal_4', wuXing: 'metal', level: 4, affixes: rollGemAffixes(4, 0, ['attack', 'critDamage']) },
  { id: 'gem_metal_5', wuXing: 'metal', level: 5, affixes: rollGemAffixes(5, 0, ['attack', 'critDamage']) },

  // 木系宝石（1-5级）
  { id: 'gem_wood_1', wuXing: 'wood', level: 1, affixes: rollGemAffixes(1, 0, ['attack', 'attackRange']) },
  { id: 'gem_wood_2', wuXing: 'wood', level: 2, affixes: rollGemAffixes(2, 0, ['attack', 'attackRange']) },
  { id: 'gem_wood_3', wuXing: 'wood', level: 3, affixes: rollGemAffixes(3, 0, ['attack', 'attackRange']) },
  { id: 'gem_wood_4', wuXing: 'wood', level: 4, affixes: rollGemAffixes(4, 0, ['attack', 'critRate']) },
  { id: 'gem_wood_5', wuXing: 'wood', level: 5, affixes: rollGemAffixes(5, 0, ['attack', 'attackRange']) },

  // 水系宝石（1-5级）
  { id: 'gem_water_1', wuXing: 'water', level: 1, affixes: rollGemAffixes(1, 0, ['attackSpeed', 'critRate']) },
  { id: 'gem_water_2', wuXing: 'water', level: 2, affixes: rollGemAffixes(2, 0, ['attackSpeed', 'critRate']) },
  { id: 'gem_water_3', wuXing: 'water', level: 3, affixes: rollGemAffixes(3, 0, ['attackSpeed', 'attack']) },
  { id: 'gem_water_4', wuXing: 'water', level: 4, affixes: rollGemAffixes(4, 0, ['attackSpeed', 'attack']) },
  { id: 'gem_water_5', wuXing: 'water', level: 5, affixes: rollGemAffixes(5, 0, ['attackSpeed', 'attack']) },

  // 火系宝石（1-5级）
  { id: 'gem_fire_1', wuXing: 'fire', level: 1, affixes: rollGemAffixes(1, 0, ['attack', 'attackRange']) },
  { id: 'gem_fire_2', wuXing: 'fire', level: 2, affixes: rollGemAffixes(2, 0, ['attack', 'attackRange']) },
  { id: 'gem_fire_3', wuXing: 'fire', level: 3, affixes: rollGemAffixes(3, 0, ['attack', 'critDamage']) },
  { id: 'gem_fire_4', wuXing: 'fire', level: 4, affixes: rollGemAffixes(4, 0, ['attack', 'critDamage']) },
  { id: 'gem_fire_5', wuXing: 'fire', level: 5, affixes: rollGemAffixes(5, 0, ['attack', 'critDamage']) },

  // 土系宝石（1-5级）
  { id: 'gem_earth_1', wuXing: 'earth', level: 1, affixes: rollGemAffixes(1, 0, ['attack', 'critDamage']) },
  { id: 'gem_earth_2', wuXing: 'earth', level: 2, affixes: rollGemAffixes(2, 0, ['attack', 'critDamage']) },
  { id: 'gem_earth_3', wuXing: 'earth', level: 3, affixes: rollGemAffixes(3, 0, ['attack', 'critRate']) },
  { id: 'gem_earth_4', wuXing: 'earth', level: 4, affixes: rollGemAffixes(4, 0, ['attack', 'critRate']) },
  { id: 'gem_earth_5', wuXing: 'earth', level: 5, affixes: rollGemAffixes(5, 0, ['attack', 'critDamage']) }
]

/**
 * 宝石名称映射
 */
export const gemNames: Record<string, Record<number, string>> = {
  metal: {
    1: '庚金璞石',
    2: '沉银玄晶',
    3: '曜金灵玉',
    4: '太白金魄',
    5: '白虎神髓'
  },
  wood: {
    1: '青藤原石',
    2: '碧罗凝晶',
    3: '苍灵翡翠',
    4: '建木灵魄',
    5: '青龙圣珠'
  },
  water: {
    1: '凝露水石',
    2: '流泉寒晶',
    3: '沧海明珠',
    4: '玄冥冰魄',
    5: '玄武神珠'
  },
  fire: {
    1: '炽火砂石',
    2: '熔火赤晶',
    3: '炎阳赤玉',
    4: '三昧天火魄',
    5: '朱雀神髓'
  },
  earth: {
    1: '厚土砾石',
    2: '赭岩灵晶',
    3: '玄黄古玉',
    4: '万岳龙魄',
    5: '麒麟圣玉'
  }
}

/**
 * 获取宝石名称
 */
export function getGemName(gem: Gem): string {
  return gemNames[gem.wuXing]?.[gem.level] || '未知宝石'
}

/**
 * 获取宝石配置
 */
export function getGem(id: string): Gem | undefined {
  return gems.find(g => g.id === id)
}

/**
 * 按五行筛选宝石
 */
export function getGemsByWuXing(wuXing: WuXing): Gem[] {
  return gems.filter(g => g.wuXing === wuXing)
}

/**
 * 按等级筛选宝石
 */
export function getGemsByLevel(level: number): Gem[] {
  return gems.filter(g => g.level === level)
}