import { HeroConfig, Hero } from '@/types'

// 导出等级和经验配置
export * from './levelConfig'

/**
 * 关羽配置
 */
export const guanyuConfig: HeroConfig = {
  id: 'hero_guanyu',
  name: '关羽',
  wuXing: 'wood',
  rarity: 'legendary',
  baseStats: {
    attack: 60,
    attackSpeed: 1.2,
    attackRange: 200
  },
  deploymentCost: 15,
  passiveSkillId: 'skill_passive_guanyu',
  activeSkillId: 'skill_active_guanyu',
  unlockSoulStoneCount: 20,
  starUpgradeRequirements: [30, 50, 80, 120]
}

/**
 * 张飞配置
 */
export const zhangfeiConfig: HeroConfig = {
  id: 'hero_zhangfei',
  name: '张飞',
  wuXing: 'fire',
  rarity: 'legendary',
  baseStats: {
    attack: 80,
    attackSpeed: 0.8,
    attackRange: 150
  },
  deploymentCost: 12,
  passiveSkillId: 'skill_passive_zhangfei',
  activeSkillId: 'skill_active_zhangfei',
  unlockSoulStoneCount: 20,
  starUpgradeRequirements: [30, 50, 80, 120]
}

/**
 * 赵云配置
 */
export const zhaoyunConfig: HeroConfig = {
  id: 'hero_zhaoyun',
  name: '赵云',
  wuXing: 'water',
  rarity: 'epic',
  baseStats: {
    attack: 50,
    attackSpeed: 1.5,
    attackRange: 180
  },
  deploymentCost: 10,
  passiveSkillId: 'skill_passive_zhaoyun',
  activeSkillId: 'skill_active_zhaoyun',
  unlockSoulStoneCount: 15,
  starUpgradeRequirements: [20, 35, 60, 100]
}

/**
 * 创建默认英雄实例（已解锁）
 */
export function createDefaultHeroes(): Map<string, Hero> {
  const heroes = new Map<string, Hero>()

  // 关羽（已解锁，等级5，1星）
  heroes.set('hero_guanyu', {
    ...guanyuConfig,
    level: 5,
    star: 1,
    experience: 0,
    equipment: {
      weapon: null,
      artifact: null
    },
    isUnlocked: true
  })

  // 张飞（已解锁，等级3，1星）
  heroes.set('hero_zhangfei', {
    ...zhangfeiConfig,
    level: 3,
    star: 1,
    experience: 0,
    equipment: {
      weapon: null,
      artifact: null
    },
    isUnlocked: true
  })

  // 赵云（已解锁，等级1，1星）
  heroes.set('hero_zhaoyun', {
    ...zhaoyunConfig,
    level: 1,
    star: 1,
    experience: 0,
    equipment: {
      weapon: null,
      artifact: null
    },
    isUnlocked: true
  })

  return heroes
}

/**
 * 英雄配置索引
 */
export const heroConfigs: Map<string, HeroConfig> = new Map([
  ['hero_guanyu', guanyuConfig],
  ['hero_zhangfei', zhangfeiConfig],
  ['hero_zhaoyun', zhaoyunConfig]
])

/**
 * 根据ID获取英雄配置
 */
export function getHeroConfig(id: string): HeroConfig | undefined {
  return heroConfigs.get(id)
}