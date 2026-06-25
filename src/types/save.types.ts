// 存档数据结构
export interface SaveData {
  version: string              // 存档版本
  timestamp: number            // 保存时间戳

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

  // 关卡进度
  levelProgress: {
    levelId: string
    isCompleted: boolean
    starsAchieved: number
  }[]

  // 章节进度
  chapterProgress: {
    chapterId: string
    isCompleted: boolean
  }[]
}

// 存档版本号（用于存档兼容性检查）
export const SAVE_VERSION = '1.0.0'

// 存档键名（localStorage使用）
export const SAVE_KEY = 'tower_defense_save'

// 默认存档数据
export function createDefaultSaveData(): SaveData {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
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