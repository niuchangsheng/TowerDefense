import { describe, it, expect, vi } from 'vitest'

vi.mock('phaser', () => ({ default: {} }))

import { EndlessModeManager } from '@/core/level/EndlessModeManager'
import { WeatherSystem } from '@/core/battle/WeatherSystem'
import { ElementalReactionManager } from '@/core/elemental/ElementalReactionManager'

describe('EndlessModeManager 战役即无尽 · 三重烽火与动态波次生成器测试', () => {
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

  it('五行词缀分配：前10波无词缀，普通兵种不带词缀，Wave 36+ 三重烽火精英携带双词缀', () => {
    expect(EndlessModeManager.getAffixesForWave(9, 'elite').length).toBe(0)
    expect(EndlessModeManager.getAffixesForWave(9, 'boss').length).toBe(0)

    // 普通小兵任何波次都不分配词缀，保持战场性能与清爽
    expect(EndlessModeManager.getAffixesForWave(50, 'normal').length).toBe(0)

    // 10~35波精英分配 1 个词缀
    const affixesElite = EndlessModeManager.getAffixesForWave(15, 'elite')
    expect(affixesElite.length).toBe(1)
    expect(affixesElite[0].id).toBeDefined()

    // Wave 36+ 三重烽火【极境北伐】精英升级为 2 个复合词缀
    const affixesElite36 = EndlessModeManager.getAffixesForWave(36, 'elite')
    expect(affixesElite36.length).toBe(2)
    expect(affixesElite36[0].id).not.toBe(affixesElite36[1].id)

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

  it('百战无尽【三重烽火】阶段跃迁：保底分位、Boss +2格铁壁、双天时与 2.0s 附着窗口', () => {
    const t0 = EndlessModeManager.getBeaconTierInfo(15)
    expect(t0.tier).toBe(0)
    expect(t0.gemMinRollPercentile).toBe(0)
    expect(t0.bossExtraAegisGrids).toBe(0)
    expect(t0.octagonalLockActive).toBe(false)
    expect(t0.dualWeatherActive).toBe(false)
    expect(t0.attachmentDurationMs).toBe(2500)

    // Wave 16~25：🔥 一重烽火 · 八门重锁
    const t1 = EndlessModeManager.getBeaconTierInfo(16)
    expect(t1.tier).toBe(1)
    expect(t1.gemMinRollPercentile).toBeCloseTo(0.15, 4)
    expect(t1.bossExtraAegisGrids).toBe(2)
    expect(t1.octagonalLockActive).toBe(true)
    expect(t1.dualWeatherActive).toBe(false)
    expect(t1.attachmentDurationMs).toBe(2500)

    // Wave 26~35：🌩️ 二重烽火 · 双象疾电
    const t2 = EndlessModeManager.getBeaconTierInfo(26)
    expect(t2.tier).toBe(2)
    expect(t2.gemMinRollPercentile).toBeCloseTo(0.30, 4)
    expect(t2.bossExtraAegisGrids).toBe(2)
    expect(t2.octagonalLockActive).toBe(true)
    expect(t2.dualWeatherActive).toBe(true)
    expect(t2.attachmentDurationMs).toBe(2000)

    // Wave 36+：👹 三重烽火 · 极境北伐
    const t3 = EndlessModeManager.getBeaconTierInfo(36)
    expect(t3.tier).toBe(3)
    expect(t3.gemMinRollPercentile).toBeCloseTo(0.50, 4)
    expect(t3.compoundAffixes).toBe(true)
    expect(t3.attachmentDurationMs).toBe(2000)
  })

  it('Wave 26+ 双象疾电：敌军享受双天时五维增幅，且 ElementalReactionManager 支持 2.0s 紧凑附着', () => {
    const ws = new WeatherSystem(['metal_wind', 'wood_rain'])
    expect(ws.getSecondaryWeatherForWave(15)).toBeNull()
    expect(ws.getSecondaryWeatherForWave(25)).toBeNull()

    ws.onWaveStart(26)
    const primary26 = ws.getCurrentWeather()
    const secondary26 = ws.getCurrentSecondaryWeather()
    expect(secondary26).not.toBeNull()
    expect(secondary26?.id).not.toBe(primary26.id)

    const combinedEnemyMod = ws.getCurrentEnemyModifiers()
    expect(combinedEnemyMod.hpBonus).toBeCloseTo(
      primary26.enemyModifiers.hpBonus + Math.max(0, secondary26!.enemyModifiers.hpBonus),
      4
    )

    const reactionMgr = ElementalReactionManager.getInstance()
    reactionMgr.reset()
    expect(reactionMgr.getAttachmentDurationMs()).toBe(2500)
    reactionMgr.setAttachmentDurationMs(2000)
    expect(reactionMgr.getAttachmentDurationMs()).toBe(2000)
    reactionMgr.reset()
    expect(reactionMgr.getAttachmentDurationMs()).toBe(2500)
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
