import { SkillStatusDetail, WuXing } from '@/types'

/**
 * 全局五行状态与控制效果字典
 */
export const statusDetailsDict: Record<string, SkillStatusDetail> = {
  parasite: {
    statusKey: 'parasite',
    name: '【木·寄生】',
    element: 'wood',
    badgeColor: '#4caf50',
    effectDescription: '灵种寄生入体，每秒扣除当前生命 3% 并抑制受疗效果 30%，持续 4~5 秒。',
    triggerDirect: '关羽主动战法【青龙偃月斩】命中直接施加；木系普攻亦可概率附着。',
    triggerReaction: '【水生木·滋养】：若命中带有【水·潮湿】的目标，立即催生青藤蔓延，强制将目标定身束缚 2~3 秒，并为自身缩短战法冷却！',
    subsequentReaction: '【木生火·燎原】：若带有寄生的目标随后被火系攻击命中，寄生种子瞬间引爆，化作连环烈焰火海造成高额范围真实殉爆！'
  },

  heavy: {
    statusKey: 'heavy',
    name: '【土·破衡重压】',
    element: 'earth',
    badgeColor: '#a1887f',
    effectDescription: '万岳重力碾压，移动速度降低 40%~50%，且承受的物理/五行伤害加深 20%~35%，持续 4 秒。',
    triggerDirect: '张飞主动战法【当阳断桥喝】近身重踏直接施加；丈八蛇矛普攻亦可震颤附着。',
    triggerReaction: '【火生土·熔岩】：若命中带有【火·灼烧】的目标，烈火与厚土化合为熔岩焦土，在地面留下持续 4 秒的地热地陷，造成范围持续减速与灼烧！',
    subsequentReaction: '【土生金·淬刃】：若带有重压的目标随后被金系攻击命中，重甲失衡直接触发神锋破阵，向四周辐射漫天飞刃并直接斩杀残血！'
  },

  wet: {
    statusKey: 'wet',
    name: '【水·潮湿】',
    element: 'water',
    badgeColor: '#29b6f6',
    effectDescription: '水汽透骨浸润，移动速度降低 25%~45%，雷电与极寒抗性大幅削弱，持续 4 秒。',
    triggerDirect: '赵云主动战法【惊鸿穿云】化影穿刺直接施加；被动【龙胆】连突必定刷新潮湿。',
    triggerReaction: '【金生水·碎冰】：若目标带有【金·割裂】或金系印记，攻击瞬间引爆碎冰穿透，产生大范围冰凌溅射，造成无视护甲的高额真实伤害！',
    subsequentReaction: '【水生木·滋养】：若带有潮湿的目标随后被关羽木系刀气命中，水润滋生巨藤，将其绝对捆缚定身 3 秒！'
  },

  burn: {
    statusKey: 'burn',
    name: '【火·灼烧】',
    element: 'fire',
    badgeColor: '#ff5722',
    effectDescription: '三昧烈焰焚身，每秒承受高额火系真实伤害；若敌人在灼烧期间阵亡，将触发【红莲殉爆】向周围传染烈火！',
    triggerDirect: '黄忠主动战法【赤焰落日箭】火雨大范围轰炸直接点燃；射日神弓箭矢附着。',
    triggerReaction: '【木生火·燎原】：若命中带有【木·寄生】的目标，火借木势瞬间引爆大爆炸，形成扩散整整半屏的燎原火海！',
    subsequentReaction: '【火生土·熔岩】：若带有灼烧的目标随后被张飞土系战法震击，引爆地心熔岩陷阱，造成持续范围易伤与灼热减速！'
  },

  bleed: {
    statusKey: 'bleed',
    name: '【金·割裂撕裂】',
    element: 'metal',
    badgeColor: '#ffd54f',
    effectDescription: '庚金锐气撕裂防线，敌人护甲直接削弱 40%~50%，并在移动过程中持续遭受流血真实撕裂伤害！',
    triggerDirect: '马超主动战法【神威破军突】直线冲踏全军直接施加；湛金枪普攻暴击附带。',
    triggerReaction: '【土生金·淬刃】：若命中带有【土·破衡】的目标，金锋破阵引爆 6 枚高速飞刃散射全场，并斩杀生命低于 20% 的残血非精英目标！',
    subsequentReaction: '【金生水·碎冰】：若带有割裂的目标随后被赵云水系长枪突刺，引爆极寒碎冰穿透，造成大范围真实暴击溅射！'
  },

  freeze: {
    statusKey: 'freeze',
    name: '【极寒·冰冻】',
    element: 'water',
    badgeColor: '#00b0ff',
    effectDescription: '玄冰完全冻结，绝对定身打断一切行动与蓄力，持续 1.5~2 秒，解冻后仍附带 40% 深度减速。',
    triggerDirect: '赵云五阶极意【七进七出】终极大招、5级玄武神石终极攻击特效触发。',
    triggerReaction: '【金生水极寒反应】：金戈与潮湿发生剧烈化学反应时引爆冻结。',
    subsequentReaction: '冰冻期间受到任何暴击伤害均将产生二次冰渣溅射破片！'
  },

  stun: {
    statusKey: 'stun',
    name: '【当阳·震慑眩晕】',
    element: 'earth',
    badgeColor: '#8d6e63',
    effectDescription: '雄浑霸气强行中断敌人施法与前进步伐，原地昏迷瘫痪 1.5~2.5 秒，无法进行任何移动与攻击。',
    triggerDirect: '张飞【当阳断桥喝】音波冲击、5级麒麟圣玉重击直接触发。',
    triggerReaction: '【断桥强控】：若敌军在跳跃或冲刺过程中被震慑，将额外受到双倍击退距离。',
    subsequentReaction: '眩晕期间受到的所有物理与五行伤害额外提升 30% 易伤！'
  }
}

/**
 * 根据武将ID获取该武将技能专属关联的状态详解列表
 */
export function getHeroStatusDetails(heroId: string): SkillStatusDetail[] {
  switch (heroId) {
    case 'hero_guanyu':
      return [
        statusDetailsDict['parasite'],
        statusDetailsDict['wet']
      ]
    case 'hero_zhangfei':
      return [
        statusDetailsDict['heavy'],
        statusDetailsDict['stun'],
        statusDetailsDict['burn']
      ]
    case 'hero_zhaoyun':
      return [
        statusDetailsDict['wet'],
        statusDetailsDict['bleed'],
        statusDetailsDict['freeze']
      ]
    case 'hero_huangzhong':
      return [
        statusDetailsDict['burn'],
        statusDetailsDict['parasite']
      ]
    case 'hero_machao':
      return [
        statusDetailsDict['bleed'],
        statusDetailsDict['heavy']
      ]
    default:
      return [
        statusDetailsDict['parasite'],
        statusDetailsDict['wet'],
        statusDetailsDict['heavy'],
        statusDetailsDict['burn'],
        statusDetailsDict['bleed']
      ]
  }
}
