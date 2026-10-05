import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('phaser', () => ({ default: {} }))
vi.mock('@/effects/CharacterAttackFX', () => ({
  CharacterAttackFX: class {}
}))

import { AugmentManager } from '@/core/augment/AugmentManager'
import { AUGMENT_POOL } from '@/data/augments'

describe('AugmentManager 军师锦囊（天命肉鸽）核心测试', () => {
  let manager: AugmentManager

  beforeEach(() => {
    manager = new AugmentManager()
  })

  it('初始状态能量与锦囊数量为0，免费易策令（刷新令）为 2', () => {
    expect(manager.getReadyCount()).toBe(0)
    expect(manager.getEnergyProgress()).toBe(0)
    expect(manager.getRerollCount()).toBe(2)
    expect(manager.getActiveAugments().length).toBe(0)
  })

  it('15波战役固定 5 次锦囊抽取节奏（W1开局，W4/W7/W10/W13清波后）', () => {
    expect(manager.checkAndTriggerWaveAugment(1, 'start')).toBe(true)
    expect(manager.checkAndTriggerWaveAugment(1, 'start')).toBe(false) // 防止重复触发
    expect(manager.getReadyCount()).toBe(1)

    expect(manager.checkAndTriggerWaveAugment(3, 'clear')).toBe(false)
    expect(manager.checkAndTriggerWaveAugment(4, 'clear')).toBe(true)
    expect(manager.checkAndTriggerWaveAugment(7, 'clear')).toBe(true)
    expect(manager.checkAndTriggerWaveAugment(10, 'clear')).toBe(true)
    expect(manager.checkAndTriggerWaveAugment(13, 'clear')).toBe(true)
    expect(manager.getReadyCount()).toBe(5)
  })

  it('击杀小兵累积军令能量，满 100 自动触发就绪', () => {
    let readyNotified = 0
    manager.setCallbacks({
      onStratagemReady: (count) => {
        readyNotified = count
      }
    })

    // 普通小兵每个提供 6 点能量
    for (let i = 0; i < 16; i++) {
      manager.onEnemyKilled('normal')
    }
    // 16 * 6 = 96
    expect(manager.getReadyCount()).toBe(0)
    expect(manager.getEnergyProgress()).toBeCloseTo(0.96, 2)

    // 再击杀 1 个普通兵：96 + 6 = 102 -> readyCount 变为 1, 剩余 2
    manager.onEnemyKilled('normal')
    expect(manager.getReadyCount()).toBe(1)
    expect(manager.getEnergyProgress()).toBeCloseTo(0.02, 2)
    expect(readyNotified).toBe(1)
  })

  it('击杀精英和首领提供高额军令能量', () => {
    manager.onEnemyKilled('boss')
    expect(manager.getEnergyProgress()).toBeCloseTo(0.6, 2)

    manager.onEnemyKilled('elite')
    expect(manager.getEnergyProgress()).toBeCloseTo(0.85, 2)
  })

  it('抽取 3 个候选锦囊，候选互不重复且保底 1 张在场五行/英雄契合牌', () => {
    const options = manager.drawOptions(['hero_guanyu'], ['water', 'wood'], 3)
    expect(options.length).toBe(3)
    const uniqueIds = new Set(options.map(o => o.id))
    expect(uniqueIds.size).toBe(3)

    const hasMatched = options.some(
      o =>
        o.heroRequirement === 'hero_guanyu' ||
        (o.wuXingRequirement && o.wuXingRequirement.some(w => w === 'water' || w === 'wood'))
    )
    expect(hasMatched).toBe(true)
  })

  it('选择锦囊后四乘区属性加成生效，扣除就绪计数', () => {
    manager.grantInstantStratagem()
    expect(manager.getReadyCount()).toBe(1)

    // 选取《五气朝元》（易伤区 +35%）
    const fiveCycleAug = AUGMENT_POOL.find(a => a.id === 'aug_five_cycle')!
    manager.selectAugment(fiveCycleAug)

    expect(manager.getReadyCount()).toBe(0)
    expect(manager.getActiveAugments().length).toBe(1)
    expect(manager.getVulnerabilityBonus()).toBeCloseTo(0.35, 2)
  })

  it('使用易策令消耗刷新次数（2次免费重抽）', () => {
    expect(manager.getRerollCount()).toBe(2)
    const r1 = manager.reroll(['hero_zhaoyun'], ['water'])
    expect(r1).not.toBeNull()
    expect(manager.getRerollCount()).toBe(1)

    const r2 = manager.reroll(['hero_zhaoyun'], ['water'])
    expect(r2).not.toBeNull()
    expect(manager.getRerollCount()).toBe(0)

    // 耗尽后无法再次刷新
    const r3 = manager.reroll(['hero_zhaoyun'], ['water'])
    expect(r3).toBeNull()
  })

  it('当所有唯一锦囊全部被选取完后，依然能抽取到精进锦囊（永不枯竭）', () => {
    for (const aug of AUGMENT_POOL) {
      manager.selectAugment(aug)
    }

    const fallbackOptions = manager.drawOptions(['hero_guanyu'], ['wood'], 3)
    expect(fallbackOptions.length).toBe(3)
    expect(fallbackOptions.every(a => a.repeatable)).toBe(true)
  })
})
