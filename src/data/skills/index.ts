import { SkillConfig } from '@/types'
import { passiveSkills, getPassiveSkill } from './passiveSkills'
import { activeSkills, getActiveSkill } from './activeSkills'

export * from './passiveSkills'
export * from './activeSkills'

/**
 * 技能索引
 * 提供技能查询和加载功能
 */

// 所有被动技能
export const allPassiveSkills = passiveSkills

// 所有主动技能
export const allActiveSkills = activeSkills

/**
 * 获取技能配置（通用）
 */
export function getSkill(id: string): SkillConfig | undefined {
  // 先查找被动技能
  const passive = getPassiveSkill(id)
  if (passive) return passive

  // 再查找主动技能
  return getActiveSkill(id)
}

/**
 * 根据技能ID判断是否为被动技能
 */
export function isPassiveSkill(id: string): boolean {
  return passiveSkills.some(skill => skill.id === id)
}

/**
 * 根据技能ID判断是否为主动技能
 */
export function isActiveSkill(id: string): boolean {
  return activeSkills.some(skill => skill.id === id)
}