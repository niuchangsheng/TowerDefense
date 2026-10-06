import Phaser from 'phaser'
import {
  LevelConfig,
  BattleState,
  BattleResult,
  PlaceHeroResult,
  RetreatHeroResult,
  PlaceTroopResult,
  RetreatTroopResult,
  MoveUnitResult,
  Point,
  Hero,
  DeployedTroop
} from '@/types'
import { CostManager } from './CostManager'
import { WaveManager } from './WaveManager'
import { DeployGrid } from './DeployGrid'
import { TroopBattleManager } from './TroopBattleManager'
import { WeatherSystem, WeatherConfig } from './WeatherSystem'
import { EnemyManager } from '@/core/enemy/EnemyManager'
import { HeroBattleManager } from '@/core/hero/HeroBattleManager'
import { HeroFactory } from '@/core/hero/HeroFactory'
import { HeroEntity } from '@/entities/HeroEntity'
import { TroopEntity } from '@/entities/TroopEntity'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { COST_CONFIG, DEPLOY_COOLDOWN_MS, GridCell, cellCenter } from '@/config/constants'
import { getEnemyConfig } from '@/data/enemies'
import { getTroopConfig } from '@/data/troops'
import { getStarDeploymentCostReduction } from '@/data/heroes'
import { SaveManager } from '@/core/save/SaveManager'
import { calculateLevelFromExp } from '@/data/heroes/levelConfig'
import { AugmentManager } from '@/core/augment/AugmentManager'
import { ElementalReactionManager } from '@/core/elemental/ElementalReactionManager'
import { WuXing } from '@/types/wuxing.types'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'
import { EnemySpawnOptions } from '@/core/enemy/EnemyFactory'
import { MilitarySituationManager } from '../military/MilitarySituationManager'
import { MilitarySituation, MilitaryTacticType } from '@/types/militarySituation'

/**
 * 战斗主控制器
 * 协调所有战斗模块（15波紧凑战役、无弹窗动态天时、5次自选锦囊、梯度漏怪惩罚、波间自由换阵、Wave 15 凯旋/北伐抉择）
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
  private weatherSystem: WeatherSystem

  // 英雄管理
  private heroConfigs: Map<string, Hero>
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
  /** 已通知过"波次开始"的最大波次号 */
  private lastNotifiedWave: number
  /** 已结算过"波次清场"的最大波次号 */
  private lastClearedWave: number = 0
  /** 部署冷却剩余（毫秒） */
  private deployCooldownRemaining: number
  /** 是否已从战役第 15 波无缝踏入无尽北伐 (Wave 16+) */
  private endlessTransitioned: boolean = false
  /** 是否正在等待玩家做出第 15 波通关抉择 */
  private awaitingCampaignWave15Choice: boolean = false

  // 事件回调
  private onEnemyKilledCallback?: (enemy: EnemyEntity) => void
  private onEnemyReachedExitCallback?: (enemy: EnemyEntity) => void
  private onWaveStartCallback?: (wave: number) => void
  private onBattleEndCallback?: (result: BattleResult) => void
  private onHeroPlacedCallback?: (hero: HeroEntity) => void
  private onTroopPlacedCallback?: (troop: TroopEntity) => void
  private onMilitarySituationCallback?: (situation: MilitarySituation) => void
  private onWeatherChangedCallback?: (weather: WeatherConfig, wave: number) => void
  private onCampaignWave15ChoiceCallback?: () => void

  // 战斗统计
  private totalKills: number = 0
  private eliteKills: number = 0
  private bossKills: number = 0

  constructor(scene: Phaser.Scene, levelConfig: LevelConfig, heroConfigs: Map<string, Hero>, startWave?: number) {
    this.scene = scene
    this.levelConfig = levelConfig
    this.heroConfigs = heroConfigs

    const maxCost = levelConfig.playerMaxCost ?? COST_CONFIG.maxCost
    this.costManager = new CostManager(levelConfig.playerStartCost, maxCost)

    if (startWave && startWave >= 16) {
      this.endlessTransitioned = true
    }

    // 初始化波次管理
    this.waveManager = new WaveManager(levelConfig.waves)
    const isEndless = this.isEndlessMode()
    if (isEndless) {
      this.waveManager.setWaveGenerator((waveNum) => EndlessModeManager.generateWave(waveNum))
      if (startWave && startWave > 1) {
        this.waveManager.setStartWave(startWave)
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

    if (isEndless && startWave && startWave > 1) {
      const bonusDraws = Math.floor((startWave - 1) / 3)
      for (let i = 0; i < bonusDraws; i++) {
        this.augmentManager.grantInstantStratagem()
      }
      SaveManager.getInstance().setEndlessCurrentWave(startWave)
    }

    // 初始化无弹窗动态天时系统（5波一轮，Wave 11~15 固定晴空朗日）
    this.weatherSystem = new WeatherSystem()
    this.weatherSystem.setOnWeatherChanged((weather) => {
      if (this.onWeatherChangedCallback) {
        this.onWeatherChangedCallback(weather, Math.max(1, this.waveManager.getCurrentWave()))
      }
    })

    // 保留旧军情接口兼容
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
    this.heroBattleManager.setWeatherSystem(this.weatherSystem)

    // 初始化兵种战斗管理
    this.troopBattleManager = new TroopBattleManager(scene, this.enemyManager)
    this.troopBattleManager.setMilitarySituationManager(this.militarySituationManager)

    // 初始化部署格占位表
    this.deployGrid = new DeployGrid(levelConfig.map.deployableAreas, levelConfig.map.path)

    this.deployedHeroEntities = new Map()
    this.deployedTroopEntities = new Map()
    this.troopInstanceCounter = 0

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
   * 计算武将考虑 2★ 将星命盘后的实际部署粮草费用（2★及以上减免 2 点粮草）
   */
  public getEffectiveHeroDeploymentCost(heroConfig: Hero): number {
    const reduction = getStarDeploymentCostReduction(heroConfig.star ?? 1)
    return Math.max(4, heroConfig.deploymentCost - reduction)
  }

  /**
   * 开始战斗
   */
  startBattle(): void {
    this.isRunning = true
    this.isPaused = false
    this.battleState.status = 'running'

    // Wave 1 开局赠送第 1 次三选一锦囊（若直入 Wave 16+ 则已在构造时补齐 5 策）
    if (this.lastNotifiedWave === 0) {
      this.augmentManager.checkAndTriggerWaveAugment(1, 'start')
    }

    // 开始第一波（或设定起始波）
    this.waveManager.startNextWave()
  }

  /**
   * 放置英雄（占 1 格）
   */
  placeHero(heroId: string, cell: GridCell): PlaceHeroResult {
    const heroConfig = this.heroConfigs.get(heroId)
    if (!heroConfig || !heroConfig.isUnlocked) {
      return {
        success: false,
        reason: 'heroNotUnlocked'
      }
    }

    if (this.isHeroDeployed(heroId)) {
      return {
        success: false,
        reason: 'heroAlreadyDeployed'
      }
    }

    if (this.deployCooldownRemaining > 0) {
      return {
        success: false,
        reason: 'deployCooling'
      }
    }

    const effectiveCost = this.getEffectiveHeroDeploymentCost(heroConfig)
    if (!this.costManager.hasEnoughCost(effectiveCost)) {
      return {
        success: false,
        reason: 'insufficientCost'
      }
    }

    const footprint = this.deployGrid.heroFootprint(cell)
    if (!footprint) {
      const isOnPath = this.deployGrid.isPathCell(cell)
      return {
        success: false,
        reason: isOnPath ? 'onPath' : (this.deployGrid.isCellDeployable(cell) ? 'cellOccupied' : 'invalidPosition')
      }
    }

    this.costManager.consumeCost(effectiveCost)

    const position = this.footprintCenter(footprint)
    const deployedData = HeroFactory.createDeployedHero(heroConfig, position)

    this.deployGrid.occupy(footprint, deployedData.instanceId)

    const heroEntity = new HeroEntity(this.scene, heroConfig, deployedData)

    this.deployedHeroEntities.set(deployedData.instanceId, heroEntity)
    this.heroBattleManager.addHero(heroEntity)

    this.battleState.currentCost = this.costManager.getCurrentCost()
    this.battleState.deployedHeroes.push(deployedData)

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

  private footprintCenter(footprint: GridCell[]): Point {
    const centers = footprint.map(cellCenter)
    const x = centers.reduce((sum, c) => sum + c.x, 0) / centers.length
    const y = centers.reduce((sum, c) => sum + c.y, 0) / centers.length
    return { x, y }
  }

  /**
   * 放置兵种（占 1 格）
   */
  placeTroop(troopId: string, cell: GridCell): PlaceTroopResult {
    const troopConfig = getTroopConfig(troopId)
    if (!troopConfig) {
      return {
        success: false,
        reason: 'invalidPosition'
      }
    }

    if (this.deployCooldownRemaining > 0) {
      return {
        success: false,
        reason: 'deployCooling'
      }
    }

    if (!this.costManager.hasEnoughCost(troopConfig.deploymentCost)) {
      return {
        success: false,
        reason: 'insufficientCost'
      }
    }

    const footprint = [cell]
    if (!this.deployGrid.canPlaceFootprint(footprint)) {
      const isOnPath = this.deployGrid.isPathCell(cell)
      return {
        success: false,
        reason: isOnPath ? 'onPath' : (this.deployGrid.isCellDeployable(cell) ? 'cellOccupied' : 'invalidPosition')
      }
    }

    this.costManager.consumeCost(troopConfig.deploymentCost)

    this.troopInstanceCounter++
    const deployedData: DeployedTroop = {
      troopId: troopConfig.id,
      instanceId: `troop_${Date.now()}_${this.troopInstanceCounter}`,
      position: cellCenter(cell),
      lastAttackTime: 0
    }

    this.deployGrid.occupy(footprint, deployedData.instanceId)

    const troopEntity = new TroopEntity(this.scene, troopConfig, deployedData)

    this.deployedTroopEntities.set(deployedData.instanceId, troopEntity)
    this.troopBattleManager.addTroop(troopEntity)

    this.battleState.currentCost = this.costManager.getCurrentCost()
    this.deployCooldownRemaining = DEPLOY_COOLDOWN_MS

    this.onTroopPlacedCallback?.(troopEntity)

    return {
      success: true,
      remainingCost: this.costManager.getCurrentCost()
    }
  }

  /**
   * 撤退兵种
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
    const returnedCost = this.costManager.returnCost(troopData.deploymentCost)

    this.deployGrid.release(instanceId)
    this.troopBattleManager.removeTroop(instanceId)
    this.deployedTroopEntities.delete(instanceId)
    troopEntity.destroy()

    this.battleState.currentCost = this.costManager.getCurrentCost()

    return {
      success: true,
      returnedCost
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
    const effectiveCost = this.getEffectiveHeroDeploymentCost(heroData)
    const returnedCost = this.costManager.returnCost(effectiveCost)

    this.deployGrid.release(instanceId)
    this.heroBattleManager.removeHero(instanceId)
    this.deployedHeroEntities.delete(instanceId)
    heroEntity.destroy()

    this.battleState.currentCost = this.costManager.getCurrentCost()
    this.battleState.deployedHeroes = this.battleState.deployedHeroes.filter(
      h => h.instanceId !== instanceId
    )

    return {
      success: true,
      returnedCost
    }
  }

  triggerSkill(_instanceId: string): void {
    // 主动技能触发由 HeroBattleManager.manualCastSkill 处理
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

    if (this.deployCooldownRemaining > 0) {
      this.deployCooldownRemaining = Math.max(0, this.deployCooldownRemaining - scaledDelta)
    }

    // 更新波次（生成敌人）
    this.updateWaves(scaledDelta)

    // 更新敌人（移动）
    const reachedExitEnemies = this.enemyManager.update(scaledDelta)

    // 处理到达终点的敌人（梯度扣血 / 统帅突破即刻判负）
    for (const enemy of reachedExitEnemies) {
      this.handleEnemyReachedExit(enemy)
    }

    // 更新英雄攻击
    const killedEnemies = this.heroBattleManager.update(scaledDelta, this.elapsedTime)

    for (const enemy of killedEnemies) {
      this.handleEnemyKilled(enemy)
    }

    // 更新兵种攻击
    const troopKilledEnemies = this.troopBattleManager.update(scaledDelta, this.elapsedTime)

    for (const enemy of troopKilledEnemies) {
      this.handleEnemyKilled(enemy)
    }

    // 检查是否有其他死亡的敌人（技能或DoT杀死等），并应用天时梅雨连绵回血
    const weatherEnemyMod = this.weatherSystem.getCurrentEnemyModifiers()
    const reactionMgr = ElementalReactionManager.getInstance()
    const allEnemies = this.enemyManager.getActiveEnemies()
    for (const enemy of allEnemies) {
      const eData = enemy.getEnemyData()
      if (!eData.isActive) {
        this.handleEnemyKilled(enemy)
        continue
      }
      // 梅雨瘴林（wood_rain）：敌军每秒恢复 1.0% 最大生命（受【木·毒】禁疗压制）
      if (
        weatherEnemyMod.hpRegenPerSec > 0 &&
        !reactionMgr.hasStatus(eData.id, 'parasite')
      ) {
        const healAmt = eData.maxHealth * weatherEnemyMod.hpRegenPerSec * (scaledDelta / 1000)
        eData.currentHealth = Math.min(eData.maxHealth, eData.currentHealth + healAmt)
      }
    }

    // 检测当前波次是否刚刚清场，触发 Wave 4 / 7 / 10 / 13 清波锦囊
    this.checkWaveClearAugment()

    // 更新战斗状态
    this.updateBattleState()

    // 检查胜负
    if (this.isDefeat()) {
      this.handleDefeat()
    } else if (this.isVictory()) {
      // 若为战役模式完成第 15 波，且注册了【凯旋班师 / 乘胜北伐】抉择回调，则先弹出抉择
      if (
        !this.isEndlessMode() &&
        this.onCampaignWave15ChoiceCallback &&
        !this.awaitingCampaignWave15Choice
      ) {
        this.awaitingCampaignWave15Choice = true
        this.pauseBattle()
        this.onCampaignWave15ChoiceCallback()
      } else if (!this.awaitingCampaignWave15Choice) {
        this.handleVictory()
      }
    }
  }

  /**
   * 检测当前波次是否已全部生成且场上敌人清零，触发清波后锦囊（Wave 4, 7, 10, 13）
   */
  private checkWaveClearAugment(): void {
    const currentWave = this.waveManager.getCurrentWave()
    if (
      currentWave > this.lastClearedWave &&
      !this.waveManager.isWaveInProgress() &&
      this.enemyManager.getEnemyCount() === 0
    ) {
      this.lastClearedWave = currentWave
      this.augmentManager.checkAndTriggerWaveAugment(currentWave, 'clear')
    }
  }

  /**
   * 更新波次
   */
  private updateWaves(deltaTime: number): void {
    const enemyIdsToSpawn = this.waveManager.update(deltaTime)

    for (const enemyId of enemyIdsToSpawn) {
      this.spawnEnemy(enemyId)
    }

    if (this.waveManager.isWaiting() && !this.waveManager.isWaveInProgress()) {
      if (this.enemyManager.getEnemyCount() === 0 && !this.waveManager.isAllWavesComplete()) {
        this.waveManager.startNextWave()
      }
    }

    const currentWave = this.waveManager.getCurrentWave()
    if (currentWave > this.lastNotifiedWave) {
      this.lastNotifiedWave = currentWave
      this.heroBattleManager.resetAllHeroTransforms()
      this.troopBattleManager.resetAllTroopTransforms()

      // 同步百战无尽【三重烽火】阶段机制（Wave 26+ 附着窗口收紧至 2.0s）
      const beaconInfo = EndlessModeManager.getBeaconTierInfo(currentWave)
      ElementalReactionManager.getInstance().setAttachmentDurationMs(beaconInfo.attachmentDurationMs)

      // 同步观星借天策锦囊状态：《五丈原祈星》与《奇门遁甲》
      if (this.augmentManager.hasSpecialAugment('aug_wuzhangyuan_star')) {
        this.weatherSystem.setReverseNegativeAndBoostPositive(true)
      }
      if (this.augmentManager.hasSpecialAugment('aug_celestial_tome')) {
        this.weatherSystem.setDualWeatherActive(true)
      }

      // 无弹窗动态天时轮转（Wave 1, 6, 11, 16... 自动切换）
      const rotated = this.weatherSystem.onWaveStart(currentWave)

      // 《望梅止渴》：每当天时轮转或每经过 3 波，开启 10s 普攻 100% 必挂五行元素窗口
      if (
        this.augmentManager.hasSpecialAugment('aug_endless_wuxing_harmony') &&
        (rotated.changed || currentWave % 3 === 1)
      ) {
        this.weatherSystem.triggerWangmeiGuaranteedElement(this.elapsedTime, 10000)
      }

      // 《木牛流马》：每波开始时额外拨付 +10 军费
      if (this.augmentManager.hasSpecialAugment('aug_wooden_ox')) {
        this.costManager.addCost(10)
      }

      // 无尽模式记录进度，每 5 波额外赠送 1 次锦囊与 1 枚易策令
      if (this.isEndlessMode()) {
        SaveManager.getInstance().setEndlessCurrentWave(currentWave)
        if (currentWave > 15 && currentWave % 5 === 1) {
          this.augmentManager.grantInstantStratagem()
          this.augmentManager.grantRerolls(1)
        }
      }

      if (this.onWaveStartCallback) {
        this.onWaveStartCallback(currentWave)
      }
    }
  }

  /**
   * 生成单个敌人（含天时双向敌方属性修正 + Wave 5 / Wave 10 随天时绑定的先锋统帅 + Wave 16+ 三重烽火强化）
   */
  private spawnEnemy(enemyId: string): void {
    let config = getEnemyConfig(enemyId)
    const currentWave = this.waveManager.getCurrentWave()

    // 战役第 5 波与第 10 波：先锋与中军统帅随本段天时动态绑定（第 15 波固定为本卷镇守主帅）
    if (
      config &&
      config.type === 'boss' &&
      !this.isEndlessMode() &&
      (currentWave === 5 || currentWave === 10)
    ) {
      const boundBossId = this.weatherSystem.getCurrentWeather().vanguardBossId
      if (boundBossId) {
        const boundConfig = getEnemyConfig(boundBossId)
        if (boundConfig) {
          config = boundConfig
        }
      }
    }

    if (config) {
      const weatherEnemyMod = this.weatherSystem.getCurrentEnemyModifiers()
      let healthMult = 1.0 + (weatherEnemyMod.hpBonus || 0)
      let speedMult = Math.max(0.4, 1.0 + (weatherEnemyMod.moveSpeedBonus || 0))
      let affixes: EnemySpawnOptions['affixes'] = []

      if (this.isEndlessMode() || currentWave > 1) {
        const mult = EndlessModeManager.getStatMultiplier(currentWave)
        healthMult *= mult.healthMultiplier
        speedMult *= mult.speedMultiplier
        if (this.isEndlessMode()) {
          affixes = EndlessModeManager.getAffixesForWave(currentWave, config.type)
        }
      }

      const spawnOptions: EnemySpawnOptions = {
        healthMultiplier: healthMult,
        speedMultiplier: speedMult,
        affixes
      }

      const spawned = this.enemyManager.spawnEnemy(config, spawnOptions)
      const eData = spawned.getEnemyData()

      // 百战一重烽火【八门重锁】（Wave 16+）：Boss 铁壁格数 +2，且连续使用同一种相生反应破盾效率减半
      const beaconInfo = EndlessModeManager.getBeaconTierInfo(currentWave)
      if (eData.type === 'boss' && beaconInfo.bossExtraAegisGrids > 0) {
        eData.maxAegisGrids = (eData.maxAegisGrids ?? 3) + beaconInfo.bossExtraAegisGrids
        eData.currentAegisGrids = eData.maxAegisGrids
        eData.octagonalLockActive = beaconInfo.octagonalLockActive
        spawned.updateHealth(eData.currentHealth)
      }

      if (weatherEnemyMod.defenseBonus) {
        const baseDef = eData.defense ?? 0
        eData.defense = Math.max(baseDef * 0.4, baseDef * (1 + weatherEnemyMod.defenseBonus))
      }
      if (weatherEnemyMod.tenacityBonus) {
        eData.tenacity = Math.max(0, (eData.tenacity ?? 0) + weatherEnemyMod.tenacityBonus)
      }
      if (weatherEnemyMod.fortitudeBonus) {
        eData.fortitude = Math.max(0, (eData.fortitude ?? 0) + weatherEnemyMod.fortitudeBonus)
      }
    }
  }

  /**
   * 处理敌人被击杀
   */
  private handleEnemyKilled(enemy: EnemyEntity): void {
    const enemyData = enemy.getEnemyData()

    this.totalKills++
    if (enemyData.type === 'elite') this.eliteKills++
    if (enemyData.type === 'boss') this.bossKills++

    const healBase = this.militarySituationManager.onEnemyKilled()
    if (healBase > 0) {
      this.playerHealth = Math.min(this.playerHealth + healBase, this.maxPlayerHealth)
    }

    let costMultiplier = this.augmentManager.getCostGainMultiplier()
    costMultiplier *= this.militarySituationManager.getCostAndEnergyMultiplier()

    const enemyPos = { x: enemy.x, y: enemy.y }
    const exitPos = this.levelConfig.map.exitPoint
    const distToBase = Phaser.Math.Distance.Between(enemyPos.x, enemyPos.y, exitPos.x, exitPos.y)
    if (distToBase <= 200) {
      costMultiplier *= this.militarySituationManager.getNearBaseRewardMultiplier()
    }

    const finalReward = Math.floor(enemyData.rewardCost * costMultiplier)
    this.costManager.addCost(finalReward)

    this.augmentManager.onEnemyKilled(enemyData.type)

    ElementalReactionManager.getInstance().removeEnemy(enemyData.id)
    this.enemyManager.removeEnemy(enemyData.instanceId)

    if (this.onEnemyKilledCallback) {
      this.onEnemyKilledCallback(enemy)
    }
  }

  /**
   * 处理敌人突破终点（漏怪梯度惩罚铁律）：
   * - 普通怪突破：扣除主公 1 点生命
   * - 精英怪突破：扣除主公 3 点生命
   * - 三国统帅 Boss 突破：直接触发【大营沦陷 · 斩将夺旗】即刻判负！
   */
  private handleEnemyReachedExit(enemy: EnemyEntity): void {
    const enemyData = enemy.getEnemyData()

    if (enemyData.type === 'boss') {
      // 统帅突破防线：大营沦陷，即刻判负
      this.playerHealth = 0
    } else if (enemyData.type === 'elite') {
      this.playerHealth = Math.max(0, this.playerHealth - 3)
    } else {
      this.playerHealth = Math.max(0, this.playerHealth - 1)
    }

    ElementalReactionManager.getInstance().removeEnemy(enemyData.id)
    this.enemyManager.removeEnemy(enemyData.instanceId)

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
   * 玩家在第 15 波通关抉择中选择【🏆 凯旋班师】
   */
  public confirmCampaignVictory(): void {
    this.awaitingCampaignWave15Choice = false
    this.handleVictory()
  }

  /**
   * 玩家在第 15 波通关抉择中选择【🔥 乘胜北伐 · 踏入无尽烽火 (Wave 16+)】
   * 先保存第 15 波通关进度，再无缝绑定动态波次生成器并开启第 16 波！
   */
  public continueToEndlessNorthExpedition(): void {
    this.awaitingCampaignWave15Choice = false

    // 先发放首通经验并保存战役通关记录
    this.rewardExperienceToHeroes()
    this.updateSaveManagerHeroes()
    const campaignVictoryResult = this.endBattle()
    campaignVictoryResult.isVictory = true
    SaveManager.getInstance().autoSave(campaignVictoryResult)

    // 切换至无尽北伐模式 (Wave 16+)
    this.endlessTransitioned = true
    this.waveManager.setWaveGenerator((waveNum) => EndlessModeManager.generateWave(waveNum))
    this.battleState.totalWaves = Infinity
    this.resumeBattle()
    this.waveManager.startNextWave()
    this.updateBattleState()
  }

  /**
   * 处理胜利
   */
  private handleVictory(): void {
    this.battleState.status = 'victory'
    this.isRunning = false

    this.rewardExperienceToHeroes()
    this.updateSaveManagerHeroes()

    const result = this.endBattle()

    const saveManager = SaveManager.getInstance()
    saveManager.autoSave(result)

    if (this.onBattleEndCallback) {
      this.onBattleEndCallback(result)
    }
  }

  private rewardExperienceToHeroes(): void {
    const expReward = this.levelConfig.rewards?.experience || 0
    if (expReward === 0) return

    const deployedHeroIds = Array.from(this.deployedHeroEntities.values())
      .map(entity => entity.getHeroData().id)

    if (deployedHeroIds.length === 0) return

    const expPerHero = Math.floor(expReward / deployedHeroIds.length)

    for (const heroId of deployedHeroIds) {
      const heroConfig = this.heroConfigs.get(heroId)
      if (!heroConfig) continue

      heroConfig.experience += expPerHero
      const newLevel = calculateLevelFromExp(heroConfig.experience)
      if (newLevel > heroConfig.level) {
        heroConfig.level = newLevel
      }
    }
  }

  private updateSaveManagerHeroes(): void {
    const saveManager = SaveManager.getInstance()
    const currentSave = saveManager.getCurrentSave()

    if (!currentSave) {
      saveManager.createNewSave(1)
    }

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

    const save = saveManager.getCurrentSave() || saveManager.loadFromSlot(1)
    if (save) {
      save.heroes = updatedHeroes
      saveManager.setCurrentSave(save)
    }
  }

  /**
   * 处理失败（战败亦触发自动存档，记录当前进度与状态）
   */
  private handleDefeat(): void {
    this.battleState.status = 'defeat'
    this.isRunning = false

    this.updateSaveManagerHeroes()

    const result = this.endBattle()

    const saveManager = SaveManager.getInstance()
    saveManager.autoSave(result)

    if (this.onBattleEndCallback) {
      this.onBattleEndCallback(result)
    }
  }

  /**
   * 是否处于无尽试炼 / 乘胜北伐模式
   */
  isEndlessMode(): boolean {
    return (
      this.endlessTransitioned ||
      this.levelConfig.chapterId === 'endless' ||
      this.levelConfig.id === 'level_endless_tower'
    )
  }

  /**
   * 结束战斗
   */
  endBattle(): BattleResult {
    const deployedHeroIds = Array.from(this.deployedHeroEntities.values())
      .map(entity => entity.getHeroData().id)

    const isEndless = this.isEndlessMode()
    const highestWave = this.waveManager.getCurrentWave()
    let isNewRecord = false

    if (isEndless || this.battleState.status === 'victory') {
      const saveManager = SaveManager.getInstance()
      isNewRecord = saveManager.updateEndlessRecord(highestWave, this.totalKills, this.levelConfig.id)
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

  getState(): BattleState {
    return this.battleState
  }

  getDeployGrid(): DeployGrid {
    return this.deployGrid
  }

  getDeployedTroops(): TroopEntity[] {
    return Array.from(this.deployedTroopEntities.values())
  }

  isHeroDeployed(heroId: string): boolean {
    for (const entity of this.deployedHeroEntities.values()) {
      if (entity.getHeroData().id === heroId) return true
    }
    return false
  }

  getDeployCooldownRemaining(): number {
    return this.deployCooldownRemaining
  }

  /**
   * 是否处于【波间布阵期】允许自由拖拽换位
   * 规则：开战前或波次间隔无活跃敌军时，可完全自由拖拽调整 160px 相生阵脉；
   * 战斗交火期（场上有活跃敌军行军时）锁定武将位置，专注相生反应与战法释放。
   */
  public canRepositionUnits(): boolean {
    if (!this.isRunning) return true
    return this.enemyManager.getEnemyCount() === 0
  }

  /**
   * 开始拖拽已部署单位：仅在波间布阵期允许拖拽换位
   */
  beginUnitDrag(instanceId: string): GridCell[] | null {
    if (!this.canRepositionUnits()) {
      return null
    }
    const footprint = this.deployGrid.getFootprint(instanceId)
    if (!footprint) return null

    this.deployGrid.release(instanceId)
    return footprint
  }

  /**
   * 拖拽单位落到目标格
   */
  dropUnitOnCell(instanceId: string, cell: GridCell, _originalFootprint: GridCell[]): MoveUnitResult {
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

  onWeatherChanged(callback: (weather: WeatherConfig, wave: number) => void): void {
    this.onWeatherChangedCallback = callback
  }

  onCampaignWave15Choice(callback: () => void): void {
    this.onCampaignWave15ChoiceCallback = callback
  }

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

  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.5, Math.min(5.0, scale))
  }

  getTimeScale(): number {
    return this.timeScale
  }

  canCallNextWaveEarly(): boolean {
    return (
      this.isRunning &&
      !this.isPaused &&
      !this.waveManager.isAllWavesComplete() &&
      (this.isEndlessMode() || this.waveManager.getCurrentWave() < this.levelConfig.waves.length)
    )
  }

  /**
   * 提前击鼓迎敌：直接启动下一波，并奖励 +8 粮草
   */
  callNextWaveEarly(): { success: boolean; bonusCost: number } {
    if (!this.canCallNextWaveEarly()) {
      return { success: false, bonusCost: 0 }
    }
    const bonusCost = 8
    this.costManager.addCost(bonusCost)
    this.battleState.currentCost = this.costManager.getCurrentCost()
    this.waveManager.startNextWave()
    return { success: true, bonusCost }
  }

  reset(): void {
    this.costManager.reset(this.levelConfig.playerStartCost)
    this.waveManager.reset()
    this.enemyManager.reset()
    this.heroBattleManager.reset()
    this.troopBattleManager.reset()
    this.deployGrid.reset()
    this.weatherSystem.reset()
    this.deployedHeroEntities.clear()
    this.deployedTroopEntities.clear()

    this.playerHealth = this.levelConfig.playerStartHealth
    this.elapsedTime = 0
    this.isRunning = false
    this.isPaused = false
    this.lastNotifiedWave = 0
    this.lastClearedWave = 0
    this.deployCooldownRemaining = 0
    this.endlessTransitioned = false
    this.awaitingCampaignWave15Choice = false

    this.militarySituationManager.reset()
    this.augmentManager.reset()

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

  public getWeatherSystem(): WeatherSystem {
    return this.weatherSystem
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