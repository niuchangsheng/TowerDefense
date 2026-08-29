import { TroopConfig, TroopType } from '@/types'

/**
 * 兵种配置
 * 文字水墨风：枪兵 / 骑兵 / 刀兵 / 弓兵
 * 分别用单字"枪 / 骑 / 刀 / 弓"展示，所持武器：枪 / 枪 / 刀 / 弓
 */
export const troops: TroopConfig[] = [
  {
    id: 'troop_spearman',
    type: 'spearman',
    name: '枪兵',
    displayChar: '枪',
    weapon: 'spear',
    weaponChar: '枪',
    attackStyle: 'thrust',
    range: 'melee',
    terrainUnit: 'infantry',
    baseHealth: 100,
    baseAttack: 12,
    baseSpeed: 50,
    color: '#1a3a5a',
    description: '持枪近战，攻守均衡的基础步兵'
  },
  {
    id: 'troop_cavalry',
    type: 'cavalry',
    name: '骑兵',
    displayChar: '骑',
    weapon: 'spear',
    weaponChar: '枪',
    attackStyle: 'thrust',
    range: 'melee',
    terrainUnit: 'cavalry',
    baseHealth: 120,
    baseAttack: 15,
    baseSpeed: 90,
    color: '#5a1a1a',
    description: '策马持枪冲锋，机动迅捷，平原战力最佳'
  },
  {
    id: 'troop_swordsman',
    type: 'swordsman',
    name: '刀兵',
    displayChar: '刀',
    weapon: 'blade',
    weaponChar: '刀',
    attackStyle: 'slash',
    range: 'melee',
    terrainUnit: 'infantry',
    baseHealth: 110,
    baseAttack: 14,
    baseSpeed: 55,
    color: '#5a4a1a',
    description: '持刀劈砍，近身搏杀，林地作战有利'
  },
  {
    id: 'troop_archer',
    type: 'archer',
    name: '弓兵',
    displayChar: '弓',
    weapon: 'bow',
    weaponChar: '弓',
    attackStyle: 'bow',
    range: 'ranged',
    terrainUnit: 'archer',
    baseHealth: 80,
    baseAttack: 13,
    baseSpeed: 45,
    color: '#2a4a2a',
    description: '远程放箭，先发制人，近战较弱'
  }
]

/**
 * 兵种索引（按 id 查找）
 */
export const troopConfigs: Map<string, TroopConfig> = new Map(
  troops.map((t) => [t.id, t] as [string, TroopConfig])
)

/**
 * 根据 id 获取兵种配置
 */
export function getTroopConfig(id: string): TroopConfig | undefined {
  return troopConfigs.get(id)
}

/**
 * 根据兵种类型获取兵种配置
 */
export function getTroopByType(type: TroopType): TroopConfig | undefined {
  return troops.find((t) => t.type === type)
}
