import Phaser from 'phaser'
import { Enemy, Point } from '@/types'
import { InkColor, INK_WUXING, inkText } from '@/ui/InkTheme'
import { CharacterAttackFX } from '@/effects/CharacterAttackFX'
import { InkSilhouetteRenderer } from '@/rendering/InkSilhouetteRenderer'

/**
 * 敌人渲染实体（水墨战阵兵人风）
 * 彻底废弃单一圈圈字，采用水墨黄巾小兵/首领剪影与灵动的五行灵魄微芒。
 * 行军时自适应水平翻转朝向，并伴随步态微颠簸动效。
 */
export class EnemyEntity extends Phaser.GameObjects.Container {
  private enemyData: Enemy
  private healthBar: Phaser.GameObjects.Graphics
  private warriorSprite: Phaser.GameObjects.Image
  private wispSprite: Phaser.GameObjects.Image
  private badgeRadius: number
  private lastX: number

  // 移动与五行基础状态 / 5级神兵共鸣状态
  private slowPercent: number = 0
  private armorBroken: boolean = false
  private defenseReductionRatio: number = 0
  private tenacityReductionRatio: number = 0
  private fortitudeReductionRatio: number = 0
  private heavyActive: boolean = false
  private magmaActive: boolean = false
  private bleedDamagePerMove: number = 0
  private bleedAccumulatedDist: number = 0
  private healingReductionRatio: number = 0
  private isFrozenState: boolean = false
  private freezeOverlay?: Phaser.GameObjects.Graphics
  private isStunnedState: boolean = false
  private poisonLayers: number = 0
  private poisonTimer?: Phaser.Time.TimerEvent
  private isBurning: boolean = false
  private burnTimer?: Phaser.Time.TimerEvent
  private onBurnDeathCallback?: (enemy: EnemyEntity) => void
  private activeStatusMarks: Map<string, Phaser.GameObjects.Text> = new Map()
  private vampiricTimer?: Phaser.Time.TimerEvent
  private elementalMarkTimer?: Phaser.Time.TimerEvent
  private elementalMarkTimers: Map<string, Phaser.Time.TimerEvent> = new Map()
  private heavyTimer?: Phaser.Time.TimerEvent
  private magmaTimer?: Phaser.Time.TimerEvent
  private bleedTimer?: Phaser.Time.TimerEvent

  constructor(scene: Phaser.Scene, enemy: Enemy) {
    super(scene, enemy.position.x, enemy.position.y)

    this.enemyData = enemy
    this.lastX = enemy.position.x

    InkSilhouetteRenderer.init(scene)

    const isBoss = enemy.type === 'boss'
    const isElite = enemy.type === 'elite'

    this.badgeRadius = isBoss ? 26 : 18

    // 1. 敌军水墨兵人剪影
    const textureKey = isBoss ? 'ink_enemy_boss' : isElite ? 'ink_enemy_elite' : 'ink_enemy_scout'
    this.warriorSprite = scene.add.image(0, -2, textureKey)
    const scale = isBoss ? 0.68 : isElite ? 0.72 : 0.68
    this.warriorSprite.setScale(scale)
    this.add(this.warriorSprite)

    // 精英/Boss 附加淡墨气旋光晕底
    if (isElite) {
      const aura = scene.add.circle(0, 0, 22, InkColor.cinnabar, 0)
      aura.setStrokeStyle(1.5, InkColor.cinnabar, 0.7)
      this.addAt(aura, 0)
    } else if (isBoss) {
      const bossAura = scene.add.circle(0, 0, 28, InkColor.ink, 0)
      bossAura.setStrokeStyle(1.5, 0x8b261e, 0.8)
      this.addAt(bossAura, 0)
    }

    // 2. 五行微芒灵魄（浮动于兵刃或肩头）
    const wispKey = `ink_wisp_${enemy.wuXing}`
    this.wispSprite = scene.add.image(13, -15, wispKey)
    this.wispSprite.setScale(0.85)
    this.add(this.wispSprite)

    // 灵魄微光悬浮呼吸动画
    scene.tweens.add({
      targets: this.wispSprite,
      y: -18,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })

    // 3. 行军步态微颤动效
    scene.tweens.add({
      targets: this.warriorSprite,
      y: -4,
      duration: 220,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeInOut'
    })

    // 4. 创建血条与五行铁壁护盾格（底部整洁微型墨底血条）
    this.healthBar = scene.add.graphics()
    this.add(this.healthBar)
    this.updateHealthBar()

    // 5. 渲染水墨词缀印记并初始化词缀被动（高波次精英/首领）
    if (enemy.affixes && enemy.affixes.length > 0) {
      enemy.affixes.forEach(affix => {
        this.setStatusMark(`affix_${affix.id}`, affix.label, `#${affix.color.toString(16).padStart(6, '0')}`)
      })

      // 吸元词缀 / 张角苍天妖道：每 3 秒汲取地气自愈 5% 最大生命（受【木·毒】50% 禁疗压制）
      if (enemy.affixes.some(a => a.id === 'vampiric')) {
        this.vampiricTimer = scene.time.addEvent({
          delay: 3000,
          loop: true,
          callback: () => {
            if (this.enemyData.isActive && this.enemyData.currentHealth > 0) {
              const healMult = Math.max(0, 1 - this.healingReductionRatio)
              const heal = Math.floor(this.enemyData.maxHealth * 0.05 * healMult)
              if (heal > 0) {
                this.enemyData.currentHealth = Math.min(this.enemyData.maxHealth, this.enemyData.currentHealth + heal)
                this.updateHealthBar()
              }
            }
          }
        })
      }
    }

    // 设置深度
    this.setDepth(10)

    // 添加到场景
    scene.add.existing(this)
  }

  /**
   * 更新位置并自适应朝向（若处于【金·裂】流血状态，随移动结算无视防御流血真伤）
   */
  updatePosition(position: Point): void {
    const dx = position.x - this.lastX
    const dy = position.y - this.y
    const stepDist = Math.hypot(dx, dy)

    if (dx < -0.4) {
      this.warriorSprite.setFlipX(true)
      this.wispSprite.setX(-13)
    } else if (dx > 0.4) {
      this.warriorSprite.setFlipX(false)
      this.wispSprite.setX(13)
    }
    this.lastX = position.x

    this.setPosition(position.x, position.y)
    this.enemyData.position = position

    // 【金·裂】移动流血真伤结算（每移动 28px 触发一次无视防御割裂流血）
    if (this.bleedDamagePerMove > 0 && stepDist > 0 && this.enemyData.isActive && this.enemyData.currentHealth > 0) {
      this.bleedAccumulatedDist += stepDist
      if (this.bleedAccumulatedDist >= 28) {
        this.bleedAccumulatedDist = 0
        const bleedDmg = Math.max(2, Math.floor(this.bleedDamagePerMove))
        this.takeTrueDamage(bleedDmg)
        if (this.enemyData.currentHealth <= 0) {
          this.die()
        }
      }
    }
  }

  /**
   * 更新血条与 Boss 五行铁壁格（墨底，随血量 绿→金→印章红，铁壁格呈鎏金玄甲格）
   */
  private updateHealthBar(): void {
    if (!this.healthBar || !this.healthBar.active) return
    this.healthBar.clear()

    const width = this.enemyData.type === 'boss' ? 44 : 28
    const height = 3.5
    const yOffset = this.enemyData.type === 'boss' ? 24 : 18

    // 血条背景
    this.healthBar.fillStyle(InkColor.ink, 0.4)
    this.healthBar.fillRect(-width / 2, yOffset, width, height)

    // 当前血量
    const healthPercent = Math.max(0, this.enemyData.currentHealth / this.enemyData.maxHealth)
    const healthColor = healthPercent > 0.5 ? 0x5f7a4a : healthPercent > 0.25 ? 0xa0782f : 0x9e2b25
    this.healthBar.fillStyle(healthColor)
    this.healthBar.fillRect(-width / 2, yOffset, width * healthPercent, height)

    // 渲染 Boss【五行铁壁】护盾格（3~5格，位于血条下方 5px）
    const maxGrids = this.enemyData.maxAegisGrids ?? 0
    const curGrids = this.enemyData.currentAegisGrids ?? 0
    if (maxGrids > 0) {
      const aegisY = yOffset + 5
      const gap = 2
      const gridW = (width - gap * (maxGrids - 1)) / maxGrids
      for (let i = 0; i < maxGrids; i++) {
        const gx = -width / 2 + i * (gridW + gap)
        if (i < curGrids) {
          this.healthBar.fillStyle(0xd99826, 0.95)
          this.healthBar.fillRect(gx, aegisY, gridW, 3)
        } else {
          this.healthBar.fillStyle(InkColor.ink, 0.25)
          this.healthBar.fillRect(gx, aegisY, gridW, 3)
        }
      }
    }
  }

  /**
   * 更新生命值
   */
  updateHealth(currentHealth: number): void {
    this.enemyData.currentHealth = currentHealth
    this.updateHealthBar()
  }

  /**
   * 承受无视防御与铁壁减免的真实伤害（如【金·裂】流血、【金生水·碎冰】）
   */
  takeTrueDamage(damage: number): number {
    const actualDamage = Math.min(Math.max(1, Math.floor(damage)), this.enemyData.currentHealth)
    this.enemyData.currentHealth -= actualDamage
    this.checkBossPhase2Awakening()
    this.updateHealthBar()
    return actualDamage
  }

  /**
   * 受到伤害
   * @param damage 传入伤害值
   * @param isElementalReaction 是否为五行相生连锁反应触发的伤害
   */
  takeDamage(damage: number, isElementalReaction: boolean = false): number {
    let finalDamage = damage
    const now = this.scene?.time?.now ?? Date.now()

    // 1. Boss【五行铁壁】机制：铁壁存在期间，非相生反应伤害减免 60%；铁壁击穿瘫痪期间易伤 +50%
    const curAegis = this.enemyData.currentAegisGrids ?? 0
    const isBrokenVulnerable = Boolean(this.enemyData.shieldBrokenUntil && now < this.enemyData.shieldBrokenUntil)

    if (curAegis > 0 && !isElementalReaction) {
      finalDamage = Math.max(1, Math.floor(finalDamage * 0.40))
    } else if (isBrokenVulnerable) {
      finalDamage = Math.floor(finalDamage * 1.50)
    }

    // 2. 兼容无尽精英【铁壁】词缀
    const hasIronclad = this.enemyData.affixes?.some(a => a.id === 'ironclad')
    if (hasIronclad && (this.enemyData.maxAegisGrids ?? 0) === 0) {
      if (isBrokenVulnerable) {
        finalDamage = Math.floor(finalDamage * 1.5)
      } else {
        if (isElementalReaction) {
          this.breakIroncladShield()
        } else {
          finalDamage = Math.floor(finalDamage * 0.5)
        }
      }
    }

    // 3. 破甲易伤加成 35%（兼容旧调用）
    if (this.armorBroken) {
      finalDamage = Math.floor(finalDamage * 1.35)
    }

    const actualDamage = Math.min(finalDamage, this.enemyData.currentHealth)
    this.enemyData.currentHealth -= actualDamage
    this.checkBossPhase2Awakening()
    this.updateHealthBar()

    // 4. 雷怒词缀：生命值低于 35% 时进入雷怒暴走，大幅提速且免控
    const hasBerserk = this.enemyData.affixes?.some(a => a.id === 'berserk')
    if (hasBerserk && !this.enemyData.isBerserk && this.enemyData.currentHealth <= this.enemyData.maxHealth * 0.35) {
      this.enemyData.isBerserk = true
      this.enemyData.speed *= 1.4
      this.isFrozenState = false
      this.isStunnedState = false
      this.removeStatusMark('freeze')
      this.removeStatusMark('stun')
      const fx = new CharacterAttackFX(this.scene)
      fx.damageText({ x: this.x, y: this.y - 20 }, '【雷怒暴走】', { color: '#ff1744' })
    }

    // 5. 受伤受击白闪
    if (this.scene?.tweens && this.warriorSprite) {
      this.scene.tweens.add({
        targets: this.warriorSprite,
        alpha: 0.45,
        duration: 80,
        yoyo: true
      })
    }

    return actualDamage
  }

  /**
   * 检查 Boss 半血二阶段狂暴（重铸五行铁壁）
   */
  private checkBossPhase2Awakening(): void {
    if (
      this.enemyData.type === 'boss' &&
      !this.enemyData.phase2Awakened &&
      this.enemyData.currentHealth > 0 &&
      this.enemyData.currentHealth <= this.enemyData.maxHealth * 0.5 &&
      (this.enemyData.maxAegisGrids ?? 0) > 0
    ) {
      this.enemyData.phase2Awakened = true
      this.enemyData.currentAegisGrids = this.enemyData.maxAegisGrids
      this.enemyData.shieldBrokenUntil = 0
      this.updateHealthBar()
      if (this.scene) {
        const fx = new CharacterAttackFX(this.scene)
        fx.damageText({ x: this.x, y: this.y - 28 }, '【半血狂暴·重铸铁壁】', { color: '#ff9100' })
      }
    }
  }

  /**
   * 五行相生反应削减 Boss【五行铁壁】护盾格
   * - 任意五行相生反应命中：削减 1 格
   * - 命中 Boss【命脉弱点相生】：削减 2 格并附加 3s 瘫痪
   * - 全部铁壁格击碎瞬间：触发 1.5s 眩晕 + 5s 易伤 +50%
   */
  damageBossAegis(
    reactionType: string,
    breakBonusRatio: number = 0
  ): { brokenGrids: number; shatteredAll: boolean; hitWeakness: boolean } {
    const curGrids = this.enemyData.currentAegisGrids ?? 0
    if (curGrids <= 0) {
      return { brokenGrids: 0, shatteredAll: false, hitWeakness: false }
    }

    const hitWeakness = Boolean(this.enemyData.weaknessReactions?.includes(reactionType))
    const baseBreak = hitWeakness ? 2 : 1
    const totalBreak = Math.max(1, Math.round(baseBreak * (1 + breakBonusRatio)))
    const actualBroken = Math.min(curGrids, totalBreak)

    this.enemyData.currentAegisGrids = Math.max(0, curGrids - actualBroken)
    const shatteredAll = this.enemyData.currentAegisGrids === 0

    if (hitWeakness) {
      const now = this.scene?.time?.now ?? Date.now()
      this.enemyData.aegisParalyzedUntil = now + 3000
      this.applyStun(3000)
      if (this.scene) {
        const fx = new CharacterAttackFX(this.scene)
        fx.damageText({ x: this.x, y: this.y - 24 }, '【破命门·瘫痪】', { color: '#ff3d00' })
      }
    }

    if (shatteredAll) {
      const now = this.scene?.time?.now ?? Date.now()
      this.enemyData.shieldBrokenUntil = now + 5000
      this.applyStun(1500)
      this.hitShake(8)
      if (this.scene) {
        const fx = new CharacterAttackFX(this.scene)
        fx.damageText({ x: this.x, y: this.y - 20 }, '【铁壁崩碎·易伤50%】', { color: '#ffd54f' })
      }
    }

    this.updateHealthBar()
    return { brokenGrids: actualBroken, shatteredAll, hitWeakness }
  }

  /**
   * 击碎铁壁护盾（由五行相生连锁命中时触发）
   */
  breakIroncladShield(reactionType: string = ''): { brokenGrids: number; shatteredAll: boolean; hitWeakness: boolean } {
    if ((this.enemyData.currentAegisGrids ?? 0) > 0) {
      return this.damageBossAegis(reactionType)
    }
    if (!this.enemyData.affixes?.some(a => a.id === 'ironclad')) {
      return { brokenGrids: 0, shatteredAll: false, hitWeakness: false }
    }
    const now = this.scene?.time?.now ?? Date.now()
    this.enemyData.shieldBrokenUntil = now + 6000
    this.hitShake(6)
    if (this.scene) {
      const fx = new CharacterAttackFX(this.scene)
      fx.damageText({ x: this.x, y: this.y - 20 }, '【铁壁破碎】', { color: '#ffd54f' })
    }
    return { brokenGrids: 1, shatteredAll: true, hitWeakness: false }
  }

  /**
   * 受击抖动（打击感反馈）
   */
  hitShake(strength = 4): void {
    const sprite = this.warriorSprite
    if (!sprite || !sprite.active) return
    const baseX = sprite.x

    this.scene.tweens.add({
      targets: sprite,
      x: baseX + strength,
      duration: 35,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (sprite.active) sprite.setX(baseX)
      }
    })
  }

  /**
   * 死亡
   */
  die(): void {
    if (!this.enemyData.isActive) return
    this.enemyData.isActive = false

    // 死疫词缀处理：死亡时向周围扩散墨毒
    if (this.enemyData.affixes?.some(a => a.id === 'plague')) {
      const fx = new CharacterAttackFX(this.scene)
      fx.damageText({ x: this.x, y: this.y - 20 }, '【死疫扩散】', { color: '#ba68c8' })
    }

    // 如果处于灼烧状态，触发红莲殉爆回调
    if (this.isBurning && this.onBurnDeathCallback) {
      try {
        this.onBurnDeathCallback(this)
      } catch (e) {
        console.warn('Burn death callback error:', e)
      }
    }

    // 清理所有状态定时器与印章
    this.clearAllTimers()

    // 播放水墨消散特效（墨散化烟）
    const fx = new CharacterAttackFX(this.scene)
    fx.inkDissolve({ x: this.x, y: this.y })

    // 死亡消融动画
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.3,
      duration: 220,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.destroy()
      }
    })
  }

  /**
   * 获取敌人数据
   */
  getEnemyData(): Enemy {
    return this.enemyData
  }

  /**
   * 更新路径进度
   */
  updatePathProgress(progress: number): void {
    this.enemyData.pathProgress = progress
  }

  /**
   * 刷新头顶状态印章水平排列（破、毒、冻、燃、晕、缓）
   */
  private updateStatusMarksLayout(): void {
    const marks = Array.from(this.activeStatusMarks.values())
    const count = marks.length
    if (count === 0) return

    const spacing = 16
    const startX = -((count - 1) * spacing) / 2
    const markY = -(this.badgeRadius + 14)

    marks.forEach((mark, idx) => {
      mark.setPosition(startX + idx * spacing, markY)
    })
  }

  /**
   * 添加或更新指定状态小印章
   */
  private setStatusMark(key: string, content: string, color: string): void {
    let mark = this.activeStatusMarks.get(key)
    if (!mark || !mark.active) {
      mark = inkText(this.scene, 0, -(this.badgeRadius + 14), content, {
        size: 11,
        color,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      this.add(mark)
      this.activeStatusMarks.set(key, mark)
    } else {
      mark.setText(content)
      mark.setColor(color)
    }
    this.updateStatusMarksLayout()
  }

  /**
   * 移除指定状态小印章
   */
  private removeStatusMark(key: string): void {
    const mark = this.activeStatusMarks.get(key)
    if (mark && mark.active) {
      mark.destroy()
    }
    this.activeStatusMarks.delete(key)
    this.updateStatusMarksLayout()
  }

  /**
   * 设置头部显性五行元素附着印记（默认持续 2500ms = 2.5s，支持多元素并存显示）
   */
  setElementalMark(wuXing: string, label: string, color: string, duration: number = 2500): void {
    const markKey = `elemental_mark_${wuXing}`
    this.setStatusMark(markKey, label, color)

    const prevTimer = this.elementalMarkTimers.get(wuXing)
    if (prevTimer) {
      prevTimer.destroy()
    }
    if (this.scene?.time) {
      const timer = this.scene.time.delayedCall(duration, () => {
        this.removeStatusMark(markKey)
        this.elementalMarkTimers.delete(wuXing)
      })
      this.elementalMarkTimers.set(wuXing, timer)
    }
  }

  /**
   * 清理显性五行印记（可指定单个五行或全部清理）
   */
  clearElementalMark(wuXing?: string): void {
    if (wuXing) {
      const timer = this.elementalMarkTimers.get(wuXing)
      if (timer) {
        timer.destroy()
        this.elementalMarkTimers.delete(wuXing)
      }
      this.removeStatusMark(`elemental_mark_${wuXing}`)
      return
    }
    if (this.elementalMarkTimer) {
      this.elementalMarkTimer.destroy()
      this.elementalMarkTimer = undefined
    }
    this.elementalMarkTimers.forEach(t => t.destroy())
    this.elementalMarkTimers.clear()
    for (const key of Array.from(this.activeStatusMarks.keys())) {
      if (key.startsWith('elemental_mark')) {
        this.removeStatusMark(key)
      }
    }
  }

  // ==================== 五大五行基础状态与 5 维克制实现 ====================

  /**
   * 【金·裂】(bleed) 专克【防御】
   * 唯一具备破甲能力的基础状态（默认削减 35% 防御，保底 >= 初始值 40%）+ 随敌军移动触发无视防御流血真伤
   */
  applyBleed(duration: number = 2500, defenseReduction: number = 0.35, bleedDmgPerStep: number = 12): void {
    this.armorBroken = true
    this.defenseReductionRatio = Math.min(0.60, Math.max(this.defenseReductionRatio, defenseReduction))
    this.bleedDamagePerMove = Math.max(this.bleedDamagePerMove, bleedDmgPerStep)
    this.setStatusMark('bleed', '裂', '#ffd54f')

    if (this.bleedTimer) {
      this.bleedTimer.destroy()
    }
    if (this.scene?.time) {
      this.bleedTimer = this.scene.time.delayedCall(duration, () => {
        this.armorBroken = false
        this.defenseReductionRatio = 0
        this.bleedDamagePerMove = 0
        this.removeStatusMark('bleed')
        this.bleedTimer = undefined
      })
    }
  }

  /**
   * 应用金系【破甲】效果（兼容旧接口，指向防御削减）
   */
  applyArmorBreak(duration: number = 2500, percent: number = 0.35): void {
    this.armorBroken = true
    this.defenseReductionRatio = Math.min(0.60, Math.max(this.defenseReductionRatio, percent))
    this.setStatusMark('armor_break', '破', '#ffd54f')

    if (this.scene?.time) {
      this.scene.time.delayedCall(duration, () => {
        this.armorBroken = false
        this.defenseReductionRatio = 0
        this.removeStatusMark('armor_break')
      })
    }
  }

  isArmorBroken(): boolean {
    return this.armorBroken || this.defenseReductionRatio > 0
  }

  getDefenseReductionRatio(): number {
    return Math.min(0.60, this.defenseReductionRatio)
  }

  /**
   * 【木·毒】(parasite) 专克【生命】
   * 每秒损失最大生命 2%（可叠至3层，最高 6%/s）+ 50% 禁疗压制
   */
  applyPoison(duration: number = 2500, percentPerSec: number = 0.02): void {
    this.poisonLayers = Math.min(3, this.poisonLayers + 1)
    this.healingReductionRatio = 0.50
    this.setStatusMark('poison', this.poisonLayers > 1 ? `毒${this.poisonLayers}` : '毒', '#4caf50')

    if (this.poisonTimer) {
      this.poisonTimer.destroy()
    }

    if (!this.scene?.time) return

    const tickInterval = 500
    const ticks = Math.max(1, Math.floor(duration / tickInterval))
    let currentTick = 0

    this.poisonTimer = this.scene.time.addEvent({
      delay: tickInterval,
      repeat: ticks - 1,
      callback: () => {
        if (!this.active || this.enemyData.currentHealth <= 0) return
        currentTick++

        // 每 0.5s 结算半秒毒伤
        const singleDmg = Math.max(3, Math.floor(this.enemyData.maxHealth * (percentPerSec * 0.5) * this.poisonLayers))
        const actualDmg = this.takeDamage(singleDmg)

        const fx = new CharacterAttackFX(this.scene)
        fx.damageText({ x: this.x, y: this.y }, actualDmg, { color: '#2e7d32' })

        if (this.enemyData.currentHealth <= 0) {
          this.die()
        }

        if (currentTick >= ticks) {
          this.poisonLayers = 0
          this.healingReductionRatio = 0
          this.removeStatusMark('poison')
        }
      }
    })
  }

  getPoisonLayers(): number {
    return this.poisonLayers
  }

  /**
   * 【土·重】(heavy) 专克【韧性 & 刚毅】
   * 大幅削减敌军反暴击率（韧性 -25%）与反暴击伤害（刚毅 -40%），受暴击时触发额外【负重内震】伤害
   * 铁律：严禁附带减速、眩晕控场或破甲！
   */
  applyHeavy(duration: number = 2500, tenacityReduction: number = 0.25, fortitudeReduction: number = 0.40): void {
    this.heavyActive = true
    this.tenacityReductionRatio = Math.min(0.60, Math.max(this.tenacityReductionRatio, tenacityReduction))
    this.fortitudeReductionRatio = Math.min(0.60, Math.max(this.fortitudeReductionRatio, fortitudeReduction))
    this.setStatusMark('heavy', '重', '#a1887f')

    if (this.heavyTimer) {
      this.heavyTimer.destroy()
    }
    if (this.scene?.time) {
      this.heavyTimer = this.scene.time.delayedCall(duration, () => {
        this.heavyActive = false
        if (!this.magmaActive) {
          this.tenacityReductionRatio = 0
          this.fortitudeReductionRatio = 0
        }
        this.removeStatusMark('heavy')
        this.heavyTimer = undefined
      })
    }
  }

  /**
   * 火生土【熔岩·焦土】区域状态：大幅削减 40% 韧性与 60% 刚毅（保底 40%），不破甲、不减速
   */
  applyMagmaField(duration: number = 4000, tenacityReduction: number = 0.40, fortitudeReduction: number = 0.60): void {
    this.magmaActive = true
    this.tenacityReductionRatio = Math.min(0.60, Math.max(this.tenacityReductionRatio, tenacityReduction))
    this.fortitudeReductionRatio = Math.min(0.60, Math.max(this.fortitudeReductionRatio, fortitudeReduction))
    this.setStatusMark('magma', '熔', '#ff9100')

    if (this.magmaTimer) {
      this.magmaTimer.destroy()
    }
    if (this.scene?.time) {
      this.magmaTimer = this.scene.time.delayedCall(duration, () => {
        this.magmaActive = false
        this.tenacityReductionRatio = this.heavyActive ? 0.25 : 0
        this.fortitudeReductionRatio = this.heavyActive ? 0.40 : 0
        this.removeStatusMark('magma')
        this.magmaTimer = undefined
      })
    }
  }

  isHeavy(): boolean {
    return this.heavyActive || this.magmaActive
  }

  isInMagma(): boolean {
    return this.magmaActive
  }

  getTenacityReductionRatio(): number {
    return Math.min(0.60, this.tenacityReductionRatio)
  }

  getFortitudeReductionRatio(): number {
    return Math.min(0.60, this.fortitudeReductionRatio)
  }

  /**
   * 当处于【土·重】或【熔岩·焦土】的目标受到暴击时，触发额外 20%【负重内震】伤害
   */
  triggerHeavyCritShock(critDamageDealt: number): number {
    if (!this.isHeavy() || !this.enemyData.isActive || this.enemyData.currentHealth <= 0) return 0
    const shockDmg = Math.max(2, Math.floor(critDamageDealt * 0.20))
    const dealt = this.takeDamage(shockDmg)
    if (this.scene) {
      const fx = new CharacterAttackFX(this.scene)
      fx.damageText({ x: this.x, y: this.y - 18 }, `【内震】${dealt}`, { color: '#d7ccc8' })
    }
    return dealt
  }

  /**
   * 应用金生水【寒芒·碎冰】绝对冰封硬控效果（持续 2.5s = 2500ms）
   */
  applyFreeze(duration: number = 2500): void {
    this.isFrozenState = true
    this.setStatusMark('freeze', '冻', '#40c4ff')

    if (this.scene?.add && !this.freezeOverlay) {
      this.freezeOverlay = this.scene.add.graphics()
      this.freezeOverlay.fillStyle(0x80d8ff, 0.45)
      this.freezeOverlay.fillRoundedRect(-16, -22, 32, 44, 4)
      this.freezeOverlay.lineStyle(1.5, 0xe1f5fe, 0.8)
      this.freezeOverlay.strokeRoundedRect(-16, -22, 32, 44, 4)
      this.add(this.freezeOverlay)
    }

    if (this.scene?.time) {
      this.scene.time.delayedCall(duration, () => {
        this.isFrozenState = false
        this.removeStatusMark('freeze')
        if (this.freezeOverlay && this.freezeOverlay.active) {
          this.freezeOverlay.destroy()
          this.freezeOverlay = undefined
        }
        if (this.active && this.enemyData.currentHealth > 0) {
          this.applySlow(0.35, 2500)
        }
      })
    }
  }

  /**
   * 【火·灼】(burn) 放大【攻击力】
   * 每 0.5s 结算一次高频火伤 DoT，阵亡时触发【余烬爆燃】
   */
  applyBurn(
    damagePerSec: number,
    duration: number = 2500,
    onDeathExplode?: (enemy: EnemyEntity) => void
  ): void {
    this.isBurning = true
    if (onDeathExplode) {
      this.onBurnDeathCallback = onDeathExplode
    }
    this.setStatusMark('burn', '灼', '#ff5252')

    if (this.burnTimer) {
      this.burnTimer.destroy()
    }

    if (!this.scene?.time) return

    const tickInterval = 500
    const ticks = Math.max(1, Math.floor(duration / tickInterval))
    let currentTick = 0

    this.burnTimer = this.scene.time.addEvent({
      delay: tickInterval,
      repeat: ticks - 1,
      callback: () => {
        if (!this.active || this.enemyData.currentHealth <= 0) return
        currentTick++

        const tickDmg = Math.max(2, Math.floor(damagePerSec * 0.5))
        const actualDmg = this.takeDamage(tickDmg)
        const fx = new CharacterAttackFX(this.scene)
        fx.damageText({ x: this.x, y: this.y }, actualDmg, { color: '#ff1744' })

        if (this.enemyData.currentHealth <= 0) {
          this.die()
        }

        if (currentTick >= ticks) {
          this.isBurning = false
          this.removeStatusMark('burn')
        }
      }
    })
  }

  /**
   * 应用硬控定身/眩晕效果（仅由相生反应如水生木藤蔓定身、或 Boss 破盾触发）
   */
  applyStun(duration: number): void {
    this.isStunnedState = true
    this.setStatusMark('stun', '定', '#9c6b2f')

    if (this.scene?.time) {
      this.scene.time.delayedCall(duration, () => {
        this.isStunnedState = false
        this.removeStatusMark('stun')
      })
    }
  }

  /**
   * 【水·湿】(wet) 专克【移动速度】
   * 唯一具备减速软控能力的基础状态（默认减速 35%，持续 2.5s = 2500ms）
   */
  applySlow(percent: number = 0.35, duration: number = 2500): void {
    this.slowPercent = Math.max(this.slowPercent, percent)
    this.setStatusMark('slow', '湿', '#3f5f7a')

    if (this.scene?.time) {
      this.scene.time.delayedCall(duration, () => {
        this.slowPercent = 0
        this.removeStatusMark('slow')
      })
    }
  }

  /**
   * 检查是否处于减速状态
   */
  isSlowed(): boolean {
    return this.slowPercent > 0
  }

  /**
   * 获取减速百分比
   */
  getSlowPercent(): number {
    return this.slowPercent
  }

  /**
   * 是否处于眩晕/定身或冰冻硬控中
   */
  isStunnedOrFrozen(): boolean {
    return this.isStunnedState || this.isFrozenState
  }

  /**
   * 是否处于 Boss 铁壁击穿的 +50% 易伤状态
   */
  isVulnerabilityBroken(): boolean {
    const now = this.scene?.time?.now ?? Date.now()
    return Boolean(this.enemyData.shieldBrokenUntil && now < this.enemyData.shieldBrokenUntil)
  }

  /**
   * 计算当前有效移速（考虑冰冻、定身与【水·湿】减速）
   */
  getEffectiveSpeed(): number {
    if (this.isStunnedOrFrozen()) {
      // 雷怒狂暴状态下免疫硬控
      if (this.enemyData.isBerserk) return this.enemyData.speed
      return 0
    }
    return Math.max(0, this.enemyData.speed * (1 - this.slowPercent))
  }

  private clearAllTimers(): void {
    if (this.elementalMarkTimer) {
      this.elementalMarkTimer.destroy()
      this.elementalMarkTimer = undefined
    }
    this.elementalMarkTimers.forEach(t => t.destroy())
    this.elementalMarkTimers.clear()
    if (this.vampiricTimer) {
      this.vampiricTimer.destroy()
      this.vampiricTimer = undefined
    }
    if (this.poisonTimer) {
      this.poisonTimer.destroy()
      this.poisonTimer = undefined
    }
    if (this.burnTimer) {
      this.burnTimer.destroy()
      this.burnTimer = undefined
    }
    if (this.heavyTimer) {
      this.heavyTimer.destroy()
      this.heavyTimer = undefined
    }
    if (this.magmaTimer) {
      this.magmaTimer.destroy()
      this.magmaTimer = undefined
    }
    if (this.bleedTimer) {
      this.bleedTimer.destroy()
      this.bleedTimer = undefined
    }
    if (this.freezeOverlay && this.freezeOverlay.active) {
      this.freezeOverlay.destroy()
      this.freezeOverlay = undefined
    }
    this.activeStatusMarks.forEach(m => m.destroy())
    this.activeStatusMarks.clear()
  }

  destroy(fromScene?: boolean): void {
    this.clearAllTimers()
    super.destroy(fromScene)
  }
}
