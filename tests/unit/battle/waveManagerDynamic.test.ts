import { describe, it, expect, beforeEach } from 'vitest'
import { WaveManager } from '@/core/battle/WaveManager'
import { WaveConfig } from '@/types'

describe('WaveManager 动态无限波次生成调度测试', () => {
  let initialWaves: WaveConfig[]

  beforeEach(() => {
    initialWaves = [
      {
        waveNumber: 1,
        enemies: [{ enemyId: 'enemy_grunt', count: 2, spawnDelay: 0 }],
        spawnInterval: 500,
        delayBeforeWave: 1000
      },
      {
        waveNumber: 2,
        enemies: [{ enemyId: 'enemy_grunt', count: 2, spawnDelay: 0 }],
        spawnInterval: 500,
        delayBeforeWave: 1000
      }
    ]
  })

  it('普通模式下波次全部出兵完毕后 isAllWavesComplete 为 true', () => {
    const manager = new WaveManager(initialWaves)
    expect(manager.getTotalWaves()).toBe(2)
    expect(manager.isAllWavesComplete()).toBe(false)

    // 第 1 波：需分帧驱动两次以生成 2 只敌人
    manager.startNextWave()
    expect(manager.getCurrentWave()).toBe(1)
    manager.update(100) // 第 1 只 (t=100 >= 0)
    manager.update(500) // 第 2 只 (t=600 >= 500), 触发 allSpawned = true

    // 第 2 波
    manager.startNextWave()
    expect(manager.getCurrentWave()).toBe(2)
    manager.update(100)
    manager.update(500) // allSpawned = true, isWaitingForNextWave = true

    // 等待结束 (最后一波出兵结束后进入等待，等待时间推进后结算完成)
    manager.update(2000)
    expect(manager.isAllWavesComplete()).toBe(true)
  })

  it('注册动态生成器后，isAllWavesComplete 始终返回 false（无尽终结唯有帅营陷落）', () => {
    const manager = new WaveManager(initialWaves)
    manager.setWaveGenerator((waveNum) => ({
      waveNumber: waveNum,
      enemies: [{ enemyId: 'enemy_grunt', count: 2, spawnDelay: 0 }],
      spawnInterval: 500,
      delayBeforeWave: 1000
    }))

    expect(manager.getTotalWaves()).toBe(999)
    expect(manager.isAllWavesComplete()).toBe(false)

    // 推进完前2波
    manager.startNextWave()
    manager.update(100)
    manager.update(500)
    manager.startNextWave()
    manager.update(100)
    manager.update(500)

    expect(manager.isAllWavesComplete()).toBe(false)

    // 触发第3波（动态生成）
    manager.startNextWave()
    expect(manager.getCurrentWave()).toBe(3)
    expect(manager.isAllWavesComplete()).toBe(false)

    // 持续推进至第 30 波
    for (let w = 4; w <= 30; w++) {
      manager.startNextWave()
      manager.update(100)
      manager.update(500)
    }
    expect(manager.getCurrentWave()).toBe(30)
    expect(manager.isAllWavesComplete()).toBe(false)
  })

  it('超高波次下 getTotalWaves 动态保持不小于当前波次', () => {
    const manager = new WaveManager([])
    manager.setWaveGenerator((waveNum) => ({
      waveNumber: waveNum,
      enemies: [{ enemyId: 'enemy_elite', count: 1 }],
      spawnInterval: 500,
      delayBeforeWave: 500
    }))

    expect(manager.getTotalWaves()).toBe(999)

    // 突破千关
    for (let i = 0; i < 1005; i++) {
      manager.startNextWave()
    }
    expect(manager.getCurrentWave()).toBe(1005)
    expect(manager.getTotalWaves()).toBe(1005)
  })
})
