import {
  MilitarySituation,
  MilitarySituationId,
  MilitaryTactic,
  MilitaryTacticType,
  MILITARY_SITUATIONS
} from '@/types/militarySituation'

export interface MilitarySituationCallbacks {
  onSituationTriggered?: (situation: MilitarySituation) => void
  onTacticApplied?: (tactic: MilitaryTactic) => void
}

/**
 * 战场天时军情与军师机变双策管理器
 * 负责无尽试炼中每10波的军情判定、天候切换与双策增益维护
 */
export class MilitarySituationManager {
  private activeSituation: MilitarySituation | null = null
  private activeTactic: MilitaryTactic | null = null
  private situationStartWave: number = 0
  private situationEndWave: number = 0
  private lastTriggeredWave: number = 0
  private previousSituationId: MilitarySituationId | null = null
  private killCounterForHeal: number = 0
  private callbacks: MilitarySituationCallbacks = {}

  constructor(callbacks?: MilitarySituationCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks
    }
  }

  setCallbacks(callbacks: MilitarySituationCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * 检查指定波次是否触发天时军情（无尽模式下每10波触发一次）
   * @param waveNumber 当前波次编号
   * @returns 触发的军情（若无可触发则返回 null）
   */
  checkWave(waveNumber: number): MilitarySituation | null {
    // 仅在第 10, 20, 30... 波且尚未触发过该波次时激活
    if (waveNumber < 10 || waveNumber % 10 !== 0 || waveNumber === this.lastTriggeredWave) {
      // 检查当前已生效篇章是否已过 10 波时效
      if (this.activeSituation && waveNumber > this.situationEndWave) {
        this.activeSituation = null
        this.activeTactic = null
      }
      return null
    }

    this.lastTriggeredWave = waveNumber
    this.situationStartWave = waveNumber
    this.situationEndWave = waveNumber + 9 // 持续整整 10 波（例如 10~19）

    // 随机选择一个不同于上一篇章的军情
    const pool = (Object.keys(MILITARY_SITUATIONS) as MilitarySituationId[]).filter(
      id => id !== this.previousSituationId
    )
    const pickedId = pool[Math.floor(Math.random() * pool.length)] || 'sit_river_fog'
    this.previousSituationId = pickedId

    this.activeSituation = MILITARY_SITUATIONS[pickedId]
    this.activeTactic = null // 待军师二选一抉择
    this.killCounterForHeal = 0

    if (this.callbacks.onSituationTriggered) {
      this.callbacks.onSituationTriggered(this.activeSituation)
    }

    return this.activeSituation
  }

  /**
   * 玩家决断选取策论（上策 / 下策）
   */
  selectTactic(type: MilitaryTacticType): MilitaryTactic | null {
    if (!this.activeSituation) return null

    this.activeTactic = this.activeSituation.tactics[type]
    this.killCounterForHeal = 0

    if (this.callbacks.onTacticApplied) {
      this.callbacks.onTacticApplied(this.activeTactic)
    }

    return this.activeTactic
  }

  /**
   * 获取当前生效的军情
   */
  getActiveSituation(): MilitarySituation | null {
    return this.activeSituation
  }

  /**
   * 获取当前生效的策论
   */
  getActiveTactic(): MilitaryTactic | null {
    return this.activeTactic
  }

  /**
   * 当前是否处于军情有效篇章中
   */
  isSituationActive(): boolean {
    return this.activeSituation !== null && this.activeTactic !== null
  }

  // --- 属性修饰器查询接口 ---

  /** 远程射程倍率加成（如烽燧照夜 +30%） */
  getRangedRangeMultiplier(): number {
    return this.activeTactic?.modifiers.rangedRangeMultiplier ?? 1.0
  }

  /** 远程破甲穿透比例（如烽燧照夜 +25%） */
  getRangedDefensePenetration(): number {
    return this.activeTactic?.modifiers.rangedDefensePenetration ?? 0.0
  }

  /** 近战攻击速度倍率（如借雾设伏 +40%） */
  getMeleeAttackSpeedMultiplier(): number {
    return this.activeTactic?.modifiers.meleeAttackSpeedMultiplier ?? 1.0
  }

  /** 近战暴击率加成（如借雾设伏 +30%） */
  getMeleeCritChanceBonus(): number {
    return this.activeTactic?.modifiers.meleeCritChanceBonus ?? 0.0
  }

  /** 近战受到伤害减免比例（如借雾设伏 -30%） */
  getMeleeDamageReduction(): number {
    return this.activeTactic?.modifiers.meleeDamageReduction ?? 0.0
  }

  /** 木生火【燎原】火海范围倍率（如顺风纵火 +60%） */
  getWildfireRadiusMultiplier(): number {
    return this.activeTactic?.modifiers.wildfireRadiusMultiplier ?? 1.0
  }

  /** 灼烧与流血伤害倍率（如顺风纵火 +60%） */
  getBurnBleedDamageMultiplier(): number {
    return this.activeTactic?.modifiers.burnBleedDamageMultiplier ?? 1.0
  }

  /** 全军防御提升比例（如严阵筑垒 +35%） */
  getGlobalDefenseBonus(): number {
    return this.activeTactic?.modifiers.globalDefenseBonus ?? 0.0
  }

  /** 水系伤害倍率（如引水灌城 +45%） */
  getWaterDamageMultiplier(): number {
    return this.activeTactic?.modifiers.waterDamageMultiplier ?? 1.0
  }

  /** 水生木【滋养】定身缠绕时长倍率（如引水灌城 +75%） */
  getNourishDurationMultiplier(): number {
    return this.activeTactic?.modifiers.nourishDurationMultiplier ?? 1.0
  }

  /** 金生水【碎冰】爆炸范围倍率（如雷动九天 +80%） */
  getShatterRadiusMultiplier(): number {
    return this.activeTactic?.modifiers.shatterRadiusMultiplier ?? 1.0
  }

  /** 金系普攻触发天雷击退概率（如雷动九天 25%） */
  getThunderKnockbackChance(): number {
    return this.activeTactic?.modifiers.thunderKnockbackChance ?? 0.0
  }

  /** 是否激活要道墨色拒马（如列阵设拒） */
  hasBarricade(): boolean {
    return Boolean(this.activeTactic?.modifiers.hasBarricade)
  }

  /** 帅营周边 200px 友军攻击加成（如诱敌深入 2.0 倍） */
  getNearBaseAttackMultiplier(): number {
    return this.activeTactic?.modifiers.nearBaseAttackMultiplier ?? 1.0
  }

  /** 帅营周边 200px 斩敌军费加成（如诱敌深入 2.0 倍） */
  getNearBaseRewardMultiplier(): number {
    return this.activeTactic?.modifiers.nearBaseRewardMultiplier ?? 1.0
  }

  /** 斩敌军费与能量收益倍率（如夺粮劫草 1.5 倍） */
  getCostAndEnergyMultiplier(): number {
    return this.activeTactic?.modifiers.costAndEnergyMultiplier ?? 1.0
  }

  /** 敌军初始护甲削减比例（如攻心瓦解 40%） */
  getEnemyArmorReduction(): number {
    return this.activeTactic?.modifiers.enemyArmorReduction ?? 0.0
  }

  /** 五行相生相克对首领反应增伤倍率（如攻心瓦解 1.5 倍） */
  getReactionDamageMultiplier(): number {
    return this.activeTactic?.modifiers.reactionDamageMultiplier ?? 1.0
  }

  /**
   * 击杀敌人回调：若激活【严阵筑垒】，每消灭 N 只敌人修缮帅营 1 点生命
   * @returns 修复的生命点数（0 或 1）
   */
  onEnemyKilled(): number {
    const required = this.activeTactic?.modifiers.killHealBaseCounter
    if (!required || required <= 0) return 0

    this.killCounterForHeal++
    if (this.killCounterForHeal >= required) {
      this.killCounterForHeal = 0
      return 1
    }
    return 0
  }

  /**
   * 重置所有军情状态
   */
  reset(): void {
    this.activeSituation = null
    this.activeTactic = null
    this.situationStartWave = 0
    this.situationEndWave = 0
    this.lastTriggeredWave = 0
    this.previousSituationId = null
    this.killCounterForHeal = 0
  }
}
