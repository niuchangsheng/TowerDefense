import { Augment } from '@/types/augment'

/**
 * 军师锦囊（天命肉鸽词条）数据池
 */
export const AUGMENT_POOL: Augment[] = [
  // ==================== 五行相生 / 共鸣类 ====================
  {
    id: 'aug_wind_fire',
    name: '借东风',
    subtitle: '木生火·燎原共鸣',
    description: '木火共鸣：全场火系与木系英雄攻击速度 +30%，且【木生火·燎原】爆炸伤害提升 50%。',
    rarity: 'rare',
    category: 'elemental',
    wuXingRequirement: ['wood', 'fire'],
    tags: ['木', '火', '相生'],
    effects: {
      attackSpeedBonus: 0.3,
      reactionDamageMultiplier: 0.5,
      specialId: 'aug_wind_fire'
    }
  },
  {
    id: 'aug_nourish_spread',
    name: '春风化雨',
    subtitle: '水生木·滋养共鸣',
    description: '水木共鸣：【水生木·滋养】定身时间延长至 3.5 秒，且全体已部署英雄攻击力 +15%。',
    rarity: 'rare',
    category: 'elemental',
    wuXingRequirement: ['water', 'wood'],
    tags: ['水', '木', '控制'],
    effects: {
      attackPercentBonus: 0.15,
      reactionDamageMultiplier: 0.35,
      specialId: 'aug_nourish_spread'
    }
  },
  {
    id: 'aug_sharp_edge',
    name: '百炼成钢',
    subtitle: '土生金·锋芒共鸣',
    description: '土金共鸣：【土生金·锋芒】额外飞刃弹射数量 +3，且受到破甲的敌军受击伤害额外提升 25%。',
    rarity: 'rare',
    category: 'elemental',
    wuXingRequirement: ['earth', 'metal'],
    tags: ['土', '金', '穿透'],
    effects: {
      reactionDamageMultiplier: 0.45,
      specialId: 'aug_sharp_edge'
    }
  },
  {
    id: 'aug_ice_shatter',
    name: '玄冰裂魄',
    subtitle: '金生水·碎冰共鸣',
    description: '金水共鸣：【金生水·碎冰】伤害提升 60%，冻结时间延长至 4 秒。',
    rarity: 'rare',
    category: 'elemental',
    wuXingRequirement: ['metal', 'water'],
    tags: ['金', '水', '冰冻'],
    effects: {
      reactionDamageMultiplier: 0.6,
      specialId: 'aug_ice_shatter'
    }
  },
  {
    id: 'aug_molten_core',
    name: '大地熔炉',
    subtitle: '火生土·熔岩共鸣',
    description: '火土共鸣：【火生土·熔岩】额外削减敌军韧性与刚毅，且全军暴击伤害 +25%，熔岩池灼烧伤害提升 50%。',
    rarity: 'rare',
    category: 'elemental',
    wuXingRequirement: ['fire', 'earth'],
    tags: ['火', '土', '熔岩'],
    effects: {
      reactionDamageMultiplier: 0.5,
      critDamageBonus: 0.25,
      specialId: 'aug_molten_core'
    }
  },
  {
    id: 'aug_vaporize_burst',
    name: '赤壁火船',
    subtitle: '火借风势·烈焰共鸣',
    description: '赤壁东风：全场火系与水系英雄攻击力 +15%，相生反应增伤 +60%，并产生冲击气浪震退周围小兵！',
    rarity: 'rare',
    category: 'elemental',
    wuXingRequirement: ['water', 'fire'],
    tags: ['水', '火', '冲击'],
    effects: {
      reactionDamageMultiplier: 0.6,
      attackPercentBonus: 0.15,
      damageIncreaseBonus: 0.2,
      specialId: 'aug_vaporize_burst'
    }
  },
  {
    id: 'aug_five_cycle',
    name: '五气朝元',
    subtitle: '五行相生大循环',
    description: '五行流转：相生反应伤害提升 50%，且处于多重元素状态下的敌军受到易伤加成 +35%（归入易伤乘区加算）。',
    rarity: 'epic',
    category: 'elemental',
    tags: ['五行', '易伤'],
    effects: {
      reactionDamageMultiplier: 0.5,
      vulnerabilityBonus: 0.35,
      specialId: 'aug_five_cycle'
    }
  },
  {
    id: 'aug_chaos_counter',
    name: '天相逆乱',
    subtitle: '相克极意',
    description: '克制增幅：五行相克基础伤害倍率从 1.5x 提升至 2.3x！',
    rarity: 'epic',
    category: 'elemental',
    tags: ['五行', '爆发'],
    effects: {
      counterMultiplierBonus: 0.8
    }
  },

  // ==================== 英雄本命蜕变类 ====================
  {
    id: 'aug_guanyu_yanyu',
    name: '威震华夏',
    subtitle: '关羽本命蜕变',
    description: '关羽攻击范围扩大 35%，每次斩击同时附带【潮湿】与【寄生】双重属性！',
    rarity: 'epic',
    category: 'hero',
    heroRequirement: 'hero_guanyu',
    tags: ['关羽', '范围'],
    effects: {
      attackRangeBonus: 35,
      attackPercentBonus: 0.25,
      specialId: 'aug_guanyu_yanyu'
    }
  },
  {
    id: 'aug_zhangfei_roar',
    name: '当阳怒吼',
    subtitle: '张飞本命蜕变',
    description: '张飞攻击力提升 30%，且攻击必定击退目标并造成 1.5 秒硬直眩晕。',
    rarity: 'epic',
    category: 'hero',
    heroRequirement: 'hero_zhangfei',
    tags: ['张飞', '击退'],
    effects: {
      attackPercentBonus: 0.3,
      specialId: 'aug_zhangfei_roar'
    }
  },
  {
    id: 'aug_zhaoyun_dragon',
    name: '七进七出',
    subtitle: '赵云本命蜕变',
    description: '赵云攻击速度提升 45%，且每次攻击有 25% 概率触发无双龙胆穿透打击。',
    rarity: 'epic',
    category: 'hero',
    heroRequirement: 'hero_zhaoyun',
    tags: ['赵云', '攻速'],
    effects: {
      attackSpeedBonus: 0.45,
      specialId: 'aug_zhaoyun_dragon'
    }
  },
  {
    id: 'aug_huangzhong_bow',
    name: '定军扬威',
    subtitle: '黄忠本命蜕变',
    description: '老将神威：黄忠攻击范围提升 50 步，普攻必定附带【火·灼烧】；对处于【木·寄生】的敌军伤害提升 60% 并必定触发烈焰爆破！',
    rarity: 'epic',
    category: 'hero',
    heroRequirement: 'hero_huangzhong',
    tags: ['黄忠', '射程', '火攻'],
    effects: {
      attackRangeBonus: 50,
      attackPercentBonus: 0.25,
      specialId: 'aug_huangzhong_bow'
    }
  },
  {
    id: 'aug_machao_cavalry',
    name: '神威天将',
    subtitle: '马超本命蜕变',
    description: '神威破军：马超攻击速度提升 30%，且攻击对处于【土·破衡】的敌人必定触发【土生金·淬刃】散射飞刃！',
    rarity: 'epic',
    category: 'hero',
    heroRequirement: 'hero_machao',
    tags: ['马超', '攻速', '穿透'],
    effects: {
      attackSpeedBonus: 0.3,
      reactionDamageMultiplier: 0.4,
      specialId: 'aug_machao_cavalry'
    }
  },

  // ==================== 战场军策 / 经济 / 基地类 ====================
  {
    id: 'aug_march_speed',
    name: '神速急行',
    subtitle: '全员战阵',
    description: '兵贵神速：全体英雄与士兵攻击速度提升 25%。',
    rarity: 'common',
    category: 'general',
    tags: ['攻速', '通用'],
    effects: {
      attackSpeedBonus: 0.25
    }
  },
  {
    id: 'aug_heavy_strike',
    name: '力拔山兮',
    subtitle: '破军之力',
    description: '武烈雄风：全体英雄攻击力提升 20%。',
    rarity: 'common',
    category: 'general',
    tags: ['攻击力', '通用'],
    effects: {
      attackPercentBonus: 0.2
    }
  },
  {
    id: 'aug_rich_harvest',
    name: '兵精粮足',
    subtitle: '军辎富足',
    description: '斩获军功：击杀敌人获得的灵石/金币增加 35%。',
    rarity: 'common',
    category: 'general',
    tags: ['经济', '发育'],
    effects: {
      costGainBonus: 0.35
    }
  },
  {
    id: 'aug_last_stand',
    name: '背水一战',
    subtitle: '绝境求生',
    description: '破釜沉舟：基地每损失 1 点生命，全体英雄攻击力额外提升 6%！',
    rarity: 'rare',
    category: 'general',
    tags: ['逆境', '攻击力'],
    effects: {
      specialId: 'aug_last_stand'
    }
  },
  {
    id: 'aug_sacred_herb',
    name: '神农百草',
    subtitle: '仁义回天',
    description: '休养生息：基地立即恢复 3 点生命值，基地最大生命值上限 +5。',
    rarity: 'common',
    category: 'general',
    tags: ['生命', '回复'],
    effects: {
      baseHealthHeal: 3,
      baseMaxHealthBonus: 5
    }
  },
  {
    id: 'aug_iron_wall',
    name: '金城汤池',
    subtitle: '要塞坚防',
    description: '城郭固守：基地最大生命值上限 +10，且全体英雄攻击范围 +20。',
    rarity: 'common',
    category: 'general',
    tags: ['防御', '射程'],
    effects: {
      baseMaxHealthBonus: 10,
      attackRangeBonus: 20
    }
  },
  {
    id: 'aug_celestial_tome',
    name: '奇门遁甲',
    subtitle: '天机妙算',
    description: '获得 2 次免费锦囊刷新令，且往后所有波次获得的击杀灵石 +40%。',
    rarity: 'legendary',
    category: 'general',
    tags: ['传说', '运筹'],
    effects: {
      costGainBonus: 0.4,
      specialId: 'aug_celestial_tome'
    }
  },
  {
    id: 'aug_bagua_miracle',
    name: '八阵奇谋',
    subtitle: '神机天算',
    description: '极品锦囊：所有五行相生相克反应伤害翻倍（+100%），全体英雄技能冷却缩短 25%！',
    rarity: 'legendary',
    category: 'elemental',
    tags: ['传说', '五行'],
    effects: {
      reactionDamageMultiplier: 1.0,
      attackPercentBonus: 0.25,
      specialId: 'aug_bagua_miracle'
    }
  },

  // ==================== 无尽专属高阶绝策 ====================
  {
    id: 'aug_endless_wuxing_harmony',
    name: '五行圆融',
    subtitle: '混元极意 · 极',
    description: '阴阳合德，五行归一：全队英雄攻击力提升 30%，且五行相生相克连锁反应伤害额外提升 75%，克制倍率提升 50%。',
    rarity: 'legendary',
    category: 'elemental',
    tags: ['五行', '混元', '传说'],
    effects: {
      attackPercentBonus: 0.3,
      reactionDamageMultiplier: 0.75,
      counterMultiplierBonus: 0.5,
      specialId: 'aug_endless_wuxing_harmony'
    }
  },
  {
    id: 'aug_endless_ink_rain',
    name: '墨染山河',
    subtitle: '天工神策 · 奇',
    description: '天降墨雨：全队攻击速度提升 30%，全军射程额外提升 40 像素。',
    rarity: 'epic',
    category: 'general',
    tags: ['射程', '攻速', '史诗'],
    effects: {
      attackSpeedBonus: 0.3,
      attackRangeBonus: 40,
      specialId: 'aug_endless_ink_rain'
    }
  },
  {
    id: 'aug_endless_sword_burst',
    name: '万剑归宗',
    subtitle: '剑荡八荒 · 绝',
    description: '千锋破甲：全体英雄攻击力提升 35%，对受克制敌人的克制倍率额外提升 60%。',
    rarity: 'legendary',
    category: 'general',
    tags: ['克制', '攻击力', '传说'],
    effects: {
      attackPercentBonus: 0.35,
      counterMultiplierBonus: 0.6,
      specialId: 'aug_endless_sword_burst'
    }
  },
  {
    id: 'aug_endless_iron_fortress',
    name: '百战玄甲',
    subtitle: '不动如山 · 固',
    description: '金石为开：帅营最大生命提升 15 点，立即恢复 15 点生命，击杀敌人获得的灵石额外提升 50%。',
    rarity: 'epic',
    category: 'general',
    tags: ['生命', '经济', '史诗'],
    effects: {
      baseMaxHealthBonus: 15,
      baseHealthHeal: 15,
      costGainBonus: 0.5,
      specialId: 'aug_endless_iron_fortress'
    }
  }
]

/**
 * 无尽精进锦囊（可无限次重复抽取与叠加，保证锦囊永不枯竭）
 */
export const REPEATABLE_AUGMENTS: Augment[] = [
  {
    id: 'aug_repeat_attack',
    name: '破军军威',
    subtitle: '全员精进 · 攻',
    description: '军心大振：全体英雄攻击力额外提升 12%（可多次选取叠加）。',
    rarity: 'common',
    category: 'general',
    repeatable: true,
    tags: ['攻击力', '精进'],
    effects: {
      attackPercentBonus: 0.12
    }
  },
  {
    id: 'aug_repeat_speed',
    name: '疾风军威',
    subtitle: '全员精进 · 速',
    description: '兵贵神速：全体英雄攻击速度额外提升 15%（可多次选取叠加）。',
    rarity: 'common',
    category: 'general',
    repeatable: true,
    tags: ['攻速', '精进'],
    effects: {
      attackSpeedBonus: 0.15
    }
  },
  {
    id: 'aug_repeat_heal',
    name: '仁德军威',
    subtitle: '全员精进 · 生',
    description: '休养生息：基地立即恢复 4 点生命值，基地最大生命上限 +5（可多次选取叠加）。',
    rarity: 'common',
    category: 'general',
    repeatable: true,
    tags: ['生命', '回复'],
    effects: {
      baseHealthHeal: 4,
      baseMaxHealthBonus: 5
    }
  },
  {
    id: 'aug_repeat_cost',
    name: '粮草军威',
    subtitle: '全员精进 · 财',
    description: '军饷丰沛：击杀敌人获得的灵石额外提升 25%（可多次选取叠加）。',
    rarity: 'common',
    category: 'general',
    repeatable: true,
    tags: ['经济', '精进'],
    effects: {
      costGainBonus: 0.25
    }
  },
  {
    id: 'aug_repeat_reaction',
    name: '五行共鸣',
    subtitle: '全员精进 · 术',
    description: '术法通玄：五行相生相克连锁反应伤害额外提升 35%（可多次选取叠加）。',
    rarity: 'rare',
    category: 'elemental',
    repeatable: true,
    tags: ['五行', '精进'],
    effects: {
      reactionDamageMultiplier: 0.35
    }
  }
]

/**
 * 根据ID查询锦囊
 */
export function getAugmentById(id: string): Augment | undefined {
  return AUGMENT_POOL.find(a => a.id === id) || REPEATABLE_AUGMENTS.find(a => a.id === id)
}
