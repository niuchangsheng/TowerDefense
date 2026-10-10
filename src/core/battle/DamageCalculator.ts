import { HeroStats, WuXing, Point } from '@/types'
import { getCounterMultiplier } from '@/config/wuxing.config'

/**
 * 【乾坤经纬】四独立伤害乘区与五维对位合并计算参数
 * 最终伤害 = floor( 基础基数 × (1 + ∑攻击力加成) × (1 + ∑增伤加成) × (1 + ∑易伤加成) × (1 + 实际暴伤倍率) × (1 - 防御减免) )
 */
export interface FourBucketDamageParams {
  /** 基础伤害基数（普攻取面板攻击力；战法取攻击力×技能系数；相生反应取 max(A,B)+0.25*min(A,B)） */
  baseValue: number
  /** 【第一乘区：攻击力加成区】（区内加算，例如局内锦囊攻击加成 +0.20） */
  attackBoostSum?: number
  /** 【第二乘区：增伤区】（区内加算：相生倍率增幅、天时得令 +0.20、160px阵脉连线 +0.35 等） */
  damageIncreaseSum?: number
  /** 【第三乘区：易伤区】（区内加算：Boss铁壁击穿瘫痪 +0.50、状态层数易伤、《五气朝元》每类状态 +0.18 等） */
  vulnerabilitySum?: number
  /** 【第四乘区：暴击与抗暴对抗区】攻方暴击率（0~1，默认 0.15） */
  critRate?: number
  /** 攻方暴击伤害加成（如 0.50 表示暴击额外 +50% 伤害，若传入 >= 1.0 如 1.50 则自动归一化为 0.50） */
  critDamage?: number
  /** 敌方初始韧性（反暴击率，0~1） */
  enemyInitialTenacity?: number
  /** 敌方韧性削减总比例（如土·重 -0.25、熔岩焦土 -0.40） */
  tenacityReductionRatio?: number
  /** 敌方初始刚毅（反暴击伤害，0~1.5） */
  enemyInitialFortitude?: number
  /** 敌方刚毅削减总比例（如土·重 -0.40、熔岩焦土 -0.60） */
  fortitudeReductionRatio?: number
  /** 敌方初始防御值 */
  enemyInitialDefense?: number
  /** 敌方防御削减总比例（如金·裂 -0.35） */
  defenseReductionRatio?: number
  /** 是否无视防御（真实伤害，如金·裂流血、金生水·寒芒碎冰） */
  ignoreDefense?: boolean
  /** 是否强制指定暴击结果（用于确定性单元测试；未指定则按 actualCritRate 随机判定） */
  forceCrit?: boolean
  /** 自定义随机数（0~1，用于确定性测试） */
  randomRoll?: number
}

export interface FourBucketDamageResult {
  finalDamage: number
  rawFourBucketDamage: number
  isCrit: boolean
  actualCritRate: number
  actualCritDmgMult: number
  effectiveDefense: number
  effectiveTenacity: number
  effectiveFortitude: number
  defenseMitigationRatio: number
}

/**
 * 伤害计算器
 * 严格执行：
 * 1. 局外数值总增益上限 <= +50%（MAX_OUT_OF_BATTLE_BONUS = 0.50）
 * 2. 敌军【防御】【韧性】【刚毅】削减保底 >= 初始值 40%（MIN_RESISTANCE_FLOOR_RATIO = 0.40，即最高削减 60%）
 * 3. 四独立伤害乘区公式（严禁额外开辟独立乘区）
 * 4. 相生共鸣取优法则：max(A, B) + 0.25 * min(A, B)
 */
export class DamageCalculator {
  /** 局外单项面板总增益硬上限：+50% */
  public static readonly MAX_OUT_OF_BATTLE_BONUS = 0.50

  /** 敌军抗性（防御/韧性/刚毅）保底下限比例：初始值的 40%（最多削减 60%） */
  public static readonly MIN_RESISTANCE_FLOOR_RATIO = 0.40

  /** 敌军抗性最大可削减比例：60% */
  public static readonly MAX_RESISTANCE_REDUCTION = 0.60

  /**
   * 夹紧局外数值增益比例（严禁超过 +50%）
   */
  static clampOutOfBattleBonus(bonusRatio: number): number {
    return Math.min(this.MAX_OUT_OF_BATTLE_BONUS, Math.max(0, bonusRatio))
  }

  /**
   * 计算敌军抗性（防御 / 韧性 / 刚毅）削减后的实际生效值
   * 铁律：无论叠加多少层破甲、削韧、削刚毅或高阶神兵/锦囊，最终生效值绝不低于初始值的 40%！
   * @param initialValue 敌军初始抗性值（防御 / 韧性 / 刚毅）
   * @param totalReductionRatio 累计削减百分比（如 0.35 + 0.40 = 0.75，会被夹紧在 0.60）
   */
  static getEffectiveResistance(initialValue: number, totalReductionRatio: number): number {
    if (initialValue <= 0) return 0
    const clampedReduction = Math.min(this.MAX_RESISTANCE_REDUCTION, Math.max(0, totalReductionRatio))
    return initialValue * (1 - clampedReduction)
  }

  /**
   * 计算实际暴击几率
   * 实际暴击率 = clamp(0, 1, 攻方暴击率 - 敌方当前有效韧性)
   */
  static calculateActualCritRate(
    attackerCritRate: number,
    enemyInitialTenacity: number = 0,
    tenacityReductionRatio: number = 0
  ): number {
    const effectiveTenacity = this.getEffectiveResistance(enemyInitialTenacity, tenacityReductionRatio)
    return Math.max(0, Math.min(1, attackerCritRate - effectiveTenacity))
  }

  /**
   * 计算实际暴击伤害额外倍率（触发暴击时生效）
   * 实际暴伤倍率 = max(0, 攻方额外暴伤 - 敌方当前有效刚毅)
   * 注：若传入 1.50（代表 150% 暴击总伤）或 0.50（代表 +50% 额外暴伤），统一按额外暴伤计算以代入 (1 + 实际暴伤倍率)
   */
  static calculateActualCritDmgMultiplier(
    attackerCritDamage: number,
    enemyInitialFortitude: number = 0,
    fortitudeReductionRatio: number = 0
  ): number {
    const extraCritBonus = Math.max(0, attackerCritDamage)
    const effectiveFortitude = this.getEffectiveResistance(enemyInitialFortitude, fortitudeReductionRatio)
    return Math.max(0, extraCritBonus - effectiveFortitude)
  }

  /**
   * 【相生共鸣取优法则】
   * 无论谁先手挂状态、谁后手引爆，相生反应基础攻击力始终取参与反应双将中【攻击力最高者】为主基数，
   * 并附加另一名武将 25% 的攻击力协同加成。
   */
  static calculateReactionBaseAttack(attackA: number, attackB: number): number {
    const high = Math.max(attackA, attackB)
    const low = Math.min(attackA, attackB)
    return Math.floor(high + 0.25 * low)
  }

  /**
   * 根据有效防御计算非真伤减免比例
   * - 若 effectiveDefense <= 1.0，直接视作防御减伤率（如 0.35 = 35% 护甲减伤，上限 85%）；
   * - 若 effectiveDefense > 1.0，采用平滑护甲曲线：effectiveDefense / (effectiveDefense + 200)
   */
  static calculateDefenseMitigation(effectiveDefense: number): number {
    if (effectiveDefense <= 0) return 0
    if (effectiveDefense <= 1.0) {
      return Math.min(0.85, effectiveDefense)
    }
    return effectiveDefense / (effectiveDefense + 200)
  }

  /**
   * 严格四独立伤害乘区计算器
   * 最终伤害 = 基础基数 × (1 + ∑攻击力加成) × (1 + ∑增伤加成) × (1 + ∑易伤加成) × (1 + 实际暴伤倍率) × (1 - 防御减免)
   */
  static calculateFourBucketDamage(params: FourBucketDamageParams): FourBucketDamageResult {
    const base = Math.max(1, params.baseValue)
    const bucket1Attack = Math.max(0.1, 1 + (params.attackBoostSum ?? 0))
    const bucket2DmgInc = Math.max(0.1, 1 + (params.damageIncreaseSum ?? 0))
    const bucket3Vuln = Math.max(0.1, 1 + (params.vulnerabilitySum ?? 0))

    const effectiveTenacity = this.getEffectiveResistance(
      params.enemyInitialTenacity ?? 0,
      params.tenacityReductionRatio ?? 0
    )
    const effectiveFortitude = this.getEffectiveResistance(
      params.enemyInitialFortitude ?? 0,
      params.fortitudeReductionRatio ?? 0
    )
    const effectiveDefense = params.ignoreDefense
      ? 0
      : this.getEffectiveResistance(params.enemyInitialDefense ?? 0, params.defenseReductionRatio ?? 0)

    const actualCritRate = this.calculateActualCritRate(
      params.critRate ?? 0.15,
      params.enemyInitialTenacity ?? 0,
      params.tenacityReductionRatio ?? 0
    )

    let isCrit = false
    if (typeof params.forceCrit === 'boolean') {
      isCrit = params.forceCrit
    } else {
      const roll = params.randomRoll ?? Math.random()
      isCrit = roll < actualCritRate
    }

    const actualCritDmgMult = isCrit
      ? this.calculateActualCritDmgMultiplier(
          params.critDamage ?? 0.50,
          params.enemyInitialFortitude ?? 0,
          params.fortitudeReductionRatio ?? 0
        )
      : 0

    const bucket4Crit = 1 + actualCritDmgMult
    const rawFourBucketDamage = base * bucket1Attack * bucket2DmgInc * bucket3Vuln * bucket4Crit
    const defenseMitigationRatio = params.ignoreDefense ? 0 : this.calculateDefenseMitigation(effectiveDefense)
    const finalDamage = Math.max(1, Math.floor(rawFourBucketDamage * (1 - defenseMitigationRatio)))

    return {
      finalDamage,
      rawFourBucketDamage,
      isCrit,
      actualCritRate,
      actualCritDmgMult,
      effectiveDefense,
      effectiveTenacity,
      effectiveFortitude,
      defenseMitigationRatio
    }
  }

  /**
   * 兼容基础伤害计算接口（内部委托四乘区模型）
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
    // 基础伤害 = 攻击力 × (1 + 攻击加成区)
    const baseDamage = attackerStats.attack * (1 + attackPercentBonus)

    // 克制/增伤倍率（归入增伤区）
    let multiplier = getCounterMultiplier(attackerWuXing, targetWuXing)
    if (multiplier > 1.05) {
      multiplier += additionalCounterBonus
    }

    return Math.floor(baseDamage * multiplier)
  }

  /**
   * 判断是否可以攻击（范围内）
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
   */
  static calculateDistance(point1: Point, point2: Point): number {
    const dx = point1.x - point2.x
    const dy = point1.y - point2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 获取克制倍率
   */
  static getCounterMultiplier(attackerWuXing: WuXing, targetWuXing: WuXing): number {
    return getCounterMultiplier(attackerWuXing, targetWuXing)
  }

  /**
   * 计算攻击间隔（毫秒）
   */
  static calculateAttackInterval(attackSpeed: number): number {
    return 1000 / Math.max(0.1, attackSpeed)
  }
}