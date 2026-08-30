import Phaser from 'phaser'
import { BattleSystem } from '@/core/battle/BattleSystem'
import { level1Config } from '@/data/levels/chapter1'
import { TerrainManager } from '@/core/terrain/TerrainManager'
import { PathRenderer } from '@/core/terrain/PathRenderer'
import { DeploymentZoneRenderer } from '@/core/terrain/DeploymentZoneRenderer'
import { Point, Hero } from '@/types'
import { SaveManager } from '@/core/save/SaveManager'
import { SoundFX } from '@/effects/SoundFX'
import {
  InkColor,
  InkText,
  InkRadius,
  inkText,
  createInkButton,
  inkToast,
  drawPaperBackground
} from '@/ui/InkTheme'

/**
 * 战斗场景
 * 游戏核心战斗界面
 */
export default class BattleScene extends Phaser.Scene {
  private levelId: string = ''
  private battleSystem!: BattleSystem

  // 地形系统
  private terrainManager!: TerrainManager
  private pathRenderer!: PathRenderer
  private deploymentZoneRenderer!: DeploymentZoneRenderer

  // 英雄选择面板
  private heroSelectionPanel: Phaser.GameObjects.Container | null = null
  private selectedZoneIndex: number | null = null

  // UI元素
  private costText!: Phaser.GameObjects.Text
  private healthText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'BattleScene' })
  }

  /**
   * 场景初始化
   */
  init(data: { levelId: string }): void {
    this.levelId = data.levelId || 'chapter1_level1'
    console.log(`BattleScene: 进入关卡 ${this.levelId}`)
  }

  /**
   * 创建场景内容
   */
  create(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // 0. 解锁零素材音效（首次点击/按键后 WebAudio 才能出声）
    SoundFX.unlock()

    // 0.5 宣纸底（纸色 + 淡墨晕染），地形在其上以水墨程序绘制
    drawPaperBackground(this)

    // 1. 创建地形系统
    this.createTerrainSystem()

    // 2. 渲染地形
    this.terrainManager.renderTerrain()

    // 3. 渲染路径
    this.pathRenderer.renderStaticPath()

    // 4. 渲染部署区域
    this.deploymentZoneRenderer.renderDeploymentZones()

    // 5. 初始化战斗系统（使用存档中的武将数据）
    const saveManager = SaveManager.getInstance()
    const heroes = saveManager.loadHeroes()
    this.battleSystem = new BattleSystem(this, level1Config, heroes)

    // 6. 创建UI（覆盖在最上层）
    this.createUI(width, height)

    // 7. 注册战斗事件回调
    this.registerBattleCallbacks()

    // 8. 注册部署区域交互
    this.registerDeploymentInteraction()

    // 9. 启动战斗
    this.battleSystem.startBattle()

    console.log('BattleScene: 战斗系统初始化完成')
  }

  /**
   * 创建地形系统
   */
  private createTerrainSystem(): void {
    const mapConfig = level1Config.map

    this.terrainManager = new TerrainManager(
      this,
      mapConfig.terrainAreas || [],
      mapConfig.defaultTerrain || 'grass'
    )

    this.pathRenderer = new PathRenderer(this, mapConfig.path)

    this.deploymentZoneRenderer = new DeploymentZoneRenderer(this, mapConfig.deployableAreas)
  }

  /**
   * 注册部署区域交互
   */
  private registerDeploymentInteraction(): void {
    // 监听鼠标移动
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const zoneIndex = this.deploymentZoneRenderer.isPointInZone({ x: pointer.x, y: pointer.y })

      if (zoneIndex !== null) {
        this.deploymentZoneRenderer.highlightZone(zoneIndex)
      } else {
        this.deploymentZoneRenderer.unhighlightAll()
      }
    })

    // 监听鼠标点击部署区域
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const zoneIndex = this.deploymentZoneRenderer.isPointInZone({ x: pointer.x, y: pointer.y })

      if (zoneIndex !== null) {
        this.showHeroSelectionPanel(zoneIndex)
      } else if (this.heroSelectionPanel) {
        this.hideHeroSelectionPanel()
      }
    })
  }

  /**
   * 显示英雄选择面板
   */
  private showHeroSelectionPanel(zoneIndex: number): void {
    // 如果已有面板，先隐藏
    if (this.heroSelectionPanel) {
      this.hideHeroSelectionPanel()
    }

    this.selectedZoneIndex = zoneIndex
    const area = level1Config.map.deployableAreas[zoneIndex]
    const saveManager = SaveManager.getInstance()
    const heroes = saveManager.loadHeroes()
    const heroList = Array.from(heroes.values())

    // 面板位置（在部署区域上方）
    const panelX = area.x + area.width / 2
    const panelY = area.y - 80

    // 创建面板容器
    this.heroSelectionPanel = this.add.container(panelX, panelY)

    // 面板背景（宣纸 + 墨线）
    const panelBg = this.add.rectangle(0, 0, 280, 160, InkColor.paperPanel, 0.95)
    panelBg.setStrokeStyle(1, InkColor.ink)
    this.heroSelectionPanel.add(panelBg)

    // 面板标题
    const title = inkText(this, 0, -70, '选择英雄', {
      size: 16,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    })
    this.heroSelectionPanel.add(title)

    // 英雄选项
    const startX = -120
    const startY = -40
    const spacing = 90

    for (let i = 0; i < heroList.length; i++) {
      const hero = heroList[i]
      const heroX = startX + i * spacing

      // 英雄头像
      const imageKey = this.getHeroImageKey(hero.id)
      if (this.textures.exists(imageKey)) {
        const heroImage = this.add.image(heroX, startY, imageKey)
        heroImage.setDisplaySize(50, 50)
        heroImage.setInteractive({ useHandCursor: true })

        // 悬停效果
        heroImage.on('pointerover', () => {
          heroImage.setScale(1.1)
        })
        heroImage.on('pointerout', () => {
          heroImage.setScale(1)
        })

        // 点击选择英雄
        heroImage.on('pointerdown', () => {
          this.selectHeroForDeployment(hero)
        })

        this.heroSelectionPanel.add(heroImage)
      }

      // 英雄名称
      const nameText = inkText(this, heroX, startY + 30, hero.name, {
        size: 12,
        color: InkText.ink,
        originX: 0.5
      })
      this.heroSelectionPanel.add(nameText)

      // 费用
      const costText = inkText(this, heroX, startY + 45, `费用:${hero.deploymentCost}`, {
        size: 10,
        color: InkText.gold,
        originX: 0.5
      })
      this.heroSelectionPanel.add(costText)
    }

    // 关闭按钮
    const closeBtn = this.add.rectangle(120, -70, 30, 20, InkColor.cinnabar)
    closeBtn.setInteractive({ useHandCursor: true })
    closeBtn.on('pointerdown', () => {
      this.hideHeroSelectionPanel()
    })

    const closeText = inkText(this, 120, -70, '✕', {
      size: 12,
      color: InkText.paper,
      originX: 0.5
    })

    this.heroSelectionPanel.add(closeBtn)
    this.heroSelectionPanel.add(closeText)

    // 设置深度（最上层）
    this.heroSelectionPanel.setDepth(30)

    // 淡入动画
    this.heroSelectionPanel.setAlpha(0)
    this.tweens.add({
      targets: this.heroSelectionPanel,
      alpha: 1,
      duration: 200
    })
  }

  /**
   * 隐藏英雄选择面板
   */
  private hideHeroSelectionPanel(): void {
    if (this.heroSelectionPanel) {
      this.heroSelectionPanel.destroy()
      this.heroSelectionPanel = null
      this.selectedZoneIndex = null
    }
  }

  /**
   * 选择英雄进行部署
   */
  private selectHeroForDeployment(hero: Hero): void {
    if (this.selectedZoneIndex === null) return

    const area = level1Config.map.deployableAreas[this.selectedZoneIndex]
    const position: Point = {
      x: area.x + area.width / 2,
      y: area.y + area.height / 2
    }

    const result = this.battleSystem.placeHero(hero.id, position)

    if (result.success) {
      console.log(`成功在区域${this.selectedZoneIndex + 1}部署英雄 ${hero.name}`)
      this.deploymentZoneRenderer.showZoneInfo(this.selectedZoneIndex, `已部署: ${hero.name}`)
      this.hideHeroSelectionPanel()
    } else {
      console.log(`部署失败: ${result.reason}`)
      this.showTemporaryMessage(`部署失败: ${result.reason}`)
    }
  }

  /**
   * 显示临时消息（顶部墨块提示）
   */
  private showTemporaryMessage(message: string): void {
    inkToast(this, message, 100)
  }

  /**
   * 画一个宣纸圆角小片（HUD 文字底衬，保证地形上可读）
   */
  private drawHudChip(x: number, y: number, w: number, h: number): void {
    const g = this.add.graphics()
    g.fillStyle(InkColor.paperPanel, 0.85)
    g.fillRoundedRect(x, y, w, h, InkRadius.sm)
    g.lineStyle(1, InkColor.ink, 0.6)
    g.strokeRoundedRect(x, y, w, h, InkRadius.sm)
  }

  /**
   * 创建UI
   */
  private createUI(width: number, height: number): void {
    // 费用显示
    this.drawHudChip(20, 12, 160, 32)
    this.costText = inkText(this, 34, 28, '费用: 20', {
      size: 18,
      color: InkText.ink
    })

    // 生命显示
    this.drawHudChip(20, 50, 160, 32)
    this.healthText = inkText(this, 34, 66, '生命: 20', {
      size: 18,
      color: InkText.ink
    })

    // 波次显示
    this.drawHudChip(width - 190, 12, 170, 32)
    this.waveText = inkText(this, width - 176, 28, '波次: 0/3', {
      size: 18,
      color: InkText.ink
    })

    // 关卡名称（顶部中间，纸片底衬）
    this.drawHudChip(width / 2 - 140, 10, 280, 38)
    inkText(this, width / 2, 29, level1Config.name, {
      size: 24,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    })

    // 状态显示（底部中间，纸片底衬）
    this.drawHudChip(width / 2 - 100, height - 70, 200, 34)
    inkText(this, width / 2, height - 53, '战斗进行中…', {
      size: 16,
      color: InkText.cinnabar,
      originX: 0.5
    })

    // 地形信息提示（右下，纸片底衬）
    this.drawHudChip(width - 300, height - 46, 200, 28)
    inkText(this, width - 200, height - 32, '点击虚线区域布阵', {
      size: 12,
      color: InkText.faint,
      originX: 0.5
    })

    // 返回按钮
    this.createBackButton(height)

    // 英雄选择面板（右侧）
    this.createHeroPanel(width, height)
  }

  /**
   * 创建返回按钮
   */
  private createBackButton(height: number): void {
    createInkButton(this, 100, height - 50, 150, 40, '返回', {
      fill: InkColor.paperPanel,
      hoverFill: InkColor.paperDeep,
      textColor: InkText.ink,
      fontSize: 20,
      stroke: InkColor.ink,
      onClick: () => {
        this.scene.start('TitleScene')
      }
    })
  }

  /**
   * 创建英雄选择面板（右侧固定面板）
   */
  private createHeroPanel(width: number, height: number): void {
    const panelX = width - 150
    const panelY = height / 2

    // 面板背景（宣纸 + 墨线）
    const panelBg = this.add.rectangle(panelX, panelY, 120, 400, InkColor.paperPanel, 0.92)
    panelBg.setStrokeStyle(1, InkColor.ink)

    // 英雄按钮（使用真实头像）
    const saveManager = SaveManager.getInstance()
    const heroes = saveManager.loadHeroes()
    const heroList = Array.from(heroes.values())

    let yOffset = -150
    for (const hero of heroList) {
      const imageKey = this.getHeroImageKey(hero.id)
      if (this.textures.exists(imageKey)) {
        const heroImage = this.add.image(panelX, panelY + yOffset - 20, imageKey)
        heroImage.setDisplaySize(60, 60)
        heroImage.setInteractive({ useHandCursor: true })

        heroImage.on('pointerdown', () => {
          this.placeHeroAtRandomPosition(hero.id)
        })
      }

      inkText(this, panelX, panelY + yOffset + 20, hero.name, {
        size: 12,
        color: InkText.ink,
        originX: 0.5
      })

      inkText(this, panelX, panelY + yOffset + 35, `费用: ${hero.deploymentCost}`, {
        size: 10,
        color: InkText.gold,
        originX: 0.5
      })

      yOffset += 100
    }
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
   * 在随机位置放置英雄（保留原有功能）
   */
  private placeHeroAtRandomPosition(heroId: string): void {
    const areas = level1Config.map.deployableAreas
    if (areas.length === 0) return

    const area = areas[Math.floor(Math.random() * areas.length)]
    const position: Point = {
      x: area.x + area.width / 2,
      y: area.y + area.height / 2
    }

    const result = this.battleSystem.placeHero(heroId, position)

    if (result.success) {
      console.log(`成功放置英雄 ${heroId}，剩余费用: ${result.remainingCost}`)
    } else {
      console.log(`放置失败: ${result.reason}`)
      this.showTemporaryMessage(`放置失败: ${result.reason}`)
    }
  }

  /**
   * 注册战斗事件回调
   */
  private registerBattleCallbacks(): void {
    this.battleSystem.onEnemyKilled((enemy) => {
      console.log(`敌人 ${enemy.getEnemyData().name} 被击杀`)
    })

    this.battleSystem.onEnemyReachedExit((enemy) => {
      console.log(`敌人 ${enemy.getEnemyData().name} 到达终点`)
      this.showTemporaryMessage('敌人突破了防线！')
    })

    this.battleSystem.onWaveStart((wave) => {
      console.log(`波次 ${wave} 开始`)
      this.showTemporaryMessage(`波次 ${wave} 开始！`)
    })

    this.battleSystem.onBattleEnd((result) => {
      // 战斗结束后跳转到结算场景
      this.time.delayedCall(1000, () => {
        this.scene.start('SettlementScene', { battleResult: result })
      })
    })
  }

  /**
   * 场景更新（每帧调用）
   */
  update(_time: number, delta: number): void {
    if (!this.battleSystem) return

    this.battleSystem.update(delta)
    this.updateUI()
  }

  /**
   * 更新UI
   */
  private updateUI(): void {
    const state = this.battleSystem.getState()

    this.costText.setText(`费用: ${state.currentCost}`)
    this.healthText.setText(`生命: ${state.playerHealth}`)
    this.waveText.setText(`波次: ${state.currentWave}/${state.totalWaves}`)
  }
}