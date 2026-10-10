import Phaser from 'phaser'
import { WuXing } from '@/types'
import {
  InkColor,
  InkText,
  drawPaperBackground,
  inkText,
  createPageBackButton,
  INK_FONT,
  INK_WUXING
} from '@/ui/InkTheme'
import { SoundFX } from '@/effects/SoundFX'
import {
  ensureWuxingDiagramTexture,
  WUXING_DIAGRAM_TEXTURE_KEY
} from '@/rendering/WuxingDiagramRenderer'
import {
  MechanicsTab,
  MECHANICS_TABS,
  ELEMENT_STATUS_LIST,
  REACTION_LIST,
  ATTRIBUTE_PAIRS,
  DAMAGE_FORMULA_GUIDE,
  WUXING_PALETTE,
  getElementMechanicsDetail,
  ElementMechanicsDetail
} from '@/data/mechanics'
import { InteractiveWuxingDiagram } from '@/ui/InteractiveWuxingDiagram'

/**
 * 【乾坤经纬】独立图鉴场景（水墨国风版）
 * 集中展示游戏五行生克相生、五维对位与伤害乘区底层算法。
 */
export default class MechanicsScene extends Phaser.Scene {
  private returnScene: string = 'TitleScene'
  private currentTab: MechanicsTab = 'wuxing'
  private selectedElement: WuXing | null = null
  private tabButtons: Phaser.GameObjects.Container[] = []
  private bodyContainer!: Phaser.GameObjects.Container
  private headerContainer!: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'MechanicsScene' })
  }

  init(data?: { returnScene?: string; tab?: string }): void {
    this.returnScene = data?.returnScene || 'TitleScene'
    const tab = data?.tab
    if (tab === 'attributes' || tab === 'damage') {
      this.currentTab = tab
    } else {
      this.currentTab = 'wuxing'
    }
    this.tabButtons = []
  }

  create(): void {
    SoundFX.unlock()
    ensureWuxingDiagramTexture(this)

    // 1. 宣纸水墨底纹
    drawPaperBackground(this)

    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 2. 绘制山水意境轻岚
    this.drawLandscapeAtmosphere(width, height)

    // 3. 顶部卷轴题眉
    this.createHeader(width)

    // 4. 四大选项卡
    this.createTabs(width)

    // 5. 主体内容容器
    this.bodyContainer = this.add.container(width / 2, 170)
    this.bodyContainer.setDepth(10)

    // 6. 渲染初始标签内容
    this.renderCurrentTabContent()

    // 7. 返回按钮（左上角水墨标准返回）
    createPageBackButton(this, () => {
      SoundFX.stamp(0.4)
      this.scene.start(this.returnScene)
    })
  }

  /**
   * 背景淡墨山水点缀
   */
  private drawLandscapeAtmosphere(width: number, height: number): void {
    const g = this.add.graphics()
    g.setDepth(1)

    // 底部极淡山峦
    g.fillStyle(InkColor.ink, 0.04)
    g.beginPath()
    g.moveTo(0, height)
    g.lineTo(0, height - 120)
    g.lineTo(width * 0.25, height - 180)
    g.lineTo(width * 0.55, height - 130)
    g.lineTo(width * 0.82, height - 200)
    g.lineTo(width, height - 140)
    g.lineTo(width, height)
    g.closePath()
    g.fillPath()

    // 沧浪细水纹
    g.lineStyle(1, InkColor.ink, 0.08)
    for (let i = 0; i < 4; i++) {
      const y = height - 40 + i * 8
      g.beginPath()
      g.moveTo(100 + i * 60, y)
      g.lineTo(width - 100 - i * 60, y)
      g.strokePath()
    }
  }

  /**
   * 卷首标题华章
   */
  private createHeader(width: number): void {
    const centerX = width / 2
    this.headerContainer = this.add.container(centerX, 54)
    this.headerContainer.setDepth(10)

    // 古典印章：理
    const sealG = this.add.graphics()
    sealG.fillStyle(InkColor.cinnabar, 0.95)
    sealG.fillRoundedRect(-170, -18, 36, 36, 4)
    sealG.lineStyle(1.5, 0xf6f0e4, 0.8)
    sealG.strokeRoundedRect(-167, -15, 30, 30, 2)
    this.headerContainer.add(sealG)

    const sealText = inkText(this, -152, 0, '理', {
      size: 18,
      color: '#fdfbf7',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    // 主标题
    const titleText = inkText(this, -120, -2, '乾 坤 经 纬', {
      size: 26,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    // 副标题小注
    const subText = inkText(this, 30, 1, '· 阵法相生 · 五维对位 · 伤害乘区 · 底层算法真诠 ·', {
      size: 13,
      color: InkText.faint,
      originX: 0,
      originY: 0.5
    })

    // 左右装饰墨线
    const lineG = this.add.graphics()
    lineG.lineStyle(1, InkColor.ink, 0.25)
    lineG.lineBetween(-440, 26, 440, 26)
    lineG.lineStyle(0.8, 0xa0782f, 0.3)
    lineG.lineBetween(-380, 29, 380, 29)

    this.headerContainer.add([sealText, titleText, subText, lineG])
  }

  /**
   * 水墨 Tab 切换器（【五行相生】与【乾坤经纬】双翼合并）
   */
  private createTabs(width: number): void {
    const centerX = width / 2
    const tabY = 120
    const tabW = 280
    const gap = 24
    const totalW = tabW * MECHANICS_TABS.length + gap * (MECHANICS_TABS.length - 1)
    const startX = centerX - totalW / 2 + tabW / 2

    MECHANICS_TABS.forEach((tabDef, index) => {
      const tabX = startX + index * (tabW + gap)
      const container = this.add.container(tabX, tabY)
      container.setDepth(10)

      const bg = this.add.graphics()
      container.add(bg)

      const renderTab = () => {
        bg.clear()
        const isSelected = this.currentTab === tabDef.key
        const fillColor = isSelected ? InkColor.paperDeep : InkColor.paperPanel
        const strokeColor = isSelected ? InkColor.cinnabar : InkColor.ink

        bg.fillStyle(fillColor, 0.95)
        bg.fillRoundedRect(-tabW / 2, -18, tabW, 36, 4)

        bg.lineStyle(isSelected ? 1.8 : 1.1, strokeColor, isSelected ? 0.9 : 0.45)
        bg.strokeRoundedRect(-tabW / 2, -18, tabW, 36, 4)

        // 徽标小方印
        bg.fillStyle(isSelected ? InkColor.cinnabar : InkColor.ink, isSelected ? 0.95 : 0.35)
        bg.fillRoundedRect(-tabW / 2 + 10, -10, 20, 20, 3)
      }

      renderTab()

      const sealChar = inkText(this, -tabW / 2 + 20, 0, tabDef.seal, {
        size: 12,
        color: '#fdfbf7',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      const titleTxt = inkText(this, -tabW / 2 + 40, 0, tabDef.title, {
        size: 15,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      container.add([sealChar, titleTxt])
      container.setSize(tabW, 36)
      container.setInteractive({ useHandCursor: true })

      container.on('pointerover', () => {
        if (this.currentTab !== tabDef.key) {
          titleTxt.setColor(InkText.cinnabar)
        }
      })
      container.on('pointerout', () => {
        if (this.currentTab !== tabDef.key) {
          titleTxt.setColor(InkText.strong)
        }
      })
      container.on('pointerdown', () => {
        if (this.currentTab === tabDef.key) return
        this.currentTab = tabDef.key
        SoundFX.stamp(0.4)
        this.refreshTabs()
        this.renderCurrentTabContent()
      })

      this.tabButtons.push(container)
    })
  }

  private refreshTabs(): void {
    const tabW = 280
    this.tabButtons.forEach((btn, index) => {
      const tabDef = MECHANICS_TABS[index]
      if (!tabDef) return
      const bg = btn.getAt(0) as Phaser.GameObjects.Graphics
      const titleTxt = btn.getAt(2) as Phaser.GameObjects.Text
      const isSelected = this.currentTab === tabDef.key

      bg.clear()
      const fillColor = isSelected ? InkColor.paperDeep : InkColor.paperPanel
      const strokeColor = isSelected ? InkColor.cinnabar : InkColor.ink

      bg.fillStyle(fillColor, 0.95)
      bg.fillRoundedRect(-tabW / 2, -18, tabW, 36, 4)

      bg.lineStyle(isSelected ? 1.8 : 1.1, strokeColor, isSelected ? 0.9 : 0.45)
      bg.strokeRoundedRect(-tabW / 2, -18, tabW, 36, 4)

      bg.fillStyle(isSelected ? InkColor.cinnabar : InkColor.ink, isSelected ? 0.95 : 0.35)
      bg.fillRoundedRect(-tabW / 2 + 10, -10, 20, 20, 3)

      titleTxt.setColor(isSelected ? InkText.cinnabar : InkText.strong)
    })
  }

  /**
   * 渲染选中的内容
   */
  private renderCurrentTabContent(): void {
    this.bodyContainer.removeAll(true)

    const key = (this.currentTab === 'damage' || (this.currentTab as string) === 'attributes') ? 'damage' : 'wuxing'
    if (key === 'wuxing') {
      this.renderWuxingContent()
    } else {
      this.renderDamageContent()
    }
  }

  /**
   * 绘制可交互五行相生命脉图面板（矢量水墨 + 可点击五行印）
   */
  private createInteractiveDiagramCard(
    x: number,
    y: number,
    w: number,
    h: number,
    onSelect: (elem: WuXing | null) => void
  ): { container: Phaser.GameObjects.Container; diagram: InteractiveWuxingDiagram } {
    const container = this.add.container(x, y)

    // 宣纸古典画轴底板（高质感双层边框）
    const bg = this.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.96)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8)
    bg.lineStyle(2.0, 0x8d5b28, 0.85)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8)
    bg.lineStyle(1.0, 0xd4af37, 0.55)
    bg.strokeRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 6)
    container.add(bg)

    // 顶部印章眉题
    const title = inkText(this, 0, -h / 2 + 22, '【五行相生命脉图】', {
      size: 15,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const sub = inkText(this, 0, -h / 2 + 40, '点击各行法印 · 联动展开状态与双向相生', {
      size: 10.5,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    container.add([title, sub])

    // 可交互五行矢量图
    const diagram = new InteractiveWuxingDiagram(this, 0, 16, {
      radius: 118,
      nodeRadius: 24,
      initialElement: this.selectedElement,
      onSelect
    })
    container.add(diagram)

    // 底部题跋小注
    const footNoteBg = this.add.rectangle(0, h / 2 - 20, w - 16, 26, InkColor.paperDeep, 0.9)
    footNoteBg.setStrokeStyle(1.2, 0xa0782f, 0.45)
    const footNote = inkText(
      this,
      0,
      h / 2 - 20,
      '2.5s附着 · 1.5s ICD · 160px阵脉+35% · 相生不抹除',
      {
        size: 11,
        color: InkText.cinnabar,
        bold: true,
        originX: 0.5,
        originY: 0.5
      }
    )
    container.add([footNoteBg, footNote])

    return { container, diagram }
  }

  // ==================== 1. 五行相生（生克合一完整版） ====================
  private renderWuxingContent(): void {
    const totalW = 1140
    const startY = 0

    // 导读横幅
    const banner = this.createSummaryBanner(
      totalW,
      '◆ 五大基础状态 2.5s 附着 · 双向相生连锁 1.5s ICD · 160px 阵脉威力+35% · 相生绝不抹除底层状态 ◆'
    )
    this.bodyContainer.add(banner)

    // 右栏容器
    const rightContainer = this.add.container(200, startY + 36)
    this.bodyContainer.add(rightContainer)

    const cardW = 720
    let diagramInstance: InteractiveWuxingDiagram

    const renderRight = () => {
      rightContainer.removeAll(true)

      if (!this.selectedElement) {
        // 全览模式：5 个【五行生克一体综合卡片】
        let currentY = 0
        const itemH = 76
        const gap = 10

        ELEMENT_STATUS_LIST.forEach((item) => {
          const pal = WUXING_PALETTE[item.element]
          const detail = getElementMechanicsDetail(item.element)
          const card = this.add.container(0, currentY + itemH / 2)

          const bg = this.add.graphics()
          bg.fillStyle(pal.fill, 0.96)
          bg.fillRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 6)
          bg.lineStyle(1.8, pal.border, 0.9)
          bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 6)
          bg.lineStyle(1.0, 0xffffff, 0.5)
          bg.strokeRoundedRect(-cardW / 2 + 2.5, -itemH / 2 + 2.5, cardW - 5, itemH - 5, 4)

          // 1. 左侧五行法印徽章 (统一尺寸 44x44)
          bg.fillStyle(pal.color, 0.95)
          bg.fillRoundedRect(-cardW / 2 + 14, -22, 44, 44, 5)
          card.add(bg)

          const sealTxt = inkText(this, -cardW / 2 + 36, 0, item.char, {
            size: 22,
            color: '#ffffff',
            bold: true,
            originX: 0.5,
            originY: 0.5
          })

          // 2. 第一行：名称 + 专克属性 + 附着时长 (严格基线对齐 y = -17)
          const title = inkText(this, -cardW / 2 + 70, -17, item.name, {
            size: 15,
            color: pal.hex,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const targetTag = inkText(this, -cardW / 2 + 250, -17, `【专克：${item.targetStat}】`, {
            size: 12.5,
            color: InkText.cinnabar,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const durationTag = inkText(this, cardW / 2 - 16, -17, `附着时长：${item.duration}`, {
            size: 11.5,
            color: InkText.faint,
            originX: 1,
            originY: 0.5
          })

          // 3. 第二行：核心效果摘要 (严格基线对齐 y = 3)
          const summary = inkText(this, -cardW / 2 + 70, 3, item.summary, {
            size: 12,
            color: InkText.strong,
            originX: 0,
            originY: 0.5
          })

          // 4. 第三行：相生指引徽章 (严格基线对齐 y = 23)
          const rxBadge1 = inkText(this, -cardW / 2 + 70, 23, `【生我之合】${detail.generatedBy.relationLabel} · ${detail.generatedBy.reaction.name}`, {
            size: 11,
            color: WUXING_PALETTE[detail.generatedBy.partnerElement].hex,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const rxBadge2 = inkText(this, -cardW / 2 + 370, 23, `【我生之合】${detail.generates.relationLabel} · ${detail.generates.reaction.name}`, {
            size: 11,
            color: WUXING_PALETTE[detail.generates.partnerElement].hex,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          // 悬停交互与点击聚焦
          bg.setInteractive(new Phaser.Geom.Rectangle(-cardW / 2, -itemH / 2, cardW, itemH), Phaser.Geom.Rectangle.Contains)
          bg.on('pointerover', () => {
            this.input.setDefaultCursor('pointer')
            bg.lineStyle(2.2, pal.glow, 1.0)
            bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 6)
          })
          bg.on('pointerout', () => {
            this.input.setDefaultCursor('default')
            bg.lineStyle(1.8, pal.border, 0.9)
            bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 6)
          })
          bg.on('pointerdown', () => {
            diagramInstance.selectElement(item.element, true)
          })

          card.add([sealTxt, title, targetTag, durationTag, summary, rxBadge1, rxBadge2])
          rightContainer.add(card)

          currentY += itemH + gap
        })
      } else {
        // 单五行深度聚焦模式
        const detail = getElementMechanicsDetail(this.selectedElement)
        this.renderSingleElementDetail(rightContainer, detail, cardW, diagramInstance)
      }
    }

    // 左栏：可交互五行图
    const { container: diagramCard, diagram } = this.createInteractiveDiagramCard(
      -365,
      startY + 246,
      390,
      440,
      (elem) => {
        this.selectedElement = elem
        renderRight()
      }
    )
    diagramInstance = diagram
    this.bodyContainer.add(diagramCard)

    renderRight()
  }

  /**
   * 渲染选定单个五行时的右侧专属详解（基础状态 + 双向相生连锁）
   * 包含好看的高对比度边框与底色，完全解耦武将！
   */
  private renderSingleElementDetail(
    parent: Phaser.GameObjects.Container,
    detail: ElementMechanicsDetail,
    cardW: number,
    diagram: InteractiveWuxingDiagram
  ): void {
    const pal = WUXING_PALETTE[detail.element]

    // 1. 对应基础状态卡片 (y: 60, h: 120)
    const card1 = this.add.container(0, 60)
    const bg1 = this.add.graphics()
    bg1.fillStyle(pal.fill, 0.98)
    bg1.fillRoundedRect(-cardW / 2, -60, cardW, 120, 6)
    bg1.lineStyle(2.0, pal.border, 0.95)
    bg1.strokeRoundedRect(-cardW / 2, -60, cardW, 120, 6)
    bg1.lineStyle(1.0, 0xffffff, 0.6)
    bg1.strokeRoundedRect(-cardW / 2 + 2.5, -57.5, cardW - 5, 115, 4)

    // 左侧五行法印印章
    bg1.fillStyle(pal.color, 0.95)
    bg1.fillRoundedRect(-cardW / 2 + 16, -44, 44, 44, 5)
    card1.add(bg1)

    const sealChar = inkText(this, -cardW / 2 + 38, -22, detail.status.char, {
      size: 24,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    // 第一行：标题 + 专克 + 附着时长
    const title1 = inkText(this, -cardW / 2 + 72, -35, detail.status.name, {
      size: 16,
      color: pal.hex,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const targetBadge = inkText(this, -cardW / 2 + 260, -35, `【专克：${detail.status.targetStat}】`, {
      size: 13,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const durTag = inkText(
      this,
      cardW / 2 - 18,
      -35,
      `附着时长：${detail.status.duration}`,
      { size: 12, color: InkText.faint, originX: 1, originY: 0.5 }
    )

    // 第二行：核心效果
    const summary1 = inkText(this, -cardW / 2 + 72, -12, `核心效果：${detail.status.summary}`, {
      size: 12.5,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    // 第三行：详细机制
    const detailsStr = detail.status.details.slice(0, 2).join(' ｜ ')
    const details1 = inkText(this, -cardW / 2 + 18, 14, `机制细则：${detailsStr}`, {
      size: 11,
      color: InkText.wash,
      originX: 0,
      originY: 0.5
    })

    // 第四行：设计铁律
    const ruleText = inkText(this, -cardW / 2 + 18, 36, `铁律遵循：${detail.status.rules.join('  ● ')}`, {
      size: 11,
      color: '#8a6230',
      bold: true,
      originX: 0,
      originY: 0.5
    })

    card1.add([sealChar, title1, targetBadge, durTag, summary1, details1, ruleText])
    parent.add(card1)

    // 2. 对应双向相生连锁卡片（生我之合 & 我生之合） (y: 226, h: 172)
    const card2 = this.add.container(0, 226)
    const bg2 = this.add.graphics()
    bg2.fillStyle(InkColor.paperPanel, 0.95)
    bg2.fillRoundedRect(-cardW / 2, -86, cardW, 172, 6)
    bg2.lineStyle(1.6, 0xa0782f, 0.8)
    bg2.strokeRoundedRect(-cardW / 2, -86, cardW, 172, 6)
    card2.add(bg2)

    const title2 = inkText(
      this,
      -cardW / 2 + 18,
      -70,
      '【对应双向相生化学连锁】',
      { size: 13, color: '#8a6230', bold: true, originX: 0, originY: 0.5 }
    )
    const sub2 = inkText(
      this,
      cardW / 2 - 18,
      -70,
      '双向无序等效 · 1.5s ICD · 相生不抹除底层状态',
      { size: 10.5, color: InkText.faint, originX: 1, originY: 0.5 }
    )
    card2.add([title2, sub2])

    // 双栏对比：生我之合 vs 我生之合（使用规范卡片排版）
    const halfW = (cardW - 46) / 2
    const fromPal = WUXING_PALETTE[detail.generatedBy.partnerElement]
    const toPal = WUXING_PALETTE[detail.generates.partnerElement]

    const subConfigs = [
      {
        x: -cardW / 2 + 16 + halfW / 2,
        title: `【生我之合】${detail.generatedBy.relationLabel} · ${detail.generatedBy.reaction.name}`,
        combo: `触发五行：【${fromPal.name}】 + 【${pal.name}】`,
        pal: fromPal,
        rx: detail.generatedBy.reaction
      },
      {
        x: cardW / 2 - 16 - halfW / 2,
        title: `【我生之合】${detail.generates.relationLabel} · ${detail.generates.reaction.name}`,
        combo: `触发五行：【${pal.name}】 + 【${toPal.name}】`,
        pal: toPal,
        rx: detail.generates.reaction
      }
    ]

    subConfigs.forEach((cfg) => {
      const subBg = this.add.graphics()
      subBg.fillStyle(cfg.pal.fill, 0.98)
      subBg.fillRoundedRect(cfg.x - halfW / 2, -54, halfW, 128, 5)
      subBg.lineStyle(1.5, cfg.pal.border, 0.85)
      subBg.strokeRoundedRect(cfg.x - halfW / 2, -54, halfW, 128, 5)

      // 1. 标题行
      const sTitle = inkText(this, cfg.x - halfW / 2 + 12, -40, cfg.title, {
        size: 12,
        color: cfg.rx.textColor,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      // 2. 触发五行组合
      const sCombo = inkText(this, cfg.x - halfW / 2 + 12, -22, cfg.combo, {
        size: 10.5,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      // 3. 质变特性
      const sType = inkText(this, cfg.x - halfW / 2 + 12, -5, `质变：${cfg.rx.type}`, {
        size: 10.5,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      // 4. 机制概述
      const sSummary = inkText(this, cfg.x - halfW / 2 + 12, 16, cfg.rx.summary, {
        size: 10,
        color: InkText.ink,
        wrapWidth: halfW - 24,
        originX: 0,
        originY: 0.5
      })

      // 5. 内置冷却
      const sIcd = inkText(this, cfg.x - halfW / 2 + 12, 54, `内置CD：${cfg.rx.icd}`, {
        size: 9.5,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      card2.add([subBg, sTitle, sCombo, sType, sSummary, sIcd])
    })
    parent.add(card2)

    // 3. 空间阵脉与相生共鸣加成 (y: 340, h: 48)
    const card3 = this.add.container(0, 340)
    const bg3 = this.add.graphics()
    bg3.fillStyle(InkColor.paperPanel, 0.92)
    bg3.fillRoundedRect(-cardW / 2, -24, cardW, 48, 5)
    bg3.lineStyle(1.2, InkColor.inkFaint, 0.5)
    bg3.strokeRoundedRect(-cardW / 2, -24, cardW, 48, 5)
    card3.add(bg3)

    const rule1 = inkText(
      this,
      -cardW / 2 + 16,
      -10,
      '◆ 160px 相生阵脉：两将距离 ≤ 160px 生成墨线，优先锁定搭档，衰减延缓30%，威力与破铁壁 +35%！',
      { size: 10.5, color: InkText.wash, originX: 0, originY: 0.5 }
    )
    const rule2 = inkText(
      this,
      -cardW / 2 + 16,
      10,
      '◆ 相生共鸣取优：伤害基数取双将最高攻击力 + 另一将 25% 协同攻击，杜绝低攻散兵抢反应降伤！',
      { size: 10.5, color: InkText.wash, originX: 0, originY: 0.5 }
    )
    card3.add([rule1, rule2])
    parent.add(card3)

    // 4. 底部快捷操作栏 (y: 388, h: 32)
    const bar = this.add.container(0, 388)
    // 全部按钮
    const allBtn = this.add.container(-cardW / 2 + 55, 0)
    const allBg = this.add.graphics()
    allBg.fillStyle(InkColor.paperDeep, 0.95)
    allBg.fillRoundedRect(-50, -14, 100, 28, 4)
    allBg.lineStyle(1.4, InkColor.ink, 0.7)
    allBg.strokeRoundedRect(-50, -14, 100, 28, 4)
    allBtn.add(allBg)
    const allTxt = inkText(this, 0, 0, '👁 查看全部', {
      size: 11,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    allBtn.add(allTxt)
    allBg.setInteractive(new Phaser.Geom.Rectangle(-50, -14, 100, 28), Phaser.Geom.Rectangle.Contains)
    allBg.on('pointerdown', () => {
      SoundFX.stamp(0.3)
      diagram.selectElement(null, true)
    })
    bar.add(allBtn)

    // 5 个五行快捷切换胶囊（解耦武将，使用鲜艳五行色彩）
    const elements: Array<{ key: WuXing; label: string; seal: string }> = [
      { key: 'metal', label: '金', seal: '裂' },
      { key: 'water', label: '水', seal: '湿' },
      { key: 'wood',  label: '木', seal: '毒' },
      { key: 'fire',  label: '火', seal: '灼' },
      { key: 'earth', label: '土', seal: '重' }
    ]

    elements.forEach((el, idx) => {
      const btnX = -cardW / 2 + 120 + idx * 115 + 55
      const pill = this.add.container(btnX, 0)
      const elPal = WUXING_PALETTE[el.key]
      const isSel = el.key === detail.element

      const pBg = this.add.graphics()
      pBg.fillStyle(isSel ? elPal.border : elPal.fill, 0.95)
      pBg.fillRoundedRect(-52, -14, 104, 28, 4)
      pBg.lineStyle(1.5, elPal.border, isSel ? 1.0 : 0.7)
      pBg.strokeRoundedRect(-52, -14, 104, 28, 4)
      pill.add(pBg)

      const pTxt = inkText(this, 0, 0, `${el.label} · ${el.seal}`, {
        size: 11,
        color: isSel ? '#ffffff' : elPal.hex,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      pill.add(pTxt)

      pBg.setInteractive(new Phaser.Geom.Rectangle(-52, -14, 104, 28), Phaser.Geom.Rectangle.Contains)
      pBg.on('pointerdown', () => {
        diagram.selectElement(el.key, true)
      })

      bar.add(pill)
    })

    parent.add(bar)
  }

  // ==================== 3. 五维攻防对位 ====================
  private renderAttributesContent(): void {
    const cardW = 1040
    const startY = 0

    const banner = this.createSummaryBanner(
      cardW,
      '◆ 敌我五大基础属性池严格一对一精准对位 · 职能边界严禁模糊重叠 · 破韧破刚方显暴击之威 ◆'
    )
    this.bodyContainer.add(banner)

    const itemH = 76
    const gap = 10
    let currentY = startY + 36

    ATTRIBUTE_PAIRS.forEach((pair) => {
      const card = this.add.container(0, currentY + itemH / 2)

      const bg = this.add.graphics()
      bg.fillStyle(InkColor.paperPanel, 0.94)
      bg.fillRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 5)
      bg.lineStyle(1.2, InkColor.ink, 0.45)
      bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 5)

      // 中轴对抗印章
      bg.fillStyle(InkColor.cinnabar, 0.9)
      bg.fillRoundedRect(-16, -11, 32, 22, 3)
      card.add(bg)

      const vsTxt = inkText(this, 0, 0, 'VS', {
        size: 11,
        color: '#fdfbf7',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      // 我方属性
      const alliedTitle = inkText(this, -cardW / 2 + 20, -16, `我军：${pair.alliedStat}`, {
        size: 15,
        color: '#2b638f',
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const alliedDesc = inkText(this, -cardW / 2 + 20, 9, pair.alliedDesc, {
        size: 12,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      // 敌军属性
      const enemyTitle = inkText(this, 36, -16, `敌军：${pair.enemyStat}`, {
        size: 15,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const enemyDesc = inkText(this, 36, 9, pair.enemyDesc, {
        size: 12,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      const logicText = inkText(this, -cardW / 2 + 20, 27, `破除之道：${pair.counterLogic}`, {
        size: 12,
        color: InkText.strong,
        originX: 0,
        originY: 0.5
      })

      card.add([vsTxt, alliedTitle, alliedDesc, enemyTitle, enemyDesc, logicText])
      this.bodyContainer.add(card)

      currentY += itemH + gap
    })
  }

  // ==================== 4. 乾坤经纬：五维对位与四乘区合并算法 ====================
  private renderDamageContent(): void {
    const cardW = 1040
    const startY = 6

    // 1. 公式华章看板
    const formulaContainer = this.add.container(0, startY + 22)
    const formulaBg = this.add.graphics()
    formulaBg.fillStyle(InkColor.paperPanel, 0.96)
    formulaBg.fillRoundedRect(-cardW / 2, -22, cardW, 44, 4)
    formulaBg.lineStyle(1.8, InkColor.cinnabar, 0.85)
    formulaBg.strokeRoundedRect(-cardW / 2, -22, cardW, 44, 4)

    const fTitle = inkText(this, 0, -10, '【 乾坤经纬 · 攻守对位与四乘区合并总公式 】', {
      size: 12,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const formulaTxt = inkText(this, 0, 10, DAMAGE_FORMULA_GUIDE.formula, {
      size: 12,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    formulaContainer.add([formulaBg, fTitle, formulaTxt])
    this.bodyContainer.add(formulaContainer)

    // 2. 中层左右并列双栏（左栏：五维攻守对位；右栏：四乘区结算与面板对齐）
    const leftW = 506
    const rightW = 518
    const colH = 296
    const leftX = -cardW / 2 + leftW / 2
    const rightX = cardW / 2 - rightW / 2
    const colCenterY = startY + 196

    // ---------- 左栏：五维攻守对位 ----------
    const leftContainer = this.add.container(leftX, colCenterY)
    const leftBg = this.add.graphics()
    leftBg.fillStyle(InkColor.paperPanel, 0.92)
    leftBg.fillRoundedRect(-leftW / 2, -colH / 2, leftW, colH, 5)
    leftBg.lineStyle(1.2, InkColor.ink, 0.55)
    leftBg.strokeRoundedRect(-leftW / 2, -colH / 2, leftW, colH, 5)
    leftContainer.add(leftBg)

    const leftTitle = inkText(this, 0, -colH / 2 + 16, '【 乾坤五维 · 攻守对位与克制链 】', {
      size: 13,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    leftContainer.add(leftTitle)

    const fiveDimensionRows = [
      {
        allied: '攻击力 (attack)',
        enemy: '生命 (hp)',
        tag: '【木·毒】',
        tagColor: '#2e7d32',
        desc: '腐蚀每秒 2.0% 最大生命真伤，叠 3 层，禁疗 50%'
      },
      {
        allied: '攻速频率 (attackSpeed)',
        enemy: '防御 (defense)',
        tag: '【金·裂】',
        tagColor: '#c59b27',
        desc: '撕裂削减 35% 防御护甲；移动受 45% 流血真伤'
      },
      {
        allied: '攻击范围 (range)',
        enemy: '移速 (moveSpeed)',
        tag: '【水·湿】',
        tagColor: '#206095',
        desc: '降低敌军 35% 行军移速（全场唯一基础软控媒介）'
      },
      {
        allied: '暴击几率 (critRate)',
        enemy: '韧性 (tenacity)',
        tag: '【土·重】',
        tagColor: '#8d5b28',
        desc: '削减 25% 韧性（反暴率），大幅解放我方暴击几率'
      },
      {
        allied: '暴击伤害 (critDamage)',
        enemy: '刚毅 (fortitude)',
        tag: '【土·重】',
        tagColor: '#8d5b28',
        desc: '削减 40% 刚毅（反暴伤），受暴击追 20% 负重内震'
      }
    ]

    const itemH = 46
    const rowGap = 6
    const startRowY = -colH / 2 + 54

    fiveDimensionRows.forEach((row, idx) => {
      const ry = startRowY + idx * (itemH + rowGap)
      const rContainer = this.add.container(0, ry)

      const rBg = this.add.graphics()
      rBg.fillStyle(InkColor.paperDeep, 0.9)
      rBg.fillRoundedRect(-leftW / 2 + 10, -itemH / 2, leftW - 20, itemH, 4)
      rBg.lineStyle(0.8, InkColor.ink, 0.25)
      rBg.strokeRoundedRect(-leftW / 2 + 10, -itemH / 2, leftW - 20, itemH, 4)

      const alliedTxt = inkText(this, -leftW / 2 + 20, -11, row.allied, {
        size: 11.5,
        color: '#206095',
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const vsArrow = inkText(this, -leftW / 2 + 180, -11, '⚔ 针对', {
        size: 10,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      const enemyTxt = inkText(this, -leftW / 2 + 235, -11, row.enemy, {
        size: 11.5,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const tagTxt = inkText(this, -leftW / 2 + 20, 11, row.tag, {
        size: 10.5,
        color: row.tagColor,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const descTxt = inkText(this, -leftW / 2 + 84, 11, row.desc, {
        size: 10,
        color: InkText.ink,
        originX: 0,
        originY: 0.5
      })

      rContainer.add([rBg, alliedTxt, vsArrow, enemyTxt, tagTxt, descTxt])
      leftContainer.add(rContainer)
    })
    this.bodyContainer.add(leftContainer)

    // ---------- 右栏：四乘区结算与面板对齐 ----------
    const rightContainer = this.add.container(rightX, colCenterY)
    const rightBg = this.add.graphics()
    rightBg.fillStyle(InkColor.paperPanel, 0.92)
    rightBg.fillRoundedRect(-rightW / 2, -colH / 2, rightW, colH, 5)
    rightBg.lineStyle(1.2, InkColor.cinnabar, 0.55)
    rightBg.strokeRoundedRect(-rightW / 2, -colH / 2, rightW, colH, 5)
    rightContainer.add(rightBg)

    const rightTitle = inkText(this, 0, -colH / 2 + 16, '【 伤害乘区 · 结算规则与面板对齐 】', {
      size: 13,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    rightContainer.add(rightTitle)

    const bucketRows = [
      {
        title: '◆ 基础基数 Base',
        panel: '面板: attack',
        detail: '普攻取 attack；战法 attack×倍率；相生取 max(A,B)+0.25*min(A,B)'
      },
      {
        title: '◆ 攻击与增伤 AtkBoost & DmgInc',
        panel: '加成: attackBoost / dmgInc',
        detail: '攻击加成(装备/军令) 与 增伤(天时+20%/阵脉+35%/锦囊) 区内加算'
      },
      {
        title: '◆ 易伤加成 Vulnerability',
        panel: '加深: vulnerabilitySum',
        detail: 'Boss破壁瘫痪+50%、《五气朝元》每态+18%、受击易伤，区内加算'
      },
      {
        title: '◆ 暴击对抗 CritMultiplier',
        panel: '对冲: crit vs 韧性 / 刚毅',
        detail: '实暴=max(0, 暴率-有效韧性)；暴伤=1+max(0, 暴伤-100%-有效刚毅)'
      },
      {
        title: '◆ 防御抵扣 DefMitigation',
        panel: '减免: defense (底线≥40%)',
        detail: '减免=有效防御/(有效防御+200)；金裂流血/碎冰真伤减免为0直接穿透'
      }
    ]

    bucketRows.forEach((row, idx) => {
      const ry = startRowY + idx * (itemH + rowGap)
      const rContainer = this.add.container(0, ry)

      const rBg = this.add.graphics()
      rBg.fillStyle(InkColor.paperDeep, 0.9)
      rBg.fillRoundedRect(-rightW / 2 + 10, -itemH / 2, rightW - 20, itemH, 4)
      rBg.lineStyle(0.8, InkColor.ink, 0.25)
      rBg.strokeRoundedRect(-rightW / 2 + 10, -itemH / 2, rightW - 20, itemH, 4)

      const tTitle = inkText(this, -rightW / 2 + 18, -11, row.title, {
        size: 11.5,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const tPanel = inkText(this, rightW / 2 - 18, -11, row.panel, {
        size: 10,
        color: '#8d5b28',
        bold: true,
        originX: 1,
        originY: 0.5
      })

      const tDetail = inkText(this, -rightW / 2 + 18, 11, row.detail, {
        size: 10,
        color: InkText.ink,
        originX: 0,
        originY: 0.5
      })

      rContainer.add([rBg, tTitle, tPanel, tDetail])
      rightContainer.add(rContainer)
    })
    this.bodyContainer.add(rightContainer)

    // 3. 底栏两大铁律高光框
    const rulesY = startY + 370
    const rulesContainer = this.add.container(0, rulesY)
    const ruleBoxW = cardW / 2 - 10
    const ruleH = 36

    // 铁律 1: 局外保底
    const r1Bg = this.add.graphics()
    r1Bg.fillStyle(InkColor.paperPanel, 0.95)
    r1Bg.fillRoundedRect(-cardW / 4 - 5 - ruleBoxW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)
    r1Bg.lineStyle(1.1, InkColor.cinnabar, 0.75)
    r1Bg.strokeRoundedRect(-cardW / 4 - 5 - ruleBoxW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)

    const r1Title = inkText(this, -cardW / 4 - 5 - ruleBoxW / 2 + 14, 0, '◆ 铁律 ① 局外上限 ≤ +50%', {
      size: 11,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const r1Desc = inkText(
      this,
      -cardW / 4 - 5 - ruleBoxW / 2 + 176,
      0,
      '局外武将/神兵/宝石累加总增益封顶 +50%，保下限定上限。',
      { size: 9.5, color: InkText.ink, originX: 0, originY: 0.5 }
    )
    rulesContainer.add([r1Bg, r1Title, r1Desc])

    // 铁律 2: 抗性保底
    const r2Bg = this.add.graphics()
    r2Bg.fillStyle(InkColor.paperPanel, 0.95)
    r2Bg.fillRoundedRect(cardW / 4 + 5 - ruleBoxW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)
    r2Bg.lineStyle(1.1, InkColor.ink, 0.75)
    r2Bg.strokeRoundedRect(cardW / 4 + 5 - ruleBoxW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)

    const r2Title = inkText(this, cardW / 4 + 5 - ruleBoxW / 2 + 14, 0, '◆ 铁律 ② 抗性下限 ≥ 40%', {
      size: 11,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const r2Desc = inkText(
      this,
      cardW / 4 + 5 - ruleBoxW / 2 + 176,
      0,
      '防御/韧性/刚毅削减最多 60%，绝不沦为零防木桩。',
      { size: 9.5, color: InkText.ink, originX: 0, originY: 0.5 }
    )
    rulesContainer.add([r2Bg, r2Title, r2Desc])

    this.bodyContainer.add(rulesContainer)
  }

  private createSummaryBanner(cardW: number, text: string): Phaser.GameObjects.Container {
    const container = this.add.container(0, 12)
    const bg = this.add.rectangle(0, 0, cardW, 28, InkColor.paperPanel, 0.7)
    bg.setStrokeStyle(1, InkColor.inkFaint, 0.35)

    const label = inkText(this, 0, 0, text, {
      size: 12,
      color: InkText.faint,
      originX: 0.5,
      originY: 0.5
    })
    container.add([bg, label])
    return container
  }
}
