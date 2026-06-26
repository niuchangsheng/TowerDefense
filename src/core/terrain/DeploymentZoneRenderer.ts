import Phaser from 'phaser'
import { Point, Area } from '@/types'

/**
 * 部署区域渲染器
 * 渲染和标记可部署英雄的区域
 */
export class DeploymentZoneRenderer {
  private scene: Phaser.Scene
  private deployableAreas: Area[]
  private zoneGraphics: Phaser.GameObjects.Graphics[]
  private zoneLabels: Phaser.GameObjects.Text[]
  private highlightedIndex: number | null
  private isHighlightMode: boolean

  constructor(scene: Phaser.Scene, deployableAreas: Area[]) {
    this.scene = scene
    this.deployableAreas = deployableAreas
    this.zoneGraphics = []
    this.zoneLabels = []
    this.highlightedIndex = null
    this.isHighlightMode = false
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

    // 绘制区域背景（半透明）
    graphics.fillStyle(0x4a90d9, 0.3)  // 蓝色半透明
    graphics.fillRect(area.x, area.y, area.width, area.height)

    // 绘制边框
    graphics.lineStyle(2, 0x4a90d9, 0.8)
    graphics.strokeRect(area.x, area.y, area.width, area.height)

    // 绘制网格线（增加视觉提示）
    graphics.lineStyle(1, 0x4a90d9, 0.2)
    this.drawGridPattern(graphics, area)

    // 添加区域编号标签
    const label = this.scene.add.text(
      area.x + area.width / 2,
      area.y + area.height / 2,
      `${index + 1}`,
      {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#4a90d9',
        padding: { x: 4, y: 2 }
      }
    ).setOrigin(0.5).setAlpha(0.6).setDepth(6)

    // 添加"可部署"提示
    const tipLabel = this.scene.add.text(
      area.x + area.width / 2,
      area.y + area.height - 10,
      '点击部署',
      {
        fontSize: '10px',
        color: '#4a90d9',
        backgroundColor: '#ffffff',
        padding: { x: 2, y: 1 }
      }
    ).setOrigin(0.5).setAlpha(0.5).setDepth(6)

    graphics.setDepth(5)

    this.zoneGraphics.push(graphics)
    this.zoneLabels.push(label)
    this.zoneLabels.push(tipLabel)
  }

  /**
   * 绘制网格图案
   */
  private drawGridPattern(graphics: Phaser.GameObjects.Graphics, area: Area): void {
    const gridSize = 20

    // 垂直线
    for (let x = area.x; x <= area.x + area.width; x += gridSize) {
      graphics.beginPath()
      graphics.moveTo(x, area.y)
      graphics.lineTo(x, area.y + area.height)
      graphics.strokePath()
    }

    // 水平线
    for (let y = area.y; y <= area.y + area.height; y += gridSize) {
      graphics.beginPath()
      graphics.moveTo(area.x, y)
      graphics.lineTo(area.x + area.width, y)
      graphics.strokePath()
    }
  }

  /**
   * 高亮所有可部署区域
   */
  highlightAllZones(): void {
    this.isHighlightMode = true

    for (let i = 0; i < this.zoneGraphics.length; i++) {
      const graphics = this.zoneGraphics[i]
      graphics.clear()

      // 高亮样式
      graphics.fillStyle(0x00ff00, 0.4)  // 绿色高亮
      graphics.fillRect(
        this.deployableAreas[i].x,
        this.deployableAreas[i].y,
        this.deployableAreas[i].width,
        this.deployableAreas[i].height
      )

      graphics.lineStyle(3, 0x00ff00, 1)
      graphics.strokeRect(
        this.deployableAreas[i].x,
        this.deployableAreas[i].y,
        this.deployableAreas[i].width,
        this.deployableAreas[i].height
      )

      this.drawGridPattern(graphics, this.deployableAreas[i])
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
    const area = this.deployableAreas[index]
    const graphics = this.zoneGraphics[index]

    graphics.clear()

    // 高亮样式（黄色边框）
    graphics.fillStyle(0xffaa00, 0.5)  // 金色高亮
    graphics.fillRect(area.x, area.y, area.width, area.height)

    graphics.lineStyle(4, 0xffaa00, 1)
    graphics.strokeRect(area.x, area.y, area.width, area.height)

    this.drawGridPattern(graphics, area)

    // 高亮标签
    if (this.zoneLabels[index * 2]) {
      this.zoneLabels[index * 2].setAlpha(1)
      this.zoneLabels[index * 2].setScale(1.2)
    }
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

    const graphics = this.zoneGraphics[index]
    const area = this.deployableAreas[index]

    graphics.clear()

    // 默认样式
    graphics.fillStyle(0x4a90d9, 0.3)
    graphics.fillRect(area.x, area.y, area.width, area.height)

    graphics.lineStyle(2, 0x4a90d9, 0.8)
    graphics.strokeRect(area.x, area.y, area.width, area.height)

    this.drawGridPattern(graphics, area)

    // 重置标签
    if (this.zoneLabels[index * 2]) {
      this.zoneLabels[index * 2].setAlpha(0.6)
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
   * 显示区域提示信息
   */
  showZoneInfo(index: number, info: string): void {
    if (index < 0 || index >= this.deployableAreas.length) return

    const area = this.deployableAreas[index]

    // 创建临时提示文本
    const infoText = this.scene.add.text(
      area.x + area.width / 2,
      area.y - 20,
      info,
      {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#333333',
        padding: { x: 4, y: 2 }
      }
    ).setOrigin(0.5).setDepth(20)

    // 3秒后自动消失
    this.scene.time.delayedCall(3000, () => {
      infoText.destroy()
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
    this.zoneGraphics = []
    this.zoneLabels = []
  }
}