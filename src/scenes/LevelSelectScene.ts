import Phaser from 'phaser'
import { SaveManager } from '@/core/save/SaveManager'
import { getAllChapters, getChapterLevels, isLevelUnlocked, isChapterUnlocked } from '@/data/levels'
import { ChapterConfig, LevelConfig } from '@/types'

/**
 * 关卡选择场景
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
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 加载存档获取通关进度
    this.loadProgress()

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e)

    // 标题
    this.add.text(width / 2, 40, '关卡选择', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // 创建章节选择
    this.createChapterTabs()

    // 创建关卡列表
    this.createLevelList()

    // 返回按钮
    this.createBackButton()
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
    const y = 90

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
    const bgColor = isSelected ? 0x446688 : (isUnlocked ? 0x333355 : 0x222222)
    const borderColor = isSelected ? 0x88aaff : (isUnlocked ? 0x666688 : 0x444444)
    const textColor = isUnlocked ? '#ffffff' : '#666666'

    const tabBg = this.add.rectangle(x, y, 180, 50, bgColor, 0.9)
    tabBg.setStrokeStyle(2, borderColor)

    const tabText = this.add.text(x, y - 5, chapter.name, {
      fontSize: '16px',
      color: textColor,
      fontStyle: isSelected ? 'bold' : 'normal'
    }).setOrigin(0.5)

    // 历史事件
    const eventText = this.add.text(x, y + 12, chapter.historicalEvent, {
      fontSize: '10px',
      color: isUnlocked ? '#aaaaaa' : '#444444'
    }).setOrigin(0.5)

    // 锁定标记
    if (!isUnlocked) {
      const lockText = this.add.text(x + 70, y - 5, '🔒', {
        fontSize: '14px'
      }).setOrigin(0.5)
    }

    // 点击交互（仅解锁的章节）
    if (isUnlocked) {
      tabBg.setInteractive({ useHandCursor: true })
      tabBg.on('pointerover', () => {
        if (index !== this.currentChapterIndex) {
          tabBg.setFillStyle(0x444477, 0.9)
        }
      })
      tabBg.on('pointerout', () => {
        if (index !== this.currentChapterIndex) {
          tabBg.setFillStyle(0x333355, 0.9)
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
    const height = this.cameras.main.height

    const startY = 150
    const levelCardHeight = 120
    const spacing = 20

    // 章节标题
    this.add.text(width / 2, startY, `${currentChapter.name}`, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // 关卡列表
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i]
      const y = startY + 50 + i * (levelCardHeight + spacing)
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

    // 卡片背景
    const bgColor = isCompleted ? 0x334433 : (isUnlocked ? 0x333355 : 0x222222)
    const borderColor = isCompleted ? 0x88aa88 : (isUnlocked ? 0x666688 : 0x444444)
    const cardBg = this.add.rectangle(x, y, cardWidth, cardHeight, bgColor, 0.9)
    cardBg.setStrokeStyle(2, borderColor)

    // 关卡名称
    const textColor = isUnlocked ? '#ffffff' : '#666666'
    const nameText = this.add.text(x - cardWidth / 2 + 20, y - 30, level.name, {
      fontSize: '18px',
      color: textColor,
      fontStyle: 'bold'
    })

    // 关卡信息
    const wavesText = this.add.text(x - cardWidth / 2 + 20, y, `波次: ${level.waves.length}`, {
      fontSize: '14px',
      color: isUnlocked ? '#aaaaaa' : '#444444'
    })

    const healthText = this.add.text(x - cardWidth / 2 + 20, y + 25, `生命: ${level.playerStartHealth}`, {
      fontSize: '14px',
      color: isUnlocked ? '#ff6666' : '#444444'
    })

    const rewardText = this.add.text(x - cardWidth / 2 + 150, y, `奖励: ${level.rewards.gold}金币`, {
      fontSize: '14px',
      color: isUnlocked ? '#ffff00' : '#444444'
    })

    // 状态标记
    if (isCompleted) {
      // 已通关
      const statusBg = this.add.rectangle(x + cardWidth / 2 - 80, y, 100, 40, 0x448844)
      const statusText = this.add.text(x + cardWidth / 2 - 80, y, '已通关 ✓', {
        fontSize: '14px',
        color: '#ffffff'
      }).setOrigin(0.5)

      // 星星评级（暂时显示3星）
      const starsText = this.add.text(x + cardWidth / 2 - 80, y + 25, '★★★', {
        fontSize: '12px',
        color: '#ffff00'
      }).setOrigin(0.5)
    } else if (!isUnlocked) {
      // 未解锁
      const lockText = this.add.text(x + cardWidth / 2 - 80, y, '🔒 未解锁', {
        fontSize: '16px',
        color: '#666666'
      }).setOrigin(0.5)
    } else {
      // 可挑战
      const playBg = this.add.rectangle(x + cardWidth / 2 - 80, y, 100, 50, 0x446688)
      playBg.setInteractive({ useHandCursor: true })
      const playText = this.add.text(x + cardWidth / 2 - 80, y, '开始挑战', {
        fontSize: '16px',
        color: '#ffffff'
      }).setOrigin(0.5)

      playBg.on('pointerover', () => playBg.setFillStyle(0x5577aa))
      playBg.on('pointerout', () => playBg.setFillStyle(0x446688))
      playBg.on('pointerdown', () => {
        this.startLevel(level.id)
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