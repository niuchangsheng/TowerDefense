import { WuXing, WuXingCounter, WuXingGenerate, COUNTER_MULTIPLIER, NORMAL_MULTIPLIER } from '@/types'

// 五行颜色配置（用于UI显示）
export const WUXING_COLORS: Record<WuXing, string> = {
  metal: '#FFFFFF',   // 金 - 白色
  wood: '#00FF00',    // 木 - 绿色
  water: '#0000FF',   // 水 - 蓝色
  fire: '#FF0000',    // 火 - 红色
  earth: '#FFFF00'    // 土 - 黄色
}

// 五行图标路径（待定）
export const WUXING_ICON_PATHS: Record<WuXing, string> = {
  metal: '/assets/images/ui/wuxing_metal.png',
  wood: '/assets/images/ui/wuxing_wood.png',
  water: '/assets/images/ui/wuxing_water.png',
  fire: '/assets/images/ui/wuxing_fire.png',
  earth: '/assets/images/ui/wuxing_earth.png'
}

/**
 * 判断攻击者的五行是否克制目标的五行
 * @param attacker 攻击者的五行
 * @param target 目标的五行
 * @returns 是否克制
 */
export function isCounter(attacker: WuXing, target: WuXing): boolean {
  return WuXingCounter[attacker] === target
}

/**
 * 判断五行A是否生五行B（用于宝石激活）
 * @param generator 生者的五行
 * @param generated 被生者的五行
 * @returns 是否相生
 */
export function isGenerate(generator: WuXing, generated: WuXing): boolean {
  return WuXingGenerate[generator] === generated
}

/**
 * 计算克制倍率
 * @param attacker 攻击者的五行
 * @param target 目标的五行
 * @returns 伤害倍率
 */
export function getCounterMultiplier(attacker: WuXing, target: WuXing): number {
  return isCounter(attacker, target) ? COUNTER_MULTIPLIER : NORMAL_MULTIPLIER
}

/**
 * 获取克制目标的五行
 * @param wuXing 当前五行
 * @returns 被克制的五行
 */
export function getCounterTarget(wuXing: WuXing): WuXing {
  return WuXingCounter[wuXing]
}

/**
 * 获取相生的五行
 * @param wuXing 当前五行
 * @returns 生出的五行
 */
export function getGeneratedWuXing(wuXing: WuXing): WuXing {
  return WuXingGenerate[wuXing]
}