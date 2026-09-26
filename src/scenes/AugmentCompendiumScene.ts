import Phaser from 'phaser'
import { Augment, AugmentRarity } from '@/types/augment'
import { AUGMENT_POOL, REPEATABLE_AUGMENTS } from '@/data/augments'
import { getHeroConfig } from '@/data/heroes'
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

interface TabDef {
  key: FilterTab
  title: string
}

const RARITY_INFO: Record<AugmentRarity, { label: string; stroke: number; bg: number; text: string }> = {
  common: { label: '军略·凡品', stroke: 0x6e7d8c, bg: 0xe6e4df, text: '#4e5a65' },
  rare: { label: '奇策·良品', stroke: 0x2979ff, bg: 0xdde9fd, text: '#1565c0' },
  epic: { label: '神算·绝品', stroke: 0x8e24aa, bg: 0xf3e5f5, text: '#6a1b9a' },
  legendary: { label: '天机·无双', stroke: 0xd97706, bg: 0xfff3e0, text: '#b45309' }
}

/**
 * 军事锦囊图鉴场景（水墨宣纸风）
 * 汇聚三国谋士全套 27 卷锦囊秘策，提供分类浏览、属性拆解与兵法策论
 */
export default class AugmentCompendiumScene extends Phaser.Scene {
  private allAugments: Augment[] = []
  private filteredAugments: Augment[] = []
  private currentTab: FilterTab = 'all'
  private selectedAugmentId: string | null = null

  // UI 容器与组件
  private tabButtons: Phaser.GameObjects.Container[] = []
  private listContainer!: Phaser.GameObjects.Container
  private listScrollY = 0
  private maxScrollLimit = 0
  private cardContainers: Phaser.GameObjects.Container[] = []
  private detailContainer: Phaser.GameObjects.Container | null = null

  constructor() {
    super({ key: 'AugmentCompendiumScene' })
  }

  init(): void {
    // 整合唯一锦囊池与可重复精进锦囊池 (共27卷)
    this.allAugments = [...AUGMENT_POOL, ...REPEATABLE_AUGMENTS]
    this.currentTab = 'all'
    this.listScrollY = 0
    this.selectedAugmentId = this.allAugments[0]?.id || null
  }

  create(): void {
    const height = this.cameras.main.height

    drawPaperBackground(this)

    // 1. 顶部标题栏 + 返回按钮
    this.renderHeader()

    // 2. 分类过滤标签栏
    this.renderTabs()

    // 3. 左侧锦囊列表
    this.renderListPanel(height)

    // 4. 右侧军机详案面板
    this.renderDetailPanel()

    // 5. 初始选中第一张锦囊
    if (this.selectedAugmentId) {
      this.selectAugment(this.selectedAugmentId)
    }
  }

  private renderHeader(): void {
    renderPageHeader(this, '锦囊', '· 图鉴')

    // 右上角返回按钮
    createPageBackButton(this, () => {
      try {
        this.scene.start('TitleScene')
      } catch (err) {
        console.error('Failed to return to TitleScene:', err)
      }
    })
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
    createPanel(this, listX, listY, listW, listH, {
      alpha: 0.5,
      strokeWidth: 1.5
    })

    // 视口遮罩
    const maskG = this.make.graphics({ x: 0, y: 0 })
    maskG.fillRect(listX + 2, listY + 2, listW - 4, listH - 4)
    const mask = maskG.createGeometryMask()

    // 内容容器
    this.listContainer = this.add.container(listX, listY)
    this.listContainer.setMask(mask)

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
}
