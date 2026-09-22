import { Equipment, Weapon, Artifact, Gem, Hero } from '@/types'
import { getWeapon, getArtifact } from '@/data/equipment'

/**
 * 装备实例（玩家拥有的装备）
 */
export interface EquipmentInstance {
  instanceId: string          // 唯一实例ID
  equipmentId: string         // 装备配置ID
  type: 'weapon' | 'artifact'
  rarity: string
  isEquipped: boolean         // 是否已装备
  equippedHeroId: string | null // 装备在哪个武将上
}

/**
 * 装备管理器
 * 管理玩家拥有的装备
 */
export class EquipmentManager {
  private ownedEquipment: Map<string, EquipmentInstance> = new Map()
  private ownedGems: Map<string, Gem> = new Map()
  private equipmentCounter: number = 0

  constructor() {
    // 初始化一些默认装备供测试
    this.initDefaultEquipment()
  }

  /**
   * 初始化默认装备
   */
  private initDefaultEquipment(): void {
    // 给玩家一些初始装备
    this.addEquipment('weapon_common_1')
    this.addEquipment('weapon_rare_1')
    this.addEquipment('artifact_common_1')
    this.addEquipment('artifact_epic_1')

    // 三国专属神兵宝物
    this.addEquipment('artifact_chitu')
    this.addEquipment('artifact_fangtian')
    this.addEquipment('artifact_dilu')
    this.addEquipment('artifact_qinglong')
    this.addEquipment('artifact_shemao')
    this.addEquipment('artifact_sherigong')
    this.addEquipment('artifact_sunzi')
    this.addEquipment('artifact_tongque')
    this.addEquipment('artifact_yuxi')

    // 给玩家一些初始宝石
    this.addGem('metal', 1)
    this.addGem('metal', 2)
    this.addGem('water', 1)
    this.addGem('fire', 2)
    this.addGem('earth', 1)
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    this.equipmentCounter++
    return `equip_${Date.now()}_${this.equipmentCounter}`
  }

  /**
   * 添加装备
   */
  addEquipment(equipmentId: string): EquipmentInstance | null {
    const weapon = getWeapon(equipmentId)
    const artifact = getArtifact(equipmentId)

    if (!weapon && !artifact) {
      console.warn(`装备不存在: ${equipmentId}`)
      return null
    }

    const type = weapon ? 'weapon' : 'artifact'
    const rarity = (weapon?.rarity || artifact?.rarity) || 'common'

    const instance: EquipmentInstance = {
      instanceId: this.generateId(),
      equipmentId,
      type,
      rarity,
      isEquipped: false,
      equippedHeroId: null
    }

    this.ownedEquipment.set(instance.instanceId, instance)
    return instance
  }

  /**
   * 获取所有拥有的装备
   */
  getOwnedEquipment(): EquipmentInstance[] {
    return Array.from(this.ownedEquipment.values())
  }

  /**
   * 获取未装备的装备
   */
  getUnequippedEquipment(): EquipmentInstance[] {
    return Array.from(this.ownedEquipment.values()).filter(e => !e.isEquipped)
  }

  /**
   * 获取指定类型的装备
   */
  getEquipmentByType(type: 'weapon' | 'artifact'): EquipmentInstance[] {
    return Array.from(this.ownedEquipment.values()).filter(e => e.type === type)
  }

  /**
   * 获取装备详情
   */
  getEquipmentDetail(instanceId: string): Equipment | undefined {
    const instance = this.ownedEquipment.get(instanceId)
    if (!instance) return undefined

    if (instance.type === 'weapon') {
      return getWeapon(instance.equipmentId)
    } else {
      return getArtifact(instance.equipmentId)
    }
  }

  /**
   * 获取装备实例
   */
  getEquipmentInstance(instanceId: string): EquipmentInstance | undefined {
    return this.ownedEquipment.get(instanceId)
  }

  /**
   * 检查装备是否可装备到指定武将
   */
  canEquipToHero(instanceId: string, heroId: string, heroName?: string): boolean {
    const instance = this.ownedEquipment.get(instanceId)
    if (!instance) return false
    const detail = this.getEquipmentDetail(instanceId)
    if (!detail) return false
    if (!detail.exclusiveHeroes || detail.exclusiveHeroes.length === 0) return true
    return detail.exclusiveHeroes.some(h => h === heroId || (heroName && h === heroName))
  }

  /**
   * 装备到武将（含专属限制校验）
   */
  equipToHero(instanceId: string, heroId: string, heroName?: string): boolean {
    const instance = this.ownedEquipment.get(instanceId)
    if (!instance || instance.isEquipped) {
      return false
    }

    // 检查专属武将限制
    if (!this.canEquipToHero(instanceId, heroId, heroName)) {
      console.warn(`专属限制：无法为武将 ${heroName || heroId} 穿戴此装备`)
      return false
    }

    // 先卸下同类型装备
    this.unequipFromHeroByType(heroId, instance.type)

    instance.isEquipped = true
    instance.equippedHeroId = heroId
    return true
  }

  /**
   * 从武将卸下装备
   */
  unequipFromHero(instanceId: string): boolean {
    const instance = this.ownedEquipment.get(instanceId)
    if (!instance || !instance.isEquipped) {
      return false
    }

    instance.isEquipped = false
    instance.equippedHeroId = null
    return true
  }

  /**
   * 卸下武将上指定类型的装备
   */
  private unequipFromHeroByType(heroId: string, type: 'weapon' | 'artifact'): void {
    for (const instance of this.ownedEquipment.values()) {
      if (instance.equippedHeroId === heroId && instance.type === type) {
        instance.isEquipped = false
        instance.equippedHeroId = null
      }
    }
  }

  /**
   * 获取武将已装备的装备
   */
  getHeroEquipment(heroId: string): { weapon: EquipmentInstance | null; artifact: EquipmentInstance | null } {
    const result = { weapon: null as EquipmentInstance | null, artifact: null as EquipmentInstance | null }

    for (const instance of this.ownedEquipment.values()) {
      if (instance.equippedHeroId === heroId) {
        if (instance.type === 'weapon') {
          result.weapon = instance
        } else {
          result.artifact = instance
        }
      }
    }

    return result
  }

  /**
   * 添加宝石
   */
  addGem(wuXing: string, level: number): Gem {
    const gem: Gem = {
      id: `gem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      wuXing: wuXing as any,
      level
    }
    this.ownedGems.set(gem.id, gem)
    return gem
  }

  /**
   * 获取所有宝石
   */
  getOwnedGems(): Gem[] {
    return Array.from(this.ownedGems.values())
  }

  /**
   * 按五行和等级获取宝石数量
   */
  getGemCountByWuXingAndLevel(wuXing: string, level: number): number {
    return Array.from(this.ownedGems.values())
      .filter(g => g.wuXing === wuXing && g.level === level)
      .length
  }

  /**
   * 获取指定五行和等级的宝石列表
   */
  getGemsByWuXingAndLevel(wuXing: string, level: number): Gem[] {
    return Array.from(this.ownedGems.values())
      .filter(g => g.wuXing === wuXing && g.level === level)
  }

  /**
   * 宝石合成（3个同级宝石合成1个高级宝石）
   * @param wuXing 五行属性
   * @param level 当前等级（合成前的等级）
   * @returns 合成后的新宝石，或null（合成失败）
   */
  synthesizeGems(wuXing: string, level: number): Gem | null {
    // 不能合成5级宝石（已经是最高级）
    if (level >= 5) {
      console.warn('5级宝石无法继续合成')
      return null
    }

    // 检查是否有足够的宝石（至少3个）
    const gems = this.getGemsByWuXingAndLevel(wuXing, level)
    if (gems.length < 3) {
      console.warn(`${wuXing}系${level}级宝石不足，需要至少3个`)
      return null
    }

    // 删除3个低级宝石
    for (let i = 0; i < 3; i++) {
      this.ownedGems.delete(gems[i].id)
    }

    // 创建1个高级宝石
    const newGem = this.addGem(wuXing, level + 1)

    console.log(`合成成功：3个${wuXing}系Lv.${level}宝石 → 1个${wuXing}系Lv.${level + 1}宝石`)
    return newGem
  }

  /**
   * 检查是否可以合成
   */
  canSynthesize(wuXing: string, level: number): boolean {
    return level < 5 && this.getGemCountByWuXingAndLevel(wuXing, level) >= 3
  }

  /**
   * 镶嵌宝石到神器
   */
  socketGemToArtifact(artifactInstanceId: string, gemId: string): boolean {
    const artifactInstance = this.ownedEquipment.get(artifactInstanceId)
    const gem = this.ownedGems.get(gemId)

    if (!artifactInstance || !gem) return false

    const artifactDetail = getArtifact(artifactInstance.equipmentId) as Artifact
    if (!artifactDetail) return false

    // 检查五行匹配（相生关系）
    if (artifactDetail.gemSocket.requiredWuXing !== gem.wuXing) {
      console.warn('宝石五行不匹配')
      return false
    }

    // 移除旧宝石
    if (artifactDetail.gemSocket.currentGem) {
      this.ownedGems.delete(artifactDetail.gemSocket.currentGem)
    }

    // 镶嵌新宝石
    artifactDetail.gemSocket.currentGem = gemId
    return true
  }

  /**
   * 重置
   */
  reset(): void {
    this.ownedEquipment.clear()
    this.ownedGems.clear()
    this.equipmentCounter = 0
    this.initDefaultEquipment()
  }
}