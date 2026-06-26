import Phaser from 'phaser'
import { GAME_TITLE } from '@/config/constants'

/**
 * 预加载场景
 * 负责加载所有游戏资源（图片、音频等）
 */
export default class PreloadScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics
  private progressBar!: Phaser.GameObjects.Graphics
  private loadingText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'PreloadScene' })
  }

  /**
   * 场景初始化
   */
  init(): void {
    console.log('PreloadScene: 开始加载资源')
  }

  /**
   * 预加载资源
   */
  preload(): void {
    this.createLoadingUI()

    // 加载进度事件
    this.load.on('progress', (value: number) => {
      this.updateProgress(value)
    })

    this.load.on('complete', () => {
      console.log('PreloadScene: 资源加载完成')
    })

    // 加载真实资源
    this.loadRealAssets()

    // 加载占位资源（备用）
    this.createPlaceholderTextures()
  }

  /**
   * 创建加载UI
   */
  private createLoadingUI(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 加载文字
    this.loadingText = this.add.text(width / 2, height / 2 - 50, '加载中...', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // 进度条背景
    this.progressBar = this.add.graphics()
    this.loadingBar = this.add.graphics()

    // 进度条样式
    this.loadingBar.fillStyle(0x222222, 0.8)
    this.loadingBar.fillRect(width / 4, height / 2, width / 2, 30)
  }

  /**
   * 更新进度条
   */
  private updateProgress(value: number): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    this.progressBar.clear()
    this.progressBar.fillStyle(0x00ff00, 1)
    this.progressBar.fillRect(
      width / 4 + 5,
      height / 2 + 5,
      (width / 2 - 10) * value,
      20
    )

    this.loadingText.setText(`加载中... ${Math.floor(value * 100)}%`)
  }

  /**
   * 加载真实资源（三国志11素材）
   */
  private loadRealAssets(): void {
    // 加载武将头像
    this.load.image('hero_guanyu', 'assets/images/heroes/San11/face/0002_关羽_1.jpg')
    this.load.image('hero_zhangfei', 'assets/images/heroes/San11/face/0001_张飞_1.jpg')
    this.load.image('hero_zhaoyun', 'assets/images/heroes/San11/face/0009_赵云_1.jpg')

    // 可以加载更多武将头像（后续扩展）
    // this.load.image('hero_lvbu', 'assets/images/heroes/San11/face/0003_吕布_1.jpg')
    // this.load.image('hero_machao', 'assets/images/heroes/San11/face/0004_马超_1.jpg')
    // ...

    console.log('PreloadScene: 武将头像加载完成')
  }

  /**
   * 创建占位纹理（备用）
   */
  private createPlaceholderTextures(): void {
    // 英雄占位（简单矩形）- 作为备用
    const heroGraphics = this.add.graphics()
    heroGraphics.fillStyle(0x00ff00)
    heroGraphics.fillRect(0, 0, 64, 64)
    heroGraphics.generateTexture('hero_placeholder', 64, 64)
    heroGraphics.destroy()

    // 敌人占位
    const enemyGraphics = this.add.graphics()
    enemyGraphics.fillStyle(0xff0000)
    enemyGraphics.fillRect(0, 0, 32, 32)
    enemyGraphics.generateTexture('enemy_placeholder', 32, 32)
    enemyGraphics.destroy()

    // UI按钮占位
    const buttonGraphics = this.add.graphics()
    buttonGraphics.fillStyle(0x4444ff)
    buttonGraphics.fillRect(0, 0, 200, 50)
    buttonGraphics.generateTexture('button_placeholder', 200, 50)
    buttonGraphics.destroy()
  }

  /**
   * 创建场景内容
   */
  create(): void {
    // 隐藏加载UI
    this.loadingBar.destroy()
    this.progressBar.destroy()
    this.loadingText.destroy()

    // 转到标题场景
    this.scene.start('TitleScene')
  }
}