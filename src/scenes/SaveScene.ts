import Phaser from 'phaser'
import { SaveManager } from '@/core/save/SaveManager'
import {
  InkColor,
  InkText,
  InkFontSize,
  InkRadius,
  InkDepth,
  drawPaperBackground,
  createPanel,
  inkText,
  createInkButton,
  renderPageHeader,
  createPageBackButton,
  inkToast,
  createInkDialog
} from '@/ui/InkTheme'

/**
 * 存档页面场景（水墨宣纸风）
 * 优化后的宽屏卷轴卡片布局（1280×720）：
 * - 左侧：槽位属性与印章标签
 * - 中间：保存时序、关卡进度、招募武将、府库金币
 * - 右侧：独立操作按钮区（读取、新建、删除）
 * 彻底消除文字与按钮重叠遮挡
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
    renderPageHeader(this, '存档管理', '· 卷宗')

    // 返回主菜单按钮（右上角）
    createPageBackButton(this, () => {
      try {
        this.scene.start('TitleScene')
      } catch (err) {
        console.error('Failed to start TitleScene:', err)
      }
    })

    const currentSlot = this.saveManager.getCurrentSlot()

    // 顶部状态提示栏
    inkText(this, 160, 96, '水墨卷宗 · 槽位记录', {
      size: 14,
      color: InkText.wash,
      bold: true
    })

    const currentSlotText = currentSlot === 0 ? '自动存档' : `槽位 ${currentSlot}`
    inkText(this, 1120, 96, `当前使用：${currentSlotText}`, {
      size: 14,
      color: InkText.faint,
      originX: 1
    })

    // 创建存档槽位列表
    this.createSaveSlots()

    // 底部说明文字
    inkText(
      this,
      width / 2,
      636,
      '提示：战役通关时会自动刻印至自动存档；手动存档支持独立新建、加载与删除。',
      {
        size: 13,
        color: InkText.faint,
        originX: 0.5
      }
    )
  }

  /**
   * 创建存档槽位列表
   */
  private createSaveSlots(): void {
    const slotStatus = this.saveManager.getAllSlotStatus()
    const currentSlot = this.saveManager.getCurrentSlot()

    const startY = 136
    const slotWidth = 960
    const slotHeight = 104
    const spacing = 16
    const startX = (this.cameras.main.width - slotWidth) / 2

    for (let i = 0; i < slotStatus.length; i++) {
      const status = slotStatus[i]
      const y = startY + i * (slotHeight + spacing)
      const isAutoSave = i === 0
      const isCurrentSlot = status.hasSave && status.slotId === currentSlot

      this.createSaveSlot(status, startX, y, slotWidth, slotHeight, isAutoSave, isCurrentSlot)
    }
  }

  /**
   * 创建单个存档槽位卡片
   */
  private createSaveSlot(
    status: { slotId: number; hasSave: boolean; summary: any },
    x: number,
    y: number,
    width: number,
    height: number,
    isAutoSave: boolean,
    isCurrentSlot: boolean
  ): void {
    // 槽位主面板
    const strokeColor = isAutoSave ? 0x5f7a4a : isCurrentSlot ? 0xa0782f : InkColor.ink
    const strokeWidth = isCurrentSlot ? 2 : 1.5

    const panel = createPanel(this, x, y, width, height, {
      fill: InkColor.paperPanel,
      stroke: strokeColor,
      strokeWidth,
      radius: InkRadius.md
    })

    // 绘制内部垂直分割线
    const dividers = this.add.graphics()
    dividers.lineStyle(1, InkColor.ink, 0.25)
    // 分割线 1：左侧标识与中间信息之间
    dividers.lineBetween(190, 16, 190, height - 16)
    // 分割线 2：中间信息与右侧操作之间
    dividers.lineBetween(720, 16, 720, height - 16)
    panel.add(dividers)

    // ==================== 1. 左侧标识区 (0 ~ 190) ====================
    const slotName = isAutoSave ? '【 自动存档 】' : `【 存档 槽位 ${status.slotId} 】`
    const slotTitleColor = isAutoSave
      ? InkText.green
      : isCurrentSlot
        ? InkText.gold
        : InkText.strong

    const titleObj = inkText(this, 24, 36, slotName, {
      size: 17,
      color: slotTitleColor,
      bold: true
    })
    panel.add(titleObj)

    // 槽位性质标签
    let subDesc = isAutoSave ? '通关自动封存' : '独立卷宗档案'
    if (isCurrentSlot) {
      subDesc = '「当前生效档案」'
    }
    const subObj = inkText(this, 24, 68, subDesc, {
      size: 13,
      color: isCurrentSlot ? InkText.cinnabar : InkText.faint
    })
    panel.add(subObj)

    // ==================== 2. 中央信息区 (190 ~ 720) ====================
    if (status.hasSave && status.summary) {
      const summary = status.summary

      // 保存时序与版本
      const dateStr = summary.timestamp
        ? new Date(summary.timestamp).toLocaleString('zh-CN', { hour12: false })
        : '未知时序'
      const timeObj = inkText(this, 216, 34, `保存时序：${dateStr}`, {
        size: 13,
        color: InkText.faint
      })
      panel.add(timeObj)

      if (summary.version) {
        const verObj = inkText(this, 580, 34, `版本：v${summary.version}`, {
          size: 13,
          color: InkText.wash
        })
        panel.add(verObj)
      }

      // 统计数据栏：已通关关卡、武将数量、金币
      const completedLevels = summary.levelProgress?.filter((l: any) => l.isCompleted).length || 0
      const levelObj = inkText(this, 216, 68, `已通关：${completedLevels} 关`, {
        size: 14,
        color: InkText.ink,
        bold: true
      })
      panel.add(levelObj)

      const heroCount = summary.heroes?.filter((h: any) => h.isUnlocked).length || 0
      const heroObj = inkText(this, 380, 68, `招募武将：${heroCount} 位`, {
        size: 14,
        color: InkText.green,
        bold: true
      })
      panel.add(heroObj)

      const gold = summary.inventory?.gold ?? 0
      const goldObj = inkText(this, 540, 68, `府库铜钱：${gold}`, {
        size: 14,
        color: InkText.gold,
        bold: true
      })
      panel.add(goldObj)
    } else {
      // 空白槽位
      const emptyTitle = inkText(this, 216, 36, '卷轴空白 · 尚未归档', {
        size: 15,
        color: InkText.wash,
        bold: true
      })
      panel.add(emptyTitle)

      const emptyHint = isAutoSave
        ? '首场战役取得大捷后，系统将自动于此处起草封存'
        : '点击右侧「新建存档」，即可将初始名册与兵符开辟为新进度'
      const hintObj = inkText(this, 216, 68, emptyHint, {
        size: 13,
        color: InkText.faint
      })
      panel.add(hintObj)
    }

    // ==================== 3. 右侧操作区 (720 ~ 960) ====================
    if (status.hasSave && status.summary) {
      if (!isAutoSave) {
        // 手动存档：加载按钮 (x=786) + 删除按钮 (x=892)
        const loadBtn = createInkButton(this, 786, 52, 92, 36, '加载', {
          fill: InkColor.paperDeep,
          hoverFill: 0xded6c4,
          textColor: InkText.ink,
          fontSize: 14,
          stroke: InkColor.ink,
          onClick: () => this.loadSave(status.slotId)
        })
        panel.add(loadBtn)

        const deleteBtn = createInkButton(this, 892, 52, 92, 36, '删除', {
          fill: InkColor.cinnabar,
          hoverFill: 0xb53a32,
          textColor: InkText.paper,
          fontSize: 14,
          onClick: () => this.confirmDelete(status.slotId)
        })
        panel.add(deleteBtn)
      } else {
        // 自动存档：单加载按钮
        const loadBtn = createInkButton(this, 840, 52, 130, 36, '加载存档', {
          fill: InkColor.paperDeep,
          hoverFill: 0xded6c4,
          textColor: InkText.ink,
          fontSize: 14,
          stroke: InkColor.ink,
          onClick: () => this.loadSave(status.slotId)
        })
        panel.add(loadBtn)
      }
    } else {
      if (!isAutoSave) {
        // 手动空槽：新建按钮
        const createBtn = createInkButton(this, 840, 52, 130, 36, '新建存档', {
          fill: InkColor.paperPanel,
          hoverFill: InkColor.paperDeep,
          textColor: InkText.ink,
          fontSize: 14,
          stroke: InkColor.ink,
          onClick: () => this.createNewSave(status.slotId)
        })
        panel.add(createBtn)
      } else {
        // 自动存档空槽提示
        const noSaveText = inkText(this, 840, 52, '暂无记录', {
          size: 14,
          color: InkText.faint,
          originX: 0.5
        })
        panel.add(noSaveText)
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
    const dialogW = 420
    const dialogH = 170

    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.cinnabar,
      strokeWidth: 2
    })

    const titleText = inkText(this, panel.x + dialogW / 2, panel.y + 35, '删除存档确认', {
      size: InkFontSize.lg,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5
    })
    titleText.setDepth(InkDepth.popup + 1)

    const msgText = inkText(this, panel.x + dialogW / 2, panel.y + 75, message, {
      size: InkFontSize.md,
      color: InkText.ink,
      originX: 0.5,
      wrapWidth: dialogW - 40
    })
    msgText.setDepth(InkDepth.popup + 1)

    let isClosed = false
    const cleanup = () => {
      if (isClosed) return
      isClosed = true
      overlay.destroy()
      panel.destroy()
      titleText.destroy()
      msgText.destroy()
      confirmBtn.destroy()
      cancelBtn.destroy()
    }

    const confirmBtn = createInkButton(
      this,
      panel.x + dialogW / 2 - 70,
      panel.y + 125,
      96,
      34,
      '确认删除',
      {
        fill: InkColor.cinnabar,
        hoverFill: 0xb53a32,
        textColor: InkText.paper,
        fontSize: 14,
        onClick: () => {
          cleanup()
          onConfirm()
        }
      }
    )
    confirmBtn.setDepth(InkDepth.popup + 1)

    const cancelBtn = createInkButton(
      this,
      panel.x + dialogW / 2 + 70,
      panel.y + 125,
      96,
      34,
      '取消',
      {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.ink,
        fontSize: 14,
        stroke: InkColor.ink,
        onClick: cleanup
      }
    )
    cancelBtn.setDepth(InkDepth.popup + 1)
  }

  /**
   * 显示消息提示
   */
  private showMessage(msg: string): void {
    inkToast(this, msg, 654)
  }
}
