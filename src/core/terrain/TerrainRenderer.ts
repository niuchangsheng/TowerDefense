import Phaser from 'phaser'
import { TerrainType, TerrainArea } from '@/types'
import { TERRAIN_CONFIGS, getTerrainConfig } from '@/config/terrain.config'
import { InkColor, InkText, inkText } from '@/ui/InkTheme'

/**
 * 地形渲染器（水墨程序绘制）
 *
 * 战场是一张手绘舆图：宣纸底由场景提供（drawPaperBackground），
 * 这里在其上叠加各类地形的墨晕/墨点/波纹。
 * 绘制全部使用确定性伪随机（区域坐标做种子），保证每次进入关卡画面一致。
 */
export class TerrainRenderer {
  private scene: Phaser.Scene
  private tileSize: number = 256
  private terrainGroup: Phaser.GameObjects.Group

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.terrainGroup = scene.add.group()
  }

  /**
   * 渲染地形区域
   * @param areas 地形区域定义数组
   * @param mapWidth 地图宽度（保留参数，纸底由场景绘制）
   * @param mapHeight 地图高度（保留参数）
   */
  renderTerrainAreas(areas: TerrainArea[], _mapWidth: number, _mapHeight: number): void {
    // 清除旧的地形
    this.terrainGroup.clear(true, true)

    // 纸底（宣纸 + 淡墨晕染）由场景的 drawPaperBackground 提供，此处不再铺底色

    // 按区域渲染特定地形
    areas.forEach(area => {
      this.renderArea(area)
    })
  }

  /**
   * 渲染单个地形区域
   */
  private renderArea(area: TerrainArea): void {
    // 草原 = 纸面本身，不额外绘制
    if (area.type === 'grass') {
      return
    }

    this.drawInkTerrainArea(area)
  }

  /**
   * 水墨程序绘制地形区域
   */
  private drawInkTerrainArea(area: TerrainArea): void {
    const g = this.scene.add.graphics()
    g.setDepth(0)

    const rand = this.makeRand(area.area.x * 7919 + area.area.y * 104729 + area.area.width * 31)

    switch (area.type) {
      case 'mountain':
        this.drawMountains(g, area, rand)
        break
      case 'river':
        this.drawRiver(g, area, rand)
        break
      case 'forest':
        this.drawForest(g, area, rand)
        break
      default:
        this.drawGenericWash(g, area)
        break
    }

    // 区域名称小字（楷体淡墨）
    const config = getTerrainConfig(area.type)
    const label = inkText(this.scene, area.area.x + 8, area.area.y + 6, config.name, {
      size: 12,
      color: InkText.wash
    })
    label.setAlpha(0.55)
    label.setDepth(1)
    this.terrainGroup.add(label)

    this.terrainGroup.add(g)
  }

  /**
   * 山地：层层墨晕山影
   */
  private drawMountains(
    g: Phaser.GameObjects.Graphics,
    area: TerrainArea,
    rand: () => number
  ): void {
    const { x, y, width, height } = area.area

    // 淡墨底
    g.fillStyle(InkColor.ink, 0.05)
    g.fillRect(x, y, width, height)

    // 2~3 层山影，由低到高逐层加深
    const layers = 3
    for (let l = 0; l < layers; l++) {
      const baseY = y + height - (height * l) / (layers + 1.2)
      const alpha = 0.10 + l * 0.06
      const peaks = 2 + Math.floor(rand() * 3)

      g.fillStyle(InkColor.ink, alpha)
      for (let p = 0; p < peaks; p++) {
        const peakW = (width / peaks) * (0.8 + rand() * 0.5)
        const peakH = height * (0.35 + rand() * 0.3) * (1 - l * 0.15)
        const cx = x + (width / peaks) * (p + 0.5) + (rand() - 0.5) * 20

        // 山影 = 三角形，两侧略收，模拟墨晕
        g.fillTriangle(
          cx - peakW / 2, baseY,
          cx, baseY - peakH,
          cx + peakW / 2, baseY
        )
      }
    }

    // 墨线勾边（极淡）
    g.lineStyle(1, InkColor.ink, 0.18)
    g.strokeRect(x, y, width, height)
  }

  /**
   * 河流：淡水色底 + 波纹线
   */
  private drawRiver(
    g: Phaser.GameObjects.Graphics,
    area: TerrainArea,
    rand: () => number
  ): void {
    const { x, y, width, height } = area.area

    // 水体底色（素雅水色）
    g.fillStyle(0x3f5f7a, 0.15)
    g.fillRect(x, y, width, height)

    // 波纹：3~4 条弧线，沿短轴方向排列
    const horizontal = width >= height
    const lines = 3 + Math.floor(rand() * 2)

    g.lineStyle(1.5, 0x3f5f7a, 0.3)
    for (let i = 0; i < lines; i++) {
      const offset = ((i + 1) / (lines + 1)) * (horizontal ? height : width)
      const wobble = 4 + rand() * 4

      g.beginPath()
      if (horizontal) {
        const yy = y + offset
        g.moveTo(x + 6, yy)
        for (let px = x + 6; px <= x + width - 6; px += 16) {
          g.lineTo(px + 8, yy + Math.sin((px - x) / 12) * wobble * 0.4)
        }
      } else {
        const xx = x + offset
        g.moveTo(xx, y + 6)
        for (let py = y + 6; py <= y + height - 6; py += 16) {
          g.lineTo(xx + Math.sin((py - y) / 12) * wobble * 0.4, py + 8)
        }
      }
      g.strokePath()
    }

    // 岸线
    g.lineStyle(1.5, InkColor.ink, 0.25)
    g.strokeRect(x, y, width, height)
  }

  /**
   * 森林：墨点树丛
   */
  private drawForest(
    g: Phaser.GameObjects.Graphics,
    area: TerrainArea,
    rand: () => number
  ): void {
    const { x, y, width, height } = area.area

    // 极淡林地底
    g.fillStyle(InkColor.ink, 0.04)
    g.fillRect(x, y, width, height)

    // 网格抖动撒墨点
    const step = 26
    for (let py = y + 14; py < y + height - 8; py += step) {
      for (let px = x + 14; px < x + width - 8; px += step) {
        const jx = px + (rand() - 0.5) * 12
        const jy = py + (rand() - 0.5) * 12
        const r = 7 + rand() * 8

        // 树丛 = 一大一小两个墨点
        g.fillStyle(InkColor.ink, 0.16 + rand() * 0.12)
        g.fillCircle(jx, jy, r)
        g.fillStyle(InkColor.ink, 0.22)
        g.fillCircle(jx + r * 0.5, jy - r * 0.55, r * 0.45)
      }
    }
  }

  /**
   * 其余地形的兜底：极淡 wash + 墨线框
   */
  private drawGenericWash(g: Phaser.GameObjects.Graphics, area: TerrainArea): void {
    const { x, y, width, height } = area.area
    const config = getTerrainConfig(area.type)

    g.fillStyle(config.color, 0.12)
    g.fillRect(x, y, width, height)
    g.lineStyle(1, InkColor.ink, 0.25)
    g.strokeRect(x, y, width, height)
  }

  /**
   * 确定性伪随机（LCG），保证同一区域每次渲染结果一致
   */
  private makeRand(seed: number): () => number {
    let s = seed >>> 0 || 1
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0
      return s / 4294967296
    }
  }

  /**
   * 渲染地形网格（用于调试）
   */
  renderDebugGrid(mapWidth: number, mapHeight: number): void {
    for (let row = 0; row <= mapHeight; row++) {
      const line = this.scene.add.line(
        0, row * this.tileSize,
        0, 0,
        mapWidth * this.tileSize, 0,
        InkColor.inkFaint
      )
      line.setAlpha(0.3)
      line.setDepth(100)
      this.terrainGroup.add(line)
    }

    for (let col = 0; col <= mapWidth; col++) {
      const line = this.scene.add.line(
        col * this.tileSize, 0,
        0, 0,
        0, mapHeight * this.tileSize,
        InkColor.inkFaint
      )
      line.setAlpha(0.3)
      line.setDepth(100)
      this.terrainGroup.add(line)
    }
  }

  /**
   * 高亮特定地形区域（用于交互）
   */
  highlightTerrainArea(x: number, y: number, _terrainType: TerrainType): Phaser.GameObjects.Rectangle {
    const highlight = this.scene.add.rectangle(
      x + this.tileSize / 2,
      y + this.tileSize / 2,
      this.tileSize,
      this.tileSize,
      InkColor.cinnabar,
      0.12
    )

    highlight.setStrokeStyle(2, InkColor.cinnabar)
    highlight.setDepth(1)

    return highlight
  }

  /**
   * 清除所有地形
   */
  clear(): void {
    this.terrainGroup.clear(true, true)
  }

  /**
   * 获取地形组（用于批量操作）
   */
  getTerrainGroup(): Phaser.GameObjects.Group {
    return this.terrainGroup
  }

  /**
   * 设置tile尺寸
   */
  setTileSize(size: number): void {
    this.tileSize = size
  }

  /**
   * 获取tile尺寸
   */
  getTileSize(): number {
    return this.tileSize
  }
}
