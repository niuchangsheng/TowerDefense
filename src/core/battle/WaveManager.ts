import { WaveConfig, WaveEnemyConfig, EnemyConfig } from '@/types'

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

  constructor(waves: WaveConfig[]) {
    this.waves = waves
    this.currentWave = 0
    this.waveTimer = 0
    this.enemySpawnQueue = []
    this.isWaveActive = false
    this.isWaitingForNextWave = false
    this.waitingTimer = 0
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
  }

  /**
   * 更新（生成敌人）
   * @param deltaTime 时间增量（毫秒）
   * @returns 需要生成的敌人配置列表
   */
  update(deltaTime: number): EnemyConfig[] {
    const enemiesToSpawn: EnemyConfig[] = []

    // 如果正在等待下一波
    if (this.isWaitingForNextWave) {
      this.waitingTimer += deltaTime

      // 等待时间结束，开始下一波
      if (this.currentWave < this.waves.length) {
        const nextWave = this.waves[this.currentWave]
        if (this.waitingTimer >= nextWave.delayBeforeWave) {
          this.startNextWave()
        }
      }
      return enemiesToSpawn
    }

    // 如果当前波次活跃
    if (this.isWaveActive && this.enemySpawnQueue.length > 0) {
      this.waveTimer += deltaTime

      // 检查队列中的敌人是否需要生成
      const wave = this.waves[this.currentWave - 1]
      const spawnInterval = wave.spawnInterval

      // 按间隔生成敌人
      while (this.enemySpawnQueue.length > 0) {
        const enemyConfig = this.enemySpawnQueue[0]
        const spawnDelay = enemyConfig.spawnDelay || 0

        // 如果当前时间超过了生成延迟时间，生成敌人
        if (this.waveTimer >= spawnDelay && this.waveTimer % spawnInterval < deltaTime) {
          // 这里返回enemyId，需要EnemyFactory处理
          // 暂时返回空，后续在BattleSystem中处理
          this.enemySpawnQueue.shift()
        } else {
          break
        }
      }

      // 检查当前波次是否完成
      if (this.enemySpawnQueue.length === 0) {
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
    return this.enemySpawnQueue.reduce((sum, config) => sum + config.count, 0)
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
  }
}