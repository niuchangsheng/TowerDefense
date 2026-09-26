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
  {
    id: 'artifact_rare_metal',
    name: '白金符印',
    type: 'artifact',
    rarity: 'rare',
    bonuses: { attack: 15, attackRange: 15 },
    gemSocket: {
      requiredWuXing: 'metal',
      currentGem: null
    },
    activatedEffect: null,
    description: '太白庚金所铸符印，肃杀凌厉，可镶嵌金系宝石。'
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
  },

  // ===== 三国专属神兵宝物 =====
  {
    id: 'artifact_chitu',
    name: '赤兔马',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_chitu',
    exclusiveHeroes: ['关羽', '吕布', 'hero_guanyu', 'hero_lvbu'],
    bonuses: { attack: 40, attackSpeed: 0.3 },
    gemSocket: {
      requiredWuXing: 'fire',
      currentGem: null
    },
    activatedEffect: 'chitu_gallop',
    description: '人中吕布，马中赤兔。日行千里，渡水登山如履平地。'
  },
  {
    id: 'artifact_fangtian',
    name: '方天画戟',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_fangtian',
    exclusiveHeroes: ['吕布', 'hero_lvbu'],
    bonuses: { attack: 70, attackSpeed: 0.25, attackRange: 35 },
    gemSocket: {
      requiredWuXing: 'metal',
      currentGem: null
    },
    activatedEffect: 'wushuang_strike',
    description: '顶天立地，唯我无双。温侯吕奉先纵横天下之神兵。'
  },
  {
    id: 'artifact_dilu',
    name: '的卢',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_dilu',
    exclusiveHeroes: ['刘备', 'hero_liubei'],
    bonuses: { attack: 25, attackSpeed: 0.35, attackRange: 20 },
    gemSocket: {
      requiredWuXing: 'water',
      currentGem: null
    },
    activatedEffect: 'tanxi_leap',
    description: '马作的卢飞快，弓如霹雳弦惊。檀溪一跃显神骏。'
  },
  {
    id: 'artifact_qinglong',
    name: '青龙偃月刀',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_qinglong',
    exclusiveHeroes: ['关羽', 'hero_guanyu'],
    bonuses: { attack: 65, attackRange: 35 },
    gemSocket: {
      requiredWuXing: 'wood',
      currentGem: null
    },
    activatedEffect: 'dragon_slash',
    description: '重八十二斤，冷艳锯锋。关圣帝君破千军之至尊神兵。'
  },
  {
    id: 'artifact_shemao',
    name: '丈八蛇矛',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_shemao',
    exclusiveHeroes: ['张飞', 'hero_zhangfei'],
    bonuses: { attack: 60, attackSpeed: 0.2 },
    gemSocket: {
      requiredWuXing: 'fire',
      currentGem: null
    },
    activatedEffect: 'serpent_pierce',
    description: '长一丈八尺，矛头若游蛇电掣。张翼德当阳桥前万夫莫敌。'
  },
  {
    id: 'artifact_sherigong',
    name: '射日弓',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_sherigong',
    exclusiveHeroes: ['黄忠', 'hero_huangzhong'],
    bonuses: { attack: 50, attackRange: 75 },
    gemSocket: {
      requiredWuXing: 'metal',
      currentGem: null
    },
    activatedEffect: 'sheri_shot',
    description: '百步穿杨，力贯长虹。老将黄忠开石裂甲之神弓。'
  },
  {
    id: 'artifact_sunzi',
    name: '孙子兵法',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_sunzi',
    exclusiveHeroes: ['诸葛亮', 'hero_zhugeliang'],
    bonuses: { attack: 35, attackSpeed: 0.2, attackRange: 40 },
    gemSocket: {
      requiredWuXing: 'water',
      currentGem: null
    },
    activatedEffect: 'bingfa_mastery',
    description: '兵者国之大事，死生之地，存亡之道。卧龙运筹帷幄之秘笈。'
  },
  {
    id: 'artifact_tongque',
    name: '铜雀',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_tongque',
    exclusiveHeroes: ['刘备', '曹操', '孙权', 'hero_liubei', 'hero_caocao', 'hero_sunquan'],
    bonuses: { attack: 30, attackSpeed: 0.25, attackRange: 25 },
    gemSocket: {
      requiredWuXing: 'earth',
      currentGem: null
    },
    activatedEffect: 'tongque_power',
    description: '得天授祥瑞，揽二乔于东南。霸者鼎立天下之吉兆宝物。'
  },
  {
    id: 'artifact_yuxi',
    name: '玉玺',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_yuxi',
    exclusiveHeroes: ['刘备', '曹操', '孙权', 'hero_liubei', 'hero_caocao', 'hero_sunquan'],
    bonuses: { attack: 55, attackSpeed: 0.15, attackRange: 30 },
    gemSocket: {
      requiredWuXing: 'earth',
      currentGem: null
    },
    activatedEffect: 'imperial_mandate',
    description: '受命于天，既寿永昌。传国正统，至高王者之威仪凭证。'
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

/**
 * 检查装备是否允许指定武将装备（匹配专属武将限制）
 */
export function isEquipmentExclusiveForHero(equipment: { exclusiveHeroes?: string[] }, heroNameOrId: string): boolean {
  if (!equipment.exclusiveHeroes || equipment.exclusiveHeroes.length === 0) {
    return true
  }
  return equipment.exclusiveHeroes.includes(heroNameOrId)
}