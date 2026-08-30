import Phaser from 'phaser'
import { TerrainType, TerrainArea, TerrainConfig, Point, Area } from '@/types'
import { TERRAIN_CONFIGS, getTerrainConfig } from '@/config/terrain.config'
import { TerrainRenderer } from './TerrainRenderer'

/**
 * 地形管理器
 * 管理地形配置和渲染（水墨程序绘制，见 TerrainRenderer）
 */
export class TerrainManager {
  private scene: Phaser.Scene
  private terrainAreas: TerrainArea[]
  private defaultTerrain: TerrainType
  private terrainRenderer: TerrainRenderer

  constructor(
    scene: Phaser.Scene,
    terrainAreas: TerrainArea[],
    defaultTerrain: TerrainType = 'grass'
  ) {
    this.scene = scene
    this.terrainAreas = terrainAreas
    this.defaultTerrain = defaultTerrain
    this.terrainRenderer = new TerrainRenderer(scene)
  }

  /**
   * 渲染所有地形区域（宣纸底由场景的 drawPaperBackground 提供）
   */
  renderTerrain(mapWidth: number = 10, mapHeight: number = 10): void {
    this.terrainRenderer.renderTerrainAreas(this.terrainAreas, mapWidth, mapHeight)
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
    this.terrainRenderer.clear()
  }
}
