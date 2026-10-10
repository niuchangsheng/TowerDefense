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
  getElementMechanicsDetail,
  ElementMechanicsDetail
} from '@/data/mechanics'
import { InteractiveWuxingDiagram } from './InteractiveWuxingDiagram'

/**
 * 【乾坤经纬】底层机制速查弹窗
 * 可在战斗中直接呼出（自动拦截交互，查阅后一键闭卷返回），也可在独立场景复用。
 */
export class MechanicsModal extends Phaser.GameObjects.Container {
  private currentTab: MechanicsTab = 'elemental'
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
    initialTab: MechanicsTab = 'elemental',
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
   * 四大水墨 Tab 切换器
   */
  private createTabs(x: number, y: number): void {
    const tabW = 216
    const gap = 12
    const totalW = tabW * 4 + gap * 3
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
      const tabW = 216
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
    const container = this.scene.add.container(x, y)

    const bg = this.scene.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.96)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6)
    bg.lineStyle(1.6, InkColor.ink, 0.75)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6)
    bg.lineStyle(0.8, 0xa0782f, 0.45)
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

  // ==================== 1. 五行基础状态（可交互双栏版） ====================
  private renderElementalContent(): void {
    const cardW = this.contentW
    const startY = 10

    // 导读小注
    const hintBg = this.scene.add.rectangle(0, startY + 12, cardW, 26, InkColor.paperPanel, 0.6)
    hintBg.setStrokeStyle(1, InkColor.inkFaint, 0.3)
    const hint = inkText(
      this.scene,
      0,
      startY + 12,
      '◆ 点击左侧五行图法印，即可切换查看该五行基础状态与双向相生信息 ◆',
      { size: 12, color: InkText.faint, originX: 0.5, originY: 0.5 }
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
        // 全量 5 个五行状态卡片
        const itemH = 68
        const gap = 12
        let currentY = 0

        ELEMENT_STATUS_LIST.forEach((item) => {
          const card = this.scene.add.container(0, currentY + itemH / 2)

          const bg = this.scene.add.graphics()
          bg.fillStyle(InkColor.paperPanel, 0.9)
          bg.fillRoundedRect(-rightCardW / 2, -itemH / 2, rightCardW, itemH, 4)
          bg.lineStyle(1.2, item.color, 0.7)
          bg.strokeRoundedRect(-rightCardW / 2, -itemH / 2, rightCardW, itemH, 4)

          // 左侧五行徽印
          bg.fillStyle(item.color, 0.9)
          bg.fillRoundedRect(-rightCardW / 2 + 12, -20, 40, 40, 4)
          card.add(bg)

          const sealTxt = inkText(this.scene, -rightCardW / 2 + 32, 0, item.char, {
            size: 20,
            color: '#fdfbf7',
            bold: true,
            originX: 0.5,
            originY: 0.5
          })

          const title = inkText(this.scene, -rightCardW / 2 + 62, -14, item.name, {
            size: 15,
            color: item.textColor,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const targetTag = inkText(this.scene, -rightCardW / 2 + 240, -14, `[专克: ${item.targetStat}]`, {
            size: 12,
            color: InkText.cinnabar,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const durationTag = inkText(this.scene, rightCardW / 2 - 14, -14, `时长: ${item.duration}`, {
            size: 11,
            color: InkText.faint,
            originX: 1,
            originY: 0.5
          })

          const summary = inkText(this.scene, -rightCardW / 2 + 62, 8, item.summary, {
            size: 12,
            color: InkText.ink,
            originX: 0,
            originY: 0.5
          })

          const detail = inkText(this.scene, -rightCardW / 2 + 62, 24, item.details.join(' ｜ '), {
            size: 10,
            color: InkText.faint,
            originX: 0,
            originY: 0.5
          })

          bg.setInteractive(new Phaser.Geom.Rectangle(-rightCardW / 2, -itemH / 2, rightCardW, itemH), Phaser.Geom.Rectangle.Contains)
          bg.on('pointerdown', () => {
            diagramInstance.selectElement(item.element, true)
          })

          card.add([sealTxt, title, targetTag, durationTag, summary, detail])
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
   * 渲染选定单个五行时的右侧专属详解（基础状态 + 双向相生连锁）
   */
  private renderSingleElementDetail(
    parent: Phaser.GameObjects.Container,
    detail: ElementMechanicsDetail,
    cardW: number,
    diagram: InteractiveWuxingDiagram
  ): void {
    // 1. 基础状态卡片 (y: 58, h: 116)
    const card1 = this.scene.add.container(0, 58)
    const bg1 = this.scene.add.graphics()
    bg1.fillStyle(InkColor.paperPanel, 0.95)
    bg1.fillRoundedRect(-cardW / 2, -58, cardW, 116, 5)
    bg1.lineStyle(1.4, detail.status.color, 0.8)
    bg1.strokeRoundedRect(-cardW / 2, -58, cardW, 116, 5)

    bg1.fillStyle(detail.status.color, 0.95)
    bg1.fillRoundedRect(-cardW / 2 + 14, -42, 44, 44, 4)
    card1.add(bg1)

    const sealChar = inkText(this.scene, -cardW / 2 + 36, -20, detail.status.char, {
      size: 22,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const title1 = inkText(this.scene, -cardW / 2 + 68, -36, detail.status.name, {
      size: 15,
      color: detail.status.textColor,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const generalTag = inkText(
      this.scene,
      -cardW / 2 + 220,
      -36,
      `名将：${detail.general.name}（${detail.general.title}）`,
      { size: 12, color: InkText.strong, bold: true, originX: 0, originY: 0.5 }
    )

    const targetBadge = inkText(this.scene, -cardW / 2 + 68, -16, `[专克: ${detail.status.targetStat}]`, {
      size: 11.5,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const durTag = inkText(
      this.scene,
      -cardW / 2 + 220,
      -16,
      `附着: ${detail.status.duration} ｜ 神兵: ${detail.general.weapon}`,
      { size: 11, color: InkText.faint, originX: 0, originY: 0.5 }
    )

    const summary1 = inkText(this.scene, -cardW / 2 + 14, 6, `核心效果：${detail.status.summary}`, {
      size: 11.5,
      color: InkText.ink,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const detailsStr = detail.status.details.slice(0, 2).join(' ｜ ')
    const details1 = inkText(this.scene, -cardW / 2 + 14, 26, detailsStr, {
      size: 10.5,
      color: InkText.faint,
      originX: 0,
      originY: 0.5
    })

    const quote1 = inkText(this.scene, -cardW / 2 + 14, 44, `名将真传：“${detail.general.coreQuote}”`, {
      size: 10.5,
      color: '#8a6230',
      bold: true,
      originX: 0,
      originY: 0.5
    })

    card1.add([sealChar, title1, generalTag, targetBadge, durTag, summary1, details1, quote1])
    parent.add(card1)

    // 2. 对应相生状态卡片（生我 & 我生） (y: 204, h: 156)
    const card2 = this.scene.add.container(0, 204)
    const bg2 = this.scene.add.graphics()
    bg2.fillStyle(InkColor.paperPanel, 0.95)
    bg2.fillRoundedRect(-cardW / 2, -78, cardW, 156, 5)
    bg2.lineStyle(1.2, 0xa0782f, 0.7)
    bg2.strokeRoundedRect(-cardW / 2, -78, cardW, 156, 5)
    card2.add(bg2)

    const title2 = inkText(
      this.scene,
      -cardW / 2 + 14,
      -64,
      '【对应相生状态信息 · 双向化学连锁】',
      { size: 12, color: '#8a6230', bold: true, originX: 0, originY: 0.5 }
    )
    const sub2 = inkText(
      this.scene,
      cardW / 2 - 14,
      -64,
      '双向等效 · 1.5s ICD · 相生不抹除',
      { size: 10, color: InkText.faint, originX: 1, originY: 0.5 }
    )
    card2.add([title2, sub2])

    const halfW = (cardW - 36) / 2
    const subConfigs = [
      {
        x: -cardW / 2 + 12 + halfW / 2,
        title: `【生我】${detail.generatedBy.relationLabel} · ${detail.generatedBy.reaction.name}`,
        partner: `搭档：${detail.generatedBy.partnerGeneral.name} ➔ ${detail.general.name}`,
        rx: detail.generatedBy.reaction
      },
      {
        x: cardW / 2 - 12 - halfW / 2,
        title: `【我生】${detail.generates.relationLabel} · ${detail.generates.reaction.name}`,
        partner: `搭档：${detail.general.name} ➔ ${detail.generates.partnerGeneral.name}`,
        rx: detail.generates.reaction
      }
    ]

    subConfigs.forEach((cfg) => {
      const subBg = this.scene.add.graphics()
      subBg.fillStyle(0xf7f3ea, 0.95)
      subBg.fillRoundedRect(cfg.x - halfW / 2, -48, halfW, 114, 4)
      subBg.lineStyle(1.1, cfg.rx.color, 0.7)
      subBg.strokeRoundedRect(cfg.x - halfW / 2, -48, halfW, 114, 4)

      const sTitle = inkText(this.scene, cfg.x - halfW / 2 + 8, -34, cfg.title, {
        size: 11,
        color: cfg.rx.textColor,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sPartner = inkText(this.scene, cfg.x - halfW / 2 + 8, -18, cfg.partner, {
        size: 10,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sType = inkText(this.scene, cfg.x - halfW / 2 + 8, -2, `质变：${cfg.rx.type}`, {
        size: 9.5,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sSummary = inkText(this.scene, cfg.x - halfW / 2 + 8, 16, cfg.rx.summary, {
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

    const elements: Array<{ key: WuXing; label: string }> = [
      { key: 'metal', label: '金 · 赵云' },
      { key: 'water', label: '水 · 关羽' },
      { key: 'wood',  label: '木 · 黄忠' },
      { key: 'fire',  label: '火 · 马超' },
      { key: 'earth', label: '土 · 张飞' }
    ]

    elements.forEach((el, idx) => {
      const btnX = -cardW / 2 + 104 + idx * 102 + 46
      const pill = this.scene.add.container(btnX, 0)
      const isSel = el.key === detail.element

      const pBg = this.scene.add.graphics()
      pBg.fillStyle(isSel ? InkColor.cinnabar : InkColor.paperPanel, 0.95)
      pBg.fillRoundedRect(-46, -12, 92, 24, 3)
      pBg.lineStyle(1.1, isSel ? InkColor.cinnabar : InkColor.inkFaint, isSel ? 0.9 : 0.45)
      pBg.strokeRoundedRect(-46, -12, 92, 24, 3)
      pill.add(pBg)

      const pTxt = inkText(this.scene, 0, 0, el.label, {
        size: 10,
        color: isSel ? '#ffffff' : InkText.strong,
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

  // ==================== 2. 相生化学反应与空间阵脉（可交互双栏版） ====================
  private renderReactionContent(): void {
    const cardW = this.contentW
    const startY = 10

    const hintBg = this.scene.add.rectangle(0, startY + 12, cardW, 26, InkColor.paperPanel, 0.6)
    hintBg.setStrokeStyle(1, InkColor.inkFaint, 0.3)
    const hint = inkText(
      this.scene,
      0,
      startY + 12,
      '◆ 点击左侧五行图法印，即可聚焦查看该五行参与的双向相生连锁与破壁特性 ◆',
      { size: 12, color: InkText.faint, originX: 0.5, originY: 0.5 }
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
        // 全量 5 大相生卡片
        const itemH = 68
        const gap = 12
        let currentY = 0

        REACTION_LIST.forEach((reaction) => {
          const card = this.scene.add.container(0, currentY + itemH / 2)

          const bg = this.scene.add.graphics()
          bg.fillStyle(InkColor.paperPanel, 0.9)
          bg.fillRoundedRect(-rightCardW / 2, -itemH / 2, rightCardW, itemH, 4)
          bg.lineStyle(1.2, reaction.color, 0.75)
          bg.strokeRoundedRect(-rightCardW / 2, -itemH / 2, rightCardW, itemH, 4)

          // 左侧双色双相生标记
          const e0 = INK_WUXING[reaction.elements[0]]
          const e1 = INK_WUXING[reaction.elements[1]]
          bg.fillStyle(e0.border, 0.9)
          bg.fillCircle(-rightCardW / 2 + 20, 0, 13)
          bg.fillStyle(e1.border, 0.9)
          bg.fillCircle(-rightCardW / 2 + 38, 0, 13)
          card.add(bg)

          const e0Txt = inkText(this.scene, -rightCardW / 2 + 20, 0, e0.label, {
            size: 11,
            color: '#fdfbf7',
            bold: true,
            originX: 0.5,
            originY: 0.5
          })
          const e1Txt = inkText(this.scene, -rightCardW / 2 + 38, 0, e1.label, {
            size: 11,
            color: '#fdfbf7',
            bold: true,
            originX: 0.5,
            originY: 0.5
          })

          const title = inkText(this.scene, -rightCardW / 2 + 60, -14, reaction.name, {
            size: 14,
            color: reaction.textColor,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const typeTag = inkText(this.scene, -rightCardW / 2 + 246, -14, `[${reaction.type}]`, {
            size: 11,
            color: InkText.strong,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const icdTag = inkText(this.scene, rightCardW / 2 - 14, -14, reaction.icd, {
            size: 11,
            color: InkText.faint,
            originX: 1,
            originY: 0.5
          })

          const summary = inkText(this.scene, -rightCardW / 2 + 60, 8, reaction.summary, {
            size: 11,
            color: InkText.ink,
            originX: 0,
            originY: 0.5
          })

          const detail = inkText(this.scene, -rightCardW / 2 + 60, 24, reaction.details.join(' ｜ '), {
            size: 10,
            color: InkText.faint,
            originX: 0,
            originY: 0.5
          })

          bg.setInteractive(new Phaser.Geom.Rectangle(-rightCardW / 2, -itemH / 2, rightCardW, itemH), Phaser.Geom.Rectangle.Contains)
          bg.on('pointerdown', () => {
            diagramInstance.selectElement(reaction.elements[0], true)
          })

          card.add([e0Txt, e1Txt, title, typeTag, icdTag, summary, detail])
          rightContainer.add(card)

          currentY += itemH + gap
        })
      } else {
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

  // ==================== 4. 乘区算法与数值铁律（包含具体攻击力与防御力数值） ====================
  private renderDamageContent(): void {
    const cardW = this.contentW
    const startY = 10

    // 公式主看板
    const formulaContainer = this.scene.add.container(0, startY + 28)
    const formulaBg = this.scene.add.graphics()
    formulaBg.fillStyle(InkColor.paperPanel, 0.96)
    formulaBg.fillRoundedRect(-cardW / 2, -26, cardW, 52, 4)
    formulaBg.lineStyle(1.6, InkColor.cinnabar, 0.8)
    formulaBg.strokeRoundedRect(-cardW / 2, -26, cardW, 52, 4)

    const fTitle = inkText(this.scene, 0, -13, '【 端到端完整战斗伤害计算公式 · 严禁私设独立乘区 】', {
      size: 12,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const formulaTxt = inkText(this.scene, 0, 10, DAMAGE_FORMULA_GUIDE.formula, {
      size: 12,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    formulaContainer.add([formulaBg, fTitle, formulaTxt])
    this.contentContainer.add(formulaContainer)

    // 四大核心支柱卡片（我方攻击力、敌方防御力、真实伤害判定、暴击抗暴对抗）
    const compW = (cardW - 30) / 4
    const compH = 48
    const compY = startY + 80
    const startCompX = -cardW / 2 + compW / 2

    DAMAGE_FORMULA_GUIDE.coreComponents.forEach((comp, idx) => {
      const cx = startCompX + idx * (compW + 10)
      const c = this.scene.add.container(cx, compY)

      const cBg = this.scene.add.graphics()
      cBg.fillStyle(InkColor.paperDeep, 0.92)
      cBg.fillRoundedRect(-compW / 2, -compH / 2, compW, compH, 4)
      cBg.lineStyle(1, idx === 0 ? 0x2b638f : (idx === 1 ? InkColor.cinnabar : InkColor.ink), 0.55)
      cBg.strokeRoundedRect(-compW / 2, -compH / 2, compW, compH, 4)

      const cTitle = inkText(this.scene, 0, -12, comp.title, {
        size: 11,
        color: idx === 0 ? '#2b638f' : (idx === 1 ? InkText.cinnabar : InkText.strong),
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      const cDesc = inkText(this.scene, 0, 9, comp.content, {
        size: 9.5,
        color: InkText.ink,
        originX: 0.5,
        originY: 0.5
      }).setWordWrapWidth(compW - 14)

      c.add([cBg, cTitle, cDesc])
      this.contentContainer.add(c)
    })

    // 6 个分乘区分步解构列表（双列紧凑卡片，每列 3 张）
    let currentY = compY + 30
    const rowH = 40
    const colW = (cardW - 10) / 2

    DAMAGE_FORMULA_GUIDE.buckets.forEach((bucket, idx) => {
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const bx = col === 0 ? -colW / 2 - 5 : colW / 2 + 5
      const by = currentY + row * (rowH + 5) + rowH / 2

      const card = this.scene.add.container(bx, by)
      const bg = this.scene.add.graphics()
      bg.fillStyle(InkColor.paperPanel, 0.88)
      bg.fillRoundedRect(-colW / 2, -rowH / 2, colW, rowH, 4)
      bg.lineStyle(1, InkColor.ink, 0.28)
      bg.strokeRoundedRect(-colW / 2, -rowH / 2, colW, rowH, 4)

      const bName = inkText(this.scene, -colW / 2 + 10, -8, `◆ ${bucket.name}`, {
        size: 11,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const bDesc = inkText(this.scene, colW / 2 - 10, -8, bucket.desc, {
        size: 10,
        color: InkText.ink,
        originX: 1,
        originY: 0.5
      })

      const bNote = inkText(this.scene, -colW / 2 + 10, 9, `细则: ${bucket.notes}`, {
        size: 9.5,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      card.add([bg, bName, bDesc, bNote])
      this.contentContainer.add(card)
    })

    // 实战数值演算看板（以关羽斩击为例）
    const exampleY = currentY + 3 * (rowH + 5) + 32
    const exContainer = this.scene.add.container(0, exampleY)

    const exBg = this.scene.add.graphics()
    exBg.fillStyle(InkColor.paperDeep, 0.96)
    exBg.fillRoundedRect(-cardW / 2, -30, cardW, 60, 5)
    exBg.lineStyle(1.2, 0x8a6230, 0.75)
    exBg.strokeRoundedRect(-cardW / 2, -30, cardW, 60, 5)

    const exTitle = inkText(this.scene, -cardW / 2 + 14, -18, `【${DAMAGE_FORMULA_GUIDE.example.title}】`, {
      size: 11,
      color: '#8a6230',
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const exCond = inkText(this.scene, -cardW / 2 + 14, -3, DAMAGE_FORMULA_GUIDE.example.conditions, {
      size: 10,
      color: InkText.ink,
      originX: 0,
      originY: 0.5
    })

    const exSteps = inkText(
      this.scene,
      -cardW / 2 + 14,
      14,
      `${DAMAGE_FORMULA_GUIDE.example.step1}  ➜  ${DAMAGE_FORMULA_GUIDE.example.step2}  ➜  ${DAMAGE_FORMULA_GUIDE.example.step3}  ➜  ${DAMAGE_FORMULA_GUIDE.example.step4}`,
      {
        size: 10,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      }
    )

    exContainer.add([exBg, exTitle, exCond, exSteps])
    this.contentContainer.add(exContainer)

    // 底栏两大铁律高光框
    const rulesY = exampleY + 58
    const rulesContainer = this.scene.add.container(0, rulesY)
    const ruleBoxW = (cardW - 12) / 2
    const ruleH = 50

    // 铁律 1: 局外保底
    const r1Bg = this.scene.add.graphics()
    r1Bg.fillStyle(InkColor.paperPanel, 0.95)
    r1Bg.fillRoundedRect(-cardW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)
    r1Bg.lineStyle(1.1, InkColor.cinnabar, 0.7)
    r1Bg.strokeRoundedRect(-cardW / 2, -ruleH / 2, ruleBoxW, ruleH, 4)

    const r1Title = inkText(this.scene, -cardW / 2 + 12, -12, '铁律 ① 局外上限 ≤ +50%', {
      size: 11,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const r1Desc = inkText(
      this.scene,
      -cardW / 2 + 12,
      9,
      '局外武将/神兵/宝石累加总增益严控在 +50% 以内，彻底杜绝局外养成数值碾压关卡。',
      { size: 9.5, color: InkText.ink, originX: 0, originY: 0.5 }
    )
    rulesContainer.add([r1Bg, r1Title, r1Desc])

    // 铁律 2: 抗性保底
    const r2Bg = this.scene.add.graphics()
    r2Bg.fillStyle(InkColor.paperPanel, 0.95)
    r2Bg.fillRoundedRect(6, -ruleH / 2, ruleBoxW, ruleH, 4)
    r2Bg.lineStyle(1.1, InkColor.ink, 0.7)
    r2Bg.strokeRoundedRect(6, -ruleH / 2, ruleBoxW, ruleH, 4)

    const r2Title = inkText(this.scene, 18, -12, '铁律 ② 抗性下限保底 ≥ 40%', {
      size: 11,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const r2Desc = inkText(
      this.scene,
      18,
      9,
      '敌军防御、韧性与刚毅无论经何种削减，最终生效值绝不低于初始 40%，守住战役底线。',
      { size: 9.5, color: InkText.ink, originX: 0, originY: 0.5 }
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
