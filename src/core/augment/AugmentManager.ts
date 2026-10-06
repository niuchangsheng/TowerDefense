import { WuXing } from '@/types/wuxing.types'
import { Augment } from '@/types/augment'
import { AUGMENT_POOL, REPEATABLE_AUGMENTS } from '@/data/augments'
import { ElementalReactionManager } from '@/core/elemental/ElementalReactionManager'

export interface AugmentManagerCallbacks {
  onHealBase?: (amount: number) => void
  onAddMaxHealthBase?: (amount: number) => void
  onStratagemReady?: (readyCount: number) => void
}

/** 15 波紧凑战役中固定触发锦囊三选一的波次节点（共 5 次：W1开局，W4/W7/W10/W13清波后） */
export const CAMPAIGN_CLEAR_AUGMENT_WAVES: readonly number[] = [4, 7, 10, 13]

/**
 * 军师锦囊（天命肉鸽）管理器
 * 负责局内 5 次自选锦囊节奏、能量充能、保底 1 张在场五行契合牌 + 纯随机抽取、2 枚免费易策令与四乘区加成汇总
 */
export class AugmentManager {
  private currentEnergy: number = 0
  private readonly maxEnergy: number = 100
  private readyCount: number = 0
  /** 每局默认附带 2 枚免费【易策令】（重抽机会） */
  private rerollCount: number = 2
  private activeAugments: Augment[] = []
  private triggeredWaveAugments: Set<number> = new Set()

  // 四独立乘区与基础通用累积效果缓存
  private totalAttackPercentBonus: number = 0
  private totalAttackSpeedBonus: number = 0
  private totalAttackRangeBonus: number = 0
  private totalCritRateBonus: number = 0
  private totalCritDamageBonus: number = 0
  private totalDamageIncreaseBonus: number = 0
  private totalVulnerabilityBonus: number = 0
  private totalReactionMultiplierBonus: number = 0
  private totalCostGainBonus: number = 0
  private totalCounterMultiplierBonus: number = 0
  private woodenOxRerollStacks: number = 0

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
   * 检查并触发 15 波战役的 5 次固定节点锦囊（Wave 1 开局，Wave 4 / 7 / 10 / 13 清波后）
   * @param waveNumber 波次编号
   * @param timing 'start' | 'clear'
   * @returns 是否触发了新的锦囊三选一
   */
  public checkAndTriggerWaveAugment(waveNumber: number, timing: 'start' | 'clear'): boolean {
    if (timing === 'start' && waveNumber === 1 && !this.triggeredWaveAugments.has(1)) {
      this.triggeredWaveAugments.add(1)
      this.grantInstantStratagem()
      return true
    }
    if (
      timing === 'clear' &&
      CAMPAIGN_CLEAR_AUGMENT_WAVES.includes(waveNumber) &&
      !this.triggeredWaveAugments.has(waveNumber)
    ) {
      this.triggeredWaveAugments.add(waveNumber)
      this.grantInstantStratagem()
      return true
    }
    return false
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
   * 直接奖励一个就绪锦囊（例如固定波次节点或 Boss 掉落密函）
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
   * 规则：取消按已选流派隐性加权推荐的温室算法，恢复肉鸽随机性！
   * 每次三选一仅保底 1 张与当前在场武将或五行相关的锦囊，其余 2 张从可用池纯粹随机抽取。
   */
  public drawOptions(
    deployedHeroIds: string[] = [],
    deployedWuXing: WuXing[] = [],
    count: number = 3
  ): Augment[] {
    const activeIds = new Set(this.activeAugments.filter(a => !a.repeatable).map(a => a.id))

    const unpickedUnique = AUGMENT_POOL.filter(aug => !activeIds.has(aug.id))
    const allCandidates = [...unpickedUnique, ...REPEATABLE_AUGMENTS]

    // 若场上有部署英雄，过滤掉未登场英雄的专属卡（避免抽到未上阵英雄死卡）
    const validCandidates = allCandidates.filter(aug => {
      if (aug.heroRequirement && deployedHeroIds.length > 0) {
        return deployedHeroIds.includes(aug.heroRequirement)
      }
      return true
    })

    const pool = validCandidates.length >= count ? [...validCandidates] : [...allCandidates]
    if (pool.length <= count) {
      return [...pool]
    }

    const selected: Augment[] = []

    // 槽位 1：保底 1 张与在场五行或已部署武将相关的契合牌
    if (deployedHeroIds.length > 0 || deployedWuXing.length > 0) {
      const matchingPool = pool.filter(aug => {
        if (aug.heroRequirement && deployedHeroIds.includes(aug.heroRequirement)) {
          return true
        }
        if (aug.wuXingRequirement && aug.wuXingRequirement.some(w => deployedWuXing.includes(w))) {
          return true
        }
        return false
      })

      if (matchingPool.length > 0) {
        const idx = Math.floor(Math.random() * matchingPool.length)
        const picked = matchingPool[idx]
        selected.push(picked)
        const poolIdx = pool.findIndex(a => a.id === picked.id)
        if (poolIdx !== -1) {
          pool.splice(poolIdx, 1)
        }
      }
    }

    // 其余槽位：从剩余可用池中纯粹随机无放回抽取
    while (selected.length < count && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length)
      selected.push(pool[idx])
      pool.splice(idx, 1)
    }

    return selected
  }

  /**
   * 使用【易策令】刷新抽卡候选
   * 若已激活《木牛流马》（aug_wooden_ox），每次使用易策令换牌时，全军获得 +3% 攻击力与 +3% 攻速（最多叠 5 次至 +15%）
   */
  public reroll(
    deployedHeroIds: string[] = [],
    deployedWuXing: WuXing[] = []
  ): Augment[] | null {
    if (this.rerollCount <= 0) return null
    this.rerollCount--

    if (this.hasSpecialAugment('aug_wooden_ox') && this.woodenOxRerollStacks < 5) {
      this.woodenOxRerollStacks++
      this.totalAttackPercentBonus += 0.03
      this.totalAttackSpeedBonus += 0.03
    }

    return this.drawOptions(deployedHeroIds, deployedWuXing, 3)
  }

  /**
   * 增加【易策令】（刷新令）次数
   */
  public grantRerolls(count: number = 1): void {
    this.rerollCount += count
  }

  /**
   * 玩家确认选择锦囊（严格归入四独立伤害乘区加算）
   */
  public selectAugment(augment: Augment): void {
    if (this.readyCount > 0) {
      this.readyCount--
    }

    this.activeAugments.push(augment)
    const eff = augment.effects

    // 叠加通用属性与四独立乘区加成
    if (eff.attackPercentBonus) this.totalAttackPercentBonus += eff.attackPercentBonus
    if (eff.attackSpeedBonus) this.totalAttackSpeedBonus += eff.attackSpeedBonus
    if (eff.attackRangeBonus) this.totalAttackRangeBonus += eff.attackRangeBonus
    if (eff.critRateBonus) this.totalCritRateBonus += eff.critRateBonus
    if (eff.critDamageBonus) this.totalCritDamageBonus += eff.critDamageBonus
    if (eff.damageIncreaseBonus) this.totalDamageIncreaseBonus += eff.damageIncreaseBonus
    if (eff.vulnerabilityBonus) this.totalVulnerabilityBonus += eff.vulnerabilityBonus

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
    if (eff.specialId === 'aug_celestial_tome' || eff.specialId === 'aug_wooden_ox') {
      this.rerollCount += 2
    } else if (eff.specialId === 'aug_vaporize_burst') {
      ElementalReactionManager.getInstance().setVaporizeShockwave(true)
    }
  }

  // ==================== 四独立乘区与属性加成查询 ====================

  /** 乘区 2：攻击力加成区 */
  public getAttackPercentBonus(): number {
    return this.totalAttackPercentBonus
  }

  /** 乘区 3：增伤加成区 */
  public getDamageIncreaseBonus(): number {
    return this.totalDamageIncreaseBonus
  }

  /** 乘区 3（相生反应部分）：五行相生反应伤害加成 */
  public getReactionMultiplierBonus(): number {
    return this.totalReactionMultiplierBonus
  }

  /** 乘区 4：易伤加成区 */
  public getVulnerabilityBonus(): number {
    return this.totalVulnerabilityBonus
  }

  /** 暴击区：暴击率与暴击伤害加成 */
  public getCritRateBonus(): number {
    return this.totalCritRateBonus
  }

  public getCritDamageBonus(): number {
    return this.totalCritDamageBonus
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

  public getWoodenOxRerollStacks(): number {
    return this.woodenOxRerollStacks
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
    this.rerollCount = 2
    this.activeAugments = []
    this.triggeredWaveAugments.clear()
    this.totalAttackPercentBonus = 0
    this.totalAttackSpeedBonus = 0
    this.totalAttackRangeBonus = 0
    this.totalCritRateBonus = 0
    this.totalCritDamageBonus = 0
    this.totalDamageIncreaseBonus = 0
    this.totalVulnerabilityBonus = 0
    this.totalReactionMultiplierBonus = 0
    this.totalCostGainBonus = 0
    this.totalCounterMultiplierBonus = 0
    this.woodenOxRerollStacks = 0
    ElementalReactionManager.getInstance().setVaporizeShockwave(false)
  }
}
