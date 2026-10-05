import Phaser from 'phaser'
import { WuXing } from '@/types'
import {
  InkColor,
  InkText,
  InkFontSize,
  INK_FONT,
  INK_WUXING,
  drawPaperBackground,
  inkText
} from '@/ui/InkTheme'
import { SoundFX } from '@/effects/SoundFX'
import { SaveManager } from '@/core/save/SaveManager'

/**
 * 标题场景（水墨国风盛典版）
 *
 * 核心设计：
 * 1. 标题结构解构：剥离"五行"，以古典朱砂双线印章独立盖印于右上方；
 * 2. TD以古建战塔（飞檐斗拱之"T" + 弧门壁垒之"D"）进行图形化展现与铭刻；
 * 3. 字体与框重铸：古风匾额卷轴框、虎符金印征战令、四角回纹功能名片卡；
 * 4. 丰富水墨意境：苍松迎客、远山烽燧、流岚云气、落英流风、孤舟蓑笠与五行灵气流转。
 */
export default class TitleScene extends Phaser.Scene {
  private isTransitioning: boolean = false
  private animTweens: Phaser.Tweens.Tween[] = []

  constructor() {
    super({ key: 'TitleScene' })
  }

  /**
   * 场景初始化
   */
  init(): void {
    this.isTransitioning = false
    this.animTweens = []
    if (this.input) this.input.enabled = true
    console.log('TitleScene: 进入主菜单（全新古风重铸版）')
  }

  /**
   * 创建场景内容
   */
  create(): void {
    SoundFX.unlock()

    this.events.once('shutdown', () => {
      this.clearAllTweens()
      this.isTransitioning = false
    })

    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 1. 宣纸底色与微墨晕
    drawPaperBackground(this)

    // 2. 绘制多层水墨山水背景（远峰、烽火台、苍松、孤舟、水纹、归雁、流岚云雾）
    this.drawLandscapeAtmosphere(width, height)

    // 3. 落英粒子效果（微风拂落水墨飞英）
    this.createFallingPetals(width, height)

    // 4. 创建中央主标题华章（古典匾额框 + "三国"巨墨书法 + "五行"古典朱印 + "TD"古塔意象 + 阵策对联）
    this.createMasterTitle(width)

    // 5. 创建主作战指令（出师征战 · 虎符金边令台）
    this.createHeroBattleButton(width)

    // 6. 创建功能名片矩阵（2×2 古风回纹功能框：武将、装备、锦囊、无尽）
    this.createFeatureGrid(width)

    // 7. 创建底栏密阁（军机密档 · 存续密录）与版本题跋
    this.createFooterControls(width)

    // 8. 边缘五行灵气流转
    this.createWuxingRunes(width)
  }

  // ==================== 1. 背景与水墨意境 ====================

  /**
   * 绘制写意水墨山水与动态意境
   */
  private drawLandscapeAtmosphere(width: number, height: number): void {
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

    // 1. 极远层：淡墨重峦 (alpha 0.04)
    drawMountain([
      [0, height - 210],
      [width * 0.12, height - 270],
      [width * 0.22, height - 350],
      [width * 0.35, height - 230],
      [width * 0.48, height - 290],
      [width * 0.62, height - 340],
      [width * 0.76, height - 250],
      [width * 0.88, height - 320],
      [width, height - 230]
    ], 0.04)

    // 2. 次远层：青墨秀峰 (alpha 0.08)
    drawMountain([
      [0, height - 160],
      [width * 0.14, height - 240],
      [width * 0.26, height - 170],
      [width * 0.38, height - 230],
      [width * 0.52, height - 150],
      [width * 0.68, height - 220],
      [width * 0.82, height - 140],
      [width, height - 170]
    ], 0.08)

    // 3. 远山右侧山巅：古烽火台剪影与淡墨狼烟
    this.drawDistantBeaconTower(g, width * 0.82, height - 140)

    // 4. 近景矮坡与汀渚 (alpha 0.12)
    drawMountain([
      [0, height - 75],
      [width * 0.18, height - 110],
      [width * 0.32, height - 65],
      [width * 0.65, height - 95],
      [width * 0.85, height - 60],
      [width, height - 85]
    ], 0.12)

    // 5. 沧浪水纹线
    g.lineStyle(1, InkColor.ink, 0.10)
    for (let i = 0; i < 5; i++) {
      const lineY = height - 52 + i * 9
      const startX = (i % 2 === 0 ? 60 : 260) + i * 45
      g.beginPath()
      g.moveTo(startX, lineY)
      g.lineTo(startX + 220 + i * 50, lineY)
      g.strokePath()
    }

    // 6. 左上角空谷幽松（水墨古松苍劲枝桠，自然框景）
    this.drawPineBranch(g, 0, 70)

    // 7. 江心孤舟蓑笠翁（小舟徐徐微荡）
    this.drawLonelyBoat(width * 0.22, height - 42)

    // 8. 远天归雁剪影
    this.createFlyingBirds(width * 0.78, 95, 1)
    this.createFlyingBirds(width * 0.84, 75, 0.8)
    this.createFlyingBirds(width * 0.89, 110, 0.65)

    // 9. 动态水墨烟岚浮云（横贯山间的流动水墨云气）
    this.createDriftingMist(width, height)
  }

  /**
   * 绘制远山烽燧台与一缕淡烟
   */
  private drawDistantBeaconTower(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    // 烽火台石身
    g.fillStyle(InkColor.ink, 0.22)
    g.fillRect(x - 9, y - 18, 18, 18)
    // 垛口
    g.fillRect(x - 9, y - 22, 4, 4)
    g.fillRect(x - 2, y - 22, 4, 4)
    g.fillRect(x + 5, y - 22, 4, 4)

    // 淡墨狼烟细纹
    g.lineStyle(1.2, InkColor.ink, 0.10)
    g.beginPath()
    g.moveTo(x, y - 22)
    g.lineTo(x + 3, y - 36)
    g.lineTo(x - 2, y - 52)
    g.lineTo(x + 5, y - 68)
    g.strokePath()
  }

  /**
   * 绘制水墨古松苍劲枝干与松针簇
   */
  private drawPineBranch(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.lineStyle(3.5, InkColor.ink, 0.25)
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + 50, y + 25)
    g.lineTo(x + 110, y + 20)
    g.lineTo(x + 175, y + 45)
    g.strokePath()

    // 次级枝干
    g.lineStyle(2, InkColor.ink, 0.2)
    g.beginPath()
    g.moveTo(x + 90, y + 22)
    g.lineTo(x + 130, y + 60)
    g.moveTo(x + 140, y + 30)
    g.lineTo(x + 170, y + 15)
    g.strokePath()

    // 松针簇（墨团与针纹）
    const clusters = [
      { cx: x + 110, cy: y + 16, r: 10 },
      { cx: x + 145, cy: y + 26, r: 12 },
      { cx: x + 175, cy: y + 42, r: 11 },
      { cx: x + 130, cy: y + 58, r: 9 },
      { cx: x + 172, cy: y + 13, r: 8 }
    ]

    for (const c of clusters) {
      g.fillStyle(InkColor.ink, 0.18)
      g.fillCircle(c.cx, c.cy, c.r)
      // 几根辐射松针
      g.lineStyle(1, InkColor.ink, 0.25)
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        g.lineBetween(
          c.cx,
          c.cy,
          c.cx + Math.cos(angle) * (c.r + 4),
          c.cy + Math.sin(angle) * (c.r + 4)
        )
      }
    }
  }

  /**
   * 绘制江心小舟与垂钓蓑笠翁（带轻微摇荡动效）
   */
  private drawLonelyBoat(x: number, y: number): void {
    const boat = this.add.container(x, y)
    boat.setDepth(2)

    const bg = this.add.graphics()
    // 弧形木舟
    bg.fillStyle(InkColor.ink, 0.35)
    bg.beginPath()
    bg.moveTo(-18, 0)
    bg.lineTo(18, 0)
    bg.lineTo(12, 5)
    bg.lineTo(-14, 5)
    bg.closePath()
    bg.fillPath()

    // 蓑笠翁坐像（圆头戴斗笠）
    bg.fillStyle(InkColor.ink, 0.4)
    // 斗笠
    bg.beginPath()
    bg.moveTo(-5, -6)
    bg.lineTo(5, -6)
    bg.lineTo(0, -9)
    bg.closePath()
    bg.fillPath()
    // 身体
    bg.fillCircle(0, -3, 3)

    // 细竹钓竿
    bg.lineStyle(1, InkColor.ink, 0.3)
    bg.lineBetween(2, -4, 15, -12)

    boat.add(bg)

    // 水波轻晃动画
    const tw = this.tweens.add({
      targets: boat,
      y: y + 3,
      angle: 2,
      duration: 2800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    this.animTweens.push(tw)
  }

  /**
   * 绘制单组翱翔水墨归雁
   */
  private createFlyingBirds(x: number, y: number, scale: number = 1): void {
    const bird = this.add.graphics({ x, y })
    bird.setDepth(2)
    bird.lineStyle(1.6 * scale, InkColor.ink, 0.35)

    bird.beginPath()
    bird.moveTo(-11 * scale, 3 * scale)
    bird.lineTo(-5 * scale, -4 * scale)
    bird.lineTo(0, 0)
    bird.lineTo(5 * scale, -4 * scale)
    bird.lineTo(11 * scale, 3 * scale)
    bird.strokePath()

    const tw = this.tweens.add({
      targets: bird,
      y: y - 8 * scale,
      x: x - 14 * scale,
      duration: 3600 + Math.random() * 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    this.animTweens.push(tw)
  }

  /**
   * 动态水墨烟岚流动效果
   */
  private createDriftingMist(width: number, height: number): void {
    const mistConfigs = [
      { y: height - 190, w: 320, h: 28, alpha: 0.05, speed: 18000, dx: 60 },
      { y: height - 130, w: 420, h: 34, alpha: 0.06, speed: 22000, dx: -70 },
      { y: height - 85,  w: 280, h: 24, alpha: 0.04, speed: 16000, dx: 50 }
    ]

    mistConfigs.forEach((cfg, idx) => {
      const mist = this.add.graphics()
      mist.setDepth(2)
      mist.fillStyle(InkColor.ink, cfg.alpha)
      const cx = (idx * 340 + 120) % width
      mist.fillEllipse(cx, cfg.y, cfg.w, cfg.h)

      const tw = this.tweens.add({
        targets: mist,
        x: cfg.dx,
        alpha: { from: cfg.alpha, to: cfg.alpha * 1.5 },
        duration: cfg.speed,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      })
      this.animTweens.push(tw)
    })
  }

  /**
   * 落英流水氛围（水墨飞花随风掠过）
   */
  private createFallingPetals(width: number, height: number): void {
    const petalCount = 12
    for (let i = 0; i < petalCount; i++) {
      const petal = this.add.graphics()
      petal.setDepth(3)

      const isCinnabar = Math.random() < 0.35
      const color = isCinnabar ? InkColor.cinnabar : InkColor.ink
      const alpha = isCinnabar ? 0.35 : 0.25

      petal.fillStyle(color, alpha)
      petal.beginPath()
      // 花瓣椭圆尖角
      petal.fillEllipse(0, 0, 5, 2.5)

      const startX = Math.random() * width
      const startY = Math.random() * height
      petal.setPosition(startX, startY)
      petal.setRotation(Math.random() * Math.PI)

      const duration = 9000 + Math.random() * 6000
      const tw = this.tweens.add({
        targets: petal,
        x: startX + 180 + Math.random() * 120,
        y: startY + 140 + Math.random() * 80,
        rotation: petal.rotation + Math.PI * 1.5,
        alpha: { from: alpha, to: 0.05 },
        duration,
        ease: 'Linear',
        repeat: -1,
        delay: Math.random() * 5000,
        onRepeat: () => {
          petal.setPosition(Math.random() * width * 0.8, -10 + Math.random() * (height * 0.4))
          petal.setAlpha(alpha)
        }
      })
      this.animTweens.push(tw)
    }
  }

  // ==================== 2. 主标题华章重铸 ====================

  /**
   * 创建中央主标题华章
   * 包含：
   * 1. 古风匾额外框（四角回纹 + 双墨线 + 宣纸微晕衬底）
   * 2. "三国" 巨榜楷体大字（深邃浓墨 + 立体水墨微晕）
   * 3. 独立朱砂印章："五行"（白文阴刻、双重朱印方框、微倾古朴盖印质感）
   * 4. "TD" 古建战塔（飞檐斗拱之"T" + 烽火拱门之"D" + 塔刹灵珠）
   * 5. 铭文对联底幅（「 乾坤五行 · 阵破千军 · 奇策定鼎 」）
   */
  private createMasterTitle(width: number): void {
    const centerX = width / 2
    const plaqueY = 135
    const plaqueW = 710
    const plaqueH = 175

    const titleGroup = this.add.container(centerX, plaqueY)
    titleGroup.setDepth(10)

    // A. 古风匾额画幅衬底与双框
    const plaqueG = this.add.graphics()
    // 宣纸半透底面板
    plaqueG.fillStyle(InkColor.paperPanel, 0.65)
    plaqueG.fillRoundedRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 6)

    // 外粗内细古典双线墨框
    plaqueG.lineStyle(1.8, InkColor.ink, 0.75)
    plaqueG.strokeRoundedRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 6)

    plaqueG.lineStyle(1, InkColor.inkFaint, 0.45)
    plaqueG.strokeRoundedRect(-plaqueW / 2 + 5, -plaqueH / 2 + 5, plaqueW - 10, plaqueH - 10, 4)

    // 四角回纹纹饰
    this.drawCornerBrackets(plaqueG, -plaqueW / 2 + 5, -plaqueH / 2 + 5, plaqueW - 10, plaqueH - 10, 10)

    // 匾额上下中轴铜钉
    plaqueG.fillStyle(InkColor.cinnabar, 0.75)
    plaqueG.fillRect(-4, -plaqueH / 2 - 2, 8, 4)
    plaqueG.fillRect(-4, plaqueH / 2 - 2, 8, 4)

    titleGroup.add(plaqueG)

    // B. "三国" 巨榜大字（位于中心左侧）
    const sangokuX = -135
    const sangokuY = -12

    // 墨影层（营造宣纸吃墨浸染的立体苍劲质感）
    const shadowText = this.add.text(sangokuX + 2, sangokuY + 2, '三国', {
      fontFamily: INK_FONT,
      fontSize: '66px',
      color: '#655e52',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5)
    shadowText.setAlpha(0.35)

    // 主墨字
    const mainText = this.add.text(sangokuX, sangokuY, '三国', {
      fontFamily: INK_FONT,
      fontSize: '66px',
      color: InkText.strong,
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5)

    titleGroup.add([shadowText, mainText])

    // C. 剥离出的"五行"古典朱砂印章（置于"三国"右上侧，如文人画引首章）
    const sealX = -58
    const sealY = -48
    const wuxingSeal = this.createClassicalSeal(sealX, sealY, '五', '行')
    titleGroup.add(wuxingSeal)

    // D. "TD" 以古代战塔形式呈现（位于中心右侧）
    const towerX = 135
    const towerY = -10
    const tdTower = this.createTDPagodaTower(towerX, towerY)
    titleGroup.add(tdTower)

    // E. 铭文对联底幅（阵破千军）
    const ruleY = plaqueH / 2 - 26
    const bannerG = this.add.graphics()
    // 左右细墨分界线
    bannerG.lineStyle(1, InkColor.ink, 0.25)
    bannerG.lineBetween(-plaqueW / 2 + 30, ruleY, -140, ruleY)
    bannerG.lineBetween(140, ruleY, plaqueW / 2 - 30, ruleY)
    // 墨线两端朱红小印记
    bannerG.fillStyle(InkColor.cinnabar, 0.8)
    bannerG.fillRect(-144, ruleY - 3, 6, 6)
    bannerG.fillRect(138, ruleY - 3, 6, 6)
    titleGroup.add(bannerG)

    const mottoText = inkText(this, 0, ruleY, '「 乾坤五行 · 阵破千军 · 奇策定鼎 」', {
      size: 14,
      color: InkText.wash,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    titleGroup.add(mottoText)

    // 匾额整体极微弱的庄严呼吸感
    const tw = this.tweens.add({
      targets: titleGroup,
      y: plaqueY - 3,
      duration: 3200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    this.animTweens.push(tw)
  }

  /**
   * 创建古典朱砂印章（白文阴刻 · 篆刻崩角质感）
   */
  private createClassicalSeal(x: number, y: number, charTop: string, charBottom: string): Phaser.GameObjects.Container {
    const seal = this.add.container(x, y)
    const w = 42
    const h = 62

    const sg = this.add.graphics()

    // 1. 印泥下渗微晕（宣纸透印阴影）
    sg.fillStyle(InkColor.cinnabar, 0.16)
    sg.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w, h, 4)

    // 2. 朱砂红印基底
    sg.fillStyle(InkColor.cinnabar, 0.94)
    sg.fillRoundedRect(-w / 2, -h / 2, w, h, 3)

    // 3. 古典双线印框（外实线、内细虚边，带微小篆刻残角留白）
    sg.lineStyle(1.4, 0x6e1d18, 0.9)
    sg.strokeRoundedRect(-w / 2, -h / 2, w, h, 3)

    sg.lineStyle(1, 0xf6f0e4, 0.65)
    sg.strokeRect(-w / 2 + 3.5, -h / 2 + 3.5, w - 7, h - 7)

    // 4. 金石崩角瑕疵刻痕（模仿手工篆刻刀锋残缺）
    sg.lineStyle(1.5, InkColor.paperPanel, 0.9)
    sg.lineBetween(-w / 2 + 1, -h / 2 + 7, -w / 2 + 4, -h / 2 + 7)
    sg.lineBetween(w / 2 - 4, h / 2 - 5, w / 2 - 1, h / 2 - 5)

    seal.add(sg)

    // 5. 印中文字：白文/阴刻排布（宣纸色字芯）
    const textTop = this.add.text(0, -14, charTop, {
      fontFamily: INK_FONT,
      fontSize: '19px',
      color: '#f8f4ea',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5)

    const textBottom = this.add.text(0, 14, charBottom, {
      fontFamily: INK_FONT,
      fontSize: '19px',
      color: '#f8f4ea',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5)

    seal.add([textTop, textBottom])

    // 古典印章稍带自然落印的微小倾角 (-4度)，彰显手钤韵味
    seal.setAngle(-4)

    // 交互：鼠标悬停微浮升，点击落印清脆响声
    seal.setSize(w, h)
    seal.setInteractive({ useHandCursor: true })
    seal.on('pointerover', () => {
      this.tweens.add({
        targets: seal,
        scaleX: 1.08,
        scaleY: 1.08,
        angle: -2,
        duration: 180,
        ease: 'Sine.easeOut'
      })
    })
    seal.on('pointerout', () => {
      this.tweens.add({
        targets: seal,
        scaleX: 1,
        scaleY: 1,
        angle: -4,
        duration: 200,
        ease: 'Sine.easeOut'
      })
    })
    seal.on('pointerdown', () => {
      SoundFX.stamp(0.4)
    })

    return seal
  }

  /**
   * 创建"TD"古建战塔（Tower Defense 塔防之塔形视觉核心）
   * 结构设计：
   * 1. 飞檐翼角宝顶形成 "T" 型天际横梁与中轴刹柱；
   * 2. 楼阁右壁拱弧与左侧直立城堞形成 "D" 型坚固壁垒；
   * 3. 塔身中段金石镌刻 "TD" 战塔纹章；
   * 4. 塔底汉白玉石阶基座与挂檐铜风铎；
   * 5. 顶端五行灵魄宝珠散发恒久光芒。
   */
  private createTDPagodaTower(x: number, y: number): Phaser.GameObjects.Container {
    const tower = this.add.container(x, y)
    const tg = this.add.graphics()

    // ----------------- 1. 下层台基与须弥座 -----------------
    // 石台基层
    tg.fillStyle(InkColor.inkWash, 0.85)
    tg.fillRect(-38, 48, 76, 7)
    // 叠涩台阶
    tg.fillStyle(InkColor.paperDeep, 1)
    tg.fillRect(-32, 42, 64, 6)
    tg.lineStyle(1, InkColor.ink, 0.7)
    tg.strokeRect(-32, 42, 64, 6)

    // ----------------- 2. 中下层城堞拱门（D 型壁垒） -----------------
    // 左壁直立（D 的垂直主干线）: x = -26
    // 右壁外挑形成丰满的拱弧曲壁（D 的饱满半圆腹部）
    const dArchPoints: [number, number][] = [
      [-26, 6],
      [4, 6],
      [18, 9],
      [27, 15],
      [33, 24],
      [28, 33],
      [18, 39],
      [4, 42],
      [-26, 42]
    ]

    tg.fillStyle(InkColor.inkStrong, 0.95)
    tg.beginPath()
    tg.moveTo(dArchPoints[0][0], dArchPoints[0][1])
    for (let i = 1; i < dArchPoints.length; i++) {
      tg.lineTo(dArchPoints[i][0], dArchPoints[i][1])
    }
    tg.closePath()
    tg.fillPath()

    // D 型壁垒边框
    tg.lineStyle(1.8, InkColor.ink, 1)
    tg.strokePath()

    // 拱门内部空间（券门洞开，内有军火微光）
    const doorPoints: [number, number][] = [
      [-10, 42],
      [-10, 24],
      [-7, 18],
      [1, 16],
      [9, 18],
      [12, 24],
      [12, 42]
    ]
    tg.fillStyle(InkColor.paperPanel, 0.9)
    tg.beginPath()
    tg.moveTo(doorPoints[0][0], doorPoints[0][1])
    for (let i = 1; i < doorPoints.length; i++) {
      tg.lineTo(doorPoints[i][0], doorPoints[i][1])
    }
    tg.closePath()
    tg.fillPath()
    tg.lineStyle(1, InkColor.ink, 0.8)
    tg.strokePath()

    // 门内幽幽火光（朱砂暖光）
    tg.fillStyle(InkColor.cinnabar, 0.75)
    tg.fillCircle(1, 28, 4)

    // ----------------- 3. 楼阁中层腰檐平座与 "TD" 镌金铭纹 -----------------
    // 腰檐
    tg.fillStyle(InkColor.paperDeep, 1)
    tg.fillRect(-34, -4, 68, 8)
    tg.lineStyle(1.2, InkColor.ink, 0.9)
    tg.strokeRect(-34, -4, 68, 8)

    // 斗拱节点
    tg.fillStyle(InkColor.ink, 0.8)
    tg.fillRect(-24, -1, 6, 4)
    tg.fillRect(-3, -1, 6, 4)
    tg.fillRect(18, -1, 6, 4)

    // ----------------- 4. 顶层飞檐横挑与塔刹（T 型横梁与中柱） -----------------
    // 飞檐主梁（T 的上方宽厚横梁）
    const eavePoints: [number, number][] = [
      [-52, -26],
      [-36, -21],
      [-18, -19],
      [0, -20],
      [18, -19],
      [36, -21],
      [52, -26],
      [46, -12],
      [22, -10],
      [0, -11],
      [-22, -10],
      [-46, -12]
    ]
    tg.fillStyle(InkColor.inkStrong, 1)
    tg.beginPath()
    tg.moveTo(eavePoints[0][0], eavePoints[0][1])
    for (let i = 1; i < eavePoints.length; i++) {
      tg.lineTo(eavePoints[i][0], eavePoints[i][1])
    }
    tg.closePath()
    tg.fillPath()

    // 飞檐瓦楞描边
    tg.lineStyle(1.6, InkColor.ink, 1)
    tg.strokePath()

    // 左右挑檐檐角风铎（铜铃悬挂）
    tg.lineStyle(1, InkColor.ink, 0.6)
    tg.lineBetween(-48, -16, -48, -8)
    tg.lineBetween(48, -16, 48, -8)
    tg.fillStyle(0xa0782f, 0.9)
    tg.fillCircle(-48, -7, 2.5)
    tg.fillCircle(48, -7, 2.5)

    // 刹杆塔柱（T 的中央垂直挺拔柱身）
    tg.lineStyle(3, InkColor.inkStrong, 1)
    tg.lineBetween(0, -48, 0, -18)

    // 铜刹相轮环（五重紧密铜盘）
    tg.lineStyle(1.5, 0xa0782f, 0.95)
    tg.lineBetween(-6, -42, 6, -42)
    tg.lineBetween(-8, -38, 8, -38)
    tg.lineBetween(-10, -34, 10, -34)

    // 顶端灵珠（宝顶灵魄珠）
    tg.fillStyle(0xa0782f, 0.9)
    tg.fillCircle(0, -50, 4.5)
    tg.fillStyle(0xfff6cf, 0.95)
    tg.fillCircle(-1, -51, 1.8)

    tower.add(tg)

    // ----------------- 5. 战塔铭额：醒目艺术化 "TD" -----------------
    // 在腰檐上方与飞檐下方，嵌入金石篆刻字样 "TD"
    const tdText = this.add.text(0, -8, 'TD', {
      fontFamily: INK_FONT,
      fontSize: '18px',
      color: '#a0782f',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5)

    // 塔防注音小刻石
    const subDesc = this.add.text(0, 58, '【 战 塔 】', {
      fontFamily: INK_FONT,
      fontSize: '11px',
      color: InkText.faint
    }).setOrigin(0.5, 0.5)

    tower.add([tdText, subDesc])

    // 塔顶灵珠呼吸灵光效果
    const haloG = this.add.graphics()
    haloG.fillStyle(0xa0782f, 0.22)
    haloG.fillCircle(0, -50, 11)
    tower.add(haloG)
    tower.sendToBack(haloG)

    const tw = this.tweens.add({
      targets: haloG,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: { from: 0.15, to: 0.4 },
      duration: 1800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    this.animTweens.push(tw)

    // 鼠标交互：悬停时战塔灵气上扬，点击发出弓弦或金鸣声
    tower.setSize(90, 130)
    tower.setInteractive({ useHandCursor: true })
    tower.on('pointerover', () => {
      this.tweens.add({
        targets: tower,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 160,
        ease: 'Sine.easeOut'
      })
    })
    tower.on('pointerout', () => {
      this.tweens.add({
        targets: tower,
        scaleX: 1,
        scaleY: 1,
        duration: 180,
        ease: 'Sine.easeOut'
      })
    })
    tower.on('pointerdown', () => {
      SoundFX.bowSnap(0.35)
    })

    return tower
  }

  // ==================== 3. 主出征按钮与功能卡矩阵 ====================

  /**
   * 创建主出征指令按钮（虎符金印令台 · 帅府核心入口）
   */
  private createHeroBattleButton(width: number): void {
    const btnX = width / 2
    const btnY = 278
    const btnW = 340
    const btnH = 58

    const container = this.add.container(btnX, btnY)
    container.setDepth(10)

    const bg = this.add.graphics()
    const drawBtnBg = (hover: boolean) => {
      bg.clear()
      const fillColor = hover ? 0xb53a32 : InkColor.cinnabar
      const strokeColor = hover ? 0xd4af37 : 0xa0782f

      // 虎符令基底
      bg.fillStyle(fillColor, 1)
      bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6)

      // 金边外双线框
      bg.lineStyle(2, strokeColor, 1)
      bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6)

      // 内衬金纹线
      bg.lineStyle(1, 0xdfd4bc, hover ? 0.75 : 0.45)
      bg.strokeRoundedRect(-btnW / 2 + 4, -btnH / 2 + 4, btnW - 8, btnH - 8, 4)

      // 四角祥云小抱角
      this.drawCornerBrackets(bg, -btnW / 2 + 4, -btnH / 2 + 4, btnW - 8, btnH - 8, 8, strokeColor)

      // 左右对称军令小铆钉
      bg.fillStyle(strokeColor, 0.9)
      bg.fillCircle(-btnW / 2 + 14, 0, 3)
      bg.fillCircle(btnW / 2 - 14, 0, 3)
    }

    drawBtnBg(false)
    container.add(bg)

    // 文字：主字 + 副标题
    const mainTitle = inkText(this, 0, -6, '◆  出 师 征 战  ◆', {
      size: 23,
      color: '#fdfbf7',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    const subTitle = inkText(this, 0, 15, '· 五大古战场 · 15波决战无缝北伐 ·', {
      size: 11,
      color: '#e8dbbe',
      bold: false,
      originX: 0.5,
      originY: 0.5
    })

    container.add([mainTitle, subTitle])

    // 交互行为
    container.setSize(btnW, btnH)
    container.setInteractive({ useHandCursor: true })

    container.on('pointerover', () => {
      drawBtnBg(true)
      this.tweens.add({
        targets: container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 140,
        ease: 'Sine.easeOut'
      })
      SoundFX.whoosh(0.18)
    })

    container.on('pointerout', () => {
      drawBtnBg(false)
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 160,
        ease: 'Sine.easeOut'
      })
    })

    container.on('pointerdown', () => {
      SoundFX.gong(0.4)
      SoundFX.stamp(0.6)
      this.onStartGame()
    })

    // 金光外圈微幅律动
    const pulseG = this.add.graphics()
    pulseG.lineStyle(1.5, 0xa0782f, 0.35)
    pulseG.strokeRoundedRect(-btnW / 2 - 2, -btnH / 2 - 2, btnW + 4, btnH + 4, 8)
    container.add(pulseG)
    container.sendToBack(pulseG)

    const tw = this.tweens.add({
      targets: pulseG,
      alpha: { from: 0.2, to: 0.65 },
      scaleX: 1.015,
      scaleY: 1.025,
      duration: 1900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
    this.animTweens.push(tw)
  }

  /**
   * 创建 2×2 功能名片矩阵
   * [ 聚贤武将 ]  [ 神兵灵石 ]
   * [ 水墨博物志 ] [ 无尽北伐 ]
   */
  private createFeatureGrid(width: number): void {
    const colSpacing = 270
    const rowSpacing = 68
    const leftColX = width / 2 - colSpacing / 2
    const rightColX = width / 2 + colSpacing / 2

    const row1Y = 360
    const row2Y = row1Y + rowSpacing

    // 1. 武将
    this.createClassicalFeatureCard(
      leftColX,
      row1Y,
      '将',
      '聚贤武将',
      '将星命盘 · 传记试炼',
      InkColor.cinnabar,
      () => this.transitionTo('HeroListScene')
    )

    // 2. 装备
    this.createClassicalFeatureCard(
      rightColX,
      row1Y,
      '兵',
      '神兵灵石',
      '蒲元铸剑 · 灵砂淬炼',
      InkColor.cinnabar,
      () => this.transitionTo('EquipmentScene')
    )

    // 3. 水墨博物志（名将录/神兵谱/灵石鉴/锦囊）
    this.createClassicalFeatureCard(
      leftColX,
      row2Y,
      '志',
      '水墨博物志',
      '名将录 · 神兵谱 · 灵石鉴',
      0x4a5f6d,
      () => this.transitionTo('AugmentCompendiumScene')
    )

    // 4. 无尽北伐（展示最高波次记录）
    const currentWave = SaveManager.getInstance().getEndlessCurrentWave()
    const record = SaveManager.getInstance().getEndlessRecord()
    const displayWave = currentWave > 1 ? currentWave : (record && record.highestWave > 0 ? record.highestWave : 0)
    const endlessTitle = displayWave > 0 ? `北伐第${displayWave}阵` : '乘胜北伐'

    this.createClassicalFeatureCard(
      rightColX,
      row2Y,
      '伐',
      endlessTitle,
      '无尽烽火 · 极品灵石',
      0x8a6230,
      () => this.transitionToBattle('level_endless_tower', currentWave)
    )
  }

  /**
   * 创建单枚典雅古风名片框（双层墨线、回纹抱角、印章徽标、楷书双行）
   */
  private createClassicalFeatureCard(
    x: number,
    y: number,
    badgeChar: string,
    title: string,
    desc: string,
    badgeColor: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const cardW = 250
    const cardH = 56
    const container = this.add.container(x, y)
    container.setDepth(10)

    const bg = this.add.graphics()
    const renderCard = (hover: boolean) => {
      bg.clear()
      const fillColor = hover ? InkColor.paperDeep : InkColor.paperPanel
      const strokeColor = hover ? InkColor.cinnabar : InkColor.ink

      // 底板
      bg.fillStyle(fillColor, 0.95)
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 4)

      // 外线
      bg.lineStyle(hover ? 1.6 : 1.2, strokeColor, 0.85)
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 4)

      // 内线
      bg.lineStyle(1, InkColor.inkFaint, hover ? 0.6 : 0.3)
      bg.strokeRoundedRect(-cardW / 2 + 3, -cardH / 2 + 3, cardW - 6, cardH - 6, 3)

      // 四角折角装饰
      this.drawCornerBrackets(bg, -cardW / 2 + 3, -cardH / 2 + 3, cardW - 6, cardH - 6, 6, strokeColor)

      // 左侧印章徽标小底块
      const badgeX = -cardW / 2 + 24
      bg.fillStyle(badgeColor, hover ? 1 : 0.88)
      bg.fillRoundedRect(badgeX - 13, -13, 26, 26, 3)
      bg.lineStyle(1, 0xf6f0e4, 0.6)
      bg.strokeRoundedRect(badgeX - 11, -11, 22, 22, 2)
    }

    renderCard(false)
    container.add(bg)

    // 左侧徽标文字
    const badgeText = this.add.text(-cardW / 2 + 24, 0, badgeChar, {
      fontFamily: INK_FONT,
      fontSize: '15px',
      color: '#fbf8f0',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5)

    // 主标题与副标题
    const titleText = this.add.text(-cardW / 2 + 48, -7, title, {
      fontFamily: INK_FONT,
      fontSize: '17px',
      color: InkText.strong,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5)

    const descText = this.add.text(-cardW / 2 + 49, 13, desc, {
      fontFamily: INK_FONT,
      fontSize: '11px',
      color: InkText.faint
    }).setOrigin(0, 0.5)

    container.add([badgeText, titleText, descText])

    // 交互行为
    container.setSize(cardW, cardH)
    container.setInteractive({ useHandCursor: true })

    container.on('pointerover', () => {
      renderCard(true)
      titleText.setColor(InkText.cinnabar)
      this.tweens.add({
        targets: container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 140,
        ease: 'Sine.easeOut'
      })
      SoundFX.bowSnap(0.2)
    })

    container.on('pointerout', () => {
      renderCard(false)
      titleText.setColor(InkText.strong)
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 160,
        ease: 'Sine.easeOut'
      })
    })

    container.on('pointerdown', () => {
      SoundFX.stamp(0.45)
      onClick()
    })

    return container
  }

  // ==================== 4. 底栏与辅助控制 ====================

  /**
   * 创建底栏控制器（军机密档 · 载录千秋 与版本题款）
   */
  private createFooterControls(width: number): void {
    const centerX = width / 2
    const saveY = 496
    const saveW = 280
    const saveH = 36

    const saveContainer = this.add.container(centerX, saveY)
    saveContainer.setDepth(10)

    const bg = this.add.graphics()
    const renderSave = (hover: boolean) => {
      bg.clear()
      // 古卷轴扁平条
      bg.fillStyle(hover ? InkColor.paperDeep : InkColor.paperPanel, 0.85)
      bg.fillRoundedRect(-saveW / 2, -saveH / 2, saveW, saveH, 4)

      bg.lineStyle(1, hover ? InkColor.cinnabar : InkColor.ink, hover ? 0.8 : 0.4)
      bg.strokeRoundedRect(-saveW / 2, -saveH / 2, saveW, saveH, 4)

      // 卷轴两头木轴小凸起
      bg.fillStyle(InkColor.inkWash, 0.6)
      bg.fillRect(-saveW / 2 - 3, -saveH / 2 + 4, 3, saveH - 8)
      bg.fillRect(saveW / 2, -saveH / 2 + 4, 3, saveH - 8)
    }

    renderSave(false)
    saveContainer.add(bg)

    const label = inkText(this, 0, 0, '军机档阁 · 载录千秋  [ 存 档 ]', {
      size: 14,
      color: InkText.wash,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    saveContainer.add(label)

    saveContainer.setSize(saveW, saveH)
    saveContainer.setInteractive({ useHandCursor: true })
    saveContainer.on('pointerover', () => {
      renderSave(true)
      label.setColor(InkText.cinnabar)
      SoundFX.bowSnap(0.15)
    })
    saveContainer.on('pointerout', () => {
      renderSave(false)
      label.setColor(InkText.wash)
    })
    saveContainer.on('pointerdown', () => {
      SoundFX.stamp(0.4)
      this.transitionTo('SaveScene')
    })

    // 最底部版权与水墨题款小注
    const footNote = inkText(this, centerX, 686, '水墨宣纸 · 五行连携 · 肉鸽策略塔防', {
      size: 12,
      color: InkText.faint,
      originX: 0.5,
      originY: 0.5
    })
    footNote.setAlpha(0.65)
    footNote.setDepth(10)
  }

  // ==================== 5. 边际五行灵气流转 ====================

  /**
   * 边缘五行神韵节点（金木水火土五枚意境字符，带微幅呼吸流光）
   */
  private createWuxingRunes(width: number): void {
    const atmosphericSpots: { wx: WuXing; x: number; y: number }[] = [
      { wx: 'metal', x: width * 0.12, y: 155 },
      { wx: 'wood',  x: width * 0.13, y: 510 },
      { wx: 'water', x: width * 0.28, y: 645 },
      { wx: 'fire',  x: width * 0.87, y: 520 },
      { wx: 'earth', x: width * 0.88, y: 165 }
    ]

    for (const spot of atmosphericSpots) {
      const style = INK_WUXING[spot.wx]
      const node = this.add.container(spot.x, spot.y)
      node.setDepth(3)

      const ring = this.add.graphics()
      ring.lineStyle(1, style.border, 0.4)
      ring.strokeCircle(0, 0, 18)
      ring.lineStyle(0.6, style.border, 0.2)
      ring.strokeCircle(0, 0, 22)

      const text = this.add.text(0, 0, style.label, {
        fontFamily: INK_FONT,
        fontSize: '20px',
        color: style.text,
        fontStyle: 'bold'
      }).setOrigin(0.5, 0.5)
      text.setAlpha(0.55)

      node.add([ring, text])

      const tw = this.tweens.add({
        targets: node,
        y: spot.y + 6,
        alpha: { from: 0.4, to: 0.85 },
        duration: 3200 + Math.random() * 1200,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      })
      this.animTweens.push(tw)
    }
  }

  // ==================== 6. 辅助工具与场景调度 ====================

  /**
   * 绘制中式古典四角回纹 / 折角抱角
   */
  private drawCornerBrackets(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    len: number,
    color: number = InkColor.ink
  ): void {
    g.lineStyle(1.2, color, 0.6)
    // 左上
    g.beginPath()
    g.moveTo(x + len, y)
    g.lineTo(x, y)
    g.lineTo(x, y + len)
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

  private clearAllTweens(): void {
    for (const tw of this.animTweens) {
      if (tw && tw.isPlaying()) {
        tw.stop()
      }
    }
    this.animTweens = []
    this.tweens.killAll()
  }

  /**
   * 安全场景跳转
   */
  private transitionTo(sceneKey: string): void {
    if (this.isTransitioning) return
    this.isTransitioning = true

    this.time.delayedCall(600, () => {
      if (this.scene.isActive()) {
        this.isTransitioning = false
        if (this.input) this.input.enabled = true
      }
    })

    this.clearAllTweens()
    try {
      this.scene.start(sceneKey)
    } catch (err) {
      console.error(`[TitleScene] 跳转场景 ${sceneKey} 发生异常:`, err)
      this.isTransitioning = false
      if (this.input) this.input.enabled = true
    }
  }

  private transitionToBattle(levelId: string, startWave?: number): void {
    if (this.isTransitioning) return
    this.isTransitioning = true
    this.clearAllTweens()
    try {
      this.scene.start('BattleScene', { levelId, startWave })
    } catch (err) {
      console.error(`[TitleScene] 启动无尽试炼 ${levelId} 异常:`, err)
      this.isTransitioning = false
      if (this.input) this.input.enabled = true
    }
  }

  private onStartGame(): void {
    console.log('TitleScene: 出师征战 -> 战役沙盘')
    this.transitionTo('LevelSelectScene')
  }
}
