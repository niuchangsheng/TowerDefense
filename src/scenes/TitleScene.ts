import Phaser from 'phaser'
import { GAME_TITLE } from '@/config/constants'
import { WuXing } from '@/types'
import {
  InkColor,
  InkText,
  InkFontSize,
  INK_WUXING,
  drawPaperBackground,
  inkText,
  inkRule,
  createInkButton
} from '@/ui/InkTheme'

/**
 * 标题场景（水墨宣纸风）
 * 主菜单界面
 */
export default class TitleScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text

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

    drawPaperBackground(this)

    // 创建标题
    this.createTitle(width, height)

    // 创建开始按钮
    this.createStartButton(width, height)

    // 创建菜单按钮
    this.createMenuButtons(width, height)

    // 添加背景动画效果（可选）
    this.createBackgroundEffect()
  }

  /**
   * 创建标题（楷体大字 + 墨线 + 印章）
   */
  private createTitle(width: number, height: number): void {
    this.titleText = inkText(this, width / 2, height / 3, GAME_TITLE, {
      size: 64,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    })

    // 标题下方墨线 + 线尾印章
    const ruleY = height / 3 + 52
    inkRule(this, null, width / 2 - 160, ruleY, 320, 0.4)
    this.add.rectangle(width / 2 + 180, ruleY, 12, 12, InkColor.cinnabar)

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
   * 创建开始按钮（印章红主按钮）
   */
  private createStartButton(width: number, height: number): void {
    createInkButton(this, width / 2, height / 2 + 50, 220, 52, '开始游戏', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb53a32,
      textColor: InkText.paper,
      fontSize: InkFontSize.xl,
      onClick: () => this.onStartGame()
    })
  }

  /**
   * 创建菜单按钮
   */
  private createMenuButtons(width: number, height: number): void {
    const buttonX = width / 2
    const buttonY = height / 2 + 120
    const buttonSpacing = 50

    // 武将按钮
    this.createMenuButton(buttonX, buttonY, '武将', () => {
      this.scene.start('HeroListScene')
    })

    // 装备按钮
    this.createMenuButton(buttonX, buttonY + buttonSpacing, '装备', () => {
      this.scene.start('EquipmentScene')
    })

    // 存档按钮
    this.createMenuButton(buttonX, buttonY + buttonSpacing * 2, '存档', () => {
      this.scene.start('SaveScene')
    })
  }

  /**
   * 创建单个菜单按钮（宣纸底 + 墨线描边）
   */
  private createMenuButton(x: number, y: number, text: string, callback: () => void): void {
    createInkButton(this, x, y, 200, 42, text, {
      fill: InkColor.paperPanel,
      hoverFill: InkColor.paperDeep,
      textColor: InkText.ink,
      fontSize: InkFontSize.lg,
      stroke: InkColor.ink,
      onClick: callback
    })
  }

  /**
   * 创建背景效果（飘动的五行字，使用水墨五行配色）
   */
  private createBackgroundEffect(): void {
    const elements: WuXing[] = ['metal', 'wood', 'water', 'fire', 'earth']

    for (let i = 0; i < elements.length; i++) {
      const style = INK_WUXING[elements[i]]
      const x = Phaser.Math.Between(100, this.cameras.main.width - 100)
      const y = Phaser.Math.Between(100, this.cameras.main.height - 100)

      const elementText = inkText(this, x, y, style.label, {
        size: 32,
        color: style.text,
        originX: 0.5,
        originY: 0.5
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
    this.scene.start('LevelSelectScene')
  }
}
