// 敌人词缀系统（精英与首领专属特性）

export type EnemyAffixId = 'swift' | 'ironclad' | 'plague' | 'berserk' | 'vampiric'

export interface EnemyAffix {
  id: EnemyAffixId
  name: string          // 中文标签：神行、铁壁、死疫、雷怒、吸元
  label: string         // 短标记：速、壁、疫、怒、愈
  color: number         // 词缀主题色
  description: string   // 效果描述
  auraRange?: number    // 光环作用半径（若有）
}

export const ENEMY_AFFIXES: Record<EnemyAffixId, EnemyAffix> = {
  swift: {
    id: 'swift',
    name: '神行',
    label: '速',
    color: 0x3d7e9a,     // 水青色
    description: '自身移速提升 25%，并为周围 110px 范围内的友军提供 18% 移速光环。',
    auraRange: 110
  },
  ironclad: {
    id: 'ironclad',
    name: '铁壁',
    label: '壁',
    color: 0xb5893d,     // 铜金色
    description: '周身有坚韧五行护壁，普攻伤害减免 50%；若触发五行相生连锁，护壁立即粉碎并陷入 6 秒破防易伤（+50% 承受伤害）。'
  },
  plague: {
    id: 'plague',
    name: '死疫',
    label: '疫',
    color: 0x5a3e7a,     // 幽紫色
    description: '被击破时在原地炸裂墨毒，向周围 100px 扩散死疫，使附近英雄攻速降低 25%，持续 3.5 秒。',
    auraRange: 100
  },
  berserk: {
    id: 'berserk',
    name: '雷怒',
    label: '怒',
    color: 0x8a2b25,     // 朱砂红
    description: '生命值低于 35% 时进入雷怒狂暴，移速提升 40% 且免疫冰冻和眩晕控制。'
  },
  vampiric: {
    id: 'vampiric',
    name: '吸元',
    label: '愈',
    color: 0x3d6e52,     // 苍绿色
    description: '每 3 秒汲取地气自愈 5% 最大生命（若处于灼烧或流血状态则自愈失效）。'
  }
}
