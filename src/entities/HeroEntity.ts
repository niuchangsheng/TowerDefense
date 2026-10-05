import Phaser from 'phaser'
import { Hero, DeployedHero, Point, HeroStats } from '@/types'
import { InkColor, INK_WUXING, InkRadius, inkText, InkText } from '@/ui/InkTheme'
import { InkSilhouetteRenderer } from '@/rendering/InkSilhouetteRenderer'
import { getStatMultiplier } from '@/data/heroes/levelConfig'
import { EquipmentManager } from '@/core/equipment/EquipmentManager'
import { DamageCalculator } from '@/core/battle/DamageCalculator'

/**
 * 英雄渲染实体（水墨战阵将印风）
 * 彻底废弃写实大头像，采用专属水墨神将武姿立像（赵云白袍银枪、关羽青龙偃月刀、张飞丈八蛇矛），
 * 搭配八卦五行铜盘地台。
 */
export class HeroEntity extends Phaser.GameObjects.Container {
  private heroData: Hero
  private deployedData: DeployedHero
  private heroImage: Phaser.GameObjects.Image
  private baseScaleX: number = 1
  private baseScaleY: number = 1
  private readonly baseImageX: number = 0
  private readonly baseImageY: number = -2
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

    // 1. 战术将印底座（微阴影 + 宣纸圆盘 + 五行属性边框，适配 40px 单格）
    const tokenBg = scene.add.graphics()
    tokenBg.fillStyle(0x000000, 0.12)
    tokenBg.fillCircle(1, 0, 16)
    tokenBg.fillStyle(InkColor.paperPanel, 1)
    tokenBg.fillCircle(0, -2, 15)
    tokenBg.lineStyle(2, wuxing.border, 1)
    tokenBg.strokeCircle(0, -2, 15)
    tokenBg.lineStyle(0.8, InkColor.ink, 0.35)
    tokenBg.strokeCircle(0, -2, 12)
    this.add(tokenBg)

    // 2. 英雄头像（规范为 24x24 紧凑尺寸，完全容纳在 1 格 40px 内）
    const imageKey = this.getHeroImageKey(hero.id)
    this.heroImage = scene.add.image(this.baseImageX, this.baseImageY, imageKey)
    this.heroImage.setDisplaySize(24, 24)
    this.baseScaleX = this.heroImage.scaleX
    this.baseScaleY = this.heroImage.scaleY
    this.add(this.heroImage)

    // 3. 紧凑名牌（圆角宣纸底，置于下方 y = 13，完全收敛在 40px 单格内）
    const nameY = 13
    this.heroNameText = inkText(scene, 0, nameY, hero.name, {
      size: 9,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const nameBg = this.makeChipBg(this.heroNameText, 3, 1)
    this.add([nameBg, this.heroNameText])

    // 4. 五行属性角印（置于圆徽左上方 (-11, -12)，不占用额外空间）
    const wxBadge = scene.add.graphics()
    wxBadge.fillStyle(wuxing.fill, 0.95)
    wxBadge.fillCircle(-11, -12, 5.5)
    wxBadge.lineStyle(1, wuxing.border, 1)
    wxBadge.strokeCircle(-11, -12, 5.5)
    this.add(wxBadge)

    this.wuXingText = inkText(scene, -11, -12, wuxing.label, {
      size: 7.5,
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
      size: 8,
      color: InkText.paper,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const readyBg = scene.add.rectangle(0, 0, 11, 11, InkColor.cinnabar)
    readyBg.setStrokeStyle(1, 0x6e1b15)
    this.skillReadyIndicator = scene.add.container(11, -12, [readyBg, this.skillReadyText])
    this.skillReadyIndicator.setAlpha(0)
    this.add(this.skillReadyIndicator)

    // 设置深度
    this.setDepth(15)
    scene.add.existing(this)

    const hit = { w: 36, h: 38 }
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
      'hero_zhaoyun': 'ink_hero_zhaoyun',
      'hero_huangzhong': 'ink_hero_huangzhong',
      'hero_machao': 'ink_hero_machao'
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
   * 必须基于不可变的 baseScale 与 baseImage 坐标进行补间，杜绝超高攻速下补间重叠导致的指数级形变
   */
  playAttackAnimation(): void {
    this.scene.tweens.killTweensOf(this.heroImage)
    this.heroImage.setPosition(this.baseImageX, this.baseImageY)
    this.heroImage.setScale(this.baseScaleX, this.baseScaleY)

    this.scene.tweens.add({
      targets: this.heroImage,
      x: this.baseImageX + 6,
      scaleX: this.baseScaleX * 1.08,
      scaleY: this.baseScaleY * 1.08,
      duration: 65,
      yoyo: true,
      ease: 'Power2.easeOut',
      onComplete: () => {
        if (this.heroImage && this.heroImage.active) {
          this.heroImage.setPosition(this.baseImageX, this.baseImageY)
          this.heroImage.setScale(this.baseScaleX, this.baseScaleY)
        }
      }
    })
  }

  /**
   * 重置武将至基准变换（波次开始/状态恢复保险机制）
   */
  resetToBaseTransform(): void {
    this.scene.tweens.killTweensOf(this)
    this.scene.tweens.killTweensOf(this.heroImage)
    this.setPosition(this.deployedData.position.x, this.deployedData.position.y)
    this.heroImage.setPosition(this.baseImageX, this.baseImageY)
    this.heroImage.setScale(this.baseScaleX, this.baseScaleY)
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
    if (data.position) {
      this.setPosition(data.position.x, data.position.y)
    }
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
    const barWidth = 28
    const barHeight = 2.5
    const barY = this.useFullbody ? 90 : 18

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
      const overlaySize = this.useFullbody ? { width: 120, height: 150 } : { width: 32, height: 32 }
      this.skillCooldownOverlay.fillStyle(0x000000, 0.3 * (1 - cooldownPercent))
      this.skillCooldownOverlay.fillRect(
        -overlaySize.width / 2,
        -overlaySize.height / 2 - 2,
        overlaySize.width,
        overlaySize.height
      )
    }

    // 更新技能就绪提示
    if (cooldownPercent >= 1) {
      this.skillReadyIndicator.setAlpha(1)
      this.skillReadyText.setText('令')
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
   * 获取英雄五维有效属性（包含武道十境、神兵宝石与被动技能加成，严格执行局外总增益 <= +50% 铁律）
   */
  getEffectiveStats(): HeroStats {
    const levelMult = getStatMultiplier(this.heroData.level)
    const levelBonusRatio = Math.max(0, levelMult - 1)

    const gemBonuses = EquipmentManager.getInstance().getHeroGemStatBonuses(this.heroData.id)

    // 铁律：全局局外数值总增益上限 <= +50%（武道十境最高 +36% + 双 Lv.5 宝石攻击最高 +14% <= +50%）
    const totalOutAttackBonus = DamageCalculator.clampOutOfBattleBonus(levelBonusRatio + gemBonuses.attackPercent)
    const totalOutSpeedBonus = DamageCalculator.clampOutOfBattleBonus(gemBonuses.attackSpeedPercent)

    const attack = Math.floor(this.heroData.baseStats.attack * (1 + totalOutAttackBonus))
    let attackSpeed = this.heroData.baseStats.attackSpeed * (1 + totalOutSpeedBonus)
    const attackRange = this.heroData.baseStats.attackRange + Math.min(40, gemBonuses.attackRangeFlat)
    const critRate = Math.min(1.0, (this.heroData.baseStats.critRate ?? 0.15) + gemBonuses.critRateBonus)
    const critDamage = (this.heroData.baseStats.critDamage ?? 0.50) + gemBonuses.critDamageBonus

    // 应用局内被动技能加成
    const passiveSkillId = this.heroData.passiveSkillId
    if (passiveSkillId === 'skill_passive_zhaoyun') {
      // 龙胆：攻速+15%
      attackSpeed = attackSpeed * 1.15
    } else if (passiveSkillId === 'skill_passive_machao') {
      // 西凉骠骑：攻速+15%
      attackSpeed = attackSpeed * 1.15
    }

    return {
      attack,
      attackSpeed,
      attackRange,
      critRate,
      critDamage
    }
  }
}
