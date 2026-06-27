import Phaser from 'phaser'
import { createDefaultHeroes, getHeroConfig } from '@/data/heroes'
import { getSkill } from '@/data/skills'
import { Hero, RarityNames, Rarity } from '@/types'
import { EquipmentManager, EquipmentInstance } from '@/core/equipment/EquipmentManager'
import { getWeapon, getArtifact } from '@/data/equipment'
import { getExpToNextLevel, getExpProgress, getExpRequiredForLevel } from '@/data/heroes/levelConfig'
import { SaveManager } from '@/core/save/SaveManager'

/**
 * 武将页面场景
 * 显示所有武将及其属性，支持装备管理
 */
export default class HeroListScene extends Phaser.Scene {
  private heroes!: Map<string, Hero>
  private selectedHeroId: string | null = null
  private heroCards: Phaser.GameObjects.Container[] = []
  private detailPanel: Phaser.GameObjects.Container | null = null
  private equipmentManager: EquipmentManager
  private equipmentSlots: { weapon: Phaser.GameObjects.Container | null; artifact: Phaser.GameObjects.Container | null } = { weapon: null, artifact: null }

  constructor() {
    super({ key: 'HeroListScene' })
    this.equipmentManager = new EquipmentManager()
  }

  init(): void {
    const saveManager = SaveManager.getInstance()
    this.heroes = saveManager.loadHeroes()
    this.selectedHeroId = null
    this.heroCards = []
    this.detailPanel = null
    this.equipmentSlots = { weapon: null, artifact: null }
  }

  create(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e)

    // 标题
    this.add.text(width / 2, 40, '武将列表', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // 创建武将卡片
    this.createHeroCards()

    // 创建详情面板（右侧）
    this.createDetailPanel()

    // 返回按钮
    this.createBackButton()

    // 默认选中第一个武将
    const firstHero = Array.from(this.heroes.values())[0]
    if (firstHero) {
      this.selectHero(firstHero.id)
    }
  }

  /**
   * 创建武将卡片列表
   */
  private createHeroCards(): void {
    const heroList = Array.from(this.heroes.values())
    const startX = 100
    const startY = 100
    const cardWidth = 100
    const cardHeight = 120
    const spacing = 20

    for (let i = 0; i < heroList.length; i++) {
      const hero = heroList[i]
      const x = startX + (i % 4) * (cardWidth + spacing)
      const y = startY + Math.floor(i / 4) * (cardHeight + spacing)

      const card = this.createHeroCard(hero, x, y, cardWidth, cardHeight)
      this.heroCards.push(card)
    }
  }

  /**
   * 创建单个武将卡片
   */
  private createHeroCard(hero: Hero, x: number, y: number, width: number, height: number): Phaser.GameObjects.Container {
    const card = this.add.container(x, y)

    // 卡片背景
    const bg = this.add.rectangle(0, 0, width, height, 0x333355, 0.9)
    bg.setStrokeStyle(2, 0x666688)
    card.add(bg)

    // 武将头像
    const imageKey = this.getHeroImageKey(hero.id)
    if (this.textures.exists(imageKey)) {
      const avatar = this.add.image(0, -20, imageKey)
      avatar.setDisplaySize(60, 60)
      card.add(avatar)
    }

    // 武将名称
    const nameText = this.add.text(0, 25, hero.name, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    card.add(nameText)

    // 五行标记
    const wuXingText = this.add.text(0, 45, this.getWuXingText(hero.wuXing), {
      fontSize: '12px',
      color: this.getWuXingColor(hero.wuXing)
    }).setOrigin(0.5)
    card.add(wuXingText)

    // 稀有度标记
    const rarityText = this.add.text(0, 58, RarityNames[hero.rarity], {
      fontSize: '10px',
      color: this.getRarityColor(hero.rarity)
    }).setOrigin(0.5)
    card.add(rarityText)

    // 点击交互
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => {
      bg.setFillStyle(0x444477, 0.95)
    })
    bg.on('pointerout', () => {
      if (hero.id !== this.selectedHeroId) {
        bg.setFillStyle(0x333355, 0.9)
      }
    })
    bg.on('pointerdown', () => {
      this.selectHero(hero.id)
    })

    // 存储heroId
    card.setData('heroId', hero.id)

    return card
  }

  /**
   * 选中武将
   */
  private selectHero(heroId: string): void {
    // 更新选中状态
    this.selectedHeroId = heroId

    // 更新卡片高亮
    for (const card of this.heroCards) {
      const cardHeroId = card.getData('heroId') as string
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      if (cardHeroId === heroId) {
        bg.setFillStyle(0x555588, 1)
        bg.setStrokeStyle(3, 0x88aaff)
      } else {
        bg.setFillStyle(0x333355, 0.9)
        bg.setStrokeStyle(2, 0x666688)
      }
    }

    // 更新详情面板
    this.updateDetailPanel(heroId)
  }

  /**
   * 创建详情面板
   */
  private createDetailPanel(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    const panelX = width - 250
    const panelY = height / 2
    const panelWidth = 400
    const panelHeight = 550

    this.detailPanel = this.add.container(panelX, panelY)

    // 面板背景
    const panelBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x222244, 0.95)
    panelBg.setStrokeStyle(2, 0x4466aa)
    this.detailPanel.add(panelBg)

    // 面板标题
    const title = this.add.text(0, -250, '武将详情', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    this.detailPanel.add(title)
  }

  /**
   * 更新详情面板内容
   */
  private updateDetailPanel(heroId: string): void {
    const hero = this.heroes.get(heroId)
    if (!hero || !this.detailPanel) return

    // 清除旧内容（保留背景和标题）
    while (this.detailPanel.length > 2) {
      this.detailPanel.removeAt(2, true)
    }

    const startY = -220
    const lineHeight = 28

    // 大头像
    const imageKey = this.getHeroImageKey(hero.id)
    if (this.textures.exists(imageKey)) {
      const bigAvatar = this.add.image(-100, startY, imageKey)
      bigAvatar.setDisplaySize(120, 120)
      this.detailPanel.add(bigAvatar)
    }

    // 基本信息（右侧）
    let infoY = startY

    // 名称
    this.addDetailText(50, infoY, `${hero.name}`, '#ffffff', true)
    infoY += lineHeight

    // 稀有度
    this.addDetailText(50, infoY, `稀有度: ${RarityNames[hero.rarity]}`, this.getRarityColor(hero.rarity))
    infoY += lineHeight

    // 五行
    this.addDetailText(50, infoY, `五行: ${this.getWuXingText(hero.wuXing)}`, this.getWuXingColor(hero.wuXing))
    infoY += lineHeight

    // 等级和升级进度
    this.addDetailText(50, infoY, `等级: Lv.${hero.level}`, '#88ff88')
    infoY += lineHeight

    // 升级进度条
    if (hero.level < 60) {
      const progress = getExpProgress(hero.experience, hero.level)
      const expToNext = getExpToNextLevel(hero.level)
      const currentExpInLevel = Math.max(0, Math.floor(hero.experience - getExpRequiredForLevel(hero.level))) // 确保最小为0

      // 进度条背景
      const progressBarBg = this.add.rectangle(50, infoY, 150, 16, 0x333355, 0.9)
      progressBarBg.setStrokeStyle(1, 0x666688)
      this.detailPanel!.add(progressBarBg)

      // 进度条填充（确保最小宽度为0）
      const fillWidth = Math.max(0, 150 * progress)
      const progressBarFill = this.add.rectangle(
        50 - 75 + fillWidth / 2,
        infoY,
        fillWidth,
        14,
        0x00aa00,
        0.95
      )
      this.detailPanel!.add(progressBarFill)

      // 进度文字
      this.addDetailText(50, infoY, `${currentExpInLevel}/${expToNext}`, '#ffffff', false, 12)

      // 进度百分比（确保显示合理）
      const percentText = Math.floor(Math.max(0, Math.min(1, progress)) * 100)
      this.addDetailText(130, infoY, `${percentText}%`, '#88ff88', false, 11)
    } else {
      // 顶级
      this.addDetailText(50, infoY, '已达顶级', '#ffcc00', true, 12)
    }
    infoY += lineHeight

    // 星级
    this.addDetailText(50, infoY, `星级: ${'★'.repeat(hero.star)}${'☆'.repeat(5 - hero.star)}`, '#ffaa00')
    infoY += lineHeight * 2

    // 属性区域标题
    this.addDetailText(0, infoY, '— 基础属性 —', '#aaaaaa', true)
    infoY += lineHeight

    // 计算属性（含装备加成）
    const effectiveStats = this.getEffectiveStatsWithEquipment(hero)

    // 攻击力
    this.addDetailText(-80, infoY, `攻击: ${effectiveStats.attack}`, '#ff6666')
    this.addDetailText(80, infoY, `基础: ${hero.baseStats.attack}`, '#888888')
    infoY += lineHeight

    // 攻速
    const attackSpeed = effectiveStats.attackSpeed.toFixed(1)
    this.addDetailText(-80, infoY, `攻速: ${attackSpeed}/s`, '#66ff66')
    this.addDetailText(80, infoY, `范围: ${effectiveStats.attackRange}`, '#888888')
    infoY += lineHeight * 2

    // 装备区域标题
    this.addDetailText(0, infoY, '— 装备栏 —', '#aaaaaa', true)
    infoY += lineHeight

    // 获取武将已装备的装备
    const heroEquipment = this.equipmentManager.getHeroEquipment(heroId)

    // 武器槽
    this.createEquipmentSlot(infoY, '武器', heroEquipment.weapon, 'weapon', heroId)
    infoY += lineHeight * 1.5

    // 神器槽
    this.createEquipmentSlot(infoY, '神器', heroEquipment.artifact, 'artifact', heroId)
    infoY += lineHeight * 2

    // 技能区域标题
    this.addDetailText(0, infoY, '— 技能 —', '#aaaaaa', true)
    infoY += lineHeight

    // 被动技能
    const passiveSkill = getSkill(hero.passiveSkillId)
    if (passiveSkill) {
      this.addDetailText(0, infoY, `【被动】${passiveSkill.name}`, '#88ffff', true)
      infoY += lineHeight
      this.addDetailText(0, infoY, passiveSkill.description, '#aaaaaa', false, 12)
      infoY += lineHeight * 1.5
    }

    // 主动技能
    const activeSkill = getSkill(hero.activeSkillId)
    if (activeSkill) {
      this.addDetailText(0, infoY, `【主动】${activeSkill.name}`, '#ffaa88', true)
      infoY += lineHeight
      this.addDetailText(0, infoY, activeSkill.description, '#aaaaaa', false, 12)
      infoY += lineHeight
      if (activeSkill.cooldown) {
        this.addDetailText(0, infoY, `冷却: ${activeSkill.cooldown / 1000}秒`, '#888888', false, 12)
      }
    }
  }

  /**
   * 创建装备槽位
   */
  private createEquipmentSlot(
    y: number,
    slotName: string,
    equipment: EquipmentInstance | null,
    type: 'weapon' | 'artifact',
    heroId: string
  ): void {
    // 槽位名称
    this.addDetailText(-120, y, slotName, '#888888', false, 12)

    // 槽位背景
    const slotBg = this.add.rectangle(0, y, 200, 30, 0x333355, 0.9)
    slotBg.setStrokeStyle(1, equipment ? this.getRarityBorderColor(equipment.rarity) : 0x666688)
    this.detailPanel!.add(slotBg)

    if (equipment) {
      // 已装备：显示装备信息
      const detail = this.equipmentManager.getEquipmentDetail(equipment.instanceId)
      if (detail) {
        const nameText = this.add.text(-80, y, detail.name, {
          fontSize: '14px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0, 0.5)
        this.detailPanel!.add(nameText)

        const rarityText = this.add.text(50, y, RarityNames[equipment.rarity as Rarity], {
          fontSize: '10px',
          color: this.getRarityTextColor(equipment.rarity)
        }).setOrigin(0, 0.5)
        this.detailPanel!.add(rarityText)

        // 卸载按钮
        const unequipBtn = this.add.rectangle(150, y, 40, 24, 0x884444)
        unequipBtn.setInteractive({ useHandCursor: true })
        const unequipText = this.add.text(150, y, '卸载', {
          fontSize: '12px',
          color: '#ffffff'
        }).setOrigin(0.5)
        this.detailPanel!.add(unequipBtn)
        this.detailPanel!.add(unequipText)

        unequipBtn.on('pointerover', () => unequipBtn.setFillStyle(0xaa5555))
        unequipBtn.on('pointerout', () => unequipBtn.setFillStyle(0x884444))
        unequipBtn.on('pointerdown', () => {
          this.unequipEquipment(equipment.instanceId, heroId)
        })
      }
    } else {
      // 未装备：显示空槽
      const emptyText = this.add.text(0, y, '空槽 - 点击选择装备', {
        fontSize: '12px',
        color: '#666666'
      }).setOrigin(0.5)
      this.detailPanel!.add(emptyText)

      // 点击选择装备
      slotBg.setInteractive({ useHandCursor: true })
      slotBg.on('pointerover', () => slotBg.setFillStyle(0x444466, 0.9))
      slotBg.on('pointerout', () => slotBg.setFillStyle(0x333355, 0.9))
      slotBg.on('pointerdown', () => {
        this.showEquipmentSelection(type, heroId)
      })
    }
  }

  /**
   * 卸载装备
   */
  private unequipEquipment(instanceId: string, heroId: string): void {
    this.equipmentManager.unequipFromHero(instanceId)
    this.updateDetailPanel(heroId)
    this.showMessage('装备已卸载')
  }

  /**
   * 显示装备选择弹窗
   */
  private showEquipmentSelection(type: 'weapon' | 'artifact', heroId: string): void {
    const unequipped = this.equipmentManager.getUnequippedEquipment().filter(e => e.type === type)

    if (unequipped.length === 0) {
      this.showMessage('没有可用的装备')
      return
    }

    // 创建弹窗
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    const popup = this.add.container(width / 2, height / 2)
    popup.setDepth(50)

    // 弹窗背景
    const popupBg = this.add.rectangle(0, 0, 350, 250, 0x222244, 0.98)
    popupBg.setStrokeStyle(2, 0x4466aa)
    popup.add(popupBg)

    // 标题
    const title = this.add.text(0, -100, `选择 ${type === 'weapon' ? '武器' : '神器'}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    popup.add(title)

    // 装备列表
    const startY = -60
    for (let i = 0; i < unequipped.length; i++) {
      const equip = unequipped[i]
      const detail = this.equipmentManager.getEquipmentDetail(equip.instanceId)
      if (!detail) continue

      const equipY = startY + i * 40

      const btnBg = this.add.rectangle(0, equipY, 300, 35, this.getRarityBgColor(equip.rarity), 0.9)
      btnBg.setStrokeStyle(1, this.getRarityBorderColor(equip.rarity))
      btnBg.setInteractive({ useHandCursor: true })
      popup.add(btnBg)

      const btnName = this.add.text(-100, equipY, detail.name, {
        fontSize: '14px',
        color: '#ffffff'
      }).setOrigin(0, 0.5)
      popup.add(btnName)

      const btnRarity = this.add.text(50, equipY, RarityNames[equip.rarity as Rarity], {
        fontSize: '12px',
        color: this.getRarityTextColor(equip.rarity)
      }).setOrigin(0, 0.5)
      popup.add(btnRarity)

      // 属性加成
      const bonuses = detail.bonuses
      let bonusText = ''
      if (bonuses.attack) bonusText += `攻+${bonuses.attack}`
      if (bonuses.attackSpeed) bonusText += ` 速+${bonuses.attackSpeed.toFixed(1)}`
      const btnBonus = this.add.text(100, equipY, bonusText, {
        fontSize: '10px',
        color: '#aaaaaa'
      }).setOrigin(0, 0.5)
      popup.add(btnBonus)

      btnBg.on('pointerover', () => btnBg.setFillStyle(this.getRarityBgColor(equip.rarity), 1))
      btnBg.on('pointerout', () => btnBg.setFillStyle(this.getRarityBgColor(equip.rarity), 0.9))
      btnBg.on('pointerdown', () => {
        this.equipmentManager.equipToHero(equip.instanceId, heroId)
        popup.destroy()
        this.updateDetailPanel(heroId)
        this.showMessage('装备成功')
      })
    }

    // 关闭按钮
    const closeBtn = this.add.rectangle(0, 100, 100, 30, 0x666688)
    closeBtn.setInteractive({ useHandCursor: true })
    const closeText = this.add.text(0, 100, '关闭', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5)
    popup.add(closeBtn)
    popup.add(closeText)

    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x7777aa))
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x666688))
    closeBtn.on('pointerdown', () => popup.destroy())
  }

  /**
   * 计算含装备加成的属性
   */
  private getEffectiveStatsWithEquipment(hero: Hero): { attack: number; attackSpeed: number; attackRange: number } {
    let attack = Math.floor(hero.baseStats.attack * (1 + (hero.level - 1) * 0.05))
    let attackSpeed = hero.baseStats.attackSpeed
    let attackRange = hero.baseStats.attackRange

    // 应用被动技能加成
    const passiveSkillId = hero.passiveSkillId
    if (passiveSkillId === 'skill_passive_zhangfei') {
      attack = Math.floor(attack * 1.1)
    } else if (passiveSkillId === 'skill_passive_zhaoyun') {
      attackSpeed = attackSpeed * 1.2
    }

    // 应用装备加成
    const heroEquipment = this.equipmentManager.getHeroEquipment(hero.id)

    if (heroEquipment.weapon) {
      const weaponDetail = this.equipmentManager.getEquipmentDetail(heroEquipment.weapon.instanceId)
      if (weaponDetail?.bonuses) {
        attack += weaponDetail.bonuses.attack || 0
        attackSpeed += weaponDetail.bonuses.attackSpeed || 0
        attackRange += weaponDetail.bonuses.attackRange || 0
      }
    }

    if (heroEquipment.artifact) {
      const artifactDetail = this.equipmentManager.getEquipmentDetail(heroEquipment.artifact.instanceId)
      if (artifactDetail?.bonuses) {
        attack += artifactDetail.bonuses.attack || 0
        attackSpeed += artifactDetail.bonuses.attackSpeed || 0
        attackRange += artifactDetail.bonuses.attackRange || 0
      }
    }

    return { attack, attackSpeed, attackRange }
  }

  /**
   * 显示消息提示
   */
  private showMessage(msg: string): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const text = this.add.text(width / 2, height - 100, msg, {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setDepth(100)

    this.time.delayedCall(1500, () => text.destroy())
  }

  /**
   * 添加详情文本到面板
   */
  private addDetailText(
    x: number,
    y: number,
    text: string,
    color: string,
    bold: boolean = false,
    fontSize: number = 16
  ): Phaser.GameObjects.Text {
    const textObj = this.add.text(x, y, text, {
      fontSize: `${fontSize}px`,
      color: color,
      fontStyle: bold ? 'bold' : 'normal'
    }).setOrigin(0.5)

    this.detailPanel!.add(textObj)
    return textObj
  }

  /**
   * 创建返回按钮
   */
  private createBackButton(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const btnBg = this.add.rectangle(100, height - 50, 150, 40, 0x444466)
    const btnText = this.add.text(100, height - 50, '返回', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5)

    btnBg.setInteractive({ useHandCursor: true })
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x555588))
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x444466))
    btnBg.on('pointerdown', () => {
      // 自动存档
      this.autoSave()
      this.scene.start('TitleScene')
    })
  }

  /**
   * 自动存档
   */
  private autoSave(): void {
    const saveManager = SaveManager.getInstance()
    const saveData = saveManager.getCurrentSave()

    if (!saveData) return

    // 更新武将数据
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

    // 更新装备数据
    saveData.inventory.equipment = this.equipmentManager.getOwnedEquipment()
      .map(e => e.equipmentId)

    saveData.inventory.gems = this.equipmentManager.getOwnedGems()

    // 保存
    saveManager.saveCurrent()
    console.log('武将页面退出，已自动存档')
  }

  /**
   * 获取英雄头像图片key
   */
  private getHeroImageKey(heroId: string): string {
    const imageKeyMap: Record<string, string> = {
      'hero_guanyu': 'hero_guanyu',
      'hero_zhangfei': 'hero_zhangfei',
      'hero_zhaoyun': 'hero_zhaoyun'
    }
    return imageKeyMap[heroId] || 'hero_placeholder'
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
  private getRarityColor(rarity: string): string {
    const colors: Record<string, string> = {
      common: '#888888',
      rare: '#00aaff',
      epic: '#aa00ff',
      legendary: '#ffaa00'
    }
    return colors[rarity] || '#888888'
  }

  /**
   * 获取稀有度背景色
   */
  private getRarityBgColor(rarity: string): number {
    const colors: Record<string, number> = {
      common: 0x444444,
      rare: 0x2244aa,
      epic: 0x4422aa,
      legendary: 0x444400
    }
    return colors[rarity] || 0x444444
  }

  /**
   * 获取稀有度边框色
   */
  private getRarityBorderColor(rarity: string): number {
    const colors: Record<string, number> = {
      common: 0x888888,
      rare: 0x4488ff,
      epic: 0x8844ff,
      legendary: 0xffaa00
    }
    return colors[rarity] || 0x888888
  }

  /**
   * 获取稀有度文字色
   */
  private getRarityTextColor(rarity: string): string {
    const colors: Record<string, string> = {
      common: '#888888',
      rare: '#4488ff',
      epic: '#aa44ff',
      legendary: '#ffaa00'
    }
    return colors[rarity] || '#888888'
  }
}