import Phaser from 'phaser'
import { Hero, DeployedHero, Point, HeroStats } from '@/types'

/**
 * 英雄渲染实体
 * Phaser游戏对象，负责英雄的渲染和动画
 */
export class HeroEntity extends Phaser.GameObjects.Container {
  private heroData: Hero
  private deployedData: DeployedHero
  private heroSprite: Phaser.GameObjects.Rectangle
  private wuXingText: Phaser.GameObjects.Text
  private rangeIndicator: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, hero: Hero, deployed: DeployedHero) {
    super(scene, deployed.position.x, deployed.position.y)

    this.heroData = hero
    this.deployedData = deployed

    // 创建英雄图形（占位：使用矩形）
    const color = this.getWuXingColor(hero.wuXing)
    this.heroSprite = scene.add.rectangle(0, 0, 60, 60, color)
    this.add(this.heroSprite)

    // 创建五行文字
    this.wuXingText = scene.add.text(0, 0, this.getWuXingText(hero.wuXing), {
      fontSize: '16px',
      color: '#000000'
    }).setOrigin(0.5)
    this.add(this.wuXingText)

    // 创建范围指示器
    this.rangeIndicator = scene.add.graphics()
    this.add(this.rangeIndicator)
    this.hideRangeIndicator()

    // 设置深度
    this.setDepth(15)

    // 添加到场景
    scene.add.existing(this)

    // 设置交互
    this.setInteractive({ useHandCursor: true })
    this.on('pointerover', () => this.showRangeIndicator())
    this.on('pointerout', () => this.hideRangeIndicator())
  }

  /**
   * 更新攻击动画
   */
  playAttackAnimation(): void {
    this.scene.tweens.add({
      targets: this.heroSprite,
      scale: 1.2,
      duration: 100,
      yoyo: true
    })
  }

  /**
   * 显示范围指示器
   */
  showRangeIndicator(): void {
    this.rangeIndicator.clear()
    this.rangeIndicator.lineStyle(2, 0x00ff00, 0.5)
    this.rangeIndicator.strokeCircle(0, 0, this.heroData.baseStats.attackRange)
  }

  /**
   * 隐藏范围指示器
   */
  hideRangeIndicator(): void {
    this.rangeIndicator.clear()
  }

  /**
   * 获取英雄数据
   */
  getHeroData(): Hero {
    return this.heroData
  }

  /**
   * 获取部署数据
   */
  getDeployedData(): DeployedHero {
    return this.deployedData
  }

  /**
   * 更新部署数据
   */
  updateDeployedData(data: Partial<DeployedHero>): void {
    this.deployedData = { ...this.deployedData, ...data }
  }

  /**
   * 更新冷却时间
   */
  updateCooldown(currentCooldown: number): void {
    this.deployedData.currentCooldown = currentCooldown
  }

  /**
   * 更新上次攻击时间
   */
  updateLastAttackTime(time: number): void {
    this.deployedData.lastAttackTime = time
  }

  /**
   * 获取英雄属性（包含等级和装备加成）
   * TODO: Phase 4实现完整的属性计算
   */
  getEffectiveStats(): HeroStats {
    // 基础属性 + 等级加成（简化：每级+5%）
    const levelMultiplier = 1 + (this.heroData.level - 1) * 0.05
    return {
      attack: Math.floor(this.heroData.baseStats.attack * levelMultiplier),
      attackSpeed: this.heroData.baseStats.attackSpeed,
      attackRange: this.heroData.baseStats.attackRange
    }
  }

  /**
   * 获取五行颜色
   */
  private getWuXingColor(wuXing: string): number {
    const colors: Record<string, number> = {
      metal: 0xcccccc,   // 灰白色
      wood: 0x00aa00,    // 深绿色
      water: 0x0088ff,   // 蓝色
      fire: 0xff4400,    // 橙红色
      earth: 0xffcc00    // 金黄色
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
}