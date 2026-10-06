import { describe, it, expect } from 'vitest'
import { DamageCalculator } from '@/core/battle/DamageCalculator'
import { WeatherSystem } from '@/core/battle/WeatherSystem'
import { MAX_HERO_LEVEL, getLevelStatBonus, getTotalInvestedExp } from '@/data/heroes/levelConfig'
import { heroes, getStarAttachmentRate, getStarDeploymentCostReduction } from '@/data/heroes'
import { HeroFactory } from '@/core/hero/HeroFactory'
import { GEM_STAT_RANGES, rollGemAffixes } from '@/data/equipment/gems'
import { EquipmentManager } from '@/core/equipment/EquipmentManager'
import { bossEnemies } from '@/data/enemies'
import { level1Config } from '@/data/levels/chapter1/level1'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'

describe('第一性原理铁律与核心机制单元测试（四乘区 / 40%抗性保底 / 50%局外上限 / 天时轮转 / 15波战役）', () => {
  describe('1. 严格四独立伤害乘区与 40% 敌方抗性下限保底', () => {
    it('敌军防御、韧性、刚毅削减无论叠加多少，最终生效值绝不低于初始值的 40%', () => {
      expect(DamageCalculator.MIN_RESISTANCE_FLOOR_RATIO).toBe(0.40)

      // 曹仁 60% 护甲被削减 90% 时，依然保底保留 60% * 0.40 = 24%
      const caorenDef = DamageCalculator.getEffectiveResistance(0.60, 0.90)
      expect(caorenDef).toBeCloseTo(0.24, 4)

      // 董卓 120% 刚毅被削减 100% 时，依然保底保留 120% * 0.40 = 48%
      const dongzhuoFort = DamageCalculator.getEffectiveResistance(1.20, 1.00)
      expect(dongzhuoFort).toBeCloseTo(0.48, 4)
    })

    it('四独立乘区公式：区内加算、区间乘算，暴击与刚毅/护甲正常结算', () => {
      const res = DamageCalculator.calculateFourBucketDamage({
        baseValue: 100,
        attackBoostSum: 0.20 + 0.30, // 攻击区 +50% -> 1.5
        damageIncreaseSum: 0.20 + 0.35, // 增伤区（天时20% + 阵脉35%）-> 1.55
        vulnerabilitySum: 0.50, // 易伤区（破壁瘫痪 +50%）-> 1.5
        critRate: 0.80,
        critDamage: 1.00,
        enemyInitialDefense: 0.50,
        defenseReductionRatio: 0.50, // 有效护甲 0.25 -> 承伤 0.75
        enemyInitialTenacity: 0.20,
        tenacityReductionRatio: 0.50, // 有效韧性 0.10 -> 净暴击率 0.70
        enemyInitialFortitude: 0.40,
        fortitudeReductionRatio: 0.50, // 有效刚毅 0.20 -> 净暴伤 0.80 -> 暴击区 1.80
        forceCrit: true
      })

      expect(res.isCrit).toBe(true)
      expect(res.actualCritRate).toBeCloseTo(0.70, 4)
      expect(res.actualCritDmgMult).toBeCloseTo(0.80, 4)
      expect(res.effectiveDefense).toBeCloseTo(0.25, 4)
      expect(res.defenseMitigationRatio).toBeCloseTo(0.25, 4)
      // 100 * 1.5 * 1.55 * 1.5 * 1.8 * (1 - 0.25) = 470.8125 -> 470
      expect(res.finalDamage).toBe(470)
    })

    it('相生共鸣取优法则：始终取双将中攻击力最高者为主基数 + 另一人 25% 协同加成', () => {
      const a = DamageCalculator.calculateReactionBaseAttack(200, 80)
      const b = DamageCalculator.calculateReactionBaseAttack(80, 200)
      expect(a).toBe(220)
      expect(b).toBe(220)
    })
  })

  describe('2. 局外数值天花板 <= +50% 与五虎将全员平权、武道十境', () => {
    it('局外单项面板增益上限被严格限制在 +50% 以内', () => {
      expect(DamageCalculator.MAX_OUT_OF_BATTLE_BONUS).toBe(0.50)
      expect(DamageCalculator.clampOutOfBattleBonus(0.85)).toBe(0.50)
      expect(DamageCalculator.clampOutOfBattleBonus(0.36)).toBe(0.36)
    })

    it('武道十境封顶 Lv.10（+36%），支持无损传功经验计算', () => {
      expect(MAX_HERO_LEVEL).toBe(10)
      expect(getLevelStatBonus(1)).toBeCloseTo(0, 4)
      expect(getLevelStatBonus(10)).toBeCloseTo(0.36, 4)
      expect(getTotalInvestedExp(10, 500)).toBeGreaterThanOrEqual(4500)
    })

    it('五虎上将开局全员解锁、全员平权（legendary），星级附着率 25% -> 80%，2★减免2费', () => {
      expect(heroes.length).toBe(5)
      for (const h of heroes) {
        expect(h.rarity).toBe('legendary')
        expect(h.deploymentCost).toBeGreaterThanOrEqual(10)
        expect(h.deploymentCost).toBeLessThanOrEqual(12)
        expect(h.baseStats.critRate).toBeGreaterThan(0)
        expect(h.baseStats.critDamage).toBeGreaterThan(0)
      }
      expect(getStarAttachmentRate(1)).toBeCloseTo(0.25, 2)
      expect(getStarAttachmentRate(5)).toBeCloseTo(0.80, 2)
      expect(getStarDeploymentCostReduction(1)).toBe(0)
      expect(getStarDeploymentCostReduction(2)).toBe(2)
    })

    it('五行灵石固定 2 条随机基础属性，Lv.5 攻击上限为 +7.0%，三合一主石 100% 继承词条类型', () => {
      expect(GEM_STAT_RANGES.attack[5].max).toBeCloseTo(0.07, 4)

      const affixes = rollGemAffixes(5, 0.50, ['attack', 'critRate'])
      expect(affixes.length).toBe(2)
      expect(affixes[0].stat).toBe('attack')
      expect(affixes[1].stat).toBe('critRate')
      // 50% 保底分位下，Lv.5 攻击词条必 >= 5.75% 且 <= 7.0%
      expect(affixes[0].value).toBeGreaterThanOrEqual(0.057)
      expect(affixes[0].value).toBeLessThanOrEqual(0.07)

      const eqMgr = EquipmentManager.getInstance()
      eqMgr.reset()
      const g1 = eqMgr.addGem('wood', 1, 0, ['attackSpeed', 'critDamage'])
      eqMgr.addGem('wood', 1)
      eqMgr.addGem('wood', 1)

      const synth = eqMgr.synthesizeGems('wood', 1, g1.id)
      expect(synth).not.toBeNull()
      expect(synth?.level).toBe(2)
      expect(synth?.affixes?.map(a => a.stat)).toEqual(['attackSpeed', 'critDamage'])
    })
  })

  describe('3. 无弹窗动态天时系统与 15 波紧凑战役、五大统帅铁壁', () => {
    it('15波战役三段式天时：Wave 1~5 随机五行天时，Wave 6~10 异种天时，Wave 11~15 固定【晴空朗日】', () => {
      const ws = new WeatherSystem()
      const seg1 = ws.getWeatherForWave(1)
      const seg2 = ws.getWeatherForWave(6)
      const seg3 = ws.getWeatherForWave(11)

      expect(seg1.id).not.toBe('clear')
      expect(seg2.id).not.toBe('clear')
      expect(seg2.id).not.toBe(seg1.id)
      expect(seg3.id).toBe('clear')
      expect(ws.getWeatherForWave(15).id).toBe('clear')
    })

    it('战役关卡为 15 波紧凑结构，且五大三国统帅均具备 3~5 格【五行铁壁】与命脉弱点', () => {
      expect(level1Config.waves.length).toBe(15)
      expect(bossEnemies.length).toBe(5)

      for (const boss of bossEnemies) {
        expect(boss.maxAegisGrids).toBeGreaterThanOrEqual(3)
        expect(boss.maxAegisGrids).toBeLessThanOrEqual(5)
        expect(boss.weaknessReactions?.length).toBeGreaterThan(0)
      }

      // 无尽北伐 Wave 16+ 掉落宝石保底分位逐层跃升（+15% / +30% / +50% 封顶）
      expect(EndlessModeManager.getGemMinRollPercentile(15)).toBe(0)
      expect(EndlessModeManager.getGemMinRollPercentile(16)).toBeCloseTo(0.15, 2)
      expect(EndlessModeManager.getGemMinRollPercentile(26)).toBeCloseTo(0.30, 2)
      expect(EndlessModeManager.getGemMinRollPercentile(36)).toBeCloseTo(0.50, 2)
      expect(EndlessModeManager.getGemMinRollPercentile(50)).toBeCloseTo(0.50, 2)
    })
  })
})
