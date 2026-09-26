import Phaser from 'phaser'
import { BattleResult, Rarity, WuXing } from '@/types'
import { SaveManager } from '@/core/save/SaveManager'
import { getHeroConfig } from '@/data/heroes'
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

    if (isEndless) {
      const waves = this.battleResult.wavesCompleted || 0
      const gold = waves * 60 + Math.floor(waves * waves * 1.5)
      const experience = waves * 35 + Math.floor(waves * waves)

      const endlessRewards: SettlementReward = {
        gold,
        experience,
        equipment: [],
        gems: [],
        soulStones: []
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

      // 每 4 波获 1 颗宝石
      const gemCount = Math.floor(waves / 4)
      const wuXings = ['metal', 'wood', 'water', 'fire', 'earth']
      for (let i = 0; i < gemCount; i++) {
        const gemWuXing = wuXings[Math.floor(Math.random() * wuXings.length)]
        let maxLvl = 1
        if (waves >= 25) maxLvl = 3
        else if (waves >= 12) maxLvl = 2
        const gemLevel = Math.min(3, Math.ceil(Math.random() * maxLvl))
        endlessRewards.gems.push({ wuXing: gemWuXing, level: gemLevel })
      }

      // 每 10 波获指定武将将魂
      const heroStoneCount = Math.floor(waves / 10)
      if (heroStoneCount > 0) {
        const heroes = ['hero_guanyu', 'hero_zhangfei', 'hero_zhaoyun']
        for (let i = 0; i < heroStoneCount; i++) {
          const heroId = heroes[i % heroes.length]
          const heroConfig = getHeroConfig(heroId)
          if (heroConfig) {
            endlessRewards.soulStones.push({
              heroId,
              heroName: heroConfig.name,
              amount: 3 + Math.floor(waves / 10) * 2
            })
          }
        }
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

    // 随机装备奖励（30%概率）
    if (Math.random() < 0.3) {
      const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary']
      const weights = [0.5, 0.35, 0.13, 0.02]
      const rarity = this.weightedRandom(rarities, weights)

      // 根据稀有度随机装备
      const equipPool = this.getEquipmentPool(rarity)
      if (equipPool.length > 0) {
        const equip = equipPool[Math.floor(Math.random() * equipPool.length)]
        rewards.equipment.push({
          id: equip.id,
          name: equip.name,
          rarity: equip.rarity
        })
      }
    }

    // 随机宝石奖励（20%概率）
    if (Math.random() < 0.2) {
      const wuXings = ['metal', 'wood', 'water', 'fire', 'earth']
      const gemWuXing = wuXings[Math.floor(Math.random() * wuXings.length)]
      const gemLevel = Math.ceil(Math.random() * 3) // 1-3级宝石
      rewards.gems.push({ wuXing: gemWuXing, level: gemLevel })
    }

    // 武将碎片奖励（通关Boss关卡必有）
    if (this.battleResult.isVictory && this.hasBossWave()) {
      const heroes = ['hero_guanyu', 'hero_zhangfei', 'hero_zhaoyun']
      const heroId = heroes[Math.floor(Math.random() * heroes.length)]
      const heroConfig = getHeroConfig(heroId)
      if (heroConfig) {
        rewards.soulStones.push({
          heroId,
          heroName: heroConfig.name,
          amount: Math.ceil(Math.random() * 5) + 2 // 3-7个碎片
        })
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
    // 简化的装备池
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
   * 检查是否有Boss波次
   */
  private hasBossWave(): boolean {
    // 简化：检查关卡ID是否包含level3
    return this.battleResult.levelId.includes('_level3')
  }

  /**
   * 检查是否是章节最后一关
   */
  private isLastLevelOfChapter(): boolean {
    return this.battleResult.levelId.includes('_level3')
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
    const title = inkText(this, width / 2, 48, titleText, {
      size: 40,
      color: this.battleResult.isVictory ? InkText.cinnabar : InkText.strong,
      bold: true,
      originX: 0.5
    })
    if (this.battleResult.isVictory) {
      this.add.rectangle(width / 2 + title.width / 2 + 20, 48, 16, 16, InkColor.cinnabar)
    }

    // 关卡信息
    inkText(this, width / 2, 90, `战况评定 · 关卡: ${this.battleResult.levelId}`, {
      size: InkFontSize.md,
      color: InkText.faint,
      originX: 0.5
    })

    if (this.battleResult.isVictory) {
      // 胜利：左右双栏并列布局（杜绝上下层叠覆盖）
      // 左栏：战局考绩面板 + 参战良将功勋面板
      this.createBattleStats(140, 126, 460, 120)
      this.createHeroExperiencePanel(140, 262, 460, 320)

      // 右栏：战利封赏面板
      this.createRewardsPanel(630, 126, 510, 456)

      // 保存奖励
      this.saveRewards()
    } else {
      // 失败：居中战损总结与兵法建言
      this.createDefeatSummary(width / 2 - 260, 130, 520, 440)
    }

    // 操作按钮
    this.createButtons()
  }

  /**
   * 创建无尽模式专用水墨结算界面
   */
  private createEndlessSettlement(): void {
    const width = this.cameras.main.width
    const stats = this.battleResult.stats
    const waves = this.battleResult.wavesCompleted || 0

    // 标题：百战无尽 · 试炼结算
    inkText(this, width / 2, 48, '百战无尽 · 试炼结算', {
      size: 40,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    })

    // 新纪录印章
    if (stats?.isNewRecord) {
      const sealW = 96
      const sealH = 26
      const sealX = width / 2 + 220
      const sealY = 48
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

    // 副标题
    inkText(this, width / 2, 90, `沙盘论道 · 止步于第 ${waves} 阵`, {
      size: InkFontSize.md,
      color: InkText.faint,
      originX: 0.5
    })

    // 左栏：无尽试炼考绩 (140, 126, 460, 145) + 诸将历练 (140, 285, 460, 295)
    this.createEndlessStatsPanel(140, 126, 460, 145)
    this.createHeroExperiencePanel(140, 285, 460, 295)

    // 右栏：试炼无尽丰赏 (630, 126, 510, 454)
    this.createRewardsPanel(630, 126, 510, 454)

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

    panel.add(inkText(this, 20, 22, '◈ 试炼考绩', {
      size: 15,
      color: InkText.wash,
      bold: true
    }))

    // 第一行：止步阵数与斩敌总数
    const waveReached = stats?.highestWave ?? this.battleResult.wavesCompleted
    panel.add(inkText(this, 24, 52, `止步阵数: 第 ${waveReached} 阵`, {
      size: 13,
      color: InkText.cinnabar,
      bold: true
    }))
    panel.add(inkText(this, 240, 52, `斩敌总数: ⚔️ ${stats?.totalKills ?? 0} 众`, {
      size: 13,
      color: InkText.ink
    }))

    // 第二行：斩杀精英与降服魔首
    panel.add(inkText(this, 24, 82, `斩杀精英: 🔱 ${stats?.eliteKills ?? 0} 名`, {
      size: 13,
      color: InkText.ink
    }))
    panel.add(inkText(this, 240, 82, `降服魔首: 👑 ${stats?.bossKills ?? 0} 尊`, {
      size: 13,
      color: InkText.ink
    }))

    // 第三行：历战耗时与历史最佳
    const timeStr = this.formatTime(this.battleResult.elapsedTime)
    panel.add(inkText(this, 24, 112, `历战耗时: ${timeStr}`, {
      size: 13,
      color: InkText.faint
    }))
    panel.add(inkText(this, 240, 112, `历史之最: 第 ${record?.highestWave ?? 0} 阵`, {
      size: 13,
      color: InkText.gold,
      bold: true
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
      bold: true
    }))

    // 第一行：波次完成与剩余生命
    panel.add(inkText(this, 24, 56, `破阵波次: ${this.battleResult.wavesCompleted} 波`, {
      size: 13,
      color: InkText.ink
    }))
    panel.add(inkText(this, 240, 56, `帅营防务: ❤️ ${this.battleResult.remainingHealth} 点`, {
      size: 13,
      color: InkText.cinnabar,
      bold: true
    }))

    // 第二行：战斗耗时与战勋星级
    const timeStr = this.formatTime(this.battleResult.elapsedTime)
    panel.add(inkText(this, 24, 88, `历战耗时: ${timeStr}`, {
      size: 13,
      color: InkText.faint
    }))

    const stars = this.calculateStars()
    panel.add(inkText(this, 240, 88, `战勋星级: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, {
      size: 15,
      color: InkText.gold,
      bold: true
    }))
  }

  /**
   * 创建上场英雄功勋历练面板（左栏下方）
   */
  private createHeroExperiencePanel(x: number, y: number, w: number, h: number): void {
    const deployedHeroIds = this.battleResult.deployedHeroIds || []
    const panel = createPanel(this, x, y, w, h)

    panel.add(inkText(this, 20, 24, '◈ 参战诸将历练', {
      size: 15,
      color: InkText.wash,
      bold: true
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

    let rowY = 64
    const expPerHero = this.rewards.experience

    for (let i = 0; i < deployedHeroIds.length; i++) {
      const heroId = deployedHeroIds[i]
      const heroConfig = getHeroConfig(heroId)
      if (!heroConfig) continue

      const cardY = rowY + i * 72
      const cardBg = this.add.rectangle(w / 2, cardY, w - 36, 56, InkColor.paperDeep, 0.45)
      cardBg.setStrokeStyle(1, InkColor.inkFaint, 0.4)
      panel.add(cardBg)

      // 头像
      const imgKey = heroConfig.id
      if (this.textures.exists(imgKey)) {
        const avatar = this.add.image(48, cardY, imgKey)
        avatar.setDisplaySize(40, 40)
        panel.add(avatar)
      }

      // 名称与五行
      const wxStyle = INK_WUXING[heroConfig.wuXing]
      panel.add(inkText(this, 82, cardY - 10, heroConfig.name, {
        size: 14,
        color: InkText.strong,
        bold: true
      }))
      panel.add(inkText(this, 82, cardY + 12, `属性: 【${wxStyle?.label || '无'}】`, {
        size: 11,
        color: wxStyle?.text || InkText.faint
      }))

      // 获得经验
      panel.add(inkText(this, w - 36, cardY, `+${expPerHero} 功勋`, {
        size: 14,
        color: InkText.green,
        bold: true,
        originX: 1,
        originY: 0.5
      }))
    }
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
      bold: true
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
    rule.lineBetween(20, 52, w - 20, 52)
    panel.add(rule)

    let itemY = 80
    const itemSpacing = 42

    // 1. 金币
    this.createRewardRow(panel, itemY, w, '军饷金币', `💰 +${this.rewards.gold} 钱`, InkText.gold)
    itemY += itemSpacing

    // 2. 装备
    if (this.rewards.equipment.length > 0) {
      for (const equip of this.rewards.equipment) {
        if (itemY > h - 40) break
        const rColor = INK_RARITY[equip.rarity]?.text || InkText.ink
        this.createRewardRow(panel, itemY, w, '破阵军械', `🗡️ ${equip.name}`, rColor)
        itemY += itemSpacing
      }
    }

    // 3. 宝石
    if (this.rewards.gems.length > 0) {
      for (const gem of this.rewards.gems) {
        if (itemY > h - 40) break
        const style = INK_WUXING[gem.wuXing as WuXing]
        const gemName = `💎 ${style?.label ?? '?'}系灵石 Lv.${gem.level}`
        this.createRewardRow(panel, itemY, w, '五行宝石', gemName, style?.text ?? InkText.faint)
        itemY += itemSpacing
      }
    }

    // 4. 武将碎片
    if (this.rewards.soulStones.length > 0) {
      for (const stone of this.rewards.soulStones) {
        if (itemY > h - 40) break
        this.createRewardRow(panel, itemY, w, '将魂精魄', `⭐ ${stone.heroName}碎片 ×${stone.amount}`, InkText.wash)
        itemY += itemSpacing
      }
    }
  }

  private createRewardRow(
    panel: Phaser.GameObjects.Container,
    y: number,
    w: number,
    label: string,
    value: string,
    color: string
  ): void {
    const cardBg = this.add.rectangle(w / 2, y, w - 40, 34, InkColor.paperDeep, 0.35)
    cardBg.setStrokeStyle(1, InkColor.inkFaint, 0.3)
    panel.add(cardBg)

    panel.add(inkText(this, 36, y, label, {
      size: 13,
      color: InkText.faint,
      originY: 0.5
    }))

    panel.add(inkText(this, 150, y, value, {
      size: 14,
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

    panel.add(inkText(this, w / 2, 40, '◈ 败局复盘', {
      size: 20,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    }))

    panel.add(inkText(this, w / 2, 90, `推进波次: ${this.battleResult.wavesCompleted} 波`, {
      size: 15,
      color: InkText.ink,
      originX: 0.5
    }))

    const adviceBox = this.add.rectangle(w / 2, 230, w - 48, 160, InkColor.paperDeep, 0.6)
    adviceBox.setStrokeStyle(1, InkColor.inkFaint, 0.5)
    panel.add(adviceBox)

    panel.add(inkText(this, w / 2, 170, '【兵法建言】', {
      size: 14,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5
    }))

    panel.add(inkText(this, w / 2, 240,
      '孙子曰：知己知彼，百战不殆。\n\n敌众五行偏向各有其道。请至战役沙盘查阅《军机密报》，布设相生相克之名将与兵种，方可反败为胜！',
      {
        size: 13,
        color: InkText.wash,
        wrapWidth: w - 80,
        originX: 0.5,
        originY: 0.5
      }
    ))
  }

  /**
   * 保存奖励到存档
   */
  private saveRewards(): void {
    // 加载当前存档
    let saveData = this.saveManager.getCurrentSave()

    if (!saveData) {
      // 如果没有当前存档，尝试加载自动存档
      saveData = this.saveManager.loadFromSlot(0)
    }

    if (!saveData) return

    // 添加金币
    saveData.inventory.gold += this.rewards.gold

    // 添加上场英雄经验
    const deployedHeroIds = this.battleResult.deployedHeroIds || []
    const expPerHero = this.rewards.experience

    for (const heroId of deployedHeroIds) {
      const heroData = saveData.heroes.find(h => h.id === heroId)
      if (heroData) {
        heroData.experience += expPerHero
      }
    }

    // 添加装备
    for (const equip of this.rewards.equipment) {
      saveData.inventory.equipment.push(equip.id)
    }

    // 添加宝石
    for (const gem of this.rewards.gems) {
      saveData.inventory.gems.push({
        id: `gem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wuXing: gem.wuXing,
        level: gem.level
      })
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
      levelProgress.isCompleted = true
      levelProgress.starsAchieved = Math.max(levelProgress.starsAchieved, stars)
    } else {
      saveData.levelProgress.push({
        levelId: this.battleResult.levelId,
        isCompleted: true,
        starsAchieved: stars
      })
    }

    // 保存存档
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

    const isEndless = Boolean(this.battleResult.stats?.isEndless || this.battleResult.levelId.includes('endless'))
    if (isEndless) {
      createInkButton(this, width / 2 - 90, buttonY, 140, 44, '再次挑战', {
        fill: InkColor.inkStrong,
        hoverFill: InkColor.ink,
        textColor: InkText.paper,
        fontSize: 17,
        onClick: () => {
          this.scene.start('BattleScene', { levelId: 'level_endless_tower' })
        }
      })

      createInkButton(this, width / 2 + 90, buttonY, 140, 44, '返回主页', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.ink,
        fontSize: 17,
        stroke: InkColor.ink,
        onClick: () => {
          this.scene.start('TitleScene')
        }
      })
      return
    }

    const nextLevelId = this.getNextLevelId()
    const showNext = this.battleResult.isVictory && !!nextLevelId

    if (showNext) {
      // 3个按钮对称居中
      createInkButton(this, width / 2 - 160, buttonY, 130, 44, '下一关', {
        fill: InkColor.cinnabar,
        hoverFill: 0xb53a32,
        textColor: InkText.paper,
        fontSize: 17,
        onClick: () => {
          this.scene.start('BattleScene', { levelId: nextLevelId })
        }
      })

      createInkButton(this, width / 2, buttonY, 130, 44, '再次挑战', {
        fill: InkColor.inkStrong,
        hoverFill: InkColor.ink,
        textColor: InkText.paper,
        fontSize: 17,
        onClick: () => {
          this.scene.start('BattleScene', { levelId: this.battleResult.levelId })
        }
      })

      createInkButton(this, width / 2 + 160, buttonY, 130, 44, '返回', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.ink,
        fontSize: 17,
        stroke: InkColor.ink,
        onClick: () => {
          this.scene.start('LevelSelectScene')
        }
      })
    } else {
      // 2个按钮对称居中（章节末关或战败时）
      createInkButton(this, width / 2 - 90, buttonY, 140, 44, '再次挑战', {
        fill: InkColor.inkStrong,
        hoverFill: InkColor.ink,
        textColor: InkText.paper,
        fontSize: 17,
        onClick: () => {
          this.scene.start('BattleScene', { levelId: this.battleResult.levelId })
        }
      })

      createInkButton(this, width / 2 + 90, buttonY, 140, 44, '返回', {
        fill: InkColor.paperPanel,
        hoverFill: InkColor.paperDeep,
        textColor: InkText.ink,
        fontSize: 17,
        stroke: InkColor.ink,
        onClick: () => {
          this.scene.start('LevelSelectScene')
        }
      })
    }
  }
}
