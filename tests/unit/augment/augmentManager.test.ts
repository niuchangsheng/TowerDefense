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

  it('初始状态能量与锦囊数量为0，刷新令为1', () => {
    expect(manager.getReadyCount()).toBe(0)
    expect(manager.getEnergyProgress()).toBe(0)
    expect(manager.getRerollCount()).toBe(1)
    expect(manager.getActiveAugments().length).toBe(0)
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
    // 击杀首领直接 +60
    manager.onEnemyKilled('boss')
    expect(manager.getEnergyProgress()).toBeCloseTo(0.6, 2)

    // 击杀精英 +25 -> 85
    manager.onEnemyKilled('elite')
    expect(manager.getEnergyProgress()).toBeCloseTo(0.85, 2)
  })

  it('抽取 3 个候选锦囊，候选互不重复', () => {
    const options = manager.drawOptions(['hero_guanyu'], ['water', 'wood'], 3)
    expect(options.length).toBe(3)
    const uniqueIds = new Set(options.map(o => o.id))
    expect(uniqueIds.size).toBe(3)
  })

  it('选择锦囊后属性加成生效，扣除就绪计数', () => {
    manager.grantInstantStratagem()
    expect(manager.getReadyCount()).toBe(1)

    // 选取《神速急行》（攻速+25%）
    const marchSpeedAug = AUGMENT_POOL.find(a => a.id === 'aug_march_speed')!
    manager.selectAugment(marchSpeedAug)

    expect(manager.getReadyCount()).toBe(0)
    expect(manager.getActiveAugments().length).toBe(1)
    expect(manager.getAttackSpeedBonus()).toBeCloseTo(0.25, 2)
  })

  it('重整军策消耗刷新令', () => {
    expect(manager.getRerollCount()).toBe(1)
    const newOptions = manager.reroll(['hero_zhaoyun'], ['metal'])
    expect(newOptions).not.toBeNull()
    expect(manager.getRerollCount()).toBe(0)

    // 无法再次刷新
    const secondReroll = manager.reroll(['hero_zhaoyun'], ['metal'])
    expect(secondReroll).toBeNull()
  })

  it('当所有唯一锦囊全部被选取完后，依然能抽取到精进锦囊（永不枯竭）', () => {
    // 模拟选取了所有唯一锦囊
    for (const aug of AUGMENT_POOL) {
      manager.selectAugment(aug)
    }

    // 此时唯一锦囊已耗尽，再次抽取应自动补足可重复的精进锦囊
    const fallbackOptions = manager.drawOptions(['hero_guanyu'], ['water'], 3)
    expect(fallbackOptions.length).toBe(3)
    expect(fallbackOptions.every(a => a.repeatable)).toBe(true)
  })
})
