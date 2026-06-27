import Phaser from 'phaser'
import { EquipmentManager, EquipmentInstance } from '@/core/equipment/EquipmentManager'
import { getWeapon, getArtifact } from '@/data/equipment'
import { getGemName } from '@/data/equipment/gems'
import { RarityNames, Rarity, Gem } from '@/types'

/**
 * 装备页面场景
 * 显示装备列表和宝石列表
 */
export default class EquipmentScene extends Phaser.Scene {
  private equipmentManager: EquipmentManager
  private equipmentCards: Phaser.GameObjects.Container[] = []
  private gemCards: Phaser.GameObjects.Container[] = []
  private selectedEquipment: EquipmentInstance | null = null
  private selectedGem: Gem | null = null
  private detailPanel: Phaser.GameObjects.Container | null = null

  constructor() {
    super({ key: 'EquipmentScene' })
    this.equipmentManager = new EquipmentManager()
  }

  create(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e)

    // 标题
    this.add.text(width / 2, 40, '装备管理', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)

    // 创建装备列表
    this.createEquipmentList()

    // 创建宝石列表
    this.createGemList()

    // 创建详情面板
    this.createDetailPanel()

    // 返回按钮
    this.createBackButton()
  }

  /**
   * 创建装备列表
   */
  private createEquipmentList(): void {
    const equipment = this.equipmentManager.getOwnedEquipment()
    const startX = 80
    const startY = 100
    const cardWidth = 90
    const cardHeight = 100
    const spacing = 15

    // 装备列表标题
    this.add.text(startX, startY - 20, '装备列表', {
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0, 0.5)

    for (let i = 0; i < equipment.length; i++) {
      const equip = equipment[i]
      const x = startX + (i % 5) * (cardWidth + spacing)
      const y = startY + Math.floor(i / 5) * (cardHeight + spacing)

      const card = this.createEquipmentCard(equip, x, y, cardWidth, cardHeight)
      this.equipmentCards.push(card)
    }
  }

  /**
   * 创建装备卡片
   */
  private createEquipmentCard(
    equip: EquipmentInstance,
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Container {
    const card = this.add.container(x, y)

    // 获取装备详情
    const detail = this.equipmentManager.getEquipmentDetail(equip.instanceId)
    if (!detail) return card

    // 卡片背景（根据装备状态调整颜色）
    const bgColor = this.getRarityBgColor(equip.rarity)
    const bg = this.add.rectangle(0, 0, width, height, bgColor, equip.isEquipped ? 1 : 0.9)
    bg.setStrokeStyle(equip.isEquipped ? 3 : 2, equip.isEquipped ? 0x88ff88 : this.getRarityBorderColor(equip.rarity))
    card.add(bg)

    // 装备类型图标
    const typeText = equip.type === 'weapon' ? '武' : '神'
    const typeColor = equip.type === 'weapon' ? '#ff6666' : '#66aaff'
    const typeLabel = this.add.text(0, -35, typeText, {
      fontSize: '16px',
      color: typeColor,
      fontStyle: 'bold'
    }).setOrigin(0.5)
    card.add(typeLabel)

    // 装备名称
    const nameText = this.add.text(0, -10, detail.name, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    card.add(nameText)

    // 稀有度
    const rarityText = this.add.text(0, 10, RarityNames[equip.rarity as Rarity], {
      fontSize: '10px',
      color: this.getRarityTextColor(equip.rarity)
    }).setOrigin(0.5)
    card.add(rarityText)

    // 状态标记（已装备显示更明显）
    if (equip.isEquipped) {
      const statusBg = this.add.rectangle(0, 30, 70, 18, 0x00aa00, 0.8)
      const statusText = this.add.text(0, 30, '✓ 已装备', {
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5)
      card.add(statusBg)
      card.add(statusText)
    } else {
      const statusBg = this.add.rectangle(0, 30, 70, 18, 0x555555, 0.6)
      const statusText = this.add.text(0, 30, '未装备', {
        fontSize: '10px',
        color: '#aaaaaa'
      }).setOrigin(0.5)
      card.add(statusBg)
      card.add(statusText)
    }

    // 点击交互
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => {
      bg.setFillStyle(bgColor, 1)
      card.setScale(1.05)
    })
    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor, equip.isEquipped ? 1 : 0.9)
      card.setScale(1)
    })
    bg.on('pointerdown', () => {
      this.selectEquipment(equip)
    })

    card.setData('equipmentInstance', equip)
    return card
  }

  /**
   * 创建宝石列表
   */
  private createGemList(): void {
    const gems = this.equipmentManager.getOwnedGems()
    const startX = 80
    const startY = 350
    const cardWidth = 60
    const cardHeight = 70
    const spacing = 10

    // 宝石列表标题
    this.add.text(startX, startY - 20, '宝石列表', {
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0, 0.5)

    for (let i = 0; i < gems.length; i++) {
      const gem = gems[i]
      const x = startX + (i % 8) * (cardWidth + spacing)
      const y = startY + Math.floor(i / 8) * (cardHeight + spacing)

      const card = this.createGemCard(gem, x, y, cardWidth, cardHeight)
      this.gemCards.push(card)
    }
  }

  /**
   * 创建宝石卡片
   */
  private createGemCard(
    gem: Gem,
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Container {
    const card = this.add.container(x, y)

    // 背景
    const bgColor = this.getWuXingBgColor(gem.wuXing)
    const bg = this.add.rectangle(0, 0, width, height, bgColor, 0.9)
    bg.setStrokeStyle(2, this.getWuXingBorderColor(gem.wuXing))
    card.add(bg)

    // 五行图标
    const wuXingText = this.getWuXingText(gem.wuXing)
    const wuXingLabel = this.add.text(0, -20, wuXingText, {
      fontSize: '18px',
      color: this.getWuXingTextColor(gem.wuXing),
      fontStyle: 'bold'
    }).setOrigin(0.5)
    card.add(wuXingLabel)

    // 宝石名称
    const gemName = getGemName(gem)
    const nameText = this.add.text(0, 5, gemName, {
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5)
    card.add(nameText)

    // 等级
    const levelText = this.add.text(0, 20, `Lv.${gem.level}`, {
      fontSize: '12px',
      color: '#ffcc00',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    card.add(levelText)

    // 点击交互
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerover', () => {
      bg.setFillStyle(bgColor, 1)
      card.setScale(1.05)
    })
    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor, 0.9)
      card.setScale(1)
    })
    bg.on('pointerdown', () => {
      this.selectGem(gem)
    })

    card.setData('gem', gem)
    return card
  }

  /**
   * 选中装备
   */
  private selectEquipment(equip: EquipmentInstance): void {
    this.selectedEquipment = equip
    this.selectedGem = null

    // 更新详情面板
    this.updateDetailPanel(equip)

    // 高亮选中卡片
    for (const card of this.equipmentCards) {
      const cardEquip = card.getData('equipmentInstance') as EquipmentInstance
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      if (cardEquip.instanceId === equip.instanceId) {
        bg.setStrokeStyle(4, 0xffffff)
      } else {
        bg.setStrokeStyle(cardEquip.isEquipped ? 3 : 2, cardEquip.isEquipped ? 0x88ff88 : this.getRarityBorderColor(cardEquip.rarity))
      }
    }

    // 清除宝石卡片高亮
    for (const card of this.gemCards) {
      const gem = card.getData('gem') as Gem
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      bg.setStrokeStyle(2, this.getWuXingBorderColor(gem.wuXing))
    }
  }

  /**
   * 选中宝石
   */
  private selectGem(gem: Gem): void {
    this.selectedGem = gem
    this.selectedEquipment = null

    // 更新详情面板
    this.updateGemDetailPanel(gem)

    // 高亮选中卡片
    for (const card of this.gemCards) {
      const cardGem = card.getData('gem') as Gem
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      if (cardGem.id === gem.id) {
        bg.setStrokeStyle(4, 0xffffff)
      } else {
        bg.setStrokeStyle(2, this.getWuXingBorderColor(cardGem.wuXing))
      }
    }

    // 清除装备卡片高亮
    for (const card of this.equipmentCards) {
      const equip = card.getData('equipmentInstance') as EquipmentInstance
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle
      bg.setStrokeStyle(equip.isEquipped ? 3 : 2, equip.isEquipped ? 0x88ff88 : this.getRarityBorderColor(equip.rarity))
    }
  }

  /**
   * 创建详情面板
   */
  private createDetailPanel(): void {
    const width = this.cameras.main.width
    const panelX = width - 300
    const panelY = 250
    const panelWidth = 280
    const panelHeight = 300

    this.detailPanel = this.add.container(panelX, panelY)

    // 背景
    const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x222244, 0.95)
    bg.setStrokeStyle(2, 0x4466aa)
    this.detailPanel.add(bg)

    // 标题
    const title = this.add.text(0, -140, '详情', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    this.detailPanel.add(title)
  }

  /**
   * 更新装备详情面板
   */
  private updateDetailPanel(equip: EquipmentInstance): void {
    if (!this.detailPanel) return

    // 清除旧内容
    while (this.detailPanel.length > 2) {
      this.detailPanel.removeAt(2, true)
    }

    const detail = this.equipmentManager.getEquipmentDetail(equip.instanceId)
    if (!detail) return

    const startY = -110
    const lineHeight = 25

    // 名称
    this.addPanelText(0, startY, detail.name, '#ffffff', true, 18)
    this.addPanelText(0, startY + lineHeight, `${RarityNames[detail.rarity]} · ${equip.type === 'weapon' ? '武器' : '神器'}`, this.getRarityTextColor(detail.rarity))

    // 属性加成
    this.addPanelText(0, startY + lineHeight * 2.5, '— 属性加成 —', '#aaaaaa', true)
    let bonusY = startY + lineHeight * 3.5

    const bonuses = detail.bonuses
    if (bonuses.attack) {
      this.addPanelText(-60, bonusY, `攻击 +${bonuses.attack}`, '#ff6666')
    }
    if (bonuses.attackSpeed) {
      this.addPanelText(60, bonusY, `攻速 +${bonuses.attackSpeed.toFixed(1)}`, '#66ff66')
    }
    if (bonuses.attackRange) {
      bonusY += lineHeight
      this.addPanelText(0, bonusY, `范围 +${bonuses.attackRange}`, '#6666ff')
    }

    // 神器宝石槽
    if (equip.type === 'artifact') {
      const artifact = detail as any
      bonusY += lineHeight * 1.5
      this.addPanelText(0, bonusY, '— 宝石槽 —', '#aaaaaa', true)
      bonusY += lineHeight
      this.addPanelText(0, bonusY, `需求: ${this.getWuXingText(artifact.gemSocket?.requiredWuXing)}`, this.getWuXingColor(artifact.gemSocket?.requiredWuXing))

      if (artifact.gemSocket?.currentGem) {
        bonusY += lineHeight
        this.addPanelText(0, bonusY, '✓ 已镶嵌', '#88ff88', true)
      } else {
        bonusY += lineHeight
        this.addPanelText(0, bonusY, '空槽', '#888888')
      }
    }

    // 状态（更明显）
    bonusY += lineHeight * 1.5
    if (equip.isEquipped) {
      this.addPanelText(0, bonusY, '[已装备]', '#00ff00', true, 16)
      if (equip.equippedHeroId) {
        bonusY += lineHeight
        this.addPanelText(0, bonusY, `装备于: ${equip.equippedHeroId}`, '#88ff88')
      }
    } else {
      this.addPanelText(0, bonusY, '[未装备]', '#888888', true, 16)
    }
  }

  /**
   * 更新宝石详情面板
   */
  private updateGemDetailPanel(gem: Gem): void {
    if (!this.detailPanel) return

    // 清除旧内容
    while (this.detailPanel.length > 2) {
      this.detailPanel.removeAt(2, true)
    }

    const startY = -110
    const lineHeight = 25

    // 宝石名称
    const gemName = getGemName(gem)
    this.addPanelText(0, startY, gemName, '#ffffff', true, 18)

    // 五行属性
    this.addPanelText(0, startY + lineHeight, `${this.getWuXingText(gem.wuXing)} · 等级 ${gem.level}`, this.getWuXingColor(gem.wuXing), true)

    // 宝石效果说明
    this.addPanelText(0, startY + lineHeight * 2.5, '— 宝石效果 —', '#aaaaaa', true)
    const effectY = startY + lineHeight * 3.5

    // 根据五行显示效果
    const effectTexts: Record<string, string> = {
      metal: `攻击力 +${gem.level * 5}%`,
      wood: `暴击率 +${gem.level * 2}%`,
      water: `攻击速度 +${gem.level * 3}%`,
      fire: `伤害 +${gem.level * 4}%`,
      earth: `防御 +${gem.level * 6}%`
    }
    this.addPanelText(0, effectY, effectTexts[gem.wuXing] || '未知效果', '#ffcc00')

    // 用途说明
    this.addPanelText(0, effectY + lineHeight * 2, '— 用途 —', '#aaaaaa', true)
    this.addPanelText(0, effectY + lineHeight * 3, '镶嵌到对应五行神器', '#ffffff')
    this.addPanelText(0, effectY + lineHeight * 4, '可激活神器隐藏效果', '#88ff88')
  }

  /**
   * 刷新装备列表
   */
  private refreshEquipmentList(): void {
    // 清除旧卡片
    for (const card of this.equipmentCards) {
      card.destroy()
    }
    this.equipmentCards = []

    // 重新创建
    this.createEquipmentList()
  }

  /**
   * 刷新宝石列表
   */
  private refreshGemList(): void {
    // 清除旧卡片
    for (const card of this.gemCards) {
      card.destroy()
    }
    this.gemCards = []

    // 重新创建
    this.createGemList()
  }

  /**
   * 显示消息提示
   */
  private showMessage(msg: string): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const text = this.add.text(width / 2, height - 80, msg, {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setDepth(100)

    this.time.delayedCall(1500, () => text.destroy())
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
      this.scene.start('TitleScene')
    })
  }

  /**
   * 添加面板文本
   */
  private addPanelText(
    x: number,
    y: number,
    text: string,
    color: string,
    bold: boolean = false,
    fontSize: number = 14
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
   * 获取五行文字颜色
   */
  private getWuXingTextColor(wuXing: string): string {
    return this.getWuXingColor(wuXing)
  }

  /**
   * 获取五行背景色
   */
  private getWuXingBgColor(wuXing: string): number {
    const colors: Record<string, number> = {
      metal: 0x888888,
      wood: 0x004400,
      water: 0x004488,
      fire: 0x884400,
      earth: 0x886600
    }
    return colors[wuXing] || 0x444444
  }

  /**
   * 获取五行边框色
   */
  private getWuXingBorderColor(wuXing: string): number {
    const colors: Record<string, number> = {
      metal: 0xcccccc,
      wood: 0x00aa00,
      water: 0x0088ff,
      fire: 0xff4400,
      earth: 0xffcc00
    }
    return colors[wuXing] || 0x888888
  }
}