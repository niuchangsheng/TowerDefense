import { WuXing } from './wuxing.types'
import { Point } from './level.types'

/**
 * 敌人身上的五大五行基础状态（严格一对一克制敌军五维，默认持续 2.5s = 2500ms）
 */
export type ElementalStatusType =
  | 'wet'       // 【水·湿】专克【移动速度】：降低 35% 移速（唯一基础减速软控）
  | 'parasite'  // 【木·毒】专克【生命】：每秒最大生命百分比毒伤（最多3层）+ 50% 禁疗压制
  | 'burn'      // 【火·灼】放大【攻击力】：每 0.5s 结算火伤 DoT + 阵亡余烬爆燃传染
  | 'heavy'     // 【土·重】专克【韧性 & 刚毅】：降低 25% 韧性与 40% 刚毅，受暴击触发【负重内震】（严禁减速/眩晕/破甲）
  | 'bleed'     // 【金·裂】专克【防御】：降低 35% 防御（唯一基础破甲）+ 移动触发流血真伤

/**
 * 五大五行相生化学反应类型（双向无序触发，相生不抹除底层状态，同名反应内置冷却 1.5s = 1500ms）
 */
export type ElementalReactionType =
  | 'nourish'    // 水生木【滋养·蔓延】：2.0s 藤蔓硬控定身 + 向周围扩散【木·毒】
  | 'wildfire'   // 木生火【燎原·焚尽】：引爆【木·毒】造成最大生命百分比巨额爆发 + 范围火海挂【火·灼】
  | 'magma'      // 火生土【熔岩·焦土】：生成 4.0s 熔岩焦土，削减 40% 韧性与 60% 刚毅，受暴击必触发范围【负重内震】
  | 'spikes'     // 土生金【淬刃·锋芒】：+35% 暴击率/+50% 暴伤迸射 3 道淬刃剑气，附带【金·裂】并即时结算流血真伤
  | 'shatter'    // 金生水【寒芒·碎冰】：无视防御破冰贯穿伤害 + 2.5s 绝对冰封
  | 'vaporize'   // 兼容保留旧标识

/**
 * 160px 五行相生阵脉连线信息
 */
export interface LeylineConnection {
  sourceHeroId: string
  targetHeroId: string
  sourceWuXing: WuXing
  targetWuXing: WuXing
  distance: number
  reactionType?: ElementalReactionType
}

/**
 * 元素反应触发事件数据
 */
export interface ElementalReactionResult {
  reactionType: ElementalReactionType
  reactionName: string
  color: string
  extraDamage: number
  baseReactionAttack?: number
  isCrit?: boolean
  leylineBoosted?: boolean
  aegisGridsBroken?: number
  aoeRadius?: number
  ccDuration?: number
  position: Point
}

/**
 * 敌人当前附着的元素状态信息
 */
export interface ActiveElementalStatus {
  type: ElementalStatusType
  wuXing: WuXing
  remainingMs: number
  totalMs: number
  stacks: number
  attackerAttack?: number
  attackerHeroId?: string
  damagePerSec?: number
}

