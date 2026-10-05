import { EnemyEntity } from '@/entities/EnemyEntity'
import { HeroEntity } from '@/entities/HeroEntity'
import { DamageCalculator } from '../battle/DamageCalculator'
import { WeatherSystem } from '../battle/WeatherSystem'
import { SkillManager, SkillExecutor } from '../skill'
import { CharacterAttackFX } from '@/effects/CharacterAttackFX'
import { WeaponFX, WeaponType } from '@/effects/WeaponFX'
import { GemAttackEffectManager } from '@/effects/GemAttackEffectManager'
import { ArtifactResonanceEffectManager } from '@/effects/ArtifactResonanceEffectManager'
import { EquipmentManager } from '../equipment/EquipmentManager'
import { AugmentManager } from '../augment/AugmentManager'
import { MilitarySituationManager } from '../military/MilitarySituationManager'
import { ElementalReactionManager } from '../elemental/ElementalReactionManager'
import { getActiveSkill } from '@/data/skills'
import { getStarAttachmentRate, getStarAegisBreakBonus } from '@/data/heroes'
import { WuXing, WuXingGenerate, LeylineConnection } from '@/types'
import Phaser from 'phaser'

/** 160px 五行相生阵脉连线最大距离 */
export const LEYLINE_MAX_DISTANCE = 160

/**
 * 英雄战斗管理器
 * 管理英雄的攻击逻辑、四乘区伤害结算、160px 五行相生阵脉连线与技能触发
 */
export class HeroBattleManager {
  private deployedHeroes: Map<string, HeroEntity>
  private enemyManager: any  // EnemyManager类型，避免循环依赖
  private skillManager: SkillManager
  private skillExecutor: SkillExecutor
  private augmentManager?: AugmentManager
  private militarySituationManager?: MilitarySituationManager
  private weatherSystem?: WeatherSystem
  private zhaoyunCombos: Map<string, number> = new Map() // 赵云连击计数: targetId -> 命中次数
  private machaoStacks: Map<string, number> = new Map() // 马超战意层数: instanceId -> 层数 (至多5层)
  private guanyuAttackCounter: Map<string, number> = new Map() // 关羽3★特质每3刀必挂木毒计数
  private zhangfeiAttackCounter: Map<string, number> = new Map() // 张飞3★特质每4击震波计数

  // 攻击特效（零素材水墨/武器特效 + 音效）
  private scene: Phaser.Scene
  private attackFX: CharacterAttackFX
  private weaponFX: WeaponFX

  constructor(scene: Phaser.Scene, enemyManager: any) {
    this.scene = scene
    this.deployedHeroes = new Map()
    this.enemyManager = enemyManager
    this.skillManager = new SkillManager()
    this.skillExecutor = new SkillExecutor(scene, this.skillManager, enemyManager)
    this.attackFX = new CharacterAttackFX(scene)
    this.weaponFX = new WeaponFX(scene, this.attackFX)
    // 战斗中多英雄高频攻击：给"命中顿帧"做节流，避免一直卡顿
    this.weaponFX.setHitStopGap(650)
  }

  /** 武将 → 武器映射（后续新增武将/弓手在此扩展） */
  private getWeaponType(heroId: string): WeaponType {
    switch (heroId) {
      case 'hero_guanyu':
        return 'blade' // 青龙偃月刀
      case 'hero_zhangfei':
        return 'spear' // 丈八蛇矛（长矛表现）
      case 'hero_zhaoyun':
        return 'spear' // 龙胆亮银枪
      case 'hero_machao':
        return 'spear' // 虎头湛金枪
      case 'hero_huangzhong':
        return 'bow' // 射日万石弓
      default:
        return 'spear'
    }
  }

  /**
   * 添加英雄
   */
  addHero(heroEntity: HeroEntity): void {
    const deployedData = heroEntity.getDeployedData()
    const heroData = heroEntity.getHeroData()
    this.deployedHeroes.set(deployedData.instanceId, heroEntity)

    // 初始化英雄技能
    this.skillManager.initHeroSkills(
      heroData.passiveSkillId,
      heroData.activeSkillId
    )
  }

  /**
   * 移除英雄
   */
  removeHero(instanceId: string): HeroEntity | null {
    const heroEntity = this.deployedHeroes.get(instanceId)
    if (heroEntity) {
      this.deployedHeroes.delete(instanceId)
      return heroEntity
    }
    return null
  }

  /**
   * 计算场上所有 160px 五行相生阵脉连线
   * 当两名具有相生关系的武将部署距离 <= 160px 时，结成相生阵脉
   */
  public getLeylineConnections(): LeylineConnection[] {
    const heroes = Array.from(this.deployedHeroes.values())
    const connections: LeylineConnection[] = []

    for (let i = 0; i < heroes.length; i++) {
      for (let j = i + 1; j < heroes.length; j++) {
        const h1 = heroes[i]
        const h2 = heroes[j]
        const d1 = h1.getDeployedData()
        const d2 = h2.getDeployedData()
        const wx1 = h1.getHeroData().wuXing
        const wx2 = h2.getHeroData().wuXing

        const isGenerating = WuXingGenerate[wx1] === wx2 || WuXingGenerate[wx2] === wx1
        if (!isGenerating) continue

        const dist = Phaser.Math.Distance.Between(
          d1.position.x,
          d1.position.y,
          d2.position.x,
          d2.position.y
        )

        if (dist <= LEYLINE_MAX_DISTANCE) {
          connections.push({
            sourceHeroId: d1.instanceId,
            targetHeroId: d2.instanceId,
            sourceWuXing: wx1,
            targetWuXing: wx2,
            distance: dist
          })
        }
      }
    }

    return connections
  }

  /**
   * 获取指定英雄最近的 160px 相生阵脉搭档
   */
  public getHeroLeylinePartner(instanceId: string): HeroEntity | null {
    const hero = this.deployedHeroes.get(instanceId)
    if (!hero) return null

    const d1 = hero.getDeployedData()
    const wx1 = hero.getHeroData().wuXing

    let bestPartner: HeroEntity | null = null
    let bestDist = Infinity

    for (const [otherId, otherHero] of this.deployedHeroes.entries()) {
      if (otherId === instanceId) continue
      const wx2 = otherHero.getHeroData().wuXing
      if (WuXingGenerate[wx1] !== wx2 && WuXingGenerate[wx2] !== wx1) continue

      const d2 = otherHero.getDeployedData()
      const dist = Phaser.Math.Distance.Between(d1.position.x, d1.position.y, d2.position.x, d2.position.y)
      if (dist <= LEYLINE_MAX_DISTANCE && dist < bestDist) {
        bestDist = dist
        bestPartner = otherHero
      }
    }

    return bestPartner
  }

  /**
   * 判断敌军是否处于英雄与其 160px 相生阵脉搭档的双人射程交叠区内
   */
  public isEnemyInLeylineOverlap(hero: HeroEntity, partner: HeroEntity | null, target: EnemyEntity): boolean {
    if (!partner) return false
    const rangeBonus = this.augmentManager ? this.augmentManager.getAttackRangeBonus() : 0

    const pos1 = hero.getDeployedData().position
    const range1 = hero.getEffectiveStats().attackRange + rangeBonus
    const dist1 = Phaser.Math.Distance.Between(pos1.x, pos1.y, target.x, target.y)
    if (dist1 > range1) return false

    const pos2 = partner.getDeployedData().position
    const range2 = partner.getEffectiveStats().attackRange + rangeBonus
    const dist2 = Phaser.Math.Distance.Between(pos2.x, pos2.y, target.x, target.y)
    return dist2 <= range2
  }

  /**
   * 更新所有英雄的攻击和技能
   * @param deltaTime 时间增量（毫秒）
   * @param currentTime 当前时间（毫秒）
   * @returns 死亡的敌人列表
   */
  update(deltaTime: number, currentTime: number): EnemyEntity[] {
    const killedEnemies: EnemyEntity[] = []

    // 更新技能冷却
    this.skillManager.updateCooldowns(deltaTime)

    for (const heroEntity of this.deployedHeroes.values()) {
      // 更新技能冷却显示
      this.updateSkillCooldownDisplay(heroEntity)

      // 检查并触发主动技能（自动模式）
      this.checkAutoSkill(heroEntity)

      // 执行普攻
      const killed = this.checkAndAttack(heroEntity, currentTime)
      if (killed) {
        killedEnemies.push(killed)
      }
    }

    return killedEnemies
  }

  /**
   * 更新英雄技能冷却显示
   */
  private updateSkillCooldownDisplay(hero: HeroEntity): void {
    const heroData = hero.getHeroData()
    const activeSkillId = heroData.activeSkillId

    if (!activeSkillId) return

    const progress = this.skillManager.getCooldownProgress(activeSkillId)
    hero.updateSkillCooldownDisplay(progress)
  }

  /**
   * 检查主动技能智能自动触发
   * 规则：不面对空地施放；只有当范围内敌人数量 >= 2 或存在精英/首领时方自动开大
   */
  private checkAutoSkill(hero: HeroEntity): void {
    const heroData = hero.getHeroData()
    const activeSkillId = heroData.activeSkillId

    if (!activeSkillId) return

    const skillState = this.skillManager.getSkillState(activeSkillId)
    if (!skillState || !skillState.isAutoActive || !skillState.isReady) return

    const skillConfig = getActiveSkill(activeSkillId)
    if (!skillConfig) return

    const range = skillConfig.effect.range || 200
    const deployedData = hero.getDeployedData()
    const enemiesInRange: EnemyEntity[] = this.enemyManager.getEnemiesInRange(deployedData.position, range)
    if (!enemiesInRange || enemiesInRange.length === 0) return

    const hasHighThreat = enemiesInRange.some(e => {
      const type = e.getEnemyData().type
      return type === 'boss' || type === 'elite'
    })

    // 敌军稀少时保留技能，等待战机或玩家手动强令
    if (enemiesInRange.length < 2 && !hasHighThreat) {
      return
    }

    // 执行主动技能
    this.skillExecutor.executeSkill(
      activeSkillId,
      deployedData.position,
      hero
    )
  }

  /**
   * 玩家手动强制施放主动技能（快捷键 1/2/3 或点击武将）
   * @param heroIdentifier 英雄部署索引(0, 1, 2) 或 instanceId 或 heroId
   */
  public manualCastSkill(heroIdentifier: string | number): boolean {
    let heroEntity: HeroEntity | undefined
    if (typeof heroIdentifier === 'number') {
      const heroes = Array.from(this.deployedHeroes.values())
      heroEntity = heroes[heroIdentifier]
    } else {
      heroEntity = this.deployedHeroes.get(heroIdentifier) ||
        Array.from(this.deployedHeroes.values()).find(h => h.getHeroData().id === heroIdentifier)
    }
    if (!heroEntity) return false

    const heroData = heroEntity.getHeroData()
    const activeSkillId = heroData.activeSkillId
    if (!activeSkillId) return false

    const skillState = this.skillManager.getSkillState(activeSkillId)
    if (!skillState || !skillState.isReady) return false

    const deployedData = heroEntity.getDeployedData()
    const result = this.skillExecutor.executeSkill(activeSkillId, deployedData.position, heroEntity)
    return result !== null
  }

  public setAugmentManager(augmentManager: AugmentManager): void {
    this.augmentManager = augmentManager
  }

  public setMilitarySituationManager(militarySituationManager: MilitarySituationManager): void {
    this.militarySituationManager = militarySituationManager
  }

  public setWeatherSystem(weatherSystem: WeatherSystem): void {
    this.weatherSystem = weatherSystem
  }

  /**
   * 检查攻击条件并执行攻击
   */
  private checkAndAttack(hero: HeroEntity, currentTime: number): EnemyEntity | null {
    const deployedData = hero.getDeployedData()
    const stats = hero.getEffectiveStats()

    // 计算攻击间隔（考虑锦囊攻速加成 + 军情近战攻速加成）
    const speedBonus = this.augmentManager ? this.augmentManager.getAttackSpeedBonus() : 0
    let effectiveSpeed = stats.attackSpeed * (1 + speedBonus)
    if (this.militarySituationManager && stats.attackRange <= 150) {
      effectiveSpeed *= this.militarySituationManager.getMeleeAttackSpeedMultiplier()
    }
    const attackInterval = DamageCalculator.calculateAttackInterval(effectiveSpeed)

    // 检查是否可以攻击（冷却时间）
    if (currentTime - deployedData.lastAttackTime < attackInterval) {
      return null
    }

    // 选择目标
    const target = this.selectTarget(hero)
    if (!target) {
      return null
    }

    // 执行攻击
    const killed = this.executeAttack(hero, target)

    // 更新上次攻击时间
    hero.updateLastAttackTime(currentTime)

    return killed
  }

  /**
   * 选择攻击目标
   * 策略：优先攻击最近的敌人（考虑锦囊射程加成 + 军情远程射程加成）
   */
  private selectTarget(hero: HeroEntity): EnemyEntity | null {
    const deployedData = hero.getDeployedData()
    const stats = hero.getEffectiveStats()
    const rangeBonus = this.augmentManager ? this.augmentManager.getAttackRangeBonus() : 0
    let effectiveRange = stats.attackRange + rangeBonus
    if (this.militarySituationManager && stats.attackRange > 150) {
      effectiveRange *= this.militarySituationManager.getRangedRangeMultiplier()
    }

    return this.enemyManager.getNearestEnemy(deployedData.position, effectiveRange)
  }

  /**
   * 执行普攻（严格遵循四独立乘区公式 + 160px 相生阵脉连线 + 将星附着率）
   */
  private executeAttack(hero: HeroEntity, target: EnemyEntity): EnemyEntity | null {
    const heroData = hero.getHeroData()
    const stats = hero.getEffectiveStats()
    const targetData = target.getEnemyData()
    const deployedData = hero.getDeployedData()
    const reactionMgr = ElementalReactionManager.getInstance(this.scene, this.enemyManager)

    // 1. 攻击加成区 (Attack Bonus Bucket)
    const attackPercentBonus = this.augmentManager ? this.augmentManager.getAttackPercentBonus() : 0

    // 2. 增伤加成区 (Damage Increase Bucket: 天时加成 + 锦囊增伤 + 武将特质增伤)
    const weatherBonus = this.weatherSystem ? this.weatherSystem.getDamageIncreaseBonus(heroData.wuXing) : 0
    const augmentDmgIncrease = this.augmentManager ? this.augmentManager.getDamageIncreaseBonus() : 0
    let damageIncreaseBonus = weatherBonus + augmentDmgIncrease

    // 3. 易伤加成区 (Vulnerability Bucket: Boss破壁瘫痪易伤 + 锦囊易伤)
    const enemyVulnerability = typeof target.isVulnerabilityBroken === 'function' && target.isVulnerabilityBroken() ? 0.50 : 0
    const augmentVulnerability = this.augmentManager ? this.augmentManager.getVulnerabilityBonus() : 0
    const vulnerabilityBonus = enemyVulnerability + augmentVulnerability

    // 4. 暴击与暴伤加成 (Crit Bucket)
    let critRate = (stats.critRate ?? 0.10) + (this.augmentManager ? this.augmentManager.getCritRateBonus() : 0)
    let critDamage = (stats.critDamage ?? 0.50) + (this.augmentManager ? this.augmentManager.getCritDamageBonus() : 0)

    // 五行生克表现标识
    const counterBonus = this.augmentManager ? this.augmentManager.getCounterMultiplierBonus() : 0
    const multiplier = DamageCalculator.getCounterMultiplier(heroData.wuXing, targetData.wuXing) + counterBonus
    const isCounter = multiplier > 1.05
    const isResisted = multiplier < 0.95
    damageIncreaseBonus += (multiplier - 1.0)

    // 张飞被动【狂烈】：攻击生命低于 50% 或带有【土·重】的敌人，增伤区 +25%；3★特质每4次普攻触发范围【土·重】
    let guaranteedElementAttach = false
    if (heroData.id === 'hero_zhangfei') {
      const isLowHp = targetData.currentHealth / targetData.maxHealth < 0.5
      const isHeavy = reactionMgr.hasStatus(targetData.id, 'heavy')
      if (isLowHp || isHeavy) {
        damageIncreaseBonus += 0.25
        this.attackFX.damageText({ x: target.x, y: target.y - 20 }, '【狂烈】', { color: '#ff7043' })
      }
      if ((heroData.star ?? 1) >= 3) {
        const count = (this.zhangfeiAttackCounter.get(deployedData.instanceId) || 0) + 1
        if (count >= 4) {
          this.zhangfeiAttackCounter.set(deployedData.instanceId, 0)
          guaranteedElementAttach = true
          target.applyHeavy(2500)
        } else {
          this.zhangfeiAttackCounter.set(deployedData.instanceId, count)
        }
      }
    }

    // 关羽 3★ 特质【春秋刀意】：每第 3 刀必挂 1 层【木·毒】
    if (heroData.id === 'hero_guanyu' && (heroData.star ?? 1) >= 3) {
      const count = (this.guanyuAttackCounter.get(deployedData.instanceId) || 0) + 1
      if (count >= 3) {
        this.guanyuAttackCounter.set(deployedData.instanceId, 0)
        guaranteedElementAttach = true
      } else {
        this.guanyuAttackCounter.set(deployedData.instanceId, count)
      }
    }

    // 赵云被动【龙胆】：每连续普攻同一目标 3 次，第 4 次触发三连突刺并必挂【水·湿】
    if (heroData.id === 'hero_zhaoyun') {
      const targetId = targetData.id
      const currentHits = (this.zhaoyunCombos.get(targetId) || 0) + 1
      if (currentHits >= 4) {
        this.zhaoyunCombos.delete(targetId)
        guaranteedElementAttach = true
        damageIncreaseBonus += 0.35
        target.applySlow(0.35, 2500)
        this.attackFX.damageText({ x: target.x, y: target.y - 25 }, '【龙胆突刺】', { color: '#00e5ff' })
        target.hitShake(5)
      } else {
        this.zhaoyunCombos.set(targetId, currentHits)
      }
    }

    // 黄忠被动【百步穿杨】：攻击距离越远增伤越高（最远 +35%）；对处于【火·灼】的敌人暴击率大幅提升
    if (heroData.id === 'hero_huangzhong') {
      const dist = Phaser.Math.Distance.Between(deployedData.position.x, deployedData.position.y, target.x, target.y)
      const rangeBonus = this.augmentManager ? this.augmentManager.getAttackRangeBonus() : 0
      const maxRange = Math.max(1, stats.attackRange + rangeBonus)
      const distanceRatio = Math.min(1, Math.max(0, dist / maxRange))
      damageIncreaseBonus += distanceRatio * 0.35

      const isBurning = reactionMgr.hasStatus(targetData.id, 'burn')
      if (isBurning) {
        critRate += 0.35
      }
    }

    // 马超被动【西凉铁骑】：根据战意增伤（每层 +6%）；对带有【土·重】目标暴击率与增伤提升
    if (heroData.id === 'hero_machao') {
      const stacks = this.machaoStacks.get(deployedData.instanceId) || 0
      if (stacks > 0) {
        damageIncreaseBonus += stacks * 0.06
      }
      const isHeavy = reactionMgr.hasStatus(targetData.id, 'heavy')
      if (isHeavy) {
        damageIncreaseBonus += 0.20
        if ((heroData.star ?? 1) >= 3) {
          critRate += 0.20
        }
        this.attackFX.damageText({ x: target.x, y: target.y - 20 }, '【金戈破甲】', { color: '#fbbf24' })
      }
    }

    // 四独立乘区结算（含敌方防御/韧性/刚毅 ≥40% 下限保底）
    const fourBucketResult = DamageCalculator.calculateFourBucketDamage({
      baseValue: stats.attack,
      attackBoostSum: attackPercentBonus,
      damageIncreaseSum: damageIncreaseBonus,
      vulnerabilitySum: vulnerabilityBonus,
      critRate,
      critDamage,
      enemyInitialDefense: targetData.defense ?? 0,
      defenseReductionRatio: typeof target.getDefenseReductionRatio === 'function' ? target.getDefenseReductionRatio() : 0,
      enemyInitialTenacity: targetData.tenacity ?? 0,
      tenacityReductionRatio: typeof target.getTenacityReductionRatio === 'function' ? target.getTenacityReductionRatio() : 0,
      enemyInitialFortitude: targetData.fortitude ?? 0,
      fortitudeReductionRatio: typeof target.getFortitudeReductionRatio === 'function' ? target.getFortitudeReductionRatio() : 0
    })

    const damage = fourBucketResult.finalDamage

    // 应用伤害
    const actualDamage = target.takeDamage(damage)

    // 若暴击且敌军处于【土·重】或【熔岩·焦土】，触发【负重内震】额外伤害
    if (fourBucketResult.isCrit && typeof target.triggerHeavyCritShock === 'function') {
      const shockDmg = target.triggerHeavyCritShock(actualDamage)
      if (shockDmg > 0) {
        this.attackFX.damageText({ x: target.x, y: target.y - 26 }, `【负重内震】-${shockDmg}`, {
          color: '#ffb300',
          crit: true
        })
      }
    }

    // 播放攻击动画与特效
    hero.playAttackAnimation()
    this.playWeaponFX(hero, target, actualDamage, isCounter, isResisted, fourBucketResult.isCrit)

    // 计算 160px 相生阵脉搭档与交叠区加成
    const leylinePartner = this.getHeroLeylinePartner(deployedData.instanceId)
    const inLeylineOverlap = this.isEnemyInLeylineOverlap(hero, leylinePartner, target)

    // 按武将星级【将星命盘 (1★~5★)】判定普攻五行附着率 (25% -> 80%)
    const attachRate = guaranteedElementAttach ? 1.0 : getStarAttachmentRate(heroData.star ?? 1)
    if (Math.random() <= attachRate) {
      reactionMgr.handleAttack(
        target,
        heroData.wuXing,
        Math.floor(stats.attack * (1 + attackPercentBonus)),
        {
          attackerHeroId: heroData.id,
          critRate,
          critDamage,
          inLeylineOverlap,
          leylinePartnerWuXing: leylinePartner ? leylinePartner.getHeroData().wuXing : undefined,
          weatherDamageBonus: weatherBonus,
          vulnerabilityBonus,
          aegisBreakBonus: getStarAegisBreakBonus(heroData.star ?? 1)
        }
      )
    }

    // 英雄专属锦囊机制
    if (this.augmentManager) {
      if (this.augmentManager.hasSpecialAugment('aug_guanyu_yanyu') && heroData.id === 'hero_guanyu') {
        reactionMgr.handleAttack(
          target,
          'wood',
          Math.floor(stats.attack * (1 + attackPercentBonus) * 0.5)
        )
      } else if (this.augmentManager.hasSpecialAugment('aug_zhangfei_roar') && heroData.id === 'hero_zhangfei') {
        target.applyHeavy(3000)
        target.hitShake(8)
      } else if (this.augmentManager.hasSpecialAugment('aug_zhaoyun_dragon') && heroData.id === 'hero_zhaoyun') {
        if (Math.random() < 0.25) {
          const fx = new CharacterAttackFX(this.scene)
          fx.damageText({ x: target.x, y: target.y }, Math.floor(damage * 1.35), { color: '#00e5ff' })
          target.takeDamage(Math.floor(damage * 1.35))
        }
      } else if (this.augmentManager.hasSpecialAugment('aug_huangzhong_bow') && heroData.id === 'hero_huangzhong') {
        const hasWood = reactionMgr.hasStatus(targetData.id, 'parasite')
        if (hasWood) {
          const burnDmg = Math.floor(stats.attack * 0.6)
          target.takeDamage(burnDmg)
          this.attackFX.damageText({ x: target.x, y: target.y - 28 }, '【定军烈焰爆破】', { color: '#f97316' })
          target.hitShake(6)
        }
        reactionMgr.handleAttack(
          target,
          'fire',
          Math.floor(stats.attack * (1 + attackPercentBonus) * 0.4)
        )
      } else if (this.augmentManager.hasSpecialAugment('aug_machao_cavalry') && heroData.id === 'hero_machao') {
        const hasHeavy = reactionMgr.hasStatus(targetData.id, 'heavy')
        if (hasHeavy) {
          const shardDmg = Math.floor(stats.attack * 0.7)
          target.takeDamage(shardDmg)
          this.attackFX.damageText({ x: target.x, y: target.y - 25 }, '【神威飞刃】', { color: '#eab308' })
          reactionMgr.handleAttack(
            target,
            'metal',
            Math.floor(stats.attack * (1 + attackPercentBonus) * 0.5)
          )
        }
      }
    }

    // 触发专属神兵器灵共鸣与五行相生机制
    this.triggerArtifactResonanceEffects(hero, target)

    // 触发被动技能（攻击时触发）
    this.triggerPassiveSkill(hero, target)

    // 检查是否死亡
    if (targetData.currentHealth <= 0) {
      target.die()

      // 关羽被动【武圣】：击杀带有木系寄生或处于五行元素反应状态的敌军，使【青龙偃月斩】冷却缩减 1 秒
      if (heroData.id === 'hero_guanyu') {
        const hasWoodStatus = reactionMgr.hasStatus(targetData.id, 'parasite')
        if (hasWoodStatus) {
          this.skillManager.reduceCooldown('skill_active_guanyu', 1000)
          this.attackFX.damageText({ x: hero.x, y: hero.y - 30 }, '【武圣·兵法速决】', { color: '#4caf50' })
        }
      }

      // 马超被动【西凉骠骑】：击杀敌人后叠加西凉战意（至多 5 层）
      if (heroData.id === 'hero_machao') {
        const curStacks = this.machaoStacks.get(deployedData.instanceId) || 0
        if (curStacks < 5) {
          this.machaoStacks.set(deployedData.instanceId, curStacks + 1)
          this.attackFX.damageText({ x: hero.x, y: hero.y - 30 }, `【战意+${curStacks + 1}】`, { color: '#fbbf24' })
        }
      }

      return target
    }

    return null
  }

  /**
   * 触发专属神兵器灵共鸣与五行相生隐藏机制
   */
  private triggerArtifactResonanceEffects(hero: HeroEntity, target: EnemyEntity): void {
    if (!target.active || target.getEnemyData().currentHealth <= 0) return

    const heroData = hero.getHeroData()
    const resonance = EquipmentManager.getInstance().getHeroResonance(heroData.id, heroData.name)
    if (resonance.isExclusive && resonance.hasResonance) {
      ArtifactResonanceEffectManager.getInstance(this.scene).triggerResonanceAttack(
        hero,
        target,
        resonance,
        this.enemyManager,
        this.skillManager
      )
    }
  }

  /**
   * 触发5级神品宝石专属终极攻击特效（二期 Backlog 保留接口）
   */
  public triggerGemAttackEffects(hero: HeroEntity, target: EnemyEntity): void {
    if (!target.active || target.getEnemyData().currentHealth <= 0) return

    const heroData = hero.getHeroData()
    const gem = EquipmentManager.getInstance().getHeroLevel5Gem(heroData.id)

    if (gem && gem.level === 5) {
      GemAttackEffectManager.getInstance(this.scene).triggerLevel5GemEffect(
        target,
        gem.wuXing,
        hero,
        this.enemyManager
      )
    }
  }

  /**
   * 播放攻击特效（打击感全家桶）
   */
  private playWeaponFX(
    hero: HeroEntity,
    target: EnemyEntity,
    actualDamage: number,
    isCounter: boolean = false,
    isResisted: boolean = false,
    isCritical: boolean = false
  ): void {
    const weapon = this.getWeaponType(hero.getHeroData().id)

    // 两个实体都是直接加入场景的 Container，x/y 即世界坐标
    const from = CharacterAttackFX.getWorldXY(hero)
    const to = CharacterAttackFX.getWorldXY(target)

    // 英雄前冲一点（弓手不前冲，近战大刀抡砍冲得更深）
    if (weapon !== 'bow') {
      this.attackFX.lunge(hero, to, weapon === 'blade' ? 16 : 12)
    }

    const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)

    // 武器够到敌人的瞬间：飘伤害 + 敌人抖动
    const onHit = () => {
      if (target.active) target.hitShake()
      this.attackFX.damageText(to, actualDamage, {
        crit: isCritical || actualDamage >= 80,
        counter: isCounter,
        resisted: isResisted
      })
    }

    if (weapon === 'blade') {
      const advance = Math.max(0, dist - 132)
      this.weaponFX.bladeSlash(from, to, onHit, advance)
    } else if (weapon === 'bow') {
      this.weaponFX.bowShot(from, to, onHit)
    } else {
      this.weaponFX.spearThrustTo(from, to, onHit)
    }
  }

  /**
   * 触发被动技能
   */
  private triggerPassiveSkill(hero: HeroEntity, target: EnemyEntity): void {
    const heroData = hero.getHeroData()
    const passiveSkillId = heroData.passiveSkillId

    if (!passiveSkillId) return

    const skillState = this.skillManager.getSkillState(passiveSkillId)
    if (!skillState || !skillState.isReady) return

    // 关羽武圣：20%概率触发横扫
    if (passiveSkillId === 'skill_passive_guanyu') {
      if (Math.random() < 0.20) {
        const deployedData = hero.getDeployedData()
        this.skillExecutor.executeSkill(
          passiveSkillId,
          deployedData.position,
          hero
        )
      }
    }
  }

  /**
   * 获取所有部署的英雄
   */
  getDeployedHeroes(): HeroEntity[] {
    return Array.from(this.deployedHeroes.values())
  }

  /**
   * 获取英雄数量
   */
  getHeroCount(): number {
    return this.deployedHeroes.size
  }

  /**
   * 重置所有英雄至基准变换（波次交替或防御阵型校验）
   */
  resetAllHeroTransforms(): void {
    for (const hero of this.deployedHeroes.values()) {
      hero.resetToBaseTransform()
    }
  }

  /**
   * 重置
   */
  reset(): void {
    for (const heroEntity of this.deployedHeroes.values()) {
      heroEntity.destroy()
    }
    this.deployedHeroes.clear()
    this.zhaoyunCombos.clear()
    this.machaoStacks.clear()
    this.guanyuAttackCounter.clear()
    this.zhangfeiAttackCounter.clear()
  }
}