import { Hero, DeployedHero, Point } from '@/types'

/**
 * 英雄工厂
 * 创建已部署英雄实例
 */
export class HeroFactory {
  private static instanceCounter = 0

  /**
   * 创建已部署英雄实例
   * @param hero 英雄配置
   * @param position 部署位置
   * @returns 已部署英雄数据
   */
  static createDeployedHero(hero: Hero, position: Point): DeployedHero {
    const instanceId = this.generateInstanceId()

    return {
      heroId: hero.id,
      instanceId: instanceId,
      position: position,
      currentCooldown: 0,
      lastAttackTime: 0,
      isSkillAuto: true  // 默认自动释放技能
    }
  }

  /**
   * 生成唯一实例ID
   */
  static generateInstanceId(): string {
    this.instanceCounter++
    return `hero_${Date.now()}_${this.instanceCounter}`
  }

  /**
   * 重置计数器
   */
  static resetCounter(): void {
    this.instanceCounter = 0
  }
}