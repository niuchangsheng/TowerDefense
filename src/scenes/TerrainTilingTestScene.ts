import Phaser from 'phaser'
import { TERRAIN_CONFIGS, getTerrainConfig } from '@/config/terrain.config'
import { TerrainType } from '@/types'

/**
 * 地形平铺测试场景
 * 测试地形tile的无缝平铺效果
 */
export class TerrainTilingTestScene extends Phaser.Scene {
  private tileSize = 256
  private terrainType: TerrainType = 'grass'

  constructor() {
    super({ key: 'TerrainTilingTestScene' })
  }

  init(data: { terrainType: TerrainType }) {
    this.terrainType = data.terrainType || 'grass'
  }

  preload() {
    // 加载当前地形的所有tile
    const config = getTerrainConfig(this.terrainType)

    if (config.tileImages && config.tileImages.length > 0) {
      config.tileImages.forEach((path, index) => {
        this.load.image(`tile_${index}`, path)
      })
    }
  }

  create() {
    // 设置背景
    this.cameras.main.setBackgroundColor(0x2a2a3e)

    // 显示标题
    const config = getTerrainConfig(this.terrainType)
    this.add.text(400, 30, `平铺测试 - ${config.name}`, {
      fontSize: '28px',
      color: '#ffcc00'
    }).setOrigin(0.5)

    // 创建大型平铺测试区域
    this.createTilingTest()

    // 创建平铺模式选择按钮
    this.createPatternButtons()

    // 创建返回按钮
    this.createBackButton()

    // 显示平铺信息
    this.createTilingInfo()
  }

  /**
   * 创建平铺测试区域
   */
  private createTilingTest() {
    const config = getTerrainConfig(this.terrainType)
    const gridWidth = 5
    const gridHeight = 4
    const startX = 40
    const startY = 80

    if (config.tileImages && config.tileImages.length > 0) {
      // 模式1: 单一tile平铺（测试无缝性）
      this.add.text(40, startY - 20, '模式1: 单tile平铺（测试无缝）', {
        fontSize: '16px',
        color: '#ffffff'
      })

      const singleTileKey = 'tile_0' // 使用第一个tile
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          const x = startX + col * this.tileSize
          const y = startY + row * this.tileSize
          this.add.image(x, y, singleTileKey).setOrigin(0)
        }
      }

      // 模式2: 多tile随机平铺（测试多样性）
      const mode2Y = startY + 2 * this.tileSize + 50
      this.add.text(40, mode2Y - 20, '模式2: 多tile随机（测试多样性）', {
        fontSize: '16px',
        color: '#ffffff'
      })

      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          const x = startX + col * this.tileSize
          const y = mode2Y + row * this.tileSize
          const randomIndex = Math.floor(Math.random() * Math.min(5, config.tileImages.length))
          this.add.image(x, y, `tile_${randomIndex}`).setOrigin(0)
        }
      }

      // 模式3: 边缘对比（测试边缘衔接）
      const mode3Y = mode2Y + 2 * this.tileSize + 50
      this.add.text(40, mode3Y - 20, '模式3: 边缘对比（测试衔接）', {
        fontSize: '16px',
        color: '#ffffff'
      })

      // 左边tile_0，右边tile_1
      for (let row = 0; row < 2; row++) {
        this.add.image(startX, mode3Y + row * this.tileSize, 'tile_0').setOrigin(0)
        this.add.image(startX + this.tileSize, mode3Y + row * this.tileSize, 'tile_1').setOrigin(0)
        this.add.image(startX + 2 * this.tileSize, mode3Y + row * this.tileSize, 'tile_2').setOrigin(0)
        this.add.image(startX + 3 * this.tileSize, mode3Y + row * this.tileSize, 'tile_3').setOrigin(0)
      }
    } else {
      this.add.text(400, 300, '该地形暂无tile图片', {
        fontSize: '24px',
        color: '#ff6666'
      }).setOrigin(0.5)
    }
  }

  /**
   * 创建平铺模式选择按钮
   */
  private createPatternButtons() {
    const buttonY = 680

    // 单tile平铺按钮
    this.add.text(100, buttonY, '单tile平铺', {
      fontSize: '16px',
      backgroundColor: '#4a7c4e',
      padding: { x: 10, y: 5 }
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.testSingleTile())

    // 随机平铺按钮
    this.add.text(250, buttonY, '随机平铺', {
      fontSize: '16px',
      backgroundColor: '#228b22',
      padding: { x: 10, y: 5 }
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.testRandomTiling())

    // 棋盘格平铺按钮
    this.add.text(400, buttonY, '棋盘格', {
      fontSize: '16px',
      backgroundColor: '#8b7355',
      padding: { x: 10, y: 5 }
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.testCheckerboard())
  }

  /**
   * 创建返回按钮
   */
  private createBackButton() {
    const backButton = this.add.text(400, 750, '返回测试主页', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#6a6a8a',
      padding: { x: 15, y: 8 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('TerrainTestScene'))
      .on('pointerover', () => backButton.setStyle({ backgroundColor: '#8a8aaa' }))
      .on('pointerout', () => backButton.setStyle({ backgroundColor: '#6a6a8a' }))
  }

  /**
   * 显示平铺信息
   */
  private createTilingInfo() {
    const config = getTerrainConfig(this.terrainType)

    this.add.text(750, 150,
      `Tile尺寸: ${this.tileSize}x${this.tileSize}\n` +
      `可用tile数: ${config.tileImages?.length || 0}\n` +
      `测试网格: 4x2\n` +
      `总显示数: 24个`, {
        fontSize: '14px',
        color: '#aaaaaa',
        align: 'right'
      })
  }

  /**
   * 测试单tile平铺
   */
  private testSingleTile() {
    // 重新加载场景，使用单tile模式
    this.scene.restart({ mode: 'single' })
  }

  /**
   * 测试随机平铺
   */
  private testRandomTiling() {
    // 重新加载场景，使用随机模式
    this.scene.restart({ mode: 'random' })
  }

  /**
   * 测试棋盘格平铺
   */
  private testCheckerboard() {
    // 重新加载场景，使用棋盘格模式
    this.scene.restart({ mode: 'checkerboard' })
  }
}