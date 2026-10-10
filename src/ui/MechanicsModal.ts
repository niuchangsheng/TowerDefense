import Phaser from 'phaser'
import { WuXing } from '@/types'
import {
  InkColor,
  InkText,
  inkText,
  createInkButton,
  InkDepth
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
 * 【乾坤经纬】底层机制速查弹窗
 * 可在战斗中直接呼出（自动拦截交互，查阅后一键闭卷返回），也可在独立场景复用。
 * 包含双主翼选项卡：
 * 1. 【五行相生】(wuxing)：纯粹五行状态与双向相生连锁体系（左矢量图 + 右综合/聚焦卡片）
 * 2. 【乾坤算法】(damage)：四乘区端到端总公式 + 7 步细化结算与面板映射 + 属性对冲机制 + 底层铁律
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
    this.currentTab = initialTab === 'damage' ? 'damage' : 'wuxing'
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
    cornersG.moveTo(bx + bw, by + bh - clen).lineTo(bx + bw, by).lineTo(bx + bw - clen, by + bh)
    cornersG.strokePath()
    this.add(cornersG)

    // 3. 卷首标题
    this.createHeader(panelX, panelTop + 32)

    // 4. 双选项卡 Tab
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

    const subTxt = inkText(this.scene, x + 100, y + 1, '相生连锁 · 四乘区算法 · 7步结算面板映射', {
      size: 11,
      color: InkText.faint,
      originX: 0,
      originY: 0.5
    })

    this.add([seal, sealTxt, titleTxt, subTxt])
  }

  /**
   * 水墨 Tab 切换器（【五行相生】与【乾坤算法】）
   */
  private createTabs(x: number, y: number): void {
    const tabW = 260
    const gap = 20
    const totalW = tabW * MECHANICS_TABS.length + gap * (MECHANICS_TABS.length - 1)
    const startX = x - totalW / 2 + tabW / 2

    MECHANICS_TABS.forEach((tabDef, index) => {
      const tabX = startX + index * (tabW + gap)
      const container = this.scene.add.container(tabX, y)

      const bg = this.scene.add.graphics()
      container.add(bg)

      const renderTab = () => {
        bg.clear()
        const isSelected = this.currentTab === tabDef.key
        const fillColor = isSelected ? InkColor.paperDeep : InkColor.paperPanel
        const strokeColor = isSelected ? InkColor.cinnabar : InkColor.ink

        bg.fillStyle(fillColor, 0.95)
        bg.fillRoundedRect(-tabW / 2, -16, tabW, 32, 4)

        bg.lineStyle(isSelected ? 1.8 : 1.1, strokeColor, isSelected ? 0.9 : 0.45)
        bg.strokeRoundedRect(-tabW / 2, -16, tabW, 32, 4)

        // 徽标小方印
        bg.fillStyle(isSelected ? InkColor.cinnabar : InkColor.ink, isSelected ? 0.95 : 0.35)
        bg.fillRoundedRect(-tabW / 2 + 8, -8, 16, 16, 2)
      }

      renderTab()

      const sealChar = inkText(this.scene, -tabW / 2 + 16, 0, tabDef.seal, {
        size: 10,
        color: '#ffffff',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      const titleTxt = inkText(this.scene, -tabW / 2 + 32, -1, tabDef.title, {
        size: 13,
        color: this.currentTab === tabDef.key ? InkText.cinnabar : InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const subTxt = inkText(this.scene, -tabW / 2 + 96, 0, tabDef.subtitle, {
        size: 9,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      container.add([sealChar, titleTxt, subTxt])

      // 交互
      const hitArea = new Phaser.Geom.Rectangle(-tabW / 2, -16, tabW, 32)
      bg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
      bg.on('pointerover', () => {
        if (this.currentTab !== tabDef.key) {
          bg.lineStyle(1.4, InkColor.cinnabar, 0.7)
          bg.strokeRoundedRect(-tabW / 2, -16, tabW, 32, 4)
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
      this.add(container)
    })
  }

  private refreshTabs(): void {
    const tabW = 260
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
      bg.fillRoundedRect(-tabW / 2, -16, tabW, 32, 4)

      bg.lineStyle(isSelected ? 1.8 : 1.1, strokeColor, isSelected ? 0.9 : 0.45)
      bg.strokeRoundedRect(-tabW / 2, -16, tabW, 32, 4)

      bg.fillStyle(isSelected ? InkColor.cinnabar : InkColor.ink, isSelected ? 0.95 : 0.35)
      bg.fillRoundedRect(-tabW / 2 + 8, -8, 16, 16, 2)

      titleTxt.setColor(isSelected ? InkText.cinnabar : InkText.strong)
    })
  }

  private renderCurrentTabContent(): void {
    this.contentContainer.removeAll(true)

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
    const container = this.scene.add.container(x, y)

    const bg = this.scene.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.96)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6)
    bg.lineStyle(1.8, 0x8d5b28, 0.8)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6)
    bg.lineStyle(1.0, 0xd4af37, 0.5)
    bg.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 5)
    container.add(bg)

    const title = inkText(this.scene, 0, -h / 2 + 18, '【五行相生命脉图】', {
      size: 13,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const sub = inkText(this.scene, 0, -h / 2 + 34, '点击各行法印 · 联动展开状态与双向相生', {
      size: 9.5,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    container.add([title, sub])

    const diagram = new InteractiveWuxingDiagram(this.scene, 0, 14, {
      radius: 104,
      nodeRadius: 21,
      initialElement: this.selectedElement,
      onSelect
    })
    container.add(diagram)

    const footNoteBg = this.scene.add.rectangle(0, h / 2 - 16, w - 12, 22, InkColor.paperDeep, 0.9)
    footNoteBg.setStrokeStyle(1, 0xa0782f, 0.35)
    const footNote = inkText(
      this.scene,
      0,
      h / 2 - 16,
      '2.5s附着 · 1.5s ICD · 160px阵脉+35% · 相生不抹除',
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
    const startY = 6

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

          // 左侧五行徽印
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

          const title = inkText(this.scene, -rightCardW / 2 + 62, -14, item.name, {
            size: 14,
            color: pal.hex,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const targetTag = inkText(this.scene, -rightCardW / 2 + 225, -14, `【专克：${item.targetStat}】`, {
            size: 11.5,
            color: InkText.cinnabar,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const durationTag = inkText(this.scene, rightCardW / 2 - 14, -14, `附着: ${item.duration}`, {
            size: 11,
            color: InkText.faint,
            originX: 1,
            originY: 0.5
          })

          const summary = inkText(this.scene, -rightCardW / 2 + 62, 5, item.summary, {
            size: 11,
            color: InkText.ink,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const rxBadge1 = inkText(this.scene, -rightCardW / 2 + 62, 22, `【生我】${detail.generatedBy.relationLabel} · ${detail.generatedBy.reaction.name}`, {
            size: 10,
            color: WUXING_PALETTE[detail.generatedBy.partnerElement].hex,
            bold: true,
            originX: 0,
            originY: 0.5
          })

          const rxBadge2 = inkText(this.scene, -rightCardW / 2 + 310, 22, `【我生】${detail.generates.relationLabel} · ${detail.generates.reaction.name}`, {
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

    const title1 = inkText(this.scene, -cardW / 2 + 68, -36, detail.status.name, {
      size: 15,
      color: pal.hex,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const targetBadge = inkText(this.scene, -cardW / 2 + 240, -36, `【专克：${detail.status.targetStat}】`, {
      size: 12,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const durTag = inkText(
      this.scene,
      cardW / 2 - 14,
      -36,
      `附着时长：${detail.status.duration}`,
      { size: 11, color: InkText.faint, originX: 1, originY: 0.5 }
    )

    const summary1 = inkText(this.scene, -cardW / 2 + 14, 6, `核心效果：${detail.status.summary}`, {
      size: 11.5,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const detailsStr = detail.status.details.slice(0, 2).join(' ｜ ')
    const details1 = inkText(this.scene, -cardW / 2 + 14, 26, detailsStr, {
      size: 10.5,
      color: InkText.wash,
      originX: 0,
      originY: 0.5
    })

    const ruleText = inkText(this.scene, -cardW / 2 + 14, 44, `● 机制铁律：${detail.status.rules.join('  ● ')}`, {
      size: 10.5,
      color: '#8a6230',
      bold: true,
      originX: 0,
      originY: 0.5
    })

    card1.add([sealChar, title1, targetBadge, durTag, summary1, details1, ruleText])
    parent.add(card1)

    // 2. 对应相生状态卡片（生我 & 我生） (y: 204, h: 156)
    const card2 = this.scene.add.container(0, 204)
    const bg2 = this.scene.add.graphics()
    bg2.fillStyle(InkColor.paperPanel, 0.95)
    bg2.fillRoundedRect(-cardW / 2, -78, cardW, 156, 5)
    bg2.lineStyle(1.4, 0xa0782f, 0.75)
    bg2.strokeRoundedRect(-cardW / 2, -78, cardW, 156, 5)
    card2.add(bg2)

    const title2 = inkText(
      this.scene,
      -cardW / 2 + 14,
      -64,
      '【对应双向相生化学连锁】',
      { size: 12, color: '#8a6230', bold: true, originX: 0, originY: 0.5 }
    )
    const sub2 = inkText(
      this.scene,
      cardW / 2 - 14,
      -64,
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
        title: `【生我】${detail.generatedBy.relationLabel} · ${detail.generatedBy.reaction.name}`,
        combo: `触发：【${fromPal.name}】 + 【${pal.name}】`,
        pal: fromPal,
        rx: detail.generatedBy.reaction
      },
      {
        x: cardW / 2 - 12 - halfW / 2,
        title: `【我生】${detail.generates.relationLabel} · ${detail.generates.reaction.name}`,
        combo: `触发：【${pal.name}】 + 【${toPal.name}】`,
        pal: toPal,
        rx: detail.generates.reaction
      }
    ]

    subConfigs.forEach((cfg) => {
      const subBg = this.scene.add.graphics()
      subBg.fillStyle(cfg.pal.fill, 0.98)
      subBg.fillRoundedRect(cfg.x - halfW / 2, -48, halfW, 114, 4)
      subBg.lineStyle(1.3, cfg.pal.border, 0.85)
      subBg.strokeRoundedRect(cfg.x - halfW / 2, -48, halfW, 114, 4)

      const sTitle = inkText(this.scene, cfg.x - halfW / 2 + 8, -34, cfg.title, {
        size: 11,
        color: cfg.rx.textColor,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const sPartner = inkText(this.scene, cfg.x - halfW / 2 + 8, -18, cfg.combo, {
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

      const sIcd = inkText(this.scene, cfg.x - halfW / 2 + 8, 48, `冷却：${cfg.rx.icd}`, {
        size: 9,
        color: InkText.faint,
        originX: 0,
        originY: 0.5
      })

      card2.add([subBg, sTitle, sPartner, sType, sSummary, sIcd])
    })

    parent.add(card2)

    // 3. 底部规则要点 (y: 308, h: 42)
    const card3 = this.scene.add.container(0, 308)
    const bg3 = this.scene.add.graphics()
    bg3.fillStyle(InkColor.paperPanel, 0.92)
    bg3.fillRoundedRect(-cardW / 2, -21, cardW, 42, 4)
    bg3.lineStyle(1.1, InkColor.ink, 0.35)
    bg3.strokeRoundedRect(-cardW / 2, -21, cardW, 42, 4)
    card3.add(bg3)

    const rule1 = inkText(
      this.scene,
      -cardW / 2 + 12,
      -8,
      '◆ 160px相生阵脉：两将距离 ≤ 160px 生成墨线，优先锁定搭档，衰减延缓30%，反应威力+35%！',
      { size: 9.5, color: InkText.wash, originX: 0, originY: 0.5 }
    )
    const rule2 = inkText(
      this.scene,
      -cardW / 2 + 12,
      9,
      '◆ 相生共鸣取优：伤害基数取双将最高攻击力 + 另一将 25% 协同攻击，杜绝低攻散兵降伤！',
      { size: 9.5, color: InkText.wash, originX: 0, originY: 0.5 }
    )
    card3.add([rule1, rule2])
    parent.add(card3)

    // 4. 底部快捷操作栏 (y: 352, h: 28)
    const bar = this.scene.add.container(0, 352)
    const allBtn = this.scene.add.container(-cardW / 2 + 48, 0)
    const allBg = this.scene.add.graphics()
    allBg.fillStyle(InkColor.paperDeep, 0.95)
    allBg.fillRoundedRect(-42, -12, 84, 24, 3)
    allBg.lineStyle(1.2, InkColor.ink, 0.6)
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
      const btnX = -cardW / 2 + 104 + idx * 102 + 48
      const pill = this.scene.add.container(btnX, 0)
      const elPal = WUXING_PALETTE[el.key]
      const isSel = el.key === detail.element

      const pBg = this.scene.add.graphics()
      pBg.fillStyle(isSel ? elPal.border : elPal.fill, 0.95)
      pBg.fillRoundedRect(-46, -12, 92, 24, 3)
      pBg.lineStyle(1.3, elPal.border, isSel ? 1.0 : 0.65)
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

  // ==================== 2. 乾坤算法（流水线卡片矩阵：清晰端到端结算） ====================
  private renderDamageContent(): void {
    const cardW = this.contentW
    const startY = 2

    // 1. 顶部总公式流水线横幅
    const formulaContainer = this.scene.add.container(0, startY + 16)
    const formulaBg = this.scene.add.graphics()
    formulaBg.fillStyle(InkColor.paperPanel, 0.98)
    formulaBg.fillRoundedRect(-cardW / 2, -16, cardW, 32, 4)
    formulaBg.lineStyle(1.5, InkColor.cinnabar, 0.85)
    formulaBg.strokeRoundedRect(-cardW / 2, -16, cardW, 32, 4)

    const fTitle = inkText(this.scene, -cardW / 2 + 12, 0, '【总公式】', {
      size: 11.5,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })

    const formulaTxt = inkText(
      this.scene,
      -cardW / 2 + 76,
      0,
      '最终伤害 = [① 基础基数] × [② 攻击乘区] × [③ 增伤乘区] × [④ 易伤乘区] × [⑤ 暴击对抗] × [⑥ 护甲折算]',
      {
        size: 10.5,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      }
    )

    const fNotice = inkText(this.scene, cardW / 2 - 12, 0, '六步严格乘算 · 真伤直接跳过护甲', {
      size: 10,
      color: InkText.faint,
      originX: 1,
      originY: 0.5
    })

    formulaContainer.add([formulaBg, fTitle, formulaTxt, fNotice])
    this.contentContainer.add(formulaContainer)

    // 2. 中层：6 大结算因子卡片（3 列 × 2 行 工整流水线网格）
    const gridY = startY + 38
    const gapX = 10
    const gapY = 8
    const colW = (cardW - gapX * 2) / 3
    const cellH = 108

    DAMAGE_PIPELINE_CARDS.forEach((card, idx) => {
      const col = idx % 3
      const row = Math.floor(idx / 3)
      const cx = -cardW / 2 + colW / 2 + col * (colW + gapX)
      const cy = gridY + cellH / 2 + row * (cellH + gapY)
      const cell = this.scene.add.container(cx, cy)

      // 卡片底板
      const bg = this.scene.add.graphics()
      bg.fillStyle(InkColor.paperPanel, 0.96)
      bg.fillRoundedRect(-colW / 2, -cellH / 2, colW, cellH, 4)
      bg.lineStyle(1.4, card.color, 0.85)
      bg.strokeRoundedRect(-colW / 2, -cellH / 2, colW, cellH, 4)
      cell.add(bg)

      // 标头行
      const badge = this.scene.add.graphics()
      badge.fillStyle(card.color, 0.95)
      badge.fillRoundedRect(-colW / 2 + 8, -cellH / 2 + 7, 68, 18, 3)
      cell.add(badge)

      const badgeTxt = inkText(this.scene, -colW / 2 + 42, -cellH / 2 + 16, card.stepBadge, {
        size: 9.5,
        color: '#ffffff',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      const titleTxt = inkText(this.scene, -colW / 2 + 80, -cellH / 2 + 16, card.title, {
        size: 11,
        color: card.textColor,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      const panelTxt = inkText(this.scene, colW / 2 - 8, -cellH / 2 + 16, card.panelLabel, {
        size: 9,
        color: InkText.faint,
        originX: 1,
        originY: 0.5
      })

      // 公式槽
      const fBox = this.scene.add.graphics()
      fBox.fillStyle(InkColor.paperDeep, 0.9)
      fBox.fillRoundedRect(-colW / 2 + 8, -cellH / 2 + 29, colW - 16, 20, 2)
      cell.add(fBox)

      const formTxt = inkText(this.scene, -colW / 2 + 12, -cellH / 2 + 39, `● 算法: ${card.formula}`, {
        size: 9.5,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })

      // 结算要点
      const p1 = inkText(this.scene, -colW / 2 + 10, -cellH / 2 + 61, card.points[0], {
        size: 9,
        color: InkText.ink,
        originX: 0,
        originY: 0.5
      })

      const p2 = inkText(this.scene, -colW / 2 + 10, -cellH / 2 + 79, card.points[1], {
        size: 9,
        color: InkText.wash,
        originX: 0,
        originY: 0.5
      })

      cell.add([badgeTxt, titleTxt, panelTxt, formTxt, p1, p2])
      this.contentContainer.add(cell)
    })

    // 3. 实战数值推演横向展示框
    const exampleY = gridY + cellH * 2 + gapY + 8
    const exH = 44
    const exContainer = this.scene.add.container(0, exampleY + exH / 2)

    const exBg = this.scene.add.graphics()
    exBg.fillStyle(InkColor.paperPanel, 0.96)
    exBg.fillRoundedRect(-cardW / 2, -exH / 2, cardW, exH, 4)
    exBg.lineStyle(1.3, 0x9e2b25, 0.75)
    exBg.strokeRoundedRect(-cardW / 2, -exH / 2, cardW, exH, 4)
    exContainer.add(exBg)

    const exBadge = this.scene.add.graphics()
    exBadge.fillStyle(0x9e2b25, 0.95)
    exBadge.fillRoundedRect(-cardW / 2 + 8, -exH / 2 + 7, 72, 30, 2)
    exContainer.add(exBadge)

    const exBadgeTxt = inkText(this.scene, -cardW / 2 + 44, 0, '【实战演练】\n数值推导', {
      size: 9,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const exLine1 = inkText(
      this.scene,
      -cardW / 2 + 88,
      -9,
      '关羽战法斩击：180 (①基数) × 1.20 (②攻+20%) × 1.35 (③增+35%) × 1.50 (④易+50%) × 1.50 (⑤暴+50%) = 656.1 原始伤害',
      {
        size: 9,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      }
    )

    const exLine2 = inkText(
      this.scene,
      -cardW / 2 + 88,
      9,
      '破甲与减免联动：未破甲(减免33.3%) → 437 落地伤 ｜ 金·裂破甲35%(减免降至24.5%) → 495 伤 (+13.3%) ｜ 真伤(减免0%) → 656 直穿！',
      {
        size: 8.5,
        color: InkText.cinnabar,
        bold: true,
        originX: 0,
        originY: 0.5
      }
    )

    exContainer.add([exBadgeTxt, exLine1, exLine2])
    this.contentContainer.add(exContainer)

    // 4. 底栏：两大核心数值铁律
    const rulesY = exampleY + exH + 8
    const rulesContainer = this.scene.add.container(0, rulesY)
    const ruleBoxW = cardW / 2 - 6
    const ruleH = 28

    const r1Bg = this.scene.add.graphics()
    r1Bg.fillStyle(InkColor.paperPanel, 0.95)
    r1Bg.fillRoundedRect(-cardW / 2, -ruleH / 2, ruleBoxW, ruleH, 3)
    r1Bg.lineStyle(1.1, InkColor.cinnabar, 0.75)
    r1Bg.strokeRoundedRect(-cardW / 2, -ruleH / 2, ruleBoxW, ruleH, 3)

    const r1Txt = inkText(this.scene, -cardW / 2 + 10, 0, '◆ 铁律 ① 局外上限 ≤ +50%：等级/星级/神兵/宝石累加总增益封顶 +50%，保下限定上限', {
      size: 9,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    rulesContainer.add([r1Bg, r1Txt])

    const r2Bg = this.scene.add.graphics()
    r2Bg.fillStyle(InkColor.paperPanel, 0.95)
    r2Bg.fillRoundedRect(-cardW / 2 + ruleBoxW + 12, -ruleH / 2, ruleBoxW, ruleH, 3)
    r2Bg.lineStyle(1.1, InkColor.ink, 0.75)
    r2Bg.strokeRoundedRect(-cardW / 2 + ruleBoxW + 12, -ruleH / 2, ruleBoxW, ruleH, 3)

    const r2Txt = inkText(this.scene, -cardW / 2 + ruleBoxW + 22, 0, '◆ 铁律 ② 敌方抗性保底 ≥ 40%：防御/韧性/刚毅削减最终值不得低于初始值 40%，严禁木桩', {
      size: 9,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    rulesContainer.add([r2Bg, r2Txt])

    this.contentContainer.add(rulesContainer)
  }

  /**
   * 底部控制栏
   */
  private createFooter(x: number, y: number): void {
    const closeBtn = createInkButton(this.scene, x, y, 120, 32, '闭卷归阵', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb53a32,
      textColor: '#fdfbf7',
      fontSize: 13,
      onClick: () => this.close()
    })
    this.add(closeBtn)

    if (this.onOpenSceneCallback) {
      const openSceneBtn = createInkButton(this.scene, x - 130, y, 100, 32, '全卷图鉴', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 12,
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
