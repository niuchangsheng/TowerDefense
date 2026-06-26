import Phaser from 'phaser'
import { Hero, DeployedHero, Point, HeroStats } from '@/types'

/**
 * 英雄渲染实体
 * Phaser游戏对象，负责英雄的渲染和动画
 * 使用三国志11真实头像
 */
export class HeroEntity extends Phaser.GameObjects.Container {
  private heroData: Hero
  private deployedData: DeployedHero
  private heroImage: Phaser.GameObjects.Image  // 改为图片类型
  private heroNameText: Phaser.GameObjects.Text  // 英雄名称
  private wuXingText: Phaser.GameObjects.Text   // 五行属性
  private rangeIndicator: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, hero: Hero, deployed: DeployedHero) {
    super(scene, deployed.position.x, deployed.position.y)

    this.heroData = hero
    this.deployedData = deployed

    // 获取头像图片key（根据英雄ID）
    const imageKey = this.getHeroImageKey(hero.id)

    // 创建英雄头像图片（缩放到合适大小）
    // 原图240x240，缩放到80x80显示
    this.heroImage = scene.add.image(0, 0, imageKey)
    this.heroImage.setDisplaySize(80, 80)  // 显示尺寸
    this.add(this.heroImage)

    // 创建英雄名称文字
    this.heroNameText = scene.add.text(0, -50, hero.name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5)
    this.add(this.heroNameText)

    // 创建五行文字（显示在头像下方）
    this.wuXingText = scene.add.text(0, 50, this.getWuXingText(hero.wuXing), {
      fontSize: '12px',
      color: this.getWuXingTextColor(hero.wuXing),
      backgroundColor: '#000000',
      padding: { x: 3, y: 1 }
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

    // 设置交互区域（基于头像大小）
    this.heroImage.setInteractive({ useHandCursor: true })
    this.heroImage.on('pointerover', () => this.showRangeIndicator())
    this.heroImage.on('pointerout', () => this.hideRangeIndicator())
  }

  /**
   * 获取英雄头像图片key
   */
  private getHeroImageKey(heroId: string): string {
    // 映射英雄ID到预加载的图片key
    const imageKeyMap: Record<string, string> = {
      'hero_guanyu': 'hero_guanyu',
      'hero_zhangfei': 'hero_zhangfei',
      'hero_zhaoyun': 'hero_zhaoyun'
    }

    const key = imageKeyMap[heroId]
    if (key && this.scene.textures.exists(key)) {
      return key
    }

    // 如果没有找到真实头像，使用占位符
    return 'hero_placeholder'
  }

  /**
   * 更新攻击动画
   */
  playAttackAnimation(): void {
    this.scene.tweens.add({
      targets: this.heroImage,
      scale: 1.3,  // 攻击时放大
      duration: 100,
      yoyo: true
    })

    // 攻击时闪烁效果
    this.scene.tweens.add({
      targets: this.heroImage,
      alpha: 0.7,
      duration: 50,
      yoyo: true
    })
  }

  /**
   * 显示范围指示器
   */
  showRangeIndicator(): void {
    this.rangeIndicator.clear()
    this.rangeIndicator.lineStyle(2, 0x00ff00, 0.3)
    this.rangeIndicator.strokeCircle(0, 0, this.heroData.baseStats.attackRange)

    // 显示英雄信息提示
    this.heroNameText.setAlpha(1)
    this.wuXingText.setAlpha(1)
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
   */
  getEffectiveStats(): HeroStats {
    const levelMultiplier = 1 + (this.heroData.level - 1) * 0.05
    return {
      attack: Math.floor(this.heroData.baseStats.attack * levelMultiplier),
      attackSpeed: this.heroData.baseStats.attackSpeed,
      attackRange: this.heroData.baseStats.attackRange
    }
  }

  /**
   * 获取五行文字颜色
   */
  private getWuXingTextColor(wuXing: string): string {
    const colors: Record<string, string> = {
      metal: '#cccccc',   // 灰白色
      wood: '#00aa00',    // 深绿色
      water: '#0088ff',   // 蓝色
      fire: '#ff4400',    // 橙红色
      earth: '#ffcc00'    // 金黄色
    }
    return colors[wuXing] || '#888888'
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