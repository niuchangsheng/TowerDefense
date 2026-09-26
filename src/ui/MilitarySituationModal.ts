import Phaser from 'phaser'
import { MilitarySituation, MilitaryTacticType } from '@/types/militarySituation'
import {
  InkColor,
  InkText,
  inkText,
  createInkButton,
  InkDepth,
  INK_FONT
} from './InkTheme'
import { SoundFX } from '@/effects/SoundFX'

/**
 * 探马急报 · 军机密信水墨文书弹窗
 * 每10波前线出现天时军情异象时展开，呈递【上策】与【下策】供军师临机决断
 */
export class MilitarySituationModal extends Phaser.GameObjects.Container {
  private situation: MilitarySituation
  private onSelectCallback: (type: MilitaryTacticType) => void

  constructor(
    scene: Phaser.Scene,
    situation: MilitarySituation,
    onSelect: (type: MilitaryTacticType) => void
  ) {
    const width = scene.cameras.main.width
    const height = scene.cameras.main.height

    super(scene, 0, 0)
    this.situation = situation
    this.onSelectCallback = onSelect
    this.setDepth(InkDepth.popup + 5)

    // 1. 半透明水墨遮罩（拦截底层交互）
    const overlay = scene.add.rectangle(0, 0, width, height, 0x111111, 0.8)
    overlay.setOrigin(0, 0)
    overlay.setInteractive()
    this.add(overlay)

    // 2. 绘制中央宣纸长卷底板 (宽 860, 高 540)
    const panelW = 860
    const panelH = 540
    const panelX = width / 2
    const panelY = height / 2

    const panelBg = scene.add.rectangle(panelX, panelY, panelW, panelH, InkColor.paper, 0.98)
    panelBg.setStrokeStyle(3, InkColor.inkStrong)
    this.add(panelBg)

    // 内衬淡墨重框
    const innerBorder = scene.add.rectangle(panelX, panelY, panelW - 16, panelH - 16)
    innerBorder.setStrokeStyle(1, InkColor.inkFaint, 0.4)
    this.add(innerBorder)

    // 3. 卷首标题与急报印章
    this.createHeader(panelX, panelY - panelH / 2 + 36)

    // 4. 战况急报正文
    this.createReportSection(panelX, panelY - 145, panelW - 80)

    // 5. 【上策】与【下策】两枚令签竹简卡牌
    this.createTacticCards(panelX, panelY + 95)

    scene.add.existing(this)

    // 入场动效
    this.setAlpha(0)
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 250,
      ease: 'Sine.easeOut'
    })

    SoundFX.gong()
  }

  private createHeader(x: number, y: number): void {
    // 朱砂急报印章
    const seal = this.scene.add.rectangle(x - 170, y, 92, 28, InkColor.cinnabar)
    seal.setStrokeStyle(1.5, 0x6e1b15)
    const sealTxt = inkText(this.scene, x - 170, y, '军机急报', {
      size: 14,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.add([seal, sealTxt])

    // 大标题
    const title = inkText(this.scene, x + 25, y, `前线变乱 · ${this.situation.name}`, {
      size: 28,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.add(title)

    // 分隔墨线
    const rule = this.scene.add.graphics()
    rule.lineStyle(1.5, InkColor.ink, 0.25)
    rule.lineBetween(x - 380, y + 26, x + 380, y + 26)
    this.add(rule)
  }

  private createReportSection(x: number, y: number, w: number): void {
    const box = this.scene.add.rectangle(x, y, w, 76, InkColor.paperDeep, 0.55)
    box.setStrokeStyle(1, InkColor.inkFaint, 0.4)
    this.add(box)

    const text = inkText(this.scene, x, y, this.situation.reportText, {
      size: 15,
      color: InkText.ink,
      wrapWidth: w - 40,
      originX: 0.5,
      originY: 0.5
    })
    this.add(text)
  }

  private createTacticCards(centerX: number, centerY: number): void {
    const cardW = 370
    const cardH = 265
    const gap = 30
    const leftX = centerX - cardW / 2 - gap / 2
    const rightX = centerX + cardW / 2 + gap / 2

    // 渲染【上策】
    this.renderSingleCard(leftX, centerY, cardW, cardH, 'upper', this.situation.tactics.upper)

    // 渲染【下策】
    this.renderSingleCard(rightX, centerY, cardW, cardH, 'lower', this.situation.tactics.lower)
  }

  private renderSingleCard(
    x: number,
    y: number,
    w: number,
    h: number,
    type: MilitaryTacticType,
    tactic: any
  ): void {
    const isUpper = type === 'upper'
    const cardBg = this.scene.add.rectangle(x, y, w, h, InkColor.paperPanel, 0.85)
    const borderColor = isUpper ? 0xa0782f : 0x2e5c8a
    cardBg.setStrokeStyle(2, borderColor, 0.8)
    this.add(cardBg)

    // 标签印签
    const badgeLabel = isUpper ? '◈ 上策 · 化解应变' : '◈ 下策 · 借势突围'
    const badgeColor = isUpper ? InkText.gold : '#2e5c8a'
    const badge = inkText(this.scene, x - w / 2 + 24, y - h / 2 + 24, badgeLabel, {
      size: 13,
      color: badgeColor,
      bold: true
    })
    this.add(badge)

    // 策论名称
    const title = inkText(this.scene, x - w / 2 + 24, y - h / 2 + 56, tactic.name, {
      size: 22,
      color: InkText.strong,
      bold: true
    })
    this.add(title)

    // 军费扣减提示
    if (tactic.costDeduction) {
      const costBadge = inkText(this.scene, x + w / 2 - 24, y - h / 2 + 58, `需消耗 ${tactic.costDeduction} 军费`, {
        size: 12,
        color: InkText.cinnabar,
        bold: true,
        originX: 1
      })
      this.add(costBadge)
    } else if (tactic.grantRerolls) {
      const rerollBadge = inkText(this.scene, x + w / 2 - 24, y - h / 2 + 58, `获赠 +${tactic.grantRerolls} 刷新令`, {
        size: 12,
        color: InkText.green,
        bold: true,
        originX: 1
      })
      this.add(rerollBadge)
    }

    // 描述文案
    const desc = inkText(this.scene, x, y - 8, tactic.description, {
      size: 14,
      color: InkText.wash,
      wrapWidth: w - 48,
      originX: 0.5,
      originY: 0.5
    })
    this.add(desc)

    // 决断采纳按钮
    const btnText = isUpper ? '采纳上策' : '采纳下策'
    const btnFill = isUpper ? InkColor.cinnabar : InkColor.inkStrong
    const btnHover = isUpper ? 0xb53a32 : InkColor.ink

    const btn = createInkButton(this.scene, x, y + h / 2 - 38, 180, 40, btnText, {
      fill: btnFill,
      hoverFill: btnHover,
      textColor: InkText.paper,
      fontSize: 16,
      onClick: () => {
        SoundFX.stamp()
        this.onSelectCallback(type)
        this.close()
      }
    })
    this.add(btn)
  }

  private close(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.destroy()
      }
    })
  }
}
