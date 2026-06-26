import { SkillConfig } from '@/types'

/**
 * 主动技能配置
 * 主动技能需要手动或自动触发，有冷却时间
 */
export const activeSkills: SkillConfig[] = [
  {
    id: 'skill_active_guanyu',
    name: '青龙偃月斩',
    description: '对前方大范围敌人造成巨额伤害',
    type: 'active',
    effect: {
      type: 'damageArea',
      value: 100,     // 大范围伤害100点
      range: 200,     // 攻击范围200像素
      target: 'area'
    },
    cooldown: 8000   // 冷却8秒
  },

  {
    id: 'skill_active_zhangfei',
    name: '怒吼',
    description: '眩晕周围敌人2秒',
    type: 'active',
    effect: {
      type: 'stun',
      value: 0,       // 眩晕没有数值
      duration: 2000, // 眩晕2秒
      range: 150,     // 眩晕范围150像素
      target: 'area'
    },
    cooldown: 10000  // 冷却10秒
  },

  {
    id: 'skill_active_zhaoyun',
    name: '七进七出',
    description: '快速穿梭攻击范围内多个敌人',
    type: 'active',
    effect: {
      type: 'damage',  // 对多个目标造成伤害
      value: 50,       // 每个目标伤害50点
      range: 250,      // 搜索范围250像素
      target: 'enemy'  // 目标是敌人
    },
    cooldown: 6000   // 冷却6秒
  }
]

/**
 * 获取主动技能配置
 */
export function getActiveSkill(id: string): SkillConfig | undefined {
  return activeSkills.find(skill => skill.id === id)
}