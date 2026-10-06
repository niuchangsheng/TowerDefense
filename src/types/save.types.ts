// 存档数据结构
export interface SaveData {
  version: string              // 存档版本
  timestamp: number            // 保存时间戳
  slotId: number               // 存档槽位ID（0=自动存档，1-3=手动存档）

  // 英雄数据
  heroes: {
    id: string
    level: number
    star: number
    experience: number
    isUnlocked: boolean
    equipment: {
      weapon: string | null
      artifact: string | null
    }
  }[]

  // 库存数据
  inventory: {
    soulStones: { heroId: string; amount: number }[]
    equipment: string[]        // 装备ID列表
    gems: { id: string; wuXing: string; level: number }[]
    gold: number
  }

  // 关卡进度（合并记录 15 波破关与百战无尽最高波次）
  levelProgress: {
    levelId: string
    isCompleted: boolean
    starsAchieved: number
    highestWave?: number
  }[]

  // 章节进度
  chapterProgress: {
    chapterId: string
    isCompleted: boolean
  }[]

  // 百战无尽烽火最佳战绩（战役即无尽一体化）
  endlessRecord?: {
    highestWave: number
    currentWave?: number   // 当前挑战进度波次（用于无尽断点续战）
    totalKills: number
    bestDate: number
    mapHighestWaves?: Record<string, number> // 各古战场舆图最高波次记录
  }
}

// 存档版本号（用于存档兼容性检查）
export const SAVE_VERSION = '1.0.0'

// 存档槽位数量
export const SAVE_SLOT_COUNT = 4  // 0=自动存档，1-3=手动存档

// 存档键名前缀（localStorage使用）
export const SAVE_KEY_PREFIX = 'tower_defense_save_'

// 默认存档数据
export function createDefaultSaveData(slotId: number = 0): SaveData {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    slotId,
    heroes: [],
    inventory: {
      soulStones: [],
      equipment: [],
      gems: [],
      gold: 0
    },
    levelProgress: [],
    chapterProgress: []
  }
}