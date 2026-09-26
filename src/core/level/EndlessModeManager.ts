import { LevelConfig, WaveConfig, WaveEnemyConfig, Point } from '@/types'
import { normalEnemies, eliteEnemies, bossEnemies } from '@/data/enemies'

/**
 * 无尽爬塔模式（百战奇谋）波次生成与规则管理器
 * 提供无限波次、递增难度曲线与随机精英/首领波次动态生成
 */
export class EndlessModeManager {
  private static readonly NORMAL_ENEMY_IDS = normalEnemies.map(e => e.id)
  private static readonly ELITE_ENEMY_IDS = eliteEnemies.map(e => e.id)
  private static readonly BOSS_ENEMY_IDS = bossEnemies.map(e => e.id)

  /**
   * 生成指定波次的波次配置
   * @param waveNumber 波次编号 (1-indexed)
   */
  public static generateWave(waveNumber: number): WaveConfig {
    const isBossWave = waveNumber % 5 === 0
    const isEliteWave = !isBossWave && waveNumber % 3 === 0

    const enemies: WaveEnemyConfig[] = []

    if (isBossWave) {
      // 首领波次：Boss + 精英护卫 + 杂兵
      const bossId = this.BOSS_ENEMY_IDS[(Math.floor(waveNumber / 5) - 1) % this.BOSS_ENEMY_IDS.length]
      enemies.push({
        enemyId: bossId,
        count: 1 + Math.floor(waveNumber / 15)
      })

      // 护卫精英
      const eliteId = this.ELITE_ENEMY_IDS[waveNumber % this.ELITE_ENEMY_IDS.length]
      enemies.push({
        enemyId: eliteId,
        count: 2 + Math.floor(waveNumber / 10)
      })

      // 随从杂兵
      const normalId = this.NORMAL_ENEMY_IDS[waveNumber % this.NORMAL_ENEMY_IDS.length]
      enemies.push({
        enemyId: normalId,
        count: 8 + Math.floor(waveNumber * 0.8)
      })
    } else if (isEliteWave) {
      // 精英波次
      const eliteId = this.ELITE_ENEMY_IDS[waveNumber % this.ELITE_ENEMY_IDS.length]
      enemies.push({
        enemyId: eliteId,
        count: 1 + Math.floor(waveNumber / 6)
      })

      // 两种不同属性的普通杂兵混合推进
      const normalId1 = this.NORMAL_ENEMY_IDS[waveNumber % this.NORMAL_ENEMY_IDS.length]
      const normalId2 = this.NORMAL_ENEMY_IDS[(waveNumber + 2) % this.NORMAL_ENEMY_IDS.length]
      const countEach = 5 + Math.floor(waveNumber * 0.5)

      enemies.push({ enemyId: normalId1, count: countEach })
      enemies.push({ enemyId: normalId2, count: countEach })
    } else {
      // 普通波次：多五行属性小兵混编
      const typeCount = Math.min(4, 2 + Math.floor(waveNumber / 4))
      const countPerType = 4 + Math.floor(waveNumber * 0.6)

      for (let i = 0; i < typeCount; i++) {
        const id = this.NORMAL_ENEMY_IDS[(waveNumber + i) % this.NORMAL_ENEMY_IDS.length]
        enemies.push({
          enemyId: id,
          count: countPerType
        })
      }
    }

    // 生成间隔随波次递减（最低不低于 450ms）
    const spawnInterval = Math.max(450, 1100 - waveNumber * 25)
    const delayBeforeWave = isBossWave ? 5000 : 3500

    return {
      waveNumber,
      enemies,
      spawnInterval,
      delayBeforeWave
    }
  }

  /**
   * 生成无尽试炼关卡配置（预置前 60 波，后续可按需扩展）
   */
  public static createEndlessLevelConfig(
    mapPath: Point[],
    spawnPoint: Point,
    exitPoint: Point
  ): LevelConfig {
    const waves: WaveConfig[] = []
    const totalPrebuiltWaves = 60

    for (let w = 1; w <= totalPrebuiltWaves; w++) {
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
      playerStartHealth: 25,
      playerStartCost: 35,
      playerMaxCost: 9999
    }
  }
}
