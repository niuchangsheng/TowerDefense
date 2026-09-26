import { LevelConfig, WaveConfig, WaveEnemyConfig, Point, EnemyType } from '@/types'
import { normalEnemies, eliteEnemies, bossEnemies } from '@/data/enemies'
import { EnemyAffix, ENEMY_AFFIXES, EnemyAffixId } from '@/types/affix'

/**
 * 无尽爬塔模式（百战奇谋）波次生成与规则管理器
 * 提供无限波次、平滑指数难度曲线与随机精英/首领水墨词缀动态生成
 */
export class EndlessModeManager {
  private static readonly NORMAL_ENEMY_IDS = normalEnemies.map(e => e.id)
  private static readonly ELITE_ENEMY_IDS = eliteEnemies.map(e => e.id)
  private static readonly BOSS_ENEMY_IDS = bossEnemies.map(e => e.id)

  /**
   * 计算指定波次的敌人物理/法术属性成长倍率
   * 采用平滑指数曲线：前期平稳上手，中后期对五行相生与局内肉鸽构筑提出硬性考验
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
   * 为指定波次的敌人类型分配专属水墨词缀
   * 第 10 波起精英分配 1 个，首领依波次分配 1~3 个
   */
  public static getAffixesForWave(waveNumber: number, enemyType: EnemyType): EnemyAffix[] {
    if (waveNumber < 10) return []
    if (enemyType !== 'elite' && enemyType !== 'boss') return []

    const poolKeys = Object.keys(ENEMY_AFFIXES) as EnemyAffixId[]
    // 依据波次与类型伪随机混洗
    const shuffled = [...poolKeys].sort(() => Math.random() - 0.5)

    let affixCount = 0
    if (enemyType === 'elite') {
      affixCount = 1
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
        count: Math.min(3, 1 + Math.floor(waveNumber / 30))
      })

      // 护卫精英
      const eliteId = this.ELITE_ENEMY_IDS[waveNumber % this.ELITE_ENEMY_IDS.length]
      enemies.push({
        enemyId: eliteId,
        count: Math.min(4, 2 + Math.floor(waveNumber / 20))
      })

      // 随从杂兵（限制单批数量上限，依靠血量成长而非无脑堆砌怪海）
      const normalId = this.NORMAL_ENEMY_IDS[waveNumber % this.NORMAL_ENEMY_IDS.length]
      enemies.push({
        enemyId: normalId,
        count: Math.min(18, 6 + Math.floor(waveNumber * 0.35))
      })
    } else if (isEliteWave) {
      // 精英波次
      const eliteId = this.ELITE_ENEMY_IDS[waveNumber % this.ELITE_ENEMY_IDS.length]
      enemies.push({
        enemyId: eliteId,
        count: Math.min(4, 1 + Math.floor(waveNumber / 15))
      })

      // 两种不同属性的普通杂兵混合推进
      const normalId1 = this.NORMAL_ENEMY_IDS[waveNumber % this.NORMAL_ENEMY_IDS.length]
      const normalId2 = this.NORMAL_ENEMY_IDS[(waveNumber + 2) % this.NORMAL_ENEMY_IDS.length]
      const countEach = Math.min(14, 4 + Math.floor(waveNumber * 0.25))

      enemies.push({ enemyId: normalId1, count: countEach })
      enemies.push({ enemyId: normalId2, count: countEach })
    } else {
      // 普通波次：多五行属性小兵混编
      const typeCount = Math.min(4, 2 + Math.floor(waveNumber / 6))
      const countPerType = Math.min(12, 3 + Math.floor(waveNumber * 0.25))

      for (let i = 0; i < typeCount; i++) {
        const id = this.NORMAL_ENEMY_IDS[(waveNumber + i) % this.NORMAL_ENEMY_IDS.length]
        enemies.push({
          enemyId: id,
          count: countPerType
        })
      }
    }

    // 生成间隔随波次递减（最低不低于 420ms，保证战斗节奏不拥挤卡顿）
    const spawnInterval = Math.max(420, 1100 - waveNumber * 25)
    const delayBeforeWave = isBossWave ? 5000 : 3500

    return {
      waveNumber,
      enemies,
      spawnInterval,
      delayBeforeWave
    }
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
      playerStartHealth: 25,
      playerStartCost: 35,
      playerMaxCost: 9999
    }
  }
}
