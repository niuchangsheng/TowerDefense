import Phaser from 'phaser'
import { SaveManager } from '@/core/save/SaveManager'
import { getAllChapters, getChapterLevels, isLevelUnlocked, isChapterUnlocked } from '@/data/levels'
import { ChapterConfig, LevelConfig } from '@/types'
import {
  InkColor,
  InkText,
  InkFontSize,
  drawPaperBackground,
  inkText,
  createInkButton,
  renderPageHeader,
  createPageBackButton
} from '@/ui/InkTheme'

/**
 * 关卡选择场景（水墨宣纸风）
 * 显示章节和关卡列表
 */
export default class LevelSelectScene extends Phaser.Scene {
  private saveManager: SaveManager
  private currentChapterIndex: number = 0
  private completedLevels: string[] = []

  constructor() {
    super({ key: 'LevelSelectScene' })
    this.saveManager = SaveManager.getInstance()
  }

  create(): void {
    // 加载存档获取通关进度
    this.loadProgress()

    drawPaperBackground(this)
    renderPageHeader(this, '关卡选择', '· 战役')

    // 创建章节选择
    this.createChapterTabs()

    // 创建关卡列表
    this.createLevelList()

    // 返回按钮
    createPageBackButton(this, () => {
      this.scene.start('TitleScene')
    })
  }

  /**
   * 加载通关进度
   */
  private loadProgress(): void {
    // 尝试加载存档
    if (this.saveManager.hasSave(0)) {
      const autoSave = this.saveManager.loadFromSlot(0)
      if (autoSave) {
        this.completedLevels = autoSave.levelProgress
          .filter(l => l.isCompleted)
          .map(l => l.levelId)
      }
    }

    // 如果有手动存档，优先使用
    for (let i = 1; i <= 3; i++) {
      if (this.saveManager.hasSave(i)) {
        const save = this.saveManager.loadFromSlot(i)
        if (save) {
          this.completedLevels = save.levelProgress
            .filter(l => l.isCompleted)
            .map(l => l.levelId)
          break
        }
      }
    }
  }

  /**
   * 创建章节选择标签
   */
  private createChapterTabs(): void {
    const chapters = getAllChapters()
    const width = this.cameras.main.width
    const startX = width / 2 - (chapters.length - 1) * 100
    const y = 110

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      const x = startX + i * 200
      const isUnlocked = isChapterUnlocked(chapter.id, this.completedLevels)
      const isSelected = i === this.currentChapterIndex

      this.createChapterTab(x, y, chapter, isUnlocked, isSelected, i)
    }
  }

  /**
   * 创建单个章节标签
   */
  private createChapterTab(
    x: number,
    y: number,
    chapter: ChapterConfig,
    isUnlocked: boolean,
    isSelected: boolean,
    index: number
  ): void {
    // 选中 = 深纸底 + 印章红描边；解锁 = 纸底 + 墨线；锁定 = 半透明
    const tabBg = this.add.rectangle(x, y, 180, 50, InkColor.paperPanel)
    if (isSelected) {
      tabBg.setFillStyle(InkColor.paperDeep)
      tabBg.setStrokeStyle(2, InkColor.cinnabar)
    } else if (isUnlocked) {
      tabBg.setStrokeStyle(1, InkColor.ink)
    } else {
      tabBg.setFillStyle(InkColor.paperPanel, 0.5)
      tabBg.setStrokeStyle(1, InkColor.inkFaint)
    }

    inkText(this, x, y - 5, chapter.name, {
      size: InkFontSize.md,
      color: isUnlocked ? (isSelected ? InkText.strong : InkText.ink) : InkText.faint,
      bold: isSelected,
      originX: 0.5
    })

    // 历史事件
    inkText(this, x, y + 12, chapter.historicalEvent, {
      size: 10,
      color: InkText.faint,
      originX: 0.5
    })

    // 锁定标记
    if (!isUnlocked) {
      inkText(this, x + 70, y - 5, '锁', {
        size: 14,
        color: InkText.faint,
        originX: 0.5
      })
    }

    // 点击交互（仅解锁的章节）
    if (isUnlocked) {
      tabBg.setInteractive({ useHandCursor: true })
      tabBg.on('pointerover', () => {
        if (index !== this.currentChapterIndex) {
          tabBg.setFillStyle(InkColor.paperDeep)
        }
      })
      tabBg.on('pointerout', () => {
        if (index !== this.currentChapterIndex) {
          tabBg.setFillStyle(InkColor.paperPanel)
        }
      })
      tabBg.on('pointerdown', () => {
        this.selectChapter(index)
      })
    }
  }

  /**
   * 选择章节
   */
  private selectChapter(index: number): void {
    this.currentChapterIndex = index
    this.scene.restart()
  }

  /**
   * 创建关卡列表
   */
  private createLevelList(): void {
    const chapters = getAllChapters()
    const currentChapter = chapters[this.currentChapterIndex]

    if (!currentChapter) return

    const levels = getChapterLevels(currentChapter.id)
    const width = this.cameras.main.width

    const startY = 180
    const levelCardHeight = 120
    const spacing = 20

    // 章节标题
    inkText(this, width / 2, startY, `${currentChapter.name}`, {
      size: 24,
      color: InkText.wash,
      bold: true,
      originX: 0.5
    })

    // 关卡列表
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i]
      const y = startY + 60 + i * (levelCardHeight + spacing)
      const isUnlocked = isLevelUnlocked(level.id, this.completedLevels)
      const isCompleted = this.completedLevels.includes(level.id)

      this.createLevelCard(width / 2, y, level, isUnlocked, isCompleted)
    }
  }

  /**
   * 创建关卡卡片
   */
  private createLevelCard(
    x: number,
    y: number,
    level: LevelConfig,
    isUnlocked: boolean,
    isCompleted: boolean
  ): void {
    const cardWidth = 500
    const cardHeight = 110

    // 卡片背景：已通关 = 深纸底 + 绿描边；可挑战 = 纸底 + 墨线；锁定 = 半透明
    const cardBg = this.add.rectangle(x, y, cardWidth, cardHeight, InkColor.paperPanel)
    if (isCompleted) {
      cardBg.setFillStyle(InkColor.paperDeep)
      cardBg.setStrokeStyle(2, 0x5f7a4a)
    } else if (isUnlocked) {
      cardBg.setStrokeStyle(1, InkColor.ink)
    } else {
      cardBg.setFillStyle(InkColor.paperPanel, 0.5)
      cardBg.setStrokeStyle(1, InkColor.inkFaint)
    }

    const nameColor = isUnlocked ? InkText.strong : InkText.faint
    const infoColor = InkText.faint

    // 关卡名称
    inkText(this, x - cardWidth / 2 + 20, y - 30, level.name, {
      size: 18,
      color: nameColor,
      bold: true
    })

    // 关卡信息
    inkText(this, x - cardWidth / 2 + 20, y, `波次: ${level.waves.length}`, {
      size: 14,
      color: infoColor
    })

    inkText(this, x - cardWidth / 2 + 20, y + 25, `生命: ${level.playerStartHealth}`, {
      size: 14,
      color: isUnlocked ? InkText.cinnabar : InkText.faint
    })

    inkText(this, x - cardWidth / 2 + 150, y, `奖励: ${level.rewards.gold}金币`, {
      size: 14,
      color: isUnlocked ? InkText.gold : InkText.faint
    })

    // 状态标记
    if (isCompleted) {
      // 已通关
      inkText(this, x + cardWidth / 2 - 80, y - 8, '已通关', {
        size: 14,
        color: InkText.green,
        bold: true,
        originX: 0.5
      })

      // 星星评级（暂时显示3星）
      inkText(this, x + cardWidth / 2 - 80, y + 18, '★★★', {
        size: 12,
        color: InkText.gold,
        originX: 0.5
      })
    } else if (!isUnlocked) {
      // 未解锁
      inkText(this, x + cardWidth / 2 - 80, y, '锁 · 未解锁', {
        size: InkFontSize.md,
        color: InkText.faint,
        originX: 0.5
      })
    } else {
      // 可挑战
      createInkButton(this, x + cardWidth / 2 - 80, y, 100, 40, '开始挑战', {
        fill: InkColor.cinnabar,
        hoverFill: 0xb53a32,
        textColor: InkText.paper,
        fontSize: InkFontSize.md,
        onClick: () => {
          this.startLevel(level.id)
        }
      })
    }
  }

  /**
   * 开始关卡
   */
  private startLevel(levelId: string): void {
    console.log(`开始关卡: ${levelId}`)
    this.scene.start('BattleScene', { levelId })
  }
}
