import { Weapon, Artifact, Rarity, Gem } from '@/types'

// 导出宝石数据
export * from './gems'

/**
 * 武器配置
 */
export const weapons: Weapon[] = [
  // 普通武器
  {
    id: 'weapon_common_1',
    name: '铁剑',
    type: 'weapon',
    rarity: 'common',
    bonuses: { attack: 5 }
  },
  {
    id: 'weapon_common_2',
    name: '木弓',
    type: 'weapon',
    rarity: 'common',
    bonuses: { attackRange: 20 }
  },

  // 稀有武器
  {
    id: 'weapon_rare_1',
    name: '青铜剑',
    type: 'weapon',
    rarity: 'rare',
    bonuses: { attack: 15, attackSpeed: 0.1 }
  },
  {
    id: 'weapon_rare_2',
    name: '精钢刀',
    type: 'weapon',
    rarity: 'rare',
    bonuses: { attack: 20 }
  },

  // 史诗武器
  {
    id: 'weapon_epic_1',
    name: '青龙偃月刀',
    type: 'weapon',
    rarity: 'epic',
    bonuses: { attack: 40, attackRange: 30 }
  },
  {
    id: 'weapon_epic_2',
    name: '丈八蛇矛',
    type: 'weapon',
    rarity: 'epic',
    bonuses: { attack: 35, attackSpeed: 0.2 }
  },

  // 传说武器
  {
    id: 'weapon_legendary_1',
    name: '方天画戟',
    type: 'weapon',
    rarity: 'legendary',
    bonuses: { attack: 60, attackSpeed: 0.3, attackRange: 40 }
  }
]

/**
 * 神器配置
 */
export const artifacts: Artifact[] = [
  // 普通神器
  {
    id: 'artifact_common_1',
    name: '铜镜',
    type: 'artifact',
    rarity: 'common',
    bonuses: { attack: 3 },
    gemSocket: {
      requiredWuXing: 'metal',
      currentGem: null
    },
    activatedEffect: null
  },

  // 稀有神器
  {
    id: 'artifact_rare_1',
    name: '玉璧',
    type: 'artifact',
    rarity: 'rare',
    bonuses: { attack: 10 },
    gemSocket: {
      requiredWuXing: 'earth',
      currentGem: null
    },
    activatedEffect: null
  },

  // 史诗神器
  {
    id: 'artifact_epic_1',
    name: '赤兔马鞍',
    type: 'artifact',
    rarity: 'epic',
    bonuses: { attackSpeed: 0.25 },
    gemSocket: {
      requiredWuXing: 'fire',
      currentGem: null
    },
    activatedEffect: null
  },

  // 传说神器
  {
    id: 'artifact_legendary_1',
    name: '八卦阵图',
    type: 'artifact',
    rarity: 'legendary',
    bonuses: { attack: 25, attackSpeed: 0.15 },
    gemSocket: {
      requiredWuXing: 'water',
      currentGem: null
    },
    activatedEffect: null
  }
]

/**
 * 获取武器配置
 */
export function getWeapon(id: string): Weapon | undefined {
  return weapons.find(w => w.id === id)
}

/**
 * 获取神器配置
 */
export function getArtifact(id: string): Artifact | undefined {
  return artifacts.find(a => a.id === id)
}

/**
 * 按稀有度筛选武器
 */
export function getWeaponsByRarity(rarity: Rarity): Weapon[] {
  return weapons.filter(w => w.rarity === rarity)
}

/**
 * 按稀有度筛选神器
 */
export function getArtifactsByRarity(rarity: Rarity): Artifact[] {
  return artifacts.filter(a => a.rarity === rarity)
}