import Phaser from 'phaser'
import { SaveManager } from '@/core/save/SaveManager'
import {
  getAllChapters,
  getChapterLevels,
  isLevelUnlocked,
  isChapterUnlocked,
  getBattlefieldMapMeta
} from '@/data/levels'
import { ChapterConfig, LevelConfig, WuXing } from '@/types'
import { getEnemyConfig } from '@/data/enemies'
import {
  InkColor,
  InkText,
  InkFontSize,
  INK_WUXING,
  drawPaperBackground,
  inkText,
  createInkButton,
  renderPageHeader,
  createPageBackButton
} from '@/ui/InkTheme'
import { SoundFX } from '@/effects/SoundFX'

/** 谁克制该五行 */
const COUNTERED_BY: Record<WuXing, WuXing> = {
  metal: 'fire',   // 火克金
  wood: 'metal',   // 金克木
  earth: 'wood',   // 木克土
  water: 'earth',  // 土克水
  fire: 'water'    // 水克火
}

/**
 * 战役关卡沙盘推演场景（水墨舆图风）
 * 左侧：中式羊皮纸行军沙盘（要塞关隘节点、蜿蜒虚线行军路线、大捷朱砂印章、烽火动效）
 * 右侧：《军机密报》情报卷轴（敌军规模、五行分布、孙子兵法克敌秘策、点将出征）
 */
export default class LevelSelectScene extends Phaser.Scene {
  private saveManager: SaveManager
  private currentChapterIndex: number = 0
  private completedLevels: string[] = []
  private selectedLevelId: string = ''
  private isTransitioning: boolean = false

  // 容器组件与动效管理
  private sandTableContainer!: Phaser.GameObjects.Container
  private intelContainer!: Phaser.GameObjects.Container
  private chapterTabsContainer!: Phaser.GameObjects.Container
  private activeTweens: Phaser.Tweens.Tween[] = []

  constructor() {
    super({ key: 'LevelSelectScene' })
    this.saveManager = SaveManager.getInstance()
  }

  init(): void {
    this.isTransitioning = false
    if (this.input) this.input.enabled = true
  }

  create(): void {
    this.isTransitioning = false
    if (this.input) this.input.enabled = true

    this.events.once('shutdown', () => {
      this.clearTweens()
      this.isTransitioning = false
    })

    SoundFX.unlock()
    this.loadProgress()

    // 宣纸底色背景
    drawPaperBackground(this)
    renderPageHeader(this, '战役沙盘', '· 兵贵神速 · 奇正相生')

    // 返回标题界面按钮
    createPageBackButton(this, () => {
      if (this.isTransitioning) return
      this.isTransitioning = true
      this.time.delayedCall(600, () => {
        if (this.scene.isActive()) {
          this.isTransitioning = false
          if (this.input) this.input.enabled = true
        }
      })
      this.clearTweens()
      try {
        this.scene.start('TitleScene')
      } catch (err) {
        console.error('[LevelSelectScene] 返回主页异常:', err)
        this.isTransitioning = false
        if (this.input) this.input.enabled = true
      }
    })

    // 初始化容器
    this.chapterTabsContainer = this.add.container(0, 0)
    this.sandTableContainer = this.add.container(0, 0)
    this.intelContainer = this.add.container(0, 0)

    // 默认选中关卡
    this.initDefaultSelection()

    // 渲染全场景视图
    this.renderAll()
  }

  /**
   * 加载存档通关进度
   */
  private loadProgress(): void {
    try {
      if (this.saveManager.hasSave(0)) {
        const autoSave = this.saveManager.loadFromSlot(0)
        if (autoSave && Array.isArray(autoSave.levelProgress)) {
          this.completedLevels = autoSave.levelProgress
            .filter(l => l && l.isCompleted)
            .map(l => l.levelId)
        }
      }

      for (let i = 1; i <= 3; i++) {
        if (this.saveManager.hasSave(i)) {
          const save = this.saveManager.loadFromSlot(i)
          if (save && Array.isArray(save.levelProgress)) {
            this.completedLevels = save.levelProgress
              .filter(l => l && l.isCompleted)
              .map(l => l.levelId)
            break
          }
        }
      }
    } catch (err) {
      console.warn('[LevelSelectScene] 读取通关进度异常，使用空进度兜底:', err)
      this.completedLevels = []
    }
  }

  /**
   * 初始化默认选中的关卡
   */
  private initDefaultSelection(): void {
    const chapters = getAllChapters()
    const currentChapter = chapters[this.currentChapterIndex]
    if (!currentChapter) return

    const levels = getChapterLevels(currentChapter.id)
    if (levels.length === 0) return

    // 优先选择第一个已解锁但尚未通关的关卡
    const currentPending = levels.find(
      l => isLevelUnlocked(l.id, this.completedLevels) && !this.completedLevels.includes(l.id)
    )

    if (currentPending) {
      this.selectedLevelId = currentPending.id
    } else {
      // 若全部通关或暂无待通，选最后一个已解锁关卡
      const unlocked = levels.filter(l => isLevelUnlocked(l.id, this.completedLevels))
      this.selectedLevelId = unlocked.length > 0 ? unlocked[unlocked.length - 1].id : levels[0].id
    }
  }

  /**
   * 刷新整个界面
   */
  private renderAll(): void {
    this.clearTweens()
    this.renderChapterTabs()
    this.renderSandTable()
    this.renderIntelPanel()
  }

  /**
   * 清理运行中的动效
   */
  private clearTweens(): void {
    for (const t of this.activeTweens) {
      t.stop()
      t.remove()
    }
    this.activeTweens = []
  }

  // ==========================================
  // 1. 顶部章节选择栏
  // ==========================================

  private renderChapterTabs(): void {
    this.chapterTabsContainer.removeAll(true)
    const chapters = getAllChapters()
    const width = this.cameras.main.width
    const tabWidth = 200
    const spacing = 16
    const totalWidth = chapters.length * tabWidth + (chapters.length - 1) * spacing
    const startX = (width - totalWidth) / 2 + tabWidth / 2
    const y = 108

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      const x = startX + i * (tabWidth + spacing)
      const isUnlocked = isChapterUnlocked(chapter.id, this.completedLevels)
      const isSelected = i === this.currentChapterIndex

      this.createChapterTab(x, y, tabWidth, chapter, isUnlocked, isSelected, i)
    }
  }

  private createChapterTab(
    x: number,
    y: number,
    width: number,
    chapter: ChapterConfig,
    isUnlocked: boolean,
    isSelected: boolean,
    index: number
  ): void {
    const tabBg = this.add.rectangle(x, y, width, 44, InkColor.paperPanel)
    this.chapterTabsContainer.add(tabBg)

    if (isSelected) {
      tabBg.setFillStyle(InkColor.paperDeep)
      tabBg.setStrokeStyle(2, InkColor.cinnabar)
    } else if (isUnlocked) {
      tabBg.setStrokeStyle(1, InkColor.ink)
    } else {
      tabBg.setFillStyle(InkColor.paperPanel, 0.45)
      tabBg.setStrokeStyle(1, InkColor.inkFaint)
    }

    const titleColor = isUnlocked ? (isSelected ? InkText.strong : InkText.ink) : InkText.faint
    const titleText = inkText(this, x, y - 6, chapter.name, {
      size: InkFontSize.md,
      color: titleColor,
      bold: isSelected,
      originX: 0.5
    })
    this.chapterTabsContainer.add(titleText)

    // 历史年号
    const subText = inkText(this, x, y + 12, chapter.historicalEvent.split('-')[0].trim(), {
      size: 11,
      color: InkText.faint,
      originX: 0.5
    })
    this.chapterTabsContainer.add(subText)

    // 锁定标记
    if (!isUnlocked) {
      const lockText = inkText(this, x + width / 2 - 20, y, '🔒', {
        size: 13,
        color: InkText.faint,
        originX: 0.5
      })
      this.chapterTabsContainer.add(lockText)
    }

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
        if (this.currentChapterIndex !== index) {
          this.currentChapterIndex = index
          this.initDefaultSelection()
          this.renderAll()
        }
      })
    }
  }

  // ==========================================
  // 2. 左侧军事沙盘推演图 (Sand Table)
  // ==========================================

  private renderSandTable(): void {
    this.sandTableContainer.removeAll(true)

    const chapters = getAllChapters()
    const currentChapter = chapters[this.currentChapterIndex]
    if (!currentChapter) return

    const levels = getChapterLevels(currentChapter.id)

    // 沙盘坐标与尺寸
    const ST_X = 40
    const ST_Y = 152
    const ST_W = 800
    const ST_H = 536

    const g = this.add.graphics()
    this.sandTableContainer.add(g)

    // --- 1. 底板与多重古风边框 ---
    g.fillStyle(InkColor.paperPanel, 0.95)
    g.fillRect(ST_X, ST_Y, ST_W, ST_H)

    // 外框（墨晕粗线）
    g.lineStyle(2.5, InkColor.inkWash, 1)
    g.strokeRect(ST_X, ST_Y, ST_W, ST_H)

    // 内框（细墨线）
    const innerMargin = 8
    g.lineStyle(1, InkColor.inkFaint, 0.8)
    g.strokeRect(ST_X + innerMargin, ST_Y + innerMargin, ST_W - innerMargin * 2, ST_H - innerMargin * 2)

    // 四角中式回纹/云纹角饰
    this.drawCornerBrackets(g, ST_X + 12, ST_Y + 12, ST_W - 24, ST_H - 24, 16)

    // --- 2. 沙盘舆图背景地形墨晕（山水/险要关河） ---
    this.drawTerrainWash(g, ST_X, ST_Y, ST_W, ST_H)

    // 经纬方位参考虚线（军事战备图感）
    this.drawTacticalGrid(g, ST_X, ST_Y, ST_W, ST_H)

    // 罗盘方位标记 (八卦子午罗盘)
    this.drawCompass(ST_X + 50, ST_Y + 45)

    // 舆图标题
    const mapTitle = inkText(this, ST_X + 80, ST_Y + 36, `「${currentChapter.name} · 行军阵图」`, {
      size: 15,
      color: InkText.wash,
      bold: true
    })
    this.sandTableContainer.add(mapTitle)

    // 战局平定进度标尺
    const completedCount = levels.filter(l => this.completedLevels.includes(l.id)).length
    const progressText = inkText(
      this,
      ST_X + ST_W - 24,
      ST_Y + 36,
      `平定战线: ${completedCount}/${levels.length} 隘`,
      {
        size: 13,
        color: completedCount === levels.length ? InkText.green : InkText.cinnabar,
        bold: true,
        originX: 1
      }
    )
    this.sandTableContainer.add(progressText)

    if (levels.length === 0) {
      const emptyNote = inkText(
        this,
        ST_X + ST_W / 2,
        ST_Y + ST_H / 2,
        '此篇章战役舆图整备中，尚未勘定敌阵……',
        {
          size: 16,
          color: InkText.faint,
          originX: 0.5,
          originY: 0.5
        }
      )
      this.sandTableContainer.add(emptyNote)
      return
    }

    // --- 3. 五大三国古战场卷轴坐标布局 ---
    // 卷一巨鹿 -> 卷二樊城 -> 卷三合淝 -> 卷四焚城洛阳 -> 卷五虎牢雄关
    const nodeCoords = [
      { x: ST_X + 125, y: ST_Y + 370 }, // 卷一：巨鹿破黄巾（张角）
      { x: ST_X + 265, y: ST_Y + 210 }, // 卷二：樊城破八门（曹仁）
      { x: ST_X + 415, y: ST_Y + 345 }, // 卷三：合淝威逍遥（张辽）
      { x: ST_X + 555, y: ST_Y + 195 }, // 卷四：焚城讨董卓（董卓）
      { x: ST_X + 695, y: ST_Y + 330 }  // 卷五：虎牢战温侯（吕布）
    ]

    // --- 4. 绘制蜿蜒行军虚线轨迹与箭头 ---
    for (let i = 0; i < levels.length - 1; i++) {
      const startCoord = nodeCoords[i]
      const endCoord = nodeCoords[i + 1]
      if (!startCoord || !endCoord) continue

      const levelA = levels[i]
      const levelB = levels[i + 1]
      const isConquered = this.completedLevels.includes(levelA.id)
      const isRouteUnlocked = isLevelUnlocked(levelB.id, this.completedLevels)

      const midX = (startCoord.x + endCoord.x) / 2
      const midY = (startCoord.y + endCoord.y) / 2 + (i % 2 === 0 ? -18 : 18)
      const waypoints = [startCoord, { x: midX, y: midY }, endCoord]

      this.drawDashedRoute(g, waypoints, isConquered, isRouteUnlocked)
    }

    // --- 5. 绘制城寨关隘节点徽章 ---
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i]
      const coord = nodeCoords[i] || { x: ST_X + 120 + i * 140, y: ST_Y + 260 }
      const isCompleted = this.completedLevels.includes(level.id)
      const isUnlocked = isLevelUnlocked(level.id, this.completedLevels)
      const isSelected = this.selectedLevelId === level.id
      const isCurrentFrontier = isUnlocked && !isCompleted

      this.renderFortressNode(coord.x, coord.y, level, i, isCompleted, isUnlocked, isSelected, isCurrentFrontier)
    }
  }

  /**
   * 绘制四角中式回纹/角饰
   */
  private drawCornerBrackets(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    len: number
  ): void {
    g.lineStyle(2, InkColor.inkWash, 0.8)

    // 左上角
    g.beginPath()
    g.moveTo(x, y + len)
    g.lineTo(x, y)
    g.lineTo(x + len, y)
    g.strokePath()

    // 右上角
    g.beginPath()
    g.moveTo(x + w - len, y)
    g.lineTo(x + w, y)
    g.lineTo(x + w, y + len)
    g.strokePath()

    // 左下角
    g.beginPath()
    g.moveTo(x, y + h - len)
    g.lineTo(x, y + h)
    g.lineTo(x + len, y + h)
    g.strokePath()

    // 右下角
    g.beginPath()
    g.moveTo(x + w - len, y + h)
    g.lineTo(x + w, y + h)
    g.lineTo(x + w, y + h - len)
    g.strokePath()
  }

  /**
   * 绘制水墨地形浅晕（远山群峦与险要黄河/汉水）
   */
  private drawTerrainWash(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    // 远山墨影（低透明度叠染）
    g.fillStyle(0x2a2a2a, 0.04)
    g.beginPath()
    g.moveTo(x + 50, y + 260)
    g.lineTo(x + 190, y + 130)
    g.lineTo(x + 290, y + 210)
    g.lineTo(x + 390, y + 105)
    g.lineTo(x + 520, y + 220)
    g.lineTo(x + 630, y + 120)
    g.lineTo(x + 750, y + 240)
    g.lineTo(x + 750, y + 360)
    g.lineTo(x + 50, y + 360)
    g.closePath()
    g.fillPath()

    // 更浅一层的近山
    g.fillStyle(0x2a2a2a, 0.03)
    g.beginPath()
    g.moveTo(x + 260, y + 480)
    g.lineTo(x + 380, y + 360)
    g.lineTo(x + 510, y + 490)
    g.closePath()
    g.fillPath()

    // 险要关河（浅青灰墨线，弯曲流经）
    g.lineStyle(16, 0x3f5f7a, 0.07)
    g.beginPath()
    g.moveTo(x + 120, y + 90)
    g.lineTo(x + 230, y + 170)
    g.lineTo(x + 340, y + 280)
    g.lineTo(x + 460, y + 350)
    g.lineTo(x + 540, y + 490)
    g.lineTo(x + 620, y + 530)
    g.strokePath()

    g.lineStyle(6, 0x3f5f7a, 0.12)
    g.beginPath()
    g.moveTo(x + 120, y + 90)
    g.lineTo(x + 230, y + 170)
    g.lineTo(x + 340, y + 280)
    g.lineTo(x + 460, y + 350)
    g.lineTo(x + 540, y + 490)
    g.lineTo(x + 620, y + 530)
    g.strokePath()
  }

  /**
   * 绘制经纬方阵细线
   */
  private drawTacticalGrid(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    g.lineStyle(1, 0x2a2a2a, 0.035)
    // 纵线
    for (let gx = x + 80; gx < x + w; gx += 80) {
      g.beginPath()
      g.moveTo(gx, y + 10)
      g.lineTo(gx, y + h - 10)
      g.strokePath()
    }
    // 横线
    for (let gy = y + 70; gy < y + h; gy += 70) {
      g.beginPath()
      g.moveTo(x + 10, gy)
      g.lineTo(x + w - 10, gy)
      g.strokePath()
    }
  }

  /**
   * 绘制中式子午罗盘方位
   */
  private drawCompass(cx: number, cy: number): void {
    const cg = this.add.graphics()
    this.sandTableContainer.add(cg)

    cg.lineStyle(1.5, InkColor.inkWash, 0.8)
    cg.strokeCircle(cx, cy, 14)
    cg.strokeCircle(cx, cy, 5)

    // 十字线
    cg.beginPath()
    cg.moveTo(cx, cy - 19)
    cg.lineTo(cx, cy + 19)
    cg.moveTo(cx - 19, cy)
    cg.lineTo(cx + 19, cy)
    cg.strokePath()

    const northText = inkText(this, cx, cy - 26, '北', {
      size: 11,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.sandTableContainer.add(northText)
  }

  /**
   * 绘制折线行军虚线与方向指示微箭头
   */
  private drawDashedRoute(
    g: Phaser.GameObjects.Graphics,
    waypoints: { x: number; y: number }[],
    isConquered: boolean,
    isUnlocked: boolean
  ): void {
    const color = isConquered ? InkColor.cinnabar : isUnlocked ? InkColor.ink : 0x8a8577
    const alpha = isUnlocked ? 0.9 : 0.4
    const lineWidth = isConquered ? 3 : 2
    g.lineStyle(lineWidth, color, alpha)

    const dashLen = 7
    const gapLen = 5

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i]
      const p2 = waypoints[i + 1]
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.hypot(dx, dy)
      if (dist === 0) continue

      const ux = dx / dist
      const uy = dy / dist

      let traveled = 0
      let drawing = true
      let iterations = 0
      while (traveled < dist && iterations++ < 500) {
        const step = Math.min(drawing ? dashLen : gapLen, dist - traveled)
        if (step <= 0.01) break
        if (drawing) {
          g.beginPath()
          g.moveTo(p1.x + ux * traveled, p1.y + uy * traveled)
          g.lineTo(p1.x + ux * (traveled + step), p1.y + uy * (traveled + step))
          g.strokePath()
        }
        traveled += step
        drawing = !drawing
      }

      // 中点绘制行军方向小箭头
      if (isUnlocked) {
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2
        const angle = Math.atan2(dy, dx)
        const arrowSize = 6

        g.fillStyle(color, alpha)
        g.beginPath()
        g.moveTo(midX + Math.cos(angle) * arrowSize, midY + Math.sin(angle) * arrowSize)
        g.lineTo(
          midX + Math.cos(angle + 2.3) * arrowSize,
          midY + Math.sin(angle + 2.3) * arrowSize
        )
        g.lineTo(
          midX + Math.cos(angle - 2.3) * arrowSize,
          midY + Math.sin(angle - 2.3) * arrowSize
        )
        g.closePath()
        g.fillPath()
      }
    }
  }

  /**
   * 绘制城寨关隘要塞徽章
   */
  private renderFortressNode(
    x: number,
    y: number,
    level: LevelConfig,
    index: number,
    isCompleted: boolean,
    isUnlocked: boolean,
    isSelected: boolean,
    isCurrentFrontier: boolean
  ): void {
    const nodeContainer = this.add.container(x, y)
    this.sandTableContainer.add(nodeContainer)

    const glyphs = ['鹿', '樊', '淝', '洛', '牢']
    const glyph = glyphs[index] || '城'

    // 阴影
    const shadow = this.add.circle(2, 4, 30, 0x000000, 0.12)
    nodeContainer.add(shadow)

    // 烽火前线脉冲光环（未通关但可挑战的前线要塞）
    if (isCurrentFrontier) {
      const beaconGlow = this.add.graphics()
      beaconGlow.lineStyle(3, InkColor.cinnabar, 0.8)
      beaconGlow.strokeCircle(0, 0, 32)
      nodeContainer.add(beaconGlow)

      const pulseTween = this.tweens.add({
        targets: beaconGlow,
        scaleX: 1.45,
        scaleY: 1.45,
        alpha: 0,
        duration: 1300,
        repeat: -1,
        ease: 'Cubic.easeOut'
      })
      this.activeTweens.push(pulseTween)

      // 顶部"待征"令签
      const beaconTagBg = this.add.rectangle(0, -42, 46, 18, InkColor.cinnabar)
      beaconTagBg.setStrokeStyle(1, 0x7a1a15)
      const beaconTagText = inkText(this, 0, -42, '【待征】', {
        size: 11,
        color: InkText.paper,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      nodeContainer.add([beaconTagBg, beaconTagText])
    }

    // 主徽章圆盘
    const bgFill = isCompleted ? 0xdadfc9 : isUnlocked ? 0xe8e0cf : 0xd8d0be
    const borderStroke = isSelected
      ? InkColor.cinnabar
      : isCompleted
      ? 0x5f7a4a
      : isUnlocked
      ? InkColor.ink
      : InkColor.inkFaint
    const borderWidth = isSelected ? 3.5 : isCompleted ? 2.5 : isUnlocked ? 2 : 1.5

    const baseCircle = this.add.circle(0, 0, 30, bgFill)
    baseCircle.setStrokeStyle(borderWidth, borderStroke)
    nodeContainer.add(baseCircle)

    // 内同心细环
    const innerRing = this.add.circle(0, 0, 24)
    innerRing.setStrokeStyle(1, isUnlocked ? InkColor.ink : InkColor.inkFaint, 0.6)
    nodeContainer.add(innerRing)

    // 居中关卡性质铭文（鹿/樊/淝/洛/牢）
    const centerChar = inkText(this, 0, 0, glyph, {
      size: 20,
      color: isUnlocked ? (isSelected ? InkText.strong : InkText.ink) : InkText.faint,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    nodeContainer.add(centerChar)

    // 选中准星（四角框与光标）
    if (isSelected) {
      const reticleG = this.add.graphics()
      reticleG.lineStyle(2, InkColor.cinnabar, 0.95)
      const rSize = 38
      const rLen = 8
      // 四角折线
      reticleG.beginPath()
      reticleG.moveTo(-rSize, -rSize + rLen)
      reticleG.lineTo(-rSize, -rSize)
      reticleG.lineTo(-rSize + rLen, -rSize)

      reticleG.moveTo(rSize - rLen, -rSize)
      reticleG.lineTo(rSize, -rSize)
      reticleG.lineTo(rSize, -rSize + rLen)

      reticleG.moveTo(-rSize, rSize - rLen)
      reticleG.lineTo(-rSize, rSize)
      reticleG.lineTo(-rSize + rLen, rSize)

      reticleG.moveTo(rSize - rLen, rSize)
      reticleG.lineTo(rSize, rSize)
      reticleG.lineTo(rSize, rSize - rLen)
      reticleG.strokePath()
      nodeContainer.add(reticleG)
    }

    // 通关大捷朱砂方印 (Cinnabar Grand Victory Seal)
    if (isCompleted) {
      const sealContainer = this.add.container(24, -20)
      sealContainer.setAngle(-12)

      const sealBox = this.add.rectangle(0, 0, 34, 20, InkColor.cinnabar)
      sealBox.setStrokeStyle(1, 0x6e1b15)
      const sealTxt = inkText(this, 0, 0, '大捷', {
        size: 11,
        color: '#ffffff',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      sealContainer.add([sealBox, sealTxt])
      nodeContainer.add(sealContainer)

      // 金星评级
      const starText = inkText(this, 0, 38, '★★★', {
        size: 12,
        color: InkText.gold,
        originX: 0.5,
        originY: 0.5
      })
      nodeContainer.add(starText)
    } else if (!isUnlocked) {
      // 锁定状态顶部标记
      const lockBg = this.add.rectangle(0, -42, 46, 18, 0xd0c8b6)
      lockBg.setStrokeStyle(1, InkColor.inkFaint)
      const lockText = inkText(this, 0, -42, '🔒 待开', {
        size: 11,
        color: InkText.faint,
        originX: 0.5,
        originY: 0.5
      })
      nodeContainer.add([lockBg, lockText])
    }

    // 节点下方关卡名称
    const meta = getBattlefieldMapMeta(level.id)
    const levelLabelY = isCompleted ? 54 : 48
    const shortTitle = meta ? `${meta.scrollTitle} · ${meta.guardianBossName}` : `第${index + 1}关 · ${level.name}`
    const levelLabel = inkText(this, 0, levelLabelY, shortTitle, {
      size: 12,
      color: isUnlocked ? InkText.strong : InkText.faint,
      bold: isSelected,
      originX: 0.5,
      originY: 0.5
    })
    nodeContainer.add(levelLabel)

    // 点击交互区
    const hitArea = this.add.circle(0, 0, 36, 0xffffff, 0.001)
    hitArea.setInteractive({ useHandCursor: true })
    nodeContainer.add(hitArea)

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: nodeContainer,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 150,
        ease: 'Quad.easeOut'
      })
    })

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: nodeContainer,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150,
        ease: 'Quad.easeOut'
      })
    })

    hitArea.on('pointerup', () => {
      if (this.selectedLevelId !== level.id) {
        this.selectedLevelId = level.id
        this.clearTweens()
        this.renderSandTable()
        this.renderIntelPanel()
      }
    })
  }

  // ==========================================
  // 3. 右侧《军机密报》情报卷轴卡 (Intel Panel)
  // ==========================================

  private renderIntelPanel(): void {
    this.intelContainer.removeAll(true)

    const chapters = getAllChapters()
    const currentChapter = chapters[this.currentChapterIndex]
    if (!currentChapter) return

    const levels = getChapterLevels(currentChapter.id)
    let selectedLevel = levels.find(l => l.id === this.selectedLevelId)
    if (!selectedLevel && levels.length > 0) {
      selectedLevel = levels[0]
      this.selectedLevelId = selectedLevel.id
    }

    const IX = 860
    const IY = 152
    const IW = 380
    const IH = 536

    const ig = this.add.graphics()
    this.intelContainer.add(ig)

    // 上下卷轴木轴装裱
    // 上木轴
    ig.fillStyle(0x3e2723, 1)
    ig.fillRoundedRect(IX - 8, IY - 5, IW + 16, 12, 5)
    ig.fillStyle(0xa0782f, 1) // 铜轴帽
    ig.fillCircle(IX - 8, IY + 1, 6)
    ig.fillCircle(IX + IW + 8, IY + 1, 6)

    // 下木轴
    ig.fillStyle(0x3e2723, 1)
    ig.fillRoundedRect(IX - 8, IY + IH - 7, IW + 16, 12, 5)
    ig.fillStyle(0xa0782f, 1)
    ig.fillCircle(IX - 8, IY + IH - 1, 6)
    ig.fillCircle(IX + IW + 8, IY + IH - 1, 6)

    // 卷轴宣纸主体
    ig.fillStyle(InkColor.paperPanel, 0.98)
    ig.fillRect(IX, IY + 5, IW, IH - 14)
    ig.lineStyle(1.5, InkColor.inkWash, 0.9)
    ig.strokeRect(IX, IY + 5, IW, IH - 14)

    // 内框印记细线
    ig.lineStyle(1, InkColor.inkFaint, 0.6)
    ig.strokeRect(IX + 6, IY + 11, IW - 12, IH - 26)

    if (!selectedLevel) {
      const noData = inkText(this, IX + IW / 2, IY + IH / 2, '暂无军情密报', {
        size: 15,
        color: InkText.faint,
        originX: 0.5,
        originY: 0.5
      })
      this.intelContainer.add(noData)
      return
    }

    const isCompleted = this.completedLevels.includes(selectedLevel.id)
    const isUnlocked = isLevelUnlocked(selectedLevel.id, this.completedLevels)
    const levelIndex = levels.findIndex(l => l.id === selectedLevel!.id)
    const mapMeta = getBattlefieldMapMeta(selectedLevel.id)

    let curY = IY + 22

    // 1. 卷首印信与关隘名称
    const sealBg = this.add.rectangle(IX + 58, curY + 6, 76, 22, InkColor.cinnabar)
    sealBg.setStrokeStyle(1, 0x6e1b15)
    const sealText = inkText(this, IX + 58, curY + 6, '军机密报', {
      size: 12,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.intelContainer.add([sealBg, sealText])

    const statusBadge = inkText(
      this,
      IX + IW - 24,
      curY + 6,
      isCompleted ? '【大捷 · 已平定】' : isUnlocked ? '【烽火 · 待发兵】' : '【险隘 · 封锁中】',
      {
        size: 12,
        color: isCompleted ? InkText.green : isUnlocked ? InkText.cinnabar : InkText.faint,
        bold: true,
        originX: 1,
        originY: 0.5
      }
    )
    this.intelContainer.add(statusBadge)

    curY += 26

    const titleText = inkText(
      this,
      IX + 20,
      curY,
      mapMeta ? `${mapMeta.scrollTitle} · ${selectedLevel.name}` : `第 ${levelIndex + 1} 关 · ${selectedLevel.name}`,
      {
        size: 18,
        color: InkText.strong,
        bold: true
      }
    )
    this.intelContainer.add(titleText)

    curY += 26

    // 分割线
    ig.lineStyle(1, InkColor.ink, 0.4)
    ig.beginPath()
    ig.moveTo(IX + 18, curY)
    ig.lineTo(IX + IW - 18, curY)
    ig.strokePath()

    curY += 10

    // 2. 战地密报与战役背景
    const briefingBg = this.add.rectangle(IX + IW / 2, curY + 26, IW - 36, 52, InkColor.paperDeep)
    briefingBg.setStrokeStyle(1, InkColor.inkFaint, 0.5)
    this.intelContainer.add(briefingBg)

    const briefingContent = this.getLevelBriefing(selectedLevel.id)
    const briefingText = inkText(this, IX + 26, curY + 7, briefingContent, {
      size: 11,
      color: InkText.wash,
      wrapWidth: IW - 56
    })
    this.intelContainer.add(briefingText)

    curY += 60

    // 3. 敌情侦察与镇守主帅命脉弱点
    const enemyAnalysis = this.analyzeEnemyIntel(selectedLevel)

    const reconHeader = inkText(this, IX + 20, curY, '◈ 敌情侦察 & 镇守主帅', {
      size: 13,
      color: InkText.wash,
      bold: true
    })
    this.intelContainer.add(reconHeader)

    curY += 20

    const scaleText = inkText(
      this,
      IX + 24,
      curY,
      `敌势规模: 共 ${selectedLevel.waves.length} 波冲阵 · 约 ${enemyAnalysis.totalCount} 众敌兵`,
      {
        size: 11,
        color: InkText.ink
      }
    )
    this.intelContainer.add(scaleText)

    curY += 18

    if (mapMeta) {
      const bossLine = inkText(
        this,
        IX + 24,
        curY,
        `镇守主帅: ${mapMeta.guardianBossName} (${INK_WUXING[mapMeta.guardianBossElement].label}) · 命脉弱点: ${mapMeta.weaknessReactionDesc}`,
        {
          size: 11,
          color: InkText.cinnabar,
          bold: true
        }
      )
      this.intelContainer.add(bossLine)
      curY += 18
    }

    const wuxingIntro = inkText(this, IX + 24, curY, '敌众五行: ', {
      size: 11,
      color: InkText.ink
    })
    this.intelContainer.add(wuxingIntro)

    // 绘制五行徽章
    let badgeX = IX + 88
    for (const wx of enemyAnalysis.elements) {
      const wxStyle = INK_WUXING[wx]
      if (!wxStyle) continue

      const bBg = this.add.rectangle(badgeX + 16, curY + 8, 32, 18, wxStyle.fill)
      bBg.setStrokeStyle(1, wxStyle.border)
      const bTxt = inkText(this, badgeX + 16, curY + 8, wxStyle.label, {
        size: 11,
        color: wxStyle.text,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      this.intelContainer.add([bBg, bTxt])
      badgeX += 38
    }

    curY += 24

    // 孙子兵策：克敌制胜要略卡
    const stratBg = this.add.rectangle(IX + IW / 2, curY + 26, IW - 36, 52, 0xf0ebd9)
    stratBg.setStrokeStyle(1, 0xb08a52, 0.7)
    this.intelContainer.add(stratBg)

    const stratTitle = inkText(this, IX + 26, curY + 6, '【破敌兵法 · 命脉破壁】', {
      size: 11,
      color: InkText.cinnabar,
      bold: true
    })
    const adviceText = mapMeta
      ? `第15波决战【${mapMeta.guardianBossName}】拥有五行铁壁；以【${mapMeta.weaknessReactionDesc}】命中可双倍破壁并瘫痪3s！`
      : enemyAnalysis.counterAdvice
    const stratAdvice = inkText(this, IX + 26, curY + 21, adviceText, {
      size: 11,
      color: InkText.wash,
      wrapWidth: IW - 56
    })
    this.intelContainer.add([stratTitle, stratAdvice])

    curY += 60

    // 4. 守军军资备给、宿命主材与将魂定向悬赏
    const prepHeader = inkText(this, IX + 20, curY, '◈ 军备与定向悬赏（选图即定主帅）', {
      size: 13,
      color: InkText.wash,
      bold: true
    })
    this.intelContainer.add(prepHeader)

    curY += 20

    const prepRow1 = inkText(
      this,
      IX + 24,
      curY,
      `帅旗耐久: ❤️ ${selectedLevel.playerStartHealth} 点   战备资粮: 🪙 ${selectedLevel.playerStartCost} 钱`,
      {
        size: 11,
        color: InkText.ink
      }
    )
    this.intelContainer.add(prepRow1)

    curY += 18

    const prepRow2 = inkText(
      this,
      IX + 24,
      curY,
      `凯旋酬银: 💰 ${selectedLevel.rewards.gold} 金币   功勋军绩: ⭐ ${selectedLevel.rewards.experience} 军勋`,
      {
        size: 11,
        color: InkText.gold
      }
    )
    this.intelContainer.add(prepRow2)

    curY += 18

    if (mapMeta) {
      const matRow = inkText(
        this,
        IX + 24,
        curY,
        `🛠️ 必掉主材: 【${mapMeta.divineMaterialName}】→ 铸 ${mapMeta.targetHeroName}${mapMeta.exclusiveWeaponName}`,
        {
          size: 11,
          color: InkText.cinnabar,
          bold: true
        }
      )
      this.intelContainer.add(matRow)
      curY += 18

      const soulRow = inkText(
        this,
        IX + 24,
        curY,
        `💎 必掉将魂: ${mapMeta.soulStoneName} ×1（通达第15波可择【凯旋】或【乘胜北伐】）`,
        {
          size: 11,
          color: InkText.green
        }
      )
      this.intelContainer.add(soulRow)
      curY += 28
    } else {
      curY += 28
    }

    // 5. 出征按钮
    if (isUnlocked) {
      const btnLabel = isCompleted ? '⚔️ 扫荡 / 北伐再战' : '⚔️ 点将出征'
      const startBtn = createInkButton(
        this,
        IX + IW / 2,
        curY,
        260,
        42,
        btnLabel,
        {
          fill: InkColor.cinnabar,
          hoverFill: 0xb53a32,
          textColor: '#ffffff',
          fontSize: 16,
          onClick: () => {
            this.startLevel(selectedLevel!.id)
          }
        }
      )
      this.intelContainer.add(startBtn)
    } else {
      const lockedBox = this.add.rectangle(IX + IW / 2, curY, 260, 42, InkColor.paperDeep)
      lockedBox.setStrokeStyle(1, InkColor.inkFaint)
      const lockedText = inkText(this, IX + IW / 2, curY, '🔒 关隘封锁 · 需克复前置', {
        size: 14,
        color: InkText.faint,
        originX: 0.5,
        originY: 0.5
      })
      this.intelContainer.add([lockedBox, lockedText])
    }
  }

  /**
   * 获取战役关卡历史探报背景文案
   */
  private getLevelBriefing(levelId: string): string {
    switch (levelId) {
      case 'chapter1_level1':
        return '卷一《巨鹿破黄巾》：天公将军张角据守巨鹿中军大帐，以黄天回春之术愈合部曲。善用木生火【燎原·焚尽】破其五行铁壁！'
      case 'chapter1_level2':
        return '卷二《樊城破八门》：曹仁于樊城布下八门金锁重甲铁阵，防御高达120%。唯有土生金【淬刃·锋芒】可震碎其玄铁金锁！'
      case 'chapter1_level3':
        return '卷三《合淝威逍遥》：张辽率八百铁骑疾风突袭逍遥津，移速极快。当以金生水【寒芒·碎冰】或水生木藤蔓硬控锁其锋芒！'
      case 'chapter1_level4':
        return '卷四《焚城讨董卓》：董卓率西凉飞熊重骑盘踞洛阳，暴击抗性极高。以火生土【熔岩·焦土】削其韧性刚毅，方可一击克敌！'
      case 'chapter1_level5':
        return '卷五《虎牢战温侯》：无双温侯吕布立马虎牢雄关，五格铁壁威震天下。集五虎上将之力，以水生木【滋养·蔓延】锁拿温侯！'
      default:
        return '密探急报：贼兵据险设防，阵中旗帜林立。诸将当深察五行相生，审度虚实，奇兵制胜！'
    }
  }

  /**
   * 综合分析关卡敌情侦察（数量统计与五行生克建议）
   */
  private analyzeEnemyIntel(level: LevelConfig): {
    totalCount: number
    elements: WuXing[]
    counterAdvice: string
  } {
    let totalCount = 0
    const elemCounts: Record<WuXing, number> = {
      metal: 0,
      wood: 0,
      water: 0,
      fire: 0,
      earth: 0
    }

    for (const wave of level.waves) {
      for (const enemy of wave.enemies) {
        totalCount += enemy.count
        const cfg = getEnemyConfig(enemy.enemyId)
        if (cfg && cfg.wuXing) {
          elemCounts[cfg.wuXing] = (elemCounts[cfg.wuXing] || 0) + enemy.count
        }
      }
    }

    // 筛选出场五行并按数量排序
    const sortedElems = (Object.keys(elemCounts) as WuXing[])
      .filter(w => elemCounts[w] > 0)
      .sort((a, b) => elemCounts[b] - elemCounts[a])

    // 提取前2种主力五行，精准推荐相生相克武将
    const dominantElems = sortedElems.slice(0, 2)
    const dominantLabels = dominantElems.map(e => INK_WUXING[e]?.label || '').filter(Boolean).join('、')
    const counterLabels = Array.from(
      new Set(dominantElems.map(e => INK_WUXING[COUNTERED_BY[e]]?.label || ''))
    ).filter(Boolean).join('、')

    const counterAdvice = dominantLabels
      ? `探报敌众主力多属【${dominantLabels}】。遣【${counterLabels}】系良将克之，五行相克可收【克制】奇效！`
      : '敌阵虚实未定，遣各系精锐审时度势，善用五行生克以奇制胜！'

    return {
      totalCount,
      elements: sortedElems,
      counterAdvice
    }
  }

  /**
   * 开始关卡出征
   */
  private startLevel(levelId: string): void {
    if (this.isTransitioning) return
    this.isTransitioning = true
    this.time.delayedCall(600, () => {
      if (this.scene.isActive()) {
        this.isTransitioning = false
        if (this.input) this.input.enabled = true
      }
    })
    console.log(`[战役沙盘] 出征关卡: ${levelId}`)
    this.clearTweens()
    try {
      this.scene.start('BattleScene', { levelId })
    } catch (err) {
      console.error('[LevelSelectScene] 出征关卡异常:', err)
      this.isTransitioning = false
      if (this.input) this.input.enabled = true
    }
  }
}
