import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('phaser', () => {
  class MockScene {
    tweens = {
      add: vi.fn(),
      killTweensOf: vi.fn()
    }
    time = {
      now: 1000,
      delayedCall: vi.fn()
    }
    add = {
      text: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      graphics: vi.fn().mockReturnValue({
        setDepth: vi.fn().mockReturnThis(),
        lineStyle: vi.fn().mockReturnThis(),
        fillStyle: vi.fn().mockReturnThis(),
        fillCircle: vi.fn().mockReturnThis(),
        strokeCircle: vi.fn().mockReturnThis(),
        fillRoundedRect: vi.fn().mockReturnThis(),
        strokeRoundedRect: vi.fn().mockReturnThis(),
        beginPath: vi.fn().mockReturnThis(),
        arc: vi.fn().mockReturnThis(),
        lineTo: vi.fn().mockReturnThis(),
        closePath: vi.fn().mockReturnThis(),
        fillPath: vi.fn().mockReturnThis(),
        strokePath: vi.fn().mockReturnThis(),
        lineBetween: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      circle: vi.fn().mockReturnValue({
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      container: vi.fn().mockReturnValue({
        setDepth: vi.fn().mockReturnThis(),
        add: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      image: vi.fn().mockReturnValue({
        setDisplaySize: vi.fn().mockReturnThis()
      })
    }
    textures = {
      exists: vi.fn().mockReturnValue(false)
    }
  }
  return {
    default: {
      Scene: MockScene,
      Math: {
        Between: (a: number, b: number) => Math.floor((a + b) / 2),
        Distance: {
          Between: (x1: number, y1: number, x2: number, y2: number) =>
            Math.hypot(x2 - x1, y2 - y1)
        }
      }
    }
  }
})

vi.mock('@/effects/CharacterAttackFX', () => {
  return {
    CharacterAttackFX: class {
      damageText = vi.fn()
      lunge = vi.fn()
      inkDissolve = vi.fn()
      static getWorldXY = vi.fn().mockReturnValue({ x: 0, y: 0 })
    }
  }
})

vi.mock('@/effects/SoundFX', () => {
  return {
    SoundFX: {
      whoosh: vi.fn(),
      gong: vi.fn(),
      bowSnap: vi.fn(),
      thud: vi.fn(),
      unlock: vi.fn()
    }
  }
})

import { activeSkills, getActiveSkill } from '@/data/skills/activeSkills'
import { passiveSkills, getPassiveSkill } from '@/data/skills/passiveSkills'
import { SkillManager } from '@/core/skill/SkillManager'
import { SkillExecutor } from '@/core/skill/SkillExecutor'
import { ElementalReactionManager } from '@/core/elemental/ElementalReactionManager'

describe('英雄技能重构（百分比缩放、五行反应联动与被动机制）测试', () => {
  it('主动技能数据均配置为攻击力百分比加成与五行状态附着（五虎大圆满）', () => {
    // 关羽（木）：青龙偃月斩
    const guanyuSkill = getActiveSkill('skill_active_guanyu')
    expect(guanyuSkill).toBeDefined()
    expect(guanyuSkill?.effect.attackMultiplier).toBe(2.6) // 260% 攻击力
    expect(guanyuSkill?.effect.element).toBe('wood')
    expect(guanyuSkill?.effect.statusEffect).toBe('parasite')
    expect(guanyuSkill?.effect.range).toBe(220)

    // 张飞（土）：当阳断桥喝
    const zhangfeiSkill = getActiveSkill('skill_active_zhangfei')
    expect(zhangfeiSkill).toBeDefined()
    expect(zhangfeiSkill?.effect.attackMultiplier).toBe(2.2) // 220% 攻击力
    expect(zhangfeiSkill?.effect.element).toBe('earth')
    expect(zhangfeiSkill?.effect.statusEffect).toBe('heavy')
    expect(zhangfeiSkill?.effect.knockbackDistance).toBe(40)
    expect(zhangfeiSkill?.effect.stunDuration).toBe(1500)

    // 赵云（水）：惊鸿穿云
    const zhaoyunSkill = getActiveSkill('skill_active_zhaoyun')
    expect(zhaoyunSkill).toBeDefined()
    expect(zhaoyunSkill?.name).toBe('惊鸿穿云')
    expect(zhaoyunSkill?.effect.attackMultiplier).toBe(1.8) // 180% 攻击力
    expect(zhaoyunSkill?.effect.element).toBe('water')
    expect(zhaoyunSkill?.effect.maxTargets).toBe(5)
    expect(zhaoyunSkill?.effect.slowRatio).toBe(0.35)

    // 黄忠（火）：赤焰落日箭
    const huangzhongSkill = getActiveSkill('skill_active_huangzhong')
    expect(huangzhongSkill).toBeDefined()
    expect(huangzhongSkill?.name).toBe('赤焰落日箭')
    expect(huangzhongSkill?.effect.attackMultiplier).toBe(2.4) // 240% 攻击力
    expect(huangzhongSkill?.effect.element).toBe('fire')
    expect(huangzhongSkill?.effect.statusEffect).toBe('burn')
    expect(huangzhongSkill?.effect.range).toBe(220)

    // 马超（金）：神威破军突
    const machaoSkill = getActiveSkill('skill_active_machao')
    expect(machaoSkill).toBeDefined()
    expect(machaoSkill?.name).toBe('神威破军突')
    expect(machaoSkill?.effect.attackMultiplier).toBe(2.8) // 280% 攻击力
    expect(machaoSkill?.effect.element).toBe('metal')
    expect(machaoSkill?.effect.statusEffect).toBe('bleed')
    expect(machaoSkill?.effect.range).toBe(240)
  })

  it('被动技能数据升级为机制联动（横扫、斩杀、多段连刺、百步穿杨、西凉战意）', () => {
    // 关羽（木）：武圣
    const guanyuPassive = getPassiveSkill('skill_passive_guanyu')
    expect(guanyuPassive).toBeDefined()
    expect(guanyuPassive?.effect.attackMultiplier).toBe(0.8)
    expect(guanyuPassive?.effect.element).toBe('wood')

    // 张飞（土）：狂烈
    const zhangfeiPassive = getPassiveSkill('skill_passive_zhangfei')
    expect(zhangfeiPassive).toBeDefined()
    expect(zhangfeiPassive?.name).toBe('狂烈')
    expect(zhangfeiPassive?.effect.value).toBe(25) // 增伤25%
    expect(zhangfeiPassive?.effect.element).toBe('earth')

    // 赵云（水）：龙胆
    const zhaoyunPassive = getPassiveSkill('skill_passive_zhaoyun')
    expect(zhaoyunPassive).toBeDefined()
    expect(zhaoyunPassive?.effect.value).toBe(15) // 攻速加成15%
    expect(zhaoyunPassive?.effect.element).toBe('water')

    // 黄忠（火）：百步穿杨
    const huangzhongPassive = getPassiveSkill('skill_passive_huangzhong')
    expect(huangzhongPassive).toBeDefined()
    expect(huangzhongPassive?.name).toBe('百步穿杨')
    expect(huangzhongPassive?.effect.value).toBe(25)
    expect(huangzhongPassive?.effect.element).toBe('fire')

    // 马超（金）：西凉骠骑
    const machaoPassive = getPassiveSkill('skill_passive_machao')
    expect(machaoPassive).toBeDefined()
    expect(machaoPassive?.name).toBe('西凉骠骑')
    expect(machaoPassive?.effect.value).toBe(15) // 攻速加成15%
    expect(machaoPassive?.effect.element).toBe('metal')
  })

  it('SkillManager 支持技能冷却返还与机制立即刷新', () => {
    const manager = new SkillManager()
    manager.initHeroSkills('skill_passive_guanyu', 'skill_active_guanyu')

    // 初始就绪
    expect(manager.canUseSkill('skill_active_guanyu')).toBe(true)

    // 触发冷却
    manager.triggerCooldown('skill_active_guanyu')
    expect(manager.canUseSkill('skill_active_guanyu')).toBe(false)
    const state = manager.getSkillState('skill_active_guanyu')
    expect(state?.currentCooldown).toBe(8000)

    // 关羽击杀木系敌军，返还 1000ms 冷却
    manager.reduceCooldown('skill_active_guanyu', 1000)
    expect(state?.currentCooldown).toBe(7000)

    // 大额返还直接刷成就绪
    manager.reduceCooldown('skill_active_guanyu', 8000)
    expect(state?.currentCooldown).toBe(0)
    expect(manager.canUseSkill('skill_active_guanyu')).toBe(true)
  })

  it('SkillExecutor 执行主动范围技能时，伤害随英雄攻击力等比例放大', () => {
    const scene: any = {
      add: {
        graphics: vi.fn().mockReturnValue({
          setDepth: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          fillStyle: vi.fn().mockReturnThis(),
          fillCircle: vi.fn().mockReturnThis(),
          strokeCircle: vi.fn().mockReturnThis(),
          beginPath: vi.fn().mockReturnThis(),
          arc: vi.fn().mockReturnThis(),
          lineTo: vi.fn().mockReturnThis(),
          closePath: vi.fn().mockReturnThis(),
          fillPath: vi.fn().mockReturnThis(),
          strokePath: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        }),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        })
      },
      tweens: {
        add: vi.fn()
      },
      time: {
        delayedCall: vi.fn()
      },
      textures: {
        exists: vi.fn().mockReturnValue(false)
      }
    }

    // 创建虚拟敌人
    const createMockEnemy = (hp: number, wuXing: any) => ({
      x: 100,
      y: 100,
      getEnemyData: () => ({
        id: 'enemy_mock',
        currentHealth: hp,
        maxHealth: hp,
        wuXing,
        isActive: true,
        type: 'normal'
      }),
      takeDamage: vi.fn((dmg: number) => {
        hp -= dmg
        return dmg
      }),
      applyStun: vi.fn(),
      applySlow: vi.fn(),
      hitShake: vi.fn(),
      die: vi.fn()
    })

    const enemyManager: any = {
      getEnemiesInRange: vi.fn()
    }

    const skillManager = new SkillManager()
    skillManager.initHeroSkills('skill_passive_guanyu', 'skill_active_guanyu')

    const executor = new SkillExecutor(scene, skillManager, enemyManager)

    // 1. 英雄基础攻击力 100
    const hero1: any = {
      getHeroData: () => ({ id: 'hero_guanyu', wuXing: 'wood', name: '关羽' }),
      getEffectiveStats: () => ({ attack: 100 })
    }
    const enemy1 = createMockEnemy(1000, 'wood')
    enemyManager.getEnemiesInRange.mockReturnValue([enemy1])

    executor.executeSkill('skill_active_guanyu', { x: 100, y: 100 }, hero1)
    // 关羽青龙斩 attackMultiplier = 2.6, 基础攻击力 100 -> 造成 260 伤害
    expect(enemy1.takeDamage).toHaveBeenCalledWith(260)

    // 2. 英雄升星/神兵强化后攻击力 250
    skillManager.reduceCooldown('skill_active_guanyu', 10000)
    const hero2: any = {
      getHeroData: () => ({ id: 'hero_guanyu', wuXing: 'wood', name: '关羽' }),
      getEffectiveStats: () => ({ attack: 250 })
    }
    const enemy2 = createMockEnemy(1000, 'wood')
    enemyManager.getEnemiesInRange.mockReturnValue([enemy2])

    executor.executeSkill('skill_active_guanyu', { x: 100, y: 100 }, hero2)
    // 250 * 2.6 = 650 伤害
    expect(enemy2.takeDamage).toHaveBeenCalledWith(650)
  })

  it('五行相生相克联动：关羽大招命中敌人会触发五行附着与相生相克结算', () => {
    const scene: any = {
      time: { delayedCall: vi.fn() },
      add: {
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        }),
        graphics: vi.fn().mockReturnValue({
          setDepth: vi.fn().mockReturnThis(),
          lineStyle: vi.fn().mockReturnThis(),
          fillStyle: vi.fn().mockReturnThis(),
          fillCircle: vi.fn().mockReturnThis(),
          strokeCircle: vi.fn().mockReturnThis(),
          beginPath: vi.fn().mockReturnThis(),
          arc: vi.fn().mockReturnThis(),
          lineTo: vi.fn().mockReturnThis(),
          closePath: vi.fn().mockReturnThis(),
          fillPath: vi.fn().mockReturnThis(),
          strokePath: vi.fn().mockReturnThis(),
          destroy: vi.fn()
        })
      },
      tweens: { add: vi.fn() },
      textures: { exists: vi.fn().mockReturnValue(false) }
    }

    const elementalMgr = ElementalReactionManager.getInstance(scene, {})
    elementalMgr.reset()

    const mockEnemy: any = {
      active: true,
      x: 50,
      y: 50,
      getEnemyData: () => ({
        id: 'target_test_1',
        currentHealth: 500,
        maxHealth: 500,
        wuXing: 'earth',
        isActive: true,
        type: 'normal'
      }),
      takeDamage: vi.fn(),
      applyPoison: vi.fn(),
      applySlow: vi.fn(),
      applyStun: vi.fn(),
      hitShake: vi.fn(),
      die: vi.fn()
    }

    const enemyManager: any = {
      getEnemiesInRange: vi.fn().mockReturnValue([mockEnemy])
    }

    const skillManager = new SkillManager()
    skillManager.initHeroSkills('skill_passive_guanyu', 'skill_active_guanyu')

    const executor = new SkillExecutor(scene, skillManager, enemyManager)
    const hero: any = {
      getHeroData: () => ({ id: 'hero_guanyu', wuXing: 'wood', name: '关羽' }),
      getEffectiveStats: () => ({ attack: 100 })
    }

    executor.executeSkill('skill_active_guanyu', { x: 50, y: 50 }, hero)
    // 关羽（木）克制 目标（土），相克倍率 1.5x -> 100 * 2.6 * 1.5 = 390 伤害
    expect(mockEnemy.takeDamage).toHaveBeenCalledWith(390)
    // 敌人被挂载木系寄生毒
    expect(elementalMgr.hasStatus('target_test_1', 'parasite')).toBe(true)
  })
})
