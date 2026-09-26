import Phaser from 'phaser'
import {
  LevelConfig,
  BattleState,
  BattleStatus,
  BattleResult,
  PlaceHeroResult,
  RetreatHeroResult,
  PlaceTroopResult,
  RetreatTroopResult,
  MoveUnitResult,
  Point,
  EnemyConfig,
  Hero,
  DeployedTroop
} from '@/types'
import { CostManager } from './CostManager'
import { WaveManager } from './WaveManager'
import { DeployGrid } from './DeployGrid'
import { TroopBattleManager } from './TroopBattleManager'
import { EnemyManager } from '@/core/enemy/EnemyManager'
import { HeroBattleManager } from '@/core/hero/HeroBattleManager'
import { HeroFactory } from '@/core/hero/HeroFactory'
import { HeroEntity } from '@/entities/HeroEntity'
import { TroopEntity } from '@/entities/TroopEntity'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { COST_CONFIG, PLAYER_HEALTH_CONFIG, DEPLOY_COOLDOWN_MS, GridCell, cellCenter } from '@/config/constants'
import { getEnemyConfig } from '@/data/enemies'
import { getTroopConfig } from '@/data/troops'
import { SaveManager } from '@/core/save/SaveManager'
import { calculateLevelFromExp } from '@/data/heroes/levelConfig'
import { AugmentManager } from '@/core/augment/AugmentManager'
import { ElementalReactionManager } from '@/core/elemental/ElementalReactionManager'
import { WuXing } from '@/types/wuxing.types'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'
import { EnemySpawnOptions } from '@/core/enemy/EnemyFactory'
import { MilitarySituationManager } from '../military/MilitarySituationManager'
import { MilitarySituation, MilitaryTactic, MilitaryTacticType } from '@/types/militarySituation'

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
  private troopBattleManager: TroopBattleManager
  private deployGrid: DeployGrid

  // 英雄管理
  private heroConfigs: Map<string, Hero>  // 英雄配置数据
  private deployedHeroEntities: Map<string, HeroEntity>

  // 兵种管理
  private deployedTroopEntities: Map<string, TroopEntity>
  private troopInstanceCounter: number

  // 战斗状态
  private battleState: BattleState
  private playerHealth: number
  private maxPlayerHealth: number
  private augmentManager: AugmentManager
  private militarySituationManager: MilitarySituationManager
  private elapsedTime: number
  private isRunning: boolean
  private isPaused: boolean
  private timeScale: number = 1.0
  /** 已通知过"波次开始"的最大波次号（防止重复通知） */
  private lastNotifiedWave: number
  /** 部署冷却剩余（毫秒）：冷却结束前不能再部署新单位 */
  private deployCooldownRemaining: number

  // 事件回调
  private onEnemyKilledCallback?: (enemy: EnemyEntity) => void
  private onEnemyReachedExitCallback?: (enemy: EnemyEntity) => void
  private onWaveStartCallback?: (wave: number) => void
  private onBattleEndCallback?: (result: BattleResult) => void
  private onHeroPlacedCallback?: (hero: HeroEntity) => void
  private onTroopPlacedCallback?: (troop: TroopEntity) => void
  private onMilitarySituationCallback?: (situation: MilitarySituation) => void

  // 战斗统计（用于无尽军报与战勋结算）
  private totalKills: number = 0
  private eliteKills: number = 0
  private bossKills: number = 0

  constructor(scene: Phaser.Scene, levelConfig: LevelConfig, heroConfigs: Map<string, Hero>, startWave?: number) {
    this.scene = scene
    this.levelConfig = levelConfig
    this.heroConfigs = heroConfigs

    // 初始化费用管理（支持高波次大军蓄粮，默认上限 9999）
    const maxCost = levelConfig.playerMaxCost ?? COST_CONFIG.maxCost
    this.costManager = new CostManager(levelConfig.playerStartCost, maxCost)

    // 初始化波次管理
    this.waveManager = new WaveManager(levelConfig.waves)
    const isEndless = this.isEndlessMode()
    if (isEndless) {
      this.waveManager.setWaveGenerator((waveNum) => EndlessModeManager.generateWave(waveNum))
      if (startWave && startWave > 1) {
        this.waveManager.setStartWave(startWave)
        // 补偿跳过波次的开局军费，保证高波次能够布防
        const bonusCost = (startWave - 1) * 20
        this.costManager.addCost(bonusCost)
      }
    }

    // 初始化敌人管理
    this.enemyManager = new EnemyManager(
      scene,
      levelConfig.map.path,
      levelConfig.map.spawnPoint,
      levelConfig.map.exitPoint
    )

    // 初始化肉鸽锦囊管理器
    this.augmentManager = new AugmentManager({
      onHealBase: (amount) => {
        this.playerHealth = Math.min(this.playerHealth + amount, this.maxPlayerHealth)
      },
      onAddMaxHealthBase: (amount) => {
        this.maxPlayerHealth += amount
        this.playerHealth += amount
      }
    })

    // 无尽模式跳过波次：补偿军令锦囊抽取机会（约每3波赠送1次待选锦囊）
    if (isEndless && startWave && startWave > 1) {
      const bonusDraws = Math.floor((startWave - 1) / 3)
      for (let i = 0; i < bonusDraws; i++) {
        this.augmentManager.grantInstantStratagem()
      }
      SaveManager.getInstance().setEndlessCurrentWave(startWave)
    }

    // 初始化战场天时军情管理器
    this.militarySituationManager = new MilitarySituationManager({
      onSituationTriggered: (situation) => {
        if (this.onMilitarySituationCallback) {
          this.onMilitarySituationCallback(situation)
        }
      }
    })

    // 初始化英雄战斗管理
    this.heroBattleManager = new HeroBattleManager(scene, this.enemyManager)
    this.heroBattleManager.setAugmentManager(this.augmentManager)
    this.heroBattleManager.setMilitarySituationManager(this.militarySituationManager)

    // 初始化兵种战斗管理
    this.troopBattleManager = new TroopBattleManager(scene, this.enemyManager)
    this.troopBattleManager.setMilitarySituationManager(this.militarySituationManager)

    // 初始化部署格占位表（兵占1格、将占2格，行军路线不可布防）
    this.deployGrid = new DeployGrid(levelConfig.map.deployableAreas, levelConfig.map.path)

    // 初始化部署英雄列表
    this.deployedHeroEntities = new Map()

    // 初始化部署兵种列表
    this.deployedTroopEntities = new Map()
    this.troopInstanceCounter = 0

    // 初始化战斗状态
    this.playerHealth = levelConfig.playerStartHealth
    this.maxPlayerHealth = levelConfig.playerStartHealth
    this.elapsedTime = 0
    this.isRunning = false
    this.isPaused = false
    this.lastNotifiedWave = startWave && startWave > 1 ? startWave - 1 : 0
    this.deployCooldownRemaining = 0

    this.battleState = {
      status: 'preparing',
      levelId: levelConfig.id,
      currentWave: startWave && startWave > 1 ? startWave - 1 : 0,
      totalWaves: isEndless ? Infinity : levelConfig.waves.length,
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
   * 放置英雄（占 1 格）
   * @param heroId 英雄ID
   * @param cell 部署格子
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

    // 每位武将同时只能上阵一次（拖回底部栏撤下后可再次部署）
    if (this.isHeroDeployed(heroId)) {
      return {
        success: false,
        reason: 'heroAlreadyDeployed'
      }
    }

    // 部署冷却中不能再部署
    if (this.deployCooldownRemaining > 0) {
      return {
        success: false,
        reason: 'deployCooling'
      }
    }

    // 检查费用是否足够
    if (!this.costManager.hasEnoughCost(heroConfig.deploymentCost)) {
      return {
        success: false,
        reason: 'insufficientCost'
      }
    }

    // 计算 1 格脚印并校验（必须在部署区内且未被占用）
    const footprint = this.deployGrid.heroFootprint(cell)
    if (!footprint) {
      const isOnPath = this.deployGrid.isPathCell(cell)
      return {
        success: false,
        reason: isOnPath ? 'onPath' : (this.deployGrid.isCellDeployable(cell) ? 'cellOccupied' : 'invalidPosition')
      }
    }

    // 消耗费用
    this.costManager.consumeCost(heroConfig.deploymentCost)

    // 部署位置 = 格心
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

    // 成功部署后进入冷却
    this.deployCooldownRemaining = DEPLOY_COOLDOWN_MS

    this.onHeroPlacedCallback?.(heroEntity)

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
   * 脚印中心点（多格取平均中点，单格取格心）
   */
  private footprintCenter(footprint: GridCell[]): Point {
    const centers = footprint.map(cellCenter)
    const x = centers.reduce((sum, c) => sum + c.x, 0) / centers.length
    const y = centers.reduce((sum, c) => sum + c.y, 0) / centers.length
    return { x, y }
  }

  /**
   * 放置兵种（占 1 格）
   * @param troopId 兵种ID
   * @param cell 目标格
   */
  placeTroop(troopId: string, cell: GridCell): PlaceTroopResult {
    const troopConfig = getTroopConfig(troopId)
    if (!troopConfig) {
      return {
        success: false,
        reason: 'invalidPosition'
      }
    }

    // 部署冷却中不能再部署
    if (this.deployCooldownRemaining > 0) {
      return {
        success: false,
        reason: 'deployCooling'
      }
    }

    // 检查费用
    if (!this.costManager.hasEnoughCost(troopConfig.deploymentCost)) {
      return {
        success: false,
        reason: 'insufficientCost'
      }
    }

    // 兵种脚印 = 单格：须在部署区内且未被占用
    const footprint = [cell]
    if (!this.deployGrid.canPlaceFootprint(footprint)) {
      const isOnPath = this.deployGrid.isPathCell(cell)
      return {
        success: false,
        reason: isOnPath ? 'onPath' : (this.deployGrid.isCellDeployable(cell) ? 'cellOccupied' : 'invalidPosition')
      }
    }

    // 消耗费用
    this.costManager.consumeCost(troopConfig.deploymentCost)

    // 创建部署数据（位置 = 格心）
    this.troopInstanceCounter++
    const deployedData: DeployedTroop = {
      troopId: troopConfig.id,
      instanceId: `troop_${Date.now()}_${this.troopInstanceCounter}`,
      position: cellCenter(cell),
      lastAttackTime: 0
    }

    // 占用格子
    this.deployGrid.occupy(footprint, deployedData.instanceId)

    // 创建兵种实体
    const troopEntity = new TroopEntity(this.scene, troopConfig, deployedData)

    // 添加到管理器
    this.deployedTroopEntities.set(deployedData.instanceId, troopEntity)
    this.troopBattleManager.addTroop(troopEntity)

    // 更新状态
    this.battleState.currentCost = this.costManager.getCurrentCost()

    // 成功部署后进入冷却
    this.deployCooldownRemaining = DEPLOY_COOLDOWN_MS

    this.onTroopPlacedCallback?.(troopEntity)

    return {
      success: true,
      remainingCost: this.costManager.getCurrentCost()
    }
  }

  /**
   * 撤退兵种（释放单格、返还费用）
   */
  retreatTroop(instanceId: string): RetreatTroopResult {
    const troopEntity = this.deployedTroopEntities.get(instanceId)
    if (!troopEntity) {
      return {
        success: false,
        returnedCost: 0
      }
    }

    const troopData = troopEntity.getTroopData()

    // 返还费用
    const returnedCost = this.costManager.returnCost(troopData.deploymentCost)

    // 释放占用的格子
    this.deployGrid.release(instanceId)

    // 移除兵种
    this.troopBattleManager.removeTroop(instanceId)
    this.deployedTroopEntities.delete(instanceId)
    troopEntity.destroy()

    // 更新状态
    this.battleState.currentCost = this.costManager.getCurrentCost()

    return {
      success: true,
      returnedCost: returnedCost
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

    const scaledDelta = deltaTime * this.timeScale
    this.elapsedTime += scaledDelta

    // 推进部署冷却
    if (this.deployCooldownRemaining > 0) {
      this.deployCooldownRemaining = Math.max(0, this.deployCooldownRemaining - scaledDelta)
    }

    // 更新波次（生成敌人）
    this.updateWaves(scaledDelta)

    // 更新敌人（移动）
    const reachedExitEnemies = this.enemyManager.update(scaledDelta)

    // 处理到达终点的敌人
    for (const enemy of reachedExitEnemies) {
      this.handleEnemyReachedExit(enemy)
    }

    // 更新英雄攻击
    const killedEnemies = this.heroBattleManager.update(scaledDelta, this.elapsedTime)

    // 处理被击杀的敌人
    for (const enemy of killedEnemies) {
      this.handleEnemyKilled(enemy)
    }

    // 更新兵种攻击（英雄击杀结算后再取目标，避免重复处理同一敌人）
    const troopKilledEnemies = this.troopBattleManager.update(scaledDelta, this.elapsedTime)

    // 处理被兵种击杀的敌人（同一击杀结算路径：费用奖励 + 移除 + 回调）
    for (const enemy of troopKilledEnemies) {
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
      // 每波开始时校准所有武将与兵种至部署基准网格位置与缩放，杜绝极限波次下可能累积的微小动画误差
      this.heroBattleManager.resetAllHeroTransforms()
      this.troopBattleManager.resetAllTroopTransforms()

      // 无尽试炼模式：记录当前波次进度供断点重进；每 10 波整休，奖励 1 次军师刷新令并触发军机天时
      if (this.isEndlessMode()) {
        SaveManager.getInstance().setEndlessCurrentWave(currentWave)
        if (currentWave > 1 && currentWave % 10 === 0) {
          this.augmentManager.grantRerolls(1)
          const situation = this.militarySituationManager.checkWave(currentWave)
          if (situation) {
            this.pauseBattle()
          }
        }
      }

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
      let spawnOptions: EnemySpawnOptions | undefined = undefined

      if (this.isEndlessMode()) {
        const currentWave = this.waveManager.getCurrentWave()
        const mult = EndlessModeManager.getStatMultiplier(currentWave)
        const affixes = EndlessModeManager.getAffixesForWave(currentWave, config.type)

        spawnOptions = {
          healthMultiplier: mult.healthMultiplier,
          speedMultiplier: mult.speedMultiplier,
          affixes
        }
      }

      const enemyEntity = this.enemyManager.spawnEnemy(config, spawnOptions)
      console.log(`生成敌人: ${config.name}`)
    }
  }

  /**
   * 处理敌人被击杀
   */
  private handleEnemyKilled(enemy: EnemyEntity): void {
    const enemyData = enemy.getEnemyData()

    // 统计斩敌
    this.totalKills++
    if (enemyData.type === 'elite') this.eliteKills++
    if (enemyData.type === 'boss') this.bossKills++

    // 检查击杀敌人对帅营生命修复（如严阵筑垒）
    const healBase = this.militarySituationManager.onEnemyKilled()
    if (healBase > 0) {
      this.playerHealth = Math.min(this.playerHealth + healBase, this.maxPlayerHealth)
    }

    // 锦囊与军情金币获取加成
    let costMultiplier = this.augmentManager.getCostGainMultiplier()
    costMultiplier *= this.militarySituationManager.getCostAndEnergyMultiplier()

    // 军情【诱敌深入】：若敌人在帅营 200 像素内被消灭，军费奖励翻倍
    const enemyPos = { x: enemy.x, y: enemy.y }
    const exitPos = this.levelConfig.map.exitPoint
    const distToBase = Phaser.Math.Distance.Between(enemyPos.x, enemyPos.y, exitPos.x, exitPos.y)
    if (distToBase <= 200) {
      costMultiplier *= this.militarySituationManager.getNearBaseRewardMultiplier()
    }

    const finalReward = Math.floor(enemyData.rewardCost * costMultiplier)
    this.costManager.addCost(finalReward)

    // 军师锦囊充能
    this.augmentManager.onEnemyKilled(enemyData.type)

    // 移除元素管理器中的状态
    ElementalReactionManager.getInstance().removeEnemy(enemyData.id)

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

    // 移除元素管理器中的状态
    ElementalReactionManager.getInstance().removeEnemy(enemyData.id)

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
    this.battleState.totalWaves = this.isEndlessMode() ? Infinity : this.waveManager.getTotalWaves()
    this.battleState.currentCost = this.costManager.getCurrentCost()
    this.battleState.playerHealth = this.playerHealth
    this.battleState.elapsedTime = this.elapsedTime
    this.battleState.activeEnemies = this.enemyManager.getActiveEnemies().map(e => e.getEnemyData())
    this.battleState.activeSituation = this.militarySituationManager.getActiveSituation() || undefined
    this.battleState.activeTactic = this.militarySituationManager.getActiveTactic() || undefined
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
   * 是否处于无尽试炼模式
   */
  isEndlessMode(): boolean {
    return this.levelConfig.chapterId === 'endless' || this.levelConfig.id === 'level_endless_tower'
  }

  /**
   * 结束战斗
   */
  endBattle(): BattleResult {
    // 获取上场英雄ID列表
    const deployedHeroIds = Array.from(this.deployedHeroEntities.values())
      .map(entity => entity.getHeroData().id)

    const isEndless = this.isEndlessMode()
    const highestWave = this.waveManager.getCurrentWave()
    let isNewRecord = false

    if (isEndless) {
      const saveManager = SaveManager.getInstance()
      isNewRecord = saveManager.updateEndlessRecord(highestWave, this.totalKills)
    }

    return {
      levelId: this.levelConfig.id,
      isVictory: this.battleState.status === 'victory',
      elapsedTime: this.elapsedTime,
      remainingHealth: this.playerHealth,
      wavesCompleted: highestWave,
      deployedHeroIds,
      rewards: {
        soulStones: [],
        equipment: [],
        gems: [],
        gold: this.levelConfig.rewards.gold || 0,
        experience: this.levelConfig.rewards.experience || 0
      },
      stats: {
        totalKills: this.totalKills,
        eliteKills: this.eliteKills,
        bossKills: this.bossKills,
        highestWave,
        isEndless,
        isNewRecord
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
   * 获取已部署兵种
   */
  getDeployedTroops(): TroopEntity[] {
    return Array.from(this.deployedTroopEntities.values())
  }

  /**
   * 武将是否已上阵（每位武将同时只能部署一次）
   */
  isHeroDeployed(heroId: string): boolean {
    for (const entity of this.deployedHeroEntities.values()) {
      if (entity.getHeroData().id === heroId) return true
    }
    return false
  }

  /**
   * 部署冷却剩余毫秒（0 = 可部署）
   */
  getDeployCooldownRemaining(): number {
    return this.deployCooldownRemaining
  }

  /**
   * 开始拖拽已部署单位：释放其占用的格子，返回原脚印（用于取消恢复）。
   * 单位不存在或未占用时返回 null。
   */
  beginUnitDrag(instanceId: string): GridCell[] | null {
    const footprint = this.deployGrid.getFootprint(instanceId)
    if (!footprint) return null

    this.deployGrid.release(instanceId)
    return footprint
  }

  /**
   * 拖拽单位落到目标格：英雄与兵种均按单格校验；
   * 成功则占用新格并把实体移到脚印中心。
   */
  dropUnitOnCell(instanceId: string, cell: GridCell, originalFootprint: GridCell[]): MoveUnitResult {
    const heroEntity = this.deployedHeroEntities.get(instanceId)
    const troopEntity = heroEntity ? undefined : this.deployedTroopEntities.get(instanceId)

    if (!heroEntity && !troopEntity) {
      return { success: false, reason: 'invalidPosition' }
    }

    const footprint = heroEntity
      ? this.deployGrid.heroFootprint(cell)
      : (this.deployGrid.canPlaceFootprint([cell]) ? [cell] : null)

    if (!footprint) {
      const isOnPath = this.deployGrid.isPathCell(cell)
      return { success: false, reason: isOnPath ? 'onPath' : 'cellOccupied' }
    }

    this.deployGrid.occupy(footprint, instanceId)
    const position = this.footprintCenter(footprint)

    if (heroEntity) {
      heroEntity.setPosition(position.x, position.y)
      heroEntity.updateDeployedData({ position })
    } else if (troopEntity) {
      troopEntity.updatePosition(position)
    }

    return { success: true }
  }

  /**
   * 取消拖拽：恢复原脚印占用并把实体移回原位
   */
  cancelUnitDrag(instanceId: string, originalFootprint: GridCell[]): void {
    this.deployGrid.occupy(originalFootprint, instanceId)

    const position = this.footprintCenter(originalFootprint)
    const heroEntity = this.deployedHeroEntities.get(instanceId)
    if (heroEntity) {
      heroEntity.setPosition(position.x, position.y)
      return
    }
    const troopEntity = this.deployedTroopEntities.get(instanceId)
    if (troopEntity) {
      troopEntity.updatePosition(position)
    }
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

  onHeroPlaced(callback: (hero: HeroEntity) => void): void {
    this.onHeroPlacedCallback = callback
  }

  onTroopPlaced(callback: (troop: TroopEntity) => void): void {
    this.onTroopPlacedCallback = callback
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

  setPaused(paused: boolean): void {
    this.isPaused = paused
  }

  togglePause(): boolean {
    this.isPaused = !this.isPaused
    return this.isPaused
  }

  isBattlePaused(): boolean {
    return this.isPaused
  }

  /**
   * 设置战斗速率倍率 (1.0x, 2.0x, 3.0x, 5.0x 等)
   */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.5, Math.min(5.0, scale))
  }

  getTimeScale(): number {
    return this.timeScale
  }

  /**
   * 是否可以提前迎敌（叫下一波）
   */
  canCallNextWaveEarly(): boolean {
    return (
      this.isRunning &&
      !this.isPaused &&
      !this.waveManager.isAllWavesComplete() &&
      (this.isEndlessMode() || this.waveManager.getCurrentWave() < this.levelConfig.waves.length)
    )
  }

  /**
   * 提前击鼓迎敌：直接启动下一波，并奖励赏银
   */
  callNextWaveEarly(): { success: boolean; bonusCost: number } {
    if (!this.canCallNextWaveEarly()) {
      return { success: false, bonusCost: 0 }
    }
    const bonusCost = 8 // 提前迎敌赏银 +8 军费
    this.costManager.addCost(bonusCost)
    this.battleState.currentCost = this.costManager.getCurrentCost()
    this.waveManager.startNextWave()
    return { success: true, bonusCost }
  }

  /**
   * 重置战斗
   */
  reset(): void {
    this.costManager.reset(this.levelConfig.playerStartCost)
    this.waveManager.reset()
    this.enemyManager.reset()
    this.heroBattleManager.reset()
    this.troopBattleManager.reset()
    this.deployGrid.reset()
    this.deployedHeroEntities.clear()
    this.deployedTroopEntities.clear()

    this.playerHealth = this.levelConfig.playerStartHealth
    this.elapsedTime = 0
    this.isRunning = false
    this.isPaused = false
    this.lastNotifiedWave = 0
    this.deployCooldownRemaining = 0

    this.militarySituationManager.reset()

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

  public pauseBattle(): void {
    this.isPaused = true
    this.battleState.status = 'paused'
  }

  public resumeBattle(): void {
    this.isPaused = false
    this.battleState.status = 'running'
  }

  public getMilitarySituationManager(): MilitarySituationManager {
    return this.militarySituationManager
  }

  public onMilitarySituation(callback: (situation: MilitarySituation) => void): void {
    this.onMilitarySituationCallback = callback
  }

  public applyMilitaryTactic(type: MilitaryTacticType): void {
    const tactic = this.militarySituationManager.selectTactic(type)
    if (tactic) {
      if (tactic.costDeduction && tactic.costDeduction > 0) {
        this.costManager.consumeCost(tactic.costDeduction)
      }
      if (tactic.grantRerolls && tactic.grantRerolls > 0) {
        this.augmentManager.grantRerolls(tactic.grantRerolls)
      }
      if (tactic.modifiers.reactionDamageMultiplier) {
        ElementalReactionManager.getInstance().setReactionDamageMultiplier(
          tactic.modifiers.reactionDamageMultiplier
        )
      }
    }
    this.resumeBattle()
  }

  public getAugmentManager(): AugmentManager {
    return this.augmentManager
  }

  public getMaxPlayerHealth(): number {
    return this.maxPlayerHealth
  }

  public getDeployedHeroIds(): string[] {
    return Array.from(this.deployedHeroEntities.values()).map(h => h.getHeroData().id)
  }

  public getDeployedWuXing(): WuXing[] {
    return Array.from(this.deployedHeroEntities.values()).map(h => h.getHeroData().wuXing)
  }

  public getHeroBattleManager(): HeroBattleManager {
    return this.heroBattleManager
  }
}