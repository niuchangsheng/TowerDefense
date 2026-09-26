import { WuXing } from './wuxing.types'
import { ElementalStatusType } from './elemental'

// 技能类型
export type SkillType = 'passive' | 'active'

// 技能效果类型
export type SkillEffectType =
  | 'damage'           // 伤害
  | 'damageArea'       // 范围伤害
  | 'heal'             // 治疗
  | 'buff'             // 增益
  | 'debuff'           // 减益
  | 'stun'             // 眩晕
  | 'slow'             // 减速
  | 'shield'           // 护盾

// 技能效果配置
export interface SkillEffect {
  type: SkillEffectType
  value: number          // 效果数值（基础值/固定值兼容）
  duration?: number      // 持续时间（毫秒）
  range?: number         // 范围（游戏单位）
  target?: 'self' | 'enemy' | 'area' | 'allHeroes'  // 目标类型
  attackMultiplier?: number // 攻击力百分比倍率（例如 2.6 表示 260% 基础攻击力）
  element?: WuXing          // 五行属性
  statusEffect?: ElementalStatusType // 附带五行状态
  statusDuration?: number   // 状态持续时间（毫秒）
  knockbackDistance?: number // 击退距离（像素）
  stunDuration?: number      // 附带眩晕时间（毫秒）
  slowRatio?: number         // 减速比例（0-1）
  maxTargets?: number        // 最大目标数（多目标穿梭）
}

// 技能配置（数据层）
export interface SkillConfig {
  id: string
  name: string
  description: string
  type: SkillType
  effect: SkillEffect
  cooldown?: number      // 主动技能的冷却时间（毫秒）
}

// 技能运行时状态
export interface SkillState {
  skillId: string
  currentCooldown: number  // 当前冷却时间
  isReady: boolean         // 是否可用
  isAutoActive: boolean    // 主动技能是否自动释放
}

// 技能进化单节点配置
export interface SkillEvolutionNode {
  stage: number              // 境界阶数 (1-5)
  starRequired: number       // 所需星级 (1-5★)
  stageName: string          // 境界名（如 "一阶·入境"、"三阶·化境"、"五阶·大成"）
  title: string              // 进化名号（如 "初窥门径"、"气动山河"、"机制质变"、"战法极意"、"天人合一"）
  activeUpgradeDesc: string  // 主动战法提升/质变描述
  passiveUpgradeDesc: string // 被动心法强化描述
  isBreakthrough?: boolean   // 是否为关键机制质变阶段（如3星/5星）
}

// 武将技能进化路线配置
export interface HeroSkillEvolutionConfig {
  heroId: string
  heroName: string
  nodes: SkillEvolutionNode[]
}

// 技能携带状态详解条目
export interface SkillStatusDetail {
  statusKey: string          // 状态唯一标识（'parasite' | 'wet' | 'heavy' | 'burn' | 'bleed' | 'freeze' | 'stun'）
  name: string               // 中文名称（如 "【木·寄生】"）
  element?: WuXing           // 五行归属
  badgeColor: string         // 标签主色
  effectDescription: string  // 基础效果描述（每秒伤害/减速/易伤幅度）
  triggerDirect: string      // 直接触发方式（哪项技能/何种动作触发）
  triggerReaction: string    // 五行连锁触发方式（与哪些元素相生互动）
  subsequentReaction: string // 后续质变引爆机制（被其他五行攻击引爆反应）
}