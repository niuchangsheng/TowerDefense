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

  create(): void {
    const width = this.cameras.main.width

    drawPaperBackground(this)

    // 结果标题：胜利 = 印章红（胜印），失败 = 浓墨
    const titleText = this.battleResult.isVictory ? '战斗胜利' : '战斗失败'
    const title = inkText(this, width / 2, 60, titleText, {
      size: 48,
      color: this.battleResult.isVictory ? InkText.cinnabar : InkText.strong,
      bold: true,
      originX: 0.5
    })
    if (this.battleResult.isVictory) {
      this.add.rectangle(width / 2 + title.width / 2 + 24, 60, 16, 16, InkColor.cinnabar)
    }

    // 关卡信息
    inkText(this, width / 2, 118, `关卡: ${this.battleResult.levelId}`, {
      size: InkFontSize.md,
      color: InkText.faint,
      originX: 0.5
    })

    // 战斗统计
    this.createBattleStats()

    // 奖励面板（仅胜利时显示）
    if (this.battleResult.isVictory) {
      this.createRewardsPanel()
      this.createHeroExperiencePanel()
    }

    // 保存奖励
    if (this.battleResult.isVictory) {
      this.saveRewards()
    }

    // 操作按钮
    this.createButtons()
  }

  /**
   * 创建战斗统计
   */
  private createBattleStats(): void {
    const width = this.cameras.main.width
    const panelW = 400
    const panelH = 80

    const panel = createPanel(this, width / 2 - panelW / 2, 150, panelW, panelH)

    // 波次完成
    panel.add(inkText(this, 66, 28, `波次完成: ${this.battleResult.wavesCompleted}`, {
      size: 14,
      color: InkText.ink,
      originX: 0.5
    }))

    // 剩余生命
    panel.add(inkText(this, 200, 28, `剩余生命: ${this.battleResult.remainingHealth}`, {
      size: 14,
      color: InkText.cinnabar,
      originX: 0.5
    }))

    // 战斗时间
    const timeStr = this.formatTime(this.battleResult.elapsedTime)
    panel.add(inkText(this, 334, 28, `战斗时间: ${timeStr}`, {
      size: 14,
      color: InkText.faint,
      originX: 0.5
    }))

    // 星星评级（简化：根据剩余生命）
    const stars = this.calculateStars()
    panel.add(inkText(this, 200, 58, `评级: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, {
      size: InkFontSize.lg,
      color: InkText.gold,
      originX: 0.5
    }))
  }

  /**
   * 计算星星评级
   */
  private calculateStars(): number {
    const healthPercent = this.battleResult.remainingHealth / 20
    if (healthPercent >= 0.8) return 3
    if (healthPercent >= 0.5) return 2
    return 1
  }

  /**
   * 格式化时间
   */
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  /**
   * 创建上场英雄经验面板
   */
  private createHeroExperiencePanel(): void {
    const width = this.cameras.main.width
    const deployedHeroIds = this.battleResult.deployedHeroIds || []

    if (deployedHeroIds.length === 0) return

    const panelW = 400
    const panelH = deployedHeroIds.length * 30 + 40
    const panel = createPanel(this, width / 2 - panelW / 2, 250, panelW, panelH)

    // 标题
    panel.add(inkText(this, panelW / 2, 20, '上场英雄经验', {
      size: InkFontSize.md,
      color: InkText.wash,
      bold: true,
      originX: 0.5
    }))

    // 每个英雄的经验
    let rowY = 48
    const expPerHero = this.rewards.experience

    for (const heroId of deployedHeroIds) {
      const heroConfig = getHeroConfig(heroId)
      if (heroConfig) {
        panel.add(inkText(this, 120, rowY, heroConfig.name, {
          size: 14,
          color: InkText.ink,
          originX: 0.5
        }))

        panel.add(inkText(this, 280, rowY, `+${expPerHero} 经验`, {
          size: 14,
          color: InkText.green,
          bold: true,
          originX: 0.5
        }))

        rowY += 30
      }
    }
  }

  /**
   * 创建奖励面板
   */
  private createRewardsPanel(): void {
    const width = this.cameras.main.width

    // 根据奖励内容计算面板高度
    const baseHeight = 100
    const extraHeight = this.rewards.equipment.length * 40 +
                       this.rewards.gems.length * 40 +
                       this.rewards.soulStones.length * 40
    const panelHeight = baseHeight + extraHeight

    const panelW = 500
    const panel = createPanel(this, width / 2 - panelW / 2, 350, panelW, panelHeight, {
      stroke: 0xa0782f,
      strokeWidth: 2
    })

    // 奖励标题
    panel.add(inkText(this, panelW / 2, 30, '获得奖励', {
      size: 24,
      color: InkText.gold,
      bold: true,
      originX: 0.5
    }))

    let itemY = 70
    const itemSpacing = 35

    // 金币
    this.createRewardItem(panel, itemY, '金币', `${this.rewards.gold}`, InkText.gold)
    itemY += itemSpacing

    // 装备奖励
    if (this.rewards.equipment.length > 0) {
      for (const equip of this.rewards.equipment) {
        this.createRewardItem(panel, itemY, '装备', `${equip.name}`, INK_RARITY[equip.rarity].text)
        itemY += itemSpacing
      }
    }

    // 宝石奖励
    if (this.rewards.gems.length > 0) {
      for (const gem of this.rewards.gems) {
        const style = INK_WUXING[gem.wuXing as WuXing]
        const gemName = `${style?.label ?? '?'}宝石 Lv.${gem.level}`
        this.createRewardItem(panel, itemY, '宝石', gemName, style?.text ?? InkText.faint)
        itemY += itemSpacing
      }
    }

    // 武将碎片
    if (this.rewards.soulStones.length > 0) {
      for (const stone of this.rewards.soulStones) {
        this.createRewardItem(panel, itemY, '武将碎片', `${stone.heroName} ×${stone.amount}`, InkText.wash)
        itemY += itemSpacing
      }
    }
  }

  /**
   * 创建奖励项（标签在左、数值在右，无 emoji 图标）
   */
  private createRewardItem(
    panel: Phaser.GameObjects.Container,
    y: number,
    label: string,
    value: string,
    color: string
  ): void {
    panel.add(inkText(this, 60, y, label, {
      size: 14,
      color: InkText.faint,
      originX: 0.5
    }))

    panel.add(inkText(this, 180, y, value, {
      size: InkFontSize.md,
      color,
      bold: true
    }))
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
    const buttonY = height - 80

    // 下一关按钮（胜利且不是章节最后一关时显示）
    const nextLevelId = this.getNextLevelId()
    if (this.battleResult.isVictory && nextLevelId) {
      createInkButton(this, width / 2 - 180, buttonY, 120, 45, '下一关', {
        fill: InkColor.cinnabar,
        hoverFill: 0xb53a32,
        textColor: InkText.paper,
        fontSize: 18,
        onClick: () => {
          this.scene.start('BattleScene', { levelId: nextLevelId })
        }
      })
    }

    // 再次挑战
    createInkButton(this, width / 2, buttonY, 120, 45, '再次挑战', {
      fill: InkColor.inkStrong,
      hoverFill: InkColor.ink,
      textColor: InkText.paper,
      fontSize: 18,
      onClick: () => {
        this.scene.start('BattleScene', { levelId: this.battleResult.levelId })
      }
    })

    // 返回关卡选择
    createInkButton(this, width / 2 + 180, buttonY, 120, 45, '返回', {
      fill: InkColor.paperPanel,
      hoverFill: InkColor.paperDeep,
      textColor: InkText.ink,
      fontSize: 18,
      stroke: InkColor.ink,
      onClick: () => {
        this.scene.start('LevelSelectScene')
      }
    })
  }
}
