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
import { DeployGrid } from './DeployGrid'
import { EnemyManager } from '@/core/enemy/EnemyManager'
import { HeroBattleManager } from '@/core/hero/HeroBattleManager'
import { HeroFactory } from '@/core/hero/HeroFactory'
import { HeroEntity } from '@/entities/HeroEntity'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { COST_CONFIG, PLAYER_HEALTH_CONFIG, GridCell, cellCenter } from '@/config/constants'
import { getEnemyConfig } from '@/data/enemies'
import { SaveManager } from '@/core/save/SaveManager'
import { calculateLevelFromExp } from '@/data/heroes/levelConfig'

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
  private deployGrid: DeployGrid

  // 英雄管理
  private heroConfigs: Map<string, Hero>  // 英雄配置数据
  private deployedHeroEntities: Map<string, HeroEntity>

  // 战斗状态
  private battleState: BattleState
  private playerHealth: number
  private elapsedTime: number
  private isRunning: boolean
  private isPaused: boolean
  /** 已通知过"波次开始"的最大波次号（防止重复通知） */
  private lastNotifiedWave: number

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
    this.heroBattleManager = new HeroBattleManager(scene, this.enemyManager)

    // 初始化部署格占位表（兵占1格、将占2格）
    this.deployGrid = new DeployGrid(levelConfig.map.deployableAreas)

    // 初始化部署英雄列表
    this.deployedHeroEntities = new Map()

    // 初始化战斗状态
    this.playerHealth = levelConfig.playerStartHealth
    this.elapsedTime = 0
    this.isRunning = false
    this.isPaused = false
    this.lastNotifiedWave = 0

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

    // 开始第一波（波次开始通知由 updateWaves 统一触发，见 notifyWaveStartIfNeeded）
    this.waveManager.startNextWave()
  }

  /**
   * 放置英雄（横向占 1×2 两格）
   * @param heroId 英雄ID
   * @param cell 锚点格（英雄占该格 + 右邻格，右邻不可用则试左邻）
   */
  placeHero(heroId: string, cell: GridCell): PlaceHeroResult {
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

    // 计算 1×2 脚印并校验（必须在部署区内且未被占用）
    const footprint = this.deployGrid.heroFootprint(cell)
    if (!footprint) {
      return {
        success: false,
        reason: this.deployGrid.isCellDeployable(cell) ? 'cellOccupied' : 'invalidPosition'
      }
    }

    // 消耗费用
    this.costManager.consumeCost(heroConfig.deploymentCost)

    // 部署位置 = 两格脚印中心
    const position = this.footprintCenter(footprint)

    // 创建已部署英雄数据
    const deployedData = HeroFactory.createDeployedHero(heroConfig, position)

    // 占用格子
    this.deployGrid.occupy(footprint, deployedData.instanceId)

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
   * 在首个空位放置英雄（右侧快捷面板用）
   */
  placeHeroAtFirstFit(heroId: string): PlaceHeroResult {
    const footprint = this.deployGrid.findFirstFit('hero')
    if (!footprint) {
      return {
        success: false,
        reason: 'cellOccupied'
      }
    }
    return this.placeHero(heroId, footprint[0])
  }

  /**
   * 脚印中心点（两格取中点，单格取格心）
   */
  private footprintCenter(footprint: GridCell[]): Point {
    const centers = footprint.map(cellCenter)
    const x = centers.reduce((sum, c) => sum + c.x, 0) / centers.length
    const y = centers.reduce((sum, c) => sum + c.y, 0) / centers.length
    return { x, y }
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

    // 释放占用的格子
    this.deployGrid.release(instanceId)

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

    // 检查是否有其他死亡的敌人（技能杀死等）
    const allEnemies = this.enemyManager.getActiveEnemies()
    for (const enemy of allEnemies) {
      if (!enemy.getEnemyData().isActive) {
        this.handleEnemyKilled(enemy)
      }
    }

    // 更新战斗状态
    this.updateBattleState()

    // 检查胜负
    if (this.isVictory()) {
      console.log('胜利判定触发！')
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
      }
    }

    // 统一通知"波次开始"：波次可能由清场门槛触发，也可能由 WaveManager
    // 内置的休整计时器静默启动，这里按波次号去重，保证每条波次只通知一次
    const currentWave = this.waveManager.getCurrentWave()
    if (currentWave > this.lastNotifiedWave) {
      this.lastNotifiedWave = currentWave
      if (this.onWaveStartCallback) {
        this.onWaveStartCallback(currentWave)
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
    return this.waveManager.isAllWavesComplete() && this.enemyManager.getEnemyCount() === 0
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

    // 给上场的武将发放经验奖励
    this.rewardExperienceToHeroes()

    // 更新 SaveManager 的当前存档（让 autoSave 能读取到更新的武将数据）
    this.updateSaveManagerHeroes()

    const result = this.endBattle()

    // 自动存档
    const saveManager = SaveManager.getInstance()
    saveManager.autoSave(result)

    console.log('战斗胜利，已自动存档')

    if (this.onBattleEndCallback) {
      this.onBattleEndCallback(result)
    }
  }

  /**
   * 给上场的武将发放经验奖励
   */
  private rewardExperienceToHeroes(): void {
    // 获取关卡配置的经验奖励
    const expReward = this.levelConfig.rewards?.experience || 0

    if (expReward === 0) return

    // 获取所有上场武将
    const deployedHeroIds = Array.from(this.deployedHeroEntities.values())
      .map(entity => entity.getHeroData().id)

    if (deployedHeroIds.length === 0) return

    console.log(`关卡胜利，奖励 ${expReward} 经验给 ${deployedHeroIds.length} 位武将`)

    // 平均分配经验给上场武将
    const expPerHero = Math.floor(expReward / deployedHeroIds.length)

    for (const heroId of deployedHeroIds) {
      const heroConfig = this.heroConfigs.get(heroId)
      if (!heroConfig) continue

      // 添加经验
      heroConfig.experience += expPerHero

      // 计算新等级
      const newLevel = calculateLevelFromExp(heroConfig.experience)

      // 升级提示
      if (newLevel > heroConfig.level) {
        console.log(`${heroConfig.name} 从 Lv.${heroConfig.level} 升级到 Lv.${newLevel}！`)
        heroConfig.level = newLevel
      } else {
        console.log(`${heroConfig.name} 获得 ${expPerHero} 经验，当前总经验: ${heroConfig.experience}`)
      }
    }
  }

  /**
   * 更新 SaveManager 的当前存档武将数据
   */
  private updateSaveManagerHeroes(): void {
    const saveManager = SaveManager.getInstance()
    const currentSave = saveManager.getCurrentSave()

    if (!currentSave) {
      // 如果没有当前存档，初始化一个
      saveManager.createNewSave(1)
    }

    // 更新当前存档中的武将数据
    const updatedHeroes = Array.from(this.heroConfigs.values())
      .filter(hero => hero.isUnlocked)
      .map(hero => ({
        id: hero.id,
        level: hero.level,
        star: hero.star,
        experience: hero.experience,
        isUnlocked: hero.isUnlocked,
        equipment: hero.equipment
      }))

    // 更新 SaveManager 的 currentSave
    const save = saveManager.getCurrentSave() || saveManager.loadFromSlot(1)
    if (save) {
      save.heroes = updatedHeroes
      saveManager.setCurrentSave(save)
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
    // 获取上场英雄ID列表
    const deployedHeroIds = Array.from(this.deployedHeroEntities.values())
      .map(entity => entity.getHeroData().id)

    return {
      levelId: this.levelConfig.id,
      isVictory: this.battleState.status === 'victory',
      elapsedTime: this.elapsedTime,
      remainingHealth: this.playerHealth,
      wavesCompleted: this.waveManager.getCurrentWave(),
      deployedHeroIds,
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
   * 获取部署格占位表（BattleScene 悬停/首空位查询用）
   */
  getDeployGrid(): DeployGrid {
    return this.deployGrid
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
    this.deployGrid.reset()
    this.deployedHeroEntities.clear()

    this.playerHealth = this.levelConfig.playerStartHealth
    this.elapsedTime = 0
    this.isRunning = false
    this.isPaused = false
    this.lastNotifiedWave = 0

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