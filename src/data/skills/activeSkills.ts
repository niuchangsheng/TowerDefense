import { SkillConfig } from '@/types'

/**
 * 主动技能配置
 * 主动技能需要手动或智能触发，有冷却时间
 * 遵循《三国五行塔防》核心准则：五虎上将五行大圆满（金木水火土），伤害依托攻击力百分比加成与五行连锁反应
 */
export const activeSkills: SkillConfig[] = [
  {
    id: 'skill_active_guanyu',
    name: '青龙偃月斩',
    description: '向前方挥出浩瀚青龙刀气，造成 260% 木系范围伤害，并为命中目标附着【木·寄生】4秒；若目标带有【潮湿】，瞬时触发【水生木·滋养】大范围定身藤蔓！',
    type: 'active',
    effect: {
      type: 'damageArea',
      value: 100,
      attackMultiplier: 2.6,
      range: 220,
      target: 'area',
      element: 'wood',
      statusEffect: 'parasite',
      statusDuration: 4000
    },
    cooldown: 8000 // 冷却8秒
  },

  {
    id: 'skill_active_zhangfei',
    name: '当阳断桥喝',
    description: '张飞震天怒吼撼动地脉，对周围敌军造成 220% 土系范围伤害、击退 40 像素并附加 1.5 秒硬直眩晕与【土·破衡】4秒；若命中带有【灼烧】的敌人，触发【火生土·熔岩】焦土！',
    type: 'active',
    effect: {
      type: 'damageArea',
      value: 80,
      attackMultiplier: 2.2,
      range: 180,
      target: 'area',
      element: 'earth',
      statusEffect: 'heavy',
      statusDuration: 4000,
      knockbackDistance: 40,
      stunDuration: 1500
    },
    cooldown: 10000 // 冷却10秒
  },

  {
    id: 'skill_active_zhaoyun',
    name: '惊鸿穿云',
    description: '银龙化影穿梭全场，至多突刺 5 名敌军，各造成 180% 水系伤害，并附带【水·潮湿】与 35% 减速 4 秒；若目标已有金属性，立即引动【金生水·碎冰】！',
    type: 'active',
    effect: {
      type: 'damage',
      value: 50,
      attackMultiplier: 1.8,
      range: 260,
      target: 'enemy',
      maxTargets: 5,
      element: 'water',
      statusEffect: 'wet',
      statusDuration: 4000,
      slowRatio: 0.35
    },
    cooldown: 6000 // 冷却6秒
  },

  {
    id: 'skill_active_huangzhong',
    name: '赤焰落日箭',
    description: '引弓贯日倾泻漫天火雨，对目标区域造成 240% 火系范围伤害并附着【火·灼烧】4秒；若命中带有【木·寄生】的敌军，立刻引爆【木生火·燎原】连环大爆炸！',
    type: 'active',
    effect: {
      type: 'damageArea',
      value: 90,
      attackMultiplier: 2.4,
      range: 220,
      target: 'area',
      element: 'fire',
      statusEffect: 'burn',
      statusDuration: 4000
    },
    cooldown: 8000 // 冷却8秒
  },

  {
    id: 'skill_active_machao',
    name: '神威破军突',
    description: '西凉铁骑铁蹄如雷，向前贯穿全场造成 280% 金系穿透伤害并对沿途所有敌军施加【金·割裂】真实破甲；若命中带有【土·破衡】的敌军，触发【土生金·淬刃】散射漫天飞刃！',
    type: 'active',
    effect: {
      type: 'damageArea',
      value: 110,
      attackMultiplier: 2.8,
      range: 240,
      target: 'area',
      element: 'metal',
      statusEffect: 'bleed',
      statusDuration: 4000
    },
    cooldown: 9000 // 冷却9秒
  }
]

/**
 * 获取主动技能配置
 */
export function getActiveSkill(id: string): SkillConfig | undefined {
  return activeSkills.find(skill => skill.id === id)
}