import { describe, it, expect, beforeEach } from 'vitest'
import { EquipmentManager } from '@/core/equipment/EquipmentManager'
import { getArtifact } from '@/data/equipment'
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
})
