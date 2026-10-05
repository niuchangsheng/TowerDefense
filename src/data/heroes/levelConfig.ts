import { HeroLevelConfig, ExpRewardConfig } from '@/types'

/**
 * 武道十境（Lv.1 ~ Lv.10）等级配置
 * 铁律：局外保下限，严控数值膨胀。
 * - 最高等级为 10 级（十境·无双大宗师）；
 * - 每升 1 境，基础攻击力提升 +3.6%（Lv.1 = 1.000，Lv.10 = 1.360，即最高 +36.0%）；
 * - 配合双 Lv.5 宝石极限攻击词条（+7.0% × 2 = +14.0%），全局局外攻击总增益严格 <= +50.0%！
 */
export const MAX_HERO_LEVEL = 10

export const MARTIAL_REALM_NAMES: Record<number, string> = {
  1: '一境·初窥门径',
  2: '二境·气贯周天',
  3: '三境·洗髓伐毛',
  4: '四境·罡气外放',
  5: '五境·炉火纯青',
  6: '六境·登峰造极',
  7: '七境·出神入化',
  8: '八境·返璞归真',
  9: '九境·一代宗师',
  10: '十境·无双大宗师'
}

/**
 * 生成 1~10 境的武道升级经验与属性倍率配置
 */
function generateLevelConfigs(): HeroLevelConfig[] {
  const configs: HeroLevelConfig[] = []
  const expTable = [0, 100, 160, 240, 350, 500, 700, 950, 1250, 1600]

  for (let level = 1; level <= MAX_HERO_LEVEL; level++) {
    // Lv.1 为 1.000，每升 1 境 +4.0%，Lv.10 封顶为 1.360（即局外武道十境累计最高 +36.0%）
    const statMultiplier = Number((1 + (level - 1) * 0.04).toFixed(4))

    configs.push({
      level,
      expRequired: expTable[level - 1] ?? 1600,
      statMultiplier
    })
  }

  return configs
}

export const heroLevelConfigs: HeroLevelConfig[] = generateLevelConfigs()

/**
 * 经验奖励配置
 */
export const expRewardConfig: ExpRewardConfig = {
  normalEnemy: 10,
  eliteEnemy: 30,
  bossEnemy: 100
}

/**
 * 获取武道十境称号
 */
export function getMartialRealmName(level: number): string {
  const clamped = Math.max(1, Math.min(MAX_HERO_LEVEL, level))
  return MARTIAL_REALM_NAMES[clamped] || `Lv.${clamped}`
}

/**
 * 获取指定等级所需经验
 */
export function getExpRequiredForLevel(level: number): number {
  if (level <= 1) return 0
  if (level > MAX_HERO_LEVEL) return Infinity

  const config = heroLevelConfigs.find(c => c.level === level)
  return config ? config.expRequired : Infinity
}

/**
 * 获取指定等级的属性倍率（最高夹紧在 Lv.10 的 1.36 倍，确保不超过 +36%）
 */
export function getStatMultiplier(level: number): number {
  const clampedLevel = Math.max(1, Math.min(MAX_HERO_LEVEL, level))
  const config = heroLevelConfigs.find(c => c.level === clampedLevel)
  return config ? config.statMultiplier : 1.0
}

/**
 * 获取指定等级的局外属性加成百分比（Lv.1 = 0, Lv.10 = 0.36）
 */
export function getLevelStatBonus(level: number): number {
  return Number((getStatMultiplier(level) - 1.0).toFixed(4))
}

/**
 * 根据累计总经验计算对应的武道等级（Lv.1 ~ Lv.10）
 */
export function calculateLevelFromExp(totalExp: number): number {
  const res = calculateLevelUp(1, 0, Math.max(0, totalExp))
  return res.newLevel
}

/**
 * 计算从 Lv.1 升至指定等级累计消耗的总经验（用于【一键无损传功】100% 返还）
 */
export function getTotalInvestedExp(level: number, currentExp: number = 0): number {
  const clampedLevel = Math.max(1, Math.min(MAX_HERO_LEVEL, level))
  let total = Math.max(0, currentExp)
  for (let lv = 2; lv <= clampedLevel; lv++) {
    total += getExpRequiredForLevel(lv)
  }
  return total
}

/**
 * 计算升级后的等级和剩余经验
 */
export function calculateLevelUp(currentLevel: number, currentExp: number, addedExp: number): {
  newLevel: number
  remainingExp: number
  leveledUp: boolean
} {
  let level = Math.min(MAX_HERO_LEVEL, Math.max(1, currentLevel))
  let exp = currentExp + addedExp
  let leveledUp = false

  while (level < MAX_HERO_LEVEL) {
    const expNeeded = getExpRequiredForLevel(level + 1)
    if (exp >= expNeeded) {
      exp -= expNeeded
      level++
      leveledUp = true
    } else {
      break
    }
  }

  if (level >= MAX_HERO_LEVEL) {
    exp = 0
  }

  return {
    newLevel: level,
    remainingExp: exp,
    leveledUp
  }
}

/**
 * 获取当前等级到下一级的经验进度（0-1）
 */
export function getExpProgress(currentLevel: number, currentExp: number): number {
  if (currentLevel >= MAX_HERO_LEVEL) return 1.0

  const expNeeded = getExpRequiredForLevel(currentLevel + 1)
  if (expNeeded === 0 || expNeeded === Infinity) return 1.0
  return Math.min(currentExp / expNeeded, 1.0)
}

/**
 * 获取升到下一级还需要的经验
 */
export function getExpToNextLevel(currentLevel: number, currentExp: number): number {
  if (currentLevel >= MAX_HERO_LEVEL) return 0

  const expNeeded = getExpRequiredForLevel(currentLevel + 1)
  return Math.max(expNeeded - currentExp, 0)
}