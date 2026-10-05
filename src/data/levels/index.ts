import { LevelConfig, WuXing } from '@/types'
import {
  level1Config,
  level2Config,
  level3Config,
  level4Config,
  level5Config
} from './chapter1'
import { getAllChapters, getChapter, chapters } from './chapters'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'

// 导出章节相关
export { getAllChapters, getChapter, chapters }

/**
 * 五大古战场舆图宿命产出元数据（设计文档 §4.6(4) & §9.4）
 */
export interface BattlefieldLoreMeta {
  levelId: string
  scrollTitle: string
  shortLabel: string
  bossId: string
  bossName: string
  bossTitle: string
  bossWuXing: WuXing
  guardianBossName: string
  guardianBossElement: WuXing
  weaknessReactionName: string
  weaknessReactionDesc: string
  materialId: string
  materialName: string
  divineMaterialId: string
  divineMaterialName: string
  targetHeroId: string
  targetHeroName: string
  targetArtifactId: string
  targetArtifactName: string
  exclusiveWeaponName: string
  soulStoneName: string
}

export const BATTLEFIELD_MAP_META: Record<string, BattlefieldLoreMeta> = {
  chapter1_level1: {
    levelId: 'chapter1_level1',
    scrollTitle: '卷一《巨鹿破黄巾》',
    shortLabel: '巨鹿',
    bossId: 'enemy_boss_zhangjiao',
    bossName: '张角',
    bossTitle: '天公将军',
    bossWuXing: 'wood',
    guardianBossName: '天公将军·张角',
    guardianBossElement: 'wood',
    weaknessReactionName: '【木生火·燎原】',
    weaknessReactionDesc: '【木生火·燎原】',
    materialId: 'mat_qinglong_scale',
    materialName: '青龙逆鳞',
    divineMaterialId: 'mat_qinglong_scale',
    divineMaterialName: '青龙逆鳞',
    targetHeroId: 'hero_guanyu',
    targetHeroName: '关羽',
    targetArtifactId: 'artifact_qinglong',
    targetArtifactName: '青龙偃月刀',
    exclusiveWeaponName: '青龙偃月刀',
    soulStoneName: '【关羽将魂】'
  },
  chapter1_level2: {
    levelId: 'chapter1_level2',
    scrollTitle: '卷二《樊城破八门》',
    shortLabel: '樊城',
    bossId: 'enemy_boss_caoren',
    bossName: '曹仁',
    bossTitle: '八门金锁',
    bossWuXing: 'metal',
    guardianBossName: '天人铁壁·曹仁',
    guardianBossElement: 'metal',
    weaknessReactionName: '【金生水·碎冰】',
    weaknessReactionDesc: '【金生水·碎冰】',
    materialId: 'mat_bailian_iron',
    materialName: '百炼陨铁',
    divineMaterialId: 'mat_bailian_iron',
    divineMaterialName: '百炼陨铁',
    targetHeroId: 'hero_huangzhong',
    targetHeroName: '黄忠',
    targetArtifactId: 'artifact_sherigong',
    targetArtifactName: '宝雕射日弓',
    exclusiveWeaponName: '宝雕射日弓',
    soulStoneName: '【黄忠将魂】'
  },
  chapter1_level3: {
    levelId: 'chapter1_level3',
    scrollTitle: '卷三《合淝威逍遥》',
    shortLabel: '合淝',
    bossId: 'enemy_boss_zhangliao',
    bossName: '张辽',
    bossTitle: '威震逍遥',
    bossWuXing: 'water',
    guardianBossName: '威震逍遥·张辽',
    guardianBossElement: 'water',
    weaknessReactionName: '【水生木·滋养】',
    weaknessReactionDesc: '【水生木·滋养】',
    materialId: 'mat_xuanwu_jade',
    materialName: '玄武寒玉',
    divineMaterialId: 'mat_xuanwu_jade',
    divineMaterialName: '玄武寒玉',
    targetHeroId: 'hero_zhangfei',
    targetHeroName: '张飞',
    targetArtifactId: 'artifact_shemao',
    targetArtifactName: '丈八蛇矛',
    exclusiveWeaponName: '丈八蛇矛',
    soulStoneName: '【张飞将魂】'
  },
  chapter1_level4: {
    levelId: 'chapter1_level4',
    scrollTitle: '卷四《焚城讨董卓》',
    shortLabel: '郿坞',
    bossId: 'enemy_boss_dongzhuo',
    bossName: '董卓',
    bossTitle: '暴虐太师',
    bossWuXing: 'earth',
    guardianBossName: '暴虐太师·董卓',
    guardianBossElement: 'earth',
    weaknessReactionName: '【火生土·熔岩】',
    weaknessReactionDesc: '【火生土·熔岩】',
    materialId: 'mat_xiliang_gold',
    materialName: '西凉精金',
    divineMaterialId: 'mat_xiliang_gold',
    divineMaterialName: '西凉精金',
    targetHeroId: 'hero_machao',
    targetHeroName: '马超',
    targetArtifactId: 'artifact_zhanjin',
    targetArtifactName: '虎头湛金枪',
    exclusiveWeaponName: '虎头湛金枪',
    soulStoneName: '【马超将魂】'
  },
  chapter1_level5: {
    levelId: 'chapter1_level5',
    scrollTitle: '卷五《虎牢战温侯》',
    shortLabel: '虎牢',
    bossId: 'enemy_boss_lvbu',
    bossName: '吕布',
    bossTitle: '无双飞将',
    bossWuXing: 'fire',
    guardianBossName: '无双飞将·吕布',
    guardianBossElement: 'fire',
    weaknessReactionName: '【土生金·锋芒】',
    weaknessReactionDesc: '【土生金·锋芒】',
    materialId: 'mat_chitu_crystal',
    materialName: '赤兔火晶',
    divineMaterialId: 'mat_chitu_crystal',
    divineMaterialName: '赤兔火晶',
    targetHeroId: 'hero_zhaoyun',
    targetHeroName: '赵云',
    targetArtifactId: 'artifact_longdan',
    targetArtifactName: '龙胆亮银枪',
    exclusiveWeaponName: '龙胆亮银枪',
    soulStoneName: '【赵云将魂】'
  }
}

export function getBattlefieldMapMeta(levelId: string): BattlefieldLoreMeta | undefined {
  return BATTLEFIELD_MAP_META[levelId]
}

// 无尽模式配置生成
export const endlessLevelConfig = EndlessModeManager.createEndlessLevelConfig(
  level1Config.map.path,
  level1Config.map.spawnPoint,
  level1Config.map.exitPoint
)

// 关卡配置映射
const levelConfigs: Map<string, LevelConfig> = new Map([
  ['chapter1_level1', level1Config],
  ['chapter1_level2', level2Config],
  ['chapter1_level3', level3Config],
  ['chapter1_level4', level4Config],
  ['chapter1_level5', level5Config],
  ['level_endless_tower', endlessLevelConfig]
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

  for (const [, config] of levelConfigs) {
    if (config.chapterId === chapterId) {
      levels.push(config)
    }
  }

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
 * 设计文档 §4.6(4)：玩家可在【战役沙盘】自由选择五卷三国古战场出征，100% 定向获取心仪主 C 的专属神兵主材与将魂！
 */
export function isLevelUnlocked(_levelId: string, _completedLevels: string[] = []): boolean {
  return true
}

/**
 * 检查章节是否解锁
 */
export function isChapterUnlocked(_chapterId: string, _completedLevels: string[] = []): boolean {
  return true
}

export { levelConfigs }