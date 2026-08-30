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
  private zoneGraphics: Phaser.GameObjects.Graphics[]
  private zoneLabels: (Phaser.GameObjects.Container | Phaser.GameObjects.Text)[]
  private highlightedIndex: number | null
  private isHighlightMode: boolean
  private cellHighlightGraphics: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, deployableAreas: Area[]) {
    this.scene = scene
    this.deployableAreas = deployableAreas
    this.zoneGraphics = []
    this.zoneLabels = []
    this.highlightedIndex = null
    this.isHighlightMode = false
    this.cellHighlightGraphics = scene.add.graphics()
    this.cellHighlightGraphics.setDepth(6)
  }

  /**
   * 渲染部署区域标记
   */
  renderDeploymentZones(): void {
    for (let i = 0; i < this.deployableAreas.length; i++) {
      this.renderZone(i, this.deployableAreas[i])
    }
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
   * 绘制网格图案（与全局 80px 格子对齐的真实部署格）
   */
  private drawGridPattern(graphics: Phaser.GameObjects.Graphics, area: Area): void {
    const gridSize = GRID.cellSize

    for (let x = area.x; x <= area.x + area.width; x += gridSize) {
      graphics.beginPath()
      graphics.moveTo(x, area.y)
      graphics.lineTo(x, area.y + area.height)
      graphics.strokePath()
    }

    for (let y = area.y; y <= area.y + area.height; y += gridSize) {
      graphics.beginPath()
      graphics.moveTo(area.x, y)
      graphics.lineTo(area.x + area.width, y)
      graphics.strokePath()
    }
  }

  /**
   * 高亮指定格子（悬停反馈：印章红细框）
   */
  highlightCell(cell: GridCell): void {
    this.cellHighlightGraphics.clear()
    this.cellHighlightGraphics.lineStyle(2, InkColor.cinnabar, 0.9)
    this.cellHighlightGraphics.strokeRect(
      cell.col * GRID.cellSize + 1,
      cell.row * GRID.cellSize + 1,
      GRID.cellSize - 2,
      GRID.cellSize - 2
    )
  }

  /**
   * 清除格子高亮
   */
  clearCellHighlight(): void {
    this.cellHighlightGraphics.clear()
  }

  /**
   * 像素点 → 部署区内的格子（不在任何部署区返回 null）
   */
  cellAtPoint(point: Point): GridCell | null {
    if (this.isPointInZone(point) === null) return null
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
