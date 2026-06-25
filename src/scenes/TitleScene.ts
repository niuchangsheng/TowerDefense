import Phaser from 'phaser'
import { GAME_TITLE } from '@/config/constants'

/**
 * 标题场景
 * 主菜单界面
 */
export default class TitleScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text
  private startButton!: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'TitleScene' })
  }

  /**
   * 场景初始化
   */
  init(): void {
    console.log('TitleScene: 进入主菜单')
  }

  /**
   * 创建场景内容
   */
  create(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 创建标题
    this.createTitle(width, height)

    // 创建开始按钮
    this.createStartButton(width, height)

    // 创建其他菜单按钮（后续添加）
    // this.createMenuButtons(width, height)

    // 添加背景动画效果（可选）
    this.createBackgroundEffect()
  }

  /**
   * 创建标题
   */
  private createTitle(width: number, height: number): void {
    this.titleText = this.add.text(width / 2, height / 3, GAME_TITLE, {
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // 标题动画效果
    this.tweens.add({
      targets: this.titleText,
      y: height / 3 - 20,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  /**
   * 创建开始按钮
   */
  private createStartButton(width: number, height: number): void {
    const buttonX = width / 2
    const buttonY = height / 2 + 50

    // 按钮背景
    const buttonBg = this.add.rectangle(0, 0, 200, 50, 0x4a90d9)

    // 按钮文字
    const buttonText = this.add.text(0, 0, '开始游戏', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // 创建按钮容器
    this.startButton = this.add.container(buttonX, buttonY, [buttonBg, buttonText])

    // 设置交互
    buttonBg.setInteractive({ useHandCursor: true })

    // 悬停效果
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x5ba3f0)
      this.startButton.setScale(1.05)
    })

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x4a90d9)
      this.startButton.setScale(1)
    })

    // 点击事件
    buttonBg.on('pointerdown', () => {
      this.onStartGame()
    })
  }

  /**
   * 创建背景效果
   */
  private createBackgroundEffect(): void {
    // 创建一些飘动的五行元素图标（占位）
    const elements = ['金', '木', '水', '火', '土']
    const colors = ['#ffffff', '#00ff00', '#0000ff', '#ff0000', '#ffff00']

    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(100, this.cameras.main.width - 100)
      const y = Phaser.Math.Between(100, this.cameras.main.height - 100)

      const elementText = this.add.text(x, y, elements[i], {
        fontSize: '32px',
        color: colors[i]
      }).setAlpha(0.3)

      // 飘动动画
      this.tweens.add({
        targets: elementText,
        x: x + Phaser.Math.Between(-50, 50),
        y: y + Phaser.Math.Between(-50, 50),
        alpha: { from: 0.3, to: 0.5 },
        duration: Phaser.Math.Between(2000, 4000),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      })
    }
  }

  /**
   * 开始游戏按钮回调
   */
  private onStartGame(): void {
    console.log('TitleScene: 开始游戏')

    // 转到关卡选择场景（后续实现）
    // this.scene.start('LevelSelectScene')

    // 暂时转到战斗场景进行测试
    this.scene.start('BattleScene', { levelId: 'chapter1_level1' })
  }
}