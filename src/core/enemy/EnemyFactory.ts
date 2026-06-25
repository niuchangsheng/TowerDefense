import { EnemyConfig, Enemy } from '@/types'

/**
 * 敌人工厂
 * 创建敌人实例
 */
export class EnemyFactory {
  private static instanceCounter = 0

  /**
   * 创建敌人实例
   * @param config 敌人配置
   * @param instanceId 实例ID（可选）
   * @returns 敌人实例
   */
  static createEnemy(config: EnemyConfig, instanceId?: string): Enemy {
    const id = instanceId || this.generateInstanceId()

    return {
      ...config,
      instanceId: id,
      currentHealth: config.baseHealth,
      maxHealth: config.baseHealth,
      speed: config.baseSpeed,
      position: { x: 0, y: 0 },  // 位置由EnemyManager设置
      pathProgress: 0,
      isActive: true
    }
  }

  /**
   * 生成唯一实例ID
   */
  static generateInstanceId(): string {
    this.instanceCounter++
    return `enemy_${Date.now()}_${this.instanceCounter}`
  }

  /**
   * 重置计数器
   */
  static resetCounter(): void {
    this.instanceCounter = 0
  }
}