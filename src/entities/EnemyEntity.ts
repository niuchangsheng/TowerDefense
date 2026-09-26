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

  // 移动与五行宝石5级专属攻击特效状态
  private slowPercent: number = 0
  private armorBroken: boolean = false
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

    // 4. 创建血条（底部整洁微型墨底血条）
    this.healthBar = scene.add.graphics()
    this.add(this.healthBar)
    this.updateHealthBar()

    // 5. 渲染水墨词缀印记并初始化词缀被动（高波次精英/首领）
    if (enemy.affixes && enemy.affixes.length > 0) {
      enemy.affixes.forEach(affix => {
        this.setStatusMark(`affix_${affix.id}`, affix.label, `#${affix.color.toString(16).padStart(6, '0')}`)
      })

      // 吸元词缀：每 3 秒汲取地气自愈 5% 最大生命
      if (enemy.affixes.some(a => a.id === 'vampiric')) {
        this.vampiricTimer = scene.time.addEvent({
          delay: 3000,
          loop: true,
          callback: () => {
            if (this.enemyData.isActive && !this.isBurning && this.enemyData.currentHealth > 0) {
              const heal = Math.floor(this.enemyData.maxHealth * 0.05)
              this.enemyData.currentHealth = Math.min(this.enemyData.maxHealth, this.enemyData.currentHealth + heal)
              this.updateHealthBar()
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
   * 更新位置并自适应朝向
   */
  updatePosition(position: Point): void {
    const dx = position.x - this.lastX
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
  }

  /**
   * 更新血条（墨底，随血量 绿→金→印章红）
   */
  private updateHealthBar(): void {
    this.healthBar.clear()

    const width = this.enemyData.type === 'boss' ? 40 : 28
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
  }

  /**
   * 更新生命值
   */
  updateHealth(currentHealth: number): void {
    this.enemyData.currentHealth = currentHealth
    this.updateHealthBar()
  }

  /**
   * 受到伤害
   * @param damage 传入基础伤害
   * @param isElementalReaction 是否为五行相生连锁反应触发的伤害
   */
  takeDamage(damage: number, isElementalReaction: boolean = false): number {
    let finalDamage = damage

    // 铁壁词缀处理：五行护盾减免 50%，破碎状态受到 150% 伤害
    const hasIronclad = this.enemyData.affixes?.some(a => a.id === 'ironclad')
    if (hasIronclad) {
      const now = this.scene.time.now
      const isBroken = this.enemyData.shieldBrokenUntil && now < this.enemyData.shieldBrokenUntil
      if (isBroken) {
        finalDamage = Math.floor(finalDamage * 1.5)
      } else {
        if (isElementalReaction) {
          this.breakIroncladShield()
        } else {
          finalDamage = Math.floor(finalDamage * 0.5)
        }
      }
    }

    // 破甲易伤加成 35%
    if (this.armorBroken) {
      finalDamage = Math.floor(finalDamage * 1.35)
    }

    const actualDamage = Math.min(finalDamage, this.enemyData.currentHealth)
    this.enemyData.currentHealth -= actualDamage
    this.updateHealthBar()

    // 雷怒词缀：生命值低于 35% 时进入雷怒暴走，大幅提速且免控
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

    // 受伤受击白闪
    this.scene.tweens.add({
      targets: this.warriorSprite,
      alpha: 0.45,
      duration: 80,
      yoyo: true
    })

    return actualDamage
  }

  /**
   * 击碎铁壁护盾（由五行相生连锁命中时触发）
   */
  breakIroncladShield(): void {
    if (!this.enemyData.affixes?.some(a => a.id === 'ironclad')) return
    this.enemyData.shieldBrokenUntil = this.scene.time.now + 6000
    this.hitShake(6)
    const fx = new CharacterAttackFX(this.scene)
    fx.damageText({ x: this.x, y: this.y - 20 }, '【铁壁破碎】', { color: '#ffd54f' })
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

  // ==================== 5级宝石专属攻击特效 ====================

  /**
   * 应用金系5级【破甲】效果
   * 削减防御，受击伤害提升 35%
   */
  applyArmorBreak(duration: number = 5000, _percent: number = 0.5): void {
    this.armorBroken = true
    this.setStatusMark('armor_break', '破', '#ffd54f')

    this.scene.time.delayedCall(duration, () => {
      this.armorBroken = false
      this.removeStatusMark('armor_break')
    })
  }

  isArmorBroken(): boolean {
    return this.armorBroken
  }

  /**
   * 应用木系5级【中毒】效果
   * 每秒损失最大生命 3%，可叠至3层
   */
  applyPoison(duration: number = 5000, percentPerSec: number = 0.03): void {
    this.poisonLayers = Math.min(3, this.poisonLayers + 1)
    this.setStatusMark('poison', this.poisonLayers > 1 ? `毒${this.poisonLayers}` : '毒', '#4caf50')

    if (this.poisonTimer) {
      this.poisonTimer.destroy()
    }

    const tickInterval = 1000
    const ticks = Math.floor(duration / tickInterval)
    let currentTick = 0

    this.poisonTimer = this.scene.time.addEvent({
      delay: tickInterval,
      repeat: ticks - 1,
      callback: () => {
        if (!this.active || this.enemyData.currentHealth <= 0) return
        currentTick++

        const singleDmg = Math.max(5, Math.floor(this.enemyData.maxHealth * percentPerSec * this.poisonLayers))
        const actualDmg = this.takeDamage(singleDmg)

        const fx = new CharacterAttackFX(this.scene)
        fx.damageText({ x: this.x, y: this.y }, actualDmg, { color: '#2e7d32' })

        if (this.enemyData.currentHealth <= 0) {
          this.die()
        }

        if (currentTick >= ticks) {
          this.poisonLayers = 0
          this.removeStatusMark('poison')
        }
      }
    })
  }

  /**
   * 应用水系5级【冰冻】效果
   * 完全定身冻结 2s，解冻后附带 40% 减速 3s
   */
  applyFreeze(duration: number = 2000): void {
    this.isFrozenState = true
    this.setStatusMark('freeze', '冻', '#40c4ff')

    if (!this.freezeOverlay) {
      this.freezeOverlay = this.scene.add.graphics()
      this.freezeOverlay.fillStyle(0x80d8ff, 0.45)
      this.freezeOverlay.fillRoundedRect(-16, -22, 32, 44, 4)
      this.freezeOverlay.lineStyle(1.5, 0xe1f5fe, 0.8)
      this.freezeOverlay.strokeRoundedRect(-16, -22, 32, 44, 4)
      this.add(this.freezeOverlay)
    }

    this.scene.time.delayedCall(duration, () => {
      this.isFrozenState = false
      this.removeStatusMark('freeze')
      if (this.freezeOverlay && this.freezeOverlay.active) {
        this.freezeOverlay.destroy()
        this.freezeOverlay = undefined
      }
      if (this.active && this.enemyData.currentHealth > 0) {
        this.applySlow(0.4, 3000)
      }
    })
  }

  /**
   * 应用火系5级【灼烧】效果
   * 每秒真实火伤，死亡触发红莲殉爆
   */
  applyBurn(
    damagePerSec: number,
    duration: number = 4000,
    onDeathExplode?: (enemy: EnemyEntity) => void
  ): void {
    this.isBurning = true
    if (onDeathExplode) {
      this.onBurnDeathCallback = onDeathExplode
    }
    this.setStatusMark('burn', '燃', '#ff5252')

    if (this.burnTimer) {
      this.burnTimer.destroy()
    }

    const tickInterval = 1000
    const ticks = Math.floor(duration / tickInterval)
    let currentTick = 0

    this.burnTimer = this.scene.time.addEvent({
      delay: tickInterval,
      repeat: ticks - 1,
      callback: () => {
        if (!this.active || this.enemyData.currentHealth <= 0) return
        currentTick++

        const actualDmg = this.takeDamage(damagePerSec)
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
   * 应用土系5级【眩晕】效果
   * 强力硬控打断动作，瘫痪昏迷
   */
  applyStun(duration: number): void {
    this.isStunnedState = true
    this.setStatusMark('stun', '晕', '#9c6b2f')

    this.scene.time.delayedCall(duration, () => {
      this.isStunnedState = false
      this.removeStatusMark('stun')
    })
  }

  /**
   * 应用减速效果
   */
  applySlow(percent: number, duration: number): void {
    this.slowPercent = percent
    this.setStatusMark('slow', '缓', '#3f5f7a')

    this.scene.time.delayedCall(duration, () => {
      this.slowPercent = 0
      this.removeStatusMark('slow')
    })
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
   * 是否处于眩晕或冰冻硬控中
   */
  isStunnedOrFrozen(): boolean {
    return this.isStunnedState || this.isFrozenState
  }

  /**
   * 计算当前有效移速（考虑冰冻、眩晕与减速）
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
