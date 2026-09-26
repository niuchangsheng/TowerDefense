// 五行类型
export type WuXing = 'metal' | 'wood' | 'water' | 'fire' | 'earth'

// 五行中文名称映射
export const WuXingNames: Record<WuXing, string> = {
  metal: '金',
  wood: '木',
  water: '水',
  fire: '火',
  earth: '土'
}

// 五行相克关系
export const WuXingCounter: Record<WuXing, WuXing> = {
  metal: 'wood',   // 金克木
  wood: 'earth',   // 木克土
  earth: 'water',  // 土克水
  water: 'fire',   // 水克火
  fire: 'metal'    // 火克金
}

// 五行相生关系（我生者）
export const WuXingGenerate: Record<WuXing, WuXing> = {
  metal: 'water',  // 金生水
  water: 'wood',   // 水生木
  wood: 'fire',    // 木生火
  fire: 'earth',   // 火生土
  earth: 'metal'   // 土生金
}

// 五行生我者关系（生我者为母，用于神器相生滋养判定）
export const WuXingGeneratedBy: Record<WuXing, WuXing> = {
  water: 'metal',  // 金生水
  wood: 'water',   // 水生木
  fire: 'wood',    // 木生火
  earth: 'fire',   // 火生土
  metal: 'earth'   // 土生金
}

/**
 * 获取神器允许镶嵌的宝石五行（包含同源与相生两种）
 * @param baseWuXing 神器主属性
 */
export function getAllowedGemWuXing(baseWuXing: WuXing): { same: WuXing; generating: WuXing; all: WuXing[] } {
  const generating = WuXingGeneratedBy[baseWuXing]
  return {
    same: baseWuXing,
    generating,
    all: [baseWuXing, generating]
  }
}

// 克制倍率
export const COUNTER_MULTIPLIER = 1.5
export const NORMAL_MULTIPLIER = 1.0