import Phaser from 'phaser'

/**
 * 战斗场景
 * 游戏核心战斗界面
 */
export default class BattleScene extends Phaser.Scene {
  private levelId: string = ''

  constructor() {
    super({ key: 'BattleScene' })
  }

  /**
   * 场景初始化
   */
  init(data: { levelId: string }): void {
    this.levelId = data.levelId || 'chapter1_level1'
    console.log(`BattleScene: 进入关卡 ${this.levelId}`)
  }

  /**
   * 创建场景内容
   */
  create(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 显示关卡信息（占位）
    this.add.text(width / 2, 50, `关卡: ${this.levelId}`, {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // 显示说明文字
    this.add.text(width / 2, height / 2, '战斗场景开发中...', {
      fontSize: '24px',
      color: '#ffaa00'
    }).setOrigin(0.5)

    // 返回按钮
    this.createBackButton(width, height)
  }

  /**
   * 创建返回按钮
   */
  private createBackButton(width: number, height: number): void {
    const buttonBg = this.add.rectangle(100, height - 50, 150, 40, 0x444444)
    const buttonText = this.add.text(100, height - 50, '返回', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5)

    buttonBg.setInteractive({ useHandCursor: true })

    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x666666)
    })

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x444444)
    })

    buttonBg.on('pointerdown', () => {
      this.scene.start('TitleScene')
    })
  }

  /**
   * 场景更新（每帧调用）
   */
  update(time: number, delta: number): void {
    // 战斗逻辑更新（后续实现）
  }
}