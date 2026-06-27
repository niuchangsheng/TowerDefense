import Phaser from 'phaser'
import { TERRAIN_CONFIGS } from '@/config/terrain.config'

/**
 * 地形测试场景
 * 用于预览和测试所有地形tile的渲染效果
 */
export class TerrainTestScene extends Phaser.Scene {
  private tileSize = 256
  private previewGrid: Phaser.GameObjects.Group | null = null
  private currentTerrainIndex = 0
  private terrainTypes = Object.keys(TERRAIN_CONFIGS)

  constructor() {
    super({ key: 'TerrainTestScene' })
  }

  preload() {
    // 加载所有地形tile图片
    this.loadTerrainTiles()
  }

  create() {
    // 设置背景色
    this.cameras.main.setBackgroundColor(0x1a1a2e)

    // 显示标题
    this.add.text(400, 30, '地形素材测试预览', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5)

    // 显示当前地形信息
    this.createTerrainInfoPanel()

    // 创建地形预览网格
    this.createTerrainPreviewGrid()

    // 创建导航按钮
    this.createNavigationButtons()

    // 创建说明文本
    this.createInstructions()
  }

  /**
   * 加载所有地形tile图片
   */
  private loadTerrainTiles() {
    for (const [terrainType, config] of Object.entries(TERRAIN_CONFIGS)) {
      if (config.tileImages && config.tileImages.length > 0) {
        // 加载该地形的第一个tile作为预览
        const tilePath = config.tileImages[0]
        this.load.image(`${terrainType}_preview`, tilePath)

        // 同时加载该地形的所有变体（用于详细测试）
        config.tileImages.forEach((path, index) => {
          this.load.image(`${terrainType}_tile_${index}`, path)
        })
      }
    }
  }

  /**
   * 创建地形信息面板
   */
  private createTerrainInfoPanel() {
    const panelX = 100
    const panelY = 100

    // 信息面板背景
    this.add.rectangle(panelX, panelY, 180, 300, 0x2d2d44)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x4a4a6a)

    // 地形名称
    const currentType = this.terrainTypes[this.currentTerrainIndex]
    const config = TERRAIN_CONFIGS[currentType as keyof typeof TERRAIN_CONFIGS]

    this.add.text(panelX, panelY - 80, `地形: ${config.name}`, {
      fontSize: '20px',
      color: '#ffcc00',
      fontFamily: 'Arial'
    }).setOrigin(0.5)

    // 显示属性信息
    const infoLines = [
      `移动消耗: ${config.movementCost}`,
      `防御加成: ${config.defenseBonus}%`,
      `攻击加成: ${config.attackBonus}%`,
      `骑兵通行: ${config.canPassCavalry ? '✓' : '✗'}`,
      `可部署: ${config.canDeploy ? '✓' : '✗'}`,
      `速度倍率: ${config.moveSpeedMultiplier}`,
      `Tile数: ${config.tileImages?.length || 0}`
    ]

    infoLines.forEach((line, index) => {
      this.add.text(panelX, panelY - 40 + index * 25, line, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }).setOrigin(0.5)
    })
  }

  /**
   * 创建地形预览网格
   */
  private createTerrainPreviewGrid() {
    const currentType = this.terrainTypes[this.currentTerrainIndex]
    const config = TERRAIN_CONFIGS[currentType as keyof typeof TERRAIN_CONFIGS]

    // 清除之前的预览
    if (this.previewGrid) {
      this.previewGrid.destroy(true)
    }

    this.previewGrid = this.add.group()

    // 预览区域起始位置
    const startX = 350
    const startY = 150
    const cols = 3
    const rows = 3

    if (config.tileImages && config.tileImages.length > 0) {
      // 显示3x3的网格预览（使用前9个tile）
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const tileIndex = row * cols + col
          const x = startX + col * this.tileSize
          const y = startY + row * this.tileSize

          if (tileIndex < config.tileImages.length) {
            // 添加tile图片
            const tileKey = `${currentType}_tile_${tileIndex}`
            const tile = this.add.image(x, y, tileKey)
            this.previewGrid?.add(tile)

            // 添加tile编号标签
            this.add.text(x, y + this.tileSize / 2 + 10, `#${tileIndex}`, {
              fontSize: '12px',
              color: '#aaaaaa'
            }).setOrigin(0.5)
          }
        }
      }
    } else {
      // 如果没有tile图片，显示占位符
      this.add.text(startX + this.tileSize, startY + this.tileSize,
        '暂无tile图片', {
          fontSize: '24px',
          color: '#ff6666'
        }).setOrigin(0.5)
    }
  }

  /**
   * 创建导航按钮
   */
  private createNavigationButtons() {
    const buttonY = 650

    // 上一个地形按钮
    const prevButton = this.add.text(200, buttonY, '◀ 上一个', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#4a4a6a',
      padding: { x: 20, y: 10 }
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.switchTerrain(-1))
      .on('pointerover', () => prevButton.setStyle({ backgroundColor: '#6a6a8a' }))
      .on('pointerout', () => prevButton.setStyle({ backgroundColor: '#4a4a6a' }))

    // 下一个地形按钮
    const nextButton = this.add.text(600, buttonY, '下一个 ▶', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#4a4a6a',
      padding: { x: 20, y: 10 }
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.switchTerrain(1))
      .on('pointerover', () => nextButton.setStyle({ backgroundColor: '#6a6a8a' }))
      .on('pointerout', () => nextButton.setStyle({ backgroundColor: '#4a4a6a' }))

    // 平铺测试按钮
    const testButton = this.add.text(400, buttonY + 50, '测试平铺效果', {
      fontSize: '18px',
      color: '#00ff00',
      backgroundColor: '#2a5a3a',
      padding: { x: 15, y: 8 }
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.testTiling())
      .setOrigin(0.5)
  }

  /**
   * 创建说明文本
   */
  private createInstructions() {
    this.add.text(400, 750,
      '点击按钮切换地形类型 | 每个地形显示3×3预览网格',
      {
        fontSize: '14px',
        color: '#888888',
        fontFamily: 'Arial'
      }).setOrigin(0.5)

    // 显示当前地形索引
    this.add.text(400, 770,
      `当前: ${this.currentTerrainIndex + 1} / ${this.terrainTypes.length}`,
      {
        fontSize: '12px',
        color: '#666666'
      }).setOrigin(0.5)
  }

  /**
   * 切换地形类型
   */
  private switchTerrain(direction: number) {
    this.currentTerrainIndex += direction

    // 循环切换
    if (this.currentTerrainIndex < 0) {
      this.currentTerrainIndex = this.terrainTypes.length - 1
    } else if (this.currentTerrainIndex >= this.terrainTypes.length) {
      this.currentTerrainIndex = 0
    }

    // 重新创建场景（简化刷新）
    this.scene.restart()
  }

  /**
   * 测试平铺效果
   */
  private testTiling() {
    // 启动平铺测试场景
    this.scene.start('TerrainTilingTestScene', {
      terrainType: this.terrainTypes[this.currentTerrainIndex]
    })
  }
}