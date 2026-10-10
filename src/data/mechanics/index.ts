import { WuXing } from '@/types'

/**
 * 机制分类标签
 * 1. 【五行相生】(wuxing)：纯粹五行基础状态与双向相生化学连锁体系（独立完整大屏展示）
 * 2. 【乾坤算法】(damage)：四独立伤害乘区算法、具体属性对冲与 7 步细化端到端结算流程
 */
export type MechanicsTab = 'wuxing' | 'damage'

export interface MechanicsTabDef {
  key: MechanicsTab
  title: string
  seal: string
  subtitle: string
}

export const MECHANICS_TABS: MechanicsTabDef[] = [
  {
    key: 'wuxing',
    title: '五行相生',
    seal: '生',
    subtitle: '五大五行基础状态 · 双向化学连锁 · 160px相生阵脉'
  },
  {
    key: 'damage',
    title: '乾坤算法',
    seal: '算',
    subtitle: '四独立伤害乘区 · 7步细化结算 · 防御折算 · 底层铁律'
  }
]

/**
 * 五虎上将五行归属
 */
export const ELEMENT_GENERAL_MAP: Record<WuXing, { name: string; title: string }> = {
  metal: { name: '马超', title: '西凉神威锦马超' },
  water: { name: '赵云', title: '常山常胜赵子龙' },
  wood:  { name: '关羽', title: '汉寿亭侯美髯公' },
  fire:  { name: '黄忠', title: '百步穿杨汉升弓' },
  earth: { name: '张飞', title: '燕颔虎须翼德矛' }
}

export interface WuXingColorSet {
  name: string
  char: string
  color: number
  hex: string
  border: number
  fill: number
  glow: number
  faint: number
  lightBg: number
}

/**
 * 五行调色板常量
 */
export const WUXING_PALETTE: Record<WuXing, WuXingColorSet> = {
  wood:  { name: '木', char: '木', color: 0x2e7d32, hex: '#2e7d32', border: 0x388e3c, fill: 0xedf7ed, glow: 0x66bb6a, faint: 0xc8e6c9, lightBg: 0xedf7ed },
  fire:  { name: '火', char: '火', color: 0xc62828, hex: '#c62828', border: 0xd32f2f, fill: 0xfdecea, glow: 0xef5350, faint: 0xffcdd2, lightBg: 0xfdecea },
  earth: { name: '土', char: '土', color: 0x8d5b28, hex: '#8d5b28', border: 0x9a6735, fill: 0xfbf2e9, glow: 0xbcaaa4, faint: 0xd7ccc8, lightBg: 0xfbf2e9 },
  metal: { name: '金', char: '金', color: 0xb8860b, hex: '#b8860b', border: 0xcda832, fill: 0xfef9e7, glow: 0xffd54f, faint: 0xffecb3, lightBg: 0xfef9e7 },
  water: { name: '水', char: '水', color: 0x0277bd, hex: '#0277bd', border: 0x0288d1, fill: 0xe1f5fe, glow: 0x4fc3f7, faint: 0xb3e5fc, lightBg: 0xe1f5fe }
}

/**
 * 1. 五大五行基础状态（严格一对一边界：专克对应敌军属性）
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
    name: '木 · 毒 (噬生青藤)',
    char: '毒',
    targetStat: '生命 (HP 百分比腐蚀)',
    color: 0x2e7d32,
    textColor: '#2e7d32',
    summary: '专克敌军生命上限。按最大生命值百分比腐蚀，并施加禁疗压制。',
    duration: '2.5 秒',
    details: [
      '专克属性：【敌军生命 (HP)】。按最大生命值百分比持续腐蚀真实伤害。',
      '腐蚀与禁疗：每 0.5s 造成敌军最大生命值 2.0% 的真实腐蚀伤害，且压制敌军 50% 回血效果。',
      '层数堆叠：最多可叠加至 3 层（最高每秒 12% 最大生命值腐蚀）。'
    ],
    rules: [
      '严禁附带破甲或减速，严格锁定生命压制职能。',
      '水生木可将其升级为定身藤蔓并向周围扩散。'
    ]
  },
  {
    element: 'metal',
    name: '金 · 裂 (裂甲锋刃)',
    char: '裂',
    targetStat: '防御 (Armor 削减破甲)',
    color: 0xc59b27,
    textColor: '#a67c1e',
    summary: '全场唯一具备破甲能力的基础状态。大幅撕裂护甲并随移动触发流血真伤。',
    duration: '2.5 秒',
    details: [
      '专克属性：【敌军防御 (Defense)】。大幅削减敌军护甲值。',
      '唯一破甲：撕裂敌军 35% 物理与法术护甲，使后续所有伤害大幅提升。',
      '位移流血：目标移动时触发割裂，每移动 50px 额外受到攻击者 45% 攻击力的流血真伤。'
    ],
    rules: [
      '全场五大基础状态中唯一具备破甲职能的状态。',
      '削减后敌军防御底线绝不低于初始值的 40% 保底。'
    ]
  },
  {
    element: 'water',
    name: '水 · 湿 (润下迟滞)',
    char: '湿',
    targetStat: '移动速度 (MoveSpeed 软控)',
    color: 0x206095,
    textColor: '#206095',
    summary: '全场唯一具备移速削减的基础状态。水墨漫足，造成强力减速软控。',
    duration: '2.5 秒',
    details: [
      '专克属性：【敌军移动速度 (MoveSpeed)】。',
      '唯一软控：水流滞足，直接削减目标 35% 移动速度。',
      '相生媒介：为水生木【滋养定身】与金生水【绝对冰封】提供核心反应媒介。'
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
    title: '水生木',
    color: 0x2e7d32,
    textColor: '#2e7d32',
    type: '强力控制 + 状态扩散',
    summary: '将【水·湿】软控升级为 2.0s 藤蔓绝对定身，并向周围扩散【木·毒】。',
    icd: '1.5 秒同目标冷却',
    details: [
      '绝对定身：敌军被墨藤彻底缠绕 2.0 秒，无法移动与冲锋。',
      '群体剧毒：定身时向周围 120px 范围内的所有敌军扩散一层【木·毒】。',
      '相生共鸣：基数取水木双将最高攻击力 + 另一武将 25% 协同攻击力。'
    ]
  },
  {
    id: 'wildfire',
    name: '木生火【燎原 · 焚尽】',
    elements: ['wood', 'fire'],
    title: '木生火',
    color: 0xc62828,
    textColor: '#c62828',
    type: '巨额斩杀 + 范围火海',
    summary: '引爆【木·毒】造成瞬发目标最大生命 8% 巨额爆发，并生成 3.5s 烈焰火海。',
    icd: '1.5 秒同目标冷却',
    details: [
      '瞬发斩杀：引爆目标体内的木毒，造成相当于目标最大生命值 8% 的巨额相生爆发伤害。',
      '烈焰火海：在目标脚下留下持续 3.5 秒的火海，踏入者每秒受 60% 攻击力火焰伤害并挂【火·灼】。',
      '清场利器：针对高血量精英怪与成群小兵的终极清场反应。'
    ]
  },
  {
    id: 'magma',
    name: '火生土【熔岩 · 焦土】',
    elements: ['fire', 'earth'],
    title: '火生土',
    color: 0x8d5b28,
    textColor: '#8d5b28',
    type: '削韧破刚 + 震波易暴',
    summary: '引爆【火·灼】生成 4.0s 熔岩焦土，大幅削减敌军韧性刚毅，受暴击必触发范围震波。',
    icd: '1.5 秒同目标冷却',
    details: [
      '熔岩焦土：地脉熔岩喷发形成 4.0 秒焦土地带，区域内敌军持续承受火土双重灼烧。',
      '剥离抗暴：进入焦土的敌人【韧性 (Tenacity)】与【刚毅 (Fortitude)】降低 40%。',
      '暴击诱震：焦土内受到暴击时，必额外触发 100% 威力的【负重内震】群体物理冲击。'
    ]
  },
  {
    id: 'spikes',
    name: '土生金【淬刃 · 锋芒】',
    elements: ['earth', 'metal'],
    title: '土生金',
    color: 0xb8860b,
    textColor: '#a67c1e',
    type: '高暴突刺 + 流血结算',
    summary: '承接土破韧刚、金破护甲双重红利，迸射 3 道高暴淬刃剑气并即时结算流血真伤。',
    icd: '1.5 秒同目标冷却',
    details: [
      '淬刃剑气：破土而出 3 道金石剑气，自带 +30% 额外暴击率与 +50% 额外暴击伤害。',
      '附带金裂：被剑气命中的所有目标立即附着【金·裂】撕裂状态。',
      '流血结算：若目标已在流血，立即瞬间结算其剩余流血的全部伤害。'
    ]
  },
  {
    id: 'shatter',
    name: '金生水【寒芒 · 碎冰】',
    elements: ['metal', 'water'],
    title: '金生水',
    color: 0x0277bd,
    textColor: '#0277bd',
    type: '无视防御 + 绝对硬控',
    summary: '寒水顺着金裂护甲裂隙灌入，造成无视防御破冰伤害并触发 2.5s 绝对冰封。',
    icd: '1.5 秒同目标冷却',
    details: [
      '绝对冰封：将移动目标完全冻结成冰雕 2.5 秒，打断一切突进与施法。',
      '破冰真伤：完全无视目标护甲防御值的穿透碎冰伤害。',
      '终极控场：金裂破甲为引，寒水渗透冰封，形成绝对压制控场。'
    ]
  }
]

/**
 * 3. 结构化伤害乘区结算节点（清晰卡片化呈现：公式、面板字段、结算逻辑）
 */
export interface FormulaStepItem {
  id: string
  step: string
  name: string
  stageTag: string
  formula: string
  panelMapping: string
  settlementLogic: string
  color: number
  textColor: string
}

export const DAMAGE_FORMULA_STEPS: FormulaStepItem[] = [
  {
    id: 'base',
    step: '步骤 ①',
    name: '基础基数 (Base)',
    stageTag: '输出源头',
    formula: 'Base = 攻击力 × 技能倍率',
    panelMapping: '面板 attack',
    settlementLogic: '普攻取 attack × 1.0；战法取 attack × 倍率；相生取 max(A,B) + 0.25*min(A,B)；毒素取 enemy.maxHp × 2%',
    color: 0x8a6230,
    textColor: '#8a6230'
  },
  {
    id: 'atk_boost',
    step: '步骤 ②',
    name: '攻击力加成 (AtkBoost)',
    stageTag: '第一乘区',
    formula: '系数 = 1 + ∑攻击力加成',
    panelMapping: '面板 attackBoostSum',
    settlementLogic: '武将星级升级、神兵基础攻击、宝石基础属性、军令百分比累加（区内加算；局外总增益硬封顶 ≤ +50%）',
    color: 0xb53a32,
    textColor: '#b53a32'
  },
  {
    id: 'dmg_inc',
    step: '步骤 ③',
    name: '增伤加成 (DmgInc)',
    stageTag: '第二乘区',
    formula: '系数 = 1 + ∑增伤加成',
    panelMapping: '面板 damageIncreaseSum',
    settlementLogic: '相生倍率 + 天时顺天(+20%) + 160px相生阵脉(+35%) + 锦囊增伤累加（区内所有增伤收益加算，严格跨区乘算）',
    color: 0x2e7d32,
    textColor: '#2e7d32'
  },
  {
    id: 'vuln',
    step: '步骤 ④',
    name: '易伤加成 (Vuln)',
    stageTag: '第三乘区',
    formula: '系数 = 1 + ∑易伤加成',
    panelMapping: '面板 vulnerabilitySum',
    settlementLogic: 'Boss相生破壁瘫痪(+50%) + 《五气朝元》每态(+18%) + 受击易伤Debuff累加（目标承伤直接放大，区内加算）',
    color: 0x8a3ab5,
    textColor: '#8a3ab5'
  },
  {
    id: 'crit',
    step: '步骤 ⑤',
    name: '暴击对抗 (CritMult)',
    stageTag: '第四乘区',
    formula: '实暴率 = 暴率 - 韧性；实暴伤 = 1 + max(0, 暴伤 - 100% - 刚毅)',
    panelMapping: '面板 critRate/critDamage vs 敌方 tenacity/fortitude',
    settlementLogic: '敌军有效韧性与刚毅保底 ≥ 初始值 40%；未暴击乘区为 1.0；暴击计入 (1 + 超额暴伤倍率)',
    color: 0xd97706,
    textColor: '#d97706'
  },
  {
    id: 'def_mit',
    step: '步骤 ⑥',
    name: '防御减免 (DefMit)',
    stageTag: '抗性折算',
    formula: '有效防御 = 初始防御 × (1 - 破甲%)；减免率 = 有效防御 / (有效防御 + 200)',
    panelMapping: '敌方面板 defense (破甲削减后保底 ≥ 初始值 40%)',
    settlementLogic: '真实伤害(金·裂流血 / 金生水碎冰 / 木·毒腐蚀)减免率 = 0 直接穿透；常规伤害经护甲曲线折算抵扣',
    color: 0x2b638f,
    textColor: '#2b638f'
  },
  {
    id: 'final',
    step: '步骤 ⑦',
    name: '最终落地伤害 (Damage)',
    stageTag: '终局结算',
    formula: 'Damage = floor( Base × Mult_atk × Mult_dmg × Mult_vuln × Mult_crit × (1 - DefMit) )',
    panelMapping: '直接扣除敌军当前生命值 (hp)',
    settlementLogic: '四独立乘区严格乘算，真伤跳过护甲减免，单次结算保底 ≥ 1 点伤害',
    color: 0x9e2b25,
    textColor: '#9e2b25'
  }
]

/**
 * 4. 乾坤算法 6 大核心结算因子卡片（流水线卡片矩阵：序号、公式、对应面板、极简要点）
 */
export interface DamagePipelineCard {
  id: string
  stepBadge: string
  title: string
  formula: string
  panelLabel: string
  color: number
  textColor: string
  points: string[]
}

export const DAMAGE_PIPELINE_CARDS: DamagePipelineCard[] = [
  {
    id: 'base',
    stepBadge: '① 基础基数',
    title: '基础伤害 (Base)',
    formula: 'Base = 攻方面板 attack × 技能倍率',
    panelLabel: '【攻方面板】attack (攻击力)',
    color: 0x8a6230,
    textColor: '#8a6230',
    points: [
      '● 普攻 1.0x ｜ 战法按技能倍率加成',
      '● 相生择优: max(A,B) + 0.25 × min(A,B)'
    ]
  },
  {
    id: 'atk_boost',
    stepBadge: '② 攻击乘区',
    title: '攻击加成 (AtkBoost)',
    formula: '系数 = 1 + ∑攻击力百分比加成',
    panelLabel: '【攻方面板】attackBoostSum',
    color: 0xb53a32,
    textColor: '#b53a32',
    points: [
      '● 武将冲穴 / 神兵基础攻 / 宝石词条 / 军令',
      '● 区内加算 ｜ 局外总增益硬封顶 ≤ +50%'
    ]
  },
  {
    id: 'dmg_inc',
    stepBadge: '③ 增伤乘区',
    title: '增伤加成 (DmgInc)',
    formula: '系数 = 1 + ∑增伤收益加成',
    panelLabel: '【局内状态】damageIncreaseSum',
    color: 0x2e7d32,
    textColor: '#2e7d32',
    points: [
      '● 相生倍率 + 顺天天时(+20%) + 锦囊增伤',
      '● 160px相生阵脉: 连线搭档反应威力 +35%'
    ]
  },
  {
    id: 'vuln',
    stepBadge: '④ 易伤乘区',
    title: '易伤加成 (Vuln)',
    formula: '系数 = 1 + ∑目标受击易伤比例',
    panelLabel: '【守方面板】vulnerabilitySum',
    color: 0x8a3ab5,
    textColor: '#8a3ab5',
    points: [
      '● Boss破铁壁瘫痪(+50%) ｜ 受击易伤Debuff',
      '● 《五气朝元》每类状态放大 +18% 承伤'
    ]
  },
  {
    id: 'crit',
    stepBadge: '⑤ 暴击对抗',
    title: '暴击对抗 (Crit vs Ten/Fort)',
    formula: '实暴率 = 暴率 - 韧性；实暴伤 = 1 + max(0, 暴伤 - 刚毅)',
    panelLabel: '【攻防对冲】暴率/暴伤 vs 韧性/刚毅',
    color: 0xd97706,
    textColor: '#d97706',
    points: [
      '● 敌韧性抵扣暴率，敌刚毅抵扣暴伤 (未暴为1.0)',
      '● 【土·重】削韧破刚，受暴必诱发【负重内震】'
    ]
  },
  {
    id: 'def_mit',
    stepBadge: '⑥ 护甲折算',
    title: '防御折算 (DefMit / TrueDmg)',
    formula: '有效防 = 初始防 × (1 - 破甲%) ｜ 减免 = 有效防 / (有效防 + 200)',
    panelLabel: '【守方面板】defense ｜ 破甲削减',
    color: 0x2b638f,
    textColor: '#2b638f',
    points: [
      '● 破甲关系：破甲压低有效防御，减免率下降，承伤(1-减免率)上升',
      '● 机制边界：金·裂破甲 35% (保底≥初始40%) ｜ 真伤减免=0直穿！'
    ]
  }
]

/**
 * 4. 伤害公式与底层铁律（包含具体攻击力与防御力数值结算）
 */
export const DAMAGE_FORMULA_GUIDE = {
  formula: '最终伤害 = floor( 基础基数 × (1 + ∑攻击加成) × (1 + ∑增伤) × (1 + ∑易伤) × (1 + 实际暴伤) × (1 - 防御减免率) )',
  steps: DAMAGE_FORMULA_STEPS,
  coreComponents: [
    {
      title: '基础基数 (Base Damage)',
      content: '普攻取面板攻击力；主动战法取攻击力×倍率；相生反应取双将最高攻击力 + 另一将 25% 协同加成。'
    },
    {
      title: '敌方防御与破甲 (Defense & Shred)',
      content: '有效防御 = 初始防御 × (1 - 破甲%)。常规减免率 = 有效防御 / (有效防御 + 200)。破甲压低有效防御从而大幅降低减免率，最终承伤系数为 (1 - 减免率)。抗性保底不低于初始值的 40%。'
    },
    {
      title: '真实伤害 (Ignore Def)',
      content: '【金·裂】位移流血真伤、【金生水·碎冰】穿透真伤完全跳过防御（防御减免 = 0）。'
    },
    {
      title: '暴击对抗 (Crit vs Tenacity/Fortitude)',
      content: '实暴率 = Max(0, 暴率 - 敌韧性)；实暴伤 = Max(0, 暴伤 - 100% - 敌刚毅)。土·重可削韧破刚。'
    }
  ],
  buckets: [
    {
      name: '基础伤害基数 Base',
      desc: '普攻面板攻击力；战法攻击力×倍率；相生 max(A,B)+0.25*min(A,B)。',
      notes: '相生共鸣取优法则：双将中最高攻击为主基数，附加另一将 25% 协同。'
    },
    {
      name: '第一乘区：攻击加成 AtkBoost',
      desc: '神兵词条加成、局内锦囊、军令充能百分比加成。',
      notes: '区内百分比加算；局外面板累加总增益上限硬封顶 ≤ +50%。'
    },
    {
      name: '第二乘区：增伤加成 DmgInc',
      desc: '相生倍率、天时顺天 (+20%)、160px 相生阵脉 (+35%)、锦囊增伤。',
      notes: '区内所有增伤收益加算，与攻击力区严格乘算。'
    },
    {
      name: '第三乘区：易伤加成 Vuln',
      desc: 'Boss 铁壁击穿瘫痪 (+50%)、锦囊《五气朝元》每态 (+18%)、受击易伤。',
      notes: '直接放大目标受到的伤害，区内加算。'
    },
    {
      name: '第四乘区：实际暴伤 CritMult',
      desc: '实暴率 = Max(0, 暴率 - 敌韧性)；实暴伤 = Max(0, 暴伤 - 100% - 敌刚毅)。',
      notes: '未暴击时乘区为 1.0；触发暴击时计入 (1 + 实际额外暴伤)。'
    },
    {
      name: '防御抵扣结算 DefMit',
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
 * 5. 获取指定五行的全部机制详情（基础状态 + 双向相生，与武将完全解耦）
 */
export interface ElementMechanicsDetail {
  element: WuXing
  status: ElementStatusItem
  generatedBy: {
    reaction: ReactionItem
    partnerElement: WuXing
    relationLabel: string
  }
  generates: {
    reaction: ReactionItem
    partnerElement: WuXing
    relationLabel: string
  }
}

export function getElementMechanicsDetail(elem: WuXing): ElementMechanicsDetail {
  const status = ELEMENT_STATUS_LIST.find((s) => s.element === elem)!

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
    generatedBy: {
      reaction: genByRx,
      partnerElement: rel.generatedBy.partner,
      relationLabel: rel.generatedBy.label
    },
    generates: {
      reaction: genRx,
      partnerElement: rel.generates.partner,
      relationLabel: rel.generates.label
    }
  }
}
