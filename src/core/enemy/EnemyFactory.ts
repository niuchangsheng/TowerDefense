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

    // 默认五维属性配置（若 config 未显式指定，则按敌人类型赋予标准基准）
    const defaultDefense = config.type === 'boss' ? 100 : (config.type === 'elite' ? 50 : 20)
    const defaultTenacity = config.type === 'boss' ? 0.20 : (config.type === 'elite' ? 0.10 : 0.0)
    const defaultFortitude = config.type === 'boss' ? 0.35 : (config.type === 'elite' ? 0.15 : 0.0)

    const finalDefense = config.baseDefense ?? defaultDefense
    const finalTenacity = config.baseTenacity ?? defaultTenacity
    const finalFortitude = config.baseFortitude ?? defaultFortitude

    // 如果携带【神行】词缀，自身移速基础增幅 25%
    if (opts.affixes?.some(a => a.id === 'swift')) {
      finalSpeed *= 1.25
    }

    const defaultBossAegis = config.type === 'boss' ? (config.maxAegisGrids ?? 3) : 0

    return {
      ...config,
      instanceId: id,
      currentHealth: finalHealth,
      maxHealth: finalHealth,
      defense: finalDefense,
      speed: finalSpeed,
      tenacity: finalTenacity,
      fortitude: finalFortitude,
      maxAegisGrids: defaultBossAegis > 0 ? defaultBossAegis : config.maxAegisGrids,
      currentAegisGrids: defaultBossAegis > 0 ? defaultBossAegis : undefined,
      phase2Awakened: false,
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