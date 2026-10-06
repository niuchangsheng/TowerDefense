import Phaser from 'phaser'
import { getSkill } from '@/data/skills'
import { AUGMENT_POOL } from '@/data/augments'
import { SoundFX } from '@/effects/SoundFX'
import {
  Hero,
  RarityNames,
  Rarity,
  WuXing,
  WuXingGeneratedBy,
  Gem,
  GemAffix
} from '@/types'
import { EquipmentManager, EquipmentInstance } from '@/core/equipment/EquipmentManager'
import { getGemName, GEM_STAT_LABELS } from '@/data/equipment/gems'
import { artifacts } from '@/data/equipment'
import { GemIconRenderer } from '@/rendering/GemIconRenderer'
import {
  MAX_HERO_LEVEL,
  getExpToNextLevel,
  getExpProgress,
  getExpRequiredForLevel,
  getTotalInvestedExp,
  getLevelStatBonus,
  calculateLevelFromExp
} from '@/data/heroes/levelConfig'
import {
  getStarAttachmentRate,
  getStarDeploymentCostReduction,
  getHeroConfig,
  STAR_DESTINY_NODES
} from '@/data/heroes'
import { DamageCalculator } from '@/core/battle/DamageCalculator'
import { SaveManager } from '@/core/save/SaveManager'
import {
  InkColor,
  InkText,
  InkFontSize,
  InkRadius,
  InkDepth,
  INK_WUXING,
  INK_RARITY,
  drawPaperBackground,
  createPanel,
  inkText,
  inkRule,
  sectionHeader,
  createInkButton,
  renderPageHeader,
  createPageBackButton,
  inkToast,
  createInkDialog
} from '@/ui/InkTheme'

/**
 * 【武将】页面场景（严格对齐 `docs/Wuxing_System_Design.md` 第四、五章）
 *
 * 极简一屏设计（融合原【名将录】四阶技能演武沙盒与本命锦囊跳转）：
 * - 左栏（336px）：五虎上将名册（全员平权 · 显示五行、星级、等级与实际部署军费）
 * - 右栏（848×616 一屏四段）：
 *   1. 名将名片与五大基础属性（攻击 / 攻速 / 射程 / 暴率 / 暴伤，严守局外 ≤ +50% 铁律）
 *   2. 将星命盘（1★~5★ 机制解锁节点 + 名将传记试炼领将魂 + 点亮命星）
 *   3. 军备佩带与灵石镶嵌（上排：兵械槽 + 神兵槽；下排：2★同源灵石槽 + 4★相生灵石槽）
 *   4. 武将技能与神兵进化（主动战法 + 被动 + 5★大招 + 【⚔️四阶技能演武沙盒】 + 【🎴本命锦囊】）
 */
export default class HeroListScene extends Phaser.Scene {
  private static readonly ROSTER_X = 32
  private static readonly ROSTER_WIDTH = 336
  private static readonly CARD_WIDTH = 336
  private static readonly CARD_HEIGHT = 104
  private static readonly CARD_GAP = 12
  private static readonly CARD_FIRST_TOP = 120
  private static readonly PANEL_X = 400
  private static readonly PANEL_Y = 80
  private static readonly PANEL_WIDTH = 848
  private static readonly PANEL_HEIGHT = 616
  private static readonly PANEL_PAD = 24
  private static readonly CONTENT_WIDTH = 800

  private heroes!: Map<string, Hero>
  private selectedHeroId: string | null = null
  private initialHeroId: string | null = null
  private inspectedStar: number | null = null
  private sandboxTier: 1 | 2 | 3 | 4 = 1
  private activeSkillExpanded = false
  private passiveSkillExpanded = false
  private heroCards: Phaser.GameObjects.Container[] = []
  private detailPanel: Phaser.GameObjects.Container | null = null
  private equipmentManager: EquipmentManager
  private claimedBioTrials: Set<string> = new Set()

  constructor() {
    super({ key: 'HeroListScene' })
    this.equipmentManager = EquipmentManager.getInstance()
  }

  init(data?: { heroId?: string }): void {
    const saveManager = SaveManager.getInstance()
    const currentSave = saveManager.getCurrentSave()
    this.claimedBioTrials = new Set(currentSave?.claimedBioTrials || [])
    this.heroes = saveManager.loadHeroes()
    this.initialHeroId = data?.heroId || null
    this.selectedHeroId = null
    this.inspectedStar = null
    this.activeSkillExpanded = false
    this.passiveSkillExpanded = false
    this.heroCards = []
    this.detailPanel = null
  }

  create(): void {
    drawPaperBackground(this)
    GemIconRenderer.init(this)

    renderPageHeader(this, '武将', '· 五虎将星录')
    this.renderRoster()
    this.createDetailPanelShell()
    this.createBackButton()

    const targetHero =
      (this.initialHeroId && this.heroes.get(this.initialHeroId)) ||
      Array.from(this.heroes.values())[0]
    if (targetHero) {
      this.selectHero(targetHero.id)
    }
  }

  private createBackButton(): void {
    createPageBackButton(this, () => {
      try {
        this.autoSave()
      } catch (e) {
        console.warn('HeroList autoSave failed:', e)
      }
      this.scene.start('TitleScene')
    })
  }

  // ==================== 左侧五虎名册 ====================

  private renderRoster(): void {
    const L = HeroListScene.ROSTER_X
    this.heroCards.forEach(c => c.destroy())
    this.heroCards = []

    inkText(this, L, 96, `五虎上将（${this.heroes.size}）`, {
      size: 18,
      color: InkText.strong,
      bold: true
    })
    inkRule(this, null, L, 110, HeroListScene.ROSTER_WIDTH, 0.35)

    const heroList = Array.from(this.heroes.values())
    for (let i = 0; i < heroList.length; i++) {
      const hero = heroList[i]
      const top =
        HeroListScene.CARD_FIRST_TOP + i * (HeroListScene.CARD_HEIGHT + HeroListScene.CARD_GAP)
      const card = this.createRosterCard(hero, L, top)
      this.heroCards.push(card)
    }
  }

  private createRosterCard(hero: Hero, x: number, y: number): Phaser.GameObjects.Container {
    const W = HeroListScene.CARD_WIDTH
    const H = HeroListScene.CARD_HEIGHT
    const card = this.add.container(x, y)
    const cfg = getHeroConfig(hero.id)

    const bg = this.add.rectangle(W / 2, H / 2, W, H, InkColor.paperPanel)
    bg.setStrokeStyle(1, InkColor.ink, 0.5)
    card.add(bg)

    const stripe = this.add.rectangle(2, H / 2, 4, H - 2, InkColor.cinnabar)
    stripe.setVisible(false)
    card.add(stripe)

    const imageKey = this.getHeroImageKey(hero.id)
    if (this.textures.exists(imageKey)) {
      const avatar = this.add.image(14 + 38, 14 + 38, imageKey)
      avatar.setDisplaySize(76, 76)
      card.add(avatar)
    }

    // 姓名 + 五行小标
    card.add(
      inkText(this, 104, 22, hero.name, {
        size: 18,
        color: InkText.strong,
        bold: true
      })
    )
    this.createWuXingBadge(card, 154, 11, hero.wuXing, 22)

    // 右上：星级
    card.add(
      inkText(this, 320, 22, `${'★'.repeat(hero.star)}${'☆'.repeat(5 - hero.star)}`, {
        size: 14,
        color: InkText.gold,
        originX: 1
      })
    )

    // 左下：等级 + 军费
    const baseCost = cfg?.deploymentCost ?? hero.deploymentCost ?? 12
    const actualCost = baseCost - getStarDeploymentCostReduction(hero.star)
    card.add(
      inkText(this, 104, 54, `Lv.${hero.level}   ·   军费 ${actualCost}`, {
        size: 13,
        color: InkText.wash,
        bold: true
      })
    )

    // 底部：极简装备/宝石/升星状态
    const heroEquip = this.equipmentManager.getHeroEquipment(hero.id)
    const evo = heroEquip.artifact
      ? this.equipmentManager.getArtifactEvolutionStage(heroEquip.artifact.instanceId)
      : null
    const gemCount = (evo?.sameGem ? 1 : 0) + (evo?.generatingGem ? 1 : 0)
    const equipCount = (heroEquip.weapon ? 1 : 0) + (heroEquip.artifact ? 1 : 0)
    const soulStones = this.getSoulStones(hero.id)
    const required = hero.star < 5 ? hero.starUpgradeRequirements[hero.star - 1] || 1 : 0
    const canUpgrade = hero.star < 5 && soulStones >= required

    card.add(
      inkText(this, 104, 80, `装备 ${equipCount}/2  ·  宝石 ${gemCount}/2`, {
        size: 12,
        color: equipCount + gemCount > 0 ? InkText.green : InkText.faint
      })
    )

    if (canUpgrade) {
      card.add(
        inkText(this, 320, 80, '● 可升星', {
          size: 12,
          color: InkText.cinnabar,
          bold: true,
          originX: 1
        })
      )
    }

    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => {
      if (hero.id !== this.selectedHeroId) bg.setFillStyle(InkColor.paperDeep)
    })
    bg.on('pointerout', () => {
      if (hero.id !== this.selectedHeroId) bg.setFillStyle(InkColor.paperPanel)
    })
    bg.on('pointerdown', () => this.selectHero(hero.id))

    card.setData('heroId', hero.id)
    card.setData('stripe', stripe)
    return card
  }

  private createWuXingBadge(
    parent: Phaser.GameObjects.Container,
    x: number,
    y: number,
    wuXing: WuXing,
    h: number
  ): void {
    const w = 44
    const theme = INK_WUXING[wuXing]

    const bg = this.add.graphics()
    bg.fillStyle(theme.fill, 1)
    bg.fillRoundedRect(x, y, w, h, InkRadius.sm)
    bg.lineStyle(1, theme.border, 1)
    bg.strokeRoundedRect(x, y, w, h, InkRadius.sm)
    parent.add(bg)

    parent.add(
      inkText(this, x + w / 2, y + h / 2, theme.label, {
        size: 13,
        color: theme.text,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
    )
  }

  private selectHero(heroId: string): void {
    if (this.selectedHeroId !== heroId) {
      this.inspectedStar = null
      this.activeSkillExpanded = false
      this.passiveSkillExpanded = false
    }
    this.selectedHeroId = heroId
    this.updateCardSelection()
    this.updateDetailPanel(heroId)
  }

  private updateCardSelection(): void {
    for (const card of this.heroCards) {
      const cardHeroId = card.getData('heroId') as string
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      const stripe = card.getData('stripe') as Phaser.GameObjects.Rectangle
      const selected = cardHeroId === this.selectedHeroId

      if (selected) {
        bg.setFillStyle(0xe2d7bc, 1)
        bg.setStrokeStyle(2, InkColor.cinnabar)
      } else {
        bg.setFillStyle(InkColor.paperPanel, 1)
        bg.setStrokeStyle(1, InkColor.ink, 0.5)
      }
      stripe.setVisible(selected)
    }
  }

  // ==================== 右侧极简面板（一眼看清：等级/星级 · 属性 · 装备/宝石 · 技能阶段） ====================

  private createDetailPanelShell(): void {
    this.detailPanel = createPanel(
      this,
      HeroListScene.PANEL_X,
      HeroListScene.PANEL_Y,
      HeroListScene.PANEL_WIDTH,
      HeroListScene.PANEL_HEIGHT,
      {
        fill: InkColor.paperPanel,
        alpha: 0.65,
        stroke: InkColor.ink,
        strokeWidth: 1,
        radius: InkRadius.md
      }
    )
  }

  private updateDetailPanel(heroId: string): void {
    const hero = this.heroes.get(heroId)
    if (!hero || !this.detailPanel) return
    const panel = this.detailPanel

    while (panel.length > 1) {
      panel.removeAt(1, true)
    }

    let y = 16
    y = this.renderHeroHeaderAndStats(panel, hero, y)
    y += 10
    y = this.renderEquipmentAndGemSection(panel, hero, y)
    y += 10
    this.renderLiveSkillsSection(panel, hero, y)
  }

  /**
   * 第一区：一眼看清【等级】【星级】与【五大属性】（点击等级/星级/属性按需查看经验、碎片差距与加成明细）
   */
  private renderHeroHeaderAndStats(
    panel: Phaser.GameObjects.Container,
    hero: Hero,
    y: number
  ): number {
    const cfg = getHeroConfig(hero.id)
    const wxTheme = INK_WUXING[hero.wuXing]
    const imageKey = this.getHeroImageKey(hero.id)

    // 左侧头像（64×64）
    const avatarFrame = this.add.rectangle(24 + 32, y + 32, 66, 66, InkColor.paperDeep, 0.85)
    avatarFrame.setStrokeStyle(1.5, wxTheme.border)
    panel.add(avatarFrame)

    if (this.textures.exists(imageKey)) {
      const avatar = this.add.image(24 + 32, y + 32, imageKey)
      avatar.setDisplaySize(62, 62)
      panel.add(avatar)
    }

    // 姓名 + 五行印章
    const nameText = inkText(this, 104, y + 18, hero.name, {
      size: 22,
      color: InkText.strong,
      bold: true
    })
    panel.add(nameText)
    this.createWuXingBadge(panel, 104 + nameText.width + 10, y + 7, hero.wuXing, 21)

    // 重点 1：大号【等级】胶囊按钮（点击查看当前经验、升级差多少经验、无损传功）
    const lvPillX = 236
    const lvPillY = y + 18
    const lvBtn = createInkButton(
      this,
      lvPillX + 62,
      lvPillY,
      124,
      28,
      `Lv.${hero.level} 武道  ▾`,
      {
        fill: InkColor.paperDeep,
        hoverFill: 0xc5b795,
        textColor: InkText.strong,
        fontSize: 14,
        stroke: InkColor.ink,
        onClick: () => this.showLevelDetailDialog(hero)
      }
    )
    panel.add(lvBtn)

    // 重点 2：大号【星级】胶囊按钮（点击查看差多少碎片升下一星、领将魂、点亮命星）
    const soulStones = this.getSoulStones(hero.id)
    const required = hero.star < 5 ? hero.starUpgradeRequirements[hero.star - 1] || 1 : 0
    const canUpgrade = hero.star < 5 && soulStones >= required
    const starStr = `${'★'.repeat(hero.star)}${'☆'.repeat(5 - hero.star)}`
    const starLabel = canUpgrade ? `${starStr} 可升星!` : `${starStr} ${hero.star}★  ▾`

    const starBtn = createInkButton(this, 456, lvPillY, 164, 28, starLabel, {
      fill: canUpgrade ? InkColor.cinnabar : InkColor.paperDeep,
      hoverFill: canUpgrade ? 0xb2362e : 0xc5b795,
      textColor: canUpgrade ? InkText.paper : InkText.gold,
      fontSize: 13.5,
      stroke: canUpgrade ? InkColor.cinnabar : 0xa0782f,
      onClick: () => this.showStarDestinyDetailDialog(hero)
    })
    panel.add(starBtn)

    // 右侧精简核心战斗标签：军费 & 普攻五行附着率
    const baseCost = cfg?.deploymentCost ?? hero.deploymentCost ?? 12
    const actualCost = baseCost - getStarDeploymentCostReduction(hero.star)
    const attachPct = Math.round(getStarAttachmentRate(hero.star) * 100)
    panel.add(
      inkText(this, 824, lvPillY, `军费 ${actualCost}   ·   普攻附着 ${attachPct}%`, {
        size: 13.5,
        color: InkText.wash,
        bold: true,
        originX: 1
      })
    )

    // 副行：极简一行提示（点击上方按钮可看经验/碎片详情）
    const diffStones = Math.max(0, required - soulStones)
    const quickSub =
      hero.star < 5
        ? canUpgrade
          ? `✨ 将魂已满 (${soulStones}/${required})，点击【${hero.star}★】按钮立即升至 ${hero.star + 1}★`
          : `将魂 ${soulStones}/${required}（升 ${hero.star + 1}★ 还差 ${diffStones} 碎片 · 点击星级免费领传记碎片）`
        : '★ 已满 5★  ·  点击等级或属性卡片可查看详细数值构成'
    panel.add(
      inkText(this, 104, y + 48, quickSub, {
        size: 11.5,
        color: canUpgrade ? InkText.cinnabar : InkText.faint
      })
    )

    // 重点 3：五大基础属性大字卡（只突出属性名 + 大号数值 + 增益百分比，点击按需看来源明细）
    const statRowY = y + 72
    const cardW = 152
    const cardH = 54
    const cardGap = 10
    const stats = this.getEffectiveStatsWithEquipment(hero)

    const atkGainPct =
      hero.baseStats.attack > 0
        ? Math.round(((stats.attack - hero.baseStats.attack) / hero.baseStats.attack) * 100)
        : 0
    const spdGainPct =
      hero.baseStats.attackSpeed > 0
        ? Math.round(
            ((stats.attackSpeed - hero.baseStats.attackSpeed) / hero.baseStats.attackSpeed) * 100
          )
        : 0
    const rngGainPct =
      hero.baseStats.attackRange > 0
        ? Math.round(
            ((stats.attackRange - hero.baseStats.attackRange) / hero.baseStats.attackRange) * 100
          )
        : 0
    const baseCritRatePct = Math.round((hero.baseStats.critRate ?? 0.1) * 100)
    const baseCritDmgPct = Math.round((hero.baseStats.critDamage ?? 0.5) * 100)
    const curCritRatePct = Math.round(stats.critRate * 100)
    const curCritDmgPct = Math.round(stats.critDamage * 100)

    const statCards = [
      {
        label: '攻击力',
        val: `${stats.attack}`,
        gain: atkGainPct > 0 ? `+${atkGainPct}%` : '',
        color: InkText.strong
      },
      {
        label: '攻击速度',
        val: `${stats.attackSpeed.toFixed(2)}/s`,
        gain: spdGainPct > 0 ? `+${spdGainPct}%` : '',
        color: InkText.strong
      },
      {
        label: '攻击范围',
        val: `${stats.attackRange}`,
        gain: rngGainPct > 0 ? `+${rngGainPct}%` : '',
        color: InkText.strong
      },
      {
        label: '暴击几率',
        val: `${curCritRatePct}%`,
        gain: curCritRatePct > baseCritRatePct ? `+${curCritRatePct - baseCritRatePct}%` : '',
        color: InkText.cinnabar
      },
      {
        label: '暴击伤害',
        val: `+${curCritDmgPct}%`,
        gain: curCritDmgPct > baseCritDmgPct ? `+${curCritDmgPct - baseCritDmgPct}%` : '',
        color: InkText.gold
      }
    ]

    statCards.forEach((sc, idx) => {
      const cx = 24 + idx * (cardW + cardGap)
      const bg = this.add.rectangle(
        cx + cardW / 2,
        statRowY + cardH / 2,
        cardW,
        cardH,
        InkColor.paperDeep,
        0.65
      )
      bg.setStrokeStyle(1, sc.gain ? InkColor.cinnabar : InkColor.inkFaint, 0.6)
      bg.setInteractive({ useHandCursor: true })
      bg.on('pointerover', () => bg.setFillStyle(0xe2d7bc, 0.95))
      bg.on('pointerout', () => bg.setFillStyle(InkColor.paperDeep, 0.65))
      bg.on('pointerdown', () => this.showStatBreakdownDialog(hero))
      panel.add(bg)

      panel.add(
        inkText(this, cx + 10, statRowY + 15, sc.label, {
          size: 11.5,
          color: InkText.wash
        })
      )
      if (sc.gain) {
        panel.add(
          inkText(this, cx + cardW - 10, statRowY + 15, sc.gain, {
            size: 11,
            color: InkText.green,
            bold: true,
            originX: 1
          })
        )
      }
      panel.add(
        inkText(this, cx + 10, statRowY + 37, sc.val, {
          size: 19,
          color: sc.color,
          bold: true
        })
      )
    })

    return statRowY + cardH
  }

  /**
   * 第二区：一眼看清【当前装备与宝石】（兵械 | 神兵 | 2★同源宝石 | 4★相生宝石）
   * 卡片仅展示名称、等级与核心数值，点击槽位可更换/镶嵌
   */
  private renderEquipmentAndGemSection(
    panel: Phaser.GameObjects.Container,
    hero: Hero,
    y: number
  ): number {
    y += sectionHeader(this, panel, 24, y, '当前装备与宝石', HeroListScene.CONTENT_WIDTH)

    const heroEquip = this.equipmentManager.getHeroEquipment(hero.id)
    const artifact = heroEquip.artifact
    const evo = artifact
      ? this.equipmentManager.getArtifactEvolutionStage(artifact.instanceId)
      : null

    const cardW = 191
    const cardH = 98
    const gap = 12
    const rowY = y + 3

    this.renderLoadoutEquipCard(
      panel,
      hero,
      heroEquip.weapon,
      'weapon',
      '兵械',
      24,
      rowY,
      cardW,
      cardH
    )

    this.renderLoadoutEquipCard(
      panel,
      hero,
      heroEquip.artifact,
      'artifact',
      '神兵',
      24 + (cardW + gap) * 1,
      rowY,
      cardW,
      cardH
    )

    const detail = artifact
      ? (this.equipmentManager.getEquipmentDetail(artifact.instanceId) as any)
      : (artifacts.find(
          (a: any) => a.exclusiveHero === hero.name || a.exclusiveHeroes?.includes(hero.id)
        ) as any)
    const reqWuXing = (detail?.gemSocket?.requiredWuXing || hero.wuXing) as WuXing
    const genWuXing = WuXingGeneratedBy[reqWuXing]

    this.renderLoadoutGemCard(
      panel,
      hero,
      artifact,
      'same',
      2,
      reqWuXing,
      evo?.sameGem || null,
      `同源宝石 (${INK_WUXING[reqWuXing].label})`,
      24 + (cardW + gap) * 2,
      rowY,
      cardW,
      cardH
    )

    this.renderLoadoutGemCard(
      panel,
      hero,
      artifact,
      'generating',
      4,
      genWuXing,
      evo?.generatingGem || null,
      `相生宝石 (${INK_WUXING[genWuXing].label})`,
      24 + (cardW + gap) * 3,
      rowY,
      cardW,
      cardH
    )

    return rowY + cardH
  }

  private renderLoadoutEquipCard(
    panel: Phaser.GameObjects.Container,
    hero: Hero,
    equipment: EquipmentInstance | null,
    type: 'weapon' | 'artifact',
    slotName: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const isExclusive = Boolean(
      equipment &&
        type === 'artifact' &&
        this.equipmentManager.isExclusiveForHero(equipment.instanceId, hero.id, hero.name)
    )
    const borderCol = equipment
      ? isExclusive
        ? InkColor.cinnabar
        : INK_RARITY[equipment.rarity as Rarity].border
      : InkColor.inkFaint

    const bg = this.add.rectangle(
      x + w / 2,
      y + h / 2,
      w,
      h,
      equipment ? InkColor.paperDeep : InkColor.paperPanel,
      equipment ? 0.85 : 0.45
    )
    bg.setStrokeStyle(equipment ? 1.5 : 1, borderCol)
    panel.add(bg)

    panel.add(
      inkText(this, x + 10, y + 14, slotName, {
        size: 11.5,
        color: InkText.wash,
        bold: true
      })
    )

    if (equipment) {
      const detail = this.equipmentManager.getEquipmentDetail(equipment.instanceId) as any
      const badge =
        type === 'artifact'
          ? isExclusive
            ? '本命'
            : '通用'
          : RarityNames[equipment.rarity as Rarity]

      panel.add(
        inkText(this, x + w - 10, y + 14, badge, {
          size: 10.5,
          color: isExclusive ? InkText.cinnabar : InkText.gold,
          bold: true,
          originX: 1
        })
      )

      panel.add(
        inkText(
          this,
          x + 10,
          type === 'artifact' ? y + 46 : y + 36,
          detail?.name || '已佩装备',
          {
            size: 15,
            color: isExclusive ? InkText.cinnabar : InkText.strong,
            bold: true
          }
        )
      )

      if (type === 'weapon') {
        const parts: string[] = []
        if (detail?.bonus) {
          if (detail.bonus.attackPercent)
            parts.push(`攻+${Math.round(detail.bonus.attackPercent * 100)}%`)
          if (detail.bonus.attackSpeedPercent)
            parts.push(`速+${Math.round(detail.bonus.attackSpeedPercent * 100)}%`)
          if (detail.bonus.attackRangePercent)
            parts.push(`距+${Math.round(detail.bonus.attackRangePercent * 100)}%`)
          if (detail.bonus.critRateBonus)
            parts.push(`暴+${Math.round(detail.bonus.critRateBonus * 100)}%`)
          if (detail.bonus.critDamageBonus)
            parts.push(`伤+${Math.round(detail.bonus.critDamageBonus * 100)}%`)
        } else if (detail?.bonuses) {
          if (detail.bonuses.attack) parts.push(`攻+${detail.bonuses.attack}`)
          if (detail.bonuses.attackSpeed) parts.push(`速+${detail.bonuses.attackSpeed.toFixed(1)}`)
        }

        panel.add(
          inkText(this, x + 10, y + 56, parts.slice(0, 2).join('  '), {
            size: 11.5,
            color: InkText.ink
          })
        )
      }

      const btnY = y + h - 16
      const changeBtn = createInkButton(this, x + 52, btnY, 74, 21, '更换', {
        fill: InkColor.paper,
        hoverFill: InkColor.paperPanel,
        textColor: InkText.ink,
        fontSize: 10.5,
        stroke: InkColor.inkFaint,
        onClick: () => this.showEquipmentSelection(type, hero.id)
      })
      const unequipBtn = createInkButton(this, x + 136, btnY, 66, 21, '卸下', {
        fill: InkColor.paperPanel,
        hoverFill: 0xc5b795,
        textColor: InkText.cinnabar,
        fontSize: 10.5,
        stroke: InkColor.inkFaint,
        onClick: () => this.unequipEquipment(equipment.instanceId, hero.id)
      })
      panel.add([changeBtn, unequipBtn])
    } else {
      const idleCount = this.equipmentManager
        .getUnequippedEquipment()
        .filter(e => e.type === type).length

      panel.add(
        inkText(this, x + w / 2, y + 42, '未装备', {
          size: 14,
          color: InkText.faint,
          bold: true,
          originX: 0.5
        })
      )

      const equipBtn = createInkButton(
        this,
        x + w / 2,
        y + h - 18,
        142,
        22,
        idleCount > 0 ? `＋ 佩带 (${idleCount}件可用)` : '＋ 佩带',
        {
          fill: idleCount > 0 ? InkColor.cinnabar : InkColor.paperDeep,
          hoverFill: idleCount > 0 ? 0xb2362e : InkColor.paper,
          textColor: idleCount > 0 ? InkText.paper : InkText.ink,
          fontSize: 10.5,
          stroke: idleCount > 0 ? InkColor.cinnabar : InkColor.inkFaint,
          onClick: () => this.showEquipmentSelection(type, hero.id)
        }
      )
      panel.add(equipBtn)
    }
  }

  private renderLoadoutGemCard(
    panel: Phaser.GameObjects.Container,
    hero: Hero,
    artifact: EquipmentInstance | null,
    slotType: 'same' | 'generating',
    requiredStar: number,
    slotWuXing: WuXing,
    socketedGem: Gem | null,
    slotName: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const wxStyle = INK_WUXING[slotWuXing]
    const isStarUnlocked = hero.star >= requiredStar

    const bg = this.add.rectangle(
      x + w / 2,
      y + h / 2,
      w,
      h,
      socketedGem ? wxStyle.fill : InkColor.paperPanel,
      socketedGem ? 0.9 : 0.45
    )
    bg.setStrokeStyle(socketedGem ? 1.5 : 1, socketedGem ? wxStyle.border : InkColor.inkFaint)
    panel.add(bg)

    panel.add(
      inkText(this, x + 10, y + 14, slotName, {
        size: 11.5,
        color: slotType === 'same' ? InkText.cinnabar : '#0277bd',
        bold: true
      })
    )

    panel.add(
      inkText(this, x + w - 10, y + 14, isStarUnlocked ? `${requiredStar}★已开` : '🔒', {
        size: 10.5,
        color: isStarUnlocked ? InkText.green : '#b26a00',
        bold: true,
        originX: 1
      })
    )

    if (!isStarUnlocked) {
      panel.add(
        inkText(this, x + w / 2, y + 42, `需升至 ${requiredStar}★ 开启`, {
          size: 13,
          color: InkText.faint,
          bold: true,
          originX: 0.5
        })
      )
      const unlockBtn = createInkButton(this, x + w / 2, y + h - 18, 136, 22, '查看升星条件', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.wash,
        fontSize: 10.5,
        stroke: InkColor.inkFaint,
        onClick: () => this.showStarDestinyDetailDialog(hero)
      })
      panel.add(unlockBtn)
      return
    }

    if (!artifact) {
      panel.add(
        inkText(this, x + w / 2, y + 42, '需先佩带神兵', {
          size: 13,
          color: InkText.faint,
          bold: true,
          originX: 0.5
        })
      )
      const equipArtBtn = createInkButton(this, x + w / 2, y + h - 18, 136, 22, '去佩带神兵', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.wash,
        fontSize: 10.5,
        stroke: InkColor.inkFaint,
        onClick: () => this.showEquipmentSelection('artifact', hero.id)
      })
      panel.add(equipArtBtn)
      return
    }

    if (socketedGem) {
      const iconKey = `gem_icon_${socketedGem.wuXing}_${socketedGem.level}`
      if (this.textures.exists(iconKey)) {
        panel.add(this.add.image(x + 24, y + 38, iconKey).setScale(0.52))
      }

      panel.add(
        inkText(this, x + 42, y + 38, `Lv.${socketedGem.level} ${getGemName(socketedGem)}`, {
          size: 14,
          color: InkText.strong,
          bold: true
        })
      )

      const aff1 = socketedGem.affixes?.[0] ? this.formatGemAffixText(socketedGem.affixes[0]) : ''
      const aff2 = socketedGem.affixes?.[1] ? this.formatGemAffixText(socketedGem.affixes[1]) : ''
      panel.add(
        inkText(this, x + 10, y + 58, [aff1, aff2].filter(Boolean).join(' · '), {
          size: 11,
          color: InkText.ink
        })
      )

      const btnY = y + h - 16
      const changeBtn = createInkButton(this, x + 52, btnY, 74, 21, '更换', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 10.5,
        stroke: wxStyle.border,
        onClick: () => this.showHeroGemSocketDialog(hero, artifact, slotType, slotWuXing)
      })
      const removeBtn = createInkButton(this, x + 136, btnY, 66, 21, '卸下', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paper,
        textColor: InkText.wash,
        fontSize: 10.5,
        stroke: InkColor.inkFaint,
        onClick: () => {
          this.equipmentManager.unsocketGemSlotFromArtifact(artifact.instanceId, slotType)
          this.autoSave()
          this.renderRoster()
          this.updateCardSelection()
          this.updateDetailPanel(hero.id)
          this.showMessage('已卸下宝石')
        }
      })
      panel.add([changeBtn, removeBtn])
    } else {
      const availCount = this.equipmentManager
        .getOwnedGems()
        .filter(g => g.wuXing === slotWuXing).length

      panel.add(
        inkText(this, x + w / 2, y + 42, '未镶嵌', {
          size: 14,
          color: InkText.faint,
          bold: true,
          originX: 0.5
        })
      )

      const socketBtn = createInkButton(
        this,
        x + w / 2,
        y + h - 18,
        142,
        22,
        availCount > 0 ? `＋ 镶嵌 (${availCount}颗可用)` : '＋ 镶嵌 / 获取途径',
        {
          fill: availCount > 0 ? InkColor.cinnabar : InkColor.paperDeep,
          hoverFill: availCount > 0 ? 0xb2362e : InkColor.paper,
          textColor: availCount > 0 ? InkText.paper : InkText.ink,
          fontSize: 10.5,
          stroke: availCount > 0 ? InkColor.cinnabar : InkColor.inkFaint,
          onClick: () => this.showHeroGemSocketDialog(hero, artifact, slotType, slotWuXing)
        }
      )
      panel.add(socketBtn)
    }
  }

  /**
   * 第三区：【武道技能进化路线图】+【当前技能状态：主动技能 + 被动技能】
   * 上半部绘制水墨经脉分支路线图（圆印节点 + 流光经络 + 分支汇流）；
   * 下半部左右并列展示【当前主动技能】与【当前被动技能（含基础被动 + 3★本命特质）】实时生效状态。
   */
  private renderLiveSkillsSection(
    panel: Phaser.GameObjects.Container,
    hero: Hero,
    y: number
  ): void {
    const cfg = getHeroConfig(hero.id)
    const wxTheme = INK_WUXING[hero.wuXing]
    const heroEquip = this.equipmentManager.getHeroEquipment(hero.id)
    const artifactInst = heroEquip.artifact
    const evo = artifactInst
      ? this.equipmentManager.getArtifactEvolutionStage(artifactInst.instanceId)
      : null
    const isExclusiveEquipped = Boolean(
      artifactInst &&
        this.equipmentManager.isExclusiveForHero(artifactInst.instanceId, hero.id, hero.name)
    )
    const hasSameResonance = Boolean(isExclusiveEquipped && hero.star >= 2 && evo?.sameGem)
    const hasGenResonance = Boolean(isExclusiveEquipped && hero.star >= 4 && evo?.generatingGem)
    const hasGemResonance = hasSameResonance || hasGenResonance
    const hasStar3Trait = hero.star >= 3
    const ultUnlocked = Boolean(
      isExclusiveEquipped && hero.star >= 5 && evo?.hasDualLv5Ultimate
    )

    const currentStage: 1 | 2 | 3 | 4 = ultUnlocked
      ? 4
      : hasGemResonance
        ? 3
        : isExclusiveEquipped
          ? 2
          : 1

    const stageNames: Record<1 | 2 | 3 | 4, string> = {
      1: '阶I · 原始战法',
      2: '阶II · 神兵觉醒',
      3: '阶III · 灵石共鸣',
      4: '阶IV · 圣兽法相'
    }

    y += sectionHeader(
      this,
      panel,
      24,
      y,
      `技能进化路线图 · 【${stageNames[currentStage]}】`,
      460
    )

    // 右上角：本命锦囊 + 技能演武
    const heroAug = AUGMENT_POOL.find(a => a.heroRequirement === hero.id)
    if (heroAug) {
      const augBtn = createInkButton(
        this,
        596,
        y - 12,
        152,
        22,
        `🎴 锦囊《${heroAug.name}》`,
        {
          fill: InkColor.paperDeep,
          hoverFill: 0xc5b795,
          textColor: InkText.strong,
          fontSize: 11,
          stroke: 0xa0782f,
          onClick: () => {
            SoundFX.stamp(0.25)
            this.autoSave()
            this.scene.start('AugmentCompendiumScene', { augmentId: heroAug.id })
          }
        }
      )
      panel.add(augBtn)
    }

    const sandboxBtn = createInkButton(this, 754, y - 12, 136, 22, '⚔️ 技能演武预览', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb2362e,
      textColor: InkText.paper,
      fontSize: 11,
      stroke: 0xd4af37,
      onClick: () => {
        SoundFX.stamp(0.25)
        this.sandboxTier = currentStage
        this.showSkillSandboxDialog(hero)
      }
    })
    panel.add(sandboxBtn)

    const exclusiveArtifactCfg = artifacts.find(
      (a: any) => a.exclusiveHero === hero.name || a.exclusiveHeroes?.includes(hero.id)
    ) as any
    const resCfg = exclusiveArtifactCfg?.exclusiveResonance

    // ==================== 上半部：水墨经脉【技能进化路线图】（严格分列，线走间隙，绝不穿字） ====================
    const mapX = 24
    const mapY = y + 3
    const mapW = HeroListScene.CONTENT_WIDTH // 800
    const mapH = 144

    const mapGfx = this.add.graphics()
    // 卷轴底纹与暗金边框
    mapGfx.fillStyle(0xe8dfc8, 0.92)
    mapGfx.fillRoundedRect(mapX, mapY, mapW, mapH, 6)
    mapGfx.lineStyle(1.5, 0xa08b65, 0.85)
    mapGfx.strokeRoundedRect(mapX, mapY, mapW, mapH, 6)
    mapGfx.lineStyle(1, 0xc4b596, 0.55)
    mapGfx.strokeRoundedRect(mapX + 5, mapY + 5, mapW - 10, mapH - 10, 4)

    // 4 列节点严格的左右边界（列间留出 34~42px 纯净经脉通道）：
    // Col 1 (原始战法):   x = mapX + 14 .. mapX + 158 (w=144, h=48, cy=72)
    // Corridor 1->2:      x = mapX + 158 .. mapX + 192 (34px)
    // Col 2 (神兵觉醒):   x = mapX + 192 .. mapX + 356 (w=164, h=48, cy=72)
    // Corridor 2->3:      x = mapX + 356 .. mapX + 396 (40px, 分支立柱在 mapX + 376)
    // Col 3 (三才分支):   x = mapX + 396 .. mapX + 572 (w=176, h=36, cy=26 / 72 / 118，上下间距 10px)
    // Corridor 3->4:      x = mapX + 572 .. mapX + 612 (40px, 汇流立柱在 mapX + 592)
    // Col 4 (圣兽大招):   x = mapX + 612 .. mapX + 786 (w=174, h=54, cy=72)

    const n1Box = { left: mapX + 14, right: mapX + 158, cy: mapY + 72, h: 48 }
    const n2Box = { left: mapX + 192, right: mapX + 356, cy: mapY + 72, h: 48 }
    const n3TopBox = { left: mapX + 396, right: mapX + 572, cy: mapY + 26, h: 36 }
    const n3MidBox = { left: mapX + 396, right: mapX + 572, cy: mapY + 72, h: 36 }
    const n3BotBox = { left: mapX + 396, right: mapX + 572, cy: mapY + 118, h: 36 }
    const n4Box = { left: mapX + 612, right: mapX + 786, cy: mapY + 72, h: 54 }

    const drawCorridorLine = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      active: boolean
    ) => {
      const midX = Math.round((fromX + toX) / 2)
      if (active) {
        mapGfx.lineStyle(5, 0xd4af37, 0.28)
        mapGfx.beginPath()
        mapGfx.moveTo(fromX, fromY)
        mapGfx.lineTo(midX, fromY)
        mapGfx.lineTo(midX, toY)
        mapGfx.lineTo(toX, toY)
        mapGfx.strokePath()
        mapGfx.lineStyle(2.2, InkColor.cinnabar, 0.95)
      } else {
        mapGfx.lineStyle(1.5, 0x9e927c, 0.55)
      }
      mapGfx.beginPath()
      mapGfx.moveTo(fromX, fromY)
      mapGfx.lineTo(midX, fromY)
      mapGfx.lineTo(midX, toY)
      mapGfx.lineTo(toX, toY)
      mapGfx.strokePath()

      // 入口处小圆点
      mapGfx.fillStyle(active ? InkColor.cinnabar : 0x9e927c, active ? 0.95 : 0.6)
      mapGfx.fillCircle(toX - 4, toY, 2.5)
    }

    // 经脉仅在列间空白通道内绘制，绝不穿过任何文字
    drawCorridorLine(n1Box.right, n1Box.cy, n2Box.left, n2Box.cy, isExclusiveEquipped)
    drawCorridorLine(n2Box.right, n2Box.cy, n3TopBox.left, n3TopBox.cy, hasSameResonance)
    drawCorridorLine(n2Box.right, n2Box.cy, n3MidBox.left, n3MidBox.cy, hasStar3Trait)
    drawCorridorLine(n2Box.right, n2Box.cy, n3BotBox.left, n3BotBox.cy, hasGenResonance)
    drawCorridorLine(n3TopBox.right, n3TopBox.cy, n4Box.left, n4Box.cy, ultUnlocked)
    drawCorridorLine(n3MidBox.right, n3MidBox.cy, n4Box.left, n4Box.cy, ultUnlocked)
    drawCorridorLine(n3BotBox.right, n3BotBox.cy, n4Box.left, n4Box.cy, ultUnlocked)

    panel.add(mapGfx)

    // 绘制带实心宣纸铭牌底座的印章节点（文字严格限制在铭牌内部）
    const renderPlaqueNode = (opts: {
      box: { left: number; right: number; cy: number; h: number }
      sealChar: string
      title: string
      sub: string
      unlocked: boolean
      isCurrentTier?: boolean
      isGrand?: boolean
      accentColor: number
      onClick: () => void
    }) => {
      const { left, right, cy, h } = opts.box
      const w = right - left
      const top = cy - h / 2
      const nodeGfx = this.add.graphics()

      // 铭牌实心底座
      const fillCol = opts.unlocked
        ? opts.isGrand
          ? 0xf4e4c1
          : 0xf7f1e1
        : 0xdfd5c0
      const strokeCol = opts.isCurrentTier
        ? InkColor.cinnabar
        : opts.unlocked
          ? opts.accentColor
          : 0xa69b86

      if (opts.isCurrentTier) {
        nodeGfx.fillStyle(0xd4af37, 0.22)
        nodeGfx.fillRoundedRect(left - 3, top - 3, w + 6, h + 6, 8)
      }

      nodeGfx.fillStyle(fillCol, 0.98)
      nodeGfx.fillRoundedRect(left, top, w, h, 6)
      nodeGfx.lineStyle(opts.isCurrentTier ? 2 : 1.2, strokeCol, 1)
      nodeGfx.strokeRoundedRect(left, top, w, h, 6)

      // 左侧圆形篆印
      const r = h <= 36 ? 12.5 : opts.isGrand ? 17 : 15
      const sealX = left + r + 7
      nodeGfx.fillStyle(
        opts.unlocked ? (opts.isGrand ? 0x8c231c : 0xefe5ce) : 0xd3c8b2,
        1
      )
      nodeGfx.fillCircle(sealX, cy, r)
      nodeGfx.lineStyle(opts.unlocked ? 1.8 : 1, strokeCol, 1)
      nodeGfx.strokeCircle(sealX, cy, r)
      panel.add(nodeGfx)

      panel.add(
        inkText(this, sealX, cy, opts.sealChar, {
          size: h <= 36 ? 12 : opts.isGrand ? 15 : 13.5,
          color: opts.unlocked
            ? opts.isGrand
              ? '#fff6d6'
              : InkText.cinnabar
            : InkText.faint,
          bold: true,
          originX: 0.5
        })
      )

      // 铭牌内右侧上下两行文字（严格在 textX .. right-8 之间）
      const textX = sealX + r + 7
      const lineOffset = h <= 36 ? 6.5 : 8.5
      panel.add(
        inkText(this, textX, cy - lineOffset, opts.title, {
          size: h <= 36 ? 11.5 : 12.5,
          color: opts.unlocked ? InkText.strong : InkText.wash,
          bold: true
        })
      )
      panel.add(
        inkText(this, textX, cy + lineOffset, opts.sub, {
          size: h <= 36 ? 10 : 10.5,
          color: opts.unlocked ? InkText.green : '#a66300',
          bold: opts.unlocked
        })
      )

      // 当前境界角标（置于铭牌右上角内部，绝不遮挡上下相邻节点）
      if (opts.isCurrentTier) {
        const badgeW = 34
        const badgeH = 14
        const bx = right - badgeW / 2 - 4
        const by = top + badgeH / 2 + 3
        const curTag = this.add.rectangle(bx, by, badgeW, badgeH, InkColor.cinnabar, 1)
        panel.add(curTag)
        panel.add(
          inkText(this, bx, by, '当前', {
            size: 9.5,
            color: '#fff8e7',
            bold: true,
            originX: 0.5
          })
        )
      }

      const hitZone = this.add.rectangle(left + w / 2, cy, w, h, 0x000000, 0.001)
      hitZone.setInteractive({ useHandCursor: true })
      hitZone.on('pointerdown', () => {
        SoundFX.stamp(0.2)
        opts.onClick()
      })
      panel.add(hitZone)
    }

    const artShortName = (exclusiveArtifactCfg?.name || '本命神兵').slice(0, 5)
    const traitShortName = (cfg?.star3TraitName || '本命特质').replace(/[【】]/g, '').slice(0, 5)
    const ultShortName = (resCfg?.ultimateName || '圣兽终极大招').slice(0, 6)

    // 节点 1：原始战法
    renderPlaqueNode({
      box: n1Box,
      sealChar: '初',
      title: '原始战法',
      sub: '✓ 1★默认激活',
      unlocked: true,
      isCurrentTier: currentStage === 1,
      accentColor: wxTheme.border,
      onClick: () => this.showSkillDetailDialog(hero, 'active')
    })

    // 节点 2：神兵觉醒
    renderPlaqueNode({
      box: n2Box,
      sealChar: '器',
      title: '神兵技觉醒',
      sub: isExclusiveEquipped ? `✓ 已佩${artShortName}` : `佩【${artShortName}】`,
      unlocked: isExclusiveEquipped,
      isCurrentTier: currentStage === 2,
      accentColor: InkColor.cinnabar,
      onClick: () => this.showSkillDetailDialog(hero, 'active')
    })

    // 节点 3A（上支）：2★同源共鸣
    renderPlaqueNode({
      box: n3TopBox,
      sealChar: '同',
      title: '2★同源共鸣',
      sub: hasSameResonance ? `✓ Lv.${evo?.sameGem?.level}同源宝石` : '需2★+嵌同源石',
      unlocked: hasSameResonance,
      isCurrentTier: currentStage === 3 && hasSameResonance,
      accentColor: InkColor.cinnabar,
      onClick: () => this.showSkillDetailDialog(hero, 'sameResonance')
    })

    // 节点 3B（中支）：3★本命特质（被动）
    renderPlaqueNode({
      box: n3MidBox,
      sealChar: '魂',
      title: '3★本命特质',
      sub: hasStar3Trait ? `✓ ${traitShortName}` : '需3★',
      unlocked: hasStar3Trait,
      accentColor: 0x8e24aa,
      onClick: () => this.showSkillDetailDialog(hero, 'trait3')
    })

    // 节点 3C（下支）：4★相生共鸣
    renderPlaqueNode({
      box: n3BotBox,
      sealChar: '生',
      title: '4★相生共鸣',
      sub: hasGenResonance ? `✓ Lv.${evo?.generatingGem?.level}相生宝石` : '需4★+嵌相生石',
      unlocked: hasGenResonance,
      isCurrentTier: currentStage === 3 && !hasSameResonance && hasGenResonance,
      accentColor: 0x0277bd,
      onClick: () => this.showSkillDetailDialog(hero, 'genResonance')
    })

    // 节点 4（终极汇流）：5★圣兽大招
    renderPlaqueNode({
      box: n4Box,
      sealChar: '極',
      title: ultShortName,
      sub: ultUnlocked ? '🐉 圣兽法相已成' : '需5★+双Lv.5石',
      unlocked: ultUnlocked,
      isCurrentTier: currentStage === 4,
      isGrand: true,
      accentColor: 0xd4af37,
      onClick: () => this.showSkillDetailDialog(hero, 'ultimate')
    })

    // ==================== 下半部：当前技能状态（左：主动技能 | 右：被动技能，无弹窗 + 超长内容内联展开/收起） ====================
    const activeSkill = getSkill(hero.activeSkillId) as any
    const passiveSkill = getSkill(hero.passiveSkillId) as any

    const statusY = mapY + mapH + 10
    const statusW = 394
    const statusH = 132
    const statusGap = 12

    // ---------- 左卡：【⚔️ 主动技能】 ----------
    const actX = 24
    let currentActiveEffect = (activeSkill?.description || '造成五行战法伤害').replace(/\n/g, ' ')
    if (ultUnlocked && resCfg?.dualLv5UltimateDescription) {
      currentActiveEffect = resCfg.dualLv5UltimateDescription.replace(/\n/g, ' ')
    } else if (isExclusiveEquipped && resCfg?.baseEffectDescription) {
      currentActiveEffect = resCfg.baseEffectDescription.replace(/\n/g, ' ')
    }
    const isActiveLong = currentActiveEffect.length > 44
    const actExpandDelta = this.activeSkillExpanded && isActiveLong ? 62 : 0
    const actTopY = statusY - actExpandDelta
    const actCardH = statusH + actExpandDelta

    const actBg = this.add.rectangle(
      actX + statusW / 2,
      actTopY + actCardH / 2,
      statusW,
      actCardH,
      this.activeSkillExpanded ? InkColor.paper : InkColor.paperDeep,
      this.activeSkillExpanded ? 0.98 : 0.88
    )
    actBg.setStrokeStyle(
      this.activeSkillExpanded ? 2 : 1.5,
      isExclusiveEquipped || this.activeSkillExpanded ? InkColor.cinnabar : InkColor.ink
    )
    panel.add(actBg)

    // 第 1 行（y=15）：标题 + 品阶 + 冷却
    panel.add(
      inkText(this, actX + 12, actTopY + 15, '⚔️ 主动技能', {
        size: 12.5,
        color: InkText.cinnabar,
        bold: true
      })
    )

    const activeTierBadge = ultUnlocked
      ? '🐉 阶IV·圣兽大招'
      : hasGemResonance
        ? '✨ 阶III·灵石共鸣'
        : isExclusiveEquipped
          ? '🔥 阶II·神兵觉醒'
          : '阶I·原始战法'
    panel.add(
      inkText(
        this,
        actX + statusW - 12,
        actTopY + 15,
        `${activeTierBadge} · CD ${activeSkill?.cooldown || 8}s`,
        {
          size: 11,
          color: isExclusiveEquipped ? InkText.cinnabar : InkText.wash,
          bold: true,
          originX: 1
        }
      )
    )

    // 第 2 行（y=37）：主动技能名称 + 超长展开/收起按钮
    const displayActiveName = ultUnlocked
      ? `${activeSkill?.name || '主动技'} · 【${ultShortName}】`
      : isExclusiveEquipped
        ? `${activeSkill?.name || '主动技'}（神兵觉醒）`
        : `${activeSkill?.name || '主动战法'}（原始战法）`
    panel.add(
      inkText(this, actX + 12, actTopY + 37, displayActiveName, {
        size: 14.5,
        color: InkText.strong,
        bold: true
      })
    )

    if (isActiveLong) {
      const expandActBtn = createInkButton(
        this,
        actX + statusW - 38,
        actTopY + 37,
        54,
        20,
        this.activeSkillExpanded ? '收起 ▴' : '展开 ▾',
        {
          fill: InkColor.paperPanel,
          hoverFill: 0xc5b795,
          textColor: InkText.cinnabar,
          fontSize: 10.5,
          stroke: InkColor.cinnabar,
          onClick: () => {
            this.activeSkillExpanded = !this.activeSkillExpanded
            this.updateDetailPanel(hero.id)
          }
        }
      )
      panel.add(expandActBtn)
    }

    // 第 3 行（y=52 起，originY=0 顶部对齐）
    const shownActiveDesc =
      this.activeSkillExpanded || !isActiveLong
        ? currentActiveEffect
        : `${currentActiveEffect.slice(0, 43)}…`

    panel.add(
      inkText(this, actX + 12, actTopY + 52, shownActiveDesc, {
        size: 11.5,
        color: InkText.ink,
        originX: 0,
        originY: 0,
        wrapWidth: statusW - 24,
        lineSpacing: 3
      })
    )

    // 第 4 行（底部）：下一阶解锁提示条（无弹窗提示文案）
    const nextHintBg = this.add.rectangle(
      actX + statusW / 2,
      actTopY + actCardH - 16,
      statusW - 16,
      22,
      InkColor.paperPanel,
      0.75
    )
    panel.add(nextHintBg)

    const nextActiveStepText = !isExclusiveEquipped
      ? `▶ 下一阶：佩带【${artShortName}】觉醒神兵战法`
      : !hasGemResonance
        ? '▶ 下一阶：神兵槽镶嵌 2★同源 / 4★相生宝石'
        : !ultUnlocked
          ? '▶ 下一阶：升至 5★ 并嵌双 Lv.5 宝石解锁大招'
          : '★ 已达最高境界 · 四阶圣兽大招已激活'
    panel.add(
      inkText(this, actX + 14, actTopY + actCardH - 16, nextActiveStepText, {
        size: 10.5,
        color: ultUnlocked ? InkText.green : '#a66300',
        bold: true
      })
    )

    // ---------- 右卡：【🛡️ 被动技能（基础被动 + 3★本命特质）】 ----------
    const pasX = 24 + statusW + statusGap
    const pas1Desc = (passiveSkill?.description || '常驻增益').replace(/\n/g, ' ')
    const traitName = (cfg?.star3TraitName || '本命特质').replace(/[【】]/g, '')
    const traitDesc = (cfg?.star3TraitDesc || '3★觉醒专属机制').replace(/\n/g, ' ')
    const isPassiveLong = pas1Desc.length > 27 || traitDesc.length > 27
    const pasExpandDelta = this.passiveSkillExpanded && isPassiveLong ? 68 : 0
    const pasTopY = statusY - pasExpandDelta
    const pasCardH = statusH + pasExpandDelta

    const pasBg = this.add.rectangle(
      pasX + statusW / 2,
      pasTopY + pasCardH / 2,
      statusW,
      pasCardH,
      this.passiveSkillExpanded ? InkColor.paper : InkColor.paperDeep,
      this.passiveSkillExpanded ? 0.98 : 0.88
    )
    pasBg.setStrokeStyle(
      this.passiveSkillExpanded ? 2 : 1.5,
      hasStar3Trait || this.passiveSkillExpanded ? 0x8e24aa : InkColor.ink
    )
    panel.add(pasBg)

    panel.add(
      inkText(this, pasX + 12, pasTopY + 15, '🛡️ 被动技能', {
        size: 12.5,
        color: '#6a1b9a',
        bold: true
      })
    )

    if (isPassiveLong) {
      const expandPasBtn = createInkButton(
        this,
        pasX + 124,
        pasTopY + 15,
        54,
        20,
        this.passiveSkillExpanded ? '收起 ▴' : '展开 ▾',
        {
          fill: InkColor.paperPanel,
          hoverFill: 0xc5b795,
          textColor: '#6a1b9a',
          fontSize: 10.5,
          stroke: 0x8e24aa,
          onClick: () => {
            this.passiveSkillExpanded = !this.passiveSkillExpanded
            this.updateDetailPanel(hero.id)
          }
        }
      )
      panel.add(expandPasBtn)
    }

    panel.add(
      inkText(
        this,
        pasX + statusW - 12,
        pasTopY + 15,
        hasStar3Trait ? '双被动全部激活' : '1/2 已激活',
        {
          size: 11,
          color: hasStar3Trait ? InkText.green : InkText.wash,
          bold: true,
          originX: 1
        }
      )
    )

    // 被动一：基础固有被动
    const shownPas1 =
      this.passiveSkillExpanded || pas1Desc.length <= 27
        ? pas1Desc
        : `${pas1Desc.slice(0, 26)}…`
    panel.add(
      inkText(this, pasX + 12, pasTopY + 38, `① 【${passiveSkill?.name || '基础被动'}】`, {
        size: 13,
        color: InkText.strong,
        bold: true
      })
    )
    panel.add(
      inkText(this, pasX + statusW - 12, pasTopY + 38, '✓ 常驻生效', {
        size: 10.5,
        color: InkText.green,
        bold: true,
        originX: 1
      })
    )
    const pas1TextObj = inkText(this, pasX + 14, pasTopY + 49, shownPas1, {
      size: 11,
      color: InkText.ink,
      originX: 0,
      originY: 0,
      wrapWidth: statusW - 28,
      lineSpacing: 2
    })
    panel.add(pas1TextObj)

    // 分隔线與被动二起始高度（展开时自适应下移）
    const divOffsetY = this.passiveSkillExpanded ? Math.max(82, 54 + pas1TextObj.height + 6) : 75
    const divLine = this.add.rectangle(
      pasX + statusW / 2,
      pasTopY + divOffsetY,
      statusW - 24,
      1,
      InkColor.inkFaint,
      0.4
    )
    panel.add(divLine)

    // 被动二：3★本命特质
    const shownTrait =
      this.passiveSkillExpanded || traitDesc.length <= 27
        ? traitDesc
        : `${traitDesc.slice(0, 26)}…`

    const traitTitleY = divOffsetY + 16
    panel.add(
      inkText(this, pasX + 12, pasTopY + traitTitleY, `② 【${traitName}】`, {
        size: 13,
        color: hasStar3Trait ? InkText.cinnabar : InkText.wash,
        bold: true
      })
    )
    panel.add(
      inkText(
        this,
        pasX + statusW - 12,
        pasTopY + traitTitleY,
        hasStar3Trait ? '✓ 3★已觉醒' : '🔒 需3★',
        {
          size: 10.5,
          color: hasStar3Trait ? InkText.cinnabar : '#a66300',
          bold: true,
          originX: 1
        }
      )
    )
    panel.add(
      inkText(this, pasX + 14, pasTopY + traitTitleY + 11, shownTrait, {
        size: 11,
        color: hasStar3Trait ? InkText.ink : InkText.faint,
        originX: 0,
        originY: 0,
        wrapWidth: statusW - 28,
        lineSpacing: 2
      })
    )
  }

  // ==================== 按需详情弹窗集（等级经验 / 将星碎片 / 属性拆解 / 神兵共鸣 / 战法全解） ====================

  /**
   * 按需弹窗 0：武道十境 · 人体经脉穴位图（选取 10 个重要穴位，点击学习贯通经脉以提升武道等级）
   */
  private showLevelDetailDialog(hero: Hero, initialSelectedLv?: number): void {
    const dialogW = 840
    const dialogH = 548
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.ink,
      strokeWidth: 2
    })
    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    const defaultLv =
      initialSelectedLv ?? (hero.level < MAX_HERO_LEVEL ? hero.level + 1 : MAX_HERO_LEVEL)
    let selectedLv = Math.max(1, Math.min(MAX_HERO_LEVEL, defaultLv))

    // 十大武道要穴定义（沿人体奇经八脉周天运行：Lv.1 气海筑基 -> Lv.10 百会大圆满）
    const ACUPOINTS: {
      lv: number
      name: string
      realm: string
      meridian: string
      x: number
      y: number
      labelDx: number
      labelDy: number
      desc: string
      effectText: string
    }[] = [
      {
        lv: 1,
        name: '气海穴',
        realm: '初阵',
        meridian: '任脉 · 下丹田正中',
        x: 215,
        y: 314,
        labelDx: -58,
        labelDy: -6,
        desc: '先天元气汇聚之海，武者吐纳筑基之始。真气自丹田生发，四肢百骸初具战阵威仪。',
        effectText: '武道初境筑基 · 解锁武将出战与基础面板（攻击加成 +0%）'
      },
      {
        lv: 2,
        name: '关元穴',
        realm: '淬体',
        meridian: '任脉 · 丹田下三寸',
        x: 215,
        y: 356,
        labelDx: 58,
        labelDy: -4,
        desc: '男子藏精、女子蓄血之处。冲开此穴可培元固本，淬炼筋骨皮膜，挥刃力道倍增。',
        effectText: '淬炼筋骨皮膜 · 武将基础攻击力永久提升至 +4%'
      },
      {
        lv: 3,
        name: '涌泉穴',
        realm: '凝气',
        meridian: '足少阴肾经 · 足底正中',
        x: 156,
        y: 418,
        labelDx: -62,
        labelDy: -6,
        desc: '肾出于涌泉，如源泉自地底喷薄而出。贯通此穴可引大地厚重之气入体，下盘稳如泰山。',
        effectText: '引地脉精气凝练内息 · 武将基础攻击力永久提升至 +8%'
      },
      {
        lv: 4,
        name: '命门穴',
        realm: '破锋',
        meridian: '督脉 · 后腰脊柱正中',
        x: 272,
        y: 292,
        labelDx: 60,
        labelDy: -6,
        desc: '生命之门，督脉阳气生发之枢。真气由腹转背直透脊梁，腰马合一，破阵摧锋无坚不摧。',
        effectText: '腰马合一气透脊梁 · 武将基础攻击力永久提升至 +12%'
      },
      {
        lv: 5,
        name: '膻中穴',
        realm: '贯通',
        meridian: '任脉 · 胸堂两乳之间',
        x: 215,
        y: 234,
        labelDx: -62,
        labelDy: -6,
        desc: '中丹田宗气之所聚，心肺气机之枢纽。冲开膻中则胸中豪气干云，周身内息回环贯通。',
        effectText: '中丹田宗气大成 · 武将基础攻击力永久提升至 +16%'
      },
      {
        lv: 6,
        name: '肩井穴',
        realm: '宗师',
        meridian: '足少阳胆经 · 右肩脊枢',
        x: 282,
        y: 184,
        labelDx: 58,
        labelDy: -10,
        desc: '手足三阳经交会之要冲。气冲肩井，肩背劲力直达双臂，开合之间已具一代宗师气象。',
        effectText: '贯通肩臂三阳经脉 · 武将基础攻击力永久提升至 +20%'
      },
      {
        lv: 7,
        name: '曲池穴',
        realm: '止水',
        meridian: '手阳明大肠经 · 右肘弯处',
        x: 314,
        y: 244,
        labelDx: 56,
        labelDy: 0,
        desc: '经气至此如水入池。贯通曲池可令肘腕发劲圆转如意，沙场挽弓挥戈皆心如止水。',
        effectText: '气贯肘腕收放自如 · 武将基础攻击力永久提升至 +24%'
      },
      {
        lv: 8,
        name: '劳宫穴',
        realm: '天人',
        meridian: '手厥阴心包经 · 左掌中心',
        x: 118,
        y: 256,
        labelDx: -56,
        labelDy: -6,
        desc: '心包经之火穴，掌心吐劲之门户。真气透掌而出，与天地五行交感共鸣，臻至天人合一。',
        effectText: '掌心吐劲五行共鸣 · 武将基础攻击力永久提升至 +28%'
      },
      {
        lv: 9,
        name: '玉枕穴',
        realm: '无双',
        meridian: '足太阳膀胱经 · 后脑枕骨',
        x: 164,
        y: 146,
        labelDx: -60,
        labelDy: -6,
        desc: '督脉与太阳经上脑之天关。冲破玉枕铁壁，神识清明敏锐，纵横疆场国士无双。',
        effectText: '冲破脑后天关神识无双 · 武将基础攻击力永久提升至 +32%'
      },
      {
        lv: 10,
        name: '百会穴',
        realm: '化境',
        meridian: '督脉 · 头顶正中天灵',
        x: 215,
        y: 104,
        labelDx: 58,
        labelDy: -8,
        desc: '手足三阳与督脉之巅，百脉朝宗之会。贯通百会则三花聚顶、五气朝元，臻至武道十境大圆满！',
        effectText: '十境大圆满 · 武将基础攻击力达到局外武道上限 +36%！'
      }
    ]

    const learnAcupoint = (targetLv: number) => {
      if (hero.level >= MAX_HERO_LEVEL) {
        this.showMessage(`${hero.name} 已贯通全部十大要穴，臻至武道十境大圆满！`)
        return
      }
      const nextLv = hero.level + 1
      const pt = ACUPOINTS.find(a => a.lv === nextLv)!
      hero.level = nextLv
      hero.experience = Math.max(hero.experience, getTotalInvestedExp(nextLv))
      selectedLv = nextLv < MAX_HERO_LEVEL ? nextLv + 1 : MAX_HERO_LEVEL

      SoundFX.thud(0.45)
      this.autoSave()
      this.renderRoster()
      this.updateCardSelection()
      this.updateDetailPanel(hero.id)

      const bonusPct = Math.round(getLevelStatBonus(hero.level) * 100)
      this.showMessage(
        `冲穴成功！${hero.name} 贯通第 ${nextLv} 穴【${pt.name}】，晋升武道 Lv.${nextLv}（攻击 +${bonusPct}%）`
      )
      closeAll()
      this.showLevelDetailDialog(hero, targetLv > nextLv ? targetLv : selectedLv)
    }

    const lvBonusPct = Math.round(getLevelStatBonus(hero.level) * 100)

    // 标题栏
    panel.add(
      inkText(
        this,
        dialogW / 2,
        26,
        `【⚡ ${hero.name} · 武道十境人体经脉图（已贯通 ${hero.level}/${MAX_HERO_LEVEL} 穴 · 基础攻击 +${lvBonusPct}%）】`,
        {
          size: 18,
          color: InkText.strong,
          bold: true,
          originX: 0.5
        }
      )
    )
    panel.add(
      inkText(
        this,
        dialogW / 2,
        46,
        '点击经脉图上的穴位或右侧【冲穴学习】按钮，依次打通奇经八脉十大要穴以提升武道等级',
        {
          size: 11.5,
          color: InkText.wash,
          originX: 0.5
        }
      )
    )

    // ==================== 左侧：水墨人体经脉穴位图 ====================
    const chartX = 22
    const chartY = 64
    const chartW = 386
    const chartH = 424
    const cx = 215

    const chartBg = this.add.graphics()
    chartBg.fillStyle(InkColor.paperDeep, 0.85)
    chartBg.fillRoundedRect(chartX, chartY, chartW, chartH, 6)
    chartBg.lineStyle(1.5, InkColor.ink, 0.65)
    chartBg.strokeRoundedRect(chartX, chartY, chartW, chartH, 6)

    // 内框古籍折角装饰与背后的八卦太极水墨暗纹
    chartBg.lineStyle(1, InkColor.inkFaint, 0.28)
    chartBg.strokeRoundedRect(chartX + 6, chartY + 6, chartW - 12, chartH - 12, 4)
    chartBg.strokeCircle(cx, 268, 138)
    chartBg.strokeCircle(cx, 268, 102)
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4
      chartBg.lineBetween(
        cx + Math.cos(ang) * 102,
        268 + Math.sin(ang) * 102,
        cx + Math.cos(ang) * 138,
        268 + Math.sin(ang) * 138
      )
    }

    // 绘制水墨人体盘坐/立姿武者轮廓（头颅、颈肩、躯干、双臂双掌、盘腿下盘、任督中脉）
    chartBg.fillStyle(InkColor.paperPanel, 0.72)
    chartBg.lineStyle(1.8, InkColor.inkWash, 0.55)

    // 1. 头颅与发髻
    chartBg.fillRoundedRect(cx - 10, 86, 20, 12, 4)
    chartBg.strokeRoundedRect(cx - 10, 86, 20, 12, 4)
    chartBg.fillCircle(cx, 126, 24)
    chartBg.strokeCircle(cx, 126, 24)

    // 2. 颈部与双肩躯干
    chartBg.fillRect(cx - 10, 148, 20, 18)
    chartBg.fillRoundedRect(cx - 56, 166, 112, 168, 22)
    chartBg.strokeRoundedRect(cx - 56, 166, 112, 168, 22)

    // 3. 左臂与左掌（对应劳宫穴 x=118, y=256）
    chartBg.lineStyle(16, InkColor.paperPanel, 0.85)
    chartBg.lineBetween(cx - 52, 184, 132, 226)
    chartBg.lineBetween(132, 226, 118, 256)
    chartBg.lineStyle(1.6, InkColor.inkWash, 0.55)
    chartBg.strokeCircle(118, 256, 12)

    // 4. 右肩、右肘与右掌（对应肩井 x=282,y=184 与曲池 x=314,y=244）
    chartBg.lineStyle(16, InkColor.paperPanel, 0.85)
    chartBg.lineBetween(cx + 52, 184, 314, 244)
    chartBg.lineBetween(314, 244, 294, 286)
    chartBg.lineStyle(1.6, InkColor.inkWash, 0.55)
    chartBg.strokeCircle(294, 286, 11)

    // 5. 盘坐下盘与足底（对应关元 x=215,y=356 与涌泉 x=156,y=418）
    chartBg.fillRoundedRect(cx - 88, 330, 176, 62, 26)
    chartBg.strokeRoundedRect(cx - 88, 330, 176, 62, 26)
    chartBg.fillRoundedRect(130, 392, 64, 34, 14)
    chartBg.strokeRoundedRect(130, 392, 64, 34, 14)
    chartBg.fillRoundedRect(236, 392, 64, 34, 14)
    chartBg.strokeRoundedRect(236, 392, 64, 34, 14)

    // 6. 体内任督二脉中轴线（水墨暗脉）
    chartBg.lineStyle(1.2, InkColor.inkFaint, 0.45)
    chartBg.lineBetween(cx, 104, cx, 366)
    panel.add(chartBg)

    // 绘制经脉真气运行连线（1 -> 2 -> 3 -> ... -> 10）
    const meridianGraphics = this.add.graphics()
    for (let i = 0; i < ACUPOINTS.length - 1; i++) {
      const a = ACUPOINTS[i]
      const b = ACUPOINTS[i + 1]
      const isChannelOpen = hero.level >= b.lv
      const isNextChannel = hero.level + 1 === b.lv

      if (isChannelOpen) {
        meridianGraphics.lineStyle(5, 0xa0782f, 0.25)
        meridianGraphics.lineBetween(a.x, a.y, b.x, b.y)
        meridianGraphics.lineStyle(2.4, InkColor.cinnabar, 0.92)
        meridianGraphics.lineBetween(a.x, a.y, b.x, b.y)
      } else if (isNextChannel) {
        meridianGraphics.lineStyle(2, 0xa0782f, 0.85)
        meridianGraphics.lineBetween(a.x, a.y, b.x, b.y)
      } else {
        meridianGraphics.lineStyle(1.3, InkColor.inkFaint, 0.45)
        meridianGraphics.lineBetween(a.x, a.y, b.x, b.y)
      }
    }
    panel.add(meridianGraphics)

    // 绘制 10 个穴位节点与旁注名牌
    for (const pt of ACUPOINTS) {
      const isUnlocked = hero.level >= pt.lv
      const isNext = hero.level + 1 === pt.lv
      const isSelected = selectedLv === pt.lv

      const nodeG = this.add.graphics()
      if (isSelected) {
        nodeG.fillStyle(InkColor.cinnabar, 0.18)
        nodeG.fillCircle(pt.x, pt.y, 17)
        nodeG.lineStyle(1.8, InkColor.cinnabar, 0.95)
        nodeG.strokeCircle(pt.x, pt.y, 17)
      }

      if (isUnlocked) {
        nodeG.fillStyle(0xa0782f, 0.3)
        nodeG.fillCircle(pt.x, pt.y, 12)
        nodeG.fillStyle(InkColor.cinnabar, 1)
        nodeG.fillCircle(pt.x, pt.y, 8)
        nodeG.lineStyle(1.5, 0xf6e7c1, 0.95)
        nodeG.strokeCircle(pt.x, pt.y, 8)
      } else if (isNext) {
        nodeG.fillStyle(0xa0782f, 0.25)
        nodeG.fillCircle(pt.x, pt.y, 13)
        nodeG.fillStyle(InkColor.paperPanel, 1)
        nodeG.fillCircle(pt.x, pt.y, 8)
        nodeG.lineStyle(2, 0xa0782f, 1)
        nodeG.strokeCircle(pt.x, pt.y, 8)
        nodeG.fillStyle(InkColor.cinnabar, 0.9)
        nodeG.fillCircle(pt.x, pt.y, 3.5)
      } else {
        nodeG.fillStyle(InkColor.paperPanel, 0.9)
        nodeG.fillCircle(pt.x, pt.y, 7.5)
        nodeG.lineStyle(1.2, InkColor.inkFaint, 0.8)
        nodeG.strokeCircle(pt.x, pt.y, 7.5)
      }
      panel.add(nodeG)

      // 穴位引线与标签胶囊
      const lx = pt.x + pt.labelDx
      const ly = pt.y + pt.labelDy
      const leaderG = this.add.graphics()
      leaderG.lineStyle(
        1,
        isUnlocked ? InkColor.cinnabar : isNext ? 0xa0782f : InkColor.inkFaint,
        0.65
      )
      leaderG.lineBetween(pt.x, pt.y, lx, ly)
      panel.add(leaderG)

      const tagW = 72
      const tagH = 20
      const tagBg = this.add.rectangle(
        lx,
        ly,
        tagW,
        tagH,
        isSelected ? InkColor.paper : InkColor.paperPanel,
        0.95
      )
      tagBg.setStrokeStyle(
        isSelected ? 1.5 : 1,
        isUnlocked ? InkColor.cinnabar : isNext ? 0xa0782f : InkColor.inkFaint
      )
      tagBg.setInteractive({ useHandCursor: true })
      panel.add(tagBg)

      const dotHit = this.add.circle(pt.x, pt.y, 15, 0x000000, 0.001)
      dotHit.setInteractive({ useHandCursor: true })
      panel.add(dotHit)

      panel.add(
        inkText(this, lx, ly, `${pt.lv}·${pt.name.replace('穴', '')}`, {
          size: 11,
          color: isUnlocked ? InkText.cinnabar : isNext ? InkText.gold : InkText.wash,
          bold: isUnlocked || isNext || isSelected,
          originX: 0.5,
          originY: 0.5
        })
      )

      const onSelectOrLearn = () => {
        if (pt.lv === hero.level + 1 && selectedLv === pt.lv) {
          learnAcupoint(pt.lv)
          return
        }
        closeAll()
        this.showLevelDetailDialog(hero, pt.lv)
      }
      tagBg.on('pointerdown', onSelectOrLearn)
      dotHit.on('pointerdown', onSelectOrLearn)
    }

    panel.add(
      inkText(
        this,
        chartX + chartW / 2,
        chartY + chartH - 16,
        '● 朱砂已贯通    ◎ 金环可冲穴（再次点击直接冲穴）    ○ 未贯通',
        {
          size: 10.5,
          color: InkText.wash,
          originX: 0.5
        }
      )
    )

    // ==================== 右侧：选中穴位详解 + 一键学习冲穴 + 十大穴位总览 ====================
    const rightX = 424
    const rightW = 394
    const curPt = ACUPOINTS.find(a => a.lv === selectedLv) || ACUPOINTS[0]
    const isCurUnlocked = hero.level >= curPt.lv
    const isCurNext = hero.level + 1 === curPt.lv

    // 1. 选中穴位详情卡
    const detailCardH = 226
    const detailBg = this.add.rectangle(
      rightX + rightW / 2,
      chartY + detailCardH / 2,
      rightW,
      detailCardH,
      InkColor.paperDeep,
      0.85
    )
    detailBg.setStrokeStyle(1.5, isCurUnlocked ? InkColor.cinnabar : 0xa0782f)
    panel.add(detailBg)

    const statusBadge = isCurUnlocked
      ? '✓ 已贯通'
      : isCurNext
        ? '✨ 当前可冲穴修习'
        : `🔒 需先贯通前序穴位`

    panel.add(
      inkText(
        this,
        rightX + 16,
        chartY + 14,
        `第 ${curPt.lv} 穴 · 【${curPt.name}】（武道${curPt.realm}境 · Lv.${curPt.lv}）`,
        {
          size: 15.5,
          color: InkText.strong,
          bold: true
        }
      )
    )
    panel.add(
      inkText(this, rightX + rightW - 16, chartY + 16, statusBadge, {
        size: 11.5,
        color: isCurUnlocked ? InkText.green : isCurNext ? InkText.cinnabar : InkText.faint,
        bold: true,
        originX: 1
      })
    )

    panel.add(
      inkText(this, rightX + 16, chartY + 42, `经脉部位：${curPt.meridian}`, {
        size: 12,
        color: InkText.gold,
        bold: true
      })
    )

    panel.add(
      inkText(this, rightX + 16, chartY + 68, curPt.desc, {
        size: 12,
        color: InkText.ink,
        wrapWidth: rightW - 32
      })
    )

    const effectBox = this.add.rectangle(
      rightX + rightW / 2,
      chartY + 138,
      rightW - 32,
      34,
      InkColor.paperPanel,
      0.92
    )
    effectBox.setStrokeStyle(1, InkColor.inkFaint, 0.5)
    panel.add(effectBox)
    panel.add(
      inkText(this, rightX + 26, chartY + 138, `⚡ 冲穴效果：${curPt.effectText}`, {
        size: 11.5,
        color: InkText.cinnabar,
        bold: true,
        originY: 0.5
      })
    )

    // 学习/冲穴主按钮
    if (hero.level >= MAX_HERO_LEVEL) {
      panel.add(
        inkText(
          this,
          rightX + rightW / 2,
          chartY + 190,
          '★ 奇经八脉十大要穴已全部贯通（武道十境大圆满）',
          {
            size: 13,
            color: InkText.cinnabar,
            bold: true,
            originX: 0.5,
            originY: 0.5
          }
        )
      )
    } else {
      const nextPt = ACUPOINTS.find(a => a.lv === hero.level + 1)!
      const btnLabel = isCurNext
        ? `⚡ 点击学习 · 冲开【${curPt.name}】(升至 Lv.${curPt.lv})`
        : `⚡ 点击学习 · 冲开下一穴【${nextPt.name}】(升至 Lv.${nextPt.lv})`

      const learnBtn = createInkButton(
        this,
        rightX + rightW / 2,
        chartY + 190,
        rightW - 32,
        36,
        btnLabel,
        {
          fill: InkColor.cinnabar,
          hoverFill: 0xb2362e,
          textColor: InkText.paper,
          fontSize: 13.5,
          stroke: 0xa0782f,
          onClick: () => learnAcupoint(curPt.lv)
        }
      )
      panel.add(learnBtn)
    }

    // 2. 十大要穴快捷总览矩阵（5列 × 2行）
    const gridTop = chartY + detailCardH + 14
    const gridH = 184
    const gridBg = this.add.rectangle(
      rightX + rightW / 2,
      gridTop + gridH / 2,
      rightW,
      gridH,
      InkColor.paperDeep,
      0.72
    )
    gridBg.setStrokeStyle(1, InkColor.inkFaint, 0.55)
    panel.add(gridBg)

    panel.add(
      inkText(this, rightX + 14, gridTop + 10, '【奇经八脉 · 十大要穴修习进度（点击可切换查看或直接学习）】', {
        size: 12,
        color: InkText.strong,
        bold: true
      })
    )

    const cellW = 70
    const cellH = 62
    const cellGapX = 6
    const cellGapY = 8
    const startCellX = rightX + 13
    const startCellY = gridTop + 36

    ACUPOINTS.forEach((pt, idx) => {
      const col = idx % 5
      const row = Math.floor(idx / 5)
      const cxCell = startCellX + col * (cellW + cellGapX) + cellW / 2
      const cyCell = startCellY + row * (cellH + cellGapY) + cellH / 2
      const unlocked = hero.level >= pt.lv
      const isNext = hero.level + 1 === pt.lv
      const isSel = selectedLv === pt.lv

      const cBg = this.add.rectangle(
        cxCell,
        cyCell,
        cellW,
        cellH,
        isSel ? InkColor.paper : unlocked ? InkColor.paperDeep : InkColor.paperPanel,
        0.95
      )
      cBg.setStrokeStyle(
        isSel ? 2 : 1,
        unlocked ? InkColor.cinnabar : isNext ? 0xa0782f : InkColor.inkFaint
      )
      cBg.setInteractive({ useHandCursor: true })
      panel.add(cBg)

      panel.add(
        inkText(this, cxCell, cyCell - 17, `Lv.${pt.lv} ${pt.realm}`, {
          size: 10,
          color: unlocked ? InkText.cinnabar : isNext ? InkText.gold : InkText.faint,
          bold: true,
          originX: 0.5,
          originY: 0.5
        })
      )
      panel.add(
        inkText(this, cxCell, cyCell + 1, pt.name, {
          size: 12,
          color: unlocked ? InkText.strong : InkText.wash,
          bold: true,
          originX: 0.5,
          originY: 0.5
        })
      )
      panel.add(
        inkText(
          this,
          cxCell,
          cyCell + 18,
          unlocked ? `✓ +${(pt.lv - 1) * 4}%` : isNext ? '可学习' : `+${(pt.lv - 1) * 4}%`,
          {
            size: 10,
            color: unlocked ? InkText.green : isNext ? InkText.cinnabar : InkText.faint,
            bold: unlocked || isNext,
            originX: 0.5,
            originY: 0.5
          }
        )
      )

      cBg.on('pointerdown', () => {
        if (isNext && isSel) {
          learnAcupoint(pt.lv)
        } else {
          closeAll()
          this.showLevelDetailDialog(hero, pt.lv)
        }
      })
    })

    // 底部操作栏：无损传功 & 关闭
    const hasInvestedExp = hero.level > 1 || hero.experience > 0
    if (hasInvestedExp) {
      const resetBtn = createInkButton(
        this,
        dialogW / 2 - 86,
        dialogH - 28,
        148,
        30,
        '🔄 无损传功/散功',
        {
          fill: InkColor.paperDeep,
          hoverFill: 0xc5b795,
          textColor: InkText.cinnabar,
          fontSize: 12.5,
          stroke: InkColor.cinnabar,
          onClick: () => {
            closeAll()
            this.handleLosslessReset(hero)
          }
        }
      )
      panel.add(resetBtn)
    }

    const closeBtn = createInkButton(
      this,
      hasInvestedExp ? dialogW / 2 + 76 : dialogW / 2,
      dialogH - 28,
      120,
      30,
      '关闭经脉图',
      {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 13,
        onClick: closeAll
      }
    )
    panel.add(closeBtn)
  }

  /**
   * 按需弹窗 1：北斗将星命盘（北斗七星图，每颗星下方直接展示效果描述，支持点亮命星与传记领将魂）
   */
  private showStarDestinyDetailDialog(hero: Hero, inspectedStarIdx?: number): void {
    const dialogW = 880
    const dialogH = 556
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.cinnabar,
      strokeWidth: 2
    })
    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    const cfg = getHeroConfig(hero.id)
    const soulStones = this.getSoulStones(hero.id)
    const required = hero.star < 5 ? hero.starUpgradeRequirements[hero.star - 1] || 1 : 0
    const canUpgrade = hero.star < 5 && soulStones >= required
    const activeIdx = inspectedStarIdx ?? Math.min(4, Math.max(0, hero.star - 1))

    panel.add(
      inkText(
        this,
        dialogW / 2,
        25,
        `【⭐ ${hero.name} · 北斗七星命盘（当前 ${hero.star}★ · 专属将魂 ${soulStones}/${hero.star < 5 ? required : '已满'}）】`,
        {
          size: 18.5,
          color: InkText.strong,
          bold: true,
          originX: 0.5
        }
      )
    )
    panel.add(
      inkText(
        this,
        dialogW / 2,
        45,
        '斗魁四星掌神兵与特质，斗柄三星定天命与列传 —— 点击任意星辰可查看详解或点亮命星',
        {
          size: 11.5,
          color: InkText.wash,
          originX: 0.5
        }
      )
    )

    // 星图画布外框
    const skyX = 20
    const skyY = 62
    const skyW = 840
    const skyH = 368
    const skyG = this.add.graphics()
    skyG.fillStyle(InkColor.paperDeep, 0.9)
    skyG.fillRoundedRect(skyX, skyY, skyW, skyH, 6)
    skyG.lineStyle(1.5, 0xa0782f, 0.65)
    skyG.strokeRoundedRect(skyX, skyY, skyW, skyH, 6)

    // 罗盘星宿暗纹背景與背景碎星
    skyG.lineStyle(1, InkColor.inkFaint, 0.2)
    skyG.strokeCircle(dialogW / 2, skyY + 120, 180)
    skyG.strokeCircle(dialogW / 2, skyY + 120, 290)
    const bgStars = [
      [60, 88],
      [150, 102],
      [270, 92],
      [380, 86],
      [500, 94],
      [620, 84],
      [740, 96],
      [820, 110],
      [118, 220],
      [488, 218],
      [615, 206]
    ]
    for (const [bx, by] of bgStars) {
      skyG.fillStyle(0xa0782f, 0.25)
      skyG.fillCircle(bx, by, 1.8)
    }

    // 北斗七星配置（天枢、天璇、天玑、天权、玉衡、开阳、瑶光）
    // 严格按照北斗七星勺状几何排布（1-2-3-4 构成斗魁四方勺斗，4-5-6-7 构成弯曲斗柄），每颗星独享 116px 垂直列宽，下方直接挂载效果描述牌！
    const BEIDOU_STARS: {
      index: number
      starName: string
      ancientTitle: string
      starReq: number
      title: string
      x: number
      y: number
      unlocked: boolean
      isCurrent: boolean
      shortLines: string[]
      fullDetail: string
    }[] = [
      {
        index: 0,
        starName: '天枢 · 1★',
        ancientTitle: '贪狼星 · 斗魁首星',
        starReq: 1,
        title: '初露锋芒',
        x: 84,
        y: 118,
        unlocked: hero.star >= 1,
        isCurrent: hero.star === 1,
        shortLines: ['普攻附着 25%', '解锁原始战法', '可佩本命神兵'],
        fullDetail:
          '【天枢 · 1★ 初露锋芒】普攻五行附着率 25%；解锁武将原始主动战法与基础被动，可佩戴凡品兵器与本命神兵。'
      },
      {
        index: 1,
        starName: '天璇 · 2★',
        ancientTitle: '巨门星 · 斗魁二星',
        starReq: 2,
        title: '威名远播',
        x: 202,
        y: 182,
        unlocked: hero.star >= 2,
        isCurrent: hero.star === 2,
        shortLines: ['普攻附着 40%', '解锁2★同源槽', '部署军费 -2'],
        fullDetail:
          '【天璇 · 2★ 威名远播】普攻五行附着率提升至 40%；打通神兵【2★同源灵石槽】激活同源共鸣；局内部署军费永久 -2。'
      },
      {
        index: 2,
        starName: '天玑 · 3★',
        ancientTitle: '禄存星 · 斗魁三星',
        starReq: 3,
        title: '独当一面',
        x: 320,
        y: 196,
        unlocked: hero.star >= 3,
        isCurrent: hero.star === 3,
        shortLines: [
          '普攻附着 50%',
          '觉醒3★本命特质',
          (cfg?.star3TraitName || '专属特质').replace(/[【】]/g, '')
        ],
        fullDetail: `【天玑 · 3★ 独当一面】普攻五行附着率提升至 50%；觉醒本命特质${cfg?.star3TraitName || ''}：${cfg?.star3TraitDesc || '专属元素联动机制'}。`
      },
      {
        index: 3,
        starName: '天权 · 4★',
        ancientTitle: '文曲星 · 斗魁四星',
        starReq: 4,
        title: '威震华夏',
        x: 438,
        y: 136,
        unlocked: hero.star >= 4,
        isCurrent: hero.star === 4,
        shortLines: ['普攻附着 65%', '解锁4★相生槽', '破Boss铁壁×1.5'],
        fullDetail:
          '【天权 · 4★ 威震华夏】普攻五行附着率提升至 65%；打通神兵【4★相生灵石槽】实现双槽共鸣；相生反应破除 Boss 五行铁壁效率提升至 1.5 倍。'
      },
      {
        index: 4,
        starName: '玉衡 · 5★',
        ancientTitle: '廉贞星 · 斗柄首星',
        starReq: 5,
        title: '五虎天命',
        x: 556,
        y: 158,
        unlocked: hero.star >= 5,
        isCurrent: hero.star === 5,
        shortLines: ['普攻附着 80%', '解锁5★圣兽大招', '战法充能+8%'],
        fullDetail:
          '【玉衡 · 5★ 五虎天命】普攻五行附着率登顶 80%；解锁双 Lv.5 灵石【五行圣兽终极大招】资格；每次释放战法立即为军令台充能 +8%。'
      },
      {
        index: 5,
        starName: '开阳 · 辅星',
        ancientTitle: '武曲星 · 斗柄二星',
        starReq: 1,
        title: '名将列传',
        x: 674,
        y: 126,
        unlocked: true,
        isCurrent: false,
        shortLines: ['名将传记试炼', '免费领专属将魂', '助阵命星晋升'],
        fullDetail:
          '【开阳 · 武曲列传】掌管五虎名将生平传记试炼。点击此星或下方【名将传记】按钮可免费领取专属将魂，用于点亮天璇至玉衡命星。'
      },
      {
        index: 6,
        starName: '瑶光 · 极星',
        ancientTitle: '破军星 · 斗柄尾星',
        starReq: 5,
        title: '圣兽法相',
        x: 792,
        y: 174,
        unlocked: hero.star >= 5,
        isCurrent: false,
        shortLines: ['伴随5★玉衡点亮', '圣兽法相降世', '诗号卷轴切入'],
        fullDetail:
          '【瑶光 · 破军极意】北斗斗柄所指，破军克敌。当 5★ 玉衡点亮且双槽镶嵌 Lv.5 灵石时，战法释放触发战场聚焦、名将诗号切入与圣兽法相降临！'
      }
    ]

    // 1. 绘制北斗七星连线（斗魁 1-2-3-4 + 4-1 勺口虚线，斗柄 4-5-6-7）
    // 斗魁勺口闭合暗线 (天权 -> 天枢)
    skyG.lineStyle(1.2, 0xa0782f, 0.35)
    skyG.lineBetween(BEIDOU_STARS[3].x, BEIDOU_STARS[3].y, BEIDOU_STARS[0].x, BEIDOU_STARS[0].y)

    for (let i = 0; i < BEIDOU_STARS.length - 1; i++) {
      const s1 = BEIDOU_STARS[i]
      const s2 = BEIDOU_STARS[i + 1]
      const lit = s1.unlocked && s2.unlocked
      if (lit) {
        skyG.lineStyle(5, 0xa0782f, 0.22)
        skyG.lineBetween(s1.x, s1.y, s2.x, s2.y)
        skyG.lineStyle(2.4, InkColor.cinnabar, 0.92)
        skyG.lineBetween(s1.x, s1.y, s2.x, s2.y)
      } else {
        skyG.lineStyle(1.6, InkColor.inkFaint, 0.55)
        skyG.lineBetween(s1.x, s1.y, s2.x, s2.y)
      }
    }
    panel.add(skyG)

    // 2. 绘制每颗星辰 + 星辰正下方直接挂载的效果描述牌
    for (const st of BEIDOU_STARS) {
      const isSelected = activeIdx === st.index
      const isNextToLight = st.index < 5 && st.starReq === hero.star + 1

      const starG = this.add.graphics()

      // 星辰到下方描述框的垂直星轨引线
      const descCardTop = st.y + 28
      const descCardH = 114
      const descCardW = 108
      const descCardCenterY = descCardTop + descCardH / 2

      starG.lineStyle(
        1.2,
        st.unlocked ? InkColor.cinnabar : isNextToLight ? 0xa0782f : InkColor.inkFaint,
        0.65
      )
      starG.lineBetween(st.x, st.y + 12, st.x, descCardTop)

      // 星辰光晕与四角星芒
      if (isSelected) {
        starG.fillStyle(InkColor.cinnabar, 0.18)
        starG.fillCircle(st.x, st.y, 20)
        starG.lineStyle(1.6, InkColor.cinnabar, 0.95)
        starG.strokeCircle(st.x, st.y, 20)
      }

      if (st.unlocked) {
        starG.fillStyle(0xa0782f, 0.32)
        starG.fillCircle(st.x, st.y, 14)
        starG.fillStyle(InkColor.cinnabar, 1)
        starG.fillCircle(st.x, st.y, 8.5)
        starG.fillStyle(0xfff3d1, 1)
        starG.fillCircle(st.x, st.y, 4)
        // 十字星芒
        starG.lineStyle(1.6, 0xfff3d1, 0.9)
        starG.lineBetween(st.x - 13, st.y, st.x + 13, st.y)
        starG.lineBetween(st.x, st.y - 13, st.x, st.y + 13)
      } else if (isNextToLight) {
        starG.fillStyle(0xa0782f, 0.25)
        starG.fillCircle(st.x, st.y, 13)
        starG.fillStyle(InkColor.paperPanel, 1)
        starG.fillCircle(st.x, st.y, 8)
        starG.lineStyle(2, 0xa0782f, 1)
        starG.strokeCircle(st.x, st.y, 8)
      } else {
        starG.fillStyle(InkColor.paperPanel, 0.9)
        starG.fillCircle(st.x, st.y, 7.5)
        starG.lineStyle(1.2, InkColor.inkFaint, 0.75)
        starG.strokeCircle(st.x, st.y, 7.5)
      }
      panel.add(starG)

      // 星辰上方名称标签
      panel.add(
        inkText(this, st.x, st.y - 22, st.starName, {
          size: 12,
          color: st.unlocked ? InkText.cinnabar : isNextToLight ? InkText.gold : InkText.wash,
          bold: true,
          originX: 0.5,
          originY: 0.5
        })
      )

      // 星辰正下方的效果描述牌（紧随北斗七星高低起伏排布，列宽 108px 绝不重叠）
      const cardBg = this.add.rectangle(
        st.x,
        descCardCenterY,
        descCardW,
        descCardH,
        isSelected ? InkColor.paper : st.unlocked ? InkColor.paperPanel : InkColor.paperDeep,
        st.unlocked || isSelected ? 0.96 : 0.75
      )
      cardBg.setStrokeStyle(
        isSelected ? 2 : 1,
        isSelected
          ? InkColor.cinnabar
          : st.unlocked
            ? 0xa0782f
            : isNextToLight
              ? InkColor.cinnabar
              : InkColor.inkFaint
      )
      cardBg.setInteractive({ useHandCursor: true })
      panel.add(cardBg)

      const starHit = this.add.circle(st.x, st.y, 18, 0x000000, 0.001)
      starHit.setInteractive({ useHandCursor: true })
      panel.add(starHit)

      // 描述框内标题与状态
      const stateIcon = st.unlocked ? '★' : isNextToLight ? '✨' : '🔒'
      panel.add(
        inkText(this, st.x, descCardTop + 14, `${stateIcon}【${st.title}】`, {
          size: 11.5,
          color: st.unlocked ? InkText.strong : isNextToLight ? InkText.cinnabar : InkText.wash,
          bold: true,
          originX: 0.5,
          originY: 0.5
        })
      )

      // 分隔细线
      const sepG = this.add.graphics()
      sepG.lineStyle(1, InkColor.inkFaint, 0.35)
      sepG.lineBetween(st.x - 44, descCardTop + 26, st.x + 44, descCardTop + 26)
      panel.add(sepG)

      // 3 行核心效果描述
      st.shortLines.forEach((line, lIdx) => {
        panel.add(
          inkText(this, st.x, descCardTop + 42 + lIdx * 22, line, {
            size: 10.5,
            color:
              lIdx === 0 && st.unlocked
                ? InkText.cinnabar
                : st.unlocked
                  ? InkText.ink
                  : InkText.faint,
            bold: lIdx === 0,
            originX: 0.5,
            originY: 0.5
          })
        )
      })

      // 底部微标（已点亮 / 可点亮 / 传记入口）
      const footText =
        st.index === 5
          ? '点击领将魂 ▸'
          : st.isCurrent
            ? '● 当前星级'
            : st.unlocked
              ? '✓ 已点亮'
              : isNextToLight
                ? canUpgrade
                  ? '⚡ 点击点亮!'
                  : `需 ${required} 将魂`
                : `需 ${st.starReq}★`

      panel.add(
        inkText(this, st.x, descCardTop + descCardH - 11, footText, {
          size: 10,
          color:
            st.index === 5 || (isNextToLight && canUpgrade)
              ? InkText.cinnabar
              : st.unlocked
                ? InkText.green
                : InkText.faint,
          bold: true,
          originX: 0.5,
          originY: 0.5
        })
      )

      const onClickStar = () => {
        if (st.index === 5) {
          closeAll()
          this.showBiographyTrialDialog(hero)
          return
        }
        if (isNextToLight && canUpgrade && isSelected) {
          closeAll()
          this.upgradeHeroStar(hero.id, required)
          this.showStarDestinyDetailDialog(hero, st.index)
          return
        }
        closeAll()
        this.showStarDestinyDetailDialog(hero, st.index)
      }
      cardBg.on('pointerdown', onClickStar)
      starHit.on('pointerdown', onClickStar)
    }

    // ==================== 底部选中星辰完整效果横幅 ====================
    const curStar = BEIDOU_STARS[activeIdx] || BEIDOU_STARS[0]
    const bannerY = 442
    const bannerBg = this.add.rectangle(dialogW / 2, bannerY + 24, 840, 48, InkColor.paperDeep, 0.85)
    bannerBg.setStrokeStyle(1, InkColor.cinnabar, 0.55)
    panel.add(bannerBg)

    panel.add(
      inkText(this, 36, bannerY + 24, `${curStar.ancientTitle}  ｜  ${curStar.fullDetail}`, {
        size: 11.5,
        color: InkText.ink,
        bold: true,
        originY: 0.5,
        wrapWidth: 808
      })
    )

    // ==================== 底部按钮栏 ====================
    const btnY = dialogH - 28
    const bioBtn = createInkButton(this, dialogW / 2 - 160, btnY, 156, 30, '📜 名将传记 (领将魂)', {
      fill: InkColor.paperDeep,
      hoverFill: 0xc5b795,
      textColor: InkText.cinnabar,
      fontSize: 12.5,
      stroke: InkColor.cinnabar,
      onClick: () => {
        closeAll()
        this.showBiographyTrialDialog(hero)
      }
    })
    panel.add(bioBtn)

    if (hero.star < 5) {
      const upBtn = createInkButton(
        this,
        dialogW / 2 + 8,
        btnY,
        148,
        30,
        `✨ 点亮 ${hero.star + 1}★ 命星`,
        {
          fill: canUpgrade ? InkColor.cinnabar : InkColor.paperPanel,
          hoverFill: canUpgrade ? 0xb2362e : InkColor.paperDeep,
          textColor: canUpgrade ? InkText.paper : InkText.faint,
          fontSize: 12.5,
          stroke: canUpgrade ? InkColor.cinnabar : InkColor.inkFaint,
          onClick: () => {
            if (!canUpgrade) {
              this.showMessage(`专属将魂不足（${soulStones}/${required}），可先点击【名将传记】免费领取`)
              return
            }
            closeAll()
            this.upgradeHeroStar(hero.id, required)
            this.showStarDestinyDetailDialog(hero, hero.star - 1)
          }
        }
      )
      panel.add(upBtn)
    }

    const closeBtn = createInkButton(this, dialogW / 2 + 168, btnY, 112, 30, '关闭命盘', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 12.5,
      onClick: closeAll
    })
    panel.add(closeBtn)
  }

  /**
   * 按需弹窗 2：五大基础属性来源拆解与“局外 ≤ +50% 保下限”铁律说明
   */
  private showStatBreakdownDialog(hero: Hero): void {
    const dialogW = 600
    const dialogH = 400
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.ink,
      strokeWidth: 2
    })
    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    const stats = this.getEffectiveStatsWithEquipment(hero)
    const lvBonusPct = Math.round(getLevelStatBonus(hero.level) * 100)
    const gemBonuses = this.equipmentManager.getHeroGemStatBonuses(hero.id)
    const atkOutPct =
      hero.baseStats.attack > 0
        ? Math.round(((stats.attack - hero.baseStats.attack) / hero.baseStats.attack) * 100)
        : 0
    const spdOutPct =
      hero.baseStats.attackSpeed > 0
        ? Math.round(
            ((stats.attackSpeed - hero.baseStats.attackSpeed) / hero.baseStats.attackSpeed) * 100
          )
        : 0
    const rngOutPct =
      hero.baseStats.attackRange > 0
        ? Math.round(
            ((stats.attackRange - hero.baseStats.attackRange) / hero.baseStats.attackRange) * 100
          )
        : 0

    panel.add(
      inkText(this, dialogW / 2, 28, `【📊 ${hero.name} · 五维属性来源拆解】`, {
        size: 19,
        color: InkText.strong,
        bold: true,
        originX: 0.5
      })
    )
    panel.add(
      inkText(
        this,
        dialogW / 2,
        52,
        '第一性原理铁律：局外养成总增益上限 ≤ +50%（局外保下限，局内相生与锦囊定上限）',
        {
          size: 12,
          color: InkText.cinnabar,
          bold: true,
          originX: 0.5
        }
      )
    )

    const rows = [
      {
        name: '攻击力 (Attack)',
        finalVal: `${stats.attack}`,
        baseVal: `${hero.baseStats.attack}`,
        detail: `武道Lv.${hero.level} (+${lvBonusPct}%) + 灵石 (+${Math.round(gemBonuses.attackPercent * 100)}%) + 军备  →  局外合计 +${atkOutPct}% (上限+50%)`
      },
      {
        name: '攻击速度 (Attack Speed)',
        finalVal: `${stats.attackSpeed.toFixed(2)}/s`,
        baseVal: `${hero.baseStats.attackSpeed.toFixed(2)}/s`,
        detail: `灵石 (+${Math.round(gemBonuses.attackSpeedPercent * 100)}%) + 军备加成  →  局外合计 +${spdOutPct}% (上限+50%)`
      },
      {
        name: '攻击范围 (Range)',
        finalVal: `${stats.attackRange}px`,
        baseVal: `${hero.baseStats.attackRange}px`,
        detail: `灵石 (+${gemBonuses.attackRangeFlat}px) + 军备加成  →  局外合计 +${rngOutPct}% (上限+50%)`
      },
      {
        name: '暴击几率 (Crit Rate)',
        finalVal: `${Math.round(stats.critRate * 100)}%`,
        baseVal: `${Math.round((hero.baseStats.critRate ?? 0.1) * 100)}%`,
        detail: `灵石 (+${(gemBonuses.critRateBonus * 100).toFixed(1)}%) + 军备加成（实战对抗敌军【韧性】）`
      },
      {
        name: '暴击伤害 (Crit Damage)',
        finalVal: `+${Math.round(stats.critDamage * 100)}%`,
        baseVal: `+${Math.round((hero.baseStats.critDamage ?? 0.5) * 100)}%`,
        detail: `灵石 (+${(gemBonuses.critDamageBonus * 100).toFixed(1)}%) + 军备加成（实战对抗敌军【刚毅】）`
      }
    ]

    let ry = 80
    rows.forEach(r => {
      const box = this.add.rectangle(dialogW / 2, ry + 22, dialogW - 44, 44, InkColor.paperDeep, 0.7)
      box.setStrokeStyle(1, InkColor.inkFaint, 0.5)
      panel.add(box)

      panel.add(
        inkText(this, 36, ry + 13, `${r.name}：${r.finalVal}`, {
          size: 13.5,
          color: InkText.strong,
          bold: true
        })
      )
      panel.add(
        inkText(this, dialogW - 36, ry + 13, `初始基准：${r.baseVal}`, {
          size: 11.5,
          color: InkText.wash,
          originX: 1
        })
      )
      panel.add(
        inkText(this, 36, ry + 32, r.detail, {
          size: 11,
          color: InkText.ink
        })
      )
      ry += 50
    })

    panel.add(
      createInkButton(this, dialogW / 2, dialogH - 28, 108, 30, '关闭拆解', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 13,
        onClick: closeAll
      })
    )
  }

  /**
   * 按需弹窗：战法与特质详解（支持一键切换查看 主动战法 / 基础被动 / 2★同源共鸣 / 3★本命特质 / 4★相生共鸣 / 5★圣兽大招）
   */
  private showSkillDetailDialog(
    hero: Hero,
    initialFocus:
      | 'active'
      | 'passive'
      | 'sameResonance'
      | 'trait3'
      | 'genResonance'
      | 'ultimate'
  ): void {
    const dialogW = 680
    const dialogH = 400
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.cinnabar,
      strokeWidth: 2
    })
    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    let currentFocus = initialFocus
    const contentGroup = this.add.container(0, 0)
    panel.add(contentGroup)

    const cfg = getHeroConfig(hero.id)
    const heroEquip = this.equipmentManager.getHeroEquipment(hero.id)
    const artifactInst = heroEquip.artifact
    const evo = artifactInst
      ? this.equipmentManager.getArtifactEvolutionStage(artifactInst.instanceId)
      : null
    const isExclusiveEquipped = Boolean(
      artifactInst &&
        this.equipmentManager.isExclusiveForHero(artifactInst.instanceId, hero.id, hero.name)
    )
    const exclusiveArtifactCfg = artifacts.find(
      (a: any) => a.exclusiveHero === hero.name || a.exclusiveHeroes?.includes(hero.id)
    ) as any
    const resCfg = exclusiveArtifactCfg?.exclusiveResonance
    const reqWuXing = (exclusiveArtifactCfg?.gemSocket?.requiredWuXing || hero.wuXing) as WuXing
    const genWuXing = WuXingGeneratedBy[reqWuXing]
    const activeSkill = getSkill(hero.activeSkillId) as any
    const passiveSkill = getSkill(hero.passiveSkillId) as any
    const ultUnlocked = Boolean(
      isExclusiveEquipped && hero.star >= 5 && evo?.hasDualLv5Ultimate
    )

    const renderView = () => {
      contentGroup.removeAll(true)

      contentGroup.add(
        inkText(this, dialogW / 2, 26, `【📜 ${hero.name} · 战法与特质详解】`, {
          size: 19,
          color: InkText.strong,
          bold: true,
          originX: 0.5
        })
      )

      const tabs: {
        key:
          | 'active'
          | 'passive'
          | 'sameResonance'
          | 'trait3'
          | 'genResonance'
          | 'ultimate'
        label: string
      }[] = [
        { key: 'active', label: '主动战法' },
        { key: 'passive', label: '基础被动' },
        { key: 'sameResonance', label: '2★同源共鸣' },
        { key: 'trait3', label: '3★本命特质' },
        { key: 'genResonance', label: '4★相生共鸣' },
        { key: 'ultimate', label: '5★圣兽大招' }
      ]

      tabs.forEach((t, idx) => {
        const active = currentFocus === t.key
        const btn = createInkButton(this, 75 + idx * 106, 62, 98, 28, t.label, {
          fill: active ? InkColor.cinnabar : InkColor.paperDeep,
          hoverFill: active ? 0xb2362e : InkColor.paper,
          textColor: active ? InkText.paper : InkText.ink,
          fontSize: 11.5,
          stroke: active ? InkColor.cinnabar : InkColor.inkFaint,
          onClick: () => {
            currentFocus = t.key
            renderView()
          }
        })
        contentGroup.add(btn)
      })

      const bodyBg = this.add.rectangle(
        dialogW / 2,
        216,
        dialogW - 44,
        240,
        InkColor.paperDeep,
        0.75
      )
      bodyBg.setStrokeStyle(1, InkColor.inkFaint, 0.6)
      contentGroup.add(bodyBg)

      if (currentFocus === 'active') {
        contentGroup.add(
          inkText(
            this,
            38,
            114,
            `【原始主动战法】${activeSkill?.name || '主动战法'}  （冷却：${activeSkill?.cooldown || 8}s）`,
            {
              size: 14,
              color: InkText.strong,
              bold: true
            }
          )
        )
        contentGroup.add(
          inkText(this, 38, 134, activeSkill?.description || '', {
            size: 12.5,
            color: InkText.ink,
            originX: 0,
            originY: 0,
            wrapWidth: dialogW - 76
          })
        )

        inkRule(this, contentGroup, 38, 198, dialogW - 76, 0.35)

        contentGroup.add(
          inkText(
            this,
            38,
            218,
            `【本命神兵进化】佩带《${exclusiveArtifactCfg?.name || '本命神兵'}》（${isExclusiveEquipped ? '✓ 当前已生效' : '○ 尚未佩带'}）`,
            {
              size: 14,
              color: isExclusiveEquipped ? InkText.cinnabar : InkText.wash,
              bold: true
            }
          )
        )
        contentGroup.add(
          inkText(this, 38, 238, resCfg?.evolvedSkillDesc || '佩带本命神兵后主动战法形态质变', {
            size: 12.5,
            color: isExclusiveEquipped ? InkText.strong : InkText.ink,
            originX: 0,
            originY: 0,
            wrapWidth: dialogW - 76
          })
        )
      } else if (currentFocus === 'passive') {
        contentGroup.add(
          inkText(this, 38, 120, `【基础被动】${passiveSkill?.name || '名将武魂'}（✓ 常驻生效）`, {
            size: 15,
            color: InkText.strong,
            bold: true
          })
        )
        contentGroup.add(
          inkText(this, 38, 148, passiveSkill?.description || '', {
            size: 13,
            color: InkText.ink,
            originX: 0,
            originY: 0,
            wrapWidth: dialogW - 76
          })
        )
      } else if (currentFocus === 'sameResonance' || currentFocus === 'genResonance') {
        const isSame = currentFocus === 'sameResonance'
        const reqStar = isSame ? 2 : 4
        const slotWx = isSame ? reqWuXing : genWuXing
        const curGem = isSame ? evo?.sameGem : evo?.generatingGem
        const isUnlocked = isExclusiveEquipped && hero.star >= reqStar && Boolean(curGem)
        const descs: Record<number, string> =
          (isSame ? resCfg?.sameLevelDescs : resCfg?.generatingLevelDescs) || {}

        const statusStr = isUnlocked
          ? `✓ 已激活（当前镶嵌：Lv.${curGem?.level} ${INK_WUXING[slotWx].label}系宝石）`
          : `🔒 需佩带《${exclusiveArtifactCfg?.name || '本命神兵'}》+ 升至 ${reqStar}★ + 镶嵌【${INK_WUXING[slotWx].label}】系宝石`

        contentGroup.add(
          inkText(
            this,
            38,
            114,
            `【${reqStar}★ ${isSame ? '同源' : '相生'}灵石共鸣】  ${statusStr}`,
            {
              size: 13.5,
              color: isUnlocked ? InkText.cinnabar : InkText.wash,
              bold: true
            }
          )
        )

        for (let lv = 1; lv <= 5; lv++) {
          const lineTxt = descs[lv] || descs[lv - 1]
          if (!lineTxt) continue
          const ly = 140 + (lv - 1) * 38
          const isCur = isUnlocked && curGem?.level === lv
          contentGroup.add(
            inkText(this, 38, ly, `${isCur ? '▶ ' : '• '}${lineTxt}`, {
              size: 12,
              color: isCur ? InkText.cinnabar : InkText.ink,
              bold: isCur,
              originX: 0,
              originY: 0,
              wrapWidth: dialogW - 76
            })
          )
        }
      } else if (currentFocus === 'trait3') {
        const unlocked = hero.star >= 3
        contentGroup.add(
          inkText(
            this,
            38,
            120,
            `【3★ 三国本命特质】${cfg?.star3TraitName || ''}（${unlocked ? '✓ 已觉醒' : '🔒 需 3★ 觉醒'}）`,
            {
              size: 15,
              color: unlocked ? InkText.cinnabar : InkText.wash,
              bold: true
            }
          )
        )
        contentGroup.add(
          inkText(this, 38, 148, cfg?.star3TraitDesc || '', {
            size: 13,
            color: InkText.ink,
            originX: 0,
            originY: 0,
            wrapWidth: dialogW - 76
          })
        )
      } else {
        contentGroup.add(
          inkText(
            this,
            38,
            116,
            `【5★ 圣兽终极大招】${resCfg?.ultimateName || '五行法相'}（${ultUnlocked ? '🐉 已觉醒' : '🔒 待觉醒'}）`,
            {
              size: 15,
              color: ultUnlocked ? InkText.cinnabar : InkText.gold,
              bold: true
            }
          )
        )
        contentGroup.add(
          inkText(
            this,
            38,
            142,
            `觉醒条件：${isExclusiveEquipped ? '✓' : '○'} 佩带《${exclusiveArtifactCfg?.name || '本命神兵'}》   |   ${hero.star >= 5 ? '✓' : '○'} 将星达 5★   |   ${evo?.hasDualLv5Ultimate ? '✓' : '○'} 双槽镶嵌 Lv.5 灵石`,
            {
              size: 12,
              color: InkText.wash,
              bold: true
            }
          )
        )
        contentGroup.add(
          inkText(this, 38, 170, resCfg?.level5UltimateDesc || resCfg?.ultimateDesc || '', {
            size: 13,
            color: InkText.ink,
            originX: 0,
            originY: 0,
            wrapWidth: dialogW - 76
          })
        )
      }

      const sandboxBtn = createInkButton(this, dialogW / 2 - 74, dialogH - 26, 136, 28, '⚔️ 四阶技能演武', {
        fill: InkColor.cinnabar,
        hoverFill: 0xb2362e,
        textColor: InkText.paper,
        fontSize: 12,
        onClick: () => {
          closeAll()
          this.showSkillSandboxDialog(hero)
        }
      })
      const closeBtn = createInkButton(this, dialogW / 2 + 74, dialogH - 26, 108, 28, '关闭详解', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 12,
        onClick: closeAll
      })
      contentGroup.add([sandboxBtn, closeBtn])
    }

    renderView()
  }

  /**
   * 弹窗：四阶技能实时演武沙盒（原【水墨博物志·名将录】核心亮点融入【武将】页）
   */
  private showSkillSandboxDialog(hero: Hero): void {
    const dialogW = 620
    const dialogH = 420
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: 0xa0782f,
      strokeWidth: 2
    })
    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    const wx = INK_WUXING[hero.wuXing]
    const heroSkillName = getSkill(hero.activeSkillId)?.name || '本命战法'
    const beastTitles: Record<string, string> = {
      hero_guanyu: '🐉 东方青龙法相 · 青龙啸天',
      hero_huangzhong: '🦅 南方朱雀法相 · 九日连珠',
      hero_zhangfei: '⛰️ 中土玄岳法相 · 万夫莫开',
      hero_machao: '🐅 西方白虎法相 · 万骑奔雷',
      hero_zhaoyun: '🐢 北方玄武法相 · 龙胆惊鸿'
    }

    const dynamicGroup = this.add.container(0, 0)
    panel.add(dynamicGroup)

    const renderSandbox = () => {
      dynamicGroup.removeAll(true)

      dynamicGroup.add(
        inkText(this, dialogW / 2, 26, `【⚔️ ${hero.name} · 四阶技能进化演武场】`, {
          size: 20,
          color: InkText.strong,
          bold: true,
          originX: 0.5
        })
      )

      // 4 阶切换按钮横排
      const tierBtns: { tier: 1 | 2 | 3 | 4; label: string }[] = [
        { tier: 1, label: '① 原始技能' },
        { tier: 2, label: '② +本命神兵' },
        { tier: 3, label: '③ +双槽灵石' },
        { tier: 4, label: '④ 🐉 双Lv.5大招' }
      ]

      tierBtns.forEach((tb, idx) => {
        const active = this.sandboxTier === tb.tier
        const bx = 92 + idx * 145
        const btn = createInkButton(this, bx, 64, 134, 30, tb.label, {
          fill: active ? InkColor.cinnabar : InkColor.paperDeep,
          hoverFill: active ? 0xb53a32 : InkColor.paperPanel,
          textColor: active ? '#ffffff' : InkText.ink,
          fontSize: 12,
          stroke: active ? 0xd4af37 : InkColor.inkFaint,
          onClick: () => {
            SoundFX.stamp(0.2)
            this.sandboxTier = tb.tier
            renderSandbox()
          }
        })
        dynamicGroup.add(btn)
      })

      // 演武沙盒视窗
      const sbW = 556
      const sbH = 210
      const sbX = dialogW / 2
      const sbY = 200

      const sbBg = this.add.rectangle(sbX, sbY, sbW, sbH, 0x1e1b16, 0.94)
      sbBg.setStrokeStyle(2, 0xc89b3c, 0.95)
      dynamicGroup.add(sbBg)

      const sbInner = this.add.container(sbX, sbY)
      dynamicGroup.add(sbInner)

      const gridG = this.add.graphics()
      gridG.lineStyle(1, 0xd4af37, 0.18)
      gridG.strokeCircle(-130, 8, 44)
      gridG.lineBetween(-220, 8, 220, 8)
      sbInner.add(gridG)

      const heroDummyX = -130
      const heroDummyY = 8
      if (this.sandboxTier >= 2) {
        const goldRing = this.add.graphics()
        goldRing.lineStyle(2.2, 0xffd700, 0.92)
        goldRing.strokeCircle(heroDummyX, heroDummyY, 30)
        goldRing.lineStyle(1.2, wx.border, 0.75)
        goldRing.strokeCircle(heroDummyX, heroDummyY, 36)
        sbInner.add(goldRing)
      }

      const heroToken = this.add.circle(heroDummyX, heroDummyY, 22, wx.fill, 1)
      heroToken.setStrokeStyle(2, 0xffffff, 0.9)
      const heroTokTxt = inkText(this, heroDummyX, heroDummyY, hero.name[0], {
        size: 16,
        color: '#ffffff',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      sbInner.add([heroToken, heroTokTxt])

      if (this.sandboxTier >= 3) {
        const orb1 = this.add.circle(heroDummyX - 28, heroDummyY - 16, 6, wx.border, 1)
        const orb2 = this.add.circle(heroDummyX + 28, heroDummyY + 16, 6, 0xffd700, 1)
        sbInner.add([orb1, orb2])
      }

      const targetX = 130
      const targetY = 8
      const dummyTarget = this.add.rectangle(targetX, targetY, 36, 52, 0x6d4c41, 1)
      dummyTarget.setStrokeStyle(1.5, 0xffca28, 0.9)
      const dummyLabel = inkText(this, targetX, targetY, '木人\n机关', {
        size: 11,
        color: '#fff8e1',
        originX: 0.5,
        originY: 0.5
      })
      sbInner.add([dummyTarget, dummyLabel])

      const fxG = this.add.graphics()
      sbInner.add(fxG)
      const tierColor =
        this.sandboxTier === 1
          ? 0xb0bec5
          : this.sandboxTier === 2
            ? wx.border
            : this.sandboxTier === 3
              ? 0xffb300
              : 0xff5252
      fxG.lineStyle(this.sandboxTier * 1.5 + 2, tierColor, 0.92)
      fxG.beginPath()
      fxG.moveTo(heroDummyX + 22, heroDummyY)
      fxG.lineTo(targetX - 18, targetY)
      fxG.strokePath()
      fxG.fillStyle(tierColor, 0.35)
      fxG.fillCircle(targetX, targetY, 20 + this.sandboxTier * 8)

      const tierLabels: Record<1 | 2 | 3 | 4, string> = {
        1: `① 原始技能：【${heroSkillName}】基础水墨气劲`,
        2: `② +本命神兵：脚底常驻器灵金环 + 八卦阵技能质变`,
        3: `③ +同源&相生灵石：双色护体灵魄环绕 + 三才共鸣流光`,
        4: `④ 终极大招：0.35s 暗场聚焦 + 名将诗号卷轴 + ${beastTitles[hero.id] || '圣兽法相'}`
      }
      sbInner.add(
        inkText(this, 0, -sbH / 2 + 20, tierLabels[this.sandboxTier], {
          size: 13,
          color: '#ffe082',
          bold: true,
          originX: 0.5,
          originY: 0.5
        })
      )

      if (this.sandboxTier === 4) {
        const scrollBanner = this.add.rectangle(0, 72, sbW - 40, 30, 0x8e1e16, 0.95)
        scrollBanner.setStrokeStyle(1.2, 0xffd700)
        const scrollTxt = inkText(
          this,
          0,
          72,
          `📜 诗号切入 · ${beastTitles[hero.id] || '五行圣兽法相降临'}`,
          {
            size: 12.5,
            color: '#fff8e1',
            bold: true,
            originX: 0.5,
            originY: 0.5
          }
        )
        sbInner.add([scrollBanner, scrollTxt])
      }

      const closeBtn = createInkButton(this, dialogW / 2, dialogH - 32, 128, 34, '关闭演武', {
        fill: InkColor.paperDeep,
        hoverFill: InkColor.paper,
        textColor: InkText.ink,
        fontSize: 13,
        onClick: closeAll
      })
      dynamicGroup.add(closeBtn)
    }

    renderSandbox()
  }

  // ==================== 弹窗集（传记试炼 / 装备选择 / 灵石镶嵌） ====================

  private showBiographyTrialDialog(hero: Hero): void {
    const dialogW = 580
    const dialogH = 360
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.cinnabar,
      strokeWidth: 2
    })
    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    panel.add(
      inkText(this, dialogW / 2, 26, `【📜 ${hero.name} · 名将传记试炼】`, {
        size: 20,
        color: InkText.cinnabar,
        bold: true,
        originX: 0.5
      })
    )
    panel.add(
      inkText(
        this,
        dialogW / 2,
        50,
        '达成名将实战传记壮举即可领取专属将魂（共 4 块，保底点亮 2★【同源槽】与 3★【本命特质】）',
        {
          size: 12,
          color: InkText.wash,
          originX: 0.5
        }
      )
    )

    const trialsMap: Record<
      string,
      { id: string; title: string; desc: string; reward: number }[]
    > = {
      hero_guanyu: [
        {
          id: 'guanyu_1',
          title: '传记一 · 温酒斩华雄',
          desc: '派遣关羽出战并累计触发 10 次【木·毒】侵蚀',
          reward: 1
        },
        {
          id: 'guanyu_2',
          title: '传记二 · 水淹七军',
          desc: '单局内以关羽触发 5 次水生木【滋养·蔓延】藤蔓定身',
          reward: 1
        },
        {
          id: 'guanyu_3',
          title: '传记三 · 威震华夏',
          desc: '单局内触发 8 次木生火【燎原·焚尽】并击败镇守统帅',
          reward: 2
        }
      ],
      hero_huangzhong: [
        {
          id: 'hz_1',
          title: '传记一 · 百步穿杨',
          desc: '派遣黄忠出战并在最远射程命中敌军 15 次',
          reward: 1
        },
        {
          id: 'hz_2',
          title: '传记二 · 烈弓焚营',
          desc: '单局内以黄忠引爆 6 次木生火【燎原·焚尽】火海',
          reward: 1
        },
        {
          id: 'hz_3',
          title: '传记三 · 定军斩渊',
          desc: '单局内以黄忠触发 6 次火生土【熔岩·焦土】并破除统帅铁壁',
          reward: 2
        }
      ],
      hero_zhangfei: [
        {
          id: 'zf_1',
          title: '传记一 · 当阳怒吼',
          desc: '派遣张飞出战并累计使 15 名敌军陷入【土·重】削韧',
          reward: 1
        },
        {
          id: 'zf_2',
          title: '传记二 · 焦土震岳',
          desc: '单局内触发 5 次火生土【熔岩·焦土】并打出负重内震',
          reward: 1
        },
        {
          id: 'zf_3',
          title: '传记三 · 据水断桥',
          desc: '单局内触发 6 次土生金【淬刃·锋芒】并守护帅营不失',
          reward: 2
        }
      ],
      hero_machao: [
        {
          id: 'mc_1',
          title: '传记一 · 西凉锦马超',
          desc: '派遣马超出战并累计触发 15 次【金·裂】破甲流血',
          reward: 1
        },
        {
          id: 'mc_2',
          title: '传记二 · 潼关割袍',
          desc: '单局内以马超触发 6 次土生金【淬刃·锋芒】剑气迸射',
          reward: 1
        },
        {
          id: 'mc_3',
          title: '传记三 · 渭水筑冰城',
          desc: '单局内触发 6 次金生水【寒芒·碎冰】冻结敌军主力',
          reward: 2
        }
      ],
      hero_zhaoyun: [
        {
          id: 'zy_1',
          title: '传记一 · 白马银枪',
          desc: '派遣赵云出战并累计触发 15 次【水·湿】迟滞减速',
          reward: 1
        },
        {
          id: 'zy_2',
          title: '传记二 · 汉水拒曹',
          desc: '单局内以赵云触发 6 次金生水【寒芒·碎冰】绝对冰封',
          reward: 1
        },
        {
          id: 'zy_3',
          title: '传记三 · 长坂七进七出',
          desc: '单局内触发 6 次水生木【滋养·蔓延】并满血通关战役',
          reward: 2
        }
      ]
    }

    const trials = trialsMap[hero.id] || trialsMap.hero_guanyu
    let rowY = 98
    for (const t of trials) {
      const claimed = this.claimedBioTrials.has(t.id)
      const rowBg = this.add.rectangle(
        dialogW / 2,
        rowY,
        dialogW - 44,
        58,
        InkColor.paperDeep,
        0.75
      )
      rowBg.setStrokeStyle(1, claimed ? 0x5f7a4a : InkColor.cinnabar)
      panel.add(rowBg)

      panel.add(
        inkText(this, 36, rowY - 11, `${t.title}  （奖励: 💎 ${hero.name}将魂 ×${t.reward}）`, {
          size: 14,
          color: InkText.strong,
          bold: true
        })
      )
      panel.add(
        inkText(this, 36, rowY + 11, t.desc, {
          size: 11,
          color: InkText.wash
        })
      )

      if (claimed) {
        panel.add(
          inkText(this, dialogW - 88, rowY, '✓ 已领取', {
            size: 13,
            color: InkText.green,
            bold: true,
            originX: 0.5,
            originY: 0.5
          })
        )
      } else {
        const claimBtn = createInkButton(this, dialogW - 88, rowY, 100, 30, '领取将魂', {
          fill: InkColor.cinnabar,
          hoverFill: 0xb53a32,
          textColor: '#ffffff',
          fontSize: 12,
          onClick: () => {
            this.claimedBioTrials.add(t.id)
            this.addSoulStones(hero.id, t.reward)
            this.autoSave()
            inkToast(this, `完成【${t.title}】，获得 ${hero.name}将魂 ×${t.reward}！`)
            closeAll()
            this.renderRoster()
            this.updateCardSelection()
            this.updateDetailPanel(hero.id)
          }
        })
        panel.add(claimBtn)
      }

      rowY += 68
    }

    const closeBtn = createInkButton(this, dialogW / 2, dialogH - 26, 100, 30, '关闭卷轴', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 13,
      onClick: closeAll
    })
    panel.add(closeBtn)
  }

  private showHeroGemSocketDialog(
    hero: Hero,
    artifact: EquipmentInstance,
    slotType: 'same' | 'generating',
    slotWuXing: WuXing
  ): void {
    const wxStyle = INK_WUXING[slotWuXing]
    const matchingGems = this.equipmentManager
      .getOwnedGems()
      .filter(g => g.wuXing === slotWuXing)
      .sort((a, b) => b.level - a.level)

    if (matchingGems.length === 0) {
      this.showAcquisitionGuideDialog('gem', hero, slotWuXing)
      return
    }

    const dialogW = 480
    const dialogH = 360
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.ink,
      strokeWidth: 2
    })

    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    const slotLabel = slotType === 'same' ? '2★ 同源灵石槽' : '4★ 相生灵石槽'
    panel.add(
      inkText(this, dialogW / 2, 28, `选择【${wxStyle.label}】系灵石 · ${slotLabel}`, {
        size: 18,
        color: InkText.strong,
        bold: true,
        originX: 0.5
      })
    )

    const startY = 70
    const itemH = 48
    matchingGems.slice(0, 5).forEach((g, idx) => {
      const itemY = startY + idx * (itemH + 6)
      const loc = this.equipmentManager.getGemSocketLocation(g.id)
      const itemBg = this.add.rectangle(
        dialogW / 2,
        itemY,
        dialogW - 40,
        itemH,
        wxStyle.fill,
        0.92
      )
      itemBg.setStrokeStyle(1, wxStyle.border)
      panel.add(itemBg)

      const iconKey = `gem_icon_${g.wuXing}_${g.level}`
      if (this.textures.exists(iconKey)) {
        panel.add(this.add.image(42, itemY, iconKey).setScale(0.68))
      }

      const affStr = g.affixes?.map(a => this.formatGemAffixText(a)).join('  ·  ') || ''
      const locTag = loc ? ` [已嵌于${loc.artifactName.slice(0, 2)}]` : ''
      panel.add(
        inkText(this, 68, itemY - 9, `${getGemName(g)} Lv.${g.level}${locTag}`, {
          size: 13,
          color: InkText.strong,
          bold: true
        })
      )
      panel.add(
        inkText(this, 68, itemY + 10, affStr, {
          size: 11,
          color: InkText.ink
        })
      )

      const btn = createInkButton(this, dialogW - 64, itemY, 68, 28, '镶嵌', {
        fill: InkColor.paper,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.cinnabar,
        fontSize: 12,
        stroke: InkColor.cinnabar,
        onClick: () => {
          this.equipmentManager.socketGemToArtifact(artifact.instanceId, g.id, slotType)
          this.autoSave()
          closeAll()
          this.renderRoster()
          this.updateCardSelection()
          this.updateDetailPanel(hero.id)
          this.showMessage(`已镶嵌【${getGemName(g)} Lv.${g.level}】`)
        }
      })
      panel.add(btn)
    })

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

  /**
   * 按需弹窗 5：装备 / 神兵 / 宝石获取途径指引与工坊一键跳转
   */
  private showAcquisitionGuideDialog(
    category: 'weapon' | 'artifact' | 'gem',
    hero: Hero,
    targetWuXing?: WuXing
  ): void {
    const dialogW = 540
    const dialogH = 320
    const { overlay, panel } = createInkDialog(this, dialogW, dialogH, {
      stroke: InkColor.cinnabar,
      strokeWidth: 2
    })
    const closeAll = () => {
      overlay.destroy()
      panel.destroy()
    }

    const exclusiveCfg = artifacts.find(
      (a: any) => a.exclusiveHero === hero.name || a.exclusiveHeroes?.includes(hero.id)
    ) as any
    const wxLabel = targetWuXing ? INK_WUXING[targetWuXing].label : INK_WUXING[hero.wuXing].label

    const titleMap = {
      weapon: '【🗡️ 兵械获取途径】',
      artifact: `【🔥 本命神兵《${exclusiveCfg?.name || '专属神兵'}》获取途径】`,
      gem: `【💎 ${wxLabel}系五行宝石获取与升阶途径】`
    }

    const linesMap = {
      weapon: [
        '• 当前背包暂无闲置【兵械】可供佩带。',
        '• 获取方式 ①：出征通关 15 波战役关卡，结算奖励必得精良兵械。',
        '• 获取方式 ②：前往【军备】页面查看已佩带在其他武将身上的兵械并调配。'
      ],
      artifact: [
        `• ${hero.name}的本命神兵为《${exclusiveCfg?.name || '专属神兵'}》，佩带后主动技能形态质变！`,
        '• 获取方式 ①：击败战役第 15 波守关统帅 Boss 必掉宿命主材（一生仅需铸造 1 把）。',
        '• 获取方式 ②：前往【军备】页面使用统帅主材定向锻造，或调配已有神兵。'
      ],
      gem: [
        `• 当前背包暂无可用的【${wxLabel}】系五行宝石。`,
        '• 获取方式 ①：战役通关结算与【无尽北伐 (Wave 16+)】掉落各系五行宝石。',
        '• 获取方式 ②：前往【军备】页【三才炼石炉】，3 颗同阶宝石可三合一升阶（100%继承主石词条）。'
      ]
    }

    panel.add(
      inkText(this, dialogW / 2, 30, titleMap[category], {
        size: 19,
        color: InkText.strong,
        bold: true,
        originX: 0.5
      })
    )

    const box = this.add.rectangle(dialogW / 2, 146, dialogW - 48, 156, InkColor.paperDeep, 0.75)
    box.setStrokeStyle(1, InkColor.inkFaint, 0.6)
    panel.add(box)

    linesMap[category].forEach((line, idx) => {
      panel.add(
        inkText(this, 40, 88 + idx * 46, line, {
          size: 13,
          color: idx === 0 ? InkText.cinnabar : InkText.ink,
          bold: idx === 0,
          originX: 0,
          originY: 0,
          wrapWidth: dialogW - 80
        })
      )
    })

    const goEquipBtn = createInkButton(this, dialogW / 2 - 84, dialogH - 32, 148, 30, '🛠️ 前往军备工坊', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb2362e,
      textColor: InkText.paper,
      fontSize: 13,
      onClick: () => {
        closeAll()
        this.autoSave()
        this.scene.start('EquipmentScene')
      }
    })
    const closeBtn = createInkButton(this, dialogW / 2 + 84, dialogH - 32, 112, 30, '知道了', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 13,
      onClick: closeAll
    })
    panel.add([goEquipBtn, closeBtn])
  }

  private unequipEquipment(instanceId: string, heroId: string): void {
    this.equipmentManager.unequipFromHero(instanceId)
    const hero = this.heroes.get(heroId)
    if (hero) {
      const heroEq = this.equipmentManager.getHeroEquipment(heroId)
      hero.equipment = {
        weapon: heroEq.weapon?.equipmentId || null,
        artifact: heroEq.artifact?.equipmentId || null
      }
    }
    this.autoSave()
    this.renderRoster()
    this.updateCardSelection()
    this.updateDetailPanel(heroId)
    this.showMessage('已卸下装备')
  }

  private showEquipmentSelection(type: 'weapon' | 'artifact', heroId: string): void {
    const unequipped = this.equipmentManager.getUnequippedEquipment().filter(e => e.type === type)
    const hero = this.heroes.get(heroId)

    if (unequipped.length === 0) {
      if (type === 'artifact') {
        this.showMessage('暂无其他闲置神兵可更换')
      } else if (hero) {
        this.showAcquisitionGuideDialog(type, hero)
      } else {
        this.showMessage('没有可用的闲置装备')
      }
      return
    }

    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, InkColor.ink, 0.2)
    overlay.setInteractive()
    overlay.setDepth(InkDepth.overlay)

    const panelW = 420
    const rowGap = 44
    const panelH = Math.min(96 + unequipped.length * rowGap + 56, 420)
    const popup = createPanel(
      this,
      width / 2 - panelW / 2,
      height / 2 - panelH / 2,
      panelW,
      panelH,
      {
        fill: InkColor.paperPanel,
        alpha: 0.98,
        stroke: InkColor.ink,
        strokeWidth: 2,
        radius: InkRadius.md
      }
    )
    popup.setDepth(InkDepth.popup)

    popup.add(
      inkText(this, panelW / 2, 30, `选择${type === 'weapon' ? '兵械' : '神兵'}`, {
        size: 18,
        color: InkText.strong,
        bold: true,
        originX: 0.5
      })
    )

    const rowsTop = 56
    for (let i = 0; i < unequipped.length; i++) {
      const equip = unequipped[i]
      const detail = this.equipmentManager.getEquipmentDetail(equip.instanceId) as any
      if (!detail) continue

      const isExclusive = this.equipmentManager.isExclusiveForHero(
        equip.instanceId,
        heroId,
        hero?.name
      )
      const hasExclusiveConfig = Boolean(
        detail.exclusiveHero || (detail.exclusiveHeroes && detail.exclusiveHeroes.length > 0)
      )
      const rowY = rowsTop + i * rowGap + 18
      const rarityStyle = INK_RARITY[equip.rarity as Rarity]

      const btnBg = this.add.rectangle(panelW / 2, rowY, panelW - 44, 36, rarityStyle.tint, 0.9)
      btnBg.setStrokeStyle(1, isExclusive ? InkColor.cinnabar : rarityStyle.border)
      btnBg.setInteractive({ useHandCursor: true })
      popup.add(btnBg)

      popup.add(inkText(this, 32, rowY, detail.name, { size: 14, color: InkText.ink, bold: true }))
      popup.add(
        inkText(this, 134, rowY, RarityNames[equip.rarity as Rarity], {
          size: InkFontSize.xs,
          color: rarityStyle.text
        })
      )

      if (type === 'artifact') {
        if (isExclusive) {
          popup.add(
            inkText(this, 184, rowY, '【本命专属】', {
              size: 11,
              color: InkText.cinnabar,
              bold: true
            })
          )
        } else if (hasExclusiveConfig) {
          popup.add(
            inkText(this, 184, rowY, `【${detail.exclusiveHero || '他将'}专属】`, {
              size: 11,
              color: InkText.faint
            })
          )
        } else {
          popup.add(
            inkText(this, 184, rowY, '【通用古宝】', {
              size: 11,
              color: InkText.ink
            })
          )
        }
      }

      const bParts: string[] = []
      if (detail.bonus) {
        if (detail.bonus.attackPercent)
          bParts.push(`攻+${Math.round(detail.bonus.attackPercent * 100)}%`)
        if (detail.bonus.attackSpeedPercent)
          bParts.push(`速+${Math.round(detail.bonus.attackSpeedPercent * 100)}%`)
        if (detail.bonus.attackRangePercent)
          bParts.push(`距+${Math.round(detail.bonus.attackRangePercent * 100)}%`)
        if (detail.bonus.critRateBonus)
          bParts.push(`暴+${Math.round(detail.bonus.critRateBonus * 100)}%`)
        if (detail.bonus.critDamageBonus)
          bParts.push(`伤+${Math.round(detail.bonus.critDamageBonus * 100)}%`)
      } else if (detail.bonuses) {
        if (detail.bonuses.attack) bParts.push(`攻+${detail.bonuses.attack}`)
        if (detail.bonuses.attackSpeed) bParts.push(`速+${detail.bonuses.attackSpeed.toFixed(1)}`)
      }
      popup.add(
        inkText(this, panelW - 28, rowY, bParts.join(' '), {
          size: 11,
          color: InkText.faint,
          originX: 1
        })
      )

      btnBg.on('pointerover', () => btnBg.setFillStyle(rarityStyle.tint, 1))
      btnBg.on('pointerout', () => btnBg.setFillStyle(rarityStyle.tint, 0.9))
      btnBg.on('pointerdown', () => {
        this.equipmentManager.equipToHero(equip.instanceId, heroId, hero?.name)
        if (hero) {
          const heroEq = this.equipmentManager.getHeroEquipment(heroId)
          hero.equipment = {
            weapon: heroEq.weapon?.equipmentId || null,
            artifact: heroEq.artifact?.equipmentId || null
          }
        }
        this.autoSave()
        overlay.destroy()
        popup.destroy()
        this.renderRoster()
        this.updateCardSelection()
        this.updateDetailPanel(heroId)
        if (isExclusive) {
          this.showMessage(`器灵认主！佩带本命神兵【${detail.name}】`)
        } else {
          this.showMessage(`已佩带【${detail.name}】`)
        }
      })
    }

    const closeBtn = createInkButton(this, panelW / 2, panelH - 32, 96, 30, '关闭', {
      fill: InkColor.paperDeep,
      hoverFill: 0xc5b795,
      textColor: InkText.ink,
      fontSize: 14,
      onClick: () => {
        overlay.destroy()
        popup.destroy()
      }
    })
    popup.add(closeBtn)
  }

  // ==================== 数值计算与存档辅助 ====================

  private formatGemAffixText(affix: GemAffix): string {
    const label = GEM_STAT_LABELS[affix.stat]
    const val = affix.isPercentage ? `+${(affix.value * 100).toFixed(1)}%` : `+${affix.value}`
    return `${label} ${val}`
  }

  private getEffectiveStatsWithEquipment(hero: Hero): {
    attack: number
    attackSpeed: number
    attackRange: number
    critRate: number
    critDamage: number
  } {
    const levelBonus = getLevelStatBonus(hero.level)
    const gemBonuses = this.equipmentManager.getHeroGemStatBonuses(hero.id)
    const heroEquipment = this.equipmentManager.getHeroEquipment(hero.id)

    let flatEquipAtk = 0
    let flatEquipSpd = 0
    let flatEquipRng = 0
    let pctEquipAtk = 0
    let pctEquipSpd = 0
    let pctEquipRng = 0
    let equipCritRate = 0
    let equipCritDmg = 0

    const accumulateEquip = (inst: EquipmentInstance | null) => {
      if (!inst) return
      if (inst.type === 'artifact') {
        const affixes = this.equipmentManager.ensureArtifactStatAffixes(inst)
        for (const af of affixes) {
          if (af.stat === 'attack') pctEquipAtk += af.value
          else if (af.stat === 'attackSpeed') pctEquipSpd += af.value
          else if (af.stat === 'attackRange') pctEquipRng += af.value
          else if (af.stat === 'critRate') equipCritRate += af.value
          else if (af.stat === 'critDamage') equipCritDmg += af.value
        }
        return
      }
      const d = this.equipmentManager.getEquipmentDetail(inst.instanceId) as any
      if (!d) return
      if (d.bonuses) {
        flatEquipAtk += d.bonuses.attack || 0
        flatEquipSpd += d.bonuses.attackSpeed || 0
        flatEquipRng += d.bonuses.attackRange || 0
      }
      if (d.bonus) {
        pctEquipAtk += d.bonus.attackPercent || 0
        pctEquipSpd += d.bonus.attackSpeedPercent || 0
        pctEquipRng += d.bonus.attackRangePercent || 0
        equipCritRate += d.bonus.critRateBonus || 0
        equipCritDmg += d.bonus.critDamageBonus || 0
      }
    }

    accumulateEquip(heroEquipment.weapon)
    accumulateEquip(heroEquipment.artifact)

    const equipAtkPct =
      pctEquipAtk + (hero.baseStats.attack > 0 ? flatEquipAtk / hero.baseStats.attack : 0)
    const totalOutAtkBonus = DamageCalculator.clampOutOfBattleBonus(
      levelBonus + gemBonuses.attackPercent + equipAtkPct
    )
    const attack = Math.floor(hero.baseStats.attack * (1 + totalOutAtkBonus))

    const equipSpdPct =
      pctEquipSpd + (hero.baseStats.attackSpeed > 0 ? flatEquipSpd / hero.baseStats.attackSpeed : 0)
    const totalOutSpdBonus = DamageCalculator.clampOutOfBattleBonus(
      gemBonuses.attackSpeedPercent + equipSpdPct
    )
    const attackSpeed = Number((hero.baseStats.attackSpeed * (1 + totalOutSpdBonus)).toFixed(2))

    const equipRngPct =
      pctEquipRng +
      (hero.baseStats.attackRange > 0
        ? (flatEquipRng + gemBonuses.attackRangeFlat) / hero.baseStats.attackRange
        : 0)
    const totalOutRngBonus = DamageCalculator.clampOutOfBattleBonus(equipRngPct)
    const attackRange = Math.floor(hero.baseStats.attackRange * (1 + totalOutRngBonus))

    const critRate = Math.min(
      0.85,
      (hero.baseStats.critRate ?? 0.1) + gemBonuses.critRateBonus + equipCritRate
    )
    const critDamage =
      (hero.baseStats.critDamage ?? 0.5) + gemBonuses.critDamageBonus + equipCritDmg

    return { attack, attackSpeed, attackRange, critRate, critDamage }
  }

  private handleLosslessReset(hero: Hero): void {
    const refundedExp = Math.max(hero.experience, getTotalInvestedExp(hero.level))
    if (refundedExp <= 0) {
      this.showMessage('当前武将尚无修为可传功')
      return
    }

    const candidates = Array.from(this.heroes.values()).filter(
      h => h.id !== hero.id && h.level < MAX_HERO_LEVEL
    )
    const targetHero = candidates[0] || Array.from(this.heroes.values()).find(h => h.id !== hero.id)

    hero.level = 1
    hero.experience = 0

    if (targetHero) {
      targetHero.experience += refundedExp
      targetHero.level = calculateLevelFromExp(targetHero.experience)
      this.autoSave()
      this.renderRoster()
      this.updateCardSelection()
      this.updateDetailPanel(hero.id)
      this.showMessage(
        `【无损传功】已将 ${refundedExp} 修为全额传授予 ${targetHero.name}（Lv.${targetHero.level}）！`
      )
    } else {
      this.autoSave()
      this.renderRoster()
      this.updateCardSelection()
      this.updateDetailPanel(hero.id)
      this.showMessage('【无损归元】已重置武道境界至 Lv.1')
    }
  }

  private addSoulStones(heroId: string, amount: number): void {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()
    if (!saveData) return
    const existing = saveData.inventory.soulStones.find(s => s.heroId === heroId)
    if (existing) {
      existing.amount += amount
    } else {
      saveData.inventory.soulStones.push({ heroId, amount })
    }
    saveManager.saveCurrent()
  }

  private getSoulStones(heroId: string): number {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()
    if (!saveData?.inventory?.soulStones || !Array.isArray(saveData.inventory.soulStones)) return 0
    const stoneData = saveData.inventory.soulStones.find(s => s && s.heroId === heroId)
    return stoneData?.amount || 0
  }

  private upgradeHeroStar(heroId: string, cost: number): void {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()
    if (!saveData || !saveData.inventory || !Array.isArray(saveData.inventory.soulStones)) return

    const stoneData = saveData.inventory.soulStones.find(s => s && s.heroId === heroId)
    if (stoneData) {
      stoneData.amount -= cost
      if (stoneData.amount <= 0) {
        saveData.inventory.soulStones = saveData.inventory.soulStones.filter(
          s => s && s.heroId !== heroId
        )
      }
    }

    if (Array.isArray(saveData.heroes)) {
      const heroData = saveData.heroes.find(h => h && h.id === heroId)
      if (heroData && heroData.star < 5) {
        heroData.star += 1
      }
    }

    const hero = this.heroes.get(heroId)
    if (hero && hero.star < 5) {
      hero.star += 1
      this.inspectedStar = hero.star
    }

    this.autoSave()
    this.renderRoster()
    this.updateCardSelection()
    this.updateDetailPanel(heroId)

    const node = STAR_DESTINY_NODES.find(n => n.star === hero?.star)
    this.showMessage(`点亮 ${hero?.star}★【${node?.title || '命星'}】！`)
  }

  private showMessage(msg: string): void {
    inkToast(this, msg)
  }

  private autoSave(): void {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()
    if (!saveData || !saveData.inventory || !Array.isArray(saveData.heroes)) return

    for (const [heroId, hero] of this.heroes) {
      const heroData = saveData.heroes.find(h => h.id === heroId)
      if (heroData) {
        heroData.level = hero.level
        heroData.star = hero.star
        heroData.experience = hero.experience
        heroData.isUnlocked = hero.isUnlocked
        heroData.equipment = hero.equipment
      }
    }

    saveData.claimedBioTrials = Array.from(this.claimedBioTrials)
    saveManager.saveCurrent()
  }

  private getHeroImageKey(heroId: string): string {
    const imageKeyMap: Record<string, string> = {
      hero_guanyu: 'hero_guanyu',
      hero_zhangfei: 'hero_zhangfei',
      hero_zhaoyun: 'hero_zhaoyun',
      hero_huangzhong: 'hero_huangzhong',
      hero_machao: 'hero_machao'
    }
    return imageKeyMap[heroId] || 'hero_placeholder'
  }
}
