import Phaser from 'phaser'
import { TroopConfig, DeployedTroop, Point } from '@/types'
import { InkColor, InkRadius, inkText, InkText } from '@/ui/InkTheme'
import { InkSilhouetteRenderer } from '@/rendering/InkSilhouetteRenderer'

/**
 * 兵种渲染实体（水墨战阵兵人风）
 * 彻底废弃单字方块，采用生动的冷兵器甲士水墨剪影（枪兵/弓手/骑兵/刀兵）。
 * 攻击时根据攻击风格（刺击/挥砍/挽弓）播放真实冷兵器打击动作。
 */
export class TroopEntity extends Phaser.GameObjects.Container {
  private troopData: TroopConfig
  private deployedData: DeployedTroop
  private warriorSprite: Phaser.GameObjects.Image
  private rangeIndicator: Phaser.GameObjects.Graphics

  constructor(scene: Phaser.Scene, troop: TroopConfig, deployed: DeployedTroop) {
    super(scene, deployed.position.x, deployed.position.y)

    this.troopData = troop
    this.deployedData = deployed

    InkSilhouetteRenderer.init(scene)

    // 1. 地面青铜微型地钉与水墨战阵阴影
    const shadow = scene.add.ellipse(0, 18, 30, 7, 0x000000, 0.16)
    this.add(shadow)

    // 2. 兵人剪影
    const textureKey = this.getTroopTextureKey(troop.type)
    this.warriorSprite = scene.add.image(0, -3, textureKey)
    this.warriorSprite.setScale(0.7)
    this.add(this.warriorSprite)

    // 3. 兵种微型名签（紧凑置于底部 y = 22）
    const nameText = inkText(scene, 0, 22, troop.name, {
      size: 10,
      color: InkText.wash,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const nameBg = scene.add.graphics()
    const nw = nameText.width + 8
    const nh = nameText.height + 2
    nameBg.fillStyle(InkColor.paperPanel, 0.9)
    nameBg.fillRoundedRect(-nw / 2, 22 - nh / 2, nw, nh, InkRadius.sm)
    nameBg.lineStyle(1, InkColor.ink, 0.4)
    nameBg.strokeRoundedRect(-nw / 2, 22 - nh / 2, nw, nh, InkRadius.sm)
    this.add([nameBg, nameText])

    // 4. 范围指示器
    this.rangeIndicator = scene.add.graphics()
    this.addAt(this.rangeIndicator, 0)
    this.hideRangeIndicator()

    this.setDepth(12)
    scene.add.existing(this)

    this.setSize(48, 54)
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-24, -27, 48, 54),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    })
  }

  private getTroopTextureKey(type: string): string {
    const map: Record<string, string> = {
      spearman: 'ink_troop_spearman',
      archer: 'ink_troop_archer',
      cavalry: 'ink_troop_cavalry',
      swordsman: 'ink_troop_swordsman'
    }
    return map[type] || 'ink_troop_spearman'
  }

  /**
   * 显示攻击范围（淡墨圈）
   */
  showRangeIndicator(): void {
    this.rangeIndicator.clear()
    this.rangeIndicator.lineStyle(2, InkColor.ink, 0.35)
    this.rangeIndicator.fillStyle(InkColor.ink, 0.06)
    this.rangeIndicator.fillCircle(0, 0, this.troopData.attackRange)
    this.rangeIndicator.strokeCircle(0, 0, this.troopData.attackRange)
  }

  /**
   * 隐藏攻击范围
   */
  hideRangeIndicator(): void {
    this.rangeIndicator.clear()
  }

  /**
   * 真实冷兵器动作攻击动画：枪尖突刺 / 挽弓回弹 / 铁骑前突 / 弧刀挥砍
   */
  playAttackAnimation(): void {
    const style = this.troopData.attackStyle

    if (style === 'thrust') {
      // 枪尖向前猛力刺出后迅速收回
      this.scene.tweens.add({
        targets: this.warriorSprite,
        x: 10,
        duration: 75,
        yoyo: true,
        ease: 'Quad.easeOut'
      })
    } else if (style === 'bow') {
      // 弓手放箭后座力后退再复位
      this.scene.tweens.add({
        targets: this.warriorSprite,
        x: -4,
        duration: 60,
        yoyo: true,
        ease: 'Quad.easeIn'
      })
    } else if (style === 'slash') {
      // 刀兵向前弧线斩击
      this.scene.tweens.add({
        targets: this.warriorSprite,
        angle: 12,
        x: 6,
        duration: 75,
        yoyo: true,
        ease: 'Power2.easeOut'
      })
    } else {
      this.scene.tweens.add({
        targets: this.warriorSprite,
        scaleX: 0.78,
        scaleY: 0.78,
        duration: 80,
        yoyo: true
      })
    }
  }

  /**
   * 获取兵种配置
   */
  getTroopData(): TroopConfig {
    return this.troopData
  }

  /**
   * 获取部署数据
   */
  getDeployedData(): DeployedTroop {
    return this.deployedData
  }

  /**
   * 更新上次攻击时间
   */
  updateLastAttackTime(time: number): void {
    this.deployedData.lastAttackTime = time
  }

  /**
   * 更新位置（拖拽重定位落点）
   */
  updatePosition(position: Point): void {
    this.deployedData.position = { x: position.x, y: position.y }
    this.setPosition(position.x, position.y)
  }
}
