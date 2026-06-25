import { EnemyEntity } from '@/entities/EnemyEntity'
import { HeroEntity } from '@/entities/HeroEntity'
import { DamageCalculator } from '../battle/DamageCalculator'
import { ATTACK_CONFIG } from '@/config/constants'

/**
 * 英雄战斗管理器
 * 管理英雄的攻击逻辑
 */
export class HeroBattleManager {
  private deployedHeroes: Map<string, HeroEntity>
  private enemyManager: any  // EnemyManager类型，避免循环依赖

  constructor(enemyManager: any) {
    this.deployedHeroes = new Map()
    this.enemyManager = enemyManager
  }

  /**
   * 添加英雄
   */
  addHero(heroEntity: HeroEntity): void {
    const deployedData = heroEntity.getDeployedData()
    this.deployedHeroes.set(deployedData.instanceId, heroEntity)
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
   * 更新所有英雄的攻击
   * @param deltaTime 时间增量（毫秒）
   * @param currentTime 当前时间（毫秒）
   * @returns 死亡的敌人列表
   */
  update(deltaTime: number, currentTime: number): EnemyEntity[] {
    const killedEnemies: EnemyEntity[] = []

    for (const heroEntity of this.deployedHeroes.values()) {
      const killed = this.checkAndAttack(heroEntity, currentTime)
      if (killed) {
        killedEnemies.push(killed)
      }
    }

    return killedEnemies
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

    // 检查是否死亡
    if (targetData.currentHealth <= 0) {
      target.die()
      return target
    }

    return null
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