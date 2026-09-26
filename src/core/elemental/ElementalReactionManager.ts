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

/**
 * 五行元素连锁反应管理器
 * 负责追踪敌人身上的五行附着、判定相生相克反应并触发连锁机制与视觉反馈
 */
export class ElementalReactionManager {
  private static instance: ElementalReactionManager | null = null
  private scene?: Phaser.Scene
  private enemyManager?: EnemyManager

  /** 敌人身上附着的元素：Map<EnemyInstanceId, ActiveElementalStatus> */
  private statusMap: Map<string, ActiveElementalStatus> = new Map()

  /** 全局元素反应伤害倍率修正（由军师锦囊等被动影响） */
  private reactionDamageMultiplier: number = 1.0

  /** 水火蒸发冲击波（由锦囊【水火既济】激活） */
  private vaporizeShockwaveEnabled: boolean = false

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

  public setReactionDamageMultiplier(multiplier: number): void {
    this.reactionDamageMultiplier = Math.max(0.1, multiplier)
  }

  public getReactionDamageMultiplier(): number {
    return this.reactionDamageMultiplier
  }

  public setVaporizeShockwave(enabled: boolean): void {
    this.vaporizeShockwaveEnabled = enabled
  }

  public isVaporizeShockwaveEnabled(): boolean {
    return this.vaporizeShockwaveEnabled
  }

  /**
   * 当英雄对敌人造成攻击时调用
   * @param target 受击敌人
   * @param attackerWuXing 攻击者五行
   * @param baseAttack 攻击者基础攻击力
   * @returns 反应结果（若无反应触发则返回 null）
   */
  public handleAttack(
    target: EnemyEntity,
    attackerWuXing: WuXing,
    baseAttack: number
  ): ElementalReactionResult | null {
    if (!target.active || target.getEnemyData().currentHealth <= 0) {
      return null
    }

    const enemyId = target.getEnemyData().id
    const currentStatus = this.statusMap.get(enemyId)
    const targetPos: Point = { x: target.x, y: target.y }

    // 1. 检查是否存在已有状态可触发元素反应
    if (currentStatus) {
      const reaction = this.checkReaction(currentStatus.wuXing, attackerWuXing)
      if (reaction) {
        return this.triggerReaction(reaction, target, attackerWuXing, baseAttack, currentStatus)
      }
    }

    // 2. 若未触发反应，则给目标挂载新的五行元素附着
    this.applyElementalStatus(target, attackerWuXing, baseAttack)
    return null
  }

  /**
   * 判定两个五行之间是否能产生特殊化学反应（双向等价瞬爆）
   */
  private checkReaction(
    existingWuXing: WuXing,
    newWuXing: WuXing
  ): ElementalReactionType | null {
    // 水生木【滋养·蔓延】（水+木 双向判定）
    if (
      (existingWuXing === 'water' && newWuXing === 'wood') ||
      (existingWuXing === 'wood' && newWuXing === 'water')
    ) {
      return 'nourish'
    }

    // 木生火【燎原·焚尽】（木+火 双向判定）
    if (
      (existingWuXing === 'wood' && newWuXing === 'fire') ||
      (existingWuXing === 'fire' && newWuXing === 'wood')
    ) {
      return 'wildfire'
    }

    // 火生土【熔岩·焦土】（火+土 双向判定）
    if (
      (existingWuXing === 'fire' && newWuXing === 'earth') ||
      (existingWuXing === 'earth' && newWuXing === 'fire')
    ) {
      return 'magma'
    }

    // 土生金【淬刃·锋芒】（土+金 双向判定）
    if (
      (existingWuXing === 'earth' && newWuXing === 'metal') ||
      (existingWuXing === 'metal' && newWuXing === 'earth')
    ) {
      return 'spikes'
    }

    // 金生水【寒芒·碎冰】（金+水 双向判定）
    if (
      (existingWuXing === 'metal' && newWuXing === 'water') ||
      (existingWuXing === 'water' && newWuXing === 'metal')
    ) {
      return 'shatter'
    }

    // 水火相克【汽化·蒸发】（水+火 双向判定）
    if (
      (existingWuXing === 'fire' && newWuXing === 'water') ||
      (existingWuXing === 'water' && newWuXing === 'fire')
    ) {
      return 'vaporize'
    }

    return null
  }

  /**
   * 挂载基础五行状态（持续 4.5 秒）
   */
  private applyElementalStatus(target: EnemyEntity, wuXing: WuXing, baseAttack: number): void {
    const enemyId = target.getEnemyData().id
    let statusType: ElementalStatusType

    switch (wuXing) {
      case 'water':
        statusType = 'wet'
        target.applySlow(0.25, 4500)
        target.setElementalMark?.('water', '【湿】', '#29b6f6', 4500)
        break
      case 'wood':
        statusType = 'parasite'
        target.applyPoison(4500, 0.02)
        target.setElementalMark?.('wood', '【毒】', '#4caf50', 4500)
        break
      case 'fire':
        statusType = 'burn'
        target.applyBurn(Math.max(8, Math.floor(baseAttack * 0.25)), 4500)
        target.setElementalMark?.('fire', '【灼】', '#ff5722', 4500)
        break
      case 'earth':
        statusType = 'heavy'
        target.applyArmorBreak(4500, 0.25)
        target.setElementalMark?.('earth', '【重】', '#a1887f', 4500)
        break
      case 'metal':
        statusType = 'bleed'
        target.applyArmorBreak(4500, 0.35)
        target.setElementalMark?.('metal', '【裂】', '#ffd54f', 4500)
        break
    }

    const newStatus: ActiveElementalStatus = {
      type: statusType,
      wuXing,
      remainingMs: 4500,
      totalMs: 4500,
      stacks: 1
    }

    this.statusMap.set(enemyId, newStatus)

    // 4.5秒后清除附着
    if (this.scene) {
      this.scene.time.delayedCall(4500, () => {
        const s = this.statusMap.get(enemyId)
        if (s && s.wuXing === wuXing) {
          this.statusMap.delete(enemyId)
          target.clearElementalMark?.()
        }
      })
    }
  }

  /**
   * 执行相生/相克连锁反应
   */
  private triggerReaction(
    reaction: ElementalReactionType,
    target: EnemyEntity,
    _newWuXing: WuXing,
    baseAttack: number,
    _existingStatus: ActiveElementalStatus
  ): ElementalReactionResult {
    const targetPos: Point = { x: target.x, y: target.y }
    const enemyId = target.getEnemyData().id
    // 反应发生后消耗掉原状态并清除附着印记
    this.statusMap.delete(enemyId)
    target.clearElementalMark?.()

    // 触发五行生克连锁命中，破除敌人【铁壁】护盾
    target.breakIroncladShield?.()

    const fx = this.scene ? new CharacterAttackFX(this.scene) : null
    let result: ElementalReactionResult

    switch (reaction) {
      case 'nourish': {
        // 水生木【滋养·蔓延】
        const extraDmg = Math.floor(baseAttack * 1.5 * this.reactionDamageMultiplier)
        target.takeDamage(extraDmg)
        target.applyStun(2000)

        // 传染给周围 90 像素内的敌人
        if (this.enemyManager) {
          const nearby = this.enemyManager.getEnemiesInRange(targetPos, 90)
          for (const near of nearby) {
            if (near !== target) {
              near.applyPoison(4000, 0.02)
              near.applySlow(0.2, 3000)
            }
          }
        }

        this.showReactionBanner(targetPos, '【水生木·滋养】', '#00e676')
        result = {
          reactionType: 'nourish',
          reactionName: '水生木·滋养',
          color: '#00e676',
          extraDamage: extraDmg,
          aoeRadius: 90,
          ccDuration: 2000,
          position: targetPos
        }
        break
      }

      case 'wildfire': {
        // 木生火【燎原·焚尽】
        const extraDmg = Math.floor(baseAttack * 2.4 * this.reactionDamageMultiplier)
        target.takeDamage(extraDmg)

        // 范围 110 像素烈焰爆炸
        if (this.enemyManager) {
          const nearby = this.enemyManager.getEnemiesInRange(targetPos, 110)
          for (const near of nearby) {
            near.takeDamage(Math.floor(extraDmg * 0.75))
            near.applyBurn(Math.max(10, Math.floor(baseAttack * 0.2)), 3500)
            near.hitShake(5)
          }
        }

        this.showReactionBanner(targetPos, '【木生火·燎原】', '#ff3d00')
        result = {
          reactionType: 'wildfire',
          reactionName: '木生火·燎原',
          color: '#ff3d00',
          extraDamage: extraDmg,
          aoeRadius: 110,
          position: targetPos
        }
        break
      }

      case 'magma': {
        // 火生土【熔岩·焦土】
        const extraDmg = Math.floor(baseAttack * 1.6 * this.reactionDamageMultiplier)
        target.takeDamage(extraDmg)
        target.applySlow(0.5, 4000)
        target.applyArmorBreak(5000, 0.4)

        if (this.enemyManager) {
          const nearby = this.enemyManager.getEnemiesInRange(targetPos, 80)
          for (const near of nearby) {
            near.applySlow(0.4, 3000)
          }
        }

        this.showReactionBanner(targetPos, '【火生土·熔岩】', '#ff9100')
        result = {
          reactionType: 'magma',
          reactionName: '火生土·熔岩',
          color: '#ff9100',
          extraDamage: extraDmg,
          aoeRadius: 80,
          position: targetPos
        }
        break
      }

      case 'spikes': {
        // 土生金【淬刃·锋芒】
        const extraDmg = Math.floor(baseAttack * 1.8 * this.reactionDamageMultiplier)
        target.takeDamage(extraDmg)

        // 弹射到最多 3 名敌军
        if (this.enemyManager) {
          const nearby = this.enemyManager.getEnemiesInRange(targetPos, 160)
            .filter(e => e !== target)
            .slice(0, 3)

          for (const near of nearby) {
            near.takeDamage(extraDmg)
            near.hitShake(6)
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
          aoeRadius: 160,
          position: targetPos
        }
        break
      }

      case 'shatter': {
        // 金生水【寒芒·碎冰】
        const extraDmg = Math.floor(baseAttack * 1.7 * this.reactionDamageMultiplier)
        target.takeDamage(extraDmg)
        target.applyFreeze(2500)

        this.showReactionBanner(targetPos, '【金生水·碎冰】', '#00e5ff')
        result = {
          reactionType: 'shatter',
          reactionName: '金生水·碎冰',
          color: '#00e5ff',
          extraDamage: extraDmg,
          ccDuration: 2500,
          position: targetPos
        }
        break
      }

      case 'vaporize': {
        // 水火相克【汽化·蒸发】
        let extraDmg = Math.floor(baseAttack * 2.2 * this.reactionDamageMultiplier)
        if (this.vaporizeShockwaveEnabled) {
          extraDmg = Math.floor(extraDmg * 1.6)
        }
        target.takeDamage(extraDmg)
        target.hitShake(8)

        // 蒸汽冲击波（波及震颤周围敌军；激活【水火既济】时击退小兵并眩晕）
        if (this.enemyManager) {
          const aoeRange = this.vaporizeShockwaveEnabled ? 90 : 60
          const nearby = this.enemyManager.getEnemiesInRange(targetPos, aoeRange)
          for (const near of nearby) {
            if (near !== target) {
              near.hitShake(6)
              if (this.vaporizeShockwaveEnabled) {
                near.applyStun(1000)
                near.takeDamage(Math.floor(extraDmg * 0.4))
              }
            }
          }
        }

        const bannerText = this.vaporizeShockwaveEnabled ? '【水火·蒸发狂啸】' : '【水火·蒸发】'
        this.showReactionBanner(targetPos, bannerText, '#e040fb')
        result = {
          reactionType: 'vaporize',
          reactionName: '水火·蒸发',
          color: '#e040fb',
          extraDamage: extraDmg,
          aoeRadius: this.vaporizeShockwaveEnabled ? 90 : 60,
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
   * 飘字提示元素反应
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
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    })
  }

  /**
   * 清理敌人死亡时的残留状态
   */
  public removeEnemy(enemyId: string): void {
    this.statusMap.delete(enemyId)
  }

  /**
   * 查询敌人是否处于某种五行元素状态
   */
  public hasStatus(enemyId: string, statusType?: ElementalStatusType): boolean {
    const s = this.statusMap.get(enemyId)
    if (!s) return false
    return statusType ? s.type === statusType : true
  }

  /**
   * 获取敌人当前附着的五行状态
   */
  public getStatus(enemyId: string): ActiveElementalStatus | undefined {
    return this.statusMap.get(enemyId)
  }

  /**
   * 重置全场
   */
  public reset(): void {
    this.statusMap.clear()
    this.reactionDamageMultiplier = 1.0
    this.vaporizeShockwaveEnabled = false
  }
}
