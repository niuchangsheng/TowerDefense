import { Area } from './level.types'

/**
 * 地形类型
 * 参考三国志11的地形系统
 */
export type TerrainType =
  | 'grass'    // 平原/草地
  | 'mountain' // 山地
  | 'river'    // 河流
  | 'snow'     // 雪地
  | 'desert'   // 沙漠
  | 'poison'   // 毒泉
  | 'forest'   // 森林
  | 'bridge'   // 桥梁

/**
 * 地形效果类型
 */
export type TerrainEffectType = 'damage' | 'slow' | 'heal' | 'hide'

/**
 * 地形效果
 */
export interface TerrainEffect {
  type: TerrainEffectType
  value: number      // 效果数值（伤害值、减速百分比等）
  duration?: number  // 持续时间（毫秒）
}

/**
 * 地形配置
 */
export interface TerrainConfig {
  type: TerrainType
  name: string                    // 中文名
  color: number                   // 背景颜色（简化图形用）
  borderColor?: number            // 边框颜色
  moveSpeedMultiplier: number     // 移动速度倍率（影响敌人）
  canDeploy: boolean              // 是否可部署英雄
  effect?: TerrainEffect          // 特殊效果
  description: string             // 地形描述
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
  mountain: '山地',
  river: '河流',
  snow: '雪地',
  desert: '沙漠',
  poison: '毒泉',
  forest: '森林',
  bridge: '桥梁'
}