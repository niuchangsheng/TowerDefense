import { describe, it, expect, beforeEach } from 'vitest'
import { EquipmentManager } from '@/core/equipment/EquipmentManager'
import { getArtifact, getAffixPercentile } from '@/data/equipment'
import { getAllowedGemWuXing, WuXingGeneratedBy, WuXingGenerate } from '@/types'

describe('神器专属机制与五行相生宝石匹配测试', () => {
  let equipmentManager: EquipmentManager

  beforeEach(() => {
    equipmentManager = EquipmentManager.getInstance()
    equipmentManager.reset()
  })

  describe('1. 五行相生与生我者关系推演', () => {
    it('正确定义五行生我者（母气滋养）对应关系', () => {
      expect(WuXingGeneratedBy.wood).toBe('water')   // 水生木
      expect(WuXingGeneratedBy.fire).toBe('wood')    // 木生火
      expect(WuXingGeneratedBy.earth).toBe('fire')   // 火生土
      expect(WuXingGeneratedBy.metal).toBe('earth')  // 土生金
      expect(WuXingGeneratedBy.water).toBe('metal')  // 金生水
    })

    it('getAllowedGemWuXing 正确返回同源与相生五行列表', () => {
      const woodAllowed = getAllowedGemWuXing('wood')
      expect(woodAllowed.same).toBe('wood')
      expect(woodAllowed.generating).toBe('water')
      expect(woodAllowed.all).toEqual(['wood', 'water'])

      const earthAllowed = getAllowedGemWuXing('earth')
      expect(earthAllowed.same).toBe('earth')
      expect(earthAllowed.generating).toBe('fire')
      expect(earthAllowed.all).toEqual(['earth', 'fire'])
    })
  })

  describe('2. 五虎上将专属神兵配置与属性修正', () => {
    it('关羽专属神兵【青龙偃月刀】为木属性，允许木（同源）与水（相生）宝石', () => {
      const qinglong = getArtifact('artifact_qinglong')
      expect(qinglong).toBeDefined()
      expect(qinglong?.gemSocket.requiredWuXing).toBe('wood')
      expect(qinglong?.gemSocket.allowedWuXings).toContain('wood')
      expect(qinglong?.gemSocket.allowedWuXings).toContain('water')
      expect(qinglong?.exclusiveHeroes).toContain('hero_guanyu')
      expect(qinglong?.exclusiveResonance?.heroName).toBe('关羽')
    })

    it('张飞专属神兵【丈八蛇矛】修正为土属性，允许土（同源）与火（相生）宝石', () => {
      const shemao = getArtifact('artifact_shemao')
      expect(shemao).toBeDefined()
      expect(shemao?.gemSocket.requiredWuXing).toBe('earth')
      expect(shemao?.gemSocket.allowedWuXings).toContain('earth')
      expect(shemao?.gemSocket.allowedWuXings).toContain('fire')
      expect(shemao?.exclusiveHeroes).toContain('hero_zhangfei')
      expect(shemao?.exclusiveResonance?.heroName).toBe('张飞')
    })

    it('赵云专属神兵【龙胆亮银枪】为水属性，允许水（同源）与金（相生）宝石', () => {
      const longdan = getArtifact('artifact_longdan')
      expect(longdan).toBeDefined()
      expect(longdan?.gemSocket.requiredWuXing).toBe('water')
      expect(longdan?.gemSocket.allowedWuXings).toContain('water')
      expect(longdan?.gemSocket.allowedWuXings).toContain('metal')
      expect(longdan?.exclusiveHeroes).toContain('hero_zhaoyun')
      expect(longdan?.exclusiveResonance?.heroName).toBe('赵云')
    })

    it('黄忠专属神兵【宝雕射日弓】修正为火属性，允许火（同源）与木（相生）宝石', () => {
      const sherigong = getArtifact('artifact_sherigong')
      expect(sherigong).toBeDefined()
      expect(sherigong?.gemSocket.requiredWuXing).toBe('fire')
      expect(sherigong?.gemSocket.allowedWuXings).toContain('fire')
      expect(sherigong?.gemSocket.allowedWuXings).toContain('wood')
      expect(sherigong?.exclusiveHeroes).toContain('hero_huangzhong')
      expect(sherigong?.exclusiveResonance?.heroName).toBe('黄忠')
    })

    it('马超专属神兵【虎头湛金枪】为金属性，允许金（同源）与土（相生）宝石', () => {
      const zhanjin = getArtifact('artifact_zhanjin')
      expect(zhanjin).toBeDefined()
      expect(zhanjin?.gemSocket.requiredWuXing).toBe('metal')
      expect(zhanjin?.gemSocket.allowedWuXings).toContain('metal')
      expect(zhanjin?.gemSocket.allowedWuXings).toContain('earth')
      expect(zhanjin?.exclusiveHeroes).toContain('hero_machao')
      expect(zhanjin?.exclusiveResonance?.heroName).toBe('马超')
    })
  })

  describe('3. 软专属穿戴机制（非专属可穿戴白板，专属方可激活器灵）', () => {
    it('非专属武将亦可自由穿戴任意神器，canEquipToHero 返回 true', () => {
      const qinglong = equipmentManager.addEquipment('artifact_qinglong')!
      expect(equipmentManager.canEquipToHero(qinglong.instanceId, 'hero_zhaoyun', '赵云')).toBe(true)
      expect(equipmentManager.canEquipToHero(qinglong.instanceId, 'hero_zhangfei', '张飞')).toBe(true)

      const success = equipmentManager.equipToHero(qinglong.instanceId, 'hero_zhaoyun', '赵云')
      expect(success).toBe(true)
      expect(qinglong.isEquipped).toBe(true)
      expect(qinglong.equippedHeroId).toBe('hero_zhaoyun')
    })

    it('isExclusiveForHero 能精确识别专属神将与非专属神将', () => {
      const qinglong = equipmentManager.addEquipment('artifact_qinglong')!
      expect(equipmentManager.isExclusiveForHero(qinglong.instanceId, 'hero_guanyu', '关羽')).toBe(true)
      expect(equipmentManager.isExclusiveForHero(qinglong.instanceId, 'hero_zhaoyun', '赵云')).toBe(false)

      const longdan = equipmentManager.addEquipment('artifact_longdan')!
      expect(equipmentManager.isExclusiveForHero(longdan.instanceId, 'hero_zhaoyun', '赵云')).toBe(true)
      expect(equipmentManager.isExclusiveForHero(longdan.instanceId, 'hero_guanyu', '关羽')).toBe(false)
    })
  })

  describe('4. 宝石镶嵌校验（同源与相生允许，不匹配则拦截）', () => {
    it('木系神器允许镶嵌木系宝石（同源）', () => {
      const qinglong = equipmentManager.addEquipment('artifact_qinglong')!
      const woodGem = equipmentManager.addGem('wood', 3)
      const res = equipmentManager.socketGemToArtifact(qinglong.instanceId, woodGem.id)
      expect(res).toBe(true)
    })

    it('木系神器允许镶嵌水系宝石（水生木 · 相生）', () => {
      const qinglong = equipmentManager.addEquipment('artifact_qinglong')!
      const waterGem = equipmentManager.addGem('water', 3)
      const res = equipmentManager.socketGemToArtifact(qinglong.instanceId, waterGem.id)
      expect(res).toBe(true)
    })

    it('木系神器拒绝镶嵌金系（相克）或土系（无关）宝石', () => {
      const qinglong = equipmentManager.addEquipment('artifact_qinglong')!
      const metalGem = equipmentManager.addGem('metal', 3)
      const earthGem = equipmentManager.addGem('earth', 3)

      expect(equipmentManager.socketGemToArtifact(qinglong.instanceId, metalGem.id)).toBe(false)
      expect(equipmentManager.socketGemToArtifact(qinglong.instanceId, earthGem.id)).toBe(false)
    })

    it('土系神器【丈八蛇矛】允许土系（同源）与火系（相生）宝石，拒绝木系宝石', () => {
      const shemao = equipmentManager.addEquipment('artifact_shemao')!
      const earthGem = equipmentManager.addGem('earth', 2)
      const fireGem = equipmentManager.addGem('fire', 2)
      const woodGem = equipmentManager.addGem('wood', 2)

      expect(equipmentManager.socketGemToArtifact(shemao.instanceId, earthGem.id)).toBe(true)
      expect(equipmentManager.socketGemToArtifact(shemao.instanceId, fireGem.id)).toBe(true)
      expect(equipmentManager.socketGemToArtifact(shemao.instanceId, woodGem.id)).toBe(false)
    })
  })

  describe('5. 器灵觉醒与五行相生共鸣状态判定', () => {
    it('专属武将佩戴专属神兵并镶嵌同源宝石，判定为同源共鸣 (same)', () => {
      const qinglong = equipmentManager.addEquipment('artifact_qinglong')!
      const woodGem = equipmentManager.addGem('wood', 5)
      equipmentManager.socketGemToArtifact(qinglong.instanceId, woodGem.id)
      equipmentManager.equipToHero(qinglong.instanceId, 'hero_guanyu', '关羽')

      const resonance = equipmentManager.getHeroResonance('hero_guanyu', '关羽')
      expect(resonance.isExclusive).toBe(true)
      expect(resonance.hasResonance).toBe(true)
      expect(resonance.resonanceType).toBe('same')
      expect(resonance.gemLevel).toBe(5)
    })

    it('专属武将佩戴专属神兵并镶嵌相生宝石，判定为相生滋养 (generating)', () => {
      const qinglong = equipmentManager.addEquipment('artifact_qinglong')!
      const waterGem = equipmentManager.addGem('water', 4)
      equipmentManager.socketGemToArtifact(qinglong.instanceId, waterGem.id)
      equipmentManager.equipToHero(qinglong.instanceId, 'hero_guanyu', '关羽')

      const resonance = equipmentManager.getHeroResonance('hero_guanyu', '关羽')
      expect(resonance.isExclusive).toBe(true)
      expect(resonance.hasResonance).toBe(true)
      expect(resonance.resonanceType).toBe('generating')
      expect(resonance.gemLevel).toBe(4)
    })

    it('非专属武将佩戴神器，即便镶嵌同属性宝石，亦不激活器灵（器灵沉睡）', () => {
      const qinglong = equipmentManager.addEquipment('artifact_qinglong')!
      const woodGem = equipmentManager.addGem('wood', 5)
      equipmentManager.socketGemToArtifact(qinglong.instanceId, woodGem.id)
      equipmentManager.equipToHero(qinglong.instanceId, 'hero_zhaoyun', '赵云')

      const resonance = equipmentManager.getHeroResonance('hero_zhaoyun', '赵云')
      expect(resonance.isExclusive).toBe(false)
      expect(resonance.hasResonance).toBe(false)
      expect(resonance.resonanceType).toBe('same') // 宝石五行匹配，但器灵沉睡
    })
  })

  describe('6. 神兵双槽三才共鸣（2★同源槽 + 4★相生槽）与 6 阶进化状态判定', () => {
    it('支持双槽独立镶嵌/卸下，并精确判定 6 阶进化状态（§4.4）', () => {
      const qinglong = equipmentManager.addEquipment('artifact_qinglong')!
      equipmentManager.unsocketGemFromArtifact(qinglong.instanceId)

      // ① 阶：未装备武将
      let evo = equipmentManager.getArtifactEvolutionStage(qinglong.instanceId)
      expect(evo.stageIndex).toBe(1)
      expect(evo.isExclusiveOwnerEquipped).toBe(false)

      // ② 阶：非专属武将佩戴（仅生效白板面板）
      equipmentManager.equipToHero(qinglong.instanceId, 'hero_zhaoyun', '赵云')
      evo = equipmentManager.getArtifactEvolutionStage(qinglong.instanceId)
      expect(evo.stageIndex).toBe(2)
      expect(evo.isNonOwnerEquipped).toBe(true)
      expect(evo.hasSameEffect).toBe(false)

      // ③ 阶：本命武将（关羽）佩戴，尚未镶嵌宝石 -> 激活神兵进化技
      equipmentManager.equipToHero(qinglong.instanceId, 'hero_guanyu', '关羽')
      evo = equipmentManager.getArtifactEvolutionStage(qinglong.instanceId)
      expect(evo.stageIndex).toBe(3)
      expect(evo.isExclusiveOwnerEquipped).toBe(true)

      // ④ 阶：镶嵌 2★ 同源槽宝石 (Lv.4 木)
      const woodGem4 = equipmentManager.addGem('wood', 4, 0.5, ['attack', 'critRate'])
      expect(equipmentManager.socketGemToArtifact(qinglong.instanceId, woodGem4.id, 'same')).toBe(true)
      // 相生槽拒绝镶嵌同源木宝石
      expect(equipmentManager.socketGemToArtifact(qinglong.instanceId, woodGem4.id, 'generating')).toBe(false)

      evo = equipmentManager.getArtifactEvolutionStage(qinglong.instanceId)
      expect(evo.stageIndex).toBe(4)
      expect(evo.hasSameEffect).toBe(true)
      expect(evo.hasGeneratingEffect).toBe(false)

      // ⑤ 阶：继续镶嵌 4★ 相生槽宝石 (Lv.4 水 · 水生木) -> 双槽三才并存
      const waterGem4 = equipmentManager.addGem('water', 4, 0.5, ['attackSpeed', 'critRate'])
      expect(equipmentManager.socketGemToArtifact(qinglong.instanceId, waterGem4.id, 'generating')).toBe(true)
      evo = equipmentManager.getArtifactEvolutionStage(qinglong.instanceId)
      expect(evo.stageIndex).toBe(5)
      expect(evo.hasSameEffect).toBe(true)
      expect(evo.hasGeneratingEffect).toBe(true)
      expect(evo.hasDualLv5Ultimate).toBe(false)

      // ⑥ 阶：双槽皆换为 Lv.5 传世神品 -> 唤醒 5★ 终极大招【青龙吞月·沧海狂澜】
      const woodGem5 = equipmentManager.addGem('wood', 5, 0.8, ['attack', 'critDamage'])
      const waterGem5 = equipmentManager.addGem('water', 5, 0.8, ['attack', 'attackSpeed'])
      equipmentManager.socketGemToArtifact(qinglong.instanceId, woodGem5.id, 'same')
      equipmentManager.socketGemToArtifact(qinglong.instanceId, waterGem5.id, 'generating')

      evo = equipmentManager.getArtifactEvolutionStage(qinglong.instanceId)
      expect(evo.stageIndex).toBe(6)
      expect(evo.hasDualLv5Ultimate).toBe(true)

      // 单独卸下相生槽，同源槽依然保留
      equipmentManager.unsocketGemSlotFromArtifact(qinglong.instanceId, 'generating')
      const socketsAfter = equipmentManager.getArtifactSocketedGems(qinglong.instanceId)
      expect(socketsAfter.sameGem?.id).toBe(woodGem5.id)
      expect(socketsAfter.generatingGem).toBeNull()
    })
  })

  describe('7. 三才炼石炉（主石词条 100% 定向继承三合一）与数值天花板校验', () => {
    it('三合一升阶 100% 继承指定主石的 2 条词条类型与品相分位下限', () => {
      const g1 = equipmentManager.addGem('fire', 2, 0.1, ['attackRange', 'attackSpeed'])
      const mainGem = equipmentManager.addGem('fire', 2, 0.9, ['critRate', 'critDamage'], [0.9, 0.9])
      const g3 = equipmentManager.addGem('fire', 2, 0.1, ['attack', 'attackRange'])

      expect(g1.id).toBeDefined()
      expect(g3.id).toBeDefined()

      const upgraded = equipmentManager.synthesizeGems('fire', 2, mainGem.id)
      expect(upgraded).not.toBeNull()
      expect(upgraded?.level).toBe(3)
      expect(upgraded?.wuXing).toBe('fire')
      expect(upgraded?.affixes?.map(a => a.stat)).toEqual(['critRate', 'critDamage'])

      // 自选词条合成：从3颗不同灵石的6条词条中自由挑选任意2条保留
      const w1 = equipmentManager.addGem('water', 1, 0.2, ['attack', 'attackRange'], [0.8, 0.2])
      const w2 = equipmentManager.addGem('water', 1, 0.5, ['attackSpeed', 'critRate'], [0.3, 0.95])
      const w3 = equipmentManager.addGem('water', 1, 0.7, ['critDamage', 'attackRange'], [0.6, 0.4])
      const customUpgraded = equipmentManager.synthesizeGems(
        'water',
        1,
        undefined,
        [
          { stat: 'attack', percentile: getAffixPercentile(w1.affixes![0]) },
          { stat: 'critRate', percentile: getAffixPercentile(w2.affixes![1]) }
        ],
        [w1.id, w2.id, w3.id]
      )
      expect(customUpgraded).not.toBeNull()
      expect(customUpgraded?.level).toBe(2)
      expect(customUpgraded?.affixes?.map(a => a.stat)).toEqual(['attack', 'critRate'])
      expect(getAffixPercentile(customUpgraded!.affixes![0])).toBeGreaterThanOrEqual(0.79)
      expect(getAffixPercentile(customUpgraded!.affixes![1])).toBeGreaterThanOrEqual(0.94)
    })

    it('双 Lv.5 极品攻击宝石叠加不超过 +14%（严格配合武道十境 +36% 守住 <= +50% 局外铁律）', () => {
      const qinglong = equipmentManager.addEquipment('artifact_qinglong')!
      const wood5 = equipmentManager.addGem('wood', 5, 0.5, ['attack', 'attack'], [1.0, 1.0])
      const water5 = equipmentManager.addGem('water', 5, 0.5, ['attack', 'critRate'], [1.0, 1.0])

      // 单条 Lv.5 攻击力词条上限为 +7.0% (0.07)
      expect(wood5.affixes?.[0].max).toBeCloseTo(0.07, 4)
      expect(wood5.affixes?.[0].value).toBeLessThanOrEqual(0.07)

      equipmentManager.socketGemToArtifact(qinglong.instanceId, wood5.id, 'same')
      equipmentManager.socketGemToArtifact(qinglong.instanceId, water5.id, 'generating')
      equipmentManager.equipToHero(qinglong.instanceId, 'hero_guanyu', '关羽')

      const bonuses = equipmentManager.getHeroGemStatBonuses('hero_guanyu')
      expect(bonuses.attackPercent).toBeGreaterThan(0.15)
      expect(bonuses.attackPercent).toBeLessThanOrEqual(0.2801)
    })
  })

  describe('8. 通用制式兵械熔炼【百炼玄铁】与蒲元铸剑坊', () => {
    it('闲置通用制式兵械可熔炼转化为百炼玄铁，已装备兵械或神兵不可误熔炼', () => {
      const initialIron = equipmentManager.getRefinedIron()
      const weapon = equipmentManager.addEquipment('weapon_rare_1')!

      // 装备中不可熔炼
      equipmentManager.equipToHero(weapon.instanceId, 'hero_machao', '马超')
      expect(equipmentManager.salvageGenericWeapon(weapon.instanceId).success).toBe(false)

      // 卸下后可熔炼获得百炼玄铁
      equipmentManager.unequipFromHero(weapon.instanceId)
      const res = equipmentManager.salvageGenericWeapon(weapon.instanceId)
      expect(res.success).toBe(true)
      expect(res.ironGained).toBe(30)
      expect(equipmentManager.getRefinedIron()).toBe(initialIron + 30)
    })

    it('5级灵石支持开槽扩展至最多5条属性词条，且5级灵石不可分解', () => {
      equipmentManager.addSpiritDust(200)
      const gem4 = equipmentManager.addGem('earth', 4)
      const gem5 = equipmentManager.addGem('earth', 5)

      // 4级灵石不可开槽，但可分解
      expect(equipmentManager.unlockLevel5GemAffixSlot(gem4.id).success).toBe(false)
      expect(equipmentManager.salvageGemToDust(gem4.id).success).toBe(true)

      // 5级灵石不可分解
      expect(equipmentManager.salvageGemToDust(gem5.id).success).toBe(false)

      // 5级灵石初始2条词条，可连续开槽3次至最多5条词条
      expect(gem5.affixes?.length).toBe(2)
      expect(equipmentManager.unlockLevel5GemAffixSlot(gem5.id).success).toBe(true)
      expect(gem5.affixes?.length).toBe(3)
      expect(equipmentManager.unlockLevel5GemAffixSlot(gem5.id).success).toBe(true)
      expect(gem5.affixes?.length).toBe(4)
      expect(equipmentManager.unlockLevel5GemAffixSlot(gem5.id).success).toBe(true)
      expect(gem5.affixes?.length).toBe(5)

      // 满5槽后不可继续开槽
      expect(equipmentManager.unlockLevel5GemAffixSlot(gem5.id).success).toBe(false)
      expect(gem5.affixes?.length).toBe(5)

      // 镶嵌位置文案不含 2★ / 4★ 前缀
      const shemao = equipmentManager.addEquipment('artifact_shemao')!
      equipmentManager.socketGemToArtifact(shemao.instanceId, gem5.id, 'same')
      const loc = equipmentManager.getGemSocketLocation(gem5.id)
      expect(loc?.slotLabel).toBe('同源槽')
    })
  })
})

