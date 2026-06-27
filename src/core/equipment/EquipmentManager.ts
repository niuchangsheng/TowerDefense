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
   * 装备到武将
   */
  equipToHero(instanceId: string, heroId: string): boolean {
    const instance = this.ownedEquipment.get(instanceId)
    if (!instance || instance.isEquipped) {
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