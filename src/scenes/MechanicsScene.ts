import Phaser from 'phaser'
import { WuXing } from '@/types'
import {
  InkColor,
  InkText,
  drawPaperBackground,
  inkText,
  createPageBackButton
} from '@/ui/InkTheme'
import { SoundFX } from '@/effects/SoundFX'
import {
  ensureWuxingDiagramTexture
} from '@/rendering/WuxingDiagramRenderer'
import {
  MechanicsTab,
  MECHANICS_TABS,
  ELEMENT_STATUS_LIST,
  DAMAGE_FORMULA_GUIDE,
  DAMAGE_FORMULA_STEPS,
  DAMAGE_PIPELINE_CARDS,
  WUXING_PALETTE,
  getElementMechanicsDetail,
  ElementMechanicsDetail
} from '@/data/mechanics'
import { InteractiveWuxingDiagram } from '@/ui/InteractiveWuxingDiagram'

/**
 * 【乾坤经纬】独立图鉴场景（水墨国风版）
 * 包含双主翼：
 * 1. 【五行相生】(wuxing)：纯粹五行状态与双向相生连锁体系（左矢量图 + 右综合/聚焦卡片）
 * 2. 【乾坤算法】(damage)：公式总览 + 四大乘区卡片网格 + 抵扣与终局卡片 + 战法实战推导演算 + 底层铁律
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
    if (data?.tab === 'damage' || data?.tab === 'attributes') {
      this.currentTab = 'damage'
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

    // 4. 双翼选项卡（【五行相生】与【乾坤算法】）
    this.createTabs(width)

    // 5. 主体内容容器
    this.bodyContainer = this.add.container(width / 2, 168)
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
    sealG.fillRoundedRect(-180, -18, 36, 36, 4)
    sealG.lineStyle(1.5, 0xf6f0e4, 0.8)
    sealG.strokeRoundedRect(-177, -15, 30, 30, 2)
    this.headerContainer.add(sealG)

    const sealText = inkText(this, -162, 0, '理', {
      size: 18,
      color: '#fdfbf7',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    // 主标题
    const titleText = inkText(this, -130, -2, '乾 坤 经 纬', {
      size: 26,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    // 副标题小注
    const subText = inkText(this, 10, 1, '· 五行相生化学连锁 · 四独立伤害乘区 · 7步结算面板映射 ·', {
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
   * 水墨 Tab 切换器（【五行相生】与【乾坤算法】）
   */
  private createTabs(width: number): void {
    const centerX = width / 2
    const tabY = 120
    const tabW = 340
    const gap = 32
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
        size: 11,
        color: '#ffffff',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      const titleTxt = inkText(this, -tabW / 2 + 38, -2, tabDef.title, {
        size: 14,
        color: this.currentTab === tabDef.key ? InkText.cinnabar : InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const subTxt = inkText(this, -tabW / 2 + 106, 0, tabDef.subtitle, {
        size: 9.5,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      container.add([sealChar, titleTxt, subTxt])

      // 交互
      const hitArea = new Phaser.Geom.Rectangle(-tabW / 2, -18, tabW, 36)
      bg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      bg.on('pointerover', () => {
        if (this.currentTab !== tabDef.key) {
          bg.lineStyle(1.4, InkColor.cinnabar, 0.7)
          bg.strokeRoundedRect(-tabW / 2, -18, tabW, 36, 4)
        }
      })
      bg.on('pointerout', () => {
        if (this.currentTab !== tabDef.key) {
          renderTab()
        }
      })
      bg.on('pointerdown', () => {
        if (this.currentTab === tabDef.key) return
        SoundFX.stamp(0.3)
        this.currentTab = tabDef.key
        this.selectedElement = null
        this.refreshTabs()
        this.renderCurrentTabContent()
      })

      this.tabButtons.push(container)
    })
  }

  private refreshTabs(): void {
    const tabW = 340
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

  private renderCurrentTabContent(): void {
    this.bodyContainer.removeAll(true)

    if (this.currentTab === 'wuxing') {
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

          // 左侧五行徽章
          bg.fillStyle(pal.color, 0.95)
          bg.fillRoundedRect(-cardW / 2 + 12, -22, 44, 44, 5)
          card.add(bg)

          const sealTxt = inkText(this, -cardW / 2 + 34, 0, item.char, {
            size: 22,
            color: '#ffffff',
            bold: true,
            originX: 0.5,
            originY: 0.5
          })

          // 标题与专克标签
          const title = inkText(this, -cardW / 2 + 68, -18, item.name, {
            size: 15,
            color: pal.hex,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const targetTag = inkText(this, -cardW / 2 + 250, -18, `【专克：${item.targetStat}】`, {
            size: 13,
            color: InkText.cinnabar,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const durationTag = inkText(this, cardW / 2 - 16, -18, `附着时长：${item.duration}`, {
            size: 11.5,
            color: InkText.faint,
            originX: 1,
            originY: 0.5
          })

          const summary = inkText(this, -cardW / 2 + 68, 4, item.summary, {
            size: 12,
            color: InkText.ink,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          // 双向相生指引徽章
          const rxBadge1 = inkText(this, -cardW / 2 + 68, 24, `【生我】${detail.generatedBy.relationLabel} · ${detail.generatedBy.reaction.name}`, {
            size: 11,
            color: WUXING_PALETTE[detail.generatedBy.partnerElement].hex,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const rxBadge2 = inkText(this, -cardW / 2 + 370, 24, `【我生】${detail.generates.relationLabel} · ${detail.generates.reaction.name}`, {
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

    const summary1 = inkText(this, -cardW / 2 + 72, -12, `核心效果：${detail.status.summary}`, {
      size: 12.5,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const detailsStr = detail.status.details.slice(0, 2).join(' ｜ ')
    const details1 = inkText(this, -cardW / 2 + 18, 14, `机制细则：${detailsStr}`, {
      size: 11,
      color: InkText.wash,
      originX: 0,
      originY: 0.5
    })

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

    // 双栏对比：生我之合 vs 我生之合
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

      const sTitle = inkText(this, cfg.x - halfW / 2 + 12, -40, cfg.title, {
        size: 12,
        color: cfg.rx.textColor,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sCombo = inkText(this, cfg.x - halfW / 2 + 12, -22, cfg.combo, {
        size: 10.5,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sType = inkText(this, cfg.x - halfW / 2 + 12, -5, `质变：${cfg.rx.type}`, {
        size: 10.5,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sSummary = inkText(this, cfg.x - halfW / 2 + 12, 16, cfg.rx.summary, {
        size: 10,
        color: InkText.ink,
        wrapWidth: halfW - 24,
        originX: 0,
        originY: 0.5
      })

      const sIcd = inkText(this, cfg.x - halfW / 2 + 12, 54, `内置CD：${cfg.rx.icd}`, {
        size: 9.5,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      card2.add([subBg, sTitle, sCombo, sType, sSummary, sIcd])
    })

    parent.add(card2)

    // 3. 底部规则要点 (y: 338, h: 48)
    const card3 = this.add.container(0, 338)
    const bg3 = this.add.graphics()
    bg3.fillStyle(InkColor.paperPanel, 0.92)
    bg3.fillRoundedRect(-cardW / 2, -24, cardW, 48, 4)
    bg3.lineStyle(1.2, InkColor.ink, 0.4)
    bg3.strokeRoundedRect(-cardW / 2, -24, cardW, 48, 4)
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

  // ==================== 2. 乾坤算法（全新重铸清晰展示版：流水线卡片矩阵） ====================
  private renderDamageContent(): void {
    const cardW = 1140
    const startY = 0

    // 1. 顶部总公式流水线横幅
    const formulaContainer = this.add.container(0, startY + 20)
    const formulaBg = this.add.graphics()
    formulaBg.fillStyle(InkColor.paperPanel, 0.98)
    formulaBg.fillRoundedRect(-cardW / 2, -20, cardW, 40, 4)
    formulaBg.lineStyle(1.8, InkColor.cinnabar, 0.85)
    formulaBg.strokeRoundedRect(-cardW / 2, -20, cardW, 40, 4)

    const fSeal = inkText(this, -cardW / 2 + 16, 0, '【总公式】', {
      size: 13,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const formulaTxt = inkText(
      this,
      -cardW / 2 + 92,
      0,
      '最终伤害 = [① 基础基数] × [② 攻击乘区] × [③ 增伤乘区] × [④ 易伤乘区] × [⑤ 暴击对抗] × [⑥ 护甲折算]',
      {
        size: 12.5,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      }
    )

    const fNotice = inkText(this, cardW / 2 - 16, 0, '六步严格乘算 · 真伤直接跳过护甲', {
      size: 11,
      color: InkText.faint,
      originX: 1,
      originY: 0.5
    })

    formulaContainer.add([formulaBg, fSeal, formulaTxt, fNotice])
    this.bodyContainer.add(formulaContainer)

    // 2. 中层：6 大核心结算因子卡片（3 列 × 2 行 工整流水线网格）
    const gridY = startY + 48
    const gapX = 14
    const gapY = 10
    const colW = (cardW - gapX * 2) / 3
    const cellH = 124

    DAMAGE_PIPELINE_CARDS.forEach((card, idx) => {
      const col = idx % 3
      const row = Math.floor(idx / 3)
      const cx = -cardW / 2 + colW / 2 + col * (colW + gapX)
      const cy = gridY + cellH / 2 + row * (cellH + gapY)
      const cell = this.add.container(cx, cy)

      // 卡片底板
      const bg = this.add.graphics()
      bg.fillStyle(InkColor.paperPanel, 0.96)
      bg.fillRoundedRect(-colW / 2, -cellH / 2, colW, cellH, 5)
      bg.lineStyle(1.5, card.color, 0.85)
      bg.strokeRoundedRect(-colW / 2, -cellH / 2, colW, cellH, 5)
      cell.add(bg)

      // 标头行：阶段印章 + 因子标题 + 对应面板
      const badge = this.add.graphics()
      badge.fillStyle(card.color, 0.95)
      badge.fillRoundedRect(-colW / 2 + 10, -cellH / 2 + 8, 76, 20, 3)
      cell.add(badge)

      const badgeTxt = inkText(this, -colW / 2 + 48, -cellH / 2 + 18, card.stepBadge, {
        size: 10.5,
        color: '#ffffff',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      const titleTxt = inkText(this, -colW / 2 + 92, -cellH / 2 + 18, card.title, {
        size: 12.5,
        color: card.textColor,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const panelTxt = inkText(this, colW / 2 - 10, -cellH / 2 + 18, card.panelLabel, {
        size: 10,
        color: InkText.faint,
        originX: 1,
        originY: 0.5
      })

      // 公式槽
      const fBox = this.add.graphics()
      fBox.fillStyle(InkColor.paperDeep, 0.9)
      fBox.fillRoundedRect(-colW / 2 + 10, -cellH / 2 + 33, colW - 20, 22, 3)
      cell.add(fBox)

      const formTxt = inkText(this, -colW / 2 + 16, -cellH / 2 + 44, `● 算法: ${card.formula}`, {
        size: 10.5,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      // 极简结算要点（不废话，点列短句）
      const p1 = inkText(this, -colW / 2 + 12, -cellH / 2 + 68, card.points[0], {
        size: 9.5,
        color: InkText.ink,
        originX: 0,
        originY: 0.5
      })

      const p2 = inkText(this, -colW / 2 + 12, -cellH / 2 + 88, card.points[1], {
        size: 9.5,
        color: InkText.wash,
        originX: 0,
        originY: 0.5
      })

      cell.add([badgeTxt, titleTxt, panelTxt, formTxt, p1, p2])
      this.bodyContainer.add(cell)
    })

    // 3. 实战数值推演横向展示框
    const exampleY = gridY + cellH * 2 + gapY + 12
    const exH = 48
    const exContainer = this.add.container(0, exampleY + exH / 2)

    const exBg = this.add.graphics()
    exBg.fillStyle(InkColor.paperPanel, 0.96)
    exBg.fillRoundedRect(-cardW / 2, -exH / 2, cardW, exH, 5)
    exBg.lineStyle(1.4, 0x9e2b25, 0.75)
    exBg.strokeRoundedRect(-cardW / 2, -exH / 2, cardW, exH, 5)
    exContainer.add(exBg)

    const exBadge = this.add.graphics()
    exBadge.fillStyle(0x9e2b25, 0.95)
    exBadge.fillRoundedRect(-cardW / 2 + 10, -exH / 2 + 8, 80, 32, 3)
    exContainer.add(exBadge)

    const exBadgeTxt = inkText(this, -cardW / 2 + 50, 0, '【实战演练】\n数值推导', {
      size: 10,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const exLine1 = inkText(
      this,
      -cardW / 2 + 100,
      -10,
      '关羽战法斩击：180 (①基数) × 1.20 (②攻击+20%) × 1.35 (③阵脉+35%) × 1.50 (④瘫痪+50%) × 1.50 (⑤暴伤+50%) = 656.1 原始伤害',
      {
        size: 10,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      }
    )

    const exLine2 = inkText(
      this,
      -cardW / 2 + 100,
      10,
      '破甲与减免联动：未破甲(防100, 减免33.3%) → 437 落地伤 ｜ 金·裂破甲35%(防降至65, 减免降至24.5%) → 495 伤 (+13.3%) ｜ 真伤(减免0%) → 656 直穿！',
      {
        size: 9.5,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      }
    )

    exContainer.add([exBadgeTxt, exLine1, exLine2])
    this.bodyContainer.add(exContainer)

    // 4. 底栏：两大核心数值铁律
    const rulesY = exampleY + exH + 10
    const rulesContainer = this.add.container(0, rulesY)
    const ruleBoxW = cardW / 2 - 8
    const ruleH = 30

    // 铁律 1: 局外保底
    const r1Bg = this.add.graphics()
    r1Bg.fillStyle(InkColor.paperPanel, 0.96)
    r1Bg.fillRoundedRect(-cardW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)
    r1Bg.lineStyle(1.2, InkColor.cinnabar, 0.8)
    r1Bg.strokeRoundedRect(-cardW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)

    const r1Txt = inkText(this, -cardW / 2 + 14, 0, '◆ 铁律 ① 局外上限 ≤ +50%：武将星级/神兵/宝石累加总增益封顶 +50%，保下限定上限', {
      size: 10,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    rulesContainer.add([r1Bg, r1Txt])

    // 铁律 2: 抗性保底
    const r2Bg = this.add.graphics()
    r2Bg.fillStyle(InkColor.paperPanel, 0.96)
    r2Bg.fillRoundedRect(-cardW / 2 + ruleBoxW + 16, -ruleH / 2, ruleBoxW, ruleH, 4)
    r2Bg.lineStyle(1.2, InkColor.ink, 0.8)
    r2Bg.strokeRoundedRect(-cardW / 2 + ruleBoxW + 16, -ruleH / 2, ruleBoxW, ruleH, 4)

    const r2Txt = inkText(this, -cardW / 2 + ruleBoxW + 30, 0, '◆ 铁律 ② 敌方抗性保底 ≥ 40%：防御/韧性/刚毅削减最终生效值不得低于初始值 40%，严禁木桩', {
      size: 10,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    rulesContainer.add([r2Bg, r2Txt])

    this.bodyContainer.add(rulesContainer)
  }

  private createSummaryBanner(cardW: number, text: string): Phaser.GameObjects.Container {
    const container = this.add.container(0, 12)
    const bg = this.add.rectangle(0, 0, cardW, 28, InkColor.paperPanel, 0.85)
    bg.setStrokeStyle(1.2, InkColor.inkFaint, 0.45)
    const txt = inkText(this, 0, 0, text, {
      size: 11.5,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    container.add([bg, txt])
    return container
  }
}
