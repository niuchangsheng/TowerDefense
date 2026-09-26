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
import { SoundFX } from '@/effects/SoundFX'

/**
 * 标题场景（水墨宣纸风）
 * 主菜单界面
 */
export default class TitleScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text
  private isTransitioning: boolean = false

  constructor() {
    super({ key: 'TitleScene' })
  }

  /**
   * 场景初始化
   */
  init(): void {
    this.isTransitioning = false
    if (this.input) this.input.enabled = true
    console.log('TitleScene: 进入主菜单')
  }

  /**
   * 创建场景内容
   */
  create(): void {
    SoundFX.unlock()

    this.events.once('shutdown', () => {
      this.tweens.killAll()
      this.isTransitioning = false
    })

    const width = this.cameras.main.width
    const height = this.cameras.main.height

    drawPaperBackground(this)

    // 绘制写意水墨山水远景与远天归雁
    this.drawLandscapeBackground(width, height)

    // 创建标题
    this.createTitle(width, height)

    // 创建开始按钮
    this.createStartButton(width, height)

    // 创建菜单按钮
    this.createMenuButtons(width, height)

    // 添加背景动画效果
    this.createBackgroundEffect()
  }

  /**
   * 绘制写意水墨山水背景（多重淡墨远山 + 孤舟 + 归雁）
   */
  private drawLandscapeBackground(width: number, height: number): void {
    const g = this.add.graphics()
    g.setDepth(1)

    const drawMountain = (points: [number, number][], fillAlpha: number) => {
      g.fillStyle(InkColor.ink, fillAlpha)
      g.beginPath()
      g.moveTo(points[0][0], height)
      for (const pt of points) {
        g.lineTo(pt[0], pt[1])
      }
      g.lineTo(width, height)
      g.closePath()
      g.fillPath()
    }

    // 1. 最远层：极淡墨色重峦 (alpha 0.05)
    drawMountain([
      [0, height - 200],
      [width * 0.12, height - 260],
      [width * 0.22, height - 340],
      [width * 0.35, height - 220],
      [width * 0.48, height - 280],
      [width * 0.62, height - 330],
      [width * 0.76, height - 240],
      [width * 0.88, height - 310],
      [width, height - 220]
    ], 0.05)

    // 2. 中层：次淡墨色峰峦 (alpha 0.09)
    drawMountain([
      [0, height - 150],
      [width * 0.15, height - 230],
      [width * 0.28, height - 160],
      [width * 0.40, height - 220],
      [width * 0.55, height - 140],
      [width * 0.70, height - 200],
      [width * 0.85, height - 130],
      [width, height - 160]
    ], 0.09)

    // 3. 近水洲渚：矮坡 (alpha 0.13)
    drawMountain([
      [0, height - 70],
      [width * 0.25, height - 110],
      [width * 0.45, height - 60],
      [width * 0.68, height - 100],
      [width * 0.88, height - 65],
      [width, height - 80]
    ], 0.13)

    // 4. 水平淡墨水纹线
    g.lineStyle(1, InkColor.ink, 0.12)
    for (let i = 0; i < 4; i++) {
      const lineY = height - 45 + i * 10
      const startX = (i % 2 === 0 ? 80 : 300) + i * 50
      g.beginPath()
      g.moveTo(startX, lineY)
      g.lineTo(startX + 180 + i * 60, lineY)
      g.strokePath()
    }

    // 5. 远天归雁（一组飞翔的水墨剪影）
    this.createFlyingBirds(width * 0.75, 140)
    this.createFlyingBirds(width * 0.82, 115, 0.8)
    this.createFlyingBirds(width * 0.88, 160, 0.65)
  }

  /**
   * 绘制单只翱翔归雁（两道优雅的毛笔弧线）
   */
  private createFlyingBirds(x: number, y: number, scale: number = 1): void {
    const bird = this.add.graphics({ x, y })
    bird.setDepth(2)
    bird.lineStyle(1.6 * scale, InkColor.ink, 0.45)

    // 优雅两翼线条（局部坐标，以 x,y 为原点）
    bird.beginPath()
    bird.moveTo(-12 * scale, 4 * scale)
    bird.lineTo(-5 * scale, -4 * scale)
    bird.lineTo(0, 0)
    bird.lineTo(5 * scale, -4 * scale)
    bird.lineTo(12 * scale, 4 * scale)
    bird.strokePath()

    // 极微弱的气流浮动动画
    this.tweens.add({
      targets: bird,
      y: y - 8 * scale,
      x: x - 12 * scale,
      duration: 3500 + Phaser.Math.Between(0, 1000),
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
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
    this.titleText.setDepth(10)

    // 标题下方墨线 + 线尾印章
    const ruleY = height / 3 + 52
    const rule = inkRule(this, null, width / 2 - 160, ruleY, 320, 0.4)
    rule.setDepth(10)
    const seal = this.add.rectangle(width / 2 + 180, ruleY, 12, 12, InkColor.cinnabar)
    seal.setDepth(10)

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
    const btn = createInkButton(this, width / 2, height / 2 + 50, 220, 52, '开始游戏', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb53a32,
      textColor: InkText.paper,
      fontSize: InkFontSize.xl,
      onClick: () => this.onStartGame()
    })
    btn.setDepth(10)
  }

  /**
   * 创建菜单按钮
   */
  private createMenuButtons(width: number, height: number): void {
    const buttonX = width / 2
    const buttonY = height / 2 + 115
    const buttonSpacing = 48

    // 武将按钮
    this.createMenuButton(buttonX, buttonY, '武将', () => {
      this.transitionTo('HeroListScene')
    })

    // 装备按钮
    this.createMenuButton(buttonX, buttonY + buttonSpacing, '装备', () => {
      this.transitionTo('EquipmentScene')
    })

    // 无尽试炼按钮
    this.createMenuButton(buttonX, buttonY + buttonSpacing * 2, '百战无尽', () => {
      this.transitionToBattle('level_endless_tower')
    })

    // 存档按钮
    this.createMenuButton(buttonX, buttonY + buttonSpacing * 3, '存档', () => {
      this.transitionTo('SaveScene')
    })
  }

  private transitionToBattle(levelId: string): void {
    if (this.isTransitioning) return
    this.isTransitioning = true
    try {
      this.scene.start('BattleScene', { levelId })
    } catch (err) {
      console.error(`[TitleScene] 启动无尽试炼 ${levelId} 异常:`, err)
      this.isTransitioning = false
    }
  }

  /**
   * 创建单个菜单按钮（宣纸底 + 墨线描边）
   */
  private createMenuButton(x: number, y: number, text: string, callback: () => void): void {
    const btn = createInkButton(this, x, y, 200, 42, text, {
      fill: InkColor.paperPanel,
      hoverFill: InkColor.paperDeep,
      textColor: InkText.ink,
      fontSize: InkFontSize.lg,
      stroke: InkColor.ink,
      onClick: callback
    })
    btn.setDepth(10)
  }

  /**
   * 创建背景效果（在左右山水远景中飘动的五行字，避开中央标题和菜单按钮区域）
   */
  private createBackgroundEffect(): void {
    const width = this.cameras.main.width

    // 锚定于山水留白处的意境点位，严禁落在中轴线 440~840 区域（避免遮挡中央按钮与标题）
    const atmosphericSpots: { wx: WuXing; x: number; y: number }[] = [
      { wx: 'metal', x: width * 0.14, y: 160 },  // 西北方 · 远天
      { wx: 'wood',  x: width * 0.16, y: 520 },  // 西南方 · 苍峦
      { wx: 'water', x: width * 0.28, y: 640 },  // 沧浪洲渚
      { wx: 'fire',  x: width * 0.85, y: 530 },  // 东南方 · 晚照
      { wx: 'earth', x: width * 0.86, y: 170 }   // 东北方 · 极目
    ]

    for (const spot of atmosphericSpots) {
      const style = INK_WUXING[spot.wx]

      const elementText = inkText(this, spot.x, spot.y, style.label, {
        size: 32,
        color: style.text,
        originX: 0.5,
        originY: 0.5
      }).setAlpha(0.28)
      elementText.setDepth(3)

      // 悠缓的微风漂移质感（限制漂移幅度，不往中路靠拢）
      this.tweens.add({
        targets: elementText,
        x: spot.x + Phaser.Math.Between(-15, 15),
        y: spot.y + Phaser.Math.Between(-20, 20),
        alpha: { from: 0.22, to: 0.42 },
        duration: Phaser.Math.Between(3000, 4500),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      })
    }
  }

  /**
   * 安全场景跳转（带防并发与超时自愈恢复保护）
   */
  private transitionTo(sceneKey: string): void {
    if (this.isTransitioning) return
    this.isTransitioning = true

    // 600ms 自动安全解锁保护（若目标场景启动异常，自愈恢复交互状态）
    this.time.delayedCall(600, () => {
      if (this.scene.isActive()) {
        this.isTransitioning = false
        if (this.input) this.input.enabled = true
      }
    })

    try {
      this.scene.start(sceneKey)
    } catch (err) {
      console.error(`[TitleScene] 跳转场景 ${sceneKey} 发生异常:`, err)
      this.isTransitioning = false
      if (this.input) this.input.enabled = true
    }
  }

  /**
   * 开始游戏按钮回调
   */
  private onStartGame(): void {
    console.log('TitleScene: 开始游戏')
    this.transitionTo('LevelSelectScene')
  }
}
