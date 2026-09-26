import Phaser from 'phaser'
import {
  getSkill,
  getHeroSkillEvolution,
  getCurrentEvolutionNode,
  getHeroStatusDetails
} from '@/data/skills'
import { Hero, RarityNames, Rarity, WuXing } from '@/types'
import { EquipmentManager, EquipmentInstance } from '@/core/equipment/EquipmentManager'
import { getExpToNextLevel, getExpProgress, getExpRequiredForLevel } from '@/data/heroes/levelConfig'
import { SaveManager } from '@/core/save/SaveManager'
import {
  InkColor,
  InkText,
  InkFontSize,
  InkRadius,
  InkDepth,
  INK_WUXING,
  INK_RARITY,
  drawPaperBackground,
  createPanel,
  inkText,
  inkRule,
  sectionHeader,
  createInkButton,
  renderPageHeader,
  createPageBackButton,
  inkToast
} from '@/ui/InkTheme'

/**
 * 武将页面场景（水墨宣纸风）
 *
 * 布局（1280×720，页边距 32）：
 * - 顶部标题栏（32,16 → 1248,68）
 * - 左侧武将名册（32,80 起，336×616，竖排卡片）
 * - 右侧详情面板（400,80，848×616，游标式分节布局）
 *
 * 所有业务逻辑（装备穿脱、升星、存档、属性计算）保持不变，仅重排渲染。
 */
export default class HeroListScene extends Phaser.Scene {
  // ===== 布局常量 =====
  private static readonly ROSTER_X = 32
  private static readonly ROSTER_WIDTH = 336
  private static readonly CARD_WIDTH = 336
  private static readonly CARD_HEIGHT = 104
  private static readonly CARD_GAP = 12
  private static readonly CARD_FIRST_TOP = 120
  private static readonly PANEL_X = 400
  private static readonly PANEL_Y = 80
  private static readonly PANEL_WIDTH = 848
  private static readonly PANEL_HEIGHT = 616
  private static readonly PANEL_PAD = 24
  private static readonly CONTENT_WIDTH = 800 // PANEL_WIDTH - PANEL_PAD * 2

  private heroes!: Map<string, Hero>
  private selectedHeroId: string | null = null
  private heroCards: Phaser.GameObjects.Container[] = []
  private detailPanel: Phaser.GameObjects.Container | null = null
  private equipmentManager: EquipmentManager

  // 绝学演武与详情交互状态
  private detailTab: 'skills' | 'equipment' = 'skills'
  private inspectedStage: number | null = null
  private selectedStatusKey: string | null = null

  constructor() {
    super({ key: 'HeroListScene' })
    this.equipmentManager = EquipmentManager.getInstance()
  }

  init(): void {
    const saveManager = SaveManager.getInstance()
    this.heroes = saveManager.loadHeroes()
    this.selectedHeroId = null
    this.heroCards = []
    this.detailPanel = null
    this.detailTab = 'skills'
    this.inspectedStage = null
    this.selectedStatusKey = null
  }

  create(): void {
    drawPaperBackground(this)

    this.renderHeader()
    this.renderRoster()
    this.createDetailPanelShell()
    this.createBackButton()

    // 默认选中第一个武将
    const firstHero = Array.from(this.heroes.values())[0]
    if (firstHero) {
      this.selectHero(firstHero.id)
    }
  }

  // ==================== 顶部标题栏 ====================

  /**
   * 标题栏：左侧标题 + 印章 + 副标，下方一条墨线
   */
  private renderHeader(): void {
    renderPageHeader(this, '武将', '· 名册')
  }

  /**
   * 创建返回按钮（右上角）
   */
  private createBackButton(): void {
    createPageBackButton(this, () => {
      try {
        this.autoSave()
      } catch (e) {
        console.warn('HeroList autoSave failed:', e)
      }
      try {
        this.scene.start('TitleScene')
      } catch (err) {
        console.error('Failed to start TitleScene:', err)
      }
    })
  }

  // ==================== 左侧武将名册 ====================

  /**
   * 左侧名册：列头 + 竖排武将卡片
   */
  private renderRoster(): void {
    const L = HeroListScene.ROSTER_X

    inkText(this, L, 96, `武将名册（${this.heroes.size}）`, {
      size: 18,
      color: InkText.strong,
      bold: true
    })
    inkRule(this, null, L, 110, HeroListScene.ROSTER_WIDTH, 0.35)

    const heroList = Array.from(this.heroes.values())
    for (let i = 0; i < heroList.length; i++) {
      const hero = heroList[i]
      const top = HeroListScene.CARD_FIRST_TOP + i * (HeroListScene.CARD_HEIGHT + HeroListScene.CARD_GAP)
      const card = this.createRosterCard(hero, L, top)
      this.heroCards.push(card)
    }
  }

  /**
   * 创建单个武将卡片（竖排横向卡，左上角定位）
   */
  private createRosterCard(hero: Hero, x: number, y: number): Phaser.GameObjects.Container {
    const W = HeroListScene.CARD_WIDTH
    const H = HeroListScene.CARD_HEIGHT
    const card = this.add.container(x, y)

    // 卡片背景
    const bg = this.add.rectangle(W / 2, H / 2, W, H, InkColor.paperPanel)
    bg.setStrokeStyle(1, InkColor.ink, 0.5)
    card.add(bg)

    // 选中态左缘竖条（默认隐藏）
    const stripe = this.add.rectangle(2, H / 2, 4, H - 2, InkColor.cinnabar)
    stripe.setVisible(false)
    card.add(stripe)

    // 武将头像（76×76，正方形原图无变形）
    const imageKey = this.getHeroImageKey(hero.id)
    if (this.textures.exists(imageKey)) {
      const avatar = this.add.image(14 + 38, 14 + 38, imageKey)
      avatar.setDisplaySize(76, 76)
      card.add(avatar)
    }

    // 名称
    card.add(inkText(this, 104, 20, hero.name, { size: InkFontSize.md, color: InkText.strong, bold: true }))
    // 等级（右对齐）
    card.add(inkText(this, 320, 20, `Lv.${hero.level}`, { size: InkFontSize.xs, color: InkText.faint, originX: 1 }))
    // 稀有度
    card.add(inkText(this, 104, 44, RarityNames[hero.rarity], { size: InkFontSize.xs, color: INK_RARITY[hero.rarity].text }))
    // 五行徽章
    this.createWuXingBadge(card, 104, 66, hero.wuXing, 22)

    // 点击交互
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => {
      if (hero.id !== this.selectedHeroId) {
        bg.setFillStyle(InkColor.paperDeep)
      }
    })
    bg.on('pointerout', () => {
      if (hero.id !== this.selectedHeroId) {
        bg.setFillStyle(InkColor.paperPanel)
      }
    })
    bg.on('pointerdown', () => {
      this.selectHero(hero.id)
    })

    // 存储heroId
    card.setData('heroId', hero.id)
    card.setData('stripe', stripe)

    return card
  }

  /**
   * 五行徽章：圆角底色 + 描边 + 居中单字
   * 画入 parent 容器的局部坐标 (x, y)（徽章左上角）
   */
  private createWuXingBadge(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    wuXing: WuXing,
    h: number
  ): void {
    const w = 56
    const theme = INK_WUXING[wuXing]

    const bg = this.add.graphics()
    bg.fillStyle(theme.fill, 1)
    bg.fillRoundedRect(x, y, w, h, InkRadius.sm)
    bg.lineStyle(1, theme.border, 1)
    bg.strokeRoundedRect(x, y, w, h, InkRadius.sm)
    parent.add(bg)

    parent.add(inkText(this, x + w / 2, y + h / 2, theme.label, {
      size: 14,
      color: theme.text,
      bold: true,
      originX: 0.5
    }))
  }

  /**
   * 选中武将
   */
  private selectHero(heroId: string): void {
    if (this.selectedHeroId !== heroId) {
      this.inspectedStage = null
      this.selectedStatusKey = null
    }

    // 更新选中状态
    this.selectedHeroId = heroId

    this.updateCardSelection()

    // 更新详情面板
    this.updateDetailPanel(heroId)
  }

  /**
   * 更新卡片选中高亮
   */
  private updateCardSelection(): void {
    for (const card of this.heroCards) {
      const cardHeroId = card.getData('heroId') as string
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      const stripe = card.getData('stripe') as Phaser.GameObjects.Rectangle
      const selected = cardHeroId === this.selectedHeroId

      if (selected) {
        bg.setFillStyle(0xe2d7bc, 1)
        bg.setStrokeStyle(2, InkColor.cinnabar)
      } else {
        bg.setFillStyle(InkColor.paperPanel, 1)
        bg.setStrokeStyle(1, InkColor.ink, 0.5)
      }
      stripe.setVisible(selected)
    }
  }

  // ==================== 右侧详情面板 ====================

  /**
   * 创建详情面板外壳（仅背景；内容由 updateDetailPanel 填充）
   */
  private createDetailPanelShell(): void {
    this.detailPanel = createPanel(this, HeroListScene.PANEL_X, HeroListScene.PANEL_Y, HeroListScene.PANEL_WIDTH, HeroListScene.PANEL_HEIGHT, {
      fill: InkColor.paperPanel,
      alpha: 0.6,
      stroke: InkColor.ink,
      strokeWidth: 1,
      radius: InkRadius.md
    })
  }

  /**
   * 更新详情面板内容
   */
  private updateDetailPanel(heroId: string): void {
    const hero = this.heroes.get(heroId)
    if (!hero || !this.detailPanel) return
    const panel = this.detailPanel

    // 清除旧内容（保留面板背景：child 0）
    while (panel.length > 1) {
      panel.removeAt(1, true)
    }

    // 游标式分节布局（y 为面板局部坐标）
    let y = HeroListScene.PANEL_PAD
    y = this.renderDetailHeader(panel, hero, y)
    y = this.renderDetailTabs(panel, hero, y)

    if (this.detailTab === 'skills') {
      const evoEndY = this.renderSkillEvolutionSection(panel, hero, y)
      this.renderStatusBreakdownSection(panel, hero, evoEndY)
    } else {
      y = this.renderStats(panel, hero, y)
      y += 14
      y = this.renderStarUpgrade(panel, hero, y)
      y += 14
      y = this.renderEquipment(panel, hero, y)
      y += 14
      this.renderSkills(panel, hero, y)
    }
  }

  /**
   * 详情头部：头像 + 名称/稀有度 + 五行/等级/星级 + 经验条
   */
  private renderDetailHeader(panel: Phaser.GameObjects.Container, hero: Hero, y: number): number {
    // 头像 112×112
    const imageKey = this.getHeroImageKey(hero.id)
    if (this.textures.exists(imageKey)) {
      const avatar = this.add.image(24 + 56, y + 4 + 56, imageKey)
      avatar.setDisplaySize(112, 112)
      panel.add(avatar)
    }

    // 名称 + 稀有度
    const nameText = inkText(this, 160, y + 12, hero.name, {
      size: InkFontSize.xl,
      color: InkText.strong,
      bold: true
    })
    panel.add(nameText)
    panel.add(inkText(this, 160 + nameText.width + 12, y + 12, RarityNames[hero.rarity], {
      size: 15,
      color: INK_RARITY[hero.rarity].text
    }))

    // 五行徽章 + 等级 + 星级
    this.createWuXingBadge(panel, 160, y + 37, hero.wuXing, 22)
    panel.add(inkText(this, 228, y + 48, `Lv.${hero.level}`, {
      size: InkFontSize.md,
      color: InkText.strong
    }))
    panel.add(inkText(this, 300, y + 48, `${'★'.repeat(hero.star)}${'☆'.repeat(5 - hero.star)}`, {
      size: InkFontSize.md,
      color: InkText.gold
    }))

    // 经验
    const expY = y + 86
    panel.add(inkText(this, 160, expY, '经验', { size: InkFontSize.sm, color: InkText.faint }))
    if (hero.level < 60) {
      const progress = getExpProgress(hero.experience, hero.level)
      const expToNext = getExpToNextLevel(hero.level)
      const currentExpInLevel = Math.max(0, Math.floor(hero.experience - getExpRequiredForLevel(hero.level))) // 确保最小为0

      // 进度条背景
      const barBg = this.add.rectangle(400, expY, 400, 12, InkColor.paperDeep)
      barBg.setStrokeStyle(1, InkColor.ink, 0.5)
      panel.add(barBg)

      // 进度条填充（确保最小宽度为0）
      const fillWidth = Math.max(0, 400 * progress)
      const barFill = this.add.rectangle(200 + fillWidth / 2, expY, fillWidth, 8, InkColor.ink, 0.65)
      panel.add(barFill)

      // 进度文字 + 百分比（确保显示合理）
      const percentText = Math.floor(Math.max(0, Math.min(1, progress)) * 100)
      panel.add(inkText(this, 608, expY, `${currentExpInLevel}/${expToNext} · ${percentText}%`, {
        size: InkFontSize.xs,
        color: InkText.faint
      }))
    } else {
      // 顶级
      panel.add(inkText(this, 200, expY, '已达顶级', { size: 14, color: InkText.gold, bold: true }))
    }

    // 绘制水墨五维演武雷达图（右侧区域）
    this.renderRadarChart(panel, hero, 735, y + 54, 40)

    // 头部下分隔墨线
    inkRule(this, panel, 24, y + 124, HeroListScene.CONTENT_WIDTH, 0.35)

    return y + 140
  }

  /**
   * 水墨五维演武雷达图（武/统/魄/敏/谋）
   */
  private renderRadarChart(
    panel: Phaser.GameObjects.Container,
    hero: Hero,
    cx: number,
    cy: number,
    radius: number = 40
  ): void {
    const dimensions = [
      { label: '武', angle: 0 },
      { label: '统', angle: (2 * Math.PI) / 5 },
      { label: '魄', angle: (4 * Math.PI) / 5 },
      { label: '敏', angle: (6 * Math.PI) / 5 },
      { label: '谋', angle: (8 * Math.PI) / 5 }
    ]

    // 根据英雄基础属性与稀有度计算五维归一化值 (0.45 ~ 1.0)
    const effectiveStats = this.getEffectiveStatsWithEquipment(hero)
    const wu = Phaser.Math.Clamp(effectiveStats.attack / 75, 0.45, 1.0)
    const tong = Phaser.Math.Clamp(effectiveStats.attackRange / 220, 0.45, 1.0)
    const min = Phaser.Math.Clamp(effectiveStats.attackSpeed / 1.4, 0.45, 1.0)
    const mou = hero.rarity === 'legendary' ? 0.88 : hero.rarity === 'epic' ? 0.80 : 0.68
    const po = hero.rarity === 'legendary' ? 0.96 : hero.rarity === 'epic' ? 0.85 : 0.72

    const values = [wu, tong, po, min, mou]

    const g = this.add.graphics()

    // 1. 绘制正五边形背景网格（3层）与5条放射轴线
    const levels = [0.35, 0.7, 1.0]
    for (const lvl of levels) {
      g.lineStyle(1, InkColor.ink, lvl === 1.0 ? 0.22 : 0.12)
      g.beginPath()
      for (let i = 0; i < 5; i++) {
        const a = dimensions[i].angle - Math.PI / 2
        const r = radius * lvl
        const px = cx + Math.cos(a) * r
        const py = cy + Math.sin(a) * r
        if (i === 0) g.moveTo(px, py)
        else g.lineTo(px, py)
      }
      g.closePath()
      g.strokePath()
    }

    // 5条放射轴线
    g.lineStyle(1, InkColor.ink, 0.18)
    for (let i = 0; i < 5; i++) {
      const a = dimensions[i].angle - Math.PI / 2
      const px = cx + Math.cos(a) * radius
      const py = cy + Math.sin(a) * radius
      g.beginPath()
      g.moveTo(cx, cy)
      g.lineTo(px, py)
      g.strokePath()
    }

    // 2. 绘制五维数据多边形
    const wuxingStyle = INK_WUXING[hero.wuXing]
    g.fillStyle(wuxingStyle.fill, 0.6)
    g.lineStyle(1.5, wuxingStyle.border, 0.95)
    g.beginPath()
    const points: { x: number; y: number }[] = []
    for (let i = 0; i < 5; i++) {
      const a = dimensions[i].angle - Math.PI / 2
      const r = radius * values[i]
      const px = cx + Math.cos(a) * r
      const py = cy + Math.sin(a) * r
      points.push({ x: px, y: py })
      if (i === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.closePath()
    g.fillPath()
    g.strokePath()

    // 顶点小圆点
    for (const pt of points) {
      g.fillStyle(InkColor.cinnabar, 0.9)
      g.fillCircle(pt.x, pt.y, 2.5)
    }
    panel.add(g)

    // 3. 维度文字标示
    for (let i = 0; i < 5; i++) {
      const a = dimensions[i].angle - Math.PI / 2
      const labelDist = radius + 13
      const lx = cx + Math.cos(a) * labelDist
      const ly = cy + Math.sin(a) * labelDist
      const t = inkText(this, lx, ly, dimensions[i].label, {
        size: 11,
        color: InkText.strong,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      panel.add(t)
    }

    // 标题小标（图表下方居中注记）
    const headerText = inkText(this, cx, cy + radius + 14, '· 五维演武 ·', {
      size: 11,
      color: InkText.faint,
      originX: 0.5,
      originY: 0.5
    })
    panel.add(headerText)
  }

  /**
   * 基础属性：攻击 / 攻速 / 射程（含装备加成）
   */
  private renderStats(panel: Phaser.GameObjects.Container, hero: Hero, y: number): number {
    y += sectionHeader(this, panel, 24, y, '基础属性', HeroListScene.CONTENT_WIDTH)
    const rowY = y + 17

    // 计算属性（含装备加成）
    const effectiveStats = this.getEffectiveStatsWithEquipment(hero)

    // 攻击
    panel.add(inkText(this, 24, rowY, '攻击', { size: 14, color: InkText.faint }))
    const atkText = inkText(this, 88, rowY, `${effectiveStats.attack}`, {
      size: 18,
      color: InkText.strong,
      bold: true
    })
    panel.add(atkText)
    panel.add(inkText(this, 88 + atkText.width + 8, rowY, `（基础 ${hero.baseStats.attack}）`, {
      size: InkFontSize.xs,
      color: InkText.faint
    }))

    // 攻速
    panel.add(inkText(this, 300, rowY, '攻速', { size: 14, color: InkText.faint }))
    panel.add(inkText(this, 364, rowY, `${effectiveStats.attackSpeed.toFixed(1)}/s`, {
      size: 18,
      color: InkText.strong,
      bold: true
    }))

    // 射程
    panel.add(inkText(this, 540, rowY, '射程', { size: 14, color: InkText.faint }))
    panel.add(inkText(this, 604, rowY, `${effectiveStats.attackRange}`, {
      size: 18,
      color: InkText.strong,
      bold: true
    }))

    return y + 34
  }

  /**
   * 星级：碎片进度 + 升星按钮
   */
  private renderStarUpgrade(panel: Phaser.GameObjects.Container, hero: Hero, y: number): number {
    y += sectionHeader(this, panel, 24, y, '星级', HeroListScene.CONTENT_WIDTH)
    const rowY = y + 20

    if (hero.star < 5) {
      const soulStones = this.getSoulStones(hero.id)
      const required = hero.starUpgradeRequirements[hero.star - 1] || 0
      const canUpgrade = soulStones >= required

      // 碎片数量
      panel.add(inkText(this, 24, rowY, `碎片: ${soulStones}/${required}`, {
        size: 14,
        color: canUpgrade ? InkText.green : InkText.faint
      }))

      // 升星按钮
      if (canUpgrade) {
        const upgradeBtn = createInkButton(this, 776, rowY, 96, 28, '升星', {
          fill: InkColor.cinnabar,
          hoverFill: 0xb2362e,
          textColor: InkText.paper,
          fontSize: 14,
          onClick: () => {
            this.showUpgradeConfirmDialog(hero, soulStones, required)
          }
        })
        panel.add(upgradeBtn)
      }
    } else {
      panel.add(inkText(this, 24, rowY, '已满星', { size: 14, color: InkText.gold, bold: true }))
    }

    return y + 42
  }

  /**
   * 装备：武器槽 + 神器槽
   */
  private renderEquipment(panel: Phaser.GameObjects.Container, hero: Hero, y: number): number {
    y += sectionHeader(this, panel, 24, y, '装备', HeroListScene.CONTENT_WIDTH)

    // 获取武将已装备的装备
    const heroEquipment = this.equipmentManager.getHeroEquipment(hero.id)

    // 武器槽
    this.createEquipmentSlot(panel, y + 8, '武器', heroEquipment.weapon, 'weapon', hero.id)
    // 神器槽
    this.createEquipmentSlot(panel, y + 56, '神器', heroEquipment.artifact, 'artifact', hero.id)

    return y + 120
  }

  /**
   * 创建装备槽位
   */
  private createEquipmentSlot(
    panel: Phaser.GameObjects.Container,
    slotTop: number,
    slotName: string,
    equipment: EquipmentInstance | null,
    type: 'weapon' | 'artifact',
    heroId: string
  ): void {
    const centerY = slotTop + 20

    // 槽位背景
    const slotBg = this.add.rectangle(424, centerY, 800, 40, InkColor.paperDeep, 0.5)
    if (equipment) {
      slotBg.setStrokeStyle(1.5, INK_RARITY[equipment.rarity as Rarity].border)
    } else {
      slotBg.setStrokeStyle(1, InkColor.ink, 0.35)
    }
    panel.add(slotBg)

    // 槽位名称
    panel.add(inkText(this, 40, centerY, slotName, { size: InkFontSize.sm, color: InkText.faint }))

    if (equipment) {
      // 已装备：显示装备信息
      const detail = this.equipmentManager.getEquipmentDetail(equipment.instanceId)
      if (detail) {
        // 左缘稀有度色条
        const accent = this.add.rectangle(26, centerY, 4, 32, INK_RARITY[equipment.rarity as Rarity].border)
        panel.add(accent)

        panel.add(inkText(this, 100, centerY, detail.name, {
          size: 15,
          color: InkText.strong,
          bold: true
        }))
        panel.add(inkText(this, 220, centerY, RarityNames[equipment.rarity as Rarity], {
          size: InkFontSize.xs,
          color: INK_RARITY[equipment.rarity as Rarity].text
        }))

        // 神器器灵认主与共鸣状态标签
        if (type === 'artifact') {
          const hero = this.heroes.get(heroId)
          const isExclusive = this.equipmentManager.isExclusiveForHero(equipment.instanceId, heroId, hero?.name)
          const resonance = this.equipmentManager.getHeroResonance(heroId, hero?.name)
          if (isExclusive) {
            let resTag = '【专属·器灵已认主】'
            if (resonance.resonanceType === 'same') resTag = '【专属·同源共鸣】'
            else if (resonance.resonanceType === 'generating') resTag = '【专属·相生滋养】'
            panel.add(inkText(this, 310, centerY, resTag, {
              size: 13,
              color: InkText.cinnabar,
              bold: true
            }))
          } else {
            panel.add(inkText(this, 310, centerY, '【通用装备·器灵沉睡】', {
              size: 12,
              color: InkText.faint
            }))
          }
        }

        // 卸载按钮
        const unequipBtn = createInkButton(this, 780, centerY, 64, 26, '卸载', {
          fill: InkColor.paperDeep,
          hoverFill: 0xc5b795,
          textColor: InkText.cinnabar,
          fontSize: InkFontSize.xs,
          onClick: () => {
            this.unequipEquipment(equipment.instanceId, heroId)
          }
        })
        panel.add(unequipBtn)
      }
    } else {
      // 未装备：显示空槽
      panel.add(inkText(this, 424, centerY, '空槽 · 点击选择装备', {
        size: InkFontSize.sm,
        color: InkText.faint,
        originX: 0.5
      }))

      // 点击选择装备
      slotBg.setInteractive({ useHandCursor: true })
      slotBg.on('pointerover', () => slotBg.setFillStyle(InkColor.paperDeep, 0.8))
      slotBg.on('pointerout', () => slotBg.setFillStyle(InkColor.paperDeep, 0.5))
      slotBg.on('pointerdown', () => {
        this.showEquipmentSelection(type, heroId)
      })
    }
  }

  /**
   * 技能：被动 + 主动（军备修持选项卡视图）
   */
  private renderSkills(panel: Phaser.GameObjects.Container, hero: Hero, y: number): void {
    y += sectionHeader(this, panel, 24, y, '技能概览', HeroListScene.CONTENT_WIDTH)
    let rowY = y + 12

    // 快捷切换至全阶绝学演武路线按钮
    const viewEvoBtn = createInkButton(this, 720, y + 2, 140, 24, '查看技能演武路线 ➔', {
      fill: InkColor.paperDeep,
      hoverFill: 0xc5b795,
      textColor: InkText.cinnabar,
      fontSize: InkFontSize.xs,
      onClick: () => {
        this.detailTab = 'skills'
        this.updateDetailPanel(hero.id)
      }
    })
    panel.add(viewEvoBtn)

    // 被动技能
    const passiveSkill = getSkill(hero.passiveSkillId)
    if (passiveSkill) {
      panel.add(inkText(this, 24, rowY, `【被动】${passiveSkill.name}`, {
        size: 15,
        color: InkText.strong,
        bold: true
      }))
      rowY += 22
      panel.add(inkText(this, 24, rowY, passiveSkill.description, {
        size: InkFontSize.sm,
        color: InkText.faint,
        wrapWidth: 800
      }))
      rowY += 28
    }

    // 主动技能
    const activeSkill = getSkill(hero.activeSkillId)
    if (activeSkill) {
      const cooldownText = activeSkill.cooldown ? ` · 冷却 ${activeSkill.cooldown / 1000}秒` : ''
      panel.add(inkText(this, 24, rowY, `【主动】${activeSkill.name}${cooldownText}`, {
        size: 15,
        color: InkText.strong,
        bold: true
      }))
      rowY += 22
      panel.add(inkText(this, 24, rowY, activeSkill.description, {
        size: InkFontSize.sm,
        color: InkText.faint,
        wrapWidth: 800
      }))
    }
  }

  /**
   * 详情面板选项卡：【绝学演武】与【军备修持】
   */
  private renderDetailTabs(panel: Phaser.GameObjects.Container, hero: Hero, y: number): number {
    const tabY = y + 4
    const isSkills = this.detailTab === 'skills'
    const isEquip = this.detailTab === 'equipment'

    // Tab 1: 【绝学演武】（包含技能演进路线、当前所处境界与五行状态解析）
    const tab1Btn = createInkButton(this, 24 + 65, tabY + 14, 130, 28, '【绝学演武】', {
      fill: isSkills ? InkColor.cinnabar : InkColor.paperDeep,
      hoverFill: isSkills ? 0xb2362e : 0xc5b795,
      textColor: isSkills ? InkText.paper : InkText.strong,
      fontSize: 13,
      onClick: () => {
        if (this.detailTab !== 'skills') {
          this.detailTab = 'skills'
          this.updateDetailPanel(hero.id)
        }
      }
    })
    panel.add(tab1Btn)

    // Tab 2: 【军备修持】（包含基础属性、星级升星与武器神器装备）
    const tab2Btn = createInkButton(this, 166 + 65, tabY + 14, 130, 28, '【军备修持】', {
      fill: isEquip ? InkColor.cinnabar : InkColor.paperDeep,
      hoverFill: isEquip ? 0xb2362e : 0xc5b795,
      textColor: isEquip ? InkText.paper : InkText.strong,
      fontSize: 13,
      onClick: () => {
        if (this.detailTab !== 'equipment') {
          this.detailTab = 'equipment'
          this.updateDetailPanel(hero.id)
        }
      }
    })
    panel.add(tab2Btn)

    // 水墨横线分割
    inkRule(this, panel, 24, tabY + 34, HeroListScene.CONTENT_WIDTH, 0.25)

    return tabY + 42
  }

  /**
   * 渲染绝学演武路线（五阶境界与当前所处位置）
   */
  private renderSkillEvolutionSection(panel: Phaser.GameObjects.Container, hero: Hero, startY: number): number {
    let y = startY
    const config = getHeroSkillEvolution(hero.id)
    const currentStage = Math.max(1, Math.min(5, hero.star))
    const inspectedStage = this.inspectedStage ?? currentStage
    const inspectedNode = config.nodes.find(n => n.stage === inspectedStage) || config.nodes[0]

    // 区域标题
    y += sectionHeader(this, panel, 24, y, '技能演化路线 · 五阶境界', HeroListScene.CONTENT_WIDTH)

    // 演化路线横轴（5 个节点）
    const nodeY = y + 36
    const leftX = 76
    const spanX = 648
    const stepX = spanX / 4

    // 1. 底层轴线（暗淡墨线）
    const trackGraphics = this.add.graphics()
    trackGraphics.lineStyle(2, InkColor.ink, 0.2)
    trackGraphics.lineBetween(leftX, nodeY, leftX + spanX, nodeY)

    // 2. 已解锁高亮轴线（朱砂金线）
    if (hero.star > 1) {
      const activeEndX = leftX + (Math.min(5, hero.star) - 1) * stepX
      trackGraphics.lineStyle(3, InkColor.cinnabar, 0.9)
      trackGraphics.lineBetween(leftX, nodeY, activeEndX, nodeY)
    }
    panel.add(trackGraphics)

    // 3. 渲染 5 个节点
    const romanNumerals = ['壹', '贰', '叁', '肆', '伍']
    for (let i = 0; i < 5; i++) {
      const node = config.nodes[i]
      const stage = node.stage
      const cx = leftX + i * stepX
      const cy = nodeY
      const isCurrent = hero.star === stage
      const isUnlocked = hero.star >= stage
      const isInspected = inspectedStage === stage

      // 当前所处位置：高亮红印标签【当前境界】（上方）
      if (isCurrent) {
        const badgeW = 76
        const badgeH = 18
        const badgeY = cy - 27
        const badgeG = this.add.graphics()
        badgeG.fillStyle(InkColor.cinnabar, 1)
        badgeG.fillRoundedRect(cx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 4)
        panel.add(badgeG)

        // 倒三角小指针指向节点
        const arrowG = this.add.graphics()
        arrowG.fillStyle(InkColor.cinnabar, 1)
        arrowG.beginPath()
        arrowG.moveTo(cx - 4, badgeY + badgeH / 2)
        arrowG.lineTo(cx + 4, badgeY + badgeH / 2)
        arrowG.lineTo(cx, badgeY + badgeH / 2 + 4)
        arrowG.closePath()
        arrowG.fillPath()
        panel.add(arrowG)

        const curText = inkText(this, cx, badgeY, '【当前境界】', {
          size: 10,
          color: '#ffffff',
          bold: true,
          originX: 0.5,
          originY: 0.5
        })
        panel.add(curText)
      }

      // 查看选中的外光环
      if (isInspected) {
        const ringG = this.add.graphics()
        ringG.lineStyle(2, isCurrent ? InkColor.cinnabar : 0xc5a059, 0.9)
        ringG.strokeCircle(cx, cy, 20)
        panel.add(ringG)
      }

      // 节点圆圈
      const circleG = this.add.graphics()
      if (isCurrent) {
        circleG.fillStyle(InkColor.cinnabar, 1)
        circleG.lineStyle(2, 0xffe082, 1)
      } else if (isUnlocked) {
        circleG.fillStyle(InkColor.paperDeep, 1)
        circleG.lineStyle(1.5, InkColor.ink, 0.8)
      } else {
        circleG.fillStyle(InkColor.paperPanel, 0.6)
        circleG.lineStyle(1, InkColor.ink, 0.25)
      }
      circleG.fillCircle(cx, cy, 15)
      circleG.strokeCircle(cx, cy, 15)
      panel.add(circleG)

      // 节点中心文字（壹/贰/叁/肆/伍）
      const numText = inkText(this, cx, cy, romanNumerals[i], {
        size: 12,
        color: isCurrent ? '#ffffff' : isUnlocked ? InkText.strong : InkText.faint,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      panel.add(numText)

      // 节点下方文字：阶位名称
      const nameColor = isCurrent ? InkText.cinnabar : isUnlocked ? InkText.strong : InkText.faint
      const nameText = inkText(this, cx, cy + 22, node.stageName, {
        size: 11,
        color: nameColor,
        bold: isCurrent,
        originX: 0.5
      })
      panel.add(nameText)

      // 突破节点角标（第3阶质变、第5阶极意）
      if (node.isBreakthrough) {
        const btTag = inkText(this, cx, cy + 36, stage === 5 ? '★终极觉醒' : '★机制突破', {
          size: 10,
          color: isUnlocked ? InkText.gold : InkText.faint,
          bold: true,
          originX: 0.5
        })
        panel.add(btTag)
      }

      // 节点交互（点击切换查看该阶详情）
      const hitArea = this.add.circle(cx, cy, 22, 0x000000, 0.001)
      hitArea.setInteractive({ useHandCursor: true })
      hitArea.on('pointerdown', () => {
        this.inspectedStage = stage
        this.updateDetailPanel(hero.id)
      })
      panel.add(hitArea)
    }

    // 4. 当前查看境界的强化说明卡片
    const boxY = nodeY + 50
    const boxW = HeroListScene.CONTENT_WIDTH
    const boxH = 82

    const boxBg = this.add.graphics()
    boxBg.fillStyle(InkColor.paperDeep, 0.6)
    boxBg.fillRoundedRect(24, boxY, boxW, boxH, InkRadius.sm)
    boxBg.lineStyle(1, InkColor.ink, 0.3)
    boxBg.strokeRoundedRect(24, boxY, boxW, boxH, InkRadius.sm)
    panel.add(boxBg)

    // 左侧装饰条
    const stripe = this.add.rectangle(26, boxY + boxH / 2, 4, boxH - 6, inspectedStage <= hero.star ? InkColor.cinnabar : 0x8d8376)
    panel.add(stripe)

    // 标题行：阶段名 + 称号 + 激活状态
    const statusTag = inspectedStage <= hero.star
      ? (inspectedStage === hero.star ? '【★ 当前已激活境界】' : '【✓ 已领悟·战力生效】')
      : `【🔒 需达到 ${inspectedNode.starRequired}★ 解锁】`
    const tagColor = inspectedStage <= hero.star ? (inspectedStage === hero.star ? InkText.cinnabar : InkText.green) : InkText.faint

    panel.add(inkText(this, 38, boxY + 8, `${inspectedNode.stageName} · ${inspectedNode.title}`, {
      size: 13,
      color: InkText.strong,
      bold: true
    }))
    panel.add(inkText(this, 780, boxY + 8, statusTag, {
      size: 12,
      color: tagColor,
      bold: true,
      originX: 1
    }))

    // 主动战法强化说明
    panel.add(inkText(this, 38, boxY + 30, '【主动战法】', {
      size: 12,
      color: InkText.cinnabar,
      bold: true
    }))
    panel.add(inkText(this, 114, boxY + 30, inspectedNode.activeUpgradeDesc, {
      size: 12,
      color: InkText.strong,
      wrapWidth: 680
    }))

    // 心法被动强化说明
    panel.add(inkText(this, 38, boxY + 54, '【心法被动】', {
      size: 12,
      color: '#795548',
      bold: true
    }))
    panel.add(inkText(this, 114, boxY + 54, inspectedNode.passiveUpgradeDesc, {
      size: 12,
      color: InkText.strong,
      wrapWidth: 680
    }))

    return boxY + boxH + 12
  }

  /**
   * 渲染绝学携带的五行状态与触发奥义
   */
  private renderStatusBreakdownSection(panel: Phaser.GameObjects.Container, hero: Hero, startY: number): void {
    let y = startY
    const statusList = getHeroStatusDetails(hero.id)
    if (!statusList || statusList.length === 0) return

    // 校验选中状态 key
    if (!this.selectedStatusKey || !statusList.some(s => s.statusKey === this.selectedStatusKey)) {
      this.selectedStatusKey = statusList[0].statusKey
    }
    const activeStatus = statusList.find(s => s.statusKey === this.selectedStatusKey) || statusList[0]
    const activeElement: WuXing = activeStatus.element || 'wood'

    // 区域标题
    y += sectionHeader(this, panel, 24, y, '技能附带状态与触发机制奥义', HeroListScene.CONTENT_WIDTH)

    // 状态切换胶囊标签栏
    const pillBarY = y + 6
    panel.add(inkText(this, 24, pillBarY + 5, '涉及状态：', {
      size: 12,
      color: InkText.faint,
      bold: true
    }))

    let pillX = 94
    for (const status of statusList) {
      const isSelected = status.statusKey === activeStatus.statusKey
      const element: WuXing = status.element || 'wood'
      const theme = INK_WUXING[element]
      const btnW = 112
      const btnH = 26

      const btn = createInkButton(this, pillX + btnW / 2, pillBarY + btnH / 2, btnW, btnH, status.name, {
        fill: isSelected ? theme.fill : InkColor.paperDeep,
        hoverFill: theme.fill,
        stroke: isSelected ? theme.border : InkColor.ink,
        textColor: isSelected ? theme.text : InkText.strong,
        fontSize: 12,
        onClick: () => {
          this.selectedStatusKey = status.statusKey
          this.updateDetailPanel(hero.id)
        }
      })
      panel.add(btn)
      pillX += btnW + 10
    }

    // 状态详释卡片
    const cardY = pillBarY + 34
    const cardW = HeroListScene.CONTENT_WIDTH
    const cardH = 116

    const cardBg = this.add.graphics()
    cardBg.fillStyle(InkColor.paperDeep, 0.5)
    cardBg.fillRoundedRect(24, cardY, cardW, cardH, InkRadius.sm)
    cardBg.lineStyle(1.5, INK_WUXING[activeElement].border, 0.8)
    cardBg.strokeRoundedRect(24, cardY, cardW, cardH, InkRadius.sm)
    panel.add(cardBg)

    // 状态色条
    const stripeColor = Phaser.Display.Color.HexStringToColor(activeStatus.badgeColor).color
    const stripe = this.add.rectangle(26, cardY + cardH / 2, 4, cardH - 6, stripeColor)
    panel.add(stripe)

    // 头部：状态名称 + 五行类别
    panel.add(inkText(this, 38, cardY + 8, activeStatus.name, {
      size: 14,
      color: InkText.strong,
      bold: true
    }))
    panel.add(inkText(this, 160, cardY + 10, `【${INK_WUXING[activeElement].label}系核心印记】`, {
      size: 11,
      color: INK_WUXING[activeElement].text,
      bold: true
    }))

    // 1. 基础效果
    panel.add(inkText(this, 38, cardY + 30, '【基础威能】', {
      size: 11,
      color: '#3e2723',
      bold: true
    }))
    panel.add(inkText(this, 114, cardY + 30, activeStatus.effectDescription, {
      size: 11,
      color: InkText.strong,
      wrapWidth: 680
    }))

    // 2. 直接触发
    panel.add(inkText(this, 38, cardY + 51, '【如何直接触发】', {
      size: 11,
      color: InkText.cinnabar,
      bold: true
    }))
    panel.add(inkText(this, 134, cardY + 51, activeStatus.triggerDirect, {
      size: 11,
      color: InkText.strong,
      wrapWidth: 660
    }))

    // 3. 相生反应
    panel.add(inkText(this, 38, cardY + 72, '【五行相生连锁】', {
      size: 11,
      color: InkText.green,
      bold: true
    }))
    panel.add(inkText(this, 134, cardY + 72, activeStatus.triggerReaction, {
      size: 11,
      color: InkText.strong,
      wrapWidth: 660
    }))

    // 4. 质变引爆
    panel.add(inkText(this, 38, cardY + 93, '【后续质变引爆】', {
      size: 11,
      color: '#b8860b',
      bold: true
    }))
    panel.add(inkText(this, 134, cardY + 93, activeStatus.subsequentReaction, {
      size: 11,
      color: InkText.strong,
      wrapWidth: 660
    }))
  }

  // ==================== 弹窗 / 对话框 / 提示 ====================

  /**
   * 卸载装备
   */
  private unequipEquipment(instanceId: string, heroId: string): void {
    this.equipmentManager.unequipFromHero(instanceId)
    this.updateDetailPanel(heroId)
    this.showMessage('装备已卸载')
  }

  /**
   * 显示装备选择弹窗
   */
  private showEquipmentSelection(type: 'weapon' | 'artifact', heroId: string): void {
    const unequipped = this.equipmentManager.getUnequippedEquipment().filter(e => e.type === type)

    if (unequipped.length === 0) {
      this.showMessage('没有可用的装备')
      return
    }

    // 创建弹窗
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 全屏淡墨遮罩（挡住穿透点击）
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, InkColor.ink, 0.2)
    overlay.setInteractive()
    overlay.setDepth(InkDepth.overlay)

    // 弹窗面板
    const panelW = 400
    const rowGap = 44
    const panelH = Math.min(96 + unequipped.length * rowGap + 56, 420)
    const popup = createPanel(this, width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, {
      fill: InkColor.paperPanel,
      alpha: 0.98,
      stroke: InkColor.ink,
      strokeWidth: 2,
      radius: InkRadius.md
    })
    popup.setDepth(InkDepth.popup)

    // 标题
    popup.add(inkText(this, panelW / 2, 30, `选择 ${type === 'weapon' ? '武器' : '神器'}`, {
      size: 18,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    }))

    // 装备列表
    const rowsTop = 56
    const hero = this.heroes.get(heroId)
    for (let i = 0; i < unequipped.length; i++) {
      const equip = unequipped[i]
      const detail = this.equipmentManager.getEquipmentDetail(equip.instanceId)
      if (!detail) continue

      const isExclusive = this.equipmentManager.isExclusiveForHero(equip.instanceId, heroId, hero?.name)
      const hasExclusiveConfig = Boolean(detail.exclusiveHeroes && detail.exclusiveHeroes.length > 0)
      const rowY = rowsTop + i * rowGap + 18
      const rarityStyle = INK_RARITY[equip.rarity as Rarity]

      const btnBg = this.add.rectangle(panelW / 2, rowY, 352, 36, rarityStyle.tint, 0.9)
      btnBg.setStrokeStyle(1, isExclusive ? InkColor.cinnabar : rarityStyle.border)
      btnBg.setInteractive({ useHandCursor: true })
      popup.add(btnBg)

      popup.add(inkText(this, 36, rowY, detail.name, { size: 14, color: InkText.ink }))
      popup.add(inkText(this, 140, rowY, RarityNames[equip.rarity as Rarity], {
        size: InkFontSize.xs,
        color: rarityStyle.text
      }))

      // 专属与器灵认主状态标记
      if (isExclusive) {
        popup.add(inkText(this, 195, rowY, '【专属·器灵觉醒】', {
          size: 11,
          color: InkText.cinnabar,
          bold: true
        }))
      } else if (hasExclusiveConfig) {
        popup.add(inkText(this, 195, rowY, '【通用·器灵沉睡】', {
          size: 11,
          color: InkText.faint
        }))
      } else {
        popup.add(inkText(this, 195, rowY, '【通用神兵】', {
          size: 11,
          color: InkText.ink
        }))
      }

      // 属性加成
      const bonuses = detail.bonuses
      let bonusText = ''
      if (bonuses.attack) bonusText += `攻+${bonuses.attack}`
      if (bonuses.attackSpeed) bonusText += ` 速+${bonuses.attackSpeed.toFixed(1)}`
      popup.add(inkText(this, panelW - 12, rowY, bonusText, {
        size: 11,
        color: InkText.faint,
        originX: 1
      }))

      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(rarityStyle.tint, 1)
      })
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(rarityStyle.tint, 0.9)
      })
      btnBg.on('pointerdown', () => {
        this.equipmentManager.equipToHero(equip.instanceId, heroId, hero?.name)
        overlay.destroy()
        popup.destroy()
        this.updateDetailPanel(heroId)
        if (isExclusive) {
          this.showMessage(`器灵认主！武将装备本命神兵【${detail.name}】`)
        } else {
          this.showMessage(`装备成功（已获得基础攻防属性加成）`)
        }
      })
    }

    // 关闭按钮
    const closeBtn = createInkButton(this, panelW / 2, panelH - 32, 96, 30, '关闭', {
      fill: InkColor.paperDeep,
      hoverFill: 0xc5b795,
      textColor: InkText.ink,
      fontSize: 14,
      onClick: () => {
        overlay.destroy()
        popup.destroy()
      }
    })
    popup.add(closeBtn)
  }

  /**
   * 计算含装备加成的属性
   */
  private getEffectiveStatsWithEquipment(hero: Hero): { attack: number; attackSpeed: number; attackRange: number } {
    let attack = Math.floor(hero.baseStats.attack * (1 + (hero.level - 1) * 0.05))
    let attackSpeed = hero.baseStats.attackSpeed
    let attackRange = hero.baseStats.attackRange

    // 应用升星加成（每星+5%攻击力）
    attack = Math.floor(attack * (1 + (hero.star - 1) * 0.05))

    // 应用被动技能加成
    const passiveSkillId = hero.passiveSkillId
    if (passiveSkillId === 'skill_passive_zhangfei') {
      attack = Math.floor(attack * 1.1)
    } else if (passiveSkillId === 'skill_passive_zhaoyun') {
      attackSpeed = attackSpeed * 1.2
    }

    // 应用装备加成
    const heroEquipment = this.equipmentManager.getHeroEquipment(hero.id)

    if (heroEquipment.weapon) {
      const weaponDetail = this.equipmentManager.getEquipmentDetail(heroEquipment.weapon.instanceId)
      if (weaponDetail?.bonuses) {
        attack += weaponDetail.bonuses.attack || 0
        attackSpeed += weaponDetail.bonuses.attackSpeed || 0
        attackRange += weaponDetail.bonuses.attackRange || 0
      }
    }

    if (heroEquipment.artifact) {
      const artifactDetail = this.equipmentManager.getEquipmentDetail(heroEquipment.artifact.instanceId)
      if (artifactDetail?.bonuses) {
        attack += artifactDetail.bonuses.attack || 0
        attackSpeed += artifactDetail.bonuses.attackSpeed || 0
        attackRange += artifactDetail.bonuses.attackRange || 0
      }
    }

    return { attack, attackSpeed, attackRange }
  }

  /**
   * 显示消息提示
   */
  private showMessage(msg: string): void {
    inkToast(this, msg)
  }

  /**
   * 获取武将碎片数量
   */
  private getSoulStones(heroId: string): number {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()

    if (!saveData?.inventory?.soulStones || !Array.isArray(saveData.inventory.soulStones)) return 0

    const stoneData = saveData.inventory.soulStones.find(s => s && s.heroId === heroId)
    return stoneData?.amount || 0
  }

  /**
   * 显示升星确认对话框
   */
  private showUpgradeConfirmDialog(hero: Hero, currentStones: number, required: number): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 全屏淡墨遮罩
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, InkColor.ink, 0.2)
    overlay.setInteractive()
    overlay.setDepth(InkDepth.overlay)

    // 对话框面板（印章红描边）
    const panelW = 400
    const panelH = 220
    const dialog = createPanel(this, width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, {
      fill: InkColor.paperPanel,
      alpha: 0.98,
      stroke: InkColor.cinnabar,
      strokeWidth: 2,
      radius: InkRadius.md
    })
    dialog.setDepth(InkDepth.popup)

    // 标题
    dialog.add(inkText(this, panelW / 2, 36, '升星确认', {
      size: InkFontSize.lg,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    }))

    // 当前星级
    dialog.add(inkText(this, panelW / 2, 76,
      `当前: ${'★'.repeat(hero.star)} → 升星后: ${'★'.repeat(hero.star + 1)}`, {
      size: InkFontSize.md,
      color: InkText.gold,
      originX: 0.5
    }))

    // 消耗信息
    dialog.add(inkText(this, panelW / 2, 108,
      `消耗碎片: ${required} (拥有: ${currentStones})`, {
      size: 14,
      color: InkText.green,
      originX: 0.5
    }))

    // 属性提升预览
    dialog.add(inkText(this, panelW / 2, 134,
      `升星后属性提升: 攻击力+${5 * hero.star}%`, {
      size: InkFontSize.xs,
      color: InkText.faint,
      originX: 0.5
    }))

    const cleanup = () => {
      overlay.destroy()
      dialog.destroy()
    }

    // 确认按钮
    const confirmBtn = createInkButton(this, panelW / 2 - 62, panelH - 40, 112, 32, '确认升星', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb2362e,
      textColor: InkText.paper,
      fontSize: 14,
      onClick: () => {
        cleanup()
        this.upgradeHeroStar(hero.id, required)
      }
    })
    dialog.add(confirmBtn)

    // 取消按钮
    const cancelBtn = createInkButton(this, panelW / 2 + 68, panelH - 40, 96, 32, '取消', {
      fill: InkColor.paperDeep,
      hoverFill: 0xc5b795,
      textColor: InkText.ink,
      fontSize: 14,
      onClick: cleanup
    })
    dialog.add(cancelBtn)
  }

  /**
   * 升星武将
   */
  private upgradeHeroStar(heroId: string, cost: number): void {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()

    if (!saveData || !saveData.inventory || !Array.isArray(saveData.inventory.soulStones)) return

    // 消耗碎片
    const stoneData = saveData.inventory.soulStones.find(s => s && s.heroId === heroId)
    if (stoneData) {
      stoneData.amount -= cost
      if (stoneData.amount <= 0) {
        saveData.inventory.soulStones = saveData.inventory.soulStones.filter(s => s && s.heroId !== heroId)
      }
    }

    // 升星
    if (Array.isArray(saveData.heroes)) {
      const heroData = saveData.heroes.find(h => h && h.id === heroId)
      if (heroData && heroData.star < 5) {
        heroData.star += 1
      }
    }

    // 更新本地武将数据
    const hero = this.heroes.get(heroId)
    if (hero && hero.star < 5) {
      hero.star += 1
    }

    // 保存
    saveManager.saveCurrent()

    // 更新显示
    this.updateDetailPanel(heroId)
    this.showMessage('升星成功！')
    console.log(`武将 ${heroId} 升星到 ${hero?.star} 星`)
  }

  /**
   * 自动存档
   */
  private autoSave(): void {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()

    if (!saveData || !saveData.inventory || !Array.isArray(saveData.heroes)) return

    // 更新武将数据
    for (const [heroId, hero] of this.heroes) {
      const heroData = saveData.heroes.find(h => h.id === heroId)
      if (heroData) {
        heroData.level = hero.level
        heroData.star = hero.star
        heroData.experience = hero.experience
        heroData.isUnlocked = hero.isUnlocked
        heroData.equipment = hero.equipment
      }
    }

    // 更新装备数据
    saveData.inventory.equipment = this.equipmentManager.getOwnedEquipment()
      .map(e => e.equipmentId)

    saveData.inventory.gems = this.equipmentManager.getOwnedGems()

    // 保存
    saveManager.saveCurrent()
    console.log('武将页面退出，已自动存档')
  }

  /**
   * 获取英雄头像图片key
   */
  private getHeroImageKey(heroId: string): string {
    const imageKeyMap: Record<string, string> = {
      'hero_guanyu': 'hero_guanyu',
      'hero_zhangfei': 'hero_zhangfei',
      'hero_zhaoyun': 'hero_zhaoyun',
      'hero_huangzhong': 'hero_huangzhong',
      'hero_machao': 'hero_machao'
    }
    return imageKeyMap[heroId] || 'hero_placeholder'
  }
}
