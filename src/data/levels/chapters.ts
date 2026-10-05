import { ChapterConfig } from '@/types'

/**
 * 战役沙盘五卷三国古战场舆图（严格对齐设计文档 §4.6 与 §9.4）
 * 玩家可在沙盘中任选五大古战场出征，100% 定向刷取对应统帅的宿命神兵主材与五行将魂玉！
 */
export const chapters: ChapterConfig[] = [
  {
    id: 'chapter1',
    name: '五卷古战场舆图',
    historicalEvent: '公元184~219年 - 五大五行统帅宿命决战（15波破关 + 无尽北伐）',
    levels: [
      'chapter1_level1',
      'chapter1_level2',
      'chapter1_level3',
      'chapter1_level4',
      'chapter1_level5'
    ]
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