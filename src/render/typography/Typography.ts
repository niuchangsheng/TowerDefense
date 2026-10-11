import Phaser from 'phaser'
import { InkText, InkFontSize } from './InkPalette'

/**
 * 水墨排版系统 (Ink Typography Engine)
 *
 * 统一的楷体字体栈、高分屏 DPI 超采样分辨率、抗锯齿安全过滤与整数字号对齐。
 */

/** 楷体/古典书风字体栈（全平台优雅回退） */
export const INK_FONT =
  '"STKaiti", "华文楷体", "KaiTi", "楷体", "SimKai", "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "Microsoft YaHei", "PingFang SC", serif'

/**
 * 水墨字体默认分辨率（DPI 超采样系数）
 * 根据设备像素比动态计算，基准保底 2x，高分屏最高 3x，杜绝 Scale.FIT 拉伸模糊
 */
export const INK_FONT_RESOLUTION =
  typeof window !== 'undefined' && window.devicePixelRatio
    ? Math.min(Math.max(Math.ceil(window.devicePixelRatio * 1.5), 2), 3)
    : 2

export interface InkTextOptions {
  size?: number
  color?: string
  bold?: boolean
  originX?: number
  originY?: number
  wrapWidth?: number
  lineSpacing?: number
  resolution?: number
  padding?: Phaser.Types.GameObjects.Text.TextPadding
  stroke?: string
  strokeThickness?: number
  shadow?: {
    x?: number
    y?: number
    color?: string
    blur?: number
    stroke?: boolean
    fill?: boolean
  }
}

/**
 * 水墨风文字工厂（自动套用楷体栈、高分辨率超采样与字重增强）。
 * 默认 origin (0, 0.5)。
 */
export function inkText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  options: InkTextOptions = {}
): Phaser.GameObjects.Text {
  const {
    size = InkFontSize.md,
    color = InkText.ink,
    bold,
    originX = 0,
    originY = 0.5,
    wrapWidth,
    lineSpacing,
    resolution,
    padding,
    stroke,
    strokeThickness,
    shadow
  } = options

  // 1. 强制整数字号，避免浮点字号（如 11.5px/13.5px）导致 Canvas 2D 亚像素网格失真与模糊
  const roundedSize = Math.max(1, Math.round(size))

  // 2. 超采样策略：小字号 (<=14px) 汉字笔画密集复杂，给予保底 3x 超采样；常规字号保底 2x
  const effectiveResolution =
    resolution ??
    (roundedSize <= 14 ? Math.max(INK_FONT_RESOLUTION, 3) : INK_FONT_RESOLUTION)

  // 3. 字重加固：楷体在 <=14px 时细横线极细，容易被 Canvas 抗锯齿削弱发虚
  // 若调用方未显式传入 bold，针对 <=14px 小字默认启用加粗，笔画清晰饱满
  const isBold = bold !== undefined ? bold : roundedSize <= 14

  const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: INK_FONT,
    fontSize: `${roundedSize}px`,
    color,
    fontStyle: isBold ? 'bold' : 'normal',
    lineSpacing,
    resolution: effectiveResolution,
    padding: padding ?? { left: 2, right: 2, top: 1, bottom: 1 }
  }

  // 严禁将 undefined 的 stroke/strokeThickness 传入 Phaser TextStyle，
  // 否则 Phaser 的 GetAdvancedValue 返回 undefined，导致 (undefined / 2) = NaN，
  // 进而造成 linePositionY = NaN，文字在 Canvas 2D 上完全不可见！
  if (stroke !== undefined) {
    textStyle.stroke = stroke
  }
  if (strokeThickness !== undefined) {
    textStyle.strokeThickness = strokeThickness
  }

  const text = scene.add.text(Math.round(x), Math.round(y), content, textStyle)
  text.setOrigin(originX, originY)
  if (wrapWidth !== undefined) {
    text.setWordWrapWidth(wrapWidth, true)
  }
  if (shadow) {
    text.setShadow(
      shadow.x ?? 0,
      shadow.y ?? 0,
      shadow.color ?? '#000000',
      shadow.blur ?? 0,
      shadow.stroke ?? false,
      shadow.fill ?? true
    )
  }
  return text
}
