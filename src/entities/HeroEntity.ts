import Phaser from 'phaser'
import { Hero, DeployedHero, Point, HeroStats } from '@/types'
import { InkColor, INK_WUXING, InkRadius, inkText, InkText } from '@/ui/InkTheme'
import { InkSilhouetteRenderer } from '@/rendering/InkSilhouetteRenderer'

/**
 * 英雄渲染实体（水墨战阵将印风）
 * 彻底废弃写实大头像，采用专属水墨神将武姿立像（赵云白袍银枪、关羽青龙偃月刀、张飞丈八蛇矛），
 * 搭配八卦五行铜盘地台。
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

  // 全身模型标志（战场网格模式下统一使用战术将印徽章，杜绝过大立绘遮挡上下行邻格与路径）
  private useFullbody: boolean = false

  constructor(scene: Phaser.Scene, hero: Hero, deployed: DeployedHero) {
    super(scene, deployed.position.x, deployed.position.y)

    this.heroData = hero
    this.deployedData = deployed
    this.useFullbody = false

    InkSilhouetteRenderer.init(scene)

    const wuxing = INK_WUXING[hero.wuXing]

    // 1. 战术将印底座（微阴影 + 宣纸圆盘 + 五行属性边框）
    const tokenBg = scene.add.graphics()
    tokenBg.fillStyle(0x000000, 0.12)
    tokenBg.fillCircle(2, 3, 28)
    tokenBg.fillStyle(InkColor.paperPanel, 1)
    tokenBg.fillCircle(0, 0, 27)
    tokenBg.lineStyle(2.5, wuxing.border, 1)
    tokenBg.strokeCircle(0, 0, 27)
    tokenBg.lineStyle(1, InkColor.ink, 0.4)
    tokenBg.strokeCircle(0, 0, 23)
    this.add(tokenBg)

    // 2. 英雄头像（规范为 50x50 紧凑尺寸，完全容纳在 80px 格子内）
    const imageKey = this.getHeroImageKey(hero.id)
    this.heroImage = scene.add.image(0, 0, imageKey)
    this.heroImage.setDisplaySize(48, 48)
    this.add(this.heroImage)

    // 3. 紧凑名牌（圆角宣纸底，置于下方 y = 28，完全收敛在 80px 格子内）
    const nameY = 28
    this.heroNameText = inkText(scene, 0, nameY, hero.name, {
      size: 11,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const nameBg = this.makeChipBg(this.heroNameText, 5, 2)
    this.add([nameBg, this.heroNameText])

    // 4. 五行属性角印（置于圆徽左上方 (-18, -18)，不占用额外上下垂直空间）
    const wxBadge = scene.add.graphics()
    wxBadge.fillStyle(wuxing.fill, 0.95)
    wxBadge.fillCircle(-18, -18, 9)
    wxBadge.lineStyle(1.5, wuxing.border, 1)
    wxBadge.strokeCircle(-18, -18, 9)
    this.add(wxBadge)

    this.wuXingText = inkText(scene, -18, -18, wuxing.label, {
      size: 10,
      color: wuxing.text,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.add(this.wuXingText)

    // 5. 创建范围指示器
    this.rangeIndicator = scene.add.graphics()
    this.addAt(this.rangeIndicator, 0)
    this.hideRangeIndicator()

    // 6. 技能冷却进度条与遮罩
    this.skillCooldownBar = scene.add.graphics()
    this.add(this.skillCooldownBar)

    this.skillCooldownOverlay = scene.add.graphics()
    this.add(this.skillCooldownOverlay)

    // 7. 技能就绪提示
    this.skillReadyText = inkText(scene, 0, 0, '令', {
      size: 9,
      color: InkText.paper,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const readyBg = scene.add.rectangle(0, 0, 16, 16, InkColor.cinnabar)
    readyBg.setStrokeStyle(1, 0x6e1b15)
    this.skillReadyIndicator = scene.add.container(20, -22, [readyBg, this.skillReadyText])
    this.skillReadyIndicator.setAlpha(0)
    this.add(this.skillReadyIndicator)

    // 设置深度
    this.setDepth(15)
    scene.add.existing(this)

    const hit = { w: 60, h: 72 }
    this.setSize(hit.w, hit.h)
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-hit.w / 2, -hit.h / 2, hit.w, hit.h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    })
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
    const silhouetteMap: Record<string, string> = {
      'hero_guanyu': 'ink_hero_guanyu',
      'hero_zhangfei': 'ink_hero_zhangfei',
      'hero_zhaoyun': 'ink_hero_zhaoyun'
    }

    const key = silhouetteMap[heroId]
    if (key && this.scene.textures.exists(key)) {
      return key
    }

    if (this.scene.textures.exists('ink_hero_generic')) {
      return 'ink_hero_generic'
    }

    return 'hero_placeholder'
  }

  /**
   * 更新攻击动画（冷兵器前冲突刺与神将气魄震荡）
   */
  playAttackAnimation(): void {
    const origX = this.heroImage.x
    const origScaleX = this.heroImage.scaleX
    const origScaleY = this.heroImage.scaleY

    this.scene.tweens.add({
      targets: this.heroImage,
      x: origX + 7,
      scaleX: origScaleX * 1.08,
      scaleY: origScaleY * 1.08,
      duration: 80,
      yoyo: true,
      ease: 'Power2.easeOut',
      onComplete: () => {
        if (this.heroImage && this.heroImage.active) {
          this.heroImage.setX(origX)
          this.heroImage.setScale(origScaleX, origScaleY)
        }
      }
    })
  }

  /**
   * 显示范围指示器（淡墨圈）
   */
  showRangeIndicator(): void {
    this.rangeIndicator.clear()
    this.rangeIndicator.lineStyle(2, InkColor.ink, 0.35)
    this.rangeIndicator.fillStyle(InkColor.ink, 0.06)
    const range = this.getEffectiveStats().attackRange
    this.rangeIndicator.fillCircle(0, 0, range)
    this.rangeIndicator.strokeCircle(0, 0, range)
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
