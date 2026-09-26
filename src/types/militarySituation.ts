export type MilitarySituationId =
  | 'sit_river_fog'       // 江雾锁江
  | 'sit_scorching_sun'   // 赤地烈日
  | 'sit_torrential_rain' // 暴雨洪峰
  | 'sit_cavalry_rush'    // 铁骑突袭
  | 'sit_supply_intercept'// 辎重脱节

export type MilitaryTacticType = 'upper' | 'lower' // 上策 / 下策
export type WeatherType = 'fog' | 'sun' | 'rain' | 'wind' | 'clear'

export interface MilitaryTacticModifiers {
  rangedRangeMultiplier?: number       // 远程射程乘数，如 1.3
  rangedDefensePenetration?: number    // 远程破甲比例，如 0.25
  meleeAttackSpeedMultiplier?: number  // 近战攻速乘数，如 1.4
  meleeCritChanceBonus?: number        // 近战暴击加成，如 0.3
  meleeDamageReduction?: number        // 近战受损减免，如 0.3
  wildfireRadiusMultiplier?: number    // 燎原火海范围乘数，如 1.6
  burnBleedDamageMultiplier?: number   // 灼烧流血倍率，如 1.6
  globalDefenseBonus?: number          // 全军防御提升，如 0.35
  killHealBaseCounter?: number         // 每消灭 N 只敌人修复 1 点帅营生命，如 10
  waterDamageMultiplier?: number       // 水系伤害加成，如 1.45
  nourishDurationMultiplier?: number   // 滋养定身时长乘数，如 1.75
  shatterRadiusMultiplier?: number     // 碎冰爆炸范围乘数，如 1.8
  thunderKnockbackChance?: number      // 金系普攻天雷击退概率，如 0.25
  hasBarricade?: boolean               // 前线布置墨色拒马反伤眩晕
  nearBaseAttackMultiplier?: number    // 帅营周边 200px 友军攻击加成，如 2.0
  nearBaseRewardMultiplier?: number    // 帅营周边斩敌军费加成，如 2.0
  costAndEnergyMultiplier?: number     // 全体斩敌军费与能量加成，如 1.5
  enemyArmorReduction?: number         // 敌军护甲削弱比例，如 0.4
  reactionDamageMultiplier?: number    // 五行反应对 Boss 增伤乘数，如 1.5
}

export interface MilitaryTactic {
  id: string
  situationId: MilitarySituationId
  type: MilitaryTacticType
  name: string
  description: string
  costDeduction?: number
  grantRerolls?: number
  modifiers: MilitaryTacticModifiers
}

export interface MilitarySituation {
  id: MilitarySituationId
  name: string
  bannerTitle: string
  reportText: string
  weather: WeatherType
  tactics: {
    upper: MilitaryTactic
    lower: MilitaryTactic
  }
}

export const MILITARY_SITUATIONS: Record<MilitarySituationId, MilitarySituation> = {
  sit_river_fog: {
    id: 'sit_river_fog',
    name: '江雾锁江',
    bannerTitle: '【江雾锁江】',
    reportText: '前沿江面大雾弥漫，十步之外莫辨敌我。探马难行，远攻将士目力受阻，唯近卫死士可持短兵伏击破敌。',
    weather: 'fog',
    tactics: {
      upper: {
        id: 'tac_beacon_night',
        situationId: 'sit_river_fog',
        type: 'upper',
        name: '烽燧照夜',
        description: '消耗40军费点燃要隘烽火破雾。全场远程单位射程+30%，破甲+25%。',
        costDeduction: 40,
        modifiers: {
          rangedRangeMultiplier: 1.3,
          rangedDefensePenetration: 0.25
        }
      },
      lower: {
        id: 'tac_fog_ambush',
        situationId: 'sit_river_fog',
        type: 'lower',
        name: '借雾设伏',
        description: '全军依仗浓雾隐蔽待旦。近战英雄与步兵攻速+40%，暴击率+30%，受近战伤害减少30%。',
        modifiers: {
          meleeAttackSpeedMultiplier: 1.4,
          meleeCritChanceBonus: 0.3,
          meleeDamageReduction: 0.3
        }
      }
    }
  },
  sit_scorching_sun: {
    id: 'sit_scorching_sun',
    name: '赤地烈日',
    bannerTitle: '【赤地烈日】',
    reportText: '天干物燥，烈日当空。大地焦涸如焚，寒水易竭，草木极易引燃，将士酷暑难耐，宜防火固守。',
    weather: 'sun',
    tactics: {
      upper: {
        id: 'tac_wind_fire',
        situationId: 'sit_scorching_sun',
        type: 'upper',
        name: '顺风纵火',
        description: '木生火【燎原】火海范围扩大60%，灼烧与流血伤害大幅提升60%。',
        modifiers: {
          wildfireRadiusMultiplier: 1.6,
          burnBleedDamageMultiplier: 1.6
        }
      },
      lower: {
        id: 'tac_solid_fortress',
        situationId: 'sit_scorching_sun',
        type: 'lower',
        name: '严阵筑垒',
        description: '全军深挖堑壕避暑固垒，防御提升35%，每消灭10只敌人直接修缮帅营1点生命。',
        modifiers: {
          globalDefenseBonus: 0.35,
          killHealBaseCounter: 10
        }
      }
    }
  },
  sit_torrential_rain: {
    id: 'sit_torrential_rain',
    name: '暴雨洪峰',
    bannerTitle: '【暴雨洪峰】',
    reportText: '黑云压阵，狂风骤雨如注！两军交战之地泥泞深陷，敌军行进艰难，江河暴涨，雷霆交加。',
    weather: 'rain',
    tactics: {
      upper: {
        id: 'tac_water_inundation',
        situationId: 'sit_torrential_rain',
        type: 'upper',
        name: '引水灌城',
        description: '水系伤害提升45%，水生木【滋养】定身缠绕时长大幅延长至3.5秒。',
        modifiers: {
          waterDamageMultiplier: 1.45,
          nourishDurationMultiplier: 1.75
        }
      },
      lower: {
        id: 'tac_nine_skies_thunder',
        situationId: 'sit_torrential_rain',
        type: 'lower',
        name: '雷动九天',
        description: '金生水【碎冰】爆炸范围扩大80%，金系普攻有25%概率触发九天金雷击退敌人。',
        modifiers: {
          shatterRadiusMultiplier: 1.8,
          thunderKnockbackChance: 0.25
        }
      }
    }
  },
  sit_cavalry_rush: {
    id: 'sit_cavalry_rush',
    name: '铁骑突袭',
    bannerTitle: '【铁骑突袭】',
    reportText: '探马飞报，曹魏八百里加急派遣神行精骑与突击死士奇袭我军侧翼，马蹄轰鸣，疾如奔雷！',
    weather: 'wind',
    tactics: {
      upper: {
        id: 'tac_line_barricade',
        situationId: 'sit_cavalry_rush',
        type: 'upper',
        name: '列阵设拒',
        description: '阵地要道前沿生成坚韧墨色拒马，冲撞拒马之敌眩晕3秒并反震200%撞击伤害。',
        modifiers: {
          hasBarricade: true
        }
      },
      lower: {
        id: 'tac_lure_deep',
        situationId: 'sit_cavalry_rush',
        type: 'lower',
        name: '诱敌深入',
        description: '放敌骑近前一决生死！帅营周边200像素内所有友军攻击力+100%，斩敌军费奖励翻倍。',
        modifiers: {
          nearBaseAttackMultiplier: 2.0,
          nearBaseRewardMultiplier: 2.0
        }
      }
    }
  },
  sit_supply_intercept: {
    id: 'sit_supply_intercept',
    name: '辎重脱节',
    bannerTitle: '【辎重脱节】',
    reportText: '魏军连番强攻导致中军与后勤辎重脱节，粮草车队陷于浅滩。敌阵人心浮动，正乃破敌良机！',
    weather: 'clear',
    tactics: {
      upper: {
        id: 'tac_plunder_supplies',
        situationId: 'sit_supply_intercept',
        type: 'upper',
        name: '夺粮劫草',
        description: '全力截击辎重粮道！击杀所有敌人的军费与军令能量收益提升50%，立即获赠2枚军师刷新令。',
        grantRerolls: 2,
        modifiers: {
          costAndEnergyMultiplier: 1.5
        }
      },
      lower: {
        id: 'tac_divide_morale',
        situationId: 'sit_supply_intercept',
        type: 'lower',
        name: '攻心瓦解',
        description: '宣诏敌阵瓦解斗志！敌军全体初始护甲削减40%，敌首领受五行反应伤害额外提高50%。',
        modifiers: {
          enemyArmorReduction: 0.4,
          reactionDamageMultiplier: 1.5
        }
      }
    }
  }
}
