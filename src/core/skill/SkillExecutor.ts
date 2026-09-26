import { Scene } from 'phaser'
import { SkillConfig, SkillEffect, Point, WuXing } from '@/types'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { HeroEntity } from '@/entities/HeroEntity'
import { SkillManager } from './SkillManager'
import { getSkill } from '@/data/skills'
import { InkColor, InkText, inkText } from '@/ui/InkTheme'
import { DamageCalculator } from '../battle/DamageCalculator'
import { ElementalReactionManager } from '../elemental/ElementalReactionManager'
import { CharacterAttackFX } from '@/effects/CharacterAttackFX'
import { SoundFX } from '@/effects/SoundFX'

/**
 * 技能效果执行结果
 */
export interface SkillExecutionResult {
  skillId: string
  skillName: string
  effectType: string
  damageDealt: number
  targetsHit: number
  killedEnemies: EnemyEntity[]
}

/**
 * 技能执行器
 * 负责执行英雄主动/被动技能，按攻击力百分比加成计算伤害并联动五行反应
 */
export class SkillExecutor {
  private scene: Scene
  private skillManager: SkillManager
  private enemyManager: any
  private attackFX: CharacterAttackFX

  constructor(scene: Scene, skillManager: SkillManager, enemyManager: any) {
    this.scene = scene
    this.skillManager = skillManager
    this.enemyManager = enemyManager
    this.attackFX = new CharacterAttackFX(scene)
  }

  /**
   * 执行技能
   * @param skillId 技能ID
   * @param casterPos 施法者位置
   * @param hero 施法英雄
   * @param targetPos 目标位置（可选）
   * @returns 执行结果
   */
  executeSkill(
    skillId: string,
    casterPos: Point,
    hero: HeroEntity,
    targetPos?: Point
  ): SkillExecutionResult | null {
    const skill = getSkill(skillId)
    if (!skill) {
      console.warn(`技能不存在: ${skillId}`)
      return null
    }

    // 检查冷却
    if (!this.skillManager.canUseSkill(skillId)) {
      return null
    }

    // 触发冷却
    this.skillManager.triggerCooldown(skillId)

    // 主动大招播放特写横幅与音效
    if (skill.type === 'active') {
      this.showBaojiImage(hero.getHeroData().id, skill.name)
      SoundFX.gong(0.3)
    }

    // 根据效果类型执行
    const result = this.executeEffect(skill, skill.effect, casterPos, hero, targetPos)

    // 播放技能特效
    this.playSkillEffect(skill, casterPos, hero, targetPos)

    return result
  }

  /**
   * 执行技能效果
   */
  private executeEffect(
    skill: SkillConfig,
    effect: SkillEffect,
    casterPos: Point,
    hero: HeroEntity,
    targetPos?: Point
  ): SkillExecutionResult {
    const result: SkillExecutionResult = {
      skillId: skill.id,
      skillName: skill.name,
      effectType: effect.type,
      damageDealt: 0,
      targetsHit: 0,
      killedEnemies: []
    }

    switch (effect.type) {
      case 'damage':
        this.executeDamage(effect, casterPos, hero, result)
        break

      case 'damageArea':
        this.executeDamageArea(effect, casterPos, hero, result)
        break

      case 'buff':
        this.executeBuff(effect, hero)
        result.targetsHit = 1
        break

      case 'stun':
        this.executeStun(effect, casterPos, result)
        break

      case 'slow':
        this.executeSlow(effect, casterPos, result)
        break

      default:
        console.warn(`未实现的技能效果类型: ${effect.type}`)
    }

    return result
  }

  /**
   * 执行单体或多目标穿梭伤害（如赵云【惊鸿穿云】）
   */
  private executeDamage(
    effect: SkillEffect,
    casterPos: Point,
    hero: HeroEntity,
    result: SkillExecutionResult
  ): void {
    if (!effect.range) return

    const stats = hero.getEffectiveStats()
    const heroData = hero.getHeroData()
    const element: WuXing = effect.element || heroData.wuXing
    const multiplier = effect.attackMultiplier || 1.0
    const skillBaseAtk = Math.floor(stats.attack * multiplier)

    const maxTargets = effect.maxTargets || 1
    const candidateEnemies = this.enemyManager.getEnemiesInRange(casterPos, effect.range)
    if (!candidateEnemies || candidateEnemies.length === 0) return

    // 按距离升序选取最多 maxTargets 个目标
    const sortedEnemies = candidateEnemies.slice(0, maxTargets)

    let lastPos = casterPos

    for (const target of sortedEnemies) {
      const targetData = target.getEnemyData()
      if (!targetData.isActive || targetData.currentHealth <= 0) continue

      // 五行相克倍率
      const counterMultiplier = DamageCalculator.getCounterMultiplier(element, targetData.wuXing)
      const rawDamage = Math.max(1, Math.floor(skillBaseAtk * counterMultiplier))

      const dealt = target.takeDamage(rawDamage)
      result.damageDealt += dealt
      result.targetsHit++

      // 联动五行元素相生相克反应
      ElementalReactionManager.getInstance(this.scene, this.enemyManager).handleAttack(
        target,
        element,
        skillBaseAtk
      )

      // 附带减速状态（若配置）
      if (effect.slowRatio && effect.statusDuration) {
        target.applySlow(effect.slowRatio, effect.statusDuration)
      }

      // 穿梭打击特效轨迹
      this.playStrikeEffect(lastPos, { x: target.x, y: target.y }, heroData.name)
      lastPos = { x: target.x, y: target.y }

      this.attackFX.damageText({ x: target.x, y: target.y - 15 }, `【${effect.element ? '水云刺' : '绝技'}】${dealt}`, {
        color: '#00b0ff'
      })

      if (target.getEnemyData().currentHealth <= 0) {
        target.die()
        result.killedEnemies.push(target)
      }
    }
  }

  /**
   * 执行大范围五行伤害（如关羽【青龙偃月斩】、张飞【当阳断桥喝】）
   */
  private executeDamageArea(
    effect: SkillEffect,
    centerPos: Point,
    hero: HeroEntity,
    result: SkillExecutionResult
  ): void {
    if (!effect.range) return

    const stats = hero.getEffectiveStats()
    const heroData = hero.getHeroData()
    const element: WuXing = effect.element || heroData.wuXing
    const multiplier = effect.attackMultiplier || 1.0
    const skillBaseAtk = Math.floor(stats.attack * multiplier)

    const enemies = this.enemyManager.getEnemiesInRange(centerPos, effect.range)
    if (!enemies || enemies.length === 0) return

    const totalPathLen = this.enemyManager.pathFinder?.getTotalLength() || 1200

    for (const enemy of enemies) {
      const targetData = enemy.getEnemyData()
      if (!targetData.isActive || targetData.currentHealth <= 0) continue

      // 五行相克倍率
      const counterMultiplier = DamageCalculator.getCounterMultiplier(element, targetData.wuXing)
      const rawDamage = Math.max(1, Math.floor(skillBaseAtk * counterMultiplier))

      const dealt = enemy.takeDamage(rawDamage)
      result.damageDealt += dealt
      result.targetsHit++

      // 击退判定（如张飞怒吼）
      if (effect.knockbackDistance && effect.knockbackDistance > 0) {
        if (enemy.getEnemyData().pathProgress !== undefined) {
          enemy.getEnemyData().pathProgress = Math.max(
            0,
            enemy.getEnemyData().pathProgress - (effect.knockbackDistance / totalPathLen)
          )
          const newPos = this.enemyManager.pathFinder?.getPosition(enemy.getEnemyData().pathProgress)
          if (newPos) {
            enemy.updatePosition(newPos)
          }
        }
        enemy.hitShake(8)
      }

      // 眩晕判定
      if (effect.stunDuration && effect.stunDuration > 0) {
        enemy.applyStun(effect.stunDuration)
      }

      // 联动五行元素相生相克反应（附着元素、引爆滋养或燎原）
      ElementalReactionManager.getInstance(this.scene, this.enemyManager).handleAttack(
        enemy,
        element,
        skillBaseAtk
      )

      const textColor = element === 'wood' ? '#2e7d32' : (element === 'fire' ? '#e65100' : '#d50000')
      this.attackFX.damageText({ x: enemy.x, y: enemy.y - 12 }, dealt, { color: textColor })

      if (enemy.getEnemyData().currentHealth <= 0) {
        enemy.die()
        result.killedEnemies.push(enemy)
      }
    }
  }

  /**
   * 执行增益效果
   */
  private executeBuff(effect: SkillEffect, _hero: HeroEntity): void {
    console.log(`[SkillExecutor] 增益效果激活: ${effect.value}%`)
  }

  /**
   * 执行纯眩晕效果
   */
  private executeStun(effect: SkillEffect, centerPos: Point, result: SkillExecutionResult): void {
    if (!effect.range || !effect.duration) return

    const enemies = this.enemyManager.getEnemiesInRange(centerPos, effect.range)
    if (!enemies) return

    for (const enemy of enemies) {
      enemy.applyStun(effect.duration)
      result.targetsHit++
    }
  }

  /**
   * 执行纯减速效果
   */
  private executeSlow(effect: SkillEffect, centerPos: Point, result: SkillExecutionResult): void {
    if (!effect.range || !effect.duration || !effect.value) return

    const enemies = this.enemyManager.getEnemiesInRange(centerPos, effect.range)
    if (!enemies) return

    const slowPercent = effect.value / 100

    for (const enemy of enemies) {
      enemy.applySlow(slowPercent, effect.duration)
      result.targetsHit++
    }
  }

  /**
   * 播放技能特效
   */
  private playSkillEffect(
    skill: SkillConfig,
    casterPos: Point,
    hero: HeroEntity,
    targetPos?: Point
  ): void {
    const effect = skill.effect
    const effectPos = targetPos || casterPos
    const heroId = hero.getHeroData().id

    // 水墨气浪音效
    SoundFX.whoosh(0.2)

    switch (effect.type) {
      case 'damageArea': {
        const color = effect.element === 'wood' ? 0x2e7d32 : (effect.element === 'fire' ? 0xe65100 : 0x8e24aa)
        this.playAreaEffect(effectPos, effect.range || 100, color, skill.name, heroId)
        break
      }

      case 'damage': {
        // 多目标或单体突刺特效
        this.playStrikeEffect(casterPos, targetPos, skill.name)
        break
      }

      case 'buff':
        this.playBuffEffect(casterPos, skill.name)
        break

      default:
        console.log(`[SkillExecutor] 播放技能通用特效: ${skill.name}`)
    }
  }

  /**
   * 播放范围水墨刀光/烈焰震波特效
   */
  private playAreaEffect(
    pos: Point,
    range: number,
    color: number,
    skillName: string,
    heroId?: string
  ): void {
    const graphics = this.scene.add.graphics()
    graphics.setDepth(150)
    graphics.lineStyle(3, color, 0.85)
    graphics.fillStyle(color, 0.22)

    // 刀光扇面或震波圆
    if (heroId === 'hero_guanyu') {
      // 关羽青龙半月大刀芒
      graphics.beginPath()
      graphics.arc(pos.x, pos.y, range, -Math.PI * 0.75, Math.PI * 0.25, false)
      graphics.lineTo(pos.x, pos.y)
      graphics.closePath()
      graphics.fillPath()
      graphics.strokePath()
    } else {
      // 张飞震波环
      graphics.fillCircle(pos.x, pos.y, range)
      graphics.strokeCircle(pos.x, pos.y, range)
    }

    // 技能书法名号
    const text = this.scene.add.text(pos.x, pos.y - range - 22, `【${skillName}】`, {
      fontFamily: 'serif',
      fontSize: '20px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(151)

    // 扩圈震荡与淡出动画
    this.scene.tweens.add({
      targets: [graphics, text],
      alpha: 0,
      scale: 1.15,
      duration: 550,
      ease: 'Sine.easeOut',
      onComplete: () => {
        graphics.destroy()
        text.destroy()
      }
    })
  }

  /**
   * 播放打击穿刺特效
   */
  private playStrikeEffect(from: Point, to: Point | undefined, skillName: string): void {
    if (!to) return

    const graphics = this.scene.add.graphics()
    graphics.setDepth(150)
    graphics.lineStyle(2.5, 0x00b0ff, 0.9)
    graphics.lineBetween(from.x, from.y, to.x, to.y)

    // 银芒破空光斑
    const circle = this.scene.add.circle(to.x, to.y, 16, 0xe1f5fe, 0.7)
    circle.setDepth(151)

    this.scene.tweens.add({
      targets: [graphics, circle],
      alpha: 0,
      duration: 250,
      onComplete: () => {
        graphics.destroy()
        circle.destroy()
      }
    })
  }

  /**
   * 播放增益特效
   */
  private playBuffEffect(pos: Point, skillName: string): void {
    const text = this.scene.add.text(pos.x, pos.y - 60, `【${skillName}】`, {
      fontFamily: 'serif',
      fontSize: '15px',
      color: '#4caf50',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(150)

    this.scene.tweens.add({
      targets: text,
      y: pos.y - 85,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    })
  }

  /**
   * 显示绝技释放水墨横幅动效
   */
  private showBaojiImage(heroId: string, skillName: string): void {
    const baojiKey = this.getBaojiImageKey(heroId)
    if (!baojiKey || !this.scene.textures.exists(baojiKey)) return

    const width = this.scene.cameras.main.width
    const bannerY = 108
    const bannerW = 440
    const bannerH = 56

    const banner = this.scene.add.container(width + bannerW / 2, bannerY)
    banner.setDepth(200)

    const bg = this.scene.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.96)
    bg.fillRoundedRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 4)
    bg.lineStyle(1.5, 0xa0782f, 0.9)
    bg.strokeRoundedRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 4)

    bg.lineStyle(1, InkColor.ink, 0.25)
    bg.lineBetween(-bannerW / 2 + 10, -bannerH / 2 + 4, bannerW / 2 - 10, -bannerH / 2 + 4)
    bg.lineBetween(-bannerW / 2 + 10, bannerH / 2 - 4, bannerW / 2 - 10, bannerH / 2 - 4)

    const avatar = this.scene.add.image(-bannerW / 2 + 38, 0, baojiKey)
    avatar.setDisplaySize(48, 48)

    const ring = this.scene.add.graphics()
    ring.lineStyle(2, 0xa0782f, 0.9)
    ring.strokeCircle(-bannerW / 2 + 38, 0, 24)

    const seal = this.scene.add.rectangle(bannerW / 2 - 34, 0, 36, 20, InkColor.cinnabar)
    seal.setStrokeStyle(1, 0x6e1b15)
    const sealText = inkText(this.scene, bannerW / 2 - 34, 0, '绝技', {
      size: 11,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const titleText = inkText(this.scene, -10, 0, `「${skillName}」`, {
      size: 18,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    banner.add([bg, avatar, ring, seal, sealText, titleText])

    this.scene.tweens.add({
      targets: banner,
      x: width / 2,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(450, () => {
          this.scene.tweens.add({
            targets: banner,
            x: -bannerW,
            alpha: 0,
            duration: 200,
            ease: 'Power2.easeIn',
            onComplete: () => banner.destroy()
          })
        })
      }
    })
  }

  /**
   * 根据英雄ID获取暴击图key
   */
  private getBaojiImageKey(heroId: string): string | null {
    const baojiKeyMap: Record<string, string> = {
      'hero_guanyu': 'baoji_guanyu',
      'hero_zhangfei': 'baoji_zhangfei',
      'hero_zhaoyun': 'baoji_zhaoyun',
      'hero_lvbu': 'baoji_lvbu',
      'hero_zhouyu': 'baoji_zhouyu',
      'hero_caocao': 'baoji_caocao',
      'hero_zhugeliang': 'baoji_zhugeliang',
      'hero_diaochan': 'baoji_diaochan'
    }
    return baojiKeyMap[heroId] || null
  }
}