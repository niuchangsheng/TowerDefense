import Phaser from 'phaser'
import { TerrainType, TerrainConfig, TerrainArea } from '@/types'
import { TERRAIN_CONFIGS, getTerrainConfig } from '@/config/terrain.config'

/**
 * 地形渲染器
 *负责渲染游戏地图上的地形tile
 */
export class TerrainRenderer {
  private scene: Phaser.Scene
  private tileSize: number = 256
  private terrainGroup: Phaser.GameObjects.Group
  private loadedTiles: Map<TerrainType, string[]> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.terrainGroup = scene.add.group()
  }

  /**
   * 预加载地形资源
   */
  preloadTerrains(): void {
    for (const [terrainType, config] of Object.entries(TERRAIN_CONFIGS)) {
      if (config.tileImages && config.tileImages.length > 0) {
        // 存储tile路径
        this.loadedTiles.set(terrainType as TerrainType, config.tileImages)

        // 加载每个tile图片
        config.tileImages.forEach((path, index) => {
          const key = this.getTileKey(terrainType as TerrainType, index)
          this.scene.load.image(key, path)
        })
      }
    }
  }

  /**
   * 渲染地形区域
   * @param areas 地形区域定义数组
   * @param mapWidth 地图宽度（tile数）
   * @param mapHeight 地图高度（tile数）
   */
  renderTerrainAreas(areas: TerrainArea[], mapWidth: number, mapHeight: number): void {
    // 清除旧的地形
    this.terrainGroup.clear(true, true)

    // 创建默认背景（平原）
    this.renderDefaultTerrain(mapWidth, mapHeight)

    // 按区域渲染特定地形
    areas.forEach(area => {
      this.renderArea(area)
    })
  }

  /**
   * 渲染默认地形（平原填充整个地图）
   */
  private renderDefaultTerrain(mapWidth: number, mapHeight: number): void {
    const defaultTerrain: TerrainType = 'grass'

    for (let row = 0; row < mapHeight; row++) {
      for (let col = 0; col < mapWidth; col++) {
        const x = col * this.tileSize
        const y = row * this.tileSize

        this.renderTile(defaultTerrain, x, y, 0)
      }
    }
  }

  /**
   * 渲染单个地形区域
   */
  private renderArea(area: TerrainArea): void {
    const config = getTerrainConfig(area.type)

    if (!config.tileImages || config.tileImages.length === 0) {
      // 如果没有tile图片，用颜色块代替
      this.renderColorBlock(area)
      return
    }

    // 计算区域需要多少tile
    const startX = Math.floor(area.area.x / this.tileSize)
    const startY = Math.floor(area.area.y / this.tileSize)
    const tilesX = Math.ceil(area.area.width / this.tileSize)
    const tilesY = Math.ceil(area.area.height / this.tileSize)

    // 渲染该区域
    for (let row = startY; row < startY + tilesY; row++) {
      for (let col = startX; col < startX + tilesX; col++) {
        const x = col * this.tileSize
        const y = row * this.tileSize

        // 使用随机tile增加视觉多样性
        const randomIndex = Math.floor(Math.random() * Math.min(3, config.tileImages.length))
        this.renderTile(area.type, x, y, randomIndex)
      }
    }
  }

  /**
   * 渲染单个tile
   */
  private renderTile(terrainType: TerrainType, x: number, y: number, tileIndex: number): void {
    const key = this.getTileKey(terrainType, tileIndex)

    // 检查是否已加载
    if (this.scene.textures.exists(key)) {
      const tile = this.scene.add.image(x, y, key)
      tile.setOrigin(0)
      tile.setDepth(0) // 地形在最底层
      this.terrainGroup.add(tile)
    } else {
      // 如果纹理不存在，使用备用颜色
      const config = getTerrainConfig(terrainType)
      this.renderFallbackColor(x, y, config.color)
    }
  }

  /**
   * 渲染颜色块（备用方案）
   */
  private renderColorBlock(area: TerrainArea): void {
    const config = getTerrainConfig(area.type)

    const block = this.scene.add.rectangle(
      area.area.x + area.area.width / 2,
      area.area.y + area.area.height / 2,
      area.area.width,
      area.area.height,
      config.color
    )

    if (config.borderColor) {
      block.setStrokeStyle(2, config.borderColor)
    }

    block.setDepth(0)
    this.terrainGroup.add(block)
  }

  /**
   * 渲染备用颜色（单个tile）
   */
  private renderFallbackColor(x: number, y: number, color: number): void {
    const block = this.scene.add.rectangle(
      x + this.tileSize / 2,
      y + this.tileSize / 2,
      this.tileSize,
      this.tileSize,
      color
    )

    block.setDepth(0)
    this.terrainGroup.add(block)
  }

  /**
   * 生成tile的key
   */
  private getTileKey(terrainType: TerrainType, index: number): string {
    return `terrain_${terrainType}_tile_${index}`
  }

  /**
   * 获取随机tile索引
   */
  private getRandomTileIndex(terrainType: TerrainType): number {
    const config = getTerrainConfig(terrainType)

    if (!config.tileImages || config.tileImages.length === 0) {
      return 0
    }

    // 使用前3个最佳tile（通常质量最好）
    const maxIndex = Math.min(3, config.tileImages.length)
    return Math.floor(Math.random() * maxIndex)
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
        0x444444
      )
      line.setDepth(100)
      this.terrainGroup.add(line)
    }

    for (let col = 0; col <= mapWidth; col++) {
      const line = this.scene.add.line(
        col * this.tileSize, 0,
        0, 0,
        0, mapHeight * this.tileSize,
        0x444444
      )
      line.setDepth(100)
      this.terrainGroup.add(line)
    }
  }

  /**
   * 高亮特定地形区域（用于交互）
   */
  highlightTerrainArea(x: number, y: number, terrainType: TerrainType): Phaser.GameObjects.Rectangle {
    const config = getTerrainConfig(terrainType)

    const highlight = this.scene.add.rectangle(
      x + this.tileSize / 2,
      y + this.tileSize / 2,
      this.tileSize,
      this.tileSize,
      config.color,
      0.3 // 半透明
    )

    highlight.setStrokeStyle(3, 0xffcc00)
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