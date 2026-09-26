import { HeroStats, WuXing, Point } from '@/types'
import { getCounterMultiplier } from '@/config/wuxing.config'

/**
 * 伤害计算器
 * 处理战斗中的伤害计算逻辑
 */
export class DamageCalculator {
  /**
   * 计算伤害
   * @param attackerStats 攻击者属性
   * @param attackerWuXing 攻击者五行
   * @param targetWuXing 目标五行
   * @returns 计算后的伤害值
   */
  static calculateDamage(
    attackerStats: HeroStats,
    attackerWuXing: WuXing,
    targetWuXing: WuXing,
    additionalCounterBonus: number = 0,
    attackPercentBonus: number = 0
  ): number {
    // 基础伤害 = 攻击力 × (1 + 锦囊百分比加成)
    const baseDamage = attackerStats.attack * (1 + attackPercentBonus)

    // 克制倍率
    let multiplier = getCounterMultiplier(attackerWuXing, targetWuXing)
    if (multiplier > 1.05) {
      multiplier += additionalCounterBonus
    }

    // 最终伤害 = 基础伤害 × 克制倍率
    return Math.floor(baseDamage * multiplier)
  }

  /**
   * 判断是否可以攻击（范围内）
   * @param attackerPosition 攻击者位置
   * @param targetPosition 目标位置
   * @param attackRange 攻击范围
   * @returns 是否在攻击范围内
   */
  static canAttack(
    attackerPosition: Point,
    targetPosition: Point,
    attackRange: number
  ): boolean {
    const distance = this.calculateDistance(attackerPosition, targetPosition)
    return distance <= attackRange
  }

  /**
   * 计算两点之间的距离
   * @param point1 点1
   * @param point2 点2
   * @returns 欧几里得距离
   */
  static calculateDistance(point1: Point, point2: Point): number {
    const dx = point1.x - point2.x
    const dy = point1.y - point2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 获取克制倍率
   * @param attackerWuXing 攻击者五行
   * @param targetWuXing 目标五行
   * @returns 克制倍率
   */
  static getCounterMultiplier(attackerWuXing: WuXing, targetWuXing: WuXing): number {
    return getCounterMultiplier(attackerWuXing, targetWuXing)
  }

  /**
   * 计算攻击间隔（毫秒）
   * @param attackSpeed 攻击速度（每秒攻击次数）
   * @returns 攻击间隔（毫秒）
   */
  static calculateAttackInterval(attackSpeed: number): number {
    // 每秒攻击次数 → 每次攻击间隔毫秒
    // 例如：attackSpeed = 1.5 → interval = 1000 / 1.5 = 666.67ms
    return 1000 / attackSpeed
  }
}