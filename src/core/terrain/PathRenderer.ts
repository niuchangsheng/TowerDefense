import Phaser from 'phaser'
import { Point } from '@/types'

/**
 * 路径渲染器
 * 渲染和可视化敌人行军路径
 */
export class PathRenderer {
  private scene: Phaser.Scene
  private path: Point[]
  private pathGraphics: Phaser.GameObjects.Graphics
  private arrowSprites: Phaser.GameObjects.Sprite[] = []
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

    // 绘制路径线条
    this.pathGraphics.lineStyle(4, 0x8b4513, 0.8)  // 棕色路径（三国志11道路色）

    this.pathGraphics.beginPath()
    this.pathGraphics.moveTo(this.path[0].x, this.path[0].y)

    for (let i = 1; i < this.path.length; i++) {
      this.pathGraphics.lineTo(this.path[i].x, this.path[i].y)
    }

    this.pathGraphics.strokePath()

    // 绘制路径边界（增强视觉效果）
    this.pathGraphics.lineStyle(1, 0x654321, 0.5)
    this.pathGraphics.beginPath()
    this.pathGraphics.moveTo(this.path[0].x, this.path[0].y)
    for (let i = 1; i < this.path.length; i++) {
      this.pathGraphics.lineTo(this.path[i].x, this.path[i].y)
    }
    this.pathGraphics.strokePath()

    // 标记起点和终点
    this.markStartAndEnd()

    // 显示路径方向箭头
    this.showDirectionArrows()

    // 设置深度（在地形之上）
    this.pathGraphics.setDepth(8)
  }

  /**
   * 标记起点和终点
   */
  private markStartAndEnd(): void {
    // 起点（绿色圆圈）
    this.scene.add.circle(this.path[0].x, this.path[0].y, 15, 0x00ff00, 0.7)
      .setDepth(9)

    // 起点标签
    this.scene.add.text(this.path[0].x, this.path[0].y - 25, '起点', {
      fontSize: '12px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5).setDepth(9)

    // 终点（红色圆圈）
    const endPoint = this.path[this.path.length - 1]
    this.scene.add.circle(endPoint.x, endPoint.y, 15, 0xff0000, 0.7)
      .setDepth(9)

    // 终点标签
    this.scene.add.text(endPoint.x, endPoint.y - 25, '终点', {
      fontSize: '12px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5).setDepth(9)
  }

  /**
   * 显示路径方向箭头
   */
  private showDirectionArrows(): void {
    // 每隔一定距离显示方向箭头
    const arrowInterval = 150  // 箭头间隔像素

    let accumulatedDistance = 0
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

      accumulatedDistance += segmentLength
    }
  }

  /**
   * 绘制箭头
   */
  private drawArrow(position: Point, direction: number): void {
    const arrowGraphics = this.scene.add.graphics()
    arrowGraphics.fillStyle(0x8b4513, 1)

    // 箭头大小
    const arrowSize = 8

    // 根据方向绘制箭头
    arrowGraphics.save()
    arrowGraphics.translateCanvas(position.x, position.y)
    arrowGraphics.rotateCanvas(direction)

    // 绘制箭头形状
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

    // 绘制高亮路径段
    const highlightGraphics = this.scene.add.graphics()
    highlightGraphics.lineStyle(6, 0xffaa00, 1)  // 金色高亮

    highlightGraphics.beginPath()
    highlightGraphics.moveTo(start.x, start.y)
    highlightGraphics.lineTo(end.x, end.y)
    highlightGraphics.strokePath()

    // 设置深度
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
    for (const sprite of this.arrowSprites) {
      sprite.destroy()
    }
    this.arrowSprites = []
  }
}