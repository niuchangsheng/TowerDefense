import Phaser from 'phaser'
import { WuXing } from '@/types'
import { InkColor, InkText, INK_WUXING, inkText } from '@/ui/InkTheme'
import { SoundFX } from '@/effects/SoundFX'
import { ELEMENT_STATUS_LIST, ELEMENT_GENERAL_MAP } from '@/data/mechanics'

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
  generalName: string
  counterTag: string
  color: number
  textColor: string
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
  graphics: Phaser.GameObjects.Graphics
  labelObj: Phaser.GameObjects.Text
  labelBg: Phaser.GameObjects.Graphics
  midX: number
  midY: number
}

/**
 * 矢量可交互五行相生相克图组件
 *
 * 1. 严格对应《三国五行塔防》核心五行状态与五虎上将对位：
 *    - 金：【裂】(破甲真伤 · 赵云)
 *    - 水：【湿】(移速软控 · 关羽)
 *    - 木：【毒】(最大生命禁疗 · 黄忠)
 *    - 火：【灼】(极攻爆燃 · 马超)
 *    - 土：【重】(剥离韧刚 · 张飞)
 * 2. 顺时针完整呈现 5 大五行相生化学连锁（寒芒/滋养/燎原/熔岩/淬刃）；
 * 3. 支持点击圆圈高亮选中，与右侧详情面板完全联动！
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
   * 绘制太极暗纹底盘
   */
  private createBackground(): void {
    const bg = this.scene.add.graphics()
    // 外圈太极微晕
    bg.lineStyle(1.2, InkColor.inkFaint, 0.4)
    bg.strokeCircle(0, 0, this.radius + this.nodeRadius + 14)

    // 相生环基准虚线
    bg.lineStyle(1.5, 0x8c8270, 0.5)
    bg.strokeCircle(0, 0, this.radius)

    // 内星虚线（象征五行气运互通）
    bg.lineStyle(1, InkColor.inkFaint, 0.25)
    bg.strokeCircle(0, 0, this.radius * 0.55)

    this.add(bg)
  }

  /**
   * 创建五大相生圆弧连线
   * 顺序：金 -> 水 -> 木 -> 火 -> 土 -> 金
   */
  private createArcs(): void {
    const arcConfigs: Array<{ from: WuXing; to: WuXing; name: string; tag: string }> = [
      { from: 'metal', to: 'water', name: '寒芒·碎冰', tag: '冰封真伤' },
      { from: 'water', to: 'wood',  name: '滋养·蔓延', tag: '藤蔓定身' },
      { from: 'wood',  to: 'fire',  name: '燎原·焚尽', tag: '生命引爆' },
      { from: 'fire',  to: 'earth', name: '熔岩·焦土', tag: '削韧焦土' },
      { from: 'earth', to: 'metal', name: '淬刃·锋芒', tag: '高暴剑气' }
    ]

    const elementAngles: Record<WuXing, number> = {
      metal: -90,
      water: -18,
      wood:  54,
      fire:  126,
      earth: 198
    }

    arcConfigs.forEach((cfg) => {
      const g = this.scene.add.graphics()
      this.add(g)

      const startDeg = elementAngles[cfg.from]
      const endDeg = elementAngles[cfg.to]
      const midDeg = (startDeg + endDeg) / 2
      const midRad = Phaser.Math.DegToRad(midDeg)

      // 弧线中点向外略微凸出，形成饱满水墨圆弧
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
    const elementAngles: Record<WuXing, number> = {
      metal: -90,
      water: -18,
      wood:  54,
      fire:  126,
      earth: 198
    }

    this.arcs.forEach((arc) => {
      const g = arc.graphics
      g.clear()

      // 判定高亮状态：当选中了该弧线的起点或终点时，弧线高亮
      const isRelated = this.selectedElement !== null && (arc.from === this.selectedElement || arc.to === this.selectedElement)
      const isUnfocused = this.selectedElement !== null && !isRelated

      const lineWidth = isRelated ? 3.5 : 1.8
      const strokeColor = isRelated ? 0xc62828 : 0x7c7365
      const alpha = isUnfocused ? 0.2 : (isRelated ? 0.95 : 0.65)

      g.lineStyle(lineWidth, strokeColor, alpha)

      // 绘制相生弧线（从起点顺时针划向终点）
      const startRad = Phaser.Math.DegToRad(elementAngles[arc.from] + 16)
      const endRad = Phaser.Math.DegToRad(elementAngles[arc.to] - 16)

      g.beginPath()
      g.arc(0, 0, this.radius, startRad, endRad, false)
      g.strokePath()

      // 箭头指示
      const arrowX = Math.cos(endRad) * this.radius
      const arrowY = Math.sin(endRad) * this.radius
      const tanAngle = endRad + Math.PI / 2
      const arrowLen = isRelated ? 8 : 6

      g.fillStyle(strokeColor, alpha)
      g.fillTriangle(
        arrowX,
        arrowY,
        arrowX - Math.cos(tanAngle - 0.45) * arrowLen,
        arrowY - Math.sin(tanAngle - 0.45) * arrowLen,
        arrowX - Math.cos(tanAngle + 0.45) * arrowLen,
        arrowY - Math.sin(tanAngle + 0.45) * arrowLen
      )

      // 标签底衬与颜色
      arc.labelBg.clear()
      if (isRelated) {
        arc.labelBg.fillStyle(0xefe8d8, 0.95)
        arc.labelBg.fillRoundedRect(arc.midX - 28, arc.midY - 8, 56, 16, 4)
        arc.labelBg.lineStyle(1.2, 0xc62828, 0.9)
        arc.labelBg.strokeRoundedRect(arc.midX - 28, arc.midY - 8, 56, 16, 4)
        arc.labelObj.setColor('#9e2b25')
        arc.labelObj.setAlpha(1)
      } else {
        arc.labelBg.fillStyle(0xe2dac8, 0.75)
        arc.labelBg.fillRoundedRect(arc.midX - 26, arc.midY - 7, 52, 14, 3)
        arc.labelObj.setColor(InkText.faint)
        arc.labelObj.setAlpha(isUnfocused ? 0.35 : 0.8)
      }
    })
  }

  /**
   * 创建五行节点
   */
  private createNodes(): void {
    const elementDefs: Array<{
      element: WuXing
      angleDeg: number
      char: string
      sealChar: string
      generalName: string
      counterTag: string
      offsetLabel: { x: number; y: number; originX: number }
    }> = [
      {
        element: 'metal',
        angleDeg: -90,
        char: '金',
        sealChar: '裂',
        generalName: '赵云',
        counterTag: '破甲真伤',
        offsetLabel: { x: 0, y: -this.nodeRadius - 16, originX: 0.5 }
      },
      {
        element: 'water',
        angleDeg: -18,
        char: '水',
        sealChar: '湿',
        generalName: '关羽',
        counterTag: '减速软控',
        offsetLabel: { x: this.nodeRadius + 8, y: 0, originX: 0 }
      },
      {
        element: 'wood',
        angleDeg: 54,
        char: '木',
        sealChar: '毒',
        generalName: '黄忠',
        counterTag: '禁疗腐蚀',
        offsetLabel: { x: this.nodeRadius + 6, y: 12, originX: 0 }
      },
      {
        element: 'fire',
        angleDeg: 126,
        char: '火',
        sealChar: '灼',
        generalName: '马超',
        counterTag: '极攻爆燃',
        offsetLabel: { x: -this.nodeRadius - 6, y: 12, originX: 1 }
      },
      {
        element: 'earth',
        angleDeg: 198,
        char: '土',
        sealChar: '重',
        generalName: '张飞',
        counterTag: '剥离韧刚',
        offsetLabel: { x: -this.nodeRadius - 8, y: 0, originX: 1 }
      }
    ]

    elementDefs.forEach((def) => {
      const rad = Phaser.Math.DegToRad(def.angleDeg)
      const x = Math.cos(rad) * this.radius
      const y = Math.sin(rad) * this.radius

      const statusItem = ELEMENT_STATUS_LIST.find((s) => s.element === def.element)!
      const generalItem = ELEMENT_GENERAL_MAP[def.element]
      const wuxingStyle = INK_WUXING[def.element]

      const container = this.scene.add.container(x, y)

      // 选中发光光晕
      const haloGraphics = this.scene.add.graphics()
      container.add(haloGraphics)

      // 节点圆盘
      const discGraphics = this.scene.add.graphics()
      container.add(discGraphics)

      // 主字（金/木/水/火/土）
      const charText = inkText(this.scene, 0, -4, def.char, {
        size: 18,
        color: wuxingStyle.text,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      container.add(charText)

      // 状态印章徽标【裂/毒/湿/灼/重】
      const badgeText = inkText(this.scene, 0, 10, `【${def.sealChar}】`, {
        size: 10,
        color: InkText.cinnabar,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      container.add(badgeText)

      // 节点外围标签容器（展示：对应武将 · 专克目标）
      const labelContainer = this.scene.add.container(def.offsetLabel.x, def.offsetLabel.y)

      const genText = inkText(this.scene, 0, -8, `${generalItem.name} · ${def.char}${def.sealChar}`, {
        size: 11,
        color: InkText.strong,
        bold: true,
        originX: def.offsetLabel.originX,
        originY: 0.5
      })
      labelContainer.add(genText)

      const counterText = inkText(this.scene, 0, 7, def.counterTag, {
        size: 9.5,
        color: InkText.faint,
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
        generalName: generalItem.name,
        counterTag: def.counterTag,
        color: statusItem.color,
        textColor: wuxingStyle.text,
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
   * 绘制节点常态与选中态
   */
  private renderNodes(): void {
    this.nodes.forEach((node) => {
      const isSelected = this.selectedElement === node.element
      const isUnfocused = this.selectedElement !== null && !isSelected

      const wuxingStyle = INK_WUXING[node.element]

      // 1. 发光外光晕
      node.haloGraphics.clear()
      if (isSelected) {
        node.haloGraphics.lineStyle(4, InkColor.cinnabar, 0.9)
        node.haloGraphics.strokeCircle(0, 0, this.nodeRadius + 7)
        node.haloGraphics.fillStyle(0xffe0b2, 0.45)
        node.haloGraphics.fillCircle(0, 0, this.nodeRadius + 7)
      }

      // 2. 节点圆盘
      node.discGraphics.clear()
      const fillColor = isSelected ? 0xfff9ef : wuxingStyle.fill
      const strokeColor = isSelected ? InkColor.cinnabar : wuxingStyle.border
      const strokeWidth = isSelected ? 2.8 : 2.0

      node.discGraphics.fillStyle(fillColor, isUnfocused ? 0.6 : 0.98)
      node.discGraphics.fillCircle(0, 0, this.nodeRadius)
      node.discGraphics.lineStyle(strokeWidth, strokeColor, isUnfocused ? 0.5 : 0.95)
      node.discGraphics.strokeCircle(0, 0, this.nodeRadius)

      // 3. 标签与字样透明度
      const alpha = isUnfocused ? 0.45 : 1.0
      node.charText.setAlpha(alpha)
      node.badgeText.setAlpha(alpha)
      node.labelContainer.setAlpha(isUnfocused ? 0.35 : 1.0)
    })
  }

  /**
   * 创建中枢指示台（展示当前焦点或引导点击）
   */
  private createCenter(): void {
    this.centerContainer = this.scene.add.container(0, 0)

    this.centerBg = this.scene.add.graphics()
    this.centerBg.fillStyle(InkColor.paperPanel, 0.92)
    this.centerBg.fillCircle(0, 0, this.radius * 0.38)
    this.centerBg.lineStyle(1.4, InkColor.ink, 0.45)
    this.centerBg.strokeCircle(0, 0, this.radius * 0.38)

    this.centerTitle = inkText(this.scene, 0, -14, '五行生克', {
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

    // 中心中枢也可点击复位
    this.centerBg.setInteractive(
      new Phaser.Geom.Circle(0, 0, this.radius * 0.38),
      Phaser.Geom.Circle.Contains
    )
    this.centerBg.on('pointerover', () => {
      if (this.selectedElement !== null) {
        this.scene.input.setDefaultCursor('pointer')
      }
    })
    this.centerBg.on('pointerout', () => {
      this.scene.input.setDefaultCursor('default')
    })
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
      this.centerTitle.setColor(node.textColor)
      this.centerSub.setText(`${node.generalName} · ${node.counterTag}`)
      this.centerSub.setColor(InkText.cinnabar)
      this.centerHint.setText('再次点击还原全部')

      // 启动轻微呼吸呼吸光晕
      if (this.pulseTween) {
        this.pulseTween.stop()
      }
      this.pulseTween = this.scene.tweens.add({
        targets: node.haloGraphics,
        alpha: { from: 0.6, to: 1.0 },
        scaleX: { from: 0.98, to: 1.04 },
        scaleY: { from: 0.98, to: 1.04 },
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
      this.centerTitle.setText('五行生克')
      this.centerTitle.setColor(InkText.strong)
      this.centerSub.setText('点击各行法印')
      this.centerSub.setColor(InkText.wash)
      this.centerHint.setText('探寻相生奇谋')
    }

    if (triggerCallback && this.onSelectCallback) {
      this.onSelectCallback(element)
    }
  }

  /**
   * 外部命令：切换当前聚焦的五行
   */
  public selectElement(element: WuXing | null, triggerCallback = true): void {
    this.applySelection(element, triggerCallback)
  }

  /**
   * 获取当前选中的五行（null 表示全部）
   */
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
