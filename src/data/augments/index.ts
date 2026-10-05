import { Augment } from '@/types/augment'

/**
 * 军师锦囊（三国典故名策 · 无品质平权 · 五大策系）数据池
 * 严格遵循《Wuxing_System_Design.md》第七章：
 * 1. 【五行异变策】：《潼关割袍》《刮骨疗毒》《铁索横江》《博望屯火》《霸桥挑袍》
 * 2. 【相生连环策】：《水淹七军》《赤壁东风》《盘蛇焚藤》《暗渡陈仓》《渭水筑城》《五气朝元》
 * 3. 【攻防逆转策】：《七擒孟获》《定军斩渊》《长坂单骑》《八门金锁》
 * 4. 【奇谋战法策】：《隆中三分》《草船借箭》《空城抚琴》《木牛流马》
 * 5. 【观星借天策】：《五丈原祈星》《奇门遁甲》《望梅止渴》
 */
export const AUGMENT_POOL: Augment[] = [
  // ==================== 相生连环策 / 五行异变策（elemental 共 9 卷） ====================
  {
    id: 'aug_nourish_spread',
    name: '水淹七军',
    subtitle: '关羽樊城决水 · 水生木连环',
    description:
      '【相生连环策】触发【滋养·蔓延】（水生木）时，藤蔓定身时间延长至 3.2 秒，并在原地留下持续 4 秒的【樊城水泽】（踏入敌军自动挂【水·湿】与【木·毒】），全体攻击力 +15%。',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    wuXingRequirement: ['water', 'wood'],
    tags: ['水生木', '定身', '相生连环策'],
    effects: {
      attackPercentBonus: 0.15,
      reactionDamageMultiplier: 0.35,
      specialId: 'aug_nourish_spread'
    }
  },
  {
    id: 'aug_wind_fire',
    name: '赤壁东风',
    subtitle: '周瑜诸葛火攻 · 木生火连环',
    description:
      '【相生连环策】【燎原·焚尽】（木生火）引爆火海范围扩大 +60%，火海内敌军身上的【火·灼】与【木·毒】持续时间冻结不再衰减，全场攻速 +30%。',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    wuXingRequirement: ['wood', 'fire'],
    tags: ['木生火', '火海', '相生连环策'],
    effects: {
      attackSpeedBonus: 0.3,
      reactionDamageMultiplier: 0.5,
      specialId: 'aug_wind_fire'
    }
  },
  {
    id: 'aug_molten_core',
    name: '盘蛇焚藤',
    subtitle: '诸葛火烧藤甲兵 · 火生土连环',
    description:
      '【相生连环策】【熔岩·焦土】（火生土）持续时间延长至 6 秒，焦土内敌军额外承受 +30% 易伤，且阵亡时在原地二次喷发小型熔岩池，全军暴伤 +25%。',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    wuXingRequirement: ['fire', 'earth'],
    tags: ['火生土', '熔岩', '相生连环策'],
    effects: {
      reactionDamageMultiplier: 0.5,
      critDamageBonus: 0.25,
      vulnerabilityBonus: 0.15,
      specialId: 'aug_molten_core'
    }
  },
  {
    id: 'aug_sharp_edge',
    name: '暗渡陈仓',
    subtitle: '邓艾偷渡阴平 · 土生金连环',
    description:
      '【相生连环策】【淬刃·锋芒】（土生金）迸射的淬刃剑气数量由 3 道增至 6 道，且剑气暴击时可再次触发 1 次次级剑气弹射，相生反应增伤 +45%。',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    wuXingRequirement: ['earth', 'metal'],
    tags: ['土生金', '剑气', '相生连环策'],
    effects: {
      reactionDamageMultiplier: 0.45,
      critRateBonus: 0.1,
      specialId: 'aug_sharp_edge'
    }
  },
  {
    id: 'aug_ice_shatter',
    name: '渭水筑城',
    subtitle: '马超娄子伯筑冰城 · 金生水连环',
    description:
      '【相生连环策】【寒芒·碎冰】（金生水）冰封结束或冰雕被击碎时，向周围 110px 炸裂寒冰碎片，造成无视防御破冰伤害并挂满【水·湿】，反应增伤 +60%。',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    wuXingRequirement: ['metal', 'water'],
    tags: ['金生水', '碎冰', '相生连环策'],
    effects: {
      reactionDamageMultiplier: 0.6,
      specialId: 'aug_ice_shatter'
    }
  },
  {
    id: 'aug_iron_chain',
    name: '铁索横江',
    subtitle: '王濬破吴 · 水势连环异变',
    description:
      '【五行异变策】场上所有处于【水·湿】状态的敌军之间生成水墨铁索连线，任意一人受到元素伤害或控制时，其余连线目标同步承受 45% 传导伤害与同等控制。',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '五行异变策',
    wuXingRequirement: ['water'],
    tags: ['水·湿', '铁索传导', '五行异变策'],
    effects: {
      reactionDamageMultiplier: 0.4,
      damageIncreaseBonus: 0.2,
      specialId: 'aug_iron_chain'
    }
  },
  {
    id: 'aug_bowang_fire',
    name: '博望屯火',
    subtitle: '诸葛火烧博望 · 烈焰叠爆异变',
    description:
      '【五行异变策】【火·灼】状态不再随时间自然消失，且每叠加 3 次火系攻击额外引爆一次 150% 攻击力的【屯火轰燃】，全局增伤 +25%。',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '五行异变策',
    wuXingRequirement: ['fire'],
    tags: ['火·灼', '屯火轰燃', '五行异变策'],
    effects: {
      damageIncreaseBonus: 0.25,
      reactionDamageMultiplier: 0.35,
      specialId: 'aug_bowang_fire'
    }
  },
  {
    id: 'aug_five_cycle',
    name: '五气朝元',
    subtitle: '五行相生大循环 · 易伤破阵',
    description:
      '【相生连环策】五行流转：相生反应伤害提升 50%，且处于多重元素状态下的敌军受到易伤加成 +35%（严格归入易伤乘区加算，不另设独立乘区）。',
    rarity: 'epic',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    tags: ['五行', '易伤', '相生连环策'],
    effects: {
      reactionDamageMultiplier: 0.5,
      vulnerabilityBonus: 0.35,
      specialId: 'aug_five_cycle'
    }
  },
  {
    id: 'aug_bagua_miracle',
    name: '八门金锁',
    subtitle: '徐庶破曹仁 · 攻防逆转',
    description:
      '【攻防逆转策】每次触发五行相生反应时，除造成高额输出外，使目标在 4 秒内抗暴与防御减伤效果降低 40%，且对 Boss【五行铁壁】破除效率提升！',
    rarity: 'legendary',
    category: 'elemental',
    stratagemCategory: '攻防逆转策',
    wuXingRequirement: ['metal', 'earth'],
    tags: ['破壁', '减伤逆转', '攻防逆转策'],
    effects: {
      reactionDamageMultiplier: 0.65,
      attackPercentBonus: 0.2,
      vulnerabilityBonus: 0.2,
      specialId: 'aug_bagua_miracle'
    }
  },

  // ==================== 名将典故蜕变策（hero 共 5 卷） ====================
  {
    id: 'aug_guanyu_yanyu',
    name: '刮骨疗毒',
    subtitle: '关羽刮骨 · 五行异变策',
    description:
      '【五行异变策】【木·毒】可无限叠层（突破 3 层上限），对满层毒目标造成伤害时按毒层数削减其 15% 防御与韧性；关羽攻击范围 +35%，斩击附带潮湿与木毒双重侵蚀！',
    rarity: 'epic',
    category: 'hero',
    stratagemCategory: '五行异变策',
    heroRequirement: 'hero_guanyu',
    tags: ['关羽', '木·毒', '五行异变策'],
    effects: {
      attackRangeBonus: 35,
      attackPercentBonus: 0.25,
      vulnerabilityBonus: 0.15,
      specialId: 'aug_guanyu_yanyu'
    }
  },
  {
    id: 'aug_zhangfei_roar',
    name: '霸桥挑袍',
    subtitle: '张飞当阳怒吼 · 五行异变策',
    description:
      '【五行异变策】【土·重】的韧性与刚毅削减效果翻倍（各削减 -70%，受 40% 保底约束），且受暴击时触发的【负重内震】升级为半径 90px 范围震波；张飞攻击力 +30%。',
    rarity: 'epic',
    category: 'hero',
    stratagemCategory: '五行异变策',
    heroRequirement: 'hero_zhangfei',
    tags: ['张飞', '土·重', '五行异变策'],
    effects: {
      attackPercentBonus: 0.3,
      critDamageBonus: 0.25,
      specialId: 'aug_zhangfei_roar'
    }
  },
  {
    id: 'aug_zhaoyun_dragon',
    name: '长坂单骑',
    subtitle: '赵云单骑救主 · 攻防逆转策',
    description:
      '【攻防逆转策】全军超出 100% 的暴击率将全额转化为 2.5 倍暴击伤害，且每次暴击使自身主动战法冷却缩减 -0.5 秒；赵云攻速 +45%，普攻 25% 概率触发龙胆穿透。',
    rarity: 'epic',
    category: 'hero',
    stratagemCategory: '攻防逆转策',
    heroRequirement: 'hero_zhaoyun',
    tags: ['赵云', '暴击转化', '攻防逆转策'],
    effects: {
      attackSpeedBonus: 0.45,
      critRateBonus: 0.15,
      critDamageBonus: 0.35,
      specialId: 'aug_zhaoyun_dragon'
    }
  },
  {
    id: 'aug_huangzhong_bow',
    name: '定军斩渊',
    subtitle: '黄忠法正 · 攻防逆转策',
    description:
      '【攻防逆转策】全军攻击范围 +50px，且每额外拥有 10px 射程转化为 +8% 暴击伤害；对距离 >180px 的敌军无视其 35% 防御，黄忠普攻必带【火·灼】并引爆木毒！',
    rarity: 'epic',
    category: 'hero',
    stratagemCategory: '攻防逆转策',
    heroRequirement: 'hero_huangzhong',
    tags: ['黄忠', '射程转暴伤', '攻防逆转策'],
    effects: {
      attackRangeBonus: 50,
      attackPercentBonus: 0.25,
      critDamageBonus: 0.4,
      specialId: 'aug_huangzhong_bow'
    }
  },
  {
    id: 'aug_machao_cavalry',
    name: '潼关割袍',
    subtitle: '马超断袍 · 五行异变策',
    description:
      '【五行异变策】【金·裂】流血伤害由“仅移动时结算”升级为“无论移动或被定身/冰封每秒均高频结算 2 次”，破甲提升至 -45%；马超攻速 +30%，对【土·重】目标必爆飞刃！',
    rarity: 'epic',
    category: 'hero',
    stratagemCategory: '五行异变策',
    heroRequirement: 'hero_machao',
    tags: ['马超', '金·裂', '五行异变策'],
    effects: {
      attackSpeedBonus: 0.3,
      reactionDamageMultiplier: 0.4,
      vulnerabilityBonus: 0.15,
      specialId: 'aug_machao_cavalry'
    }
  },

  // ==================== 奇谋战法策 / 观星借天策 / 攻防逆转策（general 共 7 卷） ====================
  {
    id: 'aug_seven_captures',
    name: '七擒孟获',
    subtitle: '南中攻心 · 攻防逆转策',
    description:
      '【攻防逆转策】同一敌军每经历 1 次五行相生反应，其受到的最终伤害叠加 +12%（对 Boss 最高可叠至 +84% 易伤，归入易伤乘区加算）。',
    rarity: 'rare',
    category: 'general',
    stratagemCategory: '攻防逆转策',
    tags: ['易伤叠层', '破Boss', '攻防逆转策'],
    effects: {
      vulnerabilityBonus: 0.24,
      reactionDamageMultiplier: 0.3,
      specialId: 'aug_seven_captures'
    }
  },
  {
    id: 'aug_longzhong_plan',
    name: '隆中三分',
    subtitle: '诸葛草庐对策 · 奇谋战法策',
    description:
      '【奇谋战法策】当场上同时部署满 3 种不同五行属性的武将时，全军获得 +25% 攻击力、+20% 攻速，且所有相生反应内置冷却（ICD）由 1.5 秒缩短至 0.9 秒！',
    rarity: 'rare',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['三才阵容', 'ICD缩减', '奇谋战法策'],
    effects: {
      attackPercentBonus: 0.25,
      attackSpeedBonus: 0.2,
      specialId: 'aug_longzhong_plan'
    }
  },
  {
    id: 'aug_grass_boats',
    name: '草船借箭',
    subtitle: '大雾借箭 · 奇谋战法策',
    description:
      '【奇谋战法策】武将每次释放主动战法后，接下来 3 秒内普攻变为三连发齐射（每次造成 55% 伤害但独立判定五行元素附着），全体攻速 +25%。',
    rarity: 'common',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['战法联动', '高频附着', '奇谋战法策'],
    effects: {
      attackSpeedBonus: 0.25,
      specialId: 'aug_grass_boats'
    }
  },
  {
    id: 'aug_empty_city',
    name: '空城抚琴',
    subtitle: '西城退仲达 · 奇谋战法策',
    description:
      '【奇谋战法策】战场上每少部署 1 名武将（以满编 5 人计），在场武将获得 +22% 攻击力与 +18% 暴击率，且进入射程的敌军首秒陷入惊疑减速 40%。',
    rarity: 'rare',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['精兵孤军', '高额双暴', '奇谋战法策'],
    effects: {
      attackPercentBonus: 0.22,
      critRateBonus: 0.18,
      specialId: 'aug_empty_city'
    }
  },
  {
    id: 'aug_wooden_ox',
    name: '木牛流马',
    subtitle: '祁山运粮 · 奇谋战法策',
    description:
      '【奇谋战法策】每波开始时额外拨付 +10 军费，击杀军费获取 +35%；每持有 10 点未消耗的结余军费，全军五行相生反应伤害提升 +8%（最高 +40%）。',
    rarity: 'common',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['军费利息', '反应增伤', '奇谋战法策'],
    effects: {
      costGainBonus: 0.35,
      reactionDamageMultiplier: 0.24,
      specialId: 'aug_wooden_ox'
    }
  },
  {
    id: 'aug_wuzhangyuan_star',
    name: '五丈原祈星',
    subtitle: '诸葛禳星 · 观星借天策',
    description:
      '【观星借天策】当前天时的所有负面减益效果彻底反转，且天时正面增益倍率提升至 200%（例如梅雨连绵下水生木定身延长至 +2.4s，火系不再受减伤），帅营恢复 3 点生命。',
    rarity: 'epic',
    category: 'general',
    stratagemCategory: '观星借天策',
    tags: ['逆转天时', '正面翻倍', '观星借天策'],
    effects: {
      damageIncreaseBonus: 0.25,
      baseHealthHeal: 3,
      baseMaxHealthBonus: 5,
      specialId: 'aug_wuzhangyuan_star'
    }
  },
  {
    id: 'aug_celestial_tome',
    name: '奇门遁甲',
    subtitle: '左慈遁甲天书 · 观星借天策',
    description:
      '【观星借天策】立即获得 2 枚免费【易策令】且击杀军费 +40%；本局内同时激活【当前天时】与【下一顺位相生天时】的双重正面环境增益！',
    rarity: 'legendary',
    category: 'general',
    stratagemCategory: '观星借天策',
    tags: ['双天同降', '易策令', '观星借天策'],
    effects: {
      costGainBonus: 0.4,
      damageIncreaseBonus: 0.2,
      specialId: 'aug_celestial_tome'
    }
  },

  // ==================== 观星借天策 & 北伐高阶奇策（aug_endless_ 共 4 卷） ====================
  {
    id: 'aug_endless_wuxing_harmony',
    name: '望梅止渴',
    subtitle: '曹操行军 · 观星借天策',
    description:
      '【观星借天策】每当战场天时发生轮转，或每经过 3 波战斗，全军立即刷新所有主动战法冷却，并在接下来 10 秒内普攻 100% 必定附加五行元素状态！',
    rarity: 'legendary',
    category: 'elemental',
    stratagemCategory: '观星借天策',
    tags: ['天时轮转', '必挂五行', '观星借天策'],
    effects: {
      attackPercentBonus: 0.25,
      reactionDamageMultiplier: 0.5,
      specialId: 'aug_endless_wuxing_harmony'
    }
  },
  {
    id: 'aug_endless_ink_rain',
    name: '墨染山河',
    subtitle: '天工神策 · 奇谋战法策',
    description: '【奇谋战法策】天降墨雨：全队攻击速度提升 30%，全军射程额外提升 40px，160px 相生阵脉连线增伤再提升 +15%。',
    rarity: 'epic',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['射程', '攻速', '奇谋战法策'],
    effects: {
      attackSpeedBonus: 0.3,
      attackRangeBonus: 40,
      damageIncreaseBonus: 0.15,
      specialId: 'aug_endless_ink_rain'
    }
  },
  {
    id: 'aug_endless_sword_burst',
    name: '万剑归宗',
    subtitle: '剑荡八荒 · 攻防逆转策',
    description: '【攻防逆转策】千锋破甲：全体英雄攻击力提升 30%，暴击伤害提升 35%，对处于破甲或内震状态的敌军易伤 +25%。',
    rarity: 'legendary',
    category: 'general',
    stratagemCategory: '攻防逆转策',
    tags: ['暴伤', '易伤', '攻防逆转策'],
    effects: {
      attackPercentBonus: 0.3,
      critDamageBonus: 0.35,
      vulnerabilityBonus: 0.25,
      specialId: 'aug_endless_sword_burst'
    }
  },
  {
    id: 'aug_endless_iron_fortress',
    name: '百战玄甲',
    subtitle: '不动如山 · 奇谋战法策',
    description: '【奇谋战法策】金石为开：帅营最大生命提升 15 点，立即恢复 15 点生命，击杀敌人获得的军费额外提升 50%。',
    rarity: 'epic',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['帅营生命', '军费', '奇谋战法策'],
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
    stratagemCategory: '奇谋战法策',
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
    stratagemCategory: '奇谋战法策',
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
    stratagemCategory: '奇谋战法策',
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
    description: '军饷丰沛：击杀敌人获得的军费额外提升 25%（可多次选取叠加）。',
    rarity: 'common',
    category: 'general',
    stratagemCategory: '奇谋战法策',
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
    description: '术法通玄：五行相生连锁反应伤害额外提升 35%（可多次选取叠加）。',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
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
