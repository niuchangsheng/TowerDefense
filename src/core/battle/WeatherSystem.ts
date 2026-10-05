import { WuXing } from '@/types'

export type DynamicWeatherId =
  | 'clear'
  | 'metal_wind'
  | 'wood_rain'
  | 'water_snow'
  | 'fire_drought'
  | 'earth_sand'

/**
 * 第八章 §2：六大古战场天时气象「敌我双向法则」完整数值定义
 */
export interface WeatherAllyModifiers {
  /** 攻击力百分比加成（归入攻击加成区，如赤地焚风 +20%） */
  attackBonus: number
  /** 攻击速度百分比加成（如朔风凛冽 +15%，寒潮暴雪 -15%） */
  attackSpeedBonus: number
  /** 攻击范围百分比加成（如梅雨瘴林 +15%，黄沙漫天 -20%） */
  attackRangeBonus: number
  /** 暴击几率加成（如朔风凛冽 +15%） */
  critRateBonus: number
  /** 暴击伤害加成（如寒潮暴雪 +35%） */
  critDamageBonus: number
  /** 【金·裂】破甲比例加成与流血真伤倍率加成 */
  bleedArmorBreakOverride?: number
  bleedDamageBonus?: number
  /** 【土生金·锋芒】额外飞刃数量 */
  spikesExtraCount?: number
  /** 【木·毒】每秒最大生命百分比伤害覆盖与传染范围加成 */
  poisonMaxHpPctOverride?: number
  poisonSpreadRadiusBonus?: number
  /** 【水生木·滋养】定身延长毫秒数 */
  nourishStunBonusMs?: number
  /** 【水·湿】减速比例覆盖与持续时间加成毫秒数、或持续时间乘数 */
  wetSlowOverride?: number
  wetDurationBonusMs?: number
  wetDurationMultiplier?: number
  /** 【金生水·碎冰】冰封延长毫秒数与伤害加成 */
  shatterFreezeBonusMs?: number
  shatterDamageBonus?: number
  /** 【火·灼】跳字间隔乘数与阵亡爆燃伤害加成 */
  burnTickIntervalMultiplier?: number
  burnDeathExplodeBonus?: number
  /** 【木生火·燎原】范围与伤害加成 */
  wildfireBonus?: number
  /** 【土·重】削韧破刚额外倍率与【负重内震】伤害倍率乘数 */
  heavyReductionMultiplier?: number
  heavyShockMultiplier?: number
  /** 【火生土·熔岩】焦土持续时间延长毫秒数 */
  magmaDurationBonusMs?: number
}

export interface WeatherEnemyModifiers {
  /** 敌军生命上限加成（如梅雨瘴林 +30%） */
  hpBonus: number
  /** 敌军每秒最大生命回血比例（如梅雨瘴林 1.0%/s） */
  hpRegenPerSec: number
  /** 敌军防御加成（如寒潮暴雪 +30%，赤地焚风 -15%） */
  defenseBonus: number
  /** 敌军移动速度加成（如朔风凛冽 +25%，赤地焚风 +15%，寒潮暴雪 -15%） */
  moveSpeedBonus: number
  /** 敌军韧性（反暴击率）加成（如梅雨瘴林 +25%，黄沙漫天 +30%，朔风凛冽 -15%） */
  tenacityBonus: number
  /** 敌军刚毅（反暴击伤害）加成（如朔风凛冽 +25%，黄沙漫天 +40%，赤地焚风 -30%） */
  fortitudeBonus: number
}

export interface DynamicWeatherConfig {
  id: DynamicWeatherId
  name: string
  subtitle: string
  element: WuXing | null
  favoredElements: WuXing[]
  disfavoredElements: WuXing[]
  favoredDamageBonus: number      // 增伤区加算 (+0.20)
  disfavoredDamagePenalty: number // 增伤区减算 (-0.15)
  ambientWeatherKey: 'clear' | 'rain' | 'fog' | 'wind' | 'sun'
  vanguardBossId: string
  vanguardBossName: string
  allyModifiers: WeatherAllyModifiers
  enemyModifiers: WeatherEnemyModifiers
  description: string
  tacticalGuide: string
}

export const DYNAMIC_WEATHERS: Record<DynamicWeatherId, DynamicWeatherConfig> = {
  clear: {
    id: 'clear',
    name: '晴空朗日',
    subtitle: '乾坤朗照 · 终局公平决战',
    element: null,
    favoredElements: [],
    disfavoredElements: [],
    favoredDamageBonus: 0,
    disfavoredDamagePenalty: 0,
    ambientWeatherKey: 'clear',
    vanguardBossId: 'enemy_boss_lvbu',
    vanguardBossName: '守关主帅',
    allyModifiers: {
      attackBonus: 0,
      attackSpeedBonus: 0,
      attackRangeBonus: 0,
      critRateBonus: 0,
      critDamageBonus: 0
    },
    enemyModifiers: {
      hpBonus: 0,
      hpRegenPerSec: 0,
      defenseBonus: 0,
      moveSpeedBonus: 0,
      tenacityBonus: 0,
      fortitudeBonus: 0
    },
    description: '天朗气清，敌我全基础属性与元素效果保持 100% 基准值，迎战本卷镇守主帅！',
    tacticalGuide: 'Wave 11~15 终局决战天时，敌我均无环境偏倚，纯拼武将阵型与相生构筑实力'
  },
  metal_wind: {
    id: 'metal_wind',
    name: '朔风凛冽',
    subtitle: '金秋杀气 · 统帅【曹仁】坐镇',
    element: 'metal',
    favoredElements: ['metal', 'water'],
    disfavoredElements: ['wood'],
    favoredDamageBonus: 0.20,
    disfavoredDamagePenalty: -0.15,
    ambientWeatherKey: 'wind',
    vanguardBossId: 'enemy_boss_caoren',
    vanguardBossName: '曹仁',
    allyModifiers: {
      attackBonus: 0,
      attackSpeedBonus: 0.15,
      attackRangeBonus: 0,
      critRateBonus: 0.15,
      critDamageBonus: 0,
      bleedArmorBreakOverride: 0.50,
      bleedDamageBonus: 0.50,
      spikesExtraCount: 2
    },
    enemyModifiers: {
      hpBonus: 0,
      hpRegenPerSec: 0,
      defenseBonus: 0,
      moveSpeedBonus: 0.25,
      tenacityBonus: -0.15,
      fortitudeBonus: 0.25
    },
    description: '【顺天】我方暴击率+15%、攻速+15%，【金·裂】破甲升至50%且流血+50%，【土生金】飞刃+2；【天险】敌移速+25%、刚毅+25%、韧性-15%。',
    tacticalGuide: '高速冲阵局！给敌军挂【金·裂】跑得越快流血越猛，配合【水·湿】减速截停'
  },
  wood_rain: {
    id: 'wood_rain',
    name: '梅雨瘴林',
    subtitle: '春木毒瘴 · 统帅【张角】坐镇',
    element: 'wood',
    favoredElements: ['wood', 'fire'],
    disfavoredElements: ['earth'],
    favoredDamageBonus: 0.20,
    disfavoredDamagePenalty: -0.15,
    ambientWeatherKey: 'rain',
    vanguardBossId: 'enemy_boss_zhangjiao',
    vanguardBossName: '张角',
    allyModifiers: {
      attackBonus: 0,
      attackSpeedBonus: 0,
      attackRangeBonus: 0.15,
      critRateBonus: 0,
      critDamageBonus: 0,
      poisonMaxHpPctOverride: 0.032,
      poisonSpreadRadiusBonus: 0.60,
      nourishStunBonusMs: 1000
    },
    enemyModifiers: {
      hpBonus: 0.30,
      hpRegenPerSec: 0.01,
      defenseBonus: 0,
      moveSpeedBonus: 0,
      tenacityBonus: 0.25,
      fortitudeBonus: 0
    },
    description: '【顺天】我方射程+15%，【木·毒】腐蚀升至3.2%/s、传染范围+60%，【水生木】定身+1s；【天险】敌生命+30%、每秒回血1%、韧性+25%。',
    tacticalGuide: '肉盾回血局！启用【木·毒】禁疗配合《刮骨疗毒》或【木生火】融化高血巨盾'
  },
  water_snow: {
    id: 'water_snow',
    name: '寒潮暴雪',
    subtitle: '玄冬冰封 · 统帅【张辽】坐镇',
    element: 'water',
    favoredElements: ['water', 'wood'],
    disfavoredElements: ['fire'],
    favoredDamageBonus: 0.20,
    disfavoredDamagePenalty: -0.15,
    ambientWeatherKey: 'wind',
    vanguardBossId: 'enemy_boss_zhangliao',
    vanguardBossName: '张辽',
    allyModifiers: {
      attackBonus: 0,
      attackSpeedBonus: -0.15,
      attackRangeBonus: 0,
      critRateBonus: 0,
      critDamageBonus: 0.35,
      wetSlowOverride: 0.45,
      wetDurationBonusMs: 2000,
      shatterFreezeBonusMs: 1000,
      shatterDamageBonus: 0.45
    },
    enemyModifiers: {
      hpBonus: 0,
      hpRegenPerSec: 0,
      defenseBonus: 0.30,
      moveSpeedBonus: -0.15,
      tenacityBonus: 0,
      fortitudeBonus: 0
    },
    description: '【顺天】我方暴伤+35%，【水·湿】减速升至45%且延长2s，【金生水】冰封+1s、碎冰伤+45%；【天险】我方攻速-15%，敌防御+30%、移速-15%。',
    tacticalGuide: '慢速铁桶局！用【金·裂】配合《潼关割袍》或【金生水·碎冰】真伤炸穿冰雕'
  },
  fire_drought: {
    id: 'fire_drought',
    name: '赤地焚风',
    subtitle: '盛夏烈日 · 统帅【吕布】坐镇',
    element: 'fire',
    favoredElements: ['fire', 'earth'],
    disfavoredElements: ['metal'],
    favoredDamageBonus: 0.20,
    disfavoredDamagePenalty: -0.15,
    ambientWeatherKey: 'sun',
    vanguardBossId: 'enemy_boss_lvbu',
    vanguardBossName: '吕布',
    allyModifiers: {
      attackBonus: 0.20,
      attackSpeedBonus: 0,
      attackRangeBonus: 0,
      critRateBonus: 0,
      critDamageBonus: 0,
      burnTickIntervalMultiplier: 0.65,
      burnDeathExplodeBonus: 0.60,
      wildfireBonus: 0.40,
      wetDurationMultiplier: 0.50
    },
    enemyModifiers: {
      hpBonus: 0,
      hpRegenPerSec: 0,
      defenseBonus: -0.15,
      moveSpeedBonus: 0.15,
      tenacityBonus: 0,
      fortitudeBonus: -0.30
    },
    description: '【顺天】我方攻击+20%，【火·灼】跳字加快35%、爆燃+60%，【木生火】范围与伤害+40%；【天险】敌移速+15%、防御-15%、刚毅-30%，水湿减半。',
    tacticalGuide: '极致对攻爽局！敌军防御与刚毅大幅削弱，配合《博望屯火》与《赤壁东风》轰炸清屏'
  },
  earth_sand: {
    id: 'earth_sand',
    name: '黄沙漫天',
    subtitle: '大漠沙暴 · 统帅【董卓】坐镇',
    element: 'earth',
    favoredElements: ['earth', 'metal'],
    disfavoredElements: ['water'],
    favoredDamageBonus: 0.20,
    disfavoredDamagePenalty: -0.15,
    ambientWeatherKey: 'fog',
    vanguardBossId: 'enemy_boss_dongzhuo',
    vanguardBossName: '董卓',
    allyModifiers: {
      attackBonus: 0,
      attackSpeedBonus: 0,
      attackRangeBonus: -0.20,
      critRateBonus: 0,
      critDamageBonus: 0,
      heavyReductionMultiplier: 1.50,
      heavyShockMultiplier: 2.0,
      magmaDurationBonusMs: 2500
    },
    enemyModifiers: {
      hpBonus: 0,
      hpRegenPerSec: 0,
      defenseBonus: 0,
      moveSpeedBonus: 0,
      tenacityBonus: 0.30,
      fortitudeBonus: 0.40
    },
    description: '【顺天】【土·重】削韧破刚幅度额外+50%、内震伤翻倍，【火生土】焦土延长2.5s；【天险】我方射程-20%，敌初始韧性+30%、刚毅+40%。',
    tacticalGuide: '重压破架局！先用【土·重】配合《霸桥挑袍》将敌军韧刚压至40%保底下限，再接【土生金】满暴收割'
  }
}

export const ELEMENTAL_WEATHER_IDS: DynamicWeatherId[] = [
  'metal_wind',
  'wood_rain',
  'water_snow',
  'fire_drought',
  'earth_sand'
]

/**
 * 动态天时系统（无弹窗水墨流转 · 敌我双向环境博弈）
 * 严格遵循《三国五行塔防》第 8 章设计规范：
 * - 单局 15 波历经 3 个天时周期（每 5 波一轮转）：
 *   1. Wave 1~5：开局随机天时 + 绑定先锋统帅（顶部【观星台】即时公示预告）；
 *   2. Wave 6~10：次席随机天时 + 绑定中军统帅（异于首轮天时，提前预告）；
 *   3. Wave 11~15：固定为【晴空朗日】中正天时，迎战本图镇守主帅，确保终局决战公平可解！
 * - Wave 16+ 无尽北伐：继续每 5 波动态轮转。
 */
export class WeatherSystem {
  private segmentWeathers: Map<number, DynamicWeatherConfig> = new Map()
  private currentWave: number = 1
  private ignorePenalty: boolean = false
  private allElementFavored: boolean = false
  /** 《五丈原祈星》：完全免疫天时负面并将其反转为等额正面加成，顺天增幅额外 +50% */
  private reverseNegativeAndBoostPositive: boolean = false
  /** 《奇门遁甲》：当前天时与下一阶段天时的我方顺天增益同时并存生效 */
  private dualWeatherActive: boolean = false
  /** 《望梅止渴》：天时轮转后 20 秒内全军普攻必挂当前天时元素 */
  private guaranteedWeatherElementUntilMs: number = 0
  private onWeatherChanged?: (weather: DynamicWeatherConfig, nextWeather: DynamicWeatherConfig) => void

  constructor(seedWeathers?: DynamicWeatherId[]) {
    this.initSchedule(seedWeathers)
  }

  public initSchedule(seedWeathers?: DynamicWeatherId[]): void {
    this.segmentWeathers.clear()

    if (seedWeathers && seedWeathers.length >= 2) {
      this.segmentWeathers.set(0, DYNAMIC_WEATHERS[seedWeathers[0]])
      this.segmentWeathers.set(1, DYNAMIC_WEATHERS[seedWeathers[1]])
    } else {
      const pool = [...ELEMENTAL_WEATHER_IDS]
      const firstIdx = Math.floor(Math.random() * pool.length)
      const firstId = pool.splice(firstIdx, 1)[0]
      const secondIdx = Math.floor(Math.random() * pool.length)
      const secondId = pool[secondIdx]

      this.segmentWeathers.set(0, DYNAMIC_WEATHERS[firstId])
      this.segmentWeathers.set(1, DYNAMIC_WEATHERS[secondId])
    }

    // Segment 2: Wave 11~15 固定为【晴空朗日】
    this.segmentWeathers.set(2, DYNAMIC_WEATHERS.clear)
  }

  public setOnWeatherChanged(cb: (weather: DynamicWeatherConfig, nextWeather: DynamicWeatherConfig) => void): void {
    this.onWeatherChanged = cb
  }

  public getSegmentIndex(waveNumber: number): number {
    return Math.max(0, Math.floor((Math.max(1, waveNumber) - 1) / 5))
  }

  public getWeatherForSegment(segmentIndex: number): DynamicWeatherConfig {
    if (this.segmentWeathers.has(segmentIndex)) {
      return this.segmentWeathers.get(segmentIndex)!
    }

    if (segmentIndex === 2) {
      this.segmentWeathers.set(2, DYNAMIC_WEATHERS.clear)
      return DYNAMIC_WEATHERS.clear
    }

    const prevWeather = this.segmentWeathers.get(segmentIndex - 1)
    const candidates = ELEMENTAL_WEATHER_IDS.filter(id => id !== prevWeather?.id)
    const pickedId = candidates[Math.floor(Math.random() * candidates.length)] || 'metal_wind'
    const config = DYNAMIC_WEATHERS[pickedId]
    this.segmentWeathers.set(segmentIndex, config)
    return config
  }

  public getWeatherForWave(waveNumber: number): DynamicWeatherConfig {
    return this.getWeatherForSegment(this.getSegmentIndex(waveNumber))
  }

  public getCurrentWeather(): DynamicWeatherConfig {
    return this.getWeatherForWave(this.currentWave)
  }

  public getNextWeatherForecast(): DynamicWeatherConfig {
    const curSeg = this.getSegmentIndex(this.currentWave)
    return this.getWeatherForSegment(curSeg + 1)
  }

  public getNextSegmentWeather(waveNumber?: number): DynamicWeatherConfig {
    const seg = this.getSegmentIndex(waveNumber ?? this.currentWave)
    return this.getWeatherForSegment(seg + 1)
  }

  public onWaveStart(waveNumber: number): { changed: boolean; current: DynamicWeatherConfig; next: DynamicWeatherConfig } {
    const prevSeg = this.getSegmentIndex(this.currentWave)
    this.currentWave = Math.max(1, waveNumber)
    const newSeg = this.getSegmentIndex(this.currentWave)

    const current = this.getCurrentWeather()
    const next = this.getNextWeatherForecast()
    const changed = waveNumber === 1 || newSeg !== prevSeg

    if (changed && this.onWeatherChanged) {
      this.onWeatherChanged(current, next)
    }

    return { changed, current, next }
  }

  /**
   * 获取当前生效的我方天时属性与机制修正（支持《五丈原祈星》逆转负面与《奇门遁甲》双天时并存）
   */
  public getEffectiveAllyModifiers(): WeatherAllyModifiers {
    const cur = this.getCurrentWeather().allyModifiers
    const next = this.dualWeatherActive ? this.getNextWeatherForecast().allyModifiers : null
    const boostMult = this.reverseNegativeAndBoostPositive ? 1.5 : 1.0

    const adjustVal = (v: number): number => {
      if (v < 0) {
        if (this.reverseNegativeAndBoostPositive) return Math.abs(v) * boostMult
        if (this.ignorePenalty) return 0
        return v
      }
      return v * boostMult
    }

    const addNextPositive = (v: number | undefined): number => {
      if (!next || v === undefined || v <= 0) return 0
      return v * boostMult
    }

    return {
      attackBonus: adjustVal(cur.attackBonus) + addNextPositive(next?.attackBonus),
      attackSpeedBonus: adjustVal(cur.attackSpeedBonus) + addNextPositive(next?.attackSpeedBonus),
      attackRangeBonus: adjustVal(cur.attackRangeBonus) + addNextPositive(next?.attackRangeBonus),
      critRateBonus: adjustVal(cur.critRateBonus) + addNextPositive(next?.critRateBonus),
      critDamageBonus: adjustVal(cur.critDamageBonus) + addNextPositive(next?.critDamageBonus),
      bleedArmorBreakOverride: cur.bleedArmorBreakOverride ?? next?.bleedArmorBreakOverride,
      bleedDamageBonus: (cur.bleedDamageBonus ?? 0) * boostMult + addNextPositive(next?.bleedDamageBonus),
      spikesExtraCount: (cur.spikesExtraCount ?? 0) + (next?.spikesExtraCount ?? 0),
      poisonMaxHpPctOverride: cur.poisonMaxHpPctOverride ?? next?.poisonMaxHpPctOverride,
      poisonSpreadRadiusBonus: (cur.poisonSpreadRadiusBonus ?? 0) * boostMult + addNextPositive(next?.poisonSpreadRadiusBonus),
      nourishStunBonusMs: (cur.nourishStunBonusMs ?? 0) + (next?.nourishStunBonusMs ?? 0),
      wetSlowOverride: cur.wetSlowOverride ?? next?.wetSlowOverride,
      wetDurationBonusMs: (cur.wetDurationBonusMs ?? 0) + (next?.wetDurationBonusMs ?? 0),
      wetDurationMultiplier: this.reverseNegativeAndBoostPositive && (cur.wetDurationMultiplier ?? 1) < 1
        ? 1.25
        : (cur.wetDurationMultiplier ?? 1.0),
      shatterFreezeBonusMs: (cur.shatterFreezeBonusMs ?? 0) + (next?.shatterFreezeBonusMs ?? 0),
      shatterDamageBonus: (cur.shatterDamageBonus ?? 0) * boostMult + addNextPositive(next?.shatterDamageBonus),
      burnTickIntervalMultiplier: cur.burnTickIntervalMultiplier ?? next?.burnTickIntervalMultiplier,
      burnDeathExplodeBonus: (cur.burnDeathExplodeBonus ?? 0) * boostMult + addNextPositive(next?.burnDeathExplodeBonus),
      wildfireBonus: (cur.wildfireBonus ?? 0) * boostMult + addNextPositive(next?.wildfireBonus),
      heavyReductionMultiplier: cur.heavyReductionMultiplier ?? next?.heavyReductionMultiplier ?? 1.0,
      heavyShockMultiplier: cur.heavyShockMultiplier ?? next?.heavyShockMultiplier ?? 1.0,
      magmaDurationBonusMs: (cur.magmaDurationBonusMs ?? 0) + (next?.magmaDurationBonusMs ?? 0)
    }
  }

  /**
   * 获取当前天时对敌军五维属性的修正
   */
  public getCurrentEnemyModifiers(): WeatherEnemyModifiers {
    return this.getCurrentWeather().enemyModifiers
  }

  /**
   * 计算指定五行武将在当前天时下的【增伤区】加成
   */
  public getDamageIncreaseBonus(wuXing: WuXing): number {
    const boostMult = this.reverseNegativeAndBoostPositive ? 1.5 : 1.0
    if (this.allElementFavored) {
      return 0.20 * boostMult
    }
    const weather = this.getCurrentWeather()
    let total = 0
    if (weather.favoredElements.includes(wuXing)) {
      total += weather.favoredDamageBonus * boostMult
    } else if (weather.disfavoredElements.includes(wuXing)) {
      if (this.reverseNegativeAndBoostPositive) {
        total += Math.abs(weather.disfavoredDamagePenalty) * boostMult
      } else if (!this.ignorePenalty) {
        total += weather.disfavoredDamagePenalty
      }
    }

    if (this.dualWeatherActive) {
      const next = this.getNextWeatherForecast()
      if (next.favoredElements.includes(wuXing)) {
        total += next.favoredDamageBonus * boostMult
      }
    }
    return total
  }

  public setIgnorePenalty(ignore: boolean): void {
    this.ignorePenalty = ignore
  }

  public setAllElementFavored(favored: boolean): void {
    this.allElementFavored = favored
  }

  public setReverseNegativeAndBoostPositive(enabled: boolean): void {
    this.reverseNegativeAndBoostPositive = enabled
    if (enabled) this.ignorePenalty = true
  }

  public setDualWeatherActive(enabled: boolean): void {
    this.dualWeatherActive = enabled
  }

  public triggerWangmeiGuaranteedElement(nowMs: number, durationMs: number = 20000): void {
    this.guaranteedWeatherElementUntilMs = nowMs + durationMs
  }

  public isWangmeiGuaranteedActive(nowMs: number): boolean {
    return nowMs < this.guaranteedWeatherElementUntilMs && this.getCurrentWeather().element !== null
  }

  public reset(seedWeathers?: DynamicWeatherId[]): void {
    this.currentWave = 1
    this.ignorePenalty = false
    this.allElementFavored = false
    this.reverseNegativeAndBoostPositive = false
    this.dualWeatherActive = false
    this.guaranteedWeatherElementUntilMs = 0
    this.initSchedule(seedWeathers)
  }
}

export type WeatherConfig = DynamicWeatherConfig
