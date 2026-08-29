import Phaser from 'phaser'
import { SaveManager } from '@/core/save/SaveManager'
import {
  InkColor,
  InkText,
  InkFontSize,
  InkDepth,
  drawPaperBackground,
  inkText,
  createInkButton,
  renderPageHeader,
  createPageBackButton,
  inkToast,
  createInkDialog
} from '@/ui/InkTheme'

/**
 * 存档页面场景（水墨宣纸风）
 * 显示多个存档槽位，支持加载、删除、新建存档
 */
export default class SaveScene extends Phaser.Scene {
  private saveManager: SaveManager

  constructor() {
    super({ key: 'SaveScene' })
    this.saveManager = SaveManager.getInstance()
  }

  create(): void {
    const width = this.cameras.main.width

    drawPaperBackground(this)
    renderPageHeader(this, '存档管理', '· 槽位')

    // 提示文字
    inkText(this, width / 2, 88, '点击存档槽位进行操作', {
      size: 14,
      color: InkText.faint,
      originX: 0.5
    })

    // 创建存档槽位列表
    this.createSaveSlots()

    // 返回按钮
    createPageBackButton(this, () => {
      this.scene.start('TitleScene')
    })
  }

  /**
   * 创建存档槽位列表
   */
  private createSaveSlots(): void {
    const width = this.cameras.main.width
    const slotStatus = this.saveManager.getAllSlotStatus()

    const startY = 160
    const slotHeight = 120
    const spacing = 20

    for (let i = 0; i < slotStatus.length; i++) {
      const status = slotStatus[i]
      const y = startY + i * (slotHeight + spacing)

      this.createSaveSlot(status, width / 2, y, i === 0)
    }
  }

  /**
   * 创建单个存档槽位
   */
  private createSaveSlot(
    status: { slotId: number; hasSave: boolean; summary: any },
    x: number,
    y: number,
    isAutoSave: boolean
  ): void {
    const slotWidth = 500
    const slotHeight = 110

    // 槽位背景：自动存档 = 绿描边；手动 = 墨线
    const slotBg = this.add.rectangle(x, y, slotWidth, slotHeight, InkColor.paperPanel)
    slotBg.setStrokeStyle(2, isAutoSave ? 0x5f7a4a : InkColor.ink)

    // 槽位名称
    const slotName = isAutoSave ? '自动存档' : `存档 ${status.slotId}`
    inkText(this, x - slotWidth / 2 + 20, y - slotHeight / 2 + 22, slotName, {
      size: 18,
      color: isAutoSave ? InkText.green : InkText.strong,
      bold: true
    })

    if (status.hasSave && status.summary) {
      // 有存档：显示存档信息
      const summary = status.summary

      // 保存时间
      inkText(this, x - slotWidth / 2 + 20, y - 12, `保存时间: ${new Date(summary.timestamp).toLocaleString()}`, {
        size: 14,
        color: InkText.faint
      })

      // 武将数量
      const heroCount = summary.heroes?.filter((h: any) => h.isUnlocked).length || 0
      inkText(this, x - slotWidth / 2 + 20, y + 16, `武将: ${heroCount}`, {
        size: 14,
        color: InkText.green
      })

      // 金币
      inkText(this, x - slotWidth / 2 + 150, y + 16, `金币: ${summary.inventory?.gold || 0}`, {
        size: 14,
        color: InkText.gold
      })

      // 通关关卡
      const completedLevels = summary.levelProgress?.filter((l: any) => l.isCompleted).length || 0
      inkText(this, x - slotWidth / 2 + 260, y + 16, `通关: ${completedLevels}`, {
        size: 14,
        color: InkText.ink
      })

      // 操作按钮
      if (!isAutoSave) {
        // 手动存档：加载、删除按钮
        createInkButton(this, x + slotWidth / 2 - 180, y, 70, 30, '加载', {
          fill: InkColor.paperDeep,
          textColor: InkText.ink,
          fontSize: 14,
          stroke: InkColor.ink,
          onClick: () => this.loadSave(status.slotId)
        })

        createInkButton(this, x + slotWidth / 2 - 100, y, 70, 30, '删除', {
          fill: InkColor.cinnabar,
          hoverFill: 0xb53a32,
          textColor: InkText.paper,
          fontSize: 14,
          onClick: () => this.confirmDelete(status.slotId)
        })
      } else {
        // 自动存档：只显示查看按钮
        createInkButton(this, x + slotWidth / 2 - 100, y, 70, 30, '查看', {
          fill: InkColor.paperDeep,
          textColor: InkText.ink,
          fontSize: 14,
          stroke: InkColor.ink,
          onClick: () => this.loadSave(status.slotId)
        })
      }
    } else {
      // 无存档：显示空槽提示
      inkText(this, x, y, '空槽位', {
        size: InkFontSize.md,
        color: InkText.faint,
        originX: 0.5
      })

      if (!isAutoSave) {
        // 手动存档槽位：可以新建存档
        createInkButton(this, x + slotWidth / 2 - 100, y, 80, 30, '新建存档', {
          fill: InkColor.paperPanel,
          textColor: InkText.ink,
          fontSize: 14,
          stroke: InkColor.ink,
          onClick: () => this.createNewSave(status.slotId)
        })
      } else {
        // 自动存档槽位提示
        inkText(this, x, y + 25, '(通关关卡后自动保存)', {
          size: InkFontSize.xs,
          color: InkText.faint,
          originX: 0.5
        })
      }
    }
  }

  /**
   * 加载存档
   */
  private loadSave(slotId: number): void {
    const saveData = this.saveManager.loadFromSlot(slotId)
    if (saveData) {
      this.showMessage('存档加载成功')
      // 延迟返回主菜单
      this.time.delayedCall(1000, () => {
        this.scene.start('TitleScene')
      })
    } else {
      this.showMessage('加载失败')
    }
  }

  /**
   * 创建新存档
   */
  private createNewSave(slotId: number): void {
    this.saveManager.createNewSave(slotId)
    this.showMessage('存档创建成功')
    this.scene.restart()
  }

  /**
   * 确认删除存档
   */
  private confirmDelete(slotId: number): void {
    this.showConfirmDialog('确定要删除此存档吗？此操作不可恢复！', () => {
      this.saveManager.deleteSlot(slotId)
      this.showMessage('存档已删除')
      this.scene.restart()
    })
  }

  /**
   * 显示确认对话框
   */
  private showConfirmDialog(message: string, onConfirm: () => void): void {
    const dialogW = 350
    const dialogH = 150

    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.cinnabar,
      strokeWidth: 2
    })

    const msgText = inkText(this, panel.x + dialogW / 2, panel.y + 45, message, {
      size: InkFontSize.md,
      color: InkText.ink,
      originX: 0.5
    })
    msgText.setDepth(InkDepth.popup)

    const confirmBtn = createInkButton(this, panel.x + dialogW / 2 - 60, panel.y + 105, 80, 30, '确定', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb53a32,
      textColor: InkText.paper,
      fontSize: 14
    })
    confirmBtn.setDepth(InkDepth.popup)

    const cancelBtn = createInkButton(this, panel.x + dialogW / 2 + 60, panel.y + 105, 80, 30, '取消', {
      fill: InkColor.paperPanel,
      textColor: InkText.ink,
      fontSize: 14,
      stroke: InkColor.ink
    })
    cancelBtn.setDepth(InkDepth.popup)

    const cleanup = () => {
      overlay.destroy()
      panel.destroy()
      msgText.destroy()
      confirmBtn.destroy()
      cancelBtn.destroy()
    }

    confirmBtn.on('pointerdown', () => {
      cleanup()
      onConfirm()
    })

    cancelBtn.on('pointerdown', cleanup)
  }

  /**
   * 显示消息提示
   */
  private showMessage(msg: string): void {
    inkToast(this, msg)
  }
}
