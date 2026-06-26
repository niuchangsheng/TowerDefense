import { TerrainType, TerrainConfig } from '@/types'

/**
 * 地形配置数据
 * 定义每种地形类型的属性
 */
export const TERRAIN_CONFIGS: Record<TerrainType, TerrainConfig> = {
  grass: {
    type: 'grass',
    name: '平原',
    color: 0x4a7c4e,        // 深绿色（三国志11草地色调）
    borderColor: 0x2a5a2e,
    moveSpeedMultiplier: 1.0,  // 正常速度
    canDeploy: true,
    description: '基础地形，适合部署英雄'
  },

  mountain: {
    type: 'mountain',
    name: '山地',
    color: 0x8b7355,        // 棕色（山地岩石色调）
    borderColor: 0x6b5335,
    moveSpeedMultiplier: 0.7,  // 减速30%
    canDeploy: true,
    description: '崎岖山地，敌人移动减速'
  },

  river: {
    type: 'river',
    name: '河流',
    color: 0x4a90d9,        // 蓝色（河流水色调）
    borderColor: 0x2a70b9,
    moveSpeedMultiplier: 0.5,  // 大幅减速（需要桥梁）
    canDeploy: false,          // 不可部署
    description: '河流区域，不可部署英雄'
  },

  snow: {
    type: 'snow',
    name: '雪地',
    color: 0xf0f8ff,        // 白色（雪地色调）
    borderColor: 0xd0d8df,
    moveSpeedMultiplier: 0.8,  // 减速20%
    canDeploy: true,
    description: '寒冷雪地，敌人移动减速'
  },

  desert: {
    type: 'desert',
    name: '沙漠',
    color: 0xdaa520,        // 黄色（沙漠色调）
    borderColor: 0xba8520,
    moveSpeedMultiplier: 0.9,  // 减速10%
    canDeploy: true,
    description: '干旱沙漠，移动略慢'
  },

  poison: {
    type: 'poison',
    name: '毒泉',
    color: 0x2e8b57,        // 深绿色（毒泉色调）
    borderColor: 0x1e6b47,
    moveSpeedMultiplier: 1.0,
    canDeploy: false,
    effect: {
      type: 'damage',
      value: 5,      // 每秒伤害5点
      duration: 0    // 持续伤害
    },
    description: '毒泉区域，敌人持续受到伤害'
  },

  forest: {
    type: 'forest',
    name: '森林',
    color: 0x228b22,        // 深绿色（森林色调）
    borderColor: 0x126b12,
    moveSpeedMultiplier: 0.85,  // 减速15%
    canDeploy: true,
    description: '茂密森林，提供隐蔽效果'
  },

  bridge: {
    type: 'bridge',
    name: '桥梁',
    color: 0x696969,        // 灰色（桥梁色调）
    borderColor: 0x494949,
    moveSpeedMultiplier: 1.0,
    canDeploy: false,          // 桥梁上不可部署
    description: '跨越河流的桥梁'
  }
}

/**
 * 获取地形配置
 */
export function getTerrainConfig(type: TerrainType): TerrainConfig {
  return TERRAIN_CONFIGS[type]
}

/**
 * 获取地形颜色
 */
export function getTerrainColor(type: TerrainType): number {
  return TERRAIN_CONFIGS[type].color
}

/**
 * 获取地形移动速度倍率
 */
export function getTerrainSpeedMultiplier(type: TerrainType): number {
  return TERRAIN_CONFIGS[type].moveSpeedMultiplier
}

/**
 * 判断地形是否可部署
 */
export function canDeployOnTerrain(type: TerrainType): boolean {
  return TERRAIN_CONFIGS[type].canDeploy
}