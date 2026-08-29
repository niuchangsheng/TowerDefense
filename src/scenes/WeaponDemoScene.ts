import Phaser from 'phaser'
import { CharacterAttackFX } from '@/effects/CharacterAttackFX'
import { WeaponFX, WeaponType } from '@/effects/WeaponFX'
import { SoundFX } from '@/effects/SoundFX'
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/constants'

/**
 * 武器特效演示场景（零图片素材）
 * 赵云-长矛前刺 / 关羽-大刀挥砍 / 黄忠-拉弓放箭
 *
 * 每条"泳道"：左边武将(字+手持武器)，右边木桩(敌)，点击武将即可攻击。
 */

interface HeroLane {
  name: string
  weapon: WeaponType
  color: string
  y: number
  attack: 'thrust' | 'slash' | 'bow'
}

export class WeaponDemoScene extends Phaser.Scene {
  private fx!: CharacterAttackFX
  private wfx!: WeaponFX

  private lanes: HeroLane[] = [
    { name: '赵云', weapon: 'spear', color: '#1a3a5a', y: 190, attack: 'thrust' },
    { name: '关羽', weapon: 'blade', color: '#5a1a1a', y: 370, attack: 'slash' },
    { name: '黄忠', weapon: 'bow', color: '#7a5a1a', y: 550, attack: 'bow' }
  ]

  private heroTexts: Phaser.GameObjects.Text[] = []
  private enemyTexts: Phaser.GameObjects.Text[] = []
  private idleWeapons: Phaser.GameObjects.Image[] = []
  private attacking = [false, false, false]

  private HERO_X = 250
  private ENEMY_X = 1000

  constructor() {
    super({ key: 'WeaponDemoScene' })
  }

  create(): void {
    this.fx = new CharacterAttackFX(this)
    this.wfx = new WeaponFX(this, this.fx)
    SoundFX.unlock() // 首次点击/按键后解锁 WebAudio（浏览器自动播放策略）

    this.drawBackground()
    this.createTitle()
    this.createLanes()
    this.startAutoLoop()

    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('TitleScene'))
  }

  private drawBackground(): void {
    this.cameras.main.setBackgroundColor('#e8e0cf')
    const g = this.add.graphics()
    // 宣纸墨点
    ;[
      { x: 180, y: 120, r: 80 },
      { x: 1100, y: 600, r: 120 },
      { x: 640, y: 360, r: 100 }
    ].forEach((b) => {
      g.fillStyle(0x2a2a2a, 0.04)
      g.fillCircle(b.x, b.y, b.r)
    })
  }

  private createTitle(): void {
    this.add
      .text(GAME_WIDTH / 2, 40, '武器特效演示 · 长矛 / 大刀 / 弓箭', {
        fontSize: '28px',
        color: '#3a352a',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 78, '点击武将发起攻击（下方自动循环演示）', {
        fontSize: '17px',
        color: '#8a8577'
      })
      .setOrigin(0.5)

    this.add.text(16, GAME_HEIGHT - 24, '按 ESC 返回标题', {
      fontSize: '16px',
      color: '#8a8577'
    })
  }

  private createLanes(): void {
    this.lanes.forEach((lane, i) => {
      // 武将"字"
      const hero = this.add
        .text(this.HERO_X, lane.y, lane.name, {
          fontFamily: '"STKaiti","KaiTi","Noto Serif SC",serif',
          fontSize: '48px',
          color: lane.color,
          fontStyle: 'bold',
          stroke: '#1a1a1a',
          strokeThickness: 2
        })
        .setOrigin(0.5)
        .setDepth(10)
        .setInteractive({ useHandCursor: true })

      hero.on('pointerdown', () => this.attack(i))
      this.heroTexts.push(hero)

      // 待机手持武器（弓拿在身前，矛/刀斜挎）
      const idleAngle = lane.weapon === 'bow' ? 0 : -Math.PI / 4
      const idle = this.wfx.createWeaponImage(
        lane.weapon,
        this.HERO_X + 42,
        lane.y + 6,
        idleAngle
      )
      idle.setAlpha(0.9)
      this.idleWeapons.push(idle)

      // 敌人木桩"字"
      const enemy = this.add
        .text(this.ENEMY_X, lane.y, '敌', {
          fontFamily: '"STKaiti","KaiTi","Noto Serif SC",serif',
          fontSize: '48px',
          color: '#6b4a2a',
          fontStyle: 'bold',
          stroke: '#2a1a0a',
          strokeThickness: 2
        })
        .setOrigin(0.5)
        .setDepth(10)
      this.enemyTexts.push(enemy)

      // 兵器说明
      const weaponName = lane.weapon === 'spear' ? '长矛' : lane.weapon === 'blade' ? '大刀' : '弓箭'
      this.add
        .text(70, lane.y, weaponName, {
          fontSize: '18px',
          color: '#8a8577'
        })
        .setOrigin(0.5)
    })
  }

  /** 指定泳道发起攻击 */
  private attack(i: number): void {
    if (this.attacking[i]) return
    this.attacking[i] = true

    const lane = this.lanes[i]
    const heroPos = { x: this.HERO_X, y: lane.y }
    const enemyPos = { x: this.ENEMY_X, y: lane.y }
    const enemyText = this.enemyTexts[i]

    // 隐藏待机武器，改用攻击动画那把
    this.idleWeapons[i].setVisible(false)

    // 英雄前冲一点（打击感）
    this.fx.lunge(this.heroTexts[i], enemyPos, lane.attack === 'bow' ? 4 : 14)

    const onHit = () => {
      this.fx.hitShake(enemyText, lane.attack === 'bow' ? 4 : 5)
      const dmg = Phaser.Math.Between(35, 90)
      this.fx.damageText(enemyPos, dmg, { crit: dmg > 70 })
    }

    if (lane.attack === 'thrust') {
      this.wfx.spearThrust(heroPos, enemyPos, onHit)
    } else if (lane.attack === 'slash') {
      this.wfx.bladeSlash(heroPos, enemyPos, onHit)
    } else {
      this.wfx.bowShot(heroPos, enemyPos, onHit)
    }

    // 攻击结束后还原待机武器
    const restoreDelay = lane.attack === 'bow' ? 620 : 380
    this.time.delayedCall(restoreDelay, () => {
      this.idleWeapons[i].setVisible(true)
      this.attacking[i] = false
    })
  }

  /** 自动循环：依次演示三条泳道 */
  private startAutoLoop(): void {
    let i = 0
    this.time.addEvent({
      delay: 1300,
      loop: true,
      callback: () => {
        this.attack(i % 3)
        i++
      }
    })
  }
}
