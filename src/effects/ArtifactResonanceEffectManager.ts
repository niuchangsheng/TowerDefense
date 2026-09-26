import Phaser from 'phaser'
import { HeroResonanceInfo } from '@/types'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { HeroEntity } from '@/entities/HeroEntity'
import { CharacterAttackFX } from './CharacterAttackFX'
import { EnemyManager } from '@/core/enemy/EnemyManager'
import { ElementalReactionManager } from '@/core/elemental/ElementalReactionManager'
import { SoundFX } from './SoundFX'

/**
 * 神器专属器灵共鸣与五行相生隐藏效果管理器
 *
 * 核心设计：
 * 1. 非专属武将穿戴：器灵沉睡，仅获得基础白板属性，无法触发专属特技。
 * 2. 专属神将穿戴：
 *    - 【同源宝石共鸣】：极端升华本体属性，施加本系高阶状态（寄生、重压、潮湿、灼烧、流血）与极高暴击；
 *    - 【相生宝石滋养】：生我者（如水生木、火生土、金生水、木生火、土生金）激活五行化合反应、范围溅射、减CD与全军增益；
 *    - 【Lv5 神品终极唤醒】：释放武将本命终极绝技（青龙啸天、当阳断喝、七进七出、九日连珠、万骑奔雷）。
 */
export class ArtifactResonanceEffectManager {
  private static instance: ArtifactResonanceEffectManager | null = null

  constructor(private scene: Phaser.Scene) {}

  public static getInstance(scene: Phaser.Scene): ArtifactResonanceEffectManager {
    if (!this.instance || this.instance.scene !== scene) {
      this.instance = new ArtifactResonanceEffectManager(scene)
    }
    return this.instance
  }

  /**
   * 触发神器专属隐藏机制入口
   */
  public triggerResonanceAttack(
    hero: HeroEntity,
    target: EnemyEntity,
    resonance: HeroResonanceInfo,
    enemyManager?: EnemyManager,
    skillManager?: any
  ): void {
    if (!target.active || target.getEnemyData().currentHealth <= 0) return

    // 只有专属武将且有共鸣时才触发隐藏效果
    if (!resonance.isExclusive || !resonance.hasResonance) return

    const heroData = hero.getHeroData()
    const heroStats = hero.getEffectiveStats()
    const fx = new CharacterAttackFX(this.scene)
    const targetPos = { x: target.x, y: target.y }
    const heroPos = { x: hero.x, y: hero.y }
    const reactionMgr = ElementalReactionManager.getInstance(this.scene, enemyManager)

    // 专属武将路由处理
    switch (heroData.id) {
      case 'hero_guanyu': {
        this.handleGuanyuResonance(hero, target, resonance, heroStats, fx, targetPos, reactionMgr, skillManager, enemyManager)
        break
      }
      case 'hero_zhangfei': {
        this.handleZhangfeiResonance(hero, target, resonance, heroStats, fx, targetPos, reactionMgr, enemyManager)
        break
      }
      case 'hero_zhaoyun': {
        this.handleZhaoyunResonance(hero, target, resonance, heroStats, fx, targetPos, heroPos, reactionMgr, enemyManager)
        break
      }
      case 'hero_huangzhong': {
        this.handleHuangzhongResonance(hero, target, resonance, heroStats, fx, targetPos, reactionMgr, enemyManager)
        break
      }
      case 'hero_machao': {
        this.handleMachaoResonance(hero, target, resonance, heroStats, fx, targetPos, reactionMgr, enemyManager)
        break
      }
      default: {
        // 其他专属神器（如方天画戟、八卦阵图等）通用共鸣反馈
        if (resonance.resonanceType === 'same') {
          fx.damageText(targetPos, '【器灵共鸣】', { color: '#ffd54f' })
          const bonusDmg = Math.floor(heroStats.attack * 0.25)
          target.takeDamage(bonusDmg)
          SoundFX.whoosh()
        } else if (resonance.resonanceType === 'generating') {
          fx.damageText(targetPos, '【相生滋养】', { color: '#40c4ff' })
          const bonusDmg = Math.floor(heroStats.attack * 0.3)
          target.takeDamage(bonusDmg)
          SoundFX.thud()
        }
        break
      }
    }
  }

  // =========================================================================
  // 1. 关羽 · 青龙偃月刀 (木属性: 木同源 / 水生木相生)
  // =========================================================================
  private handleGuanyuResonance(
    hero: HeroEntity,
    target: EnemyEntity,
    resonance: HeroResonanceInfo,
    stats: any,
    fx: CharacterAttackFX,
    targetPos: { x: number; y: number },
    reactionMgr: ElementalReactionManager,
    skillManager?: any,
    enemyManager?: EnemyManager
  ): void {
    if (resonance.resonanceType === 'same') {
      // 【木系同源】：刀芒扩散弧斩，施加木系寄生种子，提高暴击
      reactionMgr.handleAttack(target, 'wood', Math.floor(stats.attack * 0.3))
      fx.damageText(targetPos, '【青龙·同源刀芒】', { color: '#4caf50' })
      fx.slashArc(targetPos, 0x4caf50)
      SoundFX.whoosh()
    } else if (resonance.resonanceType === 'generating') {
      // 【水生木·相生】：刀风带润泽之息，施加潮湿(wet)并引爆滋养，加速自身并减CD
      reactionMgr.handleAttack(target, 'water', Math.floor(stats.attack * 0.2))
      if (skillManager) {
        skillManager.reduceCooldown('skill_active_guanyu', 600)
      }
      fx.damageText(targetPos, '【水生木·灵刃滋养】', { color: '#29b6f6' })
      fx.inkSplash(targetPos, 0x29b6f6, 6)
      SoundFX.thud()
    }

    // Lv5 终极唤醒【青龙啸天】
    if (resonance.gemLevel === 5) {
      fx.damageText({ x: hero.x, y: hero.y - 45 }, '【青龙啸天·真灵破阵】', { color: '#2e7d32', crit: true })
      SoundFX.gong()
      // 对目标周围 120 码敌人造成 60% 木系范围斩
      if (enemyManager) {
        const nearby = enemyManager.getEnemiesInRange(targetPos, 120)
        const sweepDmg = Math.floor(stats.attack * 0.6)
        for (const enemy of nearby) {
          if (enemy.active && enemy.getEnemyData().currentHealth > 0) {
            enemy.takeDamage(sweepDmg)
            reactionMgr.handleAttack(enemy, 'wood', Math.floor(sweepDmg * 0.5))
          }
        }
      }
    }
  }

  // =========================================================================
  // 2. 张飞 · 丈八蛇矛 (土属性: 土同源 / 火生土相生)
  // =========================================================================
  private handleZhangfeiResonance(
    hero: HeroEntity,
    target: EnemyEntity,
    resonance: HeroResonanceInfo,
    stats: any,
    fx: CharacterAttackFX,
    targetPos: { x: number; y: number },
    reactionMgr: ElementalReactionManager,
    enemyManager?: EnemyManager
  ): void {
    if (resonance.resonanceType === 'same') {
      // 【土系同源】：震裂大地，施加重压 heavy 减速50%
      target.applySlow(3000, 0.5)
      reactionMgr.handleAttack(target, 'earth', Math.floor(stats.attack * 0.35))
      fx.damageText(targetPos, '【当阳·同源裂石】', { color: '#b08a52' })
      fx.inkSplash(targetPos, 0x8d6e63, 6)
      SoundFX.thud()
    } else if (resonance.resonanceType === 'generating') {
      // 【火生土·相生】：熔岩爆震，附加烈火灼烧地脉
      reactionMgr.handleAttack(target, 'fire', Math.floor(stats.attack * 0.3))
      target.applyBurn(Math.floor(stats.attack * 0.2), 3000)
      fx.damageText(targetPos, '【火生土·熔岩地脉】', { color: '#ff7043' })
      fx.inkSplash(targetPos, 0xff5722, 6)
      SoundFX.whoosh()
    }

    // Lv5 终极唤醒【万夫莫开】
    if (resonance.gemLevel === 5) {
      fx.damageText({ x: hero.x, y: hero.y - 45 }, '【当阳断喝·万夫莫开】', { color: '#8d6e63', crit: true })
      target.applyStun(1500)
      if (enemyManager) {
        const nearby = enemyManager.getEnemiesInRange(targetPos, 100)
        for (const enemy of nearby) {
          if (enemy.active && enemy.getEnemyData().currentHealth > 0) {
            enemy.applyStun(1200)
            enemy.applyArmorBreak(3000, 0.4)
          }
        }
      }
      SoundFX.gong()
    }
  }

  // =========================================================================
  // 3. 赵云 · 龙胆亮银枪 (水属性: 水同源 / 金生水相生)
  // =========================================================================
  private handleZhaoyunResonance(
    hero: HeroEntity,
    target: EnemyEntity,
    resonance: HeroResonanceInfo,
    stats: any,
    fx: CharacterAttackFX,
    targetPos: { x: number; y: number },
    heroPos: { x: number; y: number },
    reactionMgr: ElementalReactionManager,
    enemyManager?: EnemyManager
  ): void {
    if (resonance.resonanceType === 'same') {
      // 【水系同源】：二段破空枪芒，施加潮湿 wet
      reactionMgr.handleAttack(target, 'water', Math.floor(stats.attack * 0.4))
      const extraDmg = Math.floor(stats.attack * 0.35)
      target.takeDamage(extraDmg)
      fx.damageText(targetPos, '【龙胆·同源枪芒】', { color: '#00e5ff' })
      fx.slashArc(targetPos, 0x00e5ff, 28)
      SoundFX.whoosh()
    } else if (resonance.resonanceType === 'generating') {
      // 【金生水·相生】：金戈极寒破甲，若已有 wet 则引爆【碎冰穿刺】
      reactionMgr.handleAttack(target, 'metal', Math.floor(stats.attack * 0.3))
      const hasWet = reactionMgr.hasStatus(target.getEnemyData().id, 'wet')
      if (hasWet) {
        const shatterDmg = Math.floor(stats.attack * 0.7)
        target.takeDamage(shatterDmg)
        fx.damageText(targetPos, '【金生水·碎冰穿刺】', { color: '#80d8ff', crit: true })
        fx.inkSplash(targetPos, 0x80d8ff, 8)
        if (enemyManager) {
          const nearby = enemyManager.getEnemiesInRange(targetPos, 90)
          for (const enemy of nearby) {
            if (enemy.active && enemy.getEnemyData().currentHealth > 0) {
              enemy.takeDamage(Math.floor(shatterDmg * 0.5))
              enemy.applySlow(2000, 0.4)
            }
          }
        }
      } else {
        fx.damageText(targetPos, '【金生水·锋芒注灵】', { color: '#ffd54f' })
      }
      SoundFX.thud()
    }

    // Lv5 终极唤醒【七进七出·龙胆惊鸿】
    if (resonance.gemLevel === 5) {
      fx.damageText({ x: hero.x, y: hero.y - 45 }, '【七进七出·龙胆惊鸿】', { color: '#00b0ff', crit: true })
      target.applyFreeze(1500)
      SoundFX.gong()
    }
  }

  // =========================================================================
  // 4. 黄忠 · 宝雕射日弓 (火属性: 火同源 / 木生火相生)
  // =========================================================================
  private handleHuangzhongResonance(
    hero: HeroEntity,
    target: EnemyEntity,
    resonance: HeroResonanceInfo,
    stats: any,
    fx: CharacterAttackFX,
    targetPos: { x: number; y: number },
    reactionMgr: ElementalReactionManager,
    enemyManager?: EnemyManager
  ): void {
    if (resonance.resonanceType === 'same') {
      // 【火系同源】：烈焰箭矢贯穿，沿途持续灼烧
      reactionMgr.handleAttack(target, 'fire', Math.floor(stats.attack * 0.4))
      target.applyBurn(Math.floor(stats.attack * 0.25), 3000)
      fx.damageText(targetPos, '【射日·同源烈阳】', { color: '#ff3d00' })
      fx.inkSplash(targetPos, 0xff3d00, 6)
      SoundFX.bowSnap()
    } else if (resonance.resonanceType === 'generating') {
      // 【木生火·相生】：命中寄生 parasite 目标引爆烈火燎原
      const hasParasite = reactionMgr.hasStatus(target.getEnemyData().id, 'parasite')
      if (hasParasite) {
        const wildfireDmg = Math.floor(stats.attack * 0.8)
        target.takeDamage(wildfireDmg)
        fx.damageText(targetPos, '【木生火·烈火燎原】', { color: '#ff6d00', crit: true })
        fx.inkSplash(targetPos, 0xff6d00, 10)
        if (enemyManager) {
          const nearby = enemyManager.getEnemiesInRange(targetPos, 110)
          for (const enemy of nearby) {
            if (enemy.active && enemy.getEnemyData().currentHealth > 0) {
              enemy.applyBurn(Math.floor(stats.attack * 0.3), 3500)
            }
          }
        }
      } else {
        reactionMgr.handleAttack(target, 'wood', Math.floor(stats.attack * 0.2))
        fx.damageText(targetPos, '【木生火·生机蕴火】', { color: '#ffab00' })
      }
      SoundFX.whoosh()
    }

    // Lv5 终极唤醒【九日连珠】
    if (resonance.gemLevel === 5) {
      fx.damageText({ x: hero.x, y: hero.y - 45 }, '【九日连珠·焚天灭地】', { color: '#d50000', crit: true })
      if (enemyManager) {
        const allEnemies = enemyManager.getActiveEnemies()
        const meteorDmg = Math.floor(stats.attack * 0.5)
        for (const enemy of allEnemies.slice(0, 5)) {
          if (enemy.active && enemy.getEnemyData().currentHealth > 0) {
            enemy.takeDamage(meteorDmg)
            enemy.applyBurn(Math.floor(meteorDmg * 0.3), 2000)
          }
        }
      }
      SoundFX.gong()
    }
  }

  // =========================================================================
  // 5. 马超 · 虎头湛金枪 (金属性: 金同源 / 土生金相生)
  // =========================================================================
  private handleMachaoResonance(
    hero: HeroEntity,
    target: EnemyEntity,
    resonance: HeroResonanceInfo,
    stats: any,
    fx: CharacterAttackFX,
    targetPos: { x: number; y: number },
    reactionMgr: ElementalReactionManager,
    enemyManager?: EnemyManager
  ): void {
    if (resonance.resonanceType === 'same') {
      // 【金系同源】：攻击附带金系流血撕裂 bleed，暴击穿甲
      reactionMgr.handleAttack(target, 'metal', Math.floor(stats.attack * 0.45))
      target.applyArmorBreak(3000, 0.4)
      fx.damageText(targetPos, '【神锋·同源裂甲】', { color: '#ffd700' })
      fx.slashArc(targetPos, 0xffd700)
      SoundFX.whoosh()
    } else if (resonance.resonanceType === 'generating') {
      // 【土生金·相生】：厚土铸金，斩杀残血并激扬战意
      const targetHp = target.getEnemyData().currentHealth
      const targetMaxHp = target.getEnemyData().maxHealth
      if (targetHp > 0 && targetHp / targetMaxHp <= 0.25) {
        target.takeDamage(targetHp)
        fx.damageText(targetPos, '【土生金·神锋斩决】', { color: '#ffea00', crit: true })
        fx.inkSplash(targetPos, 0xffea00, 8)
      } else {
        const heavyDmg = Math.floor(stats.attack * 0.35)
        target.takeDamage(heavyDmg)
        reactionMgr.handleAttack(target, 'earth', Math.floor(stats.attack * 0.25))
        fx.damageText(targetPos, '【土生金·厚土注锋】', { color: '#ffb300' })
      }
      SoundFX.thud()
    }

    // Lv5 终极唤醒【万骑奔雷】
    if (resonance.gemLevel === 5) {
      fx.damageText({ x: hero.x, y: hero.y - 45 }, '【神威天将·万骑奔雷】', { color: '#ffc107', crit: true })
      target.applyArmorBreak(5000, 0.5)
      SoundFX.gong()
    }
  }
}
