import { Augment } from '@/types/augment'

/**
 * 军师锦囊（三国典故名策 · 无品质平权 · 五大策系）数据池
 * 严格遵循《Wuxing_System_Design.md》第七章：
 * 1. 【五行异变策】（改写 裂/毒/湿/灼/重 底层运作机制）：《潼关割袍》《刮骨疗毒》《铁索横江》《博望屯火》《霸桥挑袍》
 * 2. 【相生连环策】（反应后残留母气，构筑多米诺连环瞬爆）：《水淹七军》《赤壁东风》《盘蛇焚藤》《暗渡陈仓》《渭水筑城》《五气朝元》
 * 3. 【攻防逆转策】（剥夺/反转敌军五大属性 & 跨维转化）：《七擒孟获》《定军斩渊》《长坂单骑》《八门金锁》《万剑归宗》
 * 4. 【奇谋战法策】（重构主动战法形态与军令台循环）：《隆中三分》《草船借箭》《空城抚琴》《木牛流马》《墨染山河》《百战玄甲》
 * 5. 【观星借天策】（与第八章「天时气象」深度联动）：《五丈原祈星》《奇门遁甲》《望梅止渴》
 */
export const AUGMENT_POOL: Augment[] = [
  // ==================== 相生连环策 / 五行异变策 / 攻防逆转策（elemental 共 9 卷） ====================
  {
    id: 'aug_nourish_spread',
    name: '水淹七军',
    subtitle: '水生木（nourish）·【水木接火】',
    targetDimension: '水生木 (nourish)',
    historicalLore: '关羽决襄江之水淹没于禁七军，水木交融困死敌阵。',
    mechanismTitle: '【水木接火】',
    ruleBefore: '原规则：【水生木·滋养】造成 2.0s 藤蔓定身并向周围 90px 扩散 1 层【木·毒】。',
    ruleAfter: '改写后：定身与蔓延时范围扩大 +35%，结算后自动在目标及受传染敌军身上残留【木·毒】印记，下一发火系攻击无需铺垫直接引爆【木生火·燎原】！',
    synergyWeather: '【梅雨瘴林（木）】定身时长再 +1.0s，毒种传染倍增',
    counterBoss: '专克【威震逍遥·张辽】（弱点相生单次削 2 格铁壁并强制定身截停）与西凉轻骑',
    description:
      '【水木接火】：触发【水生木·滋养】定身时，藤蔓缠绕不仅范围扩大 35%，且在反应结算后自动在目标及受传染敌军身上残留【木·毒】印记，使下一发火系攻击无需铺垫即可直接引爆【木生火·燎原】！',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    wuXingRequirement: ['water', 'wood'],
    tags: ['水生木', '水木接火', '相生连环策'],
    effects: {
      attackPercentBonus: 0.15,
      reactionDamageMultiplier: 0.35,
      specialId: 'aug_nourish_spread'
    }
  },
  {
    id: 'aug_wind_fire',
    name: '赤壁东风',
    subtitle: '木生火（wildfire）·【木火接土】',
    targetDimension: '木生火 (wildfire)',
    historicalLore: '诸葛亮七星坛借东风，周瑜黄盖火烧赤壁曹军连营。',
    mechanismTitle: '【木火接土】',
    ruleBefore: '原规则：【木生火·燎原】引爆 1 层毒伤并造成 110px 范围烈焰轰炸。',
    ruleAfter: '改写后：【木生火·燎原】大爆炸后，漫天热浪自动为爆炸波及的所有敌军重新挂上【火·灼】印记，使土系攻击可紧接着无缝引爆【火生土·熔岩】！',
    synergyWeather: '【赤地焚风（火）】燎原爆炸范围与伤害再 +40%，清屏极致爽局',
    counterBoss: '专克【天公将军·张角】（弱点相生单次破 2 格铁壁，瞬间融化黄巾巨汉）',
    description:
      '【木火接土】：触发【木生火·燎原】大爆炸后，漫天热浪自动为爆炸波及的所有敌军重新挂上【火·灼】印记，使土系攻击可紧接着无缝引爆【火生土·熔岩】！',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    wuXingRequirement: ['wood', 'fire'],
    tags: ['木生火', '木火接土', '相生连环策'],
    effects: {
      attackSpeedBonus: 0.25,
      reactionDamageMultiplier: 0.45,
      specialId: 'aug_wind_fire'
    }
  },
  {
    id: 'aug_molten_core',
    name: '盘蛇焚藤',
    subtitle: '火生土（magma）·【火土接金】',
    targetDimension: '火生土 (magma)',
    historicalLore: '诸葛亮于盘蛇谷火烧兀突骨三万乌戈国藤甲兵，焦土绝谷。',
    mechanismTitle: '【火土接金】',
    ruleBefore: '原规则：【火生土·熔岩】生成 4.0s 熔岩焦土，削减区域内敌军 40% 韧性与 60% 刚毅。',
    ruleAfter: '改写后：焦土凝结为沉重矿脉，每 1.5s 自动为踩踏熔岩的敌军挂上【土·重】印记（削韧破刚），使金系攻击跟进时无缝触发【土生金·锋芒】打出满额破甲暴击！',
    synergyWeather: '【黄沙漫天（土）】熔岩焦土持续时间额外延长 +2.5s，内震伤翻倍',
    counterBoss: '专克【暴虐太师·董卓】（弱点相生单次破 2 格铁壁，瓦解西凉魔躯双抗暴）',
    description:
      '【火土接金】：触发【火生土·熔岩】时，地面焦土凝结为沉重矿脉，每 1.5s 自动为踩踏熔岩的敌军挂上【土·重】印记（削韧破刚），使金系攻击跟进时可无缝触发【土生金·锋芒】并打出满额破甲暴击！',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    wuXingRequirement: ['fire', 'earth'],
    tags: ['火生土', '火土接金', '相生连环策'],
    effects: {
      reactionDamageMultiplier: 0.45,
      critDamageBonus: 0.25,
      vulnerabilityBonus: 0.15,
      specialId: 'aug_molten_core'
    }
  },
  {
    id: 'aug_sharp_edge',
    name: '暗渡陈仓',
    subtitle: '土生金（spikes）·【土金接水】',
    targetDimension: '土生金 (spikes)',
    historicalLore: '蜀军明修栈道、暗渡陈仓，借山岳地势奇兵突袭金戈破阵。',
    mechanismTitle: '【土金接水】',
    ruleBefore: '原规则：【土生金·锋芒】迸射 3 枚淬金飞刃并立即结算 1 次流血真伤。',
    ruleAfter: '改写后：【土生金·锋芒】折射飞刃数量 +2（共 5 道），且飞刃命中周围敌军时必定为其挂上【金·裂】印记，水系跟进可瞬间连环引爆【金生水·碎冰】！',
    synergyWeather: '【朔风凛冽（金）】土生金飞刃数量再 +2，金裂破甲提升至 50%',
    counterBoss: '专克【无双飞将·吕布】（弱点相生单次破 2 格无双火罡盾，剑雨收割）',
    description:
      '【土金接水】：【土生金·锋芒】折射飞刃数量 +2，且飞刃命中周围敌军时必定为其挂上【金·裂】印记，使水系攻击跟进时可瞬间在敌群中连环引爆【金生水·碎冰】！',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    wuXingRequirement: ['earth', 'metal'],
    tags: ['土生金', '土金接水', '相生连环策'],
    effects: {
      reactionDamageMultiplier: 0.45,
      critRateBonus: 0.12,
      specialId: 'aug_sharp_edge'
    }
  },
  {
    id: 'aug_ice_shatter',
    name: '渭水筑城',
    subtitle: '金生水（shatter）·【金水接木】',
    targetDimension: '金生水 (shatter)',
    historicalLore: '曹操于渭水天寒之际泼水结冰筑起沙城，坚若玄铁寒冰。',
    mechanismTitle: '【金水接木】',
    ruleBefore: '原规则：【金生水·碎冰】造成无视防御破冰伤并触发 2.5s 绝对冰封。',
    ruleAfter: '改写后：触发【金生水·碎冰】冻结目标时，爆裂的冰晶寒气自动为周围 120 码内所有敌军挂上【水·湿】印记，木系跟进可立即引爆全场【水生木·滋养】！',
    synergyWeather: '【寒潮暴雪（水）】碎冰冰封时长 +1.0s，碎冰范围真伤 +45%',
    counterBoss: '专克【八门金锁·曹仁】（弱点相生无视 70% 高防单次破 2 格铁壁）与陷阵重甲兵',
    description:
      '【金水接木】：触发【金生水·碎冰】冻结目标时，爆裂的冰晶寒气自动为周围 120 码内所有敌军挂上【水·湿】印记，使木系攻击跟进时可立即引爆全场【水生木·滋养】！',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    wuXingRequirement: ['metal', 'water'],
    tags: ['金生水', '金水接木', '相生连环策'],
    effects: {
      reactionDamageMultiplier: 0.55,
      specialId: 'aug_ice_shatter'
    }
  },
  {
    id: 'aug_iron_chain',
    name: '铁索横江',
    subtitle: '【水·湿】异变 ·【寒水连索·群体共伤】',
    targetDimension: '【水·湿】 (wet)',
    historicalLore: '庞统献连环计，将曹军战船以铁索相连，一损俱损。',
    mechanismTitle: '【寒水连索·群体共伤】',
    ruleBefore: '原规则：【水·湿】作为唯一基础软控，仅使单体目标移动速度降低 35%。',
    ruleAfter: '改写后：全场上所有处于【水·湿】状态的敌军形成水脉连索——当任意一名【水·湿】敌军受到暴击或五行反应伤害时，周围 140 码内其他【水·湿】敌军同步承受 40% 传导真伤！',
    synergyWeather: '【寒潮暴雪（水）】水湿持续时间延长 +2.0s，减速达 45%，连索不断',
    counterBoss: '专克高移速群怪潮与二阶段召唤护卫的【张角 / 张辽】',
    description:
      '【寒水连索·群体共伤】：全场上所有处于【水·湿】状态的敌军形成水脉连索——当任意一名【水·湿】敌军受到暴击或五行反应伤害时，周围 140 码内所有其他【水·湿】敌军同步承受 40% 传导真实伤害！',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '五行异变策',
    wuXingRequirement: ['water'],
    tags: ['水·湿', '铁索共伤', '五行异变策'],
    effects: {
      reactionDamageMultiplier: 0.4,
      damageIncreaseBonus: 0.2,
      specialId: 'aug_iron_chain'
    }
  },
  {
    id: 'aug_bowang_fire',
    name: '博望屯火',
    subtitle: '【火·灼】异变 ·【无限叠火·高温融甲】',
    targetDimension: '【火·灼】 (burn)',
    historicalLore: '诸葛亮初出茅庐火烧博望坡，诱夏侯惇入窄道首尾难顾。',
    mechanismTitle: '【无限叠火·高温融甲】',
    ruleBefore: '原规则：【火·灼】单层每 0.5s 跳字造成 20% 攻击力火伤，不具备破甲能力。',
    ruleAfter: '改写后：【火·灼】突破单层限制，每次火系命中新增 1 层灼烧并刷新时间（上限 8 层）；当灼烧达到 4 层及以上时，高温直接融化目标 40% 防御（受 40% 保底约束）！',
    synergyWeather: '【赤地焚风（火）】火灼跳字频率加快 35%，阵亡爆燃伤害 +60%',
    counterBoss: '专克高护甲【曹仁】与密集冲阵的藤甲巨汉、先登死士',
    description:
      '【无限叠火·高温融甲】：【火·灼】突破单层限制，变为可叠加层数（每次火系命中新增 1 层灼烧并刷新持续时间，上限 8 层）；当灼烧达到 4 层及以上时，高温直接融化目标 40% 防御。',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '五行异变策',
    wuXingRequirement: ['fire'],
    tags: ['火·灼', '高温融甲', '五行异变策'],
    effects: {
      damageIncreaseBonus: 0.25,
      reactionDamageMultiplier: 0.35,
      specialId: 'aug_bowang_fire'
    }
  },
  {
    id: 'aug_five_cycle',
    name: '五气朝元',
    subtitle: '五行大循环 ·【多重状态易伤】',
    targetDimension: '五毒俱全 · 伤害加深',
    historicalLore: '三军五行阵脉周流不息，裂毒湿灼重五气齐聚，万法皆破。',
    mechanismTitle: '【五气朝元·易伤破阵】',
    ruleBefore: '原规则：五种基础状态各自独立提供破甲/腐蚀/减速/火伤/破韧刚，不直接叠加通用易伤。',
    ruleAfter: '改写后：目标身上每存在 1 种基础五行状态（裂/毒/湿/灼/重），受到的所有伤害提升 +15%（五气齐聚最高 +75%），且相生反应伤害提升 +50%！',
    synergyWeather: '全天候通用，尤其契合 Wave 11~15【晴空朗日】五虎齐聚决战',
    counterBoss: '专克五维全能终极统帅【无双飞将·吕布】',
    description:
      '【五气朝元】：敌军身上每存在 1 种基础元素状态（裂/毒/湿/灼/重），受到的所有伤害提升 +15%（五气齐聚最高 +75%），且相生反应伤害提升 +50%。',
    rarity: 'epic',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    tags: ['五行流转', '伤害加深', '相生连环策'],
    effects: {
      reactionDamageMultiplier: 0.5,
      vulnerabilityBonus: 0.35,
      specialId: 'aug_five_cycle'
    }
  },
  {
    id: 'aug_bagua_miracle',
    name: '八门金锁',
    subtitle: '破盾剥夺属性 ·【破阵瓦解】',
    targetDimension: '破盾剥夺属性',
    historicalLore: '徐庶识破曹仁八门金锁阵，指点赵云从生门入、景门出破阵。',
    mechanismTitle: '【破阵瓦解】',
    ruleBefore: '原规则：击碎统帅 Boss【五行铁壁】时造成 1.5s 眩晕、5s 易伤 +50% 并充能 35% 军令。',
    ruleAfter: '改写后：当精英或首领的【五行铁壁】被相生反应震碎时，触发【八门崩解】——削夺该敌军 40% 的防御、韧性与刚毅（不低于下限保底 40%），并立即重置在场所有武将的主动战法冷却！',
    synergyWeather: '配合 160px 相生阵脉（破壁效率 +35%）与 4★ 将星（破壁 1.5x）极速碎盾',
    counterBoss: '通杀五大统帅 Boss（破盾瞬间全军战法刷新，一套齐射直接蒸发二阶段）',
    description:
      '【破阵瓦解】：当精英或首领敌军的【铁壁】护盾被五行相生反应震碎时，触发【八门崩解】——削夺该敌军 40% 的防御、韧性与刚毅（不低于下限保底 40%），并立即重置在场所有武将的主动战法冷却！',
    rarity: 'legendary',
    category: 'elemental',
    stratagemCategory: '攻防逆转策',
    wuXingRequirement: ['metal', 'earth'],
    tags: ['破壁重置CD', '剥夺三抗', '攻防逆转策'],
    effects: {
      reactionDamageMultiplier: 0.5,
      attackPercentBonus: 0.2,
      vulnerabilityBonus: 0.25,
      specialId: 'aug_bagua_miracle'
    }
  },

  // ==================== 五虎典故机制改造策（hero 共 5 卷） ====================
  {
    id: 'aug_guanyu_yanyu',
    name: '刮骨疗毒',
    subtitle: '【木·毒】异变 ·【满层毒爆·回血反转】',
    targetDimension: '【木·毒】 (parasite)',
    historicalLore: '关羽樊城中矢毒入骨髓，华佗刮骨去毒而饮酒弈棋自若。',
    mechanismTitle: '【满层毒爆·回血反转】',
    ruleBefore: '原规则：【木·毒】最多叠 3 层（每层每秒 2.0% 最大生命腐蚀）并降低目标 50% 回血效果。',
    ruleAfter: '改写后：【木·毒】叠满 3 层时立即引爆一次【蚀骨毒爆】（瞬间结算剩余全部最大生命百分比毒伤），并将敌军的一切回血/受疗效果 100% 反转为等额真实毒伤！',
    synergyWeather: '天克【梅雨瘴林（木）】（敌军每秒 1% 最大生命回血直接变成每秒自杀毒伤）',
    counterBoss: '天克【天公将军·张角】（一阶段太平符水 8% 回血与二阶段持续回血全额反转为毒爆）',
    description:
      '【满层毒爆·回血反转】：【木·毒】叠满 3 层时立即引爆一次【蚀骨毒爆】（瞬间结算剩余全部最大生命百分比毒伤），并将敌军的一切回血/受疗效果 100% 反转为等额真实毒伤（天克【梅雨瘴林】回血怪）！',
    rarity: 'epic',
    category: 'hero',
    stratagemCategory: '五行异变策',
    heroRequirement: 'hero_guanyu',
    wuXingRequirement: ['wood'],
    tags: ['木·毒', '回血反转', '五行异变策'],
    effects: {
      attackRangeBonus: 35,
      attackPercentBonus: 0.25,
      vulnerabilityBonus: 0.2,
      specialId: 'aug_guanyu_yanyu'
    }
  },
  {
    id: 'aug_zhangfei_roar',
    name: '霸桥挑袍',
    subtitle: '【土·重】异变 ·【破架透骨·共振传伤】',
    targetDimension: '【土·重】 (heavy)',
    historicalLore: '曹操于霸陵桥送别，关羽立马桥上刀挑锦袍，重若泰山。',
    mechanismTitle: '【破架透骨·共振传伤】',
    ruleBefore: '原规则：【土·重】削减敌军 25% 韧性与 40% 刚毅，受暴击时触发单体 20% 负重内震伤。',
    ruleAfter: '改写后：【土·重】削韧破刚效率提升 +50%（受 40% 保底约束）；当敌军刚毅被削至保底下限时触发【透骨】使我方对其暴伤 +35%，且【负重内震】向周围 120 码敌军共振扩散！',
    synergyWeather: '【黄沙漫天（土）】将沙暴敌军 +30% 韧性/+40% 刚毅瞬间压至 40% 保底下限',
    counterBoss: '专克【暴虐太师·董卓】（120% 刚毅与 80% 韧性被直接压穿触发透骨内震）與虎豹铁骑',
    description:
      '【破架透骨·共振传伤】：【土·重】对敌军韧性与刚毅的削减效率提升 +50%（生效值受 40% 底线保底约束）；当敌军刚毅被削至保底下限时，触发【透骨】效果，使我方对其暴击伤害额外 +35%，且【负重内震】伤害向周围 120 码敌军共振扩散！',
    rarity: 'epic',
    category: 'hero',
    stratagemCategory: '五行异变策',
    heroRequirement: 'hero_zhangfei',
    wuXingRequirement: ['earth'],
    tags: ['土·重', '破架透骨', '五行异变策'],
    effects: {
      attackPercentBonus: 0.25,
      damageIncreaseBonus: 0.35,
      critDamageBonus: 0.25,
      specialId: 'aug_zhangfei_roar'
    }
  },
  {
    id: 'aug_zhaoyun_dragon',
    name: '长坂单骑',
    subtitle: '惩罚敌军移速 ·【以快打快】',
    targetDimension: '惩罚敌军移速 & 攻速转攻',
    historicalLore: '赵云于长坂坡百万曹军中七进七出，敌军追袭越急死伤越惨。',
    mechanismTitle: '【以快打快】',
    ruleBefore: '原规则：高移速敌军（西凉轻骑/张辽）极易趁战法间隙冲穿防线，我方攻速仅提升攻击频率。',
    ruleAfter: '改写后：敌军移动速度越快，受到的我方伤害越高（敌军移速每提升 10%，受击伤害加深 15%）；同时我方武将每 10% 攻击速度加成，同步提供 15% 攻击力加成！',
    synergyWeather: '【朔风凛冽（金）】（敌军移速 +25%、我方攻速 +15%，双向吃满红利）',
    counterBoss: '天克【威震逍遥·张辽】（白狼急袭 +50% 移速与八百破十万直接转化为巨额受击易伤）',
    description:
      '【以快打快】：敌军移动速度越快，受到的我方伤害越高（敌军移速每提升 10%，受击伤害加深 15%）；同时我方武将每 10% 攻击速度加成，同步提供 15% 攻击力加成。',
    rarity: 'epic',
    category: 'hero',
    stratagemCategory: '攻防逆转策',
    heroRequirement: 'hero_zhaoyun',
    wuXingRequirement: ['water'],
    tags: ['以快打快', '攻速转攻', '攻防逆转策'],
    effects: {
      attackSpeedBonus: 0.3,
      attackPercentBonus: 0.3,
      vulnerabilityBonus: 0.2,
      specialId: 'aug_zhaoyun_dragon'
    }
  },
  {
    id: 'aug_huangzhong_bow',
    name: '定军斩渊',
    subtitle: '射程转破甲 ·【居高破甲】',
    targetDimension: '射程转破甲 & 暴伤',
    historicalLore: '黄忠于定军山占山夺势居高临下，一刀连头带甲劈斩夏侯渊。',
    mechanismTitle: '【居高破甲】',
    ruleBefore: '原规则：攻击范围（range）仅决定索敌半径，对高防御重甲敌军无额外穿甲收益。',
    ruleAfter: '改写后：我方武将每拥有超出 120 码的攻击范围，每 10 码自动转化为 4% 无视敌军防御穿透率与 6% 暴击伤害；对防御高于 50 的重甲敌军伤害额外 +30%！',
    synergyWeather: '【梅雨瘴林（木）】我方全员攻击范围 +15%，自动折算高额穿甲与暴伤',
    counterBoss: '专克【八门金锁·曹仁】与【陷阵重甲兵 / 先登死士】',
    description:
      '【居高破甲】：我方武将每拥有超出 120 码的攻击范围（射程），每 10 码自动转化为 4% 无视敌军防御穿透率与 6% 暴击伤害；对防御高于 50 的重甲敌军伤害额外 +30%。',
    rarity: 'epic',
    category: 'hero',
    stratagemCategory: '攻防逆转策',
    heroRequirement: 'hero_huangzhong',
    wuXingRequirement: ['fire'],
    tags: ['射程转破甲', '重甲克星', '攻防逆转策'],
    effects: {
      attackRangeBonus: 40,
      damageIncreaseBonus: 0.3,
      critDamageBonus: 0.36,
      specialId: 'aug_huangzhong_bow'
    }
  },
  {
    id: 'aug_machao_cavalry',
    name: '潼关割袍',
    subtitle: '【金·裂】异变 ·【痛点破除·静亦流血】',
    targetDimension: '【金·裂】 (bleed)',
    historicalLore: '马超于潼关杀得曹操割须弃袍，惶恐奔命，寸步皆血。',
    mechanismTitle: '【痛点破除·静亦流血】',
    ruleBefore: '原规则：【金·裂】削减 35% 防御，但目标被冰封或定身静止时，流血真伤减半。',
    ruleAfter: '改写后：打破“静止流血减半”痛点！处于【金·裂】的敌军即使被冰封或定身静止，依然按高速移动状态全额结算流血撕裂真伤；且敌军每损失 10% 生命，【金·裂】破甲额外加深 5%！',
    synergyWeather: '【寒潮暴雪（水）】与【朔风凛冽（金）】，完美解决金生水冰封后不流血的矛盾',
    counterBoss: '专克【八门金锁·曹仁】（金生水绝对冰封期间依然全额跳动高额流血真伤）',
    description:
      '【痛点破除·静亦流血】：打破“静止不流血”限制！处于【金·裂】的敌军即使被冰封或定身静止，依然按高速移动状态全额结算流血撕裂真伤；且敌军每损失 10% 生命，【金·裂】破甲额外加深 5%。',
    rarity: 'epic',
    category: 'hero',
    stratagemCategory: '五行异变策',
    heroRequirement: 'hero_machao',
    wuXingRequirement: ['metal'],
    tags: ['金·裂', '静亦流血', '五行异变策'],
    effects: {
      attackSpeedBonus: 0.25,
      reactionDamageMultiplier: 0.35,
      vulnerabilityBonus: 0.18,
      specialId: 'aug_machao_cavalry'
    }
  },

  // ==================== 攻防逆转策 / 奇谋战法策 / 观星借天策（general 共 7 卷） ====================
  {
    id: 'aug_seven_captures',
    name: '七擒孟获',
    subtitle: '逆转韧性/刚毅 ·【抗暴反转】',
    targetDimension: '逆转韧性/刚毅',
    historicalLore: '诸葛亮深入南蛮七擒七纵孟获，彻底瓦解敌军心防与斗志。',
    mechanismTitle: '【抗暴反转】',
    ruleBefore: '原规则：敌军【韧性】抵消我方暴击率，敌军【刚毅】抵消我方暴击伤害。',
    ruleAfter: '改写后：彻底瓦解敌军抗暴防线——我方攻击时，直接将目标敌军 100% 的【韧性】反转为我方本次攻击的额外暴击几率，将敌军 100% 的【刚毅】反转为我方额外暴击伤害！',
    synergyWeather: '【黄沙漫天（土）】（敌军 +30% 韧性/+40% 刚毅）与【梅雨瘴林（木）】（敌军 +25% 韧性）',
    counterBoss: '天克【暴虐太师·董卓】（80% 韧性 + 120% 刚毅反转为刀刀必暴与毁天灭地暴伤）与太平妖术师',
    description:
      '【抗暴反转】：彻底瓦解敌军抗暴防线——我方攻击时，直接将目标敌军 100% 的【韧性】反转为我方本次攻击的额外暴击几率，将敌军 100% 的【刚毅】反转为我方额外暴击伤害（敌军越抗暴，被暴击得越惨）！',
    rarity: 'rare',
    category: 'general',
    stratagemCategory: '攻防逆转策',
    tags: ['抗暴反转', '韧刚化暴', '攻防逆转策'],
    effects: {
      critRateBonus: 0.2,
      critDamageBonus: 0.4,
      vulnerabilityBonus: 0.2,
      specialId: 'aug_seven_captures'
    }
  },
  {
    id: 'aug_longzhong_plan',
    name: '隆中三分',
    subtitle: '双将协同放招 ·【相生合击】',
    targetDimension: '双将协同放招',
    historicalLore: '诸葛亮未出茅庐定三分天下之计，荆益两路首尾呼应。',
    mechanismTitle: '【相生合击】',
    ruleBefore: '原规则：每位武将的主动战法各自按独立 CD（6~10s）释放，无跨将连携释放。',
    ruleAfter: '改写后：当任意武将释放主动战法时，场上与其存在「五行相生关系」的另一名武将（如木系关羽放招时，水系赵云或火系黄忠），有 60% 概率立即零冷却协同释放一次主动战法！',
    synergyWeather: '全天时适用，配合 160px【五行相生阵脉连线】瞬间双大招接力引爆相生',
    counterBoss: '五大统帅破壁窗口期爆发神器，双人合击瞬间倾泻成吨技能伤害',
    description:
      '【相生合击】：当任意武将释放主动战法时，场上与其存在「五行相生关系」的另一名武将（如木系关羽放招时，水系赵云或火系黄忠），有 60% 概率立即零冷却协同释放一次主动战法！',
    rarity: 'rare',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['相生合击', '零CD连携', '奇谋战法策'],
    effects: {
      attackPercentBonus: 0.2,
      attackSpeedBonus: 0.2,
      specialId: 'aug_longzhong_plan'
    }
  },
  {
    id: 'aug_grass_boats',
    name: '草船借箭',
    subtitle: '反应刷CD与军令 ·【借势充能】',
    targetDimension: '反应刷CD与军令',
    historicalLore: '诸葛亮趁江面大雾草船诱曹军万箭齐发，化敌之力为己用。',
    mechanismTitle: '【借势充能】',
    ruleBefore: '原规则：主动战法仅靠时间自然冷却，军令台主要靠击杀敌军与破壁充能。',
    ruleAfter: '改写后：每次在战场上成功引爆任意五行相生反应，全军武将的主动战法剩余冷却时间直接缩减 1.2s，且【军令台】立即获得额外军令能量充能！',
    synergyWeather: '高频相生阵脉局核心引擎，反应越多→战法越快→军令三选一越频繁',
    counterBoss: '持久战面对高血量【张角 / 董卓 / 吕布】时实现全队无限火力循环',
    description:
      '【借势充能】：每次在战场上成功引爆任意五行相生反应，全军武将的主动战法剩余冷却时间直接缩减 1.2s，且【军令台】立即获得额外军令能量充能！',
    rarity: 'common',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['反应缩CD', '军令充能', '奇谋战法策'],
    effects: {
      attackSpeedBonus: 0.22,
      reactionDamageMultiplier: 0.25,
      specialId: 'aug_grass_boats'
    }
  },
  {
    id: 'aug_empty_city',
    name: '空城抚琴',
    subtitle: '蓄势重击定乾坤 ·【静极思动】',
    targetDimension: '蓄势重击定乾坤',
    historicalLore: '诸葛亮于西城大开城门焚香操琴，司马懿疑有伏兵骇然退兵。',
    mechanismTitle: '【静极思动】',
    ruleBefore: '原规则：基础五行元素附着时长固定为 2.5s，主动战法按基准范围结算。',
    ruleAfter: '改写后：我方武将普攻攻速降低 20%，但主动战法伤害与覆盖范围提升 55%，且施加的所有元素状态（裂/毒/湿/灼/重）持续时间延长 45%（由 2.5s 延至 3.6s）！',
    synergyWeather: '配合 160px 相生阵脉（衰减减缓 30%），元素状态超长待机绝不断档',
    counterBoss: '重炮流关羽/黄忠/张飞核心策，一发大招覆盖大半张地图',
    description:
      '【静极思动】：我方武将普攻攻速降低 20%，但主动战法伤害与覆盖范围提升 55%，且施加的所有元素状态（裂/毒/湿/灼/重）持续时间延长 45%。',
    rarity: 'rare',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['战法巨幅增伤', '状态延长时间', '奇谋战法策'],
    effects: {
      damageIncreaseBonus: 0.35,
      attackRangeBonus: 35,
      critRateBonus: 0.15,
      specialId: 'aug_empty_city'
    }
  },
  {
    id: 'aug_wooden_ox',
    name: '木牛流马',
    subtitle: '易策令与蓄势 ·【军资不绝】',
    targetDimension: '易策令与蓄势',
    historicalLore: '诸葛亮北伐出祁山造木牛流马，粮草军令源源不绝。',
    mechanismTitle: '【军资不绝】',
    ruleBefore: '原规则：每局初始仅附带 2 枚免费【易策令】，换牌本身不提供面板成长。',
    ruleAfter: '改写后：立即获得 2 枚【易策令】；此后每当玩家在三选一中使用【易策令】换牌时，全军武将获得 +3% 攻击力与 +3% 攻击速度（最多叠 5 次至 +15%），军费获取 +30%！',
    synergyWeather: '全天候发育神策，确保 5 次关键节点必抽到核心流派天命卡',
    counterBoss: '提供充沛军费快速集齐五虎上将全员登场，稳固全线阵脉',
    description:
      '【军资不绝】：立即获得 2 枚【易策令】；此后每当玩家在三选一中使用【易策令】换牌时，全军武将获得 +3% 攻击力与 +3% 攻击速度（单局最多累计 5 次叠加至 +15%）。',
    rarity: 'common',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['易策令+2', '换牌叠攻速', '奇谋战法策'],
    effects: {
      costGainBonus: 0.3,
      attackPercentBonus: 0.15,
      attackSpeedBonus: 0.15,
      specialId: 'aug_wooden_ox'
    }
  },
  {
    id: 'aug_wuzhangyuan_star',
    name: '五丈原祈星',
    subtitle: '逆转天时负面 ·【逆天改命】',
    targetDimension: '逆转天时负面',
    historicalLore: '诸葛亮于五丈原帐中设七星灯步罡踏斗，祈禳北斗逆天改命。',
    mechanismTitle: '【逆天改命】',
    ruleBefore: '原规则：天时气象为双刃剑（如寒潮暴雪使我方攻速 -15%，黄沙漫天是我方射程 -20%）。',
    ruleAfter: '改写后：我方全员完全免疫【天时气象】带来的一切负面削减，并将其反转为等额的正面加成；同时天时对我方有利属性的增幅额外提升 50%！',
    synergyWeather: '【寒潮暴雪（水）】（攻速由 -15% 变 +15%）与【黄沙漫天（土）】（射程由 -20% 变 +20%）',
    counterBoss: '化天灾为神助，在恶劣天时与 Wave 26+【二重烽火·双象疾电】下战力飙升',
    description:
      '【逆天改命】：我方全员完全免疫【天时气象】带来的一切负面削减（如暴雪减攻速、黄沙减射程），并将其反转为等额的正面加成；同时天时对我方有利属性的增幅额外提升 50%！',
    rarity: 'epic',
    category: 'general',
    stratagemCategory: '观星借天策',
    tags: ['逆转天时负面', '顺天增幅+50%', '观星借天策'],
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
    subtitle: '双天时并存 ·【双象合璧】',
    targetDimension: '双天时并存',
    historicalLore: '诸葛亮精研奇门遁甲八阵图，呼风唤雨借天地之力破敌。',
    mechanismTitle: '【双象合璧】',
    ruleBefore: '原规则：同一波次仅生效【当前天时】，顶部【观星台】的下一阶段天时仅供预告参考。',
    ruleAfter: '改写后：打破单一气象限制——使【当前天时】与顶部【观星台】预告的【下一阶段天时】的我方顺天增益效果同时并存生效（我方享双倍天时红利，敌军仅受当前单一气象影响），并获 2 枚易策令！',
    synergyWeather: '当【当前天时】与【预告天时】恰为五行相生（如水雪+木雨、木雨+火风）时威力绝伦',
    counterBoss: '跨天时享受双重属性与相生反应加成，轻松碾压中期与关底统帅',
    description:
      '【双象合璧】：打破单一气象限制——使【当前天时】与顶部【观星台】预告的【下一阶段天时】的我方顺天增益效果同时并存生效（我方享双倍天时红利，敌军仅受当前单一气象影响）！',
    rarity: 'legendary',
    category: 'general',
    stratagemCategory: '观星借天策',
    tags: ['双象合璧', '观星借天', '观星借天策'],
    effects: {
      costGainBonus: 0.35,
      damageIncreaseBonus: 0.25,
      specialId: 'aug_celestial_tome'
    }
  },

  // ==================== 观星借天策 & 北伐高阶奇策（aug_endless_ 共 4 卷） ====================
  {
    id: 'aug_endless_wuxing_harmony',
    name: '望梅止渴',
    subtitle: '天时轮转爆发 ·【应天振军】',
    targetDimension: '天时轮转爆发',
    historicalLore: '曹操行军酷暑缺水，指前方梅林振奋三军将士死战之心。',
    mechanismTitle: '【应天振军】',
    ruleBefore: '原规则：天时每 5 波自动演替，武将普攻按各自星级（25%~80%）概率附着五行。',
    ruleAfter: '改写后：每次战场【天时气象】发生轮转（每 5 波）时，立即为【军令台】灌注 60% 军令能量，并在接下来 20 秒内使全军普攻 100% 必定附着当前天时对应五行的基础元素状态！',
    synergyWeather: 'Wave 6 与 Wave 11 天时切换瞬间触发全军满附着狂潮，直取统帅首级',
    counterBoss: '统帅登场波次全军 100% 元素附着，配合相生阵脉光速轰碎五行铁壁',
    description:
      '【应天振军】：每次战场【天时气象】发生轮转（每 5 波）时，立即为【军令台】灌注 60% 军令能量，并在接下来 20 秒内使全军普攻必定附着当前天时对应五行的基础元素状态！',
    rarity: 'legendary',
    category: 'elemental',
    stratagemCategory: '观星借天策',
    tags: ['天时轮转爆发', '必挂五行', '观星借天策'],
    effects: {
      attackPercentBonus: 0.25,
      reactionDamageMultiplier: 0.5,
      specialId: 'aug_endless_wuxing_harmony'
    }
  },
  {
    id: 'aug_endless_ink_rain',
    name: '墨染山河',
    subtitle: '阵脉扩域共鸣 ·【相生阵脉强化】',
    targetDimension: '160px 相生阵脉增幅',
    historicalLore: '武侯八阵图借山川水墨地脉结阵，阵内刀兵呼应如臂使指。',
    mechanismTitle: '【阵脉扩域·交叠增伤】',
    ruleBefore: '原规则：160px 相生阵脉连线提供射程交叠区 +35% 相生反应伤害与破壁效率。',
    ruleAfter: '改写后：全队攻击速度 +30%、射程 +40px（大幅扩大双将射程交叠区），且 160px 相生阵脉连线伤害再额外提升 +15%！',
    synergyWeather: '完美弥补【黄沙漫天（土）】（射程 -20%）与【寒潮暴雪（水）】（攻速 -15%）短板',
    counterBoss: '无尽北伐 Wave 16+【一重烽火·八门重锁】多环相生交替破壁核心卡',
    description:
      '【阵脉扩域】：天降墨雨，全队攻击速度提升 30%，全军射程额外提升 40px（大幅扩展双将交叠火网），160px 相生阵脉连线伤害再提升 +15%。',
    rarity: 'epic',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['阵脉强化', '射程攻速', '奇谋战法策'],
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
    subtitle: '破甲内震追击 ·【千锋诛心】',
    targetDimension: '破甲/内震伤害加深',
    historicalLore: '西凉铁骑与蜀汉锐士万刃齐发，顺敌军护甲裂隙直刺命门。',
    mechanismTitle: '【千锋诛心·破底易伤】',
    ruleBefore: '原规则：敌军防御、韧性、刚毅削减受 40% 保底下限约束。',
    ruleAfter: '改写后：全体武将攻击力 +30%、暴击伤害 +35%；当敌军处于【金·裂】破甲或【土·重】削韧破刚状态时，受到的伤害额外提升 +25%！',
    synergyWeather: '【朔风凛冽（金）】与【黄沙漫天（土）】物理暴击流终极收割策',
    counterBoss: '专克无尽北伐高波次【曹仁 / 董卓 / 吕布】厚甲高刚毅首领',
    description:
      '【千锋诛心】：全体武将攻击力提升 30%，暴击伤害提升 35%，对处于【金·裂】破甲或【土·重】内震状态的敌军伤害额外 +25%。',
    rarity: 'legendary',
    category: 'general',
    stratagemCategory: '攻防逆转策',
    tags: ['暴伤易伤', '裂重追击', '攻防逆转策'],
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
    subtitle: '帅营坚壁清野 ·【金城汤池】',
    targetDimension: '帅营生命 & 军费收益',
    historicalLore: '孔明筑汉中诸围坚壁清野，大营稳若泰山而军资充盈。',
    mechanismTitle: '【金城汤池·军饷倍增】',
    ruleBefore: '原规则：普通怪突破扣 1 血、精英扣 3 血，军费按基础赏银发放。',
    ruleAfter: '改写后：帅营最大生命上限提升 +15 点并立即恢复 15 点生命，且击杀敌军获得的军费赏银额外提升 +50%！',
    synergyWeather: '高压波次容错护身符，防止西凉轻骑漏怪导致大营告急',
    counterBoss: '为迎战关底统帅提供充足容错血量与部署全员五虎的充沛军费',
    description:
      '【金城汤池】：帅营最大生命提升 15 点，立即恢复 15 点生命，击杀敌人获得的军费额外提升 50%。',
    rarity: 'epic',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    tags: ['帅营坚壁', '军费+50%', '奇谋战法策'],
    effects: {
      baseMaxHealthBonus: 15,
      baseHealthHeal: 15,
      costGainBonus: 0.5,
      specialId: 'aug_endless_iron_fortress'
    }
  }
]

/**
 * 无尽精进锦囊（可无限次重复抽取与叠加，保证无尽北伐 Wave 16+ 锦囊池永不枯竭）
 */
export const REPEATABLE_AUGMENTS: Augment[] = [
  {
    id: 'aug_repeat_attack',
    name: '破军军威',
    subtitle: '无尽精进 ·【全军锻力】',
    targetDimension: '全军攻击力 (+12%/次)',
    historicalLore: '三军擂鼓进军，百战精锐锋芒愈盛。',
    mechanismTitle: '【全军精进·锻力】',
    ruleBefore: '唯一典故锦囊全部修得后，无尽北伐仍可通过军令台继续抽策。',
    ruleAfter: '每次选取使全军武将攻击力永久累加 +12%（可无限叠加）。',
    synergyWeather: '全天时适用',
    counterBoss: '无尽烽火 Wave 16+ 持续提升基础火力',
    description: '【无尽精进·攻】军心大振：全体武将攻击力额外提升 +12%（可无限次选取叠加）。',
    rarity: 'common',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    repeatable: true,
    tags: ['攻击提升', '无限精进'],
    effects: {
      attackPercentBonus: 0.12
    }
  },
  {
    id: 'aug_repeat_speed',
    name: '疾风军威',
    subtitle: '无尽精进 ·【高频附着】',
    targetDimension: '攻击速度 (+15%/次)',
    historicalLore: '兵贵神速，万弩齐发不绝如缕。',
    mechanismTitle: '【全军精进·疾风】',
    ruleBefore: '普攻频率决定本命五行元素（裂/毒/湿/灼/重）的挂印效率。',
    ruleAfter: '每次选取使全军武将攻击速度永久累加 +15%，大幅加快五行附着与相生触发频率。',
    synergyWeather: '配合《长坂单骑》可同步将攻速转化为高额攻击力',
    counterBoss: '高频挂元素快速削减无尽 Boss 多格五行铁壁',
    description: '【无尽精进·速】兵贵神速：全体武将攻击速度额外提升 +15%（加快五行元素附着频率，可无限次选取叠加）。',
    rarity: 'common',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    repeatable: true,
    tags: ['攻速精进', '高频挂印'],
    effects: {
      attackSpeedBonus: 0.15
    }
  },
  {
    id: 'aug_repeat_heal',
    name: '仁德军威',
    subtitle: '无尽精进 ·【固本培元】',
    targetDimension: '帅营城防 (+4恢复/+5上限)',
    historicalLore: '昭烈帝仁德爱民，军民一心守御坚城。',
    mechanismTitle: '【全军精进·固守】',
    ruleBefore: '普通怪突破扣 1 血，精英突破扣 3 血。',
    ruleAfter: '每次选取立即恢复帅营 4 点生命值，并使帅营最大生命上限永久 +5。',
    synergyWeather: '无尽深渊高压波次续航保障',
    counterBoss: '提升防线容错（注意：统帅 Boss 突破仍会即刻判负，需集火斩将）',
    description: '【无尽精进·生】休养生息：帅营立即恢复 4 点生命值，且最大生命上限 +5（可无限次选取叠加）。',
    rarity: 'common',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    repeatable: true,
    tags: ['帅营续航', '生命上限'],
    effects: {
      baseHealthHeal: 4,
      baseMaxHealthBonus: 5
    }
  },
  {
    id: 'aug_repeat_cost',
    name: '粮草军威',
    subtitle: '无尽精进 ·【兵马未动粮草先行】',
    targetDimension: '军费获取 (+25%/次)',
    historicalLore: '蜀道粮运畅通，前线将士赏银丰厚。',
    mechanismTitle: '【全军精进·丰稔】',
    ruleBefore: '击杀敌军掉落固定军费用于部署武将。',
    ruleAfter: '每次选取使击杀敌军获得的军费赏银额外提升 +25%（可无限次选取叠加）。',
    synergyWeather: '配合《木牛流马》可快速积累军费收益',
    counterBoss: '迅速攒够全员五虎上将部署军费',
    description: '【无尽精进·财】军饷丰沛：击杀敌人获得的军费额外提升 +25%（可无限次选取叠加）。',
    rarity: 'common',
    category: 'general',
    stratagemCategory: '奇谋战法策',
    repeatable: true,
    tags: ['军费收益', '无限精进'],
    effects: {
      costGainBonus: 0.25
    }
  },
  {
    id: 'aug_repeat_reaction',
    name: '五行共鸣',
    subtitle: '无尽精进 ·【相生强化】',
    targetDimension: '相生反应伤害 (+35%/次)',
    historicalLore: '金木水火土相生不息，天地灵气灌注军阵。',
    mechanismTitle: '【全军精进·相生】',
    ruleBefore: '五大相生反应（滋养/燎原/熔岩/锋芒/碎冰）按双将最高攻 + 25% 辅攻结算。',
    ruleAfter: '每次选取使所有五行相生连锁反应伤害额外提升 +35%（可无限叠加）。',
    synergyWeather: '与 160px 相生阵脉（+35%）及顺天红利同享增益',
    counterBoss: '无尽北伐 Wave 26+ 极境破阵核心输出保障',
    description: '【无尽精进·术】术法通玄：五大五行相生连锁反应伤害额外提升 +35%（可无限次选取叠加）。',
    rarity: 'rare',
    category: 'elemental',
    stratagemCategory: '相生连环策',
    repeatable: true,
    tags: ['相生增伤', '无限精进'],
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
