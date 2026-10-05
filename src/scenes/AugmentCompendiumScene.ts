import Phaser from 'phaser'
import { Augment, AugmentRarity } from '@/types/augment'
import { AUGMENT_POOL, REPEATABLE_AUGMENTS } from '@/data/augments'
import { heroes, getHeroConfig, STAR_ATTACHMENT_RATES } from '@/data/heroes'
import { getSkill } from '@/data/skills'
import { artifacts, gems, gemNames, GEM_STAT_RANGES } from '@/data/equipment'
import { DIVINE_FORGE_RECIPES } from '@/core/equipment/EquipmentManager'
import { WuXing } from '@/types'
import {
  InkColor,
  InkText,
  InkFontSize,
  INK_WUXING,
  drawPaperBackground,
  createPanel,
  inkText,
  sectionHeader,
  createInkButton,
  renderPageHeader,
  createPageBackButton
} from '@/ui/InkTheme'
import { SoundFX } from '@/effects/SoundFX'

type FilterTab = 'all' | 'elemental' | 'hero' | 'general' | 'endless' | 'repeatable'
type CompendiumVolume = 'heroes' | 'weapons' | 'gems' | 'stratagems'

interface TabDef {
  key: FilterTab
  title: string
}

const RARITY_INFO: Record<AugmentRarity, { label: string; stroke: number; bg: number; text: string }> = {
  common: { label: '五行异变策', stroke: 0x6e7d8c, bg: 0xe6e4df, text: '#4e5a65' },
  rare: { label: '奇谋战法策', stroke: 0x2979ff, bg: 0xdde9fd, text: '#1565c0' },
  epic: { label: '攻防逆转策', stroke: 0x8e24aa, bg: 0xf3e5f5, text: '#6a1b9a' },
  legendary: { label: '相生连环策', stroke: 0xd97706, bg: 0xfff3e0, text: '#b45309' }
}

/**
 * 水墨博物志（四大典藏图鉴：名将录 · 神兵谱 · 灵石鉴 · 军师锦囊）
 * 严格遵循 docs/Wuxing_System_Design.md 第十章 §10.3 设计规范：
 * 1. 【卷一：名将录（武将图鉴）】：展示 1★~5★ 北斗将星命盘节点与 260×180px 实时微缩演武场（Mini Sandbox）预览四阶技能；
 * 2. 【卷二：神兵谱（武器图鉴）】：展示专属认主朱砂大印、2★同源槽 + 4★相生槽 + 5★终极大招，配备 Lv.1~Lv.5 实时交互游标；
 * 3. 【卷三：灵石鉴（宝石图鉴）】：展示 5×5 五行灵石矩阵、完整 [Min ~ Max] 随机上下限区间表及适配神兵跳转；
 * 4. 【卷四：军师锦囊（典故名策）】：汇聚全套三国典故锦囊，支持分类检索与策论详案。
 */
export default class AugmentCompendiumScene extends Phaser.Scene {
  private allAugments: Augment[] = []
  private filteredAugments: Augment[] = []
  private currentVolume: CompendiumVolume = 'heroes'
  private currentTab: FilterTab = 'all'
  private selectedAugmentId: string | null = null
  private selectedHeroId: string = 'hero_guanyu'
  private sandboxTier: 1 | 2 | 3 | 4 = 1
  private selectedArtifactId: string = 'artifact_qinglong'
  private weaponPreviewGemLevel: number = 3
  private selectedGemId: string = 'gem_wood_5'

  // UI 容器与组件
  private volumeButtons: Phaser.GameObjects.Container[] = []
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

  init(data?: { volume?: CompendiumVolume; artifactId?: string }): void {
    // 整合唯一锦囊池与可重复精进锦囊池 (共30卷)
    this.allAugments = [...AUGMENT_POOL, ...REPEATABLE_AUGMENTS]
    this.currentVolume = data?.volume || 'heroes'
    this.currentTab = 'all'
    this.listScrollY = 0
    this.selectedAugmentId = this.allAugments[0]?.id || null
    if (data?.artifactId) {
      this.selectedArtifactId = data.artifactId
    }
  }

  create(): void {
    drawPaperBackground(this)

    // 1. 顶部标题栏 + 返回按钮 + 四大典藏卷轴切换栏
    this.renderHeader()
    this.renderVolumeSwitcher()

    // 2. 渲染当前卷轴主体
    this.renderActiveVolume()
  }

  private renderHeader(): void {
    renderPageHeader(this, '水墨博物志', '· 名将录 · 神兵谱 · 灵石鉴 · 军师锦囊')

    createPageBackButton(this, () => {
      try {
        this.scene.start('TitleScene')
      } catch (err) {
        console.error('Failed to return to TitleScene:', err)
      }
    })
  }

  private renderVolumeSwitcher(): void {
    this.volumeButtons.forEach(b => b.destroy())
    this.volumeButtons = []

    const volumes: { key: CompendiumVolume; label: string }[] = [
      { key: 'heroes', label: '📜 卷一：名将录（演武沙盒）' },
      { key: 'weapons', label: '⚔️ 卷二：神兵谱（Lv.1~5 游标）' },
      { key: 'gems', label: '💎 卷三：灵石鉴（5×5 矩阵）' },
      { key: 'stratagems', label: '🎴 卷四：军师锦囊（典故名策）' }
    ]

    let vx = 420
    const vy = 42
    for (const vol of volumes) {
      const isAct = this.currentVolume === vol.key
      const btn = createInkButton(this, vx, vy, 178, 30, vol.label, {
        fill: isAct ? InkColor.cinnabar : InkColor.paperDeep,
        hoverFill: isAct ? 0xb53a32 : InkColor.paperPanel,
        textColor: isAct ? InkText.paper : InkText.ink,
        fontSize: 11,
        stroke: isAct ? 0x6e1b15 : InkColor.inkFaint,
        onClick: () => {
          if (this.currentVolume === vol.key) return
          SoundFX.thud(0.2)
          this.currentVolume = vol.key
          this.renderVolumeSwitcher()
          this.renderActiveVolume()
        }
      })
      this.volumeButtons.push(btn)
      vx += 186
    }
  }

  private renderActiveVolume(): void {
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

    if (this.currentVolume === 'heroes') {
      this.renderHeroesVolume()
    } else if (this.currentVolume === 'weapons') {
      this.renderWeaponsVolume()
    } else if (this.currentVolume === 'gems') {
      this.renderGemsVolume()
    } else {
      const height = this.cameras.main.height
      this.renderTabs()
      this.renderListPanel(height)
      this.renderDetailPanel()
      if (this.selectedAugmentId) {
        this.selectAugment(this.selectedAugmentId)
      }
    }
  }

  private renderTabs(): void {
    const tabs: TabDef[] = [
      { key: 'all', title: '全部' },
      { key: 'elemental', title: '五行共鸣' },
      { key: 'hero', title: '名将本命' },
      { key: 'general', title: '军策统御' },
      { key: 'endless', title: '无尽专属' },
      { key: 'repeatable', title: '精进妙策' }
    ]

    let tabX = 32
    const tabY = 82
    const tabGap = 8

    // 清空既有按钮
    this.tabButtons.forEach(btn => btn.destroy())
    this.tabButtons = []

    for (const tab of tabs) {
      const isActive = this.currentTab === tab.key
      const count = this.getTabCount(tab.key)
      const label = `${tab.title} (${count})`
      const btnW = tab.key === 'all' ? 84 : 108

      const btn = createInkButton(this, tabX + btnW / 2, tabY, btnW, 30, label, {
        fill: isActive ? InkColor.cinnabar : InkColor.paperDeep,
        hoverFill: isActive ? 0xb53a32 : InkColor.paperPanel,
        textColor: isActive ? InkText.paper : InkText.ink,
        fontSize: 12,
        stroke: isActive ? 0x6e1b15 : InkColor.inkFaint,
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
  }

  public getTabCount(tab: FilterTab): number {
    return this.allAugments.filter(a => this.matchesTab(a, tab)).length
  }

  public matchesTab(a: Augment, tab: FilterTab): boolean {
    switch (tab) {
      case 'all':
        return true
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

  private renderListPanel(height: number): void {
    const listX = 32
    const listY = 114
    const listW = 388
    const listH = height - listY - 24

    // 列表背衬底框
    const listPanel = createPanel(this, listX, listY, listW, listH, {
      alpha: 0.5,
      strokeWidth: 1.5
    })
    if (this.bodyContainer) this.bodyContainer.add(listPanel)

    // 视口遮罩
    const maskG = this.make.graphics({ x: 0, y: 0 })
    maskG.fillRect(listX + 2, listY + 2, listW - 4, listH - 4)
    const mask = maskG.createGeometryMask()

    // 内容容器
    this.listContainer = this.add.container(listX, listY)
    this.listContainer.setMask(mask)
    if (this.bodyContainer) this.bodyContainer.add(this.listContainer)

    // 滚轮交互：使用场景级监听 + 手动边界检测，避免 Zone 遮挡卡片点击
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      if (this.maxScrollLimit <= 0) return
      const px = _pointer.x, py = _pointer.y
      if (px < listX || px > listX + listW || py < listY || py > listY + listH) return
      this.listScrollY = Phaser.Math.Clamp(this.listScrollY - dy * 0.7, -this.maxScrollLimit, 0)
      this.tweens.killTweensOf(this.listContainer)
      this.tweens.add({
        targets: this.listContainer,
        y: listY + this.listScrollY,
        duration: 120,
        ease: 'Sine.easeOut'
      })
    })

    this.filterAndRenderList()
  }

  private filterAndRenderList(): void {
    this.filteredAugments = this.allAugments.filter(a => this.matchesTab(a, this.currentTab))

    // 销毁既有卡片
    this.cardContainers.forEach(c => c.destroy())
    this.cardContainers = []
    this.listContainer.removeAll(true)

    const cardW = 368
    const cardH = 76
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
    const viewHeight = this.cameras.main.height - 114 - 24
    this.maxScrollLimit = Math.max(0, totalHeight - viewHeight)

    // 保持或校准选中的锦囊
    if (!this.filteredAugments.some(a => a.id === this.selectedAugmentId)) {
      if (this.filteredAugments[0]) {
        this.selectAugment(this.filteredAugments[0].id)
      }
    } else if (this.selectedAugmentId) {
      this.refreshCardHighlight(this.selectedAugmentId)
    }
  }

  private createAugmentCard(
    x: number,
    y: number,
    w: number,
    h: number,
    aug: Augment
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    const isSelected = this.selectedAugmentId === aug.id
    const rInfo = RARITY_INFO[aug.rarity]

    // 卡片底板
    const bg = this.add.rectangle(w / 2, h / 2, w, h, isSelected ? 0xf4eee1 : InkColor.paperPanel, 0.95)
    bg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? InkColor.cinnabar : rInfo.stroke, isSelected ? 1 : 0.6)
    bg.setInteractive({ useHandCursor: true })
    container.add(bg)

    // 左侧品质色条
    const colorBar = this.add.rectangle(3, h / 2, 4, h - 8, rInfo.stroke, 0.9)
    container.add(colorBar)

    // 品阶印章文本
    const rarityBadge = inkText(this, 16, 12, rInfo.label, {
      size: 11,
      color: rInfo.text,
      bold: true
    })
    container.add(rarityBadge)

    // 锦囊名号
    const nameTxt = inkText(this, 16, 30, `《${aug.name}》`, {
      size: 16,
      color: InkText.strong,
      bold: true
    })
    container.add(nameTxt)

    // 副标题
    if (aug.subtitle) {
      const subTxt = inkText(this, 16, 52, aug.subtitle, {
        size: 11,
        color: InkText.faint
      })
      container.add(subTxt)
    }

    // 右侧标签
    if (aug.tags && aug.tags.length > 0) {
      let tagX = w - 12
      for (let t = aug.tags.length - 1; t >= 0; t--) {
        const tag = aug.tags[t]
        const tagText = inkText(this, tagX, 14, tag, {
          size: 10,
          color: InkText.wash,
          originX: 1
        })
        container.add(tagText)
        tagX -= tagText.width + 6
      }
    }

    // 点击选取事件
    bg.on('pointerdown', () => {
      SoundFX.thud(0.2)
      this.selectAugment(aug.id)
    })

    bg.on('pointerover', () => {
      if (this.selectedAugmentId !== aug.id) {
        bg.setFillStyle(0xf8f4ea, 1)
      }
    })

    bg.on('pointerout', () => {
      if (this.selectedAugmentId !== aug.id) {
        bg.setFillStyle(InkColor.paperPanel, 0.95)
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

      const rInfo = RARITY_INFO[aug.rarity]
      bg.setFillStyle(isSelected ? 0xf4eee1 : InkColor.paperPanel, 0.95)
      bg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? InkColor.cinnabar : rInfo.stroke, isSelected ? 1 : 0.6)
    }
  }

  // ==================== 右侧军机详案面板 ====================

  private renderDetailPanel(): void {
    const detailX = 432
    const detailY = 114
    const detailW = 816
    const detailH = this.cameras.main.height - detailY - 24

    if (this.detailContainer) {
      this.detailContainer.destroy()
    }
    this.detailContainer = this.add.container(detailX, detailY)

    // 底板
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

    const rInfo = RARITY_INFO[aug.rarity]
    const contentW = detailW - 48
    let cursorY = 24

    // 1. 卷首标题与品质印章
    const title = inkText(this, 24, cursorY, `《${aug.name}》`, {
      size: 30,
      color: InkText.strong,
      bold: true
    })
    this.detailContainer.add(title)

    // 右侧品质印章
    const sealW = 100
    const sealH = 28
    const seal = this.add.rectangle(detailW - 24 - sealW / 2, cursorY + 16, sealW, sealH, rInfo.stroke)
    seal.setStrokeStyle(1.5, 0x111111)
    const sealText = inkText(this, detailW - 24 - sealW / 2, cursorY + 16, rInfo.label, {
      size: 13,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    this.detailContainer.add([seal, sealText])

    cursorY += 40
    if (aug.subtitle) {
      const sub = inkText(this, 26, cursorY, aug.subtitle, {
        size: 14,
        color: InkText.faint
      })
      this.detailContainer.add(sub)
      cursorY += 24
    }

    // 分隔线
    const rule = this.add.graphics()
    rule.lineStyle(1.5, InkColor.ink, 0.2)
    rule.lineBetween(20, cursorY, detailW - 20, cursorY)
    this.detailContainer.add(rule)
    cursorY += 16

    // 2. ◈ 军机要旨 (核心机制描述)
    sectionHeader(this, this.detailContainer, 24, cursorY, '◈ 军机要旨', contentW)
    cursorY += 28

    const descBox = this.add.rectangle(detailW / 2, cursorY + 28, contentW, 64, InkColor.paperDeep, 0.55)
    descBox.setStrokeStyle(1, InkColor.inkFaint, 0.35)
    this.detailContainer.add(descBox)

    const descTxt = inkText(this, detailW / 2, cursorY + 28, aug.description, {
      size: 15,
      color: InkText.ink,
      wrapWidth: contentW - 32,
      originX: 0.5,
      originY: 0.5
    })
    this.detailContainer.add(descTxt)
    cursorY += 76

    // 3. ◈ 属性增益明细
    sectionHeader(this, this.detailContainer, 24, cursorY, '◈ 数值增益明细', contentW)
    cursorY += 28

    const effectRows = this.buildEffectRows(aug)
    for (const row of effectRows) {
      const rowBox = this.add.rectangle(detailW / 2, cursorY + 16, contentW, 32, InkColor.paperDeep, 0.3)
      rowBox.setStrokeStyle(1, InkColor.inkFaint, 0.25)
      this.detailContainer.add(rowBox)

      const labelTxt = inkText(this, 36, cursorY + 16, row.label, {
        size: 13,
        color: InkText.faint,
        originY: 0.5
      })
      const valTxt = inkText(this, detailW - 36, cursorY + 16, row.value, {
        size: 14,
        color: row.color || InkText.cinnabar,
        bold: true,
        originX: 1,
        originY: 0.5
      })
      this.detailContainer.add([labelTxt, valTxt])
      cursorY += 38
    }

    cursorY += 8

    // 4. ◈ 战阵契合度与羁绊
    sectionHeader(this, this.detailContainer, 24, cursorY, '◈ 战阵契合需求', contentW)
    cursorY += 28

    const affinityBox = this.add.rectangle(detailW / 2, cursorY + 26, contentW, 58, InkColor.paperDeep, 0.45)
    affinityBox.setStrokeStyle(1, InkColor.inkFaint, 0.3)
    this.detailContainer.add(affinityBox)

    // 五行羁绊需求
    let affinText = '通用军略 · 任何战阵皆可布设'
    if (aug.heroRequirement) {
      const hero = getHeroConfig(aug.heroRequirement)
      const heroName = hero ? hero.name : aug.heroRequirement
      affinText = `良将本命专属 · 须【${heroName}】出阵方可发挥极意`
    } else if (aug.wuXingRequirement && aug.wuXingRequirement.length > 0) {
      const wxLabels = aug.wuXingRequirement.map(wx => `【${INK_WUXING[wx]?.label || wx}】`).join(' + ')
      affinText = `五行属性共鸣 · 阵中备有 ${wxLabels} 将领方可领悟`
    } else if (aug.repeatable) {
      affinText = '精进妙策 · 无尽池永不枯竭，可无限次叠加精进全军'
    } else if (aug.id.startsWith('aug_endless_')) {
      affinText = '无尽试炼专享 · 百战登峰高阶神谋'
    }

    const affinTxt = inkText(this, 36, cursorY + 26, affinText, {
      size: 13,
      color: InkText.wash,
      bold: true,
      originY: 0.5
    })
    this.detailContainer.add(affinTxt)
    cursorY += 70

    // 5. ◈ 兵法策论建议
    sectionHeader(this, this.detailContainer, 24, cursorY, '◈ 兵法策论建言', contentW)
    cursorY += 28

    const advice = this.getTacticAdvice(aug)
    const adviceBox = this.add.rectangle(detailW / 2, cursorY + 36, contentW, 76, InkColor.paperDeep, 0.4)
    adviceBox.setStrokeStyle(1, InkColor.inkFaint, 0.3)
    this.detailContainer.add(adviceBox)

    const adviceTxt = inkText(this, detailW / 2, cursorY + 36, advice, {
      size: 13,
      color: InkText.ink,
      wrapWidth: contentW - 32,
      originX: 0.5,
      originY: 0.5
    })
    this.detailContainer.add(adviceTxt)
  }

  private buildEffectRows(aug: Augment): { label: string; value: string; color?: string }[] {
    const rows: { label: string; value: string; color?: string }[] = []
    const ef = aug.effects

    if (ef.attackPercentBonus) {
      rows.push({
        label: '全体将领攻击力',
        value: `+${Math.round(ef.attackPercentBonus * 100)}%`,
        color: InkText.cinnabar
      })
    }
    if (ef.attackSpeedBonus) {
      rows.push({
        label: '全体将领攻击速度',
        value: `+${Math.round(ef.attackSpeedBonus * 100)}%`,
        color: InkText.gold
      })
    }
    if (ef.attackRangeBonus) {
      rows.push({
        label: '攻击索敌射程',
        value: `+${ef.attackRangeBonus} 步`,
        color: '#2e5c8a'
      })
    }
    if (ef.reactionDamageMultiplier) {
      rows.push({
        label: '五行相生相克反应伤害',
        value: `+${Math.round(ef.reactionDamageMultiplier * 100)}% 爆破增幅`,
        color: '#e040fb'
      })
    }
    if (ef.counterMultiplierBonus) {
      rows.push({
        label: '五行克制基础倍率',
        value: `额外增幅 +${ef.counterMultiplierBonus}x`,
        color: InkText.gold
      })
    }
    if (ef.costGainBonus) {
      rows.push({
        label: '斩敌灵石军饷收益',
        value: `+${Math.round(ef.costGainBonus * 100)}% 赏银`,
        color: InkText.gold
      })
    }
    if (ef.baseMaxHealthBonus) {
      rows.push({
        label: '帅营城池防务生命上限',
        value: `+${ef.baseMaxHealthBonus} 点坚固度`,
        color: InkText.green
      })
    }
    if (ef.baseHealthHeal) {
      rows.push({
        label: '帅营战损即时修复',
        value: `立即修缮 +${ef.baseHealthHeal} 生命`,
        color: InkText.green
      })
    }
    if (ef.specialId) {
      rows.push({
        label: '战场专属神机机制',
        value: '特殊战术觉醒激活',
        color: '#8e24aa'
      })
    }

    if (rows.length === 0) {
      rows.push({ label: '战法效能', value: '机动应变，随机应变', color: InkText.faint })
    }

    return rows
  }

  private getTacticAdvice(aug: Augment): string {
    if (aug.id === 'aug_wind_fire') {
      return '兵法云：火借风势，燎原千里。关羽木系水草缠绕定身后，引火攻之，可瞬间引爆全屏范围火海。'
    }
    if (aug.id === 'aug_nourish_spread') {
      return '兵法云：春雨润物，以柔克刚。水木连携是面对无尽高移速神行骑兵的最强控制网，极大缓解帅营压力。'
    }
    if (aug.id === 'aug_sharp_edge') {
      return '兵法云：锋芒所向，无坚不摧。金系飞刃配合土系破防，专克高波次厚甲首领与铁壁词缀精英。'
    }
    if (aug.id === 'aug_ice_shatter') {
      return '兵法云：千里冰封，碎魂裂魄。金水碎冰附带范围致死爆炸，密集群怪推进时效果立竿见影。'
    }
    if (aug.id === 'aug_guanyu_yanyu') {
      return '名将真谛：关圣帝君木系战神，青龙偃月刀附带木系滋养，配合水系赵云可激发生生不息的水木相生大连锁！'
    }
    if (aug.id === 'aug_zhaoyun_dragon') {
      return '名将真谛：常山赵子龙水系游龙，龙胆亮银枪攻速越高收益呈指数级膨胀，极度契合《千机墨雨》与相生流派。'
    }
    if (aug.id === 'aug_zhangfei_roar') {
      return '名将真谛：翼德当阳怒吼，土系破衡重锤击退定身，是阻截首领突破帅营的定海神针。'
    }
    if (aug.id === 'aug_huangzhong_bow') {
      return '名将真谛：老将黄忠开弓如满月，箭无虚发！超远射程配合《定军扬威》贯穿箭阵，在后方安全输出引爆大范围烈火燎原。'
    }
    if (aug.id === 'aug_machao_cavalry') {
      return '名将真谛：西凉锦马超破阵摧坚，金戈铁骑突刺附带破甲飞刃，攻速与攻击力层层叠加，金生水破阵所向披靡！'
    }
    if (aug.repeatable) {
      return '精进要诀：百战无尽中后期唯一锦囊耗尽后的永续基石。根据当前战阵短板针对性累积堆叠，定能逆转乾坤。'
    }
    return '兵法云：运筹帷幄之中，决胜千里之外。根据当前关卡敌军五行弱点审时度势，方显军师神算。'
  }

  // ==================== 卷一：名将录（1★~5★北斗将星命盘 + 260×180px 四阶技能实时演武沙盒） ====================

  private renderHeroesVolume(): void {
    if (!this.bodyContainer) return
    const height = this.cameras.main.height

    // 左侧五虎上将名册
    const listX = 32
    const listY = 86
    const listW = 320
    const listH = height - listY - 24
    const listPanel = createPanel(this, listX, listY, listW, listH, { alpha: 0.55, strokeWidth: 1.5 })
    this.bodyContainer.add(listPanel)

    const listTitle = inkText(this, listX + 16, listY + 14, '◈ 蜀汉五虎上将 · 命盘名册', {
      size: 14,
      color: InkText.strong,
      bold: true
    })
    this.bodyContainer.add(listTitle)

    let hy = listY + 46
    for (const h of heroes) {
      const isSel = h.id === this.selectedHeroId
      const wx = INK_WUXING[h.wuXing]
      const card = this.add.container(listX + 12, hy)
      const cardW = listW - 24
      const cardH = 82

      const bg = this.add.rectangle(cardW / 2, cardH / 2, cardW, cardH, isSel ? 0xf4eee1 : InkColor.paperPanel, 0.95)
      bg.setStrokeStyle(isSel ? 2.2 : 1, isSel ? InkColor.cinnabar : wx.border, isSel ? 1 : 0.65)
      bg.setInteractive({ useHandCursor: true })
      card.add(bg)

      const badge = this.add.rectangle(26, cardH / 2, 34, 52, wx.fill, 0.95)
      badge.setStrokeStyle(1.5, wx.border)
      const badgeTxt = inkText(this, 26, cardH / 2, wx.label, {
        size: 18,
        color: wx.text,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      card.add([badge, badgeTxt])

      const nameTxt = inkText(this, 56, 16, `${h.name} · 【${wx.label}系主将】`, {
        size: 16,
        color: InkText.strong,
        bold: true
      })
      const roleTxt = inkText(this, 56, 40, `兵费: ${h.deploymentCost} 粮草 | 攻: ${h.baseStats.attack} | 射程: ${h.baseStats.attackRange}px`, {
        size: 11,
        color: InkText.faint
      })
      const activeSkillName = getSkill(h.activeSkillId)?.name || '本命战法'
      const skillTxt = inkText(this, 56, 58, `本命战法：【${activeSkillName}】`, {
        size: 11,
        color: InkText.cinnabar,
        bold: true
      })
      card.add([nameTxt, roleTxt, skillTxt])

      bg.on('pointerdown', () => {
        SoundFX.thud(0.2)
        this.selectedHeroId = h.id
        this.renderActiveVolume()
      })

      this.bodyContainer.add(card)
      hy += cardH + 10
    }

    // 右侧详情 + 北斗将星命盘 + 260×180px 实时微缩演武沙盒
    const detailX = 368
    const detailY = 86
    const detailW = 880
    const detailH = height - detailY - 24
    const detailPanel = createPanel(this, detailX, detailY, detailW, detailH, {
      stroke: 0xa0782f,
      strokeWidth: 2
    })
    this.bodyContainer.add(detailPanel)

    const hero = getHeroConfig(this.selectedHeroId) || heroes[0]
    const wx = INK_WUXING[hero.wuXing]
    const recipe = DIVINE_FORGE_RECIPES.find(r => r.heroId === hero.id)

    const headerTitle = inkText(this, detailX + 24, detailY + 18, `${hero.name} · 【${wx.label}灵将星】`, {
      size: 26,
      color: InkText.strong,
      bold: true
    })
    const subInfo = inkText(
      this,
      detailX + 24,
      detailY + 52,
      `本命专属神兵：【${recipe?.artifactName || '专属神兵'}】（击败【${recipe?.bossName || '镇守统帅'}】必掉【${recipe?.materialName || '神兵主材'}】）`,
      { size: 12, color: InkText.cinnabar, bold: true }
    )
    this.bodyContainer.add([headerTitle, subInfo])

    // 1. 左侧子栏：1★~5★ 北斗将星命盘全节点解析 (宽 480px)
    const leftBoxX = detailX + 24
    let cy = detailY + 84
    sectionHeader(this, this.bodyContainer, leftBoxX, cy, '◈ 北斗将星命盘（1★ ~ 5★ 全节点与普攻附着率）', 490)
    cy += 28

    const trait3Map: Record<string, string> = {
      hero_guanyu: '【青龙饮血】木毒阵亡减青龙斩月 CD 1.6s，毒伤范围 +35%',
      hero_huangzhong: '【百步穿杨】射程 +25%，对火灼目标暴击无视 20% 韧性',
      hero_zhangfei: '【万人敌】射程内土重停止衰减，内震附带 85px 50% 溅射',
      hero_machao: '【铁骑讨】场上每名金裂敌军使自身攻速 +6%（最高 +36%）',
      hero_zhaoyun: '【七进七出】对水湿目标第 4 次攻击必暴击且减速翻倍 1.5s'
    }

    const starRows = [
      { star: '1★ 少微初启', rate: '25%', desc: '解锁名将基础战法，开局全员无门槛出阵' },
      { star: '2★ 天璇开阳', rate: '38%', desc: '解锁神兵【同源宝石槽】，激活同源五行技能强化' },
      { star: '3★ 天玑本命', rate: '52%', desc: trait3Map[hero.id] || '解锁名将 3★ 本命特质' },
      { star: '4★ 天权相生', rate: '66%', desc: '解锁神兵【相生宝石槽】，激活同源+相生三才共鸣' },
      { star: '5★ 紫微极意', rate: '80%', desc: '双槽镶嵌 Lv.5 灵石觉醒【圣兽法相终极大招】，释放战法回 +8% 军令' }
    ]

    for (const row of starRows) {
      const rBg = this.add.rectangle(leftBoxX + 245, cy + 20, 490, 36, InkColor.paperDeep, 0.45)
      rBg.setStrokeStyle(1, InkColor.inkFaint, 0.3)
      const sTxt = inkText(this, leftBoxX + 10, cy + 20, `${row.star} (附着 ${row.rate})`, {
        size: 12,
        color: '#8a5a14',
        bold: true,
        originY: 0.5
      })
      const dTxt = inkText(this, leftBoxX + 148, cy + 20, row.desc, {
        size: 11,
        color: InkText.ink,
        wrapWidth: 334,
        originY: 0.5
      })
      this.bodyContainer.add([rBg, sTxt, dTxt])
      cy += 42
    }

    // 五大基础属性与局外上限说明
    cy += 8
    sectionHeader(this, this.bodyContainer, leftBoxX, cy, '◈ 五大基础面板与武道十境（局外单项上限 ≤ +50%）', 490)
    cy += 28
    const statPanel = this.add.rectangle(leftBoxX + 245, cy + 44, 490, 84, InkColor.paperDeep, 0.4)
    statPanel.setStrokeStyle(1, InkColor.inkFaint, 0.3)
    const statText = inkText(
      this,
      leftBoxX + 14,
      cy + 14,
      `• 攻击力: ${hero.baseStats.attack}   | 攻击范围: ${hero.baseStats.attackRange}px   | 攻击速度: ${hero.baseStats.attackSpeed}/s\n` +
        `• 暴击几率: 10.0% | 暴击伤害: 150.0% | 1★~5★普攻五行附着: ${(STAR_ATTACHMENT_RATES[1] * 100).toFixed(0)}%→${(STAR_ATTACHMENT_RATES[5] * 100).toFixed(0)}%\n` +
        `• 武道十境满级加成: 攻击 +36% / 射程 +18% / 攻速 +18%（配合双槽宝石严守 +50% 铁律）`,
      { size: 12, color: InkText.ink }
    )
    this.bodyContainer.add([statPanel, statText])

    // 2. 右侧子栏：260×180px 实时微缩演武沙盒（Mini Sandbox）
    const sbX = detailX + 544
    const sbY = detailY + 84
    sectionHeader(this, this.bodyContainer, sbX, sbY, '◈ 四阶技能实时演武场 (Mini Sandbox)', 310)

    const sandboxW = 280
    const sandboxH = 185
    const boxCenterX = sbX + 155
    const boxCenterY = sbY + 32 + sandboxH / 2

    const sbBg = this.add.rectangle(boxCenterX, boxCenterY, sandboxW, sandboxH, 0x1e1b16, 0.92)
    sbBg.setStrokeStyle(2, 0xc89b3c, 0.95)
    this.bodyContainer.add(sbBg)

    // 演武场网格与木桩敌军
    const sbContainer = this.add.container(boxCenterX, boxCenterY)
    this.bodyContainer.add(sbContainer)

    const gridG = this.add.graphics()
    gridG.lineStyle(1, 0xd4af37, 0.15)
    gridG.strokeCircle(-65, 10, 38)
    gridG.lineBetween(-120, 10, 120, 10)
    sbContainer.add(gridG)

    // 左侧演武武将剪影 + 脚底器灵金环 + 环绕灵魄
    const heroDummyX = -65
    const heroDummyY = 10
    if (this.sandboxTier >= 2) {
      const goldRing = this.add.graphics()
      goldRing.lineStyle(2, 0xffd700, 0.9)
      goldRing.strokeCircle(heroDummyX, heroDummyY, 26)
      goldRing.lineStyle(1, wx.border, 0.7)
      goldRing.strokeCircle(heroDummyX, heroDummyY, 31)
      sbContainer.add(goldRing)
    }

    const heroToken = this.add.circle(heroDummyX, heroDummyY, 18, wx.fill, 1)
    heroToken.setStrokeStyle(2, 0xffffff, 0.9)
    const heroTokTxt = inkText(this, heroDummyX, heroDummyY, hero.name[0], {
      size: 15,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    sbContainer.add([heroToken, heroTokTxt])

    if (this.sandboxTier >= 3) {
      const orb1 = this.add.circle(heroDummyX - 24, heroDummyY - 14, 5, wx.border, 1)
      const orb2 = this.add.circle(heroDummyX + 24, heroDummyY + 14, 5, 0xffd700, 1)
      sbContainer.add([orb1, orb2])
    }

    // 右侧机关木人靶
    const targetX = 68
    const targetY = 10
    const dummyTarget = this.add.rectangle(targetX, targetY, 30, 44, 0x6d4c41, 1)
    dummyTarget.setStrokeStyle(1.5, 0xffca28, 0.9)
    const dummyLabel = inkText(this, targetX, targetY, '木人\n机关', {
      size: 10,
      color: '#fff8e1',
      originX: 0.5,
      originY: 0.5
    })
    sbContainer.add([dummyTarget, dummyLabel])

    // 根据当前演武阶位播放水墨演武视效
    const fxG = this.add.graphics()
    sbContainer.add(fxG)
    const tierColor = this.sandboxTier === 1 ? 0xb0bec5 : this.sandboxTier === 2 ? wx.border : this.sandboxTier === 3 ? 0xffb300 : 0xff5252
    fxG.lineStyle(this.sandboxTier + 2, tierColor, 0.9)
    fxG.beginPath()
    fxG.moveTo(heroDummyX + 18, heroDummyY)
    fxG.lineTo(targetX - 16, targetY)
    fxG.strokePath()
    fxG.fillStyle(tierColor, 0.35)
    fxG.fillCircle(targetX, targetY, 16 + this.sandboxTier * 7)

    const beastTitles: Record<string, string> = {
      hero_guanyu: '🐉 东方青龙法相 · 青龙啸天',
      hero_huangzhong: '🦅 南方朱雀法相 · 九日连珠',
      hero_zhangfei: '⛰️ 中土玄岳法相 · 万夫莫开',
      hero_machao: '🐅 西方白虎法相 · 万骑奔雷',
      hero_zhaoyun: '🐢 北方玄武法相 · 龙胆惊鸿'
    }
    const heroSkillName = getSkill(hero.activeSkillId)?.name || '本命战法'
    const tierLabels: Record<1 | 2 | 3 | 4, string> = {
      1: `① 原始技能：【${heroSkillName}】基础水墨气劲`,
      2: `② +专属神兵：脚底常驻器灵金环 + 八卦阵技能质变`,
      3: `③ +同源/相生宝石：双色护体灵魄 + 三才共鸣流光`,
      4: `④ 终极大招：0.35s 暗场诗号卷轴 + ${beastTitles[hero.id] || '圣兽法相'}`
    }
    const bannerTxt = inkText(this, 0, -sandboxH / 2 + 16, tierLabels[this.sandboxTier], {
      size: 11,
      color: '#ffe082',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    sbContainer.add(bannerTxt)

    if (this.sandboxTier === 4) {
      const scrollBanner = this.add.rectangle(0, 62, sandboxW - 20, 26, 0x8e1e16, 0.95)
      scrollBanner.setStrokeStyle(1.2, 0xffd700)
      const scrollTxt = inkText(this, 0, 62, `📜 诗号切入 · ${beastTitles[hero.id] || '五行圣兽降临'}`, {
        size: 11,
        color: '#fff8e1',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      sbContainer.add([scrollBanner, scrollTxt])
    }

    // 4 阶切换按钮
    const tierBtns: { tier: 1 | 2 | 3 | 4; label: string }[] = [
      { tier: 1, label: '① 原始技能 (无神兵)' },
      { tier: 2, label: '② +佩戴本命专属神兵' },
      { tier: 3, label: '③ +镶嵌同源 & 相生宝石' },
      { tier: 4, label: '④ 🐉 双 Lv.5 终极大招觉醒' }
    ]

    let btnY = sbY + 32 + sandboxH + 22
    for (const tb of tierBtns) {
      const active = this.sandboxTier === tb.tier
      const btn = createInkButton(this, boxCenterX, btnY, sandboxW, 30, tb.label, {
        fill: active ? InkColor.cinnabar : InkColor.paperDeep,
        hoverFill: active ? 0xb53a32 : InkColor.paperPanel,
        textColor: active ? InkText.paper : InkText.ink,
        fontSize: 12,
        stroke: active ? 0xd4af37 : InkColor.inkFaint,
        onClick: () => {
          SoundFX.stamp(0.25)
          this.sandboxTier = tb.tier
          this.renderActiveVolume()
        }
      })
      this.bodyContainer.add(btn)
      btnY += 36
    }
  }

  // ==================== 卷二：神兵谱（专属认主朱砂印 + Lv.1~Lv.5 宝石等级实时交互游标） ====================

  private renderWeaponsVolume(): void {
    if (!this.bodyContainer) return
    const height = this.cameras.main.height

    const exclusiveArtifacts = artifacts.filter(a =>
      ['artifact_qinglong', 'artifact_shemao', 'artifact_longdan', 'artifact_sherigong', 'artifact_zhanjin'].includes(a.id)
    )

    // 左侧五大本命神兵名录
    const listX = 32
    const listY = 86
    const listW = 320
    const listH = height - listY - 24
    const listPanel = createPanel(this, listX, listY, listW, listH, { alpha: 0.55, strokeWidth: 1.5 })
    this.bodyContainer.add(listPanel)

    const listTitle = inkText(this, listX + 16, listY + 14, '◈ 五虎专属本命神兵谱（一生一铸）', {
      size: 14,
      color: InkText.strong,
      bold: true
    })
    this.bodyContainer.add(listTitle)

    let wy = listY + 46
    for (const art of exclusiveArtifacts) {
      const isSel = art.id === this.selectedArtifactId
      const wx = INK_WUXING[art.gemSocket.requiredWuXing]
      const card = this.add.container(listX + 12, wy)
      const cardW = listW - 24
      const cardH = 82

      const bg = this.add.rectangle(cardW / 2, cardH / 2, cardW, cardH, isSel ? 0xf4eee1 : InkColor.paperPanel, 0.95)
      bg.setStrokeStyle(isSel ? 2.2 : 1, isSel ? InkColor.cinnabar : wx.border, isSel ? 1 : 0.65)
      bg.setInteractive({ useHandCursor: true })
      card.add(bg)

      const nameTxt = inkText(this, 16, 14, `⚔️ ${art.name}`, {
        size: 16,
        color: InkText.strong,
        bold: true
      })
      const ownerTxt = inkText(this, 16, 38, `【认主 · ${art.exclusiveResonance?.heroName || '名将'}专属】`, {
        size: 12,
        color: InkText.cinnabar,
        bold: true
      })
      const skillTxt = inkText(this, 16, 58, `神兵技：${art.exclusiveResonance?.hiddenSkillName || ''}`, {
        size: 11,
        color: InkText.faint
      })
      card.add([nameTxt, ownerTxt, skillTxt])

      bg.on('pointerdown', () => {
        SoundFX.thud(0.2)
        this.selectedArtifactId = art.id
        this.renderActiveVolume()
      })

      this.bodyContainer.add(card)
      wy += cardH + 10
    }

    // 右侧神兵详情 + Lv.1~Lv.5 宝石等级实时游标
    const detailX = 368
    const detailY = 86
    const detailW = 880
    const detailH = height - detailY - 24
    const detailPanel = createPanel(this, detailX, detailY, detailW, detailH, {
      stroke: 0xa0782f,
      strokeWidth: 2
    })
    this.bodyContainer.add(detailPanel)

    const art = exclusiveArtifacts.find(a => a.id === this.selectedArtifactId) || exclusiveArtifacts[0]
    const recipe = DIVINE_FORGE_RECIPES.find(r => r.artifactId === art.id)
    const lv = this.weaponPreviewGemLevel
    const scalePct = lv * 20 // Lv.1~Lv.5 对应 20% ~ 100% 满额共鸣幅度

    // 标题与朱砂认主大印
    const title = inkText(this, detailX + 24, detailY + 20, `【${art.name}】`, {
      size: 28,
      color: InkText.strong,
      bold: true
    })
    const sealRect = this.add.rectangle(detailX + detailW - 120, detailY + 34, 180, 32, InkColor.cinnabar, 0.95)
    sealRect.setStrokeStyle(1.5, 0xffd700)
    const sealTxt = inkText(
      this,
      detailX + detailW - 120,
      detailY + 34,
      `認主 · ${art.exclusiveResonance?.heroName || ''}專屬`,
      { size: 13, color: '#fff8e1', bold: true, originX: 0.5, originY: 0.5 }
    )
    const forgeTxt = inkText(
      this,
      detailX + 28,
      detailY + 56,
      `蒲元铸剑坊宿命定向锻造：消耗【${recipe?.materialName || '神兵主材'}】（击败【${recipe?.bossName || '统帅'}】100% 必掉，一生仅需铸造 1 把）`,
      { size: 12, color: '#8a5a14', bold: true }
    )
    this.bodyContainer.add([title, sealRect, sealTxt, forgeTxt])

    // Lv.1 ~ Lv.5 实时交互游标
    let cy = detailY + 90
    sectionHeader(this, this.bodyContainer, detailX + 24, cy, '◈ 镶嵌宝石等级游标预览（拖动/点击 Lv.1 ──●── Lv.5 实时对比共鸣数值）', detailW - 48)
    cy += 32

    for (let gLv = 1; gLv <= 5; gLv++) {
      const isCur = this.weaponPreviewGemLevel === gLv
      const bx = detailX + 90 + (gLv - 1) * 165
      const btn = createInkButton(this, bx, cy + 12, 148, 32, `💎 镶嵌 Lv.${gLv} 灵石 (${gLv * 20}%效能)`, {
        fill: isCur ? InkColor.cinnabar : InkColor.paperDeep,
        hoverFill: isCur ? 0xb53a32 : InkColor.paperPanel,
        textColor: isCur ? InkText.paper : InkText.ink,
        fontSize: 12,
        stroke: isCur ? 0xd4af37 : InkColor.inkFaint,
        onClick: () => {
          SoundFX.thud(0.2)
          this.weaponPreviewGemLevel = gLv
          this.renderActiveVolume()
        }
      })
      this.bodyContainer.add(btn)
    }

    cy += 60
    sectionHeader(this, this.bodyContainer, detailX + 24, cy, `◈ 神兵三才共鸣详案（当前预览：Lv.${lv} 宝石 · 发挥 ${scalePct}% 极意倍率）`, detailW - 48)
    cy += 30

    const cards = [
      {
        badge: '本命神兵质变（佩戴即激活）',
        title: `${art.exclusiveResonance?.hiddenSkillName || ''}`,
        desc: `${art.description || ''}（专属神兵基础技能形态质变，无需宝石即可生效）`,
        color: '#8a5a14'
      },
      {
        badge: `2★【同源槽】激活（Lv.${lv} 同源宝石 · 强度 ${scalePct}%）`,
        title: art.exclusiveResonance?.sameEffectDesc || '',
        desc: `当前 Lv.${lv} 同源宝石共鸣增幅：触发概率/范围系数提升至基准的 ${scalePct}%（Lv.1→Lv.5 对应 20%→100% 满额威力）`,
        color: '#2e7d32'
      },
      {
        badge: `4★【相生槽】激活（Lv.${lv} 相生宝石 · 强度 ${scalePct}%）`,
        title: art.exclusiveResonance?.generatingEffectDesc || '',
        desc: `当前 Lv.${lv} 相生宝石共鸣增幅：相生化学连锁与附加倍率提升至基准的 ${scalePct}%`,
        color: '#1565c0'
      },
      {
        badge: `5★【双槽 Lv.5 终极大招】（${lv === 5 ? '✅ 已满足双 Lv.5 觉醒条件！' : '🔒 需双槽均镶嵌 Lv.5 灵石激活'}）`,
        title: art.exclusiveResonance?.ultimateDesc || '',
        desc: '双槽同时镶嵌 Lv.5 传世灵石且名将达 5★ 时，释放主动战法触发 0.35s 暗场聚焦、名将诗号卷轴切入与五行圣兽法相降临！',
        color: lv === 5 ? InkText.cinnabar : InkText.faint
      }
    ]

    for (const c of cards) {
      const box = this.add.rectangle(detailX + detailW / 2, cy + 34, detailW - 48, 62, InkColor.paperDeep, 0.45)
      box.setStrokeStyle(1, InkColor.inkFaint, 0.35)
      const bTxt = inkText(this, detailX + 38, cy + 12, c.badge, {
        size: 12,
        color: c.color,
        bold: true
      })
      const tTxt = inkText(this, detailX + 38, cy + 30, c.title, {
        size: 13,
        color: InkText.strong,
        bold: true
      })
      const dTxt = inkText(this, detailX + 38, cy + 48, c.desc, {
        size: 11,
        color: InkText.faint
      })
      this.bodyContainer.add([box, bTxt, tTxt, dTxt])
      cy += 70
    }
  }

  // ==================== 卷三：灵石鉴（5×5 五行灵石矩阵 + [Min ~ Max] 随机区间表 + 适配神兵跳转） ====================

  private renderGemsVolume(): void {
    if (!this.bodyContainer) return
    const height = this.cameras.main.height

    // 左侧 5×5 五行灵石矩阵
    const matX = 32
    const matY = 86
    const matW = 470
    const matH = height - matY - 24
    const matPanel = createPanel(this, matX, matY, matW, matH, { alpha: 0.55, strokeWidth: 1.5 })
    this.bodyContainer.add(matPanel)

    const matTitle = inkText(this, matX + 16, matY + 14, '◈ 五行灵石 5×5 典藏矩阵（点击检视词条区间与适配神兵）', {
      size: 14,
      color: InkText.strong,
      bold: true
    })
    this.bodyContainer.add(matTitle)

    const elements: WuXing[] = ['metal', 'wood', 'water', 'fire', 'earth']
    let rowY = matY + 52
    for (const el of elements) {
      const wx = INK_WUXING[el]
      const elLabel = inkText(this, matX + 16, rowY + 34, `【${wx.label}】`, {
        size: 15,
        color: wx.text,
        bold: true,
        originY: 0.5
      })
      this.bodyContainer.add(elLabel)

      for (let lv = 1; lv <= 5; lv++) {
        const gemId = `gem_${el}_${lv}`
        const isSel = this.selectedGemId === gemId
        const cellX = matX + 74 + (lv - 1) * 76
        const cellW = 70
        const cellH = 68

        const cell = this.add.rectangle(cellX + cellW / 2, rowY + cellH / 2, cellW, cellH, isSel ? 0xf4eee1 : InkColor.paperPanel, 0.95)
        cell.setStrokeStyle(isSel ? 2.2 : 1, isSel ? InkColor.cinnabar : wx.border, isSel ? 1 : 0.65)
        cell.setInteractive({ useHandCursor: true })

        const gemDot = this.add.circle(cellX + cellW / 2, rowY + 20, 8 + lv * 1.2, wx.border, 0.9)
        const lvTxt = inkText(this, cellX + cellW / 2, rowY + 40, `Lv.${lv}`, {
          size: 11,
          color: InkText.strong,
          bold: true,
          originX: 0.5,
          originY: 0.5
        })
        const gName = gemNames[el]?.[lv] || `Lv.${lv}灵石`
        const nmTxt = inkText(this, cellX + cellW / 2, rowY + 56, gName, {
          size: 10,
          color: InkText.faint,
          originX: 0.5,
          originY: 0.5
        })

        cell.on('pointerdown', () => {
          SoundFX.thud(0.18)
          this.selectedGemId = gemId
          this.renderActiveVolume()
        })

        this.bodyContainer.add([cell, gemDot, lvTxt, nmTxt])
      }
      rowY += 80
    }

    // 右侧宝石 [Min ~ Max] 随机区间透视表 + 适配神兵一键跳转
    const detailX = 518
    const detailY = 86
    const detailW = 730
    const detailH = height - detailY - 24
    const detailPanel = createPanel(this, detailX, detailY, detailW, detailH, {
      stroke: 0xa0782f,
      strokeWidth: 2
    })
    this.bodyContainer.add(detailPanel)

    const selGem = gems.find(g => g.id === this.selectedGemId) || gems[0]
    const wx = INK_WUXING[selGem.wuXing]
    const gName = gemNames[selGem.wuXing]?.[selGem.level] || '五行灵石'

    const title = inkText(this, detailX + 24, detailY + 18, `💎 【${gName}】 (Lv.${selGem.level} · ${wx.label}系灵石)`, {
      size: 24,
      color: InkText.strong,
      bold: true
    })
    const ruleDesc = inkText(
      this,
      detailX + 24,
      detailY + 50,
      '词条铁律：每颗灵石固定生成 2 条随机基础属性；三合一升阶时由【主石】100% 定向继承词条类型；灵砂淬炼永不降级！',
      { size: 12, color: InkText.cinnabar, bold: true }
    )
    this.bodyContainer.add([title, ruleDesc])

    let cy = detailY + 82
    sectionHeader(
      this,
      this.bodyContainer,
      detailX + 24,
      cy,
      `◈ Lv.${selGem.level} 灵石五大基础属性 [Min ~ Max] 随机上下限区间全表`,
      detailW - 48
    )
    cy += 30

    const statKeys: Array<keyof typeof GEM_STAT_RANGES> = ['attack', 'attackRange', 'attackSpeed', 'critRate', 'critDamage']
    for (const sk of statKeys) {
      const r = GEM_STAT_RANGES[sk][selGem.level]
      const rowBg = this.add.rectangle(detailX + detailW / 2, cy + 17, detailW - 48, 32, InkColor.paperDeep, 0.4)
      rowBg.setStrokeStyle(1, InkColor.inkFaint, 0.28)

      const rangeText = r.isPercentage
        ? `[ +${(r.min * 100).toFixed(1)}%  ~  +${(r.max * 100).toFixed(1)}% ]`
        : `[ +${r.min}px  ~  +${r.max}px ]`

      const lTxt = inkText(this, detailX + 38, cy + 17, `• ${r.label} (${sk})`, {
        size: 13,
        color: InkText.strong,
        bold: true,
        originY: 0.5
      })
      const rTxt = inkText(this, detailX + detailW - 38, cy + 17, `Lv.${selGem.level} 随机区间：${rangeText}`, {
        size: 13,
        color: '#8a5a14',
        bold: true,
        originX: 1,
        originY: 0.5
      })
      this.bodyContainer.add([rowBg, lTxt, rTxt])
      cy += 38
    }

    // 适配神兵与一键跳转
    cy += 12
    sectionHeader(this, this.bodyContainer, detailX + 24, cy, '◈ 同源 / 相生适配本命神兵（点击直接跳转【神兵谱】）', detailW - 48)
    cy += 32

    const matchingArtifacts = artifacts.filter(
      a =>
        ['artifact_qinglong', 'artifact_shemao', 'artifact_longdan', 'artifact_sherigong', 'artifact_zhanjin'].includes(a.id) &&
        Boolean(a.gemSocket.allowedWuXings?.includes(selGem.wuXing))
    )

    for (const ma of matchingArtifacts) {
      const isSameOrigin = ma.gemSocket.requiredWuXing === selGem.wuXing
      const slotTag = isSameOrigin ? '【2★ 同源槽本命适配】' : '【4★ 相生槽共鸣适配】'
      const effectText = isSameOrigin ? ma.exclusiveResonance?.sameEffectDesc : ma.exclusiveResonance?.generatingEffectDesc

      const box = this.add.rectangle(detailX + detailW / 2, cy + 32, detailW - 48, 58, InkColor.paperDeep, 0.5)
      box.setStrokeStyle(1.2, isSameOrigin ? 0x2e7d32 : 0x1565c0, 0.7)

      const tTxt = inkText(this, detailX + 36, cy + 18, `⚔️ ${ma.name} (${ma.exclusiveResonance?.heroName || ''}) · ${slotTag}`, {
        size: 13,
        color: isSameOrigin ? '#2e7d32' : '#1565c0',
        bold: true
      })
      const dTxt = inkText(this, detailX + 36, cy + 40, effectText || '', {
        size: 11,
        color: InkText.ink,
        wrapWidth: detailW - 220
      })

      const jumpBtn = createInkButton(this, detailX + detailW - 96, cy + 32, 128, 30, '跳转神兵谱 →', {
        fill: InkColor.cinnabar,
        hoverFill: 0xb53a32,
        textColor: InkText.paper,
        fontSize: 11,
        onClick: () => {
          SoundFX.stamp(0.25)
          this.selectedArtifactId = ma.id
          this.weaponPreviewGemLevel = selGem.level
          this.currentVolume = 'weapons'
          this.renderVolumeSwitcher()
          this.renderActiveVolume()
        }
      })

      this.bodyContainer.add([box, tTxt, dTxt, jumpBtn])
      cy += 68
    }
  }
}

