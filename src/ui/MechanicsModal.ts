import Phaser from 'phaser'
import { WuXing } from '@/types'
import {
  InkColor,
  InkText,
  inkText,
  createInkButton,
  InkDepth,
  INK_FONT,
  INK_WUXING
} from './InkTheme'
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
import { InteractiveWuxingDiagram } from './InteractiveWuxingDiagram'

/**
 * 【乾坤经纬】底层机制速查弹窗
 * 可在战斗中直接呼出（自动拦截交互，查阅后一键闭卷返回），也可在独立场景复用。
 */
export class MechanicsModal extends Phaser.GameObjects.Container {
  private currentTab: MechanicsTab = 'wuxing'
  private selectedElement: WuXing | null = null
  private onCloseCallback?: () => void
  private onOpenSceneCallback?: () => void
  private tabButtons: Phaser.GameObjects.Container[] = []
  private contentContainer!: Phaser.GameObjects.Container
  private escKey?: Phaser.Input.Keyboard.Key

  private readonly panelW = 960
  private readonly panelH = 620
  private readonly contentW = 908
  private readonly contentH = 430

  constructor(
    scene: Phaser.Scene,
    initialTab: MechanicsTab = 'wuxing',
    onClose?: () => void,
    onOpenScene?: () => void
  ) {
    const width = scene.cameras.main.width
    const height = scene.cameras.main.height

    super(scene, 0, 0)
    ensureWuxingDiagramTexture(scene)
    this.currentTab = initialTab
    this.onCloseCallback = onClose
    this.onOpenSceneCallback = onOpenScene
    this.setDepth(InkDepth.popup + 10)

    // 1. 半透明水墨宣纸遮罩
    const overlay = scene.add.rectangle(0, 0, width, height, 0x141210, 0.78)
    overlay.setOrigin(0, 0)
    overlay.setInteractive()
    overlay.on('pointerdown', () => this.close())
    this.add(overlay)

    // 2. 卷轴面板底衬
    const panelX = width / 2
    const panelY = height / 2
    const panelTop = panelY - this.panelH / 2
    const panelBottom = panelY + this.panelH / 2

    const panelBg = scene.add.rectangle(panelX, panelY, this.panelW, this.panelH, InkColor.paper, 0.99)
    panelBg.setStrokeStyle(2.5, InkColor.inkStrong)
    panelBg.setInteractive()
    this.add(panelBg)

    // 宣纸双线框与四角回纹
    const innerBorder = scene.add.rectangle(panelX, panelY, this.panelW - 14, this.panelH - 14)
    innerBorder.setStrokeStyle(1, InkColor.inkFaint, 0.35)
    this.add(innerBorder)

    // 四角折角装饰
    const cornersG = scene.add.graphics()
    cornersG.lineStyle(1.5, InkColor.ink, 0.6)
    const bx = panelX - this.panelW / 2 + 7
    const by = panelY - this.panelH / 2 + 7
    const bw = this.panelW - 14
    const bh = this.panelH - 14
    const clen = 12
    // TL
    cornersG.moveTo(bx + clen, by).lineTo(bx, by).lineTo(bx, by + clen)
    // TR
    cornersG.moveTo(bx + bw - clen, by).lineTo(bx + bw, by).lineTo(bx + bw, by + clen)
    // BL
    cornersG.moveTo(bx, by + bh - clen).lineTo(bx, by + bh).lineTo(bx + clen, by + bh)
    // BR
    cornersG.moveTo(bx + bw, by + bh - clen).lineTo(bx + bw, by + bh).lineTo(bx + bw - clen, by + bh)
    cornersG.strokePath()
    this.add(cornersG)

    // 3. 卷首标题
    this.createHeader(panelX, panelTop + 32)

    // 4. 四大选项卡 Tab
    this.createTabs(panelX, panelTop + 72)

    // 5. 内容区域容器
    this.contentContainer = scene.add.container(panelX, panelTop + 104)
    this.add(this.contentContainer)

    // 6. 渲染初始标签内容
    this.renderCurrentTabContent()

    // 7. 底部控制栏
    this.createFooter(panelX, panelBottom - 26)

    // 8. ESC 快捷键监听
    if (scene.input.keyboard) {
      this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      this.escKey.once('down', () => this.close())
    }

    scene.add.existing(this)

    // 入场动效
    this.setAlpha(0)
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 160,
      ease: 'Sine.easeOut'
    })
    SoundFX.whoosh(0.2)
  }

  /**
   * 卷首标题
   */
  private createHeader(x: number, y: number): void {
    const seal = this.scene.add.rectangle(x - 140, y, 24, 24, InkColor.cinnabar)
    const sealTxt = inkText(this.scene, x - 140, y, '理', {
      size: 13,
      color: '#fdfbf7',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const titleTxt = inkText(this.scene, x - 118, y, '乾坤经纬 · 战法真诠', {
      size: 21,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const subTxt = inkText(this.scene, x + 115, y + 2, '· 水墨五行 · 阵脉相生 · 底层算法 ·', {
      size: 12,
      color: InkText.faint,
      originX: 0,
      originY: 0.5
    })

    this.add([seal, sealTxt, titleTxt, subTxt])
  }

  /**
   * 三大水墨 Tab 切换器（五行相生 · 五维对位 · 乘区算法）
   */
  private createTabs(x: number, y: number): void {
    const tabW = 240
    const gap = 16
    const totalW = tabW * 3 + gap * 2
    const startX = x - totalW / 2 + tabW / 2

    MECHANICS_TABS.forEach((tabDef, index) => {
      const tabX = startX + index * (tabW + gap)
      const container = this.scene.add.container(tabX, y)

      const bg = this.scene.add.graphics()
      container.add(bg)

      const updateBg = () => {
        bg.clear()
        const isSelected = this.currentTab === tabDef.key
        const fillColor = isSelected ? InkColor.paperDeep : InkColor.paperPanel
        const strokeColor = isSelected ? InkColor.cinnabar : InkColor.ink

        bg.fillStyle(fillColor, 0.95)
        bg.fillRoundedRect(-tabW / 2, -18, tabW, 36, 4)

        bg.lineStyle(isSelected ? 1.8 : 1, strokeColor, isSelected ? 0.9 : 0.4)
        bg.strokeRoundedRect(-tabW / 2, -18, tabW, 36, 4)

        // 选中时左侧朱印小方标
        bg.fillStyle(isSelected ? InkColor.cinnabar : InkColor.ink, isSelected ? 0.9 : 0.3)
        bg.fillRoundedRect(-tabW / 2 + 8, -9, 18, 18, 2)
      }

      updateBg()

      const sealChar = inkText(this.scene, -tabW / 2 + 17, 0, tabDef.seal, {
        size: 11,
        color: '#fdfbf7',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      const tabTitle = inkText(this.scene, -tabW / 2 + 34, 0, tabDef.title, {
        size: 14,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      container.add([sealChar, tabTitle])
      container.setSize(tabW, 36)
      container.setInteractive({ useHandCursor: true })

      container.on('pointerover', () => {
        if (this.currentTab !== tabDef.key) {
          tabTitle.setColor(InkText.cinnabar)
        }
      })
      container.on('pointerout', () => {
        if (this.currentTab !== tabDef.key) {
          tabTitle.setColor(InkText.strong)
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
      this.add(container)
    })
  }

  private refreshTabs(): void {
    this.tabButtons.forEach((btn, index) => {
      const tabDef = MECHANICS_TABS[index]
      const bg = btn.getAt(0) as Phaser.GameObjects.Graphics
      const tabTitle = btn.getAt(2) as Phaser.GameObjects.Text
      const isSelected = this.currentTab === tabDef.key

      bg.clear()
      const tabW = 240
      const fillColor = isSelected ? InkColor.paperDeep : InkColor.paperPanel
      const strokeColor = isSelected ? InkColor.cinnabar : InkColor.ink

      bg.fillStyle(fillColor, 0.95)
      bg.fillRoundedRect(-tabW / 2, -18, tabW, 36, 4)

      bg.lineStyle(isSelected ? 1.8 : 1, strokeColor, isSelected ? 0.9 : 0.4)
      bg.strokeRoundedRect(-tabW / 2, -18, tabW, 36, 4)

      bg.fillStyle(isSelected ? InkColor.cinnabar : InkColor.ink, isSelected ? 0.9 : 0.3)
      bg.fillRoundedRect(-tabW / 2 + 8, -9, 18, 18, 2)

      tabTitle.setColor(isSelected ? InkText.cinnabar : InkText.strong)
    })
  }

  /**
   * 根据当前选中的 Tab 渲染主体内容
   */
  private renderCurrentTabContent(): void {
    this.contentContainer.removeAll(true)

    switch (this.currentTab) {
      case 'wuxing':
        this.renderWuxingContent()
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
    const container = this.scene.add.container(x, y)

    const bg = this.scene.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.96)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6)
    bg.lineStyle(1.8, 0x8d5b28, 0.8)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6)
    bg.lineStyle(1.0, 0xd4af37, 0.5)
    bg.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 5)
    container.add(bg)

    // 顶部印章眉题
    const title = inkText(this.scene, 0, -h / 2 + 18, '【五行相生命脉图】', {
      size: 13,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const sub = inkText(this.scene, 0, -h / 2 + 34, '点击五行法印 · 展开状态与相生', {
      size: 9.5,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    container.add([title, sub])

    // 可交互五行矢量图
    const diagram = new InteractiveWuxingDiagram(this.scene, 0, 14, {
      radius: 96,
      nodeRadius: 20,
      initialElement: this.selectedElement,
      onSelect
    })
    container.add(diagram)

    const footNoteBg = this.scene.add.rectangle(0, h / 2 - 16, w - 12, 22, InkColor.paperDeep, 0.9)
    footNoteBg.setStrokeStyle(0.8, 0xa0782f, 0.3)
    const footNote = inkText(
      this.scene,
      0,
      h / 2 - 16,
      '2.5s附着 · 1.5s ICD · 160px阵脉+35%',
      {
        size: 9.5,
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
    const cardW = this.contentW
    const startY = 10

    // 导读小注
    const hintBg = this.scene.add.rectangle(0, startY + 12, cardW, 26, InkColor.paperPanel, 0.6)
    hintBg.setStrokeStyle(1, InkColor.inkFaint, 0.3)
    const hint = inkText(
      this.scene,
      0,
      startY + 12,
      '◆ 五大基础状态 2.5s 附着 · 双向相生连锁 1.5s ICD · 160px 阵脉威力+35% · 相生绝不抹除底层状态 ◆',
      { size: 11.5, color: InkText.faint, originX: 0.5, originY: 0.5 }
    )
    this.contentContainer.add([hintBg, hint])

    // 右栏容器
    const rightContainer = this.scene.add.container(140, startY + 36)
    this.contentContainer.add(rightContainer)

    const rightCardW = 620
    let diagramInstance: InteractiveWuxingDiagram

    const renderRight = () => {
      rightContainer.removeAll(true)

      if (!this.selectedElement) {
        // 全览模式：5 个【五行生克一体综合卡片】
        const itemH = 68
        const gap = 10
        let currentY = 0

        ELEMENT_STATUS_LIST.forEach((item) => {
          const pal = WUXING_PALETTE[item.element]
          const detail = getElementMechanicsDetail(item.element)
          const card = this.scene.add.container(0, currentY + itemH / 2)

          const bg = this.scene.add.graphics()
          bg.fillStyle(pal.fill, 0.96)
          bg.fillRoundedRect(-rightCardW / 2, -itemH / 2, rightCardW, itemH, 5)
          bg.lineStyle(1.6, pal.border, 0.9)
          bg.strokeRoundedRect(-rightCardW / 2, -itemH / 2, rightCardW, itemH, 5)
          bg.lineStyle(0.8, 0xffffff, 0.5)
          bg.strokeRoundedRect(-rightCardW / 2 + 2, -itemH / 2 + 2, rightCardW - 4, itemH - 4, 4)

          // 1. 左侧五行法印徽印
          bg.fillStyle(pal.color, 0.95)
          bg.fillRoundedRect(-rightCardW / 2 + 12, -20, 40, 40, 4)
          card.add(bg)

          const sealTxt = inkText(this.scene, -rightCardW / 2 + 32, 0, item.char, {
            size: 20,
            color: '#ffffff',
            bold: true,
            originX: 0.5,
            originY: 0.5
          })

          // 2. 第一行：名称 + 专克 + 附着时长
          const title = inkText(this.scene, -rightCardW / 2 + 62, -15, item.name, {
            size: 14,
            color: pal.hex,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const targetTag = inkText(this.scene, -rightCardW / 2 + 225, -15, `【专克：${item.targetStat}】`, {
            size: 11.5,
            color: InkText.cinnabar,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const durationTag = inkText(this.scene, rightCardW / 2 - 14, -15, `附着时长：${item.duration}`, {
            size: 11,
            color: InkText.faint,
            originX: 1,
            originY: 0.5
          })

          // 3. 第二行：核心效果
          const summary = inkText(this.scene, -rightCardW / 2 + 62, 4, item.summary, {
            size: 11,
            color: InkText.strong,
            originX: 0,
            originY: 0.5
          })

          // 4. 第三行：相生指引徽章
          const rxBadge1 = inkText(this.scene, -rightCardW / 2 + 62, 22, `【生我之合】${detail.generatedBy.relationLabel} · ${detail.generatedBy.reaction.name}`, {
            size: 10,
            color: WUXING_PALETTE[detail.generatedBy.partnerElement].hex,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const rxBadge2 = inkText(this.scene, -rightCardW / 2 + 310, 22, `【我生之合】${detail.generates.relationLabel} · ${detail.generates.reaction.name}`, {
            size: 10,
            color: WUXING_PALETTE[detail.generates.partnerElement].hex,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          bg.setInteractive(new Phaser.Geom.Rectangle(-rightCardW / 2, -itemH / 2, rightCardW, itemH), Phaser.Geom.Rectangle.Contains)
          bg.on('pointerdown', () => {
            diagramInstance.selectElement(item.element, true)
          })

          card.add([sealTxt, title, targetTag, durationTag, summary, rxBadge1, rxBadge2])
          rightContainer.add(card)

          currentY += itemH + gap
        })
      } else {
        // 聚焦单个五行状态与相生信息
        const detail = getElementMechanicsDetail(this.selectedElement)
        this.renderSingleElementDetail(rightContainer, detail, rightCardW, diagramInstance)
      }
    }

    // 左栏：五行相生图
    const { container: diagramPanel, diagram } = this.createInteractiveDiagramCard(
      -315,
      startY + 224,
      266,
      396,
      (elem) => {
        this.selectedElement = elem
        renderRight()
      }
    )
    diagramInstance = diagram
    this.contentContainer.add(diagramPanel)

    renderRight()
  }

  /**
   * 渲染选定单个五行时的右侧专属详解（基础状态 + 双向相生连锁，完全解耦武将）
   */
  private renderSingleElementDetail(
    parent: Phaser.GameObjects.Container,
    detail: ElementMechanicsDetail,
    cardW: number,
    diagram: InteractiveWuxingDiagram
  ): void {
    const pal = WUXING_PALETTE[detail.element]

    // 1. 基础状态卡片 (y: 58, h: 116)
    const card1 = this.scene.add.container(0, 58)
    const bg1 = this.scene.add.graphics()
    bg1.fillStyle(pal.fill, 0.98)
    bg1.fillRoundedRect(-cardW / 2, -58, cardW, 116, 5)
    bg1.lineStyle(1.8, pal.border, 0.95)
    bg1.strokeRoundedRect(-cardW / 2, -58, cardW, 116, 5)
    bg1.lineStyle(0.8, 0xffffff, 0.6)
    bg1.strokeRoundedRect(-cardW / 2 + 2, -56, cardW - 4, 112, 4)

    bg1.fillStyle(pal.color, 0.95)
    bg1.fillRoundedRect(-cardW / 2 + 14, -42, 44, 44, 4)
    card1.add(bg1)

    const sealChar = inkText(this.scene, -cardW / 2 + 36, -20, detail.status.char, {
      size: 22,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const title1 = inkText(this.scene, -cardW / 2 + 68, -35, detail.status.name, {
      size: 15,
      color: pal.hex,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const targetBadge = inkText(this.scene, -cardW / 2 + 235, -35, `【专克：${detail.status.targetStat}】`, {
      size: 12,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const durTag = inkText(
      this.scene,
      cardW / 2 - 14,
      -35,
      `附着时长：${detail.status.duration}`,
      { size: 11, color: InkText.faint, originX: 1, originY: 0.5 }
    )

    const summary1 = inkText(this.scene, -cardW / 2 + 68, -12, `核心效果：${detail.status.summary}`, {
      size: 11.5,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const detailsStr = detail.status.details.slice(0, 2).join(' ｜ ')
    const details1 = inkText(this.scene, -cardW / 2 + 14, 14, `机制细则：${detailsStr}`, {
      size: 10.5,
      color: InkText.wash,
      originX: 0,
      originY: 0.5
    })

    const ruleText = inkText(this.scene, -cardW / 2 + 14, 35, `铁律遵循：${detail.status.rules.join('  ● ')}`, {
      size: 10.5,
      color: '#8a6230',
      bold: true,
      originX: 0,
      originY: 0.5
    })

    card1.add([sealChar, title1, targetBadge, durTag, summary1, details1, ruleText])
    parent.add(card1)

    // 2. 对应双向相生连锁卡片（生我之合 & 我生之合） (y: 206, h: 160)
    const card2 = this.scene.add.container(0, 206)
    const bg2 = this.scene.add.graphics()
    bg2.fillStyle(InkColor.paperPanel, 0.95)
    bg2.fillRoundedRect(-cardW / 2, -80, cardW, 160, 5)
    bg2.lineStyle(1.4, 0xa0782f, 0.75)
    bg2.strokeRoundedRect(-cardW / 2, -80, cardW, 160, 5)
    card2.add(bg2)

    const title2 = inkText(
      this.scene,
      -cardW / 2 + 14,
      -66,
      '【对应双向相生化学连锁】',
      { size: 12, color: '#8a6230', bold: true, originX: 0, originY: 0.5 }
    )
    const sub2 = inkText(
      this.scene,
      cardW / 2 - 14,
      -66,
      '双向无序等效 · 1.5s ICD · 相生不抹除',
      { size: 10, color: InkText.faint, originX: 1, originY: 0.5 }
    )
    card2.add([title2, sub2])

    const halfW = (cardW - 36) / 2
    const fromPal = WUXING_PALETTE[detail.generatedBy.partnerElement]
    const toPal = WUXING_PALETTE[detail.generates.partnerElement]

    const subConfigs = [
      {
        x: -cardW / 2 + 12 + halfW / 2,
        title: `【生我之合】${detail.generatedBy.relationLabel} · ${detail.generatedBy.reaction.name}`,
        combo: `触发：【${fromPal.name}】 + 【${pal.name}】`,
        pal: fromPal,
        rx: detail.generatedBy.reaction
      },
      {
        x: cardW / 2 - 12 - halfW / 2,
        title: `【我生之合】${detail.generates.relationLabel} · ${detail.generates.reaction.name}`,
        combo: `触发：【${pal.name}】 + 【${toPal.name}】`,
        pal: toPal,
        rx: detail.generates.reaction
      }
    ]

    subConfigs.forEach((cfg) => {
      const subBg = this.scene.add.graphics()
      subBg.fillStyle(cfg.pal.fill, 0.98)
      subBg.fillRoundedRect(cfg.x - halfW / 2, -50, halfW, 120, 4)
      subBg.lineStyle(1.3, cfg.pal.border, 0.85)
      subBg.strokeRoundedRect(cfg.x - halfW / 2, -50, halfW, 120, 4)

      const sTitle = inkText(this.scene, cfg.x - halfW / 2 + 8, -36, cfg.title, {
        size: 11,
        color: cfg.rx.textColor,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sPartner = inkText(this.scene, cfg.x - halfW / 2 + 8, -20, cfg.combo, {
        size: 10,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sType = inkText(this.scene, cfg.x - halfW / 2 + 8, -4, `质变：${cfg.rx.type}`, {
        size: 9.5,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sSummary = inkText(this.scene, cfg.x - halfW / 2 + 8, 15, cfg.rx.summary, {
        size: 9.5,
        color: InkText.ink,
        wrapWidth: halfW - 16,
        originX: 0,
        originY: 0.5
      })

      const sIcd = inkText(this.scene, cfg.x - halfW / 2 + 8, 48, `内置CD：${cfg.rx.icd}`, {
        size: 9,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      card2.add([subBg, sTitle, sPartner, sType, sSummary, sIcd])
    })
    parent.add(card2)

    // 3. 空间阵脉与共鸣加成 (y: 308, h: 42)
    const card3 = this.scene.add.container(0, 308)
    const bg3 = this.scene.add.graphics()
    bg3.fillStyle(InkColor.paperPanel, 0.92)
    bg3.fillRoundedRect(-cardW / 2, -21, cardW, 42, 4)
    bg3.lineStyle(1.0, InkColor.inkFaint, 0.4)
    bg3.strokeRoundedRect(-cardW / 2, -21, cardW, 42, 4)
    card3.add(bg3)

    const rule1 = inkText(
      this.scene,
      -cardW / 2 + 12,
      -8,
      '◆ 160px 相生阵脉：两将距离 ≤ 160px 生成墨线，衰减延缓30%，威力与破铁壁 +35%！',
      { size: 9.5, color: InkText.wash, originX: 0, originY: 0.5 }
    )
    const rule2 = inkText(
      this.scene,
      -cardW / 2 + 12,
      8,
      '◆ 相生共鸣取优：伤害基数取双将最高攻击力 + 另一将 25% 协同攻击，杜绝低攻散兵抢反应降伤！',
      { size: 9.5, color: InkText.wash, originX: 0, originY: 0.5 }
    )
    card3.add([rule1, rule2])
    parent.add(card3)

    // 4. 底部快捷操作栏 (y: 352, h: 28)
    const bar = this.scene.add.container(0, 352)

    const allBtn = this.scene.add.container(-cardW / 2 + 46, 0)
    const allBg = this.scene.add.graphics()
    allBg.fillStyle(InkColor.paperDeep, 0.95)
    allBg.fillRoundedRect(-42, -12, 84, 24, 3)
    allBg.lineStyle(1.1, InkColor.ink, 0.5)
    allBg.strokeRoundedRect(-42, -12, 84, 24, 3)
    allBtn.add(allBg)
    const allTxt = inkText(this.scene, 0, 0, '👁 查看全部', {
      size: 10,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    allBtn.add(allTxt)
    allBg.setInteractive(new Phaser.Geom.Rectangle(-42, -12, 84, 24), Phaser.Geom.Rectangle.Contains)
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
      const btnX = -cardW / 2 + 104 + idx * 102 + 46
      const pill = this.scene.add.container(btnX, 0)
      const elPal = WUXING_PALETTE[el.key]
      const isSel = el.key === detail.element

      const pBg = this.scene.add.graphics()
      pBg.fillStyle(isSel ? elPal.border : elPal.fill, 0.95)
      pBg.fillRoundedRect(-46, -12, 92, 24, 3)
      pBg.lineStyle(1.3, elPal.border, isSel ? 1.0 : 0.6)
      pBg.strokeRoundedRect(-46, -12, 92, 24, 3)
      pill.add(pBg)

      const pTxt = inkText(this.scene, 0, 0, `${el.label} · ${el.seal}`, {
        size: 10,
        color: isSel ? '#ffffff' : elPal.hex,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      pill.add(pTxt)

      pBg.setInteractive(new Phaser.Geom.Rectangle(-46, -12, 92, 24), Phaser.Geom.Rectangle.Contains)
      pBg.on('pointerdown', () => {
        diagram.selectElement(el.key, true)
      })

      bar.add(pill)
    })

    parent.add(bar)
  }

  // ==================== 3. 五维攻防对位 ====================
  private renderAttributesContent(): void {
    const cardW = this.contentW
    const startY = 10

    const hintBg = this.scene.add.rectangle(0, startY + 12, cardW, 26, InkColor.paperPanel, 0.6)
    hintBg.setStrokeStyle(1, InkColor.inkFaint, 0.3)
    const hint = inkText(
      this.scene,
      0,
      startY + 12,
      '◆ 敌我五大基础属性池严格一对一精准对位 · 杜绝模糊重叠 · 破韧破刚方显暴击之威 ◆',
      { size: 12, color: InkText.faint, originX: 0.5, originY: 0.5 }
    )
    this.contentContainer.add([hintBg, hint])

    const itemH = 68
    const gap = 8
    let currentY = startY + 36

    ATTRIBUTE_PAIRS.forEach((pair) => {
      const card = this.scene.add.container(0, currentY + itemH / 2)

      const bg = this.scene.add.graphics()
      bg.fillStyle(InkColor.paperPanel, 0.9)
      bg.fillRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 4)
      bg.lineStyle(1.2, InkColor.ink, 0.45)
      bg.strokeRoundedRect(-cardW / 2, -itemH / 2, cardW, itemH, 4)

      bg.fillStyle(InkColor.cinnabar, 0.85)
      bg.fillRoundedRect(-14, -10, 28, 20, 3)

      card.add(bg)

      const vsTxt = inkText(this.scene, 0, 0, 'VS', {
        size: 10,
        color: '#fdfbf7',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      const alliedTitle = inkText(this.scene, -cardW / 2 + 16, -14, `我军: ${pair.alliedStat}`, {
        size: 14,
        color: '#2b638f',
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const alliedDesc = inkText(this.scene, -cardW / 2 + 16, 9, pair.alliedDesc, {
        size: 11,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      const enemyTitle = inkText(this.scene, 32, -14, `敌军: ${pair.enemyStat}`, {
        size: 14,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const enemyDesc = inkText(this.scene, 32, 9, pair.enemyDesc, {
        size: 11,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      const logicText = inkText(this.scene, -cardW / 2 + 16, 24, `破除之道: ${pair.counterLogic}`, {
        size: 11,
        color: InkText.strong,
        originX: 0,
        originY: 0.5
      })

      card.add([vsTxt, alliedTitle, alliedDesc, enemyTitle, enemyDesc, logicText])
      this.contentContainer.add(card)

      currentY += itemH + gap
    })
  }

  // ==================== 4. 乾坤经纬：五维对位与四乘区合并算法 ====================
  private renderDamageContent(): void {
    const cardW = this.contentW
    const startY = 4

    // 1. 顶栏：公式主看板
    const formulaContainer = this.scene.add.container(0, startY + 22)
    const formulaBg = this.scene.add.graphics()
    formulaBg.fillStyle(InkColor.paperPanel, 0.96)
    formulaBg.fillRoundedRect(-cardW / 2, -22, cardW, 44, 4)
    formulaBg.lineStyle(1.6, InkColor.cinnabar, 0.85)
    formulaBg.strokeRoundedRect(-cardW / 2, -22, cardW, 44, 4)

    const fTitle = inkText(this.scene, 0, -10, '【 乾坤经纬 · 攻守对位与四乘区合并总公式 】', {
      size: 11.5,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const formulaTxt = inkText(this.scene, 0, 10, DAMAGE_FORMULA_GUIDE.formula, {
      size: 11.5,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    formulaContainer.add([formulaBg, fTitle, formulaTxt])
    this.contentContainer.add(formulaContainer)

    // 2. 中层左右并列双栏（左栏：五维攻守对位；右栏：四乘区结算与面板对齐）
    const leftW = 438
    const rightW = 456
    const colH = 294
    const leftX = -cardW / 2 + leftW / 2
    const rightX = cardW / 2 - rightW / 2
    const colCenterY = startY + 196

    // ---------- 左栏：五维攻守对位 ----------
    const leftContainer = this.scene.add.container(leftX, colCenterY)
    const leftBg = this.scene.add.graphics()
    leftBg.fillStyle(InkColor.paperPanel, 0.92)
    leftBg.fillRoundedRect(-leftW / 2, -colH / 2, leftW, colH, 5)
    leftBg.lineStyle(1.2, InkColor.ink, 0.55)
    leftBg.strokeRoundedRect(-leftW / 2, -colH / 2, leftW, colH, 5)
    leftContainer.add(leftBg)

    const leftTitle = inkText(this.scene, 0, -colH / 2 + 16, '【 乾坤五维 · 攻守对位与克制链 】', {
      size: 12,
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
      const rContainer = this.scene.add.container(0, ry)

      const rBg = this.scene.add.graphics()
      rBg.fillStyle(InkColor.paperDeep, 0.9)
      rBg.fillRoundedRect(-leftW / 2 + 8, -itemH / 2, leftW - 16, itemH, 4)
      rBg.lineStyle(0.8, InkColor.ink, 0.25)
      rBg.strokeRoundedRect(-leftW / 2 + 8, -itemH / 2, leftW - 16, itemH, 4)

      const alliedTxt = inkText(this.scene, -leftW / 2 + 16, -11, row.allied, {
        size: 11,
        color: '#206095',
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const vsArrow = inkText(this.scene, -leftW / 2 + 155, -11, '⚔ 针对', {
        size: 9.5,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      const enemyTxt = inkText(this.scene, -leftW / 2 + 200, -11, row.enemy, {
        size: 11,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const tagTxt = inkText(this.scene, -leftW / 2 + 16, 11, row.tag, {
        size: 10,
        color: row.tagColor,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const descTxt = inkText(this.scene, -leftW / 2 + 76, 11, row.desc, {
        size: 9.5,
        color: InkText.ink,
        originX: 0,
        originY: 0.5
      })

      rContainer.add([rBg, alliedTxt, vsArrow, enemyTxt, tagTxt, descTxt])
      leftContainer.add(rContainer)
    })
    this.contentContainer.add(leftContainer)

    // ---------- 右栏：四乘区结算与面板对齐 ----------
    const rightContainer = this.scene.add.container(rightX, colCenterY)
    const rightBg = this.scene.add.graphics()
    rightBg.fillStyle(InkColor.paperPanel, 0.92)
    rightBg.fillRoundedRect(-rightW / 2, -colH / 2, rightW, colH, 5)
    rightBg.lineStyle(1.2, InkColor.cinnabar, 0.55)
    rightBg.strokeRoundedRect(-rightW / 2, -colH / 2, rightW, colH, 5)
    rightContainer.add(rightBg)

    const rightTitle = inkText(this.scene, 0, -colH / 2 + 16, '【 伤害乘区 · 结算规则与面板对齐 】', {
      size: 12,
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
      const rContainer = this.scene.add.container(0, ry)

      const rBg = this.scene.add.graphics()
      rBg.fillStyle(InkColor.paperDeep, 0.9)
      rBg.fillRoundedRect(-rightW / 2 + 8, -itemH / 2, rightW - 16, itemH, 4)
      rBg.lineStyle(0.8, InkColor.ink, 0.25)
      rBg.strokeRoundedRect(-rightW / 2 + 8, -itemH / 2, rightW - 16, itemH, 4)

      const tTitle = inkText(this.scene, -rightW / 2 + 16, -11, row.title, {
        size: 11,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const tPanel = inkText(this.scene, rightW / 2 - 16, -11, row.panel, {
        size: 9.5,
        color: '#8d5b28',
        bold: true,
        originX: 1,
        originY: 0.5
      })

      const tDetail = inkText(this.scene, -rightW / 2 + 16, 11, row.detail, {
        size: 9.5,
        color: InkText.ink,
        originX: 0,
        originY: 0.5
      })

      rContainer.add([rBg, tTitle, tPanel, tDetail])
      rightContainer.add(rContainer)
    })
    this.contentContainer.add(rightContainer)

    // 3. 底栏两大铁律高光框
    const rulesY = startY + 368
    const rulesContainer = this.scene.add.container(0, rulesY)
    const ruleBoxW = cardW / 2 - 8
    const ruleH = 34

    // 铁律 1: 局外保底
    const r1Bg = this.scene.add.graphics()
    r1Bg.fillStyle(InkColor.paperPanel, 0.95)
    r1Bg.fillRoundedRect(-cardW / 4 - 4 - ruleBoxW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)
    r1Bg.lineStyle(1.1, InkColor.cinnabar, 0.75)
    r1Bg.strokeRoundedRect(-cardW / 4 - 4 - ruleBoxW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)

    const r1Title = inkText(this.scene, -cardW / 4 - 4 - ruleBoxW / 2 + 12, 0, '◆ 铁律 ① 局外上限 ≤ +50%', {
      size: 10.5,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const r1Desc = inkText(
      this.scene,
      -cardW / 4 - 4 - ruleBoxW / 2 + 158,
      0,
      '局外武将/神兵/宝石累加总增益封顶 +50%，保下限定上限。',
      { size: 9, color: InkText.ink, originX: 0, originY: 0.5 }
    )
    rulesContainer.add([r1Bg, r1Title, r1Desc])

    // 铁律 2: 抗性保底
    const r2Bg = this.scene.add.graphics()
    r2Bg.fillStyle(InkColor.paperPanel, 0.95)
    r2Bg.fillRoundedRect(cardW / 4 + 4 - ruleBoxW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)
    r2Bg.lineStyle(1.1, InkColor.ink, 0.75)
    r2Bg.strokeRoundedRect(cardW / 4 + 4 - ruleBoxW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)

    const r2Title = inkText(this.scene, cardW / 4 + 4 - ruleBoxW / 2 + 12, 0, '◆ 铁律 ② 抗性下限 ≥ 40%', {
      size: 10.5,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const r2Desc = inkText(
      this.scene,
      cardW / 4 + 4 - ruleBoxW / 2 + 158,
      0,
      '防御/韧性/刚毅削减最多 60%，绝不沦为零防木桩。',
      { size: 9, color: InkText.ink, originX: 0, originY: 0.5 }
    )
    rulesContainer.add([r2Bg, r2Title, r2Desc])

    this.contentContainer.add(rulesContainer)
  }

  /**
   * 底部控制栏
   */
  private createFooter(x: number, y: number): void {
    // 关闭按钮
    const closeBtn = createInkButton(this.scene, x, y, 120, 34, '闭卷归阵', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb53a32,
      textColor: '#fdfbf7',
      fontSize: 14,
      onClick: () => this.close()
    })
    this.add(closeBtn)

    // 如果提供了全屏场景跳转回调，可额外显示“大厅研读”按钮
    if (this.onOpenSceneCallback) {
      const openSceneBtn = createInkButton(this.scene, x - 140, y, 110, 34, '全卷图鉴', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 13,
        stroke: InkColor.ink,
        onClick: () => {
          this.close()
          this.onOpenSceneCallback?.()
        }
      })
      this.add(openSceneBtn)
    }
  }

  /**
   * 关闭弹窗
   */
  public close(): void {
    if (this.escKey) {
      this.escKey.destroy()
    }
    SoundFX.whoosh(0.18)
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 140,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.destroy()
        this.onCloseCallback?.()
      }
    })
  }
}
