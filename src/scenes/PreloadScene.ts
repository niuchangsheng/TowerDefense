import Phaser from 'phaser'
import { GAME_TITLE } from '@/config/constants'
import { GemIconRenderer } from '@/rendering/GemIconRenderer'
import {
  InkColor,
  InkText,
  InkFontSize,
  drawPaperBackground,
  inkText
} from '@/ui/InkTheme'

/**
 * 预加载场景（水墨宣纸风）
 * 负责加载所有游戏资源（图片、音频等）
 */
export default class PreloadScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics
  private progressBar!: Phaser.GameObjects.Graphics
  private loadingText!: Phaser.GameObjects.Text
  private titleText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'PreloadScene' })
  }

  /**
   * 场景初始化
   */
  init(): void {
    console.log('PreloadScene: 开始加载资源')
  }

  /**
   * 预加载资源
   */
  preload(): void {
    this.createLoadingUI()

    // 加载进度事件
    this.load.on('progress', (value: number) => {
      this.updateProgress(value)
    })

    this.load.on('complete', () => {
      console.log('PreloadScene: 资源加载完成')
    })

    // 添加错误处理
    this.load.on('loaderror', (file: any) => {
      console.error(`加载失败: ${file.key} - ${file.path}`)
    })

    // 加载真实资源
    this.loadRealAssets()
  }

  /**
   * 创建加载UI（宣纸底 + 墨色进度条）
   */
  private createLoadingUI(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    drawPaperBackground(this)

    // 游戏标题
    this.titleText = inkText(this, width / 2, height / 2 - 90, GAME_TITLE, {
      size: 28,
      color: InkText.wash,
      bold: true,
      originX: 0.5
    })

    // 加载文字
    this.loadingText = inkText(this, width / 2, height / 2 - 30, '加载中…', {
      size: InkFontSize.md,
      color: InkText.faint,
      originX: 0.5
    })

    // 进度条背景（宣纸深色长条 + 墨线描边）
    const barW = 560
    const barH = 12
    const barX = width / 2 - barW / 2
    const barY = height / 2 + 10

    this.loadingBar = this.add.graphics()
    this.loadingBar.fillStyle(InkColor.paperDeep, 1)
    this.loadingBar.fillRoundedRect(barX, barY, barW, barH, 6)
    this.loadingBar.lineStyle(1, InkColor.ink, 0.5)
    this.loadingBar.strokeRoundedRect(barX, barY, barW, barH, 6)

    // 进度条填充
    this.progressBar = this.add.graphics()
  }

  /**
   * 更新进度条
   */
  private updateProgress(value: number): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const barW = 560
    const barX = width / 2 - barW / 2
    const barY = height / 2 + 10

    this.progressBar.clear()
    this.progressBar.fillStyle(InkColor.ink, 0.65)
    this.progressBar.fillRoundedRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * value), 8, 4)

    this.loadingText.setText(`加载中… ${Math.floor(value * 100)}%`)
  }

  /**
   * 加载真实资源（三国志11素材）
   */
  private loadRealAssets(): void {
    // 加载武将头像
    this.load.image('hero_guanyu', 'assets/images/heroes/San11/face/0002_关羽_1.jpg')
    this.load.image('hero_zhangfei', 'assets/images/heroes/San11/face/0001_张飞_1.jpg')
    this.load.image('hero_zhaoyun', 'assets/images/heroes/San11/face/0009_赵云_1.jpg')

    // 加载武将暴击图（技能释放时展示）
    this.load.image('baoji_guanyu', 'assets/images/heroes/San11/baoji/关羽.jpg')
    this.load.image('baoji_zhangfei', 'assets/images/heroes/San11/baoji/张飞.jpg')
    this.load.image('baoji_zhaoyun', 'assets/images/heroes/San11/baoji/赵云.jpg')
    this.load.image('baoji_lvbu', 'assets/images/heroes/San11/baoji/吕布.jpg')
    this.load.image('baoji_zhouyu', 'assets/images/heroes/San11/baoji/周瑜.jpg')
    this.load.image('baoji_caocao', 'assets/images/heroes/San11/baoji/曹操.jpg')
    this.load.image('baoji_zhugeliang', 'assets/images/heroes/San11/baoji/诸葛亮.jpg')
    this.load.image('baoji_diaochan', 'assets/images/heroes/San11/baoji/貂蝉.jpg')

    // 加载神器/兵器素材
    this.load.image('artifact_chitu', 'assets/images/weapons/赤兔马.png')
    this.load.image('artifact_fangtian', 'assets/images/weapons/方天画戟.png')
    this.load.image('artifact_dilu', 'assets/images/weapons/的卢.png')
    this.load.image('artifact_qinglong', 'assets/images/weapons/青龙偃月刀.png')
    this.load.image('artifact_shemao', 'assets/images/weapons/丈八蛇矛.png')
    this.load.image('artifact_sherigong', 'assets/images/weapons/射日弓.png')
    this.load.image('artifact_sunzi', 'assets/images/weapons/孙子兵法.png')
    this.load.image('artifact_tongque', 'assets/images/weapons/铜雀.png')
    this.load.image('artifact_yuxi', 'assets/images/weapons/玉玺.png')

    console.log('PreloadScene: 武将头像、暴击图、全身模型与神器素材加载完成')
  }

  /**
   * 创建占位纹理（备用）
   */
  private createPlaceholderTextures(): void {
    // 英雄占位（简单矩形）- 作为备用
    const heroGraphics = this.add.graphics()
    heroGraphics.fillStyle(0x00ff00)
    heroGraphics.fillRect(0, 0, 64, 64)
    heroGraphics.generateTexture('hero_placeholder', 64, 64)
    heroGraphics.destroy()

    // 敌人占位
    const enemyGraphics = this.add.graphics()
    enemyGraphics.fillStyle(0xff0000)
    enemyGraphics.fillRect(0, 0, 32, 32)
    enemyGraphics.generateTexture('enemy_placeholder', 32, 32)
    enemyGraphics.destroy()

    // UI按钮占位
    const buttonGraphics = this.add.graphics()
    buttonGraphics.fillStyle(0x4444ff)
    buttonGraphics.fillRect(0, 0, 200, 50)
    buttonGraphics.generateTexture('button_placeholder', 200, 50)
    buttonGraphics.destroy()
  }

  /**
   * 创建场景内容
   */
  create(): void {
    // 创建占位纹理（备用）
    this.createPlaceholderTextures()

    // 预初始化全套 25 款五行宝石矢量纹理
    GemIconRenderer.init(this)

    // 隐藏加载UI
    this.loadingBar.destroy()
    this.progressBar.destroy()
    this.loadingText.destroy()
    this.titleText.destroy()

    // 支持通过 URL 参数跳转到指定场景 (如 ?scene=BattleScene&levelId=level1)
    const urlParams = new URLSearchParams(window.location.search)
    const targetScene = urlParams.get('scene')
    if (targetScene && this.scene.get(targetScene)) {
      const levelId = urlParams.get('levelId') || 'level1'
      this.scene.start(targetScene, { levelId })
    } else {
      // 转到标题场景
      this.scene.start('TitleScene')
    }
  }
}
