import Phaser from 'phaser'
import { BattleResult, Rarity, RarityNames } from '@/types'
import { SaveManager } from '@/core/save/SaveManager'
import { getHeroConfig } from '@/data/heroes'
import { getLevelConfig } from '@/data/levels'

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
 * 结算场景
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
    const height = this.cameras.main.height

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e)

    // 结果标题
    const titleText = this.battleResult.isVictory ? '战斗胜利' : '战斗失败'
    const titleColor = this.battleResult.isVictory ? '#00ff00' : '#ff0000'

    this.add.text(width / 2, 60, titleText, {
      fontSize: '48px',
      color: titleColor,
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // 关卡信息
    this.add.text(width / 2, 120, `关卡: ${this.battleResult.levelId}`, {
      fontSize: '16px',
      color: '#888888'
    }).setOrigin(0.5)

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
    const panelX = width / 2
    const panelY = 180
    const panelWidth = 400
    const panelHeight = 80

    const panelBg = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x222244, 0.9)
    panelBg.setStrokeStyle(2, 0x4466aa)

    // 波次完成
    this.add.text(panelX - 150, panelY - 20, `波次完成: ${this.battleResult.wavesCompleted}`, {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // 剩余生命
    this.add.text(panelX, panelY - 20, `剩余生命: ${this.battleResult.remainingHealth}`, {
      fontSize: '14px',
      color: '#ff6666'
    }).setOrigin(0.5)

    // 战斗时间
    const timeStr = this.formatTime(this.battleResult.elapsedTime)
    this.add.text(panelX + 150, panelY - 20, `战斗时间: ${timeStr}`, {
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(0.5)

    // 星星评级（简化：根据剩余生命）
    const stars = this.calculateStars()
    this.add.text(panelX, panelY + 15, `评级: ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, {
      fontSize: '20px',
      color: '#ffff00'
    }).setOrigin(0.5)
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

    const panelX = width / 2
    const panelY = 280
    const panelWidth = 400
    const panelHeight = deployedHeroIds.length * 30 + 40

    const panelBg = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x223344, 0.9)
    panelBg.setStrokeStyle(2, 0x6688aa)

    // 标题
    this.add.text(panelX, panelY - panelHeight / 2 + 15, '上场英雄经验', {
      fontSize: '16px',
      color: '#88aaff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // 每个英雄的经验
    let heroY = panelY - panelHeight / 2 + 35
    const expPerHero = this.rewards.experience

    for (const heroId of deployedHeroIds) {
      const heroConfig = getHeroConfig(heroId)
      if (heroConfig) {
        this.add.text(panelX - 150, heroY, heroConfig.name, {
          fontSize: '14px',
          color: '#ffffff'
        }).setOrigin(0.5)

        this.add.text(panelX + 50, heroY, `+${expPerHero} 经验`, {
          fontSize: '14px',
          color: '#88ff88',
          fontStyle: 'bold'
        }).setOrigin(0.5)

        heroY += 30
      }
    }
  }

  /**
   * 创建奖励面板
   */
  private createRewardsPanel(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 根据奖励内容计算面板高度
    const baseHeight = 100
    const extraHeight = this.rewards.equipment.length * 40 +
                       this.rewards.gems.length * 40 +
                       this.rewards.soulStones.length * 40
    const panelHeight = baseHeight + extraHeight

    const panelX = width / 2
    const panelY = 350 + panelHeight / 2

    const panelBg = this.add.rectangle(panelX, panelY, 500, panelHeight, 0x332244, 0.95)
    panelBg.setStrokeStyle(2, 0xffaa00)

    // 奖励标题
    this.add.text(panelX, panelY - panelHeight / 2 + 20, '获得奖励', {
      fontSize: '24px',
      color: '#ffaa00',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    let itemY = panelY - panelHeight / 2 + 60
    const itemSpacing = 35

    // 金币
    this.createRewardItem(panelX - 180, itemY, '金币', `${this.rewards.gold}`, '#ffff00', '💰')
    itemY += itemSpacing

    // 装备奖励
    if (this.rewards.equipment.length > 0) {
      for (const equip of this.rewards.equipment) {
        this.createRewardItem(panelX, itemY, '装备', `${equip.name}`, this.getRarityColor(equip.rarity), '⚔️')
        itemY += itemSpacing
      }
    }

    // 宝石奖励
    if (this.rewards.gems.length > 0) {
      for (const gem of this.rewards.gems) {
        const gemName = `${this.getWuXingText(gem.wuXing)}宝石 Lv.${gem.level}`
        this.createRewardItem(panelX, itemY, '宝石', gemName, this.getWuXingColor(gem.wuXing), '💎')
        itemY += itemSpacing
      }
    }

    // 武将碎片
    if (this.rewards.soulStones.length > 0) {
      for (const stone of this.rewards.soulStones) {
        this.createRewardItem(panelX, itemY, '武将碎片', `${stone.heroName} ×${stone.amount}`, '#aa88ff', '📜')
        itemY += itemSpacing
      }
    }
  }

  /**
   * 创建奖励项
   */
  private createRewardItem(
    x: number,
    y: number,
    label: string,
    value: string,
    color: string,
    icon: string
  ): void {
    this.add.text(x - 100, y, `${icon} ${label}`, {
      fontSize: '14px',
      color: '#aaaaaa'
    }).setOrigin(0.5)

    this.add.text(x + 50, y, value, {
      fontSize: '16px',
      color: color,
      fontStyle: 'bold'
    }).setOrigin(0.5)
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
      this.createButton(width / 2 - 180, buttonY, '下一关', 0x448844, () => {
        this.scene.start('BattleScene', { levelId: nextLevelId })
      })
    }

    // 再次挑战
    this.createButton(width / 2, buttonY, '再次挑战', 0x446688, () => {
      this.scene.start('BattleScene', { levelId: this.battleResult.levelId })
    })

    // 返回关卡选择
    this.createButton(width / 2 + 180, buttonY, '返回', 0x666688, () => {
      this.scene.start('LevelSelectScene')
    })
  }

  /**
   * 创建按钮
   */
  private createButton(x: number, y: number, text: string, color: number, callback: () => void): void {
    const btnBg = this.add.rectangle(x, y, 120, 45, color)
    const btnText = this.add.text(x, y, text, {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5)

    btnBg.setInteractive({ useHandCursor: true })
    btnBg.on('pointerover', () => btnBg.setFillStyle(color + 0x111111))
    btnBg.on('pointerout', () => btnBg.setFillStyle(color))
    btnBg.on('pointerdown', callback)
  }

  /**
   * 获取五行文字
   */
  private getWuXingText(wuXing: string): string {
    const texts: Record<string, string> = {
      metal: '金',
      wood: '木',
      water: '水',
      fire: '火',
      earth: '土'
    }
    return texts[wuXing] || '?'
  }

  /**
   * 获取五行颜色
   */
  private getWuXingColor(wuXing: string): string {
    const colors: Record<string, string> = {
      metal: '#cccccc',
      wood: '#00aa00',
      water: '#0088ff',
      fire: '#ff4400',
      earth: '#ffcc00'
    }
    return colors[wuXing] || '#888888'
  }

  /**
   * 获取稀有度颜色
   */
  private getRarityColor(rarity: Rarity): string {
    const colors: Record<Rarity, string> = {
      common: '#888888',
      rare: '#00aaff',
      epic: '#aa00ff',
      legendary: '#ffaa00'
    }
    return colors[rarity] || '#888888'
  }
}