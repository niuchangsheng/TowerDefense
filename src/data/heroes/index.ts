import { HeroConfig, Hero } from '@/types'

/**
 * 将星命盘（1★ ~ 5★）普攻五行附着率映射
 * - 1★ 命星初亮：25% 附着率
 * - 2★ 同源器眼：40% 附着率 + 解锁神兵【同源槽】+ 部署军费 -2
 * - 3★ 本命武魂：50% 附着率 + 解锁武将 3★ 专属被动特质
 * - 4★ 相生器眼：65% 附着率 + 解锁神兵【相生槽】+ 破 Boss 铁壁效率 1.5x (+50%)
 * - 5★ 将星极意：80% 附着率 + 解锁双 Lv.5 终极大招资格 + 释放战法充能 +8% 军令能量
 */
export const STAR_ATTACHMENT_RATES: Record<number, number> = {
  1: 0.25,
  2: 0.40,
  3: 0.50,
  4: 0.65,
  5: 0.80
}

export function getStarAttachmentRate(star: number): number {
  const clamped = Math.max(1, Math.min(5, star))
  return STAR_ATTACHMENT_RATES[clamped] ?? 0.25
}

/**
 * 获取星级带来的部署军费减免（2★ 及以上减免 2 点军费）
 */
export function getStarDeploymentCostReduction(star: number): number {
  return star >= 2 ? 2 : 0
}

/**
 * 获取星级带来的 Boss 五行铁壁额外破盾加成（4★ 及以上破盾效率 +50%）
 */
export function getStarAegisBreakBonus(star: number): number {
  return star >= 4 ? 0.50 : 0
}

export interface StarDestinyNode {
  star: number
  title: string
  attachRatePct: number
  attachmentRate: number
  socketPermission: string
  unlockDesc: string
}

export const STAR_DESTINY_NODES: StarDestinyNode[] = [
  {
    star: 1,
    title: '初露锋芒',
    attachRatePct: 25,
    attachmentRate: 0.25,
    socketPermission: '可佩戴兵器/本命神兵（激活神兵技能变化），宝石孔位尚未开窍',
    unlockDesc: '解锁武将【原始主动战法】与基础被动，五虎开局全员无门槛上阵'
  },
  {
    star: 2,
    title: '威名远播',
    attachRatePct: 40,
    attachmentRate: 0.40,
    socketPermission: '🔓 打通神兵【同源宝石槽】(sameSocket)，允许镶嵌同系宝石激活【同源特效】',
    unlockDesc: '【轻装急行】：该武将局内部署军费费用永久 -2'
  },
  {
    star: 3,
    title: '独当一面',
    attachRatePct: 50,
    attachmentRate: 0.50,
    socketPermission: '保持【同源宝石槽】',
    unlockDesc: '🔥 觉醒【三国本命特质】（每位武将独有的五行元素状态联动核心被动）'
  },
  {
    star: 4,
    title: '威震华夏',
    attachRatePct: 65,
    attachmentRate: 0.65,
    socketPermission: '🔓 打通神兵【相生宝石槽】(generatingSocket)，实现【同源+相生特效】双槽同存',
    unlockDesc: '【破壁先锋】：由该武将触发的【五行相生反应】对 Boss【五行铁壁】造成 1.5× 破盾削减'
  },
  {
    star: 5,
    title: '五虎天命',
    attachRatePct: 80,
    attachmentRate: 0.80,
    socketPermission: '🐉 解锁【双 Lv.5 宝石 · 终极大招】觉醒权限（双槽嵌满 Lv.5 神品宝石激发圣兽法相）',
    unlockDesc: '【统帅军威】：每次释放主动战法时，立即为战场【军令台】灌注 +8% 军令充能'
  }
]

/**
 * 五虎上将配置（一期核心：开局全员平权解锁，五大基础属性齐备）
 * - 关羽（木·毒 / 武圣）
 * - 张飞（土·重 / 万人敌）
 * - 赵云（水·湿 / 常山赵子龙）
 * - 黄忠（火·灼 / 定军神箭）
 * - 马超（金·裂 / 神威天将军）
 */
export const heroConfigs: HeroConfig[] = [
  {
    id: 'hero_guanyu',
    name: '关羽',
    title: '武圣',
    wuXing: 'wood',
    rarity: 'legendary',
    baseStats: {
      attack: 90,
      attackSpeed: 0.9,
      attackRange: 135,
      critRate: 0.15,
      critDamage: 0.50
    },
    deploymentCost: 12,
    passiveSkillId: 'skill_passive_guanyu',
    activeSkillId: 'skill_active_guanyu',
    unlockSoulStoneCount: 10,
    starUpgradeRequirements: [1, 3, 6, 10],
    star3TraitName: '【义绝春秋】',
    star3TraitDesc: '战场上每有 1 名处于【木·毒】的敌军阵亡，关羽主动战法冷却立即缩短 0.6s，且毒种阵亡传染半径扩大 35%。'
  },
  {
    id: 'hero_zhangfei',
    name: '张飞',
    title: '万人敌',
    wuXing: 'earth',
    rarity: 'legendary',
    baseStats: {
      attack: 95,
      attackSpeed: 0.8,
      attackRange: 120,
      critRate: 0.15,
      critDamage: 0.55
    },
    deploymentCost: 12,
    passiveSkillId: 'skill_passive_zhangfei',
    activeSkillId: 'skill_active_zhangfei',
    unlockSoulStoneCount: 10,
    starUpgradeRequirements: [1, 3, 6, 10],
    star3TraitName: '【万夫莫敌】',
    star3TraitDesc: '处于张飞攻击范围内的敌军，其身上的【土·重】持续时间暂停衰减；且每次触发【负重内震】时，震波向周围 85px 额外溅射 50% 内震伤害。'
  },
  {
    id: 'hero_zhaoyun',
    name: '赵云',
    title: '常山赵子龙',
    wuXing: 'water',
    rarity: 'legendary',
    baseStats: {
      attack: 72,
      attackSpeed: 1.4,
      attackRange: 145,
      critRate: 0.20,
      critDamage: 0.50
    },
    deploymentCost: 11,
    passiveSkillId: 'skill_passive_zhaoyun',
    activeSkillId: 'skill_active_zhaoyun',
    unlockSoulStoneCount: 10,
    starUpgradeRequirements: [1, 3, 6, 10],
    star3TraitName: '【一身是胆】',
    star3TraitDesc: '对处于【水·湿】的敌军每累计命中 4 次，第 4 击必定暴击，并使其身上的【水·湿】减速幅度在 2.0s 内翻倍。'
  },
  {
    id: 'hero_huangzhong',
    name: '黄忠',
    title: '定军神箭',
    wuXing: 'fire',
    rarity: 'legendary',
    baseStats: {
      attack: 78,
      attackSpeed: 1.0,
      attackRange: 230,
      critRate: 0.20,
      critDamage: 0.60
    },
    deploymentCost: 11,
    passiveSkillId: 'skill_passive_huangzhong',
    activeSkillId: 'skill_active_huangzhong',
    unlockSoulStoneCount: 10,
    starUpgradeRequirements: [1, 3, 6, 10],
    star3TraitName: '【百步穿杨】',
    star3TraitDesc: '对处于【火·灼】的敌军发起攻击时，黄忠本次攻击射程动态 +25%，且箭矢无视目标 20%【韧性】（更易暴击）。'
  },
  {
    id: 'hero_machao',
    name: '马超',
    title: '神威天将军',
    wuXing: 'metal',
    rarity: 'legendary',
    baseStats: {
      attack: 82,
      attackSpeed: 1.25,
      attackRange: 130,
      critRate: 0.25,
      critDamage: 0.65
    },
    deploymentCost: 12,
    passiveSkillId: 'skill_passive_machao',
    activeSkillId: 'skill_active_machao',
    unlockSoulStoneCount: 10,
    starUpgradeRequirements: [1, 3, 6, 10],
    star3TraitName: '【神威铁骑】',
    star3TraitDesc: '战场上每存在 1 名处于【金·裂】流血状态的敌军，马超自身攻击速度提升 6%（最多叠加 6 层至 +36% 攻速）。'
  }
]

/**
 * 英雄索引
 */
export const heroConfigsMap: Map<string, HeroConfig> = new Map(
  heroConfigs.map(h => [h.id, h])
)

/**
 * 根据ID获取英雄配置
 */
export function getHeroConfig(id: string): HeroConfig | undefined {
  return heroConfigsMap.get(id)
}

/**
 * 创建初始英雄实例（一期五虎上将开局全员解锁，初始皆为 1★ 武道一境）
 */
export function createDefaultHeroes(): Map<string, Hero> {
  const heroes = new Map<string, Hero>()

  for (const config of heroConfigs) {
    const hero: Hero = {
      ...config,
      level: 1,
      star: 1,
      experience: 0,
      equipment: {
        weapon: null,
        artifact: null
      },
      isUnlocked: true
    }

    heroes.set(hero.id, hero)
  }

  return heroes
}

export { heroConfigs as heroes }
export * from './levelConfig'