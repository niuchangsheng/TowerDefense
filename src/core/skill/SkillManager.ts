import { SkillConfig, SkillState, SkillEffect } from '@/types'
import { getSkill, isPassiveSkill } from '@/data/skills'

/**
 * 技能管理器
 * 管理英雄技能的冷却、触发和效果执行
 */
export class SkillManager {
  private skillStates: Map<string, SkillState> = new Map()

  /**
   * 初始化英雄的技能状态
   */
  initHeroSkills(passiveSkillId: string, activeSkillId: string): void {
    // 初始化被动技能
    if (passiveSkillId) {
      const passiveSkill = getSkill(passiveSkillId)
      if (passiveSkill) {
        this.skillStates.set(passiveSkillId, {
          skillId: passiveSkillId,
          currentCooldown: 0,
          isReady: true,
          isAutoActive: true // 被动技能默认自动触发
        })
      }
    }

    // 初始化主动技能
    if (activeSkillId) {
      const activeSkill = getSkill(activeSkillId)
      if (activeSkill) {
        this.skillStates.set(activeSkillId, {
          skillId: activeSkillId,
          currentCooldown: 0,
          isReady: true,
          isAutoActive: true // 主动技能默认自动触发（玩家可以关闭）
        })
      }
    }
  }

  /**
   * 获取技能状态
   */
  getSkillState(skillId: string): SkillState | undefined {
    return this.skillStates.get(skillId)
  }

  /**
   * 更新技能冷却（每帧调用）
   * @param delta 帧间隔时间（毫秒）
   */
  updateCooldowns(delta: number): void {
    this.skillStates.forEach((state) => {
      if (state.currentCooldown > 0) {
        state.currentCooldown = Math.max(0, state.currentCooldown - delta)
        state.isReady = state.currentCooldown === 0
      }
    })
  }

  /**
   * 立即缩减技能冷却时间（用于机制返还）
   */
  reduceCooldown(skillId: string, amountMs: number): void {
    const state = this.skillStates.get(skillId)
    if (state && state.currentCooldown > 0) {
      state.currentCooldown = Math.max(0, state.currentCooldown - amountMs)
      if (state.currentCooldown === 0) {
        state.isReady = true
      }
    }
  }

  /**
   * 检查技能是否可以使用
   */
  canUseSkill(skillId: string): boolean {
    const state = this.skillStates.get(skillId)
    return state?.isReady ?? false
  }

  /**
   * 触发技能冷却
   */
  triggerCooldown(skillId: string): void {
    const skill = getSkill(skillId)
    const state = this.skillStates.get(skillId)

    if (skill && state) {
      state.currentCooldown = skill.cooldown || 0
      state.isReady = false
    }
  }

  /**
   * 切换主动技能的自动释放模式
   */
  toggleAutoMode(skillId: string): boolean {
    const state = this.skillStates.get(skillId)
    if (state && !isPassiveSkill(skillId)) {
      state.isAutoActive = !state.isAutoActive
      return state.isAutoActive
    }
    return false
  }

  /**
   * 获取技能冷却进度（0-1）
   */
  getCooldownProgress(skillId: string): number {
    const skill = getSkill(skillId)
    const state = this.skillStates.get(skillId)

    if (!skill || !state) return 0
    if (!skill.cooldown || skill.cooldown === 0) return 1

    return 1 - (state.currentCooldown / skill.cooldown)
  }

  /**
   * 清理英雄技能状态
   */
  clearHeroSkills(passiveSkillId: string, activeSkillId: string): void {
    this.skillStates.delete(passiveSkillId)
    this.skillStates.delete(activeSkillId)
  }

  /**
   * 清理所有技能状态
   */
  clearAll(): void {
    this.skillStates.clear()
  }

  /**
   * 计算技能效果值（考虑加成）
   */
  calculateEffectValue(skill: SkillConfig, baseValue?: number): number {
    // TODO: 将来可以加入英雄属性加成
    return baseValue ?? skill.effect.value
  }

  /**
   * 获取技能影响范围内的目标
   * @param effect 技能效果
   * @param centerPos 技能中心位置
   * @param targets 所有可能的目标（敌人或英雄）
   * @returns 范围内的目标列表
   */
  getTargetsInRange<T extends { x: number; y: number }>(
    effect: SkillEffect,
    centerPos: { x: number; y: number },
    targets: T[]
  ): T[] {
    if (!effect.range) return []

    const rangeSq = effect.range * effect.range
    return targets.filter((target) => {
      const dx = target.x - centerPos.x
      const dy = target.y - centerPos.y
      return dx * dx + dy * dy <= rangeSq
    })
  }
}