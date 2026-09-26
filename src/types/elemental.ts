import { WuXing } from './wuxing.types'
import { Point } from './level.types'

/**
 * 敌人身上的五行状态附着
 */
export type ElementalStatusType =
  | 'wet'       // 水：潮湿（移速-25%）
  | 'parasite'  // 木：寄生（持续木毒）
  | 'burn'      // 火：灼烧（防御削弱）
  | 'heavy'     // 土：破衡（受击硬直，易伤）
  | 'bleed'     // 金：割裂（附带真实破甲）

/**
 * 五行相生与相克反应类型
 */
export type ElementalReactionType =
  | 'nourish'    // 水生木【滋养·蔓延】：定身缠绕并向周围传染寄生
  | 'wildfire'   // 木生火【燎原·焚尽】：消耗寄生引爆大范围火海
  | 'magma'      // 火生土【熔岩·焦土】：生成熔岩地形减速并按最大生命扣血
  | 'spikes'     // 土生金【淬刃·锋芒】：触发穿透飞刃弹射周围多名敌人
  | 'shatter'    // 金生水【寒芒·碎冰】：将割裂转化为深度极寒冰冻与死亡碎冰
  | 'vaporize'   // 水火相克【汽化·蒸发】：产生蒸汽爆破造成高额倍率真实伤害

/**
 * 元素反应触发事件数据
 */
export interface ElementalReactionResult {
  reactionType: ElementalReactionType
  reactionName: string
  color: string
  extraDamage: number
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
  damagePerSec?: number
}
