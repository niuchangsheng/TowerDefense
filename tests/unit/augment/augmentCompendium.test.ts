import { describe, it, expect, vi } from 'vitest'

vi.mock('phaser', () => {
  class MockScene {}
  class MockContainer {}
  return {
    default: {
      Scene: MockScene,
      GameObjects: {
        Container: MockContainer
      }
    }
  }
})

vi.mock('@/effects/CharacterAttackFX', () => ({
  CharacterAttackFX: class {}
}))

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

  it('五大典故策系 + 无尽精进策完美覆盖全部 30 卷且互不重叠（§7.1~§7.6）', () => {
    const scene = new AugmentCompendiumScene()
    scene.init({ volume: 'stratagems' })

    const c1 = scene.getTabCount('五行异变策')
    const c2 = scene.getTabCount('相生连环策')
    const c3 = scene.getTabCount('攻防逆转策')
    const c4 = scene.getTabCount('奇谋战法策')
    const c5 = scene.getTabCount('观星借天策')
    const rep = scene.getTabCount('repeatable')

    expect(c1).toBe(5) // 潼关割袍 / 刮骨疗毒 / 铁索横江 / 博望屯火 / 霸桥挑袍
    expect(c2).toBe(6) // 水淹七军 / 赤壁东风 / 盘蛇焚藤 / 暗渡陈仓 / 渭水筑城 / 五气朝元
    expect(c3).toBe(5) // 七擒孟获 / 定军斩渊 / 长坂单骑 / 八门金锁 / 万剑归宗
    expect(c4).toBe(6) // 隆中三分 / 草船借箭 / 空城抚琴 / 木牛流马 / 墨染山河 / 百战玄甲
    expect(c5).toBe(3) // 五丈原祈星 / 奇门遁甲 / 望梅止渴
    expect(rep).toBe(5)

    expect(c1 + c2 + c3 + c4 + c5 + rep).toBe(30)
  })

  it('每一卷锦囊均具备三国历史典故出处、改写前后底层规则对照与天时/统帅破局指南', () => {
    for (const aug of allAugments) {
      expect(aug.stratagemCategory).toBeTruthy()
      expect(aug.targetDimension).toBeTruthy()
      expect(aug.historicalLore).toBeTruthy()
      expect(aug.mechanismTitle).toBeTruthy()
      expect(aug.ruleBefore).toBeTruthy()
      expect(aug.ruleAfter).toBeTruthy()
      expect(aug.synergyWeather).toBeTruthy()
      expect(aug.counterBoss).toBeTruthy()
    }
  })
})

