import { Equipment, Weapon, Artifact, Gem, GemAffix, GemStatType, Hero, WuXing, WuXingNames, WuXingGenerate, getAllowedGemWuXing, ResonanceType, HeroResonanceInfo, SavedEquipmentInstance, SavedArtifactSocketState } from '@/types'
import { getWeapon, getArtifact, rollGemAffixes, getAffixPercentile } from '@/data/equipment'

/**
 * 神兵五大基础属性洗练区间（严格对应我方五大基础属性：攻击力、攻击速度、攻击范围、暴击几率、暴击伤害）
 */
export const ARTIFACT_STAT_RANGES: Record<GemStatType, { min: number; max: number }> = {
  attack: { min: 0.04, max: 0.12 },
  attackSpeed: { min: 0.04, max: 0.12 },
  attackRange: { min: 0.04, max: 0.12 },
  critRate: { min: 0.03, max: 0.10 },
  critDamage: { min: 0.08, max: 0.24 }
}

export const ARTIFACT_STAT_ORDER: readonly GemStatType[] = [
  'attack',
  'attackSpeed',
  'attackRange',
  'critRate',
  'critDamage'
]

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
  statAffixes?: GemAffix[]    // 神兵默认自带的 5 条基础属性词条（可消耗玄铁洗练）
}

/**
 * 装备管理器
 * 管理玩家拥有的神兵宝甲、通用制式兵器与五行灵石
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
  private isSuppressingSave: number = 0
  private onChangeCallback?: () => void

  constructor() {
    this.isSuppressingSave++
    try {
      this.initDefaultEquipment()
    } finally {
      this.isSuppressingSave--
    }
  }

  /**
   * 注册状态变更回调（由 SaveManager 绑定，每次装备/镶嵌/洗练/合成/分解/锻造自动触发存档）
   */
  public setOnChangeCallback(callback?: () => void): void {
    this.onChangeCallback = callback
  }

  /**
   * 通知状态变更以触发即时存档
   */
  private notifyStateChanged(): void {
    if (this.isSuppressingSave > 0) return
    if (this.onChangeCallback) {
      this.onChangeCallback()
    }
  }

  /**
   * 初始化默认装备（五虎上将本命神兵全员齐备 + 通用制式过渡兵器 + 五行灵石）
   */
  private initDefaultEquipment(): void {
    // 1. 通用制式兵器（前期过渡 · 可随时熔炼为【百炼玄铁】）
    this.addEquipment('weapon_common_1') // 百炼环首刀
    this.addEquipment('weapon_common_2') // 硬木强弓
    this.addEquipment('weapon_rare_1')   // 精铁长枪

    // 2. 五虎上将专属本命神兵（一生仅需铸造 1 把）
    const qinglong = this.addEquipment('artifact_qinglong')   // 关羽·青龙偃月刀(木)
    const shemao = this.addEquipment('artifact_shemao')       // 张飞·丈八蛇矛(土)
    const longdan = this.addEquipment('artifact_longdan')     // 赵云·龙胆亮银枪(水)
    const sherigong = this.addEquipment('artifact_sherigong') // 黄忠·宝雕射日弓(火)
    const zhanjin = this.addEquipment('artifact_zhanjin')     // 马超·虎头湛金枪(金)

    // 3. 初始五行灵石（包含满级神品供体验双槽三才共鸣与终极大招，以及多颗同级原石供体验三合一主石继承）
    // 金系灵石（3颗Lv.1供体验三合一合成）
    this.addGem('metal', 1, 0.5, ['attack', 'critDamage'])
    this.addGem('metal', 1, 0.1, ['attackRange', 'critRate'])
    this.addGem('metal', 1, 0.2, ['attackSpeed', 'attack'])
    this.addGem('metal', 3, 0.4, ['attack', 'critRate'])
    const gemMetal5 = this.addGem('metal', 5, 0.65, ['attack', 'critDamage']) // 白虎神髓 (金·马超同源)
    this.addGem('metal', 5, 0.55, ['attackSpeed', 'critRate'])               // 白虎神髓 (金·供赵云相生槽体验)

    // 木系灵石（3颗Lv.1供体验三合一合成）
    this.addGem('wood', 1, 0.6, ['attack', 'attack'])
    this.addGem('wood', 1, 0.2, ['attackRange', 'attackSpeed'])
    this.addGem('wood', 1, 0.1, ['critRate', 'attackRange'])
    this.addGem('wood', 3, 0.45, ['attack', 'attackRange'])
    const gemWood5 = this.addGem('wood', 5, 0.75, ['attack', 'critRate'])    // 青龙圣珠 (木·关羽同源)
    this.addGem('wood', 5, 0.50, ['attack', 'attackRange'])                  // 青龙圣珠 (木·供黄忠相生槽体验)

    // 水系灵石
    this.addGem('water', 1, 0.3, ['attackSpeed', 'critRate'])
    this.addGem('water', 2, 0.4, ['attackSpeed', 'attack'])
    this.addGem('water', 3, 0.5, ['attackSpeed', 'critDamage'])
    const gemWater5 = this.addGem('water', 5, 0.70, ['attackSpeed', 'critRate']) // 玄武神珠 (水·赵云同源)
    const gemWater5Gen = this.addGem('water', 5, 0.60, ['attack', 'attackSpeed']) // 玄武神珠 (水·关羽相生水生木)

    // 火系灵石
    this.addGem('fire', 1, 0.35, ['attack', 'critDamage'])
    this.addGem('fire', 2, 0.45, ['attack', 'attackRange'])
    this.addGem('fire', 3, 0.50, ['critRate', 'critDamage'])
    const gemFire5 = this.addGem('fire', 5, 0.70, ['attack', 'critDamage'])  // 朱雀神髓 (火·黄忠同源)
    this.addGem('fire', 5, 0.55, ['attack', 'critRate'])                     // 朱雀神髓 (火·供张飞相生槽体验)

    // 土系灵石
    this.addGem('earth', 1, 0.3, ['attack', 'critDamage'])
    this.addGem('earth', 2, 0.4, ['critRate', 'critDamage'])
    this.addGem('earth', 3, 0.5, ['attack', 'critDamage'])
    const gemEarth5 = this.addGem('earth', 5, 0.68, ['attack', 'critDamage']) // 麒麟圣玉 (土·张飞同源)
    this.addGem('earth', 5, 0.52, ['attack', 'critRate'])                     // 麒麟圣玉 (土·供马超相生槽体验)

    // 5. 预装五虎上将本命神兵：
    // (1) 关羽：青龙偃月刀 + 同源槽 Lv.5【青龙圣珠(木)】+ 相生槽 Lv.5【玄武神珠(水)】（开局直接呈现第⑥阶双Lv.5终极大招觉醒状态！）
    if (qinglong && gemWood5 && gemWater5Gen) {
      this.socketGemToArtifact(qinglong.instanceId, gemWater5Gen.id)
      this.socketGemToArtifact(qinglong.instanceId, gemWood5.id)
      this.equipToHero(qinglong.instanceId, 'hero_guanyu', '关羽')
    }
    // (2) 张飞：丈八蛇矛 + 同源槽 Lv.5【麒麟圣玉(土)】
    if (shemao && gemEarth5) {
      this.socketGemToArtifact(shemao.instanceId, gemEarth5.id)
      this.equipToHero(shemao.instanceId, 'hero_zhangfei', '张飞')
    }
    // (3) 赵云：龙胆亮银枪 + 同源槽 Lv.5【玄武神珠(水)】
    if (longdan && gemWater5) {
      this.socketGemToArtifact(longdan.instanceId, gemWater5.id)
      this.equipToHero(longdan.instanceId, 'hero_zhaoyun', '赵云')
    }
    // (4) 黄忠：宝雕射日弓 + 同源槽 Lv.5【朱雀神髓(火)】
    if (sherigong && gemFire5) {
      this.socketGemToArtifact(sherigong.instanceId, gemFire5.id)
      this.equipToHero(sherigong.instanceId, 'hero_huangzhong', '黄忠')
    }
    // (5) 马超：虎头湛金枪 + 同源槽 Lv.5【白虎神髓(金)】
    if (zhanjin && gemMetal5) {
      this.socketGemToArtifact(zhanjin.instanceId, gemMetal5.id)
      this.equipToHero(zhanjin.instanceId, 'hero_machao', '马超')
    }
  }

  /**
   * 生成神兵默认的 5 条五维基础属性词条（攻击力、攻击速度、攻击范围、暴击几率、暴击伤害）
   */
  public createDefaultArtifactStatAffixes(minPercentile = 0.35, maxPercentile = 0.72): GemAffix[] {
    return ARTIFACT_STAT_ORDER.map(stat => {
      const range = ARTIFACT_STAT_RANGES[stat]
      const pct = minPercentile + Math.random() * Math.max(0.05, maxPercentile - minPercentile)
      const rawVal = range.min + (range.max - range.min) * pct
      const value = Math.round(rawVal * 1000) / 1000
      return {
        stat,
        value,
        min: range.min,
        max: range.max,
        isPercentage: true
      }
    })
  }

  /**
   * 确保神兵实例拥有完整的 5 条基础属性词条
   */
  public ensureArtifactStatAffixes(instance: EquipmentInstance): GemAffix[] {
    if (!instance.statAffixes || instance.statAffixes.length < 5) {
      instance.statAffixes = this.createDefaultArtifactStatAffixes()
    }
    return instance.statAffixes
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
      equippedHeroId: null,
      statAffixes: type === 'artifact' ? this.createDefaultArtifactStatAffixes() : undefined
    }

    this.ownedEquipment.set(instance.instanceId, instance)
    this.notifyStateChanged()
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

  private static readonly HERO_NAME_MAP: Record<string, string> = {
    hero_guanyu: '关羽',
    hero_zhangfei: '张飞',
    hero_zhaoyun: '赵云',
    hero_huangzhong: '黄忠',
    hero_machao: '马超'
  }

  /**
   * 根据武将ID获取武将显示名称
   */
  public getEquippedHeroName(heroId: string | null | undefined): string {
    if (!heroId) return ''
    return EquipmentManager.HERO_NAME_MAP[heroId] || heroId
  }

  /**
   * 装备到武将（非专属武将亦可自由佩戴获取白板属性，专属武将方可觉醒隐藏绝技）
   */
  equipToHero(instanceId: string, heroId: string, heroName?: string): boolean {
    const instance = this.ownedEquipment.get(instanceId)
    if (!instance) {
      return false
    }
    if (heroName) {
      EquipmentManager.HERO_NAME_MAP[heroId] = heroName
    }

    // 若该件装备原本佩带在其他武将身上，先卸下原绑定
    if (instance.isEquipped) {
      instance.isEquipped = false
      instance.equippedHeroId = null
    }

    // 先卸下目标武将身上的同类型装备
    this.unequipFromHeroByType(heroId, instance.type)

    instance.isEquipped = true
    instance.equippedHeroId = heroId
    this.notifyStateChanged()
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
    this.notifyStateChanged()
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
    const activeGem = gem || sameGem || generatingGem
    if (activeGem && artifact.gemSocket?.requiredWuXing) {
      const baseWuXing = artifact.gemSocket.requiredWuXing
      if (activeGem.wuXing === baseWuXing) {
        // 同源共鸣（同五行）
        resonanceType = 'same'
      } else if (WuXingGenerate[activeGem.wuXing] === baseWuXing) {
        // 相生滋养（生我者，如水生木）
        resonanceType = 'generating'
      }
    }

    const hasResonance = isExclusive && (resonanceType !== 'none' || !!sameGem || !!generatingGem)
    const sameGemLevel = sameGem ? sameGem.level : 0
    const generatingGemLevel = generatingGem ? generatingGem.level : 0
    const hasDualLv5Ultimate = isExclusive && sameGemLevel === 5 && generatingGemLevel === 5

    return {
      isExclusive,
      hasResonance,
      resonanceType,
      gemLevel: activeGem ? activeGem.level : Math.max(sameGemLevel, generatingGemLevel),
      sameGemLevel,
      generatingGemLevel,
      hasDualLv5Ultimate,
      artifact,
      gem: activeGem,
      sameGem,
      generatingGem,
      resonanceConfig: artifact.exclusiveResonance
    }
  }

  /**
   * 获取指定神器实例当前双槽（2★同源槽 sameGem / 4★相生槽 generatingGem）镶嵌的宝石对象
   */
  public getArtifactSocketedGems(artifactInstanceId: string): {
    sameGem: Gem | null
    generatingGem: Gem | null
    currentGem: Gem | null
  } {
    const inst = this.ownedEquipment.get(artifactInstanceId)
    if (!inst || inst.type !== 'artifact') {
      return { sameGem: null, generatingGem: null, currentGem: null }
    }
    const artifact = getArtifact(inst.equipmentId) as Artifact
    if (!artifact || !artifact.gemSocket) {
      return { sameGem: null, generatingGem: null, currentGem: null }
    }

    const resolveGem = (val: string | Gem | null | undefined): Gem | null => {
      if (!val) return null
      if (typeof val === 'string') return this.ownedGems.get(val) || null
      return val
    }

    let sameGem = resolveGem(artifact.gemSocket.sameGem)
    let generatingGem = resolveGem(artifact.gemSocket.generatingGem)
    const currentGem = resolveGem(artifact.gemSocket.currentGem)

    // 兼容仅设置了 currentGem 的旧数据
    if (currentGem) {
      const baseWuXing = artifact.gemSocket.requiredWuXing
      if (!sameGem && currentGem.wuXing === baseWuXing) {
        sameGem = currentGem
      } else if (!generatingGem && WuXingGenerate[currentGem.wuXing] === baseWuXing) {
        generatingGem = currentGem
      }
    }

    return { sameGem, generatingGem, currentGem: currentGem || sameGem || generatingGem }
  }

  /**
   * 获取神兵 6 阶进化状态（严格对齐设计文档 §4.4《神兵系统与武将技能变化规则》）
   */
  public getArtifactEvolutionStage(artifactInstanceId: string): {
    stageIndex: 1 | 2 | 3 | 4 | 5 | 6
    stageBadge: string
    stageTitle: string
    stageSummary: string
    isExclusiveOwnerEquipped: boolean
    isNonOwnerEquipped: boolean
    sameGem: Gem | null
    generatingGem: Gem | null
    hasSameEffect: boolean
    hasGeneratingEffect: boolean
    hasDualLv5Ultimate: boolean
  } {
    const inst = this.ownedEquipment.get(artifactInstanceId)
    const artifact = inst ? (getArtifact(inst.equipmentId) as Artifact) : undefined
    const { sameGem, generatingGem } = this.getArtifactSocketedGems(artifactInstanceId)

    const exclusiveHeroName =
      artifact?.exclusiveResonance?.heroName || artifact?.exclusiveHeroes?.[0]

    const isEquipped = !!(inst && inst.isEquipped && inst.equippedHeroId)
    const isExclusiveOwnerEquipped = !!(
      isEquipped &&
      inst?.equippedHeroId &&
      this.isExclusiveForHero(artifactInstanceId, inst.equippedHeroId)
    )
    const isNonOwnerEquipped = !!(isEquipped && !isExclusiveOwnerEquipped)

    const hasSameEffect = isExclusiveOwnerEquipped && !!sameGem
    const hasGeneratingEffect = isExclusiveOwnerEquipped && !!generatingGem
    const hasDualLv5Ultimate =
      isExclusiveOwnerEquipped && sameGem?.level === 5 && generatingGem?.level === 5

    if (!isEquipped) {
      return {
        stageIndex: 1,
        stageBadge: '第 ① 阶 · 素身待主',
        stageTitle: '未装备武将（器灵封存）',
        stageSummary: exclusiveHeroName
          ? `需由本命武将【${exclusiveHeroName}】佩戴方可唤醒神兵进化技与三才共鸣`
          : '通用古宝：佩戴后仅生效基础属性与宝石面板加成',
        isExclusiveOwnerEquipped: false,
        isNonOwnerEquipped: false,
        sameGem,
        generatingGem,
        hasSameEffect: false,
        hasGeneratingEffect: false,
        hasDualLv5Ultimate: false
      }
    }

    if (isNonOwnerEquipped) {
      return {
        stageIndex: 2,
        stageBadge: '第 ② 阶 · 凡兵白板',
        stageTitle: `非本命佩戴（当前：${this.getEquippedHeroName(inst?.equippedHeroId) || '其他武将'}）`,
        stageSummary: '【铁律限制】仅生效神兵与宝石基础属性面板，不触发技能质变、同源/相生特效与终极大招',
        isExclusiveOwnerEquipped: false,
        isNonOwnerEquipped: true,
        sameGem,
        generatingGem,
        hasSameEffect: false,
        hasGeneratingEffect: false,
        hasDualLv5Ultimate: false
      }
    }

    if (hasDualLv5Ultimate) {
      return {
        stageIndex: 6,
        stageBadge: '第 ⑥ 阶 · 圣兽降世（双Lv.5大圆满）',
        stageTitle: `【${exclusiveHeroName}】神兵技 + 同源Lv.5 + 相生Lv.5 + 终极大招觉醒`,
        stageSummary: `已唤醒 5★ 终极大招【${artifact?.exclusiveResonance?.ultimateName || '圣兽法相'}】，主动战法 100% 必定附带生我属性引发本命相生！`,
        isExclusiveOwnerEquipped: true,
        isNonOwnerEquipped: false,
        sameGem,
        generatingGem,
        hasSameEffect: true,
        hasGeneratingEffect: true,
        hasDualLv5Ultimate: true
      }
    }

    if (hasSameEffect && hasGeneratingEffect) {
      return {
        stageIndex: 5,
        stageBadge: '第 ⑤ 阶 · 三才双鸣（同源+相生并存）',
        stageTitle: `【${exclusiveHeroName}】神兵技 + 2★同源(Lv.${sameGem?.level}) + 4★相生(Lv.${generatingGem?.level})`,
        stageSummary: '周身环绕双色护体灵魄，同时享受同源本命强化与相生跨系质变（双槽升至 Lv.5 即可唤醒终极大招）',
        isExclusiveOwnerEquipped: true,
        isNonOwnerEquipped: false,
        sameGem,
        generatingGem,
        hasSameEffect: true,
        hasGeneratingEffect: true,
        hasDualLv5Ultimate: false
      }
    }

    if (hasSameEffect || hasGeneratingEffect) {
      const activeSlotLabel = hasSameEffect
        ? `2★同源槽(Lv.${sameGem?.level})`
        : `4★相生槽(Lv.${generatingGem?.level})`
      return {
        stageIndex: 4,
        stageBadge: `第 ④ 阶 · 灵石启鸣（${activeSlotLabel}）`,
        stageTitle: `【${exclusiveHeroName}】神兵进化技 + ${activeSlotLabel}特效生效`,
        stageSummary: hasSameEffect
          ? '已激活 2★ 同源特效；继续在 4★ 相生槽镶嵌生我灵石可达成双槽三才共鸣'
          : '已激活 4★ 相生特效；继续在 2★ 同源槽镶嵌本命灵石可达成双槽三才共鸣',
        isExclusiveOwnerEquipped: true,
        isNonOwnerEquipped: false,
        sameGem,
        generatingGem,
        hasSameEffect,
        hasGeneratingEffect,
        hasDualLv5Ultimate: false
      }
    }

    return {
      stageIndex: 3,
      stageBadge: '第 ③ 阶 · 器灵认主（神兵进化技）',
      stageTitle: `【${exclusiveHeroName}】本命认主 · 原始战法进化为神兵技能`,
      stageSummary: '脚底常驻本命器灵金环；镶嵌 2★ 同源灵石与 4★ 相生灵石可进一步解锁三才共鸣与终极大招',
      isExclusiveOwnerEquipped: true,
      isNonOwnerEquipped: false,
      sameGem,
      generatingGem,
      hasSameEffect: false,
      hasGeneratingEffect: false,
      hasDualLv5Ultimate: false
    }
  }

  /**
   * 计算武将所佩戴神器镶嵌宝石提供的五大基础属性增益
   */
  getHeroGemStatBonuses(heroId: string): {
    attackPercent: number
    attackRangeFlat: number
    attackRangePercent: number
    attackSpeedPercent: number
    critRateBonus: number
    critDamageBonus: number
  } {
    const bonuses = {
      attackPercent: 0,
      attackRangeFlat: 0,
      attackRangePercent: 0,
      attackSpeedPercent: 0,
      critRateBonus: 0,
      critDamageBonus: 0
    }
    const equip = this.getHeroEquipment(heroId)
    if (!equip.artifact) return bonuses

    const { sameGem, generatingGem, currentGem } = this.getArtifactSocketedGems(equip.artifact.instanceId)
    const activeGems = new Map<string, Gem>()
    if (sameGem) activeGems.set(sameGem.id, sameGem)
    if (generatingGem) activeGems.set(generatingGem.id, generatingGem)
    if (currentGem) activeGems.set(currentGem.id, currentGem)

    for (const gem of activeGems.values()) {
      if (!gem.affixes) continue
      for (const affix of gem.affixes) {
        switch (affix.stat) {
          case 'attack':
            bonuses.attackPercent += affix.value
            break
          case 'attackRange':
            if (affix.isPercentage) {
              bonuses.attackRangePercent += affix.value
              bonuses.attackRangeFlat += Math.round(160 * affix.value)
            } else {
              bonuses.attackRangeFlat += affix.value
              bonuses.attackRangePercent += affix.value / 160
            }
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
      const { sameGem, generatingGem, currentGem } = this.getArtifactSocketedGems(equip.artifact.instanceId)
      if (sameGem && sameGem.level === 5) return sameGem
      if (generatingGem && generatingGem.level === 5) return generatingGem
      if (currentGem && currentGem.level === 5) return currentGem
    }
    return null
  }

  /**
   * 添加宝石（自动生成 2 条随机五维基础属性词条，支持无尽保底分位与三合一主石词条/分位继承）
   */
  addGem(
    wuXing: string,
    level: number,
    minRollPercentile: number = 0,
    inheritedStats?: GemStatType[],
    inheritedPercentiles?: number[]
  ): Gem {
    const gem: Gem = {
      id: `gem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      wuXing: wuXing as WuXing,
      level,
      affixes: rollGemAffixes(level, minRollPercentile, inheritedStats, inheritedPercentiles)
    }
    this.ownedGems.set(gem.id, gem)
    this.notifyStateChanged()
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
   * 宝石三合一升阶（支持从 3 颗灵石的所有词条中自由选择保留想要的 2 条属性词条）
   * @param wuXing 五行属性
   * @param level 当前等级（合成前的等级）
   * @param mainGemId 可选指定的基准灵石ID（兼容旧调用或指定优先参与合成的灵石）
   * @param selectedAffixes 可选：玩家自选保留的 2 条词条类型与品相分位
   * @param consumeGemIds 可选：指定参与合成的 3 颗灵石ID
   * @returns 合成后的新宝石，或null（合成失败）
   */
  synthesizeGems(
    wuXing: string,
    level: number,
    mainGemId?: string,
    selectedAffixes?: { stat: GemStatType; percentile: number }[],
    consumeGemIds?: string[]
  ): Gem | null {
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

    let toConsume: Gem[] = []
    if (consumeGemIds && consumeGemIds.length === 3) {
      const matched = consumeGemIds
        .map(id => gems.find(g => g.id === id))
        .filter((g): g is Gem => Boolean(g))
      if (matched.length === 3) {
        toConsume = matched
      }
    }

    const focusGem = (mainGemId ? gems.find(g => g.id === mainGemId) : undefined) || gems[0]
    if (toConsume.length < 3) {
      const otherGems = gems
        .filter(g => g.id !== focusGem.id)
        .sort(
          (a, b) =>
            Number(this.isGemSocketedAnywhere(a.id)) - Number(this.isGemSocketedAnywhere(b.id))
        )
      toConsume = [focusGem, ...otherGems.slice(0, 2)]
    }

    let inheritedStats: GemStatType[] | undefined
    let inheritedPercentiles: number[] | undefined
    if (selectedAffixes && selectedAffixes.length >= 2) {
      inheritedStats = [selectedAffixes[0].stat, selectedAffixes[1].stat]
      inheritedPercentiles = [selectedAffixes[0].percentile, selectedAffixes[1].percentile]
    } else {
      inheritedStats = focusGem.affixes?.map(a => a.stat)
      inheritedPercentiles = focusGem.affixes?.map(a => getAffixPercentile(a))
    }

    // 若被消耗的宝石正镶嵌在神器上，先安全清理引用并记录槽位以便新宝石自动回填原槽位
    let socketedArtifactInstanceId: string | null = null
    let socketedSlot: 'same' | 'generating' | undefined = undefined

    this.isSuppressingSave++
    let newGem: Gem
    try {
      for (const g of toConsume) {
        for (const inst of this.ownedEquipment.values()) {
          if (inst.type !== 'artifact') continue
          const detail = getArtifact(inst.equipmentId)
          if (!detail?.gemSocket) continue
          if (detail.gemSocket.sameGem === g.id) {
            if (!socketedArtifactInstanceId || g.id === focusGem.id) {
              socketedArtifactInstanceId = inst.instanceId
              socketedSlot = 'same'
            }
            detail.gemSocket.sameGem = null
          }
          if (detail.gemSocket.generatingGem === g.id) {
            if (!socketedArtifactInstanceId || g.id === focusGem.id) {
              socketedArtifactInstanceId = inst.instanceId
              socketedSlot = 'generating'
            }
            detail.gemSocket.generatingGem = null
          }
          if (detail.gemSocket.currentGem === g.id) {
            detail.gemSocket.currentGem =
              detail.gemSocket.sameGem || detail.gemSocket.generatingGem || null
          }
        }
        this.ownedGems.delete(g.id)
      }

      // 创建1个高级宝石，保留所选的 2 条属性词条类型与品相分位下限
      newGem = this.addGem(wuXing, level + 1, 0, inheritedStats, inheritedPercentiles)

      // 如果参与合成的灵石原本镶嵌在某把神兵上，自动将升阶后的新宝石镶嵌回原槽位
      if (socketedArtifactInstanceId) {
        this.socketGemToArtifact(socketedArtifactInstanceId, newGem.id, socketedSlot)
      }
    } finally {
      this.isSuppressingSave--
    }

    this.notifyStateChanged()
    console.log(
      `合成成功：3个${wuXing}系Lv.${level}宝石 → 1个${wuXing}系Lv.${level + 1}宝石（自选保留词条生效）`
    )
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
   * 获取某颗宝石当前镶嵌在哪把神器及哪个槽位上
   */
  public getGemSocketLocation(gemId: string): {
    artifactInstanceId: string
    artifactName: string
    slotType: 'same' | 'generating'
    slotLabel: string
  } | null {
    for (const inst of this.ownedEquipment.values()) {
      if (inst.type !== 'artifact') continue
      const detail = getArtifact(inst.equipmentId) as Artifact
      if (!detail?.gemSocket) continue
      if (detail.gemSocket.sameGem === gemId) {
        return {
          artifactInstanceId: inst.instanceId,
          artifactName: detail.name,
          slotType: 'same',
          slotLabel: '同源槽'
        }
      }
      if (detail.gemSocket.generatingGem === gemId) {
        return {
          artifactInstanceId: inst.instanceId,
          artifactName: detail.name,
          slotType: 'generating',
          slotLabel: '相生槽'
        }
      }
      if (detail.gemSocket.currentGem === gemId) {
        const isSame = this.ownedGems.get(gemId)?.wuXing === detail.gemSocket.requiredWuXing
        return {
          artifactInstanceId: inst.instanceId,
          artifactName: detail.name,
          slotType: isSame ? 'same' : 'generating',
          slotLabel: isSame ? '同源槽' : '相生槽'
        }
      }
    }
    return null
  }

  /**
   * 镶嵌宝石到神器（支持指定 2★ 同源槽 'same' 或 4★ 相生槽 'generating'，自动从旧神器卸下避免分身）
   */
  socketGemToArtifact(
    artifactInstanceId: string,
    gemId: string,
    targetSlot?: 'same' | 'generating'
  ): boolean {
    const artifactInstance = this.ownedEquipment.get(artifactInstanceId)
    const gem = this.ownedGems.get(gemId)

    if (!artifactInstance || !gem) return false

    const artifactDetail = getArtifact(artifactInstance.equipmentId) as Artifact
    if (!artifactDetail || !artifactDetail.gemSocket) return false

    const baseWuXing = artifactDetail.gemSocket.requiredWuXing
    const isSameWuXing = gem.wuXing === baseWuXing
    const isGeneratingWuXing = WuXingGenerate[gem.wuXing] === baseWuXing

    // 若指定了目标槽位，校验槽位五行法则
    if (targetSlot === 'same' && !isSameWuXing) {
      console.warn(`同源槽仅可镶嵌[${WuXingNames[baseWuXing]}]系宝石`)
      return false
    }
    if (targetSlot === 'generating' && !isGeneratingWuXing) {
      const genWuXing = getAllowedGemWuXing(baseWuXing).generating
      console.warn(`相生槽仅可镶嵌生我属性[${WuXingNames[genWuXing]}]系宝石`)
      return false
    }

    // 检查五行匹配（支持同源与相生五行）
    const allowed = artifactDetail.gemSocket.allowedWuXings || getAllowedGemWuXing(baseWuXing).all
    if (!allowed.includes(gem.wuXing)) {
      console.warn(`宝石五行不匹配: 神器需[${allowed.map(w => WuXingNames[w]).join('/')}]系宝石, 当前为[${WuXingNames[gem.wuXing]}]`)
      return false
    }

    // 若该宝石此前镶嵌在其他神器槽位上，先将其从旧位置卸下（保证同一颗宝石实例唯一镶嵌）
    for (const inst of this.ownedEquipment.values()) {
      if (inst.type !== 'artifact') continue
      const detail = getArtifact(inst.equipmentId)
      if (!detail?.gemSocket) continue
      if (detail.gemSocket.sameGem === gemId) detail.gemSocket.sameGem = null
      if (detail.gemSocket.generatingGem === gemId) detail.gemSocket.generatingGem = null
      if (detail.gemSocket.currentGem === gemId) {
        detail.gemSocket.currentGem = detail.gemSocket.sameGem || detail.gemSocket.generatingGem || null
      }
    }

    // 同步记录到同源槽或相生槽以及 currentGem
    artifactDetail.gemSocket.currentGem = gemId
    if (targetSlot === 'same' || (!targetSlot && isSameWuXing)) {
      artifactDetail.gemSocket.sameGem = gemId
    } else if (targetSlot === 'generating' || (!targetSlot && isGeneratingWuXing)) {
      artifactDetail.gemSocket.generatingGem = gemId
    }
    this.notifyStateChanged()
    return true
  }

  /**
   * 从神器卸下全部宝石
   */
  unsocketGemFromArtifact(artifactInstanceId: string): boolean {
    const artifactInstance = this.ownedEquipment.get(artifactInstanceId)
    if (!artifactInstance) return false

    const artifactDetail = getArtifact(artifactInstance.equipmentId) as Artifact
    if (!artifactDetail || !artifactDetail.gemSocket) return false

    artifactDetail.gemSocket.currentGem = null
    artifactDetail.gemSocket.sameGem = null
    artifactDetail.gemSocket.generatingGem = null
    this.notifyStateChanged()
    return true
  }

  /**
   * 从神器卸下指定槽位的宝石（'same' 同源槽 或 'generating' 相生槽）
   */
  unsocketGemSlotFromArtifact(artifactInstanceId: string, slotType: 'same' | 'generating'): boolean {
    const artifactInstance = this.ownedEquipment.get(artifactInstanceId)
    if (!artifactInstance) return false

    const artifactDetail = getArtifact(artifactInstance.equipmentId) as Artifact
    if (!artifactDetail || !artifactDetail.gemSocket) return false

    if (slotType === 'same') {
      const removed = artifactDetail.gemSocket.sameGem
      artifactDetail.gemSocket.sameGem = null
      if (artifactDetail.gemSocket.currentGem === removed) {
        artifactDetail.gemSocket.currentGem = artifactDetail.gemSocket.generatingGem || null
      }
    } else {
      const removed = artifactDetail.gemSocket.generatingGem
      artifactDetail.gemSocket.generatingGem = null
      if (artifactDetail.gemSocket.currentGem === removed) {
        artifactDetail.gemSocket.currentGem = artifactDetail.gemSocket.sameGem || null
      }
    }
    this.notifyStateChanged()
    return true
  }

  /**
   * 检查某颗宝石是否已被镶嵌在任何神器上
   */
  isGemSocketedAnywhere(gemId: string): boolean {
    return this.getGemSocketLocation(gemId) !== null
  }

  // =========================================================
  // 蒲元铸剑坊（神兵宿命主材 + 百炼玄铁 + 100% 定向锻造 · 一生仅需铸造 1 把）
  // =========================================================

  private divineMaterials: Map<string, number> = new Map([
    ['mat_wood_zhangjiao', 1],
    ['mat_metal_caoren', 1],
    ['mat_water_zhangliao', 1],
    ['mat_earth_dongzhuo', 1],
    ['mat_fire_lvbu', 1]
  ])

  private spiritDust: number = 200
  private refinedIron: number = 120

  public static readonly DIVINE_FORGE_RECIPES: ReadonlyArray<{
    materialId: string
    materialName: string
    mapTitle: string
    bossName: string
    artifactId: string
    artifactName: string
    heroId: string
    heroName: string
    wuXing: WuXing
    goldCost: number
    ironCost: number
  }> = [
    {
      materialId: 'mat_wood_zhangjiao',
      materialName: '太平青木髓',
      mapTitle: '卷一《巨鹿破黄巾》',
      bossName: '张角（木·梅雨瘴林）',
      artifactId: 'artifact_qinglong',
      artifactName: '青龙偃月刀',
      heroId: 'hero_guanyu',
      heroName: '关羽',
      wuXing: 'wood',
      goldCost: 800,
      ironCost: 20
    },
    {
      materialId: 'mat_metal_caoren',
      materialName: '八门庚金铁',
      mapTitle: '卷二《樊城破八门》',
      bossName: '曹仁（金·朔风凛冽）',
      artifactId: 'artifact_zhanjin',
      artifactName: '虎头湛金枪',
      heroId: 'hero_machao',
      heroName: '马超',
      wuXing: 'metal',
      goldCost: 800,
      ironCost: 20
    },
    {
      materialId: 'mat_water_zhangliao',
      materialName: '逍遥寒泉玉',
      mapTitle: '卷三《合淝威逍遥》',
      bossName: '张辽（水·寒潮暴雪）',
      artifactId: 'artifact_longdan',
      artifactName: '龙胆亮银枪',
      heroId: 'hero_zhaoyun',
      heroName: '赵云',
      wuXing: 'water',
      goldCost: 800,
      ironCost: 20
    },
    {
      materialId: 'mat_earth_dongzhuo',
      materialName: '西凉镇岳铜',
      mapTitle: '卷四《焚城讨董卓》',
      bossName: '董卓（土·黄沙漫天）',
      artifactId: 'artifact_shemao',
      artifactName: '丈八蛇矛',
      heroId: 'hero_zhangfei',
      heroName: '张飞',
      wuXing: 'earth',
      goldCost: 800,
      ironCost: 20
    },
    {
      materialId: 'mat_fire_lvbu',
      materialName: '赤兔焚天晶',
      mapTitle: '卷五《虎牢战温侯》',
      bossName: '吕布（火·赤地焚风）',
      artifactId: 'artifact_sherigong',
      artifactName: '宝雕射日弓',
      heroId: 'hero_huangzhong',
      heroName: '黄忠',
      wuXing: 'fire',
      goldCost: 800,
      ironCost: 20
    }
  ]

  public getDivineMaterialCount(materialId: string): number {
    return this.divineMaterials.get(materialId) || 0
  }

  public getTotalDivineMaterialsCount(): number {
    let sum = 0
    for (const v of this.divineMaterials.values()) sum += v
    return sum
  }

  public addDivineMaterial(materialId: string, count: number = 1): void {
    const cur = this.getDivineMaterialCount(materialId)
    this.divineMaterials.set(materialId, cur + count)
    this.notifyStateChanged()
  }

  public getRefinedIron(): number {
    return this.refinedIron
  }

  public addRefinedIron(amount: number): void {
    this.refinedIron = Math.max(0, this.refinedIron + amount)
    this.notifyStateChanged()
  }

  public hasOwnedEquipmentId(equipmentId: string): boolean {
    for (const inst of this.ownedEquipment.values()) {
      if (inst.equipmentId === equipmentId) return true
    }
    return false
  }

  /**
   * 熔炼分解通用制式兵器（转化为【百炼玄铁】）
   */
  public salvageGenericWeapon(instanceId: string): {
    success: boolean
    ironGained: number
    message: string
  } {
    const inst = this.ownedEquipment.get(instanceId)
    if (!inst) {
      return { success: false, ironGained: 0, message: '未找到该兵械' }
    }
    if (inst.type !== 'weapon') {
      return { success: false, ironGained: 0, message: '神兵古宝不可熔炼，仅通用制式兵械可分解为【百炼玄铁】' }
    }
    if (inst.isEquipped) {
      return { success: false, ironGained: 0, message: '该兵械正由武将佩带，请先卸下再熔炼' }
    }
    const detail = getWeapon(inst.equipmentId)
    const rarityIronMap: Record<string, number> = {
      common: 15,
      rare: 30,
      epic: 50,
      legendary: 80
    }
    const ironGained = rarityIronMap[inst.rarity] || 20
    this.ownedEquipment.delete(instanceId)
    this.addRefinedIron(ironGained)
    return {
      success: true,
      ironGained,
      message: `熔炼《${detail?.name || '制式兵械'}》，获得【百炼玄铁】+${ironGained}`
    }
  }

  /**
   * 一键熔炼所有未装备的通用制式兵械
   */
  public salvageAllIdleGenericWeapons(): {
    count: number
    ironGained: number
    message: string
  } {
    const idleWeapons = Array.from(this.ownedEquipment.values()).filter(
      inst => inst.type === 'weapon' && !inst.isEquipped
    )
    if (idleWeapons.length === 0) {
      return { count: 0, ironGained: 0, message: '当前没有闲置的通用制式兵械可供熔炼' }
    }
    let totalIron = 0
    this.isSuppressingSave++
    try {
      for (const w of idleWeapons) {
        const res = this.salvageGenericWeapon(w.instanceId)
        if (res.success) totalIron += res.ironGained
      }
    } finally {
      this.isSuppressingSave--
    }
    this.notifyStateChanged()
    return {
      count: idleWeapons.length,
      ironGained: totalIron,
      message: `已熔炼 ${idleWeapons.length} 件闲置制式兵械，共得【百炼玄铁】+${totalIron}`
    }
  }

  /**
   * 蒲元铸剑坊：消耗 1 个统帅宿命主材 + 百炼玄铁，100% 定向锻造对应五虎本命神兵（一生仅需铸造 1 把）
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
    if (this.refinedIron < recipe.ironCost) {
      return {
        success: false,
        message: `【百炼玄铁】不足（需 ${recipe.ironCost}，当前 ${this.refinedIron}，可熔炼过渡兵械获取）`
      }
    }

    this.isSuppressingSave++
    let inst: EquipmentInstance | null = null
    try {
      this.divineMaterials.set(materialId, count - 1)
      this.refinedIron -= recipe.ironCost
      inst = this.addEquipment(recipe.artifactId)
      if (inst) {
        this.equipToHero(inst.instanceId, recipe.heroId, recipe.heroName)
      }
    } finally {
      this.isSuppressingSave--
    }
    if (inst) {
      this.notifyStateChanged()
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
    this.notifyStateChanged()
  }

  /**
   * 分解未镶嵌的溢出宝石为【五行灵砂】（按宝石等级返还 level * 15 灵砂；5级灵石不可分解）
   */
  public salvageGemToDust(gemId: string): { success: boolean; dustGained: number; message: string } {
    const gem = this.ownedGems.get(gemId)
    if (!gem) {
      return { success: false, dustGained: 0, message: '未找到该宝石' }
    }
    if (gem.level >= 5) {
      return { success: false, dustGained: 0, message: '5级灵石不可分解' }
    }
    if (this.isGemSocketedAnywhere(gemId)) {
      return { success: false, dustGained: 0, message: '该宝石正镶嵌于神兵之上，请先卸下' }
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
   * 5级灵石专属开槽：消耗 25 点【五行灵砂】开启 1 个新属性词条槽位（最多可同时拥有 5 个属性词条）
   */
  public unlockLevel5GemAffixSlot(gemId: string): {
    success: boolean
    newAffix?: GemAffix
    message: string
  } {
    const gem = this.ownedGems.get(gemId)
    if (!gem) {
      return { success: false, message: '未找到该灵石' }
    }
    if (gem.level < 5) {
      return { success: false, message: '仅 5 级灵石支持开槽扩展属性词条' }
    }
    if (!gem.affixes) {
      gem.affixes = []
    }
    if (gem.affixes.length >= 5) {
      return { success: false, message: '该 5 级灵石已开满 5 个属性词条槽位' }
    }

    const cost = 25
    if (this.spiritDust < cost) {
      return { success: false, message: `五行灵砂不足（开槽需 ${cost} 灵砂，当前 ${this.spiritDust}）` }
    }

    this.spiritDust -= cost

    // 优先抽取当前尚未拥有的基础属性类型，若已全覆盖则随机抽取
    const existingStats = new Set(gem.affixes.map(a => a.stat))
    const missingStats = ARTIFACT_STAT_ORDER.filter(s => !existingStats.has(s))
    const targetStat =
      missingStats.length > 0
        ? missingStats[Math.floor(Math.random() * missingStats.length)]
        : ARTIFACT_STAT_ORDER[Math.floor(Math.random() * ARTIFACT_STAT_ORDER.length)]

    const rolled = rollGemAffixes(5, 0.45, [targetStat, targetStat])
    const newAffix = rolled[0]
    gem.affixes.push(newAffix)
    this.notifyStateChanged()

    return {
      success: true,
      newAffix,
      message: `开槽成功！已开启第 ${gem.affixes.length}/5 属性词条槽`
    }
  }

  /**
   * 消耗 20 点【五行灵砂】为指定宝石的第 affixIndex 条词条生成一条新候选词条（支持保留原词条或替换为新词条，100% 不降级）
   */
  public previewReforgeGemAffix(
    gemId: string,
    affixIndex: number = 0
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
    // 生成一条新候选词条（保底分位 0.45 提高淬炼品质）
    const rolled = rollGemAffixes(gem.level, 0.45)
    const candidate = rolled[0]
    this.notifyStateChanged()

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
    affixIndex: number,
    newAffix: NonNullable<Gem['affixes']>[number]
  ): boolean {
    const gem = this.ownedGems.get(gemId)
    if (!gem || !gem.affixes || !gem.affixes[affixIndex]) return false
    gem.affixes[affixIndex] = { ...newAffix }
    this.notifyStateChanged()
    return true
  }

  /**
   * 消耗 10 点【百炼玄铁】洗练神兵的第 statIndex 条基础属性（0~4），生成新候选数值（保底分位 0.45，支持保留原值或替换新值）
   */
  public previewReforgeArtifactStat(
    instanceId: string,
    statIndex: number
  ): {
    success: boolean
    oldAffix?: GemAffix
    newAffix?: GemAffix
    message: string
  } {
    const inst = this.ownedEquipment.get(instanceId)
    if (!inst || inst.type !== 'artifact') {
      return { success: false, message: '未找到可洗练的神兵' }
    }
    const affixes = this.ensureArtifactStatAffixes(inst)
    const target = affixes[statIndex]
    if (!target) {
      return { success: false, message: '未找到指定的神兵属性条' }
    }
    const cost = 10
    if (this.refinedIron < cost) {
      return {
        success: false,
        message: `百炼玄铁不足（需 ${cost} 玄铁，当前 ${this.refinedIron}，可熔炼过渡兵械获取）`
      }
    }

    this.refinedIron -= cost
    const oldAffix = { ...target }
    const range = ARTIFACT_STAT_RANGES[target.stat] || { min: target.min, max: target.max }
    const pct = 0.45 + Math.random() * 0.55
    const rawVal = range.min + (range.max - range.min) * pct
    const newAffix: GemAffix = {
      stat: target.stat,
      value: Math.round(rawVal * 1000) / 1000,
      min: range.min,
      max: range.max,
      isPercentage: true
    }
    this.notifyStateChanged()

    return {
      success: true,
      oldAffix,
      newAffix,
      message: `消耗 ${cost} 玄铁洗练完成！可选择【保留原数值】或【替换为新数值】`
    }
  }

  /**
   * 确认替换神兵第 statIndex 条基础属性的洗练结果
   */
  public applyReforgedArtifactStat(
    instanceId: string,
    statIndex: number,
    newAffix: GemAffix
  ): boolean {
    const inst = this.ownedEquipment.get(instanceId)
    if (!inst || inst.type !== 'artifact') return false
    const affixes = this.ensureArtifactStatAffixes(inst)
    if (!affixes[statIndex]) return false
    affixes[statIndex] = { ...newAffix }
    this.notifyStateChanged()
    return true
  }

  /**
   * 导出装备管理器完整状态用于存档持久化
   */
  public exportToSaveInventory(): {
    equipment: string[]
    equipmentInstances: SavedEquipmentInstance[]
    artifactSockets: Record<string, SavedArtifactSocketState>
    gems: Gem[]
    spiritDust: number
    refinedIron: number
    divineMaterials: Record<string, number>
  } {
    const equipmentInstances: SavedEquipmentInstance[] = Array.from(this.ownedEquipment.values()).map(inst => ({
      instanceId: inst.instanceId,
      equipmentId: inst.equipmentId,
      type: inst.type,
      rarity: inst.rarity,
      isEquipped: inst.isEquipped,
      equippedHeroId: inst.equippedHeroId,
      statAffixes: inst.statAffixes ? inst.statAffixes.map(a => ({ ...a })) : undefined
    }))

    const artifactSockets: Record<string, SavedArtifactSocketState> = {}
    for (const inst of this.ownedEquipment.values()) {
      if (inst.type === 'artifact') {
        const detail = getArtifact(inst.equipmentId)
        if (detail?.gemSocket) {
          artifactSockets[inst.equipmentId] = {
            currentGem: detail.gemSocket.currentGem || null,
            sameGem: detail.gemSocket.sameGem || null,
            generatingGem: detail.gemSocket.generatingGem || null
          }
        }
      }
    }

    const gems: Gem[] = Array.from(this.ownedGems.values()).map(g => ({
      ...g,
      affixes: g.affixes ? g.affixes.map(a => ({ ...a })) : undefined
    }))

    const divineMaterials: Record<string, number> = {}
    for (const [k, v] of this.divineMaterials.entries()) {
      divineMaterials[k] = v
    }

    return {
      equipment: equipmentInstances.map(i => i.equipmentId),
      equipmentInstances,
      artifactSockets,
      gems,
      spiritDust: this.spiritDust,
      refinedIron: this.refinedIron,
      divineMaterials
    }
  }

  /**
   * 从存档恢复装备管理器完整状态
   */
  public importFromSaveInventory(inventory?: {
    equipment?: string[]
    equipmentInstances?: SavedEquipmentInstance[]
    artifactSockets?: Record<string, SavedArtifactSocketState>
    gems?: Gem[]
    spiritDust?: number
    refinedIron?: number
    divineMaterials?: Record<string, number>
  }): void {
    if (!inventory) return
    this.isSuppressingSave++
    try {
      if (inventory.equipmentInstances && inventory.equipmentInstances.length > 0) {
        for (const inst of this.ownedEquipment.values()) {
          if (inst.type === 'artifact') {
            const detail = getArtifact(inst.equipmentId)
            if (detail?.gemSocket) {
              detail.gemSocket.currentGem = null
              detail.gemSocket.sameGem = null
              detail.gemSocket.generatingGem = null
            }
          }
        }
        this.ownedEquipment.clear()
        let maxCounter = 0
        for (const saved of inventory.equipmentInstances) {
          const match = saved.instanceId.match(/^equip_(\d+)_/)
          if (match) {
            maxCounter = Math.max(maxCounter, parseInt(match[1], 10))
          }
          const restored: EquipmentInstance = {
            instanceId: saved.instanceId,
            equipmentId: saved.equipmentId,
            type: saved.type,
            rarity: saved.rarity,
            isEquipped: saved.isEquipped,
            equippedHeroId: saved.equippedHeroId,
            statAffixes: saved.statAffixes ? saved.statAffixes.map(a => ({ ...a })) : undefined
          }
          if (restored.type === 'artifact' && (!restored.statAffixes || restored.statAffixes.length < 5)) {
            restored.statAffixes = this.createDefaultArtifactStatAffixes()
          }
          this.ownedEquipment.set(restored.instanceId, restored)
        }
        this.equipmentCounter = Math.max(this.equipmentCounter, maxCounter)
      }

      if (inventory.gems && inventory.gems.length > 0) {
        this.ownedGems.clear()
        for (const g of inventory.gems) {
          const restoredGem: Gem = {
            id: g.id,
            wuXing: g.wuXing,
            level: g.level,
            affixes: g.affixes && g.affixes.length > 0 ? g.affixes.map(a => ({ ...a })) : rollGemAffixes(g.level)
          }
          this.ownedGems.set(restoredGem.id, restoredGem)
        }
      }

      if (inventory.artifactSockets) {
        for (const [equipmentId, socketState] of Object.entries(inventory.artifactSockets)) {
          const detail = getArtifact(equipmentId)
          if (detail?.gemSocket) {
            detail.gemSocket.currentGem = socketState.currentGem ?? null
            detail.gemSocket.sameGem = socketState.sameGem ?? null
            detail.gemSocket.generatingGem = socketState.generatingGem ?? null
          }
        }
      }

      if (typeof inventory.spiritDust === 'number') {
        this.spiritDust = inventory.spiritDust
      }
      if (typeof inventory.refinedIron === 'number') {
        this.refinedIron = inventory.refinedIron
      }
      if (inventory.divineMaterials) {
        this.divineMaterials.clear()
        for (const [k, v] of Object.entries(inventory.divineMaterials)) {
          this.divineMaterials.set(k, v)
        }
      }
    } finally {
      this.isSuppressingSave--
    }
  }

  /**
   * 重置
   */
  reset(): void {
    this.isSuppressingSave++
    try {
      for (const inst of this.ownedEquipment.values()) {
        if (inst.type === 'artifact') {
          const detail = getArtifact(inst.equipmentId)
          if (detail?.gemSocket) {
            detail.gemSocket.currentGem = null
            detail.gemSocket.sameGem = null
            detail.gemSocket.generatingGem = null
          }
        }
      }
      this.ownedEquipment.clear()
      this.ownedGems.clear()
      this.equipmentCounter = 0
      this.spiritDust = 200
      this.refinedIron = 120
      this.divineMaterials = new Map([
        ['mat_wood_zhangjiao', 1],
        ['mat_metal_caoren', 1],
        ['mat_water_zhangliao', 1],
        ['mat_earth_dongzhuo', 1],
        ['mat_fire_lvbu', 1]
      ])
      this.initDefaultEquipment()
    } finally {
      this.isSuppressingSave--
    }
  }
}

export const DIVINE_FORGE_RECIPES = EquipmentManager.DIVINE_FORGE_RECIPES