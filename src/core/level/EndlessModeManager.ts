import { LevelConfig, WaveConfig, WaveEnemyConfig, Point, EnemyType } from '@/types'
import { normalEnemies, eliteEnemies, bossEnemies } from '@/data/enemies'
import { EnemyAffix, ENEMY_AFFIXES, EnemyAffixId } from '@/types/affix'

export type EndlessBeaconTier = 0 | 1 | 2 | 3

export interface EndlessBeaconTierInfo {
  tier: EndlessBeaconTier
  name: string
  title: string
  icon: string
  shortBadge: string
  bossExtraAegisGrids: number
  octagonalLockActive: boolean
  consecutiveSameReactionHalfBreak: boolean
  dualWeatherActive: boolean
  dualEnemyWeather: boolean
  compoundAffixes: boolean
  attachmentDurationMs: number
  gemMinRollPercentile: number
  mechanicSummary: string
  ruleSummary: string
}

/**
 * 无尽爬塔模式（百战无尽 · 乘胜北伐）与 15 波紧凑战役一体化波次生成管理器
 * 严格遵循 docs/Wuxing_System_Design.md 第九章 §9.4「战役即无尽 · 一体化征战架构」：
 * - 第 1 ~ 15 波【历史战役破关期】：正常 2.5s 元素附着、单一天时流转、第 15 波决战本图镇守主帅，保底分位 0%
 * - 第 16 ~ 25 波 🔥【一重烽火 · 八门重锁】：Boss 五行铁壁 +2 格，同种相生连续破壁效率减半，灵石保底分位 +15%
 * - 第 26 ~ 35 波 🌩️【二重烽火 · 双象疾电】：每 5 波同时降临双天时（敌军同享双天时增幅），附着窗口收紧至 2.0s，灵石保底分位 +30%
 * - 第 36 波+ 👹【三重烽火 · 极境北伐】：统帅 Boss 复合强化词缀高频冲阵，灵石保底分位 +50%（必出极品满值神石）
 */
export class EndlessModeManager {
  private static readonly NORMAL_ENEMY_IDS = normalEnemies.map(e => e.id)
  private static readonly ELITE_ENEMY_IDS = eliteEnemies.map(e => e.id)
  private static readonly BOSS_ENEMY_IDS = bossEnemies.map(e => e.id)

  /**
   * 获取指定波次所属的【战役 / 百战无尽烽火】阶段层级 (0 ~ 3)
   */
  public static getBeaconTier(waveNumber: number): EndlessBeaconTier {
    if (waveNumber <= 15) return 0
    if (waveNumber <= 25) return 1
    if (waveNumber <= 35) return 2
    return 3
  }

  /**
   * 获取指定波次的【战役 / 百战无尽烽火】完整机制跃迁规则与战利品保底信息
   */
  public static getBeaconTierInfo(waveNumber: number): EndlessBeaconTierInfo {
    const tier = this.getBeaconTier(waveNumber)
    switch (tier) {
      case 0:
        return {
          tier: 0,
          name: '历史战役破关期',
          title: '历史战役破关期',
          icon: '⚔️',
          shortBadge: '破关期',
          bossExtraAegisGrids: 0,
          octagonalLockActive: false,
          consecutiveSameReactionHalfBreak: false,
          dualWeatherActive: false,
          dualEnemyWeather: false,
          compoundAffixes: false,
          attachmentDurationMs: 2500,
          gemMinRollPercentile: 0,
          mechanicSummary: '2.5s元素附着 · 单一天时流转 · 第15波决战本图镇守主帅',
          ruleSummary: '2.5s元素附着 · 单一天时流转 · 第15波决战本图镇守主帅'
        }
      case 1:
        return {
          tier: 1,
          name: '一重烽火 · 八门重锁',
          title: '一重烽火 · 八门重锁',
          icon: '🔥',
          shortBadge: '🔥一重烽火',
          bossExtraAegisGrids: 2,
          octagonalLockActive: true,
          consecutiveSameReactionHalfBreak: true,
          dualWeatherActive: false,
          dualEnemyWeather: false,
          compoundAffixes: false,
          attachmentDurationMs: 2500,
          gemMinRollPercentile: 0.15,
          mechanicSummary: 'Boss铁壁+2格 & 同种相生连续破壁减半',
          ruleSummary: '统帅铁壁+2格、连续同种相生破壁效率减半 · 灵石词条保底分位 +15%'
        }
      case 2:
        return {
          tier: 2,
          name: '二重烽火 · 双象疾电',
          title: '二重烽火 · 双象疾电',
          icon: '🌩️',
          shortBadge: '🌩️二重烽火',
          bossExtraAegisGrids: 2,
          octagonalLockActive: true,
          consecutiveSameReactionHalfBreak: true,
          dualWeatherActive: true,
          dualEnemyWeather: true,
          compoundAffixes: false,
          attachmentDurationMs: 2000,
          gemMinRollPercentile: 0.30,
          mechanicSummary: '双天时并降（敌享双天时） & 元素附着缩至2.0s',
          ruleSummary: '每5波双天时并降（敌享双天时）、元素附着缩至2.0s · 灵石词条保底分位 +30%'
        }
      case 3:
      default:
        return {
          tier: 3,
          name: '三重烽火 · 极境北伐',
          title: '三重烽火 · 极境北伐',
          icon: '👹',
          shortBadge: '👹三重烽火',
          bossExtraAegisGrids: 2,
          octagonalLockActive: true,
          consecutiveSameReactionHalfBreak: true,
          dualWeatherActive: true,
          dualEnemyWeather: true,
          compoundAffixes: true,
          attachmentDurationMs: 2000,
          gemMinRollPercentile: 0.50,
          mechanicSummary: '全精英/统帅双词缀魔神化 & 双天时2.0s附着',
          ruleSummary: '统帅复合词缀狂澜 + 双天时2.0s附着 + 八门重锁 · 灵石词条保底分位 +50%（必出极品神石）'
        }
    }
  }

  /**
   * 计算指定波次的敌人属性成长倍率
   * 1~15 波平缓递进（单局 10~12 分钟验证构筑），Wave 16+ 进入无尽高压试炼
   * @param waveNumber 波次编号 (1-indexed)
   */
  public static getStatMultiplier(waveNumber: number): {
    healthMultiplier: number
    attackMultiplier: number
    speedMultiplier: number
  } {
    const waveOffset = Math.max(0, waveNumber - 1)
    // 基础生命：平滑指数成长 (1 + offset * 0.075)^1.04
    const healthMultiplier = Math.pow(1 + waveOffset * 0.075, 1.04)
    // 攻击力适度增长
    const attackMultiplier = 1 + waveOffset * 0.04
    // 移速适度小幅递增，最高上限 +35%（防止怪跑得太快脱离攻击范围）
    const speedMultiplier = Math.min(1.35, 1 + waveOffset * 0.003)

    return {
      healthMultiplier,
      attackMultiplier,
      speedMultiplier
    }
  }

  /**
   * 计算无尽北伐（Wave 16+）掉落宝石的词条保底分位 (Min Roll Percentile)
   * 严格遵循设计文档 §9.4 表格：
   * - 第 1 ~ 15 波：0% (0)
   * - 第 16 ~ 25 波【一重烽火】：+15% (0.15)
   * - 第 26 ~ 35 波【二重烽火】：+30% (0.30)
   * - 第 36 波+【三重烽火】：+50% (0.50)
   * 严禁突破宝石词条本身的 Max 上限（捍卫局外总增益 <= +50% 铁律）
   */
  public static getGemMinRollPercentile(waveNumber: number): number {
    return this.getBeaconTierInfo(waveNumber).gemMinRollPercentile
  }

  /**
   * 为指定波次的敌人类型分配专属水墨词缀
   * 第 10 波起精英分配 1 个，首领依波次分配 1~3 个
   */
  public static getAffixesForWave(waveNumber: number, enemyType: EnemyType): EnemyAffix[] {
    if (waveNumber < 10) return []
    if (enemyType !== 'elite' && enemyType !== 'boss') return []

    const poolKeys = Object.keys(ENEMY_AFFIXES) as EnemyAffixId[]
    const shuffled = [...poolKeys].sort(() => Math.random() - 0.5)

    let affixCount = 0
    if (enemyType === 'elite') {
      affixCount = waveNumber >= 36 ? 2 : 1
    } else if (enemyType === 'boss') {
      if (waveNumber < 30) affixCount = 1
      else if (waveNumber < 50) affixCount = 2
      else affixCount = 3
    }

    return shuffled.slice(0, affixCount).map(id => ENEMY_AFFIXES[id])
  }

  /**
   * 动态生成指定波次的波次配置
   * @param waveNumber 波次编号 (1-indexed)
   * @param overrideBossId 可选指定该波次的统帅 Boss ID
   */
  public static generateWave(waveNumber: number, overrideBossId?: string): WaveConfig {
    const isBossWave = waveNumber % 5 === 0
    const isEliteWave = !isBossWave && waveNumber % 3 === 0

    const enemies: WaveEnemyConfig[] = []

    if (isBossWave) {
      // 首领波次：单统帅 Boss（一期单 Boss 铁壁博弈，无尽高层仍保持单统帅领军）+ 精英护卫 + 杂兵
      const bossId =
        overrideBossId ||
        this.BOSS_ENEMY_IDS[(Math.floor(waveNumber / 5) - 1) % this.BOSS_ENEMY_IDS.length]
      enemies.push({
        enemyId: bossId,
        count: 1,
        spawnDelay: 2500
      })

      // 护卫精英
      const eliteId = this.ELITE_ENEMY_IDS[waveNumber % this.ELITE_ENEMY_IDS.length]
      enemies.push({
        enemyId: eliteId,
        count: Math.min(3, 1 + Math.floor(waveNumber / 10)),
        spawnDelay: 1000
      })

      // 随从杂兵
      const normalId = this.NORMAL_ENEMY_IDS[waveNumber % this.NORMAL_ENEMY_IDS.length]
      enemies.push({
        enemyId: normalId,
        count: Math.min(14, 5 + Math.floor(waveNumber * 0.35)),
        spawnDelay: 0
      })
    } else if (isEliteWave) {
      // 精英波次
      const eliteId = this.ELITE_ENEMY_IDS[waveNumber % this.ELITE_ENEMY_IDS.length]
      enemies.push({
        enemyId: eliteId,
        count: Math.min(3, 1 + Math.floor(waveNumber / 12)),
        spawnDelay: 1500
      })

      const normalId1 = this.NORMAL_ENEMY_IDS[waveNumber % this.NORMAL_ENEMY_IDS.length]
      const normalId2 = this.NORMAL_ENEMY_IDS[(waveNumber + 2) % this.NORMAL_ENEMY_IDS.length]
      const countEach = Math.min(12, 4 + Math.floor(waveNumber * 0.25))

      enemies.push({ enemyId: normalId1, count: countEach, spawnDelay: 0 })
      enemies.push({ enemyId: normalId2, count: countEach, spawnDelay: 1200 })
    } else {
      // 普通波次：多五行属性小兵混编
      const typeCount = Math.min(3, 2 + Math.floor(waveNumber / 7))
      const countPerType = Math.min(10, 3 + Math.floor(waveNumber * 0.25))

      for (let i = 0; i < typeCount; i++) {
        const id = this.NORMAL_ENEMY_IDS[(waveNumber + i) % this.NORMAL_ENEMY_IDS.length]
        enemies.push({
          enemyId: id,
          count: countPerType,
          spawnDelay: i * 1200
        })
      }
    }

    const spawnInterval = Math.max(450, 1050 - waveNumber * 22)
    const delayBeforeWave = isBossWave ? 4500 : 3000

    return {
      waveNumber,
      enemies,
      spawnInterval,
      delayBeforeWave
    }
  }

  /**
   * 生成 15 波紧凑战役波次表（Wave 5 先锋统帅、Wave 10 中军统帅、Wave 15 镇守主帅）
   */
  public static generateCampaign15Waves(
    vanguardBossId: string,
    midBossId: string,
    mainBossId: string
  ): WaveConfig[] {
    const waves: WaveConfig[] = []
    for (let w = 1; w <= 15; w++) {
      let bossId: string | undefined
      if (w === 5) bossId = vanguardBossId
      else if (w === 10) bossId = midBossId
      else if (w === 15) bossId = mainBossId
      waves.push(this.generateWave(w, bossId))
    }
    return waves
  }

  /**
   * 生成无尽试炼关卡配置（预置前 15 波，后续由动态生成器无缝无限接管）
   */
  public static createEndlessLevelConfig(
    mapPath: Point[],
    spawnPoint: Point,
    exitPoint: Point
  ): LevelConfig {
    const waves: WaveConfig[] = []
    const initialWaves = 15

    for (let w = 1; w <= initialWaves; w++) {
      waves.push(this.generateWave(w))
    }

    return {
      id: 'level_endless_tower',
      chapterId: 'endless',
      name: '百战奇谋 · 无尽试炼',
      type: 'side',
      map: {
        path: mapPath,
        spawnPoint,
        exitPoint,
        deployableAreas: [
          { x: 50, y: 50, width: 700, height: 450 }
        ],
        defaultTerrain: 'grass'
      },
      waves,
      rewards: {
        gold: 1000,
        experience: 500
      },
      playerStartHealth: 20,
      playerStartCost: 25,
      playerMaxCost: 9999
    }
  }
}
