import { HeroSkillEvolutionConfig, SkillEvolutionNode } from '@/types'

/**
 * 武将技能进化路线配置表（五虎上将全阶位境界演武）
 * 每一位武将随着星级（1★~5★）逐步完成从初窥门径到天人合一的 5 阶境界质变
 */
export const heroSkillEvolutions: Record<string, HeroSkillEvolutionConfig> = {
  // 1. 关羽（木）
  hero_guanyu: {
    heroId: 'hero_guanyu',
    heroName: '关羽',
    nodes: [
      {
        stage: 1,
        starRequired: 1,
        stageName: '一阶·入境',
        title: '刀气初启',
        activeUpgradeDesc: '向前挥出青龙刀气，造成 260% 木系范围伤害，并为目标施加【木·寄生】4秒。',
        passiveUpgradeDesc: '【武圣】普攻有 20% 概率触发青龙横扫，击杀寄生/反应目标缩减战法冷却 1 秒。',
        isBreakthrough: false
      },
      {
        stage: 2,
        starRequired: 2,
        stageName: '二阶·通晓',
        title: '青龙凝锋',
        activeUpgradeDesc: '刀芒暴涨！伤害提升至 290%，寄生持续时间延长至 5 秒，扇形范围扩大 15%。',
        passiveUpgradeDesc: '【武圣】横扫触发概率由 20% 提升至 25%，横扫伤害提升至 95% 攻击力。',
        isBreakthrough: false
      },
      {
        stage: 3,
        starRequired: 3,
        stageName: '三阶·化境',
        title: '触水生根 · 质变',
        activeUpgradeDesc: '★【机制质变】若命中带有【水·潮湿】的敌人，定身时间延长至 3 秒，并向两侧额外迸发 2 道青龙分刃斩击！',
        passiveUpgradeDesc: '【武圣】击杀处于任何五行连锁反应状态的敌人时，使全阵营木系武将战法冷却缩减 0.5 秒。',
        isBreakthrough: true
      },
      {
        stage: 4,
        starRequired: 4,
        stageName: '四阶·通玄',
        title: '兵法神速',
        activeUpgradeDesc: '战法极意！青龙偃月斩基础冷却时间由 8 秒大幅缩减至 6 秒。',
        passiveUpgradeDesc: '【武圣】击杀反应目标减 CD 效果由 1 秒提升至 1.5 秒，且自身暴击率永久提升 15%。',
        isBreakthrough: false
      },
      {
        stage: 5,
        starRequired: 5,
        stageName: '五阶·大成',
        title: '青龙真灵 · 极意',
        activeUpgradeDesc: '★【终极觉醒】伤害跃升至 380%！召唤青龙法相凌空横斩，狂暴木系灵刃全屏扫荡并使敌人受击伤害加深 30%！',
        passiveUpgradeDesc: '【武圣】普攻必定带有青龙锐芒，对处于寄生状态的敌人造成 100% 暴击！',
        isBreakthrough: true
      }
    ]
  },

  // 2. 张飞（土）
  hero_zhangfei: {
    heroId: 'hero_zhangfei',
    heroName: '张飞',
    nodes: [
      {
        stage: 1,
        starRequired: 1,
        stageName: '一阶·入境',
        title: '断桥怒喝',
        activeUpgradeDesc: '怒吼撼动地脉，对周围敌军造成 220% 土系范围伤害、击退 40 像素并附加眩晕 1.5 秒与【土·破衡】4秒。',
        passiveUpgradeDesc: '【狂烈】攻击生命低于 50% 或带有【破衡】的敌人时，伤害提升 25%；造成击退/眩晕后附带 20% 易伤。',
        isBreakthrough: false
      },
      {
        stage: 2,
        starRequired: 2,
        stageName: '二阶·通晓',
        title: '狮吼震天',
        activeUpgradeDesc: '伤害提升至 250%，震慑范围扩大 30 像素，眩晕时间延长至 1.8 秒。',
        passiveUpgradeDesc: '【狂烈】低血量增伤阈值放宽至 60%，增伤幅度提升至 30%。',
        isBreakthrough: false
      },
      {
        stage: 3,
        starRequired: 3,
        stageName: '三阶·化境',
        title: '地热焦土 · 质变',
        activeUpgradeDesc: '★【机制质变】若命中带有【火·灼烧】的敌人，触发【火生土·熔岩】，在地面留下持续 4 秒的灼热裂隙（减速 50% 并使受击伤害加深 35%）！',
        passiveUpgradeDesc: '【狂烈】张飞自身受到的近战伤害减免 20%，并在遭受攻击时向周围震散击退波。',
        isBreakthrough: true
      },
      {
        stage: 4,
        starRequired: 4,
        stageName: '四阶·通玄',
        title: '万夫莫敌',
        activeUpgradeDesc: '冷却时间缩减 2 秒（10s -> 8s），断喝击退距离由 40 像素提升至 70 像素。',
        passiveUpgradeDesc: '【狂烈】造成的易伤效果由 20% 跃升至 35%，且周围全体友方武将共享 50% 狂烈增伤。',
        isBreakthrough: false
      },
      {
        stage: 5,
        starRequired: 5,
        stageName: '五阶·大成',
        title: '当阳天堑 · 极意',
        activeUpgradeDesc: '★【终极觉醒】伤害跃升至 350%！断喝强震波扩散全场，粉碎敌人 50% 护甲，强行打断蓄力并压制全场 2.5 秒！',
        passiveUpgradeDesc: '【狂烈】万人敌真意觉醒：当周围敌人大于 5 人时，自身攻击力直接翻倍！',
        isBreakthrough: true
      }
    ]
  },

  // 3. 赵云（水）
  hero_zhaoyun: {
    heroId: 'hero_zhaoyun',
    heroName: '赵云',
    nodes: [
      {
        stage: 1,
        starRequired: 1,
        stageName: '一阶·入境',
        title: '龙影疾突',
        activeUpgradeDesc: '银龙穿梭全场，至多突刺 5 名敌军，各造成 180% 水伤，附带【水·潮湿】与 35% 减速 4 秒。',
        passiveUpgradeDesc: '【龙胆】攻击速度提升 15%；普攻每连续命中同一目标 3 次，第 4 次触发三连突刺并刷新潮湿。',
        isBreakthrough: false
      },
      {
        stage: 2,
        starRequired: 2,
        stageName: '二阶·通晓',
        title: '惊鸿掠影',
        activeUpgradeDesc: '突刺伤害提升至 210%，减速比例提升至 45%，突刺目标数量增至 6 名。',
        passiveUpgradeDesc: '【龙胆】攻速提升幅度增加至 22%，三连突刺每次命中附带额外 10% 暴击率。',
        isBreakthrough: false
      },
      {
        stage: 3,
        starRequired: 3,
        stageName: '三阶·化境',
        title: '碎冰穿刺 · 质变',
        activeUpgradeDesc: '★【机制质变】目标若带有【金·割裂】或金属性，突刺时立即引爆【金生水·碎冰】，向周围溅射冰凌造成 100% 真实范围穿透伤害！',
        passiveUpgradeDesc: '【龙胆】触发三连突刺时，自身获得 1.5 秒无敌与移速狂暴加成。',
        isBreakthrough: true
      },
      {
        stage: 4,
        starRequired: 4,
        stageName: '四阶·通玄',
        title: '浑身是胆',
        activeUpgradeDesc: '战法冷却缩减 1.5 秒（6s -> 4.5s），突刺过程中无视敌人护甲。',
        passiveUpgradeDesc: '【龙胆】心法顿悟：只需普攻连续命中 2 次，即可在第 3 次直接引爆三连突刺！',
        isBreakthrough: false
      },
      {
        stage: 5,
        starRequired: 5,
        stageName: '五阶·大成',
        title: '七进七出 · 极意',
        activeUpgradeDesc: '★【终极觉醒】白马银枪傲苍穹！惊鸿穿云可突刺全场多达 10 名目标，造成 320% 穿透伤害并对所有受击目标绝对定身冰封 2 秒！',
        passiveUpgradeDesc: '【龙胆】龙魂护体：每次突刺永久恢复自身与防线 2% 灵力。',
        isBreakthrough: true
      }
    ]
  },

  // 4. 黄忠（火）
  hero_huangzhong: {
    heroId: 'hero_huangzhong',
    heroName: '黄忠',
    nodes: [
      {
        stage: 1,
        starRequired: 1,
        stageName: '一阶·入境',
        title: '引弓落日',
        activeUpgradeDesc: '引弓贯日倾泻漫天火雨，对目标区域造成 240% 火系范围伤害并附着【火·灼烧】4秒。',
        passiveUpgradeDesc: '【百步穿杨】攻击距离自身越远的目标伤害越高（最远增伤 35%）；对处于灼烧状态敌人暴击率提升 25%。',
        isBreakthrough: false
      },
      {
        stage: 2,
        starRequired: 2,
        stageName: '二阶·通晓',
        title: '烈阳灼空',
        activeUpgradeDesc: '火雨伤害提升至 275%，轰炸范围扩大 30 像素，灼烧持续时间延长至 5 秒。',
        passiveUpgradeDesc: '【百步穿杨】最远距离增伤上限提升至 45%，对近身敌人亦能通过烈火将其击退。',
        isBreakthrough: false
      },
      {
        stage: 3,
        starRequired: 3,
        stageName: '三阶·化境',
        title: '烈火燎原 · 质变',
        activeUpgradeDesc: '★【机制质变】命中带有【木·寄生】的敌军时立刻引爆【木生火·燎原】连环大爆炸，向四周蔓延火海形成二次殉爆！',
        passiveUpgradeDesc: '【百步穿杨】箭矢命中暴击后必定穿透首个目标，继续打击其身后直线上的第二名敌人。',
        isBreakthrough: true
      },
      {
        stage: 4,
        starRequired: 4,
        stageName: '四阶·通玄',
        title: '神臂开石',
        activeUpgradeDesc: '战法冷却缩减 2 秒（8s -> 6s），箭雨坠落速度翻倍，敌人无法闪避。',
        passiveUpgradeDesc: '【百步穿杨】对处于灼烧状态敌人的暴击率提升至 40%，且暴击伤害额外加深 50%！',
        isBreakthrough: false
      },
      {
        stage: 5,
        starRequired: 5,
        stageName: '五阶·大成',
        title: '九日连珠 · 极意',
        activeUpgradeDesc: '★【终极觉醒】仰天引弓射落九日！九道烈阳金乌神箭天降轰击全出兵路径，造成 380% 毁灭火伤并全员施加永久点燃！',
        passiveUpgradeDesc: '【百步穿杨】射程无远弗届：基础攻击射程直接提升 50%，覆盖大半战场！',
        isBreakthrough: true
      }
    ]
  },

  // 5. 马超（金）
  hero_machao: {
    heroId: 'hero_machao',
    heroName: '马超',
    nodes: [
      {
        stage: 1,
        starRequired: 1,
        stageName: '一阶·入境',
        title: '铁骑破阵',
        activeUpgradeDesc: '向前贯穿全场造成 280% 金系穿透伤害并对沿途所有敌军施加【金·割裂】4秒，大幅削弱防御。',
        passiveUpgradeDesc: '【西凉骠骑】攻击速度提升 15%；击杀敌军后获得一层西凉战意（攻击力提升 6%，至多叠加 5 层）。',
        isBreakthrough: false
      },
      {
        stage: 2,
        starRequired: 2,
        stageName: '二阶·通晓',
        title: '锦甲凌厉',
        activeUpgradeDesc: '穿透伤害提升至 320%，割裂时间延长至 5 秒，贯穿路径宽度扩大 20%。',
        passiveUpgradeDesc: '【西凉骠骑】基础攻速提升增至 22%，每层战意额外附带 2% 移动速度。',
        isBreakthrough: false
      },
      {
        stage: 3,
        starRequired: 3,
        stageName: '三阶·化境',
        title: '淬刃飞刀 · 质变',
        activeUpgradeDesc: '★【机制质变】命中带有【土·破衡】的目标时引爆【土生金·淬刃】，向四周放射 6 枚高速飞刃并直接斩杀生命低于 20% 的残血单位！',
        passiveUpgradeDesc: '【西凉骠骑】战意叠满后，普攻转换为纯金系真实伤害，完全忽视目标护甲。',
        isBreakthrough: true
      },
      {
        stage: 4,
        starRequired: 4,
        stageName: '四阶·通玄',
        title: '万骑绝尘',
        activeUpgradeDesc: '战法冷却缩减 2 秒（9s -> 7s），冲锋突刺期间处于霸体不可选中状态。',
        passiveUpgradeDesc: '【西凉骠骑】西凉战意上限由 5 层提高至 8 层（最高提供 +48% 攻击力加成）！',
        isBreakthrough: false
      },
      {
        stage: 5,
        starRequired: 5,
        stageName: '五阶·大成',
        title: '万骑奔雷 · 极意',
        activeUpgradeDesc: '★【终极觉醒】召唤西凉铁骑金芒法相冲踏全场，造成 400% 真实贯穿伤害并向全场金系友军传导 30% 攻速狂暴光环！',
        passiveUpgradeDesc: '【西凉骠骑】神威天将傲三辅：斩杀任何精英敌人直接重置神威破军突冷却时间！',
        isBreakthrough: true
      }
    ]
  }
}

/**
 * 获取武将技能进化路线配置（未单独配置的武将享有通用五阶境界）
 */
export function getHeroSkillEvolution(heroId: string): HeroSkillEvolutionConfig {
  if (heroSkillEvolutions[heroId]) {
    return heroSkillEvolutions[heroId]
  }
  return {
    heroId,
    heroName: '武将',
    nodes: [
      {
        stage: 1,
        starRequired: 1,
        stageName: '一阶·入境',
        title: '技艺初成',
        activeUpgradeDesc: '战法基础威能激活，施展五行法门对敌人造成对应属性伤害并附着元素印记。',
        passiveUpgradeDesc: '心法被动初步觉醒，自身攻击力与基础战斗属性获得稳定增幅。',
        isBreakthrough: false
      },
      {
        stage: 2,
        starRequired: 2,
        stageName: '二阶·通晓',
        title: '融会贯通',
        activeUpgradeDesc: '战法伤害提升 20%，附着元素持续时间延长，作用范围扩大。',
        passiveUpgradeDesc: '被动触发概率与增益数值提升，基础暴击率提升 5%。',
        isBreakthrough: false
      },
      {
        stage: 3,
        starRequired: 3,
        stageName: '三阶·化境',
        title: '五行相生 · 质变',
        activeUpgradeDesc: '★【机制质变】战法命中五行相生印记目标时，触发额外连锁反应爆发，附带强力控制或破甲削弱！',
        passiveUpgradeDesc: '心法进阶：击杀相生反应目标时，为自身及周围友军提供战斗增益。',
        isBreakthrough: true
      },
      {
        stage: 4,
        starRequired: 4,
        stageName: '四阶·通玄',
        title: '心技合一',
        activeUpgradeDesc: '战法冷却时间大幅缩减 20%，伤害倍率额外跃升 30%。',
        passiveUpgradeDesc: '被动效果获得全方位强化，对异常状态敌人的全伤害提升 25%。',
        isBreakthrough: false
      },
      {
        stage: 5,
        starRequired: 5,
        stageName: '五阶·大成',
        title: '天人合一 · 极意',
        activeUpgradeDesc: '★【终极觉醒】全屏五行法相降临，造成高额真实伤害并重置战法冷却，赋予全军元素狂暴光环！',
        passiveUpgradeDesc: '心法大圆满：全属性跃升，攻击附带终极五行穿透！',
        isBreakthrough: true
      }
    ]
  }
}

/**
 * 根据武将当前星级获取当前所处境界节点
 */
export function getCurrentEvolutionNode(heroId: string, star: number): SkillEvolutionNode | undefined {
  const config = getHeroSkillEvolution(heroId)
  if (!config) return undefined
  const currentStage = Math.max(1, Math.min(5, star))
  return config.nodes.find(n => n.stage === currentStage)
}
