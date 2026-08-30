import Phaser from 'phaser'
import { Point } from '@/types'
import { GRID, GridCell, cellKey } from '@/config/constants'
import { InkColor, InkText, InkRadius, inkText } from '@/ui/InkTheme'

/**
 * 路径渲染器（水墨风 · 格子化）
 * 行军路 = 逐格平铺的淡墨路基（一格一格看得见）+ 淡墨方向箭；
 * 起点墨点"敌"纸片，终点印章红点"守"纸片。
 * 敌人仍沿格心折线连续移动（见 EnemyManager.PathFinder）。
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
   * 渲染静态路径（逐格淡墨路基）
   */
  renderStaticPath(): void {
    this.pathGraphics.clear()
    const g = this.pathGraphics
    const cells = this.enumeratePathCells()

    // 路基：每格淡墨底
    g.fillStyle(InkColor.ink, 0.10)
    for (const cell of cells) {
      g.fillRect(
        cell.col * GRID.cellSize,
        cell.row * GRID.cellSize,
        GRID.cellSize,
        GRID.cellSize
      )
    }

    // 格线：每格淡墨描边（与部署区格网同一视觉语言）
    g.lineStyle(1, InkColor.ink, 0.15)
    for (const cell of cells) {
      g.strokeRect(
        cell.col * GRID.cellSize + 0.5,
        cell.row * GRID.cellSize + 0.5,
        GRID.cellSize - 1,
        GRID.cellSize - 1
      )
    }

    // 标记起点和终点
    this.markStartAndEnd()

    // 显示路径方向箭头
    this.showDirectionArrows()

    // 设置深度（在地形之上）
    g.setDepth(8)
  }

  /**
   * 枚举路径经过的所有格子（去重）。
   * 航点为格心轴对齐折线；非轴对齐段按细步长采样兜底。
   */
  private enumeratePathCells(): GridCell[] {
    const seen = new Set<string>()
    const cells: GridCell[] = []
    const push = (cell: GridCell | null) => {
      if (!cell) return
      const key = cellKey(cell)
      if (!seen.has(key)) {
        seen.add(key)
        cells.push(cell)
      }
    }

    for (let i = 0; i < this.path.length - 1; i++) {
      const p0 = this.path[i]
      const p1 = this.path[i + 1]

      if (p0.y === p1.y) {
        // 水平段：行固定，列从起点扫到终点
        const row = Phaser.Math.Clamp(Math.floor(p0.y / GRID.cellSize), 0, GRID.rows - 1)
        const cMin = Math.floor(Math.min(p0.x, p1.x) / GRID.cellSize)
        const cMax = Math.floor((Math.max(p0.x, p1.x) - 1) / GRID.cellSize)
        for (let c = cMin; c <= cMax; c++) {
          push({ col: Phaser.Math.Clamp(c, 0, GRID.cols - 1), row })
        }
      } else if (p0.x === p1.x) {
        // 垂直段：列固定，行从起点扫到终点
        const col = Phaser.Math.Clamp(Math.floor(p0.x / GRID.cellSize), 0, GRID.cols - 1)
        const rMin = Math.floor(Math.min(p0.y, p1.y) / GRID.cellSize)
        const rMax = Math.floor((Math.max(p0.y, p1.y) - 1) / GRID.cellSize)
        for (let r = rMin; r <= rMax; r++) {
          push({ col, row: Phaser.Math.Clamp(r, 0, GRID.rows - 1) })
        }
      } else {
        // 兜底：沿段细步长采样（格心数据下不会走到这里）
        const len = this.calculateDistance(p0, p1)
        const steps = Math.max(2, Math.ceil(len / (GRID.cellSize / 4)))
        for (let s = 0; s <= steps; s++) {
          const t = s / steps
          const x = p0.x + (p1.x - p0.x) * t
          const y = p0.y + (p1.y - p0.y) * t
          push({
            col: Phaser.Math.Clamp(Math.floor(x / GRID.cellSize), 0, GRID.cols - 1),
            row: Phaser.Math.Clamp(Math.floor(y / GRID.cellSize), 0, GRID.rows - 1)
          })
        }
      }
    }

    return cells
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
