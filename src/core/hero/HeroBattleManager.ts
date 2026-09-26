import { EnemyEntity } from '@/entities/EnemyEntity'
import { HeroEntity } from '@/entities/HeroEntity'
import { DamageCalculator } from '../battle/DamageCalculator'
import { ATTACK_CONFIG } from '@/config/constants'
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
import Phaser from 'phaser'

/**
 * 英雄战斗管理器
 * 管理英雄的攻击逻辑和技能触发
 */
export class HeroBattleManager {
  private deployedHeroes: Map<string, HeroEntity>
  private enemyManager: any  // EnemyManager类型，避免循环依赖
  private skillManager: SkillManager
  private skillExecutor: SkillExecutor
  private augmentManager?: AugmentManager
  private militarySituationManager?: MilitarySituationManager
  private zhaoyunCombos: Map<string, number> = new Map() // 赵云连击计数: targetId -> 命中次数
  private machaoStacks: Map<string, number> = new Map() // 马超战意层数: instanceId -> 层数 (至多5层)

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
   * 执行攻击
   */
  private executeAttack(hero: HeroEntity, target: EnemyEntity): EnemyEntity | null {
    const heroData = hero.getHeroData()
    const stats = hero.getEffectiveStats()
    const targetData = target.getEnemyData()
    const deployedData = hero.getDeployedData()

    // 计算锦囊攻击力与相克加成
    const attackPercentBonus = this.augmentManager ? this.augmentManager.getAttackPercentBonus() : 0
    const counterBonus = this.augmentManager ? this.augmentManager.getCounterMultiplierBonus() : 0

    // 计算伤害与五行生克倍率
    const multiplier = DamageCalculator.getCounterMultiplier(heroData.wuXing, targetData.wuXing) + counterBonus
    const isCounter = multiplier > 1.05
    const isResisted = multiplier < 0.95

    let damage = DamageCalculator.calculateDamage(
      stats,
      heroData.wuXing,
      targetData.wuXing,
      counterBonus,
      attackPercentBonus
    )

    // 军情【烽燧照夜】：远程破甲加成
    if (this.militarySituationManager && stats.attackRange > 150) {
      const pen = this.militarySituationManager.getRangedDefensePenetration()
      if (pen > 0) {
        damage = Math.floor(damage * (1 + pen))
      }
    }

    // 军情【借雾设伏】：近战暴击率加成
    if (this.militarySituationManager && stats.attackRange <= 150) {
      const critBonus = this.militarySituationManager.getMeleeCritChanceBonus()
      if (critBonus > 0 && Math.random() < critBonus) {
        damage = Math.floor(damage * 1.5)
      }
    }

    // 军情【引水灌城】：水系伤害加成
    if (this.militarySituationManager && heroData.wuXing === 'water') {
      const waterMult = this.militarySituationManager.getWaterDamageMultiplier()
      if (waterMult > 1) {
        damage = Math.floor(damage * waterMult)
      }
    }

    // 军情【雷动九天】：金系普攻天雷击退
    if (this.militarySituationManager && heroData.wuXing === 'metal') {
      const knockChance = this.militarySituationManager.getThunderKnockbackChance()
      if (knockChance > 0 && Math.random() < knockChance) {
        target.applyStun(1000)
        target.hitShake(6)
        this.attackFX.damageText({ x: target.x, y: target.y - 15 }, '【金雷击退】', { color: '#ffd54f' })
      }
    }

    // 张飞被动【狂烈】：攻击生命低于 50% 或带有【土·破衡】的敌人，伤害提升 25%
    if (heroData.id === 'hero_zhangfei') {
      const isLowHp = targetData.currentHealth / targetData.maxHealth < 0.5
      const isHeavy = ElementalReactionManager.getInstance(this.scene, this.enemyManager).hasStatus(targetData.id, 'heavy')
      if (isLowHp || isHeavy) {
        damage = Math.floor(damage * 1.25)
        this.attackFX.damageText({ x: target.x, y: target.y - 20 }, '【狂烈】', { color: '#ff7043' })
      }
    }

    // 赵云被动【龙胆】：每连续普攻同一目标 3 次，第 4 次触发三连突刺并刷新【潮湿】
    if (heroData.id === 'hero_zhaoyun') {
      const targetId = targetData.id
      const currentHits = (this.zhaoyunCombos.get(targetId) || 0) + 1
      if (currentHits >= 4) {
        this.zhaoyunCombos.delete(targetId)
        const burstDmg = Math.max(1, Math.floor(damage * 0.5))
        target.takeDamage(burstDmg)
        target.takeDamage(burstDmg)
        target.takeDamage(burstDmg)
        target.applySlow(0.35, 4000)
        ElementalReactionManager.getInstance(this.scene, this.enemyManager).handleAttack(target, 'water', Math.floor(stats.attack * 0.5))
        this.attackFX.damageText({ x: target.x, y: target.y - 25 }, '【龙胆三连击】', { color: '#00e5ff' })
        target.hitShake(5)
      } else {
        this.zhaoyunCombos.set(targetId, currentHits)
      }
    }

    // 黄忠被动【百步穿杨】：攻击距离自身越远的目标伤害越高（最远距离增伤达 35%）；对处于【灼烧】的敌人暴击
    if (heroData.id === 'hero_huangzhong') {
      const dist = Phaser.Math.Distance.Between(deployedData.position.x, deployedData.position.y, target.x, target.y)
      const rangeBonus = this.augmentManager ? this.augmentManager.getAttackRangeBonus() : 0
      const maxRange = Math.max(1, stats.attackRange + rangeBonus)
      const distanceRatio = Math.min(1, Math.max(0, dist / maxRange))
      const distBonus = distanceRatio * 0.35
      damage = Math.floor(damage * (1 + distBonus))

      const isBurning = ElementalReactionManager.getInstance(this.scene, this.enemyManager).hasStatus(targetData.id, 'burn')
      if (isBurning && Math.random() < 0.5) {
        damage = Math.floor(damage * 1.5)
        this.attackFX.damageText({ x: target.x, y: target.y - 20 }, '【百步暴击】', { color: '#ef4444' })
      }
    }

    // 马超被动【西凉骠骑】：根据当前叠加战意增伤（每层 6%）
    if (heroData.id === 'hero_machao') {
      const stacks = this.machaoStacks.get(deployedData.instanceId) || 0
      if (stacks > 0) {
        damage = Math.floor(damage * (1 + stacks * 0.06))
      }
      // 破衡联动
      const isHeavy = ElementalReactionManager.getInstance(this.scene, this.enemyManager).hasStatus(targetData.id, 'heavy')
      if (isHeavy) {
        damage = Math.floor(damage * 1.2)
        this.attackFX.damageText({ x: target.x, y: target.y - 20 }, '【金戈破甲】', { color: '#fbbf24' })
      }
    }

    // 应用伤害
    const actualDamage = target.takeDamage(damage)

    // 播放攻击动画
    hero.playAttackAnimation()

    // 播放武器特效（冲锋 → 挥砍/前刺 → 飘字/受击抖动/命中顿帧/音效）
    this.playWeaponFX(hero, target, actualDamage, isCounter, isResisted)

    // 触发五行元素相生相克连锁反应
    ElementalReactionManager.getInstance(this.scene, this.enemyManager).handleAttack(
      target,
      heroData.wuXing,
      Math.floor(stats.attack * (1 + attackPercentBonus))
    )

    // 英雄专属锦囊机制
    if (this.augmentManager) {
      if (this.augmentManager.hasSpecialAugment('aug_guanyu_yanyu') && heroData.id === 'hero_guanyu') {
        // 关羽威震华夏：附带木系滋养
        ElementalReactionManager.getInstance(this.scene, this.enemyManager).handleAttack(
          target,
          'wood',
          Math.floor(stats.attack * (1 + attackPercentBonus) * 0.5)
        )
      } else if (this.augmentManager.hasSpecialAugment('aug_zhangfei_roar') && heroData.id === 'hero_zhangfei') {
        target.applyStun(1500)
        target.hitShake(8)
      } else if (this.augmentManager.hasSpecialAugment('aug_zhaoyun_dragon') && heroData.id === 'hero_zhaoyun') {
        if (Math.random() < 0.25) {
          const fx = new CharacterAttackFX(this.scene)
          fx.damageText({ x: target.x, y: target.y }, Math.floor(damage * 1.5), { color: '#00e5ff' })
          target.takeDamage(Math.floor(damage * 1.5))
        }
      } else if (this.augmentManager.hasSpecialAugment('aug_huangzhong_bow') && heroData.id === 'hero_huangzhong') {
        // 黄忠定军扬威：普攻必定附带【火·灼烧】；对处于【木·寄生】的敌军造成 60% 额外烈焰爆燃
        const hasWood = ElementalReactionManager.getInstance(this.scene, this.enemyManager).hasStatus(targetData.id, 'parasite')
        if (hasWood) {
          const burnDmg = Math.floor(stats.attack * 0.6)
          target.takeDamage(burnDmg)
          this.attackFX.damageText({ x: target.x, y: target.y - 28 }, '【定军烈焰爆破】', { color: '#f97316' })
          target.hitShake(6)
        }
        ElementalReactionManager.getInstance(this.scene, this.enemyManager).handleAttack(
          target,
          'fire',
          Math.floor(stats.attack * (1 + attackPercentBonus) * 0.4)
        )
      } else if (this.augmentManager.hasSpecialAugment('aug_machao_cavalry') && heroData.id === 'hero_machao') {
        // 马超神威天将：对处于【土·破衡】的敌人必定触发【土生金·淬刃】散射飞刃
        const hasHeavy = ElementalReactionManager.getInstance(this.scene, this.enemyManager).hasStatus(targetData.id, 'heavy')
        if (hasHeavy) {
          const shardDmg = Math.floor(stats.attack * 0.7)
          target.takeDamage(shardDmg)
          this.attackFX.damageText({ x: target.x, y: target.y - 25 }, '【神威飞刃】', { color: '#eab308' })
          ElementalReactionManager.getInstance(this.scene, this.enemyManager).handleAttack(
            target,
            'metal',
            Math.floor(stats.attack * (1 + attackPercentBonus) * 0.5)
          )
        }
      }
    }

    // 触发专属神兵器灵共鸣与五行相生隐藏机制
    this.triggerArtifactResonanceEffects(hero, target)

    // 触发5级宝石终极特效（破甲、中毒、冰冻、灼烧与红莲殉爆、眩晕）
    this.triggerGemAttackEffects(hero, target)

    // 触发被动技能（攻击时触发）
    this.triggerPassiveSkill(hero, target)

    // 检查是否死亡
    if (targetData.currentHealth <= 0) {
      target.die()

      // 关羽被动【武圣】：击杀带有木系寄生或处于五行元素反应状态的敌军，使【青龙偃月斩】冷却缩减 1 秒
      if (heroData.id === 'hero_guanyu') {
        const hasWoodStatus = ElementalReactionManager.getInstance(this.scene, this.enemyManager).hasStatus(targetData.id, 'parasite')
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
   * 触发5级神品宝石专属终极攻击特效
   */
  private triggerGemAttackEffects(hero: HeroEntity, target: EnemyEntity): void {
    if (!target.active || target.getEnemyData().currentHealth <= 0) return

    const heroData = hero.getHeroData()
    // 获取武将当前装备的神器上镶嵌的5级宝石
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
    isResisted: boolean = false
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
        crit: actualDamage >= 80,
        counter: isCounter,
        resisted: isResisted
      })
    }

    if (weapon === 'blade') {
      // 青龙偃月刀：刀身约 132 长，把挥砍支点送到"刀尖刚好够到敌人"的位置
      const advance = Math.max(0, dist - 132)
      this.weaponFX.bladeSlash(from, to, onHit, advance)
    } else if (weapon === 'bow') {
      // 黄忠射日弓：拉弓放箭，箭矢飞掠后命中
      this.weaponFX.bowShot(from, to, onHit)
    } else {
      // 长矛：枪尖真正扎到敌人身上
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

    // 张飞猛将、赵云龙胆：永久buff，不需要触发
    // buff效果已在HeroEntity.getEffectiveStats()中应用
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
  }
}