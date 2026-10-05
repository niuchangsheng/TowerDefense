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

/**
 * 五虎上将配置（一期核心：开局全员平权解锁，五大基础属性齐备）
 * - 关羽（木·毒 / 武圣）
 * - 张飞（土·重 / 万人敌）
 * - 赵云（水·湿 / 常山赵子龙）
 * - 黄忠（火·灼 / 神箭）
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
    starUpgradeRequirements: [20, 40, 80, 160],
    star3TraitName: '【青龙饮血】',
    star3TraitDesc: '对携带【木·毒】的敌军造成伤害时，每层木毒使暴击率 +8%；击杀带毒敌军立即返还主动战法 1.0s 冷却。'
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
    starUpgradeRequirements: [20, 40, 80, 160],
    star3TraitName: '【燕人咆哮】',
    star3TraitDesc: '普攻命中处于【土·重】或【熔岩·焦土】的敌军时，额外削减 15% 刚毅（受 40% 保底下限约束），并使【负重内震】扩散至周围 70px。'
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
    starUpgradeRequirements: [20, 40, 80, 160],
    star3TraitName: '【龙胆出入】',
    star3TraitDesc: '每第 3 次普攻必定触发七探盘蛇连刺（100% 附着【水·湿】），且对处于【寒芒·碎冰】冻结目标的暴击伤害提升 +35%。'
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
    starUpgradeRequirements: [20, 40, 80, 160],
    star3TraitName: '【定军烈弓】',
    star3TraitDesc: '对距离自身 140px 以上的远端目标，【火·灼】附着率额外 +25%，且触发【木生火·燎原】时火海半径扩大 25%。'
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
    starUpgradeRequirements: [20, 40, 80, 160],
    star3TraitName: '【铁骑破甲】',
    star3TraitDesc: '攻击携带【金·裂】的敌军时，流血真伤结算步距缩短 30%，且触发【土生金·淬刃】时额外迸射 1 道剑气。'
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