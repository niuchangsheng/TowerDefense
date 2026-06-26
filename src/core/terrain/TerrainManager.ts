import Phaser from 'phaser'
import { TerrainType, TerrainArea, Point, Area } from '@/types'
import { TERRAIN_CONFIGS, getTerrainConfig } from '@/config/terrain.config'

/**
 * 地形管理器
 * 管理地形配置和渲染
 */
export class TerrainManager {
  private scene: Phaser.Scene
  private terrainAreas: TerrainArea[]
  private defaultTerrain: TerrainType
  private terrainGraphics: Phaser.GameObjects.Graphics[]

  constructor(
    scene: Phaser.Scene,
    terrainAreas: TerrainArea[],
    defaultTerrain: TerrainType = 'grass'
  ) {
    this.scene = scene
    this.terrainAreas = terrainAreas
    this.defaultTerrain = defaultTerrain
    this.terrainGraphics = []
  }

  /**
   * 渲染所有地形区域
   */
  renderTerrain(): void {
    // 先渲染默认地形（覆盖整个地图）
    this.renderDefaultTerrain()

    // 再渲染特殊地形区域
    for (const terrainArea of this.terrainAreas) {
      this.renderTerrainArea(terrainArea)
    }

    // 绘制地形边界线（增加视觉层次）
    this.drawTerrainBorders()
  }

  /**
   * 渲染默认地形（整个地图背景）
   */
  private renderDefaultTerrain(): void {
    const config = getTerrainConfig(this.defaultTerrain)
    const width = this.scene.cameras.main.width
    const height = this.scene.cameras.main.height

    const graphics = this.scene.add.graphics()
    graphics.fillStyle(config.color, 0.6)  // 半透明
    graphics.fillRect(0, 0, width, height)
    this.terrainGraphics.push(graphics)
  }

  /**
   * 渲染单个地形区域
   */
  private renderTerrainArea(terrainArea: TerrainArea): void {
    const config = getTerrainConfig(terrainArea.type)
    const area = terrainArea.area

    const graphics = this.scene.add.graphics()
    graphics.fillStyle(config.color, 0.8)  // 更高透明度突出特殊地形
    graphics.fillRect(area.x, area.y, area.width, area.height)

    // 如果有边框颜色，绘制边框
    if (config.borderColor) {
      graphics.lineStyle(2, config.borderColor, 1)
      graphics.strokeRect(area.x, area.y, area.width, area.height)
    }

    // 添加地形名称标签（可选）
    this.addTerrainLabel(terrainArea)

    this.terrainGraphics.push(graphics)
  }

  /**
   * 添加地形名称标签
   */
  private addTerrainLabel(terrainArea: TerrainArea): void {
    const config = getTerrainConfig(terrainArea.type)
    const area = terrainArea.area

    // 在地形区域左上角显示名称
    this.scene.add.text(area.x + 5, area.y + 5, config.name, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 2, y: 1 }
    }).setAlpha(0.7).setDepth(5)
  }

  /**
   * 绘制地形边界线
   */
  private drawTerrainBorders(): void {
    const borderGraphics = this.scene.add.graphics()
    borderGraphics.lineStyle(1, 0x333333, 0.3)

    // 绘制所有地形区域的边界
    for (const terrainArea of this.terrainAreas) {
      const area = terrainArea.area
      borderGraphics.strokeRect(area.x, area.y, area.width, area.height)
    }

    this.terrainGraphics.push(borderGraphics)
  }

  /**
   * 获取指定位置的地形类型
   */
  getTerrainAt(position: Point): TerrainType {
    // 检查位置是否在某个特殊地形区域内
    for (const terrainArea of this.terrainAreas) {
      if (this.isPointInArea(position, terrainArea.area)) {
        return terrainArea.type
      }
    }

    // 默认地形
    return this.defaultTerrain
  }

  /**
   * 判断点是否在区域内
   */
  private isPointInArea(point: Point, area: Area): boolean {
    return point.x >= area.x &&
           point.x <= area.x + area.width &&
           point.y >= area.y &&
           point.y <= area.y + area.height
  }

  /**
   * 获取地形配置
   */
  getTerrainConfig(type: TerrainType): TerrainConfig {
    return getTerrainConfig(type)
  }

  /**
   * 判断位置是否可部署
   */
  canDeployAt(position: Point): boolean {
    const terrainType = this.getTerrainAt(position)
    return TERRAIN_CONFIGS[terrainType].canDeploy
  }

  /**
   * 获取地形对移动速度的影响
   */
  getMoveSpeedMultiplier(position: Point): number {
    const terrainType = this.getTerrainAt(position)
    return TERRAIN_CONFIGS[terrainType].moveSpeedMultiplier
  }

  /**
   * 清理所有地形图形
   */
  destroy(): void {
    for (const graphics of this.terrainGraphics) {
      graphics.destroy()
    }
    this.terrainGraphics = []
  }
}