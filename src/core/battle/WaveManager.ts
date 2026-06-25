import { WaveConfig, WaveEnemyConfig } from '@/types'

/**
 * 波次管理器
 * 管理敌人波次的生成和调度
 */
export class WaveManager {
  private waves: WaveConfig[]
  private currentWave: number
  private waveTimer: number              // 当前波次计时器
  private enemySpawnQueue: WaveEnemyConfig[]  // 待生成的敌人队列
  private isWaveActive: boolean
  private isWaitingForNextWave: boolean
  private waitingTimer: number           // 等待下一波的计时器
  private spawnedEnemyCount: Map<string, number>  // 每种敌人已生成数量

  constructor(waves: WaveConfig[]) {
    this.waves = waves
    this.currentWave = 0
    this.waveTimer = 0
    this.enemySpawnQueue = []
    this.isWaveActive = false
    this.isWaitingForNextWave = false
    this.waitingTimer = 0
    this.spawnedEnemyCount = new Map()
  }

  /**
   * 开始下一波
   */
  startNextWave(): void {
    if (this.currentWave >= this.waves.length) {
      return  // 所有波次已完成
    }

    const wave = this.waves[this.currentWave]
    this.currentWave++
    this.waveTimer = 0
    this.enemySpawnQueue = [...wave.enemies]
    this.isWaveActive = true
    this.isWaitingForNextWave = false
    this.spawnedEnemyCount.clear()

    // 初始化已生成计数
    for (const config of this.enemySpawnQueue) {
      this.spawnedEnemyCount.set(config.enemyId, 0)
    }
  }

  /**
   * 更新波次（生成敌人）
   * @param deltaTime 时间增量（毫秒）
   * @returns 需要生成的敌人ID列表
   */
  update(deltaTime: number): string[] {
    const enemiesToSpawn: string[] = []

    // 如果正在等待下一波
    if (this.isWaitingForNextWave) {
      this.waitingTimer += deltaTime

      // 检查是否是最后一波（所有波次已开始）
      if (this.currentWave >= this.waves.length) {
        // 最后一波等待结束后，标记为完成
        this.isWaitingForNextWave = false
        return enemiesToSpawn
      }

      // 非最后一波，等待时间结束后开始下一波
      const nextWave = this.waves[this.currentWave]
      if (this.waitingTimer >= nextWave.delayBeforeWave) {
        this.startNextWave()
      }

      return enemiesToSpawn
    }

    // 如果当前波次活跃
    if (this.isWaveActive && this.enemySpawnQueue.length > 0) {
      this.waveTimer += deltaTime

      const wave = this.waves[this.currentWave - 1]
      const spawnInterval = wave.spawnInterval

      // 检查每个敌人配置是否需要生成
      for (const enemyConfig of this.enemySpawnQueue) {
        const spawnedCount = this.spawnedEnemyCount.get(enemyConfig.enemyId) || 0

        // 如果还没生成完所有敌人
        if (spawnedCount < enemyConfig.count) {
          const spawnDelay = enemyConfig.spawnDelay || 0

          // 检查是否应该生成（时间到了）
          const shouldSpawnTime = spawnDelay + spawnedCount * spawnInterval

          if (this.waveTimer >= shouldSpawnTime) {
            enemiesToSpawn.push(enemyConfig.enemyId)
            this.spawnedEnemyCount.set(enemyConfig.enemyId, spawnedCount + 1)
          }
        }
      }

      // 检查当前波次是否完成（所有敌人都已生成）
      const allSpawned = this.enemySpawnQueue.every(config => {
        const count = this.spawnedEnemyCount.get(config.enemyId) || 0
        return count >= config.count
      })

      if (allSpawned) {
        this.isWaveActive = false
        this.isWaitingForNextWave = true
        this.waitingTimer = 0
      }
    }

    return enemiesToSpawn
  }

  /**
   * 获取当前波次编号
   */
  getCurrentWave(): number {
    return this.currentWave
  }

  /**
   * 获取总波次数
   */
  getTotalWaves(): number {
    return this.waves.length
  }

  /**
   * 是否所有波次完成
   */
  isAllWavesComplete(): boolean {
    return this.currentWave >= this.waves.length && !this.isWaveActive && !this.isWaitingForNextWave
  }

  /**
   * 是否正在等待下一波
   */
  isWaiting(): boolean {
    return this.isWaitingForNextWave
  }

  /**
   * 是否当前波次活跃
   */
  isWaveInProgress(): boolean {
    return this.isWaveActive
  }

  /**
   * 获取待生成敌人数量
   */
  getPendingEnemyCount(): number {
    return this.enemySpawnQueue.reduce((sum, config) => {
      const spawned = this.spawnedEnemyCount.get(config.enemyId) || 0
      return sum + (config.count - spawned)
    }, 0)
  }

  /**
   * 重置
   */
  reset(): void {
    this.currentWave = 0
    this.waveTimer = 0
    this.enemySpawnQueue = []
    this.isWaveActive = false
    this.isWaitingForNextWave = false
    this.waitingTimer = 0
    this.spawnedEnemyCount.clear()
  }
}