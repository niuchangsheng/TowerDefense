import Phaser from 'phaser'
import { SaveManager } from '@/core/save/SaveManager'
import {
  getAllChapters,
  getChapterLevels,
  getBattlefieldMapMeta
} from '@/data/levels'
import { LevelConfig, WuXing } from '@/types'
import {
  InkColor,
  InkText,
  INK_FONT,
  INK_WUXING,
  drawPaperBackground,
  inkText,
  createPageBackButton
} from '@/ui/InkTheme'
import { SoundFX } from '@/effects/SoundFX'

/**
 * 出师征战 · 水墨丹青五轴画屏场景
 *
 * 水墨美学要点：
 * 1. 全幅山水烟岚背景：远山泼墨重峦、山巅古烽燧与狼烟、左上苍松斜枝、远天归雁、流岚云气与水墨飞白微粒；
 * 2. 宋明立轴装裱形制：天杆挂绳、绫锦天头地脚、紫檀轴杆、鎏金玉轴头与朱红垂穗；
 * 3. 画心写意古战场意境：每卷独属五行山水剪影（巨鹿苍林/樊城怒涛/合淝赤焰/郿坞崇垒/虎牢双峰）与浓淡墨晕；
 * 4. 金石篆刻印章与书法题跋：去除现代 Emoji 与胶囊框，改用手钤金石方印、朱文批注与唯一地脚破关印记；
 * 5. 虎符朱印帅令台：底部居中双线金框虎符大印按钮，已破关接续上次折戟波次，未破关自首波起征。
 */
export default class LevelSelectScene extends Phaser.Scene {
  private saveManager: SaveManager
  private completedLevels: string[] = []
  private selectedLevelId: string = ''
  private isTransitioning: boolean = false
  private animTweens: Phaser.Tweens.Tween[] = []

  private scrollsContainer!: Phaser.GameObjects.Container
  private bottomBarContainer!: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'LevelSelectScene' })
    this.saveManager = SaveManager.getInstance()
  }

  init(): void {
    this.isTransitioning = false
    this.animTweens = []
    if (this.input) this.input.enabled = true
  }

  create(): void {
    this.isTransitioning = false
    if (this.input) this.input.enabled = true

    this.events.once('shutdown', () => {
      this.clearAllTweens()
      this.isTransitioning = false
    })

    SoundFX.unlock()
    this.loadProgress()

    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 1. 宣纸基底与全幅写意水墨山水远景
    drawPaperBackground(this)
    this.drawInkLandscapeBackdrop(width, height)
    this.createDriftingMist(width, height)
    this.createFloatingInkMotes(width, height)

    // 2. 古典匾额卷首顶栏与返回按钮
    this.renderClassicalHeader(width)

    createPageBackButton(this, () => {
      if (this.isTransitioning) return
      this.isTransitioning = true
      this.time.delayedCall(600, () => {
        if (this.scene.isActive()) {
          this.isTransitioning = false
          if (this.input) this.input.enabled = true
        }
      })
      try {
        this.scene.start('TitleScene')
      } catch (err) {
        console.error('[LevelSelectScene] 返回主页异常:', err)
        this.isTransitioning = false
        if (this.input) this.input.enabled = true
      }
    })

    this.scrollsContainer = this.add.container(0, 0)
    this.scrollsContainer.setDepth(10)
    this.bottomBarContainer = this.add.container(0, 0)
    this.bottomBarContainer.setDepth(12)

    this.initDefaultSelection()
    this.renderAll()
  }

  private clearAllTweens(): void {
    for (const tw of this.animTweens) {
      if (tw && tw.isPlaying()) tw.stop()
    }
    this.animTweens = []
  }

  // ==========================================
  // 1. 全幅水墨山水背景与古典匾额顶栏
  // ==========================================

  private drawInkLandscapeBackdrop(width: number, height: number): void {
    const g = this.add.graphics()
    g.setDepth(1)

    const drawMountain = (points: [number, number][], fillAlpha: number) => {
      g.fillStyle(InkColor.ink, fillAlpha)
      g.beginPath()
      g.moveTo(points[0][0], height)
      for (const pt of points) {
        g.lineTo(pt[0], pt[1])
      }
      g.lineTo(width, height)
      g.closePath()
      g.fillPath()
    }

    // 极远层：淡墨云山
    drawMountain([
      [0, height - 220],
      [width * 0.14, height - 285],
      [width * 0.27, height - 210],
      [width * 0.42, height - 310],
      [width * 0.58, height - 235],
      [width * 0.74, height - 295],
      [width * 0.88, height - 225],
      [width, height - 250]
    ], 0.035)

    // 中远层：青墨群峰
    drawMountain([
      [0, height - 145],
      [width * 0.18, height - 205],
      [width * 0.33, height - 140],
      [width * 0.51, height - 195],
      [width * 0.69, height - 135],
      [width * 0.84, height - 185],
      [width, height - 140]
    ], 0.065)

    // 近景：浓墨坡岸与沧浪水纹
    drawMountain([
      [0, height - 68],
      [width * 0.22, height - 96],
      [width * 0.45, height - 58],
      [width * 0.72, height - 88],
      [width, height - 62]
    ], 0.10)

    // 远山古烽燧剪影与袅袅狼烟
    const bx = width * 0.84
    const by = height - 185
    g.fillStyle(InkColor.ink, 0.18)
    g.fillRect(bx - 8, by - 14, 16, 14)
    g.fillRect(bx - 8, by - 18, 4, 4)
    g.fillRect(bx - 2, by - 18, 4, 4)
    g.fillRect(bx + 4, by - 18, 4, 4)
    g.lineStyle(1.2, InkColor.ink, 0.09)
    g.beginPath()
    g.moveTo(bx, by - 18)
    g.lineTo(bx + 4, by - 34)
    g.lineTo(bx - 3, by - 52)
    g.lineTo(bx + 5, by - 70)
    g.strokePath()

    // 左上角苍松斜枝入画
    g.lineStyle(3, InkColor.ink, 0.2)
    g.beginPath()
    g.moveTo(0, 62)
    g.lineTo(44, 80)
    g.lineTo(96, 74)
    g.lineTo(148, 94)
    g.strokePath()
    g.lineStyle(1.6, InkColor.ink, 0.16)
    g.beginPath()
    g.moveTo(76, 77)
    g.lineTo(108, 108)
    g.strokePath()

    const pineClusters = [
      { cx: 94, cy: 70, r: 9 },
      { cx: 126, cy: 82, r: 11 },
      { cx: 150, cy: 92, r: 9 },
      { cx: 108, cy: 106, r: 8 }
    ]
    for (const c of pineClusters) {
      g.fillStyle(InkColor.ink, 0.13)
      g.fillCircle(c.cx, c.cy, c.r)
    }

    // 右上角远天归雁
    const birds = [
      { x: width - 190, y: 56, s: 1 },
      { x: width - 155, y: 42, s: 0.8 },
      { x: width - 125, y: 64, s: 0.65 }
    ]
    for (const b of birds) {
      g.lineStyle(1.4, InkColor.ink, 0.25)
      g.beginPath()
      g.moveTo(b.x - 8 * b.s, b.y + 3 * b.s)
      g.lineTo(b.x, b.y - 3 * b.s)
      g.lineTo(b.x + 8 * b.s, b.y + 3 * b.s)
      g.strokePath()
    }
  }

  private createDriftingMist(width: number, height: number): void {
    const mistConfigs = [
      { x: width * 0.25, y: height - 125, w: 340, h: 24, alpha: 0.04, dur: 11000 },
      { x: width * 0.72, y: height - 170, w: 380, h: 28, alpha: 0.035, dur: 13500 }
    ]
    for (const cfg of mistConfigs) {
      const m = this.add.graphics()
      m.setDepth(2)
      m.fillStyle(InkColor.ink, cfg.alpha)
      m.fillEllipse(cfg.x, cfg.y, cfg.w, cfg.h)
      const tw = this.tweens.add({
        targets: m,
        x: { from: -28, to: 28 },
        alpha: { from: cfg.alpha * 0.7, to: cfg.alpha * 1.3 },
        duration: cfg.dur,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      })
      this.animTweens.push(tw)
    }
  }

  private createFloatingInkMotes(width: number, height: number): void {
    for (let i = 0; i < 10; i++) {
      const mote = this.add.graphics()
      mote.setDepth(2)
      const isRed = i % 4 === 0
      mote.fillStyle(isRed ? InkColor.cinnabar : InkColor.ink, isRed ? 0.18 : 0.12)
      mote.fillEllipse(0, 0, 5, 2.5)
      mote.setPosition(Phaser.Math.Between(80, width - 80), Phaser.Math.Between(60, height - 80))
      mote.setAngle(Phaser.Math.Between(-30, 30))

      const tw = this.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(35, 80),
        y: mote.y + Phaser.Math.Between(20, 50),
        alpha: { from: 0.15, to: 0.02 },
        duration: Phaser.Math.Between(5500, 9000),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      })
      this.animTweens.push(tw)
    }
  }

  private renderClassicalHeader(width: number): void {
    const header = this.add.container(width / 2, 42)
    header.setDepth(10)

    const g = this.add.graphics()
    // 笔锋飞白双横线
    g.lineStyle(1.5, InkColor.ink, 0.35)
    g.lineBetween(-320, 22, -95, 22)
    g.lineBetween(95, 22, 320, 22)
    g.lineStyle(1, InkColor.inkFaint, 0.2)
    g.lineBetween(-260, 26, 260, 26)

    // 中央菱形墨印点缀
    g.fillStyle(InkColor.cinnabar, 0.85)
    g.fillPoints(
      [
        new Phaser.Geom.Point(-86, 22),
        new Phaser.Geom.Point(-81, 17),
        new Phaser.Geom.Point(-76, 22),
        new Phaser.Geom.Point(-81, 27)
      ],
      true
    )
    g.fillPoints(
      [
        new Phaser.Geom.Point(76, 22),
        new Phaser.Geom.Point(81, 17),
        new Phaser.Geom.Point(86, 22),
        new Phaser.Geom.Point(81, 27)
      ],
      true
    )

    // 右侧朱砂小閑章「兵机」
    const sealX = 88
    const sealY = -6
    g.fillStyle(InkColor.cinnabar, 0.9)
    g.fillRoundedRect(sealX - 11, sealY - 11, 22, 22, 2)
    g.lineStyle(1, 0xf6f0e4, 0.7)
    g.strokeRect(sealX - 9, sealY - 9, 18, 18)

    header.add(g)

    const titleTxt = inkText(this, 0, -4, '出 师 征 战', {
      size: 30,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const sealTxt = inkText(this, sealX, sealY, '兵', {
      size: 12,
      color: '#f8f4ea',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const subTxt = inkText(this, 0, 22, '五 卷 古 战 场', {
      size: 12,
      color: InkText.wash,
      originX: 0.5,
      originY: 0.5
    })

    header.add([titleTxt, sealTxt, subTxt])
  }

  // ==========================================
  // 2. 存档进度读取与默认选卷
  // ==========================================

  private loadProgress(): void {
    const completedSet = new Set<string>()
    try {
      const collectFromSave = (save: { levelProgress?: Array<{ levelId: string; isCompleted?: boolean; highestWave?: number }> } | null) => {
        if (!save || !Array.isArray(save.levelProgress)) return
        for (const l of save.levelProgress) {
          if (l && (l.isCompleted || (l.highestWave && l.highestWave >= 15))) {
            completedSet.add(l.levelId)
          }
        }
      }

      collectFromSave(this.saveManager.getCurrentSave())
      for (let i = 0; i <= 3; i++) {
        if (this.saveManager.hasSave(i)) {
          collectFromSave(this.saveManager.loadFromSlot(i))
        }
      }

      for (const lvl of this.getAllScrollLevels()) {
        if (this.saveManager.getMapHighestWave(lvl.id) >= 15) {
          completedSet.add(lvl.id)
        }
      }
    } catch (err) {
      console.warn('[LevelSelectScene] 读取通关进度异常，使用空进度兜底:', err)
    }
    this.completedLevels = Array.from(completedSet)
  }

  private getAllScrollLevels(): LevelConfig[] {
    const chapters = getAllChapters()
    const firstChapter = chapters[0]
    if (!firstChapter) return []
    return getChapterLevels(firstChapter.id)
  }

  private initDefaultSelection(): void {
    const levels = this.getAllScrollLevels()
    if (levels.length === 0) return

    if (this.selectedLevelId && levels.some(l => l.id === this.selectedLevelId)) {
      return
    }

    const firstPending = levels.find(l => !this.completedLevels.includes(l.id))
    this.selectedLevelId = firstPending ? firstPending.id : levels[0].id
  }

  private renderAll(): void {
    const levels = this.getAllScrollLevels()
    this.renderFiveScrolls(levels)
    this.renderBottomCommandBar(levels)
  }

  // ==========================================
  // 3. 中央五轴宋明立轴画屏（五幅水墨丹青挂轴）
  // ==========================================

  private renderFiveScrolls(levels: LevelConfig[]): void {
    this.scrollsContainer.removeAll(true)
    if (levels.length === 0) return

    const canvasW = this.cameras.main.width
    const scrollW = 216
    const scrollH = 466
    const gap = 24
    const totalW = levels.length * scrollW + (levels.length - 1) * gap
    const startX = (canvasW - totalW) / 2 + scrollW / 2
    const baseCenterY = 334

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i]
      const isSelected = level.id === this.selectedLevelId
      const savedWave = this.saveManager.getMapHighestWave(level.id)
      const isCompleted = this.completedLevels.includes(level.id) || savedWave >= 15
      const mapBestWave = Math.max(isCompleted ? 15 : 0, savedWave)
      const cx = startX + i * (scrollW + gap)
      const cy = isSelected ? baseCenterY - 10 : baseCenterY

      this.createHangingScrollCard(
        cx,
        cy,
        scrollW,
        scrollH,
        i,
        level,
        isSelected,
        isCompleted,
        mapBestWave,
        levels
      )
    }
  }

  private createHangingScrollCard(
    cx: number,
    cy: number,
    w: number,
    h: number,
    index: number,
    level: LevelConfig,
    isSelected: boolean,
    isCompleted: boolean,
    mapBestWave: number,
    allLevels: LevelConfig[]
  ): void {
    const meta = getBattlefieldMapMeta(level.id)
    const wx: WuXing = meta?.bossWuXing || 'wood'
    const wxStyle = INK_WUXING[wx]

    const container = this.add.container(cx, cy)
    this.scrollsContainer.add(container)

    const g = this.add.graphics()
    container.add(g)

    const drawScrollFrame = (hover: boolean) => {
      g.clear()

      // 1. 宣纸挂轴背面柔和墨影
      g.fillStyle(InkColor.inkStrong, isSelected ? 0.16 : 0.07)
      g.fillRoundedRect(-w / 2 + 5, -h / 2 + 8, w, h, 3)

      // 2. 顶部丝绦挂绳与铜钩（立轴悬挂感）
      const cordAlpha = isSelected ? 0.85 : 0.45
      g.lineStyle(1.5, isSelected ? InkColor.cinnabar : InkColor.inkWash, cordAlpha)
      g.beginPath()
      g.moveTo(-28, -h / 2 - 4)
      g.lineTo(0, -h / 2 - 18)
      g.lineTo(28, -h / 2 - 4)
      g.strokePath()
      g.fillStyle(isSelected ? 0xc59b27 : 0x8a734c, 0.95)
      g.fillCircle(0, -h / 2 - 18, 3)

      // 3. 天杆（上木杆）与地轴（下粗轴 + 鎏金玉轴头）
      const rodColor = isSelected ? 0x3b1e0e : 0x2f241f
      const jadeCapColor = isSelected ? 0xc59b27 : 0x8c734b
      // 天杆
      g.fillStyle(rodColor, 1)
      g.fillRoundedRect(-w / 2 - 7, -h / 2 - 4, w + 14, 8, 3)
      g.fillStyle(jadeCapColor, 1)
      g.fillRect(-w / 2 - 10, -h / 2 - 3, 4, 6)
      g.fillRect(w / 2 + 6, -h / 2 - 3, 4, 6)

      // 地轴（比天杆更厚重）
      g.fillStyle(rodColor, 1)
      g.fillRoundedRect(-w / 2 - 9, h / 2 - 6, w + 18, 12, 4)
      g.fillStyle(jadeCapColor, 1)
      g.fillRoundedRect(-w / 2 - 14, h / 2 - 5, 6, 10, 2)
      g.fillRoundedRect(w / 2 + 8, h / 2 - 5, 6, 10, 2)

      // 地轴中央垂挂朱砂丝穗
      g.lineStyle(1.8, InkColor.cinnabar, isSelected ? 0.9 : 0.55)
      g.lineBetween(0, h / 2 + 6, 0, h / 2 + 18)
      g.fillStyle(InkColor.cinnabar, isSelected ? 0.9 : 0.6)
      g.fillCircle(0, h / 2 + 12, 2.5)

      // 4. 绫锦裱边底色（天头与地脚深宣色，中间画心澄心堂宣纸色）
      const silkBorderFill = isSelected ? 0xe5dac3 : 0xd8ccb4
      g.fillStyle(silkBorderFill, 0.98)
      g.fillRect(-w / 2, -h / 2 + 4, w, h - 8)

      // 中央画心宣纸
      const heartTop = -h / 2 + 46
      const heartH = h - 100
      const heartFill = isSelected
        ? 0xf7f2e6
        : hover
        ? 0xeee5d3
        : 0xe9dfc9
      g.fillStyle(heartFill, 0.98)
      g.fillRect(-w / 2 + 8, heartTop, w - 16, heartH)

      // 天头双惊燕带（立轴传统垂带装饰）
      g.fillStyle(isSelected ? InkColor.cinnabar : InkColor.inkWash, isSelected ? 0.35 : 0.18)
      g.fillRect(-w / 2 + 34, -h / 2 + 4, 5, 36)
      g.fillRect(w / 2 - 39, -h / 2 + 4, 5, 36)

      // 5. 画心水墨写意古战场意象（五行主题山水笔触）
      this.drawScrollBattlefieldInkArt(g, w, h, wx, isSelected)

      // 6. 主帅背后的水墨晕染圆团（烘托书法大字）
      g.fillStyle(wxStyle.border, isSelected ? 0.10 : 0.05)
      g.fillCircle(0, -14, 44)
      g.fillStyle(InkColor.ink, isSelected ? 0.05 : 0.025)
      g.fillCircle(6, -10, 32)

      // 7. 挂轴外框、画心内框与古典四角回纹抱角
      const outerStroke = isSelected
        ? InkColor.cinnabar
        : hover
        ? wxStyle.border
        : InkColor.inkWash
      g.lineStyle(isSelected ? 2.2 : 1.2, outerStroke, isSelected ? 0.95 : 0.7)
      g.strokeRect(-w / 2, -h / 2 + 4, w, h - 8)

      const innerStroke = isSelected ? wxStyle.border : InkColor.inkFaint
      g.lineStyle(1, innerStroke, isSelected ? 0.65 : 0.4)
      g.strokeRect(-w / 2 + 8, heartTop, w - 16, heartH)

      this.drawClassicalCornerBrackets(
        g,
        -w / 2 + 11,
        heartTop + 3,
        w - 22,
        heartH - 6,
        8,
        isSelected ? InkColor.cinnabar : wxStyle.border,
        isSelected ? 0.85 : 0.45
      )

      // 8. 画心内部水墨飞白分隔线（两头渐细）
      this.drawBrushDivider(g, 0, -74, w - 44, isSelected ? 0.4 : 0.25)
      this.drawBrushDivider(g, 0, 62, w - 44, isSelected ? 0.4 : 0.25)
    }

    drawScrollFrame(false)

    // --- 锚点 1：天头竹简卷号 + 金石篆刻五行方印 + 书法战卷名 ---
    const scrollNumLabels = ['卷一', '卷二', '卷三', '卷四', '卷五']
    const scrollNum = scrollNumLabels[index] || `卷${index + 1}`

    // 左上角竖式小竹签卷号
    const volRibbon = this.add.graphics()
    volRibbon.fillStyle(isSelected ? InkColor.cinnabar : InkColor.inkWash, isSelected ? 0.92 : 0.75)
    volRibbon.fillRoundedRect(-w / 2 + 14, -h / 2 + 12, 22, 44, 2)
    volRibbon.lineStyle(1, 0xf6f0e4, 0.55)
    volRibbon.strokeRect(-w / 2 + 16, -h / 2 + 14, 18, 40)
    const volTxt = this.add.text(-w / 2 + 25, -h / 2 + 34, `${scrollNum[0]}\n${scrollNum[1]}`, {
      fontFamily: INK_FONT,
      fontSize: '11px',
      color: '#f8f4ea',
      fontStyle: 'bold',
      lineSpacing: 2,
      align: 'center'
    }).setOrigin(0.5, 0.5)
    container.add([volRibbon, volTxt])

    // 五行金石篆刻印章（方中带圆刀痕印）
    const sealY = -164
    const sealG = this.add.graphics()
    // 印泥微晕
    sealG.fillStyle(wxStyle.border, 0.16)
    sealG.fillRoundedRect(-23, sealY - 23, 48, 48, 5)
    // 印底
    sealG.fillStyle(wxStyle.fill, 0.96)
    sealG.fillRoundedRect(-23, sealY - 23, 46, 46, 4)
    // 双线金石印边
    sealG.lineStyle(2, wxStyle.border, 0.95)
    sealG.strokeRoundedRect(-23, sealY - 23, 46, 46, 4)
    sealG.lineStyle(1, wxStyle.border, 0.45)
    sealG.strokeRect(-19, sealY - 19, 38, 38)
    // 篆刻残角刀痕
    sealG.lineStyle(1.5, InkColor.paperPanel, 0.85)
    sealG.lineBetween(-23, sealY - 14, -18, sealY - 14)
    sealG.lineBetween(18, sealY + 15, 23, sealY + 15)

    const sealChar = inkText(this, 0, sealY, wxStyle.label, {
      size: 24,
      color: wxStyle.text,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    container.add([sealG, sealChar])

    // 战场大名与副题
    const cityTitle = meta ? meta.shortLabel : level.name
    const subTitle = meta ? meta.scrollTitle.replace(/^卷[一二三四五]·?/, '') : ''

    const cityTxt = inkText(this, 0, -114, cityTitle, {
      size: 24,
      color: isSelected ? InkText.strong : InkText.ink,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const subTxt = inkText(this, 0, -90, `· ${subTitle} ·`, {
      size: 12,
      color: InkText.faint,
      originX: 0.5,
      originY: 0.5
    })
    container.add([cityTxt, subTxt])

    // --- 锚点 2：镇守主帅（浓墨书法） & 古籍朱批破盾弱点 ---
    const bossTitleStr = meta ? `镇守 · ${meta.bossTitle}` : '守关主帅'
    const bossNameStr = meta ? meta.bossName : '统帅'
    const weakClean = meta ? meta.weaknessReactionName.replace(/[【】]/g, '') : '五行相生'

    const bossRoleTxt = inkText(this, 0, -50, bossTitleStr, {
      size: 12,
      color: InkText.faint,
      originX: 0.5,
      originY: 0.5
    })
    const bossNameTxt = inkText(this, 0, -15, bossNameStr, {
      size: 30,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    // 古籍朱砂双竖线批注条（替代现代胶囊框）
    const weakG = this.add.graphics()
    const weakY = 34
    const weakW = w - 42
    weakG.fillStyle(InkColor.cinnabar, isSelected ? 0.11 : 0.07)
    weakG.fillRect(-weakW / 2, weakY - 13, weakW, 26)
    weakG.lineStyle(2, InkColor.cinnabar, 0.75)
    weakG.lineBetween(-weakW / 2, weakY - 13, -weakW / 2, weakY + 13)
    weakG.lineBetween(weakW / 2, weakY - 13, weakW / 2, weakY + 13)
    weakG.lineStyle(0.8, InkColor.cinnabar, 0.35)
    weakG.lineBetween(-weakW / 2, weakY - 13, weakW / 2, weakY - 13)
    weakG.lineBetween(-weakW / 2, weakY + 13, weakW / 2, weakY + 13)

    const weakTxt = inkText(this, 0, weakY, `破壁 · ${weakClean}`, {
      size: 12,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    container.add([bossRoleTxt, bossNameTxt, weakG, weakTxt])

    // --- 锚点 3：宿命神兵 & 将魂题跋 ---
    const dropHeader = inkText(this, 0, 88, '─ 宿 命 神 兵 ─', {
      size: 11,
      color: InkText.faint,
      originX: 0.5,
      originY: 0.5
    })

    const heroWeaponStr = meta
      ? `${meta.targetHeroName} · ${meta.exclusiveWeaponName}`
      : '五虎专属神兵'
    const matSoulStr = meta
      ? `${meta.divineMaterialName} · ${meta.soulStoneName.replace(/[【】]/g, '')}`
      : '神兵主材 · 将魂'

    const heroWeaponTxt = inkText(this, 0, 118, heroWeaponStr, {
      size: 15,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const matSoulTxt = inkText(this, 0, 146, matSoulStr, {
      size: 12,
      color: InkText.wash,
      originX: 0.5,
      originY: 0.5
    })
    container.add([dropHeader, heroWeaponTxt, matSoulTxt])

    // --- 锚点 4：地脚唯一破关/无尽篆刻钤印（无 Emoji，纯正金石朱印 vs 淡墨题签） ---
    const resumeWave = Math.max(16, mapBestWave)
    const footerY = h / 2 - 26
    const footerW = w - 24
    const footerH = 28
    const footerG = this.add.graphics()

    if (isCompleted) {
      // 已破关：朱砂横匾金石印章（阴刻白文）
      footerG.fillStyle(InkColor.cinnabar, isSelected ? 0.94 : 0.84)
      footerG.fillRoundedRect(-footerW / 2, footerY - footerH / 2, footerW, footerH, 2)
      footerG.lineStyle(1, 0xf6f0e4, 0.65)
      footerG.strokeRect(-footerW / 2 + 2.5, footerY - footerH / 2 + 2.5, footerW - 5, footerH - 5)
    } else {
      // 未破关：宣纸墨框题签
      footerG.fillStyle(InkColor.paperDeep, 0.9)
      footerG.fillRoundedRect(-footerW / 2, footerY - footerH / 2, footerW, footerH, 2)
      footerG.lineStyle(isSelected ? 1.4 : 1, isSelected ? InkColor.inkStrong : InkColor.inkFaint, 0.7)
      footerG.strokeRect(-footerW / 2, footerY - footerH / 2, footerW, footerH)
    }

    const statusStr = isCompleted
      ? `已破关 · 无尽第 ${resumeWave} 波`
      : '未破关 · 自第 1 波起'

    const footerTxt = inkText(this, 0, footerY, statusStr, {
      size: 12,
      color: isCompleted ? '#f8f4ea' : InkText.ink,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    container.add([footerG, footerTxt])

    // 交互区域
    const hitArea = this.add.rectangle(0, 0, w, h, 0xffffff, 0.001)
    hitArea.setInteractive({ useHandCursor: true })
    container.add(hitArea)

    hitArea.on('pointerover', () => {
      if (!isSelected) {
        drawScrollFrame(true)
      }
    })
    hitArea.on('pointerout', () => {
      if (!isSelected) {
        drawScrollFrame(false)
      }
    })
    hitArea.on('pointerdown', () => {
      if (this.selectedLevelId !== level.id) {
        SoundFX.stamp(0.25)
        this.selectedLevelId = level.id
        this.renderFiveScrolls(allLevels)
        this.renderBottomCommandBar(allLevels)
      }
    })
  }

  /**
   * 在画心底部绘制每卷专属的五行古战场写意水墨剪影
   */
  private drawScrollBattlefieldInkArt(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    wx: WuXing,
    isSelected: boolean
  ): void {
    const baseAlpha = isSelected ? 0.11 : 0.06
    const inkColor = INK_WUXING[wx].border
    const bottomY = h / 2 - 48

    // 远山基底
    g.fillStyle(inkColor, baseAlpha)
    g.beginPath()
    g.moveTo(-w / 2 + 8, bottomY)
    g.lineTo(-w / 2 + 48, bottomY - 46)
    g.lineTo(-w / 2 + 102, bottomY - 22)
    g.lineTo(w / 2 - 46, bottomY - 58)
    g.lineTo(w / 2 - 8, bottomY - 24)
    g.lineTo(w / 2 - 8, bottomY)
    g.closePath()
    g.fillPath()

    // 按五行绘制意境剪影细部
    g.lineStyle(1.4, inkColor, baseAlpha * 1.6)
    if (wx === 'wood') {
      // 巨鹿：苍林古树与斜枝
      g.beginPath()
      g.moveTo(-w / 2 + 32, bottomY)
      g.lineTo(-w / 2 + 38, bottomY - 42)
      g.lineTo(-w / 2 + 56, bottomY - 56)
      g.strokePath()
    } else if (wx === 'water') {
      // 樊城：襄江叠浪水纹
      for (let i = 0; i < 3; i++) {
        const wy = bottomY - 10 - i * 8
        g.lineBetween(-w / 2 + 22 + i * 12, wy, w / 2 - 24 - i * 10, wy)
      }
    } else if (wx === 'fire') {
      // 合淝：断桥烽火升腾纹
      g.beginPath()
      g.moveTo(-20, bottomY)
      g.lineTo(-8, bottomY - 38)
      g.lineTo(6, bottomY - 18)
      g.lineTo(18, bottomY - 48)
      g.strokePath()
    } else if (wx === 'earth') {
      // 郿坞：崇垣城堞剪影
      g.fillStyle(inkColor, baseAlpha * 1.2)
      g.fillRect(w / 2 - 58, bottomY - 68, 28, 22)
      g.fillRect(w / 2 - 58, bottomY - 73, 6, 5)
      g.fillRect(w / 2 - 47, bottomY - 73, 6, 5)
      g.fillRect(w / 2 - 36, bottomY - 73, 6, 5)
    } else if (wx === 'metal') {
      // 虎牢：险关双峰与画戟寒芒
      g.beginPath()
      g.moveTo(w / 2 - 42, bottomY - 12)
      g.lineTo(w / 2 - 34, bottomY - 68)
      g.strokePath()
    }
  }

  /**
   * 绘制古典四角回纹抱角
   */
  private drawClassicalCornerBrackets(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    len: number,
    color: number,
    alpha: number
  ): void {
    g.lineStyle(1.4, color, alpha)
    // 左上
    g.beginPath()
    g.moveTo(x, y + len)
    g.lineTo(x, y)
    g.lineTo(x + len, y)
    g.strokePath()
    // 右上
    g.beginPath()
    g.moveTo(x + w - len, y)
    g.lineTo(x + w, y)
    g.lineTo(x + w, y + len)
    g.strokePath()
    // 左下
    g.beginPath()
    g.moveTo(x, y + h - len)
    g.lineTo(x, y + h)
    g.lineTo(x + len, y + h)
    g.strokePath()
    // 右下
    g.beginPath()
    g.moveTo(x + w - len, y + h)
    g.lineTo(x + w, y + h)
    g.lineTo(x + w, y + h - len)
    g.strokePath()
  }

  /**
   * 绘制毛笔中锋横线（中间实、两端微虚）
   */
  private drawBrushDivider(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    y: number,
    width: number,
    alpha: number
  ): void {
    g.lineStyle(1, InkColor.inkFaint, alpha * 0.5)
    g.lineBetween(cx - width / 2, y, cx + width / 2, y)
    g.lineStyle(1.5, InkColor.ink, alpha)
    g.lineBetween(cx - width * 0.3, y, cx + width * 0.3, y)
    g.fillStyle(InkColor.ink, alpha)
    g.fillCircle(cx, y, 1.8)
  }

  // ==========================================
  // 4. 底部居中「虎符朱印帅令台」出征令按钮
  // ==========================================

  private renderBottomCommandBar(levels: LevelConfig[]): void {
    this.bottomBarContainer.removeAll(true)

    const selectedLevel = levels.find(l => l.id === this.selectedLevelId) || levels[0]
    if (!selectedLevel) return

    const canvasW = this.cameras.main.width
    const centerX = canvasW / 2
    const btnY = 634
    const btnW = 380
    const btnH = 54

    const savedWave = this.saveManager.getMapHighestWave(selectedLevel.id)
    const isCompleted = this.completedLevels.includes(selectedLevel.id) || savedWave >= 15
    const resumeWave = isCompleted ? Math.max(16, savedWave) : 1
    const meta = getBattlefieldMapMeta(selectedLevel.id)
    const shortName = meta ? meta.shortLabel : selectedLevel.name

    const btnContainer = this.add.container(centerX, btnY)
    this.bottomBarContainer.add(btnContainer)

    const bg = this.add.graphics()
    const drawCommandSeal = (hover: boolean) => {
      bg.clear()
      const fillColor = hover ? 0xb53a32 : InkColor.cinnabar
      const goldColor = hover ? 0xd4af37 : 0xa0782f

      // 印泥微晕阴影
      bg.fillStyle(InkColor.inkStrong, 0.18)
      bg.fillRoundedRect(-btnW / 2 + 3, -btnH / 2 + 4, btnW, btnH, 5)

      // 朱砂帅令基底
      bg.fillStyle(fillColor, 1)
      bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 5)

      // 外层鎏金框
      bg.lineStyle(2, goldColor, 1)
      bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 5)

      // 内层宣纸金丝框
      bg.lineStyle(1, 0xdfd4bc, hover ? 0.75 : 0.45)
      bg.strokeRoundedRect(-btnW / 2 + 4, -btnH / 2 + 4, btnW - 8, btnH - 8, 3)

      // 四角祥云抱角
      this.drawClassicalCornerBrackets(
        bg,
        -btnW / 2 + 6,
        -btnH / 2 + 6,
        btnW - 12,
        btnH - 12,
        7,
        goldColor,
        0.95
      )

      // 左右虎符铜铆钉
      bg.fillStyle(goldColor, 0.95)
      bg.fillCircle(-btnW / 2 + 16, 0, 3)
      bg.fillCircle(btnW / 2 - 16, 0, 3)
    }

    drawCommandSeal(false)
    btnContainer.add(bg)

    const mainLabel = isCompleted
      ? `◆  再 战 烽 火 · ${shortName}  ◆`
      : `◆  点 将 出 征 · ${shortName}  ◆`

    const subLabel = isCompleted
      ? `· 本卷已破关 · 接续上次折戟处自第 ${resumeWave} 波起征 ·`
      : '· 本卷尚未破关 · 自第 1 波起征（破15波入无尽） ·'

    const mainTxt = inkText(this, 0, -7, mainLabel, {
      size: 20,
      color: '#fdfbf7',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const subTxt = inkText(this, 0, 13, subLabel, {
      size: 11,
      color: '#e8dbbe',
      originX: 0.5,
      originY: 0.5
    })
    btnContainer.add([mainTxt, subTxt])

    btnContainer.setSize(btnW, btnH)
    btnContainer.setInteractive({ useHandCursor: true })

    btnContainer.on('pointerover', () => {
      drawCommandSeal(true)
      this.tweens.add({
        targets: btnContainer,
        scaleX: 1.025,
        scaleY: 1.025,
        duration: 140,
        ease: 'Sine.easeOut'
      })
      SoundFX.whoosh(0.16)
    })

    btnContainer.on('pointerout', () => {
      drawCommandSeal(false)
      this.tweens.add({
        targets: btnContainer,
        scaleX: 1,
        scaleY: 1,
        duration: 160,
        ease: 'Sine.easeOut'
      })
    })

    btnContainer.on('pointerdown', () => {
      SoundFX.gong(0.35)
      SoundFX.stamp(0.5)
      this.startLevel(selectedLevel.id, resumeWave)
    })
  }

  /**
   * 开始关卡出征（未破关从第 1 波起，已破关从上次折戟的无尽波次起）
   */
  private startLevel(levelId: string, startWave?: number): void {
    if (this.isTransitioning) return
    this.isTransitioning = true
    this.time.delayedCall(600, () => {
      if (this.scene.isActive()) {
        this.isTransitioning = false
        if (this.input) this.input.enabled = true
      }
    })
    console.log(`[五轴选卷] 出征关卡: ${levelId}, 起始波次: ${startWave ?? 1}`)
    try {
      this.scene.start('BattleScene', { levelId, startWave })
    } catch (err) {
      console.error('[LevelSelectScene] 出征关卡异常:', err)
      this.isTransitioning = false
      if (this.input) this.input.enabled = true
    }
  }
}
