import { SkillConfig } from '@/types'

/**
 * 被动技能配置
 * 被动技能在特定战斗条件下自动触发或提供机制型属性联动
 */
export const passiveSkills: SkillConfig[] = [
  {
    id: 'skill_passive_guanyu',
    name: '武圣',
    description: '普攻有 20% 概率触发青龙横扫，造成 80% 攻击力的木系范围伤害；击杀带有【木·寄生】或处于五行反应状态的敌人时，使【青龙偃月斩】冷却缩减 1 秒。',
    type: 'passive',
    effect: {
      type: 'damageArea',
      value: 30,
      attackMultiplier: 0.8,
      range: 120,
      target: 'area',
      element: 'wood'
    }
  },

  {
    id: 'skill_passive_zhangfei',
    name: '狂烈',
    description: '万人敌气魄：攻击生命低于 50% 或带有【破衡】的敌人时，伤害提升 25%；自身造成击退或眩晕后，使受击敌人受到 20% 易伤。',
    type: 'passive',
    effect: {
      type: 'buff',
      value: 25,
      target: 'self',
      element: 'earth'
    }
  },

  {
    id: 'skill_passive_zhaoyun',
    name: '龙胆',
    description: '攻击速度提升 15%；普攻每连续命中同一目标 3 次，第 4 次触发三连突刺（每次 50% 伤害，必定刷新目标【潮湿】状态）。',
    type: 'passive',
    effect: {
      type: 'buff',
      value: 15,
      target: 'self',
      element: 'water'
    }
  },

  {
    id: 'skill_passive_huangzhong',
    name: '百步穿杨',
    description: '攻击距离自身越远的目标伤害越高（最远距离增伤达 35%）；对处于【灼烧】状态的敌人暴击率提升 25%。',
    type: 'passive',
    effect: {
      type: 'buff',
      value: 25,
      target: 'self',
      element: 'fire'
    }
  },

  {
    id: 'skill_passive_machao',
    name: '西凉骠骑',
    description: '金戈狂澜：攻击速度提升 15%；击杀敌军后使自身获得一层西凉战意（攻击力提升 6%，至多叠加 5 层）。',
    type: 'passive',
    effect: {
      type: 'buff',
      value: 15,
      target: 'self',
      element: 'metal'
    }
  }
]

/**
 * 获取被动技能配置
 */
export function getPassiveSkill(id: string): SkillConfig | undefined {
  return passiveSkills.find(skill => skill.id === id)
}