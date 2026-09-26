import { describe, it, expect } from 'vitest'
import {
  heroSkillEvolutions,
  getHeroSkillEvolution,
  getCurrentEvolutionNode,
  statusDetailsDict,
  getHeroStatusDetails
} from '@/data/skills'

describe('武将技能演武路线与状态解析机制测试', () => {
  describe('1. 技能演进路线五阶境界配置', () => {
    const tigerHeroes = [
      'hero_guanyu',
      'hero_zhangfei',
      'hero_zhaoyun',
      'hero_huangzhong',
      'hero_machao'
    ]

    it('五虎上将均已完整配置 5 阶境界演进路线', () => {
      for (const heroId of tigerHeroes) {
        const evo = getHeroSkillEvolution(heroId)
        expect(evo).toBeDefined()
        expect(evo.nodes).toHaveLength(5)

        // 校验 1~5 阶次序与星级要求匹配
        for (let i = 0; i < 5; i++) {
          const node = evo.nodes[i]
          expect(node.stage).toBe(i + 1)
          expect(node.starRequired).toBe(i + 1)
          expect(node.stageName).toBeDefined()
          expect(node.title).toBeDefined()
          expect(node.activeUpgradeDesc).toBeTruthy()
          expect(node.passiveUpgradeDesc).toBeTruthy()
        }
      }
    })

    it('三阶（机制质变）与五阶（终极觉醒）必须为突破节点', () => {
      for (const heroId of tigerHeroes) {
        const evo = getHeroSkillEvolution(heroId)
        const stage3 = evo.nodes[2]
        const stage5 = evo.nodes[4]

        expect(stage3.isBreakthrough).toBe(true)
        expect(stage5.isBreakthrough).toBe(true)

        // 1阶、2阶、4阶为常规境界积累
        expect(evo.nodes[0].isBreakthrough).toBe(false)
        expect(evo.nodes[1].isBreakthrough).toBe(false)
        expect(evo.nodes[3].isBreakthrough).toBe(false)
      }
    })

    it('getCurrentEvolutionNode 能准确提取武将当前星级所处境界并支持边界约束', () => {
      // 1星关羽处于一阶·入境
      const node1 = getCurrentEvolutionNode('hero_guanyu', 1)
      expect(node1).toBeDefined()
      expect(node1?.stage).toBe(1)
      expect(node1?.stageName).toContain('一阶')

      // 3星关羽处于三阶·化境（质变）
      const node3 = getCurrentEvolutionNode('hero_guanyu', 3)
      expect(node3).toBeDefined()
      expect(node3?.stage).toBe(3)
      expect(node3?.isBreakthrough).toBe(true)

      // 5星关羽处于五阶·大成（极意）
      const node5 = getCurrentEvolutionNode('hero_guanyu', 5)
      expect(node5).toBeDefined()
      expect(node5?.stage).toBe(5)
      expect(node5?.isBreakthrough).toBe(true)

      // 超界星级（如0星或6星）安全夹紧在 1~5 阶
      const nodeClampLow = getCurrentEvolutionNode('hero_guanyu', 0)
      expect(nodeClampLow?.stage).toBe(1)
      const nodeClampHigh = getCurrentEvolutionNode('hero_guanyu', 7)
      expect(nodeClampHigh?.stage).toBe(5)
    })

    it('未单独配置的未知武将具备标准通用五阶演化兜底', () => {
      const fallback = getHeroSkillEvolution('hero_custom_test')
      expect(fallback).toBeDefined()
      expect(fallback.nodes).toHaveLength(5)
      expect(fallback.nodes[2].isBreakthrough).toBe(true)
      expect(fallback.nodes[4].isBreakthrough).toBe(true)
    })
  })

  describe('2. 五行状态奥义与触发机制字典', () => {
    it('全局状态字典包含全部五行核心状态与控制效果', () => {
      const requiredKeys = ['parasite', 'heavy', 'wet', 'burn', 'bleed', 'freeze', 'stun']
      for (const key of requiredKeys) {
        const detail = statusDetailsDict[key]
        expect(detail).toBeDefined()
        expect(detail.statusKey).toBe(key)
        expect(detail.name).toBeTruthy()
        expect(detail.element).toBeTruthy()
        expect(detail.effectDescription).toBeTruthy()
        expect(detail.triggerDirect).toBeTruthy()
        expect(detail.triggerReaction).toBeTruthy()
        expect(detail.subsequentReaction).toBeTruthy()
      }
    })

    it('关羽关联状态包含【木·寄生】与【水·潮湿】联动说明', () => {
      const details = getHeroStatusDetails('hero_guanyu')
      const keys = details.map(d => d.statusKey)
      expect(keys).toContain('parasite')
      expect(keys).toContain('wet')

      const parasite = details.find(d => d.statusKey === 'parasite')!
      expect(parasite.triggerDirect).toContain('青龙偃月斩')
      expect(parasite.triggerReaction).toContain('水生木')
      expect(parasite.subsequentReaction).toContain('木生火')
    })

    it('张飞关联状态包含【土·破衡重压】与【眩晕】控制说明', () => {
      const details = getHeroStatusDetails('hero_zhangfei')
      const keys = details.map(d => d.statusKey)
      expect(keys).toContain('heavy')
      expect(keys).toContain('stun')

      const heavy = details.find(d => d.statusKey === 'heavy')!
      expect(heavy.triggerDirect).toContain('当阳断桥喝')
      expect(heavy.triggerReaction).toContain('熔岩')
    })

    it('赵云关联状态包含【水·潮湿】与【极寒·冰冻】说明', () => {
      const details = getHeroStatusDetails('hero_zhaoyun')
      const keys = details.map(d => d.statusKey)
      expect(keys).toContain('wet')
      expect(keys).toContain('freeze')

      const wet = details.find(d => d.statusKey === 'wet')!
      expect(wet.triggerDirect).toContain('惊鸿穿云')
    })

    it('未特别指定的武将默认返回全五行核心状态', () => {
      const fallbackList = getHeroStatusDetails('hero_unknown')
      expect(fallbackList.length).toBeGreaterThanOrEqual(5)
    })
  })
})
