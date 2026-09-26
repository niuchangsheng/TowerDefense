import Phaser from 'phaser'
import { WuXing, Point } from '@/types'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { HeroEntity } from '@/entities/HeroEntity'
import { CharacterAttackFX } from './CharacterAttackFX'
import { EnemyManager } from '@/core/enemy/EnemyManager'

/**
 * 5级宝石终极攻击特效管理器
 *
 * 核心机制：
 * - 金 (白虎神髓)：【破甲】降低目标 50% 防御，使目标承受伤害 +35%，持续 5s
 * - 木 (青龙圣珠)：【中毒】每秒扣除最大生命 3%（可叠至3层），持续 5s
 * - 水 (玄武神珠)：【冰冻】绝对定身冻结 2s，解冻后附带 40% 减速持续 3s
 * - 火 (朱雀神髓)：【灼烧】每秒真伤，死后触发【红莲殉爆】范围溅射并传染烈火
 * - 土 (麒麟圣玉)：【眩晕】打断蓄力与行动，原地昏迷瘫痪 2s
 */
export class GemAttackEffectManager {
  private static instance: GemAttackEffectManager | null = null

  constructor(private scene: Phaser.Scene) {}

  public static getInstance(scene: Phaser.Scene): GemAttackEffectManager {
    if (!this.instance || this.instance.scene !== scene) {
      this.instance = new GemAttackEffectManager(scene)
    }
    return this.instance
  }

  /**
   * 触发5级宝石攻击特效入口
   * @param target 目标敌军
   * @param wuXing 5级宝石的五行属性
   * @param attacker 攻击英雄
   * @param enemyManager 敌军管理器（用于范围殉爆索敌）
   */
  public triggerLevel5GemEffect(
    target: EnemyEntity,
    wuXing: WuXing,
    attacker: HeroEntity,
    enemyManager?: EnemyManager
  ): void {
    if (!target.active || target.getEnemyData().currentHealth <= 0) return

    const fx = new CharacterAttackFX(this.scene)
    const targetPos = { x: target.x, y: target.y }
    const heroStats = attacker.getEffectiveStats()

    switch (wuXing) {
      case 'metal': {
        // 金系：【破甲】
        target.applyArmorBreak(5000, 0.5)
        this.playMetalShatterFX(targetPos)
        fx.damageText(targetPos, 0, {
          color: '#ffd54f',
          offsetX: 16
        })
        this.showFloatingEffectText(targetPos, '【破甲】', '#ffd54f')
        break
      }

      case 'wood': {
        // 木系：【中毒】
        target.applyPoison(5000, 0.03)
        this.playWoodPoisonFX(targetPos)
        this.showFloatingEffectText(targetPos, '【剧毒】', '#4caf50')
        break
      }

      case 'water': {
        // 水系：【冰冻】
        target.applyFreeze(2000)
        this.playWaterFreezeFX(targetPos)
        this.showFloatingEffectText(targetPos, '【冰冻】', '#40c4ff')
        break
      }

      case 'fire': {
        // 火系：【灼烧】+【红莲殉爆】
        const burnDmg = Math.max(12, Math.floor(heroStats.attack * 0.35))
        target.applyBurn(burnDmg, 4000, (deadEnemy) => {
          this.triggerLotusExplosion(deadEnemy, burnDmg, enemyManager)
        })
        this.playFireBurnFX(targetPos)
        this.showFloatingEffectText(targetPos, '【灼烧】', '#ff5252')
        break
      }

      case 'earth': {
        // 土系：【眩晕】
        target.applyStun(2000)
        this.playEarthStunFX(targetPos)
        this.showFloatingEffectText(targetPos, '【眩晕】', '#b08a52')
        break
      }
    }
  }

  // ==========================================
  // 特效状态文字轻盈上浮
  // ==========================================

  private showFloatingEffectText(at: Point, text: string, color: string): void {
    const txt = this.scene.add.text(at.x, at.y - 28, text, {
      fontFamily: 'KaiTi, 楷体, STKaiti, serif',
      fontSize: '13px',
      color,
      stroke: '#141210',
      strokeThickness: 3,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(45)

    this.scene.tweens.add({
      targets: txt,
      y: at.y - 48,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy()
    })
  }

  // ==========================================
  // 1. 金系视效：白金斩裂与断刃碎屑
  // ==========================================

  private playMetalShatterFX(at: Point): void {
    const g = this.scene.add.graphics().setDepth(42)
    // 十字破甲斩击线
    g.lineStyle(2, 0xffeb3b, 0.9)
    g.lineBetween(at.x - 16, at.y - 16, at.x + 16, at.y + 16)
    g.lineBetween(at.x + 16, at.y - 16, at.x - 16, at.y + 16)

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.3,
      duration: 300,
      onComplete: () => g.destroy()
    })

    // 金色碎屑火星
    for (let i = 0; i < 6; i++) {
      const p = this.scene.add.circle(at.x, at.y, 2, 0xffd54f, 0.9).setDepth(42)
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const dist = Phaser.Math.Between(15, 30)
      this.scene.tweens.add({
        targets: p,
        x: at.x + Math.cos(angle) * dist,
        y: at.y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 350,
        onComplete: () => p.destroy()
      })
    }
  }

  // ==========================================
  // 2. 木系视效：苍翠毒瘴飞沫
  // ==========================================

  private playWoodPoisonFX(at: Point): void {
    for (let i = 0; i < 8; i++) {
      const p = this.scene.add.circle(
        at.x + Phaser.Math.Between(-8, 8),
        at.y + Phaser.Math.Between(-8, 8),
        Phaser.Math.Between(2, 4),
        0x4caf50,
        0.8
      ).setDepth(42)

      this.scene.tweens.add({
        targets: p,
        y: p.y - Phaser.Math.Between(15, 30),
        alpha: 0,
        duration: 500,
        ease: 'Sine.easeOut',
        onComplete: () => p.destroy()
      })
    }
  }

  // ==========================================
  // 3. 水系视效：玄冰冰华覆体
  // ==========================================

  private playWaterFreezeFX(at: Point): void {
    const g = this.scene.add.graphics().setDepth(42)
    g.lineStyle(1.8, 0x80d8ff, 0.9)
    // 六芒冰晶
    for (let i = 0; i < 3; i++) {
      const rad = (i * Math.PI) / 3
      const dx = Math.cos(rad) * 16
      const dy = Math.sin(rad) * 16
      g.lineBetween(at.x - dx, at.y - dy, at.x + dx, at.y + dy)
    }

    this.scene.tweens.add({
      targets: g,
      scale: 1.4,
      alpha: 0,
      duration: 450,
      onComplete: () => g.destroy()
    })
  }

  // ==========================================
  // 4. 火系视效：烈火缠绕与红莲殉爆
  // ==========================================

  private playFireBurnFX(at: Point): void {
    for (let i = 0; i < 6; i++) {
      const flame = this.scene.add.circle(
        at.x + Phaser.Math.Between(-6, 6),
        at.y + Phaser.Math.Between(-6, 6),
        3,
        0xff5722,
        0.85
      ).setDepth(42)

      this.scene.tweens.add({
        targets: flame,
        y: flame.y - Phaser.Math.Between(12, 24),
        scale: 0.2,
        alpha: 0,
        duration: 380,
        onComplete: () => flame.destroy()
      })
    }
  }

  /**
   * 红莲殉爆：灼烧目标死亡时触发范围剧烈爆炸
   */
  private triggerLotusExplosion(deadEnemy: EnemyEntity, burnDmg: number, enemyManager?: EnemyManager): void {
    const pos = { x: deadEnemy.x, y: deadEnemy.y }
    const radius = 80

    // 1. 播放红莲业火爆炸光环
    const lotus = this.scene.add.graphics().setDepth(44)
    lotus.fillStyle(0xd50000, 0.4)
    lotus.fillCircle(pos.x, pos.y, 16)
    lotus.lineStyle(2.5, 0xff7043, 0.9)
    lotus.strokeCircle(pos.x, pos.y, 20)

    this.scene.tweens.add({
      targets: lotus,
      scale: radius / 20,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => lotus.destroy()
    })

    this.showFloatingEffectText(pos, '【红莲殉爆】', '#ff1744')

    // 2. 溅射周围敌人
    if (!enemyManager) return
    const enemies = enemyManager.getActiveEnemies()
    const splashDmg = Math.floor(burnDmg * 1.5)

    for (const enemy of enemies) {
      if (!enemy.active || enemy === deadEnemy) continue
      const dist = Phaser.Math.Distance.Between(pos.x, pos.y, enemy.x, enemy.y)
      if (dist <= radius) {
        // 造成范围溅射真实伤害
        enemy.takeDamage(splashDmg)
        const fx = new CharacterAttackFX(this.scene)
        fx.damageText({ x: enemy.x, y: enemy.y }, splashDmg, { color: '#ff3d00' })
        // 传染灼烧
        enemy.applyBurn(burnDmg, 3500)
      }
    }
  }

  // ==========================================
  // 5. 土系视效：万岳重岩震波
  // ==========================================

  private playEarthStunFX(at: Point): void {
    const wave = this.scene.add.graphics().setDepth(40)
    wave.lineStyle(2, 0xb08a52, 0.8)
    wave.strokeCircle(at.x, at.y, 14)

    this.scene.tweens.add({
      targets: wave,
      scale: 2.2,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => wave.destroy()
    })
  }
}
