import { ChapterConfig } from '@/types'

/**
 * 章节配置
 */
export const chapters: ChapterConfig[] = [
  {
    id: 'chapter1',
    name: '黄巾起义',
    historicalEvent: '公元184年 - 黄巾起义爆发',
    levels: ['chapter1_level1', 'chapter1_level2', 'chapter1_level3']
  },
  {
    id: 'chapter2',
    name: '讨伐董卓',
    historicalEvent: '公元190年 - 各路诸侯讨伐董卓',
    levels: ['chapter2_level1', 'chapter2_level2', 'chapter2_level3']
  },
  {
    id: 'chapter3',
    name: '官渡之战',
    historicalEvent: '公元200年 - 曹操与袁绍决战',
    levels: ['chapter3_level1', 'chapter3_level2', 'chapter3_level3']
  }
]

/**
 * 获取章节配置
 */
export function getChapter(chapterId: string): ChapterConfig | undefined {
  return chapters.find(c => c.id === chapterId)
}

/**
 * 获取所有章节
 */
export function getAllChapters(): ChapterConfig[] {
  return chapters
}