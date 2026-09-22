import Phaser from 'phaser'
import { Point } from '@/types'
import { GRID } from '@/config/constants'
import { InkColor, InkText, inkText } from '@/ui/InkTheme'
import { TerrainManager } from './TerrainManager'

/**
 * 水墨古代官道与涉水木栈道渲染器
 * 
 * 视觉升华重点：
 * 1. 彻底摒弃生硬格子感、铜钱/齿轮状转角与铁轨式竖线！
 * 2. 官道全线自然连贯：温雅夯土古道为底、铺筑错落自然的青石散板与碎卵石、道旁点缀细碎荒草。
 * 3. 涉水木栈道：当路径横穿河流时，水面上架起朱柱深棕木栈道——石桥台过渡、水下桥桩立柱与泛波、
 *    横铺密实木条板、两舷寻杖护栏与朱漆结纽，极具真实古战场水陆交错之势。
 * 4. 行军意图流线：沿道路中轴舒缓起伏的书法飞羽箭头（微光呼吸动效，指引明确而素雅）。
 * 5. 起点敌寨与终点大营：
 *    - 起点【黄巾前哨】：尖木鹿砦拒马、熊熊烈焰烽火燎炉（摇曳火苗与升腾火星）、苍天黄旗迎风展动、古木铭牌「敵營」。
 *    - 终点【大汉辕门】：朱漆高门跨梁、交叉金铜戟槊、大汉朱砂金边「帥」字燕尾大旗、军中重炮战鼓、朱砂印「大營」。
 */
export class PathRenderer {
  private scene: Phaser.Scene
  private path: Point[]
  private isAnimated: boolean
  private terrainManager?: TerrainManager

  private pathGraphics: Phaser.GameObjects.Graphics
  private bridgeGraphics: Phaser.GameObjects.Graphics
  private chevronGraphics: Phaser.GameObjects.Graphics
  private outpostContainer: Phaser.GameObjects.Container
  private activeTweens: Phaser.Tweens.Tween[] = []

  constructor(
    scene: Phaser.Scene,
    path: Point[],
    animated: boolean = true,
    terrainManager?: TerrainManager
  ) {
    this.scene = scene
    this.path = path
    this.isAnimated = animated
    this.terrainManager = terrainManager

    this.pathGraphics = scene.add.graphics().setDepth(3)
    this.bridgeGraphics = scene.add.graphics().setDepth(4)
    this.chevronGraphics = scene.add.graphics().setDepth(5)
    this.outpostContainer = scene.add.container(0, 0).setDepth(6)
  }

  /**
   * 渲染全景行军古道
   */
  renderStaticPath(): void {
    this.clearAll()

    if (!this.path || this.path.length < 2) return

    // 1. 逐段分析路基与河流木桥
    for (let i = 0; i < this.path.length - 1; i++) {
      const p0 = this.path[i]
      const p1 = this.path[i + 1]
      this.renderPathSegment(p0, p1)
    }

    // 2. 渲染转弯处自然平滑青石道口
    for (let i = 1; i < this.path.length - 1; i++) {
      this.drawCornerJunction(this.path[i - 1], this.path[i], this.path[i + 1])
    }

    // 3. 渲染行军意图流线
    this.renderMarchingChevrons()

    // 4. 渲染起点敌营与终点汉军辕门
    this.renderOutposts()
  }

  /**
   * 渲染单段路径（区分陆地官道与河流栈道）
   */
  private renderPathSegment(p0: Point, p1: Point): void {
    const isHorizontal = p0.y === p1.y
    const isVertical = p0.x === p1.x
    const segDist = this.calculateDistance(p0, p1)
    if (segDist <= 0) return

    const roadWidth = 36

    // 检测是否有河流穿过该路段
    const riverInterval = this.detectRiverCrossing(p0, p1)

    if (riverInterval) {
      // 拆分为：陆道1 -> 木栈道 -> 陆道2
      const [t0, t1] = riverInterval

      if (t0 > 0.04) {
        const pSub0 = p0
        const pSub1 = this.interpolate(p0, p1, t0)
        this.drawLandRoad(pSub0, pSub1, isHorizontal, isVertical, roadWidth)
      }

      const pBr0 = this.interpolate(p0, p1, t0)
      const pBr1 = this.interpolate(p0, p1, t1)
      this.drawWoodenBridge(pBr0, pBr1, isHorizontal, isVertical, roadWidth)

      if (t1 < 0.96) {
        const pSub2 = this.interpolate(p0, p1, t1)
        const pSub3 = p1
        this.drawLandRoad(pSub2, pSub3, isHorizontal, isVertical, roadWidth)
      }
    } else {
      // 全段皆为陆路官道
      this.drawLandRoad(p0, p1, isHorizontal, isVertical, roadWidth)
    }
  }

  /**
   * 检测两点间是否有河流穿过，返回跨河比例区间 [t0, t1]
   */
  private detectRiverCrossing(p0: Point, p1: Point): [number, number] | null {
    if (!this.terrainManager) return null

    const dist = this.calculateDistance(p0, p1)
    const step = 6
    const count = Math.ceil(dist / step)

    let firstRiverT = -1
    let lastRiverT = -1

    for (let s = 0; s <= count; s++) {
      const t = s / count
      const testPt = this.interpolate(p0, p1, t)
      if (this.terrainManager.getTerrainAt(testPt) === 'river') {
        if (firstRiverT < 0) firstRiverT = t
        lastRiverT = t
      }
    }

    if (firstRiverT >= 0 && lastRiverT >= firstRiverT) {
      // 左右向外延伸 16px 确保木栈道稳稳架设在岸上石台
      const padT = 16 / dist
      const t0 = Math.max(0, firstRiverT - padT)
      const t1 = Math.min(1, lastRiverT + padT)
      return [t0, t1]
    }

    return null
  }

  /**
   * 绘制夯土青石官道（自然连贯，石板错落）
   */
  private drawLandRoad(
    p0: Point,
    p1: Point,
    isHorizontal: boolean,
    _isVertical: boolean,
    width: number
  ): void {
    const g = this.pathGraphics
    const halfW = width / 2

    const minX = Math.min(p0.x, p1.x)
    const maxX = Math.max(p0.x, p1.x)
    const minY = Math.min(p0.y, p1.y)
    const maxY = Math.max(p0.y, p1.y)

    const rectX = isHorizontal ? minX : p0.x - halfW
    const rectY = isHorizontal ? p0.y - halfW : minY
    const rectW = isHorizontal ? maxX - minX : width
    const rectH = isHorizontal ? width : maxY - minY

    // 1. 夯土路基底色（温暖古朴黄土色）
    g.fillStyle(0xd5c8b4, 0.48)
    g.fillRect(rectX, rectY, rectW, rectH)

    // 2. 官道两侧自然毛边墨线
    g.lineStyle(1.2, 0x6e6353, 0.25)
    if (isHorizontal) {
      g.beginPath()
      g.moveTo(rectX, rectY)
      g.lineTo(rectX + rectW, rectY)
      g.moveTo(rectX, rectY + rectH)
      g.lineTo(rectX + rectW, rectY + rectH)
      g.strokePath()
    } else {
      g.beginPath()
      g.moveTo(rectX, rectY)
      g.lineTo(rectX, rectY + rectH)
      g.moveTo(rectX + rectW, rectY)
      g.lineTo(rectX + rectW, rectY + rectH)
      g.strokePath()
    }

    // 3. 铺筑错落青石板（大小相间、长短不一，彻底告别铁轨栅栏感）
    if (isHorizontal) {
      let curX = rectX + 6
      while (curX < rectX + rectW - 14) {
        // 随机步长 16~28px
        const slabW = 16 + (Math.sin(curX * 3.7) * 0.5 + 0.5) * 12
        const midY = rectY + halfW + Math.sin(curX * 0.15) * 5

        // 上半块青石板
        g.fillStyle(0x76796c, 0.22)
        g.fillRect(curX, rectY + 3, slabW - 2, midY - (rectY + 3))

        // 下半块青石板（错位）
        const offsetNext = 4
        g.fillStyle(0x6e7265, 0.25)
        g.fillRect(curX + offsetNext, midY + 1, slabW - 2, (rectY + rectH - 3) - (midY + 1))

        // 细微石缝墨线
        g.lineStyle(0.8, 0x4e4a3e, 0.16)
        g.beginPath()
        g.moveTo(curX + offsetNext, midY + 1)
        g.lineTo(curX + offsetNext + slabW - 2, midY + 1)
        g.strokePath()

        // 路边散碎卵石与荒草
        if (Math.sin(curX * 5.3) > 0.2) {
          g.fillStyle(0x5a5448, 0.45)
          g.fillCircle(curX + 2, rectY + 1, 1.6)
        }
        if (Math.cos(curX * 4.1) > 0.3) {
          g.fillStyle(0x3a4832, 0.50)
          g.fillCircle(curX + 5, rectY + rectH - 1, 1.8)
        }

        curX += slabW + 2
      }
    } else {
      let curY = rectY + 6
      while (curY < rectY + rectH - 14) {
        const slabH = 16 + (Math.sin(curY * 3.7) * 0.5 + 0.5) * 12
        const midX = rectX + halfW + Math.sin(curY * 0.15) * 5

        // 左半块青石板
        g.fillStyle(0x76796c, 0.22)
        g.fillRect(rectX + 3, curY, midX - (rectX + 3), slabH - 2)

        // 右半块青石板（错位）
        const offsetNext = 4
        g.fillStyle(0x6e7265, 0.25)
        g.fillRect(midX + 1, curY + offsetNext, (rectX + rectW - 3) - (midX + 1), slabH - 2)

        // 细微石缝墨线
        g.lineStyle(0.8, 0x4e4a3e, 0.16)
        g.beginPath()
        g.moveTo(midX + 1, curY + offsetNext)
        g.lineTo(midX + 1, curY + offsetNext + slabH - 2)
        g.strokePath()

        if (Math.sin(curY * 5.3) > 0.2) {
          g.fillStyle(0x5a5448, 0.45)
          g.fillCircle(rectX + 1, curY + 2, 1.6)
        }
        if (Math.cos(curY * 4.1) > 0.3) {
          g.fillStyle(0x3a4832, 0.50)
          g.fillCircle(rectX + rectW - 1, curY + 5, 1.8)
        }

        curY += slabH + 2
      }
    }
  }

  /**
   * 绘制涉水木栈道（温润木质、石台、水桩、寻杖护栏）
   */
  private drawWoodenBridge(
    p0: Point,
    p1: Point,
    isHorizontal: boolean,
    _isVertical: boolean,
    width: number
  ): void {
    const g = this.bridgeGraphics
    const halfW = width / 2

    const minX = Math.min(p0.x, p1.x)
    const maxX = Math.max(p0.x, p1.x)
    const minY = Math.min(p0.y, p1.y)
    const maxY = Math.max(p0.y, p1.y)

    const rectX = isHorizontal ? minX : p0.x - halfW
    const rectY = isHorizontal ? p0.y - halfW : minY
    const rectW = isHorizontal ? maxX - minX : width
    const rectH = isHorizontal ? width : maxY - minY

    // 1. 两岸青石桥台（连接陆地与木桥的加固基石）
    g.fillStyle(0x5a554a, 0.85)
    if (isHorizontal) {
      // 左桥台
      g.fillRect(rectX, rectY - 2, 10, rectH + 4)
      g.lineStyle(1.2, 0x2e2b24, 0.9)
      g.strokeRect(rectX, rectY - 2, 10, rectH + 4)
      // 右桥台
      g.fillRect(rectX + rectW - 10, rectY - 2, 10, rectH + 4)
      g.strokeRect(rectX + rectW - 10, rectY - 2, 10, rectH + 4)
    } else {
      g.fillRect(rectX - 2, rectY, rectW + 4, 10)
      g.lineStyle(1.2, 0x2e2b24, 0.9)
      g.strokeRect(rectX - 2, rectY, rectW + 4, 10)
      g.fillRect(rectX - 2, rectY + rectH - 10, rectW + 4, 10)
      g.strokeRect(rectX - 2, rectY + rectH - 10, rectW + 4, 10)
    }

    // 2. 桥下粗木纵梁（暖棕硬木）
    g.fillStyle(0x422915, 0.95)
    if (isHorizontal) {
      g.fillRect(rectX + 6, rectY + 4, rectW - 12, 5)
      g.fillRect(rectX + 6, rectY + rectH - 9, rectW - 12, 5)
    } else {
      g.fillRect(rectX + 4, rectY + 6, 5, rectH - 12)
      g.fillRect(rectX + rectW - 9, rectY + 6, 5, rectH - 12)
    }

    // 3. 桥下扎入水中的圆木桩立柱与白波涟漪
    const pilingDist = 32
    if (isHorizontal) {
      for (let px = rectX + 16; px <= rectX + rectW - 16; px += pilingDist) {
        const pyTop = rectY - 3
        const pyBottom = rectY + rectH + 3

        // 入水白色水花与波圈
        g.lineStyle(1.4, 0x6e9ab4, 0.65)
        g.strokeEllipse(px, pyTop - 1, 9, 4)
        g.strokeEllipse(px, pyBottom + 1, 9, 4)

        // 深黑棕木桩
        g.fillStyle(0x28190d, 0.98)
        g.fillRect(px - 4, pyTop - 5, 8, 12)
        g.fillRect(px - 4, pyBottom - 7, 8, 12)
      }
    } else {
      for (let py = rectY + 16; py <= rectY + rectH - 16; py += pilingDist) {
        const pxLeft = rectX - 3
        const pxRight = rectX + rectW + 3

        g.lineStyle(1.4, 0x6e9ab4, 0.65)
        g.strokeEllipse(pxLeft - 1, py, 4, 9)
        g.strokeEllipse(pxRight + 1, py, 4, 9)

        g.fillStyle(0x28190d, 0.98)
        g.fillRect(pxLeft - 5, py - 4, 12, 8)
        g.fillRect(pxRight - 7, py - 4, 12, 8)
      }
    }

    // 4. 铺设木桥横向木条板（饱满暖木色，木纹与木钉清晰可见）
    const plankWidth = 6.5
    if (isHorizontal) {
      for (let bx = rectX + 10; bx < rectX + rectW - 10; bx += plankWidth) {
        // 交替暖木棕与深核桃棕
        const pCol = (bx % 2 === 0) ? 0x82542e : 0x744926
        g.fillStyle(pCol, 0.98)
        g.fillRect(bx, rectY + 1, plankWidth - 1.2, rectH - 2)

        // 板缝阴影线
        g.fillStyle(0x28160b, 0.8)
        g.fillRect(bx + plankWidth - 1.2, rectY + 1, 1.2, rectH - 2)

        // 左右铁钉圆点
        g.fillStyle(0x190e06, 0.9)
        g.fillCircle(bx + 2.5, rectY + 5, 1.3)
        g.fillCircle(bx + 2.5, rectY + rectH - 5, 1.3)
      }
    } else {
      for (let by = rectY + 10; by < rectY + rectH - 10; by += plankWidth) {
        const pCol = (by % 2 === 0) ? 0x82542e : 0x744926
        g.fillStyle(pCol, 0.98)
        g.fillRect(rectX + 1, by, rectW - 2, plankWidth - 1.2)

        g.fillStyle(0x28160b, 0.8)
        g.fillRect(rectX + 1, by + plankWidth - 1.2, rectW - 2, 1.2)

        g.fillStyle(0x190e06, 0.9)
        g.fillCircle(rectX + 5, by + 2.5, 1.3)
        g.fillCircle(rectX + rectW - 5, by + 2.5, 1.3)
      }
    }

    // 5. 两舷寻杖木护栏与朱漆望柱结纽
    g.lineStyle(2.5, 0x482b16, 0.98)
    if (isHorizontal) {
      // 上横梁扶手
      g.beginPath()
      g.moveTo(rectX + 6, rectY)
      g.lineTo(rectX + rectW - 6, rectY)
      // 下横梁扶手
      g.moveTo(rectX + 6, rectY + rectH)
      g.lineTo(rectX + rectW - 6, rectY + rectH)
      g.strokePath()

      // 护栏立柱与朱红结纽
      for (let px = rectX + 16; px <= rectX + rectW - 16; px += pilingDist) {
        g.fillStyle(0x361f0e, 0.98)
        g.fillRect(px - 2.5, rectY - 6, 5, 10)
        g.fillRect(px - 2.5, rectY + rectH - 4, 5, 10)

        // 柱顶朱漆结纽
        g.fillStyle(0xa62b24, 0.95)
        g.fillCircle(px, rectY - 6, 2.2)
        g.fillCircle(px, rectY + rectH + 6, 2.2)
      }
    } else {
      g.beginPath()
      g.moveTo(rectX, rectY + 6)
      g.lineTo(rectX, rectY + rectH - 6)
      g.moveTo(rectX + rectW, rectY + 6)
      g.lineTo(rectX + rectW, rectY + rectH - 6)
      g.strokePath()

      for (let py = rectY + 16; py <= rectY + rectH - 16; py += pilingDist) {
        g.fillStyle(0x361f0e, 0.98)
        g.fillRect(rectX - 6, py - 2.5, 10, 5)
        g.fillRect(rectX + rectW - 4, py - 2.5, 10, 5)

        g.fillStyle(0xa62b24, 0.95)
        g.fillCircle(rectX - 6, py, 2.2)
        g.fillCircle(rectX + rectW + 6, py, 2.2)
      }
    }
  }

  /**
   * 转弯处自然平滑青石道口（告别生硬齿轮/铜钱，自然圆润过渡）
   */
  private drawCornerJunction(_pPrev: Point, pCorner: Point, _pNext: Point): void {
    const g = this.pathGraphics
    const halfW = 18
    const size = 36
    const x = pCorner.x - halfW
    const y = pCorner.y - halfW

    // 1. 夯土转角方块基底（与相邻路段天衣无缝拼合）
    g.fillStyle(0xd5c8b4, 0.48)
    g.fillRect(x, y, size, size)

    // 2. 铺设自然相接的青石板
    g.fillStyle(0x76796c, 0.28)
    g.fillRect(x + 2, y + 2, size / 2 - 3, size / 2 - 3)
    g.fillStyle(0x6e7265, 0.30)
    g.fillRect(x + size / 2 + 1, y + 2, size / 2 - 3, size / 2 - 3)
    g.fillRect(x + 2, y + size / 2 + 1, size / 2 - 3, size / 2 - 3)
    g.fillStyle(0x76796c, 0.28)
    g.fillRect(x + size / 2 + 1, y + size / 2 + 1, size / 2 - 3, size / 2 - 3)

    // 石缝墨线
    g.lineStyle(1, 0x4e4a3e, 0.22)
    g.strokeRect(x + 2, y + 2, size / 2 - 3, size / 2 - 3)
    g.strokeRect(x + size / 2 + 1, y + 2, size / 2 - 3, size / 2 - 3)
    g.strokeRect(x + 2, y + size / 2 + 1, size / 2 - 3, size / 2 - 3)
    g.strokeRect(x + size / 2 + 1, y + size / 2 + 1, size / 2 - 3, size / 2 - 3)
  }

  /**
   * 渲染动态行军飞羽箭头（单羽墨矢，温和呼吸动效）
   */
  private renderMarchingChevrons(): void {
    const g = this.chevronGraphics
    g.clear()

    const chevronDist = 72

    for (let i = 0; i < this.path.length - 1; i++) {
      const p0 = this.path[i]
      const p1 = this.path[i + 1]
      const dist = this.calculateDistance(p0, p1)
      const count = Math.floor(dist / chevronDist)
      const dir = Math.atan2(p1.y - p0.y, p1.x - p0.x)

      for (let j = 1; j <= count; j++) {
        const ratio = j / (count + 1)
        const pos = this.interpolate(p0, p1, ratio)

        // 绘制书法飞羽箭头
        this.drawBrushChevron(g, pos.x, pos.y, dir)
      }
    }

    // 呼吸浮动动画（温和微光，不夺目却清晰）
    if (this.isAnimated) {
      const tween = this.scene.tweens.add({
        targets: this.chevronGraphics,
        alpha: { from: 0.35, to: 0.85 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
      this.activeTweens.push(tween)
    }
  }

  /**
   * 绘制单个书法飞羽箭头（单支精巧墨矢）
   */
  private drawBrushChevron(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    dir: number
  ): void {
    const cos = Math.cos(dir)
    const sin = Math.sin(dir)
    const size = 10

    g.lineStyle(2.4, 0x221a14, 0.65)

    // 单道书法飞羽箭
    const tipX = x + cos * 5
    const tipY = y + sin * 5
    const backLX = x - cos * size - sin * (size * 0.70)
    const backLY = y - sin * size + cos * (size * 0.70)
    const backRX = x - cos * size + sin * (size * 0.70)
    const backRY = y - sin * size - cos * (size * 0.70)

    g.beginPath()
    g.moveTo(backLX, backLY)
    g.lineTo(tipX, tipY)
    g.lineTo(backRX, backRY)
    g.strokePath()
  }

  /**
   * 渲染起点【黄巾前哨营寨】与终点【大汉三军辕门】
   */
  private renderOutposts(): void {
    const startPt = this.path[0]
    const endPt = this.path[this.path.length - 1]

    // 1. 起点：黄巾前哨（尖木鹿砦、熊熊烽火燎炉、苍天黄旗、敌营木牌）
    const startX = Math.max(26, startPt.x)
    const startY = startPt.y
    this.createYellowTurbanOutpost(startX, startY)

    // 2. 终点：大汉辕门（朱漆跨门、交叉戟槊、帅府金边燕尾旗、战鼓）
    const endX = Math.min(1254, endPt.x)
    const endY = endPt.y
    this.createHanCommandGate(endX, endY)
  }

  /**
   * 创建起点：黄巾前哨营寨
   */
  private createYellowTurbanOutpost(x: number, y: number): void {
    const outpost = this.scene.add.container(x, y)

    // A. 尖木鹿砦（阻隔敌兵）
    const barrier = this.scene.add.graphics()
    barrier.lineStyle(3.2, 0x3d2b1b, 0.95)
    // 上鹿砦
    barrier.beginPath()
    barrier.moveTo(-8, -44)
    barrier.lineTo(16, -26)
    barrier.moveTo(16, -44)
    barrier.lineTo(-8, -26)
    // 下鹿砦
    barrier.moveTo(-8, 26)
    barrier.lineTo(16, 44)
    barrier.moveTo(16, 26)
    barrier.lineTo(-8, 44)
    barrier.strokePath()

    // B. 双侧烽火燎炉（铁鼎铸炉 + 升腾烈焰）
    const braziers = this.scene.add.graphics()
    // 铁鼎基座
    braziers.fillStyle(0x201814, 0.95)
    braziers.fillRect(4, -36, 14, 7)
    braziers.fillRect(4, 29, 14, 7)
    // 三足铁支架
    braziers.lineStyle(1.8, 0x18120e, 0.95)
    braziers.beginPath()
    braziers.moveTo(5, -29); braziers.lineTo(2, -22)
    braziers.moveTo(17, -29); braziers.lineTo(20, -22)
    braziers.moveTo(5, 36); braziers.lineTo(2, 43)
    braziers.moveTo(17, 36); braziers.lineTo(20, 43)
    braziers.strokePath()

    // 燎炉火苗
    const fireGraphics = this.scene.add.graphics()
    this.drawBrazierFlames(fireGraphics)

    // 火苗摇曳跳跃动效
    const flameTween = this.scene.tweens.add({
      targets: fireGraphics,
      scaleY: { from: 0.85, to: 1.25 },
      scaleX: { from: 0.95, to: 1.05 },
      alpha: { from: 0.85, to: 1.0 },
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    this.activeTweens.push(flameTween)

    // C. 苍天黄旗（破损燕尾旗）
    const flagG = this.scene.add.graphics()
    // 竹木旗杆
    flagG.lineStyle(2.5, 0x38281a, 0.95)
    flagG.beginPath()
    flagG.moveTo(8, -26)
    flagG.lineTo(8, -66)
    flagG.strokePath()
    // 黄天战旗
    flagG.fillStyle(0xdcb032, 0.95)
    flagG.beginPath()
    flagG.moveTo(8, -66)
    flagG.lineTo(34, -58)
    flagG.lineTo(25, -49)
    flagG.lineTo(36, -40)
    flagG.lineTo(8, -40)
    flagG.closePath()
    flagG.fillPath()
    // 旗面黑墨破烂边
    flagG.lineStyle(1.2, 0x22180e, 0.75)
    flagG.strokePath()

    // 旗帜微风飘拂
    const flagTween = this.scene.tweens.add({
      targets: flagG,
      scaleX: { from: 0.92, to: 1.06 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    this.activeTweens.push(flagTween)

    // D. 古旧木牌「賊營」
    const signG = this.scene.add.graphics()
    signG.fillStyle(0x3e2e1e, 0.95)
    signG.fillRoundedRect(-14, -13, 28, 26, 4)
    signG.lineStyle(1.2, 0x1f160e, 0.95)
    signG.strokeRoundedRect(-14, -13, 28, 26, 4)

    const signText = inkText(this.scene, 0, 0, '賊\n營', {
      size: 11,
      color: InkText.paper,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    outpost.add([barrier, braziers, fireGraphics, flagG, signG, signText])
    this.outpostContainer.add(outpost)
  }

  /**
   * 绘制燎炉烈焰
   */
  private drawBrazierFlames(g: Phaser.GameObjects.Graphics): void {
    g.clear()
    // 上燎炉烈焰
    g.fillStyle(0xee6e1a, 0.92)
    g.fillTriangle(6, -36, 11, -48, 16, -36)
    g.fillStyle(0xf8b824, 0.98)
    g.fillTriangle(8, -36, 11, -44, 14, -36)

    // 下燎炉烈焰
    g.fillStyle(0xee6e1a, 0.92)
    g.fillTriangle(6, 29, 11, 17, 16, 29)
    g.fillStyle(0xf8b824, 0.98)
    g.fillTriangle(8, 29, 11, 21, 14, 29)
  }

  /**
   * 创建终点：大汉三军辕门
   */
  private createHanCommandGate(x: number, y: number): void {
    const gate = this.scene.add.container(x, y)

    // A. 朱漆高门跨梁（辕门门坊）
    const gateG = this.scene.add.graphics()
    // 两侧粗壮朱漆立柱
    gateG.fillStyle(0x6a1f1a, 0.98)
    gateG.fillRect(-14, -42, 7, 84)
    gateG.fillRect(7, -42, 7, 84)
    // 柱脚石磉
    gateG.fillStyle(0x423d38, 0.98)
    gateG.fillRect(-16, -44, 11, 6)
    gateG.fillRect(-16, 38, 11, 6)
    gateG.fillRect(5, -44, 11, 6)
    gateG.fillRect(5, 38, 11, 6)
    // 跨道横木梁（飞檐式拱门）
    gateG.fillStyle(0x5a1814, 0.98)
    gateG.fillRect(-20, -44, 40, 6)
    gateG.fillRect(-22, -47, 44, 3)

    // B. 交叉戟槊（威严兵器架）
    gateG.lineStyle(2, 0x3d352c, 0.95)
    gateG.beginPath()
    gateG.moveTo(-10, -58); gateG.lineTo(-10, -36)
    gateG.moveTo(10, -58); gateG.lineTo(10, -36)
    gateG.strokePath()
    // 铜戟枪尖
    gateG.fillStyle(0xd2af50, 0.98)
    gateG.fillTriangle(-10, -64, -13, -56, -7, -56)
    gateG.fillTriangle(10, -64, 7, -56, 13, -56)

    // C. 军中重炮战鼓
    const drumG = this.scene.add.graphics()
    drumG.fillStyle(0x7c231e, 0.95)
    drumG.fillCircle(16, 28, 11)
    drumG.fillStyle(0xdfcfb4, 0.95)
    drumG.fillCircle(16, 28, 8)
    drumG.lineStyle(1.5, 0x221810, 0.85)
    drumG.strokeCircle(16, 28, 8)

    // D. 大汉「帥」字金边燕尾大旗
    const bannerG = this.scene.add.graphics()
    // 旗杆
    bannerG.lineStyle(2.5, 0x1b1410, 0.95)
    bannerG.beginPath()
    bannerG.moveTo(-14, -38)
    bannerG.lineTo(-14, -86)
    bannerG.strokePath()
    // 金色矛尖
    bannerG.fillStyle(0xd4af37, 0.95)
    bannerG.fillTriangle(-14, -91, -16, -85, -12, -85)

    // 帅旗朱砂底
    bannerG.fillStyle(0x9e2a2b, 0.98)
    bannerG.beginPath()
    bannerG.moveTo(-14, -86)
    bannerG.lineTo(-46, -76)
    bannerG.lineTo(-35, -65)
    bannerG.lineTo(-48, -54)
    bannerG.lineTo(-14, -54)
    bannerG.closePath()
    bannerG.fillPath()
    // 锦金飞边
    bannerG.lineStyle(1.5, 0xd4af37, 0.98)
    bannerG.strokePath()

    // 旗心「帥」字
    const shuaiText = inkText(this.scene, -28, -67, '帥', {
      size: 14,
      color: '#f8eedc',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    // 旗帜迎风展动
    const bannerTween = this.scene.tweens.add({
      targets: [bannerG, shuaiText],
      scaleX: { from: 0.92, to: 1.06 },
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    this.activeTweens.push(bannerTween)

    // E. 朱砂方印「大營」
    const sealG = this.scene.add.graphics()
    sealG.fillStyle(InkColor.cinnabar, 0.95)
    sealG.fillRoundedRect(-14, -13, 28, 26, 3)
    sealG.lineStyle(1.2, 0x781e18, 0.95)
    sealG.strokeRoundedRect(-14, -13, 28, 26, 3)

    const sealText = inkText(this.scene, 0, 0, '大\n營', {
      size: 11,
      color: InkText.paper,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    gate.add([gateG, drumG, bannerG, shuaiText, sealG, sealText])
    this.outpostContainer.add(gate)
  }

  /**
   * 高亮当前正在通行的路径段
   */
  highlightSegment(index: number): void {
    if (index < 0 || index >= this.path.length - 1) return

    const start = this.path[index]
    const end = this.path[index + 1]

    const highlightGraphics = this.scene.add.graphics()
    highlightGraphics.lineStyle(6, InkColor.cinnabar, 0.6)

    highlightGraphics.beginPath()
    highlightGraphics.moveTo(start.x, start.y)
    highlightGraphics.lineTo(end.x, end.y)
    highlightGraphics.strokePath()
    highlightGraphics.setDepth(8)

    this.scene.time.delayedCall(500, () => {
      highlightGraphics.destroy()
    })
  }

  /**
   * 隐藏路径
   */
  hidePath(): void {
    this.pathGraphics.clear()
    this.bridgeGraphics.clear()
    this.chevronGraphics.clear()
    this.outpostContainer.removeAll(true)
  }

  /**
   * 清除所有渲染与缓动
   */
  private clearAll(): void {
    this.activeTweens.forEach(t => t.stop())
    this.activeTweens = []

    this.pathGraphics.clear()
    this.bridgeGraphics.clear()
    this.chevronGraphics.clear()
    this.outpostContainer.removeAll(true)
  }

  /**
   * 销毁清理
   */
  destroy(): void {
    this.clearAll()
    this.pathGraphics.destroy()
    this.bridgeGraphics.destroy()
    this.chevronGraphics.destroy()
    this.outpostContainer.destroy()
  }

  /**
   * 线性插值
   */
  private interpolate(p0: Point, p1: Point, t: number): Point {
    return {
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t
    }
  }

  /**
   * 计算两点间欧氏距离
   */
  private calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }
}
