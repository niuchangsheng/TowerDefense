import { Scene } from 'phaser'
import { SkillConfig, SkillEffect, Point, WuXing } from '@/types'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { HeroEntity } from '@/entities/HeroEntity'
import { SkillManager } from './SkillManager'
import { getSkill } from '@/data/skills'
import { InkColor, InkText, inkText } from '@/ui/InkTheme'
import { DamageCalculator } from '../battle/DamageCalculator'
import { ElementalReactionManager } from '../elemental/ElementalReactionManager'
import { EquipmentManager } from '../equipment/EquipmentManager'
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
 * 负责执行英雄主动/被动技能，按攻击力百分比加成计算伤害并联动五行反应与四阶神兵圣兽演出
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

    // 主动大招播放四阶神兵视效递进（八卦起手阵 / 0.35s微暗聚焦 / 名将诗号Cut-in / 五行圣兽法相）
    if (skill.type === 'active') {
      this.playFourTierSkillPresentation(hero, casterPos, skill.name)
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
   * 第10章 §2：我军武将四阶技能发动视效递进
   * ① 原始技能 -> ② 专属神兵八卦起手阵 -> ③ 同源+相生双色流光 -> ④ 双Lv.5终极大招（0.35s战场微暗聚焦 + 名将诗号Cut-in + 五行圣兽法相）
   */
  private playFourTierSkillPresentation(hero: HeroEntity, casterPos: Point, skillName: string): void {
    if (!this.scene || !this.scene.add || !this.scene.tweens) return
    const heroData = hero.getHeroData()
    const resonance = EquipmentManager.getInstance().getHeroResonance(heroData.id, heroData.name)

    // Tier 2: 专属神兵八卦起手阵
    if (resonance.isExclusive) {
      const bagua = this.scene.add.graphics()
      bagua.setDepth(148)
      bagua.lineStyle(2, 0xd97706, 0.9)
      bagua.strokeCircle(casterPos.x, casterPos.y, 26)
      bagua.strokeCircle(casterPos.x, casterPos.y, 34)
      this.scene.tweens.add({
        targets: bagua,
        scaleX: 1.4,
        scaleY: 1.4,
        alpha: 0,
        duration: 450,
        onComplete: () => bagua.destroy()
      })
    }

    // Tier 4: 双 Lv.5 终极大招或 5★ 神将（0.35s 战场微暗聚焦 + 左侧名将诗号卷轴切入 + 圣兽法相降临）
    const isUltimateTier =
      resonance.hasDualLv5Ultimate || resonance.gemLevel >= 5 || (heroData.star ?? 1) >= 5
    if (!isUltimateTier) return

    const poemConfig: Record<
      string,
      { poem: string; ultimateTitle: string; beastGlyph: string; color: number; textColor: string }
    > = {
      hero_guanyu: {
        poem: '「青龙饮水化苍莽，一刀威震九州寒！」',
        ultimateTitle: '【青龙神威 · 万木屠苏】',
        beastGlyph: '🐉 东方青龙法相',
        color: 0x2e7d32,
        textColor: '#a5d6a7'
      },
      hero_huangzhong: {
        poem: '「老当益壮挽天弓，烈火燎原坠落日！」',
        ultimateTitle: '【朱雀焚天 · 九日落陨】',
        beastGlyph: '🦅 南方朱雀法相',
        color: 0xd84315,
        textColor: '#ffccbc'
      },
      hero_zhangfei: {
        poem: '「当阳桥头一声雷，泰山崩摧万马暗！」',
        ultimateTitle: '【玄岳崩云 · 万钧镇狱】',
        beastGlyph: '⛰️ 中土玄岳法相',
        color: 0x8d6e63,
        textColor: '#ffe082'
      },
      hero_machao: {
        poem: '「西凉铁骑踏冰河，满城尽带黄金甲！」',
        ultimateTitle: '【白虎裂空 · 十步一杀】',
        beastGlyph: '🐅 西方白虎法相',
        color: 0xf9a825,
        textColor: '#fff59d'
      },
      hero_zhaoyun: {
        poem: '「白马银枪破重围，寒江孤影七进出！」',
        ultimateTitle: '【玄武踏浪 · 千里冰封】',
        beastGlyph: '🐢 北方玄武法相',
        color: 0x0277bd,
        textColor: '#b3e5fc'
      }
    }

    const cfg = poemConfig[heroData.id] || {
      poem: `「三军听令，${skillName}破敌！」`,
      ultimateTitle: `【无双绝技 · ${skillName}】`,
      beastGlyph: '☯ 五行圣兽法相',
      color: 0xc62828,
      textColor: '#ffffff'
    }

    const width = this.scene.cameras?.main?.width || 1280
    const height = this.scene.cameras?.main?.height || 720

    if (typeof this.scene.add?.rectangle !== 'function' || typeof this.scene.add?.container !== 'function') {
      return
    }

    // 1. 0.35s 战场微暗聚焦遮罩
    const focusDim = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.38)
    focusDim.setDepth(190)
    this.scene.tweens.add({
      targets: focusDim,
      alpha: 0,
      duration: 350,
      delay: 180,
      onComplete: () => focusDim.destroy()
    })

    // 2. 左侧名将诗号水墨卷轴切入 (Cut-in) + 圣兽法相印记
    const scrollW = 480
    const scrollH = 64
    const scroll = this.scene.add.container(-scrollW / 2, 168)
    scroll.setDepth(205)

    const sBg = this.scene.add.graphics()
    sBg.fillStyle(0x1a1815, 0.92)
    sBg.fillRoundedRect(-scrollW / 2, -scrollH / 2, scrollW, scrollH, 6)
    sBg.lineStyle(2, cfg.color, 0.95)
    sBg.strokeRoundedRect(-scrollW / 2, -scrollH / 2, scrollW, scrollH, 6)

    const beastTxt = inkText(this.scene, -scrollW / 2 + 18, -14, `${cfg.beastGlyph} · ${cfg.ultimateTitle}`, {
      size: 13,
      color: cfg.textColor,
      bold: true
    })
    const poemTxt = inkText(this.scene, -scrollW / 2 + 18, 10, cfg.poem, {
      size: 15,
      color: '#ffffff',
      bold: true
    })
    scroll.add([sBg, beastTxt, poemTxt])

    this.scene.tweens.add({
      targets: scroll,
      x: 270,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(550, () => {
          this.scene.tweens.add({
            targets: scroll,
            x: -scrollW,
            alpha: 0,
            duration: 220,
            onComplete: () => scroll.destroy()
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