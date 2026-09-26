import { EnemyConfig, Enemy } from '@/types'
import { EnemyAffix } from '@/types/affix'

export interface EnemySpawnOptions {
  instanceId?: string
  healthMultiplier?: number
  speedMultiplier?: number
  affixes?: EnemyAffix[]
}

/**
 * 敌人工厂
 * 创建敌人实例
 */
export class EnemyFactory {
  private static instanceCounter = 0

  /**
   * 创建敌人实例
   * @param config 敌人配置
   * @param options 实例选项或实例ID
   * @returns 敌人实例
   */
  static createEnemy(config: EnemyConfig, options?: EnemySpawnOptions | string): Enemy {
    const opts: EnemySpawnOptions = typeof options === 'string' ? { instanceId: options } : (options || {})
    const id = opts.instanceId || this.generateInstanceId()

    const healthMult = opts.healthMultiplier ?? 1
    const speedMult = opts.speedMultiplier ?? 1
    const finalHealth = Math.max(1, Math.floor(config.baseHealth * healthMult))
    let finalSpeed = config.baseSpeed * speedMult

    // 如果携带【神行】词缀，自身移速基础增幅 25%
    if (opts.affixes?.some(a => a.id === 'swift')) {
      finalSpeed *= 1.25
    }

    return {
      ...config,
      instanceId: id,
      currentHealth: finalHealth,
      maxHealth: finalHealth,
      speed: finalSpeed,
      position: { x: 0, y: 0 },  // 位置由EnemyManager设置
      pathProgress: 0,
      isActive: true,
      affixes: opts.affixes ? [...opts.affixes] : []
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