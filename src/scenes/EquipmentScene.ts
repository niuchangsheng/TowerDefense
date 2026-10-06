import Phaser from 'phaser'
import { EquipmentManager, EquipmentInstance } from '@/core/equipment/EquipmentManager'
import {
  getGemName,
  getAffixPercentile,
  getGemQualityRating,
  GEM_STAT_LABELS,
  GEM_STAT_RANGES
} from '@/data/equipment/gems'
import {
  RarityNames,
  Rarity,
  Gem,
  GemAffix,
  GemStatType,
  WuXing,
  getAllowedGemWuXing
} from '@/types'
import { SaveManager } from '@/core/save/SaveManager'
import { GemIconRenderer, GEM_RARITY_LABELS } from '@/rendering/GemIconRenderer'
import { SoundFX } from '@/effects/SoundFX'
import {
  InkColor,
  InkText,
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
 * 【神兵宝甲】场景（极简水墨工坊）
 *
 * 职责边界（与【武将】页清晰解耦）：
 * - 佩带装备、镶嵌同源/相生灵石已归入【武将】页面（结合武将星级直观操作）；
 * - 本页专注作为纯粹的【神兵铸造 · 兵械熔炼 · 灵石合成与词条淬炼】工坊，
 *   并融合原博物志【神兵三才共鸣游标预览】与【灵石词条区间透视】。
 */
export default class EquipmentScene extends Phaser.Scene {
  private static readonly LEFT_X = 32
  private static readonly LEFT_W = 336
  private static readonly EQUIP_COLS = 2
  private static readonly EQUIP_W = 162
  private static readonly EQUIP_H = 76
  private static readonly EQUIP_GAP = 12
  private static readonly GEM_COLS = 3
  private static readonly GEM_W = 104
  private static readonly GEM_H = 78
  private static readonly GEM_GAP = 12
  private static readonly PANEL_X = 392
  private static readonly PANEL_Y = 80
  private static readonly PANEL_W = 856
  private static readonly PANEL_H = 616
  private static readonly PAD = 28
  private static readonly CONTENT_W = 800

  private equipmentManager: EquipmentManager
  private detailPanel: Phaser.GameObjects.Container | null = null
  private headerResourceContainer: Phaser.GameObjects.Container | null = null

  private currentTab: 'artifact' | 'weapon' | 'gem' = 'artifact'
  private gemWuXingFilter: WuXing | 'all' = 'all'
  private tabButtons: Phaser.GameObjects.Container[] = []
  private listContainer!: Phaser.GameObjects.Container
  private scrollY = 0
  private maxScrollY = 0

  private selectedEquipInstanceId: string | null = null
  private selectedGemId: string | null = null

  constructor() {
    super({ key: 'EquipmentScene' })
    this.equipmentManager = EquipmentManager.getInstance()
  }

  create(): void {
    drawPaperBackground(this)
    renderPageHeader(this, '神兵宝甲', '· 铸剑炼石坊')

    GemIconRenderer.init(this)

    this.renderHeaderResources()
    this.renderLeftColumn()
    this.createDetailPanel()

    createPageBackButton(this, () => {
      try {
        this.autoSave()
      } catch (e) {
        console.warn('Equipment autoSave failed:', e)
      }
      this.scene.start('TitleScene')
    })

    const allEquip = this.equipmentManager.getOwnedEquipment()
    const preferred =
      allEquip.find(e => e.equipmentId === 'artifact_qinglong') ||
      allEquip.find(e => e.type === 'artifact') ||
      allEquip[0]
    if (preferred) {
      this.selectEquipment(preferred)
    }
  }

  /**
   * 顶部右侧极简资材条 + 蒲元铸剑入口
   */
  private renderHeaderResources(): void {
    if (this.headerResourceContainer) {
      this.headerResourceContainer.destroy()
    }
    this.headerResourceContainer = this.add.container(0, 0)

    const iron = this.equipmentManager.getRefinedIron()
    const matCount = this.equipmentManager.getTotalDivineMaterialsCount()
    const dust = this.equipmentManager.getSpiritDust()

    const resText = inkText(
      this,
      1010,
      40,
      `玄铁 ${iron}   ·   神材 ${matCount}/5   ·   灵砂 ${dust}`,
      {
        size: 13,
        color: InkText.wash,
        originX: 1,
        originY: 0.5
      }
    )
    this.headerResourceContainer.add(resText)

    const forgeBtn = createInkButton(this, 1076, 40, 96, 32, '蒲元铸剑', {
      fill: InkColor.paperPanel,
      hoverFill: InkColor.paperDeep,
      textColor: InkText.cinnabar,
      fontSize: 13,
      stroke: InkColor.cinnabar,
      onClick: () => this.showPuyuanForgeDialog()
    })
    this.headerResourceContainer.add(forgeBtn)
  }

  // ==================== 左栏列表 ====================

  private renderLeftColumn(): void {
    const L = EquipmentScene.LEFT_X
    this.renderTabs(L, 84)

    this.listContainer = this.add.container(0, 124)

    const maskGfx = this.make.graphics({})
    maskGfx.fillStyle(0xffffff)
    maskGfx.fillRect(L - 4, 124, EquipmentScene.LEFT_W + 8, 572)
    this.listContainer.setMask(maskGfx.createGeometryMask())

    this.refreshListContent()

    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _go: any, _dx: number, dy: number) => {
      if (pointer.x >= L && pointer.x <= L + EquipmentScene.LEFT_W && pointer.y >= 120) {
        this.scrollY = Phaser.Math.Clamp(this.scrollY - dy * 0.5, -this.maxScrollY, 0)
        this.listContainer.y = 124 + this.scrollY
      }
    })
  }

  private renderTabs(startX: number, y: number): void {
    this.tabButtons.forEach(b => b.destroy())
    this.tabButtons = []

    const allEquip = this.equipmentManager.getOwnedEquipment()
    const artifactCount = allEquip.filter(e => e.type === 'artifact').length
    const weaponCount = allEquip.filter(e => e.type === 'weapon').length
    const gemCount = this.equipmentManager.getOwnedGems().length

    const tabs: { key: 'artifact' | 'weapon' | 'gem'; label: string }[] = [
      { key: 'artifact', label: `神兵 ${artifactCount}` },
      { key: 'weapon', label: `兵械 ${weaponCount}` },
      { key: 'gem', label: `灵石 ${gemCount}` }
    ]

    const tabW = 106
    const tabGap = 9
    tabs.forEach((t, i) => {
      const tx = startX + i * (tabW + tabGap) + tabW / 2
      const active = this.currentTab === t.key
      const btn = createInkButton(this, tx, y + 14, tabW, 28, t.label, {
        fill: active ? InkColor.paperDeep : InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        stroke: active ? InkColor.cinnabar : InkColor.inkFaint,
        textColor: active ? InkText.cinnabar : InkText.ink,
        fontSize: 13,
        onClick: () => {
          if (this.currentTab !== t.key) {
            this.currentTab = t.key
            SoundFX.bowSnap(0.2)
            this.refreshListContent()
            if (t.key === 'gem') {
              const firstGem = this.equipmentManager.getOwnedGems()[0]
              if (firstGem) this.selectGem(firstGem)
              else this.clearDetailDynamic()
            } else {
              const firstEq = this.equipmentManager
                .getOwnedEquipment()
                .find(e => e.type === t.key)
              if (firstEq) this.selectEquipment(firstEq)
              else this.clearDetailDynamic()
            }
          }
        }
      })
      this.tabButtons.push(btn)
    })
  }

  private refreshListContent(): void {
    this.renderHeaderResources()
    this.renderTabs(EquipmentScene.LEFT_X, 84)
    this.listContainer.removeAll(true)
    this.scrollY = 0
    this.listContainer.y = 124

    const L = EquipmentScene.LEFT_X
    let cursorY = 4
    const allEquip = this.equipmentManager.getOwnedEquipment()

    if (this.currentTab === 'artifact' || this.currentTab === 'weapon') {
      const filtered = allEquip.filter(e => e.type === this.currentTab)
      filtered.sort((a, b) => {
        const da = this.equipmentManager.getEquipmentDetail(a.instanceId) as any
        const db = this.equipmentManager.getEquipmentDetail(b.instanceId) as any
        const exA = this.getExclusiveHeroName(da) ? 1 : 0
        const exB = this.getExclusiveHeroName(db) ? 1 : 0
        if (exA !== exB) return exB - exA
        return Number(b.isEquipped) - Number(a.isEquipped)
      })

      filtered.forEach((equip, index) => {
        const col = index % EquipmentScene.EQUIP_COLS
        const row = Math.floor(index / EquipmentScene.EQUIP_COLS)
        const cx = L + col * (EquipmentScene.EQUIP_W + EquipmentScene.EQUIP_GAP)
        const cy = cursorY + row * (EquipmentScene.EQUIP_H + EquipmentScene.EQUIP_GAP)
        this.listContainer.add(this.createEquipmentCard(equip, cx, cy))
      })

      const rows = Math.max(1, Math.ceil(filtered.length / EquipmentScene.EQUIP_COLS))
      cursorY += rows * (EquipmentScene.EQUIP_H + EquipmentScene.EQUIP_GAP) + 10

      if (this.currentTab === 'weapon') {
        const salvageBtn = createInkButton(
          this,
          L + EquipmentScene.LEFT_W / 2,
          cursorY + 18,
          EquipmentScene.LEFT_W,
          36,
          '一键熔炼闲置兵械',
          {
            fill: InkColor.paperDeep,
            hoverFill: InkColor.paper,
            textColor: InkText.cinnabar,
            fontSize: 14,
            stroke: InkColor.cinnabar,
            onClick: () => {
              const res = this.equipmentManager.salvageAllIdleGenericWeapons()
              this.showMessage(res.message)
              if (res.count > 0) {
                SoundFX.thud(0.4)
                this.refreshListContent()
                const remain = this.equipmentManager
                  .getOwnedEquipment()
                  .filter(e => e.type === 'weapon')
                if (remain.length > 0) this.selectEquipment(remain[0])
                else this.clearDetailDynamic()
              }
            }
          }
        )
        this.listContainer.add(salvageBtn)
        cursorY += 46
      }
    } else {
      const filterItems: { key: WuXing | 'all'; label: string }[] = [
        { key: 'all', label: '全' },
        { key: 'metal', label: '金' },
        { key: 'wood', label: '木' },
        { key: 'water', label: '水' },
        { key: 'fire', label: '火' },
        { key: 'earth', label: '土' }
      ]
      const pillW = 51
      const pillGap = 6
      filterItems.forEach((f, idx) => {
        const px = L + idx * (pillW + pillGap) + pillW / 2
        const active = this.gemWuXingFilter === f.key
        const pill = createInkButton(this, px, cursorY + 12, pillW, 24, f.label, {
          fill: active ? InkColor.paperDeep : InkColor.paperPanel,
          hoverFill: InkColor.paperDeep,
          stroke: active ? InkColor.cinnabar : InkColor.inkFaint,
          textColor: active ? InkText.cinnabar : InkText.ink,
          fontSize: 12,
          onClick: () => {
            this.gemWuXingFilter = f.key
            this.refreshListContent()
          }
        })
        this.listContainer.add(pill)
      })
      cursorY += 34

      let gems = this.equipmentManager.getOwnedGems()
      if (this.gemWuXingFilter !== 'all') {
        gems = gems.filter(g => g.wuXing === this.gemWuXingFilter)
      }
      gems.sort((a, b) => b.level - a.level || a.wuXing.localeCompare(b.wuXing))

      gems.forEach((gem, index) => {
        const col = index % EquipmentScene.GEM_COLS
        const row = Math.floor(index / EquipmentScene.GEM_COLS)
        const gx = L + col * (EquipmentScene.GEM_W + EquipmentScene.GEM_GAP)
        const gy = cursorY + row * (EquipmentScene.GEM_H + EquipmentScene.GEM_GAP)
        this.listContainer.add(this.createGemCard(gem, gx, gy))
      })

      const gemRows = Math.max(1, Math.ceil(gems.length / EquipmentScene.GEM_COLS))
      cursorY += gemRows * (EquipmentScene.GEM_H + EquipmentScene.GEM_GAP) + 10

      const synthBtn = createInkButton(
        this,
        L + EquipmentScene.LEFT_W / 2,
        cursorY + 18,
        EquipmentScene.LEFT_W,
        36,
        '三合一合成',
        {
          fill: InkColor.paperDeep,
          hoverFill: InkColor.paper,
          textColor: InkText.cinnabar,
          fontSize: 14,
          stroke: InkColor.cinnabar,
          onClick: () => this.showGemSynthesisPanel()
        }
      )
      this.listContainer.add(synthBtn)
      cursorY += 46
    }

    this.maxScrollY = Math.max(0, cursorY - 560)
  }

  private getExclusiveHeroName(detail: any): string {
    if (!detail) return ''
    if (detail.exclusiveResonance?.heroName) return detail.exclusiveResonance.heroName
    if (Array.isArray(detail.exclusiveHeroes)) {
      const names = detail.exclusiveHeroes.filter((h: string) => !h.startsWith('hero_'))
      if (names.length > 0) return names.join('、')
    }
    return detail.exclusiveHero || ''
  }

  /**
   * 极简左栏装备卡（神兵含缩略图预览与专属武将）
   */
  private createEquipmentCard(
    equip: EquipmentInstance,
    x: number,
    y: number
  ): Phaser.GameObjects.Container {
    const W = EquipmentScene.EQUIP_W
    const H = EquipmentScene.EQUIP_H
    const container = this.add.container(x + W / 2, y + H / 2)
    const detail = this.equipmentManager.getEquipmentDetail(equip.instanceId) as any
    if (!detail) return container

    const rarityStyle = INK_RARITY[equip.rarity as Rarity] ?? INK_RARITY.common
    const isSelected = this.selectedEquipInstanceId === equip.instanceId
    const exclusiveName = this.getExclusiveHeroName(detail)
    const isExclusive = !!exclusiveName
    const topWuXing = detail.gemSocket?.requiredWuXing as WuXing | undefined
    const wxColor = topWuXing ? INK_WUXING[topWuXing].border : rarityStyle.border

    const bg = this.add.rectangle(
      0,
      0,
      W,
      H,
      isSelected ? InkColor.paperDeep : InkColor.paperPanel,
      0.96
    )
    bg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? InkColor.cinnabar : wxColor)
    container.add(bg)

    const hasImage = Boolean(detail.image && this.textures.exists(detail.image))

    if (equip.type === 'artifact') {
      if (hasImage) {
        const thumbX = -W / 2 + 28
        const thumbBg = this.add.rectangle(thumbX, 0, 48, 48, InkColor.paperDeep, 0.75)
        thumbBg.setStrokeStyle(1, wxColor)
        container.add(thumbBg)

        const thumb = this.add.image(thumbX, 0, detail.image)
        thumb.setDisplaySize(44, 44)
        container.add(thumb)
      }

      const textX = hasImage ? -W / 2 + 58 : -W / 2 + 12
      container.add(
        inkText(this, textX, -14, detail.name, {
          size: 13,
          color: isSelected || isExclusive ? InkText.cinnabar : InkText.strong,
          bold: true
        })
      )

      if (exclusiveName) {
        container.add(
          inkText(this, textX, 12, `专属：${exclusiveName}`, {
            size: 11,
            color: InkText.wash
          })
        )
      }
    } else {
      container.add(
        inkText(this, -W / 2 + 12, -14, detail.name, {
          size: 14,
          color: isSelected ? InkText.cinnabar : InkText.strong,
          bold: true
        })
      )

      const subTag = RarityNames[equip.rarity as Rarity] || '凡品'
      container.add(
        inkText(this, -W / 2 + 12, 12, subTag, {
          size: 11,
          color: InkText.wash
        })
      )

      if (equip.isEquipped && equip.equippedHeroId) {
        const heroName = this.equipmentManager.getEquippedHeroName(equip.equippedHeroId)
        container.add(
          inkText(this, W / 2 - 10, 12, `${heroName}佩带`, {
            size: 11,
            color: InkText.cinnabar,
            bold: true,
            originX: 1
          })
        )
      }
    }

    container.setSize(W, H)
    container.setInteractive({ useHandCursor: true })
    container.on('pointerdown', () => {
      SoundFX.bowSnap(0.2)
      this.selectEquipment(equip)
    })

    return container
  }

  /**
   * 极简左栏灵石卡
   */
  private createGemCard(gem: Gem, x: number, y: number): Phaser.GameObjects.Container {
    const W = EquipmentScene.GEM_W
    const H = EquipmentScene.GEM_H
    const container = this.add.container(x + W / 2, y + H / 2)
    const wxStyle = INK_WUXING[gem.wuXing]
    const isSelected = this.selectedGemId === gem.id
    const socketLoc = this.equipmentManager.getGemSocketLocation(gem.id)

    const bg = this.add.rectangle(
      0,
      0,
      W,
      H,
      isSelected ? InkColor.paperDeep : wxStyle.fill,
      0.95
    )
    bg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? InkColor.cinnabar : wxStyle.border)
    container.add(bg)

    const iconKey = `gem_icon_${gem.wuXing}_${gem.level}`
    if (this.textures.exists(iconKey)) {
      container.add(this.add.image(-W / 2 + 24, -6, iconKey).setScale(0.65))
    }

    container.add(
      inkText(this, -W / 2 + 44, -15, `${wxStyle.label} Lv.${gem.level}`, {
        size: 12,
        color: gem.level === 5 ? InkText.cinnabar : InkText.strong,
        bold: true
      })
    )

    container.add(
      inkText(this, -W / 2 + 44, 3, getGemName(gem), {
        size: 11,
        color: InkText.ink
      })
    )

    const statusStr = socketLoc ? `已嵌·${socketLoc.artifactName.slice(0, 2)}` : '闲置'
    container.add(
      inkText(this, 0, 23, statusStr, {
        size: 10,
        color: socketLoc ? InkText.cinnabar : InkText.faint,
        originX: 0.5
      })
    )

    container.setSize(W, H)
    container.setInteractive({ useHandCursor: true })
    container.on('pointerdown', () => {
      SoundFX.bowSnap(0.2)
      this.selectGem(gem)
    })

    return container
  }

  // ==================== 右栏详情面板 ====================

  private createDetailPanel(): void {
    this.detailPanel = createPanel(
      this,
      EquipmentScene.PANEL_X,
      EquipmentScene.PANEL_Y,
      EquipmentScene.PANEL_W,
      EquipmentScene.PANEL_H
    )
  }

  private clearDetailDynamic(): void {
    if (!this.detailPanel) return
    while (this.detailPanel.list.length > 1) {
      const child = this.detailPanel.list[this.detailPanel.list.length - 1] as any
      this.detailPanel.remove(child, true)
    }
  }

  private selectEquipment(equip: EquipmentInstance): void {
    this.selectedEquipInstanceId = equip.instanceId
    this.selectedGemId = null
    this.refreshListContent()
    this.updateDetailPanel(equip)
  }

  private selectGem(gem: Gem): void {
    this.selectedGemId = gem.id
    this.selectedEquipInstanceId = null
    this.refreshListContent()
    this.showGemDetail(gem)
  }

  private formatCleanAffix(affix: GemAffix): string {
    const label = GEM_STAT_LABELS[affix.stat]
    const val = affix.isPercentage ? `+${(affix.value * 100).toFixed(1)}%` : `+${affix.value}`
    return `${label} ${val}`
  }

  // ==================== 右栏模式 A：神兵 / 兵械详情 ====================

  private updateDetailPanel(equip: EquipmentInstance): void {
    if (!this.detailPanel) return
    const detail = this.equipmentManager.getEquipmentDetail(equip.instanceId) as any
    if (!detail) return

    this.clearDetailDynamic()
    const pad = EquipmentScene.PAD
    const contentW = EquipmentScene.CONTENT_W
    let y = 24

    if (equip.type === 'artifact') {
      this.renderCleanArtifactBody(equip, detail, pad, contentW, y)
      return
    }

    // 制式兵械顶部名片区
    const sealBox = this.add.rectangle(pad + 28, y + 26, 52, 52, InkColor.paperDeep, 0.92)
    sealBox.setStrokeStyle(1, InkColor.ink)
    this.detailPanel.add(sealBox)

    this.detailPanel.add(
      inkText(this, pad + 28, y + 26, '兵械', {
        size: 15,
        color: InkText.strong,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
    )

    this.detailPanel.add(
      inkText(this, pad + 68, y + 12, detail.name, {
        size: 22,
        color: InkText.strong,
        bold: true
      })
    )

    const bonusParts: string[] = []
    if (detail.bonuses) {
      if (detail.bonuses.attack) bonusParts.push(`攻击 +${detail.bonuses.attack}`)
      if (detail.bonuses.attackSpeed)
        bonusParts.push(`攻速 +${detail.bonuses.attackSpeed.toFixed(2)}`)
      if (detail.bonuses.attackRange) bonusParts.push(`范围 +${detail.bonuses.attackRange}`)
    }
    const subInfo = `${RarityNames[equip.rarity as Rarity]}    |    ${bonusParts.join('  ') || '无额外加成'}`
    this.detailPanel.add(
      inkText(this, pad + 68, y + 40, subInfo, {
        size: 13,
        color: InkText.wash
      })
    )

    const equippedName = equip.equippedHeroId
      ? this.equipmentManager.getEquippedHeroName(equip.equippedHeroId)
      : ''
    const statusStr = equip.isEquipped ? `当前佩带：${equippedName}` : '闲置（前往【武将】页佩带）'
    this.detailPanel.add(
      inkText(this, pad + contentW, y + 26, statusStr, {
        size: 13,
        color: equip.isEquipped ? InkText.cinnabar : InkText.faint,
        bold: equip.isEquipped,
        originX: 1
      })
    )

    y += 76
    this.renderCleanWeaponBody(equip, detail, pad, contentW, y)
  }

  /**
   * 制式兵械简洁面板
   */
  private renderCleanWeaponBody(
    equip: EquipmentInstance,
    detail: any,
    pad: number,
    contentW: number,
    y: number
  ): void {
    if (!this.detailPanel) return

    sectionHeader(this, this.detailPanel, pad, y, '兵械说明与熔炼', contentW)
    y += 38

    this.detailPanel.add(
      inkText(
        this,
        pad,
        y + 8,
        detail.description || '三国行伍制式兵器，前期过渡使用，淘汰后可熔炼为【百炼玄铁】用于铸造本命神兵。',
        {
          size: 14,
          color: InkText.ink,
          originY: 0,
          wrapWidth: contentW
        }
      )
    )

    const rarityIronMap: Record<string, number> = {
      common: 15,
      rare: 30,
      epic: 50,
      legendary: 80
    }
    const ironYield = rarityIronMap[equip.rarity] || 20

    const salvageBtn = createInkButton(
      this,
      pad + 110,
      y + 82,
      220,
      38,
      equip.isEquipped ? '已佩带（卸下后可熔炼）' : `熔炼为百炼玄铁 (+${ironYield})`,
      {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: equip.isEquipped ? InkText.faint : InkText.cinnabar,
        fontSize: 14,
        stroke: equip.isEquipped ? InkColor.inkFaint : InkColor.cinnabar,
        onClick: () => {
          const res = this.equipmentManager.salvageGenericWeapon(equip.instanceId)
          this.showMessage(res.message)
          if (res.success) {
            SoundFX.thud(0.4)
            const remain = this.equipmentManager
              .getOwnedEquipment()
              .filter(e => e.type === 'weapon')
            if (remain.length > 0) this.selectEquipment(remain[0])
            else {
              this.refreshListContent()
              this.clearDetailDynamic()
            }
          }
        }
      }
    )
    this.detailPanel.add(salvageBtn)
  }

  /**
   * 神兵详情（《名兵鉴赏卷》典藏水墨美学布局）：
   * - 顶部通栏【名兵画卷】：左侧回纹抱角神兵匣+五行篆印；右侧第一行【神兵名 + 专属腰牌】，第二行独立【神兵战法卷轴】
   * - 下方黄金分割左右双栏：
   *   - 左栏（376px）【五维器魂 · 玄铁洗练盘】：5 张宽松属性卡（大字号数值 + 品相印签 + 游标进度条 + 洗练按钮）
   *   - 右栏（408px）：上方【双槽灵石状态修改机制】（同源槽 + 相生槽双色卡），下方独立【5★ 终极大招】金朱双线宝匣
   */
  private renderCleanArtifactBody(
    equip: EquipmentInstance,
    detail: any,
    pad: number,
    contentW: number,
    startY: number
  ): void {
    if (!this.detailPanel) return

    let y = startY - 6
    const exclusiveName = this.getExclusiveHeroName(detail) || '通用'
    const resCfg = detail.exclusiveResonance
    const hasImage = Boolean(detail.image && this.textures.exists(detail.image))
    const reqWx: WuXing = detail.gemSocket?.requiredWuXing || 'wood'
    const allowedWx = getAllowedGemWuXing(reqWx)
    const sameWxStyle = INK_WUXING[allowedWx.same]
    const synWxStyle = INK_WUXING[allowedWx.generating]

    // 清理文案中冗余的前缀（如“【木系同源·青龙木毒】”、“🐉【双Lv.5终极大招·青龙啸天】”），并将 1./2./3./4. 或 ①/②/③/④ 小点自动另起一行
    const formatSlotDesc = (raw: string): string =>
      raw
        .replace(/^🐉?\s*【[^】]+】\s*/, '')
        .replace(/([^\n])\s*([①②③④]|[1-4][.、](?!\d))/g, '$1\n$2')
        .trim()

    // ==================== 1. 顶部【名兵画卷 · Hero Banner】 ====================
    const bannerH = 114
    const bannerBg = this.add.rectangle(
      pad + contentW / 2,
      y + bannerH / 2,
      contentW,
      bannerH,
      InkColor.paperDeep,
      0.65
    )
    bannerBg.setStrokeStyle(1, InkColor.inkFaint, 0.6)
    this.detailPanel.add(bannerBg)

    // 左侧神兵展示匣（94x94 + 五行光晕 + 回纹抱角 + 五行篆印）
    const frameSize = 94
    const frameX = pad + 10 + frameSize / 2
    const frameY = y + bannerH / 2
    const frameBg = this.add.rectangle(frameX, frameY, frameSize, frameSize, sameWxStyle.fill, 0.92)
    frameBg.setStrokeStyle(2, sameWxStyle.border, 0.95)
    this.detailPanel.add(frameBg)

    // 器灵内环与四角回纹抱角
    const frameGfx = this.add.graphics()
    frameGfx.lineStyle(1, sameWxStyle.border, 0.35)
    frameGfx.strokeCircle(frameX, frameY, 36)
    this.drawCornerBrackets(
      frameGfx,
      frameX - frameSize / 2 + 4,
      frameY - frameSize / 2 + 4,
      frameSize - 8,
      frameSize - 8,
      8,
      InkColor.cinnabar
    )
    this.detailPanel.add(frameGfx)

    if (hasImage && detail.image) {
      const img = this.add.image(frameX, frameY, detail.image)
      img.setDisplaySize(78, 78)
      this.detailPanel.add(img)
    } else {
      this.detailPanel.add(
        inkText(this, frameX, frameY, detail.name?.[0] || '兵', {
          size: 28,
          color: InkText.cinnabar,
          bold: true,
          originX: 0.5,
          originY: 0.5
        })
      )
    }

    // 左上角五行小篆印
    const wxSealBg = this.add.rectangle(
      frameX - frameSize / 2 + 13,
      frameY - frameSize / 2 + 13,
      20,
      20,
      sameWxStyle.border,
      1
    )
    const wxSealTxt = inkText(
      this,
      frameX - frameSize / 2 + 13,
      frameY - frameSize / 2 + 13,
      sameWxStyle.label,
      {
        size: 11,
        color: '#f4efe6',
        bold: true,
        originX: 0.5,
        originY: 0.5
      }
    )
    this.detailPanel.add([wxSealBg, wxSealTxt])

    // 右侧第一行（统一垂直中心 row1Y = y + 20）：神兵大字名 + 朱砂专属腰牌（不含技能名）+ 前往武将页按钮
    const textX = pad + 116
    const row1Y = y + 20
    const titleTxt = inkText(this, textX, row1Y, detail.name, {
      size: 22,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    this.detailPanel.add(titleTxt)

    const ownerBadgeX = textX + titleTxt.width + 14
    const ownerBadgeW = 104
    const ownerBadgeBg = this.add.rectangle(
      ownerBadgeX + ownerBadgeW / 2,
      row1Y,
      ownerBadgeW,
      22,
      InkColor.cinnabar,
      0.92
    )
    const ownerBadgeTxt = inkText(
      this,
      ownerBadgeX + ownerBadgeW / 2,
      row1Y,
      `${exclusiveName} · 本命专属`,
      {
        size: 11.5,
        color: '#f4efe6',
        bold: true,
        originX: 0.5,
        originY: 0.5
      }
    )
    this.detailPanel.add([ownerBadgeBg, ownerBadgeTxt])

    const heroId = resCfg?.heroId || detail.exclusiveHeroes?.[1]
    if (heroId) {
      const heroBtn = createInkButton(
        this,
        pad + contentW - 86,
        row1Y,
        152,
        25,
        `📜 前往${exclusiveName}页佩带 →`,
        {
          fill: InkColor.paper,
          hoverFill: InkColor.paperPanel,
          textColor: InkText.cinnabar,
          fontSize: 11.5,
          stroke: InkColor.cinnabar,
          onClick: () => {
            this.autoSave()
            this.scene.start('HeroListScene', { heroId })
          }
        }
      )
      this.detailPanel.add(heroBtn)
    }

    // 右侧第二行：神兵技能名称 + 技能说明放一起（独立墨韵内匣，全部 originY: 0 从上往下排布）
    const skillBoxTop = y + 38
    const skillBoxW = contentW - 126
    const skillBoxH = 68
    const skillBoxX = textX + skillBoxW / 2
    const skillBoxY = skillBoxTop + skillBoxH / 2
    const skillBox = this.add.rectangle(
      skillBoxX,
      skillBoxY,
      skillBoxW,
      skillBoxH,
      InkColor.paper,
      0.88
    )
    skillBox.setStrokeStyle(1, InkColor.inkFaint, 0.55)
    const skillLeftBar = this.add.rectangle(
      textX + 2,
      skillBoxY,
      4,
      skillBoxH - 2,
      InkColor.cinnabar,
      0.95
    )

    const skillName = resCfg?.hiddenSkillName || '《本命神兵技》'
    const skillDesc =
      resCfg?.evolvedSkillDesc || detail.description || '佩带后强化本命主动战法形态与威力'
    const sTitle = inkText(this, textX + 12, skillBoxTop + 6, `⚔️ 神兵技能 · ${skillName}`, {
      size: 13,
      color: InkText.cinnabar,
      bold: true,
      originX: 0,
      originY: 0
    })
    const sDesc = inkText(this, textX + 12, skillBoxTop + 26, skillDesc, {
      size: 11.5,
      color: InkText.ink,
      originX: 0,
      originY: 0,
      wrapWidth: skillBoxW - 24
    })
    this.detailPanel.add([skillBox, skillLeftBar, sTitle, sDesc])

    y += bannerH + 12

    // ==================== 下方黄金分割双栏 ====================
    const bodyH = 452
    const leftW = 376
    const rightW = contentW - leftW - 16
    const rightX = pad + leftW + 16

    // -------------------- 2. 左栏：五维器魂 · 玄铁洗练盘 --------------------
    const leftPanelBg = this.add.rectangle(
      pad + leftW / 2,
      y + bodyH / 2,
      leftW,
      bodyH,
      InkColor.paperDeep,
      0.55
    )
    leftPanelBg.setStrokeStyle(1, InkColor.inkFaint, 0.7)
    this.detailPanel.add(leftPanelBg)

    const leftHeaderBg = this.add.rectangle(
      pad + leftW / 2,
      y + 18,
      leftW,
      36,
      InkColor.paperDeep,
      0.95
    )
    leftHeaderBg.setStrokeStyle(1, InkColor.inkFaint, 0.6)
    const leftHeaderTitle = inkText(this, pad + 14, y + 18, '⚒️ 五大基础属性洗练', {
      size: 14,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const ironCount = this.equipmentManager.getRefinedIron()
    const ironBadge = inkText(this, pad + leftW - 14, y + 18, `百炼玄铁：${ironCount}`, {
      size: 12,
      color: InkText.cinnabar,
      bold: true,
      originX: 1,
      originY: 0.5
    })
    this.detailPanel.add([leftHeaderBg, leftHeaderTitle, ironBadge])

    const statAffixes = this.equipmentManager.ensureArtifactStatAffixes(equip)
    const statRowH = 70
    const statGap = 9
    const statStartY = y + 46

    statAffixes.forEach((affix, idx) => {
      const ry = statStartY + idx * (statRowH + statGap)
      const pct = getAffixPercentile(affix)
      const isHigh = pct >= 0.8
      const isMid = pct >= 0.5 && pct < 0.8

      const qualityTag =
        pct >= 0.85
          ? { text: '仙品', color: InkText.cinnabar, fill: InkColor.cinnabar }
          : pct >= 0.65
            ? { text: '极品', color: '#b45309', fill: 0xd4a017 }
            : pct >= 0.4
              ? { text: '上品', color: '#4d6b3c', fill: 0x5f7a4a }
              : { text: '凡品', color: InkText.wash, fill: InkColor.inkFaint }

      const cardW = leftW - 20
      const cardX = pad + 10
      const rowBg = this.add.rectangle(
        cardX + cardW / 2,
        ry + statRowH / 2,
        cardW,
        statRowH,
        InkColor.paper,
        0.94
      )
      rowBg.setStrokeStyle(1, isHigh ? InkColor.cinnabar : InkColor.inkFaint, isHigh ? 0.9 : 0.6)
      const rowAccent = this.add.rectangle(
        cardX + 2,
        ry + statRowH / 2,
        4,
        statRowH - 2,
        qualityTag.fill,
        0.9
      )
      this.detailPanel!.add([rowBg, rowAccent])

      // 第一行（左侧区域宽 236px，右侧洗练按钮从 cardX + 264 起，互不挤压）
      const valStr = `+${(affix.value * 100).toFixed(1)}%`
      const rangeStr = `${(affix.min * 100).toFixed(0)}%~${(affix.max * 100).toFixed(0)}%`

      const statNameTxt = inkText(this, cardX + 14, ry + 20, GEM_STAT_LABELS[affix.stat], {
        size: 13.5,
        color: InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })
      const statValTxt = inkText(this, cardX + 76, ry + 20, valStr, {
        size: 15.5,
        color: isHigh ? InkText.cinnabar : isMid ? '#8a5a18' : InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })
      const rangeTxt = inkText(
        this,
        cardX + 140,
        ry + 20,
        `${qualityTag.text} (${rangeStr})`,
        {
          size: 11,
          color: qualityTag.color,
          originX: 0,
          originY: 0.5
        }
      )
      this.detailPanel!.add([statNameTxt, statValTxt, rangeTxt])

      // 第二行：精致水墨游标进度条
      const barW = 228
      const barX = cardX + 14
      const barY = ry + 48
      const barBg = this.add.rectangle(
        barX + barW / 2,
        barY,
        barW,
        7,
        InkColor.paperDeep,
        1
      )
      barBg.setStrokeStyle(1, InkColor.inkFaint, 0.7)
      const fillW = Math.max(6, Math.round(barW * pct))
      const barFill = this.add.rectangle(
        barX + fillW / 2,
        barY,
        fillW,
        5,
        qualityTag.fill,
        0.92
      )
      const knob = this.add.circle(barX + fillW, barY, 5, qualityTag.fill, 1)
      knob.setStrokeStyle(1.5, 0xf4efe6)
      this.detailPanel!.add([barBg, barFill, knob])

      // 右侧：洗练按钮
      const reforgeBtn = createInkButton(
        this,
        cardX + cardW - 48,
        ry + statRowH / 2,
        82,
        32,
        '洗练 (10铁)',
        {
          fill: InkColor.paperDeep,
          hoverFill: InkColor.paperPanel,
          textColor: InkText.cinnabar,
          fontSize: 11,
          stroke: InkColor.cinnabar,
          onClick: () => {
            const res = this.equipmentManager.previewReforgeArtifactStat(equip.instanceId, idx)
            if (!res.success || !res.oldAffix || !res.newAffix) {
              this.showMessage(res.message)
              return
            }
            SoundFX.thud(0.35)
            this.renderHeaderResources()
            this.showArtifactReforgeChoiceDialog(equip, idx, res.oldAffix, res.newAffix)
          }
        }
      )
      this.detailPanel!.add(reforgeBtn)
    })

    // -------------------- 3. 右栏上半：双槽灵石机制（只描述状态修改机制，标注 Lv.1~5 完整数值） --------------------
    const dualHeaderBg = this.add.rectangle(
      rightX + rightW / 2,
      y + 18,
      rightW,
      36,
      InkColor.paperDeep,
      0.95
    )
    dualHeaderBg.setStrokeStyle(1, InkColor.inkFaint, 0.6)
    const dualHeaderTitle = inkText(this, rightX + 14, y + 18, '☯️ 双槽灵石 · 状态修改机制', {
      size: 14,
      color: InkText.strong,
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const dualHeaderHint = inkText(this, rightX + rightW - 14, y + 18, '数值对应 Lv.1/2/3/4/5 灵石', {
      size: 11,
      color: InkText.wash,
      originX: 1,
      originY: 0.5
    })
    this.detailPanel.add([dualHeaderBg, dualHeaderTitle, dualHeaderHint])

    const slotCards = [
      {
        wxStyle: sameWxStyle,
        slotTag: '同源槽',
        reqTag: `镶嵌${sameWxStyle.label}系灵石`,
        title: resCfg?.sameEffectTitle || '【同源强化】',
        desc: formatSlotDesc(resCfg?.sameEffectDesc || '强化本系基础元素状态持续与威力')
      },
      {
        wxStyle: synWxStyle,
        slotTag: '相生槽',
        reqTag: `镶嵌${synWxStyle.label}系灵石 (${synWxStyle.label}生${sameWxStyle.label})`,
        title: resCfg?.generatingEffectTitle || '【相生质变】',
        desc: formatSlotDesc(resCfg?.generatingEffectDesc || '强化跨属性五行相生反应机制')
      }
    ]

    const slotCardH = 116
    const slotGap = 8
    slotCards.forEach((sc, i) => {
      const cy = y + 44 + i * (slotCardH + slotGap)
      const cBg = this.add.rectangle(
        rightX + rightW / 2,
        cy + slotCardH / 2,
        rightW,
        slotCardH,
        sc.wxStyle.fill,
        0.9
      )
      cBg.setStrokeStyle(1.5, sc.wxStyle.border, 0.85)
      const leftBar = this.add.rectangle(
        rightX + 3,
        cy + slotCardH / 2,
        5,
        slotCardH - 2,
        sc.wxStyle.border,
        0.95
      )

      // 顶部标题行（统一垂直中心 cy + 16）
      const sealCircle = this.add.circle(rightX + 22, cy + 16, 11, sc.wxStyle.border, 0.92)
      const sealChar = inkText(this, rightX + 22, cy + 16, sc.wxStyle.label, {
        size: 11.5,
        color: '#f4efe6',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })

      const tTitle = inkText(this, rightX + 38, cy + 16, `${sc.slotTag} · ${sc.title}`, {
        size: 13.5,
        color: sc.wxStyle.text,
        bold: true,
        originX: 0,
        originY: 0.5
      })
      const tReq = inkText(this, rightX + rightW - 12, cy + 16, sc.reqTag, {
        size: 11,
        color: sc.wxStyle.text,
        bold: true,
        originX: 1,
        originY: 0.5
      })
      // 多行说明强制设置 originY: 0，从 cy + 32 向下排版，小点自动换行
      const tDesc = inkText(this, rightX + 14, cy + 32, sc.desc, {
        size: 11,
        color: InkText.ink,
        originX: 0,
        originY: 0,
        lineSpacing: 3,
        wrapWidth: rightW - 26
      })

      this.detailPanel!.add([cBg, leftBar, sealCircle, sealChar, tTitle, tReq, tDesc])
    })

    // -------------------- 4. 右栏下半：独立【终极大招】金朱宝匣 --------------------
    const ultY = y + 44 + 2 * (slotCardH + slotGap) + 4
    const ultH = bodyH - (ultY - y)

    const ultBg = this.add.rectangle(
      rightX + rightW / 2,
      ultY + ultH / 2,
      rightW,
      ultH,
      InkColor.paperDeep,
      0.95
    )
    ultBg.setStrokeStyle(2, 0xc89b3c, 0.95)

    // 顶部朱金丝带栏（高 30px，中心 ultY + 16）
    const ultRibbon = this.add.rectangle(
      rightX + rightW / 2,
      ultY + 16,
      rightW - 4,
      30,
      InkColor.cinnabar,
      0.92
    )
    const ultGfx = this.add.graphics()
    this.drawCornerBrackets(ultGfx, rightX + 4, ultY + 4, rightW - 8, ultH - 8, 9, 0xd4a017)

    const ultName = resCfg?.ultimateName || resCfg?.hiddenSkillName || '《圣兽法相》'
    const ultTitle = inkText(this, rightX + 14, ultY + 16, `🐉 终极大招 · ${ultName}`, {
      size: 13.5,
      color: '#fff8e1',
      bold: true,
      originX: 0,
      originY: 0.5
    })
    const ultCond = inkText(this, rightX + rightW - 12, ultY + 16, '双槽 Lv.5 觉醒', {
      size: 11,
      color: '#ffe082',
      bold: true,
      originX: 1,
      originY: 0.5
    })

    // 多行大招说明强制设置 originY: 0，从丝带下方 ultY + 38 向下排版
    const ultDescClean = formatSlotDesc(resCfg?.ultimateDesc || '召唤五行圣兽法相降临战场')
    const ultDesc = inkText(this, rightX + 14, ultY + 38, ultDescClean, {
      size: 11.5,
      color: InkText.strong,
      originX: 0,
      originY: 0,
      lineSpacing: 3,
      wrapWidth: rightW - 28
    })

    this.detailPanel.add([ultBg, ultRibbon, ultGfx, ultTitle, ultCond, ultDesc])
  }

  /**
   * 绘制古典回纹抱角装饰线
   */
  private drawCornerBrackets(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    len: number,
    color: number
  ): void {
    gfx.lineStyle(1.5, color, 0.85)
    // 左上
    gfx.lineBetween(x, y, x + len, y)
    gfx.lineBetween(x, y, x, y + len)
    // 右上
    gfx.lineBetween(x + w - len, y, x + w, y)
    gfx.lineBetween(x + w, y, x + w, y + len)
    // 左下
    gfx.lineBetween(x, y + h - len, x, y + h)
    gfx.lineBetween(x, y + h, x + len, y + h)
    // 右下
    gfx.lineBetween(x + w - len, y + h, x + w, y + h)
    gfx.lineBetween(x + w, y + h - len, x + w, y + h)
  }

  private showArtifactReforgeChoiceDialog(
    equip: EquipmentInstance,
    statIndex: number,
    oldAffix: GemAffix,
    newAffix: GemAffix
  ): void {
    const dialogW = 420
    const dialogH = 240
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.cinnabar,
      strokeWidth: 2
    })

    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    panel.add(
      inkText(this, dialogW / 2, 28, '神兵玄铁洗练结果', {
        size: 18,
        color: InkText.cinnabar,
        bold: true,
        originX: 0.5
      })
    )

    panel.add(
      inkText(this, dialogW / 2, 84, `原属性：${this.formatCleanAffix(oldAffix)}`, {
        size: 15,
        color: InkText.ink,
        originX: 0.5
      })
    )

    panel.add(
      inkText(this, dialogW / 2, 126, `新属性：${this.formatCleanAffix(newAffix)}`, {
        size: 16,
        color: InkText.cinnabar,
        bold: true,
        originX: 0.5
      })
    )

    const keepBtn = createInkButton(this, dialogW / 2 - 76, dialogH - 36, 128, 32, '保留原属性', {
      fill: InkColor.paperPanel,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 13,
      stroke: InkColor.inkFaint,
      onClick: () => {
        closeAll()
        this.updateDetailPanel(equip)
      }
    })

    const applyBtn = createInkButton(this, dialogW / 2 + 76, dialogH - 36, 128, 32, '替换为新属性', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.cinnabar,
      fontSize: 13,
      stroke: InkColor.cinnabar,
      onClick: () => {
        this.equipmentManager.applyReforgedArtifactStat(equip.instanceId, statIndex, newAffix)
        SoundFX.stamp(0.4)
        closeAll()
        this.updateDetailPanel(equip)
      }
    })

    panel.add([keepBtn, applyBtn])
  }

  // ==================== 右栏模式 B：五行灵石详情（淬炼与合成工坊） ====================

  private showGemDetail(gem: Gem): void {
    if (!this.detailPanel) return
    this.clearDetailDynamic()

    const pad = EquipmentScene.PAD
    const contentW = EquipmentScene.CONTENT_W
    const wxStyle = INK_WUXING[gem.wuXing]
    const quality = getGemQualityRating(gem)
    const socketLoc = this.equipmentManager.getGemSocketLocation(gem.id)
    let y = 20

    // 1. 顶部名片
    const iconKey = `gem_icon_${gem.wuXing}_${gem.level}`
    if (this.textures.exists(iconKey)) {
      this.detailPanel.add(this.add.image(pad + 28, y + 26, iconKey).setScale(1.05))
    }

    const rarityLabel = GEM_RARITY_LABELS[gem.level] || `Lv.${gem.level}`
    this.detailPanel.add(
      inkText(this, pad + 68, y + 14, `${getGemName(gem)}  (Lv.${gem.level})`, {
        size: 22,
        color: gem.level === 5 ? InkText.cinnabar : InkText.strong,
        bold: true,
        originX: 0,
        originY: 0.5
      })
    )

    this.detailPanel.add(
      inkText(
        this,
        pad + 68,
        y + 40,
        `${wxStyle.label}系 · ${rarityLabel}   |   品相：${quality.label}`,
        {
          size: 13,
          color: quality.color,
          bold: true,
          originX: 0,
          originY: 0.5
        }
      )
    )

    const statusStr = socketLoc
      ? `已嵌于：${socketLoc.artifactName}（${socketLoc.slotLabel}）`
      : '闲置（可在【武将】页镶嵌）'
    this.detailPanel.add(
      inkText(this, pad + contentW, y + 26, statusStr, {
        size: 13,
        color: socketLoc ? InkText.cinnabar : InkText.faint,
        bold: !!socketLoc,
        originX: 1,
        originY: 0.5
      })
    )

    y += 68

    // 2. 灵石本身属性总览条（所有武将通用生效，不在此处展示本命隐藏技能）
    const affixes = gem.affixes || []
    const statTotals = new Map<GemStatType, number>()
    for (const af of affixes) {
      statTotals.set(af.stat, (statTotals.get(af.stat) || 0) + af.value)
    }
    const totalParts: string[] = []
    statTotals.forEach((val, stat) => {
      totalParts.push(`${GEM_STAT_LABELS[stat]} +${(val * 100).toFixed(1)}%`)
    })
    const totalTextStr =
      totalParts.length > 0 ? totalParts.join('  ·  ') : '暂无属性'

    const totalTextObj = inkText(
      this,
      pad + 16,
      y + 10,
      `💎 灵石总属性：${totalTextStr}`,
      {
        size: 13,
        color: wxStyle.text,
        bold: true,
        originX: 0,
        originY: 0,
        wrapWidth: contentW - 32,
        lineSpacing: 4
      }
    )

    const subTipY = y + 10 + totalTextObj.height + 6
    const subTipObj = inkText(
      this,
      pad + 16,
      subTipY,
      '镶嵌于任意神兵槽位时，为佩带武将直接提供以上基础属性加成（不限本命武将，全武将通用生效）',
      {
        size: 11.5,
        color: InkText.wash,
        originX: 0,
        originY: 0
      }
    )

    const summaryH = Math.max(52, totalTextObj.height + subTipObj.height + 24)
    const summaryBg = this.add.rectangle(
      pad + contentW / 2,
      y + summaryH / 2,
      contentW,
      summaryH,
      wxStyle.fill,
      0.85
    )
    summaryBg.setStrokeStyle(1.5, wxStyle.border, 0.85)
    this.detailPanel.add([summaryBg, totalTextObj, subTipObj])

    y += summaryH + 14

    // 3. 灵石属性（Lv.1~4 固定 2 槽；Lv.5 可开槽至最多 5 个属性）
    const maxSlots = gem.level === 5 ? 5 : 2
    const headerTitle =
      gem.level === 5 ? `灵石属性（已开槽 ${affixes.length}/5）` : '灵石属性'

    sectionHeader(this, this.detailPanel, pad, y, headerTitle, contentW - 160)

    const rangeBtn = createInkButton(
      this,
      pad + contentW - 72,
      y + 12,
      144,
      26,
      '📊 Lv.1~5 属性区间表',
      {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paperPanel,
        textColor: InkText.cinnabar,
        fontSize: 11,
        stroke: InkColor.cinnabar,
        onClick: () => this.showGemStatRangesDialog(gem)
      }
    )
    this.detailPanel.add(rangeBtn)

    y += 34

    const rowH = gem.level === 5 ? 58 : 66
    const rowGap = gem.level === 5 ? 8 : 10

    for (let idx = 0; idx < maxSlots; idx++) {
      const ry = y + idx * (rowH + rowGap)
      const affix = affixes[idx]

      if (affix) {
        const pct = getAffixPercentile(affix)
        const isHigh = pct >= 0.8

        const rowBg = this.add.rectangle(
          pad + contentW / 2,
          ry + rowH / 2,
          contentW,
          rowH,
          InkColor.paperDeep,
          0.92
        )
        rowBg.setStrokeStyle(1, isHigh ? InkColor.cinnabar : InkColor.inkFaint)
        const leftBar = this.add.rectangle(
          pad + 2,
          ry + rowH / 2,
          4,
          rowH - 2,
          isHigh ? InkColor.cinnabar : wxStyle.border,
          0.9
        )
        this.detailPanel!.add([rowBg, leftBar])

        const valStr = `+${(affix.value * 100).toFixed(1)}%`
        const rangeStr = `区间 ${(affix.min * 100).toFixed(1)}% ~ ${(affix.max * 100).toFixed(1)}%`

        this.detailPanel!.add(
          inkText(
            this,
            pad + 18,
            ry + rowH / 2 - 10,
            `${GEM_STAT_LABELS[affix.stat]}  ${valStr}`,
            {
              size: 15,
              color: isHigh ? InkText.cinnabar : InkText.strong,
              bold: true,
              originX: 0,
              originY: 0.5
            }
          )
        )

        this.detailPanel!.add(
          inkText(this, pad + 18, ry + rowH / 2 + 12, rangeStr, {
            size: 11,
            color: InkText.wash,
            originX: 0,
            originY: 0.5
          })
        )

        const barW = 280
        const barX = pad + 260
        const barBg = this.add.rectangle(
          barX + barW / 2,
          ry + rowH / 2,
          barW,
          8,
          InkColor.paperPanel,
          1
        )
        barBg.setStrokeStyle(1, InkColor.inkFaint)
        const fillW = Math.max(4, Math.round(barW * pct))
        const barFill = this.add.rectangle(
          barX + fillW / 2,
          ry + rowH / 2,
          fillW,
          6,
          isHigh ? InkColor.cinnabar : 0x5f7a4a,
          0.9
        )
        const knob = this.add.circle(barX + fillW, ry + rowH / 2, 5, isHigh ? InkColor.cinnabar : 0x5f7a4a, 1)
        knob.setStrokeStyle(1.5, 0xf4efe6)
        this.detailPanel!.add([barBg, barFill, knob])

        const reforgeBtn = createInkButton(
          this,
          pad + contentW - 76,
          ry + rowH / 2,
          116,
          30,
          '淬炼 (20灵砂)',
          {
            fill: InkColor.paper,
            hoverFill: InkColor.paperPanel,
            textColor: InkText.cinnabar,
            fontSize: 12,
            stroke: InkColor.cinnabar,
            onClick: () => {
              const res = this.equipmentManager.previewReforgeGemAffix(gem.id, idx)
              if (!res.success || !res.oldAffix || !res.newAffix) {
                this.showMessage(res.message)
                return
              }
              SoundFX.thud(0.35)
              this.renderHeaderResources()
              this.showReforgeChoiceDialog(gem, idx, res.oldAffix, res.newAffix)
            }
          }
        )
        this.detailPanel!.add(reforgeBtn)
      } else {
        // Lv.5 灵石待开槽位（第 3 ~ 5 属性槽）
        const isNextUnlock = idx === affixes.length
        const lockBg = this.add.rectangle(
          pad + contentW / 2,
          ry + rowH / 2,
          contentW,
          rowH,
          InkColor.paperPanel,
          isNextUnlock ? 0.72 : 0.4
        )
        lockBg.setStrokeStyle(1, isNextUnlock ? InkColor.cinnabar : InkColor.inkFaint, isNextUnlock ? 0.75 : 0.45)
        this.detailPanel!.add(lockBg)

        this.detailPanel!.add(
          inkText(
            this,
            pad + 18,
            ry + rowH / 2,
            `🔒 属性槽 ${idx + 1}（5级灵石专属扩孔 · 开启后新增 1 条 Lv.5 基础属性）`,
            {
              size: 13,
              color: isNextUnlock ? InkText.ink : InkText.faint,
              bold: isNextUnlock,
              originX: 0,
              originY: 0.5
            }
          )
        )

        if (isNextUnlock) {
          const unlockBtn = createInkButton(
            this,
            pad + contentW - 76,
            ry + rowH / 2,
            116,
            30,
            '✨ 开槽 (25灵砂)',
            {
              fill: InkColor.paperDeep,
              hoverFill: InkColor.paper,
              textColor: InkText.cinnabar,
              fontSize: 12,
              stroke: InkColor.cinnabar,
              onClick: () => {
                const res = this.equipmentManager.unlockLevel5GemAffixSlot(gem.id)
                this.showMessage(res.message)
                if (res.success) {
                  SoundFX.stamp(0.45)
                  this.renderHeaderResources()
                  this.selectGem(gem)
                }
              }
            }
          )
          this.detailPanel!.add(unlockBtn)
        } else {
          this.detailPanel!.add(
            inkText(this, pad + contentW - 22, ry + rowH / 2, '请先开启上一槽位', {
              size: 11.5,
              color: InkText.faint,
              originX: 1,
              originY: 0.5
            })
          )
        }
      }
    }

    y += maxSlots * (rowH + rowGap) + 12

    // 4. 灵石升阶与分解（仅 Lv.1 ~ Lv.4 灵石可三合一升阶与分解；5级灵石已满级且不可分解）
    if (gem.level < 5) {
      sectionHeader(this, this.detailPanel, pad, y, '灵石升阶与分解', contentW)
      y += 34

      const sameCount = this.equipmentManager.getGemCountByWuXingAndLevel(gem.wuXing, gem.level)
      const canSynth = sameCount >= 3

      const synthBtn = createInkButton(
        this,
        pad + 110,
        y + 20,
        220,
        36,
        `三合一升阶 (${sameCount}/3)`,
        {
          fill: canSynth ? InkColor.paperDeep : InkColor.paperPanel,
          hoverFill: InkColor.paper,
          textColor: canSynth ? InkText.cinnabar : InkText.faint,
          fontSize: 13,
          stroke: canSynth ? InkColor.cinnabar : InkColor.inkFaint,
          onClick: () => {
            if (!canSynth) {
              this.showMessage(`需 3 颗同级${wxStyle.label}灵石（当前 ${sameCount}/3）`)
              return
            }
            SoundFX.thud(0.3)
            this.showGemSynthesizeAffixSelectDialog(gem)
          }
        }
      )
      this.detailPanel.add(synthBtn)

      const salvageBtn = createInkButton(
        this,
        pad + 310,
        y + 20,
        160,
        36,
        `分解为灵砂 (+${gem.level * 15})`,
        {
          fill: InkColor.paperPanel,
          hoverFill: InkColor.paper,
          textColor: socketLoc ? InkText.faint : InkText.ink,
          fontSize: 13,
          stroke: InkColor.inkFaint,
          onClick: () => {
            const res = this.equipmentManager.salvageGemToDust(gem.id)
            this.showMessage(res.message)
            if (res.success) {
              SoundFX.bowSnap(0.25)
              const remain = this.equipmentManager.getOwnedGems()
              if (remain.length > 0) this.selectGem(remain[0])
              else {
                this.refreshListContent()
                this.clearDetailDynamic()
              }
            }
          }
        }
      )
      this.detailPanel.add(salvageBtn)
    } else {
      this.detailPanel.add(
        inkText(
          this,
          pad + contentW / 2,
          y + 8,
          '✦ 5级传世神品灵石已达最高品阶（不可分解 · 最多可开槽拥有 5 个属性词条） ✦',
          {
            size: 12,
            color: InkText.wash,
            originX: 0.5,
            originY: 0.5
          }
        )
      )
    }
  }

  /**
   * 灵石 Lv.1 ~ Lv.5 五大属性随机区间总表弹窗（原【灵石鉴】词条上下限透视）
   */
  private showGemStatRangesDialog(gem: Gem): void {
    const dialogW = 680
    const dialogH = 380
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.ink,
      strokeWidth: 2
    })

    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    panel.add(
      inkText(this, dialogW / 2, 26, '五行灵石 · Lv.1 ~ Lv.5 词条随机区间总表', {
        size: 18,
        color: InkText.cinnabar,
        bold: true,
        originX: 0.5
      })
    )
    panel.add(
      inkText(
        this,
        dialogW / 2,
        52,
        'Lv.1~4 灵石携带 2 条属性词条；Lv.5 灵石可开槽至最多 5 条属性词条，三合一升阶时可自由选择保留想要的属性词条',
        {
          size: 12,
          color: InkText.wash,
          originX: 0.5
        }
      )
    )

    const statKeys: GemStatType[] = ['attack', 'attackSpeed', 'critRate', 'critDamage', 'attackRange']
    const colW = 104
    const startX = 132
    const tableY = 86

    // 表头：Lv.1 ~ Lv.5
    for (let lv = 1; lv <= 5; lv++) {
      const isCur = lv === gem.level
      const hx = startX + (lv - 1) * colW + colW / 2
      panel.add(
        inkText(this, hx, tableY, `Lv.${lv}${isCur ? ' (当前)' : ''}`, {
          size: 13,
          color: isCur ? InkText.cinnabar : InkText.strong,
          bold: true,
          originX: 0.5
        })
      )
    }

    statKeys.forEach((sk, rIdx) => {
      const ry = tableY + 30 + rIdx * 42
      const rowBg = this.add.rectangle(
        dialogW / 2,
        ry + 14,
        dialogW - 48,
        36,
        rIdx % 2 === 0 ? InkColor.paperDeep : InkColor.paperPanel,
        0.85
      )
      panel.add(rowBg)

      panel.add(
        inkText(this, 38, ry + 6, GEM_STAT_LABELS[sk], {
          size: 13,
          color: InkText.strong,
          bold: true
        })
      )

      for (let lv = 1; lv <= 5; lv++) {
        const rangeCfg = GEM_STAT_RANGES[sk][lv]
        const isCur = lv === gem.level
        const cx = startX + (lv - 1) * colW + colW / 2
        panel.add(
          inkText(
            this,
            cx,
            ry + 7,
            `${(rangeCfg.min * 100).toFixed(1)}% ~ ${(rangeCfg.max * 100).toFixed(1)}%`,
            {
              size: 12,
              color: isCur ? InkText.cinnabar : InkText.ink,
              bold: isCur,
              originX: 0.5
            }
          )
        )
      }
    })

    panel.add(
      createInkButton(this, dialogW / 2, dialogH - 28, 96, 30, '关闭', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 13,
        onClick: closeAll
      })
    )
  }

  // ==================== 工坊弹窗集 ====================

  private showReforgeChoiceDialog(
    gem: Gem,
    affixIndex: number,
    oldAffix: GemAffix,
    newAffix: GemAffix
  ): void {
    const dialogW = 420
    const dialogH = 240
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.cinnabar,
      strokeWidth: 2
    })

    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    panel.add(
      inkText(this, dialogW / 2, 28, '灵砂淬炼结果', {
        size: 18,
        color: InkText.cinnabar,
        bold: true,
        originX: 0.5
      })
    )

    panel.add(
      inkText(this, dialogW / 2, 84, `原词条：${this.formatCleanAffix(oldAffix)}`, {
        size: 15,
        color: InkText.ink,
        originX: 0.5
      })
    )

    panel.add(
      inkText(this, dialogW / 2, 126, `新词条：${this.formatCleanAffix(newAffix)}`, {
        size: 16,
        color: InkText.cinnabar,
        bold: true,
        originX: 0.5
      })
    )

    const keepBtn = createInkButton(this, dialogW / 2 - 76, dialogH - 36, 128, 32, '保留原词条', {
      fill: InkColor.paperPanel,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 13,
      stroke: InkColor.inkFaint,
      onClick: () => {
        closeAll()
        this.selectGem(gem)
      }
    })

    const replaceBtn = createInkButton(
      this,
      dialogW / 2 + 76,
      dialogH - 36,
      128,
      32,
      '替换新词条',
      {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.cinnabar,
        fontSize: 13,
        stroke: InkColor.cinnabar,
        onClick: () => {
          this.equipmentManager.applyReforgedGemAffix(gem.id, affixIndex, newAffix)
          SoundFX.stamp(0.45)
          closeAll()
          this.selectGem(gem)
        }
      }
    )

    panel.add([keepBtn, replaceBtn])
  }

  /**
   * 灵石三合一 · 自选保留想要的属性词条弹窗（不区分主辅石，从 3 颗灵石的全部词条中任选 2 条保留）
   */
  private showGemSynthesizeAffixSelectDialog(focusGem: Gem): void {
    const allSame = this.equipmentManager.getGemsByWuXingAndLevel(focusGem.wuXing, focusGem.level)
    if (allSame.length < 3) {
      this.showMessage(`需 3 颗同系同级灵石方可合成`)
      return
    }

    const otherGems = allSame
      .filter(g => g.id !== focusGem.id)
      .sort(
        (a, b) =>
          Number(this.equipmentManager.isGemSocketedAnywhere(a.id)) -
          Number(this.equipmentManager.isGemSocketedAnywhere(b.id))
      )
    const toConsume = [focusGem, ...otherGems.slice(0, 2)]
    const wxStyle = INK_WUXING[focusGem.wuXing]
    const nextLv = Math.min(5, focusGem.level + 1)

    // 汇总 3 颗灵石的全部候选词条
    const candidates: {
      gemIdx: number
      affix: GemAffix
      stat: GemStatType
      percentile: number
      expectedVal: number
    }[] = []

    toConsume.forEach((g, gIdx) => {
      ;(g.affixes || []).forEach(af => {
        const pct = getAffixPercentile(af)
        const nextRange = GEM_STAT_RANGES[af.stat][nextLv]
        const expVal = nextRange.min + (nextRange.max - nextRange.min) * pct
        candidates.push({
          gemIdx: gIdx + 1,
          affix: af,
          stat: af.stat,
          percentile: pct,
          expectedVal: expVal
        })
      })
    })

    // 默认预选品相最高的 2 条词条，玩家可随时点击切换任意想要的 2 条
    const sortedIndices = candidates
      .map((c, idx) => ({ idx, pct: c.percentile }))
      .sort((a, b) => b.pct - a.pct)
      .map(x => x.idx)
    let selectedIndices: number[] = sortedIndices.slice(0, 2)

    const dialogW = 600
    const dialogH = 410
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.cinnabar,
      strokeWidth: 2
    })

    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    const dynamicGroup = this.add.container(0, 0)
    panel.add(dynamicGroup)

    const renderContent = () => {
      dynamicGroup.removeAll(true)

      dynamicGroup.add(
        inkText(
          this,
          dialogW / 2,
          26,
          `${wxStyle.label}系灵石三合一（Lv.${focusGem.level} → Lv.${nextLv}）`,
          {
            size: 18,
            color: InkText.cinnabar,
            bold: true,
            originX: 0.5,
            originY: 0.5
          }
        )
      )

      dynamicGroup.add(
        inkText(
          this,
          dialogW / 2,
          52,
          `请从参与合成的 3 颗灵石词条中，点击选择想要保留的 2 条属性词条（已选 ${selectedIndices.length}/2）`,
          {
            size: 12,
            color: InkText.wash,
            originX: 0.5,
            originY: 0.5
          }
        )
      )

      // 2列 × 3行展示 6 条候选词条
      const colW = 264
      const rowH = 66
      const gapX = 16
      const gapY = 12
      const startX = (dialogW - (colW * 2 + gapX)) / 2
      const startY = 76

      candidates.slice(0, 6).forEach((cand, idx) => {
        const col = idx % 2
        const row = Math.floor(idx / 2)
        const cx = startX + col * (colW + gapX)
        const cy = startY + row * (rowH + gapY)
        const isSelected = selectedIndices.includes(idx)

        const cardBg = this.add.rectangle(
          cx + colW / 2,
          cy + rowH / 2,
          colW,
          rowH,
          isSelected ? wxStyle.fill : InkColor.paperDeep,
          0.95
        )
        cardBg.setStrokeStyle(
          isSelected ? 2 : 1,
          isSelected ? InkColor.cinnabar : InkColor.inkFaint
        )
        cardBg.setInteractive({ useHandCursor: true })
        cardBg.on('pointerdown', () => {
          SoundFX.bowSnap(0.2)
          if (isSelected) {
            if (selectedIndices.length > 1) {
              selectedIndices = selectedIndices.filter(i => i !== idx)
            }
          } else {
            if (selectedIndices.length >= 2) {
              selectedIndices = [selectedIndices[1], idx]
            } else {
              selectedIndices.push(idx)
            }
          }
          renderContent()
        })

        const checkTag = isSelected ? '☑ 已选保留' : '☐ 点击选择'
        const tagTxt = inkText(this, cx + colW - 12, cy + 18, checkTag, {
          size: 11,
          color: isSelected ? InkText.cinnabar : InkText.faint,
          bold: isSelected,
          originX: 1,
          originY: 0.5
        })

        const statTitle = inkText(
          this,
          cx + 14,
          cy + 18,
          `${GEM_STAT_LABELS[cand.stat]} +${(cand.affix.value * 100).toFixed(1)}%`,
          {
            size: 14.5,
            color: isSelected ? InkText.cinnabar : InkText.strong,
            bold: true,
            originX: 0,
            originY: 0.5
          }
        )

        const expInfo = inkText(
          this,
          cx + 14,
          cy + 44,
          `灵石 #${cand.gemIdx}  ·  升至 Lv.${nextLv} 预计 +${(cand.expectedVal * 100).toFixed(1)}%`,
          {
            size: 11,
            color: isSelected ? wxStyle.text : InkText.wash,
            originX: 0,
            originY: 0.5
          }
        )

        dynamicGroup.add([cardBg, statTitle, tagTxt, expInfo])
      })

      // 底部预览条
      const previewY = 324
      const previewStr =
        selectedIndices.length === 2
          ? `升阶后保留：${selectedIndices
              .map(
                i =>
                  `${GEM_STAT_LABELS[candidates[i].stat]} (+${(candidates[i].expectedVal * 100).toFixed(1)}%)`
              )
              .join('  +  ')}`
          : '请选满 2 条想要保留的属性词条'

      dynamicGroup.add(
        inkText(this, dialogW / 2, previewY, previewStr, {
          size: 13.5,
          color: selectedIndices.length === 2 ? InkText.strong : InkText.cinnabar,
          bold: true,
          originX: 0.5,
          originY: 0.5
        })
      )

      const cancelBtn = createInkButton(this, dialogW / 2 - 86, dialogH - 34, 120, 34, '取消', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 13,
        stroke: InkColor.inkFaint,
        onClick: closeAll
      })

      const canConfirm = selectedIndices.length === 2
      const confirmBtn = createInkButton(
        this,
        dialogW / 2 + 86,
        dialogH - 34,
        148,
        34,
        `确认合成 Lv.${nextLv}`,
        {
          fill: canConfirm ? InkColor.paperDeep : InkColor.paperPanel,
          hoverFill: InkColor.paper,
          textColor: canConfirm ? InkText.cinnabar : InkText.faint,
          fontSize: 13,
          stroke: canConfirm ? InkColor.cinnabar : InkColor.inkFaint,
          onClick: () => {
            if (!canConfirm) {
              this.showMessage('请选择 2 条想要保留的属性词条')
              return
            }
            const chosenAffixes = selectedIndices.map(i => ({
              stat: candidates[i].stat,
              percentile: candidates[i].percentile
            }))
            const newGem = this.equipmentManager.synthesizeGems(
              focusGem.wuXing,
              focusGem.level,
              focusGem.id,
              chosenAffixes,
              toConsume.map(g => g.id)
            )
            if (newGem) {
              SoundFX.stamp(0.45)
              closeAll()
              this.showMessage(`升阶成功：${getGemName(newGem)} Lv.${newGem.level}`)
              this.currentTab = 'gem'
              this.selectGem(newGem)
            }
          }
        }
      )

      dynamicGroup.add([cancelBtn, confirmBtn])
    }

    renderContent()
  }

  private showGemSynthesisPanel(): void {
    const wuXings: WuXing[] = ['metal', 'wood', 'water', 'fire', 'earth']
    const groups: { wuXing: WuXing; level: number; gems: Gem[] }[] = []

    wuXings.forEach(wx => {
      for (let lv = 1; lv < 5; lv++) {
        const g = this.equipmentManager.getGemsByWuXingAndLevel(wx, lv)
        if (g.length >= 3) groups.push({ wuXing: wx, level: lv, gems: g })
      }
    })

    const dialogW = 520
    const dialogH = 380
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.ink,
      strokeWidth: 2
    })

    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    panel.add(
      inkText(this, dialogW / 2, 28, '灵石三合一（自由选择保留词条）', {
        size: 18,
        color: InkText.cinnabar,
        bold: true,
        originX: 0.5
      })
    )

    if (groups.length === 0) {
      panel.add(
        inkText(this, dialogW / 2, dialogH / 2, '暂无满 3 颗的同系同级灵石可供合成', {
          size: 14,
          color: InkText.faint,
          originX: 0.5
        })
      )
    } else {
      const startY = 72
      const rowH = 76
      groups.slice(0, 3).forEach((grp, idx) => {
        const ry = startY + idx * (rowH + 10)
        const wxStyle = INK_WUXING[grp.wuXing]

        const rowBg = this.add.rectangle(
          dialogW / 2,
          ry + rowH / 2,
          dialogW - 40,
          rowH,
          wxStyle.fill,
          0.9
        )
        rowBg.setStrokeStyle(1, wxStyle.border)
        panel.add(rowBg)

        panel.add(
          inkText(
            this,
            36,
            ry + 22,
            `${wxStyle.label}系 Lv.${grp.level} → Lv.${grp.level + 1}（当前拥有 ${grp.gems.length} 颗）`,
            {
              size: 14,
              color: InkText.strong,
              bold: true,
              originX: 0,
              originY: 0.5
            }
          )
        )

        const allStatsPreview = grp.gems
          .slice(0, 3)
          .map(
            (g, gIdx) =>
              `#${gIdx + 1}[${g.affixes?.map(a => GEM_STAT_LABELS[a.stat].replace('攻击', '攻').replace('暴击', '暴')).join('+') || ''}]`
          )
          .join('  ')

        panel.add(
          inkText(this, 36, ry + 50, `候选词条池：${allStatsPreview}`, {
            size: 11.5,
            color: InkText.wash,
            originX: 0,
            originY: 0.5
          })
        )

        const synthBtn = createInkButton(
          this,
          dialogW - 88,
          ry + rowH / 2,
          116,
          32,
          '选词条合成',
          {
            fill: InkColor.paper,
            hoverFill: InkColor.paperDeep,
            textColor: InkText.cinnabar,
            fontSize: 12.5,
            stroke: InkColor.cinnabar,
            onClick: () => {
              closeAll()
              this.showGemSynthesizeAffixSelectDialog(grp.gems[0])
            }
          }
        )
        panel.add(synthBtn)
      })
    }

    panel.add(
      createInkButton(this, dialogW / 2, dialogH - 26, 88, 28, '关闭', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 12,
        onClick: closeAll
      })
    )
  }

  private showPuyuanForgeDialog(): void {
    const dialogW = 580
    const dialogH = 430
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.ink,
      strokeWidth: 2
    })

    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    panel.add(
      inkText(
        this,
        dialogW / 2,
        28,
        `蒲元铸剑坊（当前百炼玄铁：${this.equipmentManager.getRefinedIron()}）`,
        {
          size: 18,
          color: InkText.cinnabar,
          bold: true,
          originX: 0.5
        }
      )
    )

    const recipes = EquipmentManager.DIVINE_FORGE_RECIPES
    const startY = 66
    const rowH = 56

    recipes.forEach((r, idx) => {
      const ry = startY + idx * (rowH + 6)
      const isOwned = this.equipmentManager.hasOwnedEquipmentId(r.artifactId)
      const matCount = this.equipmentManager.getDivineMaterialCount(r.materialId)
      const wxStyle = INK_WUXING[r.wuXing]

      const rowBg = this.add.rectangle(
        dialogW / 2,
        ry + rowH / 2,
        dialogW - 40,
        rowH,
        isOwned ? InkColor.paperDeep : wxStyle.fill,
        0.9
      )
      rowBg.setStrokeStyle(1, isOwned ? InkColor.cinnabar : wxStyle.border)
      panel.add(rowBg)

      panel.add(
        inkText(this, 36, ry + 16, `${r.artifactName}  ·  ${r.heroName}专属`, {
          size: 14,
          color: InkText.strong,
          bold: true
        })
      )

      panel.add(
        inkText(
          this,
          36,
          ry + 38,
          `主材：${r.materialName} (${matCount}/1)  ·  玄铁 ${r.ironCost}  ·  ${r.bossName}`,
          {
            size: 11,
            color: InkText.wash
          }
        )
      )

      const actBtn = createInkButton(
        this,
        dialogW - 76,
        ry + rowH / 2,
        88,
        28,
        isOwned ? '已铸成' : '铸造',
        {
          fill: isOwned ? InkColor.paperPanel : InkColor.paper,
          hoverFill: InkColor.paperDeep,
          textColor: InkText.cinnabar,
          fontSize: 12,
          stroke: InkColor.cinnabar,
          onClick: () => {
            if (isOwned) {
              const inst = this.equipmentManager
                .getOwnedEquipment()
                .find(e => e.equipmentId === r.artifactId)
              if (inst) {
                closeAll()
                this.currentTab = 'artifact'
                this.selectEquipment(inst)
              }
            } else {
              const res = this.equipmentManager.forgeExclusiveArtifact(r.materialId)
              this.showMessage(res.message)
              if (res.success && res.instance) {
                SoundFX.stamp(0.45)
                closeAll()
                this.currentTab = 'artifact'
                this.selectEquipment(res.instance)
              }
            }
          }
        }
      )
      panel.add(actBtn)
    })

    panel.add(
      createInkButton(this, dialogW / 2, dialogH - 24, 88, 28, '关闭', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 12,
        onClick: closeAll
      })
    )
  }

  private showMessage(msg: string): void {
    inkToast(this, msg)
  }

  private autoSave(): void {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()
    if (!saveData || !saveData.inventory) return

    saveData.inventory.equipment = this.equipmentManager
      .getOwnedEquipment()
      .map(e => e.equipmentId)
    saveData.inventory.gems = this.equipmentManager.getOwnedGems()
    saveManager.saveCurrent()
  }
}
