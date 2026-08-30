import Phaser from 'phaser'
import { Enemy, Point } from '@/types'
import { InkColor, INK_WUXING, inkText } from '@/ui/InkTheme'

/**
 * 敌人渲染实体（水墨风）
 * 敌人 = 五行印章徽记：圆形纸底 + 五行描边 + 中央楷体五行字；
 * 精英加印章红外环，Boss 放大 + 双环。
 */
export class EnemyEntity extends Phaser.GameObjects.Container {
  private enemyData: Enemy
  private healthBar: Phaser.GameObjects.Graphics
  private badge: Phaser.GameObjects.Arc
  private badgeRadius: number

  // 减速状态
  private slowPercent: number = 0

  constructor(scene: Phaser.Scene, enemy: Enemy) {
    super(scene, enemy.position.x, enemy.position.y)

    this.enemyData = enemy

    const wuxing = INK_WUXING[enemy.wuXing]
    const isBoss = enemy.type === 'boss'
    const isElite = enemy.type === 'elite'

    // 徽记半径（Boss 更大）
    this.badgeRadius = isBoss ? 26 : 18

    // 圆形纸底 + 五行描边
    this.badge = scene.add.circle(0, 0, this.badgeRadius, InkColor.paper, 0.95)
    this.badge.setStrokeStyle(2, wuxing.border)
    this.add(this.badge)

    // 精英：印章红外环；Boss：双环
    if (isElite) {
      const ring = scene.add.circle(0, 0, this.badgeRadius + 5, InkColor.cinnabar, 0)
      ring.setStrokeStyle(1.5, InkColor.cinnabar, 0.85)
      this.add(ring)
    } else if (isBoss) {
      const ringInner = scene.add.circle(0, 0, this.badgeRadius + 5, InkColor.cinnabar, 0)
      ringInner.setStrokeStyle(2, InkColor.cinnabar, 0.9)
      const ringOuter = scene.add.circle(0, 0, this.badgeRadius + 9, InkColor.ink, 0)
      ringOuter.setStrokeStyle(1, InkColor.ink, 0.6)
      this.add([ringInner, ringOuter])
    }

    // 中央五行字（楷体）
    const charText = inkText(scene, 0, 0, wuxing.label, {
      size: isBoss ? 22 : 16,
      color: wuxing.text,
      bold: true,
      originX: 0.5
    })
    this.add(charText)

    // 创建血条
    this.healthBar = scene.add.graphics()
    this.add(this.healthBar)
    this.updateHealthBar()

    // 设置深度
    this.setDepth(10)

    // 添加到场景
    scene.add.existing(this)
  }

  /**
   * 更新位置
   */
  updatePosition(position: Point): void {
    this.setPosition(position.x, position.y)
    this.enemyData.position = position
  }

  /**
   * 更新血条（墨底，随血量 绿→金→印章红）
   */
  private updateHealthBar(): void {
    this.healthBar.clear()

    const width = this.badgeRadius * 2 + 4
    const height = 4
    const yOffset = this.badgeRadius + 8

    // 血条背景
    this.healthBar.fillStyle(InkColor.ink, 0.35)
    this.healthBar.fillRect(-width / 2, yOffset, width, height)

    // 当前血量
    const healthPercent = this.enemyData.currentHealth / this.enemyData.maxHealth
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

    // 受伤动画
    this.scene.tweens.add({
      targets: this.badge,
      alpha: 0.5,
      duration: 100,
      yoyo: true
    })

    return actualDamage
  }

  /**
   * 受击抖动（打击感反馈）
   * 只抖动子元素 badge 的局部坐标，不动容器本身，
   * 避免与"沿路径移动"的容器位置更新互相打架。
   */
  hitShake(strength = 4): void {
    const sprite = this.badge
    if (!sprite || !sprite.active) return
    const baseX = 0 // badge 的局部基准 x

    this.scene.tweens.add({
      targets: sprite,
      x: baseX + strength,
      duration: 40,
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

    // 死亡动画
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 300,
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
