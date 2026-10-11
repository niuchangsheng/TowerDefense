import Phaser from 'phaser'
import { Gem, WuXing } from '@/types'
import { InkColor, InkText, INK_WUXING, INK_RARITY } from '../typography'
import { inkText } from '../typography'

/**
 * 灵石图元渲染器 (Gem Visual Renderer)
 *
 * 统一处理五行灵石品相、游标进度条、灵石图标卡片绘制。
 */

export interface GemQualityTag {
  text: string
  color: string
  fill: number
}

/**
 * 根据品相分位数 (0~1) 计算水墨评级标签与国风雅色
 */
export function getGemAffixQualityTag(pct: number): GemQualityTag {
  if (pct >= 0.95) return { text: '极品 · 臻境', color: '#a0782f', fill: 0xa0782f }
  if (pct >= 0.8) return { text: '上品 · 纯粹', color: '#6d5a7d', fill: 0x6d5a7d }
  if (pct >= 0.5) return { text: '中品 · 尚可', color: '#3f5f7a', fill: 0x3f5f7a }
  return { text: '初品 · 寻常', color: '#504a3e', fill: 0x7a7466 }
}

/**
 * 绘制水墨游标进度条（用于词条数值在 [Min, Max] 区间内的直观透视）
 */
export function drawAffixPercentileBar(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  x: number,
  y: number,
  width: number,
  height: number,
  percent: number,
  color: number = 0xa0782f
): void {
  const clampedPct = Math.max(0, Math.min(1, percent))

  // 底轨
  const bg = scene.add.rectangle(x + width / 2, y, width, height, InkColor.paperDeep, 1)
  bg.setStrokeStyle(1, InkColor.inkFaint, 0.7)

  // 充能条
  const fillW = Math.max(4, Math.round(width * clampedPct))
  const fill = scene.add.rectangle(x + fillW / 2, y, fillW, Math.max(2, height - 2), color, 0.92)

  // 游标圆珠
  const knob = scene.add.circle(x + fillW, y, Math.round(height * 0.7), color, 1)
  knob.setStrokeStyle(1.5, 0xf4efe6)

  container.add([bg, fill, knob])
}

/**
 * 创建五行灵石展示图元（带底框、等级徽章与文字）
 */
export function createGemCardVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  gem: Gem,
  isSelected: boolean = false
): Phaser.GameObjects.Container {
  const container = scene.add.container(Math.round(x), Math.round(y))
  const wxStyle = INK_WUXING[gem.wuXing]

  // 背景卡片
  const bg = scene.add.rectangle(
    0,
    0,
    w,
    h,
    isSelected ? InkColor.paper : wxStyle.fill,
    isSelected ? 0.98 : 0.88
  )
  bg.setStrokeStyle(isSelected ? 2 : 1, isSelected ? InkColor.cinnabar : wxStyle.border)
  container.add(bg)

  // 左侧五行色标小立柱
  const leftBar = scene.add.rectangle(-w / 2 + 2, 0, 4, h - 2, isSelected ? InkColor.cinnabar : wxStyle.border, 0.95)
  container.add(leftBar)

  // 灵石等级徽标
  const lvG = scene.add.graphics()
  lvG.fillStyle(wxStyle.border, 0.9)
  lvG.fillRoundedRect(-w / 2 + 10, -h / 2 + 8, 26, 18, 2)
  container.add(lvG)

  const lvTxt = inkText(scene, -w / 2 + 23, -h / 2 + 17, `L${gem.level}`, {
    size: 12,
    color: '#f4efe6',
    bold: true,
    originX: 0.5,
    originY: 0.5
  })
  container.add(lvTxt)

  return container
}
