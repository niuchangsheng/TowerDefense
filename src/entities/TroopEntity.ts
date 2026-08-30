import Phaser from 'phaser'
import { TroopConfig, DeployedTroop } from '@/types'
import { InkColor, InkRadius, INK_FONT, cssColor } from '@/ui/InkTheme'

/**
 * 兵种渲染实体（水墨风 · 单字单位）
 * 楷体大字（枪/骑/刀/弓，兵种本色 + 淡墨描边）立于小纸片之上，
 * depth 12（敌10之上、将15之下）。敌人不反击，故无血条。
 */
export class TroopEntity extends Phaser.GameObjects.Container {
  private troopData: TroopConfig
  private deployedData: DeployedTroop
  private charText: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, troop: TroopConfig, deployed: DeployedTroop) {
    super(scene, deployed.position.x, deployed.position.y)

    this.troopData = troop
    this.deployedData = deployed

    // 纸片小底（先画，垫在字下面）
    const chip = scene.add.graphics()
    const chipSize = 46
    chip.fillStyle(InkColor.paperPanel, 0.9)
    chip.fillRoundedRect(-chipSize / 2, -chipSize / 2, chipSize, chipSize, InkRadius.sm)
    chip.lineStyle(1, InkColor.ink, 0.55)
    chip.strokeRoundedRect(-chipSize / 2, -chipSize / 2, chipSize, chipSize, InkRadius.sm)
    this.add(chip)

    // 兵种单字（楷体 32px，兵种本色 + 淡墨描边）
    this.charText = scene.add.text(0, 0, troop.displayChar, {
      fontFamily: INK_FONT,
      fontSize: '32px',
      fontStyle: 'bold',
      color: troop.color,
      stroke: cssColor(InkColor.ink),
      strokeThickness: 1.5
    })
    this.charText.setOrigin(0.5)
    this.add(this.charText)

    this.setDepth(12)
    scene.add.existing(this)
  }

  /**
   * 攻击动画：单字向前一振
   */
  playAttackAnimation(): void {
    this.scene.tweens.add({
      targets: this.charText,
      scale: 1.25,
      duration: 90,
      yoyo: true
    })
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
}
