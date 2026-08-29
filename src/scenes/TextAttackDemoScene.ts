import Phaser from 'phaser'
import { CharacterAttackFX } from '@/effects/CharacterAttackFX'
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/constants'

/**
 * 文字攻击特效演示场景
 * 展示"赵云与阿斗"风格：纯汉字单位 + 水墨攻击动画
 *
 * 启动方式（临时）：在 TitleScene 或浏览器控制台执行
 *   this.scene.start('TextAttackDemoScene')
 *
 * 演示内容：
 *  - 近战：英雄"字"前冲 + 刀光弧线
 *  - 远程：发射"枪/箭"字作为投射物
 *  - 技能：环绕文字爆发（AOE）
 *  - 命中：墨迹飞溅 + 伤害飘字 + 受击抖动
 */
export class TextAttackDemoScene extends Phaser.Scene {
  private fx!: CharacterAttackFX

  // 演示用的单位
  private heroText!: Phaser.GameObjects.Text
  private enemyText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'TextAttackDemoScene' })
  }

  create(): void {
    this.fx = new CharacterAttackFX(this)

    this.drawInkBackground()
    this.createUnits()
    this.createControlButtons()
    this.startAutoBattle()

    // 标题
    this.add
      .text(GAME_WIDTH / 2, 36, '文字攻击特效演示（赵云与阿斗风格）', {
        fontSize: '26px',
        color: '#e8e0d0',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)

    // 返回提示
    this.add
      .text(16, GAME_HEIGHT - 24, '按 ESC 返回标题', {
        fontSize: '16px',
        color: '#8a8577'
      })

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('TitleScene')
    })
  }

  /** 水墨风背景：米色宣纸 + 几抹淡墨 */
  private drawInkBackground(): void {
    this.cameras.main.setBackgroundColor('#e8e0cf')

    const g = this.add.graphics()
    // 淡墨晕染斑点，营造宣纸质感
    const blotches = [
      { x: 200, y: 150, r: 90, a: 0.05 },
      { x: 1050, y: 500, r: 130, a: 0.05 },
      { x: 640, y: 620, r: 110, a: 0.04 },
      { x: 950, y: 120, r: 70, a: 0.05 }
    ]
    blotches.forEach((b) => {
      g.fillStyle(0x2a2a2a, b.a)
      g.fillCircle(b.x, b.y, b.r)
    })

    // 一条淡墨横线分隔"战场"
    g.lineStyle(2, 0x2a2a2a, 0.15)
    g.lineBetween(80, GAME_HEIGHT / 2 + 90, GAME_WIDTH - 80, GAME_HEIGHT / 2 + 90)
  }

  /** 创建英雄与敌人"字"单位 */
  private createUnits(): void {
    // 英雄：赵云（左）
    this.heroText = this.add
      .text(280, GAME_HEIGHT / 2 + 20, '赵云', {
        fontFamily: '"STKaiti","KaiTi","Noto Serif SC",serif',
        fontSize: '52px',
        color: '#1a3a5a',
        fontStyle: 'bold',
        stroke: '#0d1f30',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(10)

    // 英雄脚下的五行标记（金）
    this.add
      .text(280, GAME_HEIGHT / 2 + 68, '· 金 ·', {
        fontSize: '18px',
        color: '#b8860b',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)

    // 敌人：敌兵（右）
    this.enemyText = this.add
      .text(920, GAME_HEIGHT / 2 + 20, '敌', {
        fontFamily: '"STKaiti","KaiTi","Noto Serif SC",serif',
        fontSize: '52px',
        color: '#5a1a1a',
        fontStyle: 'bold',
        stroke: '#2b0d0d',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(10)
  }

  /** 手动触发按钮 */
  private createControlButtons(): void {
    const buttons = [
      { label: '① 近战挥砍', y: 120, fn: () => this.playMelee() },
      { label: '② 远程掷枪', y: 180, fn: () => this.playRanged() },
      { label: '③ AOE大招', y: 240, fn: () => this.playSkill() }
    ]

    buttons.forEach((b) => {
      const btn = this.add
        .text(120, b.y, b.label, {
          fontSize: '22px',
          color: '#3a352a',
          backgroundColor: '#d8cfba',
          padding: { x: 14, y: 8 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })

      btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#c8bda0' }))
      btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#d8cfba' }))
      btn.on('pointerdown', b.fn)
    })
  }

  /* ----------------------- 三种攻击演示 ----------------------- */

  /** 近战：前冲 + 刀光 + 墨迹 + 伤害 */
  private playMelee(): void {
    const heroPos = CharacterAttackFX.getWorldXY(this.heroText)
    const enemyPos = CharacterAttackFX.getWorldXY(this.enemyText)

    // 英雄前冲
    this.fx.lunge(this.heroText, enemyPos, 26)

    // 稍延迟后在敌人处出刀
    this.time.delayedCall(110, () => {
      this.fx.slashArc(enemyPos, 0xf5f0e6, 44)
      this.fx.inkSplash(enemyPos, 0x1a1a1a, 14)
      this.fx.hitShake(this.enemyText, 4)
      this.fx.damageText(enemyPos, Phaser.Math.Between(30, 60))
    })
  }

  /** 远程：掷出"枪"字 */
  private playRanged(): void {
    const heroPos = CharacterAttackFX.getWorldXY(this.heroText)
    const enemyPos = CharacterAttackFX.getWorldXY(this.enemyText)

    // 英雄轻微前倾（蓄力感）
    this.fx.lunge(this.heroText, enemyPos, 8)

    this.fx.shootCharacter({
      from: { x: heroPos.x + 30, y: heroPos.y - 10 },
      to: enemyPos,
      char: '枪',
      color: '#1a3a5a',
      fontSize: 34,
      duration: 320,
      arc: 60,
      spin: true,
      onHit: () => {
        this.fx.hitShake(this.enemyText, 4)
        this.fx.damageText(enemyPos, Phaser.Math.Between(40, 80), { crit: true })
      }
    })
  }

  /** 技能：以敌人为中心的环绕文字爆发 */
  private playSkill(): void {
    const heroPos = CharacterAttackFX.getWorldXY(this.heroText)
    const enemyPos = CharacterAttackFX.getWorldXY(this.enemyText)

    // 英雄蓄力：变亮变大再还原
    this.tweens.add({
      targets: this.heroText,
      scale: 1.3,
      duration: 180,
      yoyo: true,
      ease: 'Sine.easeInOut'
    })

    this.time.delayedCall(200, () => {
      // 龙胆大招：多个"龙"字环绕炸开
      this.fx.skillBurst(enemyPos, ['龙', '胆', '枪', '赵', '云', '威'], '#1a3a5a', 96)
      this.fx.hitShake(this.enemyText, 6)
      this.fx.damageText(enemyPos, Phaser.Math.Between(120, 200), { crit: true })
    })
  }

  /** 自动战斗循环：每 1.6 秒随机打一次 */
  private startAutoBattle(): void {
    const actions = [() => this.playMelee(), () => this.playRanged()]
    let i = 0
    this.time.addEvent({
      delay: 1600,
      loop: true,
      callback: () => {
        actions[i % actions.length]()
        i++
      }
    })
  }
}
