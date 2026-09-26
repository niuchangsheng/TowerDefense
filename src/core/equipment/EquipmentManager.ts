import { Equipment, Weapon, Artifact, Gem, Hero, WuXing, WuXingNames, WuXingGenerate, getAllowedGemWuXing, ResonanceType, HeroResonanceInfo } from '@/types'
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
  private static instance: EquipmentManager | null = null

  public static getInstance(): EquipmentManager {
    if (!this.instance) {
      this.instance = new EquipmentManager()
    }
    return this.instance
  }

  private ownedEquipment: Map<string, EquipmentInstance> = new Map()
  private ownedGems: Map<string, Gem> = new Map()
  private equipmentCounter: number = 0

  constructor() {
    // 初始化一些默认装备供测试
    this.initDefaultEquipment()
  }

  /**
   * 初始化默认装备（五虎上将本命神兵全员齐备）
   */
  private initDefaultEquipment(): void {
    // 给玩家一些初始装备
    this.addEquipment('weapon_common_1')
    this.addEquipment('weapon_rare_1')

    // 稀有通用神器
    const jade = this.addEquipment('artifact_rare_1')
    const metalSeal = this.addEquipment('artifact_rare_metal')

    // 三国专属神兵宝物
    this.addEquipment('artifact_chitu')
    this.addEquipment('artifact_fangtian')
    this.addEquipment('artifact_dilu')
    const qinglong = this.addEquipment('artifact_qinglong')
    const shemao = this.addEquipment('artifact_shemao')
    const longdan = this.addEquipment('artifact_longdan')
    const sherigong = this.addEquipment('artifact_sherigong')
    const zhanjin = this.addEquipment('artifact_zhanjin')
    this.addEquipment('artifact_sunzi')
    this.addEquipment('artifact_tongque')
    this.addEquipment('artifact_yuxi')

    // 给玩家初始宝石（包含5级神品供体验各系攻击特效）
    this.addGem('metal', 1)
    this.addGem('metal', 2)
    const gemMetal5 = this.addGem('metal', 5) // 白虎神髓 (金)
    this.addGem('wood', 1)
    const gemWood5 = this.addGem('wood', 5)  // 青龙圣珠 (木)
    this.addGem('water', 1)
    const gemWater5 = this.addGem('water', 5) // 玄武神珠 (水)
    this.addGem('fire', 2)
    const gemFire5 = this.addGem('fire', 5)  // 朱雀神髓 (火)
    this.addGem('earth', 1)
    const gemEarth5 = this.addGem('earth', 5) // 麒麟圣玉 (土)

    // 预装五虎上将本命神兵与镶嵌5级神品宝石（开局即刻体验专属隐藏奥义与五行相生）：
    // 1. 关羽：青龙偃月刀 + 木系5级【青龙圣珠·同源木】
    if (qinglong && gemWood5) {
      this.socketGemToArtifact(qinglong.instanceId, gemWood5.id)
      this.equipToHero(qinglong.instanceId, 'hero_guanyu', '关羽')
    }
    // 2. 张飞：丈八蛇矛 + 土系5级【麒麟圣玉·同源土】
    if (shemao && gemEarth5) {
      this.socketGemToArtifact(shemao.instanceId, gemEarth5.id)
      this.equipToHero(shemao.instanceId, 'hero_zhangfei', '张飞')
    }
    // 3. 赵云：龙胆亮银枪 + 水系5级【玄武神珠·同源水】
    if (longdan && gemWater5) {
      this.socketGemToArtifact(longdan.instanceId, gemWater5.id)
      this.equipToHero(longdan.instanceId, 'hero_zhaoyun', '赵云')
    }
    // 4. 黄忠：宝雕射日弓 + 火系5级【朱雀神髓·同源火】
    if (sherigong && gemFire5) {
      this.socketGemToArtifact(sherigong.instanceId, gemFire5.id)
      this.equipToHero(sherigong.instanceId, 'hero_huangzhong', '黄忠')
    }
    // 5. 马超：虎头湛金枪 + 金系5级【白虎神髓·同源金】
    if (zhanjin && gemMetal5) {
      this.socketGemToArtifact(zhanjin.instanceId, gemMetal5.id)
      this.equipToHero(zhanjin.instanceId, 'hero_machao', '马超')
    }

    // 6. 通用神兵
    if (metalSeal) {
      // 白金符印可供自由测试
    }
    if (jade) {
      // 玄黄玉璧可供自由测试
    }
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
   * 检查装备是否可装备到指定武将（非专属武将亦可装备，获得白板基础属性）
   */
  canEquipToHero(instanceId: string, heroId: string, heroName?: string): boolean {
    const instance = this.ownedEquipment.get(instanceId)
    if (!instance) return false
    const detail = this.getEquipmentDetail(instanceId)
    return Boolean(detail)
  }

  /**
   * 判定装备是否为指定武将的专属神兵
   */
  isExclusiveForHero(instanceId: string, heroId: string, heroName?: string): boolean {
    const instance = this.ownedEquipment.get(instanceId)
    if (!instance) return false
    const detail = this.getEquipmentDetail(instanceId)
    if (!detail || !detail.exclusiveHeroes || detail.exclusiveHeroes.length === 0) return false
    return detail.exclusiveHeroes.some(h => h === heroId || (heroName && h === heroName))
  }

  /**
   * 装备到武将（非专属武将亦可自由佩戴获取白板属性，专属武将方可觉醒隐藏绝技）
   */
  equipToHero(instanceId: string, heroId: string, heroName?: string): boolean {
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
   * 获取武将当前装备的神器五行相生与专属器灵共鸣状态
   */
  getHeroResonance(heroId: string, heroName?: string): HeroResonanceInfo {
    const equip = this.getHeroEquipment(heroId)
    if (!equip.artifact) {
      return {
        isExclusive: false,
        hasResonance: false,
        resonanceType: 'none',
        gemLevel: 0,
        artifact: null,
        gem: null
      }
    }

    const artifact = this.getEquipmentDetail(equip.artifact.instanceId) as Artifact
    if (!artifact || artifact.type !== 'artifact') {
      return {
        isExclusive: false,
        hasResonance: false,
        resonanceType: 'none',
        gemLevel: 0,
        artifact: null,
        gem: null
      }
    }

    const isExclusive = this.isExclusiveForHero(equip.artifact.instanceId, heroId, heroName)

    let gem: Gem | null = null
    if (artifact.gemSocket?.currentGem) {
      if (typeof artifact.gemSocket.currentGem === 'string') {
        gem = this.ownedGems.get(artifact.gemSocket.currentGem) || null
      } else {
        gem = artifact.gemSocket.currentGem as Gem
      }
    }

    let resonanceType: ResonanceType = 'none'
    if (gem && artifact.gemSocket?.requiredWuXing) {
      const baseWuXing = artifact.gemSocket.requiredWuXing
      if (gem.wuXing === baseWuXing) {
        // 同源共鸣（同五行）
        resonanceType = 'same'
      } else if (WuXingGenerate[gem.wuXing] === baseWuXing) {
        // 相生滋养（生我者，如水生木）
        resonanceType = 'generating'
      }
    }

    const hasResonance = isExclusive && resonanceType !== 'none'

    return {
      isExclusive,
      hasResonance,
      resonanceType,
      gemLevel: gem ? gem.level : 0,
      artifact,
      gem,
      resonanceConfig: artifact.exclusiveResonance
    }
  }

  /**
   * 获取武将当前装备的神器上镶嵌的5级宝石（若有）
   */
  getHeroLevel5Gem(heroId: string): Gem | null {
    const equip = this.getHeroEquipment(heroId)
    if (equip.artifact) {
      const detail = this.getEquipmentDetail(equip.artifact.instanceId) as Artifact
      if (detail && detail.gemSocket && detail.gemSocket.currentGem) {
        let gem: Gem | undefined = undefined
        if (typeof detail.gemSocket.currentGem === 'string') {
          gem = this.ownedGems.get(detail.gemSocket.currentGem)
        } else {
          gem = detail.gemSocket.currentGem as Gem
        }
        if (gem && gem.level === 5) {
          return gem
        }
      }
    }
    return null
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
   * 根据ID获取宝石
   */
  getGem(gemId: string): Gem | undefined {
    return this.ownedGems.get(gemId)
  }

  /**
   * 镶嵌宝石到神器
   */
  socketGemToArtifact(artifactInstanceId: string, gemId: string): boolean {
    const artifactInstance = this.ownedEquipment.get(artifactInstanceId)
    const gem = this.ownedGems.get(gemId)

    if (!artifactInstance || !gem) return false

    const artifactDetail = getArtifact(artifactInstance.equipmentId) as Artifact
    if (!artifactDetail || !artifactDetail.gemSocket) return false

    // 检查五行匹配
    if (artifactDetail.gemSocket.requiredWuXing !== gem.wuXing) {
      console.warn(`宝石五行不匹配: 神器需求[${artifactDetail.gemSocket.requiredWuXing}], 当前宝石[${gem.wuXing}]`)
      return false
    }

    // 镶嵌新宝石（旧宝石保留在拥有列表中）
    artifactDetail.gemSocket.currentGem = gemId
    return true
  }

  /**
   * 从神器卸下宝石
   */
  unsocketGemFromArtifact(artifactInstanceId: string): boolean {
    const artifactInstance = this.ownedEquipment.get(artifactInstanceId)
    if (!artifactInstance) return false

    const artifactDetail = getArtifact(artifactInstance.equipmentId) as Artifact
    if (!artifactDetail || !artifactDetail.gemSocket) return false

    artifactDetail.gemSocket.currentGem = null
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