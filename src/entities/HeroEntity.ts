import Phaser from 'phaser'
import { Hero, DeployedHero, Point, HeroStats } from '@/types'
import { InkColor, InkText, InkRadius, INK_WUXING, inkText } from '@/ui/InkTheme'

/**
 * 英雄渲染实体（水墨风）
 * 立绘（San11 头像/全身）保留，周边标注统一为水墨：
 * 纸片名牌、楷体五行标签、淡墨范围圈、墨底冷却条。
 */
export class HeroEntity extends Phaser.GameObjects.Container {
  private heroData: Hero
  private deployedData: DeployedHero
  private heroImage: Phaser.GameObjects.Image
  private heroNameText: Phaser.GameObjects.Text  // 英雄名称
  private wuXingText: Phaser.GameObjects.Text   // 五行属性
  private rangeIndicator: Phaser.GameObjects.Graphics
  private skillCooldownBar: Phaser.GameObjects.Graphics  // 技能冷却进度条
  private skillCooldownOverlay: Phaser.GameObjects.Graphics  // 技能冷却遮罩
  private skillReadyIndicator: Phaser.GameObjects.Container  // 技能就绪提示
  private skillReadyText: Phaser.GameObjects.Text

  // 技能冷却状态（主动技能）
  private activeSkillCooldownPercent: number = 0

  // 全身模型标志
  private useFullbody: boolean = false

  constructor(scene: Phaser.Scene, hero: Hero, deployed: DeployedHero) {
    super(scene, deployed.position.x, deployed.position.y)

    this.heroData = hero
    this.deployedData = deployed

    // 判断是否使用全身模型
    this.useFullbody = this.shouldUseFullbody(hero.id)

    // 获取图片key（根据英雄ID和模型类型）
    const imageKey = this.getHeroImageKey(hero.id)

    // 创建英雄图片（根据类型调整尺寸）
    this.heroImage = scene.add.image(0, 0, imageKey)
    if (this.useFullbody) {
      // 全身模型：较大尺寸
      this.heroImage.setDisplaySize(120, 150)
    } else {
      // 头像：标准尺寸
      this.heroImage.setDisplaySize(80, 80)
    }
    this.add(this.heroImage)

    // 纸片名牌（圆角宣纸底 + 墨线 + 楷体）
    const nameY = this.useFullbody ? -85 : -50
    this.heroNameText = inkText(scene, 0, nameY, hero.name, {
      size: 14,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    })
    const nameBg = this.makeChipBg(this.heroNameText, 6, 4)
    this.add([nameBg, this.heroNameText])

    // 五行标签（楷体，五行色）
    const wuxing = INK_WUXING[hero.wuXing]
    const wuXingY = this.useFullbody ? 85 : 50
    this.wuXingText = inkText(scene, 0, wuXingY, wuxing.label, {
      size: 12,
      color: wuxing.text,
      bold: true,
      originX: 0.5
    })
    const wuXingBg = this.makeChipBg(this.wuXingText, 5, 2)
    this.add([wuXingBg, this.wuXingText])

    // 创建范围指示器
    this.rangeIndicator = scene.add.graphics()
    this.add(this.rangeIndicator)
    this.hideRangeIndicator()

    // 创建技能冷却进度条（位置根据模型类型调整）
    this.skillCooldownBar = scene.add.graphics()
    this.add(this.skillCooldownBar)

    // 创建技能冷却遮罩（覆盖在图片上）
    this.skillCooldownOverlay = scene.add.graphics()
    this.add(this.skillCooldownOverlay)

    // 技能就绪提示（纸底印章红小标签）
    const skillY = this.useFullbody ? -100 : -65
    this.skillReadyText = inkText(scene, 0, 0, '技能就绪', {
      size: 10,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5
    })
    const readyBg = this.makeChipBg(this.skillReadyText, 4, 2)
    this.skillReadyIndicator = scene.add.container(0, skillY, [readyBg, this.skillReadyText])
    this.skillReadyIndicator.setAlpha(0)  // 初始隐藏
    this.add(this.skillReadyIndicator)

    // 设置深度
    this.setDepth(15)

    // 添加到场景
    scene.add.existing(this)

    // 设置交互区域
    this.heroImage.setInteractive({ useHandCursor: true })
    this.heroImage.on('pointerover', () => this.showRangeIndicator())
    this.heroImage.on('pointerout', () => this.hideRangeIndicator())
  }

  /**
   * 为居中文字做圆角宣纸底（返回 Graphics，需加到文字之前）
   */
  private makeChipBg(text: Phaser.GameObjects.Text, padX: number, padY: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics()
    const w = text.width + padX * 2
    const h = text.height + padY * 2
    // 文字以 origin(0.5, 0.5) 居中于 (0, y)，底衬同中心
    const cy = text.y
    g.fillStyle(InkColor.paperPanel, 0.9)
    g.fillRoundedRect(-w / 2, cy - h / 2, w, h, InkRadius.sm)
    g.lineStyle(1, InkColor.ink, 0.55)
    g.strokeRoundedRect(-w / 2, cy - h / 2, w, h, InkRadius.sm)
    return g
  }

  /**
   * 判断是否使用全身模型
   */
  private shouldUseFullbody(heroId: string): boolean {
    // 目前只有赵云有全身模型
    const fullbodyHeroes = ['hero_zhaoyun']
    return fullbodyHeroes.includes(heroId) && this.scene.textures.exists(`fullbody_${heroId.replace('hero_', '')}_stand`)
  }

  /**
   * 获取英雄图片key
   */
  private getHeroImageKey(heroId: string): string {
    // 如果使用全身模型，返回站立状态的纹理
    if (this.useFullbody) {
      const fullbodyKey = `fullbody_${heroId.replace('hero_', '')}_stand`
      if (this.scene.textures.exists(fullbodyKey)) {
        return fullbodyKey
      }
    }

    // 否则使用头像
    const imageKeyMap: Record<string, string> = {
      'hero_guanyu': 'hero_guanyu',
      'hero_zhangfei': 'hero_zhangfei',
      'hero_zhaoyun': 'hero_zhaoyun'
    }

    const key = imageKeyMap[heroId]
    if (key && this.scene.textures.exists(key)) {
      return key
    }

    // 如果没有找到，使用占位符
    return 'hero_placeholder'
  }

  /**
   * 更新攻击动画（全身模型切换纹理，头像缩放效果）
   */
  playAttackAnimation(): void {
    if (this.useFullbody) {
      // 全身模型：切换到攻击帧
      const attackKey = `fullbody_${this.heroData.id.replace('hero_', '')}_attack`
      if (this.scene.textures.exists(attackKey)) {
        this.heroImage.setTexture(attackKey)
        this.heroImage.setDisplaySize(120, 150)

        // 攻击动画效果（轻微前冲）
        this.scene.tweens.add({
          targets: this.heroImage,
          x: 10,
          duration: 100,
          yoyo: true,
          ease: 'Power2',
          onComplete: () => {
            // 攻击结束后切换回站立帧
            const standKey = `fullbody_${this.heroData.id.replace('hero_', '')}_stand`
            if (this.scene.textures.exists(standKey)) {
              this.heroImage.setTexture(standKey)
              this.heroImage.setDisplaySize(120, 150)
            }
          }
        })
      }
    } else {
      // 头像：缩放+闪烁效果
      this.scene.tweens.add({
        targets: this.heroImage,
        scale: 1.3,
        duration: 100,
        yoyo: true
      })

      this.scene.tweens.add({
        targets: this.heroImage,
        alpha: 0.7,
        duration: 50,
        yoyo: true
      })
    }
  }

  /**
   * 显示范围指示器（淡墨圈）
   */
  showRangeIndicator(): void {
    this.rangeIndicator.clear()
    this.rangeIndicator.lineStyle(2, InkColor.ink, 0.25)
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
   * 更新技能冷却显示
   * @param cooldownPercent 冷却百分比（0-1，1表示就绪）
   */
  updateSkillCooldownDisplay(cooldownPercent: number): void {
    this.activeSkillCooldownPercent = cooldownPercent

    // 更新冷却进度条（底部）
    this.skillCooldownBar.clear()
    const barWidth = 60
    const barHeight = 4
    const barY = this.useFullbody ? 90 : 55

    // 背景（墨底）
    this.skillCooldownBar.fillStyle(InkColor.ink, 0.35)
    this.skillCooldownBar.fillRect(-barWidth / 2, barY, barWidth, barHeight)

    // 进度（未就绪淡墨，就绪印章红）
    const progressColor = cooldownPercent >= 1 ? InkColor.cinnabar : InkColor.inkFaint
    this.skillCooldownBar.fillStyle(progressColor, 0.9)
    this.skillCooldownBar.fillRect(-barWidth / 2, barY, barWidth * cooldownPercent, barHeight)

    // 更新冷却遮罩（覆盖图片）
    this.skillCooldownOverlay.clear()
    if (cooldownPercent < 1) {
      // 冷却中：显示半透明遮罩
      const overlaySize = this.useFullbody ? { width: 120, height: 150 } : { width: 80, height: 80 }
      this.skillCooldownOverlay.fillStyle(0x000000, 0.3 * (1 - cooldownPercent))
      this.skillCooldownOverlay.fillRect(
        -overlaySize.width / 2,
        -overlaySize.height / 2,
        overlaySize.width,
        overlaySize.height
      )
    }

    // 更新技能就绪提示
    if (cooldownPercent >= 1) {
      this.skillReadyIndicator.setAlpha(1)
      this.skillReadyText.setText('技能就绪')
    } else {
      this.skillReadyIndicator.setAlpha(0)
    }
  }

  /**
   * 更新上次攻击时间
   */
  updateLastAttackTime(time: number): void {
    this.deployedData.lastAttackTime = time
  }

  /**
   * 获取英雄属性（包含等级、装备和被动技能加成）
   */
  getEffectiveStats(): HeroStats {
    const levelMultiplier = 1 + (this.heroData.level - 1) * 0.05

    // 基础属性
    let attack = Math.floor(this.heroData.baseStats.attack * levelMultiplier)
    let attackSpeed = this.heroData.baseStats.attackSpeed
    const attackRange = this.heroData.baseStats.attackRange

    // 应用被动技能buff
    const passiveSkillId = this.heroData.passiveSkillId
    if (passiveSkillId === 'skill_passive_zhangfei') {
      // 猛将：攻击力+10%
      attack = Math.floor(attack * 1.1)
    } else if (passiveSkillId === 'skill_passive_zhaoyun') {
      // 龙胆：攻速+20%
      attackSpeed = attackSpeed * 1.2
    }

    return {
      attack,
      attackSpeed,
      attackRange
    }
  }
}
