import Phaser from 'phaser'
import { WuXing } from '@/types'
import { InkColor, InkText, inkText } from '@/ui/InkTheme'
import { SoundFX } from '@/effects/SoundFX'
import { ELEMENT_STATUS_LIST, WUXING_PALETTE, WuXingColorSet } from '@/data/mechanics'

export interface InteractiveWuxingDiagramOptions {
  radius?: number
  nodeRadius?: number
  initialElement?: WuXing | null
  onSelect?: (element: WuXing | null) => void
  showLabels?: boolean
}

interface NodeData {
  element: WuXing
  angleDeg: number
  x: number
  y: number
  char: string
  sealChar: string
  counterTag: string
  palette: WuXingColorSet
  container: Phaser.GameObjects.Container
  discGraphics: Phaser.GameObjects.Graphics
  haloGraphics: Phaser.GameObjects.Graphics
  charText: Phaser.GameObjects.Text
  badgeText: Phaser.GameObjects.Text
  labelContainer: Phaser.GameObjects.Container
}

interface ArcData {
  from: WuXing
  to: WuXing
  name: string
  tag: string
  startDeg: number
  endDeg: number
  midDeg: number
  graphics: Phaser.GameObjects.Graphics
  labelObj: Phaser.GameObjects.Text
  labelBg: Phaser.GameObjects.Graphics
  midX: number
  midY: number
}

/**
 * 矢量可交互五行相生相克图组件
 *
 * 1. 严格对应《三国五行塔防》核心五行状态（与具体武将完全解耦，纯粹底层机制）：
 *    - 金：【裂】(破甲真伤 · 削弱防御)
 *    - 水：【湿】(减速软控 · 延缓行军)
 *    - 木：【毒】(最大生命百分比腐蚀 · 禁疗)
 *    - 火：【灼】(极攻直伤 · 阵亡爆燃)
 *    - 土：【重】(剥离韧性与刚毅 · 暴击内震)
 * 2. 顺时针完整呈现 5 大五行相生化学连锁：
 *    - 金生水【寒芒·碎冰】、水生木【滋养·蔓延】、木生火【燎原·焚尽】、火生土【熔岩·焦土】、土生金【淬刃·锋芒】；
 * 3. 彻底修复土生金 (earth -> metal) 弧线与标签定位，全弧线闭环饱满；
 * 4. 采用高对比度明艳古典调色板，各框线鲜明大气。
 */
export class InteractiveWuxingDiagram extends Phaser.GameObjects.Container {
  private radius: number
  private nodeRadius: number
  private onSelectCallback?: (element: WuXing | null) => void
  private selectedElement: WuXing | null = null

  private nodes: Map<WuXing, NodeData> = new Map()
  private arcs: ArcData[] = []
  private centerContainer!: Phaser.GameObjects.Container
  private centerBg!: Phaser.GameObjects.Graphics
  private centerTitle!: Phaser.GameObjects.Text
  private centerSub!: Phaser.GameObjects.Text
  private centerHint!: Phaser.GameObjects.Text
  private pulseTween?: Phaser.Tweens.Tween

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: InteractiveWuxingDiagramOptions = {}
  ) {
    super(scene, x, y)
    this.radius = options.radius ?? 125
    this.nodeRadius = options.nodeRadius ?? 25
    this.onSelectCallback = options.onSelect
    this.selectedElement = options.initialElement ?? null

    this.createBackground()
    this.createArcs()
    this.createNodes()
    this.createCenter()

    // 默认初始选中态
    if (this.selectedElement) {
      this.applySelection(this.selectedElement, false)
    }

    scene.add.existing(this)
  }

  /**
   * 绘制太极暗纹底盘与双层生克环线
   */
  private createBackground(): void {
    const bg = this.scene.add.graphics()
    // 外圈太极微晕
    bg.lineStyle(1.4, InkColor.inkFaint, 0.45)
    bg.strokeCircle(0, 0, this.radius + this.nodeRadius + 14)

    // 相生环基准明艳虚线
    bg.lineStyle(1.8, 0xa0855b, 0.6)
    bg.strokeCircle(0, 0, this.radius)

    // 内环微韵虚线
    bg.lineStyle(1.2, InkColor.inkFaint, 0.35)
    bg.strokeCircle(0, 0, this.radius * 0.55)

    this.add(bg)
  }

  /**
   * 创建五大相生圆弧连线
   * 顺序：金(270°) -> 水(342°) -> 木(54°) -> 火(126°) -> 土(198°) -> 金(270°)
   * 彻底解决土生金角度跨越负角度导致的标签移位与画弧反向问题！
   */
  private createArcs(): void {
    const arcConfigs: Array<{
      from: WuXing
      to: WuXing
      name: string
      tag: string
      startDeg: number
      endDeg: number
    }> = [
      { from: 'metal', to: 'water', name: '寒芒·碎冰', tag: '冰封真伤', startDeg: 270, endDeg: 342 },
      { from: 'water', to: 'wood',  name: '滋养·蔓延', tag: '藤蔓定身', startDeg: 342, endDeg: 414 },
      { from: 'wood',  to: 'fire',  name: '燎原·焚尽', tag: '生命引爆', startDeg: 54,  endDeg: 126 },
      { from: 'fire',  to: 'earth', name: '熔岩·焦土', tag: '削韧焦土', startDeg: 126, endDeg: 198 },
      { from: 'earth', to: 'metal', name: '淬刃·锋芒', tag: '高暴剑气', startDeg: 198, endDeg: 270 }
    ]

    arcConfigs.forEach((cfg) => {
      const g = this.scene.add.graphics()
      this.add(g)

      const midDeg = (cfg.startDeg + cfg.endDeg) / 2
      const midRad = Phaser.Math.DegToRad(midDeg)

      // 弧线中点向外略微凸出
      const arcMidR = this.radius * 1.02
      const midX = Math.cos(midRad) * arcMidR
      const midY = Math.sin(midRad) * arcMidR

      // 文本底衬小牌
      const labelBg = this.scene.add.graphics()
      const labelObj = inkText(this.scene, midX, midY, cfg.name, {
        size: 10,
        color: InkText.wash,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      this.add(labelBg)
      this.add(labelObj)

      this.arcs.push({
        from: cfg.from,
        to: cfg.to,
        name: cfg.name,
        tag: cfg.tag,
        startDeg: cfg.startDeg,
        endDeg: cfg.endDeg,
        midDeg,
        graphics: g,
        labelObj,
        labelBg,
        midX,
        midY
      })
    })

    this.renderArcs()
  }

  /**
   * 绘制/重绘相生圆弧
   */
  private renderArcs(): void {
    this.arcs.forEach((arc) => {
      const g = arc.graphics
      g.clear()

      const isRelated = this.selectedElement !== null && (arc.from === this.selectedElement || arc.to === this.selectedElement)
      const isUnfocused = this.selectedElement !== null && !isRelated

      const fromPal = WUXING_PALETTE[arc.from]
      const toPal = WUXING_PALETTE[arc.to]

      const lineWidth = isRelated ? 3.6 : 2.0
      const strokeColor = isRelated ? fromPal.border : 0x7c7365
      const alpha = isUnfocused ? 0.2 : (isRelated ? 1.0 : 0.75)

      g.lineStyle(lineWidth, strokeColor, alpha)

      // 绘制顺时针相生圆弧
      const startRad = Phaser.Math.DegToRad(arc.startDeg + 18)
      const endRad = Phaser.Math.DegToRad(arc.endDeg - 18)

      g.beginPath()
      g.arc(0, 0, this.radius, startRad, endRad, false)
      g.strokePath()

      // 箭头指示（沿切线方向指向终点）
      const arrowX = Math.cos(endRad) * this.radius
      const arrowY = Math.sin(endRad) * this.radius
      const tanAngle = endRad + Math.PI / 2
      const arrowLen = isRelated ? 8.5 : 6.5

      g.fillStyle(strokeColor, alpha)
      g.fillTriangle(
        arrowX,
        arrowY,
        arrowX - Math.cos(tanAngle - 0.45) * arrowLen,
        arrowY - Math.sin(tanAngle - 0.45) * arrowLen,
        arrowX - Math.cos(tanAngle + 0.45) * arrowLen,
        arrowY - Math.sin(tanAngle + 0.45) * arrowLen
      )

      // 标签底衬与边框颜色（鲜艳好看）
      arc.labelBg.clear()
      if (isRelated) {
        arc.labelBg.fillStyle(toPal.fill, 0.98)
        arc.labelBg.fillRoundedRect(arc.midX - 28, arc.midY - 8, 56, 16, 4)
        arc.labelBg.lineStyle(1.4, toPal.border, 0.95)
        arc.labelBg.strokeRoundedRect(arc.midX - 28, arc.midY - 8, 56, 16, 4)
        arc.labelObj.setColor(toPal.hex)
        arc.labelObj.setAlpha(1)
      } else {
        arc.labelBg.fillStyle(0xece3d2, 0.88)
        arc.labelBg.fillRoundedRect(arc.midX - 26, arc.midY - 7, 52, 14, 3)
        arc.labelBg.lineStyle(1.0, 0xb0a38d, 0.6)
        arc.labelBg.strokeRoundedRect(arc.midX - 26, arc.midY - 7, 52, 14, 3)
        arc.labelObj.setColor(InkText.wash)
        arc.labelObj.setAlpha(isUnfocused ? 0.35 : 0.85)
      }
    })
  }

  /**
   * 创建五行节点（完全与武将解耦，纯粹展示五行元素与克制属性）
   */
  private createNodes(): void {
    const elementDefs: Array<{
      element: WuXing
      angleDeg: number
      char: string
      sealChar: string
      counterTag: string
      offsetLabel: { x: number; y: number; originX: number }
    }> = [
      {
        element: 'metal',
        angleDeg: 270,
        char: '金',
        sealChar: '裂',
        counterTag: '专克防御 · 真伤',
        offsetLabel: { x: 0, y: -this.nodeRadius - 15, originX: 0.5 }
      },
      {
        element: 'water',
        angleDeg: 342,
        char: '水',
        sealChar: '湿',
        counterTag: '专克移速 · 软控',
        offsetLabel: { x: this.nodeRadius + 8, y: 0, originX: 0 }
      },
      {
        element: 'wood',
        angleDeg: 54,
        char: '木',
        sealChar: '毒',
        counterTag: '专克生命 · 禁疗',
        offsetLabel: { x: this.nodeRadius + 6, y: 12, originX: 0 }
      },
      {
        element: 'fire',
        angleDeg: 126,
        char: '火',
        sealChar: '灼',
        counterTag: '极攻直伤 · 爆燃',
        offsetLabel: { x: -this.nodeRadius - 6, y: 12, originX: 1 }
      },
      {
        element: 'earth',
        angleDeg: 198,
        char: '土',
        sealChar: '重',
        counterTag: '专克反暴 · 内震',
        offsetLabel: { x: -this.nodeRadius - 8, y: 0, originX: 1 }
      }
    ]

    elementDefs.forEach((def) => {
      const rad = Phaser.Math.DegToRad(def.angleDeg)
      const x = Math.cos(rad) * this.radius
      const y = Math.sin(rad) * this.radius

      const pal = WUXING_PALETTE[def.element]
      const container = this.scene.add.container(x, y)

      // 选中发光光晕
      const haloGraphics = this.scene.add.graphics()
      container.add(haloGraphics)

      // 节点圆盘
      const discGraphics = this.scene.add.graphics()
      container.add(discGraphics)

      // 主字（金/木/水/火/土）
      const charText = inkText(this.scene, 0, -5, def.char, {
        size: 19,
        color: pal.hex,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      container.add(charText)

      // 状态印章徽标【裂/毒/湿/灼/重】
      const badgeText = inkText(this.scene, 0, 11, `【${def.sealChar}】`, {
        size: 10.5,
        color: pal.hex,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      container.add(badgeText)

      // 节点外围标签容器（展示：五行法印 · 专克目标）
      const labelContainer = this.scene.add.container(def.offsetLabel.x, def.offsetLabel.y)

      const headerText = inkText(this.scene, 0, -8, `${def.char} · ${def.sealChar}`, {
        size: 11.5,
        color: pal.hex,
        bold: true,
        originX: def.offsetLabel.originX,
        originY: 0.5
      })
      labelContainer.add(headerText)

      const counterText = inkText(this.scene, 0, 7, def.counterTag, {
        size: 9.5,
        color: InkText.wash,
        bold: true,
        originX: def.offsetLabel.originX,
        originY: 0.5
      })
      labelContainer.add(counterText)

      container.add(labelContainer)

      // 交互绑定：设置圆盘命中检测
      discGraphics.setInteractive(
        new Phaser.Geom.Circle(0, 0, this.nodeRadius + 4),
        Phaser.Geom.Circle.Contains
      )

      discGraphics.on('pointerover', () => {
        this.scene.input.setDefaultCursor('pointer')
        this.scene.tweens.add({
          targets: container,
          scale: 1.1,
          duration: 120,
          ease: 'Cubic.easeOut'
        })
      })

      discGraphics.on('pointerout', () => {
        this.scene.input.setDefaultCursor('default')
        this.scene.tweens.add({
          targets: container,
          scale: 1.0,
          duration: 120,
          ease: 'Cubic.easeOut'
        })
      })

      discGraphics.on('pointerdown', () => {
        SoundFX.stamp(0.4)
        if (this.selectedElement === def.element) {
          // 点击已选中的节点时切换回全部概览
          this.selectElement(null, true)
        } else {
          this.selectElement(def.element, true)
        }
      })

      this.nodes.set(def.element, {
        element: def.element,
        angleDeg: def.angleDeg,
        x,
        y,
        char: def.char,
        sealChar: def.sealChar,
        counterTag: def.counterTag,
        palette: pal,
        container,
        discGraphics,
        haloGraphics,
        charText,
        badgeText,
        labelContainer
      })

      this.add(container)
    })

    this.renderNodes()
  }

  /**
   * 绘制节点常态与选中态（高级明艳边框）
   */
  private renderNodes(): void {
    this.nodes.forEach((node) => {
      const isSelected = this.selectedElement === node.element
      const isUnfocused = this.selectedElement !== null && !isSelected

      const pal = node.palette

      // 1. 发光外光晕
      node.haloGraphics.clear()
      if (isSelected) {
        node.haloGraphics.lineStyle(4, pal.border, 0.95)
        node.haloGraphics.strokeCircle(0, 0, this.nodeRadius + 7)
        node.haloGraphics.fillStyle(pal.glow, 0.35)
        node.haloGraphics.fillCircle(0, 0, this.nodeRadius + 7)
      }

      // 2. 节点圆盘（外框好看的颜色加回来！）
      node.discGraphics.clear()
      const fillColor = isSelected ? pal.lightBg : pal.fill
      const strokeColor = isSelected ? pal.border : pal.border
      const strokeWidth = isSelected ? 3.0 : 2.2

      node.discGraphics.fillStyle(fillColor, isUnfocused ? 0.6 : 0.98)
      node.discGraphics.fillCircle(0, 0, this.nodeRadius)

      // 内外双线精美边框
      node.discGraphics.lineStyle(strokeWidth, strokeColor, isUnfocused ? 0.45 : 0.95)
      node.discGraphics.strokeCircle(0, 0, this.nodeRadius)
      node.discGraphics.lineStyle(1.0, 0xffffff, isUnfocused ? 0.3 : 0.7)
      node.discGraphics.strokeCircle(0, 0, this.nodeRadius - 2.5)

      // 3. 标签与字样透明度
      const alpha = isUnfocused ? 0.45 : 1.0
      node.charText.setAlpha(alpha)
      node.badgeText.setAlpha(alpha)
      node.labelContainer.setAlpha(isUnfocused ? 0.35 : 1.0)
    })
  }

  /**
   * 创建中枢指示台
   */
  private createCenter(): void {
    this.centerContainer = this.scene.add.container(0, 0)

    this.centerBg = this.scene.add.graphics()
    this.centerBg.fillStyle(InkColor.paperPanel, 0.95)
    this.centerBg.fillCircle(0, 0, this.radius * 0.38)
    this.centerBg.lineStyle(1.6, 0x9a856a, 0.65)
    this.centerBg.strokeCircle(0, 0, this.radius * 0.38)
    this.centerBg.lineStyle(1.0, 0xd4af37, 0.45)
    this.centerBg.strokeCircle(0, 0, this.radius * 0.38 - 3)

    this.centerTitle = inkText(this.scene, 0, -14, '五行相生', {
      size: 13,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    this.centerSub = inkText(this.scene, 0, 2, '点击各行法印', {
      size: 10,
      color: InkText.wash,
      originX: 0.5,
      originY: 0.5
    })

    this.centerHint = inkText(this.scene, 0, 16, '探寻相生奇谋', {
      size: 9,
      color: InkText.faint,
      originX: 0.5,
      originY: 0.5
    })

    this.centerContainer.add(this.centerBg)
    this.centerContainer.add(this.centerTitle)
    this.centerContainer.add(this.centerSub)
    this.centerContainer.add(this.centerHint)

    this.centerBg.setInteractive(
      new Phaser.Geom.Circle(0, 0, this.radius * 0.38),
      Phaser.Geom.Circle.Contains
    )
    this.centerBg.on('pointerdown', () => {
      if (this.selectedElement !== null) {
        SoundFX.stamp(0.3)
        this.selectElement(null, true)
      }
    })

    this.add(this.centerContainer)
  }

  /**
   * 应用选中态并刷新组件视图
   */
  private applySelection(element: WuXing | null, triggerCallback = true): void {
    this.selectedElement = element
    this.renderArcs()
    this.renderNodes()

    if (element) {
      const node = this.nodes.get(element)!
      this.centerTitle.setText(`【${node.char} · ${node.sealChar}】`)
      this.centerTitle.setColor(node.palette.hex)
      this.centerSub.setText(node.counterTag)
      this.centerSub.setColor(node.palette.hex)
      this.centerHint.setText('点击中心还原')

      if (this.pulseTween) {
        this.pulseTween.stop()
      }
      this.pulseTween = this.scene.tweens.add({
        targets: node.haloGraphics,
        alpha: { from: 0.65, to: 1.0 },
        scaleX: { from: 0.98, to: 1.05 },
        scaleY: { from: 0.98, to: 1.05 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    } else {
      if (this.pulseTween) {
        this.pulseTween.stop()
        this.pulseTween = undefined
      }
      this.centerTitle.setText('五行相生')
      this.centerTitle.setColor(InkText.strong)
      this.centerSub.setText('点击各行法印')
      this.centerSub.setColor(InkText.wash)
      this.centerHint.setText('探寻相生奇谋')
    }

    if (triggerCallback && this.onSelectCallback) {
      this.onSelectCallback(element)
    }
  }

  public selectElement(element: WuXing | null, triggerCallback = true): void {
    this.applySelection(element, triggerCallback)
  }

  public getSelectedElement(): WuXing | null {
    return this.selectedElement
  }

  public destroy(fromScene?: boolean): void {
    if (this.pulseTween) {
      this.pulseTween.stop()
    }
    super.destroy(fromScene)
  }
}
