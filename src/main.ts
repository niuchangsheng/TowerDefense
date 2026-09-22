import Phaser from 'phaser'
import gameConfig from './config/game.config'

// 主入口文件
class Game {
  private game: Phaser.Game

  constructor() {
    // 创建Phaser游戏实例
    this.game = new Phaser.Game(gameConfig)
    ;(window as any).game = this.game

    // 窗口大小变化时调整游戏尺寸
    window.addEventListener('resize', this.handleResize.bind(this))
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize(): void {
    // 保持游戏比例，适应窗口
    const width = window.innerWidth
    const height = window.innerHeight

    // 可以在这里实现响应式调整逻辑
  }

  /**
   * 销毁游戏实例
   */
  public destroy(): void {
    this.game.destroy(true)
    window.removeEventListener('resize', this.handleResize)
  }
}

// 启动游戏
new Game()