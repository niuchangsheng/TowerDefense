import { describe, it, expect, beforeEach } from 'vitest'
import { MilitarySituationManager } from '@/core/military/MilitarySituationManager'
import { MILITARY_SITUATIONS } from '@/types/militarySituation'

describe('MilitarySituationManager 天时军情与军师机变双策测试', () => {
  let manager: MilitarySituationManager

  beforeEach(() => {
    manager = new MilitarySituationManager()
  })

  it('波次未达到10或非10的倍数时不触发军情', () => {
    expect(manager.checkWave(1)).toBeNull()
    expect(manager.checkWave(9)).toBeNull()
    expect(manager.checkWave(15)).toBeNull()
    expect(manager.isSituationActive()).toBe(false)
  })

  it('第10波准时触发军情，提供上策与下策供军师决断', () => {
    let notifiedSituation: any = null
    manager.setCallbacks({
      onSituationTriggered: (situation) => {
        notifiedSituation = situation
      }
    })

    const situation = manager.checkWave(10)
    expect(situation).not.toBeNull()
    expect(situation?.tactics.upper).toBeDefined()
    expect(situation?.tactics.lower).toBeDefined()
    expect(notifiedSituation).toBe(situation)

    // 重复调用同波次不会重复触发
    expect(manager.checkWave(10)).toBeNull()
  })

  it('采纳上策或下策后正确激活战术，并广播回调', () => {
    manager.checkWave(10)
    let appliedTactic: any = null
    manager.setCallbacks({
      onTacticApplied: (tactic) => {
        appliedTactic = tactic
      }
    })

    expect(manager.isSituationActive()).toBe(false)
    const upperTactic = manager.selectTactic('upper')
    expect(upperTactic).not.toBeNull()
    expect(manager.isSituationActive()).toBe(true)
    expect(manager.getActiveTactic()).toBe(upperTactic)
    expect(appliedTactic).toBe(upperTactic)
  })

  it('江雾篇策论数值正确生效（烽燧照夜 / 借雾设伏）', () => {
    // 强制设置江雾篇测试
    const situation = MILITARY_SITUATIONS['sit_river_fog']
    ;(manager as any).activeSituation = situation

    // 测试上策：烽燧照夜
    manager.selectTactic('upper')
    expect(manager.getRangedRangeMultiplier()).toBe(1.3)
    expect(manager.getRangedDefensePenetration()).toBe(0.25)
    expect(manager.getMeleeAttackSpeedMultiplier()).toBe(1.0)

    // 测试下策：借雾设伏
    manager.selectTactic('lower')
    expect(manager.getMeleeAttackSpeedMultiplier()).toBe(1.4)
    expect(manager.getMeleeCritChanceBonus()).toBe(0.3)
    expect(manager.getMeleeDamageReduction()).toBe(0.3)
    expect(manager.getRangedRangeMultiplier()).toBe(1.0)
  })

  it('烈日篇严阵筑垒击杀敌人修缮帅营生命计数器测试', () => {
    const situation = MILITARY_SITUATIONS['sit_scorching_sun']
    ;(manager as any).activeSituation = situation
    manager.selectTactic('lower') // 严阵筑垒：每10只修复1点

    expect(manager.getGlobalDefenseBonus()).toBe(0.35)

    // 击杀前9只不回血
    for (let i = 0; i < 9; i++) {
      expect(manager.onEnemyKilled()).toBe(0)
    }
    // 第10只修复1点生命
    expect(manager.onEnemyKilled()).toBe(1)
    // 计数器归零重新计算
    expect(manager.onEnemyKilled()).toBe(0)
  })

  it('连贯波次篇章流转与相邻篇章不重复', () => {
    const sit10 = manager.checkWave(10)!
    expect(sit10).toBeDefined()
    manager.selectTactic('upper')

    // 11~19波期间军情依然保持活跃
    for (let w = 11; w <= 19; w++) {
      expect(manager.checkWave(w)).toBeNull()
      expect(manager.isSituationActive()).toBe(true)
    }

    // 第20波更替下一篇章，且不与上一篇章重复
    const sit20 = manager.checkWave(20)!
    expect(sit20).toBeDefined()
    expect(sit20.id).not.toBe(sit10.id)
  })
})
