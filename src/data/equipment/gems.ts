import { Gem, WuXing } from '@/types'

/**
 * 宝石配置
 * 每种五行属性有5个等级的宝石
 */
export const gems: Gem[] = [
  // 金系宝石（1-5级）
  { id: 'gem_metal_1', wuXing: 'metal', level: 1 },
  { id: 'gem_metal_2', wuXing: 'metal', level: 2 },
  { id: 'gem_metal_3', wuXing: 'metal', level: 3 },
  { id: 'gem_metal_4', wuXing: 'metal', level: 4 },
  { id: 'gem_metal_5', wuXing: 'metal', level: 5 },

  // 木系宝石（1-5级）
  { id: 'gem_wood_1', wuXing: 'wood', level: 1 },
  { id: 'gem_wood_2', wuXing: 'wood', level: 2 },
  { id: 'gem_wood_3', wuXing: 'wood', level: 3 },
  { id: 'gem_wood_4', wuXing: 'wood', level: 4 },
  { id: 'gem_wood_5', wuXing: 'wood', level: 5 },

  // 水系宝石（1-5级）
  { id: 'gem_water_1', wuXing: 'water', level: 1 },
  { id: 'gem_water_2', wuXing: 'water', level: 2 },
  { id: 'gem_water_3', wuXing: 'water', level: 3 },
  { id: 'gem_water_4', wuXing: 'water', level: 4 },
  { id: 'gem_water_5', wuXing: 'water', level: 5 },

  // 火系宝石（1-5级）
  { id: 'gem_fire_1', wuXing: 'fire', level: 1 },
  { id: 'gem_fire_2', wuXing: 'fire', level: 2 },
  { id: 'gem_fire_3', wuXing: 'fire', level: 3 },
  { id: 'gem_fire_4', wuXing: 'fire', level: 4 },
  { id: 'gem_fire_5', wuXing: 'fire', level: 5 },

  // 土系宝石（1-5级）
  { id: 'gem_earth_1', wuXing: 'earth', level: 1 },
  { id: 'gem_earth_2', wuXing: 'earth', level: 2 },
  { id: 'gem_earth_3', wuXing: 'earth', level: 3 },
  { id: 'gem_earth_4', wuXing: 'earth', level: 4 },
  { id: 'gem_earth_5', wuXing: 'earth', level: 5 }
]

/**
 * 宝石名称映射
 */
export const gemNames: Record<string, Record<number, string>> = {
  metal: {
    1: '铁晶石',
    2: '银晶石',
    3: '金晶石',
    4: '铂金晶',
    5: '金刚钻'
  },
  wood: {
    1: '木灵石',
    2: '青木晶',
    3: '翡翠石',
    4: '灵木钻',
    5: '神木珠'
  },
  water: {
    1: '水灵石',
    2: '蓝玉晶',
    3: '水晶钻',
    4: '深海珠',
    5: '玄冰玉'
  },
  fire: {
    1: '火灵石',
    2: '赤玉晶',
    3: '火焰钻',
    4: '烈火珠',
    5: '朱雀玉'
  },
  earth: {
    1: '土灵石',
    2: '黄石晶',
    3: '琥珀钻',
    4: '大地珠',
    5: '麒麟玉'
  }
}

/**
 * 获取宝石名称
 */
export function getGemName(gem: Gem): string {
  return gemNames[gem.wuXing]?.[gem.level] || '未知宝石'
}

/**
 * 获取宝石配置
 */
export function getGem(id: string): Gem | undefined {
  return gems.find(g => g.id === id)
}

/**
 * 按五行筛选宝石
 */
export function getGemsByWuXing(wuXing: WuXing): Gem[] {
  return gems.filter(g => g.wuXing === wuXing)
}

/**
 * 按等级筛选宝石
 */
export function getGemsByLevel(level: number): Gem[] {
  return gems.filter(g => g.level === level)
}