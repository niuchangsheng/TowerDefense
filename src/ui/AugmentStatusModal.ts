import Phaser from 'phaser'
import { Augment } from '@/types/augment'
import { AugmentManager } from '@/core/augment/AugmentManager'
import {
  InkColor,
  InkText,
  inkText,
  createInkButton,
  InkDepth
} from './InkTheme'
import { getStratagemStyle } from './AugmentSelectModal'
import { SoundFX } from '@/effects/SoundFX'

interface AggregatedAugment {
  augment: Augment
  count: number
}

/**
 * 已选天命锦囊总览弹窗
 * - 顶部直观展示当前已选锦囊汇总属性加成（去除晦涩“乘区”术语）
 * - 列表采用双行高可读卡片与固定视窗分页/滚轮切换，彻底杜绝多卡溢出与文字重叠
 */
export class AugmentStatusModal extends Phaser.GameObjects.Container {
  private augmentManager: AugmentManager
  private onCloseCallback?: () => void
  private onResetCallback?: () => void
  private listContainer!: Phaser.GameObjects.Container
  private pageInfoText?: Phaser.GameObjects.Text
  private aggregated: AggregatedAugment[] = []
  private startIndex: number = 0
  private readonly pageSize: number = 5
  private wheelHandler?: (
    pointer: Phaser.Input.Pointer,
    gameObjects: Phaser.GameObjects.GameObject[],
    dx: number,
    dy: number
  ) => void
  private escKey?: Phaser.Input.Keyboard.Key

  private readonly panelW = 880
  private readonly panelH = 616
  private readonly listW = 824
  private readonly listH = 382

  constructor(
    scene: Phaser.Scene,
    augmentManager: AugmentManager,
    onClose?: () => void,
    onReset?: () => void
  ) {
    const width = scene.cameras.main.width
    const height = scene.cameras.main.height

    super(scene, 0, 0)
    this.augmentManager = augmentManager
    this.onCloseCallback = onClose
    this.onResetCallback = onReset
    this.setDepth(InkDepth.popup + 6)

    this.aggregated = this.getAggregatedAugments()

    // 1. 半透明水墨遮罩（拦截底层交互并支持点击空白关闭）
    const overlay = scene.add.rectangle(0, 0, width, height, 0x111111, 0.76)
    overlay.setOrigin(0, 0)
    overlay.setInteractive()
    overlay.on('pointerdown', () => this.close())
    this.add(overlay)

    // 2. 宣纸卷轴底板
    const panelX = width / 2
    const panelY = height / 2
    const panelTop = panelY - this.panelH / 2
    const panelBottom = panelY + this.panelH / 2

    const panelBg = scene.add.rectangle(panelX, panelY, this.panelW, this.panelH, InkColor.paper, 0.99)
    panelBg.setStrokeStyle(3, InkColor.inkStrong)
    panelBg.setInteractive()
    this.add(panelBg)

    const innerBorder = scene.add.rectangle(panelX, panelY, this.panelW - 16, this.panelH - 16)
    innerBorder.setStrokeStyle(1, InkColor.inkFaint, 0.35)
    this.add(innerBorder)

    // 3. 卷首标题栏
    this.createHeader(panelX, panelTop + 34)

    // 4. 全军属性加成总览横幅（直观易懂，无“乘区”字眼）
    this.createStatsBanner(panelX, panelTop + 92, this.listW)

    // 5. 已选锦囊卡片列表（单屏精准容纳 5 张卡片，超出支持滚轮/翻页）
    this.createCardListArea(panelX, panelTop + 136 + this.listH / 2, this.listW, this.listH)

    // 6. 底部操作栏
    this.createFooter(panelX, panelBottom - 30)

    if (scene.input.keyboard) {
      this.escKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      this.escKey.once('down', () => this.close())
    }

    scene.add.existing(this)

    this.setAlpha(0)
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 180,
      ease: 'Sine.easeOut'
    })

    SoundFX.whoosh(0.3)
  }

  private createHeader(centerX: number, y: number): void {
    const leftX = centerX - this.listW / 2

    const sealRect = this.scene.add.rectangle(leftX + 8, y, 12, 12, InkColor.cinnabar)
    const title = inkText(this.scene, leftX + 22, y, '已选天命锦囊', {
      size: 22,
      color: InkText.strong,
      bold: true,
      originY: 0.5
    })
    const subTitle = inkText(
      this.scene,
      leftX + 22 + title.width + 12,
      y + 1,
      '· 当前生效奇谋与全军属性加成一览',
      {
        size: 13,
        color: InkText.faint,
        originY: 0.5
      }
    )
    this.add([sealRect, title, subTitle])

    const totalCount = this.augmentManager.getActiveAugments().length
    const rerolls = this.augmentManager.getRerollCount()
    const rightEdge = centerX + this.listW / 2

    const hasResetBtn = Boolean(this.onResetCallback && totalCount > 0)
    const resetSpace = hasResetBtn ? 104 : 0

    const badgeW = 196
    const badgeX = rightEdge - resetSpace - badgeW / 2
    const badgeBg = this.scene.add.rectangle(badgeX, y, badgeW, 28, InkColor.paperDeep, 0.9)
    badgeBg.setStrokeStyle(1, 0xa0782f, 0.7)
    const badgeTxt = inkText(
      this.scene,
      badgeX,
      y,
      `已选 ${totalCount} 策  |  易策令 ${rerolls} 枚`,
      {
        size: 12.5,
        color: InkText.strong,
        bold: true,
        originX: 0.5,
        originY: 0.5
      }
    )
    this.add([badgeBg, badgeTxt])

    if (hasResetBtn && this.onResetCallback) {
      const resetBtn = createInkButton(
        this.scene,
        rightEdge - 46,
        y,
        92,
        28,
        '↺ 清空重选',
        {
          fill: InkColor.paperPanel,
          hoverFill: InkColor.cinnabar,
          textColor: InkText.cinnabar,
          fontSize: 12,
          stroke: InkColor.cinnabar,
          onClick: () => {
            SoundFX.thud(0.25)
            this.onResetCallback?.()
            this.close()
          }
        }
      )
      this.add(resetBtn)
    }
  }

  private createStatsBanner(x: number, y: number, w: number): void {
    const banner = this.scene.add.rectangle(x, y, w, 60, InkColor.paperPanel, 0.95)
    banner.setStrokeStyle(1.2, 0xa0782f, 0.7)
    this.add(banner)

    const atkPct = Math.round(this.augmentManager.getAttackPercentBonus() * 100)
    const dmgIncPct = Math.round(this.augmentManager.getDamageIncreaseBonus() * 100)
    const reactPct = Math.round(this.augmentManager.getReactionMultiplierBonus() * 100)
    const vulnPct = Math.round(this.augmentManager.getVulnerabilityBonus() * 100)
    const critRatePct = Math.round(this.augmentManager.getCritRateBonus() * 100)
    const critDmgPct = Math.round(this.augmentManager.getCritDamageBonus() * 100)
    const spdPct = Math.round(this.augmentManager.getAttackSpeedBonus() * 100)
    const costPct = Math.round((this.augmentManager.getCostGainMultiplier() - 1) * 100)

    const statItems = [
      { label: '⚔️ 攻击力提升', val: `+${atkPct}%`, color: InkText.cinnabar },
      { label: '🔥 全军 / 相生增伤', val: `+${dmgIncPct}% / +${reactPct}%`, color: '#235739' },
      { label: '🩸 敌军易伤加深', val: `+${vulnPct}%`, color: '#563082' },
      { label: '💥 暴击率 / 暴伤', val: `+${critRatePct}% / +${critDmgPct}%`, color: '#875714' },
      { label: '⚡ 攻速 / 军费加成', val: `+${spdPct}% / +${costPct}%`, color: '#1c496e' }
    ]

    const itemW = w / statItems.length
    const startX = x - w / 2 + itemW / 2

    statItems.forEach((item, idx) => {
      const ix = startX + idx * itemW
      const valTxt = inkText(this.scene, ix, y - 9, item.val, {
        size: 15,
        color: item.color,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      const lblTxt = inkText(this.scene, ix, y + 13, item.label, {
        size: 11.5,
        color: InkText.wash,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      this.add([valTxt, lblTxt])

      if (idx < statItems.length - 1) {
        const div = this.scene.add.line(0, 0, ix + itemW / 2, y - 20, ix + itemW / 2, y + 20, InkColor.inkFaint, 0.3)
        this.add(div)
      }
    })
  }

  private createCardListArea(x: number, y: number, w: number, h: number): void {
    const listX = x - w / 2
    const listY = y - h / 2

    const viewBg = this.scene.add.rectangle(x, y, w, h, InkColor.paperDeep, 0.38)
    viewBg.setStrokeStyle(1, InkColor.inkFaint, 0.4)
    this.add(viewBg)

    this.listContainer = this.scene.add.container(listX, listY)
    this.add(this.listContainer)

    this.renderVisibleCards(w, h)

    const maxStart = Math.max(0, this.aggregated.length - this.pageSize)
    if (maxStart > 0) {
      this.wheelHandler = (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number
      ) => {
        if (!this.active) return
        const px = _pointer.x
        const py = _pointer.y
        if (px < listX || px > listX + w || py < listY || py > listY + h) return

        const step = dy > 0 ? 1 : -1
        const nextIndex = Phaser.Math.Clamp(this.startIndex + step, 0, maxStart)
        if (nextIndex !== this.startIndex) {
          this.startIndex = nextIndex
          this.renderVisibleCards(w, h)
          this.updatePageInfo()
        }
      }
      this.scene.input.on('wheel', this.wheelHandler)
    }
  }

  private renderVisibleCards(w: number, h: number): void {
    this.listContainer.removeAll(true)

    if (this.aggregated.length === 0) {
      const emptyTxt = inkText(
        this.scene,
        w / 2,
        h / 2,
        '当前尚未拆阅任何天命锦囊。\n在 Wave 1 开局与 Wave 4 / 7 / 10 / 13 清波（或点击右上角“模拟三选一”）即可选策！',
        {
          size: 15,
          color: InkText.faint,
          originX: 0.5,
          originY: 0.5
        }
      )
      emptyTxt.setLineSpacing(8)
      emptyTxt.setAlign('center')
      this.listContainer.add(emptyTxt)
      return
    }

    const cardH = 68
    const gap = 7
    let currentY = 8

    const visibleItems = this.aggregated.slice(this.startIndex, this.startIndex + this.pageSize)
    visibleItems.forEach((item, idx) => {
      const orderNum = this.startIndex + idx + 1
      const card = this.createAugmentCard(0, currentY, w, cardH, item, orderNum)
      this.listContainer.add(card)
      currentY += cardH + gap
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

  /**
   * 双行清爽锦囊卡片（高度 68px，单行标题 + 单行精炼效果，绝不重叠）
   */
  private createAugmentCard(
    x: number,
    y: number,
    w: number,
    h: number,
    item: AggregatedAugment,
    orderNum: number
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y)
    const { augment, count } = item
    const style = getStratagemStyle(augment)

    const bg = this.scene.add.rectangle(w / 2, h / 2, w - 12, h, style.tint, 0.96)
    bg.setStrokeStyle(1.4, count > 1 ? InkColor.cinnabar : style.stroke, 0.85)
    container.add(bg)

    const colorBar = this.scene.add.rectangle(10, h / 2, 5, h - 10, style.stroke, 0.95)
    container.add(colorBar)

    // ==================== 第一行 (y = 20)：序号 + 策系 + 锦囊名 + 词头 | 右侧直观数值胶囊 ====================
    const row1Y = 20

    const indexBadge = inkText(this.scene, 20, row1Y, `${orderNum}.`, {
      size: 13,
      color: InkText.faint,
      bold: true,
      originY: 0.5
    })
    container.add(indexBadge)

    const catBadge = inkText(this.scene, 38, row1Y, style.label, {
      size: 12,
      color: style.text,
      bold: true,
      originY: 0.5
    })
    container.add(catBadge)

    const nameTxt = inkText(
      this.scene,
      38 + catBadge.width + 6,
      row1Y,
      `《${augment.name}》`,
      {
        size: 15.5,
        color: InkText.strong,
        bold: true,
        originY: 0.5
      }
    )
    container.add(nameTxt)

    let cursorX = 38 + catBadge.width + 6 + nameTxt.width + 8
    const mechTitle = augment.mechanismTitle || ''
    if (mechTitle) {
      const mechTxt = inkText(this.scene, cursorX, row1Y, mechTitle, {
        size: 12.5,
        color: InkText.cinnabar,
        bold: true,
        originY: 0.5
      })
      container.add(mechTxt)
      cursorX += mechTxt.width + 10
    }

    if (count > 1) {
      const badgeW = 42
      const badgeH = 20
      const badgeX = cursorX + badgeW / 2
      const stackSeal = this.scene.add.rectangle(badgeX, row1Y, badgeW, badgeH, InkColor.cinnabar, 1)
      stackSeal.setStrokeStyle(1, 0x6e1b15)
      const stackTxt = inkText(this.scene, badgeX, row1Y, `×${count}`, {
        size: 12,
        color: '#ffffff',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      container.add([stackSeal, stackTxt])
    }

    // 右上角：直观属性加成标签（无任何“乘区”字眼）
    const statSummary = this.formatPlayerFriendlyStats(augment, count)
    if (statSummary) {
      const statPillTxt = inkText(this.scene, w - 20, row1Y, statSummary, {
        size: 12,
        color: count > 1 ? InkText.cinnabar : '#8a5a14',
        bold: true,
        originX: 1,
        originY: 0.5
      })
      container.add(statPillTxt)
    }

    // 行间极细墨线
    const divider = this.scene.add.line(0, 0, 20, 35, w - 20, 35, style.stroke, 0.16).setOrigin(0, 0)
    container.add(divider)

    // ==================== 第二行 (y = 50)：单行精炼效果说明 ====================
    const conciseRule = this.getCleanEffectText(augment)
    const subTxt = inkText(this.scene, 22, 50, conciseRule, {
      size: 12,
      color: InkText.ink,
      originY: 0.5
    })
    container.add(subTxt)

    return container
  }

  /**
   * 提炼玩家易读的一句话核心效果（去除“改写后：”前缀与括号内公式术语，控制单行长度）
   */
  private getCleanEffectText(aug: Augment): string {
    const raw = (aug.ruleAfter || aug.description || '')
      .replace(/^改写后：\s*/, '')
      .replace(/^【[^】]+】：\s*/, '')
      .replace(/（[^）]*(?:乘区|加成区|易伤区|增伤区|加算|保底)[^）]*）/g, '')
      .trim()

    return raw.length > 58 ? `${raw.slice(0, 58)}…` : raw
  }

  /**
   * 生成直观易懂的数值加成汇总（去除所有“乘区”字样）
   */
  private formatPlayerFriendlyStats(aug: Augment, count: number): string {
    const eff = aug.effects
    const parts: string[] = []

    if (eff.attackPercentBonus) {
      parts.push(`⚔️ 攻击 +${Math.round(eff.attackPercentBonus * 100) * count}%`)
    }
    if (eff.damageIncreaseBonus) {
      parts.push(`🔥 全军增伤 +${Math.round(eff.damageIncreaseBonus * 100) * count}%`)
    }
    if (eff.reactionDamageMultiplier) {
      parts.push(`🔗 相生伤害 +${Math.round(eff.reactionDamageMultiplier * 100) * count}%`)
    }
    if (eff.vulnerabilityBonus) {
      parts.push(`🩸 敌军易伤 +${Math.round(eff.vulnerabilityBonus * 100) * count}%`)
    }
    if (eff.critRateBonus) {
      parts.push(`🎯 暴击率 +${Math.round(eff.critRateBonus * 100) * count}%`)
    }
    if (eff.critDamageBonus) {
      parts.push(`💥 暴伤 +${Math.round(eff.critDamageBonus * 100) * count}%`)
    }
    if (eff.attackSpeedBonus) {
      parts.push(`⚡ 攻速 +${Math.round(eff.attackSpeedBonus * 100) * count}%`)
    }
    if (eff.attackRangeBonus) {
      parts.push(`🎯 射程 +${eff.attackRangeBonus * count}px`)
    }
    if (eff.costGainBonus) {
      parts.push(`🪙 军费 +${Math.round(eff.costGainBonus * 100) * count}%`)
    }
    if (eff.baseMaxHealthBonus) {
      parts.push(`🏯 帅营上限 +${eff.baseMaxHealthBonus * count}`)
    }
    if (aug.id === 'aug_wooden_ox') {
      parts.push(`🎲 易策令 +${2 * count}`)
    }

    return parts.join('   ')
  }

  private createFooter(centerX: number, y: number): void {
    const maxStart = Math.max(0, this.aggregated.length - this.pageSize)

    if (maxStart > 0) {
      const prevBtn = createInkButton(this.scene, centerX - 160, y, 88, 32, '▲ 上一策', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.ink,
        fontSize: 12,
        stroke: InkColor.inkFaint,
        onClick: () => {
          if (this.startIndex > 0) {
            SoundFX.thud(0.15)
            this.startIndex = Math.max(0, this.startIndex - 1)
            this.renderVisibleCards(this.listW, this.listH)
            this.updatePageInfo()
          }
        }
      })

      const nextBtn = createInkButton(this.scene, centerX + 160, y, 88, 32, '下一策 ▼', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.ink,
        fontSize: 12,
        stroke: InkColor.inkFaint,
        onClick: () => {
          if (this.startIndex < maxStart) {
            SoundFX.thud(0.15)
            this.startIndex = Math.min(maxStart, this.startIndex + 1)
            this.renderVisibleCards(this.listW, this.listH)
            this.updatePageInfo()
          }
        }
      })

      this.pageInfoText = inkText(
        this.scene,
        centerX + this.listW / 2,
        y,
        `显示 ${this.startIndex + 1}~${Math.min(this.aggregated.length, this.startIndex + this.pageSize)} / 共 ${this.aggregated.length} 种`,
        {
          size: 12,
          color: InkText.faint,
          originX: 1,
          originY: 0.5
        }
      )

      this.add([prevBtn, nextBtn, this.pageInfoText])
    }

    const closeBtn = createInkButton(this.scene, centerX, y, 140, 36, '合卷归位', {
      fill: InkColor.inkStrong,
      hoverFill: InkColor.ink,
      textColor: InkText.paper,
      fontSize: 15,
      onClick: () => this.close()
    })
    this.add(closeBtn)
  }

  private updatePageInfo(): void {
    if (!this.pageInfoText) return
    this.pageInfoText.setText(
      `显示 ${this.startIndex + 1}~${Math.min(this.aggregated.length, this.startIndex + this.pageSize)} / 共 ${this.aggregated.length} 种`
    )
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

  destroy(fromScene?: boolean): void {
    if (this.wheelHandler && this.scene?.input) {
      this.scene.input.off('wheel', this.wheelHandler)
      this.wheelHandler = undefined
    }
    if (this.escKey) {
      this.escKey.removeAllListeners()
      this.escKey = undefined
    }
    super.destroy(fromScene)
  }
}
