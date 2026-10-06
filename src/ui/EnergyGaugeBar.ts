import Phaser from 'phaser'
import { InkColor, InkText, inkText, createInkButton, InkRadius } from './InkTheme'
import { AugmentManager } from '@/core/augment/AugmentManager'

/**
 * 军师锦囊能量进度与就绪提示条
 * 位于中军令台或战场显著位置，展示军令蓄积与提示玩家按空格或点击开启三选一
 */
export class EnergyGaugeBar extends Phaser.GameObjects.Container {
  private augmentManager: AugmentManager
  private onOpenModalCallback: () => void

  private barBg: Phaser.GameObjects.Graphics
  private barFill: Phaser.GameObjects.Graphics
  private labelText: Phaser.GameObjects.Text
  private statusText: Phaser.GameObjects.Text
  private pulseTween?: Phaser.Tweens.Tween
  private spaceKey?: Phaser.Input.Keyboard.Key

  private readonly barWidth = 118
  private readonly barHeight = 14

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    augmentManager: AugmentManager,
    onOpenModal: () => void
  ) {
    super(scene, x, y)
    this.augmentManager = augmentManager
    this.onOpenModalCallback = onOpenModal

    // 1. 背景底框（宣纸微透面板）
    this.barBg = scene.add.graphics()
    this.add(this.barBg)

    // 2. 进度填充条
    this.barFill = scene.add.graphics()
    this.add(this.barFill)

    // 3. 标签
    this.labelText = inkText(scene, -this.barWidth / 2 - 6, 0, '军令', {
      size: 12,
      color: InkText.strong,
      bold: true,
      originX: 1,
      originY: 0.5
    })
    this.add(this.labelText)

    // 4. 状态/按键提示
    this.statusText = inkText(scene, 0, 0, '0%', {
      size: 10,
      color: InkText.ink,
      originX: 0.5,
      originY: 0.5
    })
    this.add(this.statusText)

    // 点击交互
    this.setSize(this.barWidth + 40, 30)
    this.setInteractive({ useHandCursor: true })
    this.on('pointerdown', () => {
      if (this.augmentManager.getReadyCount() > 0) {
        this.onOpenModalCallback()
      }
    })

    // 空格键快捷键
    if (scene.input.keyboard) {
      this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      this.spaceKey.on('down', () => {
        if (this.augmentManager.getReadyCount() > 0) {
          this.onOpenModalCallback()
        }
      })
    }

    this.renderBase()
    this.updateProgress()

    this.setDepth(26)
    scene.add.existing(this)
  }

  private renderBase(): void {
    this.barBg.clear()
    const w = this.barWidth
    const h = this.barHeight

    // 墨线底框
    this.barBg.fillStyle(InkColor.paperDeep, 0.8)
    this.barBg.fillRoundedRect(-w / 2, -h / 2, w, h, InkRadius.sm)
    this.barBg.lineStyle(1.2, InkColor.ink, 0.6)
    this.barBg.strokeRoundedRect(-w / 2, -h / 2, w, h, InkRadius.sm)
  }

  /**
   * 刷新进度显示
   */
  public updateProgress(): void {
    const readyCount = this.augmentManager.getReadyCount()
    const progress = this.augmentManager.getEnergyProgress()

    this.barFill.clear()
    const w = this.barWidth - 2
    const h = this.barHeight - 2

    if (readyCount > 0) {
      // 就绪状态：金色/朱砂充盈高亮
      this.barFill.fillStyle(InkColor.cinnabar, 0.9)
      this.barFill.fillRoundedRect(-w / 2, -h / 2, w, h, InkRadius.sm)

      this.statusText.setText(`锦囊×${readyCount} [空格]`)
      this.statusText.setColor(InkText.paper)
      this.statusText.setFontSize(10)

      // 启动呼吸律动提示
      if (!this.pulseTween) {
        this.pulseTween = this.scene.tweens.add({
          targets: this,
          scaleX: 1.04,
          scaleY: 1.04,
          duration: 450,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
      }
    } else {
      // 积攒状态
      if (this.pulseTween) {
        this.pulseTween.stop()
        this.pulseTween = undefined
        this.setScale(1)
      }

      const fillW = Math.max(0, w * progress)
      this.barFill.fillStyle(0x4a6b52, 0.85) // 雅致松石绿
      this.barFill.fillRoundedRect(-w / 2, -h / 2, fillW, h, InkRadius.sm)

      this.statusText.setText(`${Math.floor(progress * 100)}%`)
      this.statusText.setColor(InkText.ink)
      this.statusText.setFontSize(10)
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.pulseTween) {
      this.pulseTween.stop()
    }
    if (this.spaceKey) {
      this.spaceKey.removeAllListeners()
    }
    super.destroy(fromScene)
  }
}
