import Phaser from 'phaser'
import { InkColor, InkText } from '../typography'
import { inkText } from '../typography'
import { drawCornerBrackets } from './SealVisual'

/**
 * 神兵古宝图元渲染器 (Weapon Visual Renderer)
 *
 * 统一处理神兵专属认主腰牌、同源/相生三才共鸣槽位卡片与大招金朱宝匣。
 */

/**
 * 绘制武将专属神兵朱砂腰牌
 */
export function createExclusiveBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  heroName: string
): Phaser.GameObjects.Container {
  const container = scene.add.container(Math.round(x), Math.round(y))
  const badgeW = 104
  const badgeH = 22

  const bg = scene.add.rectangle(0, 0, badgeW, badgeH, InkColor.cinnabar, 0.92)
  const txt = inkText(scene, 0, 0, `${heroName} · 本命专属`, {
    size: 13,
    color: '#f4efe6',
    bold: true,
    originX: 0.5,
    originY: 0.5
  })

  container.add([bg, txt])
  return container
}

/**
 * 绘制终极大招金朱宝匣外框与折角
 */
export function drawUltimateBox(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string
): Phaser.GameObjects.Container {
  const container = scene.add.container(Math.round(x), Math.round(y))

  // 底板
  const bg = scene.add.rectangle(w / 2, h / 2, w, h, InkColor.paperDeep, 0.95)
  bg.setStrokeStyle(2, 0xc89b3c, 0.95)
  container.add(bg)

  // 顶部朱金丝带栏
  const ribbonH = 30
  const ribbon = scene.add.rectangle(w / 2, ribbonH / 2, w - 4, ribbonH, InkColor.cinnabar, 0.92)
  container.add(ribbon)

  // 古籍四角折线花边
  const gfx = scene.add.graphics()
  drawCornerBrackets(gfx, 4, 4, w - 8, h - 8, 9, 0xd4a017)
  container.add(gfx)

  // 标题
  const titleTxt = inkText(scene, 14, ribbonH / 2, `🐉 终极大招 · ${title}`, {
    size: 14,
    color: '#fff8e1',
    bold: true,
    originX: 0,
    originY: 0.5
  })
  const condTxt = inkText(scene, w - 12, ribbonH / 2, '双槽 Lv.5 觉醒', {
    size: 12,
    color: '#ffe082',
    bold: true,
    originX: 1,
    originY: 0.5
  })
  container.add([titleTxt, condTxt])

  return container
}
