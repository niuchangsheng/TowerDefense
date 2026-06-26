import { SkillConfig } from '@/types'

/**
 * 被动技能配置
 * 被动技能在特定条件下自动触发
 */
export const passiveSkills: SkillConfig[] = [
  {
    id: 'skill_passive_guanyu',
    name: '武圣',
    description: '攻击时有15%概率触发横扫，对周围敌人造成范围伤害',
    type: 'passive',
    effect: {
      type: 'damageArea',
      value: 30,      // 横扫伤害30点
      range: 100,     // 横扫范围100像素
      target: 'area'
    }
  },

  {
    id: 'skill_passive_zhangfei',
    name: '猛将',
    description: '永久提升10%攻击力',
    type: 'passive',
    effect: {
      type: 'buff',
      value: 10,      // 攻击力+10%
      target: 'self'
    }
  },

  {
    id: 'skill_passive_zhaoyun',
    name: '龙胆',
    description: '永久提升20%攻击速度',
    type: 'passive',
    effect: {
      type: 'buff',
      value: 20,      // 攻速+20%
      target: 'self'
    }
  }
]

/**
 * 获取被动技能配置
 */
export function getPassiveSkill(id: string): SkillConfig | undefined {
  return passiveSkills.find(skill => skill.id === id)
}