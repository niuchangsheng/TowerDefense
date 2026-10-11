import Phaser from 'phaser'
import { WuXing } from '@/types'
import { InkColor, InkText, INK_WUXING, inkText } from '../typography'

/**
 * 水墨人体经脉图元绘制器 (Meridian Figure Renderer)
 *
 * 绘制武道盘坐武者轮廓、任督二脉暗纹与八卦底纹。
 */
export interface MeridianFigureOptions {
  paperFill?: number
  strokeColor?: number
  lineAlpha?: number
}

/**
 * 绘制水墨盘坐武者经脉轮廓
 */
export function drawInkMeridianBody(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  options: MeridianFigureOptions = {}
): void {
  const {
    paperFill = InkColor.paperPanel,
    strokeColor = InkColor.inkWash,
    lineAlpha = 0.55
  } = options

  graphics.fillStyle(paperFill, 0.72)
  graphics.lineStyle(1.8, strokeColor, lineAlpha)

  // 1. 头颅与发髻
  graphics.fillRoundedRect(cx - 10, 84, 20, 12, 4)
  graphics.strokeRoundedRect(cx - 10, 84, 20, 12, 4)
  graphics.fillCircle(cx, 124, 24)
  graphics.strokeCircle(cx, 124, 24)

  // 2. 颈部与双肩躯干
  graphics.fillRect(cx - 10, 146, 20, 18)
  graphics.fillRoundedRect(cx - 56, 164, 112, 168, 22)
  graphics.strokeRoundedRect(cx - 56, 164, 112, 168, 22)

  // 3. 左臂与左掌（对应劳宫穴 x=124, y=256）
  graphics.lineStyle(16, paperFill, 0.85)
  graphics.lineBetween(cx - 52, 182, 134, 226)
  graphics.lineBetween(134, 226, 124, 256)
  graphics.lineStyle(1.6, strokeColor, lineAlpha)
  graphics.strokeCircle(124, 256, 12)

  // 4. 右肩、右肘与右掌（对应肩井 x=268,y=180 与曲池 x=310,y=238）
  graphics.lineStyle(16, paperFill, 0.85)
  graphics.lineBetween(cx + 52, 182, 310, 238)
  graphics.lineBetween(310, 238, 290, 280)
  graphics.lineStyle(1.6, strokeColor, lineAlpha)
  graphics.strokeCircle(290, 280, 11)

  // 5. 盘坐下盘与足底（对应关元 x=215,y=358 与涌泉 x=156,y=416）
  graphics.fillRoundedRect(cx - 88, 330, 176, 62, 26)
  graphics.strokeRoundedRect(cx - 88, 330, 176, 62, 26)
  graphics.fillRoundedRect(130, 392, 64, 34, 14)
  graphics.strokeRoundedRect(130, 392, 64, 34, 14)
  graphics.fillRoundedRect(236, 392, 64, 34, 14)
  graphics.strokeRoundedRect(236, 392, 64, 34, 14)

  // 6. 体内任督二脉中轴线（水墨暗脉）
  graphics.lineStyle(1.2, InkColor.inkFaint, 0.45)
  graphics.lineBetween(cx, 100, cx, 366)
}

/**
 * 绘制八卦太极水墨暗纹
 */
export function drawBaguaWatermark(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  rInner: number = 102,
  rOuter: number = 138
): void {
  graphics.lineStyle(1, InkColor.inkFaint, 0.28)
  graphics.strokeCircle(cx, cy, rOuter)
  graphics.strokeCircle(cx, cy, rInner)
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4
    graphics.lineBetween(
      cx + Math.cos(ang) * rInner,
      cy + Math.sin(ang) * rInner,
      cx + Math.cos(ang) * rOuter,
      cy + Math.sin(ang) * rOuter
    )
  }
}

/**
 * 绘制微缩沙盒木人桩傀儡
 */
export function drawPracticeDummy(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  x: number,
  y: number,
  options: { label?: string; width?: number; height?: number } = {}
): void {
  const { label = '木人\n机关', width = 36, height = 52 } = options
  const dummyTarget = scene.add.rectangle(x, y, width, height, 0x6d4c41, 1)
  dummyTarget.setStrokeStyle(1.5, 0xffca28, 0.9)
  const dummyLabel = inkText(scene, x, y, label, {
    size: 11,
    color: '#fff8e1',
    originX: 0.5,
    originY: 0.5
  })
  container.add([dummyTarget, dummyLabel])
}
