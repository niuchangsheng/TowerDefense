import Phaser from 'phaser'
import { SaveManager } from '@/core/save/SaveManager'
import { SAVE_SLOT_COUNT } from '@/types'

/**
 * 存档页面场景
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
    const height = this.cameras.main.height

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e)

    // 标题
    this.add.text(width / 2, 40, '存档管理', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // 提示文字
    this.add.text(width / 2, 80, '点击存档槽位进行操作', {
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5)

    // 创建存档槽位列表
    this.createSaveSlots()

    // 返回按钮
    this.createBackButton()
  }

  /**
   * 创建存档槽位列表
   */
  private createSaveSlots(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    const slotStatus = this.saveManager.getAllSlotStatus()

    const startY = 130
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
    const width = this.cameras.main.width
    const slotWidth = 500
    const slotHeight = 110

    // 槽位背景
    const bgColor = isAutoSave ? 0x334433 : 0x333355
    const borderColor = isAutoSave ? 0x88aa88 : 0x666688
    const slotBg = this.add.rectangle(x, y, slotWidth, slotHeight, bgColor, 0.9)
    slotBg.setStrokeStyle(2, borderColor)

    // 槽位名称
    const slotName = isAutoSave ? '自动存档' : `存档 ${status.slotId}`
    const slotNameText = this.add.text(x - slotWidth / 2 + 20, y - slotHeight / 2 + 15, slotName, {
      fontSize: '18px',
      color: isAutoSave ? '#88ff88' : '#ffffff',
      fontStyle: 'bold'
    })

    if (status.hasSave && status.summary) {
      // 有存档：显示存档信息
      const summary = status.summary

      // 保存时间
      const timeText = this.add.text(x - slotWidth / 2 + 20, y - 30, `保存时间: ${new Date(summary.timestamp).toLocaleString()}`, {
        fontSize: '14px',
        color: '#aaaaaa'
      })

      // 武将数量
      const heroCount = summary.heroes?.filter((h: any) => h.isUnlocked).length || 0
      const heroText = this.add.text(x - slotWidth / 2 + 20, y, `武将: ${heroCount}`, {
        fontSize: '14px',
        color: '#88ff88'
      })

      // 金币
      const goldText = this.add.text(x - slotWidth / 2 + 150, y, `金币: ${summary.inventory?.gold || 0}`, {
        fontSize: '14px',
        color: '#ffff00'
      })

      // 通关关卡
      const completedLevels = summary.levelProgress?.filter((l: any) => l.isCompleted).length || 0
      const levelText = this.add.text(x - slotWidth / 2 + 20, y + 30, `通关: ${completedLevels}`, {
        fontSize: '14px',
        color: '#4488ff'
      })

      // 操作按钮
      if (!isAutoSave) {
        // 手动存档：加载、删除按钮
        this.createSlotButton(x + slotWidth / 2 - 180, y, '加载', 0x448844, () => {
          this.loadSave(status.slotId)
        })

        this.createSlotButton(x + slotWidth / 2 - 100, y, '删除', 0x884444, () => {
          this.confirmDelete(status.slotId)
        })
      } else {
        // 自动存档：只显示查看按钮
        this.createSlotButton(x + slotWidth / 2 - 100, y, '查看', 0x446688, () => {
          this.loadSave(status.slotId)
        })
      }
    } else {
      // 无存档：显示空槽提示
      const emptyText = this.add.text(x, y, '空槽位', {
        fontSize: '16px',
        color: '#666666'
      }).setOrigin(0.5)

      if (!isAutoSave) {
        // 手动存档槽位：可以新建存档
        this.createSlotButton(x + slotWidth / 2 - 100, y, '新建存档', 0x446688, () => {
          this.createNewSave(status.slotId)
        })
      } else {
        // 自动存档槽位提示
        const autoTip = this.add.text(x, y + 25, '(通关关卡后自动保存)', {
          fontSize: '12px',
          color: '#555555'
        }).setOrigin(0.5)
      }
    }
  }

  /**
   * 创建槽位按钮
   */
  private createSlotButton(x: number, y: number, text: string, color: number, callback: () => void): void {
    const btnBg = this.add.rectangle(x, y, 70, 30, color)
    btnBg.setInteractive({ useHandCursor: true })

    const btnText = this.add.text(x, y, text, {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5)

    btnBg.on('pointerover', () => btnBg.setFillStyle(color + 0x111111))
    btnBg.on('pointerout', () => btnBg.setFillStyle(color))
    btnBg.on('pointerdown', callback)
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
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 弹窗背景
    const dialogBg = this.add.rectangle(width / 2, height / 2, 350, 150, 0x222222, 0.95)
    dialogBg.setStrokeStyle(2, 0xffaa00)
    dialogBg.setDepth(50)

    // 提示文字
    const msgText = this.add.text(width / 2, height / 2 - 30, message, {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(50)

    // 确认按钮
    const confirmBtn = this.add.rectangle(width / 2 - 60, height / 2 + 30, 80, 30, 0x884444)
    confirmBtn.setInteractive({ useHandCursor: true })
    confirmBtn.setDepth(50)
    const confirmText = this.add.text(width / 2 - 60, height / 2 + 30, '确定', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(50)

    // 取消按钮
    const cancelBtn = this.add.rectangle(width / 2 + 60, height / 2 + 30, 80, 30, 0x444444)
    cancelBtn.setInteractive({ useHandCursor: true })
    cancelBtn.setDepth(50)
    const cancelText = this.add.text(width / 2 + 60, height / 2 + 30, '取消', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(50)

    const cleanup = () => {
      dialogBg.destroy()
      msgText.destroy()
      confirmBtn.destroy()
      confirmText.destroy()
      cancelBtn.destroy()
      cancelText.destroy()
    }

    confirmBtn.on('pointerover', () => confirmBtn.setFillStyle(0xaa5555))
    confirmBtn.on('pointerout', () => confirmBtn.setFillStyle(0x884444))
    confirmBtn.on('pointerdown', () => {
      cleanup()
      onConfirm()
    })

    cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x555555))
    cancelBtn.on('pointerout', () => cancelBtn.setFillStyle(0x444444))
    cancelBtn.on('pointerdown', cleanup)
  }

  /**
   * 显示消息提示
   */
  private showMessage(msg: string): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const text = this.add.text(width / 2, height - 60, msg, {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setDepth(100)

    this.time.delayedCall(1500, () => text.destroy())
  }

  /**
   * 创建返回按钮
   */
  private createBackButton(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const btnBg = this.add.rectangle(100, height - 50, 150, 40, 0x444466)
    const btnText = this.add.text(100, height - 50, '返回', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5)

    btnBg.setInteractive({ useHandCursor: true })
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x555588))
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x444466))
    btnBg.on('pointerdown', () => {
      this.scene.start('TitleScene')
    })
  }
}