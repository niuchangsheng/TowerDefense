import Phaser from 'phaser'
import { CharacterAttackFX } from '@/effects/CharacterAttackFX'
import { WeaponFX } from '@/effects/WeaponFX'
import { SoundFX } from '@/effects/SoundFX'
import { troops } from '@/data/troops'
import { TroopConfig } from '@/types'
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/constants'

/**
 * 兵种演示场景（零图片素材）
 * 枪兵 / 骑兵 / 刀兵 / 弓兵 —— 各用单字展示，手持对应武器（枪/枪/刀/弓）
 *
 * 每条"泳道"：左边兵种(单字+手持武器)，右边木桩(敌)，点击兵种即可攻击。
 */
export class TroopDemoScene extends Phaser.Scene {
  private fx!: CharacterAttackFX
  private wfx!: WeaponFX

  private troopTexts: Phaser.GameObjects.Text[] = []
  private enemyTexts: Phaser.GameObjects.Text[] = []
  private idleWeapons: Phaser.GameObjects.Image[] = []
  private attacking: boolean[] = []

  private HERO_X = 250
  private ENEMY_X = 1000
  private readonly LANE_YS = [160, 300, 440, 580]

  constructor() {
    super({ key: 'TroopDemoScene' })
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
      .text(GAME_WIDTH / 2, 40, '兵种演示 · 枪兵 / 骑兵 / 刀兵 / 弓兵', {
        fontSize: '28px',
        color: '#3a352a',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)

    this.add
      .text(GAME_WIDTH / 2, 78, '点击兵种发起攻击（下方自动循环演示）', {
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
    troops.forEach((troop, i) => {
      const y = this.LANE_YS[i] ?? 160 + i * 140

      // 兵种"字"（单字展示：枪/骑/刀/弓）
      const unit = this.add
        .text(this.HERO_X, y, troop.displayChar, {
          fontFamily: '"STKaiti","KaiTi","Noto Serif SC",serif',
          fontSize: '48px',
          color: troop.color,
          fontStyle: 'bold',
          stroke: '#1a1a1a',
          strokeThickness: 2
        })
        .setOrigin(0.5)
        .setDepth(10)
        .setInteractive({ useHandCursor: true })

      unit.on('pointerdown', () => this.attack(i))
      this.troopTexts.push(unit)

      // 待机手持武器（弓拿在身前，枪/刀斜挎）
      const idleAngle = troop.weapon === 'bow' ? 0 : -Math.PI / 4
      const idle = this.wfx.createWeaponImage(
        troop.weapon,
        this.HERO_X + 42,
        y + 6,
        idleAngle
      )
      idle.setAlpha(0.9)
      this.idleWeapons.push(idle)

      // 敌人木桩"字"
      const enemy = this.add
        .text(this.ENEMY_X, y, '敌', {
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

      // 兵种说明：名称 · 所持武器字
      this.add
        .text(70, y, `${troop.name} · ${troop.weaponChar}`, {
          fontSize: '18px',
          color: '#8a8577'
        })
        .setOrigin(0.5)

      // 兵种描述
      this.add
        .text(70, y + 24, troop.description, {
          fontSize: '12px',
          color: '#a89f8d'
        })
        .setOrigin(0.5)

      this.attacking.push(false)
    })
  }

  /** 指定泳道发起攻击 */
  private attack(i: number): void {
    if (this.attacking[i]) return
    this.attacking[i] = true

    const troop: TroopConfig = troops[i]
    const y = this.LANE_YS[i] ?? 160 + i * 140
    const heroPos = { x: this.HERO_X, y }
    const enemyPos = { x: this.ENEMY_X, y }
    const enemyText = this.enemyTexts[i]

    // 隐藏待机武器，改用攻击动画那把
    this.idleWeapons[i].setVisible(false)

    // 兵种前冲一点（打击感；骑兵冲锋更猛，弓兵只轻微前倾）
    const lungeDist = troop.attackStyle === 'bow' ? 4 : troop.type === 'cavalry' ? 22 : 14
    this.fx.lunge(this.troopTexts[i], enemyPos, lungeDist)

    const onHit = () => {
      this.fx.hitShake(enemyText, troop.attackStyle === 'bow' ? 4 : 5)
      const dmg = Phaser.Math.Between(30, 60) + troop.baseAttack
      this.fx.damageText(enemyPos, dmg, { crit: dmg > 65 })
    }

    if (troop.attackStyle === 'thrust') {
      this.wfx.spearThrust(heroPos, enemyPos, onHit)
    } else if (troop.attackStyle === 'slash') {
      this.wfx.bladeSlash(heroPos, enemyPos, onHit)
    } else {
      this.wfx.bowShot(heroPos, enemyPos, onHit)
    }

    // 攻击结束后还原待机武器
    const restoreDelay = troop.attackStyle === 'bow' ? 620 : 380
    this.time.delayedCall(restoreDelay, () => {
      this.idleWeapons[i].setVisible(true)
      this.attacking[i] = false
    })
  }

  /** 自动循环：依次演示四条泳道 */
  private startAutoLoop(): void {
    let i = 0
    this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => {
        this.attack(i % troops.length)
        i++
      }
    })
  }
}
