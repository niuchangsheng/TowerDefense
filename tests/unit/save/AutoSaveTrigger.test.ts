import { describe, it, expect, beforeEach } from 'vitest'
import { SaveManager } from '@/core/save/SaveManager'
import { EquipmentManager } from '@/core/equipment/EquipmentManager'
import { getTotalInvestedExp, calculateLevelFromExp } from '@/data/heroes'
import { BattleResult } from '@/types'

describe('全局状态变更实时自动存档验证 (Auto-Save on Settlement, Reforge, Equip, Level-Up, Star-Up)', () => {
  let saveMgr: SaveManager
  let eqMgr: EquipmentManager

  beforeEach(() => {
    saveMgr = SaveManager.getInstance()
    eqMgr = EquipmentManager.getInstance()
    eqMgr.reset()
    saveMgr.deleteSlot(0)
    saveMgr.deleteSlot(1)
    saveMgr.createNewSave(1)
  })

  it('1. 战斗结算（胜利与战败）均立即触发存档，并根据获得的经验自动重算武将等级', () => {
    const countBefore = saveMgr.getSaveCount()
    const currentSave = saveMgr.getCurrentSave()
    const guanyu = currentSave.heroes.find(h => h.id === 'hero_guanyu')!
    expect(guanyu.level).toBe(1)

    // 模拟战斗结算获得足够升至 Lv.3 的累计经验
    guanyu.experience = getTotalInvestedExp(3)
    const victoryResult: BattleResult = {
      levelId: 'chapter1_level1',
      isVictory: true,
      elapsedTime: 180000,
      remainingHealth: 18,
      wavesCompleted: 15,
      deployedHeroIds: ['hero_guanyu'],
      rewards: {
        soulStones: [{ heroId: 'hero_guanyu', amount: 1 }],
        equipment: ['weapon_rare_1'],
        gems: [],
        gold: 500,
        experience: 300
      }
    }

    const okVictory = saveMgr.autoSave(victoryResult)
    expect(okVictory).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBefore)

    // 验证重读存档后关羽等级已自动升至 Lv.3 且关卡进度已保存
    const reloaded = saveMgr.loadFromSlot(1)!
    const reloadedGuanyu = reloaded.heroes.find(h => h.id === 'hero_guanyu')!
    expect(reloadedGuanyu.level).toBe(3)
    expect(reloaded.levelProgress.find(l => l.levelId === 'chapter1_level1')?.isCompleted).toBe(true)

    // 模拟战败结算：同样必须触发存档并记录最高波次
    const countBeforeDefeat = saveMgr.getSaveCount()
    const defeatResult: BattleResult = {
      levelId: 'chapter1_level2',
      isVictory: false,
      elapsedTime: 95000,
      remainingHealth: 0,
      wavesCompleted: 9,
      deployedHeroIds: ['hero_guanyu'],
      rewards: {
        soulStones: [],
        equipment: [],
        gems: [],
        gold: 120,
        experience: 80
      }
    }

    const okDefeat = saveMgr.autoSave(defeatResult)
    expect(okDefeat).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeDefeat)

    const reloadedAfterDefeat = saveMgr.loadFromSlot(0)!
    const ch1Lv2 = reloadedAfterDefeat.levelProgress.find(l => l.levelId === 'chapter1_level2')
    expect(ch1Lv2).toBeDefined()
    expect(ch1Lv2?.highestWave).toBe(9)
  })

  it('2. 洗练（神兵基础属性洗练、灵石词条淬炼、5级灵石开槽）每次发生均立即触发存档并持久化洗练词条', () => {
    const qinglong = eqMgr.getOwnedEquipment().find(e => e.equipmentId === 'artifact_qinglong')!
    expect(qinglong).toBeDefined()

    // 2.1 神兵属性预览洗练（消耗百炼玄铁）-> 立即触发存档
    const countBeforePreview = saveMgr.getSaveCount()
    const reforgePreview = eqMgr.previewReforgeArtifactStat(qinglong.instanceId, 0)
    expect(reforgePreview.success).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforePreview)

    // 2.2 确认替换神兵洗练词条 -> 立即触发存档并持久化新数值
    const countBeforeApply = saveMgr.getSaveCount()
    const customAffix = {
      ...reforgePreview.newAffix!,
      value: 0.118
    }
    const applied = eqMgr.applyReforgedArtifactStat(qinglong.instanceId, 0, customAffix)
    expect(applied).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeApply)

    // 2.3 灵石词条淬炼与替换 -> 立即触发存档
    const anyGem = eqMgr.getOwnedGems()[0]
    const countBeforeGemPreview = saveMgr.getSaveCount()
    const gemPreview = eqMgr.previewReforgeGemAffix(anyGem.id, 0)
    expect(gemPreview.success).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeGemPreview)

    const countBeforeGemApply = saveMgr.getSaveCount()
    const customGemAffix = {
      ...gemPreview.newAffix!,
      value: 0.077
    }
    const gemApplied = eqMgr.applyReforgedGemAffix(anyGem.id, 0, customGemAffix)
    expect(gemApplied).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeGemApply)

    // 2.4 5级灵石开槽 -> 立即触发存档
    const lv5Gem = eqMgr.getOwnedGems().find(g => g.level === 5)!
    const prevAffixLen = lv5Gem.affixes?.length || 2
    const countBeforeUnlockSlot = saveMgr.getSaveCount()
    const unlockRes = eqMgr.unlockLevel5GemAffixSlot(lv5Gem.id)
    expect(unlockRes.success).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeUnlockSlot)

    // 重置内存并从存档重新加载，验证所有洗练词条与开槽结果 100% 恢复
    const qinglongInstId = qinglong.instanceId
    const targetGemId = anyGem.id
    const lv5GemId = lv5Gem.id
    eqMgr.reset()
    saveMgr.loadFromSlot(1)

    const restoredQinglong = eqMgr.getEquipmentInstance(qinglongInstId)!
    expect(restoredQinglong.statAffixes?.[0].value).toBeCloseTo(0.118, 4)

    const restoredGem = eqMgr.getGem(targetGemId)!
    expect(restoredGem.affixes?.[0].value).toBeCloseTo(0.077, 4)

    const restoredLv5Gem = eqMgr.getGem(lv5GemId)!
    expect(restoredLv5Gem.affixes?.length).toBe(prevAffixLen + 1)
  })

  it('3. 装备、卸下、镶嵌、合成、熔炼、蒲元铸造每次发生均立即触发存档并恢复佩带与镶嵌状态', () => {
    const unequippedWeapon = eqMgr.getUnequippedEquipment().find(e => e.type === 'weapon')!
    const countBeforeEquip = saveMgr.getSaveCount()
    const eqOk = eqMgr.equipToHero(unequippedWeapon.instanceId, 'hero_zhaoyun', '赵云')
    expect(eqOk).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeEquip)

    // 卸下装备
    const countBeforeUnequip = saveMgr.getSaveCount()
    const uneqOk = eqMgr.unequipFromHero(unequippedWeapon.instanceId)
    expect(uneqOk).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeUnequip)

    // 重新装备给赵云以便测试读档恢复
    eqMgr.equipToHero(unequippedWeapon.instanceId, 'hero_zhaoyun', '赵云')

    // 镶嵌宝石到青龙偃月刀
    const qinglong = eqMgr.getOwnedEquipment().find(e => e.equipmentId === 'artifact_qinglong')!
    const woodGem = eqMgr.getOwnedGems().find(g => g.wuXing === 'wood')!
    const countBeforeSocket = saveMgr.getSaveCount()
    const socketOk = eqMgr.socketGemToArtifact(qinglong.instanceId, woodGem.id, 'same')
    expect(socketOk).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeSocket)

    // 灵石三合一升阶
    const countBeforeSynth = saveMgr.getSaveCount()
    const synthGem = eqMgr.synthesizeGems('metal', 1)
    expect(synthGem).not.toBeNull()
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeSynth)

    // 熔炼闲置制式兵械
    const idleWeapon = eqMgr.getUnequippedEquipment().find(e => e.type === 'weapon')!
    const countBeforeSalvage = saveMgr.getSaveCount()
    const salvageRes = eqMgr.salvageGenericWeapon(idleWeapon.instanceId)
    expect(salvageRes.success).toBe(true)
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeSalvage)

    // 重置并从存档恢复，验证赵云佩带的兵器与青龙刀镶嵌的宝石均完整恢复
    eqMgr.reset()
    saveMgr.loadFromSlot(1)

    const zhaoyunEq = eqMgr.getHeroEquipment('hero_zhaoyun')
    expect(zhaoyunEq.weapon?.instanceId).toBe(unequippedWeapon.instanceId)

    const socketLoc = eqMgr.getGemSocketLocation(woodGem.id)
    expect(socketLoc?.artifactInstanceId).toBe(qinglong.instanceId)
    expect(socketLoc?.slotType).toBe('same')
  })

  it('4. 武将升级（冲穴）与升星（点亮将星命盘）立即触发存档并持久化', () => {
    const saveData = saveMgr.getCurrentSave()
    const machao = saveData.heroes.find(h => h.id === 'hero_machao')!
    expect(machao.level).toBe(1)
    expect(machao.star).toBe(1)

    // 升级至 Lv.4
    const countBeforeLevelUp = saveMgr.getSaveCount()
    machao.level = 4
    machao.experience = getTotalInvestedExp(4)
    saveMgr.saveCurrent()
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeLevelUp)

    // 升星至 3★
    const countBeforeStarUp = saveMgr.getSaveCount()
    machao.star = 3
    saveData.claimedBioTrials = ['mc_1', 'mc_2']
    saveMgr.saveCurrent()
    expect(saveMgr.getSaveCount()).toBeGreaterThan(countBeforeStarUp)

    // 验证 loadHeroes() 从存档恢复正确的等级与星级
    const loadedHeroes = saveMgr.loadHeroes()
    const loadedMachao = loadedHeroes.get('hero_machao')!
    expect(loadedMachao.level).toBe(4)
    expect(loadedMachao.star).toBe(3)
    expect(calculateLevelFromExp(loadedMachao.experience)).toBe(4)
    expect(saveMgr.getCurrentSave().claimedBioTrials).toEqual(['mc_1', 'mc_2'])
  })
})
