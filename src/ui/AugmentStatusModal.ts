import Phaser from 'phaser'
import { Augment, AugmentRarity } from '@/types/augment'
import { AugmentManager } from '@/core/augment/AugmentManager'
import {
  InkColor,
  InkText,
  inkText,
  createInkButton,
  InkDepth
} from './InkTheme'
import { SoundFX } from '@/effects/SoundFX'

const RARITY_INFO: Record<AugmentRarity, { text: string; stroke: number; bg: number; label: string }> = {
  common: { text: '#4e5a65', stroke: 0x6e7d8c, bg: 0xe6e4df, label: '凡品' },
  rare: { text: '#2962ff', stroke: 0x2979ff, bg: 0xdde9fd, label: '良品' },
  epic: { text: '#aa00ff', stroke: 0xd500f9, bg: 0xf5e8fd, label: '绝品' },
  legendary: { text: '#ff6d00', stroke: 0xffab00, bg: 0xfff3e0, label: '无双' }
}

interface AggregatedAugment {
  augment: Augment
  count: number
}

/**
 * 军事锦囊叠加状态总览弹窗
 * 展示局内已选锦囊列表（自动聚合重复锦囊并显示 ×N）、各属性总叠加倍率
 */
export class AugmentStatusModal extends Phaser.GameObjects.Container {
  private augmentManager: AugmentManager
  private onCloseCallback?: () => void
  private scrollContainer!: Phaser.GameObjects.Container
  private scrollY: number = 0
  private maxScroll: number = 0

  constructor(
    scene: Phaser.Scene,
    augmentManager: AugmentManager,
    onClose?: () => void
  ) {
    const width = scene.cameras.main.width
    const height = scene.cameras.main.height

    super(scene, 0, 0)
    this.augmentManager = augmentManager
    this.onCloseCallback = onClose
    this.setDepth(InkDepth.popup + 6)

    // 1. 半透明水墨遮罩（拦截底层交互并支持点击关闭）
    const overlay = scene.add.rectangle(0, 0, width, height, 0x111111, 0.75)
    overlay.setOrigin(0, 0)
    overlay.setInteractive()
    overlay.on('pointerdown', () => this.close())
    this.add(overlay)

    // 2. 宣纸卷轴底板 (宽 760, 高 520)
    const panelW = 760
    const panelH = 520
    const panelX = width / 2
    const panelY = height / 2

    const panelBg = scene.add.rectangle(panelX, panelY, panelW, panelH, InkColor.paper, 0.98)
    panelBg.setStrokeStyle(3, InkColor.inkStrong)
    panelBg.setInteractive()
    this.add(panelBg)

    // 内衬框
    const innerBorder = scene.add.rectangle(panelX, panelY, panelW - 16, panelH - 16)
    innerBorder.setStrokeStyle(1, InkColor.inkFaint, 0.4)
    this.add(innerBorder)

    // 3. 卷首标题
    this.createHeader(panelX, panelY - panelH / 2 + 36)

    // 4. 全局叠加属性统计横幅
    this.createStatsBanner(panelX, panelY - 165, panelW - 60)

    // 5. 锦囊滚动卡片列表
    this.createScrollList(panelX, panelY + 45, panelW - 60, 280)

    // 6. 底部关闭按钮
    const closeBtn = createInkButton(scene, panelX, panelY + panelH / 2 - 34, 130, 36, '合匮归位', {
      fill: InkColor.inkStrong,
      hoverFill: InkColor.ink,
      textColor: InkText.paper,
      fontSize: 15,
      onClick: () => this.close()
    })
    this.add(closeBtn)

    scene.add.existing(this)

    // 入场动效
    this.setAlpha(0)
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 200,
      ease: 'Sine.easeOut'
    })

    SoundFX.whoosh(0.3)
  }

  private createHeader(x: number, y: number): void {
    const seal = this.scene.add.rectangle(x - 170, y, 96, 26, InkColor.cinnabar)
    seal.setStrokeStyle(1.5, 0x6e1b15)
    const sealTxt = inkText(this.scene, x - 170, y, '天命秘策', {
      size: 13,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.add([seal, sealTxt])

    const totalCount = this.augmentManager.getActiveAugments().length
    const title = inkText(this.scene, x + 30, y, `中军军策 · 锦囊总览 (已启 ${totalCount} 枚)`, {
      size: 22,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.add(title)
  }

  private createStatsBanner(x: number, y: number, w: number): void {
    const banner = this.scene.add.rectangle(x, y, w, 62, InkColor.paperPanel, 0.95)
    banner.setStrokeStyle(1.2, InkColor.inkFaint, 0.6)
    this.add(banner)

    const atkPct = Math.round(this.augmentManager.getAttackPercentBonus() * 100)
    const spdPct = Math.round(this.augmentManager.getAttackSpeedBonus() * 100)
    const rng = this.augmentManager.getAttackRangeBonus()
    const costPct = Math.round((this.augmentManager.getCostGainMultiplier() - 1) * 100)
    const counterPct = Math.round(this.augmentManager.getCounterMultiplierBonus() * 100)

    const statItems = [
      { label: '攻击提升', val: `+${atkPct}%` },
      { label: '攻速提升', val: `+${spdPct}%` },
      { label: '射程扩增', val: `+${rng}px` },
      { label: '粮草斩获', val: `+${costPct}%` },
      { label: '克制增伤', val: `+${counterPct}%` }
    ]

    const itemW = w / statItems.length
    const startX = x - w / 2 + itemW / 2

    statItems.forEach((item, idx) => {
      const ix = startX + idx * itemW
      const valTxt = inkText(this.scene, ix, y - 9, item.val, {
        size: 16,
        color: InkText.strong,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      const lblTxt = inkText(this.scene, ix, y + 13, item.label, {
        size: 11,
        color: InkText.wash,
        originX: 0.5,
        originY: 0.5
      })
      this.add([valTxt, lblTxt])

      if (idx < statItems.length - 1) {
        const div = this.scene.add.line(0, 0, ix + itemW / 2, y - 18, ix + itemW / 2, y + 18, InkColor.inkFaint, 0.3)
        this.add(div)
      }
    })
  }

  private createScrollList(x: number, y: number, w: number, h: number): void {
    const listX = x - w / 2
    const listY = y - h / 2

    // 视口背景与遮罩
    const viewBg = this.scene.add.rectangle(x, y, w, h, InkColor.paperDeep, 0.4)
    viewBg.setStrokeStyle(1, InkColor.inkFaint, 0.4)
    this.add(viewBg)

    const maskG = this.scene.make.graphics({ x: 0, y: 0 })
    maskG.fillRect(listX, listY, w, h)
    const mask = maskG.createGeometryMask()

    this.scrollContainer = this.scene.add.container(listX, listY)
    this.scrollContainer.setMask(mask)
    this.add(this.scrollContainer)

    // 聚合锦囊列表
    const aggregated = this.getAggregatedAugments()

    if (aggregated.length === 0) {
      const emptyTxt = inkText(this.scene, w / 2, h / 2, '当前尚未激活任何军师锦囊。\n请在击杀敌人积攒军令后抽取！', {
        size: 15,
        color: InkText.faint,
        originX: 0.5,
        originY: 0.5
      })
      emptyTxt.setLineSpacing(8)
      emptyTxt.setAlign('center')
      this.scrollContainer.add(emptyTxt)
      return
    }

    const cardH = 72
    const gap = 8
    let currentY = 8

    aggregated.forEach((item) => {
      const card = this.createAugmentCard(0, currentY, w, cardH, item)
      this.scrollContainer.add(card)
      currentY += cardH + gap
    })

    const totalContentH = currentY + 4
    this.maxScroll = Math.max(0, totalContentH - h)

    // 滚轮滑动交互
    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any, _dx: number, dy: number) => {
      if (this.maxScroll <= 0 || !this.active) return
      const px = _pointer.x
      const py = _pointer.y
      if (px < listX || px > listX + w || py < listY || py > listY + h) return

      this.scrollY = Phaser.Math.Clamp(this.scrollY - dy * 0.6, -this.maxScroll, 0)
      this.scene.tweens.killTweensOf(this.scrollContainer)
      this.scene.tweens.add({
        targets: this.scrollContainer,
        y: listY + this.scrollY,
        duration: 100,
        ease: 'Sine.easeOut'
      })
    })
  }

  private getAggregatedAugments(): AggregatedAugment[] {
    const raw = this.augmentManager.getActiveAugments()
    const map = new Map<string, AggregatedAugment>()

    for (const aug of raw) {
      const existing = map.get(aug.id)
      if (existing) {
        existing.count++
      } else {
        map.set(aug.id, { augment: aug, count: 1 })
      }
    }

    return Array.from(map.values())
  }

  private createAugmentCard(
    x: number,
    y: number,
    w: number,
    h: number,
    item: AggregatedAugment
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    const { augment, count } = item
    const rInfo = RARITY_INFO[augment.rarity] || RARITY_INFO.common

    // 卡片底板
    const bg = this.scene.add.rectangle(w / 2, h / 2, w - 8, h, InkColor.paperPanel, 0.95)
    bg.setStrokeStyle(1.2, count > 1 ? InkColor.cinnabar : rInfo.stroke, count > 1 ? 0.9 : 0.6)
    container.add(bg)

    // 左侧品质色条
    const colorBar = this.scene.add.rectangle(8, h / 2, 4, h - 8, rInfo.stroke, 0.9)
    container.add(colorBar)

    // 品质印章
    const rarityBadge = inkText(this.scene, 22, 14, rInfo.label, {
      size: 11,
      color: rInfo.text,
      bold: true
    })
    container.add(rarityBadge)

    // 锦囊名号
    const nameTxt = inkText(this.scene, 58, 13, `《${augment.name}》`, {
      size: 16,
      color: InkText.strong,
      bold: true
    })
    container.add(nameTxt)

    // 叠加次数印章徽章 (例如 ×3)
    if (count > 1) {
      const badgeW = 42
      const badgeH = 20
      const badgeX = 58 + nameTxt.width + 26
      const badgeY = 22

      const stackSeal = this.scene.add.rectangle(badgeX, badgeY, badgeW, badgeH, InkColor.cinnabar, 1)
      stackSeal.setStrokeStyle(1, 0x6e1b15)
      const stackTxt = inkText(this.scene, badgeX, badgeY, `×${count}`, {
        size: 12,
        color: '#ffffff',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      container.add([stackSeal, stackTxt])
    }

    // 副标题/典故
    if (augment.subtitle) {
      const subTxt = inkText(this.scene, 22, 36, augment.subtitle, {
        size: 11,
        color: InkText.faint
      })
      container.add(subTxt)
    }

    // 详细效果描述（标明叠加后效果）
    const descText = this.formatEffectDesc(augment, count)
    const desc = inkText(this.scene, 22, 52, descText, {
      size: 12,
      color: count > 1 ? InkText.cinnabar : InkText.wash,
      bold: count > 1
    })
    container.add(desc)

    // 右侧五行属性标签
    if (augment.tags && augment.tags.length > 0) {
      let tagX = w - 24
      for (let t = augment.tags.length - 1; t >= 0; t--) {
        const tag = augment.tags[t]
        const tagText = inkText(this.scene, tagX, 15, tag, {
          size: 11,
          color: InkText.wash,
          originX: 1
        })
        container.add(tagText)
        tagX -= tagText.width + 6
      }
    }

    return container
  }

  private formatEffectDesc(aug: Augment, count: number): string {
    const eff = aug.effects
    const parts: string[] = []

    if (eff.attackPercentBonus) {
      const single = Math.round(eff.attackPercentBonus * 100)
      const total = single * count
      parts.push(`攻击力 +${single}%${count > 1 ? ` (累计 +${total}%)` : ''}`)
    }
    if (eff.attackSpeedBonus) {
      const single = Math.round(eff.attackSpeedBonus * 100)
      const total = single * count
      parts.push(`攻击速度 +${single}%${count > 1 ? ` (累计 +${total}%)` : ''}`)
    }
    if (eff.attackRangeBonus) {
      const single = eff.attackRangeBonus
      const total = single * count
      parts.push(`攻击范围 +${single}px${count > 1 ? ` (累计 +${total}px)` : ''}`)
    }
    if (eff.reactionDamageMultiplier) {
      const total = (eff.reactionDamageMultiplier * count).toFixed(1)
      parts.push(`反应倍率 +${eff.reactionDamageMultiplier}x${count > 1 ? ` (累计 +${total}x)` : ''}`)
    }
    if (eff.costGainBonus) {
      const single = Math.round(eff.costGainBonus * 100)
      const total = single * count
      parts.push(`粮草斩获 +${single}%${count > 1 ? ` (累计 +${total}%)` : ''}`)
    }
    if (eff.counterMultiplierBonus) {
      const single = Math.round(eff.counterMultiplierBonus * 100)
      const total = single * count
      parts.push(`五行克制伤害 +${single}%${count > 1 ? ` (累计 +${total}%)` : ''}`)
    }

    return parts.join('，') || aug.description
  }

  private close(): void {
    SoundFX.thud(0.2)
    if (this.onCloseCallback) {
      this.onCloseCallback()
    }
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 150,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.destroy()
      }
    })
  }
}
