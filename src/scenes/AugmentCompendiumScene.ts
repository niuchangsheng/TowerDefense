import Phaser from 'phaser'
import { Augment, StratagemCategory } from '@/types/augment'
import { AUGMENT_POOL, REPEATABLE_AUGMENTS } from '@/data/augments'
import { heroes, getHeroConfig } from '@/data/heroes'
import { AugmentManager } from '@/core/augment/AugmentManager'
import { AugmentSelectModal, getStratagemStyle } from '@/ui/AugmentSelectModal'
import { AugmentStatusModal } from '@/ui/AugmentStatusModal'
import { WuXing } from '@/types'
import {
  InkColor,
  InkText,
  INK_WUXING,
  drawPaperBackground,
  createPanel,
  inkText,
  inkRule,
  createInkButton,
  createPageBackButton,
  inkToast
} from '@/ui/InkTheme'
import { SoundFX } from '@/effects/SoundFX'

export type FilterTab =
  | 'all'
  | StratagemCategory
  | 'repeatable'
  | 'elemental'
  | 'hero'
  | 'general'
  | 'endless'

interface TabDef {
  key: FilterTab
  title: string
}

/**
 * 【天命锦囊】专页
 * 严格遵循玩家视角第一眼信息架构：
 * 1. 第一眼：谁的 / 改什么（五行/名将徽章 + 《锦囊名》 + 【四字词头】）
 * 2. 第二眼：选了有多爽（1句精炼核心效果 + 醒目数值胶囊 Tag）
 * 3. 第三眼：什么时候拿最赚（契合阵容 / 最佳天时 / 专克强敌 三格速览）
 */
export default class AugmentCompendiumScene extends Phaser.Scene {
  private allAugments: Augment[] = []
  private filteredAugments: Augment[] = []
  private currentTab: FilterTab = 'all'
  private selectedWuXingFilter: WuXing | 'all' = 'all'
  private selectedAugmentId: string | null = null

  // 模拟拆锦囊演练管理器（独立沙盒实例）
  private simAugmentManager: AugmentManager = new AugmentManager()
  private simWaveStep: number = 0

  // UI 容器与组件
  private headerContainer: Phaser.GameObjects.Container | null = null
  private bodyContainer: Phaser.GameObjects.Container | null = null
  private tabButtons: Phaser.GameObjects.Container[] = []
  private listContainer!: Phaser.GameObjects.Container
  private listScrollY = 0
  private maxScrollLimit = 0
  private cardContainers: Phaser.GameObjects.Container[] = []
  private detailContainer: Phaser.GameObjects.Container | null = null

  constructor() {
    super({ key: 'AugmentCompendiumScene' })
  }

  init(data?: { augmentId?: string; volume?: string }): void {
    this.allAugments = [...AUGMENT_POOL, ...REPEATABLE_AUGMENTS]
    this.currentTab = 'all'
    this.selectedWuXingFilter = 'all'
    this.listScrollY = 0
    this.selectedAugmentId = data?.augmentId || this.allAugments[0]?.id || null
    this.simAugmentManager.reset()
    this.simWaveStep = 0
  }

  create(): void {
    drawPaperBackground(this)

    this.renderHeader()
    this.renderStratagemBody()

    createPageBackButton(this, () => {
      try {
        this.scene.start('TitleScene')
      } catch (err) {
        console.error('Failed to return to TitleScene:', err)
      }
    })
  }

  private renderHeader(): void {
    if (this.headerContainer) {
      this.headerContainer.destroy()
    }
    this.headerContainer = this.add.container(0, 0)

    const titleObj = inkText(this, 32, 40, '天命锦囊', {
      size: 30,
      color: InkText.strong,
      bold: true
    })
    const sealRect = this.add.rectangle(32 + titleObj.width + 16, 40, 14, 14, InkColor.cinnabar)
    const subObj = inkText(this, 32 + titleObj.width + 32, 40, '· 五大策系 · 30卷三国奇谋一览', {
      size: 15,
      color: InkText.faint
    })
    const rule = inkRule(this, null, 32, 68, this.cameras.main.width - 64, 0.4)

    this.headerContainer.add([titleObj, sealRect, subObj, rule])
  }

  private renderStratagemBody(): void {
    this.tabButtons.forEach(b => b.destroy())
    this.tabButtons = []
    this.cardContainers = []
    if (this.detailContainer) {
      this.detailContainer.destroy()
      this.detailContainer = null
    }
    if (this.bodyContainer) {
      this.bodyContainer.destroy()
      this.bodyContainer = null
    }

    this.bodyContainer = this.add.container(0, 0)

    const height = this.cameras.main.height
    this.renderTabs()
    this.renderListPanel(height)
    this.renderDetailPanel()
    if (this.selectedAugmentId) {
      this.selectAugment(this.selectedAugmentId)
    }
  }

  private renderTabs(): void {
    const tabs: TabDef[] = [
      { key: 'all', title: '全部' },
      { key: '五行异变策', title: '🔥 五行异变' },
      { key: '相生连环策', title: '🔗 相生连环' },
      { key: '攻防逆转策', title: '☯️ 攻防逆转' },
      { key: '奇谋战法策', title: '⚡ 奇谋战法' },
      { key: '观星借天策', title: '🌌 观星借天' },
      { key: 'repeatable', title: '♾️ 无尽精进' }
    ]

    let tabX = 32
    const tabY = 92
    const tabGap = 8

    this.tabButtons.forEach(btn => btn.destroy())
    this.tabButtons = []

    for (const tab of tabs) {
      const isActive = this.currentTab === tab.key
      const count = this.getTabCount(tab.key)
      const label = `${tab.title} (${count})`
      const btnW = tab.key === 'all' ? 88 : 122

      const btn = createInkButton(this, tabX + btnW / 2, tabY, btnW, 30, label, {
        fill: isActive ? InkColor.cinnabar : InkColor.paperDeep,
        hoverFill: isActive ? 0xb53a32 : InkColor.paperPanel,
        textColor: isActive ? InkText.paper : InkText.ink,
        fontSize: 12,
        stroke: isActive ? 0xd4af37 : InkColor.inkFaint,
        onClick: () => {
          if (this.currentTab === tab.key) return
          SoundFX.thud(0.15)
          this.currentTab = tab.key
          this.listScrollY = 0
          this.renderTabs()
          this.filterAndRenderList()
        }
      })

      this.tabButtons.push(btn)
      tabX += btnW + tabGap
    }

    // 右侧：模拟三选一与已选构筑
    const simPickedCount = this.simAugmentManager.getActiveAugments().length

    const simDrawBtn = createInkButton(
      this,
      1092,
      tabY,
      138,
      30,
      '🎲 模拟三选一',
      {
        fill: 0x8a5a14,
        hoverFill: 0xa06b1e,
        textColor: '#fdfbf7',
        fontSize: 12,
        stroke: 0xd4af37,
        onClick: () => this.openSimulateDraftModal()
      }
    )

    const simStatusBtn = createInkButton(
      this,
      1208,
      tabY,
      80,
      30,
      `已选(${simPickedCount})`,
      {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.strong,
        fontSize: 12,
        stroke: InkColor.ink,
        onClick: () => {
          SoundFX.thud(0.2)
          new AugmentStatusModal(
            this,
            this.simAugmentManager,
            () => {
              this.renderTabs()
            },
            () => {
              this.simAugmentManager.reset()
              this.simWaveStep = 0
              this.renderTabs()
              inkToast(this, '已清空已选锦囊，可重新模拟三选一', 96)
            }
          )
        }
      }
    )

    this.tabButtons.push(simDrawBtn, simStatusBtn)
  }

  public getTabCount(tab: FilterTab): number {
    return this.allAugments.filter(a => this.matchesTab(a, tab)).length
  }

  public matchesTab(a: Augment, tab: FilterTab): boolean {
    switch (tab) {
      case 'all':
        return true
      case '五行异变策':
      case '相生连环策':
      case '攻防逆转策':
      case '奇谋战法策':
      case '观星借天策':
        return !a.repeatable && a.stratagemCategory === tab
      case 'elemental':
        return a.category === 'elemental' && !a.id.startsWith('aug_endless_') && !a.repeatable
      case 'hero':
        return a.category === 'hero'
      case 'general':
        return a.category === 'general' && !a.repeatable && !a.id.startsWith('aug_endless_')
      case 'endless':
        return a.id.startsWith('aug_endless_')
      case 'repeatable':
        return Boolean(a.repeatable)
      default:
        return true
    }
  }

  /**
   * 开启局内三选一拆锦囊模拟演练
   */
  private openSimulateDraftModal(): void {
    SoundFX.stamp(0.3)
    const simWaves = [1, 4, 7, 10, 13]
    const currentWave = simWaves[this.simWaveStep % simWaves.length]

    if (this.simAugmentManager.getActiveAugments().length >= 5 && this.simWaveStep >= 5) {
      this.simAugmentManager.reset()
      this.simWaveStep = 0
      inkToast(this, '已重置 5 次选策模拟，重新开启第 1 轮三选一', 90)
    }

    this.simAugmentManager.grantInstantStratagem()
    const deployedHeroIds = heroes.map(h => h.id)
    const deployedWuXing: WuXing[] = ['metal', 'wood', 'water', 'fire', 'earth']

    new AugmentSelectModal(
      this,
      this.simAugmentManager,
      deployedHeroIds,
      deployedWuXing,
      selected => {
        this.simWaveStep++
        this.selectAugment(selected.id)
        this.renderTabs()
        inkToast(
          this,
          `已选《${selected.name}》（Wave ${currentWave} · ${this.simAugmentManager.getActiveAugments().length}/5）`,
          96
        )
      },
      () => {
        this.renderTabs()
      }
    )
  }

  private renderListPanel(height: number): void {
    const listX = 32
    const listY = 120
    const listW = 384
    const listH = height - listY - 24

    const listPanel = createPanel(this, listX, listY, listW, listH, {
      alpha: 0.55,
      strokeWidth: 1.5
    })
    if (this.bodyContainer) this.bodyContainer.add(listPanel)

    // 列表顶部五行快速筛选栏
    const headerBar = this.add.container(listX, listY)
    const headerBg = this.add.rectangle(listW / 2, 20, listW - 4, 36, InkColor.paperDeep, 0.7)
    headerBg.setStrokeStyle(1, InkColor.inkFaint, 0.3)
    const headerLbl = inkText(this, 14, 20, '五行：', {
      size: 12,
      color: InkText.strong,
      bold: true
    })
    headerBar.add([headerBg, headerLbl])

    const wxFilters: { key: WuXing | 'all'; label: string }[] = [
      { key: 'all', label: '全部' },
      { key: 'metal', label: '金' },
      { key: 'wood', label: '木' },
      { key: 'water', label: '水' },
      { key: 'fire', label: '火' },
      { key: 'earth', label: '土' }
    ]

    let fx = 64
    for (const wf of wxFilters) {
      const isAct = this.selectedWuXingFilter === wf.key
      const wxTheme = wf.key !== 'all' ? INK_WUXING[wf.key] : null
      const pillW = wf.key === 'all' ? 48 : 42
      const pill = createInkButton(this, fx + pillW / 2, 20, pillW, 24, wf.label, {
        fill: isAct ? InkColor.cinnabar : wxTheme ? wxTheme.fill : InkColor.paperPanel,
        hoverFill: isAct ? 0xb53a32 : InkColor.paper,
        textColor: isAct ? '#ffffff' : wxTheme ? wxTheme.text : InkText.ink,
        fontSize: 11.5,
        stroke: isAct ? 0xd4af37 : wxTheme ? wxTheme.border : InkColor.inkFaint,
        onClick: () => {
          SoundFX.thud(0.15)
          this.selectedWuXingFilter = wf.key
          this.listScrollY = 0
          this.renderStratagemBody()
        }
      })
      headerBar.add(pill)
      fx += pillW + 8
    }
    if (this.bodyContainer) this.bodyContainer.add(headerBar)

    const scrollTopY = listY + 40
    const scrollViewH = listH - 42

    const maskG = this.make.graphics({ x: 0, y: 0 })
    maskG.fillRect(listX + 2, scrollTopY, listW - 4, scrollViewH)
    const mask = maskG.createGeometryMask()

    this.listContainer = this.add.container(listX, scrollTopY)
    this.listContainer.setMask(mask)
    if (this.bodyContainer) this.bodyContainer.add(this.listContainer)

    this.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
        if (this.maxScrollLimit <= 0) return
        const px = _pointer.x
        const py = _pointer.y
        if (px < listX || px > listX + listW || py < scrollTopY || py > scrollTopY + scrollViewH) return
        this.listScrollY = Phaser.Math.Clamp(this.listScrollY - dy * 0.7, -this.maxScrollLimit, 0)
        this.tweens.killTweensOf(this.listContainer)
        this.tweens.add({
          targets: this.listContainer,
          y: scrollTopY + this.listScrollY,
          duration: 120,
          ease: 'Sine.easeOut'
        })
      }
    )

    this.filterAndRenderList()
  }

  private filterAndRenderList(): void {
    this.filteredAugments = this.allAugments.filter(a => {
      if (!this.matchesTab(a, this.currentTab)) return false
      if (this.selectedWuXingFilter !== 'all') {
        return Boolean(a.wuXingRequirement && a.wuXingRequirement.includes(this.selectedWuXingFilter))
      }
      return true
    })

    this.cardContainers.forEach(c => c.destroy())
    this.cardContainers = []
    if (!this.listContainer) return
    this.listContainer.removeAll(true)

    const cardW = 364
    const cardH = 68
    const gap = 8
    const padX = 10
    const padY = 8

    let currentY = padY

    for (let i = 0; i < this.filteredAugments.length; i++) {
      const aug = this.filteredAugments[i]
      const card = this.createAugmentCard(padX, currentY, cardW, cardH, aug)
      this.listContainer.add(card)
      this.cardContainers.push(card)
      currentY += cardH + gap
    }

    const totalHeight = currentY + padY
    const viewHeight = this.cameras.main.height - 120 - 24 - 42
    this.maxScrollLimit = Math.max(0, totalHeight - viewHeight)

    if (!this.filteredAugments.some(a => a.id === this.selectedAugmentId)) {
      if (this.filteredAugments[0]) {
        this.selectAugment(this.filteredAugments[0].id)
      }
    } else if (this.selectedAugmentId) {
      this.refreshCardHighlight(this.selectedAugmentId)
    }
  }

  /**
   * 极简左栏卡片：玩家第一眼只看 3 件事
   * 1. 《锦囊名称》 + 【四字词头】
   * 2. 谁能用（武将专属 / 五行标识 / 通用）
   * 3. 1个最核心的加成亮点
   */
  private createAugmentCard(
    x: number,
    y: number,
    w: number,
    h: number,
    aug: Augment
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    const isSelected = this.selectedAugmentId === aug.id
    const style = getStratagemStyle(aug)

    // 卡片底板
    const bg = this.add.rectangle(w / 2, h / 2, w, h, isSelected ? 0xf6efe0 : style.tint, 0.96)
    bg.setStrokeStyle(isSelected ? 2.2 : 1, isSelected ? InkColor.cinnabar : style.stroke, isSelected ? 1 : 0.65)
    bg.setInteractive({ useHandCursor: true })
    container.add(bg)

    // 左侧策系印色竖条
    const colorBar = this.add.rectangle(3, h / 2, 5, h - 8, style.stroke, 0.95)
    container.add(colorBar)

    // 第一行：大字锦囊名 + 四字词头 + 右上角契合标签
    const nameTxt = inkText(this, 14, 22, `《${aug.name}》`, {
      size: 16.5,
      color: InkText.strong,
      bold: true
    })
    container.add(nameTxt)

    if (aug.mechanismTitle) {
      const shortMech = aug.mechanismTitle.replace(/·[^】]+】$/, '】')
      const mechTxt = inkText(this, 14 + nameTxt.width + 6, 22, shortMech, {
        size: 12,
        color: InkText.cinnabar,
        bold: true
      })
      container.add(mechTxt)
    }

    const affinTag = this.getShortAffinityTag(aug)
    const affinRight = inkText(this, w - 12, 22, affinTag, {
      size: 11,
      color: style.text,
      bold: true,
      originX: 1
    })
    container.add(affinRight)

    // 第二行：一句话精炼效果预览
    const oneLiner = this.getOneLineHighlight(aug)
    const subTxt = inkText(this, 16, 48, oneLiner, {
      size: 12,
      color: InkText.ink
    })
    container.add(subTxt)

    bg.on('pointerdown', () => {
      SoundFX.thud(0.2)
      this.selectAugment(aug.id)
    })

    bg.on('pointerover', () => {
      if (this.selectedAugmentId !== aug.id) {
        bg.setFillStyle(0xfaf6ec, 1)
      }
    })

    bg.on('pointerout', () => {
      if (this.selectedAugmentId !== aug.id) {
        bg.setFillStyle(style.tint, 0.96)
      }
    })

    ;(container as any).augmentId = aug.id
    ;(container as any).bg = bg

    return container
  }

  private selectAugment(id: string): void {
    this.selectedAugmentId = id
    this.refreshCardHighlight(id)
    this.renderDetailPanel()
  }

  private refreshCardHighlight(selectedId: string): void {
    for (const card of this.cardContainers) {
      const augId = (card as any).augmentId
      const bg = (card as any).bg as Phaser.GameObjects.Rectangle
      const isSelected = augId === selectedId
      const aug = this.allAugments.find(a => a.id === augId)
      if (!aug || !bg) continue

      const style = getStratagemStyle(aug)
      bg.setFillStyle(isSelected ? 0xf6efe0 : style.tint, 0.96)
      bg.setStrokeStyle(isSelected ? 2.2 : 1, isSelected ? InkColor.cinnabar : style.stroke, isSelected ? 1 : 0.65)
    }
  }

  // ==================== 右侧【玩家第一眼极简详情面板】 ====================

  private renderDetailPanel(): void {
    const detailX = 432
    const detailY = 120
    const detailW = 816
    const detailH = this.cameras.main.height - detailY - 24

    if (this.detailContainer) {
      this.detailContainer.destroy()
    }
    this.detailContainer = this.add.container(detailX, detailY)

    const panel = createPanel(this, 0, 0, detailW, detailH, {
      stroke: 0xa0782f,
      strokeWidth: 2
    })
    this.detailContainer.add(panel)

    const aug = this.allAugments.find(a => a.id === this.selectedAugmentId)
    if (!aug) {
      const emptyText = inkText(this, detailW / 2, detailH / 2, '暂未选定锦囊', {
        size: 16,
        color: InkText.faint,
        originX: 0.5,
        originY: 0.5
      })
      this.detailContainer.add(emptyText)
      return
    }

    const style = getStratagemStyle(aug)
    const contentW = detailW - 56
    const leftPad = 28

    // ==================== 1. 第一眼：大字名号 + 四字爽点词头 + 1行雅致典故 ====================
    const title = inkText(this, leftPad, 34, `《${aug.name}》`, {
      size: 32,
      color: InkText.strong,
      bold: true
    })
    this.detailContainer.add(title)

    const mechBadgeX = leftPad + title.width + 14
    const mechBadge = inkText(this, mechBadgeX, 36, aug.mechanismTitle || aug.subtitle || '', {
      size: 18,
      color: InkText.cinnabar,
      bold: true
    })
    this.detailContainer.add(mechBadge)

    // 右上角：策系朱印
    const sealW = 132
    const sealH = 30
    const sealX = detailW - leftPad - sealW / 2
    const seal = this.add.rectangle(sealX, 34, sealW, sealH, style.badgeBg)
    seal.setStrokeStyle(1.5, 0xd4af37)
    const sealText = inkText(this, sealX, 34, style.label, {
      size: 13,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.detailContainer.add([seal, sealText])

    // 名将专属一键跳转【武将】页面
    if (aug.heroRequirement) {
      const hCfg = getHeroConfig(aug.heroRequirement)
      if (hCfg) {
        const jumpHeroBtn = createInkButton(
          this,
          sealX - sealW / 2 - 72,
          34,
          124,
          28,
          `📜 查看${hCfg.name} →`,
          {
            fill: InkColor.paperDeep,
            hoverFill: InkColor.cinnabar,
            textColor: InkText.strong,
            fontSize: 12,
            stroke: InkColor.cinnabar,
            onClick: () => {
              SoundFX.stamp(0.25)
              this.scene.start('HeroListScene', { heroId: hCfg.id })
            }
          }
        )
        this.detailContainer.add(jumpHeroBtn)
      }
    }

    // 标题下方 1 行浅墨三国典故题跋（点到即止，不喧宾夺主）
    const loreOneLine = aug.historicalLore || aug.subtitle || ''
    const loreTxt = inkText(this, leftPad + 2, 72, `📜 “${loreOneLine}”`, {
      size: 13,
      color: InkText.faint
    })
    this.detailContainer.add(loreTxt)

    const topRule = this.add.graphics()
    topRule.lineStyle(1.2, InkColor.ink, 0.2)
    topRule.lineBetween(leftPad, 96, detailW - leftPad, 96)
    this.detailContainer.add(topRule)

    // ==================== 2. 第二眼：核心效果主视觉框 + 醒目加成胶囊 ====================
    const effectBoxY = 114
    const effectBoxH = 156
    const effectBg = this.add.rectangle(
      detailW / 2,
      effectBoxY + effectBoxH / 2,
      contentW,
      effectBoxH,
      0xfdf8ee,
      0.96
    )
    effectBg.setStrokeStyle(2, style.stroke, 0.85)
    this.detailContainer.add(effectBg)

    const effectTag = this.add.rectangle(leftPad + 54, effectBoxY + 24, 92, 24, style.badgeBg, 0.92)
    const effectTagTxt = inkText(this, leftPad + 54, effectBoxY + 24, '⚡ 核心效果', {
      size: 12,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.detailContainer.add([effectTag, effectTagTxt])

    if (aug.targetDimension) {
      const dimLabel = inkText(this, detailW - leftPad - 16, effectBoxY + 24, aug.targetDimension, {
        size: 12.5,
        color: style.text,
        bold: true,
        originX: 1
      })
      this.detailContainer.add(dimLabel)
    }

    // 大字精炼效果（去除冗长公式括号与“改写后”前缀，一眼看懂爽点）
    const coreEffectStr = this.getConciseCoreEffect(aug)
    const coreEffectTxt = inkText(this, leftPad + 18, effectBoxY + 46, coreEffectStr, {
      size: 15.5,
      color: InkText.strong,
      bold: true,
      originY: 0,
      wrapWidth: contentW - 36
    })
    this.detailContainer.add(coreEffectTxt)

    // 底部直观数值胶囊（只显示实际拥有的加成，绝不显示空乘区）
    const pills = this.getStatPills(aug)
    let pillX = leftPad + 18
    const pillY = effectBoxY + 126
    for (const pill of pills) {
      const pw = Math.max(118, pill.text.length * 13 + 26)
      const pBg = this.add.rectangle(pillX + pw / 2, pillY, pw, 30, pill.bg, 0.95)
      pBg.setStrokeStyle(1.5, pill.stroke, 0.9)
      const pTxt = inkText(this, pillX + pw / 2, pillY, pill.text, {
        size: 13,
        color: pill.color,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      this.detailContainer.add([pBg, pTxt])
      pillX += pw + 12
    }

    // ==================== 3. 第三眼：实战三格速览（谁用 · 何时选 · 打谁强） ====================
    const gridY = 290
    const colGap = 16
    const colW = (contentW - colGap * 2) / 3
    const colH = 128

    const quickCards = [
      {
        icon: '🤝 契合阵容',
        main: this.getShortAffinityTag(aug),
        sub: this.getAffinitySubNote(aug),
        stroke: style.stroke,
        color: style.text
      },
      {
        icon: '🌦️ 最佳天时',
        main: this.getShortWeatherTitle(aug),
        sub: this.getShortWeatherSub(aug),
        stroke: 0x255c8a,
        color: '#1c496e'
      },
      {
        icon: '👹 专克强敌',
        main: this.getShortBossTitle(aug),
        sub: this.getShortBossSub(aug),
        stroke: InkColor.cinnabar,
        color: InkText.cinnabar
      }
    ]

    quickCards.forEach((qc, i) => {
      const cx = leftPad + i * (colW + colGap) + colW / 2
      const cy = gridY + colH / 2

      const cBg = this.add.rectangle(cx, cy, colW, colH, InkColor.paperDeep, 0.52)
      cBg.setStrokeStyle(1.5, qc.stroke, 0.55)

      const headerTxt = inkText(this, cx, gridY + 24, qc.icon, {
        size: 12.5,
        color: InkText.faint,
        bold: true,
        originX: 0.5
      })

      const mainTxt = inkText(this, cx, gridY + 60, qc.main, {
        size: 17,
        color: qc.color,
        bold: true,
        originX: 0.5
      })

      const subTxt = inkText(this, cx, gridY + 96, qc.sub, {
        size: 12,
        color: InkText.ink,
        originX: 0.5,
        wrapWidth: colW - 24
      })
      subTxt.setAlign('center')

      this.detailContainer?.add([cBg, headerTxt, mainTxt, subTxt])
    })

    // ==================== 4. 底部同策系快速切换栏 ====================
    const chainBoxY = detailH - 68
    const chainBoxH = 46
    const chainBg = this.add.rectangle(
      detailW / 2,
      chainBoxY + chainBoxH / 2,
      contentW,
      chainBoxH,
      InkColor.paperDeep,
      0.45
    )
    chainBg.setStrokeStyle(1, InkColor.inkFaint, 0.35)
    this.detailContainer.add(chainBg)

    const isChainCategory = aug.stratagemCategory === '相生连环策' && !aug.repeatable
    const chainLabelStr = isChainCategory ? '🔗 相生五环：' : `📚 同系奇谋：`
    const chainLabel = inkText(this, leftPad + 14, chainBoxY + chainBoxH / 2, chainLabelStr, {
      size: 12.5,
      color: InkText.strong,
      bold: true
    })
    this.detailContainer.add(chainLabel)

    const peers = aug.repeatable
      ? REPEATABLE_AUGMENTS
      : this.allAugments.filter(a => !a.repeatable && a.stratagemCategory === aug.stratagemCategory)

    let px = leftPad + 14 + chainLabel.width + 8
    const availW = contentW - chainLabel.width - 36
    const btnGap = 8
    const btnW = Math.min(110, Math.floor((availW - (peers.length - 1) * btnGap) / Math.max(1, peers.length)))

    peers.forEach((peer, idx) => {
      const isCur = peer.id === aug.id
      const peerBtn = createInkButton(
        this,
        px + btnW / 2,
        chainBoxY + chainBoxH / 2,
        btnW,
        28,
        isChainCategory && idx < 5 ? `${idx + 1}.《${peer.name}》` : `《${peer.name}》`,
        {
          fill: isCur ? InkColor.cinnabar : InkColor.paperPanel,
          hoverFill: isCur ? 0xb53a32 : InkColor.paper,
          textColor: isCur ? '#ffffff' : InkText.ink,
          fontSize: 11.5,
          stroke: isCur ? 0xd4af37 : style.stroke,
          onClick: () => {
            if (peer.id === aug.id) return
            SoundFX.thud(0.18)
            this.selectAugment(peer.id)
          }
        }
      )
      this.detailContainer?.add(peerBtn)
      px += btnW + btnGap
    })
  }

  /**
   * 提炼简短契合标签（如“关羽专属”、“水 + 木共鸣”、“全军通用”）
   */
  private getShortAffinityTag(aug: Augment): string {
    if (aug.heroRequirement) {
      const hCfg = getHeroConfig(aug.heroRequirement)
      return `${hCfg?.name || '名将'}专属`
    }
    if (aug.wuXingRequirement && aug.wuXingRequirement.length > 0) {
      return `${aug.wuXingRequirement.map(wx => INK_WUXING[wx]?.label || wx).join(' + ')}系共鸣`
    }
    if (aug.repeatable) {
      return '♾️ 无限叠加'
    }
    return '全阵容通用'
  }

  private getAffinitySubNote(aug: Augment): string {
    if (aug.heroRequirement) {
      const hCfg = getHeroConfig(aug.heroRequirement)
      return `${hCfg?.name || '该将'}在场时优先触发保底`
    }
    if (aug.wuXingRequirement && aug.wuXingRequirement.length > 0) {
      return '对应五行在场时触发保底抽取'
    }
    if (aug.repeatable) {
      return '25卷修满后可无限次叠加'
    }
    return '任意五虎阵容皆可直接生效'
  }

  /**
   * 左栏卡片一句话精炼亮点（控制在 22 字以内）
   */
  private getOneLineHighlight(aug: Augment): string {
    const clean = this.getConciseCoreEffect(aug)
    return clean.length > 23 ? `${clean.slice(0, 23)}…` : clean
  }

  /**
   * 提炼玩家第一眼想看的精炼核心效果（剥除“改写后：”前缀与冗长公式括号）
   */
  private getConciseCoreEffect(aug: Augment): string {
    const raw = (aug.ruleAfter || aug.description || '')
      .replace(/^改写后：\s*/, '')
      .replace(/（归入【[^】]+】[^）]*）/g, '')
      .replace(/（严格归入[^）]*）/g, '')
      .trim()
    return raw
  }

  /**
   * 提取醒目数值胶囊（只返回当前锦囊真正拥有的加成，不展示空位）
   */
  private getStatPills(aug: Augment): { text: string; bg: number; stroke: number; color: string }[] {
    const ef = aug.effects
    const pills: { text: string; bg: number; stroke: number; color: string }[] = []

    if (ef.attackPercentBonus) {
      pills.push({
        text: `⚔️ 攻击力 +${Math.round(ef.attackPercentBonus * 100)}%`,
        bg: 0xfbeee9,
        stroke: 0x9e2b25,
        color: '#9e2b25'
      })
    }
    if (ef.attackSpeedBonus) {
      pills.push({
        text: `⚡ 攻速 +${Math.round(ef.attackSpeedBonus * 100)}%`,
        bg: 0xebf2f7,
        stroke: 0x255c8a,
        color: '#1c496e'
      })
    }
    if (ef.attackRangeBonus) {
      pills.push({
        text: `🎯 射程 +${ef.attackRangeBonus}px`,
        bg: 0xeef5f0,
        stroke: 0x2e6b47,
        color: '#235739'
      })
    }
    if (ef.critRateBonus) {
      pills.push({
        text: `🎯 暴击率 +${Math.round(ef.critRateBonus * 100)}%`,
        bg: 0xf8f1e4,
        stroke: 0xa06b1e,
        color: '#875714'
      })
    }
    if (ef.critDamageBonus) {
      pills.push({
        text: `💥 暴击伤害 +${Math.round(ef.critDamageBonus * 100)}%`,
        bg: 0xf8f1e4,
        stroke: 0xa06b1e,
        color: '#875714'
      })
    }
    if (ef.damageIncreaseBonus) {
      pills.push({
        text: `🔥 全军增伤 +${Math.round(ef.damageIncreaseBonus * 100)}%`,
        bg: 0xeef5f0,
        stroke: 0x2e6b47,
        color: '#235739'
      })
    }
    if (ef.reactionDamageMultiplier) {
      pills.push({
        text: `🔗 相生伤害 +${Math.round(ef.reactionDamageMultiplier * 100)}%`,
        bg: 0xeef5f0,
        stroke: 0x2e6b47,
        color: '#235739'
      })
    }
    if (ef.vulnerabilityBonus) {
      pills.push({
        text: `🩸 敌军易伤 +${Math.round(ef.vulnerabilityBonus * 100)}%`,
        bg: 0xf3eef8,
        stroke: 0x6b3fa0,
        color: '#563082'
      })
    }
    if (ef.costGainBonus) {
      pills.push({
        text: `🪙 军费获取 +${Math.round(ef.costGainBonus * 100)}%`,
        bg: 0xf8f1e4,
        stroke: 0xa06b1e,
        color: '#875714'
      })
    }
    if (ef.baseMaxHealthBonus) {
      pills.push({
        text: `🏯 城防上限 +${ef.baseMaxHealthBonus}`,
        bg: 0xeef5f0,
        stroke: 0x2e6b47,
        color: '#235739'
      })
    }
    if (aug.id === 'aug_wooden_ox') {
      pills.push({
        text: '🎲 免费易策令 +2',
        bg: 0xf8f1e4,
        stroke: 0xa06b1e,
        color: '#875714'
      })
    }

    if (pills.length === 0) {
      pills.push({
        text: `✨ ${aug.mechanismTitle || '专属机制质变'}`,
        bg: 0xfbf5e6,
        stroke: 0xa0782f,
        color: '#875714'
      })
    }

    return pills.slice(0, 4)
  }

  private getShortWeatherTitle(aug: Augment): string {
    const w = aug.synergyWeather || ''
    const match = w.match(/【([^】]+)】/)
    if (match) return match[1]
    return '全天时通用'
  }

  private getShortWeatherSub(aug: Augment): string {
    const w = (aug.synergyWeather || '').replace(/^【[^】]+】\s*[·：:]?\s*/, '')
    if (!w) return '不受天时限制，全天候稳定发挥'
    return w.length > 20 ? `${w.slice(0, 20)}…` : w
  }

  private getShortBossTitle(aug: Augment): string {
    const b = aug.counterBoss || ''
    const match = b.match(/【([^】]+)】/)
    if (match) return match[1]
    return '全兵种 / 首领'
  }

  private getShortBossSub(aug: Augment): string {
    const b = (aug.counterBoss || '').replace(/^专克【[^】]+】|^【[^】]+】\s*[·：:]?\s*/, '')
    if (!b) return '加速击碎统帅五行铁壁'
    return b.length > 20 ? `${b.slice(0, 20)}…` : b
  }
}

