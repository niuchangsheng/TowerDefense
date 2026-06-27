import { Area } from './level.types'

/**
 * 地形类型
 * 参考三国志11的地形系统
 */
export type TerrainType =
  | 'grass'     // 平原/草地 - 移动消耗低，适合骑兵
  | 'road'      // 道路 - 移动消耗最低
  | 'forest'    // 森林 - 步兵有利，可伏兵
  | 'mountain'  // 山地 - 防守加成，骑兵受限
  | 'swamp'     // 湿地/沼泽 - 移动困难
  | 'river'     // 河流/水域 - 需船只
  | 'bridge'    // 桥梁
  | 'snow'      // 雪地
  | 'desert'    // 沙漠
  | 'fortress'  // 城塞/关隘 - 高防御加成

/**
 * 地形效果类型
 */
export type TerrainEffectType = 'damage' | 'slow' | 'heal' | 'hide'

/**
 * 兵种类型
 */
export type UnitType = 'infantry' | 'cavalry' | 'archer' | 'navy'

/**
 * 地形效果
 */
export interface TerrainEffect {
  type: TerrainEffectType
  value: number      // 效果数值（伤害值、减速百分比等）
  duration?: number  // 持续时间（毫秒）
}

/**
 * 兵种适性
 * 表示不同兵种在该地形的表现
 */
export interface UnitSuitability {
  infantry: number   // 步兵适性 (0-100)
  cavalry: number    // 骑兵适性 (0-100)
  archer: number     // 弓兵适性 (0-100)
  navy: number       // 水军适性 (0-100)
}

/**
 * 地形配置
 * 参考三国志11的地形属性系统
 */
export interface TerrainConfig {
  type: TerrainType
  name: string                    // 中文名
  color: number                   // 背景颜色（简化图形用）
  borderColor?: number            // 边框颜色
  movementCost: number            // 移动消耗值 (参考三国志11)
  moveSpeedMultiplier: number     // 移动速度倍率（影响敌人）
  defenseBonus: number            // 防御加成百分比
  attackBonus: number             // 攻击加成百分比
  canDeploy: boolean              // 是否可部署英雄
  canPassCavalry: boolean         // 骑兵是否可通行
  unitSuitability: UnitSuitability // 兵种适性
  effect?: TerrainEffect          // 特殊效果
  description: string             // 地形描述
  tileImages?: string[]           // 可用的tile贴图路径数组（可选）
}

/**
 * 地形区域
 * 定义地图上的某个区域的地形类型
 */
export interface TerrainArea {
  type: TerrainType
  area: Area  // 使用现有的Area类型（x, y, width, height）
}

/**
 * 地形中文名称映射
 */
export const TerrainNames: Record<TerrainType, string> = {
  grass: '平原',
  road: '道路',
  forest: '森林',
  mountain: '山地',
  swamp: '湿地',
  river: '河流',
  bridge: '桥梁',
  snow: '雪地',
  desert: '沙漠',
  fortress: '城塞'
}