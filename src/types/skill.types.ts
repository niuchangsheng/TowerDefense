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