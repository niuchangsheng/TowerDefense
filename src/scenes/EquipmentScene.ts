import Phaser from 'phaser'
import { EquipmentManager, EquipmentInstance } from '@/core/equipment/EquipmentManager'
import { getGemName } from '@/data/equipment/gems'
import { RarityNames, Rarity, Gem, WuXing } from '@/types'
import { SaveManager } from '@/core/save/SaveManager'
import {
  InkColor,
  InkText,
  InkFontSize,
  INK_WUXING,
  INK_RARITY,
  drawPaperBackground,
  createPanel,
  inkText,
  sectionHeader,
  createInkButton,
  renderPageHeader,
  createPageBackButton,
  inkToast,
  createInkDialog
} from '@/ui/InkTheme'

/**
 * 装备页面场景（水墨宣纸风）
 *
 * 布局（1280×720，页边距 32）：
 * - 顶部标题栏
 * - 左栏（32 起，宽 336）：装备网格（2 列）+ 宝石网格（4 列）+ 宝石合成按钮
 * - 右侧详情面板（400,80，848×616，游标式分节布局）
 *
 * 所有业务逻辑（选中、合成、自动存档）保持不变，仅重排渲染。
 */
export default class EquipmentScene extends Phaser.Scene {
  // ===== 布局常量 =====
  private static readonly LEFT_X = 32
  private static readonly LEFT_W = 336
  private static readonly EQUIP_COLS = 2
  private static readonly EQUIP_W = 160
  private static readonly EQUIP_H = 88
  private static readonly EQUIP_GAP = 12
  private static readonly GEM_COLS = 4
  private static readonly GEM_W = 78
  private static readonly GEM_H = 64
  private static readonly GEM_GAP = 8
  private static readonly PANEL_X = 400
  private static readonly PANEL_Y = 80
  private static readonly PANEL_W = 848
  private static readonly PANEL_H = 616
  private static readonly PAD = 24
  private static readonly CONTENT_W = 800 // PANEL_W - PAD * 2

  private equipmentManager: EquipmentManager
  private equipmentCards: Phaser.GameObjects.Container[] = []
  private gemCards: Phaser.GameObjects.Container[] = []
  private detailPanel: Phaser.GameObjects.Container | null = null

  // 左栏分类与滚动
  private currentTab: 'artifact' | 'weapon' | 'gem' = 'artifact'
  private tabButtons: Phaser.GameObjects.Container[] = []
  private listContainer!: Phaser.GameObjects.Container
  private scrollY = 0
  private maxScrollY = 0

  constructor() {
    super({ key: 'EquipmentScene' })
    this.equipmentManager = new EquipmentManager()
  }

  create(): void {
    drawPaperBackground(this)
    renderPageHeader(this, '装备', '· 军械')

    // 左栏：分类标签 + 装备与宝石列表 + 滚轮滚动
    this.renderLeftColumn()

    // 右侧详情面板
    this.createDetailPanel()

    // 返回按钮（自动存档）
    createPageBackButton(this, () => {
      this.autoSave()
      this.scene.start('TitleScene')
    })

    // 优先默认选中三国神器（如赤兔马）或第一件装备
    const allEquip = this.equipmentManager.getOwnedEquipment()
    const preferred = allEquip.find(e => e.equipmentId === 'artifact_chitu') || allEquip[0]
    if (preferred) {
      this.selectEquipment(preferred)
    }
  }

  // ==================== 左栏 ====================

  /**
   * 左栏：顶部标签栏 + 滚动列表容器（装备网格 / 宝石网格 / 合成按钮）
   */
  private renderLeftColumn(): void {
    const L = EquipmentScene.LEFT_X
    const topY = 88

    // 分类标签栏
    this.renderTabs(L, topY)

    // 列表容器
    this.listContainer = this.add.container(0, 126)

    // 几何遮罩（可视区域 126 ~ 696，高 570）
    const maskShape = this.make.graphics({})
    maskShape.fillStyle(0xffffff)
    maskShape.fillRect(L - 6, 126, EquipmentScene.LEFT_W + 12, 570)
    const mask = maskShape.createGeometryMask()
    this.listContainer.setMask(mask)

    // 鼠标滚轮监听
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      if (pointer.x >= L && pointer.x <= L + EquipmentScene.LEFT_W && pointer.y >= 120 && pointer.y <= 700) {
        this.scrollY = Phaser.Math.Clamp(this.scrollY - deltaY * 0.6, this.maxScrollY, 0)
        this.listContainer.y = 126 + this.scrollY
      }
    })

    // 渲染内容
    this.refreshListContent()
  }

  /**
   * 渲染分类标签栏（神器 / 武器 / 宝石）
   */
  private renderTabs(startX: number, startY: number): void {
    for (const btn of this.tabButtons) {
      btn.destroy()
    }
    this.tabButtons = []

    const tabs: { key: 'artifact' | 'weapon' | 'gem'; label: string }[] = [
      { key: 'artifact', label: '神器' },
      { key: 'weapon', label: '武器' },
      { key: 'gem', label: '宝石' }
    ]

    const tabW = 104
    const tabH = 30
    const gap = 12

    tabs.forEach((tab, index) => {
      const x = startX + index * (tabW + gap) + tabW / 2
      const y = startY + tabH / 2
      const isActive = this.currentTab === tab.key

      const container = this.add.container(x, y)
      const bg = this.add.rectangle(0, 0, tabW, tabH, isActive ? InkColor.cinnabar : InkColor.paperPanel)
      bg.setStrokeStyle(1, isActive ? InkColor.cinnabar : InkColor.inkFaint)
      container.add(bg)

      container.add(inkText(this, 0, 0, tab.label, {
        size: 13,
        color: isActive ? '#ffffff' : InkText.ink,
        bold: isActive,
        originX: 0.5,
        originY: 0.5
      }))

      bg.setInteractive({ useHandCursor: true })
      bg.on('pointerdown', () => {
        if (this.currentTab !== tab.key) {
          this.currentTab = tab.key
          this.renderTabs(startX, startY)
          this.refreshListContent()
        }
      })

      this.tabButtons.push(container)
    })
  }

  /**
   * 刷新左栏滚动列表内容
   */
  private refreshListContent(): void {
    this.listContainer.removeAll(true)
    this.equipmentCards = []
    this.gemCards = []
    this.scrollY = 0
    this.listContainer.y = 126

    const allEquip = this.equipmentManager.getOwnedEquipment()
    let displayEquip: EquipmentInstance[] = []
    let showGems = false

    if (this.currentTab === 'artifact') {
      displayEquip = allEquip.filter(e => e.type === 'artifact')
      showGems = false
    } else if (this.currentTab === 'weapon') {
      displayEquip = allEquip.filter(e => e.type === 'weapon')
      showGems = false
    } else if (this.currentTab === 'gem') {
      displayEquip = []
      showGems = true
    }

    const L = EquipmentScene.LEFT_X
    let curY = 0

    if (displayEquip.length > 0) {
      const title = this.currentTab === 'artifact' ? `神器宝物 (${displayEquip.length})` : (this.currentTab === 'weapon' ? `武器兵刃 (${displayEquip.length})` : `装备 (${displayEquip.length})`)
      curY += sectionHeader(this, this.listContainer, L, curY, title, EquipmentScene.LEFT_W)
      const equipTop = curY + 8

      for (let i = 0; i < displayEquip.length; i++) {
        const equip = displayEquip[i]
        const col = i % EquipmentScene.EQUIP_COLS
        const row = Math.floor(i / EquipmentScene.EQUIP_COLS)
        const x = L + col * (EquipmentScene.EQUIP_W + EquipmentScene.EQUIP_GAP) + EquipmentScene.EQUIP_W / 2
        const y = equipTop + row * (EquipmentScene.EQUIP_H + EquipmentScene.EQUIP_GAP) + EquipmentScene.EQUIP_H / 2

        const card = this.createEquipmentCard(equip, x, y)
        this.listContainer.add(card)
        this.equipmentCards.push(card)
      }

      const equipRows = Math.ceil(displayEquip.length / EquipmentScene.EQUIP_COLS)
      curY = equipTop + equipRows * (EquipmentScene.EQUIP_H + EquipmentScene.EQUIP_GAP) + 16
    }

    if (showGems) {
      const gems = this.equipmentManager.getOwnedGems()
      curY += sectionHeader(this, this.listContainer, L, curY, `宝石 (${gems.length})`, EquipmentScene.LEFT_W)
      const gemTop = curY + 8

      for (let i = 0; i < gems.length; i++) {
        const gem = gems[i]
        const col = i % EquipmentScene.GEM_COLS
        const row = Math.floor(i / EquipmentScene.GEM_COLS)
        const x = L + col * (EquipmentScene.GEM_W + EquipmentScene.GEM_GAP) + EquipmentScene.GEM_W / 2
        const y = gemTop + row * (EquipmentScene.GEM_H + EquipmentScene.GEM_GAP) + EquipmentScene.GEM_H / 2

        const card = this.createGemCard(gem, x, y)
        this.listContainer.add(card)
        this.gemCards.push(card)
      }

      const gemRows = Math.ceil(gems.length / EquipmentScene.GEM_COLS)
      const buttonY = gemTop + gemRows * (EquipmentScene.GEM_H + EquipmentScene.GEM_GAP) + 24

      const synthBtn = createInkButton(this, L + EquipmentScene.LEFT_W / 2, buttonY, 140, 36, '宝石合成', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.ink,
        fontSize: InkFontSize.md,
        stroke: InkColor.ink,
        onClick: () => this.showGemSynthesisPanel()
      })
      this.listContainer.add(synthBtn)
      curY = buttonY + 36
    }

    const totalHeight = curY + 20
    this.maxScrollY = Math.min(0, 560 - totalHeight)
  }

  /**
   * 创建装备卡片
   */
  private createEquipmentCard(equip: EquipmentInstance, x: number, y: number): Phaser.GameObjects.Container {
    const card = this.add.container(x, y)
    const W = EquipmentScene.EQUIP_W
    const H = EquipmentScene.EQUIP_H

    // 卡片背景：纸底 + 稀有度描边
    const rarity = equip.rarity as Rarity
    const bg = this.add.rectangle(0, 0, W, H, InkColor.paperPanel, equip.isEquipped ? 1 : 0.92)
    bg.setStrokeStyle(2, INK_RARITY[rarity]?.border ?? InkColor.inkFaint)
    card.add(bg)

    const detail = this.equipmentManager.getEquipmentDetail(equip.instanceId)
    const name = detail ? detail.name : '未知装备'
    const hasImage = Boolean(detail?.image && this.textures.exists(detail.image))

    if (hasImage && detail?.image) {
      // 缩略图框（左侧 48×48）
      const thumbBg = this.add.rectangle(-48, 0, 50, 50, InkColor.paperDeep, 0.7)
      thumbBg.setStrokeStyle(1, INK_RARITY[rarity]?.border ?? InkColor.inkFaint)
      card.add(thumbBg)

      const thumb = this.add.image(-48, 0, detail.image)
      thumb.setDisplaySize(46, 46)
      card.add(thumb)

      // 右侧文字信息 (x: -16 起，左对齐)
      card.add(inkText(this, -16, -26, name, {
        size: 13,
        color: InkText.strong,
        bold: true,
        originX: 0
      }))

      card.add(inkText(this, -16, -8, `${RarityNames[rarity] ?? equip.rarity} · ${equip.type === 'weapon' ? '武器' : '神器'}`, {
        size: 10,
        color: INK_RARITY[rarity]?.text ?? InkText.faint,
        originX: 0
      }))

      // 专属标签
      if (detail.exclusiveHeroes && detail.exclusiveHeroes.length > 0) {
        const exclusiveNames = detail.exclusiveHeroes.filter(h => !h.startsWith('hero_')).join('/')
        card.add(inkText(this, -16, 8, `专:${exclusiveNames}`, {
          size: 10,
          color: InkText.cinnabar,
          bold: true,
          originX: 0
        }))
      }

      card.add(inkText(this, -16, 24, equip.isEquipped ? '已装备' : '未装备', {
        size: 10,
        color: equip.isEquipped ? InkText.green : InkText.faint,
        bold: equip.isEquipped,
        originX: 0
      }))
    } else {
      // 传统字样卡片
      const isWeapon = equip.type === 'weapon'
      card.add(inkText(this, 0, -28, isWeapon ? '武' : '神', {
        size: 18,
        color: isWeapon ? InkText.cinnabar : INK_WUXING.water.text,
        bold: true,
        originX: 0.5
      }))

      card.add(inkText(this, 0, -6, name, {
        size: InkFontSize.sm,
        color: InkText.strong,
        bold: true,
        originX: 0.5
      }))

      card.add(inkText(this, 0, 14, RarityNames[rarity] ?? equip.rarity, {
        size: InkFontSize.xs,
        color: INK_RARITY[rarity]?.text ?? InkText.faint,
        originX: 0.5
      }))

      card.add(inkText(this, 0, 32, equip.isEquipped ? '已装备' : '未装备', {
        size: InkFontSize.xs,
        color: equip.isEquipped ? InkText.green : InkText.faint,
        bold: equip.isEquipped,
        originX: 0.5
      }))
    }

    // 点击交互
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => {
      bg.setFillStyle(InkColor.paperDeep)
      card.setScale(1.03)
    })
    bg.on('pointerout', () => {
      bg.setFillStyle(InkColor.paperPanel, equip.isEquipped ? 1 : 0.92)
      card.setScale(1)
    })
    bg.on('pointerdown', () => {
      this.selectEquipment(equip)
    })

    card.setData('equipmentInstance', equip)
    return card
  }

  /**
   * 创建宝石列表（4 列网格，卡片中心坐标）
   */
  private createGemList(gridTop: number): void {
    const gems = this.equipmentManager.getOwnedGems()

    for (let i = 0; i < gems.length; i++) {
      const gem = gems[i]
      const col = i % EquipmentScene.GEM_COLS
      const row = Math.floor(i / EquipmentScene.GEM_COLS)
      const x = EquipmentScene.LEFT_X + col * (EquipmentScene.GEM_W + EquipmentScene.GEM_GAP) + EquipmentScene.GEM_W / 2
      const y = gridTop + row * (EquipmentScene.GEM_H + EquipmentScene.GEM_GAP) + EquipmentScene.GEM_H / 2

      const card = this.createGemCard(gem, x, y)
      this.gemCards.push(card)
    }
  }

  /**
   * 创建宝石卡片
   */
  private createGemCard(gem: Gem, x: number, y: number): Phaser.GameObjects.Container {
    const card = this.add.container(x, y)
    const W = EquipmentScene.GEM_W
    const H = EquipmentScene.GEM_H
    const style = INK_WUXING[gem.wuXing]

    // 背景：五行底色 + 五行描边
    const bg = this.add.rectangle(0, 0, W, H, style.fill, 0.9)
    bg.setStrokeStyle(2, style.border)
    card.add(bg)

    // 五行字
    card.add(inkText(this, 0, -18, style.label, {
      size: 16,
      color: style.text,
      bold: true,
      originX: 0.5
    }))

    // 宝石名称
    card.add(inkText(this, 0, 2, getGemName(gem), {
      size: 10,
      color: InkText.strong,
      originX: 0.5
    }))

    // 等级
    card.add(inkText(this, 0, 19, `Lv.${gem.level}`, {
      size: 11,
      color: InkText.gold,
      bold: true,
      originX: 0.5
    }))

    // 点击交互
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => {
      bg.setFillStyle(style.fill, 1)
      card.setScale(1.05)
    })
    bg.on('pointerout', () => {
      bg.setFillStyle(style.fill, 0.9)
      card.setScale(1)
    })
    bg.on('pointerdown', () => {
      this.selectGem(gem)
    })

    card.setData('gem', gem)
    return card
  }

  // ==================== 选中高亮 ====================

  /**
   * 选中装备
   */
  private selectEquipment(equip: EquipmentInstance): void {

    // 更新详情面板
    this.updateDetailPanel(equip)

    // 高亮选中卡片（印章红描边），其余恢复稀有度描边
    for (const card of this.equipmentCards) {
      const cardEquip = card.getData('equipmentInstance') as EquipmentInstance
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      if (cardEquip.instanceId === equip.instanceId) {
        bg.setStrokeStyle(2, InkColor.cinnabar)
      } else {
        bg.setStrokeStyle(2, INK_RARITY[cardEquip.rarity as Rarity]?.border ?? InkColor.inkFaint)
      }
    }

    // 清除宝石卡片高亮
    for (const card of this.gemCards) {
      const gem = card.getData('gem') as Gem
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      bg.setStrokeStyle(2, INK_WUXING[gem.wuXing].border)
    }
  }

  /**
   * 选中宝石
   */
  private selectGem(gem: Gem): void {

    // 更新详情面板
    this.updateGemDetailPanel(gem)

    // 高亮选中卡片（印章红描边），其余恢复五行描边
    for (const card of this.gemCards) {
      const cardGem = card.getData('gem') as Gem
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      if (cardGem.id === gem.id) {
        bg.setStrokeStyle(2, InkColor.cinnabar)
      } else {
        bg.setStrokeStyle(2, INK_WUXING[cardGem.wuXing].border)
      }
    }

    // 清除装备卡片高亮
    for (const card of this.equipmentCards) {
      const equip = card.getData('equipmentInstance') as EquipmentInstance
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      bg.setStrokeStyle(2, INK_RARITY[equip.rarity as Rarity]?.border ?? InkColor.inkFaint)
    }
  }

  // ==================== 宝石合成 ====================

  /**
   * 显示宝石合成弹窗
   */
  private showGemSynthesisPanel(): void {
    const dialogW = 520
    const dialogH = 440

    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.ink,
      strokeWidth: 2
    })

    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    // 标题与说明
    panel.add(inkText(this, dialogW / 2, 36, '宝石合成', {
      size: 24,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    }))

    panel.add(inkText(this, dialogW / 2, 66, '3个同级宝石可合成1个高级宝石', {
      size: InkFontSize.sm,
      color: InkText.faint,
      originX: 0.5
    }))

    // 按五行分组显示宝石
    const wuXingList: WuXing[] = ['metal', 'wood', 'water', 'fire', 'earth']
    const startY = 104
    const lineHeight = 60
    const boxW = 70
    const boxH = 44
    const boxStartX = 92

    for (let i = 0; i < wuXingList.length; i++) {
      const wuXing = wuXingList[i]
      const style = INK_WUXING[wuXing]
      const rowY = startY + i * lineHeight

      // 五行徽章
      const badge = this.add.rectangle(36, rowY, 36, 26, style.fill)
      badge.setStrokeStyle(1, style.border)
      panel.add(badge)
      panel.add(inkText(this, 36, rowY, style.label, {
        size: 14,
        color: style.text,
        bold: true,
        originX: 0.5
      }))

      // 显示1-5级宝石数量
      for (let level = 1; level <= 5; level++) {
        const count = this.equipmentManager.getGemCountByWuXingAndLevel(wuXing, level)
        const x = boxStartX + (level - 1) * (boxW + 10)
        const canSynthesize = level < 5 && count >= 3

        // 等级框（可合成时印章红描边、整体可点击）
        const gemBg = this.add.rectangle(x, rowY, boxW, boxH, style.fill, count > 0 ? 0.95 : 0.4)
        gemBg.setStrokeStyle(canSynthesize ? 2 : 1, canSynthesize ? InkColor.cinnabar : style.border)
        panel.add(gemBg)

        panel.add(inkText(this, x, rowY - 11, `Lv.${level}`, {
          size: InkFontSize.xs,
          color: InkText.faint,
          originX: 0.5
        }))

        panel.add(inkText(this, x, rowY + 8, `${count}`, {
          size: InkFontSize.md,
          color: count > 0 ? InkText.strong : InkText.faint,
          bold: true,
          originX: 0.5
        }))

        // 可合成标记
        if (canSynthesize) {
          panel.add(inkText(this, x + boxW / 2 - 8, rowY - boxH / 2 + 9, '合', {
            size: InkFontSize.xs,
            color: InkText.cinnabar,
            bold: true,
            originX: 0.5
          }))

          gemBg.setInteractive({ useHandCursor: true })
          gemBg.on('pointerover', () => gemBg.setFillStyle(InkColor.paperDeep))
          gemBg.on('pointerout', () => gemBg.setFillStyle(style.fill, count > 0 ? 0.95 : 0.4))
          gemBg.on('pointerdown', () => {
            const result = this.equipmentManager.synthesizeGems(wuXing, level)
            if (result) {
              closeAll()
              this.showGemSynthesisPanel() // 重新显示更新后的面板
              this.showMessage(`合成成功！获得 ${getGemName(result)}`)
              this.refreshGemList()
            }
          })
        }
      }
    }

    // 关闭按钮
    const closeBg = this.add.rectangle(dialogW / 2, dialogH - 34, 100, 34, InkColor.paperDeep)
    closeBg.setStrokeStyle(1, InkColor.ink)
    panel.add(closeBg)
    panel.add(inkText(this, dialogW / 2, dialogH - 34, '关闭', {
      size: InkFontSize.md,
      color: InkText.ink,
      bold: true,
      originX: 0.5
    }))

    closeBg.setInteractive({ useHandCursor: true })
    closeBg.on('pointerover', () => closeBg.setFillStyle(InkColor.paper))
    closeBg.on('pointerout', () => closeBg.setFillStyle(InkColor.paperDeep))
    closeBg.on('pointerdown', closeAll)
  }

  // ==================== 右侧详情面板 ====================

  /**
   * 创建详情面板外壳（背景为 child 0，清空重绘时不可移除）
   */
  private createDetailPanel(): void {
    this.detailPanel = createPanel(
      this,
      EquipmentScene.PANEL_X,
      EquipmentScene.PANEL_Y,
      EquipmentScene.PANEL_W,
      EquipmentScene.PANEL_H
    )

    this.detailPanel.add(inkText(this, EquipmentScene.PAD, EquipmentScene.PAD + 10, '点击左侧装备或宝石查看详情', {
      size: InkFontSize.md,
      color: InkText.faint
    }))
  }

  /**
   * 清空详情面板（保留背景层，即 child 0）
   */
  private clearDetailPanel(): void {
    if (!this.detailPanel) return
    while (this.detailPanel.length > 1) {
      this.detailPanel.removeAt(1, true)
    }
  }

  /**
   * 更新装备详情面板
   */
  private updateDetailPanel(equip: EquipmentInstance): void {
    if (!this.detailPanel) return
    this.clearDetailPanel()

    const detail = this.equipmentManager.getEquipmentDetail(equip.instanceId)
    if (!detail) return

    const PAD = EquipmentScene.PAD
    let y = EquipmentScene.PAD
    const hasImage = Boolean(detail.image && this.textures.exists(detail.image))

    if (hasImage && detail.image) {
      // 神器插画大图展示 (左侧 104×104)
      const frameX = PAD + 52
      const frameY = y + 54
      const frameBg = this.add.rectangle(frameX, frameY, 108, 108, InkColor.paperDeep, 0.7)
      frameBg.setStrokeStyle(2, INK_RARITY[detail.rarity]?.border ?? InkColor.ink)
      this.detailPanel.add(frameBg)

      const img = this.add.image(frameX, frameY, detail.image)
      img.setDisplaySize(100, 100)
      this.detailPanel.add(img)

      // 右侧信息（从 PAD + 120 开始）
      const textX = PAD + 120
      this.detailPanel.add(inkText(this, textX, y + 6, detail.name, {
        size: 22,
        color: InkText.strong,
        bold: true
      }))

      this.detailPanel.add(inkText(this, textX, y + 36, `${RarityNames[detail.rarity]} · ${equip.type === 'weapon' ? '武器' : '神器'}`, {
        size: 14,
        color: INK_RARITY[detail.rarity]?.text ?? InkText.faint
      }))

      // 专属武将展示
      if (detail.exclusiveHeroes && detail.exclusiveHeroes.length > 0) {
        const exclusiveNames = detail.exclusiveHeroes.filter(h => !h.startsWith('hero_')).join('、')
        this.detailPanel.add(inkText(this, textX, y + 60, `【专属神将】${exclusiveNames}`, {
          size: 14,
          color: InkText.cinnabar,
          bold: true
        }))
      }

      // 装备背景典故描述
      if (detail.description) {
        this.detailPanel.add(inkText(this, textX, y + 84, `“${detail.description}”`, {
          size: 12,
          color: InkText.faint
        }))
      }

      y += 122
    } else {
      // 传统文字布局
      this.detailPanel.add(inkText(this, PAD, y + 12, detail.name, {
        size: InkFontSize.lg,
        color: InkText.strong,
        bold: true
      }))
      y += 32

      this.detailPanel.add(inkText(this, PAD, y + 8, `${RarityNames[detail.rarity]} · ${equip.type === 'weapon' ? '武器' : '神器'}`, {
        size: 14,
        color: INK_RARITY[detail.rarity]?.text ?? InkText.faint
      }))
      y += 30

      if (detail.exclusiveHeroes && detail.exclusiveHeroes.length > 0) {
        const exclusiveNames = detail.exclusiveHeroes.filter(h => !h.startsWith('hero_')).join('、')
        this.detailPanel.add(inkText(this, PAD, y + 8, `【专属神将】${exclusiveNames}`, {
          size: 14,
          color: InkText.cinnabar,
          bold: true
        }))
        y += 28
      }
    }

    // 属性加成
    y += sectionHeader(this, this.detailPanel, PAD, y, '属性加成', EquipmentScene.CONTENT_W)
    const bonuses = detail.bonuses
    if (bonuses.attack) {
      this.detailPanel.add(inkText(this, PAD, y + 10, `攻击 +${bonuses.attack}`, {
        size: InkFontSize.md,
        color: InkText.cinnabar
      }))
      y += 26
    }
    if (bonuses.attackSpeed) {
      this.detailPanel.add(inkText(this, PAD, y + 10, `攻速 +${bonuses.attackSpeed.toFixed(2)}`, {
        size: InkFontSize.md,
        color: InkText.green
      }))
      y += 26
    }
    if (bonuses.attackRange) {
      this.detailPanel.add(inkText(this, PAD, y + 10, `范围 +${bonuses.attackRange}`, {
        size: InkFontSize.md,
        color: INK_WUXING.water.text
      }))
      y += 26
    }

    // 神器宝石槽
    if (equip.type === 'artifact') {
      const artifact = detail as any
      y += 12
      y += sectionHeader(this, this.detailPanel, PAD, y, '宝石槽', EquipmentScene.CONTENT_W)

      const required = artifact.gemSocket?.requiredWuXing as WuXing | undefined
      if (required) {
        this.detailPanel.add(inkText(this, PAD, y + 10, `需求: ${INK_WUXING[required].label}属性宝石`, {
          size: InkFontSize.md,
          color: INK_WUXING[required].text
        }))
      }
      y += 26

      if (artifact.gemSocket?.currentGem) {
        this.detailPanel.add(inkText(this, PAD, y + 10, '已镶嵌', {
          size: InkFontSize.md,
          color: InkText.green,
          bold: true
        }))
      } else {
        this.detailPanel.add(inkText(this, PAD, y + 10, '空槽', {
          size: InkFontSize.md,
          color: InkText.faint
        }))
      }
      y += 26
    }

    // 状态
    y += 12
    y += sectionHeader(this, this.detailPanel, PAD, y, '状态', EquipmentScene.CONTENT_W)
    if (equip.isEquipped) {
      this.detailPanel.add(inkText(this, PAD, y + 10, '已装备', {
        size: InkFontSize.md,
        color: InkText.green,
        bold: true
      }))
      y += 26
      if (equip.equippedHeroId) {
        this.detailPanel.add(inkText(this, PAD, y + 10, `装备于: ${equip.equippedHeroId}`, {
          size: InkFontSize.md,
          color: InkText.ink
        }))
      }
    } else {
      this.detailPanel.add(inkText(this, PAD, y + 10, '未装备', {
        size: InkFontSize.md,
        color: InkText.faint,
        bold: true
      }))
    }
  }

  /**
   * 更新宝石详情面板
   */
  private updateGemDetailPanel(gem: Gem): void {
    if (!this.detailPanel) return
    this.clearDetailPanel()

    const PAD = EquipmentScene.PAD
    const style = INK_WUXING[gem.wuXing]
    let y = EquipmentScene.PAD

    // 宝石名称
    this.detailPanel.add(inkText(this, PAD, y + 12, getGemName(gem), {
      size: InkFontSize.lg,
      color: InkText.strong,
      bold: true
    }))
    y += 32

    // 五行·等级
    this.detailPanel.add(inkText(this, PAD, y + 8, `${style.label} · 等级 ${gem.level}`, {
      size: 14,
      color: style.text,
      bold: true
    }))
    y += 30

    // 宝石效果
    y += sectionHeader(this, this.detailPanel, PAD, y, '宝石效果', EquipmentScene.CONTENT_W)
    const effectTexts: Record<string, string> = {
      metal: `攻击力 +${gem.level * 5}%`,
      wood: `暴击率 +${gem.level * 2}%`,
      water: `攻击速度 +${gem.level * 3}%`,
      fire: `伤害 +${gem.level * 4}%`,
      earth: `防御 +${gem.level * 6}%`
    }
    this.detailPanel.add(inkText(this, PAD, y + 10, effectTexts[gem.wuXing] || '未知效果', {
      size: InkFontSize.md,
      color: InkText.gold
    }))
    y += 34

    // 用途
    y += sectionHeader(this, this.detailPanel, PAD, y, '用途', EquipmentScene.CONTENT_W)
    this.detailPanel.add(inkText(this, PAD, y + 10, '镶嵌到对应五行神器', {
      size: InkFontSize.md,
      color: InkText.ink
    }))
    y += 26
    this.detailPanel.add(inkText(this, PAD, y + 10, '可激活神器隐藏效果', {
      size: InkFontSize.md,
      color: InkText.green
    }))
  }

  /**
   * 刷新宝石列表
   */
  private refreshGemList(): void {
    this.refreshListContent()
  }

  /**
   * 显示消息提示
   */
  private showMessage(msg: string): void {
    inkToast(this, msg)
  }

  /**
   * 自动存档
   */
  private autoSave(): void {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()

    if (!saveData) return

    // 更新装备数据到存档
    saveData.inventory.equipment = this.equipmentManager.getOwnedEquipment()
      .map(e => e.equipmentId)

    // 更新宝石数据
    saveData.inventory.gems = this.equipmentManager.getOwnedGems()

    // 保存
    saveManager.saveCurrent()
    console.log('装备页面退出，已自动存档')
  }
}
