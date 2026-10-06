import Phaser from 'phaser'
import { BattleResult, Rarity, WuXing } from '@/types'
import { SaveManager } from '@/core/save/SaveManager'
import { EquipmentManager } from '@/core/equipment/EquipmentManager'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'
import { getHeroConfig, calculateLevelFromExp } from '@/data/heroes'
import { getBattlefieldMapMeta } from '@/data/levels'
import {
  InkColor,
  InkText,
  InkFontSize,
  INK_WUXING,
  INK_RARITY,
  drawPaperBackground,
  createPanel,
  inkText,
  createInkButton
} from '@/ui/InkTheme'

/**
 * 结算奖励数据
 */
interface SettlementReward {
  gold: number
  experience: number
  equipment: { id: string; name: string; rarity: Rarity }[]
  gems: { wuXing: string; level: number }[]
  soulStones: { heroId: string; heroName: string; amount: number }[]
  divineMaterial?: { id: string; name: string; weaponName: string; heroName: string }
}

/**
 * 结算场景（水墨宣纸风）
 * 显示战斗结果和奖励
 */
export default class SettlementScene extends Phaser.Scene {
  private battleResult!: BattleResult
  private rewards!: SettlementReward
  private saveManager: SaveManager

  constructor() {
    super({ key: 'SettlementScene' })
    this.saveManager = SaveManager.getInstance()
  }

  /**
   * 场景初始化
   */
  init(data: { battleResult: BattleResult }): void {
    this.battleResult = data.battleResult
    this.rewards = this.calculateRewards()
  }

  /**
   * 计算奖励
   */
  private calculateRewards(): SettlementReward {
    const isEndless = Boolean(this.battleResult.stats?.isEndless || this.battleResult.levelId.includes('endless'))
    const mapMeta = getBattlefieldMapMeta(this.battleResult.levelId)

    if (isEndless) {
      const waves = this.battleResult.wavesCompleted || 0
      const gold = waves * 60 + Math.floor(waves * waves * 1.5)
      const experience = waves * 35 + Math.floor(waves * waves)

      const endlessRewards: SettlementReward = {
        gold,
        experience,
        equipment: [],
        gems: [],
        soulStones: [],
        divineMaterial: mapMeta
          ? {
              id: mapMeta.divineMaterialId,
              name: mapMeta.divineMaterialName,
              weaponName: mapMeta.exclusiveWeaponName,
              heroName: mapMeta.targetHeroName
            }
          : undefined
      }

      // 每 5 波获 1 件装备（高波次掉落高阶）
      const equipCount = Math.floor(waves / 5)
      for (let i = 0; i < equipCount; i++) {
        let rarity: Rarity = 'common'
        const roll = Math.random() + (waves * 0.01)
        if (roll > 1.3) rarity = 'legendary'
        else if (roll > 1.0) rarity = 'epic'
        else if (roll > 0.6) rarity = 'rare'
        const pool = this.getEquipmentPool(rarity)
        if (pool.length > 0) {
          const eq = pool[Math.floor(Math.random() * pool.length)]
          endlessRewards.equipment.push(eq)
        }
      }

      // 每 4 波获 1 颗宝石（70% 顺天本命五行 / 30% 异行奇石）
      const gemCount = Math.max(1, Math.floor(waves / 4))
      const wuXings: WuXing[] = ['metal', 'wood', 'water', 'fire', 'earth']
      for (let i = 0; i < gemCount; i++) {
        const useTargetElement = mapMeta && Math.random() < 0.70
        const gemWuXing = useTargetElement
          ? mapMeta.guardianBossElement
          : wuXings[Math.floor(Math.random() * wuXings.length)]
        let maxLvl = 1
        if (waves >= 25) maxLvl = 3
        else if (waves >= 12) maxLvl = 2
        const gemLevel = Math.min(3, Math.ceil(Math.random() * maxLvl))
        endlessRewards.gems.push({ wuXing: gemWuXing, level: gemLevel })
      }

      // 每 5 波获本图对应武将将魂（定向刷取，无废品）
      const heroStoneCount = Math.max(1, Math.floor(waves / 5))
      const targetHeroId = mapMeta ? mapMeta.targetHeroId : 'hero_guanyu'
      const heroConfig = getHeroConfig(targetHeroId)
      if (heroConfig) {
        endlessRewards.soulStones.push({
          heroId: targetHeroId,
          heroName: heroConfig.name,
          amount: heroStoneCount
        })
      }

      return endlessRewards
    }

    const baseRewards = this.battleResult.rewards

    // 基础奖励
    const rewards: SettlementReward = {
      gold: baseRewards.gold || 0,
      experience: baseRewards.experience || 0,
      equipment: [],
      gems: [],
      soulStones: []
    }

    // 70% 顺天本命五行 / 30% 异行奇石掉落规则（第6章 §3）
    if (this.battleResult.isVictory || Math.random() < 0.5) {
      const wuXings: WuXing[] = ['metal', 'wood', 'water', 'fire', 'earth']
      const useTargetElement = mapMeta && Math.random() < 0.70
      const gemWuXing = useTargetElement
        ? mapMeta.guardianBossElement
        : wuXings[Math.floor(Math.random() * wuXings.length)]
      const gemLevel = this.battleResult.isVictory ? 2 : 1
      rewards.gems.push({ wuXing: gemWuXing, level: gemLevel })
    }

    // 通关 15 波战役：100% 必掉本卷镇守统帅对应的【宿命神兵主材】与【专属将魂】（第4章§6 & 第5章§3）
    if (this.battleResult.isVictory) {
      if (mapMeta) {
        rewards.divineMaterial = {
          id: mapMeta.divineMaterialId,
          name: mapMeta.divineMaterialName,
          weaponName: mapMeta.exclusiveWeaponName,
          heroName: mapMeta.targetHeroName
        }
        rewards.soulStones.push({
          heroId: mapMeta.targetHeroId,
          heroName: mapMeta.targetHeroName,
          amount: 1
        })
      } else {
        const heroes = ['hero_guanyu', 'hero_huangzhong', 'hero_zhangfei', 'hero_machao', 'hero_zhaoyun']
        const heroId = heroes[Math.floor(Math.random() * heroes.length)]
        const heroConfig = getHeroConfig(heroId)
        if (heroConfig) {
          rewards.soulStones.push({
            heroId,
            heroName: heroConfig.name,
            amount: 1
          })
        }
      }
    }

    // 根据剩余生命加成金币
    const healthBonus = Math.floor(rewards.gold * (this.battleResult.remainingHealth / 20) * 0.5)
    rewards.gold += healthBonus

    return rewards
  }

  /**
   * 权重随机
   */
  private weightedRandom(items: any[], weights: number[]): any {
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < items.length; i++) {
      random -= weights[i]
      if (random <= 0) return items[i]
    }

    return items[items.length - 1]
  }

  /**
   * 获取装备池
   */
  private getEquipmentPool(rarity: Rarity): { id: string; name: string; rarity: Rarity }[] {
    const pool: Record<Rarity, { id: string; name: string; rarity: Rarity }[]> = {
      common: [
        { id: 'weapon_common_1', name: '铁剑', rarity: 'common' },
        { id: 'weapon_common_2', name: '木弓', rarity: 'common' }
      ],
      rare: [
        { id: 'weapon_rare_1', name: '青铜剑', rarity: 'rare' },
        { id: 'weapon_rare_2', name: '精钢刀', rarity: 'rare' }
      ],
      epic: [
        { id: 'weapon_epic_1', name: '青龙偃月刀', rarity: 'epic' },
        { id: 'weapon_epic_2', name: '丈八蛇矛', rarity: 'epic' }
      ],
      legendary: [
        { id: 'weapon_legendary_1', name: '方天画戟', rarity: 'legendary' }
      ]
    }
    return pool[rarity] || []
  }

  /**
   * 检查是否是章节最后一关（五大古战场共 5 卷）
   */
  private isLastLevelOfChapter(): boolean {
    return this.battleResult.levelId.includes('_level5')
  }

  /**
   * 获取下一关ID
   */
  private getNextLevelId(): string | null {
    if (this.isLastLevelOfChapter()) return null

    // 解析关卡ID (格式: chapter1_level1)
    const parts = this.battleResult.levelId.split('_')
    const chapter = parts[0]
    const levelNum = parseInt(parts[1].replace('level', ''))

    return `${chapter}_level${levelNum + 1}`
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  private calculateStars(): number {
    if (!this.battleResult.isVictory) return 0
    if (this.battleResult.remainingHealth >= 15) return 3
    if (this.battleResult.remainingHealth >= 8) return 2
    return 1
  }

  create(): void {
    const width = this.cameras.main.width

    drawPaperBackground(this)

    // 检查是否是无尽模式
    const isEndless = Boolean(this.battleResult.stats?.isEndless || this.battleResult.levelId.includes('endless'))
    if (isEndless) {
      this.createEndlessSettlement()
      this.createButtons()
      return
    }

    // 结果标题：胜利 = 印章红（大捷），失败 = 浓墨（折戟）
    const titleText = this.battleResult.isVictory ? '大捷 · 战役凯旋' : '折戟 · 战局失利'
    const title = inkText(this, width / 2, 42, titleText, {
      size: 36,
      color: this.battleResult.isVictory ? InkText.cinnabar : InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    if (this.battleResult.isVictory) {
      this.add.rectangle(width / 2 + title.width / 2 + 20, 42, 16, 16, InkColor.cinnabar)
    }

    // 关卡信息（优先展示古战场卷名）
    const mapMeta = getBattlefieldMapMeta(this.battleResult.levelId)
    const mapName = mapMeta ? `${mapMeta.scrollTitle} · ${mapMeta.guardianBossName}` : this.battleResult.levelId
    inkText(this, width / 2, 82, `战况评定 · 战场：${mapName}`, {
      size: InkFontSize.md,
      color: InkText.faint,
      originX: 0.5,
      originY: 0.5
    })

    if (this.battleResult.isVictory) {
      // 胜利：左右双栏并列布局（杜绝上下层叠覆盖）
      // 左栏：战局考绩面板 + 参战良将功勋面板（支持最多 5 将同列不溢出）
      this.createBattleStats(130, 114, 480, 116)
      this.createHeroExperiencePanel(130, 244, 480, 356)

      // 右栏：战利封赏面板
      this.createRewardsPanel(630, 114, 520, 486)

      // 保存奖励
      this.saveRewards()
    } else {
      // 失败：居中战损总结与兵法建言，并触发结算存档
      this.createDefeatSummary(width / 2 - 270, 114, 540, 486)
      this.saveRewards()
    }

    // 操作按钮
    this.createButtons()
  }

  /**
   * 创建百战无尽模式专用水墨结算界面（与五大古战场合一）
   */
  private createEndlessSettlement(): void {
    const width = this.cameras.main.width
    const stats = this.battleResult.stats
    const waves = this.battleResult.wavesCompleted || 0
    const mapMeta = getBattlefieldMapMeta(this.battleResult.levelId)
    const beacon = EndlessModeManager.getBeaconTierInfo(waves)

    // 标题：百战无尽 · 烽火结算
    const title = inkText(this, width / 2, 42, `${beacon.icon} 百战无尽 · 烽火结算`, {
      size: 34,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    // 新纪录印章
    if (stats?.isNewRecord) {
      const sealW = 96
      const sealH = 26
      const sealX = width / 2 + title.width / 2 + 62
      const sealY = 42
      const seal = this.add.rectangle(sealX, sealY, sealW, sealH, InkColor.cinnabar)
      seal.setStrokeStyle(1.5, 0x6e1b15)
      inkText(this, sealX, sealY, '【百战新篇】', {
        size: 13,
        color: '#ffffff',
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
    }

    // 副标题：战场卷名 + 烽火阶段 + 灵石保底分位
    const mapTitle = mapMeta ? `${mapMeta.scrollTitle} · ${mapMeta.guardianBossName}` : this.battleResult.levelId
    const minRollPct = Math.round(beacon.gemMinRollPercentile * 100)
    inkText(
      this,
      width / 2,
      82,
      `【${mapTitle}】止步于第 ${waves} 波 · 境界：${beacon.title}（灵石保底 +${minRollPct}%）`,
      {
        size: InkFontSize.md,
        color: InkText.faint,
        originX: 0.5,
        originY: 0.5
      }
    )

    // 左栏：无尽试炼考绩 (130, 114, 480, 136) + 诸将历练 (130, 264, 480, 336)
    this.createEndlessStatsPanel(130, 114, 480, 136)
    this.createHeroExperiencePanel(130, 264, 480, 336)

    // 右栏：试炼无尽丰赏 (630, 114, 520, 486)
    this.createRewardsPanel(630, 114, 520, 486)

    // 保存奖励到存档
    this.saveRewards()
  }

  /**
   * 创建无尽模式试炼考绩面板
   */
  private createEndlessStatsPanel(x: number, y: number, w: number, h: number): void {
    const panel = createPanel(this, x, y, w, h)
    const stats = this.battleResult.stats
    const record = this.saveManager.getEndlessRecord()
    const waveReached = stats?.highestWave ?? this.battleResult.wavesCompleted
    const beacon = EndlessModeManager.getBeaconTierInfo(waveReached)

    panel.add(inkText(this, 20, 22, `◈ 百战考绩 · ${beacon.icon} ${beacon.title}`, {
      size: 15,
      color: InkText.wash,
      bold: true,
      originY: 0.5
    }))

    // 第一行：止步波数与斩敌总数
    panel.add(inkText(this, 24, 52, `止步波次: 第 ${waveReached} 波`, {
      size: 13,
      color: InkText.cinnabar,
      bold: true,
      originY: 0.5
    }))
    panel.add(inkText(this, 250, 52, `斩敌总数: ⚔️ ${stats?.totalKills ?? 0} 众`, {
      size: 13,
      color: InkText.ink,
      originY: 0.5
    }))

    // 第二行：斩杀精英与降服统帅
    panel.add(inkText(this, 24, 82, `斩杀精英: 🔱 ${stats?.eliteKills ?? 0} 名`, {
      size: 13,
      color: InkText.ink,
      originY: 0.5
    }))
    panel.add(inkText(this, 250, 82, `降服统帅: 👑 ${stats?.bossKills ?? 0} 尊`, {
      size: 13,
      color: InkText.ink,
      originY: 0.5
    }))

    // 第三行：历战耗时与历史最佳
    const timeStr = this.formatTime(this.battleResult.elapsedTime)
    panel.add(inkText(this, 24, 112, `历战耗时: ${timeStr}`, {
      size: 13,
      color: InkText.faint,
      originY: 0.5
    }))
    panel.add(inkText(this, 250, 112, `百战纪录: 第 ${record?.highestWave ?? waveReached} 波`, {
      size: 13,
      color: InkText.gold,
      bold: true,
      originY: 0.5
    }))
  }

  /**
   * 创建战局考绩面板（左栏上方）
   */
  private createBattleStats(x: number, y: number, w: number, h: number): void {
    const panel = createPanel(this, x, y, w, h)

    panel.add(inkText(this, 20, 24, '◈ 战局考绩', {
      size: 15,
      color: InkText.wash,
      bold: true,
      originY: 0.5
    }))

    // 第一行：波次完成与剩余生命
    panel.add(inkText(this, 24, 56, `破阵波次: ${this.battleResult.wavesCompleted} 波`, {
      size: 13,
      color: InkText.ink,
      originY: 0.5
    }))
    panel.add(inkText(this, 250, 56, `帅营防务: ❤️ ${this.battleResult.remainingHealth} 点`, {
      size: 13,
      color: InkText.cinnabar,
      bold: true,
      originY: 0.5
    }))

    // 第二行：战斗耗时与战勋星级
    const timeStr = this.formatTime(this.battleResult.elapsedTime)
    panel.add(inkText(this, 24, 88, `历战耗时: ${timeStr}`, {
      size: 13,
      color: InkText.faint,
      originY: 0.5
    }))

    const stars = this.calculateStars()
    panel.add(inkText(this, 250, 88, `战勋星级: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, {
      size: 15,
      color: InkText.gold,
      bold: true,
      originY: 0.5
    }))
  }

  /**
   * 创建上场英雄功勋历练面板（左栏下方，自适应容纳最多 5 位参战武将不溢出）
   */
  private createHeroExperiencePanel(x: number, y: number, w: number, h: number): void {
    const deployedHeroIds = this.battleResult.deployedHeroIds || []
    const panel = createPanel(this, x, y, w, h)

    panel.add(inkText(this, 20, 24, '◈ 参战诸将历练', {
      size: 15,
      color: InkText.wash,
      bold: true,
      originY: 0.5
    }))

    if (deployedHeroIds.length === 0) {
      panel.add(inkText(this, w / 2, h / 2, '此役未派遣将领出阵', {
        size: 13,
        color: InkText.faint,
        originX: 0.5,
        originY: 0.5
      }))
      return
    }

    const rowStartY = 66
    const rowGap = 52
    const cardH = 44
    const expPerHero = this.rewards.experience

    for (let i = 0; i < deployedHeroIds.length; i++) {
      const heroId = deployedHeroIds[i]
      const heroConfig = getHeroConfig(heroId)
      if (!heroConfig) continue

      const cardY = rowStartY + i * rowGap
      const cardBg = this.add.rectangle(w / 2, cardY, w - 36, cardH, InkColor.paperDeep, 0.45)
      cardBg.setStrokeStyle(1, InkColor.inkFaint, 0.4)
      panel.add(cardBg)

      const wxStyle = INK_WUXING[heroConfig.wuXing]

      // 武将水墨剪影或五行徽章
      const silhouetteKey = `ink_${heroConfig.id}`
      if (this.textures.exists(silhouetteKey)) {
        const avatar = this.add.image(44, cardY, silhouetteKey)
        avatar.setDisplaySize(32, 32)
        panel.add(avatar)
      } else {
        const badge = this.add.rectangle(44, cardY, 26, 26, wxStyle?.fill ?? InkColor.paperPanel)
        badge.setStrokeStyle(1.2, wxStyle?.border ?? InkColor.ink)
        panel.add(badge)
        panel.add(inkText(this, 44, cardY, wxStyle?.label || '将', {
          size: 12,
          color: wxStyle?.text || InkText.ink,
          bold: true,
          originX: 0.5,
          originY: 0.5
        }))
      }

      // 名称与五行属性同行排布（杜绝上下两行紧贴重叠）
      const nameTxt = inkText(this, 72, cardY, heroConfig.name, {
        size: 14,
        color: InkText.strong,
        bold: true,
        originY: 0.5
      })
      panel.add(nameTxt)

      panel.add(inkText(this, 72 + nameTxt.width + 12, cardY, `【${wxStyle?.label || '无'}系】`, {
        size: 12,
        color: wxStyle?.text || InkText.faint,
        bold: true,
        originY: 0.5
      }))

      // 获得经验
      panel.add(inkText(this, w - 32, cardY, `+${expPerHero} 功勋`, {
        size: 14,
        color: InkText.green,
        bold: true,
        originX: 1,
        originY: 0.5
      }))
    }
  }

  /**
   * 汇总结算奖励条目（同名同阶物品合并为单行并附带 “× 数字”）
   */
  private getGroupedRewardRows(): { label: string; value: string; color: string }[] {
    const rows: { label: string; value: string; color: string }[] = []

    // 1. 军饷金币
    if (this.rewards.gold > 0) {
      rows.push({
        label: '军饷金币',
        value: `💰 军饷铜钱 ×${this.rewards.gold}`,
        color: InkText.gold
      })
    }

    // 2. 宿命神兵主材（击败关底统帅 100% 必掉）
    if (this.rewards.divineMaterial) {
      rows.push({
        label: '宿命主材',
        value: `🛠️ 【${this.rewards.divineMaterial.name}】（铸 ${this.rewards.divineMaterial.heroName}·${this.rewards.divineMaterial.weaponName}） ×1`,
        color: InkText.cinnabar
      })
    }

    // 3. 破阵军械（按装备 id 合并同行 + × 数字）
    if (this.rewards.equipment.length > 0) {
      const groupedEquip = new Map<string, { name: string; rarity: Rarity; count: number }>()
      for (const equip of this.rewards.equipment) {
        const existing = groupedEquip.get(equip.id)
        if (existing) {
          existing.count += 1
        } else {
          groupedEquip.set(equip.id, { name: equip.name, rarity: equip.rarity, count: 1 })
        }
      }
      for (const item of groupedEquip.values()) {
        const rColor = INK_RARITY[item.rarity]?.text || InkText.ink
        rows.push({
          label: '破阵军械',
          value: `🗡️ ${item.name} ×${item.count}`,
          color: rColor
        })
      }
    }

    // 4. 五行宝石（按 五行+等级 合并同行 + × 数字）
    if (this.rewards.gems.length > 0) {
      const minRollPct = Math.round(
        EndlessModeManager.getGemMinRollPercentile(this.battleResult.wavesCompleted || 0) * 100
      )
      const minRollTag = minRollPct > 0 ? `（保底 +${minRollPct}%）` : ''
      const groupedGems = new Map<string, { wuXing: WuXing; level: number; count: number }>()
      for (const gem of this.rewards.gems) {
        const key = `${gem.wuXing}_${gem.level}`
        const existing = groupedGems.get(key)
        if (existing) {
          existing.count += 1
        } else {
          groupedGems.set(key, { wuXing: gem.wuXing as WuXing, level: gem.level, count: 1 })
        }
      }
      for (const item of groupedGems.values()) {
        const style = INK_WUXING[item.wuXing]
        const gemName = `💎 ${style?.label ?? '?'}系灵石 Lv.${item.level}${minRollTag} ×${item.count}`
        rows.push({
          label: '五行宝石',
          value: gemName,
          color: style?.text ?? InkText.faint
        })
      }
    }

    // 5. 专属将魂（按 heroId 合并同行 + × 数字）
    if (this.rewards.soulStones.length > 0) {
      const groupedStones = new Map<string, { heroName: string; amount: number }>()
      for (const stone of this.rewards.soulStones) {
        const existing = groupedStones.get(stone.heroId)
        if (existing) {
          existing.amount += stone.amount
        } else {
          groupedStones.set(stone.heroId, { heroName: stone.heroName, amount: stone.amount })
        }
      }
      for (const item of groupedStones.values()) {
        rows.push({
          label: '专属将魂',
          value: `⭐ ${item.heroName}将魂 ×${item.amount}`,
          color: InkText.wash
        })
      }
    }

    return rows
  }

  /**
   * 创建战利封赏面板（右栏）
   */
  private createRewardsPanel(x: number, y: number, w: number, h: number): void {
    const panel = createPanel(this, x, y, w, h, {
      stroke: 0xa0782f,
      strokeWidth: 2
    })

    // 标题
    panel.add(inkText(this, 24, 26, '◈ 凯旋战利封赏', {
      size: 18,
      color: InkText.gold,
      bold: true,
      originY: 0.5
    }))

    // 金币印章
    const seal = this.add.rectangle(w - 46, 26, 36, 18, InkColor.cinnabar)
    seal.setStrokeStyle(1, 0x6e1b15)
    const sealText = inkText(this, w - 46, 26, '犒赏', {
      size: 11,
      color: '#ffffff',
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    panel.add([seal, sealText])

    // 分隔线
    const rule = this.add.graphics()
    rule.lineStyle(1, InkColor.ink, 0.2)
    rule.lineBetween(20, 50, w - 20, 50)
    panel.add(rule)

    const rows = this.getGroupedRewardRows()
    const availableH = h - 76
    const itemSpacing = rows.length > 0 ? Math.min(44, Math.floor(availableH / rows.length)) : 42
    const cardH = Math.min(36, Math.max(26, itemSpacing - 6))
    let itemY = 58 + Math.floor(itemSpacing / 2)

    for (const row of rows) {
      if (itemY + cardH / 2 > h - 10) break
      this.createRewardRow(panel, itemY, w, row.label, row.value, row.color, cardH)
      itemY += itemSpacing
    }
  }

  private createRewardRow(
    panel: Phaser.GameObjects.Container,
    y: number,
    w: number,
    label: string,
    value: string,
    color: string,
    cardH: number = 34
  ): void {
    const cardBg = this.add.rectangle(w / 2, y, w - 40, cardH, InkColor.paperDeep, 0.35)
    cardBg.setStrokeStyle(1, InkColor.inkFaint, 0.3)
    panel.add(cardBg)

    panel.add(inkText(this, 34, y, label, {
      size: 13,
      color: InkText.faint,
      originY: 0.5
    }))

    panel.add(inkText(this, 122, y, value, {
      size: 13,
      color,
      bold: true,
      originY: 0.5
    }))
  }

  private createDefeatSummary(x: number, y: number, w: number, h: number): void {
    const panel = createPanel(this, x, y, w, h, {
      stroke: InkColor.ink,
      strokeWidth: 2
    })

    panel.add(inkText(this, w / 2, 36, '◈ 败局复盘', {
      size: 20,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    }))

    panel.add(inkText(this, w / 2, 74, `推进波次: 第 ${this.battleResult.wavesCompleted} 波`, {
      size: 15,
      color: InkText.ink,
      originX: 0.5,
      originY: 0.5
    }))

    const adviceBox = this.add.rectangle(w / 2, 184, w - 48, 136, InkColor.paperDeep, 0.6)
    adviceBox.setStrokeStyle(1, InkColor.inkFaint, 0.5)
    panel.add(adviceBox)

    panel.add(inkText(this, w / 2, 138, '【兵法建言】', {
      size: 14,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    }))

    panel.add(inkText(this, w / 2, 196,
      '孙子曰：知己知彼，百战不殆。\n敌众五行偏向各有其道。请至战役沙盘查阅《军机密报》，布设相生之名将触发五行连环，方可反败为胜！',
      {
        size: 13,
        color: InkText.wash,
        wrapWidth: w - 80,
        lineSpacing: 6,
        originX: 0.5,
        originY: 0.5
      }
    ))

    // 战败抚恤战利品（同名同阶合并显示 × 数字）
    const rows = this.getGroupedRewardRows()
    if (rows.length > 0) {
      panel.add(inkText(this, 24, 282, '◈ 历战抚恤封赏', {
        size: 15,
        color: InkText.gold,
        bold: true,
        originY: 0.5
      }))
      let itemY = 320
      for (const row of rows) {
        if (itemY > h - 28) break
        this.createRewardRow(panel, itemY, w, row.label, row.value, row.color, 34)
        itemY += 42
      }
    }
  }

  /**
   * 保存奖励到存档
   */
  private saveRewards(): void {
    // 加载当前存档（自动确保已初始化）
    const saveData = this.saveManager.getCurrentSave()
    if (!saveData) return

    const isVictory = Boolean(this.battleResult.isVictory)
    const wavesCompleted = this.battleResult.wavesCompleted || 0

    // 添加金币
    saveData.inventory.gold += this.rewards.gold

    // 添加上场英雄经验并实时重算武将等级
    const deployedHeroIds = this.battleResult.deployedHeroIds || []
    const expPerHero = this.rewards.experience

    for (const heroId of deployedHeroIds) {
      const heroData = saveData.heroes.find(h => h.id === heroId)
      if (heroData) {
        heroData.experience += expPerHero
        const newLevel = calculateLevelFromExp(heroData.experience)
        if (newLevel > heroData.level) {
          heroData.level = newLevel
        }
      }
    }

    const eqMgr = EquipmentManager.getInstance()

    // 添加装备到装备管理器（自动同步至 saveData.inventory）
    for (const equip of this.rewards.equipment) {
      eqMgr.addEquipment(equip.id)
    }

    // 添加宿命神兵主材到蒲元铸剑坊
    if (this.rewards.divineMaterial) {
      eqMgr.addDivineMaterial(this.rewards.divineMaterial.id, 1)
    }

    // 添加宝石（支持无尽北伐 Wave 16+ 词条 Min Roll 保底分位跃升）
    const minRollPct = EndlessModeManager.getGemMinRollPercentile(wavesCompleted)
    for (const gem of this.rewards.gems) {
      eqMgr.addGem(gem.wuXing as WuXing, gem.level, minRollPct)
    }

    // 添加武将碎片
    for (const stone of this.rewards.soulStones) {
      const existing = saveData.inventory.soulStones.find(s => s.heroId === stone.heroId)
      if (existing) {
        existing.amount += stone.amount
      } else {
        saveData.inventory.soulStones.push({
          heroId: stone.heroId,
          amount: stone.amount
        })
      }
    }

    // 更新关卡进度
    const stars = this.calculateStars()
    const levelProgress = saveData.levelProgress.find(l => l.levelId === this.battleResult.levelId)
    if (levelProgress) {
      levelProgress.isCompleted = levelProgress.isCompleted || isVictory
      levelProgress.starsAchieved = Math.max(levelProgress.starsAchieved, stars)
      levelProgress.highestWave = Math.max(levelProgress.highestWave || 0, wavesCompleted)
    } else {
      saveData.levelProgress.push({
        levelId: this.battleResult.levelId,
        isCompleted: isVictory,
        starsAchieved: stars,
        highestWave: wavesCompleted
      })
    }

    // 保存存档（同步写入当前槽位及自动存档槽位0）
    this.saveManager.saveCurrent()

    console.log('奖励已保存到存档')
  }

  /**
   * 创建操作按钮
   */
  private createButtons(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    const buttonY = height - 72

    const targetLevelId = this.battleResult.levelId || 'chapter1_level1'
    const isEndless = Boolean(this.battleResult.stats?.isEndless || targetLevelId.includes('endless'))
    const isConquered = isEndless || this.battleResult.isVictory || (this.battleResult.wavesCompleted || 0) >= 15
    const resumeWave = Math.max(
      16,
      this.saveManager.getMapHighestWave(targetLevelId),
      this.battleResult.wavesCompleted || 0
    )

    if (isEndless) {
      createInkButton(this, width / 2 - 105, buttonY, 185, 44, `🔥 继续挑战(第${resumeWave}波)`, {
        fill: InkColor.cinnabar,
        hoverFill: 0xb53a32,
        textColor: InkText.paper,
        fontSize: 15,
        onClick: () => {
          this.scene.start('BattleScene', { levelId: targetLevelId, startWave: resumeWave })
        }
      })

      createInkButton(this, width / 2 + 105, buttonY, 145, 44, '返回选卷', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.ink,
        fontSize: 16,
        stroke: InkColor.ink,
        onClick: () => {
          this.scene.start('LevelSelectScene')
        }
      })
      return
    }

    const nextLevelId = this.getNextLevelId()
    const showNext = this.battleResult.isVictory && !!nextLevelId

    if (showNext) {
      // 3个按钮对称居中（已破关：下一卷 / 继续本卷无尽 / 返回选卷）
      createInkButton(this, width / 2 - 175, buttonY, 135, 44, '下一卷', {
        fill: InkColor.cinnabar,
        hoverFill: 0xb53a32,
        textColor: InkText.paper,
        fontSize: 16,
        onClick: () => {
          this.scene.start('BattleScene', { levelId: nextLevelId })
        }
      })

      createInkButton(this, width / 2, buttonY, 175, 44, `🔥 继续无尽(第${resumeWave}波)`, {
        fill: InkColor.inkStrong,
        hoverFill: InkColor.ink,
        textColor: InkText.paper,
        fontSize: 15,
        onClick: () => {
          this.scene.start('BattleScene', { levelId: targetLevelId, startWave: resumeWave })
        }
      })

      createInkButton(this, width / 2 + 175, buttonY, 135, 44, '返回选卷', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.ink,
        fontSize: 16,
        stroke: InkColor.ink,
        onClick: () => {
          this.scene.start('LevelSelectScene')
        }
      })
    } else {
      // 2个按钮对称居中（末卷破关或未破关战败时）
      const retryLabel = isConquered ? `🔥 继续挑战(第${resumeWave}波)` : '⚔️ 从头再战(第1波)'
      const retryStartWave = isConquered ? resumeWave : 1

      createInkButton(this, width / 2 - 105, buttonY, 185, 44, retryLabel, {
        fill: isConquered ? InkColor.cinnabar : InkColor.inkStrong,
        hoverFill: isConquered ? 0xb53a32 : InkColor.ink,
        textColor: InkText.paper,
        fontSize: 15,
        onClick: () => {
          this.scene.start('BattleScene', { levelId: targetLevelId, startWave: retryStartWave })
        }
      })

      createInkButton(this, width / 2 + 105, buttonY, 145, 44, '返回选卷', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.ink,
        fontSize: 16,
        stroke: InkColor.ink,
        onClick: () => {
          this.scene.start('LevelSelectScene')
        }
      })
    }
  }
}
