import Phaser from 'phaser'
import { BattleSystem } from '@/core/battle/BattleSystem'
import { level1Config } from '@/data/levels/chapter1'
import { createDefaultHeroes } from '@/data/heroes'
import { getEnemyConfig } from '@/data/enemies'

/**
 * 战斗场景
 * 游戏核心战斗界面
 */
export default class BattleScene extends Phaser.Scene {
  private levelId: string = ''
  private battleSystem!: BattleSystem

  // UI元素
  private costText!: Phaser.GameObjects.Text
  private healthText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text

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

    // 创建背景
    this.createBackground()

    // 初始化战斗系统
    const heroes = createDefaultHeroes()
    this.battleSystem = new BattleSystem(this, level1Config, heroes)

    // 创建UI
    this.createUI(width, height)

    // 注册战斗事件回调
    this.registerBattleCallbacks()

    // 启动战斗
    this.battleSystem.startBattle()

    console.log('BattleScene: 战斗系统初始化完成')
  }

  /**
   * 创建背景
   */
  private createBackground(): void {
    // 简单背景（后续可替换为地图图片）
    this.add.rectangle(640, 360, 1280, 720, 0x2a2a3a)

    // 绘制敌人路径（可视化）
    const graphics = this.add.graphics()
    graphics.lineStyle(3, 0x444444)

    const path = level1Config.map.path
    graphics.beginPath()
    graphics.moveTo(path[0].x, path[0].y)
    for (let i = 1; i < path.length; i++) {
      graphics.lineTo(path[i].x, path[i].y)
    }
    graphics.strokePath()

    // 标记起点和终点
    this.add.circle(path[0].x, path[0].y, 10, 0x00ff00)  // 绿色起点
    this.add.circle(path[path.length - 1].x, path[path.length - 1].y, 10, 0xff0000)  // 红色终点
  }

  /**
   * 创建UI
   */
  private createUI(width: number, height: number): void {
    // 费用显示
    this.costText = this.add.text(20, 20, '费用: 20', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000'
    })

    // 生命显示
    this.healthText = this.add.text(20, 50, '生命: 20', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000'
    })

    // 波次显示
    this.waveText = this.add.text(width - 200, 20, '波次: 0/3', {
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#000000'
    })

    // 状态显示
    this.statusText = this.add.text(width / 2, height - 50, '战斗进行中...', {
      fontSize: '20px',
      color: '#ffaa00'
    }).setOrigin(0.5)

    // 关卡名称
    this.add.text(width / 2, 30, level1Config.name, {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // 返回按钮
    this.createBackButton(width, height)

    // 英雄选择面板（简化版）
    this.createHeroPanel(width, height)
  }

  /**
   * 创建返回按钮
   */
  private createBackButton(width: number, height: number): void {
    const buttonBg = this.add.rectangle(100, height - 50, 150, 40, 0x444444)
    const buttonText = this.add.text(100, height - 50, '返回', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5)

    buttonBg.setInteractive({ useHandCursor: true })

    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x666666)
    })

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x444444)
    })

    buttonBg.on('pointerdown', () => {
      this.scene.start('TitleScene')
    })
  }

  /**
   * 创建英雄选择面板
   */
  private createHeroPanel(width: number, height: number): void {
    const panelX = width - 150
    const panelY = height / 2

    // 面板背景
    this.add.rectangle(panelX, panelY, 120, 400, 0x333333)

    // 英雄按钮（使用真实头像）
    const heroes = createDefaultHeroes()
    const heroList = Array.from(heroes.values())

    let yOffset = -150
    for (const hero of heroList) {
      // 英雄头像图片
      const imageKey = this.getHeroImageKey(hero.id)
      if (this.textures.exists(imageKey)) {
        const heroImage = this.add.image(panelX, panelY + yOffset - 20, imageKey)
        heroImage.setDisplaySize(60, 60)  // 缩小显示
        heroImage.setInteractive({ useHandCursor: true })

        // 点击放置英雄
        heroImage.on('pointerdown', () => {
          this.placeHeroAtRandomPosition(hero.id)
        })
      }

      // 英雄名称
      this.add.text(panelX, panelY + yOffset + 20, hero.name, {
        fontSize: '12px',
        color: '#ffffff'
      }).setOrigin(0.5)

      // 费用显示
      this.add.text(panelX, panelY + yOffset + 35, `费用: ${hero.deploymentCost}`, {
        fontSize: '10px',
        color: '#ffaa00'
      }).setOrigin(0.5)

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
   * 在随机位置放置英雄（简化实现）
   */
  private placeHeroAtRandomPosition(heroId: string): void {
    const areas = level1Config.map.deployableAreas
    if (areas.length === 0) return

    const area = areas[Math.floor(Math.random() * areas.length)]
    const position = {
      x: area.x + area.width / 2,
      y: area.y + area.height / 2
    }

    const result = this.battleSystem.placeHero(heroId, position)

    if (result.success) {
      console.log(`成功放置英雄 ${heroId}，剩余费用: ${result.remainingCost}`)
    } else {
      console.log(`放置失败: ${result.reason}`)
      // 显示提示
      this.showTemporaryMessage(`放置失败: ${result.reason}`)
    }
  }

  /**
   * 显示临时消息
   */
  private showTemporaryMessage(message: string): void {
    const msg = this.add.text(this.cameras.main.width / 2, 100, message, {
      fontSize: '20px',
      color: '#ff0000'
    }).setOrigin(0.5)

    this.time.delayedCall(2000, () => {
      msg.destroy()
    })
  }

  /**
   * 获取英雄颜色
   */
  private getHeroColor(wuXing: string): number {
    const colors: Record<string, number> = {
      metal: 0xcccccc,
      wood: 0x00aa00,
      water: 0x0088ff,
      fire: 0xff4400,
      earth: 0xffcc00
    }
    return colors[wuXing] || 0x888888
  }

  /**
   * 注册战斗事件回调
   */
  private registerBattleCallbacks(): void {
    // 敌人被击杀
    this.battleSystem.onEnemyKilled((enemy) => {
      console.log(`敌人 ${enemy.getEnemyData().name} 被击杀`)
    })

    // 敌人到达终点
    this.battleSystem.onEnemyReachedExit((enemy) => {
      console.log(`敌人 ${enemy.getEnemyData().name} 到达终点`)
      this.showTemporaryMessage('敌人突破了防线！')
    })

    // 波次开始
    this.battleSystem.onWaveStart((wave) => {
      console.log(`波次 ${wave} 开始`)
      this.showTemporaryMessage(`波次 ${wave} 开始！`)
    })

    // 战斗结束
    this.battleSystem.onBattleEnd((result) => {
      if (result.isVictory) {
        this.statusText.setText('胜利！')
        this.statusText.setColor('#00ff00')
      } else {
        this.statusText.setText('失败！')
        this.statusText.setColor('#ff0000')
      }
    })
  }

  /**
   * 场景更新（每帧调用）
   */
  update(time: number, delta: number): void {
    if (!this.battleSystem) return

    // 更新战斗系统
    this.battleSystem.update(delta)

    // 更新UI
    this.updateUI()

    // 敌人生成（简化实现：手动触发）
    this.spawnEnemiesIfNeeded()
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

  /**
   * 敌人生成（简化实现）
   */
  private spawnEnemiesIfNeeded(): void {
    // 简化实现：根据波次配置手动生成敌人
    // 完整实现需要在BattleSystem中集成WaveManager的生成逻辑
    // 这里作为tracer bullet，暂时手动生成一些敌人测试

    const state = this.battleSystem.getState()
    if (state.status === 'running' && state.activeEnemies.length < 3) {
      // 手动生成敌人测试
      // 完整实现后删除这段代码
    }
  }
}