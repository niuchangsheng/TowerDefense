import { SaveData, SAVE_KEY_PREFIX, SAVE_VERSION, SAVE_SLOT_COUNT, createDefaultSaveData } from '@/types'
import { createDefaultHeroes, calculateLevelFromExp } from '@/data/heroes'
import { Hero, BattleResult } from '@/types'
import { EquipmentManager } from '@/core/equipment/EquipmentManager'

/**
 * 存档管理器
 * 支持多存档槽位（0=自动存档，1-3=手动存档）
 * 每次战斗结算、洗练、装备、升级、升星等状态变更行为均实时触发持久化存档
 */
export class SaveManager {
  private static instance: SaveManager
  private currentSlot: number = 1  // 当前使用的存档槽位（默认槽位1）
  private currentSave: SaveData | null = null
  private memoryStorage: Map<string, string> = new Map()
  private isSyncingEquipment: boolean = false
  private saveCount: number = 0

  private constructor() {
    this.bindEquipmentManagerAutoSave()
  }

  /**
   * 绑定装备管理器状态变更自动存档钩子（洗练、装备、卸下、镶嵌、合成、熔炼、锻造等立即存档）
   */
  private bindEquipmentManagerAutoSave(): void {
    const eqMgr = EquipmentManager.getInstance()
    eqMgr.setOnChangeCallback(() => {
      if (this.isSyncingEquipment) return
      this.saveCurrent()
    })
  }

  /**
   * 获取单例实例
   */
  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager()
    }
    return SaveManager.instance
  }

  /**
   * 获取累计触发存档次数（用于状态审计与测试验证）
   */
  public getSaveCount(): number {
    return this.saveCount
  }

  /**
   * 安全读取存储项（兼容浏览器 localStorage 与 Node/Vitest 内存环境）
   */
  private getStorageItem(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined' && localStorage !== null) {
        return localStorage.getItem(key)
      }
    } catch {
      // fallback to memoryStorage
    }
    return this.memoryStorage.get(key) ?? null
  }

  /**
   * 安全写入存储项（兼容浏览器 localStorage 与 Node/Vitest 内存环境）
   */
  private setStorageItem(key: string, value: string): void {
    this.memoryStorage.set(key, value)
    try {
      if (typeof localStorage !== 'undefined' && localStorage !== null) {
        localStorage.setItem(key, value)
      }
    } catch {
      // fallback to memoryStorage
    }
  }

  /**
   * 安全移除存储项
   */
  private removeStorageItem(key: string): void {
    this.memoryStorage.delete(key)
    try {
      if (typeof localStorage !== 'undefined' && localStorage !== null) {
        localStorage.removeItem(key)
      }
    } catch {
      // fallback to memoryStorage
    }
  }

  /**
   * 获取存档键名
   */
  private getSaveKey(slotId: number): string {
    return `${SAVE_KEY_PREFIX}${slotId}`
  }

  /**
   * 检查槽位是否有存档
   */
  hasSave(slotId: number): boolean {
    return this.getStorageItem(this.getSaveKey(slotId)) !== null
  }

  /**
   * 获取所有存档槽位状态
   */
  getAllSlotStatus(): { slotId: number; hasSave: boolean; summary: SaveData | null }[] {
    const slots: { slotId: number; hasSave: boolean; summary: SaveData | null }[] = []

    for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
      const hasSave = this.hasSave(i)
      let summary: SaveData | null = null

      if (hasSave) {
        try {
          const jsonStr = this.getStorageItem(this.getSaveKey(i))
          if (jsonStr) {
            summary = JSON.parse(jsonStr) as SaveData
            if (!summary.heroes || !Array.isArray(summary.heroes)) summary.heroes = []
            if (!summary.inventory) {
              summary.inventory = { soulStones: [], equipment: [], gems: [], gold: 0 }
            }
            if (!summary.levelProgress || !Array.isArray(summary.levelProgress)) summary.levelProgress = []
          }
        } catch (e) {
          console.error(`读取槽位${i}存档失败:`, e)
        }
      }

      slots.push({
        slotId: i,
        hasSave,
        summary
      })
    }

    return slots
  }

  /**
   * 将 EquipmentManager 的最新状态（装备实例、洗练词条、镶嵌槽位、宝石词条、灵砂、玄铁、主材）同步到存档数据
   */
  private syncEquipmentToSaveData(saveData: SaveData): void {
    const eqMgr = EquipmentManager.getInstance()
    const exported = eqMgr.exportToSaveInventory()
    if (!saveData.inventory) {
      saveData.inventory = { soulStones: [], equipment: [], gems: [], gold: 1000 }
    }
    saveData.inventory.equipment = exported.equipment
    saveData.inventory.equipmentInstances = exported.equipmentInstances
    saveData.inventory.artifactSockets = exported.artifactSockets
    saveData.inventory.gems = exported.gems
    saveData.inventory.spiritDust = exported.spiritDust
    saveData.inventory.refinedIron = exported.refinedIron
    saveData.inventory.divineMaterials = exported.divineMaterials

    if (Array.isArray(saveData.heroes)) {
      for (const h of saveData.heroes) {
        if (!h) continue
        const heroEq = eqMgr.getHeroEquipment(h.id)
        h.equipment = {
          weapon: heroEq.weapon?.equipmentId || null,
          artifact: heroEq.artifact?.equipmentId || null
        }
      }
    }
  }

  /**
   * 保存到指定槽位
   */
  saveToSlot(slotId: number, saveData: SaveData): boolean {
    try {
      this.syncEquipmentToSaveData(saveData)
      saveData.timestamp = Date.now()
      saveData.slotId = slotId
      const jsonStr = JSON.stringify(saveData)
      this.setStorageItem(this.getSaveKey(slotId), jsonStr)
      this.saveCount++
      console.log(`存档保存成功 [槽位${slotId}]:`, new Date(saveData.timestamp).toLocaleString())
      return true
    } catch (error) {
      console.error('存档保存失败:', error)
      return false
    }
  }

  /**
   * 从指定槽位加载
   */
  loadFromSlot(slotId: number): SaveData | null {
    try {
      const jsonStr = this.getStorageItem(this.getSaveKey(slotId))
      if (!jsonStr) {
        console.log(`槽位${slotId}没有存档`)
        return null
      }

      const data = JSON.parse(jsonStr) as SaveData

      // 版本兼容性检查
      if (!this.checkVersion(data)) {
        console.warn('存档版本不兼容')
        return null
      }

      // 数据结构完整性防御，防止脏数据/旧版数据导致各场景 TypeError 崩溃
      if (!data.heroes || !Array.isArray(data.heroes)) data.heroes = []
      if (!data.inventory) {
        data.inventory = { soulStones: [], equipment: [], gems: [], gold: 0 }
      } else {
        if (!Array.isArray(data.inventory.soulStones)) data.inventory.soulStones = []
        if (!Array.isArray(data.inventory.equipment)) data.inventory.equipment = []
        if (!Array.isArray(data.inventory.gems)) data.inventory.gems = []
        if (typeof data.inventory.gold !== 'number') data.inventory.gold = 0
      }
      if (!data.levelProgress || !Array.isArray(data.levelProgress)) data.levelProgress = []
      if (!data.chapterProgress || !Array.isArray(data.chapterProgress)) data.chapterProgress = []

      // 恢复装备、洗练词条、宝石镶嵌与材料状态到 EquipmentManager
      this.isSyncingEquipment = true
      try {
        EquipmentManager.getInstance().importFromSaveInventory(data.inventory as any)
      } finally {
        this.isSyncingEquipment = false
      }

      this.currentSlot = slotId
      this.currentSave = data
      console.log(`存档加载成功 [槽位${slotId}]:`, new Date(data.timestamp).toLocaleString())
      return data
    } catch (error) {
      console.error('存档加载失败:', error)
      return null
    }
  }

  /**
   * 删除指定槽位存档
   */
  deleteSlot(slotId: number): boolean {
    try {
      this.removeStorageItem(this.getSaveKey(slotId))
      if (this.currentSlot === slotId) {
        this.currentSave = null
      }
      console.log(`槽位${slotId}存档已删除`)
      return true
    } catch (error) {
      console.error('删除存档失败:', error)
      return false
    }
  }

  /**
   * 确保当前存在有效存档（若尚未加载，则优先从槽位1或自动存档槽位0加载，否则自动初始化新存档）
   */
  public ensureSaveInitialized(): SaveData {
    if (this.currentSave) {
      return this.currentSave
    }
    const loaded =
      this.loadFromSlot(this.currentSlot) ||
      this.loadFromSlot(1) ||
      this.loadFromSlot(0)
    if (loaded) {
      return loaded
    }
    return this.createNewSave(this.currentSlot || 1)
  }

  /**
   * 获取当前存档（自动确保已初始化，杜绝未读档直接操作导致存档丢失）
   */
  getCurrentSave(): SaveData | null {
    return this.ensureSaveInitialized()
  }

  /**
   * 获取当前槽位ID
   */
  getCurrentSlot(): number {
    return this.currentSlot
  }

  /**
   * 设置当前存档（用于修改后保存）
   */
  setCurrentSave(saveData: SaveData): void {
    this.currentSave = saveData
  }

  /**
   * 版本兼容性检查
   */
  private checkVersion(data: SaveData): boolean {
    const savedMajor = data.version.split('.')[0]
    const currentMajor = SAVE_VERSION.split('.')[0]
    return savedMajor === currentMajor
  }

  /**
   * 自动存档（每次战斗结算调用，无论胜败或无尽北伐均保存最新进度与武将状态）
   */
  autoSave(battleResult: BattleResult): boolean {
    const current = this.ensureSaveInitialized()
    const waves = battleResult.wavesCompleted || 0

    // 更新关卡进度（胜利标记通关，失败亦记录最高推进波次）
    if (battleResult.isVictory) {
      this.updateLevelProgressInSave(current, battleResult.levelId, true, 3, waves)
    } else {
      const existing = current.levelProgress.find(l => l.levelId === battleResult.levelId)
      if (existing) {
        existing.highestWave = Math.max(existing.highestWave || 0, waves)
      } else {
        current.levelProgress.push({
          levelId: battleResult.levelId,
          isCompleted: false,
          starsAchieved: 0,
          highestWave: waves
        })
      }
    }

    // 校验并同步所有武将经验对应的等级
    if (Array.isArray(current.heroes)) {
      for (const hero of current.heroes) {
        if (!hero) continue
        const calcLvl = calculateLevelFromExp(hero.experience || 0)
        if (calcLvl > hero.level) {
          hero.level = calcLvl
        }
      }
    }

    // 同步保存到当前槽位及槽位0（自动存档槽位）
    if (this.currentSlot !== 0) {
      this.saveToSlot(this.currentSlot, current)
    }
    return this.saveToSlot(0, current)
  }

  /**
   * 初始化默认数据
   */
  private initDefaultData(saveData: SaveData): void {
    // 初始化默认武将
    const defaultHeroes = createDefaultHeroes()
    for (const [id, hero] of defaultHeroes) {
      if (hero.isUnlocked) {
        saveData.heroes.push({
          id,
          level: hero.level,
          star: hero.star,
          experience: hero.experience,
          isUnlocked: true,
          equipment: hero.equipment
        })
      }
    }

    // 初始化金币
    saveData.inventory.gold = 1000

    // 同步默认装备与宝石状态
    this.syncEquipmentToSaveData(saveData)
  }

  /**
   * 创建新存档
   */
  createNewSave(slotId: number): SaveData {
    const newSave = createDefaultSaveData(slotId)
    this.initDefaultData(newSave)
    this.currentSlot = slotId
    this.currentSave = newSave
    this.saveToSlot(slotId, newSave)
    return newSave
  }

  /**
   * 更新存档中的关卡进度
   */
  private updateLevelProgressInSave(
    saveData: SaveData,
    levelId: string,
    isCompleted: boolean,
    stars: number,
    highestWave?: number
  ): void {
    const levelIndex = saveData.levelProgress.findIndex(l => l.levelId === levelId)

    if (levelIndex >= 0) {
      saveData.levelProgress[levelIndex] = {
        levelId,
        isCompleted: saveData.levelProgress[levelIndex].isCompleted || isCompleted,
        starsAchieved: Math.max(saveData.levelProgress[levelIndex].starsAchieved, stars),
        highestWave: Math.max(
          saveData.levelProgress[levelIndex].highestWave || 0,
          highestWave || (isCompleted ? 15 : 0)
        )
      }
    } else {
      saveData.levelProgress.push({
        levelId,
        isCompleted,
        starsAchieved: stars,
        highestWave: highestWave || (isCompleted ? 15 : 0)
      })
    }
  }

  /**
   * 更新当前存档的关卡进度并立即保存
   */
  updateLevelProgress(levelId: string, isCompleted: boolean, stars: number): void {
    const save = this.ensureSaveInitialized()
    this.updateLevelProgressInSave(save, levelId, isCompleted, stars)
    this.saveCurrent()
  }

  /**
   * 加载武将数据（合并默认配置）
   */
  loadHeroes(): Map<string, Hero> {
    this.ensureSaveInitialized()
    const defaultHeroes = createDefaultHeroes()
    const loadedHeroes = new Map<string, Hero>()
    const eqMgr = EquipmentManager.getInstance()

    // 先用默认配置
    for (const [id, hero] of defaultHeroes) {
      loadedHeroes.set(id, hero)
    }

    // 用存档数据覆盖
    if (this.currentSave && Array.isArray(this.currentSave.heroes)) {
      for (const savedHero of this.currentSave.heroes) {
        if (!savedHero) continue
        const defaultHero = defaultHeroes.get(savedHero.id)
        if (defaultHero) {
          const heroEq = eqMgr.getHeroEquipment(savedHero.id)
          const exp = savedHero.experience ?? defaultHero.experience
          const lvl = Math.max(savedHero.level ?? defaultHero.level, calculateLevelFromExp(exp))
          loadedHeroes.set(savedHero.id, {
            ...defaultHero,
            level: lvl,
            star: savedHero.star ?? defaultHero.star,
            experience: exp,
            isUnlocked: savedHero.isUnlocked ?? defaultHero.isUnlocked,
            equipment: {
              weapon: heroEq.weapon?.equipmentId ?? savedHero.equipment?.weapon ?? defaultHero.equipment.weapon,
              artifact: heroEq.artifact?.equipmentId ?? savedHero.equipment?.artifact ?? defaultHero.equipment.artifact
            }
          })
        }
      }
    }

    return loadedHeroes
  }

  /**
   * 保存当前存档（同时同步至当前槽位与自动存档槽位0）
   */
  saveCurrent(): boolean {
    const save = this.ensureSaveInitialized()
    const ok = this.saveToSlot(this.currentSlot, save)
    if (this.currentSlot !== 0) {
      this.saveToSlot(0, save)
    }
    return ok
  }

  /**
   * 获取存档摘要
   */
  getSlotSummary(slotId: number): { slotName: string; timestamp: string; heroCount: number; gold: number; completedLevels: number } | null {
    if (!this.hasSave(slotId)) return null

    const saveData = this.loadFromSlot(slotId)
    if (!saveData) return null

    return {
      slotName: slotId === 0 ? '自动存档' : `存档 ${slotId}`,
      timestamp: new Date(saveData.timestamp || Date.now()).toLocaleString(),
      heroCount: Array.isArray(saveData.heroes) ? saveData.heroes.filter(h => h && h.isUnlocked).length : 0,
      gold: saveData.inventory?.gold ?? 0,
      completedLevels: Array.isArray(saveData.levelProgress) ? saveData.levelProgress.filter(l => l && l.isCompleted).length : 0
    }
  }

  /**
   * 获取百战无尽最佳战绩
   */
  getEndlessRecord(): { highestWave: number; currentWave?: number; totalKills: number; bestDate: number } {
    const save = this.currentSave || this.loadFromSlot(1) || this.loadFromSlot(0)
    return save?.endlessRecord || { highestWave: 0, currentWave: 1, totalKills: 0, bestDate: 0 }
  }

  /**
   * 获取当前无尽进度波次（断点续战波次，默认为1）
   */
  getEndlessCurrentWave(): number {
    const record = this.getEndlessRecord()
    return Math.max(1, record.currentWave || record.highestWave || 1)
  }

  /**
   * 记录当前无尽波次进度
   */
  setEndlessCurrentWave(wave: number): void {
    let save = this.currentSave || this.loadFromSlot(1)
    if (!save) {
      save = this.createNewSave(1)
    }
    if (!save.endlessRecord) {
      save.endlessRecord = { highestWave: 0, currentWave: 1, totalKills: 0, bestDate: 0 }
    }
    save.endlessRecord.currentWave = Math.max(1, wave)
    if (wave > save.endlessRecord.highestWave) {
      save.endlessRecord.highestWave = wave
    }
    this.currentSave = save
    this.saveCurrent()
  }

  /**
   * 重置无尽模式进度（从第1波重新开局）
   */
  resetEndlessProgress(): void {
    let save = this.currentSave || this.loadFromSlot(1)
    if (!save) {
      save = this.createNewSave(1)
    }
    if (!save.endlessRecord) {
      save.endlessRecord = { highestWave: 0, currentWave: 1, totalKills: 0, bestDate: 0 }
    }
    save.endlessRecord.currentWave = 1
    this.currentSave = save
    this.saveCurrent()
  }

  /**
   * 获取指定古战场舆图的最高推进波次（含15波破关与百战无尽）
   */
  getMapHighestWave(levelId: string): number {
    const extractWave = (s: SaveData | null): number => {
      if (!s) return 0
      const fromEndlessMap = s.endlessRecord?.mapHighestWaves?.[levelId] ?? 0
      const lvlProg = s.levelProgress?.find(l => l && l.levelId === levelId)
      const fromLevelProg = lvlProg?.highestWave ?? (lvlProg?.isCompleted ? 15 : 0)
      return Math.max(fromEndlessMap, fromLevelProg)
    }

    let best = extractWave(this.currentSave)
    for (let slot = 0; slot <= 3; slot++) {
      try {
        const raw = this.getStorageItem(this.getSaveKey(slot))
        if (raw) {
          const parsed = JSON.parse(raw) as SaveData
          best = Math.max(best, extractWave(parsed))
        }
      } catch {
        // ignore parse errors
      }
    }
    return best
  }

  /**
   * 更新百战无尽战绩记录（支持记录对应古战场舆图的最高波次）
   * @param wave 本局突破波次
   * @param kills 本局击杀总数
   * @param levelId 可选：所属古战场舆图ID
   * @returns 是否打破历史纪录
   */
  updateEndlessRecord(wave: number, kills: number, levelId?: string): boolean {
    const save = this.ensureSaveInitialized()
    if (!save.endlessRecord) {
      save.endlessRecord = { highestWave: 0, currentWave: 1, totalKills: 0, bestDate: 0, mapHighestWaves: {} }
    }
    if (!save.endlessRecord.mapHighestWaves) {
      save.endlessRecord.mapHighestWaves = {}
    }

    // 更新当前波次进度
    save.endlessRecord.currentWave = Math.max(1, wave)

    if (levelId) {
      const prevMapBest = save.endlessRecord.mapHighestWaves[levelId] || 0
      if (wave > prevMapBest) {
        save.endlessRecord.mapHighestWaves[levelId] = wave
      }
      const lvlIdx = save.levelProgress.findIndex(l => l && l.levelId === levelId)
      if (lvlIdx >= 0) {
        save.levelProgress[lvlIdx].highestWave = Math.max(save.levelProgress[lvlIdx].highestWave || 0, wave)
        if (wave >= 15) {
          save.levelProgress[lvlIdx].isCompleted = true
        }
      } else if (wave >= 15) {
        save.levelProgress.push({
          levelId,
          isCompleted: true,
          starsAchieved: 3,
          highestWave: wave
        })
      }
    }

    let isNewRecord = false
    if (wave > save.endlessRecord.highestWave) {
      save.endlessRecord.highestWave = wave
      save.endlessRecord.totalKills = Math.max(save.endlessRecord.totalKills, kills)
      save.endlessRecord.bestDate = Date.now()
      isNewRecord = true
    }

    this.currentSave = save
    this.saveCurrent()
    return isNewRecord
  }
}