import { HeroLevelConfig, ExpRewardConfig } from '@/types'

/**
 * 英雄等级经验配置
 * 每升一级所需的经验值
 */
export const heroLevelConfigs: HeroLevelConfig[] = [
  // 1-10级
  { level: 1, expRequired: 0, statMultiplier: 1.0 },
  { level: 2, expRequired: 100, statMultiplier: 1.05 },
  { level: 3, expRequired: 200, statMultiplier: 1.1 },
  { level: 4, expRequired: 350, statMultiplier: 1.15 },
  { level: 5, expRequired: 500, statMultiplier: 1.2 },
  { level: 6, expRequired: 700, statMultiplier: 1.25 },
  { level: 7, expRequired: 900, statMultiplier: 1.3 },
  { level: 8, expRequired: 1200, statMultiplier: 1.35 },
  { level: 9, expRequired: 1500, statMultiplier: 1.4 },
  { level: 10, expRequired: 2000, statMultiplier: 1.45 },

  // 11-20级
  { level: 11, expRequired: 2500, statMultiplier: 1.5 },
  { level: 12, expRequired: 3000, statMultiplier: 1.55 },
  { level: 13, expRequired: 3500, statMultiplier: 1.6 },
  { level: 14, expRequired: 4000, statMultiplier: 1.65 },
  { level: 15, expRequired: 5000, statMultiplier: 1.7 },
  { level: 16, expRequired: 6000, statMultiplier: 1.75 },
  { level: 17, expRequired: 7000, statMultiplier: 1.8 },
  { level: 18, expRequired: 8500, statMultiplier: 1.85 },
  { level: 19, expRequired: 10000, statMultiplier: 1.9 },
  { level: 20, expRequired: 12000, statMultiplier: 1.95 },

  // 21-30级
  { level: 21, expRequired: 14000, statMultiplier: 2.0 },
  { level: 22, expRequired: 16000, statMultiplier: 2.05 },
  { level: 23, expRequired: 18000, statMultiplier: 2.1 },
  { level: 24, expRequired: 20000, statMultiplier: 2.15 },
  { level: 25, expRequired: 25000, statMultiplier: 2.2 },
  { level: 26, expRequired: 30000, statMultiplier: 2.25 },
  { level: 27, expRequired: 35000, statMultiplier: 2.3 },
  { level: 28, expRequired: 40000, statMultiplier: 2.35 },
  { level: 29, expRequired: 45000, statMultiplier: 2.4 },
  { level: 30, expRequired: 50000, statMultiplier: 2.45 },

  // 31-40级
  { level: 31, expRequired: 60000, statMultiplier: 2.5 },
  { level: 32, expRequired: 70000, statMultiplier: 2.55 },
  { level: 33, expRequired: 80000, statMultiplier: 2.6 },
  { level: 34, expRequired: 90000, statMultiplier: 2.65 },
  { level: 35, expRequired: 100000, statMultiplier: 2.7 },
  { level: 36, expRequired: 120000, statMultiplier: 2.75 },
  { level: 37, expRequired: 140000, statMultiplier: 2.8 },
  { level: 38, expRequired: 160000, statMultiplier: 2.85 },
  { level: 39, expRequired: 180000, statMultiplier: 2.9 },
  { level: 40, expRequired: 200000, statMultiplier: 2.95 },

  // 41-50级
  { level: 41, expRequired: 250000, statMultiplier: 3.0 },
  { level: 42, expRequired: 300000, statMultiplier: 3.05 },
  { level: 43, expRequired: 350000, statMultiplier: 3.1 },
  { level: 44, expRequired: 400000, statMultiplier: 3.15 },
  { level: 45, expRequired: 500000, statMultiplier: 3.2 },
  { level: 46, expRequired: 600000, statMultiplier: 3.25 },
  { level: 47, expRequired: 700000, statMultiplier: 3.3 },
  { level: 48, expRequired: 800000, statMultiplier: 3.35 },
  { level: 49, expRequired: 900000, statMultiplier: 3.4 },
  { level: 50, expRequired: 1000000, statMultiplier: 3.45 },

  // 51-60级（顶级）
  { level: 51, expRequired: 1200000, statMultiplier: 3.5 },
  { level: 52, expRequired: 1400000, statMultiplier: 3.55 },
  { level: 53, expRequired: 1600000, statMultiplier: 3.6 },
  { level: 54, expRequired: 1800000, statMultiplier: 3.65 },
  { level: 55, expRequired: 2000000, statMultiplier: 3.7 },
  { level: 56, expRequired: 2500000, statMultiplier: 3.75 },
  { level: 57, expRequired: 3000000, statMultiplier: 3.8 },
  { level: 58, expRequired: 3500000, statMultiplier: 3.85 },
  { level: 59, expRequired: 4000000, statMultiplier: 3.9 },
  { level: 60, expRequired: 5000000, statMultiplier: 4.0 }
]

/**
 * 经验奖励配置
 * 不同敌人提供的经验值
 */
export const expRewardConfig: ExpRewardConfig = {
  normalEnemy: 10,
  eliteEnemy: 50,
  bossEnemy: 200
}

/**
 * 获取升级所需经验
 */
export function getExpRequiredForLevel(level: number): number {
  if (level < 1 || level > 60) return 0

  const config = heroLevelConfigs.find(c => c.level === level)
  return config?.expRequired || 0
}

/**
 * 获取下一级所需经验（当前等级到下一级的差距）
 */
export function getExpToNextLevel(currentLevel: number): number {
  if (currentLevel >= 60) return 0 // 已达顶级

  const currentExp = getExpRequiredForLevel(currentLevel)
  const nextExp = getExpRequiredForLevel(currentLevel + 1)

  return nextExp - currentExp
}

/**
 * 根据总经验计算当前等级
 */
export function calculateLevelFromExp(totalExp: number): number {
  for (let i = heroLevelConfigs.length - 1; i >= 0; i--) {
    if (totalExp >= heroLevelConfigs[i].expRequired) {
      return heroLevelConfigs[i].level
    }
  }
  return 1
}

/**
 * 获取当前等级的经验进度（0-1）
 */
export function getExpProgress(currentExp: number, currentLevel: number): number {
  if (currentLevel >= 60) return 1 // 顶级显示100%

  const levelExp = getExpRequiredForLevel(currentLevel)
  const nextLevelExp = getExpRequiredForLevel(currentLevel + 1)

  const progress = (currentExp - levelExp) / (nextLevelExp - levelExp)
  return Math.min(1, Math.max(0, progress))
}

/**
 * 获取属性倍率
 */
export function getStatMultiplier(level: number): number {
  const config = heroLevelConfigs.find(c => c.level === level)
  return config?.statMultiplier || 1.0
}