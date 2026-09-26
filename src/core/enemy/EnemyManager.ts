import { EnemyConfig, Point, Enemy } from '@/types'
import { EnemyFactory } from './EnemyFactory'
import { EnemyEntity } from '@/entities/EnemyEntity'
import Phaser from 'phaser'

/**
 * 路径计算器
 * 计算敌人在路径上的位置
 */
export class PathFinder {
  private path: Point[]
  private totalLength: number

  constructor(path: Point[]) {
    this.path = path
    this.totalLength = this.calculateTotalLength()
  }

  /**
   * 计算路径总长度
   */
  private calculateTotalLength(): number {
    let length = 0
    for (let i = 1; i < this.path.length; i++) {
      const dx = this.path[i].x - this.path[i - 1].x
      const dy = this.path[i].y - this.path[i - 1].y
      length += Math.sqrt(dx * dx + dy * dy)
    }
    return length
  }

  /**
   * 根据进度获取位置
   * @param progress 路径进度 (0-1)
   * @returns 当前位置
   */
  getPosition(progress: number): Point {
    const targetLength = this.totalLength * Math.min(progress, 1)

    let accumulatedLength = 0
    for (let i = 1; i < this.path.length; i++) {
      const segmentStart = this.path[i - 1]
      const segmentEnd = this.path[i]
      const dx = segmentEnd.x - segmentStart.x
      const dy = segmentEnd.y - segmentStart.y
      const segmentLength = Math.sqrt(dx * dx + dy * dy)

      if (accumulatedLength + segmentLength >= targetLength) {
        // 在当前段内
        const remainingLength = targetLength - accumulatedLength
        const ratio = remainingLength / segmentLength
        return {
          x: segmentStart.x + dx * ratio,
          y: segmentStart.y + dy * ratio
        }
      }

      accumulatedLength += segmentLength
    }

    // 到达终点
    return this.path[this.path.length - 1]
  }

  /**
   * 获取路径总长度
   */
  getTotalLength(): number {
    return this.totalLength
  }
}

/**
 * 敌人管理器
 * 管理所有活跃敌人
 */
export class EnemyManager {
  private scene: Phaser.Scene
  private activeEnemies: Map<string, EnemyEntity>
  private pathFinder: PathFinder
  private spawnPoint: Point
  private exitPoint: Point

  constructor(
    scene: Phaser.Scene,
    path: Point[],
    spawnPoint: Point,
    exitPoint: Point
  ) {
    this.scene = scene
    this.activeEnemies = new Map()
    this.pathFinder = new PathFinder(path)
    this.spawnPoint = spawnPoint
    this.exitPoint = exitPoint
  }

  /**
   * 生成敌人
   */
  spawnEnemy(config: EnemyConfig): EnemyEntity {
    const enemyData = EnemyFactory.createEnemy(config)
    enemyData.position = { ...this.spawnPoint }

    const enemyEntity = new EnemyEntity(this.scene, enemyData)
    this.activeEnemies.set(enemyData.instanceId, enemyEntity)

    return enemyEntity
  }

  /**
   * 更新所有敌人（移动）
   */
  update(deltaTime: number): EnemyEntity[] {
    const reachedExit: EnemyEntity[] = []

    for (const [instanceId, enemyEntity] of this.activeEnemies) {
      const enemyData = enemyEntity.getEnemyData()
      if (!enemyData.isActive) continue

      // 计算有效移动速度（支持冰冻、眩晕定身与减速）
      const effectiveSpeed = enemyEntity.getEffectiveSpeed()
      if (effectiveSpeed <= 0) continue

      // progress增量 = (effectiveSpeed * deltaTime) / totalLength
      const progressIncrease = (effectiveSpeed * deltaTime) / (this.pathFinder.getTotalLength() * 1000)
      enemyData.pathProgress += progressIncrease

      // 更新位置
      const newPosition = this.pathFinder.getPosition(enemyData.pathProgress)
      enemyEntity.updatePosition(newPosition)

      // 检查是否到达终点
      if (enemyData.pathProgress >= 1) {
        reachedExit.push(enemyEntity)
      }
    }

    return reachedExit
  }

  /**
   * 移除敌人
   */
  removeEnemy(instanceId: string): EnemyEntity | null {
    const enemyEntity = this.activeEnemies.get(instanceId)
    if (enemyEntity) {
      this.activeEnemies.delete(instanceId)
      enemyEntity.destroy()
      return enemyEntity
    }
    return null
  }

  /**
   * 获取活跃敌人列表
   */
  getActiveEnemies(): EnemyEntity[] {
    return Array.from(this.activeEnemies.values()).filter(
      entity => entity.getEnemyData().isActive
    )
  }

  /**
   * 获取范围内的敌人
   */
  getEnemiesInRange(position: Point, range: number): EnemyEntity[] {
    return this.getActiveEnemies().filter(entity => {
      const enemyData = entity.getEnemyData()
      const dx = enemyData.position.x - position.x
      const dy = enemyData.position.y - position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance <= range
    })
  }

  /**
   * 获取最近的敌人
   */
  getNearestEnemy(position: Point, range: number): EnemyEntity | null {
    const enemiesInRange = this.getEnemiesInRange(position, range)
    if (enemiesInRange.length === 0) return null

    let nearest: EnemyEntity | null = null
    let minDistance = Infinity

    for (const enemy of enemiesInRange) {
      const enemyData = enemy.getEnemyData()
      const dx = enemyData.position.x - position.x
      const dy = enemyData.position.y - position.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance) {
        minDistance = distance
        nearest = enemy
      }
    }

    return nearest
  }

  /**
   * 重置
   */
  reset(): void {
    for (const enemyEntity of this.activeEnemies.values()) {
      enemyEntity.destroy()
    }
    this.activeEnemies.clear()
    EnemyFactory.resetCounter()
  }

  /**
   * 获取敌人数量（活跃的敌人）
   */
  getEnemyCount(): number {
    return this.getActiveEnemies().length
  }
}