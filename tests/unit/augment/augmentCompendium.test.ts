import { describe, it, expect, vi } from 'vitest'

vi.mock('phaser', () => {
  class MockScene {}
  return {
    default: {
      Scene: MockScene
    }
  }
})

import { AUGMENT_POOL, REPEATABLE_AUGMENTS } from '@/data/augments'
import { getHeroConfig } from '@/data/heroes'
import { Augment } from '@/types/augment'
import AugmentCompendiumScene from '@/scenes/AugmentCompendiumScene'

describe('AugmentCompendium 军事锦囊图鉴数据与分类测试', () => {
  const allAugments: Augment[] = [...AUGMENT_POOL, ...REPEATABLE_AUGMENTS]

  it('图鉴总卷数应为 30 卷，且所有 ID 唯一无重复', () => {
    expect(allAugments.length).toBe(30)
    const idSet = new Set(allAugments.map(a => a.id))
    expect(idSet.size).toBe(30)
  })

  it('每一卷锦囊均具备完整名称、水墨描述、品质与效果定义', () => {
    for (const aug of allAugments) {
      expect(aug.id).toBeTruthy()
      expect(aug.name).toBeTruthy()
      expect(aug.description).toBeTruthy()
      expect(['common', 'rare', 'epic', 'legendary']).toContain(aug.rarity)
      expect(aug.effects).toBeDefined()
    }
  })

  it('分类标签过滤逻辑完整无遗漏且互不重叠（全覆盖 30 卷）', () => {
    const scene = new AugmentCompendiumScene()
    scene.init()

    const allCount = scene.getTabCount('all')
    const elementalCount = scene.getTabCount('elemental')
    const heroCount = scene.getTabCount('hero')
    const generalCount = scene.getTabCount('general')
    const endlessCount = scene.getTabCount('endless')
    const repeatableCount = scene.getTabCount('repeatable')

    expect(allCount).toBe(30)
    expect(elementalCount).toBe(9)
    expect(heroCount).toBe(5)
    expect(generalCount).toBe(7)
    expect(endlessCount).toBe(4)
    expect(repeatableCount).toBe(5)

    // 五大类别之和必须精确等于全部 30 卷
    expect(elementalCount + heroCount + generalCount + endlessCount + repeatableCount).toBe(30)
  })

  it('五行共鸣锦囊所需元素均为正统五行', () => {
    const validElements = new Set(['metal', 'wood', 'water', 'fire', 'earth'])
    const elementalAugs = allAugments.filter(a => a.category === 'elemental')
    for (const aug of elementalAugs) {
      if (aug.wuXingRequirement) {
        for (const el of aug.wuXingRequirement) {
          expect(validElements.has(el)).toBe(true)
        }
      }
    }
  })

  it('名将本命锦囊均能正确匹配对应三国名将', () => {
    const expectedHeroMap: Record<string, string> = {
      aug_guanyu_yanyu: 'hero_guanyu',
      aug_zhangfei_roar: 'hero_zhangfei',
      aug_zhaoyun_dragon: 'hero_zhaoyun',
      aug_huangzhong_bow: 'hero_huangzhong',
      aug_machao_cavalry: 'hero_machao'
    }

    for (const [augId, heroId] of Object.entries(expectedHeroMap)) {
      const aug = allAugments.find(a => a.id === augId)
      expect(aug).toBeDefined()
      expect(aug?.heroRequirement).toBe(heroId)
      const heroConfig = getHeroConfig(heroId)
      expect(heroConfig).toBeDefined()
      expect(heroConfig?.name).toBeTruthy()
    }
  })
})
