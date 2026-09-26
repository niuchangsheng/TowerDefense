import { WaveConfig, DropItem } from './enemy.types'
import { TerrainType, TerrainArea } from './terrain.types'

// 坐标点
export interface Point {
  x: number
  y: number
}

// 区域（可部署区域）
export interface Area {
  x: number
  y: number
  width: number
  height: number
}

// 关卡类型
export type LevelType = 'main' | 'side'

// 关卡地图配置
export interface LevelMapConfig {
  path: Point[]              // 敌人移动路径
  spawnPoint: Point          // 敌人生成点
  exitPoint: Point           // 敌人离开点（到达此处扣玩家生命）
  deployableAreas: Area[]    // 可部署英雄的区域
  terrainAreas?: TerrainArea[] // 地形区域配置
  defaultTerrain?: TerrainType // 默认地形类型
}

// 关卡奖励配置
export interface LevelRewardConfig {
  soulStones?: { heroId: string; amount: number }[]
  equipment?: string[]       // 装备ID列表
  gems?: { wuXing: string; level: number; amount: number }[]
  gold?: number
  experience?: number        // 英雄经验奖励
}

// 关卡配置（数据层）
export interface LevelConfig {
  id: string
  chapterId: string
  name: string
  type: LevelType
  map: LevelMapConfig
  waves: WaveConfig[]
  bossWave?: WaveConfig      // Boss波次（可选）
  rewards: LevelRewardConfig
  playerStartHealth: number  // 玩家初始生命
  playerStartCost: number    // 玩家初始部署费用
  playerMaxCost?: number     // 玩家最大军费上限（可选，默认采用 COST_CONFIG.maxCost）
}

// 章节配置
export interface ChapterConfig {
  id: string
  name: string
  historicalEvent: string    // 历史事件名称
  levels: string[]           // 关卡ID列表
  sideLevels?: string[]      // 番外关卡ID列表
}

// 关卡进度
export interface LevelProgress {
  levelId: string
  isCompleted: boolean
  bestTime?: number          // 最佳完成时间
  starsAchieved: number      // 获得的星星数（0-3）
}

// 章节进度
export interface ChapterProgress {
  chapterId: string
  levelsProgress: LevelProgress[]
  isCompleted: boolean       // 所有主线关卡是否完成
}