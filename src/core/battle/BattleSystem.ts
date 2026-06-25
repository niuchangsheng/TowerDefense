import Phaser from 'phaser'
import {
  LevelConfig,
  BattleState,
  BattleStatus,
  BattleResult,
  PlaceHeroResult,
  RetreatHeroResult,
  Point,
  EnemyConfig,
  Hero
} from '@/types'
import { CostManager } from './CostManager'
import { WaveManager } from './WaveManager'
import { EnemyManager } from '@/core/enemy/EnemyManager'
import { HeroBattleManager } from '@/core/hero/HeroBattleManager'
import { HeroFactory } from '@/core/hero/HeroFactory'
import { HeroEntity } from '@/entities/HeroEntity'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { COST_CONFIG, PLAYER_HEALTH_CONFIG } from '@/config/constants'
import { getEnemyConfig } from '@/data/enemies'

/**
 * 战斗主控制器
 * 协调所有战斗模块
 */
export class BattleSystem {
  private scene: Phaser.Scene
  private levelConfig: LevelConfig

  // 子模块
  private costManager: CostManager
  private waveManager: WaveManager
  private enemyManager: EnemyManager
  private heroBattleManager: HeroBattleManager

  // 英雄管理
  private heroConfigs: Map<string, Hero>  // 英雄配置数据
  private deployedHeroEntities: Map<string, HeroEntity>

  // 战斗状态
  private battleState: BattleState
  private playerHealth: number
  private elapsedTime: number
  private isRunning: boolean
  private isPaused: boolean

  // 事件回调
  private onEnemyKilledCallback?: (enemy: EnemyEntity) => void
  private onEnemyReachedExitCallback?: (enemy: EnemyEntity) => void
  private onWaveStartCallback?: (wave: number) => void
  private onBattleEndCallback?: (result: BattleResult) => void

  constructor(scene: Phaser.Scene, levelConfig: LevelConfig, heroConfigs: Map<string, Hero>) {
    this.scene = scene
    this.levelConfig = levelConfig
    this.heroConfigs = heroConfigs

    // 初始化费用管理
    this.costManager = new CostManager(levelConfig.playerStartCost)

    // 初始化波次管理
    this.waveManager = new WaveManager(levelConfig.waves)

    // 初始化敌人管理
    this.enemyManager = new EnemyManager(
      scene,
      levelConfig.map.path,
      levelConfig.map.spawnPoint,
      levelConfig.map.exitPoint
    )

    // 初始化英雄战斗管理
    this.heroBattleManager = new HeroBattleManager(this.enemyManager)

    // 初始化部署英雄列表
    this.deployedHeroEntities = new Map()

    // 初始化战斗状态
    this.playerHealth = levelConfig.playerStartHealth
    this.elapsedTime = 0
    this.isRunning = false
    this.isPaused = false

    this.battleState = {
      status: 'preparing',
      levelId: levelConfig.id,
      currentWave: 0,
      totalWaves: levelConfig.waves.length,
      currentCost: this.costManager.getCurrentCost(),
      playerHealth: this.playerHealth,
      deployedHeroes: [],
      activeEnemies: [],
      elapsedTime: 0
    }
  }

  /**
   * 开始战斗
   */
  startBattle(): void {
    this.isRunning = true
    this.isPaused = false
    this.battleState.status = 'running'

    // 开始第一波
    this.waveManager.startNextWave()
    if (this.onWaveStartCallback) {
      this.onWaveStartCallback(1)
    }
  }

  /**
   * 放置英雄
   */
  placeHero(heroId: string, position: Point): PlaceHeroResult {
    // 检查英雄是否存在且已解锁
    const heroConfig = this.heroConfigs.get(heroId)
    if (!heroConfig || !heroConfig.isUnlocked) {
      return {
        success: false,
        reason: 'heroNotUnlocked'
      }
    }

    // 检查费用是否足够
    if (!this.costManager.hasEnoughCost(heroConfig.deploymentCost)) {
      return {
        success: false,
        reason: 'insufficientCost'
      }
    }

    // 检查位置是否有效（简化：暂时只检查是否在场景内）
    if (!this.isValidPosition(position)) {
      return {
        success: false,
        reason: 'invalidPosition'
      }
    }

    // 消耗费用
    this.costManager.consumeCost(heroConfig.deploymentCost)

    // 创建已部署英雄数据
    const deployedData = HeroFactory.createDeployedHero(heroConfig, position)

    // 创建英雄实体
    const heroEntity = new HeroEntity(this.scene, heroConfig, deployedData)

    // 添加到管理器
    this.deployedHeroEntities.set(deployedData.instanceId, heroEntity)
    this.heroBattleManager.addHero(heroEntity)

    // 更新状态
    this.battleState.currentCost = this.costManager.getCurrentCost()
    this.battleState.deployedHeroes.push(deployedData)

    return {
      success: true,
      remainingCost: this.costManager.getCurrentCost()
    }
  }

  /**
   * 撤退英雄
   */
  retreatHero(instanceId: string): RetreatHeroResult {
    const heroEntity = this.deployedHeroEntities.get(instanceId)
    if (!heroEntity) {
      return {
        success: false,
        returnedCost: 0
      }
    }

    const heroData = heroEntity.getHeroData()

    // 返还费用
    const returnedCost = this.costManager.returnCost(heroData.deploymentCost)

    // 移除英雄
    this.heroBattleManager.removeHero(instanceId)
    this.deployedHeroEntities.delete(instanceId)
    heroEntity.destroy()

    // 更新状态
    this.battleState.currentCost = this.costManager.getCurrentCost()
    this.battleState.deployedHeroes = this.battleState.deployedHeroes.filter(
      h => h.instanceId !== instanceId
    )

    return {
      success: true,
      returnedCost: returnedCost
    }
  }

  /**
   * 触发技能
   */
  triggerSkill(instanceId: string): void {
    // Phase 3会实现完整的技能系统
    // 暂时只记录
  }

  /**
   * 更新战斗（每帧调用）
   */
  update(deltaTime: number): void {
    if (!this.isRunning || this.isPaused) {
      return
    }

    this.elapsedTime += deltaTime

    // 更新波次（生成敌人）
    this.updateWaves(deltaTime)

    // 更新敌人（移动）
    const reachedExitEnemies = this.enemyManager.update(deltaTime)

    // 处理到达终点的敌人
    for (const enemy of reachedExitEnemies) {
      this.handleEnemyReachedExit(enemy)
    }

    // 更新英雄攻击
    const killedEnemies = this.heroBattleManager.update(deltaTime, this.elapsedTime)

    // 处理被击杀的敌人
    for (const enemy of killedEnemies) {
      this.handleEnemyKilled(enemy)
    }

    // 更新战斗状态
    this.updateBattleState()

    // 检查胜负
    if (this.isVictory()) {
      this.handleVictory()
    } else if (this.isDefeat()) {
      this.handleDefeat()
    }
  }

  /**
   * 更新波次
   */
  private updateWaves(deltaTime: number): void {
    // 更新波次并获取待生成的敌人ID
    const enemyIdsToSpawn = this.waveManager.update(deltaTime)

    // 生成敌人
    for (const enemyId of enemyIdsToSpawn) {
      this.spawnEnemy(enemyId)
    }

    // 检查是否需要开始下一波
    if (this.waveManager.isWaiting() && !this.waveManager.isWaveInProgress()) {
      // 所有敌人被消灭后自动开始下一波
      if (this.enemyManager.getEnemyCount() === 0 && !this.waveManager.isAllWavesComplete()) {
        this.waveManager.startNextWave()
        if (this.onWaveStartCallback) {
          this.onWaveStartCallback(this.waveManager.getCurrentWave())
        }
      }
    }
  }

  /**
   * 生成单个敌人
   */
  private spawnEnemy(enemyId: string): void {
    const config = getEnemyConfig(enemyId)

    if (config) {
      const enemyEntity = this.enemyManager.spawnEnemy(config)
      console.log(`生成敌人: ${config.name}`)
    }
  }

  /**
   * 处理敌人被击杀
   */
  private handleEnemyKilled(enemy: EnemyEntity): void {
    const enemyData = enemy.getEnemyData()

    // 添加费用奖励
    this.costManager.addCost(enemyData.rewardCost)

    // 移除敌人
    this.enemyManager.removeEnemy(enemyData.instanceId)

    // 触发回调
    if (this.onEnemyKilledCallback) {
      this.onEnemyKilledCallback(enemy)
    }
  }

  /**
   * 处理敌人到达终点
   */
  private handleEnemyReachedExit(enemy: EnemyEntity): void {
    const enemyData = enemy.getEnemyData()

    // 减少玩家生命
    this.playerHealth -= 1

    // 移除敌人
    this.enemyManager.removeEnemy(enemyData.instanceId)

    // 触发回调
    if (this.onEnemyReachedExitCallback) {
      this.onEnemyReachedExitCallback(enemy)
    }
  }

  /**
   * 更新战斗状态
   */
  private updateBattleState(): void {
    this.battleState.currentWave = this.waveManager.getCurrentWave()
    this.battleState.currentCost = this.costManager.getCurrentCost()
    this.battleState.playerHealth = this.playerHealth
    this.battleState.elapsedTime = this.elapsedTime
    this.battleState.activeEnemies = this.enemyManager.getActiveEnemies().map(e => e.getEnemyData())
  }

  /**
   * 判断胜利
   */
  isVictory(): boolean {
    return this.waveManager.isAllWavesComplete() &&
           this.enemyManager.getEnemyCount() === 0
  }

  /**
   * 判断失败
   */
  isDefeat(): boolean {
    return this.playerHealth <= 0
  }

  /**
   * 处理胜利
   */
  private handleVictory(): void {
    this.battleState.status = 'victory'
    this.isRunning = false

    const result = this.endBattle()
    if (this.onBattleEndCallback) {
      this.onBattleEndCallback(result)
    }
  }

  /**
   * 处理失败
   */
  private handleDefeat(): void {
    this.battleState.status = 'defeat'
    this.isRunning = false

    const result = this.endBattle()
    if (this.onBattleEndCallback) {
      this.onBattleEndCallback(result)
    }
  }

  /**
   * 结束战斗
   */
  endBattle(): BattleResult {
    return {
      levelId: this.levelConfig.id,
      isVictory: this.battleState.status === 'victory',
      elapsedTime: this.elapsedTime,
      remainingHealth: this.playerHealth,
      wavesCompleted: this.waveManager.getCurrentWave(),
      rewards: {
        soulStones: [],
        equipment: [],
        gems: [],
        gold: this.levelConfig.rewards.gold || 0,
        experience: this.levelConfig.rewards.experience || 0
      }
    }
  }

  /**
   * 获取战斗状态
   */
  getState(): BattleState {
    return this.battleState
  }

  /**
   * 检查位置是否有效
   */
  private isValidPosition(position: Point): boolean {
    // 简化：只检查是否在场景范围内
    // 完整实现需要检查是否在deployableAreas内
    return position.x >= 0 && position.x <= 1280 &&
           position.y >= 0 && position.y <= 720
  }

  /**
   * 事件回调注册
   */
  onEnemyKilled(callback: (enemy: EnemyEntity) => void): void {
    this.onEnemyKilledCallback = callback
  }

  onEnemyReachedExit(callback: (enemy: EnemyEntity) => void): void {
    this.onEnemyReachedExitCallback = callback
  }

  onWaveStart(callback: (wave: number) => void): void {
    this.onWaveStartCallback = callback
  }

  onBattleEnd(callback: (result: BattleResult) => void): void {
    this.onBattleEndCallback = callback
  }

  /**
   * 暂停/继续战斗
   */
  pause(): void {
    this.isPaused = true
  }

  resume(): void {
    this.isPaused = false
  }

  /**
   * 重置战斗
   */
  reset(): void {
    this.costManager.reset(this.levelConfig.playerStartCost)
    this.waveManager.reset()
    this.enemyManager.reset()
    this.heroBattleManager.reset()
    this.deployedHeroEntities.clear()

    this.playerHealth = this.levelConfig.playerStartHealth
    this.elapsedTime = 0
    this.isRunning = false
    this.isPaused = false

    this.battleState = {
      status: 'preparing',
      levelId: this.levelConfig.id,
      currentWave: 0,
      totalWaves: this.levelConfig.waves.length,
      currentCost: this.costManager.getCurrentCost(),
      playerHealth: this.playerHealth,
      deployedHeroes: [],
      activeEnemies: [],
      elapsedTime: 0
    }
  }
}