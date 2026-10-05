import { EnemyConfig } from '@/types'

/**
 * 普通敌人配置（五维属性：生命 / 防御 / 移速 / 韧性 / 刚毅）
 * 五行特色鲜明，对应五大五行基础状态克制关系
 */
export const normalEnemies: EnemyConfig[] = [
  {
    id: 'enemy_normal_metal',
    name: '黄巾重甲兵（金）',
    wuXing: 'metal',
    type: 'normal',
    baseHealth: 110,
    baseDefense: 0.35, // 高护甲，需【金·裂】破甲
    baseSpeed: 46,
    baseTenacity: 0.05,
    baseFortitude: 0.10,
    rewardCost: 1,
    dropTable: []
  },
  {
    id: 'enemy_normal_wood',
    name: '黄巾药师兵（木）',
    wuXing: 'wood',
    type: 'normal',
    baseHealth: 140, // 高生命，需【木·毒】百分比腐蚀与禁疗
    baseDefense: 0.10,
    baseSpeed: 48,
    baseTenacity: 0.05,
    baseFortitude: 0.05,
    rewardCost: 1,
    dropTable: []
  },
  {
    id: 'enemy_normal_water',
    name: '黄巾斥候兵（水）',
    wuXing: 'water',
    type: 'normal',
    baseHealth: 95,
    baseDefense: 0.08,
    baseSpeed: 64, // 高移速，需【水·湿】减速与【水生木】定身
    baseTenacity: 0.05,
    baseFortitude: 0.05,
    rewardCost: 1,
    dropTable: []
  },
  {
    id: 'enemy_normal_fire',
    name: '黄巾狂战兵（火）',
    wuXing: 'fire',
    type: 'normal',
    baseHealth: 115,
    baseDefense: 0.12,
    baseSpeed: 54,
    baseTenacity: 0.08,
    baseFortitude: 0.10,
    rewardCost: 1,
    dropTable: []
  },
  {
    id: 'enemy_normal_earth',
    name: '黄巾磐石兵（土）',
    wuXing: 'earth',
    type: 'normal',
    baseHealth: 125,
    baseDefense: 0.20,
    baseSpeed: 44,
    baseTenacity: 0.25, // 高韧性与刚毅，需【土·重】削韧破刚
    baseFortitude: 0.45,
    rewardCost: 1,
    dropTable: []
  }
]

/**
 * 精英敌人配置（五维进阶统领，突破防线扣除主公 3 点生命）
 */
export const eliteEnemies: EnemyConfig[] = [
  {
    id: 'enemy_elite_metal',
    name: '玄甲渠帅（金）',
    wuXing: 'metal',
    type: 'elite',
    baseHealth: 360,
    baseDefense: 0.48,
    baseSpeed: 40,
    baseTenacity: 0.12,
    baseFortitude: 0.20,
    rewardCost: 3,
    dropTable: []
  },
  {
    id: 'enemy_elite_wood',
    name: '太平祭酒（木）',
    wuXing: 'wood',
    type: 'elite',
    baseHealth: 450,
    baseDefense: 0.15,
    baseSpeed: 42,
    baseTenacity: 0.10,
    baseFortitude: 0.15,
    rewardCost: 3,
    dropTable: []
  },
  {
    id: 'enemy_elite_water',
    name: '白马轻骑（水）',
    wuXing: 'water',
    type: 'elite',
    baseHealth: 300,
    baseDefense: 0.12,
    baseSpeed: 62,
    baseTenacity: 0.10,
    baseFortitude: 0.10,
    rewardCost: 3,
    dropTable: []
  },
  {
    id: 'enemy_elite_fire',
    name: '赤焰先锋（火）',
    wuXing: 'fire',
    type: 'elite',
    baseHealth: 340,
    baseDefense: 0.18,
    baseSpeed: 48,
    baseTenacity: 0.15,
    baseFortitude: 0.20,
    rewardCost: 3,
    dropTable: []
  },
  {
    id: 'enemy_elite_earth',
    name: '西凉重锤校尉（土）',
    wuXing: 'earth',
    type: 'elite',
    baseHealth: 400,
    baseDefense: 0.28,
    baseSpeed: 38,
    baseTenacity: 0.35,
    baseFortitude: 0.65,
    rewardCost: 3,
    dropTable: []
  }
]

/**
 * 三国五大统帅 Boss 配置（3~5 格【五行铁壁】 + 命脉弱点相生 + 突破即刻判负）
 */
export const bossEnemies: EnemyConfig[] = [
  {
    id: 'enemy_boss_zhangjiao',
    name: '张角',
    wuXing: 'wood',
    type: 'boss',
    baseHealth: 1500,
    baseDefense: 0.22,
    baseSpeed: 30,
    baseTenacity: 0.15,
    baseFortitude: 0.30,
    maxAegisGrids: 3,
    weaknessReactions: ['wildfire'],
    mechanicDesc: '【苍天已死】：巨额生命与持续回血，唯有关羽【木·毒】禁疗与【木生火·燎原】可破其3格铁壁！',
    rewardCost: 10,
    dropTable: []
  },
  {
    id: 'enemy_boss_caoren',
    name: '曹仁',
    wuXing: 'metal',
    type: 'boss',
    baseHealth: 1350,
    baseDefense: 0.60, // 极高护甲（保底下限 24%）
    baseSpeed: 28,
    baseTenacity: 0.20,
    baseFortitude: 0.35,
    maxAegisGrids: 4,
    weaknessReactions: ['spikes'],
    mechanicDesc: '【八门金锁】：60%重甲减伤，需马超【金·裂】破甲与【土生金·淬刃】击碎其4格玄铁壁！',
    rewardCost: 10,
    dropTable: []
  },
  {
    id: 'enemy_boss_zhangliao',
    name: '张辽',
    wuXing: 'water',
    type: 'boss',
    baseHealth: 1250,
    baseDefense: 0.20,
    baseSpeed: 56, // 极高突进移速
    baseTenacity: 0.18,
    baseFortitude: 0.25,
    maxAegisGrids: 3,
    weaknessReactions: ['nourish'],
    mechanicDesc: '【威震逍遥】：疾行突袭大营，需赵云【水·湿】减速与【水生木·滋养】藤蔓定身破其3格铁壁！',
    rewardCost: 10,
    dropTable: []
  },
  {
    id: 'enemy_boss_dongzhuo',
    name: '董卓',
    wuXing: 'earth',
    type: 'boss',
    baseHealth: 1650,
    baseDefense: 0.30,
    baseSpeed: 26,
    baseTenacity: 0.45, // 高韧性（抗暴率）
    baseFortitude: 1.20, // 极高刚毅（抗暴伤 120%，保底下限 48%）
    maxAegisGrids: 4,
    weaknessReactions: ['magma'],
    mechanicDesc: '【酒池肉林】：45%韧性与120%刚毅免疫寻常暴击，需张飞【土·重】与【火生土·熔岩】瓦解其4格铁壁！',
    rewardCost: 12,
    dropTable: []
  },
  {
    id: 'enemy_boss_lvbu',
    name: '吕布',
    wuXing: 'fire',
    type: 'boss',
    baseHealth: 2000,
    baseDefense: 0.38,
    baseSpeed: 38,
    baseTenacity: 0.30,
    baseFortitude: 0.60,
    maxAegisGrids: 5,
    weaknessReactions: ['shatter', 'wildfire', 'nourish', 'magma', 'spikes'],
    mechanicDesc: '【无双飞将】：五维全能统帅，身披5格无双铁壁，需相生阵脉高频连锁破壁方可克敌！',
    rewardCost: 15,
    dropTable: []
  }
]

/**
 * 敌人索引
 * 用于快速查找敌人配置
 */
export const enemyConfigs: Map<string, EnemyConfig> = new Map([
  ...normalEnemies.map(e => [e.id, e] as [string, EnemyConfig]),
  ...eliteEnemies.map(e => [e.id, e] as [string, EnemyConfig]),
  ...bossEnemies.map(e => [e.id, e] as [string, EnemyConfig]),
  ['enemy_boss_water', bossEnemies.find(b => b.id === 'enemy_boss_zhangliao')!]
])

/**
 * 根据ID获取敌人配置
 */
export function getEnemyConfig(id: string): EnemyConfig | undefined {
  return enemyConfigs.get(id)
}