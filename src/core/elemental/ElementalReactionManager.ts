import Phaser from 'phaser'
import { WuXing, Point } from '@/types'
import {
  ElementalStatusType,
  ElementalReactionType,
  ActiveElementalStatus,
  ElementalReactionResult
} from '@/types/elemental'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { EnemyManager } from '@/core/enemy/EnemyManager'
import { CharacterAttackFX } from '@/effects/CharacterAttackFX'
import { DamageCalculator } from '@/core/battle/DamageCalculator'

export interface HandleAttackOptions {
  /** 攻击者武将ID */
  attackerHeroId?: string
  /** 与该攻击者结成 160px 相生阵脉的搭档五行（优先锁定该搭档元素触发相生） */
  leylinePartnerWuXing?: WuXing
  /** 目标是否处于 160px 相生阵脉射程交叠区内（元素衰减减缓 30%，反应增伤 +35%，破铁壁效率 +35%） */
  inLeylineOverlap?: boolean
  /** 天时得令/失令等增伤区加成（加算入增伤区） */
  weatherDamageBonus?: number
  /** 易伤区加成（如《五气朝元》、破壁瘫痪等，加算入易伤区） */
  vulnerabilityBonus?: number
  /** 攻击者暴击率 */
  critRate?: number
  /** 攻击者暴击伤害 */
  critDamage?: number
  /** 4★ 将星命盘或神兵赋予的额外破铁壁效率加成 */
  aegisBreakBonus?: number
}

/**
 * 五行元素连锁反应管理器（全局单例）
 * 严格遵循《三国五行塔防》第一性原理设计规范：
 * 1. 五大基础状态（裂/毒/湿/灼/重）默认紧凑附着 2.5s (2500ms)，多元素独立并存；
 * 2. 触发相生反应【绝不抹除】底层克制状态，改为对同一目标设有 1.5s (1500ms) 同名相生反应内置冷却 (ICD)；
 * 3. 【相生共鸣取优法则】：反应基础基数始终取双将中 max(A, B) + 0.25 * min(A, B)；
 * 4. 【160px 相生阵脉连线】：优先定向锁搭档元素，交叠区衰减减缓 30%、反应威力与破壁效率 +35%（归入增伤区加算）；
 * 5. 严格一对一属性边界：土·重与火生土·熔岩专克【韧性 & 刚毅】，严禁附带减速或破甲。
 */
export class ElementalReactionManager {
  public static readonly DEFAULT_ATTACHMENT_MS = 2500
  public static readonly DEFAULT_REACTION_ICD_MS = 1500

  private static instance: ElementalReactionManager | null = null
  private scene?: Phaser.Scene
  private enemyManager?: EnemyManager

  /**
   * 敌人身上并存的五大五行状态：Map<EnemyId, Map<WuXing, ActiveElementalStatus>>
   */
  private multiStatusMap: Map<string, Map<WuXing, ActiveElementalStatus>> = new Map()

  /**
   * 同目标同名相生反应内置冷却时间戳：Map<EnemyId, Map<ElementalReactionType, number>>
   */
  private reactionIcdMap: Map<string, Map<ElementalReactionType, number>> = new Map()

  /** 当前全局相生反应内置冷却时长（默认 1500ms，锦囊可缩短至 900ms） */
  private reactionIcdMs: number = ElementalReactionManager.DEFAULT_REACTION_ICD_MS

  /** 当前全局基础元素附着窗口时长（默认 2500ms；百战二重烽火 Wave 26+ 收紧至 2000ms） */
  private attachmentDurationMs: number = ElementalReactionManager.DEFAULT_ATTACHMENT_MS

  /** 全局元素反应伤害倍率修正（1.0 为基准，超出部分归入增伤区加算） */
  private reactionDamageMultiplier: number = 1.0

  /** 水火蒸发冲击波（兼容保留） */
  private vaporizeShockwaveEnabled: boolean = false

  /** 模拟时钟（当无 Phaser Scene 时用于单元测试 ICD 判定） */
  private mockNowMs: number = 10000

  /** Boss 铁壁完全击穿时的回调（用于通知 BattleSystem 充能 +35% 军令能量） */
  private onBossAegisShatteredCallback?: (enemy: EnemyEntity, reactionType: ElementalReactionType) => void

  constructor(scene?: Phaser.Scene, enemyManager?: EnemyManager) {
    this.scene = scene
    this.enemyManager = enemyManager
  }

  public static getInstance(scene?: Phaser.Scene, enemyManager?: EnemyManager): ElementalReactionManager {
    if (!this.instance) {
      this.instance = new ElementalReactionManager(scene, enemyManager)
    } else {
      if (scene) this.instance.scene = scene
      if (enemyManager) this.instance.enemyManager = enemyManager
    }
    return this.instance
  }

  public setOnBossAegisShattered(cb: (enemy: EnemyEntity, reactionType: ElementalReactionType) => void): void {
    this.onBossAegisShatteredCallback = cb
  }

  public setReactionDamageMultiplier(multiplier: number): void {
    this.reactionDamageMultiplier = Math.max(0.1, multiplier)
  }

  public getReactionDamageMultiplier(): number {
    return this.reactionDamageMultiplier
  }

  public setReactionIcdMs(icdMs: number): void {
    this.reactionIcdMs = Math.max(300, icdMs)
  }

  public getReactionIcdMs(): number {
    return this.reactionIcdMs
  }

  public setAttachmentDurationMs(durationMs: number): void {
    this.attachmentDurationMs = Math.max(1000, durationMs)
  }

  public getAttachmentDurationMs(): number {
    return this.attachmentDurationMs
  }

  public advanceMockTime(deltaMs: number): void {
    this.mockNowMs += deltaMs
  }

  private getNowMs(): number {
    return this.scene?.time?.now ?? this.mockNowMs
  }

  public setVaporizeShockwave(enabled: boolean): void {
    this.vaporizeShockwaveEnabled = enabled
  }

  public isVaporizeShockwaveEnabled(): boolean {
    return this.vaporizeShockwaveEnabled
  }

  /**
   * 获取敌人身上的唯一标识（优先取 instanceId，兼容单元测试中的 id）
   */
  private getEnemyKey(target: EnemyEntity): string {
    const data = target.getEnemyData() as any
    return data.instanceId || data.id || 'unknown_enemy'
  }

  /**
   * 当英雄对敌人造成五行附着攻击时调用
   * 1. 先挂载/刷新本次攻击对应的基础五行状态（持续 2.5s，交叠区内延长至 3.25s）；
   * 2. 检查目标身上并存的其他五行状态是否构成【五行相生】（若有 160px 阵脉搭档则优先锁定搭档元素）；
   * 3. 若命中相生且未处于该目标 1.5s 同名反应 ICD 中，则触发相生反应（绝不抹除底层状态！）。
   */
  public handleAttack(
    target: EnemyEntity,
    attackerWuXing: WuXing,
    baseAttack: number,
    options?: HandleAttackOptions
  ): ElementalReactionResult | null {
    if (!target.active || target.getEnemyData().currentHealth <= 0) {
      return null
    }

    const enemyId = this.getEnemyKey(target)
    let enemyStatuses = this.multiStatusMap.get(enemyId)
    if (!enemyStatuses) {
      enemyStatuses = new Map()
      this.multiStatusMap.set(enemyId, enemyStatuses)
    }

    // 1. 查找可与本次攻击产生相生反应的已附着状态（优先【160px 阵脉定向反应锁】）
    let matchedStatus: ActiveElementalStatus | undefined
    let matchedReaction: ElementalReactionType | null = null

    if (options?.leylinePartnerWuXing && enemyStatuses.has(options.leylinePartnerWuXing)) {
      const candidate = enemyStatuses.get(options.leylinePartnerWuXing)!
      const rx = this.checkReaction(candidate.wuXing, attackerWuXing)
      if (rx && !this.isReactionOnCooldown(enemyId, rx)) {
        matchedStatus = candidate
        matchedReaction = rx
      }
    }

    if (!matchedReaction) {
      for (const existing of enemyStatuses.values()) {
        if (existing.wuXing === attackerWuXing) continue
        const rx = this.checkReaction(existing.wuXing, attackerWuXing)
        if (rx && !this.isReactionOnCooldown(enemyId, rx)) {
          matchedStatus = existing
          matchedReaction = rx
          break
        }
      }
    }

    // 2. 始终挂载/刷新当前攻击的五行基础状态（相生绝不抹除底层状态！）
    this.applyElementalStatus(target, attackerWuXing, baseAttack, options)

    // 3. 若满足相生反应条件且未在 ICD 内，立即触发相生化学连锁
    if (matchedReaction && matchedStatus) {
      this.recordReactionCooldown(enemyId, matchedReaction)
      return this.triggerReaction(matchedReaction, target, attackerWuXing, baseAttack, matchedStatus, options)
    }

    return null
  }

  /**
   * 检查目标敌人的指定相生反应是否处于 1.5s 内置冷却 (ICD) 中
   */
  public isReactionOnCooldown(enemyId: string, reaction: ElementalReactionType): boolean {
    const enemyIcds = this.reactionIcdMap.get(enemyId)
    if (!enemyIcds) return false
    const lastTrigger = enemyIcds.get(reaction)
    if (lastTrigger === undefined) return false
    const now = this.getNowMs()
    return now - lastTrigger < this.reactionIcdMs
  }

  private recordReactionCooldown(enemyId: string, reaction: ElementalReactionType): void {
    let enemyIcds = this.reactionIcdMap.get(enemyId)
    if (!enemyIcds) {
      enemyIcds = new Map()
      this.reactionIcdMap.set(enemyId, enemyIcds)
    }
    enemyIcds.set(reaction, this.getNowMs())
  }

  /**
   * 判定两个五行之间是否能产生五行相生反应（双向无序等价触发）
   */
  public checkReaction(
    existingWuXing: WuXing,
    newWuXing: WuXing
  ): ElementalReactionType | null {
    // 1. 水生木【滋养·蔓延】（水+木 双向判定）
    if (
      (existingWuXing === 'water' && newWuXing === 'wood') ||
      (existingWuXing === 'wood' && newWuXing === 'water')
    ) {
      return 'nourish'
    }

    // 2. 木生火【燎原·焚尽】（木+火 双向判定）
    if (
      (existingWuXing === 'wood' && newWuXing === 'fire') ||
      (existingWuXing === 'fire' && newWuXing === 'wood')
    ) {
      return 'wildfire'
    }

    // 3. 火生土【熔岩·焦土】（火+土 双向判定）
    if (
      (existingWuXing === 'fire' && newWuXing === 'earth') ||
      (existingWuXing === 'earth' && newWuXing === 'fire')
    ) {
      return 'magma'
    }

    // 4. 土生金【淬刃·锋芒】（土+金 双向判定）
    if (
      (existingWuXing === 'earth' && newWuXing === 'metal') ||
      (existingWuXing === 'metal' && newWuXing === 'earth')
    ) {
      return 'spikes'
    }

    // 5. 金生水【寒芒·碎冰】（金+水 双向判定）
    if (
      (existingWuXing === 'metal' && newWuXing === 'water') ||
      (existingWuXing === 'water' && newWuXing === 'metal')
    ) {
      return 'shatter'
    }

    return null
  }

  /**
   * 挂载五大基础五行状态（默认紧凑附着 2.5s = 2500ms；处于 160px 阵脉交叠区时衰减减缓 30%，即延长至 3250ms）
   */
  private applyElementalStatus(
    target: EnemyEntity,
    wuXing: WuXing,
    baseAttack: number,
    options?: HandleAttackOptions
  ): void {
    const enemyId = this.getEnemyKey(target)
    const duration = options?.inLeylineOverlap
      ? Math.round(this.attachmentDurationMs * 1.3)
      : this.attachmentDurationMs

    let statusType: ElementalStatusType

    switch (wuXing) {
      case 'water':
        // 【水·湿】专克【移动速度】：降低 35% 移速（唯一基础减速软控）
        statusType = 'wet'
        target.applySlow?.(0.35, duration)
        target.setElementalMark?.('water', '【湿】', '#29b6f6', duration)
        break
      case 'wood':
        // 【木·毒】专克【生命】：每秒 2% 最大生命毒伤（最多3层）+ 50% 禁疗压制
        statusType = 'parasite'
        target.applyPoison?.(duration, 0.02)
        target.setElementalMark?.('wood', '【毒】', '#4caf50', duration)
        break
      case 'fire':
        // 【火·灼】放大【攻击力】：每 0.5s 结算 20% 攻击力火伤（每秒 40%）+ 阵亡余烬爆燃传染
        statusType = 'burn'
        target.applyBurn?.(
          Math.max(8, Math.floor(baseAttack * 0.40)),
          duration,
          (deadEnemy) => this.triggerEmberExplosion(deadEnemy, baseAttack)
        )
        target.setElementalMark?.('fire', '【灼】', '#ff5722', duration)
        break
      case 'earth':
        // 【土·重】专克【韧性 & 刚毅】：降低 25% 韧性与 40% 刚毅（严禁附带破甲、减速或眩晕！）
        statusType = 'heavy'
        if (typeof target.applyHeavy === 'function') {
          target.applyHeavy(duration, 0.25, 0.40)
        }
        target.setElementalMark?.('earth', '【重】', '#a1887f', duration)
        break
      case 'metal':
        // 【金·裂】专克【防御】：唯一具备破甲能力的基础状态（降低 35% 防御）+ 移动流血真伤
        statusType = 'bleed'
        if (typeof target.applyBleed === 'function') {
          target.applyBleed(duration, 0.35, Math.max(6, Math.floor(baseAttack * 0.15)))
        } else {
          target.applyArmorBreak?.(duration, 0.35)
        }
        target.setElementalMark?.('metal', '【裂】', '#ffd54f', duration)
        break
    }

    let enemyStatuses = this.multiStatusMap.get(enemyId)
    if (!enemyStatuses) {
      enemyStatuses = new Map()
      this.multiStatusMap.set(enemyId, enemyStatuses)
    }

    const prevStatus = enemyStatuses.get(wuXing)
    const nextStacks = wuXing === 'wood' ? Math.min(3, (prevStatus?.stacks || 0) + 1) : 1

    const newStatus: ActiveElementalStatus = {
      type: statusType,
      wuXing,
      remainingMs: duration,
      totalMs: duration,
      stacks: nextStacks,
      attackerAttack: prevStatus ? Math.max(prevStatus.attackerAttack || 0, baseAttack) : baseAttack,
      attackerHeroId: options?.attackerHeroId || prevStatus?.attackerHeroId
    }

    enemyStatuses.set(wuXing, newStatus)

    // 到期后仅清理该元素自身状态，绝不影响其他并存元素
    if (this.scene?.time) {
      this.scene.time.delayedCall(duration, () => {
        const map = this.multiStatusMap.get(enemyId)
        if (map) {
          const cur = map.get(wuXing)
          if (cur === newStatus) {
            map.delete(wuXing)
            target.clearElementalMark?.(wuXing)
          }
        }
      })
    }
  }

  /**
   * 【火·灼】阵亡余烬爆燃：携带火·灼的目标阵亡时，向周围 80px 敌人传染火·灼并造成余烬溅射
   */
  private triggerEmberExplosion(deadEnemy: EnemyEntity, baseAttack: number): void {
    if (!this.enemyManager) return
    const pos: Point = { x: deadEnemy.x, y: deadEnemy.y }
    const nearby = this.enemyManager.getEnemiesInRange(pos, 80)
    const emberDmg = Math.max(10, Math.floor(baseAttack * 0.5))
    for (const near of nearby) {
      if (near !== deadEnemy && near.active && near.getEnemyData().currentHealth > 0) {
        near.takeDamage(emberDmg)
        this.applyElementalStatus(near, 'fire', baseAttack)
      }
    }
  }

  /**
   * 执行五大五行相生化学反应（遵循【相生共鸣取优法则】与【四独立乘区公式】，绝不抹除底层状态！）
   */
  private triggerReaction(
    reaction: ElementalReactionType,
    target: EnemyEntity,
    _newWuXing: WuXing,
    baseAttack: number,
    existingStatus: ActiveElementalStatus,
    options?: HandleAttackOptions
  ): ElementalReactionResult {
    const targetPos: Point = { x: target.x, y: target.y }

    // 1. 【相生共鸣取优法则】：基础伤害基数 = max(A, B) + 0.25 * min(A, B)
    const partnerAttack = existingStatus.attackerAttack ?? baseAttack
    const optimalBaseAttack = DamageCalculator.calculateReactionBaseAttack(partnerAttack, baseAttack)

    // 2. 【增伤区】区内加算：基础反应倍率修正 + 160px 阵脉交叠加成 (+35%) + 天时得令加成
    const reactionAugmentBonus = this.reactionDamageMultiplier - 1.0
    const leylineBonus = options?.inLeylineOverlap ? 0.35 : 0
    const weatherBonus = options?.weatherDamageBonus ?? 0
    const totalDmgIncreaseMult = Math.max(0.2, 1 + reactionAugmentBonus + leylineBonus + weatherBonus)

    // 3. 【易伤区】区内加算
    const totalVulnMult = Math.max(0.2, 1 + (options?.vulnerabilityBonus ?? 0))

    // 4. 破除 Boss【五行铁壁】或精英铁壁护盾
    const aegisBreakEfficiency = (options?.inLeylineOverlap ? 0.35 : 0) + (options?.aegisBreakBonus ?? 0)
    let aegisBrokenCount = 0
    if (typeof target.damageBossAegis === 'function' && (target.getEnemyData().currentAegisGrids ?? 0) > 0) {
      const aegisRes = target.damageBossAegis(reaction, aegisBreakEfficiency)
      aegisBrokenCount = aegisRes.brokenGrids
      if (aegisRes.shatteredAll && this.onBossAegisShatteredCallback) {
        this.onBossAegisShatteredCallback(target, reaction)
      }
    } else {
      target.breakIroncladShield?.(reaction)
    }

    const fx = this.scene ? new CharacterAttackFX(this.scene) : null
    let result: ElementalReactionResult

    switch (reaction) {
      case 'nourish': {
        // 水生木【滋养·蔓延】：将【水·湿】软控升级为 2.0s 藤蔓硬控定身，并向周围 90px 扩散【木·毒】
        const extraDmg = Math.floor(optimalBaseAttack * 1.5 * totalDmgIncreaseMult * totalVulnMult)
        target.takeDamage(extraDmg, true)
        target.applyStun(2000)

        if (this.enemyManager) {
          const nearby = this.enemyManager.getEnemiesInRange(targetPos, 90)
          for (const near of nearby) {
            if (near !== target) {
              this.applyElementalStatus(near, 'wood', optimalBaseAttack)
            }
          }
        }

        this.showReactionBanner(targetPos, '【水生木·滋养】', '#00e676')
        result = {
          reactionType: 'nourish',
          reactionName: '水生木·滋养',
          color: '#00e676',
          extraDamage: extraDmg,
          baseReactionAttack: optimalBaseAttack,
          leylineBoosted: Boolean(options?.inLeylineOverlap),
          aegisGridsBroken: aegisBrokenCount,
          aoeRadius: 90,
          ccDuration: 2000,
          position: targetPos
        }
        break
      }

      case 'wildfire': {
        // 木生火【燎原·焚尽】：引爆【木·毒】造成瞬间最大生命百分比爆发 + 110px 范围火海挂【火·灼】
        const enemyData = target.getEnemyData()
        const poisonStacks = Math.max(1, target.getPoisonLayers?.() || existingStatus.stacks || 1)
        const maxHpBurst = Math.min(optimalBaseAttack * 3, Math.floor((enemyData.maxHealth || 0) * 0.025 * poisonStacks))
        const extraDmg = Math.floor((optimalBaseAttack * 2.4 + maxHpBurst) * totalDmgIncreaseMult * totalVulnMult)
        target.takeDamage(extraDmg, true)

        if (this.enemyManager) {
          const nearby = this.enemyManager.getEnemiesInRange(targetPos, 110)
          for (const near of nearby) {
            if (near !== target) {
              near.takeDamage(Math.floor(extraDmg * 0.75), true)
            }
            this.applyElementalStatus(near, 'fire', optimalBaseAttack)
            near.hitShake?.(5)
          }
        }

        this.showReactionBanner(targetPos, '【木生火·燎原】', '#ff3d00')
        result = {
          reactionType: 'wildfire',
          reactionName: '木生火·燎原',
          color: '#ff3d00',
          extraDamage: extraDmg,
          baseReactionAttack: optimalBaseAttack,
          leylineBoosted: Boolean(options?.inLeylineOverlap),
          aegisGridsBroken: aegisBrokenCount,
          aoeRadius: 110,
          position: targetPos
        }
        break
      }

      case 'magma': {
        // 火生土【熔岩·焦土】：生成 4.0s 熔岩焦土，区域内削减 40% 韧性与 60% 刚毅（严禁附带减速与破甲！）
        const extraDmg = Math.floor(optimalBaseAttack * 1.6 * totalDmgIncreaseMult * totalVulnMult)
        target.takeDamage(extraDmg, true)
        target.applyMagmaField?.(4000, 0.40, 0.60)
        target.triggerHeavyCritShock?.(extraDmg)

        if (this.enemyManager) {
          const nearby = this.enemyManager.getEnemiesInRange(targetPos, 85)
          for (const near of nearby) {
            if (near !== target) {
              near.applyMagmaField?.(4000, 0.40, 0.60)
              near.takeDamage(Math.floor(extraDmg * 0.5), true)
            }
          }
        }

        this.showReactionBanner(targetPos, '【火生土·熔岩】', '#ff9100')
        result = {
          reactionType: 'magma',
          reactionName: '火生土·熔岩',
          color: '#ff9100',
          extraDamage: extraDmg,
          baseReactionAttack: optimalBaseAttack,
          leylineBoosted: Boolean(options?.inLeylineOverlap),
          aegisGridsBroken: aegisBrokenCount,
          aoeRadius: 85,
          ccDuration: 4000,
          position: targetPos
        }
        break
      }

      case 'spikes': {
        // 土生金【淬刃·锋芒】：承接“土破韧刚、金破护甲”双重红利，迸射 3 道淬刃剑气并即时结算一次流血真伤
        const extraDmg = Math.floor(optimalBaseAttack * 1.8 * totalDmgIncreaseMult * totalVulnMult)
        target.takeDamage(extraDmg, true)
        const instantBleed = Math.max(8, Math.floor(optimalBaseAttack * 0.30))
        target.takeTrueDamage ? target.takeTrueDamage(instantBleed) : target.takeDamage(instantBleed, true)

        if (this.enemyManager) {
          const nearby = this.enemyManager.getEnemiesInRange(targetPos, 160)
            .filter(e => e !== target)
            .slice(0, 3)

          for (const near of nearby) {
            near.takeDamage(extraDmg, true)
            this.applyElementalStatus(near, 'metal', optimalBaseAttack)
            near.hitShake?.(6)
            if (fx) {
              fx.damageText({ x: near.x, y: near.y }, extraDmg, { color: '#ffd700' })
            }
          }
        }

        this.showReactionBanner(targetPos, '【土生金·锋芒】', '#ffd700')
        result = {
          reactionType: 'spikes',
          reactionName: '土生金·锋芒',
          color: '#ffd700',
          extraDamage: extraDmg,
          baseReactionAttack: optimalBaseAttack,
          leylineBoosted: Boolean(options?.inLeylineOverlap),
          aegisGridsBroken: aegisBrokenCount,
          aoeRadius: 160,
          position: targetPos
        }
        break
      }

      case 'shatter':
      default: {
        // 金生水【寒芒·碎冰】：无视防御破冰贯穿伤害 + 2.5s 绝对冰封硬控
        const extraDmg = Math.floor(optimalBaseAttack * 1.7 * totalDmgIncreaseMult * totalVulnMult)
        if (typeof target.takeTrueDamage === 'function') {
          target.takeTrueDamage(extraDmg)
        } else {
          target.takeDamage(extraDmg, true)
        }
        target.applyFreeze(2500)

        this.showReactionBanner(targetPos, '【金生水·碎冰】', '#00e5ff')
        result = {
          reactionType: 'shatter',
          reactionName: '金生水·碎冰',
          color: '#00e5ff',
          extraDamage: extraDmg,
          baseReactionAttack: optimalBaseAttack,
          leylineBoosted: Boolean(options?.inLeylineOverlap),
          aegisGridsBroken: aegisBrokenCount,
          ccDuration: 2500,
          position: targetPos
        }
        break
      }
    }

    if (fx) {
      fx.damageText(targetPos, result.extraDamage, { color: result.color, offsetX: 10 })
    }

    return result
  }

  /**
   * 飘字提示元素相生双印合璧横幅（0.25s 极速爆发）
   */
  private showReactionBanner(pos: Point, text: string, color: string): void {
    if (!this.scene) return

    const label = this.scene.add.text(pos.x, pos.y - 28, text, {
      fontFamily: 'STKaiti, KaiTi, SimKai, serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20)

    this.scene.tweens.add({
      targets: label,
      y: pos.y - 50,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    })
  }

  /**
   * 清理敌人死亡时的残留状态
   */
  public removeEnemy(enemyId: string): void {
    this.multiStatusMap.delete(enemyId)
    this.reactionIcdMap.delete(enemyId)
  }

  /**
   * 查询敌人是否处于某种五行元素状态
   */
  public hasStatus(enemyId: string, statusType?: ElementalStatusType): boolean {
    const map = this.multiStatusMap.get(enemyId)
    if (!map || map.size === 0) return false
    if (!statusType) return true
    for (const s of map.values()) {
      if (s.type === statusType) return true
    }
    return false
  }

  /**
   * 获取敌人当前附着的五行状态数量（供《五气朝元》每类状态 +18% 易伤计算）
   */
  public getActiveStatusCount(enemyId: string): number {
    const map = this.multiStatusMap.get(enemyId)
    return map ? map.size : 0
  }

  /**
   * 获取敌人当前附着的所有五行状态列表
   */
  public getAllStatuses(enemyId: string): ActiveElementalStatus[] {
    const map = this.multiStatusMap.get(enemyId)
    return map ? Array.from(map.values()) : []
  }

  /**
   * 获取敌人当前附着的单个五行状态（若未指定五行则返回最新附着的状态）
   */
  public getStatus(enemyId: string, wuXing?: WuXing): ActiveElementalStatus | undefined {
    const map = this.multiStatusMap.get(enemyId)
    if (!map || map.size === 0) return undefined
    if (wuXing) return map.get(wuXing)
    const values = Array.from(map.values())
    return values[values.length - 1]
  }

  /**
   * 重置全场
   */
  public reset(): void {
    this.multiStatusMap.clear()
    this.reactionIcdMap.clear()
    this.reactionIcdMs = ElementalReactionManager.DEFAULT_REACTION_ICD_MS
    this.attachmentDurationMs = ElementalReactionManager.DEFAULT_ATTACHMENT_MS
    this.reactionDamageMultiplier = 1.0
    this.vaporizeShockwaveEnabled = false
  }
}

