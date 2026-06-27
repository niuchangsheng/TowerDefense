import { Scene } from 'phaser'
import { SkillConfig, SkillEffect, Point } from '@/types'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { HeroEntity } from '@/entities/HeroEntity'
import { SkillManager } from './SkillManager'
import { getSkill } from '@/data/skills'

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
 * 负责执行技能效果和渲染特效
 */
export class SkillExecutor {
  private scene: Scene
  private skillManager: SkillManager
  private enemyManager: any

  constructor(scene: Scene, skillManager: SkillManager, enemyManager: any) {
    this.scene = scene
    this.skillManager = skillManager
    this.enemyManager = enemyManager
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

    // 展示暴击图（技能释放前的特写）
    this.showBaojiImage(hero.getHeroData().id, skill.name)

    // 根据效果类型执行
    const result = this.executeEffect(skill, skill.effect, casterPos, hero, targetPos)

    // 播放技能特效
    this.playSkillEffect(skill, casterPos, targetPos)

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
   * 执行单体伤害
   */
  private executeDamage(
    effect: SkillEffect,
    casterPos: Point,
    hero: HeroEntity,
    result: SkillExecutionResult
  ): void {
    if (!effect.range) return

    const target = this.enemyManager.getNearestEnemy(casterPos, effect.range)
    if (!target) return

    const damage = effect.value
    target.takeDamage(damage)
    result.damageDealt = damage
    result.targetsHit = 1

    if (target.getEnemyData().currentHealth <= 0) {
      target.die()
      result.killedEnemies.push(target)
    }
  }

  /**
   * 执行范围伤害
   */
  private executeDamageArea(
    effect: SkillEffect,
    centerPos: Point,
    hero: HeroEntity,
    result: SkillExecutionResult
  ): void {
    if (!effect.range) return

    const enemies = this.enemyManager.getEnemiesInRange(centerPos, effect.range)
    const damage = effect.value

    for (const enemy of enemies) {
      enemy.takeDamage(damage)
      result.damageDealt += damage
      result.targetsHit++

      if (enemy.getEnemyData().currentHealth <= 0) {
        enemy.die()
        result.killedEnemies.push(enemy)
      }
    }
  }

  /**
   * 执行增益效果
   */
  private executeBuff(effect: SkillEffect, hero: HeroEntity): void {
    // TODO: 实现buff系统
    // 目前简单地在HeroEntity上添加临时属性加成
    console.log(`增益效果: ${effect.value}% 属性提升`)
  }

  /**
   * 执行眩晕效果
   */
  private executeStun(effect: SkillEffect, centerPos: Point, result: SkillExecutionResult): void {
    if (!effect.range || !effect.duration) return

    const enemies = this.enemyManager.getEnemiesInRange(centerPos, effect.range)

    for (const enemy of enemies) {
      enemy.applyStun(effect.duration)
      result.targetsHit++
    }
  }

  /**
   * 执行减速效果
   */
  private executeSlow(effect: SkillEffect, centerPos: Point, result: SkillExecutionResult): void {
    if (!effect.range || !effect.duration || !effect.value) return

    const enemies = this.enemyManager.getEnemiesInRange(centerPos, effect.range)
    const slowPercent = effect.value / 100

    for (const enemy of enemies) {
      enemy.applySlow(slowPercent, effect.duration)
      result.targetsHit++
    }
  }

  /**
   * 播放技能特效
   */
  private playSkillEffect(skill: SkillConfig, casterPos: Point, targetPos?: Point): void {
    const effect = skill.effect
    const effectPos = targetPos || casterPos

    switch (effect.type) {
      case 'damageArea':
        this.playAreaEffect(effectPos, effect.range || 100, 0xff6600, skill.name)
        break

      case 'stun':
        this.playAreaEffect(effectPos, effect.range || 100, 0xffff00, skill.name)
        break

      case 'damage':
        this.playStrikeEffect(casterPos, targetPos, skill.name)
        break

      case 'buff':
        this.playBuffEffect(casterPos, skill.name)
        break

      default:
        console.log(`技能释放: ${skill.name}`)
    }
  }

  /**
   * 播放范围特效
   */
  private playAreaEffect(pos: Point, range: number, color: number, skillName: string): void {
    const graphics = this.scene.add.graphics()
    graphics.lineStyle(3, color, 0.8)
    graphics.fillStyle(color, 0.2)
    graphics.fillCircle(pos.x, pos.y, range)
    graphics.strokeCircle(pos.x, pos.y, range)

    // 技能名称显示
    const text = this.scene.add.text(pos.x, pos.y - range - 20, skillName, {
      fontSize: '16px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // 淡出动画
    this.scene.tweens.add({
      targets: [graphics, text],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        graphics.destroy()
        text.destroy()
      }
    })
  }

  /**
   * 播放打击特效
   */
  private playStrikeEffect(from: Point, to: Point | undefined, skillName: string): void {
    if (!to) return

    const graphics = this.scene.add.graphics()
    graphics.lineStyle(3, 0xff0000, 1)
    graphics.lineBetween(from.x, from.y, to.x, to.y)

    // 打击点特效
    const circle = this.scene.add.circle(to.x, to.y, 20, 0xff0000, 0.5)

    this.scene.tweens.add({
      targets: [graphics, circle],
      alpha: 0,
      duration: 300,
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
    const text = this.scene.add.text(pos.x, pos.y - 60, skillName, {
      fontSize: '14px',
      color: '#00ff00',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    this.scene.tweens.add({
      targets: text,
      y: pos.y - 80,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    })
  }

  /**
   * 展示暴击图（三国志11风格）
   * @param heroId 英雄ID
   * @param skillName 技能名称
   */
  private showBaojiImage(heroId: string, skillName: string): void {
    // 获取对应的暴击图key
    const baojiKey = this.getBaojiImageKey(heroId)
    if (!baojiKey) return

    // 检查纹理是否存在
    if (!this.scene.textures.exists(baojiKey)) {
      console.warn(`暴击图未加载: ${baojiKey}`)
      return
    }

    const width = this.scene.cameras.main.width
    const height = this.scene.cameras.main.height

    // 创建暴击图容器
    const container = this.scene.add.container(0, 0)
    container.setDepth(1000) // 确保在最上层显示

    // 半透明黑色背景（增加视觉冲击）
    const bg = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3)

    // 暴击图（放大显示，偏左位置）
    const baojiImage = this.scene.add.image(width * 0.35, height / 2, baojiKey)
    baojiImage.setDisplaySize(400, 400) // 大尺寸展示

    // 技能名称（白色粗体，显示在暴击图下方）
    const skillText = this.scene.add.text(width * 0.35, height / 2 + 220, skillName, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5)

    // 闪光特效（从左到右的光线）
    const flashGraphics = this.scene.add.graphics()
    flashGraphics.fillStyle(0xffffff, 0.8)
    const flash = this.scene.add.rectangle(0, height / 2, 60, height * 1.5, 0xffffff, 0.6)
    flash.setOrigin(0.5, 0.5)
    flash.setX(-100)

    // 将所有元素添加到容器
    container.add([bg, baojiImage, skillText, flash])

    // 设置初始状态
    container.setAlpha(0)
    baojiImage.setScale(0.5)
    flash.setAlpha(0)

    // 动画序列
    // 1. 暴击图快速放大出现
    this.scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 100,
      ease: 'Power2'
    })

    this.scene.tweens.add({
      targets: baojiImage,
      scale: 1.2,
      duration: 150,
      ease: 'Back.easeOut'
    })

    // 2. 闪光特效（从左滑过）
    this.scene.tweens.add({
      targets: flash,
      alpha: 0.8,
      duration: 50,
      onComplete: () => {
        this.scene.tweens.add({
          targets: flash,
          x: width + 100,
          alpha: 0,
          duration: 300,
          ease: 'Power1'
        })
      }
    })

    // 3. 技能名称震动效果
    this.scene.tweens.add({
      targets: skillText,
      x: skillText.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 5
    })

    // 4. 持续展示后淡出消失
    this.scene.time.delayedCall(800, () => {
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          container.destroy()
        }
      })
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