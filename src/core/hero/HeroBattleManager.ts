import { EnemyEntity } from '@/entities/EnemyEntity'
import { HeroEntity } from '@/entities/HeroEntity'
import { DamageCalculator } from '../battle/DamageCalculator'
import { ATTACK_CONFIG } from '@/config/constants'
import { SkillManager, SkillExecutor } from '../skill'
import Phaser from 'phaser'

/**
 * 英雄战斗管理器
 * 管理英雄的攻击逻辑和技能触发
 */
export class HeroBattleManager {
  private deployedHeroes: Map<string, HeroEntity>
  private enemyManager: any  // EnemyManager类型，避免循环依赖
  private skillManager: SkillManager
  private skillExecutor: SkillExecutor

  constructor(scene: Phaser.Scene, enemyManager: any) {
    this.deployedHeroes = new Map()
    this.enemyManager = enemyManager
    this.skillManager = new SkillManager()
    this.skillExecutor = new SkillExecutor(scene, this.skillManager, enemyManager)
  }

  /**
   * 添加英雄
   */
  addHero(heroEntity: HeroEntity): void {
    const deployedData = heroEntity.getDeployedData()
    const heroData = heroEntity.getHeroData()
    this.deployedHeroes.set(deployedData.instanceId, heroEntity)

    // 初始化英雄技能
    this.skillManager.initHeroSkills(
      heroData.passiveSkillId,
      heroData.activeSkillId
    )
  }

  /**
   * 移除英雄
   */
  removeHero(instanceId: string): HeroEntity | null {
    const heroEntity = this.deployedHeroes.get(instanceId)
    if (heroEntity) {
      this.deployedHeroes.delete(instanceId)
      return heroEntity
    }
    return null
  }

  /**
   * 更新所有英雄的攻击和技能
   * @param deltaTime 时间增量（毫秒）
   * @param currentTime 当前时间（毫秒）
   * @returns 死亡的敌人列表
   */
  update(deltaTime: number, currentTime: number): EnemyEntity[] {
    const killedEnemies: EnemyEntity[] = []

    // 更新技能冷却
    this.skillManager.updateCooldowns(deltaTime)

    for (const heroEntity of this.deployedHeroes.values()) {
      // 更新技能冷却显示
      this.updateSkillCooldownDisplay(heroEntity)

      // 检查并触发主动技能（自动模式）
      this.checkAutoSkill(heroEntity)

      // 执行普攻
      const killed = this.checkAndAttack(heroEntity, currentTime)
      if (killed) {
        killedEnemies.push(killed)
      }
    }

    return killedEnemies
  }

  /**
   * 更新英雄技能冷却显示
   */
  private updateSkillCooldownDisplay(hero: HeroEntity): void {
    const heroData = hero.getHeroData()
    const activeSkillId = heroData.activeSkillId

    if (!activeSkillId) return

    const progress = this.skillManager.getCooldownProgress(activeSkillId)
    hero.updateSkillCooldownDisplay(progress)
  }

  /**
   * 检查主动技能自动触发
   */
  private checkAutoSkill(hero: HeroEntity): void {
    const heroData = hero.getHeroData()
    const activeSkillId = heroData.activeSkillId

    if (!activeSkillId) return

    const skillState = this.skillManager.getSkillState(activeSkillId)
    if (!skillState || !skillState.isAutoActive || !skillState.isReady) return

    // 执行主动技能
    const deployedData = hero.getDeployedData()
    this.skillExecutor.executeSkill(
      activeSkillId,
      deployedData.position,
      hero
    )
  }

  /**
   * 检查攻击条件并执行攻击
   */
  private checkAndAttack(hero: HeroEntity, currentTime: number): EnemyEntity | null {
    const deployedData = hero.getDeployedData()
    const stats = hero.getEffectiveStats()

    // 计算攻击间隔
    const attackInterval = DamageCalculator.calculateAttackInterval(stats.attackSpeed)

    // 检查是否可以攻击（冷却时间）
    if (currentTime - deployedData.lastAttackTime < attackInterval) {
      return null
    }

    // 选择目标
    const target = this.selectTarget(hero)
    if (!target) {
      return null
    }

    // 执行攻击
    const killed = this.executeAttack(hero, target)

    // 更新上次攻击时间
    hero.updateLastAttackTime(currentTime)

    return killed
  }

  /**
   * 选择攻击目标
   * 策略：优先攻击最近的敌人
   */
  private selectTarget(hero: HeroEntity): EnemyEntity | null {
    const deployedData = hero.getDeployedData()
    const stats = hero.getEffectiveStats()

    return this.enemyManager.getNearestEnemy(deployedData.position, stats.attackRange)
  }

  /**
   * 执行攻击
   */
  private executeAttack(hero: HeroEntity, target: EnemyEntity): EnemyEntity | null {
    const heroData = hero.getHeroData()
    const stats = hero.getEffectiveStats()
    const targetData = target.getEnemyData()
    const deployedData = hero.getDeployedData()

    // 计算伤害
    const damage = DamageCalculator.calculateDamage(
      stats,
      heroData.wuXing,
      targetData.wuXing
    )

    // 应用伤害
    const actualDamage = target.takeDamage(damage)

    // 播放攻击动画
    hero.playAttackAnimation()

    // 触发被动技能（攻击时触发）
    this.triggerPassiveSkill(hero, target)

    // 检查是否死亡
    if (targetData.currentHealth <= 0) {
      target.die()
      return target
    }

    return null
  }

  /**
   * 触发被动技能
   */
  private triggerPassiveSkill(hero: HeroEntity, target: EnemyEntity): void {
    const heroData = hero.getHeroData()
    const passiveSkillId = heroData.passiveSkillId

    if (!passiveSkillId) return

    const skillState = this.skillManager.getSkillState(passiveSkillId)
    if (!skillState || !skillState.isReady) return

    // 关羽武圣：15%概率触发横扫
    if (passiveSkillId === 'skill_passive_guanyu') {
      if (Math.random() < 0.15) {
        const deployedData = hero.getDeployedData()
        this.skillExecutor.executeSkill(
          passiveSkillId,
          deployedData.position,
          hero
        )
      }
    }

    // 张飞猛将、赵云龙胆：永久buff，不需要触发
    // buff效果已在HeroEntity.getEffectiveStats()中应用
  }

  /**
   * 获取所有部署的英雄
   */
  getDeployedHeroes(): HeroEntity[] {
    return Array.from(this.deployedHeroes.values())
  }

  /**
   * 获取英雄数量
   */
  getHeroCount(): number {
    return this.deployedHeroes.size
  }

  /**
   * 重置
   */
  reset(): void {
    for (const heroEntity of this.deployedHeroes.values()) {
      heroEntity.destroy()
    }
    this.deployedHeroes.clear()
  }
}