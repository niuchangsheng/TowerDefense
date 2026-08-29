import Phaser from 'phaser'
import { getSkill } from '@/data/skills'
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
  createInkButton
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
  private static readonly CARD_HEIGHT = 128
  private static readonly CARD_GAP = 16
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

  constructor() {
    super({ key: 'HeroListScene' })
    this.equipmentManager = new EquipmentManager()
  }

  init(): void {
    const saveManager = SaveManager.getInstance()
    this.heroes = saveManager.loadHeroes()
    this.selectedHeroId = null
    this.heroCards = []
    this.detailPanel = null
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
    const L = HeroListScene.ROSTER_X

    const title = inkText(this, L, 40, '武将', {
      size: InkFontSize.title,
      color: InkText.strong,
      bold: true
    })
    // 印章红方块
    this.add.rectangle(L + title.width + 18, 40, 14, 14, InkColor.cinnabar)
    inkText(this, L + title.width + 36, 40, '· 名册', {
      size: 18,
      color: InkText.faint
    })

    inkRule(this, null, L, 68, 1216, 0.4)
  }

  /**
   * 创建返回按钮（右上角）
   */
  private createBackButton(): void {
    createInkButton(this, 1192, 40, 112, 36, '返回', {
      fill: InkColor.paperPanel,
      hoverFill: InkColor.paperDeep,
      textColor: InkText.ink,
      fontSize: InkFontSize.md,
      stroke: InkColor.ink,
      onClick: () => {
        // 自动存档
        this.autoSave()
        this.scene.start('TitleScene')
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

    // 武将头像（96×96，正方形原图无变形）
    const imageKey = this.getHeroImageKey(hero.id)
    if (this.textures.exists(imageKey)) {
      const avatar = this.add.image(16 + 48, 16 + 48, imageKey)
      avatar.setDisplaySize(96, 96)
      card.add(avatar)
    }

    // 名称（20px 粗）
    card.add(inkText(this, 128, 32, hero.name, { size: InkFontSize.lg, color: InkText.strong, bold: true }))
    // 等级（右对齐）
    card.add(inkText(this, 320, 32, `Lv.${hero.level}`, { size: InkFontSize.xs, color: InkText.faint, originX: 1 }))
    // 稀有度
    card.add(inkText(this, 128, 60, RarityNames[hero.rarity], { size: InkFontSize.sm, color: INK_RARITY[hero.rarity].text }))
    // 五行徽章
    this.createWuXingBadge(card, 128, 82, hero.wuXing, 24)

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
    y = this.renderStats(panel, hero, y)
    y += 16
    y = this.renderStarUpgrade(panel, hero, y)
    y += 16
    y = this.renderEquipment(panel, hero, y)
    y += 16
    this.renderSkills(panel, hero, y)
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

    // 头部下分隔墨线
    inkRule(this, panel, 24, y + 124, HeroListScene.CONTENT_WIDTH, 0.35)

    return y + 140
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
   * 技能：被动 + 主动
   */
  private renderSkills(panel: Phaser.GameObjects.Container, hero: Hero, y: number): void {
    y += sectionHeader(this, panel, 24, y, '技能', HeroListScene.CONTENT_WIDTH)
    let rowY = y + 12

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
    for (let i = 0; i < unequipped.length; i++) {
      const equip = unequipped[i]
      const detail = this.equipmentManager.getEquipmentDetail(equip.instanceId)
      if (!detail) continue

      const rowY = rowsTop + i * rowGap + 18
      const rarityStyle = INK_RARITY[equip.rarity as Rarity]

      const btnBg = this.add.rectangle(panelW / 2, rowY, 352, 36, rarityStyle.tint, 0.9)
      btnBg.setStrokeStyle(1, rarityStyle.border)
      btnBg.setInteractive({ useHandCursor: true })
      popup.add(btnBg)

      popup.add(inkText(this, 36, rowY, detail.name, { size: 14, color: InkText.ink }))
      popup.add(inkText(this, 180, rowY, RarityNames[equip.rarity as Rarity], {
        size: InkFontSize.xs,
        color: rarityStyle.text
      }))

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

      btnBg.on('pointerover', () => btnBg.setFillStyle(rarityStyle.tint, 1))
      btnBg.on('pointerout', () => btnBg.setFillStyle(rarityStyle.tint, 0.9))
      btnBg.on('pointerdown', () => {
        this.equipmentManager.equipToHero(equip.instanceId, heroId)
        overlay.destroy()
        popup.destroy()
        this.updateDetailPanel(heroId)
        this.showMessage('装备成功')
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
    const width = this.cameras.main.width

    const toast = this.add.container(width / 2, 626)
    toast.setDepth(InkDepth.toast)

    const text = inkText(this, 0, 0, msg, {
      size: InkFontSize.md,
      color: InkText.paper,
      originX: 0.5
    })
    const padX = 12
    const padY = 6
    const w = text.width + padX * 2
    const h = text.height + padY * 2
    const bg = this.add.graphics()
    bg.fillStyle(InkColor.ink, 0.92)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, InkRadius.sm)
    toast.add([bg, text])

    this.time.delayedCall(1500, () => toast.destroy())
  }

  /**
   * 获取武将碎片数量
   */
  private getSoulStones(heroId: string): number {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()

    if (!saveData) return 0

    const stoneData = saveData.inventory.soulStones.find(s => s.heroId === heroId)
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

    if (!saveData) return

    // 消耗碎片
    const stoneData = saveData.inventory.soulStones.find(s => s.heroId === heroId)
    if (stoneData) {
      stoneData.amount -= cost
      if (stoneData.amount <= 0) {
        saveData.inventory.soulStones = saveData.inventory.soulStones.filter(s => s.heroId !== heroId)
      }
    }

    // 升星
    const heroData = saveData.heroes.find(h => h.id === heroId)
    if (heroData && heroData.star < 5) {
      heroData.star += 1
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

    if (!saveData) return

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
      'hero_zhaoyun': 'hero_zhaoyun'
    }
    return imageKeyMap[heroId] || 'hero_placeholder'
  }
}
