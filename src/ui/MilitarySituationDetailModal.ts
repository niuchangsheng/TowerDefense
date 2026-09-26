import Phaser from 'phaser'
import { MilitarySituation, MilitaryTactic } from '@/types/militarySituation'
import {
  InkColor,
  InkText,
  inkText,
  createInkButton,
  InkDepth
} from './InkTheme'
import { SoundFX } from '@/effects/SoundFX'

/**
 * 军机密报 · 战况详录弹窗
 * 允许玩家在战斗中随时查阅当前战场天时、天候环境、已采纳军策及各项属性增益明细
 */
export class MilitarySituationDetailModal extends Phaser.GameObjects.Container {
  private onCloseCallback?: () => void

  constructor(
    scene: Phaser.Scene,
    situation?: MilitarySituation | null,
    activeTactic?: MilitaryTactic | null,
    onClose?: () => void
  ) {
    const width = scene.cameras.main.width
    const height = scene.cameras.main.height

    super(scene, 0, 0)
    this.onCloseCallback = onClose
    this.setDepth(InkDepth.popup + 6)

    // 1. 半透明水墨遮罩（拦截底层交互并支持点击关闭）
    const overlay = scene.add.rectangle(0, 0, width, height, 0x111111, 0.75)
    overlay.setOrigin(0, 0)
    overlay.setInteractive()
    overlay.on('pointerdown', () => this.close())
    this.add(overlay)

    // 2. 宣纸卷轴底板 (宽 680, 高 460)
    const panelW = 680
    const panelH = 460
    const panelX = width / 2
    const panelY = height / 2

    const panelBg = scene.add.rectangle(panelX, panelY, panelW, panelH, InkColor.paper, 0.98)
    panelBg.setStrokeStyle(3, InkColor.inkStrong)
    panelBg.setInteractive() // 阻止点击穿透到遮罩
    this.add(panelBg)

    // 内衬淡墨纹框
    const innerBorder = scene.add.rectangle(panelX, panelY, panelW - 16, panelH - 16)
    innerBorder.setStrokeStyle(1, InkColor.inkFaint, 0.4)
    this.add(innerBorder)

    // 3. 卷首标题与朱印
    this.createHeader(panelX, panelY - panelH / 2 + 38)

    // 4. 内容排版
    if (situation && activeTactic) {
      this.createActiveContent(panelX, panelY, panelW, situation, activeTactic)
    } else {
      this.createCalmContent(panelX, panelY, panelW)
    }

    // 5. 底部关闭按钮
    const closeBtn = createInkButton(scene, panelX, panelY + panelH / 2 - 38, 120, 36, '阅毕合卷', {
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
    // 朱砂急报印章
    const seal = this.scene.add.rectangle(x - 140, y, 84, 26, InkColor.cinnabar)
    seal.setStrokeStyle(1.5, 0x6e1b15)
    const sealTxt = inkText(this.scene, x - 140, y, '军机密报', {
      size: 13,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.add([seal, sealTxt])

    // 大标题
    const title = inkText(this.scene, x + 35, y, '天时军略 · 战况详录', {
      size: 24,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.add(title)
  }

  private createActiveContent(
    x: number,
    y: number,
    w: number,
    situation: MilitarySituation,
    tactic: MilitaryTactic
  ): void {
    const isUpper = tactic.type === 'upper'
    const contentW = w - 80

    // 天候局势底框
    const weatherBox = this.scene.add.rectangle(x, y - 90, contentW, 95, InkColor.paperPanel, 0.9)
    weatherBox.setStrokeStyle(1, InkColor.inkFaint, 0.5)
    this.add(weatherBox)

    const weatherNames: Record<string, string> = {
      fog: '江雾弥漫（远视受限）',
      sun: '赤地烈日（火势燎原）',
      rain: '暴雨倾盆（江河暴涨）',
      wind: '逆风疾烈（铁骑突袭）',
      clear: '长空无云（辎重暴露）'
    }

    const weatherTitle = inkText(this.scene, x - contentW / 2 + 18, y - 122, `【当前战局 · ${situation.name}】`, {
      size: 16,
      color: InkText.cinnabar,
      bold: true
    })
    const weatherDesc = inkText(
      this.scene,
      x - contentW / 2 + 18,
      y - 95,
      `天时天候：${weatherNames[situation.weather] || '晴朗'}\n军情急报：${situation.reportText}`,
      {
        size: 13,
        color: InkText.wash,
        wrapWidth: contentW - 36
      }
    )
    weatherDesc.setLineSpacing(5)
    this.add([weatherTitle, weatherDesc])

    // 采纳军策展示框
    const tacticBox = this.scene.add.rectangle(x, y + 55, contentW, 130, isUpper ? 0xfbf1ef : 0xeff5fa, 0.95)
    tacticBox.setStrokeStyle(1.5, isUpper ? InkColor.cinnabar : 0x2e5c8a, 0.8)
    this.add(tacticBox)

    // 策令印章
    const sealBg = this.scene.add.rectangle(x - contentW / 2 + 55, y + 16, 76, 24, isUpper ? InkColor.cinnabar : 0x2e5c8a)
    const sealTxt = inkText(this.scene, x - contentW / 2 + 55, y + 16, isUpper ? '钦定上策' : '顺势下策', {
      size: 12,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.add([sealBg, sealTxt])

    const tacticTitle = inkText(this.scene, x - contentW / 2 + 105, y + 16, `《${tactic.name}》`, {
      size: 18,
      color: InkText.strong,
      bold: true,
      originY: 0.5
    })
    this.add(tacticTitle)

    const tacticDesc = inkText(this.scene, x - contentW / 2 + 20, y + 42, tactic.description, {
      size: 13,
      color: InkText.strong,
      wrapWidth: contentW - 40
    })
    tacticDesc.setLineSpacing(6)
    this.add(tacticDesc)

    // 增益状态总结
    const bonusSummary = this.formatTacticBonuses(tactic)
    if (bonusSummary) {
      const summaryText = inkText(this.scene, x - contentW / 2 + 20, y + 92, `当前已生效特权：${bonusSummary}`, {
        size: 12,
        color: isUpper ? '#9e2b25' : '#1b4570',
        bold: true
      })
      this.add(summaryText)
    }
  }

  private formatTacticBonuses(tactic: MilitaryTactic): string {
    const parts: string[] = []
    const m = tactic.modifiers
    if (m.rangedRangeMultiplier) parts.push(`远程射程 +${Math.round((m.rangedRangeMultiplier - 1) * 100)}%`)
    if (m.rangedDefensePenetration) parts.push(`远程破甲 +${Math.round(m.rangedDefensePenetration * 100)}%`)
    if (m.meleeAttackSpeedMultiplier) parts.push(`近战攻速 +${Math.round((m.meleeAttackSpeedMultiplier - 1) * 100)}%`)
    if (m.meleeCritChanceBonus) parts.push(`近战暴击 +${Math.round(m.meleeCritChanceBonus * 100)}%`)
    if (m.wildfireRadiusMultiplier) parts.push(`火海范围 +${Math.round((m.wildfireRadiusMultiplier - 1) * 100)}%`)
    if (m.waterDamageMultiplier) parts.push(`水系伤害 +${Math.round((m.waterDamageMultiplier - 1) * 100)}%`)
    if (m.shatterRadiusMultiplier) parts.push(`碎冰范围 +${Math.round((m.shatterRadiusMultiplier - 1) * 100)}%`)
    if (m.nearBaseAttackMultiplier) parts.push(`帅营周边友军攻击力 +${Math.round((m.nearBaseAttackMultiplier - 1) * 100)}%`)
    if (m.enemyArmorReduction) parts.push(`敌军护甲削减 -${Math.round(m.enemyArmorReduction * 100)}%`)
    if (m.reactionDamageMultiplier) parts.push(`五行反应倍率提升 ×${m.reactionDamageMultiplier}`)
    return parts.join(' | ') || '全军战策持续生效中'
  }

  private createCalmContent(x: number, y: number, w: number): void {
    const contentW = w - 80
    const calmBox = this.scene.add.rectangle(x, y - 10, contentW, 200, InkColor.paperPanel, 0.9)
    calmBox.setStrokeStyle(1, InkColor.inkFaint, 0.5)
    this.add(calmBox)

    const iconTxt = inkText(this.scene, x, y - 55, '✦ 烽燧未鸣 · 天候平稳 ✦', {
      size: 20,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const infoTxt = inkText(
      this.scene,
      x,
      y + 15,
      '当前前线战局波澜不惊，天象晴和。\n探马急报将于逢整十波次（第10波、20波、30波等）突发呈递。\n届时将有江雾、暴雨、烈日或神骑突袭等变乱，中军可依局势定夺上策与下策。',
      {
        size: 14,
        color: InkText.wash,
        originX: 0.5,
        originY: 0.5
      }
    )
    infoTxt.setLineSpacing(8)
    infoTxt.setAlign('center')

    this.add([iconTxt, infoTxt])
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
