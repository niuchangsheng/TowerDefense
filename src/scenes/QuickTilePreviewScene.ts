import Phaser from 'phaser'

/**
 * 快速Tile效果预览场景
 * 展示快速方案推荐的每种地形最佳tile
 */
export class QuickTilePreviewScene extends Phaser.Scene {
  private tileSize = 256
  private terrainNames = [
    '平原', '森林', '山地', '河流', '湿地',
    '道路', '桥梁', '城塞', '雪地', '沙漠'
  ]

  // 快速方案推荐的tile（坐标02_02）
  private recommendedTiles = {
    '平原': '平原_02_02.png',
    '森林': '森林_02_02.png',
    '山地': '山地_02_02.png',
    '河流': '河流_02_02.png',
    '湿地': '湿地_02_02.png',
    '道路': '道路_02_02.png',
    '桥梁': '桥梁_02_02.png',
    '城塞': '城塞_02_02.png',
    '雪地': '雪地_02_02.png',
    '沙漠': '沙漠_02_02.png'
  }

  constructor() {
    super({ key: 'QuickTilePreviewScene' })
  }

  preload() {
    // 加载所有推荐的tile
    this.loadRecommendedTiles()
  }

  create() {
    // 设置背景
    this.cameras.main.setBackgroundColor(0x1e1e2e)

    // 显示标题
    this.add.text(400, 30, '快速方案 - 推荐Tile预览', {
      fontSize: '28px',
      color: '#ffcc00',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(400, 60, '每种地形展示推荐的02_02位置tile（中心区域，质量较好）', {
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(0.5)

    // 创建预览网格（5列×2行）
    this.createPreviewGrid()

    // 创建平铺测试区域
    this.createTilingTest()

    // 创建说明文本
    this.createInfoPanel()

    // 返回按钮
    this.createBackButton()
  }

  /**
   * 加载推荐的tile
   */
  private loadRecommendedTiles() {
    const basePath = 'assets/images/terrains_tiles'

    for (const [terrain, tileFile] of Object.entries(this.recommendedTiles)) {
      const path = `${basePath}/${terrain}/${tileFile}`
      this.load.image(`best_${terrain}`, path)
    }
  }

  /**
   * 创建预览网格（单tile展示）
   */
  private createPreviewGrid() {
    const startX = 40
    const startY = 100
    const cols = 5
    const rows = 2
    const spacing = 5

    for (let i = 0; i < this.terrainNames.length; i++) {
      const terrain = this.terrainNames[i]
      const col = i % cols
      const row = Math.floor(i / cols)

      const x = startX + col * (this.tileSize + spacing)
      const y = startY + row * (this.tileSize + spacing)

      // 显示tile图片
      const tile = this.add.image(x, y, `best_${terrain}`)
      tile.setOrigin(0)
      tile.setScale(0.5) // 缩小显示以适应屏幕

      // 添加地形名称标签
      this.add.text(x + this.tileSize * 0.25, y + this.tileSize * 0.5 + 15, terrain, {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#333366',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5)

      // 添加tile坐标标签
      this.add.text(x + this.tileSize * 0.25, y + this.tileSize * 0.5 + 35, '(02_02)', {
        fontSize: '12px',
        color: '#88ff88'
      }).setOrigin(0.5)
    }
  }

  /**
   * 创建平铺测试区域（展示实际平铺效果）
   */
  private createTilingTest() {
    const startY = 420

    this.add.text(400, startY - 30, '平铺测试（3×3网格）', {
      fontSize: '18px',
      color: '#00ffaa'
    }).setOrigin(0.5)

    // 选择平原作为平铺示例
    const demoTerrain = '平原'
    const startX = 150
    const testTileSize = 128 // 缩小以适应屏幕

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = startX + col * testTileSize
        const y = startY + row * testTileSize

        const tile = this.add.image(x, y, `best_${demoTerrain}`)
        tile.setOrigin(0)
        tile.setScale(testTileSize / this.tileSize)
      }
    }

    // 平铺说明
    this.add.text(startX + 1.5 * testTileSize, startY + 3 * testTileSize + 10,
      '平原tile平铺示例', {
        fontSize: '14px',
        color: '#ffffff'
      }).setOrigin(0.5)
  }

  /**
   * 创建信息面板
   */
  private createInfoPanel() {
    const panelX = 720
    const panelY = 450

    // 信息面板背景
    this.add.rectangle(panelX, panelY, 150, 200, 0x2a2a4a)
      .setStrokeStyle(2, 0x4a4a6a)

    // 显示信息
    const info = [
      '快速方案特点:',
      '',
      '✅ 瞬时完成',
      '✅ 选择中心位置',
      '✅ 避免边缘裁剪',
      '✅ 细节丰富',
      '',
      '推荐位置: 02_02',
      '(坐标居中区域)'
    ]

    info.forEach((text, index) => {
      this.add.text(panelX, panelY - 90 + index * 20, text, {
        fontSize: '12px',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5)
    })
  }

  /**
   * 创建返回按钮
   */
  private createBackButton() {
    const backButton = this.add.text(400, 770, '返回主菜单', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#4a4a6a',
      padding: { x: 20, y: 10 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backButton.setStyle({ backgroundColor: '#6a6a8a' }))
      .on('pointerout', () => backButton.setStyle({ backgroundColor: '#4a4a6a' }))
      .on('pointerdown', () => {
        this.scene.start('TerrainTestScene')
      })

    // 提示文本
    this.add.text(400, 740, '点击查看所有tile变体', {
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5)
  }
}