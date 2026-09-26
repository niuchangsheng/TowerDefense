import { HeroConfig, Hero } from '@/types'

// 导出等级和经验配置
export * from './levelConfig'

// 导入经验配置函数
import { getExpRequiredForLevel } from './levelConfig'

/**
 * 关羽配置（五行：木）
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
 * 张飞配置（五行：土）
 */
export const zhangfeiConfig: HeroConfig = {
  id: 'hero_zhangfei',
  name: '张飞',
  wuXing: 'earth',
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
 * 赵云配置（五行：水）
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
 * 黄忠配置（五行：火）
 */
export const huangzhongConfig: HeroConfig = {
  id: 'hero_huangzhong',
  name: '黄忠',
  wuXing: 'fire',
  rarity: 'epic',
  baseStats: {
    attack: 75,
    attackSpeed: 0.9,
    attackRange: 280
  },
  deploymentCost: 14,
  passiveSkillId: 'skill_passive_huangzhong',
  activeSkillId: 'skill_active_huangzhong',
  unlockSoulStoneCount: 15,
  starUpgradeRequirements: [20, 35, 60, 100]
}

/**
 * 马超配置（五行：金）
 */
export const machaoConfig: HeroConfig = {
  id: 'hero_machao',
  name: '马超',
  wuXing: 'metal',
  rarity: 'legendary',
  baseStats: {
    attack: 85,
    attackSpeed: 1.1,
    attackRange: 160
  },
  deploymentCost: 15,
  passiveSkillId: 'skill_passive_machao',
  activeSkillId: 'skill_active_machao',
  unlockSoulStoneCount: 20,
  starUpgradeRequirements: [30, 50, 80, 120]
}

/**
 * 创建默认英雄实例（五虎上将全员就绪）
 */
export function createDefaultHeroes(): Map<string, Hero> {
  const heroes = new Map<string, Hero>()

  // 1. 关羽（木，等级5，1星）
  heroes.set('hero_guanyu', {
    ...guanyuConfig,
    level: 5,
    star: 1,
    experience: getExpRequiredForLevel(5),
    equipment: {
      weapon: null,
      artifact: null
    },
    isUnlocked: true
  })

  // 2. 张飞（土，等级3，1星）
  heroes.set('hero_zhangfei', {
    ...zhangfeiConfig,
    level: 3,
    star: 1,
    experience: getExpRequiredForLevel(3),
    equipment: {
      weapon: null,
      artifact: null
    },
    isUnlocked: true
  })

  // 3. 赵云（水，等级1，1星）
  heroes.set('hero_zhaoyun', {
    ...zhaoyunConfig,
    level: 1,
    star: 1,
    experience: getExpRequiredForLevel(1),
    equipment: {
      weapon: null,
      artifact: null
    },
    isUnlocked: true
  })

  // 4. 黄忠（火，等级1，1星）
  heroes.set('hero_huangzhong', {
    ...huangzhongConfig,
    level: 1,
    star: 1,
    experience: getExpRequiredForLevel(1),
    equipment: {
      weapon: null,
      artifact: null
    },
    isUnlocked: true
  })

  // 5. 马超（金，等级1，1星）
  heroes.set('hero_machao', {
    ...machaoConfig,
    level: 1,
    star: 1,
    experience: getExpRequiredForLevel(1),
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
  ['hero_zhaoyun', zhaoyunConfig],
  ['hero_huangzhong', huangzhongConfig],
  ['hero_machao', machaoConfig]
])

/**
 * 根据ID获取英雄配置
 */
export function getHeroConfig(id: string): HeroConfig | undefined {
  return heroConfigs.get(id)
}