import Phaser from 'phaser'
import { Augment, StratagemCategory } from '@/types/augment'
import { AugmentManager } from '@/core/augment/AugmentManager'
import {
  InkColor,
  InkText,
  inkText,
  createInkButton,
  InkRadius,
  InkDepth,
  INK_FONT
} from './InkTheme'
import { SoundFX } from '@/effects/SoundFX'

export interface StratagemStyleInfo {
  label: string
  text: string
  stroke: number
  badgeBg: number
  tint: number
}

export const STRATAGEM_STYLE_MAP: Record<StratagemCategory | '无尽精进策', StratagemStyleInfo> = {
  五行异变策: {
    label: '【五行异变策】',
    text: '#9e2b25',
    stroke: 0x9e2b25,
    badgeBg: 0x9e2b25,
    tint: 0xf7efe9
  },
  相生连环策: {
    label: '【相生连环策】',
    text: '#235739',
    stroke: 0x2e6b47,
    badgeBg: 0x2e6b47,
    tint: 0xeef5f0
  },
  攻防逆转策: {
    label: '【攻防逆转策】',
    text: '#563082',
    stroke: 0x6b3fa0,
    badgeBg: 0x6b3fa0,
    tint: 0xf3eef8
  },
  奇谋战法策: {
    label: '【奇谋战法策】',
    text: '#1c496e',
    stroke: 0x255c8a,
    badgeBg: 0x255c8a,
    tint: 0xebf2f7
  },
  观星借天策: {
    label: '【观星借天策】',
    text: '#875714',
    stroke: 0xa06b1e,
    badgeBg: 0xa06b1e,
    tint: 0xf8f1e4
  },
  无尽精进策: {
    label: '【无尽精进策】',
    text: '#3f464d',
    stroke: 0x545b62,
    badgeBg: 0x545b62,
    tint: 0xf0efec
  }
}

export function getStratagemStyle(aug: Augment): StratagemStyleInfo {
  if (aug.repeatable) return STRATAGEM_STYLE_MAP['无尽精进策']
  if (aug.stratagemCategory && STRATAGEM_STYLE_MAP[aug.stratagemCategory]) {
    return STRATAGEM_STYLE_MAP[aug.stratagemCategory]
  }
  return STRATAGEM_STYLE_MAP['奇谋战法策']
}

/**
 * 军师锦囊三选一弹窗（无品质平权 · 三国典故五大策系 · 四大独立乘区归集）
 * 严格遵循 docs/Wuxing_System_Design.md 第七章设计规范：
 * - 废除白绿蓝紫金品质，按【五大策系】平权呈现
 * - 展示三国历史典故出处、底层规则改写前后质变、四独立乘区加成与看天选策指南
 * - 保底 1 张在场武将/五行契合卡 + 易策令换牌
 */
export class AugmentSelectModal extends Phaser.GameObjects.Container {
  private augmentManager: AugmentManager
  private currentOptions: Augment[] = []
  private cardContainers: Phaser.GameObjects.Container[] = []
  private bottomBarContainer?: Phaser.GameObjects.Container
  private onSelectCallback: (selected: Augment) => void
  private onCloseCallback?: () => void
  private escKey?: Phaser.Input.Keyboard.Key

  private deployedHeroIds: string[]
  private deployedWuXing: any[]

  constructor(
    scene: Phaser.Scene,
    augmentManager: AugmentManager,
    deployedHeroIds: string[],
    deployedWuXing: any[],
    onSelect: (selected: Augment) => void,
    onClose?: () => void
  ) {
    const width = scene.cameras.main.width
    const height = scene.cameras.main.height

    super(scene, 0, 0)
    this.augmentManager = augmentManager
    this.deployedHeroIds = deployedHeroIds
    this.deployedWuXing = deployedWuXing
    this.onSelectCallback = onSelect
    this.onCloseCallback = onClose

    this.setDepth(InkDepth.popup)

    // 1. 半透明水墨遮罩（拦截底层所有点击）
    const overlay = scene.add.rectangle(0, 0, width, height, 0x111111, 0.78)
    overlay.setOrigin(0, 0)
    overlay.setInteractive()
    this.add(overlay)

    // 2. 顶部标题长卷与右上角返回按钮
    this.createHeader(width)

    // 3. 抽取初始 3 张卡（保底 1 张契合卡 + 2 张纯随机）
    this.currentOptions = this.augmentManager.drawOptions(this.deployedHeroIds, this.deployedWuXing, 3)

    if (this.currentOptions.length === 0) {
      this.renderEmptyState(width, height)
    } else {
      this.renderCards(width, height)
      this.createBottomBar(width, height)
    }

    // 4. 监听 ESC 键直接返回
    if (scene.input.keyboard) {
      this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      this.escKey.once('down', () => {
        this.closeModal()
      })
    }

    scene.add.existing(this)

    // 入场动效
    this.setAlpha(0)
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 240,
      ease: 'Sine.easeOut'
    })

    SoundFX.thud(0.3)
  }

  private createHeader(width: number): void {
    const pickedCount = this.augmentManager.getActiveAugments().length
    const title = inkText(this.scene, width / 2, 42, '【天命锦囊 · 三选一】', {
      size: 26,
      color: '#fdfbf7',
      bold: true,
      originX: 0.5
    })
    title.setStroke('#111111', 4)

    const subtitle = inkText(
      this.scene,
      width / 2,
      72,
      `保底 1 张当前阵容契合卡  ·  已选 ${pickedCount}/5 策`,
      {
        size: 13.5,
        color: '#e8dbbe',
        originX: 0.5
      }
    )

    const closeBtn = createInkButton(this.scene, width - 84, 48, 108, 34, '✕ 暂缓返回', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 13,
      onClick: () => this.closeModal()
    })

    this.add([title, subtitle, closeBtn])
  }

  private renderEmptyState(width: number, height: number): void {
    const cx = width / 2
    const cy = height / 2

    const box = this.scene.add.graphics()
    box.fillStyle(InkColor.paperPanel, 0.96)
    box.fillRoundedRect(cx - 220, cy - 90, 440, 180, InkRadius.md)
    box.lineStyle(2, InkColor.ink, 0.75)
    box.strokeRoundedRect(cx - 220, cy - 90, 440, 180, InkRadius.md)
    this.add(box)

    const t1 = inkText(this.scene, cx, cy - 40, '【军略已臻化境】', {
      size: 22,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    })

    const t2 = inkText(this.scene, cx, cy - 5, '所有天命妙计皆已修得，三军用命，气吞万里！', {
      size: 14,
      color: InkText.faint,
      originX: 0.5
    })

    const returnBtn = createInkButton(this.scene, cx, cy + 45, 150, 40, '返回迎敌', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb53a32,
      textColor: '#ffffff',
      fontSize: 15,
      onClick: () => this.closeModal()
    })

    this.add([t1, t2, returnBtn])
  }

  private renderCards(width: number, height: number): void {
    for (const c of this.cardContainers) {
      c.destroy()
    }
    this.cardContainers = []

    const cardW = 326
    const cardH = 440
    const spacing = 28
    const totalW = this.currentOptions.length * cardW + (this.currentOptions.length - 1) * spacing
    const startX = (width - totalW) / 2 + cardW / 2
    const cardY = height / 2 - 4

    this.currentOptions.forEach((aug, index) => {
      const cx = startX + index * (cardW + spacing)
      const card = this.createSingleCard(cx, cardY, cardW, cardH, aug)
      this.cardContainers.push(card)
      this.add(card)

      card.setY(cardY + 32)
      card.setAlpha(0)
      this.scene.tweens.add({
        targets: card,
        y: cardY,
        alpha: 1,
        duration: 320,
        delay: index * 75,
        ease: 'Cubic.easeOut'
      })
    })
  }

  private createSingleCard(
    x: number,
    y: number,
    w: number,
    h: number,
    aug: Augment
  ): Phaser.GameObjects.Container {
    const scene = this.scene
    const c = scene.add.container(x, y)
    const style = getStratagemStyle(aug)

    // 1. 宣纸底板与策系边框
    const bg = scene.add.graphics()
    const drawCardFrame = (hover: boolean) => {
      bg.clear()
      bg.fillStyle(hover ? 0xfbf8f1 : style.tint, 0.98)
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, InkRadius.md)
      bg.lineStyle(hover ? 3 : 2, hover ? 0xd4af37 : style.stroke, 0.95)
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, InkRadius.md)

      bg.lineStyle(1, style.stroke, 0.25)
      bg.strokeRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 4)
    }
    drawCardFrame(false)
    c.add(bg)

    // 2. 第一眼：顶部策系印章横幅
    const topBanner = scene.add.rectangle(0, -h / 2 + 24, w - 24, 28, style.badgeBg, 0.92)
    topBanner.setStrokeStyle(1, 0x1a1a1a, 0.5)
    const catLabel = inkText(
      scene,
      0,
      -h / 2 + 24,
      `${style.label} · ${aug.targetDimension || '全局奇谋'}`,
      {
        size: 12,
        color: '#fdfbf7',
        bold: true,
        originX: 0.5
      }
    )
    c.add([topBanner, catLabel])

    // 3. 大字锦囊名称与四字爽点词头
    const displayName = aug.name.startsWith('《') ? aug.name : `《${aug.name}》`
    const nameText = inkText(scene, 0, -h / 2 + 66, displayName, {
      size: 25,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    })
    c.add(nameText)

    const mechStr = aug.mechanismTitle || aug.subtitle || '【军师奇谋】'
    const mechText = inkText(scene, 0, -h / 2 + 98, mechStr, {
      size: 15,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5
    })
    c.add(mechText)

    // 1行浅墨典故题跋
    const loreOneLine = aug.historicalLore || aug.subtitle || ''
    const loreShort = loreOneLine.length > 22 ? `${loreOneLine.slice(0, 22)}…` : loreOneLine
    const loreText = inkText(scene, 0, -h / 2 + 124, `📜 ${loreShort}`, {
      size: 11.5,
      color: InkText.faint,
      originX: 0.5
    })
    c.add(loreText)

    // 4. 第二眼：核心效果框（去繁就简，只展示精炼后的核心效果，绝不堆叠“改写前”长文）
    const ruleY = -h / 2 + 216
    const ruleBox = scene.add.rectangle(0, ruleY, w - 28, 128, 0xfdfaf2, 0.92)
    ruleBox.setStrokeStyle(1.5, style.stroke, 0.5)
    c.add(ruleBox)

    const conciseEffect = (aug.ruleAfter || aug.description || '')
      .replace(/^改写后：\s*/, '')
      .replace(/（归入【[^】]+】[^）]*）/g, '')
      .replace(/（严格归入[^）]*）/g, '')
      .trim()

    const descText = scene.add.text(-w / 2 + 24, ruleY, conciseEffect, {
      fontFamily: INK_FONT,
      fontSize: '13.5px',
      fontStyle: 'bold',
      color: '#1e1b18',
      wordWrap: { width: w - 48 },
      lineSpacing: 5
    }).setOrigin(0, 0.5)
    c.add(descText)

    // 5. 醒目加成胶囊条
    const bucketSummary = this.buildBucketSummary(aug)
    const bucketBox = scene.add.rectangle(0, h / 2 - 114, w - 28, 32, 0xfbf5e6, 0.95)
    bucketBox.setStrokeStyle(1.2, 0xa0782f, 0.7)
    const bucketText = inkText(scene, 0, h / 2 - 114, bucketSummary, {
      size: 12.5,
      color: '#8a5a14',
      bold: true,
      originX: 0.5
    })
    c.add([bucketBox, bucketText])

    // 6. 第三眼：1行克制/顺天提示
    const bossMatch = (aug.counterBoss || '').match(/【([^】]+)】/)
    const weatherMatch = (aug.synergyWeather || '').match(/【([^】]+)】/)
    const quickGuide = [
      weatherMatch ? `🌦️ ${weatherMatch[1]}` : '',
      bossMatch ? `👹 克${bossMatch[1]}` : '👹 破铁壁通用'
    ]
      .filter(Boolean)
      .join('   |   ')

    const tipText = inkText(scene, 0, h / 2 - 74, quickGuide, {
      size: 12,
      color: InkText.ink,
      bold: true,
      originX: 0.5
    })
    c.add(tipText)

    // 7. 底部确认按钮
    const selectBtn = createInkButton(scene, 0, h / 2 - 30, 156, 34, '◆ 选用此策 ◆', {
      fill: style.badgeBg,
      hoverFill: 0x1a1a1a,
      textColor: '#ffffff',
      fontSize: 13.5,
      stroke: 0xd4af37,
      onClick: () => this.handlePickAugment(aug)
    })
    c.add(selectBtn)

    c.setSize(w, h)
    c.setInteractive({ useHandCursor: true })

    c.on('pointerover', () => {
      drawCardFrame(true)
      scene.tweens.add({
        targets: c,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 150,
        ease: 'Quad.easeOut'
      })
    })

    c.on('pointerout', () => {
      drawCardFrame(false)
      scene.tweens.add({
        targets: c,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: 'Quad.easeOut'
      })
    })

    c.on('pointerdown', () => {
      this.handlePickAugment(aug)
    })

    return c
  }

  private buildBucketSummary(aug: Augment): string {
    const ef = aug.effects
    const items: string[] = []
    if (ef.attackPercentBonus) items.push(`⚔️ 攻击+${Math.round(ef.attackPercentBonus * 100)}%`)
    if (ef.damageIncreaseBonus) items.push(`🔥 增伤+${Math.round(ef.damageIncreaseBonus * 100)}%`)
    if (ef.reactionDamageMultiplier) items.push(`🔗 相生+${Math.round(ef.reactionDamageMultiplier * 100)}%`)
    if (ef.vulnerabilityBonus) items.push(`🩸 易伤+${Math.round(ef.vulnerabilityBonus * 100)}%`)
    if (ef.critRateBonus) items.push(`🎯 暴率+${Math.round(ef.critRateBonus * 100)}%`)
    if (ef.critDamageBonus) items.push(`💥 暴伤+${Math.round(ef.critDamageBonus * 100)}%`)
    if (ef.attackSpeedBonus) items.push(`⚡ 攻速+${Math.round(ef.attackSpeedBonus * 100)}%`)
    if (ef.attackRangeBonus) items.push(`🎯 射程+${ef.attackRangeBonus}px`)
    if (ef.costGainBonus) items.push(`🪙 军费+${Math.round(ef.costGainBonus * 100)}%`)
    if (ef.baseMaxHealthBonus) items.push(`🏯 城防+${ef.baseMaxHealthBonus}`)
    return items.slice(0, 3).join('   ') || `✨ ${aug.mechanismTitle || '专属机制质变'}`
  }

  private createBottomBar(width: number, height: number): void {
    this.bottomBarContainer?.destroy()
    this.bottomBarContainer = this.scene.add.container(0, 0)
    this.add(this.bottomBarContainer)

    const count = this.augmentManager.getRerollCount()
    const canReroll = count > 0
    const hasWoodenOx = this.augmentManager.hasSpecialAugment('aug_wooden_ox')
    const oxBonusNote = hasWoodenOx ? ` [木牛流马: 换牌+3%攻/速]` : ''

    const rerollBtn = createInkButton(
      this.scene,
      width / 2 - 115,
      height - 36,
      210,
      36,
      `🎲 易策令换牌 (余 ${count} 枚)${oxBonusNote}`,
      {
        fill: canReroll ? InkColor.paperDeep : 0x666666,
        hoverFill: canReroll ? InkColor.paper : 0x666666,
        textColor: canReroll ? InkText.strong : '#cccccc',
        fontSize: 12,
        stroke: canReroll ? 0xa0782f : 0x444444,
        onClick: () => this.handleReroll()
      }
    )

    const deferBtn = createInkButton(
      this.scene,
      width / 2 + 115,
      height - 36,
      170,
      36,
      '暂存军令 · 返回',
      {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.faint,
        fontSize: 12,
        onClick: () => this.closeModal()
      }
    )

    this.bottomBarContainer.add([rerollBtn, deferBtn])
  }

  private handleReroll(): void {
    if (this.augmentManager.getRerollCount() <= 0) return

    const newOptions = this.augmentManager.reroll(this.deployedHeroIds, this.deployedWuXing)
    if (newOptions) {
      this.currentOptions = newOptions
      const width = this.scene.cameras.main.width
      const height = this.scene.cameras.main.height

      this.renderCards(width, height)
      this.createBottomBar(width, height)

      SoundFX.thud(0.3)
    }
  }

  private handlePickAugment(aug: Augment): void {
    this.augmentManager.selectAugment(aug)
    SoundFX.bowSnap(0.6)

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleY: 0.95,
      duration: 200,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.destroy()
        this.onSelectCallback(aug)
      }
    })
  }

  public closeModal(): void {
    SoundFX.thud(0.3)
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleY: 0.95,
      duration: 180,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.destroy()
        if (this.onCloseCallback) {
          this.onCloseCallback()
        }
      }
    })
  }

  destroy(fromScene?: boolean): void {
    if (this.escKey) {
      this.escKey.removeAllListeners()
    }
    super.destroy(fromScene)
  }
}
