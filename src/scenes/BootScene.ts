import Phaser from 'phaser'

/**
 * 启动场景
 * 负责系统初始化、配置加载
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  /**
   * 场景初始化
   */
  init(): void {
    console.log('BootScene: 系统初始化')
  }

  /**
   * 预加载资源
   */
  preload(): void {
    // 暂时没有资源需要加载
  }

  /**
   * 创建场景内容
   */
  create(): void {
    console.log('BootScene: 系统初始化完成')

    // 设置游戏配置
    this.setupGameConfig()

    // 转到预加载场景
    this.scene.start('PreloadScene')
  }

  /**
   * 设置游戏配置
   */
  private setupGameConfig(): void {
    // 输入配置
    if (this.input.keyboard) {
      // 可以在这里添加键盘快捷键
    }
  }
}