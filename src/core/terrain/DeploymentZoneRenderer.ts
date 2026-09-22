import Phaser from 'phaser'
import { Point, Area } from '@/types'
import { GRID, GridCell, cellAt } from '@/config/constants'
import { InkColor, InkText, InkFontSize, inkText } from '@/ui/InkTheme'

/**
 * 部署区域渲染器（水墨风 · 格子化）
 * 布阵区 = 墨色虚线框 + 极淡纸底 + 80px 真实格网；
 * 悬停 = 印章红框；悬停格 = 印章红细框。
 */
export class DeploymentZoneRenderer {
  private scene: Phaser.Scene
  private deployableAreas: Area[]
  private pathCells: Set<string>
  private zoneGraphics: Phaser.GameObjects.Graphics[]
  private zoneLabels: (Phaser.GameObjects.Container | Phaser.GameObjects.Text)[]
  private highlightedIndex: number | null
  private isHighlightMode: boolean
  private cellHighlightGraphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, deployableAreas: Area[], path?: Point[]) {
    this.scene = scene
    this.deployableAreas = deployableAreas
    this.pathCells = new Set()
    if (path && path.length > 0) {
      this.initPathCells(path)
    }
    this.zoneGraphics = []
    this.zoneLabels = []
    this.highlightedIndex = null
    this.isHighlightMode = false
    this.cellHighlightGraphics = scene.add.graphics()
    this.cellHighlightGraphics.setDepth(6)
  }

  /**
   * 将行军路线折线映射并注册为路径禁止布防格
   */
  private initPathCells(path: Point[]): void {
    for (let i = 0; i < path.length - 1; i++) {
      const p0 = path[i]
      const p1 = path[i + 1]
      const dx = p1.x - p0.x
      const dy = p1.y - p0.y
      const dist = Math.hypot(dx, dy)
      const steps = Math.max(1, Math.ceil(dist / 5))

      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const x = p0.x + dx * t
        const y = p0.y + dy * t
        const col = Math.min(GRID.cols - 1, Math.max(0, Math.floor(x / GRID.cellSize)))
        const row = Math.min(GRID.rows - 1, Math.max(0, Math.floor(y / GRID.cellSize)))
        this.pathCells.add(`${col},${row}`)
      }
    }
  }

  private gridGraphics: Phaser.GameObjects.Graphics | null = null

  /**
   * 渲染全图淡墨格网（默认隐藏，拖拽落子时动态唤起）
   */
  renderDeploymentZones(): void {
    const graphics = this.scene.add.graphics()
    graphics.setDepth(5)
    graphics.setAlpha(0) // 默认隐藏常态网格

    const area: Area = {
      x: 0,
      y: 0,
      width: GRID.cols * GRID.cellSize,
      height: GRID.rows * GRID.cellSize
    }

    graphics.lineStyle(1, InkColor.ink, 0.12)
    this.drawGridPattern(graphics, area)

    this.gridGraphics = graphics
    this.zoneGraphics.push(graphics)
  }

  /**
   * 动态控制战场网格显隐（拖拽时唤出，释放后淡出）
   */
  setGridVisible(visible: boolean): void {
    if (!this.gridGraphics) return
    this.scene.tweens.killTweensOf(this.gridGraphics)
    this.scene.tweens.add({
      targets: this.gridGraphics,
      alpha: visible ? 1 : 0,
      duration: 180,
      ease: 'Sine.easeOut'
    })
  }

  /**
   * 渲染单个部署区域
   */
  private renderZone(index: number, area: Area): void {
    const graphics = this.scene.add.graphics()
    graphics.setDepth(5)

    this.drawZoneBase(graphics, area)

    // 区域编号徽章（纸底墨字）
    const badge = this.makeNumberBadge(index, area)

    // "点击部署"楷体淡墨小字
    const tipLabel = inkText(
      this.scene,
      area.x + area.width / 2,
      area.y + area.height - 10,
      '点击部署',
      {
        size: InkFontSize.xs,
        color: InkText.faint,
        originX: 0.5
      }
    ).setAlpha(0.8).setDepth(6)

    this.zoneGraphics.push(graphics)
    this.zoneLabels.push(badge)
    this.zoneLabels.push(tipLabel)
  }

  /**
   * 默认样式：极淡纸底 + 墨色虚线框 + 淡墨网格
   */
  private drawZoneBase(graphics: Phaser.GameObjects.Graphics, area: Area): void {
    graphics.clear()

    graphics.fillStyle(InkColor.ink, 0.06)
    graphics.fillRect(area.x, area.y, area.width, area.height)

    graphics.lineStyle(1.5, InkColor.ink, 0.5)
    this.dashRect(graphics, area, 10, 6)

    graphics.lineStyle(1, InkColor.ink, 0.08)
    this.drawGridPattern(graphics, area)
  }

  /**
   * 手绘虚线矩形（Phaser Graphics 无 dash API）
   */
  private dashRect(graphics: Phaser.GameObjects.Graphics, area: Area, dash = 10, gap = 6): void {
    const { x, y, width, height } = area
    const edges = [
      { x0: x, y0: y, x1: x + width, y1: y },
      { x0: x + width, y0: y, x1: x + width, y1: y + height },
      { x0: x + width, y0: y + height, x1: x, y1: y + height },
      { x0: x, y0: y + height, x1: x, y1: y }
    ]

    for (const e of edges) {
      const len = Math.hypot(e.x1 - e.x0, e.y1 - e.y0)
      if (len === 0) continue
      const dx = (e.x1 - e.x0) / len
      const dy = (e.y1 - e.y0) / len

      let t = 0
      let drawing = true
      while (t < len) {
        const seg = drawing ? dash : gap
        const t2 = Math.min(t + seg, len)
        if (drawing) {
          graphics.beginPath()
          graphics.moveTo(e.x0 + dx * t, e.y0 + dy * t)
          graphics.lineTo(e.x0 + dx * t2, e.y0 + dy * t2)
          graphics.strokePath()
        }
        t = t2
        drawing = !drawing
      }
    }
  }

  /**
   * 区域编号徽章：圆角纸片 + 楷体墨字
   */
  private makeNumberBadge(index: number, area: Area): Phaser.GameObjects.Container {
    const badge = this.scene.add.container(area.x + area.width / 2, area.y + area.height / 2)

    const text = inkText(this.scene, 0, 0, `${index + 1}`, {
      size: InkFontSize.md,
      color: InkText.ink,
      bold: true,
      originX: 0.5
    })

    const padX = 8
    const w = text.width + padX * 2
    const h = 24
    const bg = this.scene.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.9)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4)
    bg.lineStyle(1, InkColor.ink, 0.5)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4)

    badge.add([bg, text])
    badge.setAlpha(0.75)
    badge.setDepth(6)
    return badge
  }

  /**
   * 绘制网格图案（仅在非行军路线的合法部署格上绘制淡墨框）
   */
  private drawGridPattern(graphics: Phaser.GameObjects.Graphics, _area: Area): void {
    const gridSize = GRID.cellSize

    for (let r = 0; r < GRID.rows; r++) {
      for (let c = 0; c < GRID.cols; c++) {
        // 行军路线上不画部署网格
        if (this.pathCells.has(`${c},${r}`)) continue

        graphics.strokeRect(
          c * gridSize + 0.5,
          r * gridSize + 0.5,
          gridSize - 1,
          gridSize - 1
        )
      }
    }
  }

  /**
   * 拖拽落点预览：合法为青绿水墨微光，非法为印章红墨晕
   */
  highlightDropPreview(cells: GridCell[], valid: boolean): void {
    this.cellHighlightGraphics.clear()
    const color = valid ? 0x5f7a4a : InkColor.cinnabar
    const fillAlpha = valid ? 0.22 : 0.26
    const radius = 4

    for (const cell of cells) {
      const x = cell.col * GRID.cellSize + 1
      const y = cell.row * GRID.cellSize + 1
      const size = GRID.cellSize - 2
      this.cellHighlightGraphics.fillStyle(color, fillAlpha)
      this.cellHighlightGraphics.fillRoundedRect(x, y, size, size, radius)
      this.cellHighlightGraphics.lineStyle(1.5, color, 0.9)
      this.cellHighlightGraphics.strokeRoundedRect(x, y, size, size, radius)
    }
  }

  /**
   * 高亮指定格子（悬停反馈：青润水墨圆角细框）
   */
  highlightCell(cell: GridCell): void {
    this.cellHighlightGraphics.clear()
    this.cellHighlightGraphics.fillStyle(InkColor.paperDeep, 0.2)
    this.cellHighlightGraphics.fillRoundedRect(
      cell.col * GRID.cellSize + 1,
      cell.row * GRID.cellSize + 1,
      GRID.cellSize - 2,
      GRID.cellSize - 2,
      4
    )
    this.cellHighlightGraphics.lineStyle(1.5, 0x5f7a4a, 0.8)
    this.cellHighlightGraphics.strokeRoundedRect(
      cell.col * GRID.cellSize + 1,
      cell.row * GRID.cellSize + 1,
      GRID.cellSize - 2,
      GRID.cellSize - 2,
      4
    )
  }

  /**
   * 清除格子高亮
   */
  clearCellHighlight(): void {
    this.cellHighlightGraphics.clear()
  }

  /**
   * 像素点 → 战场格子（越界返回 null）
   */
  cellAtPoint(point: Point): GridCell | null {
    return cellAt(point.x, point.y)
  }

  /**
   * 高亮所有可部署区域
   */
  highlightAllZones(): void {
    this.isHighlightMode = true

    for (let i = 0; i < this.zoneGraphics.length; i++) {
      this.drawZoneHighlight(this.zoneGraphics[i], this.deployableAreas[i])
    }
  }

  /**
   * 高亮指定区域（鼠标悬停）
   */
  highlightZone(index: number): void {
    if (index < 0 || index >= this.deployableAreas.length) return

    // 取消之前的高亮
    this.unhighlightAll()

    this.highlightedIndex = index
    const graphics = this.zoneGraphics[index]
    this.drawZoneHighlight(graphics, this.deployableAreas[index])

    // 高亮标签
    if (this.zoneLabels[index * 2]) {
      this.zoneLabels[index * 2].setAlpha(1)
      this.zoneLabels[index * 2].setScale(1.2)
    }
  }

  /**
   * 印章红高亮样式
   */
  private drawZoneHighlight(graphics: Phaser.GameObjects.Graphics, area: Area): void {
    graphics.clear()

    graphics.fillStyle(InkColor.cinnabar, 0.10)
    graphics.fillRect(area.x, area.y, area.width, area.height)

    graphics.lineStyle(2, InkColor.cinnabar, 0.9)
    this.dashRect(graphics, area, 10, 6)

    graphics.lineStyle(1, InkColor.cinnabar, 0.12)
    this.drawGridPattern(graphics, area)
  }

  /**
   * 取消高亮
   */
  unhighlightAll(): void {
    this.highlightedIndex = null
    this.isHighlightMode = false

    // 重置所有区域为默认样式
    for (let i = 0; i < this.zoneGraphics.length; i++) {
      this.resetZoneStyle(i)
    }
  }

  /**
   * 重置区域样式
   */
  private resetZoneStyle(index: number): void {
    if (index >= this.zoneGraphics.length) return

    this.drawZoneBase(this.zoneGraphics[index], this.deployableAreas[index])

    // 重置标签
    if (this.zoneLabels[index * 2]) {
      this.zoneLabels[index * 2].setAlpha(0.75)
      this.zoneLabels[index * 2].setScale(1)
    }
  }

  /**
   * 检测点击位置是否在部署区域内
   */
  isPointInZone(point: Point): number | null {
    for (let i = 0; i < this.deployableAreas.length; i++) {
      const area = this.deployableAreas[i]

      if (point.x >= area.x &&
          point.x <= area.x + area.width &&
          point.y >= area.y &&
          point.y <= area.y + area.height) {
        return i
      }
    }

    return null
  }

  /**
   * 显示区域提示信息（纸片 + 墨字）
   */
  showZoneInfo(index: number, info: string): void {
    if (index < 0 || index >= this.deployableAreas.length) return

    const area = this.deployableAreas[index]

    const chip = this.scene.add.container(area.x + area.width / 2, area.y - 20)

    const text = inkText(this.scene, 0, 0, info, {
      size: InkFontSize.xs,
      color: InkText.ink,
      originX: 0.5
    })

    const padX = 8
    const w = text.width + padX * 2
    const h = 20
    const bg = this.scene.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.92)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 4)
    bg.lineStyle(1, InkColor.ink, 0.5)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 4)

    chip.add([bg, text])
    chip.setDepth(20)

    // 3秒后自动消失
    this.scene.time.delayedCall(3000, () => {
      chip.destroy()
    })
  }

  /**
   * 清理
   */
  destroy(): void {
    for (const graphics of this.zoneGraphics) {
      graphics.destroy()
    }
    for (const label of this.zoneLabels) {
      label.destroy()
    }
    this.cellHighlightGraphics.destroy()
    this.zoneGraphics = []
    this.zoneLabels = []
  }
}
