import { WuXing } from '@/types/wuxing.types'
import { Augment, StratagemState } from '@/types/augment'
import { AUGMENT_POOL, REPEATABLE_AUGMENTS } from '@/data/augments'
import { ElementalReactionManager } from '@/core/elemental/ElementalReactionManager'

export interface AugmentManagerCallbacks {
  onHealBase?: (amount: number) => void
  onAddMaxHealthBase?: (amount: number) => void
  onStratagemReady?: (readyCount: number) => void
}

/**
 * 军师锦囊（天命肉鸽）管理器
 * 负责局内能量充能、锦囊卡池抽取、三选一选择与全局词条加成计算
 */
export class AugmentManager {
  private currentEnergy: number = 0
  private readonly maxEnergy: number = 100
  private readyCount: number = 0
  private rerollCount: number = 1
  private activeAugments: Augment[] = []

  // 累积效果缓存
  private totalAttackPercentBonus: number = 0
  private totalAttackSpeedBonus: number = 0
  private totalAttackRangeBonus: number = 0
  private totalReactionMultiplierBonus: number = 0
  private totalCostGainBonus: number = 0
  private totalCounterMultiplierBonus: number = 0

  private callbacks: AugmentManagerCallbacks = {}

  constructor(callbacks?: AugmentManagerCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks
    }
  }

  public setCallbacks(callbacks: AugmentManagerCallbacks): void {
    this.callbacks = callbacks
  }

  /**
   * 击杀敌人充能
   * @param enemyType 敌人类型 ('normal' | 'elite' | 'boss')
   * @returns 是否有新的锦囊就绪
   */
  public onEnemyKilled(enemyType: string = 'normal'): boolean {
    let gain = 6
    if (enemyType === 'elite') gain = 25
    if (enemyType === 'boss') gain = 60

    return this.addEnergy(gain)
  }

  /**
   * 增加军令能量
   */
  public addEnergy(amount: number): boolean {
    this.currentEnergy += amount
    let becameReady = false

    while (this.currentEnergy >= this.maxEnergy) {
      this.currentEnergy -= this.maxEnergy
      this.readyCount++
      becameReady = true
    }

    if (becameReady && this.callbacks.onStratagemReady) {
      this.callbacks.onStratagemReady(this.readyCount)
    }

    return becameReady
  }

  /**
   * 直接奖励一个就绪锦囊（例如Boss掉落密函）
   */
  public grantInstantStratagem(): void {
    this.readyCount++
    if (this.callbacks.onStratagemReady) {
      this.callbacks.onStratagemReady(this.readyCount)
    }
  }

  public getEnergyProgress(): number {
    return Math.min(1, this.currentEnergy / this.maxEnergy)
  }

  public getReadyCount(): number {
    return this.readyCount
  }

  public getRerollCount(): number {
    return this.rerollCount
  }

  public getActiveAugments(): Augment[] {
    return [...this.activeAugments]
  }

  /**
   * 从卡池中抽取 3 个候选锦囊
   * 算法会根据出场英雄的阵营与五行属性进行智能加权推荐
   */
  public drawOptions(
    deployedHeroIds: string[] = [],
    deployedWuXing: WuXing[] = [],
    count: number = 3
  ): Augment[] {
    const activeIds = new Set(this.activeAugments.filter(a => !a.repeatable).map(a => a.id))

    // 过滤掉不可重复且已选择的锦囊
    let candidates = AUGMENT_POOL.filter(aug => !activeIds.has(aug.id))

    // 如果未选取的唯一锦囊不足所抽数量，以可重复精进锦囊补足（保证永不枯竭）
    if (candidates.length < count) {
      const needed = count - candidates.length
      const shuffledRepeatables = [...REPEATABLE_AUGMENTS].sort(() => Math.random() - 0.5)
      candidates = [...candidates, ...shuffledRepeatables.slice(0, needed)]
    }

    if (candidates.length <= count) {
      return [...candidates]
    }

    // 智能权重计算
    const weightedPool: { augment: Augment; weight: number }[] = candidates.map(aug => {
      let weight = 10

      // 英雄专属判定
      if (aug.heroRequirement) {
        if (deployedHeroIds.includes(aug.heroRequirement)) {
          weight += 25 // 场上有对应英雄，权重极大提升
        } else {
          weight = 1 // 场上没有对应英雄，几乎不出现
        }
      }

      // 五行相生共鸣判定
      if (aug.wuXingRequirement && aug.wuXingRequirement.length > 0) {
        const matches = aug.wuXingRequirement.filter(w => deployedWuXing.includes(w))
        if (matches.length === aug.wuXingRequirement.length) {
          weight += 30 // 全匹配五行共鸣组合，极高权重
        } else if (matches.length > 0) {
          weight += 12 // 部分匹配
        }
      }

      // 品质基底权重
      if (aug.rarity === 'common') weight *= 1.2
      else if (aug.rarity === 'rare') weight *= 1.0
      else if (aug.rarity === 'epic') weight *= 0.65
      else if (aug.rarity === 'legendary') weight *= 0.35

      return { augment: aug, weight: Math.max(1, weight) }
    })

    // 无放回加权抽样
    const selected: Augment[] = []
    const available = [...weightedPool]

    for (let i = 0; i < count && available.length > 0; i++) {
      const totalWeight = available.reduce((sum, item) => sum + item.weight, 0)
      let randomVal = Math.random() * totalWeight

      let chosenIndex = 0
      for (let j = 0; j < available.length; j++) {
        randomVal -= available[j].weight
        if (randomVal <= 0) {
          chosenIndex = j
          break
        }
      }

      selected.push(available[chosenIndex].augment)
      available.splice(chosenIndex, 1)
    }

    return selected
  }

  /**
   * 刷新抽卡候选
   */
  public reroll(
    deployedHeroIds: string[] = [],
    deployedWuXing: WuXing[] = []
  ): Augment[] | null {
    if (this.rerollCount <= 0) return null
    this.rerollCount--
    return this.drawOptions(deployedHeroIds, deployedWuXing, 3)
  }

  /**
   * 玩家确认选择锦囊
   */
  public selectAugment(augment: Augment): void {
    if (this.readyCount > 0) {
      this.readyCount--
    }

    this.activeAugments.push(augment)
    const eff = augment.effects

    // 叠加通用属性
    if (eff.attackPercentBonus) this.totalAttackPercentBonus += eff.attackPercentBonus
    if (eff.attackSpeedBonus) this.totalAttackSpeedBonus += eff.attackSpeedBonus
    if (eff.attackRangeBonus) this.totalAttackRangeBonus += eff.attackRangeBonus
    if (eff.reactionDamageMultiplier) {
      this.totalReactionMultiplierBonus += eff.reactionDamageMultiplier
      ElementalReactionManager.getInstance().setReactionDamageMultiplier(
        1.0 + this.totalReactionMultiplierBonus
      )
    }
    if (eff.costGainBonus) this.totalCostGainBonus += eff.costGainBonus
    if (eff.counterMultiplierBonus) this.totalCounterMultiplierBonus += eff.counterMultiplierBonus

    // 触发即时效果
    if (eff.baseHealthHeal && this.callbacks.onHealBase) {
      this.callbacks.onHealBase(eff.baseHealthHeal)
    }
    if (eff.baseMaxHealthBonus && this.callbacks.onAddMaxHealthBase) {
      this.callbacks.onAddMaxHealthBase(eff.baseMaxHealthBonus)
    }

    // 特殊专属机制
    if (eff.specialId === 'aug_celestial_tome') {
      this.rerollCount += 2
    }
  }

  // ==================== 属性加成查询 ====================

  public getAttackPercentBonus(): number {
    return this.totalAttackPercentBonus
  }

  public getAttackSpeedBonus(): number {
    return this.totalAttackSpeedBonus
  }

  public getAttackRangeBonus(): number {
    return this.totalAttackRangeBonus
  }

  public getCostGainMultiplier(): number {
    return 1.0 + this.totalCostGainBonus
  }

  public getCounterMultiplierBonus(): number {
    return this.totalCounterMultiplierBonus
  }

  public hasSpecialAugment(specialId: string): boolean {
    return this.activeAugments.some(a => a.effects.specialId === specialId)
  }

  /**
   * 重置单局状态
   */
  public reset(): void {
    this.currentEnergy = 0
    this.readyCount = 0
    this.rerollCount = 1
    this.activeAugments = []
    this.totalAttackPercentBonus = 0
    this.totalAttackSpeedBonus = 0
    this.totalAttackRangeBonus = 0
    this.totalReactionMultiplierBonus = 0
    this.totalCostGainBonus = 0
    this.totalCounterMultiplierBonus = 0
  }
}
