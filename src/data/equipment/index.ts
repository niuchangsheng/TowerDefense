import { Weapon, Artifact, Rarity, Gem, getAllowedGemWuXing } from '@/types'

// 导出宝石数据
export * from './gems'

/**
 * 武器配置
 */
export const weapons: Weapon[] = [
  // 普通武器
  {
    id: 'weapon_common_1',
    name: '铁剑',
    type: 'weapon',
    rarity: 'common',
    bonuses: { attack: 5 }
  },
  {
    id: 'weapon_common_2',
    name: '木弓',
    type: 'weapon',
    rarity: 'common',
    bonuses: { attackRange: 20 }
  },

  // 稀有武器
  {
    id: 'weapon_rare_1',
    name: '青铜剑',
    type: 'weapon',
    rarity: 'rare',
    bonuses: { attack: 15, attackSpeed: 0.1 }
  },
  {
    id: 'weapon_rare_2',
    name: '精钢刀',
    type: 'weapon',
    rarity: 'rare',
    bonuses: { attack: 20 }
  },

  // 史诗武器
  {
    id: 'weapon_epic_1',
    name: '青龙偃月刀',
    type: 'weapon',
    rarity: 'epic',
    bonuses: { attack: 40, attackRange: 30 }
  },
  {
    id: 'weapon_epic_2',
    name: '丈八蛇矛',
    type: 'weapon',
    rarity: 'epic',
    bonuses: { attack: 35, attackSpeed: 0.2 }
  },

  // 传说武器
  {
    id: 'weapon_legendary_1',
    name: '方天画戟',
    type: 'weapon',
    rarity: 'legendary',
    bonuses: { attack: 60, attackSpeed: 0.3, attackRange: 40 }
  }
]

/**
 * 神器配置
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
      currentGem: null
    },
    activatedEffect: null,
    description: '厚德载物，温润古玉。可镶嵌土系（同源）或火系（火生土相生）灵玉。'
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
      currentGem: null
    },
    activatedEffect: null,
    description: '太白庚金所铸符印，肃杀凌厉。可镶嵌金系（同源）或土系（土生金相生）宝石。'
  },

  // 传说神器
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
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '诸葛亮',
      hiddenSkillName: '【奇门八阵】',
      sameEffectDesc: '【水系同源】水雾大作，攻击附带群体冰霜迟缓，暴击伤害加深',
      generatingEffectDesc: '【金生水·相生】金戈激荡灵雨，大幅增加军令能量恢复速率',
      ultimateDesc: '【Lv5神品·太极两仪】全屏八卦阵光冲天，使敌军陷入极寒定身并持续遭受雷击'
    },
    activatedEffect: 'bagua_array',
    description: '夺天地之造化，穷鬼神之莫测。诸葛孔明御敌奇阵图卷。'
  },

  // ===== 五虎上将专属本命神兵 =====
  {
    id: 'artifact_qinglong',
    name: '青龙偃月刀',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_qinglong',
    exclusiveHeroes: ['关羽', 'hero_guanyu'],
    bonuses: { attack: 75, attackRange: 40 },
    gemSocket: {
      requiredWuXing: 'wood',
      allowedWuXings: getAllowedGemWuXing('wood').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '关羽',
      hiddenSkillName: '【青龙斩月】',
      sameEffectDesc: '【木系同源】刀芒扩散为半月波斩，每次命中挂上木系寄生(parasite)种子并提高暴击率',
      generatingEffectDesc: '【水生木·相生】刀风挟带润泽之息，施加潮湿(wet)并引爆水生木滋养，加速自身并减技能冷却',
      ultimateDesc: '【Lv5神品·青龙啸天】召唤青龙法相凌空横斩，狂暴木系灵刃全屏扫荡'
    },
    activatedEffect: 'dragon_slash',
    description: '重八十二斤，冷艳锯锋。唯武圣关云长方能唤醒青龙偃月神威。'
  },
  {
    id: 'artifact_shemao',
    name: '丈八蛇矛',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_shemao',
    exclusiveHeroes: ['张飞', 'hero_zhangfei'],
    bonuses: { attack: 70, attackSpeed: 0.25 },
    gemSocket: {
      requiredWuXing: 'earth',
      allowedWuXings: getAllowedGemWuXing('earth').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '张飞',
      hiddenSkillName: '【当阳裂石】',
      sameEffectDesc: '【土系同源】长矛重击引发大地轰鸣，施加重压(heavy)减速50%并震荡周围小兵',
      generatingEffectDesc: '【火生土·相生】矛尖激起地脉烈焰，攻击在地面留下熔岩灼烧裂隙并加深易伤',
      ultimateDesc: '【Lv5神品·万夫莫开】张翼德当阳断喝，全场震退、破甲并强制硬控眩晕'
    },
    activatedEffect: 'serpent_pierce',
    description: '长一丈八尺，矛头若游蛇电掣。张翼德当阳桥前万夫莫敌。'
  },
  {
    id: 'artifact_longdan',
    name: '龙胆亮银枪',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_longdan',
    exclusiveHeroes: ['赵云', 'hero_zhaoyun'],
    bonuses: { attack: 65, attackSpeed: 0.35, attackRange: 30 },
    gemSocket: {
      requiredWuXing: 'water',
      allowedWuXings: getAllowedGemWuXing('water').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '赵云',
      hiddenSkillName: '【七进七出·龙胆碎冰】',
      sameEffectDesc: '【水系同源】攻击附带二段破空枪芒，对敌人施加潮湿(wet)水润状态',
      generatingEffectDesc: '【金生水·相生】枪芒附带极寒锋芒，攻击潮湿目标触发【碎冰穿透】造成大范围真实伤害',
      ultimateDesc: '【Lv5神品·龙胆惊鸿】赵子龙枪出如龙七进七出，穿梭全场并冰封敌阵'
    },
    activatedEffect: 'longdan_thrust',
    description: '白马银枪，浑身是胆。长坂坡上单骑救主，所向披靡。'
  },
  {
    id: 'artifact_sherigong',
    name: '宝雕射日弓',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_sherigong',
    exclusiveHeroes: ['黄忠', 'hero_huangzhong'],
    bonuses: { attack: 60, attackRange: 90 },
    gemSocket: {
      requiredWuXing: 'fire',
      allowedWuXings: getAllowedGemWuXing('fire').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '黄忠',
      hiddenSkillName: '【烈阳贯日】',
      sameEffectDesc: '【火系同源】烈焰利箭贯穿敌人，沿途留下焚烧火径挂上持续灼烧(burn)',
      generatingEffectDesc: '【木生火·相生】攻击处于寄生(parasite)状态的敌人时引爆烈火燎原，范围爆炸灼烧',
      ultimateDesc: '【Lv5神品·九日连珠】仰天引弓射落九日，焚天烈焰箭雨覆盖整个出兵路径'
    },
    activatedEffect: 'sheri_shot',
    description: '百步穿杨，力贯长虹。老将黄忠开石裂甲、威震定军山之神弓。'
  },
  {
    id: 'artifact_zhanjin',
    name: '虎头湛金枪',
    type: 'artifact',
    rarity: 'legendary',
    image: 'artifact_zhanjin',
    exclusiveHeroes: ['马超', 'hero_machao'],
    bonuses: { attack: 80, attackSpeed: 0.25, attackRange: 25 },
    gemSocket: {
      requiredWuXing: 'metal',
      allowedWuXings: getAllowedGemWuXing('metal').all,
      currentGem: null
    },
    exclusiveResonance: {
      heroName: '马超',
      hiddenSkillName: '【西凉锦武·神锋裂甲】',
      sameEffectDesc: '【金系同源】金芒撕裂防御，施加金系流血(bleed)并大幅提升物理暴击率',
      generatingEffectDesc: '【土生金·相生】厚土聚锋斩杀残血非精英目标，并激励全军提升战意与移速',
      ultimateDesc: '【Lv5神品·万骑奔雷】西凉铁骑金芒幻影奔袭全场，粉碎敌人护甲并连续斩击'
    },
    activatedEffect: 'zhanjin_charge',
    description: '枪身乃镔铁所铸，虎头吞口镀亮金。锦马超横槊西凉、威震三辅之无上神兵。'
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