import Phaser from 'phaser'
import { WuXing } from '@/types'
import { InkColor, INK_WUXING } from '../typography'

/**
 * 水墨法术与阵脉视效生成器 (Ink Leyline & FX Renderer)
 *
 * 专门负责地面 160px 相生阵脉流光、节点光环与水墨粒子视觉绘制。
 */
export interface LeylinePoint {
  x: number
  y: number
  wuXing: WuXing
}

/**
 * 绘制单条 160px 五行相生阵脉双色流光墨线与中点金环节点
 */
export function drawResonanceLeyline(
  graphics: Phaser.GameObjects.Graphics,
  p1: LeylinePoint,
  p2: LeylinePoint,
  options: {
    bgWidth?: number
    lineWidth?: number
    nodeRadius?: number
    nodeBorderColor?: number
  } = {}
): void {
  const {
    bgWidth = 6,
    lineWidth = 2.5,
    nodeRadius = 7,
    nodeBorderColor = InkColor.cinnabar
  } = options

  const c1 = INK_WUXING[p1.wuXing]?.border ?? InkColor.cinnabar
  const c2 = INK_WUXING[p2.wuXing]?.border ?? InkColor.cinnabar

  const mx = (p1.x + p2.x) / 2
  const my = (p1.y + p2.y) / 2

  // 1. 外层水墨晕染底线
  graphics.lineStyle(bgWidth, InkColor.ink, 0.18)
  graphics.beginPath()
  graphics.moveTo(p1.x, p1.y)
  graphics.lineTo(p2.x, p2.y)
  graphics.strokePath()

  // 2. 双色五行相生流光连线（前半段 p1 五行色，后半段 p2 五行色）
  graphics.lineStyle(lineWidth, c1, 0.78)
  graphics.beginPath()
  graphics.moveTo(p1.x, p1.y)
  graphics.lineTo(mx, my)
  graphics.strokePath()

  graphics.lineStyle(lineWidth, c2, 0.78)
  graphics.beginPath()
  graphics.moveTo(mx, my)
  graphics.lineTo(p2.x, p2.y)
  graphics.strokePath()

  // 3. 连线中点阵脉金石节点
  graphics.fillStyle(InkColor.paperPanel, 0.92)
  graphics.fillCircle(mx, my, nodeRadius)
  graphics.lineStyle(1.5, nodeBorderColor, 0.85)
  graphics.strokeCircle(mx, my, nodeRadius)
}
