import { TerrainType, TerrainConfig } from '@/types'

/**
 * 地形配置数据
 * 参考三国志11的地形属性系统
 *
 * 核心属性说明：
 * - movementCost: 移动消耗值（数值越高移动越慢）
 * - defenseBonus: 防御加成百分比（防守方优势）
 * - attackBonus: 攻击加成百分比
 * - unitSuitability: 各兵种适性 (0-100，越高越有利)
 * - tileImages: 可用的tile贴图路径数组
 */

// Tile图片路径基础目录
const TILE_BASE_PATH = 'assets/images/terrains_tiles'

// 默认兵种适性（所有地形的基础值）
const DEFAULT_SUITABILITY = {
  infantry: 50,
  cavalry: 50,
  archer: 50,
  navy: 50
}

export const TERRAIN_CONFIGS: Record<TerrainType, TerrainConfig> = {
  // 平原 - 移动消耗低，骑兵最佳
  grass: {
    type: 'grass',
    name: '平原',
    color: 0x8a9a7b,        // 素雅苔绿
    borderColor: 0x6a7a5b,
    movementCost: 4,        // 低消耗
    moveSpeedMultiplier: 1.0,
    defenseBonus: 0,        // 无加成
    attackBonus: 10,        // 攻击方略有利
    canDeploy: true,
    canPassCavalry: true,
    unitSuitability: {
      infantry: 60,
      cavalry: 100,         // 骑兵最佳
      archer: 70,
      navy: 50
    },
    tileImages: [
      `${TILE_BASE_PATH}/平原/平原_00_00.png`,
      `${TILE_BASE_PATH}/平原/平原_01_00.png`,
      `${TILE_BASE_PATH}/平原/平原_02_00.png`,
    ],
    description: '开阔平原，骑兵作战的最佳地形，移动速度较快'
  },

  // 道路 - 移动消耗最低
  road: {
    type: 'road',
    name: '道路',
    color: 0xb8a888,        // 素雅土黄
    borderColor: 0x988868,
    movementCost: 3,        // 最低消耗
    moveSpeedMultiplier: 1.2,
    defenseBonus: 0,
    attackBonus: 0,
    canDeploy: false,       // 道路上不可部署
    canPassCavalry: true,
    unitSuitability: {
      infantry: 70,
      cavalry: 100,
      archer: 60,
      navy: 50
    },
    description: '畅通道路，移动速度最快，适合快速调动',
    tileImages: [
      `${TILE_BASE_PATH}/道路/道路_00_00.png`,
      `${TILE_BASE_PATH}/道路/道路_01_00.png`,
      `${TILE_BASE_PATH}/道路/道路_02_00.png`,
    ]
  },

  // 森林 - 步兵有利，可伏兵
  forest: {
    type: 'forest',
    name: '森林',
    color: 0x6b7f5e,        // 素雅松绿
    borderColor: 0x4f5f46,
    movementCost: 6,        // 中等消耗
    moveSpeedMultiplier: 0.85,
    defenseBonus: 20,       // 防守加成
    attackBonus: -10,       // 攻击方不利
    canDeploy: true,
    canPassCavalry: true,
    unitSuitability: {
      infantry: 100,        // 步兵最佳
      cavalry: 30,          // 骑兵不利
      archer: 80,
      navy: 50
    },
    effect: {
      type: 'hide',         // 可隐蔽
      value: 50,            // 隐蔽效果50%
      duration: 0
    },
    description: '茂密森林，步兵作战有利，骑兵受限，可实施伏兵战术',
    tileImages: [
      `${TILE_BASE_PATH}/森林/森林_00_00.png`,
      `${TILE_BASE_PATH}/森林/森林_01_00.png`,
      `${TILE_BASE_PATH}/森林/森林_02_00.png`,
    ]
  },

  // 山地 - 防守加成高，骑兵受限
  mountain: {
    type: 'mountain',
    name: '山地',
    color: 0x8a7f70,        // 素雅灰褐
    borderColor: 0x6a6055,
    movementCost: 10,       // 高消耗
    moveSpeedMultiplier: 0.7,
    defenseBonus: 30,       // 高防守加成
    attackBonus: -20,       // 攻击方不利
    canDeploy: true,
    canPassCavalry: false,  // 骑兵不可通行
    unitSuitability: {
      infantry: 90,         // 步兵有利
      cavalry: 0,           // 骑兵无法通行
      archer: 100,          // 弓兵最佳（高地优势）
      navy: 50
    },
    description: '崎岖山地，防守方优势明显，弓兵可利用高地优势，骑兵无法通行',
    tileImages: [
      `${TILE_BASE_PATH}/山地/山地_00_00.png`,
      `${TILE_BASE_PATH}/山地/山地_01_00.png`,
      `${TILE_BASE_PATH}/山地/山地_02_00.png`,
    ]
  },

  // 湿地/沼泽 - 移动困难
  swamp: {
    type: 'swamp',
    name: '湿地',
    color: 0x6f7a5f,        // 素雅灰绿
    borderColor: 0x4f5a42,
    movementCost: 12,       // 高消耗
    moveSpeedMultiplier: 0.5,
    defenseBonus: 10,
    attackBonus: -30,
    canDeploy: true,
    canPassCavalry: true,
    unitSuitability: {
      infantry: 40,
      cavalry: 20,          // 骑兵严重受限
      archer: 30,
      navy: 50
    },
    description: '泥泞湿地，移动极为困难，所有兵种行动受限',
    tileImages: [
      `${TILE_BASE_PATH}/湿地/湿地_00_00.png`,
      `${TILE_BASE_PATH}/湿地/湿地_01_00.png`,
      `${TILE_BASE_PATH}/湿地/湿地_02_00.png`,
    ]
  },

  // 河流/水域 - 需船只，水军战场
  river: {
    type: 'river',
    name: '河流',
    color: 0x66839c,        // 素雅水色
    borderColor: 0x4f6a82,
    movementCost: 15,       // 极高消耗
    moveSpeedMultiplier: 0.3,
    defenseBonus: 0,
    attackBonus: 0,
    canDeploy: false,       // 不可直接部署
    canPassCavalry: false,
    unitSuitability: {
      infantry: 20,
      cavalry: 0,
      archer: 10,
      navy: 100             // 水军最佳
    },
    description: '河流水域，需要船只才能通行，水军作战的主战场',
    tileImages: [
      `${TILE_BASE_PATH}/河流/河流_00_00.png`,
      `${TILE_BASE_PATH}/河流/河流_01_00.png`,
      `${TILE_BASE_PATH}/河流/河流_02_00.png`,
    ]
  },

  // 桥梁 - 连接两岸的关键通道
  bridge: {
    type: 'bridge',
    name: '桥梁',
    color: 0x7a7266,        // 素雅灰
    borderColor: 0x5a544a,
    movementCost: 5,
    moveSpeedMultiplier: 1.0,
    defenseBonus: 10,       // 扼守桥梁有优势
    attackBonus: -10,
    canDeploy: false,
    canPassCavalry: true,
    unitSuitability: {
      infantry: 70,
      cavalry: 60,
      archer: 80,           // 弓兵可射杀渡桥敌人
      navy: 50
    },
    description: '跨越河流的桥梁，战略要地，扼守桥梁可获得防御优势',
    tileImages: [
      `${TILE_BASE_PATH}/桥梁/桥梁_00_00.png`,
      `${TILE_BASE_PATH}/桥梁/桥梁_01_00.png`,
      `${TILE_BASE_PATH}/桥梁/桥梁_02_00.png`,
    ]
  },

  // 雪地 - 移动受限
  snow: {
    type: 'snow',
    name: '雪地',
    color: 0xe6e2d6,        // 素雅雪白
    borderColor: 0xc6c2b6,
    movementCost: 8,
    moveSpeedMultiplier: 0.75,
    defenseBonus: 5,
    attackBonus: -5,
    canDeploy: true,
    canPassCavalry: true,
    unitSuitability: {
      infantry: 60,
      cavalry: 40,
      archer: 50,
      navy: 50
    },
    description: '寒冷雪地，移动受阻，视野开阔但行动不便',
    tileImages: [
      `${TILE_BASE_PATH}/雪地/雪地_00_00.png`,
      `${TILE_BASE_PATH}/雪地/雪地_01_00.png`,
      `${TILE_BASE_PATH}/雪地/雪地_02_00.png`,
    ]
  },

  // 沙漠 - 移动略慢
  desert: {
    type: 'desert',
    name: '沙漠',
    color: 0xc2a878,        // 素雅沙黄
    borderColor: 0xa28a5c,
    movementCost: 7,
    moveSpeedMultiplier: 0.85,
    defenseBonus: 0,
    attackBonus: 0,
    canDeploy: true,
    canPassCavalry: true,
    unitSuitability: {
      infantry: 50,
      cavalry: 70,
      archer: 60,
      navy: 50
    },
    description: '干旱沙漠，移动略微受阻，视野开阔',
    tileImages: [
      `${TILE_BASE_PATH}/沙漠/沙漠_00_00.png`,
      `${TILE_BASE_PATH}/沙漠/沙漠_01_00.png`,
      `${TILE_BASE_PATH}/沙漠/沙漠_02_00.png`,
    ]
  },

  // 城塞/关隘 - 极高防御加成
  fortress: {
    type: 'fortress',
    name: '城塞',
    color: 0x8a5a42,        // 素雅赭石
    borderColor: 0x6a4232,
    movementCost: 5,
    moveSpeedMultiplier: 1.0,
    defenseBonus: 50,       // 极高防守加成
    attackBonus: -40,       // 攻击方极不利
    canDeploy: true,
    canPassCavalry: true,
    unitSuitability: {
      infantry: 100,        // 步兵防守最佳
      cavalry: 40,
      archer: 90,           // 弓兵守城优势
      navy: 50
    },
    description: '坚固城塞，防守方获得极大优势，战略要地',
    tileImages: [
      `${TILE_BASE_PATH}/城塞/城塞_00_00.png`,
      `${TILE_BASE_PATH}/城塞/城塞_01_00.png`,
      `${TILE_BASE_PATH}/城塞/城塞_02_00.png`,
    ]
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
 * 获取地形移动消耗值
 */
export function getTerrainMovementCost(type: TerrainType): number {
  return TERRAIN_CONFIGS[type].movementCost
}

/**
 * 获取地形防御加成
 */
export function getTerrainDefenseBonus(type: TerrainType): number {
  return TERRAIN_CONFIGS[type].defenseBonus
}

/**
 * 获取地形攻击加成
 */
export function getTerrainAttackBonus(type: TerrainType): number {
  return TERRAIN_CONFIGS[type].attackBonus
}

/**
 * 判断地形是否可部署
 */
export function canDeployOnTerrain(type: TerrainType): boolean {
  return TERRAIN_CONFIGS[type].canDeploy
}

/**
 * 判断骑兵是否可通过该地形
 */
export function canCavalryPass(type: TerrainType): boolean {
  return TERRAIN_CONFIGS[type].canPassCavalry
}

/**
 * 获取兵种适性
 */
export function getUnitSuitability(type: TerrainType, unitType: 'infantry' | 'cavalry' | 'archer' | 'navy'): number {
  return TERRAIN_CONFIGS[type].unitSuitability[unitType]
}

/**
 * 判断地形是否有特殊效果
 */
export function hasTerrainEffect(type: TerrainType): boolean {
  return TERRAIN_CONFIGS[type].effect !== undefined
}

/**
 * 获取地形效果
 */
export function getTerrainEffect(type: TerrainType): TerrainConfig['effect'] {
  return TERRAIN_CONFIGS[type].effect
}