import Phaser from 'phaser'
import { Enemy, Point } from '@/types'

/**
 * 敌人渲染实体
 * Phaser游戏对象，负责敌人的渲染和动画
 */
export class EnemyEntity extends Phaser.GameObjects.Container {
  private enemyData: Enemy
  private healthBar: Phaser.GameObjects.Graphics
  private enemySprite: Phaser.GameObjects.Rectangle
  private wuXingText: Phaser.GameObjects.Text

  // 状态效果
  private stunEndTime: number = 0
  private slowEndTime: number = 0
  private slowPercent: number = 0

  constructor(scene: Phaser.Scene, enemy: Enemy) {
    super(scene, enemy.position.x, enemy.position.y)

    this.enemyData = enemy

    // 创建敌人图形（占位：使用矩形）
    const color = this.getWuXingColor(enemy.wuXing)
    this.enemySprite = scene.add.rectangle(0, 0, 40, 40, color)
    this.add(this.enemySprite)

    // 创建五行文字
    this.wuXingText = scene.add.text(0, -25, this.getWuXingText(enemy.wuXing), {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5)
    this.add(this.wuXingText)

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
   * 更新血条
   */
  private updateHealthBar(): void {
    this.healthBar.clear()

    const width = 40
    const height = 4
    const yOffset = 25

    // 血条背景
    this.healthBar.fillStyle(0x333333)
    this.healthBar.fillRect(-width / 2, yOffset, width, height)

    // 当前血量
    const healthPercent = this.enemyData.currentHealth / this.enemyData.maxHealth
    const healthColor = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000
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
      targets: this.enemySprite,
      alpha: 0.5,
      duration: 100,
      yoyo: true
    })

    return actualDamage
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
   * 获取五行颜色
   */
  private getWuXingColor(wuXing: string): number {
    const colors: Record<string, number> = {
      metal: 0xffffff,   // 白色
      wood: 0x00ff00,    // 绿色
      water: 0x0000ff,   // 蓝色
      fire: 0xff0000,    // 红色
      earth: 0xffff00    // 黄色
    }
    return colors[wuXing] || 0x888888
  }

  /**
   * 获取五行文字
   */
  private getWuXingText(wuXing: string): string {
    const texts: Record<string, string> = {
      metal: '金',
      wood: '木',
      water: '水',
      fire: '火',
      earth: '土'
    }
    return texts[wuXing] || '?'
  }

  /**
   * 应用眩晕效果
   * @param duration 眩晕持续时间（毫秒）
   */
  applyStun(duration: number): void {
    this.stunEndTime = Date.now() + duration

    // 眩晕视觉效果
    this.enemySprite.setFillStyle(0xffff00)  // 变黄

    // 添加眩晕标记
    const stunText = this.scene.add.text(0, -40, '眩晕', {
      fontSize: '10px',
      color: '#ffff00'
    }).setOrigin(0.5)
    this.add(stunText)

    // 定时恢复
    this.scene.time.delayedCall(duration, () => {
      this.stunEndTime = 0
      this.enemySprite.setFillStyle(this.getWuXingColor(this.enemyData.wuXing))
      stunText.destroy()
    })
  }

  /**
   * 应用减速效果
   * @param percent 减速百分比（0.3 = 30%减速）
   * @param duration 持续时间（毫秒）
   */
  applySlow(percent: number, duration: number): void {
    this.slowPercent = percent
    this.slowEndTime = Date.now() + duration

    // 减速视觉效果
    this.enemySprite.setFillStyle(0x0088ff)  // 变蓝

    // 添加减速标记
    const slowText = this.scene.add.text(0, -40, '减速', {
      fontSize: '10px',
      color: '#0088ff'
    }).setOrigin(0.5)
    this.add(slowText)

    // 定时恢复
    this.scene.time.delayedCall(duration, () => {
      this.slowPercent = 0
      this.slowEndTime = 0
      this.enemySprite.setFillStyle(this.getWuXingColor(this.enemyData.wuXing))
      slowText.destroy()
    })
  }

  /**
   * 检查是否处于眩晕状态
   */
  isStunned(): boolean {
    return Date.now() < this.stunEndTime
  }

  /**
   * 检查是否处于减速状态
   */
  isSlowed(): boolean {
    return Date.now() < this.slowEndTime
  }

  /**
   * 获取减速百分比
   */
  getSlowPercent(): number {
    return this.isSlowed() ? this.slowPercent : 0
  }
}