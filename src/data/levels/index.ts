import { LevelConfig } from '@/types'
import { level1Config, level2Config, level3Config } from './chapter1'
import { getAllChapters, getChapter, chapters } from './chapters'

// 导出章节相关
export { getAllChapters, getChapter, chapters }

/**
 * 关卡索引
 * 所有关卡配置的集合
 */

// 关卡配置映射
const levelConfigs: Map<string, LevelConfig> = new Map([
  ['chapter1_level1', level1Config],
  ['chapter1_level2', level2Config],
  ['chapter1_level3', level3Config]
])

/**
 * 获取关卡配置
 */
export function getLevelConfig(levelId: string): LevelConfig | undefined {
  return levelConfigs.get(levelId)
}

/**
 * 获取章节内所有关卡
 */
export function getChapterLevels(chapterId: string): LevelConfig[] {
  const levels: LevelConfig[] = []

  for (const [id, config] of levelConfigs) {
    if (config.chapterId === chapterId) {
      levels.push(config)
    }
  }

  // 按关卡ID排序
  levels.sort((a, b) => {
    const matchA = a.id.match(/level(\d+)/)
    const matchB = b.id.match(/level(\d+)/)
    const numA = matchA ? parseInt(matchA[1], 10) : 0
    const numB = matchB ? parseInt(matchB[1], 10) : 0
    return numA - numB
  })

  return levels
}

/**
 * 检查关卡是否解锁
 * @param levelId 关卡ID
 * @param completedLevels 已通关关卡列表
 */
export function isLevelUnlocked(levelId: string, completedLevels: string[]): boolean {
  // 第一关始终解锁
  if (levelId.endsWith('_level1')) {
    return true
  }

  // 其他关卡需要前置关卡通关
  const match = levelId.match(/^(.*)_level(\d+)$/)
  if (!match) return false
  const chapterPrefix = match[1]
  const levelNum = parseInt(match[2], 10)
  if (levelNum <= 1) return true
  const prevLevelId = `${chapterPrefix}_level${levelNum - 1}`

  return completedLevels.includes(prevLevelId)
}

/**
 * 检查章节是否解锁
 * @param chapterId 章节ID
 * @param completedLevels 已通关关卡列表
 */
export function isChapterUnlocked(chapterId: string, completedLevels: string[]): boolean {
  // 第一章始终解锁
  if (chapterId === 'chapter1') {
    return true
  }

  // 其他章节需要前置章节最后一关通关
  const match = chapterId.match(/chapter(\d+)/)
  if (!match) return false
  const chapterNum = parseInt(match[1], 10)
  if (chapterNum <= 1) return true
  const prevChapterId = `chapter${chapterNum - 1}`
  const prevChapterLastLevel = `${prevChapterId}_level3`

  return completedLevels.includes(prevChapterLastLevel)
}

export { levelConfigs }