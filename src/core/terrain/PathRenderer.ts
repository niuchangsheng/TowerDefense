import Phaser from 'phaser'
import { Point } from '@/types'
import { InkColor, InkText, InkRadius, inkText } from '@/ui/InkTheme'

/**
 * 路径渲染器（水墨风）
 * 行军路 = 淡墨路基 + 墨色细线 + 淡墨方向箭；
 * 起点墨点"敌"纸片，终点印章红点"守"纸片。
 */
export class PathRenderer {
  private scene: Phaser.Scene
  private path: Point[]
  private pathGraphics: Phaser.GameObjects.Graphics
  private isAnimated: boolean

  constructor(scene: Phaser.Scene, path: Point[], animated: boolean = false) {
    this.scene = scene
    this.path = path
    this.isAnimated = animated
    this.pathGraphics = scene.add.graphics()
  }

  /**
   * 渲染静态路径
   */
  renderStaticPath(): void {
    this.pathGraphics.clear()
    const g = this.pathGraphics

    // 淡墨路基（宽底，模拟墨迹洇开）
    g.lineStyle(10, InkColor.ink, 0.14)
    this.strokePolyline(g)

    // 墨色细线（道路主体）
    g.lineStyle(2, InkColor.ink, 0.5)
    this.strokePolyline(g)

    // 标记起点和终点
    this.markStartAndEnd()

    // 显示路径方向箭头
    this.showDirectionArrows()

    // 设置深度（在地形之上）
    g.setDepth(8)
  }

  /**
   * 沿路径折线描边（使用当前 lineStyle）
   */
  private strokePolyline(g: Phaser.GameObjects.Graphics): void {
    g.beginPath()
    g.moveTo(this.path[0].x, this.path[0].y)
    for (let i = 1; i < this.path.length; i++) {
      g.lineTo(this.path[i].x, this.path[i].y)
    }
    g.strokePath()
  }

  /**
   * 标记起点和终点（敌来 / 我守）
   */
  private markStartAndEnd(): void {
    const startPoint = this.path[0]
    const endPoint = this.path[this.path.length - 1]

    // 起点：墨点 + "敌"纸片
    this.scene.add.circle(startPoint.x, startPoint.y, 9, InkColor.ink, 0.75).setDepth(9)
    this.makeCharChip(startPoint.x, startPoint.y - 24, '敌', InkText.ink).setDepth(9)

    // 终点：印章红点 + "守"纸片
    this.scene.add.circle(endPoint.x, endPoint.y, 9, InkColor.cinnabar, 0.85).setDepth(9)
    this.makeCharChip(endPoint.x, endPoint.y - 24, '守', InkText.cinnabar).setDepth(9)
  }

  /**
   * 单字纸片（圆角宣纸底 + 墨线 + 楷体字）
   */
  private makeCharChip(x: number, y: number, char: string, textColor: string): Phaser.GameObjects.Container {
    const chip = this.scene.add.container(x, y)

    const text = inkText(this.scene, 0, 0, char, {
      size: 14,
      color: textColor,
      bold: true,
      originX: 0.5
    })

    const padX = 7
    const w = text.width + padX * 2
    const h = 22
    const bg = this.scene.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.92)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, InkRadius.sm)
    bg.lineStyle(1, InkColor.ink, 0.6)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, InkRadius.sm)

    chip.add([bg, text])
    return chip
  }

  /**
   * 显示路径方向箭头
   */
  private showDirectionArrows(): void {
    // 每隔一定距离显示方向箭头
    const arrowInterval = 150  // 箭头间隔像素

    for (let i = 0; i < this.path.length - 1; i++) {
      const start = this.path[i]
      const end = this.path[i + 1]

      const segmentLength = this.calculateDistance(start, end)
      const numArrows = Math.floor(segmentLength / arrowInterval)

      for (let j = 1; j <= numArrows; j++) {
        const ratio = j / numArrows
        const arrowPos = {
          x: start.x + (end.x - start.x) * ratio,
          y: start.y + (end.y - start.y) * ratio
        }

        this.drawArrow(arrowPos, this.getDirection(start, end))
      }
    }
  }

  /**
   * 绘制箭头（淡墨）
   */
  private drawArrow(position: Point, direction: number): void {
    const arrowGraphics = this.scene.add.graphics()
    arrowGraphics.fillStyle(InkColor.ink, 0.5)

    // 箭头大小
    const arrowSize = 8

    // 根据方向绘制箭头
    arrowGraphics.save()
    arrowGraphics.translateCanvas(position.x, position.y)
    arrowGraphics.rotateCanvas(direction)

    arrowGraphics.beginPath()
    arrowGraphics.moveTo(arrowSize, 0)
    arrowGraphics.lineTo(-arrowSize / 2, -arrowSize / 2)
    arrowGraphics.lineTo(-arrowSize / 2, arrowSize / 2)
    arrowGraphics.closePath()
    arrowGraphics.fillPath()

    arrowGraphics.restore()
    arrowGraphics.setDepth(7)
  }

  /**
   * 计算两点距离
   */
  private calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 获取方向角度
   */
  private getDirection(start: Point, end: Point): number {
    return Math.atan2(end.y - start.y, end.x - start.x)
  }

  /**
   * 高亮当前路径段（敌人正在通过的路段）
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

    highlightGraphics.setDepth(10)

    // 自动清理（短暂显示）
    this.scene.time.delayedCall(500, () => {
      highlightGraphics.destroy()
    })
  }

  /**
   * 隐藏路径
   */
  hidePath(): void {
    this.pathGraphics.clear()
  }

  /**
   * 清理
   */
  destroy(): void {
    this.pathGraphics.destroy()
  }
}
