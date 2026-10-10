import { describe, it, expect } from 'vitest'
import {
  MECHANICS_TABS,
  ELEMENT_STATUS_LIST,
  REACTION_LIST,
  ATTRIBUTE_PAIRS,
  DAMAGE_FORMULA_GUIDE,
  ELEMENT_GENERAL_MAP,
  getElementMechanicsDetail
} from '@/data/mechanics'

describe('【乾坤经纬】底层机制知识库与设计铁律单元测试', () => {
  it('1. 机制分类标签必须包含【五行相生】、【五维对位】与【乘区算法】三位一体且具备中式印章题眉', () => {
    expect(MECHANICS_TABS).toHaveLength(3)
    const keys = MECHANICS_TABS.map((t) => t.key)
    expect(keys).toEqual(['wuxing', 'attributes', 'damage'])

    const seals = MECHANICS_TABS.map((t) => t.seal)
    expect(seals).toEqual(['生', '位', '算'])
  })

  it('2. 五大五行基础状态必须严格对应五大五行且附着时长为 2.5s', () => {
    expect(ELEMENT_STATUS_LIST).toHaveLength(5)
    const elements = ELEMENT_STATUS_LIST.map((e) => e.element)
    expect(elements).toContain('wood')
    expect(elements).toContain('metal')
    expect(elements).toContain('water')
    expect(elements).toContain('earth')
    expect(elements).toContain('fire')

    ELEMENT_STATUS_LIST.forEach((item) => {
      expect(item.duration).toBe('2.5 秒')
      expect(item.summary.length).toBeGreaterThan(10)
      expect(item.details.length).toBeGreaterThanOrEqual(2)
    })

    // 职能边界铁律校验
    const metal = ELEMENT_STATUS_LIST.find((e) => e.element === 'metal')!
    expect(metal.targetStat).toContain('防御')
    expect(metal.summary).toContain('唯一具备破甲')

    const wood = ELEMENT_STATUS_LIST.find((e) => e.element === 'wood')!
    expect(wood.targetStat).toContain('生命')
    expect(wood.summary).toContain('禁疗')

    const water = ELEMENT_STATUS_LIST.find((e) => e.element === 'water')!
    expect(water.targetStat).toContain('移动速度')
    expect(water.summary).toContain('唯一具备移速削减')

    const earth = ELEMENT_STATUS_LIST.find((e) => e.element === 'earth')!
    expect(earth.targetStat).toContain('韧性')
    expect(earth.details.join('')).toContain('反暴')
  })

  it('3. 五大相生化学反应必须覆盖全部五行相生链且遵循 1.5s ICD', () => {
    expect(REACTION_LIST).toHaveLength(5)
    const reactionIds = REACTION_LIST.map((r) => r.id)
    expect(reactionIds).toEqual(['nourish', 'wildfire', 'magma', 'spikes', 'shatter'])

    REACTION_LIST.forEach((r) => {
      expect(r.icd).toContain('1.5 秒')
      expect(r.elements).toHaveLength(2)
      expect(r.details.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('4. 敌我五维基础属性池必须严格一对一精准对位', () => {
    expect(ATTRIBUTE_PAIRS).toHaveLength(5)
    const alliedStats = ATTRIBUTE_PAIRS.map((p) => p.alliedStat)
    const enemyStats = ATTRIBUTE_PAIRS.map((p) => p.enemyStat)

    expect(alliedStats.some((s) => s.includes('Attack'))).toBe(true)
    expect(alliedStats.some((s) => s.includes('Range'))).toBe(true)
    expect(alliedStats.some((s) => s.includes('AttackSpeed'))).toBe(true)
    expect(alliedStats.some((s) => s.includes('CritRate'))).toBe(true)
    expect(alliedStats.some((s) => s.includes('CritDamage'))).toBe(true)

    expect(enemyStats.some((s) => s.includes('Defense'))).toBe(true)
    expect(enemyStats.some((s) => s.includes('MoveSpeed'))).toBe(true)
    expect(enemyStats.some((s) => s.includes('HP'))).toBe(true)
    expect(enemyStats.some((s) => s.includes('Tenacity'))).toBe(true)
    expect(enemyStats.some((s) => s.includes('Fortitude'))).toBe(true)
  })

  it('5. 严格四独立伤害乘区计算公式与两大第一性原理数值铁律校验', () => {
    // 包含具体攻击力与防御力减免的端到端四乘区公式
    expect(DAMAGE_FORMULA_GUIDE.formula).toContain('最终伤害')
    expect(DAMAGE_FORMULA_GUIDE.formula).toContain('基础基数')
    expect(DAMAGE_FORMULA_GUIDE.formula).toContain('防御减免')
    expect(DAMAGE_FORMULA_GUIDE.formula).toContain('攻击加成')
    expect(DAMAGE_FORMULA_GUIDE.formula).toContain('增伤')
    expect(DAMAGE_FORMULA_GUIDE.formula).toContain('易伤')
    expect(DAMAGE_FORMULA_GUIDE.formula).toContain('实际暴伤')

    // 攻击力/防御力/真伤/暴击四大支柱
    expect(DAMAGE_FORMULA_GUIDE.coreComponents).toHaveLength(4)
    const compTitles = DAMAGE_FORMULA_GUIDE.coreComponents.map((c) => c.title)
    expect(compTitles.some((t) => t.includes('基础基数'))).toBe(true)
    expect(compTitles.some((t) => t.includes('防御'))).toBe(true)
    expect(compTitles.some((t) => t.includes('真实伤害'))).toBe(true)
    expect(compTitles.some((t) => t.includes('暴击对抗'))).toBe(true)

    // 六大部分解构（含防御抵扣）
    expect(DAMAGE_FORMULA_GUIDE.buckets).toHaveLength(6)

    // 实战案例包含完整 4 步推导演算
    expect(DAMAGE_FORMULA_GUIDE.example.conditions).toContain('关羽基础攻击力')
    expect(DAMAGE_FORMULA_GUIDE.example.step3).toContain('防御减免率')
    expect(DAMAGE_FORMULA_GUIDE.example.step4).toContain('最终落地伤害')

    // 第一性原理：局外上限 <= +50% 与 抗性保底 >= 40%
    const rule1 = DAMAGE_FORMULA_GUIDE.rules.find((r) => r.title.includes('局外保下限'))!
    expect(rule1.content).toContain('+50%')

    const rule2 = DAMAGE_FORMULA_GUIDE.rules.find((r) => r.title.includes('抗性下限保底'))!
    expect(rule2.content).toContain('40%')
  })

  it('6. 五虎将与五行专属对位及五行联动相生闭环链正确性', () => {
    // 专属武将对应（关木/黄火/张土/马金/赵水）
    expect(ELEMENT_GENERAL_MAP.metal.name).toBe('马超')
    expect(ELEMENT_GENERAL_MAP.water.name).toBe('赵云')
    expect(ELEMENT_GENERAL_MAP.wood.name).toBe('关羽')
    expect(ELEMENT_GENERAL_MAP.fire.name).toBe('黄忠')
    expect(ELEMENT_GENERAL_MAP.earth.name).toBe('张飞')

    // 五行双向闭环相生链验证 (金 -> 水 -> 木 -> 火 -> 土 -> 金)
    const metalDetail = getElementMechanicsDetail('metal')
    expect(metalDetail.generatedBy.reaction.id).toBe('spikes') // 土生金
    expect(metalDetail.generates.reaction.id).toBe('shatter') // 金生水

    const waterDetail = getElementMechanicsDetail('water')
    expect(waterDetail.generatedBy.reaction.id).toBe('shatter') // 金生水
    expect(waterDetail.generates.reaction.id).toBe('nourish') // 水生木

    const woodDetail = getElementMechanicsDetail('wood')
    expect(woodDetail.generatedBy.reaction.id).toBe('nourish') // 水生木
    expect(woodDetail.generates.reaction.id).toBe('wildfire') // 木生火

    const fireDetail = getElementMechanicsDetail('fire')
    expect(fireDetail.generatedBy.reaction.id).toBe('wildfire') // 木生火
    expect(fireDetail.generates.reaction.id).toBe('magma') // 火生土

    const earthDetail = getElementMechanicsDetail('earth')
    expect(earthDetail.generatedBy.reaction.id).toBe('magma') // 火生土
    expect(earthDetail.generates.reaction.id).toBe('spikes') // 土生金
  })
})
