import { UnitType } from './terrain.types'

/**
 * 兵种类型
 * 枪兵 / 骑兵 / 刀兵 / 弓兵
 */
export type TroopType = 'spearman' | 'cavalry' | 'swordsman' | 'archer'

/**
 * 兵种中文名称
 */
export const TroopNames: Record<TroopType, string> = {
  spearman: '枪兵',
  cavalry: '骑兵',
  swordsman: '刀兵',
  archer: '弓兵'
}

/**
 * 兵种所持武器
 * 与 WeaponFX 的 WeaponType 兼容（不含仅投射物用的 'arrow'）
 */
export type TroopWeapon = 'spear' | 'blade' | 'bow'

/**
 * 武器对应的展示单字
 */
export const TroopWeaponChars: Record<TroopWeapon, string> = {
  spear: '枪',
  blade: '刀',
  bow: '弓'
}

/**
 * 攻击动作风格
 *  - thrust: 长枪前刺
 *  - slash:  大刀挥砍
 *  - bow:    拉弓放箭
 */
export type TroopAttackStyle = 'thrust' | 'slash' | 'bow'

/**
 * 兵种配置（数据层）
 * 文字水墨风：每个兵种用单个汉字展示，手持对应武器
 */
export interface TroopConfig {
  id: string
  type: TroopType
  name: string              // 中文名（枪兵/骑兵/刀兵/弓兵）
  displayChar: string       // 战场展示的单字（枪/骑/刀/弓）
  weapon: TroopWeapon       // 所持武器（枪/枪/刀/弓）
  weaponChar: string        // 武器对应的单字
  attackStyle: TroopAttackStyle // 攻击动作
  range: 'melee' | 'ranged' // 近战 / 远程
  terrainUnit: UnitType     // 对应地形系统的兵种适性分类
  baseHealth: number        // 基础生命
  baseAttack: number        // 基础攻击
  baseSpeed: number         // 移动速度（骑兵最快）
  deploymentCost: number    // 部署费用
  attackRange: number       // 攻击范围（像素）
  attackSpeed: number       // 攻击速度（次/秒，与英雄同语义）
  color: string             // 展示用墨色
  description: string       // 兵种描述
}

/**
 * 已部署兵种实例数据（仿 DeployedHero 的最小集）
 */
export interface DeployedTroop {
  troopId: string
  instanceId: string        // 唯一实例ID
  position: { x: number; y: number }
  lastAttackTime: number    // 上次攻击时间
}
