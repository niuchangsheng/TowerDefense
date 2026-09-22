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

  // 减速状态
  private slowPercent: number = 0

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
   */
  takeDamage(damage: number): number {
    const actualDamage = Math.min(damage, this.enemyData.currentHealth)
    this.enemyData.currentHealth -= actualDamage
    this.updateHealthBar()

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
    this.enemyData.isActive = false

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
   * 头顶状态小字（楷体）
   */
  private addStatusMark(content: string, color: string): Phaser.GameObjects.Text {
    const mark = inkText(this.scene, 0, -(this.badgeRadius + 14), content, {
      size: 12,
      color,
      bold: true,
      originX: 0.5
    })
    this.add(mark)
    return mark
  }

  /**
   * 应用眩晕效果
   * @param duration 眩晕持续时间（毫秒）
   */
  applyStun(duration: number): void {
    // 眩晕标记：头顶楷体"晕"（土金色）
    const stunMark = this.addStatusMark('晕', '#9c6b2f')

    // 使用场景定时器恢复
    this.scene.time.delayedCall(duration, () => {
      if (stunMark && stunMark.active) {
        stunMark.destroy()
      }
    })
  }

  /**
   * 应用减速效果
   * @param percent 减速百分比（0.3 = 30%减速）
   * @param duration 持续时间（毫秒）
   */
  applySlow(percent: number, duration: number): void {
    this.slowPercent = percent

    // 减速标记：头顶楷体"缓"（水蓝色）
    const slowMark = this.addStatusMark('缓', '#3f5f7a')

    // 使用场景定时器恢复
    this.scene.time.delayedCall(duration, () => {
      this.slowPercent = 0
      if (slowMark && slowMark.active) {
        slowMark.destroy()
      }
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
}
