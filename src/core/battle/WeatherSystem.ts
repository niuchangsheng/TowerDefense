import { WuXing } from '@/types'

export type DynamicWeatherId =
  | 'clear'
  | 'metal_wind'
  | 'wood_rain'
  | 'water_snow'
  | 'fire_drought'
  | 'earth_sand'

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
  description: string
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
    description: '天朗气清，无五行偏置（全系增伤 +0%），迎战本图镇守主帅！'
  },
  metal_wind: {
    id: 'metal_wind',
    name: '朔风凛冽',
    subtitle: '庚金肃杀 · 金水得令',
    element: 'metal',
    favoredElements: ['metal', 'water'],
    disfavoredElements: ['wood'],
    favoredDamageBonus: 0.20,
    disfavoredDamagePenalty: -0.15,
    ambientWeatherKey: 'wind',
    vanguardBossId: 'enemy_boss_lvbu',
    vanguardBossName: '吕布',
    description: '【得令】金/水系伤害 +20%（增伤区加算）；【失令】木系伤害 -15%。'
  },
  wood_rain: {
    id: 'wood_rain',
    name: '梅雨瘴林',
    subtitle: '草木疯长 · 木火得令',
    element: 'wood',
    favoredElements: ['wood', 'fire'],
    disfavoredElements: ['earth'],
    favoredDamageBonus: 0.20,
    disfavoredDamagePenalty: -0.15,
    ambientWeatherKey: 'rain',
    vanguardBossId: 'enemy_boss_zhangjiao',
    vanguardBossName: '张角',
    description: '【得令】木/火系伤害 +20%（增伤区加算）；【失令】土系伤害 -15%。'
  },
  water_snow: {
    id: 'water_snow',
    name: '寒潮暴雪',
    subtitle: '冰封千里 · 水木得令',
    element: 'water',
    favoredElements: ['water', 'wood'],
    disfavoredElements: ['fire'],
    favoredDamageBonus: 0.20,
    disfavoredDamagePenalty: -0.15,
    ambientWeatherKey: 'wind',
    vanguardBossId: 'enemy_boss_zhangliao',
    vanguardBossName: '张辽',
    description: '【得令】水/木系伤害 +20%（增伤区加算）；【失令】火系伤害 -15%。'
  },
  fire_drought: {
    id: 'fire_drought',
    name: '赤地焚风',
    subtitle: '烈日焦土 · 火土得令',
    element: 'fire',
    favoredElements: ['fire', 'earth'],
    disfavoredElements: ['metal'],
    favoredDamageBonus: 0.20,
    disfavoredDamagePenalty: -0.15,
    ambientWeatherKey: 'sun',
    vanguardBossId: 'enemy_boss_zhangjiao',
    vanguardBossName: '张角',
    description: '【得令】火/土系伤害 +20%（增伤区加算）；【失令】金系伤害 -15%。'
  },
  earth_sand: {
    id: 'earth_sand',
    name: '黄沙漫天',
    subtitle: '大漠飞沙 · 土金得令',
    element: 'earth',
    favoredElements: ['earth', 'metal'],
    disfavoredElements: ['water'],
    favoredDamageBonus: 0.20,
    disfavoredDamagePenalty: -0.15,
    ambientWeatherKey: 'fog',
    vanguardBossId: 'enemy_boss_caoren',
    vanguardBossName: '曹仁',
    description: '【得令】土/金系伤害 +20%（增伤区加算）；【失令】水系伤害 -15%。'
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
 * 动态天时系统（无弹窗水墨流转）
 * 严格遵循《三国五行塔防》第 8 章设计规范：
 * - 单局 15 波历经 3 个天时周期（每 5 波一轮转）：
 *   1. Wave 1~5：开局随机天时 + 先锋统帅（顶部【观星台】即时公示预告）；
 *   2. Wave 6~10：次席随机天时 + 中军统帅（异于首轮天时，Wave 5 提前预告）；
 *   3. Wave 11~15：固定为【晴空朗日】中正天时，迎战本图镇守主帅，确保终局决战公平可解！
 * - Wave 16+ 无尽北伐：继续每 5 波动态轮转。
 */
export class WeatherSystem {
  private segmentWeathers: Map<number, DynamicWeatherConfig> = new Map()
  private currentWave: number = 1
  private ignorePenalty: boolean = false
  private allElementFavored: boolean = false
  private onWeatherChanged?: (weather: DynamicWeatherConfig, nextWeather: DynamicWeatherConfig) => void

  constructor(seedWeathers?: DynamicWeatherId[]) {
    this.initSchedule(seedWeathers)
  }

  /**
   * 初始化天时排期表
   */
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

      // Segment 0: Wave 1~5
      this.segmentWeathers.set(0, DYNAMIC_WEATHERS[firstId])
      // Segment 1: Wave 6~10
      this.segmentWeathers.set(1, DYNAMIC_WEATHERS[secondId])
    }

    // Segment 2: Wave 11~15 固定为【晴空朗日】
    this.segmentWeathers.set(2, DYNAMIC_WEATHERS.clear)
  }

  public setOnWeatherChanged(cb: (weather: DynamicWeatherConfig, nextWeather: DynamicWeatherConfig) => void): void {
    this.onWeatherChanged = cb
  }

  /**
   * 获取指定波次所属的天时段落索引 (0 = W1~5, 1 = W6~10, 2 = W11~15, ...)
   */
  public getSegmentIndex(waveNumber: number): number {
    return Math.max(0, Math.floor((Math.max(1, waveNumber) - 1) / 5))
  }

  /**
   * 获取指定天时段落的天时配置（无尽模式自动按需生成）
   */
  public getWeatherForSegment(segmentIndex: number): DynamicWeatherConfig {
    if (this.segmentWeathers.has(segmentIndex)) {
      return this.segmentWeathers.get(segmentIndex)!
    }

    // Wave 11~15 (segment 2) 固定晴空朗日
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

  /**
   * 获取指定波次生效的天时
   */
  public getWeatherForWave(waveNumber: number): DynamicWeatherConfig {
    return this.getWeatherForSegment(this.getSegmentIndex(waveNumber))
  }

  /**
   * 获取当前波次生效的天时
   */
  public getCurrentWeather(): DynamicWeatherConfig {
    return this.getWeatherForWave(this.currentWave)
  }

  /**
   * 获取下一轮天时预告（供顶部 HUD【观星台】展示）
   */
  public getNextWeatherForecast(): DynamicWeatherConfig {
    const curSeg = this.getSegmentIndex(this.currentWave)
    return this.getWeatherForSegment(curSeg + 1)
  }

  /**
   * 获取指定波次所属天时段的下一轮天时配置
   */
  public getNextSegmentWeather(waveNumber?: number): DynamicWeatherConfig {
    const seg = this.getSegmentIndex(waveNumber ?? this.currentWave)
    return this.getWeatherForSegment(seg + 1)
  }

  /**
   * 推进波次并检查是否发生天时流转
   */
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
   * 计算指定五行武将在当前天时下的【增伤区】加成
   * - 得令：+0.20 (+20%)
   * - 失令：-0.15 (-15%，若拥有《草船借箭》等锦囊则免疫失令；若拥有《天命所归》则全系视作得令 +0.20)
   */
  public getDamageIncreaseBonus(wuXing: WuXing): number {
    if (this.allElementFavored) {
      return 0.20
    }
    const weather = this.getCurrentWeather()
    if (weather.favoredElements.includes(wuXing)) {
      return weather.favoredDamageBonus
    }
    if (weather.disfavoredElements.includes(wuXing)) {
      return this.ignorePenalty ? 0 : weather.disfavoredDamagePenalty
    }
    return 0
  }

  /**
   * 设置是否免疫天时失令惩罚（如锦囊《草船借箭》）
   */
  public setIgnorePenalty(ignore: boolean): void {
    this.ignorePenalty = ignore
  }

  /**
   * 设置是否全系皆视为得令（如锦囊《天命所归》）
   */
  public setAllElementFavored(favored: boolean): void {
    this.allElementFavored = favored
  }

  public reset(seedWeathers?: DynamicWeatherId[]): void {
    this.currentWave = 1
    this.ignorePenalty = false
    this.allElementFavored = false
    this.initSchedule(seedWeathers)
  }
}

export type WeatherConfig = DynamicWeatherConfig
