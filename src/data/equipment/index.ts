import { Weapon, Artifact, Rarity, Gem, getAllowedGemWuXing } from '@/types'

// 导出宝石数据
export * from './gems'

/**
 * 通用制式兵器配置（前期过渡 · 仅提供基础面板加成，随时可分解为【百炼玄铁】）
 */
export const weapons: Weapon[] = [
  // 普通制式兵器
  {
    id: 'weapon_common_1',
    name: '百炼环首刀',
    type: 'weapon',
    rarity: 'common',
    bonuses: { attack: 5 },
    description: '汉季军中制式环首铁刀，仅提供基础攻击过渡，可于剑坊熔炼为【百炼玄铁】。'
  },
  {
    id: 'weapon_common_2',
    name: '硬木强弓',
    type: 'weapon',
    rarity: 'common',
    bonuses: { attackRange: 18 },
    description: '山桑硬木所制军弓，略增索敌射程，可熔炼为【百炼玄铁】。'
  },

  // 稀有制式兵器
  {
    id: 'weapon_rare_1',
    name: '精铁长枪',
    type: 'weapon',
    rarity: 'rare',
    bonuses: { attack: 12, attackSpeed: 0.08 },
    description: '百炼精铁锻造的军阵长矛，兼顾攻势与出手速度，可熔炼为【百炼玄铁】。'
  },
  {
    id: 'weapon_rare_2',
    name: '镔铁斩马刀',
    type: 'weapon',
    rarity: 'rare',
    bonuses: { attack: 16 },
    description: '重刃厚背的步战斩马刀，仅生效白板属性，无神兵器灵。'
  },

  // 史诗制式兵器（保留旧ID兼容）
  {
    id: 'weapon_epic_1',
    name: '玄铁重刃',
    type: 'weapon',
    rarity: 'epic',
    bonuses: { attack: 24, attackRange: 15 },
    description: '重铸玄铁大刀，非本命神兵，仅提供基础面板属性加成。'
  },
  {
    id: 'weapon_epic_2',
    name: '百辟点钢矛',
    type: 'weapon',
    rarity: 'epic',
    bonuses: { attack: 22, attackSpeed: 0.12 },
    description: '蒲元坊试炉点钢矛，非本命神兵，仅提供基础面板属性加成。'
  },

  // 传说制式兵器（保留旧ID兼容）
  {
    id: 'weapon_legendary_1',
    name: '千锻龙纹戟',
    type: 'weapon',
    rarity: 'legendary',
    bonuses: { attack: 30, attackSpeed: 0.15, attackRange: 20 },
    description: '古战场遗留的千锻战戟，仅提供基础面板属性加成。'
  }
]

/**
 * 神兵宝甲配置（五虎上将本命专属神兵 + 通用五行古宝）
 */
export const artifacts: Artifact[] = [
  // 稀有通用神器
  {
    id: 'artifact_rare_1',
    name: '玄黄玉璧',
    type: 'artifact',
    rarity: 'rare',
    bonuses: { attack: 15, attackRange: 15 },
    gemSocket: {
      requiredWuXing: 'earth',
      allowedWuXings: getAllowedGemWuXing('earth').all,
      currentGem: null,
      sameGem: null,
      generatingGem: null
    },
    activatedEffect: null,
    description: '厚德载物，温润古玉。通用过渡古宝（无本命器灵，仅生效基础属性与镶嵌宝石面板）。'
  },
  {
    id: 'artifact_rare_metal',
    name: '白金符印',
    type: 'artifact',
    rarity: 'rare',
    bonuses: { attack: 18, attackRange: 20 },
    gemSocket: {
      requiredWuXing: 'metal',
      allowedWuXings: getAllowedGemWuXing('metal').all,
      currentGem: null,
      sameGem: null,
      generatingGem: null
    },
    activatedEffect: null,
    description: '太白庚金所铸兵符。通用过渡古宝（无本命器灵，仅生效基础属性与镶嵌宝石面板）。'
  },

  // 传说神器（二期诸葛亮预留兼容）
  {
    id: 'artifact_legendary_1',
    name: '八卦阵图',
    type: 'artifact',
    rarity: 'legendary',
    exclusiveHeroes: ['诸葛亮', 'hero_zhugeliang'],
    bonuses: { attack: 35, attackSpeed: 0.2, attackRange: 40 },
    gemSocket: {
      requiredWuXing: 'water',
      allowedWuXings: getAllowedGemWuXing('water').all,
      currentGem: null,
      sameGem: null,
      generatingGem: null
    },
    exclusiveResonance: {
      heroId: 'hero_zhugeliang',
      heroName: '诸葛亮',
      hiddenSkillName: '【奇门八阵】',
      sameEffectDesc: '【水系同源】水雾大作，攻击附带寒潮浸润减速',
      generatingEffectDesc: '【金生水·相生】金戈激荡灵雨，大幅增加军令能量恢复速率',
      ultimateDesc: '【Lv5神品·太极两仪】全屏八卦阵光冲天，使敌军陷入极寒定身'
    },
    activatedEffect: 'bagua_array',
    description: '夺天地之造化，穷鬼神之莫测。诸葛孔明御敌奇阵图卷。'
  },

  // ===== 五虎上将专属本命神兵（严格对齐 Wuxing_System_Design.md 第4、5章） =====
  {
    id: 'artifact_qinglong',
    name: '青龙偃月刀',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_qinglong',
    exclusiveHeroes: ['关羽', 'hero_guanyu'],
    bossMaterialName: '太平青木髓',
    bonuses: { attack: 28, attackRange: 24 },
    gemSocket: {
      requiredWuXing: 'wood',
      allowedWuXings: getAllowedGemWuXing('wood').all,
      currentGem: null,
      sameGem: null,
      generatingGem: null
    },
    exclusiveResonance: {
      heroId: 'hero_guanyu',
      heroName: '关羽',
      hiddenSkillName: '《青龙偃月斩》',
      baseSkillName: '《青龙劈斩》(CD 8s)',
      baseSkillDesc: '挥刀对前方 180 码扇形造成 220% 木系伤害并附着【木·毒】2.5s；被动《武圣》普攻 15% 概率触发 80% 横扫。',
      evolvedSkillDesc: '劈斩进化为向外奔涌的 240 码半月青龙刀气波，伤害提升至 280%，命中【木·毒】或反应状态敌军时每次击杀返还 1s 冷却；被动横扫触发率升至 25%、范围 +30%。',
      sameEffectTitle: '【青龙木毒】',
      sameEffectDesc:
        '1. 刀芒溅射：普攻与战法额外造成 20%/35%/50%/70%/100% 木系伤害\n2. 剧毒侵蚀：【木·毒】每秒附加 0.6%/1.2%/1.8%/2.4%/3.0% 最大生命毒伤(Lv.5可叠3层)，暴击率 +4%/8%/12%/16%/20%',
      sameLevelDescs: {
        1: 'Lv.1 青藤原石：刀芒额外造成 20% 木伤，【木·毒】每秒附加 0.6% 最大生命伤害，暴击率 +4%',
        2: 'Lv.2 碧罗凝晶：刀芒额外造成 35% 木伤，【木·毒】每秒附加 1.2% 最大生命伤害，暴击率 +8%',
        3: 'Lv.3 苍灵翡翠：刀芒额外造成 50% 木伤，【木·毒】每秒附加 1.8% 最大生命伤害，暴击率 +12%',
        4: 'Lv.4 建木灵魄：刀芒额外造成 70% 木伤，【木·毒】每秒附加 2.4% 最大生命伤害，暴击率 +16%',
        5: 'Lv.5 青龙圣珠(Max)：刀芒额外造成 100% 木伤，【木·毒】每秒附加 3.0% 最大生命剧毒(可叠3层)，暴击率 +20%'
      },
      generatingEffectTitle: '【沧海润木】',
      generatingEffectDesc:
        '1. 相生共鸣：【水生木·滋养】伤害 +15%/30%/50%/75%/110%，定身延长 +0/0/0.4/0.7/1.0s，战法冷却 -0.3/0.6/0.9/1.2/1.5s\n2. 战法引信：释放《青龙偃月斩》时 25%/45%/65%/85%/100% 概率先手附着【水·湿】直接引爆滋养',
      generatingLevelDescs: {
        1: 'Lv.1 凝露水石：【水生木·滋养】伤害 +15%，战法冷却 -0.3s，释放主动战法时 25% 概率先手附带【水·湿】引爆滋养',
        2: 'Lv.2 流泉寒晶：【水生木·滋养】伤害 +30%，战法冷却 -0.6s，释放主动战法时 45% 概率先手附带【水·湿】引爆滋养',
        3: 'Lv.3 沧海明珠：【水生木·滋养】伤害 +50%、定身 +0.4s，战法冷却 -0.9s，释放主动战法 65% 概率引爆滋养',
        4: 'Lv.4 玄冥冰魄：【水生木·滋养】伤害 +75%、定身 +0.7s，战法冷却 -1.2s，释放主动战法 85% 概率引爆滋养',
        5: 'Lv.5 玄武神珠(Max)：【水生木·滋养】伤害 +110%、定身 +1.0s，战法冷却 -1.5s，释放主动战法 100% 必定引爆全场强化滋养！'
      },
      ultimateName: '《青龙啸天》',
      ultimateDesc: '释放主动战法或每参与触发 5 次【水生木】反应时，召唤苍天青龙法相横扫战场，对 160 码内敌军造成 200% 无视护甲木系真灵斩，瞬间挂满【水·湿】+【木·毒】并强制引爆全场【水生木·万木囚笼】定身 2.5 秒！',
      guardianBeast: '东方苍天青龙法相',
      poemQuote: '青龙啸天 · 万木囚笼'
    },
    activatedEffect: 'dragon_slash',
    description: '重八十二斤，冷艳锯锋。斩巨鹿黄巾渠帅张角，汲【太平青木髓】由蒲元亲手锻铸。'
  },
  {
    id: 'artifact_shemao',
    name: '丈八蛇矛',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_shemao',
    exclusiveHeroes: ['张飞', 'hero_zhangfei'],
    bossMaterialName: '西凉镇岳铜',
    bonuses: { attack: 30, attackSpeed: 0.15 },
    gemSocket: {
      requiredWuXing: 'earth',
      allowedWuXings: getAllowedGemWuXing('earth').all,
      currentGem: null,
      sameGem: null,
      generatingGem: null
    },
    exclusiveResonance: {
      heroId: 'hero_zhangfei',
      heroName: '张飞',
      hiddenSkillName: '《当阳断桥喝》',
      baseSkillName: '《断桥怒喝》(CD 10s)',
      baseSkillDesc: '咆哮震击周身 150 码造成 220% 土系伤害并附着【土·重】（削减 25% 韧性与 40% 刚毅，受暴击触发 20% 内震伤）2.5s；被动对【土·重】敌军暴率 +15%、伤害 +20%。',
      evolvedSkillDesc: '震地范围扩大至 200 码，伤害升至 280%，施加双倍效果【土·重】（削减 50% 韧性与 60% 刚毅，受 40% 保底下限约束）；每次暴击向目标身后迸发 80% 攻击力【地裂震波】。',
      sameEffectTitle: '【裂地重压】',
      sameEffectDesc:
        '1. 大地余震：普攻附带 25%/40%/60%/85%/120% 土系余震伤害\n2. 破衡内震：【土·重】削韧升至 30%/35%/40%/45%/50%、削刚升至 45%/50%/55%/60%/60%，受暴击【负重内震】伤害升至 25%/30%/38%/48%/60%',
      sameLevelDescs: {
        1: 'Lv.1 厚土砾石：普攻附带 25% 土伤余震，【土·重】削韧升至 30% / 削刚升至 45%，暴击内震伤升至 25%',
        2: 'Lv.2 赭岩灵晶：普攻附带 40% 土伤余震，【土·重】削韧升至 35% / 削刚升至 50%，暴击内震伤升至 30%',
        3: 'Lv.3 玄黄古玉：普攻附带 60% 土伤余震，【土·重】削韧升至 40% / 削刚升至 55%，暴击内震伤升至 38%',
        4: 'Lv.4 万岳龙魄：普攻附带 85% 土伤余震，【土·重】削韧升至 45% / 削刚升至 60%，暴击内震伤升至 48%',
        5: 'Lv.5 麒麟圣玉(Max)：普攻附带 120% 土伤余震，【土·重】使韧性削减 50% 与刚毅削减 60%(达 40% 保底极限)，暴击内震伤升至 60%！'
      },
      generatingEffectTitle: '【熔火裂谷】',
      generatingEffectDesc:
        '1. 相生共鸣：【火生土·熔岩】焦土每秒混伤升至 60%/80%/105%/130%/165%，焦土半径 +0%/0%/20%/30%/45%\n2. 战法引信：释放《当阳断桥喝》时 25%/45%/65%/85%/100% 概率先手附着【火·灼】当场炸开熔岩焦土',
      generatingLevelDescs: {
        1: 'Lv.1 炽火砂石：【火生土·熔岩】焦土每秒混伤升至 60%，释放主动战法时 25% 概率自带【火·灼】引爆熔岩焦土',
        2: 'Lv.2 熔火赤晶：【火生土·熔岩】焦土每秒混伤升至 80%、伤害 +15%，释放主动战法 45% 概率引爆熔岩焦土',
        3: 'Lv.3 炎阳赤玉：【火生土·熔岩】焦土每秒混伤升至 105%、半径 +20%，释放主动战法 65% 概率引爆熔岩焦土',
        4: 'Lv.4 三昧天火魄：【火生土·熔岩】焦土每秒混伤升至 130%、半径 +30%，释放主动战法 85% 概率引爆熔岩焦土',
        5: 'Lv.5 朱雀神髓(Max)：【火生土·熔岩】焦土每秒混伤升至 165%、半径 +45%，释放主动战法 100% 必定在脚下铺设巨型熔岩焦土！'
      },
      ultimateName: '《万夫莫开》',
      ultimateDesc: '释放主动战法或每参与触发 5 次【火生土】反应时引爆全场火山地脉，对射程内敌军造成 260% 必定暴击的火土崩山重击，瞬间将全场敌军【韧性】与【刚毅】压制至 40% 保底下限持续 6 秒，负重内震伤害提升 100%，并留下 5 秒巨型熔岩炼狱！',
      guardianBeast: '中土玄黄巨岳法相',
      poemQuote: '当阳断喝 · 万岳崩摧'
    },
    activatedEffect: 'serpent_pierce',
    description: '长一丈八尺，矛头若游蛇电掣。诛暴虐太师董卓，熔【西凉镇岳铜】铸就崩山破架之矛。'
  },
  {
    id: 'artifact_longdan',
    name: '龙胆亮银枪',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_longdan',
    exclusiveHeroes: ['赵云', 'hero_zhaoyun'],
    bossMaterialName: '逍遥寒泉玉',
    bonuses: { attack: 24, attackSpeed: 0.22, attackRange: 20 },
    gemSocket: {
      requiredWuXing: 'water',
      allowedWuXings: getAllowedGemWuXing('water').all,
      currentGem: null,
      sameGem: null,
      generatingGem: null
    },
    exclusiveResonance: {
      heroId: 'hero_zhaoyun',
      heroName: '赵云',
      hiddenSkillName: '《惊鸿穿云》',
      baseSkillName: '《白龙穿云》(CD 6s)',
      baseSkillDesc: '化作流光对范围内最多 3 名敌人突刺造成 160% 水系伤害并附着【水·湿】(减移速 35%) 2.5s；被动攻速 +15%，第 4 次普攻造成 140% 水系重刺。',
      evolvedSkillDesc: '穿梭突刺目标上限从 3 名提升至 5 名，单次伤害提升至 210%，路径上所有敌人均挂上【水·湿】；被动进化为每第 3 次普攻即触发【龙胆三连刺】，每枪独立附着/刷新【水·湿】。',
      sameEffectTitle: '【寒泉折浪】',
      sameEffectDesc:
        '1. 破空水芒：银枪刺出二段寒潮造成 25%/40%/60%/85%/120% 水系伤害\n2. 寒潮迟滞：【水·湿】减速提升至 42%/48%/55%/62%/70%，对减速目标伤害额外 +15%/25%/38%/52%/75%',
      sameLevelDescs: {
        1: 'Lv.1 凝露水石：二段水芒造成 25% 水伤，【水·湿】减速提升至 42%，对减速目标伤害额外 +15%',
        2: 'Lv.2 流泉寒晶：二段水芒造成 40% 水伤，【水·湿】减速提升至 48%，对减速目标伤害额外 +25%',
        3: 'Lv.3 沧海明珠：二段水芒造成 60% 水伤，【水·湿】减速提升至 55%，对减速目标伤害额外 +38%',
        4: 'Lv.4 玄冥冰魄：二段水芒造成 85% 水伤，【水·湿】减速提升至 62%，对减速目标伤害额外 +52%',
        5: 'Lv.5 玄武神珠(Max)：二段水芒造成 120% 水伤，【水·湿】减速提升至 70%(寸步难行)，对减速目标伤害额外 +75%！'
      },
      generatingEffectTitle: '【太白凝霜】',
      generatingEffectDesc:
        '1. 相生共鸣：【金生水·碎冰】无视防御真伤 +15%/30%/50%/75%/110%，冰封时长延长 +0/0/0.4/0.8/1.2s\n2. 战法引信：释放《惊鸿穿云》突刺时 25%/45%/65%/85%/100% 概率先手附着【金·裂】并当场引爆碎冰冰封',
      generatingLevelDescs: {
        1: 'Lv.1 庚金璞石：【金生水·碎冰】伤害 +15%，释放主动战法时对穿梭目标有 25% 概率先手附带【金·裂】引爆碎冰冰封',
        2: 'Lv.2 沉银玄晶：【金生水·碎冰】伤害 +30%，释放主动战法时有 45% 概率先手附带【金·裂】引爆碎冰冰封',
        3: 'Lv.3 曜金灵玉：【金生水·碎冰】伤害 +50%、冰封延长 +0.4s，释放主动战法时有 65% 概率引爆碎冰冰封',
        4: 'Lv.4 太白金魄：【金生水·碎冰】伤害 +75%、冰封延长 +0.8s，释放主动战法时有 85% 概率引爆碎冰冰封',
        5: 'Lv.5 白虎神髓(Max)：【金生水·碎冰】伤害 +110%、冰封延长 +1.2s，释放主动战法 100% 必定将穿梭命中的 5 名敌军全部碎冰封冻！'
      },
      ultimateName: '《龙胆惊鸿·七进七出》',
      ultimateDesc: '释放主动战法或每参与触发 5 次【金生水】反应时，银枪化作极寒冰龙七进七出，全屏残影连斩射程内所有敌军，造成 240% 破甲水金双系真伤，瞬间引爆连环【金生水·碎冰】并将全场敌军绝对冰封 2.0 秒！',
      guardianBeast: '北方玄武寒冰龙卷法相',
      poemQuote: '龙胆惊鸿 · 七进七出'
    },
    activatedEffect: 'longdan_thrust',
    description: '白马银枪，浑身是胆。破合淝威震逍遥张辽，凝【逍遥寒泉玉】化七进七出之枪。'
  },
  {
    id: 'artifact_sherigong',
    name: '宝雕射日弓',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_sherigong',
    exclusiveHeroes: ['黄忠', 'hero_huangzhong'],
    bossMaterialName: '赤兔焚天晶',
    bonuses: { attack: 26, attackRange: 45 },
    gemSocket: {
      requiredWuXing: 'fire',
      allowedWuXings: getAllowedGemWuXing('fire').all,
      currentGem: null,
      sameGem: null,
      generatingGem: null
    },
    exclusiveResonance: {
      heroId: 'hero_huangzhong',
      heroName: '黄忠',
      hiddenSkillName: '《赤焰落日箭》',
      baseSkillName: '《烈焰箭雨》(CD 8s)',
      baseSkillDesc: '向目标区域抛射火雨(半径 160 码)造成 200% 火系范围伤害并附着【火·灼】2.5s；被动《百步穿杨》距离越远伤害越高(最高 +25%)。',
      evolvedSkillDesc: '火雨轰炸半径扩大至 230 码，伤害提升至 270%，箭雨落地后残留持续燃烧 3 秒的赤焰火海；被动射程提升 +15%，距离增伤上限升至 +40%，攻击【火·灼】目标暴击率额外 +25%。',
      sameEffectTitle: '【朱雀焚天】',
      sameEffectDesc:
        '1. 贯穿火凤：箭矢额外造成 25%/40%/60%/85%/120% 火伤，【火·灼】持续伤害 +20%/40%/65%/95%/130%\n2. 余烬殉爆：灼烧敌军阵亡时触发殉爆，对周围造成 50%/80%/110%/150%/200% 范围火伤(Lv.5传染火灼)',
      sameLevelDescs: {
        1: 'Lv.1 炽火砂石：贯穿火矢额外造成 25% 火伤，【火·灼】伤害 +20%，阵亡殉爆造成 50% 范围火伤',
        2: 'Lv.2 熔火赤晶：贯穿火矢额外造成 40% 火伤，【火·灼】伤害 +40%，阵亡殉爆造成 80% 范围火伤',
        3: 'Lv.3 炎阳赤玉：贯穿火矢额外造成 60% 火伤，【火·灼】伤害 +65%，阵亡殉爆造成 110% 范围火伤',
        4: 'Lv.4 三昧天火魄：贯穿火矢额外造成 85% 火伤，【火·灼】伤害 +95%，阵亡殉爆造成 150% 范围火伤',
        5: 'Lv.5 朱雀神髓(Max)：贯穿火矢额外造成 120% 火伤，【火·灼】伤害 +130%，阵亡触发【红莲殉爆】造成 200% 范围火伤并向周围传染【火·灼】！'
      },
      generatingEffectTitle: '【建木助燃】',
      generatingEffectDesc:
        '1. 相生共鸣：【木生火·燎原】爆炸伤害 +15%/30%/45%/65%/95%，爆炸半径 +0%/0%/15%/25%/40%\n2. 战法引信：释放《赤焰落日箭》时箭雨 25%/45%/65%/85%/100% 概率先手附带【木·毒】直接引爆燎原',
      generatingLevelDescs: {
        1: 'Lv.1 青藤原石：【木生火·燎原】爆炸伤害 +15%，释放主动战法时箭雨有 25% 概率先手附带【木·毒】引爆燎原',
        2: 'Lv.2 碧罗凝晶：【木生火·燎原】爆炸伤害 +30%，释放主动战法时箭雨有 45% 概率先手附带【木·毒】引爆燎原',
        3: 'Lv.3 苍灵翡翠：【木生火·燎原】爆炸伤害 +45%、爆炸半径 +15%，释放主动战法时有 65% 概率引爆燎原',
        4: 'Lv.4 建木灵魄：【木生火·燎原】爆炸伤害 +65%、爆炸半径 +25%，释放主动战法时有 85% 概率引爆燎原',
        5: 'Lv.5 青龙圣珠(Max)：【木生火·燎原】爆炸伤害 +95%、爆炸半径 +40%，释放主动战法 100% 必定对火雨内全部敌军引爆连环【木生火·燎原】！'
      },
      ultimateName: '《九日连珠·焚天》',
      ultimateDesc: '释放主动战法或每参与触发 5 次【木生火】反应时，仰天满弓射落九轮大日，化作九道木火流星轰炸全图前 6 名敌军，每道流星造成 180% 火系真实爆破并强制触发连环【木生火·燎原】大殉爆！',
      guardianBeast: '南方朱雀火陨法相',
      poemQuote: '九日连珠 · 赤焰焚天'
    },
    activatedEffect: 'sheri_shot',
    description: '百步穿杨，力贯长虹。战虎牢关无双飞将吕布，淬【赤兔焚天晶】化九天落日神弓。'
  },
  {
    id: 'artifact_zhanjin',
    name: '虎头湛金枪',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_zhanjin',
    exclusiveHeroes: ['马超', 'hero_machao'],
    bossMaterialName: '八门庚金铁',
    bonuses: { attack: 28, attackSpeed: 0.16, attackRange: 18 },
    gemSocket: {
      requiredWuXing: 'metal',
      allowedWuXings: getAllowedGemWuXing('metal').all,
      currentGem: null,
      sameGem: null,
      generatingGem: null
    },
    exclusiveResonance: {
      heroId: 'hero_machao',
      heroName: '马超',
      hiddenSkillName: '《神威破军突》',
      baseSkillName: '《铁骑突刺》(CD 9s)',
      baseSkillDesc: '向正前方直线刺出枪芒造成 230% 金系伤害并附着【金·裂】(破除 35% 防御 + 移动流血真伤) 2.5s；被动攻速 +12%，击杀叠 +4% 攻击力(最多5层)。',
      evolvedSkillDesc: '化作贯穿全场的金雷骑兵冲锋，宽度扩大 40%，伤害升至 300% 无视防御穿透破甲伤，使路径敌人【金·裂】流血频率翻倍；西凉战意每层升至 +7% 攻击与 +5% 暴伤。',
      sameEffectTitle: '【白虎撕裂】',
      sameEffectDesc:
        '1. 庚金穿刺：枪芒额外造成 25%/40%/60%/85%/120% 金系伤害\n2. 破甲裂脉：【金·裂】破甲提升至 40%/45%/52%/60%/60%(达保底极限)，移动流血真伤 +20%/40%/65%/95%/140%',
      sameLevelDescs: {
        1: 'Lv.1 庚金璞石：额外造成 25% 金伤，【金·裂】破甲提升至 40%，移动流血真伤 +20%',
        2: 'Lv.2 沉银玄晶：额外造成 40% 金伤，【金·裂】破甲提升至 45%，移动流血真伤 +40%',
        3: 'Lv.3 曜金灵玉：额外造成 60% 金伤，【金·裂】破甲提升至 52%，移动流血真伤 +65%',
        4: 'Lv.4 太白金魄：额外造成 85% 金伤，【金·裂】破甲提升至 60%，移动流血真伤 +95%',
        5: 'Lv.5 白虎神髓(Max)：额外造成 120% 金伤，【金·裂】破甲提升至 60%(达 40% 保底极限)，移动流血真伤 +140%！'
      },
      generatingEffectTitle: '【厚土聚锋】',
      generatingEffectDesc:
        '1. 相生共鸣：【土生金·锋芒】迸射 3/4/4/5/6 道暴击飞刃，斩杀生命低于 10%/14%/18%/22%/28% 的非首领敌军\n2. 战法引信：释放《神威破军突》冲锋时 25%/45%/65%/85%/100% 概率先手附着【土·重】并引爆漫天锋芒',
      generatingLevelDescs: {
        1: 'Lv.1 厚土砾石：【土生金·锋芒】飞刃伤害 +15%、斩杀 <10% 生命普通敌军；主动战法冲锋 25% 概率先手附着【土·重】引爆锋芒',
        2: 'Lv.2 赭岩灵晶：【土生金·锋芒】飞刃 +1(共4道)、斩杀 <14% 生命普通敌军；主动战法冲锋 45% 概率引爆锋芒',
        3: 'Lv.3 玄黄古玉：【土生金·锋芒】飞刃 +1(共4道)、斩杀 <18% 生命非首领敌军；主动战法冲锋 65% 概率引爆锋芒',
        4: 'Lv.4 万岳龙魄：【土生金·锋芒】飞刃 +2(共5道)、斩杀 <22% 生命非首领敌军；主动战法冲锋 85% 概率引爆锋芒',
        5: 'Lv.5 麒麟圣玉(Max)：【土生金·锋芒】飞刃 +3(共6道暴击飞刃)、斩杀 <28% 生命非首领敌军；主动战法冲锋 100% 必定踏碎韧刚并引爆漫天锋芒！'
      },
      ultimateName: '《万骑奔雷·神威天降》',
      ultimateDesc: '释放主动战法或每参与触发 5 次【土生金】反应时，召唤西凉铁骑金芒幻影奔袭全场，造成 250% 金土混合真实破甲伤害，瞬间将全场敌军防御与韧性/刚毅压制至 40% 保底下限持续 5 秒、强制挂满【金·裂】大出血并迸发漫天锋芒剑雨！',
      guardianBeast: '西方白虎庚金剑雨法相',
      poemQuote: '万骑奔雷 · 神威天降'
    },
    activatedEffect: 'zhanjin_charge',
    description: '枪身乃镔铁所铸，虎头吞口镀亮金。破樊城曹仁八门金锁阵，熔【八门庚金铁】铸无坚不摧之锋。'
  },

  // ===== 三国名将其他宝物与王道神器 =====
  {
    id: 'artifact_chitu',
    name: '赤兔马',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_chitu',
    exclusiveHeroes: ['关羽', '吕布', 'hero_guanyu', 'hero_lvbu'],
    bonuses: { attack: 45, attackSpeed: 0.35 },
    gemSocket: {
      requiredWuXing: 'fire',
      allowedWuXings: getAllowedGemWuXing('fire').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '关羽/吕布',
      hiddenSkillName: '【赤兔绝影】',
      sameEffectDesc: '【火系同源】踏火疾行，攻击附带烈火烈风爆裂',
      generatingEffectDesc: '【木生火·相生】生机化为极速烈焰，缩短所有攻击与技能间隔',
      ultimateDesc: '【Lv5神品·日行千里】踏碎虚空，冲刺撞击沿途所有敌人并造成高额火伤'
    },
    activatedEffect: 'chitu_gallop',
    description: '人中吕布，马中赤兔。日行千里，渡水登山如履平地。'
  },
  {
    id: 'artifact_fangtian',
    name: '方天画戟',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_fangtian',
    exclusiveHeroes: ['吕布', 'hero_lvbu'],
    bonuses: { attack: 85, attackSpeed: 0.3, attackRange: 40 },
    gemSocket: {
      requiredWuXing: 'metal',
      allowedWuXings: getAllowedGemWuXing('metal').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '吕布',
      hiddenSkillName: '【天下无双】',
      sameEffectDesc: '【金系同源】金芒画戟横扫千军，无视敌人40%护甲并造成大范围物理撕裂',
      generatingEffectDesc: '【土生金·相生】厚重大地赋力神锋，斩击吸取敌人精气并获得护盾',
      ultimateDesc: '【Lv5神品·鬼神降世】魔神法相降临，天地为之色变，全图霸绝狂轰'
    },
    activatedEffect: 'wushuang_strike',
    description: '顶天立地，唯我无双。温侯吕奉先纵横天下之神兵。'
  },
  {
    id: 'artifact_dilu',
    name: '的卢',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_dilu',
    exclusiveHeroes: ['刘备', 'hero_liubei'],
    bonuses: { attack: 30, attackSpeed: 0.35, attackRange: 20 },
    gemSocket: {
      requiredWuXing: 'water',
      allowedWuXings: getAllowedGemWuXing('water').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '刘备',
      hiddenSkillName: '【檀溪神跃】',
      sameEffectDesc: '【水系同源】水波护佑，受到攻击时大幅度闪避并为友军回春',
      generatingEffectDesc: '【金生水·相生】神骏生风，使全阵营武将攻速提升15%',
      ultimateDesc: '【Lv5神品·乘风踏浪】飞跃天堑化险为夷，全阵营进入无敌与狂暴状态'
    },
    activatedEffect: 'tanxi_leap',
    description: '马作的卢飞快，弓如霹雳弦惊。檀溪一跃显神骏。'
  },
  {
    id: 'artifact_sunzi',
    name: '孙子兵法',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_sunzi',
    exclusiveHeroes: ['诸葛亮', 'hero_zhugeliang'],
    bonuses: { attack: 40, attackSpeed: 0.25, attackRange: 45 },
    gemSocket: {
      requiredWuXing: 'water',
      allowedWuXings: getAllowedGemWuXing('water').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '诸葛亮',
      hiddenSkillName: '【智御八荒】',
      sameEffectDesc: '【水系同源】兵法如水无定势，技能范围扩大30%',
      generatingEffectDesc: '【金生水·相生】兵戈化水谋略无穷，局内锦囊充能速度提升40%',
      ultimateDesc: '【Lv5神品·运筹帷幄】策动天时地利，刷新所有神将战法冷却时间'
    },
    activatedEffect: 'bingfa_mastery',
    description: '兵者国之大事，死生之地，存亡之道。卧龙运筹帷幄之秘笈。'
  },
  {
    id: 'artifact_tongque',
    name: '铜雀',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_tongque',
    exclusiveHeroes: ['刘备', '曹操', '孙权', 'hero_liubei', 'hero_caocao', 'hero_sunquan'],
    bonuses: { attack: 35, attackSpeed: 0.25, attackRange: 30 },
    gemSocket: {
      requiredWuXing: 'earth',
      allowedWuXings: getAllowedGemWuXing('earth').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '三大君主',
      hiddenSkillName: '【铜雀锁春】',
      sameEffectDesc: '【土系同源】大地结界禁锢敌军，使阵亡敌人额外掉落金币',
      generatingEffectDesc: '【火生土·相生】烈焰筑高台，全场友军攻击力提升15%',
      ultimateDesc: '【Lv5神品·祥瑞降世】铜雀展翅高鸣，恢复主公全部血量并强化防线'
    },
    activatedEffect: 'tongque_power',
    description: '得天授祥瑞，揽二乔于东南。霸者鼎立天下之吉兆宝物。'
  },
  {
    id: 'artifact_yuxi',
    name: '传国玉玺',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_yuxi',
    exclusiveHeroes: ['刘备', '曹操', '孙权', 'hero_liubei', 'hero_caocao', 'hero_sunquan'],
    bonuses: { attack: 65, attackSpeed: 0.2, attackRange: 35 },
    gemSocket: {
      requiredWuXing: 'earth',
      allowedWuXings: getAllowedGemWuXing('earth').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '三大君主',
      hiddenSkillName: '【受命于天】',
      sameEffectDesc: '【土系同源】皇威赫赫，敌全军移动速度降低20%',
      generatingEffectDesc: '【火生土·相生】烈阳正统，击杀敌人时产生天罚雷火殉爆',
      ultimateDesc: '【Lv5神品·奉天承运】传国受命，敕令全屏小兵即刻归降或湮灭'
    },
    activatedEffect: 'imperial_mandate',
    description: '受命于天，既寿永昌。传国正统，至高王者之威仪凭证。'
  }
]

/**
 * 获取武器配置
 */
export function getWeapon(id: string): Weapon | undefined {
  return weapons.find(w => w.id === id)
}

/**
 * 获取神器配置
 */
export function getArtifact(id: string): Artifact | undefined {
  return artifacts.find(a => a.id === id)
}

/**
 * 按稀有度筛选武器
 */
export function getWeaponsByRarity(rarity: Rarity): Weapon[] {
  return weapons.filter(w => w.rarity === rarity)
}

/**
 * 按稀有度筛选神器
 */
export function getArtifactsByRarity(rarity: Rarity): Artifact[] {
  return artifacts.filter(a => a.rarity === rarity)
}

/**
 * 检查装备是否允许指定武将装备（匹配专属武将限制）
 */
export function isEquipmentExclusiveForHero(equipment: { exclusiveHeroes?: string[] }, heroNameOrId: string): boolean {
  if (!equipment.exclusiveHeroes || equipment.exclusiveHeroes.length === 0) {
    return true
  }
  return equipment.exclusiveHeroes.includes(heroNameOrId)
}