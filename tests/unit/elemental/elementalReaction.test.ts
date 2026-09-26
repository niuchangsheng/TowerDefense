import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('phaser', () => ({ default: {} }))
vi.mock('@/effects/CharacterAttackFX', () => ({
  CharacterAttackFX: class {}
}))

import { ElementalReactionManager } from '@/core/elemental/ElementalReactionManager'

describe('ElementalReactionManager 五行元素连锁反应测试', () => {
  let manager: ElementalReactionManager

  beforeEach(() => {
    manager = ElementalReactionManager.getInstance()
    manager.reset()
  })

  it('初始状态下倍率为 1.0', () => {
    expect(manager.getReactionDamageMultiplier()).toBe(1.0)
  })

  it('调整伤害倍率正常生效', () => {
    manager.setReactionDamageMultiplier(1.8)
    expect(manager.getReactionDamageMultiplier()).toBe(1.8)
  })

  it('模拟敌人连续受到水系和木系攻击触发【水生木·滋养】反应', () => {
    // 模拟敌人实体
    const mockEnemy: any = {
      active: true,
      x: 100,
      y: 100,
      getEnemyData: () => ({ id: 'mock_enemy_1', currentHealth: 500, maxHealth: 500, name: '测试敌军' }),
      applySlow: () => {},
      applyPoison: () => {},
      applyBurn: () => {},
      applyArmorBreak: () => {},
      applyStun: () => {},
      applyFreeze: () => {},
      takeDamage: (dmg: number) => dmg,
      hitShake: () => {}
    }

    // 第一击：水系攻击（挂载潮湿，不触发反应）
    const res1 = manager.handleAttack(mockEnemy, 'water', 100)
    expect(res1).toBeNull()

    // 第二击：木系攻击（水生木，触发滋养·蔓延）
    const res2 = manager.handleAttack(mockEnemy, 'wood', 100)
    expect(res2).not.toBeNull()
    expect(res2?.reactionType).toBe('nourish')
    expect(res2?.reactionName).toBe('水生木·滋养')
    expect(res2?.extraDamage).toBe(150) // 100 * 1.5
  })

  it('模拟敌人受到木系后遭遇火系攻击触发【木生火·燎原】大爆炸反应', () => {
    const mockEnemy: any = {
      active: true,
      x: 200,
      y: 200,
      getEnemyData: () => ({ id: 'mock_enemy_2', currentHealth: 1000, maxHealth: 1000, name: '测试精英' }),
      applySlow: () => {},
      applyPoison: () => {},
      applyBurn: () => {},
      applyArmorBreak: () => {},
      applyStun: () => {},
      applyFreeze: () => {},
      takeDamage: (dmg: number) => dmg,
      hitShake: () => {}
    }

    // 第一击：木系（寄生）
    manager.handleAttack(mockEnemy, 'wood', 120)

    // 第二击：火系（燎原大爆炸 2.4倍）
    const res = manager.handleAttack(mockEnemy, 'fire', 120)
    expect(res).not.toBeNull()
    expect(res?.reactionType).toBe('wildfire')
    expect(res?.reactionName).toBe('木生火·燎原')
    expect(res?.extraDamage).toBe(Math.floor(120 * 2.4))
  })

  it('模拟水火相克触发【水火·蒸发】爆破反应', () => {
    const mockEnemy: any = {
      active: true,
      x: 300,
      y: 300,
      getEnemyData: () => ({ id: 'mock_enemy_3', currentHealth: 800, maxHealth: 800, name: '测试敌军' }),
      applySlow: () => {},
      applyPoison: () => {},
      applyBurn: () => {},
      applyArmorBreak: () => {},
      applyStun: () => {},
      applyFreeze: () => {},
      takeDamage: (dmg: number) => dmg,
      hitShake: () => {}
    }

    // 第一击：火系
    manager.handleAttack(mockEnemy, 'fire', 100)

    // 第二击：水系攻击灼烧目标 -> 蒸发爆鸣 (2.2倍)
    const res = manager.handleAttack(mockEnemy, 'water', 100)
    expect(res).not.toBeNull()
    expect(res?.reactionType).toBe('vaporize')
    expect(res?.extraDamage).toBe(220)
  })
})
