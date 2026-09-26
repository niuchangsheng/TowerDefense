import { SaveData, SAVE_KEY_PREFIX, SAVE_VERSION, SAVE_SLOT_COUNT, createDefaultSaveData } from '@/types'
import { createDefaultHeroes } from '@/data/heroes'
import { Hero, BattleResult } from '@/types'

/**
 * 存档管理器
 * 支持多存档槽位（0=自动存档，1-3=手动存档）
 */
export class SaveManager {
  private static instance: SaveManager
  private currentSlot: number = 1  // 当前使用的存档槽位（默认槽位1）
  private currentSave: SaveData | null = null

  private constructor() {}

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
   * 获取存档键名
   */
  private getSaveKey(slotId: number): string {
    return `${SAVE_KEY_PREFIX}${slotId}`
  }

  /**
   * 检查槽位是否有存档
   */
  hasSave(slotId: number): boolean {
    return localStorage.getItem(this.getSaveKey(slotId)) !== null
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
          const jsonStr = localStorage.getItem(this.getSaveKey(i))
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
   * 保存到指定槽位
   */
  saveToSlot(slotId: number, saveData: SaveData): boolean {
    try {
      saveData.timestamp = Date.now()
      saveData.slotId = slotId
      const jsonStr = JSON.stringify(saveData)
      localStorage.setItem(this.getSaveKey(slotId), jsonStr)
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
      const jsonStr = localStorage.getItem(this.getSaveKey(slotId))
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
      localStorage.removeItem(this.getSaveKey(slotId))
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
   * 获取当前存档
   */
  getCurrentSave(): SaveData | null {
    return this.currentSave
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
   * 自动存档（通关后调用）
   */
  autoSave(battleResult: BattleResult): boolean {
    // 槽位0是自动存档位
    let autoSaveData = this.loadFromSlot(0)

    if (!autoSaveData) {
      autoSaveData = createDefaultSaveData(0)
      this.initDefaultData(autoSaveData)
    }

    // 更新关卡进度
    if (battleResult.isVictory) {
      this.updateLevelProgressInSave(autoSaveData, battleResult.levelId, true, 3)

      // 添加奖励
      autoSaveData.inventory.gold += battleResult.rewards.gold || 0

      // 更新上场武将的经验（从当前存档的武将数据中更新）
      if (this.currentSave) {
        for (const savedHero of this.currentSave.heroes) {
          // 找到存档中的对应武将，更新其经验和等级
          const heroIndex = autoSaveData.heroes.findIndex(h => h.id === savedHero.id)
          if (heroIndex >= 0) {
            autoSaveData.heroes[heroIndex] = {
              ...autoSaveData.heroes[heroIndex],
              level: savedHero.level,
              experience: savedHero.experience,
              star: savedHero.star,
              isUnlocked: savedHero.isUnlocked,
              equipment: savedHero.equipment
            }
          }
        }
      }
    }

    return this.saveToSlot(0, autoSaveData)
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

    // 初始化默认装备
    saveData.inventory.equipment = [
      'weapon_common_1',
      'weapon_rare_1',
      'artifact_chitu',
      'artifact_qinglong'
    ]

    // 初始化金币
    saveData.inventory.gold = 1000
  }

  /**
   * 创建新存档
   */
  createNewSave(slotId: number): SaveData {
    const newSave = createDefaultSaveData(slotId)
    this.initDefaultData(newSave)
    this.saveToSlot(slotId, newSave)
    this.currentSlot = slotId
    this.currentSave = newSave
    return newSave
  }

  /**
   * 更新存档中的关卡进度
   */
  private updateLevelProgressInSave(saveData: SaveData, levelId: string, isCompleted: boolean, stars: number): void {
    const levelIndex = saveData.levelProgress.findIndex(l => l.levelId === levelId)

    if (levelIndex >= 0) {
      saveData.levelProgress[levelIndex] = {
        levelId,
        isCompleted,
        starsAchieved: Math.max(saveData.levelProgress[levelIndex].starsAchieved, stars)
      }
    } else {
      saveData.levelProgress.push({
        levelId,
        isCompleted,
        starsAchieved: stars
      })
    }
  }

  /**
   * 更新当前存档的关卡进度
   */
  updateLevelProgress(levelId: string, isCompleted: boolean, stars: number): void {
    if (!this.currentSave) return
    this.updateLevelProgressInSave(this.currentSave, levelId, isCompleted, stars)
  }

  /**
   * 加载武将数据（合并默认配置）
   */
  loadHeroes(): Map<string, Hero> {
    const defaultHeroes = createDefaultHeroes()
    const loadedHeroes = new Map<string, Hero>()

    // 先用默认配置
    for (const [id, hero] of defaultHeroes) {
      loadedHeroes.set(id, hero)
    }

    // 如果没有当前存档，返回默认
    if (!this.currentSave) {
      return loadedHeroes
    }

    // 用存档数据覆盖
    if (this.currentSave && Array.isArray(this.currentSave.heroes)) {
      for (const savedHero of this.currentSave.heroes) {
        if (!savedHero) continue
        const defaultHero = defaultHeroes.get(savedHero.id)
        if (defaultHero) {
          loadedHeroes.set(savedHero.id, {
            ...defaultHero,
            level: savedHero.level ?? defaultHero.level,
            star: savedHero.star ?? defaultHero.star,
            experience: savedHero.experience ?? defaultHero.experience,
            isUnlocked: savedHero.isUnlocked ?? defaultHero.isUnlocked,
            equipment: savedHero.equipment ?? defaultHero.equipment
          })
        }
      }
    }

    return loadedHeroes
  }

  /**
   * 保存当前存档
   */
  saveCurrent(): boolean {
    if (!this.currentSave) return false
    return this.saveToSlot(this.currentSlot, this.currentSave)
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
   * 更新百战无尽战绩记录
   * @param wave 本局突破波次
   * @param kills 本局击杀总数
   * @returns 是否打破历史纪录
   */
  updateEndlessRecord(wave: number, kills: number): boolean {
    let save = this.currentSave || this.loadFromSlot(1)
    if (!save) {
      save = this.createNewSave(1)
    }
    if (!save.endlessRecord) {
      save.endlessRecord = { highestWave: 0, currentWave: 1, totalKills: 0, bestDate: 0 }
    }

    // 更新当前波次进度
    save.endlessRecord.currentWave = Math.max(1, wave)

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