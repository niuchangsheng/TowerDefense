import Phaser from 'phaser'
import { WuXing } from '@/types'
import { InkColor, InkText, INK_WUXING } from '../typography'
import { inkText } from '../typography'

/**
 * 水墨金石印章与题跋图元渲染器 (Seal Visual Renderer)
 *
 * 提供标准化的金石篆刻方印、朱砂批注条、竹简卷标与水墨边框。
 */

export interface WuXingBadgeOptions {
  size?: number
  fontSize?: number
  borderAlpha?: number
  fillAlpha?: number
}

/**
 * 绘制五行金石篆刻印章（方中带圆水墨印章，含单字徽标）
 */
export function createWuXingSeal(
  scene: Phaser.Scene,
  x: number,
  y: number,
  wuXing: WuXing,
  options: WuXingBadgeOptions = {}
): Phaser.GameObjects.Container {
  const { size = 26, fontSize = 13, borderAlpha = 0.9, fillAlpha = 0.85 } = options
  const wxStyle = INK_WUXING[wuXing]
  const container = scene.add.container(Math.round(x), Math.round(y))

  const g = scene.add.graphics()
  // 印泥晕染外框
  g.fillStyle(wxStyle.fill, fillAlpha)
  g.fillRoundedRect(-size / 2, -size / 2, size, size, Math.max(2, Math.round(size * 0.15)))
  // 刀痕金石边框
  g.lineStyle(1.5, wxStyle.border, borderAlpha)
  g.strokeRoundedRect(-size / 2, -size / 2, size, size, Math.max(2, Math.round(size * 0.15)))
  container.add(g)

  // 篆刻文字
  const label = inkText(scene, 0, 0, wxStyle.label, {
    size: fontSize,
    color: wxStyle.text,
    bold: true,
    originX: 0.5,
    originY: 0.5
  })
  container.add(label)

  return container
}

/**
 * 绘制古籍朱砂双竖线批注条（用于弱点提示、战役破壁、关键词条批注）
 */
export function drawAnnotationRibbon(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number = 26,
  color: number = InkColor.cinnabar,
  highlighted: boolean = false
): void {
  const halfW = width / 2
  const halfH = height / 2

  // 内部微淡朱泥晕
  graphics.fillStyle(color, highlighted ? 0.12 : 0.07)
  graphics.fillRect(x - halfW, y - halfH, width, height)

  // 两侧刀刻竖线
  graphics.lineStyle(2, color, highlighted ? 0.85 : 0.7)
  graphics.lineBetween(x - halfW, y - halfH, x - halfW, y + halfH)
  graphics.lineBetween(x + halfW, y - halfH, x + halfW, y + halfH)

  // 上下封边淡线
  graphics.lineStyle(0.8, color, highlighted ? 0.45 : 0.3)
  graphics.lineBetween(x - halfW, y - halfH, x + halfW, y - halfH)
  graphics.lineBetween(x - halfW, y + halfH, x + halfW, y + halfH)
}

/**
 * 绘制古籍四角折线花边 (Corner Brackets)
 */
export function drawCornerBrackets(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  len: number = 8,
  color: number = InkColor.ink,
  alpha: number = 0.6
): void {
  graphics.lineStyle(1.5, color, alpha)
  // 左上
  graphics.lineBetween(x, y + len, x, y)
  graphics.lineBetween(x, y, x + len, y)
  // 右上
  graphics.lineBetween(x + w - len, y, x + w, y)
  graphics.lineBetween(x + w, y, x + w, y + len)
  // 左下
  graphics.lineBetween(x, y + h - len, x, y + h)
  graphics.lineBetween(x, y + h, x + len, y + h)
  // 右下
  graphics.lineBetween(x + w - len, y + h, x + w, y + h)
  graphics.lineBetween(x + w, y + h - len, x + w, y + h)
}
