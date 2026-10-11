import Phaser from 'phaser'
import gameConfig from './config/game.config'
import { INK_FONT, INK_FONT_RESOLUTION } from './ui/InkTheme'

// 全局增强 Phaser.GameObjects.GameObjectFactory.prototype.text 渲染清晰度
// 拦截所有通过 this.add.text() 创建的文字，统一注入高分屏超采样 resolution、整数字号与整数像素对齐
const origFactoryText = Phaser.GameObjects.GameObjectFactory.prototype.text
Phaser.GameObjects.GameObjectFactory.prototype.text = function (
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle
) {
  const safeStyle: Phaser.Types.GameObjects.Text.TextStyle = { ...style }

  // 严禁将含有 undefined 值的属性传给 Phaser TextStyle，防止 Phaser 内部 GetAdvancedValue 产生 NaN
  for (const key of Object.keys(safeStyle)) {
    if ((safeStyle as any)[key] === undefined) {
      delete (safeStyle as any)[key]
    }
  }

  // 1. 若未指定字体或使用兜底 serif/Courier，统一应用水墨字体栈
  if (!safeStyle.fontFamily || safeStyle.fontFamily === 'Courier' || safeStyle.fontFamily === 'serif') {
    safeStyle.fontFamily = INK_FONT
  }

  // 2. 保证字号为整数字号，避免类似 13.5px 导致 Canvas 2D 亚像素失真
  let sizeNum = 16
  if (typeof safeStyle.fontSize === 'string') {
    const match = safeStyle.fontSize.match(/^([0-9.]+)(px)?$/)
    if (match) {
      sizeNum = Math.max(1, Math.round(parseFloat(match[1])))
      safeStyle.fontSize = `${sizeNum}px`
    }
  } else if (typeof safeStyle.fontSize === 'number') {
    sizeNum = Math.max(1, Math.round(safeStyle.fontSize))
    safeStyle.fontSize = sizeNum
  }

  // 3. 高清超采样分辨率注入：小字号 (<=14px) 汉字笔画复杂，保底 3x；常规字号保底 2x
  if (!safeStyle.resolution || safeStyle.resolution <= 1) {
    safeStyle.resolution = sizeNum <= 14 ? Math.max(INK_FONT_RESOLUTION, 3) : INK_FONT_RESOLUTION
  }

  // 4. 小字号字重增强：未指定 fontStyle 时，<=14px 默认加粗防止楷体细横线发虚断笔
  if (!safeStyle.fontStyle && sizeNum <= 14) {
    safeStyle.fontStyle = 'bold'
  }

  // 5. 预留文字边缘微距 padding，防止书法笔锋及描边被 Canvas 边界裁切
  if (!safeStyle.padding) {
    safeStyle.padding = { left: 2, right: 2, top: 1, bottom: 1 }
  }

  return origFactoryText.call(this, Math.round(x), Math.round(y), text, safeStyle)
}

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