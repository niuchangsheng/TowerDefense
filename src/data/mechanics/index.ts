import { WuXing } from '@/types'

/**
 * 机制分类标签
 */
export type MechanicsTab = 'elemental' | 'reaction' | 'attributes' | 'damage'

export interface MechanicsTabDef {
  key: MechanicsTab
  title: string
  seal: string
  subtitle: string
}

export const MECHANICS_TABS: MechanicsTabDef[] = [
  {
    key: 'elemental',
    title: '五行状态',
    seal: '象',
    subtitle: '五大五行基础状态 · 职能铁律与附着规范'
  },
  {
    key: 'reaction',
    title: '相生衍化',
    seal: '生',
    subtitle: '双向化学反应 · 160px相生阵脉 · 破铁壁'
  },
  {
    key: 'attributes',
    title: '五维对位',
    seal: '位',
    subtitle: '我军五维 vs 敌军五维 · 严格一对一克制链'
  },
  {
    key: 'damage',
    title: '乘区算法',
    seal: '算',
    subtitle: '四独立伤害乘区 · 局外上限与抗性保底'
  }
]

/**
 * 1. 五行元素基础状态
 */
export interface ElementStatusItem {
  element: WuXing
  name: string
  char: string
  targetStat: string
  color: number
  textColor: string
  summary: string
  duration: string
  details: string[]
  rules: string[]
}

export const ELEMENT_STATUS_LIST: ElementStatusItem[] = [
  {
    element: 'wood',
    name: '木 · 毒 (寄生腐蚀)',
    char: '毒',
    targetStat: '生命 (HP)',
    color: 0x3d7a48,
    textColor: '#3d7a48',
    summary: '按目标最大生命值百分比持续腐蚀，并施加禁疗压制。',
    duration: '2.5 秒',
    details: [
      '专克属性：【敌军最大生命】。',
      '腐蚀机制：每 0.5s 造成一次基于最大生命值的木属性伤害，无视护甲与韧性。',
      '禁疗压制：中毒期间目标无法受到任何治疗或生命恢复效果。'
    ],
    rules: [
      '附着时长固定为 2.5s。',
      '触发相生反应绝不抹除木毒层数。'
    ]
  },
  {
    element: 'metal',
    name: '金 · 裂 (锋刃破甲)',
    char: '裂',
    targetStat: '防御 (Defense)',
    color: 0x9c7a2f,
    textColor: '#9c7a2f',
    summary: '唯一具备破甲削防能力的基础状态，敌军移动时结算流血真伤。',
    duration: '2.5 秒',
    details: [
      '专克属性：【敌军物理防御】。',
      '破甲机制：大幅削弱目标的护甲值，使后续所有攻击与相生伤害显著提升。',
      '移动流血：处于裂隙撕裂状态的敌人，每移动一定像素即结算一次无视防御的流血真伤。'
    ],
    rules: [
      '基础五行中唯一具备破甲能力的状态。',
      '相生反应不清除破甲，保持易伤窗口。'
    ]
  },
  {
    element: 'water',
    name: '水 · 湿 (泥泞软控)',
    char: '湿',
    targetStat: '移动速度 (MoveSpeed)',
    color: 0x2b638f,
    textColor: '#2b638f',
    summary: '唯一具备移速削减的基础状态，延缓敌军行军节拍。',
    duration: '2.5 秒',
    details: [
      '专克属性：【敌军移动速度】。',
      '软控延缓：降低敌军 35% 行进速度，为我方阵型争取充足蓄力与射击时间。',
      '硬控基底：水湿本身不含冰冻硬控，仅作为相生冰封/定身的前置引信。'
    ],
    rules: [
      '基础状态中唯一具备减速效果的状态。',
      '硬控（定身/冰封）必须通过相生反应触发。'
    ]
  },
  {
    element: 'earth',
    name: '土 · 重 (泰山压顶)',
    char: '重',
    targetStat: '韧性 & 刚毅 (反暴击)',
    color: 0x7a5a3a,
    textColor: '#7a5a3a',
    summary: '专克敌军反暴几率与反暴伤害，受暴击时触发【负重内震】。',
    duration: '2.5 秒',
    details: [
      '专克属性：【敌军韧性 (Tenacity)】与【敌军刚毅 (Fortitude)】。',
      '破抗机制：大幅压制敌方的抗暴击率与反暴击倍率，使我方高暴击武将刀刀见红。',
      '负重内震：处于土重状态的敌人一旦受到暴击，立即诱发额外范围冲击内震。'
    ],
    rules: [
      '严禁附带减速、眩晕或破甲，职能边界严密隔离。',
      '土生金将承接土破韧刚与金破护甲双重红利。'
    ]
  },
  {
    element: 'fire',
    name: '火 · 灼 (炽烈余烬)',
    char: '灼',
    targetStat: '攻击力放大 (Attack)',
    color: 0xb53a32,
    textColor: '#b53a32',
    summary: '高频攻击力百分比火伤 DoT，阵亡时触发余烬爆燃传染。',
    duration: '2.5 秒',
    details: [
      '核心职能：【放大我方攻击力收益】。',
      '高频灼烧：按攻击者攻击力的高额百分比进行多段持续灼烧。',
      '余烬殉爆：阵亡时产生烈火环扩散，将灼烧状态自动传递给周围行军单位。'
    ],
    rules: [
      '火属性侧重极攻与爆发伤害。',
      '木生火可将木毒引爆为瞬发最大生命巨额斩杀。'
    ]
  }
]

/**
 * 2. 五行相生化学连锁
 */
export interface ReactionItem {
  id: string
  name: string
  elements: [WuXing, WuXing]
  title: string
  color: number
  textColor: string
  type: string
  summary: string
  icd: string
  details: string[]
}

export const REACTION_LIST: ReactionItem[] = [
  {
    id: 'nourish',
    name: '水生木【滋养 · 蔓延】',
    elements: ['water', 'wood'],
    title: '藤蔓缠绕 · 剧毒扩散',
    color: 0x2e7d32,
    textColor: '#2e7d32',
    type: '强力硬控 + 范围剧毒',
    summary: '将水湿软控升级为 2.0s 藤蔓定身硬控，并向周围敌群扩散木毒。',
    icd: '1.5 秒同目标冷却',
    details: [
      '双向触发：无论先水后木，还是先木后水，命中即触发滋养反应。',
      '硬控升级：突破单一减速，将目标牢牢禁锢在原地 2.0 秒。',
      '木毒蔓延：在目标脚底绽开青墨毒藤，扩散 150px 范围木毒腐蚀。'
    ]
  },
  {
    id: 'wildfire',
    name: '木生火【燎原 · 焚尽】',
    elements: ['wood', 'fire'],
    title: '引爆生命 · 烈焰焚海',
    color: 0xc62828,
    textColor: '#c62828',
    type: '巨额生命斩杀 + 范围火海',
    summary: '引爆木毒腐蚀，造成瞬间最大生命百分比巨额爆发，并点燃范围火海。',
    icd: '1.5 秒同目标冷却',
    details: [
      '极高斩杀：直接依据敌军最大生命值引爆，专门克制高血量重装精英。',
      '烈火留存：爆炸后在地面留下 3 秒赤焰火海，持续附加火灼。',
      '相生不抹除：引爆后原始木毒依然按计时器继续生效，不被强行清除。'
    ]
  },
  {
    id: 'magma',
    name: '火生土【熔岩 · 焦土】',
    elements: ['fire', 'earth'],
    title: '焦土重域 · 暴击内震',
    color: 0xd84315,
    textColor: '#d84315',
    type: '范围阵地战 + 韧性剥离',
    summary: '引爆火灼生成 4.0s 熔岩焦土，持续削减敌军韧性刚毅，受暴击必内震。',
    icd: '1.5 秒同目标冷却',
    details: [
      '阵地重构：在交火热点留下熔岩焦土区域，踏入者持续承受火土复合伤害。',
      '剥离反暴：处于焦土内的敌人反暴击率与反暴伤额外下降 50%。',
      '受暴内震：焦土内受暴击必定触发十字墨波【负重内震】。'
    ]
  },
  {
    id: 'spikes',
    name: '土生金【淬刃 · 锋芒】',
    elements: ['earth', 'metal'],
    title: '三道金虹 · 破甲真伤',
    color: 0xf57f17,
    textColor: '#f57f17',
    type: '剑气迸射 + 即时结算',
    summary: '承接土破韧刚与金破护甲双重红利，迸射 3 道高暴淬刃剑气并即时结算流血。',
    icd: '1.5 秒同目标冷却',
    details: [
      '高暴飞刃：向目标扇形迸发 3 道锐金剑气，继承极高暴击率与暴击伤害。',
      '真伤结算：即时结算目标身上积累的所有流血真伤，瞬间打出破甲爆发。',
      '双将红利：张飞(土)与赵云(金)相遇时的经典王牌质变。'
    ]
  },
  {
    id: 'shatter',
    name: '金生水【寒芒 · 碎冰】',
    elements: ['metal', 'water'],
    title: '贯穿裂隙 · 绝对冰封',
    color: 0x0277bd,
    textColor: '#0277bd',
    type: '无视防御 + 绝对硬控',
    summary: '寒水顺着金裂护甲裂隙灌入，造成无视防御破冰伤害并触发 2.5s 绝对冰封。',
    icd: '1.5 秒同目标冷却',
    details: [
      '绝对冰封：将移动目标完全冻结成冰雕 2.5 秒，打断一切突进与施法。',
      '破冰真伤：完全无视目标护甲防御值的穿透碎冰伤害。',
      '赵云(金)与关羽(水)联手时的终极控场王牌。'
    ]
  }
]

/**
 * 3. 五维攻防对位表
 */
export interface AttributePair {
  alliedStat: string
  alliedDesc: string
  enemyStat: string
  enemyDesc: string
  counterLogic: string
}

export const ATTRIBUTE_PAIRS: AttributePair[] = [
  {
    alliedStat: '攻击力 (Attack)',
    alliedDesc: '我方武将与神兵输出伤害基数。',
    enemyStat: '防御 (Defense)',
    enemyDesc: '敌军减免直接物理与元素伤害。',
    counterLogic: '【金·裂】专克【防御】。破除敌甲，使攻击力能无损穿透。'
  },
  {
    alliedStat: '攻击范围 (Range)',
    alliedDesc: '武将索敌与相生阵脉覆盖半径。',
    enemyStat: '移动速度 (MoveSpeed)',
    enemyDesc: '敌军突进行军与冲破大营的速度。',
    counterLogic: '【水·湿】专克【移速】。减速敌军拉长其处于攻击范围的时间。'
  },
  {
    alliedStat: '攻击速度 (AttackSpeed)',
    alliedDesc: '普通攻击与元素印章附着频率。',
    enemyStat: '生命 (HP)',
    enemyDesc: '敌军所能承受的总体伤害上限。',
    counterLogic: '【木·毒】专克【生命】。高频上毒按最大生命百分比持续蒸发。'
  },
  {
    alliedStat: '暴击几率 (CritRate)',
    alliedDesc: '触发高额暴击伤害的概率。',
    enemyStat: '韧性 (Tenacity)',
    enemyDesc: '直接抵扣我方的暴击几率（反暴率）。',
    counterLogic: '【土·重】专克【韧性】。大幅压制韧性，恢复我军高额暴击率。'
  },
  {
    alliedStat: '暴击伤害 (CritDamage)',
    alliedDesc: '暴击时的伤害倍率加成。',
    enemyStat: '刚毅 (Fortitude)',
    enemyDesc: '直接抵扣我方的暴击伤害加成（反暴伤）。',
    counterLogic: '【土·重】专克【刚毅】。大幅削减刚毅，让暴击造成毁灭性打击。'
  }
]

/**
 * 4. 伤害公式与底层铁律（包含具体攻击力与防御力数值结算）
 */
export const DAMAGE_FORMULA_GUIDE = {
  formula: '最终伤害 = [基础攻击力 × 技能/相生系数 × (1 + ∑攻击加成) × (1 + ∑增伤) × (1 + ∑易伤) × (1 + 实暴)] × (1 - 防御减免率)',
  coreComponents: [
    {
      title: '我方攻击力 (Attack)',
      content: '伤害根基。普攻取武将面板攻击力；绝技取攻击力 × 技能倍率；相生反应取双将最高攻击力 + 另一将 25% 协同攻击力。'
    },
    {
      title: '敌方防御力 (Defense)',
      content: '减免物理与法术承伤。防御减免率 = 有效防御 / (有效防御 + 200)。有效防御经破甲后绝不低于初始值的 40% 保底。'
    },
    {
      title: '真实伤害 (Ignore Defense)',
      content: '【金·裂】流血真伤、【金生水·寒芒】碎冰真伤完全无视敌方防御力（防御减免率 = 0），刀刀穿透。'
    },
    {
      title: '暴击对抗 (Crit vs Tenacity/Fortitude)',
      content: '实际暴率 = Max(0, 暴击几率 - 敌方有效韧性)；实际暴伤 = Max(0, 暴伤加成 - 敌方有效刚毅)。土·重可剥离敌方韧刚。'
    }
  ],
  buckets: [
    {
      name: '基础攻击力基数 (Base Attack)',
      desc: '我方武将面板攻击力 × 技能系数 (普攻系数 1.0，战法如 1.5~2.2)。',
      notes: '相生共鸣基数 = Max(攻A, 攻B) + 0.25 × Min(攻A, 攻B)，高攻先手后手均享高基数。'
    },
    {
      name: '第一乘区：攻击力加成 (Attack %)',
      desc: '神兵词条加成、武将冲穴升级、五行灵石基础攻击词条。',
      notes: '区内所有百分比加算（如 +15% 攻击与 +10% 攻击累加为 +25%）。'
    },
    {
      name: '第二乘区：增伤加成 (Damage Inc %)',
      desc: '五行相生倍率、天时得令 (+20%)、160px 相生阵脉连线 (+35%)、锦囊增伤。',
      notes: '区内所有增伤收益加算，与攻击力区严格乘算。'
    },
    {
      name: '第三乘区：易伤加成 (Vulnerability %)',
      desc: '金·裂破甲撕裂易伤、Boss 铁壁击穿瘫痪 (+50%)、天命锦囊受击易伤。',
      notes: '直接放大目标受到的伤害，区内加算。'
    },
    {
      name: '第四乘区：实际暴击倍率 (Crit Multiplier)',
      desc: '实暴率 = Max(0, 暴率 - 敌韧性)；实暴伤 = 1 + Max(0, 暴伤 - 敌刚毅)。',
      notes: '未暴击时乘区为 1.0；触发暴击时计入 (1 + 实际额外暴伤)。'
    },
    {
      name: '防御抵扣结算 (Defense Mitigation)',
      desc: '减免系数 = 1 - [有效防御 / (有效防御 + 200)]。若为真伤则系数为 1.0。',
      notes: '有效防御 = 初始防御 × (1 - 破甲比例)，底线保底不低于初始值的 40%。'
    }
  ],
  example: {
    title: '实战数值推导演算 (以关羽战法斩击为例)',
    conditions: '关羽基础攻击力 120，战法系数 1.5，攻击加成 +20%，160px 阵脉增伤 +35%，敌军瘫痪易伤 +50%，暴击 (额外暴伤 +50%)，敌军初始防御 100 (无破甲)：',
    step1: '① 基础伤害基数 = 120 × 1.5 = 180 点',
    step2: '② 四乘区原始伤害 = 180 × (1 + 0.20) × (1 + 0.35) × (1 + 0.50) × (1 + 0.50) = 656.1 点',
    step3: '③ 敌军防御减免率 = 100 / (100 + 200) = 33.33% (抵扣系数 0.667)',
    step4: '④ 最终落地伤害 = 656.1 × (1 - 0.3333) ≈ 437 点伤害！(若触发金裂真伤则直接造成 656 点真伤)'
  },
  rules: [
    {
      title: '第一性原理：局外保下限、局内定上限',
      content: '局外数值总增益上限严控在 +50%（武将等级、星级、神兵面板、宝石累加基础攻击力与面板不得超过 150%），杜绝养成数值碾压关卡。'
    },
    {
      title: '抗性下限保底铁律：≥ 40%',
      content: '敌军的【防御】、【韧性】与【刚毅】无论通过何种 Debuff 或锦囊削减，最终生效值绝不低于初始值的 40%，防止 Boss 沦为纯木桩。'
    },
    {
      title: '160px 相生阵脉空间博弈',
      content: '两名相生武将部署距离 ≤ 160px 时生成地面阵脉连线，优先锁定搭档触发相生，射程交叠区内元素衰减减缓 30%，反应威力与破壁效率 +35%。'
    },
    {
      title: 'Boss【五行铁壁】相生破盾',
      content: '统帅拥有 3~5 格相生铁壁。任意相生反应命中削减 1 格；命中预告的【命脉弱点相生】削减 2 格并附加 3 秒瘫痪易伤。'
    }
  ]
}

/**
 * 5. 五虎将与五行元素专属对应
 */
export interface ElementGeneralInfo {
  name: string
  title: string
  weapon: string
  counterRole: string
  coreQuote: string
}

export const ELEMENT_GENERAL_MAP: Record<WuXing, ElementGeneralInfo> = {
  metal: {
    name: '赵云',
    title: '常山赵子龙',
    weapon: '龙胆亮银枪',
    counterRole: '专克【防御】 · 破甲流血',
    coreQuote: '一点寒芒先到，枪出如龙，金裂破甲！'
  },
  water: {
    name: '关羽',
    title: '美髯公 · 武圣',
    weapon: '青龙偃月刀',
    counterRole: '专克【移速】 · 减速软控',
    coreQuote: '水势连天，冷艳锯寒芒覆地，水湿延缓千军！'
  },
  wood: {
    name: '黄忠',
    title: '百步穿杨 · 老将',
    weapon: '养由基弓',
    counterRole: '专克【生命】 · 百分比禁疗',
    coreQuote: '箭附木毒，藤蔓索命，敌军气血尽皆消蚀！'
  },
  fire: {
    name: '马超',
    title: '西凉锦马超 · 神威天将军',
    weapon: '虎头湛金枪',
    counterRole: '放大【攻击】 · 极攻余烬',
    coreQuote: '炽烈战意，枪染烈焰，余烬爆燃焚尽八荒！'
  },
  earth: {
    name: '张飞',
    title: '万人之敌 · 猛张飞',
    weapon: '丈八蛇矛',
    counterRole: '专克【韧刚】 · 剥离暴击',
    coreQuote: '当阳怒吼，泰山压顶，土重剥离反暴，受暴必震！'
  }
}

/**
 * 获取指定五行的全部机制详情（基础状态 + 双向相生 + 专属神将）
 */
export interface ElementMechanicsDetail {
  element: WuXing
  status: ElementStatusItem
  general: ElementGeneralInfo
  generatedBy: {
    reaction: ReactionItem
    partnerElement: WuXing
    partnerGeneral: ElementGeneralInfo
    relationLabel: string
  }
  generates: {
    reaction: ReactionItem
    partnerElement: WuXing
    partnerGeneral: ElementGeneralInfo
    relationLabel: string
  }
}

export function getElementMechanicsDetail(elem: WuXing): ElementMechanicsDetail {
  const status = ELEMENT_STATUS_LIST.find((s) => s.element === elem)!
  const general = ELEMENT_GENERAL_MAP[elem]

  const relationMap: Record<WuXing, { generatedBy: { id: string; partner: WuXing; label: string }; generates: { id: string; partner: WuXing; label: string } }> = {
    metal: {
      generatedBy: { id: 'spikes', partner: 'earth', label: '土生金' },
      generates: { id: 'shatter', partner: 'water', label: '金生水' }
    },
    water: {
      generatedBy: { id: 'shatter', partner: 'metal', label: '金生水' },
      generates: { id: 'nourish', partner: 'wood', label: '水生木' }
    },
    wood: {
      generatedBy: { id: 'nourish', partner: 'water', label: '水生木' },
      generates: { id: 'wildfire', partner: 'fire', label: '木生火' }
    },
    fire: {
      generatedBy: { id: 'wildfire', partner: 'wood', label: '木生火' },
      generates: { id: 'magma', partner: 'earth', label: '火生土' }
    },
    earth: {
      generatedBy: { id: 'magma', partner: 'fire', label: '火生土' },
      generates: { id: 'spikes', partner: 'metal', label: '土生金' }
    }
  }

  const rel = relationMap[elem]
  const genByRx = REACTION_LIST.find((r) => r.id === rel.generatedBy.id)!
  const genRx = REACTION_LIST.find((r) => r.id === rel.generates.id)!

  return {
    element: elem,
    status,
    general,
    generatedBy: {
      reaction: genByRx,
      partnerElement: rel.generatedBy.partner,
      partnerGeneral: ELEMENT_GENERAL_MAP[rel.generatedBy.partner],
      relationLabel: rel.generatedBy.label
    },
    generates: {
      reaction: genRx,
      partnerElement: rel.generates.partner,
      partnerGeneral: ELEMENT_GENERAL_MAP[rel.generates.partner],
      relationLabel: rel.generates.label
    }
  }
}

