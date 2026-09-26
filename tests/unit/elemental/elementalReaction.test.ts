import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('phaser', () => ({ default: {} }))
vi.mock('@/effects/CharacterAttackFX', () => ({
  CharacterAttackFX: class {
    damageText() {}
  }
}))

import { ElementalReactionManager } from '@/core/elemental/ElementalReactionManager'

function createMockEnemy(id: string = 'mock_enemy', hp: number = 1000) {
  return {
    active: true,
    x: 100,
    y: 100,
    getEnemyData: () => ({ id, currentHealth: hp, maxHealth: hp, name: '测试敌军' }),
    applySlow: vi.fn(),
    applyPoison: vi.fn(),
    applyBurn: vi.fn(),
    applyArmorBreak: vi.fn(),
    applyStun: vi.fn(),
    applyFreeze: vi.fn(),
    takeDamage: vi.fn((dmg: number) => dmg),
    hitShake: vi.fn(),
    breakIroncladShield: vi.fn(),
    setElementalMark: vi.fn(),
    clearElementalMark: vi.fn()
  }
}

describe('ElementalReactionManager 五行元素连锁反应测试（双向等价瞬爆）', () => {
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

  describe('1. 水生木【滋养·蔓延】双向判定', () => {
    it('正向：先水后木触发滋养', () => {
      const enemy: any = createMockEnemy('enemy_nourish_1')
      const res1 = manager.handleAttack(enemy, 'water', 100)
      expect(res1).toBeNull()
      expect(enemy.setElementalMark).toHaveBeenCalledWith('water', '【湿】', '#29b6f6', 4500)

      const res2 = manager.handleAttack(enemy, 'wood', 120)
      expect(res2).not.toBeNull()
      expect(res2?.reactionType).toBe('nourish')
      expect(res2?.reactionName).toBe('水生木·滋养')
      expect(res2?.extraDamage).toBe(Math.floor(120 * 1.5))
      expect(enemy.clearElementalMark).toHaveBeenCalled()
    })

    it('逆向：先木后水同样瞬爆触发滋养', () => {
      const enemy: any = createMockEnemy('enemy_nourish_2')
      const res1 = manager.handleAttack(enemy, 'wood', 100)
      expect(res1).toBeNull()
      expect(enemy.setElementalMark).toHaveBeenCalledWith('wood', '【毒】', '#4caf50', 4500)

      const res2 = manager.handleAttack(enemy, 'water', 140)
      expect(res2).not.toBeNull()
      expect(res2?.reactionType).toBe('nourish')
      expect(res2?.extraDamage).toBe(Math.floor(140 * 1.5))
      expect(enemy.clearElementalMark).toHaveBeenCalled()
    })
  })

  describe('2. 木生火【燎原·焚尽】双向判定', () => {
    it('正向：先木后火触发燎原大爆炸', () => {
      const enemy: any = createMockEnemy('enemy_wildfire_1')
      manager.handleAttack(enemy, 'wood', 100)
      const res = manager.handleAttack(enemy, 'fire', 150)
      expect(res?.reactionType).toBe('wildfire')
      expect(res?.extraDamage).toBe(Math.floor(150 * 2.4))
    })

    it('逆向：先火后木同样瞬爆触发燎原大爆炸', () => {
      const enemy: any = createMockEnemy('enemy_wildfire_2')
      manager.handleAttack(enemy, 'fire', 100)
      const res = manager.handleAttack(enemy, 'wood', 150)
      expect(res?.reactionType).toBe('wildfire')
      expect(res?.extraDamage).toBe(Math.floor(150 * 2.4))
    })
  })

  describe('3. 火生土【熔岩·焦土】双向判定', () => {
    it('正向：先火后土触发熔岩焦土', () => {
      const enemy: any = createMockEnemy('enemy_magma_1')
      manager.handleAttack(enemy, 'fire', 100)
      const res = manager.handleAttack(enemy, 'earth', 120)
      expect(res?.reactionType).toBe('magma')
      expect(res?.extraDamage).toBe(Math.floor(120 * 1.6))
    })

    it('逆向：先土后火同样触发熔岩焦土', () => {
      const enemy: any = createMockEnemy('enemy_magma_2')
      manager.handleAttack(enemy, 'earth', 100)
      const res = manager.handleAttack(enemy, 'fire', 120)
      expect(res?.reactionType).toBe('magma')
      expect(res?.extraDamage).toBe(Math.floor(120 * 1.6))
    })
  })

  describe('4. 土生金【淬刃·锋芒】双向判定', () => {
    it('正向：先土后金触发锋芒飞刃', () => {
      const enemy: any = createMockEnemy('enemy_spikes_1')
      manager.handleAttack(enemy, 'earth', 100)
      const res = manager.handleAttack(enemy, 'metal', 110)
      expect(res?.reactionType).toBe('spikes')
      expect(res?.extraDamage).toBe(Math.floor(110 * 1.8))
    })

    it('逆向：先金后土同样触发锋芒飞刃', () => {
      const enemy: any = createMockEnemy('enemy_spikes_2')
      manager.handleAttack(enemy, 'metal', 100)
      const res = manager.handleAttack(enemy, 'earth', 110)
      expect(res?.reactionType).toBe('spikes')
      expect(res?.extraDamage).toBe(Math.floor(110 * 1.8))
    })
  })

  describe('5. 金生水【寒芒·碎冰】双向判定', () => {
    it('正向：先金后水触发极寒碎冰', () => {
      const enemy: any = createMockEnemy('enemy_shatter_1')
      manager.handleAttack(enemy, 'metal', 100)
      const res = manager.handleAttack(enemy, 'water', 130)
      expect(res?.reactionType).toBe('shatter')
      expect(res?.extraDamage).toBe(Math.floor(130 * 1.7))
    })

    it('逆向：先水后金同样触发极寒碎冰', () => {
      const enemy: any = createMockEnemy('enemy_shatter_2')
      manager.handleAttack(enemy, 'water', 100)
      const res = manager.handleAttack(enemy, 'metal', 130)
      expect(res?.reactionType).toBe('shatter')
      expect(res?.extraDamage).toBe(Math.floor(130 * 1.7))
    })
  })

  describe('6. 水火相克【汽化·蒸发】与锦囊【水火既济】增强', () => {
    it('先火后水触发蒸发', () => {
      const enemy: any = createMockEnemy('enemy_vap_1')
      manager.handleAttack(enemy, 'fire', 100)
      const res = manager.handleAttack(enemy, 'water', 100)
      expect(res?.reactionType).toBe('vaporize')
      expect(res?.extraDamage).toBe(220)
    })

    it('先水后火同样触发蒸发', () => {
      const enemy: any = createMockEnemy('enemy_vap_2')
      manager.handleAttack(enemy, 'water', 100)
      const res = manager.handleAttack(enemy, 'fire', 100)
      expect(res?.reactionType).toBe('vaporize')
      expect(res?.extraDamage).toBe(220)
    })

    it('激活【水火既济】时，蒸发伤害获得 1.6 倍提升', () => {
      manager.setVaporizeShockwave(true)
      const enemy: any = createMockEnemy('enemy_vap_boost')
      manager.handleAttack(enemy, 'fire', 100)
      const res = manager.handleAttack(enemy, 'water', 100)
      expect(res?.reactionType).toBe('vaporize')
      // 100 * 2.2 * 1.6 = 352
      expect(res?.extraDamage).toBe(Math.floor(100 * 2.2 * 1.6))
    })
  })
})
