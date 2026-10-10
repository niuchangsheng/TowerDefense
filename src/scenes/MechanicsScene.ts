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
  getElementMechanicsDetail,
  ElementMechanicsDetail
} from '@/data/mechanics'
import { InteractiveWuxingDiagram } from '@/ui/InteractiveWuxingDiagram'

/**
 * 【乾坤经纬】独立图鉴场景（水墨国风版）
 * 集中展示游戏五行状态、相生反应、五维对位与伤害乘区底层算法。
 */
export default class MechanicsScene extends Phaser.Scene {
  private returnScene: string = 'TitleScene'
  private currentTab: MechanicsTab = 'elemental'
  private selectedElement: WuXing | null = null
  private tabButtons: Phaser.GameObjects.Container[] = []
  private bodyContainer!: Phaser.GameObjects.Container
  private headerContainer!: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'MechanicsScene' })
  }

  init(data?: { returnScene?: string; tab?: MechanicsTab }): void {
    this.returnScene = data?.returnScene || 'TitleScene'
    this.currentTab = data?.tab || 'elemental'
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
   * 四大水墨 Tab
   */
  private createTabs(width: number): void {
    const centerX = width / 2
    const tabY = 120
    const tabW = 210
    const gap = 16
    const totalW = tabW * 4 + gap * 3
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
    this.tabButtons.forEach((btn, index) => {
      const tabDef = MECHANICS_TABS[index]
      const bg = btn.getAt(0) as Phaser.GameObjects.Graphics
      const titleTxt = btn.getAt(2) as Phaser.GameObjects.Text
      const isSelected = this.currentTab === tabDef.key

      bg.clear()
      const tabW = 210
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

    switch (this.currentTab) {
      case 'elemental':
        this.renderElementalContent()
        break
      case 'reaction':
        this.renderReactionContent()
        break
      case 'attributes':
        this.renderAttributesContent()
        break
      case 'damage':
        this.renderDamageContent()
        break
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

    // 宣纸古典画轴底板
    const bg = this.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.96)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8)
    bg.lineStyle(1.8, InkColor.ink, 0.75)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8)
    bg.lineStyle(1, 0xa0782f, 0.45)
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
    footNoteBg.setStrokeStyle(1, 0xa0782f, 0.35)
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

  // ==================== 1. 五行基础状态（可交互双栏版） ====================
  private renderElementalContent(): void {
    const totalW = 1140
    const startY = 0

    // 导读横幅
    const banner = this.createSummaryBanner(
      totalW,
      '◆ 点击左侧五行图中的任意圆圈（金/水/木/火/土），即可切换查看该五行基础状态与双向相生信息 ◆'
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
        // 全量 5 个五行状态卡片
        let currentY = 0
        const itemH = 76
        const gap = 12

        ELEMENT_STATUS_LIST.forEach((item) => {
          const card = this.add.container(0, currentY + itemH / 2)

          const bg = this.add.graphics()
          bg.fillStyle(InkColor.paperPanel, 0.94)
          bg.fillRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 5)
          bg.lineStyle(1.4, item.color, 0.75)
          bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 5)

          // 左侧五行徽章
          bg.fillStyle(item.color, 0.92)
          bg.fillRoundedRect(-cardW / 2 + 14, -22, 44, 44, 4)
          card.add(bg)

          const sealTxt = inkText(this, -cardW / 2 + 36, 0, item.char, {
            size: 22,
            color: '#fdfbf7',
            bold: true,
            originX: 0.5,
            originY: 0.5
          })

          const title = inkText(this, -cardW / 2 + 70, -16, item.name, {
            size: 15,
            color: item.textColor,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const targetTag = inkText(this, -cardW / 2 + 250, -16, `【专克：${item.targetStat}】`, {
            size: 13,
            color: InkText.cinnabar,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const durationTag = inkText(this, cardW / 2 - 16, -16, `附着时长：${item.duration}`, {
            size: 12,
            color: InkText.faint,
            originX: 1,
            originY: 0.5
          })

          const summary = inkText(this, -cardW / 2 + 70, 8, item.summary, {
            size: 12,
            color: InkText.ink,
            originX: 0,
            originY: 0.5
          })

          const detail = inkText(this, -cardW / 2 + 70, 26, item.details.join(' ｜ '), {
            size: 11,
            color: InkText.faint,
            originX: 0,
            originY: 0.5
          })

          // 点击单卡也可以选中该元素
          bg.setInteractive(new Phaser.Geom.Rectangle(-cardW / 2, -itemH / 2, cardW, itemH), Phaser.Geom.Rectangle.Contains)
          bg.on('pointerover', () => {
            this.input.setDefaultCursor('pointer')
            bg.lineStyle(1.8, InkColor.cinnabar, 0.9)
            bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 5)
          })
          bg.on('pointerout', () => {
            this.input.setDefaultCursor('default')
            bg.lineStyle(1.4, item.color, 0.75)
            bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 5)
          })
          bg.on('pointerdown', () => {
            diagramInstance.selectElement(item.element, true)
          })

          card.add([sealTxt, title, targetTag, durationTag, summary, detail])
          rightContainer.add(card)

          currentY += itemH + gap
        })
      } else {
        // 聚焦单五行模式：展示对应状态 + 双向相生状态信息！
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
   * 渲染选定单个五行时的右侧专属详解（对应基础状态 + 双向相生连锁）
   */
  private renderSingleElementDetail(
    parent: Phaser.GameObjects.Container,
    detail: ElementMechanicsDetail,
    cardW: number,
    diagram: InteractiveWuxingDiagram
  ): void {
    // 1. 对应基础状态卡片 (y: 65, h: 130)
    const card1 = this.add.container(0, 65)
    const bg1 = this.add.graphics()
    bg1.fillStyle(InkColor.paperPanel, 0.95)
    bg1.fillRoundedRect(-cardW / 2, -65, cardW, 130, 6)
    bg1.lineStyle(1.6, detail.status.color, 0.85)
    bg1.strokeRoundedRect(-cardW / 2, -65, cardW, 130, 6)

    // 左侧五行法印印章
    bg1.fillStyle(detail.status.color, 0.95)
    bg1.fillRoundedRect(-cardW / 2 + 16, -48, 48, 48, 5)
    card1.add(bg1)

    const sealChar = inkText(this, -cardW / 2 + 40, -24, detail.status.char, {
      size: 24,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const title1 = inkText(this, -cardW / 2 + 76, -42, detail.status.name, {
      size: 16,
      color: detail.status.textColor,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const generalTag = inkText(
      this,
      -cardW / 2 + 250,
      -42,
      `对应神将：${detail.general.name}（${detail.general.title}）`,
      { size: 12.5, color: InkText.strong, bold: true, originX: 0, originY: 0.5 }
    )

    const targetBadge = inkText(this, -cardW / 2 + 76, -20, `【专克：${detail.status.targetStat}】`, {
      size: 12,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const durTag = inkText(
      this,
      -cardW / 2 + 250,
      -20,
      `附着时长：${detail.status.duration} ｜ 神兵：${detail.general.weapon}`,
      { size: 11.5, color: InkText.faint, originX: 0, originY: 0.5 }
    )

    const summary1 = inkText(this, -cardW / 2 + 18, 4, `核心效果：${detail.status.summary}`, {
      size: 12,
      color: InkText.ink,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const detailsStr = detail.status.details.slice(0, 2).join(' ｜ ')
    const details1 = inkText(this, -cardW / 2 + 18, 24, detailsStr, {
      size: 11,
      color: InkText.faint,
      originX: 0,
      originY: 0.5
    })

    const quote1 = inkText(this, -cardW / 2 + 18, 44, `名将真传：“${detail.general.coreQuote}”`, {
      size: 11,
      color: '#8a6230',
      bold: true,
      originX: 0,
      originY: 0.5
    })

    card1.add([sealChar, title1, generalTag, targetBadge, durTag, summary1, details1, quote1])
    parent.add(card1)

    // 2. 对应相生状态信息卡片（双向相生：生我 & 我生） (y: 226, h: 168)
    const card2 = this.add.container(0, 226)
    const bg2 = this.add.graphics()
    bg2.fillStyle(InkColor.paperPanel, 0.95)
    bg2.fillRoundedRect(-cardW / 2, -84, cardW, 168, 6)
    bg2.lineStyle(1.4, 0xa0782f, 0.75)
    bg2.strokeRoundedRect(-cardW / 2, -84, cardW, 168, 6)
    card2.add(bg2)

    const title2 = inkText(
      this,
      -cardW / 2 + 18,
      -68,
      '【对应相生状态信息 · 双向化学连锁】',
      { size: 13, color: '#8a6230', bold: true, originX: 0, originY: 0.5 }
    )
    const sub2 = inkText(
      this,
      cardW / 2 - 18,
      -68,
      '双向无序等效触发 · 1.5s ICD · 相生不抹除底层状态',
      { size: 10.5, color: InkText.faint, originX: 1, originY: 0.5 }
    )
    card2.add([title2, sub2])

    // 双栏对比：生我之合 vs 我生之合
    const halfW = (cardW - 46) / 2
    const subConfigs = [
      {
        x: -cardW / 2 + 16 + halfW / 2,
        title: `【生我之合】${detail.generatedBy.relationLabel} · ${detail.generatedBy.reaction.name}`,
        partner: `搭档神将：${detail.generatedBy.partnerGeneral.name} ➔ ${detail.general.name}`,
        rx: detail.generatedBy.reaction
      },
      {
        x: cardW / 2 - 16 - halfW / 2,
        title: `【我生之合】${detail.generates.relationLabel} · ${detail.generates.reaction.name}`,
        partner: `搭档神将：${detail.general.name} ➔ ${detail.generates.partnerGeneral.name}`,
        rx: detail.generates.reaction
      }
    ]

    subConfigs.forEach((cfg) => {
      const subBg = this.add.graphics()
      subBg.fillStyle(0xf7f3ea, 0.96)
      subBg.fillRoundedRect(cfg.x - halfW / 2, -50, halfW, 122, 5)
      subBg.lineStyle(1.2, cfg.rx.color, 0.75)
      subBg.strokeRoundedRect(cfg.x - halfW / 2, -50, halfW, 122, 5)

      const sTitle = inkText(this, cfg.x - halfW / 2 + 10, -36, cfg.title, {
        size: 11.5,
        color: cfg.rx.textColor,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sPartner = inkText(this, cfg.x - halfW / 2 + 10, -18, cfg.partner, {
        size: 10.5,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sType = inkText(this, cfg.x - halfW / 2 + 10, -2, `质变：${cfg.rx.type}`, {
        size: 10,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sSummary = inkText(this, cfg.x - halfW / 2 + 10, 18, cfg.rx.summary, {
        size: 10,
        color: InkText.ink,
        wrapWidth: halfW - 20,
        originX: 0,
        originY: 0.5
      })

      const sIcd = inkText(this, cfg.x - halfW / 2 + 10, 52, `内置CD：${cfg.rx.icd}`, {
        size: 9.5,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      card2.add([subBg, sTitle, sPartner, sType, sSummary, sIcd])
    })
    parent.add(card2)

    // 3. 空间阵脉与相生共鸣加成 (y: 340, h: 48)
    const card3 = this.add.container(0, 340)
    const bg3 = this.add.graphics()
    bg3.fillStyle(InkColor.paperPanel, 0.92)
    bg3.fillRoundedRect(-cardW / 2, -24, cardW, 48, 5)
    bg3.lineStyle(1.1, InkColor.inkFaint, 0.45)
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
    allBg.lineStyle(1.2, InkColor.ink, 0.6)
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

    // 5 个五行快捷切换胶囊
    const elements: Array<{ key: WuXing; label: string }> = [
      { key: 'metal', label: '金 · 赵云' },
      { key: 'water', label: '水 · 关羽' },
      { key: 'wood',  label: '木 · 黄忠' },
      { key: 'fire',  label: '火 · 马超' },
      { key: 'earth', label: '土 · 张飞' }
    ]

    elements.forEach((el, idx) => {
      const btnX = -cardW / 2 + 120 + idx * 115 + 55
      const pill = this.add.container(btnX, 0)
      const isSel = el.key === detail.element

      const pBg = this.add.graphics()
      pBg.fillStyle(isSel ? InkColor.cinnabar : InkColor.paperPanel, 0.95)
      pBg.fillRoundedRect(-52, -14, 104, 28, 4)
      pBg.lineStyle(1.2, isSel ? InkColor.cinnabar : InkColor.inkFaint, isSel ? 0.9 : 0.5)
      pBg.strokeRoundedRect(-52, -14, 104, 28, 4)
      pill.add(pBg)

      const pTxt = inkText(this, 0, 0, el.label, {
        size: 11,
        color: isSel ? '#ffffff' : InkText.strong,
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

  // ==================== 2. 相生化学反应与空间阵脉（可交互双栏版） ====================
  private renderReactionContent(): void {
    const totalW = 1140
    const startY = 0

    const banner = this.createSummaryBanner(
      totalW,
      '◆ 点击左侧五行图法印，即可聚焦查看该五行参与的双向相生连锁；点击卡片可查看破壁特性 ◆'
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
        // 全量展示 5 大相生反应卡片
        const itemH = 76
        const gap = 12
        let currentY = 0

        REACTION_LIST.forEach((reaction) => {
          const card = this.add.container(0, currentY + itemH / 2)

          const bg = this.add.graphics()
          bg.fillStyle(InkColor.paperPanel, 0.94)
          bg.fillRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 5)
          bg.lineStyle(1.4, reaction.color, 0.8)
          bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 5)

          // 左侧双色双相生圆标
          const e0 = INK_WUXING[reaction.elements[0]]
          const e1 = INK_WUXING[reaction.elements[1]]
          bg.fillStyle(e0.border, 0.95)
          bg.fillCircle(-cardW / 2 + 24, 0, 14)
          bg.fillStyle(e1.border, 0.95)
          bg.fillCircle(-cardW / 2 + 44, 0, 14)
          card.add(bg)

          const e0Txt = inkText(this, -cardW / 2 + 24, 0, e0.label, {
            size: 12,
            color: '#fdfbf7',
            bold: true,
            originX: 0.5,
            originY: 0.5
          })
          const e1Txt = inkText(this, -cardW / 2 + 44, 0, e1.label, {
            size: 12,
            color: '#fdfbf7',
            bold: true,
            originX: 0.5,
            originY: 0.5
          })

          const title = inkText(this, -cardW / 2 + 70, -16, reaction.name, {
            size: 15,
            color: reaction.textColor,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const typeTag = inkText(this, -cardW / 2 + 266, -16, `[${reaction.type}]`, {
            size: 12,
            color: InkText.strong,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const icdTag = inkText(this, cardW / 2 - 16, -16, reaction.icd, {
            size: 12,
            color: InkText.faint,
            originX: 1,
            originY: 0.5
          })

          const summary = inkText(this, -cardW / 2 + 70, 8, reaction.summary, {
            size: 12,
            color: InkText.ink,
            originX: 0,
            originY: 0.5
          })

          const detail = inkText(this, -cardW / 2 + 70, 26, reaction.details.join(' ｜ '), {
            size: 11,
            color: InkText.faint,
            originX: 0,
            originY: 0.5
          })

          bg.setInteractive(new Phaser.Geom.Rectangle(-cardW / 2, -itemH / 2, cardW, itemH), Phaser.Geom.Rectangle.Contains)
          bg.on('pointerover', () => {
            this.input.setDefaultCursor('pointer')
            bg.lineStyle(1.8, InkColor.cinnabar, 0.9)
            bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 5)
          })
          bg.on('pointerout', () => {
            this.input.setDefaultCursor('default')
            bg.lineStyle(1.4, reaction.color, 0.8)
            bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 5)
          })
          bg.on('pointerdown', () => {
            diagramInstance.selectElement(reaction.elements[0], true)
          })

          card.add([e0Txt, e1Txt, title, typeTag, icdTag, summary, detail])
          rightContainer.add(card)

          currentY += itemH + gap
        })
      } else {
        // 聚焦单五行模式的相生状态信息
        const detail = getElementMechanicsDetail(this.selectedElement)
        this.renderSingleElementDetail(rightContainer, detail, cardW, diagramInstance)
      }
    }

    // 左栏：五行相生命脉图
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

  // ==================== 4. 乘区算法与数值铁律（端到端攻击与防御数值） ====================
  private renderDamageContent(): void {
    const cardW = 1080
    const startY = 0

    // 1. 公式华章看板（将具体的攻击力与防御力数值结算完整列出）
    const formulaContainer = this.add.container(0, startY + 28)
    const formulaBg = this.add.graphics()
    formulaBg.fillStyle(InkColor.paperPanel, 0.96)
    formulaBg.fillRoundedRect(-cardW / 2, -28, cardW, 56, 5)
    formulaBg.lineStyle(1.8, InkColor.cinnabar, 0.85)
    formulaBg.strokeRoundedRect(-cardW / 2, -28, cardW, 56, 5)

    const fTitle = inkText(this, 0, -14, '【 端到端完整战斗伤害计算公式 · 严禁私设独立乘区 】', {
      size: 12,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const formulaTxt = inkText(this, 0, 11, DAMAGE_FORMULA_GUIDE.formula, {
      size: 13,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    formulaContainer.add([formulaBg, fTitle, formulaTxt])
    this.bodyContainer.add(formulaContainer)

    // 2. 四大核心支柱卡片（横向 4 联排）
    const compW = (cardW - 36) / 4
    const compH = 54
    const compY = startY + 84
    const startCompX = -cardW / 2 + compW / 2

    DAMAGE_FORMULA_GUIDE.coreComponents.forEach((comp, idx) => {
      const cx = startCompX + idx * (compW + 12)
      const c = this.add.container(cx, compY)

      const cBg = this.add.graphics()
      cBg.fillStyle(InkColor.paperDeep, 0.92)
      cBg.fillRoundedRect(-compW / 2, -compH / 2, compW, compH, 4)
      cBg.lineStyle(1.1, idx === 0 ? 0x2b638f : (idx === 1 ? InkColor.cinnabar : InkColor.ink), 0.6)
      cBg.strokeRoundedRect(-compW / 2, -compH / 2, compW, compH, 4)

      const cTitle = inkText(this, 0, -14, comp.title, {
        size: 12,
        color: idx === 0 ? '#2b638f' : (idx === 1 ? InkText.cinnabar : InkText.strong),
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      const cDesc = inkText(this, 0, 10, comp.content, {
        size: 10,
        color: InkText.ink,
        originX: 0.5,
        originY: 0.5
      }).setWordWrapWidth(compW - 16)

      c.add([cBg, cTitle, cDesc])
      this.bodyContainer.add(c)
    })

    // 3. 伤害分步与防御抵扣结算解构（分两列紧凑卡片，每列 3 张）
    let currentY = compY + 36
    const rowH = 44
    const colW = (cardW - 14) / 2

    DAMAGE_FORMULA_GUIDE.buckets.forEach((bucket, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const bx = col === 0 ? -colW / 2 - 7 : colW / 2 + 7
      const by = currentY + row * (rowH + 6) + rowH / 2

      const card = this.add.container(bx, by)
      const bg = this.add.graphics()
      bg.fillStyle(InkColor.paperPanel, 0.9)
      bg.fillRoundedRect(-colW / 2, -rowH / 2, colW, rowH, 4)
      bg.lineStyle(1, InkColor.ink, 0.3)
      bg.strokeRoundedRect(-colW / 2, -rowH / 2, colW, rowH, 4)

      const bName = inkText(this, -colW / 2 + 12, -9, `◆ ${bucket.name}`, {
        size: 12,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const bDesc = inkText(this, colW / 2 - 12, -9, bucket.desc, {
        size: 11,
        color: InkText.ink,
        originX: 1,
        originY: 0.5
      })

      const bNote = inkText(this, -colW / 2 + 12, 10, `细则: ${bucket.notes}`, {
        size: 10,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      card.add([bg, bName, bDesc, bNote])
      this.bodyContainer.add(card)
    })

    // 4. 实战数值演算看板（以关羽斩击为例）
    const exampleY = currentY + 3 * (rowH + 6) + 38
    const exContainer = this.add.container(0, exampleY)

    const exBg = this.add.graphics()
    exBg.fillStyle(InkColor.paperDeep, 0.96)
    exBg.fillRoundedRect(-cardW / 2, -34, cardW, 68, 5)
    exBg.lineStyle(1.4, 0x8a6230, 0.8)
    exBg.strokeRoundedRect(-cardW / 2, -34, cardW, 68, 5)

    const exTitle = inkText(this, -cardW / 2 + 16, -20, `【${DAMAGE_FORMULA_GUIDE.example.title}】`, {
      size: 12,
      color: '#8a6230',
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const exCond = inkText(this, -cardW / 2 + 16, -4, DAMAGE_FORMULA_GUIDE.example.conditions, {
      size: 11,
      color: InkText.ink,
      originX: 0,
      originY: 0.5
    })

    const exSteps = inkText(
      this,
      -cardW / 2 + 16,
      16,
      `${DAMAGE_FORMULA_GUIDE.example.step1}  ➜  ${DAMAGE_FORMULA_GUIDE.example.step2}  ➜  ${DAMAGE_FORMULA_GUIDE.example.step3}  ➜  ${DAMAGE_FORMULA_GUIDE.example.step4}`,
      {
        size: 11,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      }
    )

    exContainer.add([exBg, exTitle, exCond, exSteps])
    this.bodyContainer.add(exContainer)

    // 5. 底栏两大第一性原理铁律
    const rulesY = exampleY + 68
    const rulesContainer = this.add.container(0, rulesY)
    const ruleBoxW = (cardW - 16) / 2
    const ruleH = 54

    // 铁律 1
    const r1Bg = this.add.graphics()
    r1Bg.fillStyle(InkColor.paperPanel, 0.95)
    r1Bg.fillRoundedRect(-cardW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)
    r1Bg.lineStyle(1.2, InkColor.cinnabar, 0.7)
    r1Bg.strokeRoundedRect(-cardW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)

    const r1Title = inkText(this, -cardW / 2 + 14, -14, '铁律 ① 局外上限 ≤ +50%', {
      size: 12,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const r1Desc = inkText(
      this,
      -cardW / 2 + 14,
      10,
      '武将、神兵、宝石累加基础面板不得超基准 150%，杜绝局外养成数值碾压关卡。',
      { size: 10, color: InkText.ink, originX: 0, originY: 0.5 }
    )
    rulesContainer.add([r1Bg, r1Title, r1Desc])

    // 铁律 2
    const r2Bg = this.add.graphics()
    r2Bg.fillStyle(InkColor.paperPanel, 0.95)
    r2Bg.fillRoundedRect(8, -ruleH / 2, ruleBoxW, ruleH, 4)
    r2Bg.lineStyle(1.2, InkColor.ink, 0.7)
    r2Bg.strokeRoundedRect(8, -ruleH / 2, ruleBoxW, ruleH, 4)

    const r2Title = inkText(this, 22, -14, '铁律 ② 抗性下限保底 ≥ 40%', {
      size: 12,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const r2Desc = inkText(
      this,
      22,
      10,
      '敌军防御、韧性与刚毅无论经何种削弱，最终生效值绝不低于初始 40%，守住战役底线。',
      { size: 10, color: InkText.ink, originX: 0, originY: 0.5 }
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
