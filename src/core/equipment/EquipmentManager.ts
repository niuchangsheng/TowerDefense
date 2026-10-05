import { Equipment, Weapon, Artifact, Gem, GemStatType, Hero, WuXing, WuXingNames, WuXingGenerate, getAllowedGemWuXing, ResonanceType, HeroResonanceInfo } from '@/types'
import { getWeapon, getArtifact, rollGemAffixes } from '@/data/equipment'

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

    const resolveGem = (gemRef?: string | Gem | null): Gem | null => {
      if (!gemRef) return null
      if (typeof gemRef === 'string') return this.ownedGems.get(gemRef) || null
      return gemRef
    }

    const gem = resolveGem(artifact.gemSocket?.currentGem)
    const sameGem = resolveGem(artifact.gemSocket?.sameGem) || (gem && gem.wuXing === artifact.gemSocket?.requiredWuXing ? gem : null)
    const generatingGem = resolveGem(artifact.gemSocket?.generatingGem) || (gem && WuXingGenerate[gem.wuXing] === artifact.gemSocket?.requiredWuXing ? gem : null)

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
    const sameGemLevel = sameGem ? sameGem.level : 0
    const generatingGemLevel = generatingGem ? generatingGem.level : 0
    const hasDualLv5Ultimate = isExclusive && sameGemLevel === 5 && generatingGemLevel === 5

    return {
      isExclusive,
      hasResonance,
      resonanceType,
      gemLevel: gem ? gem.level : Math.max(sameGemLevel, generatingGemLevel),
      sameGemLevel,
      generatingGemLevel,
      hasDualLv5Ultimate,
      artifact,
      gem,
      sameGem,
      generatingGem,
      resonanceConfig: artifact.exclusiveResonance
    }
  }

  /**
   * 计算武将所佩戴神器镶嵌宝石提供的五大基础属性增益
   */
  getHeroGemStatBonuses(heroId: string): {
    attackPercent: number
    attackRangeFlat: number
    attackSpeedPercent: number
    critRateBonus: number
    critDamageBonus: number
  } {
    const bonuses = {
      attackPercent: 0,
      attackRangeFlat: 0,
      attackSpeedPercent: 0,
      critRateBonus: 0,
      critDamageBonus: 0
    }
    const equip = this.getHeroEquipment(heroId)
    if (!equip.artifact) return bonuses

    const artifact = this.getEquipmentDetail(equip.artifact.instanceId) as Artifact
    if (!artifact || !artifact.gemSocket) return bonuses

    const gemIds = new Set<string>()
    if (typeof artifact.gemSocket.currentGem === 'string') gemIds.add(artifact.gemSocket.currentGem)
    if (typeof artifact.gemSocket.sameGem === 'string') gemIds.add(artifact.gemSocket.sameGem)
    if (typeof artifact.gemSocket.generatingGem === 'string') gemIds.add(artifact.gemSocket.generatingGem)

    for (const gid of gemIds) {
      const gem = this.ownedGems.get(gid)
      if (!gem || !gem.affixes) continue
      for (const affix of gem.affixes) {
        switch (affix.stat) {
          case 'attack':
            bonuses.attackPercent += affix.value
            break
          case 'attackRange':
            bonuses.attackRangeFlat += affix.value
            break
          case 'attackSpeed':
            bonuses.attackSpeedPercent += affix.value
            break
          case 'critRate':
            bonuses.critRateBonus += affix.value
            break
          case 'critDamage':
            bonuses.critDamageBonus += affix.value
            break
        }
      }
    }

    return bonuses
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
   * 添加宝石（自动生成 2 条随机五维基础属性词条，支持无尽保底分位与三合一主石词条继承）
   */
  addGem(
    wuXing: string,
    level: number,
    minRollPercentile: number = 0,
    inheritedStats?: GemStatType[]
  ): Gem {
    const gem: Gem = {
      id: `gem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      wuXing: wuXing as WuXing,
      level,
      affixes: rollGemAffixes(level, minRollPercentile, inheritedStats)
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
   * 宝石三合一升阶（支持指定【主石】mainGemId 100% 继承其 2 条词条属性类型）
   * @param wuXing 五行属性
   * @param level 当前等级（合成前的等级）
   * @param mainGemId 可选指定的主石ID（若未指定则默认取第1颗为主石，100%继承其词条类型）
   * @returns 合成后的新宝石，或null（合成失败）
   */
  synthesizeGems(wuXing: string, level: number, mainGemId?: string): Gem | null {
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

    // 确定主石并提取其 2 条词条类型以 100% 定向继承
    const mainGem = (mainGemId ? gems.find(g => g.id === mainGemId) : undefined) || gems[0]
    const inheritedStats = mainGem.affixes?.map(a => a.stat)

    // 挑选需要消耗的3颗宝石（包含主石）
    const toConsume: Gem[] = [mainGem]
    for (const g of gems) {
      if (toConsume.length >= 3) break
      if (g.id !== mainGem.id) {
        toConsume.push(g)
      }
    }

    for (const g of toConsume) {
      this.ownedGems.delete(g.id)
    }

    // 创建1个高级宝石，100% 继承主石的 2 条词条类型并在新等级 [Min, Max] 区间重新 Roll 值
    const newGem = this.addGem(wuXing, level + 1, 0, inheritedStats)

    console.log(`合成成功：3个${wuXing}系Lv.${level}宝石 → 1个${wuXing}系Lv.${level + 1}宝石（主石词条100%继承）`)
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
   * 镶嵌宝石到神器（支持 2★ 同源槽 same 与 4★ 相生槽 generating，兼容单槽 currentGem）
   */
  socketGemToArtifact(artifactInstanceId: string, gemId: string): boolean {
    const artifactInstance = this.ownedEquipment.get(artifactInstanceId)
    const gem = this.ownedGems.get(gemId)

    if (!artifactInstance || !gem) return false

    const artifactDetail = getArtifact(artifactInstance.equipmentId) as Artifact
    if (!artifactDetail || !artifactDetail.gemSocket) return false

    // 检查五行匹配（支持同源与相生五行）
    const allowed = artifactDetail.gemSocket.allowedWuXings || getAllowedGemWuXing(artifactDetail.gemSocket.requiredWuXing).all
    if (!allowed.includes(gem.wuXing)) {
      console.warn(`宝石五行不匹配: 神器需[${allowed.map(w => WuXingNames[w]).join('/')}]系宝石, 当前为[${WuXingNames[gem.wuXing]}]`)
      return false
    }

    // 同步记录到同源槽或相生槽以及 currentGem
    artifactDetail.gemSocket.currentGem = gemId
    if (gem.wuXing === artifactDetail.gemSocket.requiredWuXing) {
      artifactDetail.gemSocket.sameGem = gemId
    } else if (WuXingGenerate[gem.wuXing] === artifactDetail.gemSocket.requiredWuXing) {
      artifactDetail.gemSocket.generatingGem = gemId
    }
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
    artifactDetail.gemSocket.sameGem = null
    artifactDetail.gemSocket.generatingGem = null
    return true
  }

  // =========================================================
  // 蒲元铸剑坊（神兵宿命主材与 100% 定向锻造 · 一生仅需铸造 1 把）
  // =========================================================

  private divineMaterials: Map<string, number> = new Map([
    ['mat_qinglong_scale', 1],
    ['mat_bailian_iron', 1],
    ['mat_xuanwu_jade', 1],
    ['mat_xiliang_gold', 1],
    ['mat_chitu_crystal', 1]
  ])

  private spiritDust: number = 60

  public static readonly DIVINE_FORGE_RECIPES: ReadonlyArray<{
    materialId: string
    materialName: string
    bossName: string
    artifactId: string
    artifactName: string
    heroId: string
    heroName: string
    wuXing: WuXing
    goldCost: number
  }> = [
    {
      materialId: 'mat_qinglong_scale',
      materialName: '青龙逆鳞',
      bossName: '天公将军·张角',
      artifactId: 'artifact_qinglong',
      artifactName: '青龙偃月刀',
      heroId: 'hero_guanyu',
      heroName: '关羽',
      wuXing: 'wood',
      goldCost: 800
    },
    {
      materialId: 'mat_bailian_iron',
      materialName: '百炼陨铁',
      bossName: '天人铁壁·曹仁',
      artifactId: 'artifact_sherigong',
      artifactName: '射日万石弓',
      heroId: 'hero_huangzhong',
      heroName: '黄忠',
      wuXing: 'fire',
      goldCost: 800
    },
    {
      materialId: 'mat_xuanwu_jade',
      materialName: '玄武寒玉',
      bossName: '威震逍遥·张辽',
      artifactId: 'artifact_shemao',
      artifactName: '丈八蛇矛',
      heroId: 'hero_zhangfei',
      heroName: '张飞',
      wuXing: 'earth',
      goldCost: 800
    },
    {
      materialId: 'mat_xiliang_gold',
      materialName: '西凉精金',
      bossName: '暴虐魔王·董卓',
      artifactId: 'artifact_zhanjin',
      artifactName: '虎头湛金枪',
      heroId: 'hero_machao',
      heroName: '马超',
      wuXing: 'metal',
      goldCost: 800
    },
    {
      materialId: 'mat_chitu_crystal',
      materialName: '赤兔火晶',
      bossName: '无双战神·吕布',
      artifactId: 'artifact_longdan',
      artifactName: '龙胆亮银枪',
      heroId: 'hero_zhaoyun',
      heroName: '赵云',
      wuXing: 'water',
      goldCost: 800
    }
  ]

  public getDivineMaterialCount(materialId: string): number {
    return this.divineMaterials.get(materialId) || 0
  }

  public addDivineMaterial(materialId: string, count: number = 1): void {
    const cur = this.getDivineMaterialCount(materialId)
    this.divineMaterials.set(materialId, cur + count)
  }

  public hasOwnedEquipmentId(equipmentId: string): boolean {
    for (const inst of this.ownedEquipment.values()) {
      if (inst.equipmentId === equipmentId) return true
    }
    return false
  }

  /**
   * 蒲元铸剑坊：消耗 1 个统帅宿命主材，100% 定向锻造对应五虎本命神兵（一生仅需铸造 1 把）
   */
  public forgeExclusiveArtifact(materialId: string): {
    success: boolean
    alreadyOwned?: boolean
    instance?: EquipmentInstance
    message: string
  } {
    const recipe = EquipmentManager.DIVINE_FORGE_RECIPES.find(r => r.materialId === materialId)
    if (!recipe) {
      return { success: false, message: '未知的神兵锻造图谱' }
    }
    if (this.hasOwnedEquipmentId(recipe.artifactId)) {
      return {
        success: false,
        alreadyOwned: true,
        message: `《${recipe.artifactName}》已认主铸成（神兵一生仅需铸造 1 把）`
      }
    }
    const count = this.getDivineMaterialCount(materialId)
    if (count < 1) {
      return {
        success: false,
        message: `缺少宿命主材【${recipe.materialName}】（击败【${recipe.bossName}】必掉）`
      }
    }

    this.divineMaterials.set(materialId, count - 1)
    const inst = this.addEquipment(recipe.artifactId)
    if (inst) {
      this.equipToHero(inst.instanceId, recipe.heroId, recipe.heroName)
      return {
        success: true,
        instance: inst,
        message: `蒲元神工！成功铸造《${recipe.artifactName}》并认主【${recipe.heroName}】！`
      }
    }
    return { success: false, message: '铸造失败' }
  }

  // =========================================================
  // 灵砂保底淬炼（分解溢出宝石 -> 五行灵砂 -> 保底不降级重随词条）
  // =========================================================

  public getSpiritDust(): number {
    return this.spiritDust
  }

  public addSpiritDust(amount: number): void {
    this.spiritDust = Math.max(0, this.spiritDust + amount)
  }

  /**
   * 分解未镶嵌的溢出宝石为【五行灵砂】（按宝石等级返还 level * 15 灵砂）
   */
  public salvageGemToDust(gemId: string): { success: boolean; dustGained: number; message: string } {
    const gem = this.ownedGems.get(gemId)
    if (!gem) {
      return { success: false, dustGained: 0, message: '未找到该宝石' }
    }
    // 检查是否已镶嵌在神器上
    for (const inst of this.ownedEquipment.values()) {
      if (inst.type !== 'artifact') continue
      const art = getArtifact(inst.equipmentId)
      if (
        art?.gemSocket?.currentGem === gemId ||
        art?.gemSocket?.sameGem === gemId ||
        art?.gemSocket?.generatingGem === gemId
      ) {
        return { success: false, dustGained: 0, message: '该宝石正镶嵌于神兵之上，请先卸下' }
      }
    }

    const dustGained = gem.level * 15
    this.ownedGems.delete(gemId)
    this.addSpiritDust(dustGained)
    return {
      success: true,
      dustGained,
      message: `分解 Lv.${gem.level} ${WuXingNames[gem.wuXing]}灵石，获得【五行灵砂】+${dustGained}`
    }
  }

  /**
   * 消耗 20 点【五行灵砂】为指定宝石的第 affixIndex 条词条生成一条新候选词条（支持保留原词条或替换为新词条，100% 不降级）
   */
  public previewReforgeGemAffix(
    gemId: string,
    affixIndex: 0 | 1 = 0
  ): {
    success: boolean
    oldAffix?: NonNullable<Gem['affixes']>[number]
    newAffix?: NonNullable<Gem['affixes']>[number]
    message: string
  } {
    const gem = this.ownedGems.get(gemId)
    if (!gem || !gem.affixes || !gem.affixes[affixIndex]) {
      return { success: false, message: '未找到可淬炼的宝石词条' }
    }
    const cost = 20
    if (this.spiritDust < cost) {
      return { success: false, message: `五行灵砂不足（需 ${cost} 灵砂，当前 ${this.spiritDust}）` }
    }

    this.spiritDust -= cost
    const oldAffix = { ...gem.affixes[affixIndex] }
    const otherStat = gem.affixes[affixIndex === 0 ? 1 : 0]?.stat
    // 生成一条不与另一条词条重复的新候选词条（保底分位 0.35 提高淬炼品质）
    const rolled = rollGemAffixes(gem.level, 0.35)
    const candidate = rolled.find(a => a.stat !== otherStat) || rolled[0]

    return {
      success: true,
      oldAffix,
      newAffix: candidate,
      message: `消耗 ${cost} 灵砂淬炼完成！可选择【保留原词条】或【替换为新词条】`
    }
  }

  /**
   * 玩家在淬炼对比中选择【替换为新词条】（若选保留原词条则无需调用，绝不负向降级）
   */
  public applyReforgedGemAffix(
    gemId: string,
    affixIndex: 0 | 1,
    newAffix: NonNullable<Gem['affixes']>[number]
  ): boolean {
    const gem = this.ownedGems.get(gemId)
    if (!gem || !gem.affixes || !gem.affixes[affixIndex]) return false
    gem.affixes[affixIndex] = { ...newAffix }
    return true
  }

  /**
   * 重置
   */
  reset(): void {
    this.ownedEquipment.clear()
    this.ownedGems.clear()
    this.equipmentCounter = 0
    this.spiritDust = 60
    this.initDefaultEquipment()
  }
}

export const DIVINE_FORGE_RECIPES = EquipmentManager.DIVINE_FORGE_RECIPES