import Phaser from 'phaser'
import { Augment, AugmentRarity } from '@/types/augment'
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

const RARITY_COLORS: Record<AugmentRarity, { text: string; stroke: number; bg: number; name: string }> = {
  common: { text: '#2e7d32', stroke: 0x388e3c, bg: 0xf4f1ea, name: '【奇谋战法策】' },
  rare: { text: '#1565c0', stroke: 0x1976d2, bg: 0xf4f1ea, name: '【相生连环策】' },
  epic: { text: '#8e24aa', stroke: 0x7b1fa2, bg: 0xf4f1ea, name: '【攻防逆转策】' },
  legendary: { text: '#b45309', stroke: 0xc2410c, bg: 0xf4f1ea, name: '【观星借天策】' }
}

/**
 * 军师锦囊三选一弹窗
 * 墨香竹简长卷风格，展示 3 个天命肉鸽词条，支持悬浮动效、重选与战局时间暂停
 */
export class AugmentSelectModal extends Phaser.GameObjects.Container {
  private augmentManager: AugmentManager
  private currentOptions: Augment[] = []
  private cardContainers: Phaser.GameObjects.Container[] = []
  private rerollBtn?: Phaser.GameObjects.Container
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
    const overlay = scene.add.rectangle(0, 0, width, height, 0x111111, 0.75)
    overlay.setOrigin(0, 0)
    overlay.setInteractive()
    this.add(overlay)

    // 2. 顶部标题长卷与右上角返回战场按钮
    this.createHeader(width)

    // 3. 抽取初始 3 张卡
    this.currentOptions = this.augmentManager.drawOptions(this.deployedHeroIds, this.deployedWuXing, 3)

    if (this.currentOptions.length === 0) {
      // 锦囊全部用完时的空状态
      this.renderEmptyState(width, height)
    } else {
      this.renderCards(width, height)
      this.createBottomBar(width, height)
    }

    // 4. 监听 ESC 键直接返回战场
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
    const title = inkText(this.scene, width / 2, 60, '【军师锦囊 · 天命三选一】', {
      size: 26,
      color: '#ffffff',
      bold: true,
      originX: 0.5
    })
    title.setStroke('#111111', 4)

    const subtitle = inkText(this.scene, width / 2, 92, '运筹帷幄之中 · 决胜千里之外', {
      size: 14,
      color: '#e0d8c3',
      originX: 0.5
    })

    // 右上角退出/返回按钮
    const closeBtn = createInkButton(this.scene, width - 80, 50, 100, 34, '✕ 返回战场', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 13,
      onClick: () => this.closeModal()
    })

    this.add([title, subtitle, closeBtn])
  }

  /**
   * 当所有锦囊皆已选完时的状态展示
   */
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

    const returnBtn = createInkButton(this.scene, cx, cy + 45, 150, 40, '返回战场迎敌', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb53a32,
      textColor: '#ffffff',
      fontSize: 15,
      onClick: () => this.closeModal()
    })

    this.add([t1, t2, returnBtn])
  }

  private renderCards(width: number, height: number): void {
    // 清理旧卡片
    for (const c of this.cardContainers) {
      c.destroy()
    }
    this.cardContainers = []

    const cardW = 220
    const cardH = 320
    const spacing = 36
    const totalW = this.currentOptions.length * cardW + (this.currentOptions.length - 1) * spacing
    const startX = (width - totalW) / 2 + cardW / 2
    const cardY = height / 2 + 10

    this.currentOptions.forEach((aug, index) => {
      const cx = startX + index * (cardW + spacing)
      const card = this.createSingleCard(cx, cardY, cardW, cardH, aug)
      this.cardContainers.push(card)
      this.add(card)

      // 卡片依次飞入动画
      card.setY(cardY + 35)
      card.setAlpha(0)
      this.scene.tweens.add({
        targets: card,
        y: cardY,
        alpha: 1,
        duration: 350,
        delay: index * 80,
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
    const conf = RARITY_COLORS[aug.rarity]

    // 1. 卡片宣纸底板
    const bg = scene.add.graphics()
    bg.fillStyle(conf.bg, 0.96)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, InkRadius.md)
    bg.lineStyle(2.5, conf.stroke, 0.9)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, InkRadius.md)
    c.add(bg)

    // 2. 策系标识顶栏（无品质平权 · 五大策系）
    const catTitle = aug.stratagemCategory ? `【${aug.stratagemCategory}】` : conf.name
    const rarityLabel = inkText(scene, 0, -h / 2 + 24, catTitle, {
      size: 13,
      color: conf.text,
      bold: true,
      originX: 0.5
    })
    c.add(rarityLabel)

    // 3. 锦囊名称
    const displayName = aug.name.startsWith('《') ? aug.name : `《${aug.name}》`
    const nameText = inkText(scene, 0, -h / 2 + 62, displayName, {
      size: 21,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    })
    c.add(nameText)

    // 4. 副标题（如五行连锁）
    if (aug.subtitle) {
      const subText = inkText(scene, 0, -h / 2 + 92, aug.subtitle, {
        size: 12,
        color: conf.text,
        originX: 0.5
      })
      c.add(subText)
    }

    // 分隔横线
    const line = scene.add.graphics()
    line.lineStyle(1, InkColor.ink, 0.25)
    line.beginPath()
    line.moveTo(-w / 2 + 18, -h / 2 + 114)
    line.lineTo(w / 2 - 18, -h / 2 + 114)
    line.strokePath()
    c.add(line)

    // 5. 详细效果描述（自动换行）
    const descText = scene.add.text(0, -h / 2 + 130, aug.description, {
      fontFamily: INK_FONT,
      fontSize: '13px',
      color: '#222222',
      wordWrap: { width: w - 36 },
      lineSpacing: 5
    }).setOrigin(0.5, 0)
    c.add(descText)

    // 6. 底部标签栏（五行/专属）
    if (aug.tags && aug.tags.length > 0) {
      const tagStr = aug.tags.map(t => `【${t}】`).join(' ')
      const tagText = inkText(scene, 0, h / 2 - 45, tagStr, {
        size: 11,
        color: InkText.faint,
        originX: 0.5
      })
      c.add(tagText)
    }

    // 7. 选择确认按钮
    const selectBtn = createInkButton(scene, 0, h / 2 - 20, 110, 28, '择此妙计', {
      fill: conf.stroke,
      hoverFill: 0x111111,
      textColor: '#ffffff',
      fontSize: 12,
      onClick: () => this.handlePickAugment(aug)
    })
    c.add(selectBtn)

    // 交互悬浮响应
    c.setSize(w, h)
    c.setInteractive({ useHandCursor: true })

    c.on('pointerover', () => {
      scene.tweens.add({
        targets: c,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 160,
        ease: 'Quad.easeOut'
      })
      bg.lineStyle(3.5, 0xffffff, 1)
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, InkRadius.md)
    })

    c.on('pointerout', () => {
      scene.tweens.add({
        targets: c,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 160,
        ease: 'Quad.easeOut'
      })
      bg.lineStyle(2.5, conf.stroke, 0.9)
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, InkRadius.md)
    })

    c.on('pointerdown', () => {
      this.handlePickAugment(aug)
    })

    return c
  }

  private createBottomBar(width: number, height: number): void {
    const count = this.augmentManager.getRerollCount()
    const canReroll = count > 0

    // 重整军策按钮
    this.rerollBtn = createInkButton(
      this.scene,
      width / 2 - 85,
      height - 45,
      150,
      36,
      `重整军策 (${count}次)`,
      {
        fill: canReroll ? InkColor.paperDeep : 0x777777,
        hoverFill: canReroll ? InkColor.paper : 0x777777,
        textColor: canReroll ? InkText.strong : '#bbbbbb',
        fontSize: 13,
        onClick: () => this.handleReroll()
      }
    )
    this.add(this.rerollBtn)

    // 暂存军策直接返回按钮
    const deferBtn = createInkButton(
      this.scene,
      width / 2 + 85,
      height - 45,
      150,
      36,
      '暂存 · 返回战场',
      {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.faint,
        fontSize: 13,
        onClick: () => this.closeModal()
      }
    )
    this.add(deferBtn)
  }

  private handleReroll(): void {
    if (this.augmentManager.getRerollCount() <= 0) return

    const newOptions = this.augmentManager.reroll(this.deployedHeroIds, this.deployedWuXing)
    if (newOptions) {
      this.currentOptions = newOptions
      const width = this.scene.cameras.main.width
      const height = this.scene.cameras.main.height

      this.renderCards(width, height)
      this.rerollBtn?.destroy()
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

  /**
   * 安全关闭弹窗并返回战场
   */
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
