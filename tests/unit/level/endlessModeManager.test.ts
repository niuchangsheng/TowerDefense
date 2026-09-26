import { describe, it, expect } from 'vitest'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'

describe('EndlessModeManager 无尽试炼与动态波次生成器测试', () => {
  it('波次系数递增平滑，生命值指数提升，移速软上限限制在 1.35', () => {
    const wave1 = EndlessModeManager.getStatMultiplier(1)
    expect(wave1.healthMultiplier).toBe(1)
    expect(wave1.speedMultiplier).toBe(1)
    expect(wave1.attackMultiplier).toBe(1)

    const wave20 = EndlessModeManager.getStatMultiplier(20)
    expect(wave20.healthMultiplier).toBeGreaterThan(2.5)
    expect(wave20.speedMultiplier).toBeGreaterThan(1.0)
    expect(wave20.speedMultiplier).toBeLessThanOrEqual(1.35)

    const wave100 = EndlessModeManager.getStatMultiplier(100)
    expect(wave100.healthMultiplier).toBeGreaterThan(9.0)
    expect(wave100.speedMultiplier).toBeCloseTo(1.297, 3)

    // 突破 120 波后移速触达 1.35 硬上限
    const wave150 = EndlessModeManager.getStatMultiplier(150)
    expect(wave150.speedMultiplier).toBe(1.35)
  })

  it('五行词缀分配：前10波无词缀，普通兵种不带词缀，高波次精英/魔首携带1~3个水墨词缀', () => {
    expect(EndlessModeManager.getAffixesForWave(9, 'elite').length).toBe(0)
    expect(EndlessModeManager.getAffixesForWave(9, 'boss').length).toBe(0)

    // 普通小兵任何波次都不分配词缀，保持战场性能与清爽
    expect(EndlessModeManager.getAffixesForWave(50, 'normal').length).toBe(0)

    // 精英固定分配 1 个词缀
    const affixesElite = EndlessModeManager.getAffixesForWave(15, 'elite')
    expect(affixesElite.length).toBe(1)
    expect(affixesElite[0].id).toBeDefined()

    // 30~49波首领：分配 2 个不同词缀
    const affixesBoss35 = EndlessModeManager.getAffixesForWave(35, 'boss')
    expect(affixesBoss35.length).toBe(2)
    expect(affixesBoss35[0].id).not.toBe(affixesBoss35[1].id)

    // 50波及以上首领：分配 3 个不同词缀
    const affixesBoss55 = EndlessModeManager.getAffixesForWave(55, 'boss')
    expect(affixesBoss55.length).toBe(3)
    const uniqueIds = new Set(affixesBoss55.map(a => a.id))
    expect(uniqueIds.size).toBe(3)
  })

  it('动态波次生成：出兵间隔有 420ms 保护下限，避免极端波次卡顿', () => {
    const wave100 = EndlessModeManager.generateWave(100)
    expect(wave100.waveNumber).toBe(100)
    expect(wave100.enemies.length).toBeGreaterThan(0)
    expect(wave100.spawnInterval).toBeGreaterThanOrEqual(420)

    for (const group of wave100.enemies) {
      expect(group.count).toBeLessThanOrEqual(28)
    }
  })

  it('波次按规则调度精英与首领出阵', () => {
    // wave 6 是精英波次 (6 % 3 === 0 && 6 % 5 !== 0)
    const wave6 = EndlessModeManager.generateWave(6)
    const hasElite6 = wave6.enemies.some(g => g.enemyId.includes('elite'))
    expect(hasElite6).toBe(true)

    // wave 5 和 wave 10 是首领波次 (5 % 5 === 0)
    const wave5 = EndlessModeManager.generateWave(5)
    const hasBoss5 = wave5.enemies.some(g => g.enemyId.includes('boss'))
    expect(hasBoss5).toBe(true)

    const wave10 = EndlessModeManager.generateWave(10)
    const hasBoss10 = wave10.enemies.some(g => g.enemyId.includes('boss'))
    expect(hasBoss10).toBe(true)
  })

  it('创建无尽关卡配置正确初始化', () => {
    const config = EndlessModeManager.createEndlessLevelConfig(
      [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      { x: 0, y: 0 },
      { x: 100, y: 100 }
    )
    expect(config.id).toBe('level_endless_tower')
    expect(config.chapterId).toBe('endless')
    expect(config.waves.length).toBeGreaterThan(0)
  })
})
