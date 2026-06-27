import Phaser from 'phaser'
import { createDefaultHeroes, getHeroConfig } from '@/data/heroes'
import { getSkill } from '@/data/skills'
import { Hero, RarityNames } from '@/types'

/**
 * 武将页面场景
 * 显示所有武将及其属性
 */
export default class HeroListScene extends Phaser.Scene {
  private heroes!: Map<string, Hero>
  private selectedHeroId: string | null = null
  private heroCards: Phaser.GameObjects.Container[] = []
  private detailPanel: Phaser.GameObjects.Container | null = null

  constructor() {
    super({ key: 'HeroListScene' })
  }

  init(): void {
    this.heroes = createDefaultHeroes()
    this.selectedHeroId = null
    this.heroCards = []
    this.detailPanel = null
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
    const panelHeight = 500

    this.detailPanel = this.add.container(panelX, panelY)

    // 面板背景
    const panelBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x222244, 0.95)
    panelBg.setStrokeStyle(2, 0x4466aa)
    this.detailPanel.add(panelBg)

    // 面板标题
    const title = this.add.text(0, -220, '武将详情', {
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

    const startY = -180
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

    // 等级
    this.addDetailText(50, infoY, `等级: Lv.${hero.level}`, '#88ff88')
    infoY += lineHeight

    // 星级
    this.addDetailText(50, infoY, `星级: ${'★'.repeat(hero.star)}${'☆'.repeat(5 - hero.star)}`, '#ffaa00')
    infoY += lineHeight * 2

    // 属性区域标题
    this.addDetailText(0, infoY, '— 基础属性 —', '#aaaaaa', true)
    infoY += lineHeight

    // 攻击力
    const attack = Math.floor(hero.baseStats.attack * (1 + (hero.level - 1) * 0.05))
    this.addDetailText(-80, infoY, `攻击: ${attack}`, '#ff6666')
    this.addDetailText(80, infoY, `基础: ${hero.baseStats.attack}`, '#888888')
    infoY += lineHeight

    // 攻速
    const attackSpeed = hero.baseStats.attackSpeed.toFixed(1)
    this.addDetailText(-80, infoY, `攻速: ${attackSpeed}/s`, '#66ff66')
    this.addDetailText(80, infoY, `范围: ${hero.baseStats.attackRange}`, '#888888')
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
      this.scene.start('TitleScene')
    })
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
}