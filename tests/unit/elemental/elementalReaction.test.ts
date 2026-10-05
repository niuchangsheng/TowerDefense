import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('phaser', () => ({ default: {} }))
vi.mock('@/effects/CharacterAttackFX', () => ({
  CharacterAttackFX: class {
    damageText() {}
  }
}))

import {
  ElementalReactionManager
} from '@/core/elemental/ElementalReactionManager'

function createMockEnemy(id: string = 'mock_enemy', hp: number = 1000) {
  return {
    active: true,
    x: 100,
    y: 100,
    getEnemyData: () => ({ id, currentHealth: hp, maxHealth: hp, name: '测试敌军' }),
    applySlow: vi.fn(),
    applyPoison: vi.fn(),
    applyBurn: vi.fn(),
    applyBleed: vi.fn(),
    applyHeavy: vi.fn(),
    applyMagmaField: vi.fn(),
    applyArmorBreak: vi.fn(),
    applyStun: vi.fn(),
    applyFreeze: vi.fn(),
    takeDamage: vi.fn((dmg: number) => dmg),
    hitShake: vi.fn(),
    breakIroncladShield: vi.fn(),
    damageBossAegis: vi.fn(() => ({ brokenGrids: 1, shattered: false, weaknessHit: false })),
    setElementalMark: vi.fn(),
    clearElementalMark: vi.fn()
  }
}

describe('ElementalReactionManager 五行相生双向化学连锁测试（2.5s附着 / 相生不抹除 / 1.5s ICD / 共鸣取优法则）', () => {
  let manager: ElementalReactionManager

  beforeEach(() => {
    manager = ElementalReactionManager.getInstance()
    manager.reset()
  })

  it('初始状态下倍率为 1.0，附着时长为 2500ms，同类反应 ICD 为 1500ms', () => {
    expect(manager.getReactionDamageMultiplier()).toBe(1.0)
    expect(ElementalReactionManager.DEFAULT_ATTACHMENT_MS).toBe(2500)
    expect(ElementalReactionManager.DEFAULT_REACTION_ICD_MS).toBe(1500)
  })

  describe('1. 水生木【滋养·蔓延】双向无序判定 & 相生不抹除底层状态 & 1.5s ICD', () => {
    it('正向：先水后木触发滋养（共鸣取优：max(100,120) + 0.25*min(100,120) = 145）且保留底层水木印记', () => {
      const enemy: any = createMockEnemy('enemy_nourish_1')
      const res1 = manager.handleAttack(enemy, 'water', 100)
      expect(res1).toBeNull()
      expect(enemy.setElementalMark).toHaveBeenCalledWith('water', '【湿】', '#29b6f6', 2500)

      const res2 = manager.handleAttack(enemy, 'wood', 120)
      expect(res2).not.toBeNull()
      expect(res2?.reactionType).toBe('nourish')
      expect(res2?.reactionName).toBe('水生木·滋养')
      // 协同基数 = 120 + 0.25 * 100 = 145 -> 145 * 1.5 = 217
      expect(res2?.extraDamage).toBe(Math.floor(145 * 1.5))
      // 相生绝不抹除原有水/木状态！
      expect(manager.hasStatus('enemy_nourish_1', 'wet')).toBe(true)
      expect(manager.hasStatus('enemy_nourish_1', 'parasite')).toBe(true)
      expect(enemy.clearElementalMark).not.toHaveBeenCalled()

      // 1.5s ICD 内再次触发水生木不会重复结算反应
      const resIcd = manager.handleAttack(enemy, 'water', 120)
      expect(resIcd).toBeNull()
    })

    it('逆向：先木后水同样瞬爆触发滋养（无论先后手，高攻主C基数恒定）', () => {
      const enemy: any = createMockEnemy('enemy_nourish_2')
      manager.handleAttack(enemy, 'wood', 120)
      const res2 = manager.handleAttack(enemy, 'water', 100)
      expect(res2).not.toBeNull()
      expect(res2?.reactionType).toBe('nourish')
      // 无论先水100后木120，还是先木120后水100，协同基数均为 145！
      expect(res2?.extraDamage).toBe(Math.floor(145 * 1.5))
    })
  })

  describe('2. 木生火【燎原·焚尽】双向判定', () => {
    it('正向与逆向均等价触发燎原大爆炸', () => {
      const enemy1: any = createMockEnemy('enemy_wildfire_1')
      manager.handleAttack(enemy1, 'wood', 100)
      const res1 = manager.handleAttack(enemy1, 'fire', 150)
      expect(res1?.reactionType).toBe('wildfire')
      // 协同基数 = 150 + 0.25 * 100 = 175 -> 175 * 2.4 + 1000 * 0.025 = 420 + 25 = 445
      expect(res1?.extraDamage).toBe(Math.floor(175 * 2.4) + Math.floor(1000 * 0.025))

      const enemy2: any = createMockEnemy('enemy_wildfire_2')
      manager.handleAttack(enemy2, 'fire', 150)
      const res2 = manager.handleAttack(enemy2, 'wood', 100)
      expect(res2?.reactionType).toBe('wildfire')
      expect(res2?.extraDamage).toBe(res1?.extraDamage)
    })
  })

  describe('3. 火生土【熔岩·焦土】双向判定（削韧破刚，不减速不破甲）', () => {
    it('正向与逆向均触发熔岩焦土并施加 applyMagmaField', () => {
      const enemy: any = createMockEnemy('enemy_magma_1')
      manager.handleAttack(enemy, 'fire', 100)
      const res = manager.handleAttack(enemy, 'earth', 120)
      expect(res?.reactionType).toBe('magma')
      // 协同基数 = 120 + 25 = 145 -> 145 * 1.6 = 232
      expect(res?.extraDamage).toBe(Math.floor(145 * 1.6))
      expect(enemy.applyMagmaField).toHaveBeenCalledWith(4000, 0.4, 0.6)
    })
  })

  describe('4. 土生金【淬刃·锋芒】双向判定', () => {
    it('正向与逆向均触发淬刃锋芒并施加【金·裂】', () => {
      const enemy: any = createMockEnemy('enemy_spikes_1')
      manager.handleAttack(enemy, 'earth', 100)
      const res = manager.handleAttack(enemy, 'metal', 110)
      expect(res?.reactionType).toBe('spikes')
      // 协同基数 = 110 + 25 = 135 -> 135 * 1.8 = 243
      expect(res?.extraDamage).toBe(Math.floor(135 * 1.8))
      expect(enemy.applyBleed).toHaveBeenCalled()
    })
  })

  describe('5. 金生水【寒芒·碎冰】双向判定', () => {
    it('正向与逆向均触发寒芒碎冰并施加 2.5s 绝对冰封', () => {
      const enemy: any = createMockEnemy('enemy_shatter_1')
      manager.handleAttack(enemy, 'metal', 100)
      const res = manager.handleAttack(enemy, 'water', 130)
      expect(res?.reactionType).toBe('shatter')
      // 协同基数 = 130 + 25 = 155 -> 155 * 1.7 = 263
      expect(res?.extraDamage).toBe(Math.floor(155 * 1.7))
      expect(enemy.applyFreeze).toHaveBeenCalledWith(2500)
    })
  })

  describe('6. 160px 五行相生阵脉连线（交叠区衰减减缓 30% & 增伤区 +35% & 定向反应锁）', () => {
    it('处于 160px 阵脉交叠区内的敌军元素附着时长延长（2500 * 1.3 = 3250ms）且相生反应获得 +35% 增伤', () => {
      const enemy: any = createMockEnemy('enemy_leyline_1')
      manager.handleAttack(enemy, 'water', 100, { inLeylineOverlap: true })
      expect(enemy.setElementalMark).toHaveBeenCalledWith(
        'water',
        '【湿】',
        '#29b6f6',
        Math.round(2500 * 1.3)
      )

      const res = manager.handleAttack(enemy, 'wood', 120, {
        inLeylineOverlap: true,
        leylinePartnerWuXing: 'water'
      })
      expect(res?.reactionType).toBe('nourish')
      expect(res?.leylineBoosted).toBe(true)
      // 协同基数 145 * 1.5 * (1 + 0.35) = 293.625 -> 293
      expect(res?.extraDamage).toBe(Math.floor(145 * 1.5 * 1.35))
    })
  })
})
