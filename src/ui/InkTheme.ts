import Phaser from 'phaser'
import { WuXing, Rarity, WuXingNames } from '@/types'

/**
 * 水墨宣纸风设计系统
 *
 * 统一的调色板、字体栈、间距/字号/圆角/深度常量，以及
 * 宣纸背景、面板、文字、分节标题、墨线、按钮等绘制助手。
 *
 * 纯常量 + 纯函数（无类），可被任意场景复用。
 * 约定：所有文字一律经 inkText() 创建，保证楷体字体栈不丢失。
 */

// ===== 字体 =====

/** 楷体字体栈（末尾 serif 兜底） */
export const INK_FONT = '"STKaiti","KaiTi","Noto Serif SC",serif'

// ===== 调色板（十六进制数值，供 Graphics / Rectangle 使用） =====

export const InkColor = {
  paper: 0xe8e0cf,        // 宣纸底色（页面背景）
  paperPanel: 0xded4bd,   // 面板、卡片底色
  paperDeep: 0xd2c6a9,    // 悬停、按钮、槽位底色
  ink: 0x2a2a2a,          // 墨色（描边、进度条）
  inkStrong: 0x1a1a1a,    // 浓墨
  inkFaint: 0x8a8577,     // 淡墨（次要信息）
  inkWash: 0x3a352a,      // 墨晕（分节标题）
  cinnabar: 0x9e2b25      // 印章红（选中、确认强调）
} as const

// ===== 调色板（CSS 字符串，供 TextStyle.color 使用） =====

export const InkText = {
  ink: '#2a2a2a',
  strong: '#1a1a1a',
  faint: '#8a8577',
  wash: '#3a352a',
  paper: '#e8e0cf',
  cinnabar: '#9e2b25',
  gold: '#a0782f',        // 星级 / 传说
  green: '#5f7a4a'        // 可升星 / 成功
} as const

// ===== 尺寸常量 =====

export const InkSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
} as const

export const InkFontSize = {
  xs: 12,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 26,
  title: 30
} as const

export const InkRadius = {
  sm: 4,
  md: 8
} as const

export const InkDepth = {
  overlay: 49,   // 弹窗遮罩
  popup: 50,     // 弹窗 / 对话框
  toast: 100     // 消息提示
} as const

// ===== 五行配色（纸面友好的雅致色） =====

export interface InkWuXingStyle {
  label: string   // 单字（金/木/水/火/土）
  text: string    // 文字色（CSS）
  fill: number    // 徽章底色
  border: number  // 徽章描边色
}

export const INK_WUXING: Record<WuXing, InkWuXingStyle> = {
  metal: { label: WuXingNames.metal, text: '#66727a', fill: 0xdcd8ce, border: 0x8b9298 },
  wood:  { label: WuXingNames.wood,  text: '#5f7a4a', fill: 0xdadfc9, border: 0x7d9464 },
  water: { label: WuXingNames.water, text: '#3f5f7a', fill: 0xd3dbe0, border: 0x66839c },
  fire:  { label: WuXingNames.fire,  text: '#a63d2f', fill: 0xe6d2ca, border: 0xb8675a },
  earth: { label: WuXingNames.earth, text: '#9c6b2f', fill: 0xe3d8c3, border: 0xb08a52 }
} as const

// ===== 稀有度配色 =====

export interface InkRarityStyle {
  text: string    // 文字色（CSS）
  border: number  // 描边色
  tint: number    // 浅底色（弹窗列表行）
}

export const INK_RARITY: Record<Rarity, InkRarityStyle> = {
  common:    { text: '#6b665c', border: 0x9a9384, tint: 0xded6c4 },
  rare:      { text: '#3f5f7a', border: 0x5a7a94, tint: 0xd6dde2 },
  epic:      { text: '#6d5a7d', border: 0x8a7399, tint: 0xdfd8e2 },
  legendary: { text: '#a0782f', border: 0xa0782f, tint: 0xe6dcc3 }
} as const

// ===== 工具函数 =====

/** 0xRRGGBB → '#rrggbb' */
export function cssColor(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`
}

// ===== 绘制助手 =====

/**
 * 宣纸背景：纸底色 + 数枚淡墨晕染
 */
export function drawPaperBackground(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor(cssColor(InkColor.paper))

  const w = scene.cameras.main.width
  const h = scene.cameras.main.height
  const g = scene.add.graphics()

  // 极轻微的边缘宣纸晕染（避免在正中央或文字背后形成明显圆圈印记）
  const cornerBlots = [
    { x: w * 0.05, y: h * 0.08, r: 100 },
    { x: w * 0.95, y: h * 0.92, r: 120 },
    { x: w * 0.92, y: h * 0.08, r: 80 },
    { x: w * 0.08, y: h * 0.92, r: 90 }
  ]
  for (const blot of cornerBlots) {
    g.fillStyle(InkColor.ink, 0.012)
    g.fillCircle(blot.x, blot.y, blot.r)
  }
}

export interface InkPanelOptions {
  fill?: number
  alpha?: number
  stroke?: number
  strokeWidth?: number
  radius?: number
}

/**
 * 圆角面板容器。
 * 注意：容器锚点 = 面板左上角 (x, y)，子对象坐标均相对面板左上角。
 */
export function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  options: InkPanelOptions = {}
): Phaser.GameObjects.Container {
  const {
    fill = InkColor.paperPanel,
    alpha = 1,
    stroke = InkColor.ink,
    strokeWidth = 1,
    radius = InkRadius.md
  } = options

  const panel = scene.add.container(x, y)
  const bg = scene.add.graphics()
  bg.fillStyle(fill, alpha)
  bg.fillRoundedRect(0, 0, w, h, radius)
  if (strokeWidth > 0) {
    bg.lineStyle(strokeWidth, stroke, 1)
    bg.strokeRoundedRect(0, 0, w, h, radius)
  }
  panel.add(bg)
  return panel
}

export interface InkTextOptions {
  size?: number
  color?: string
  bold?: boolean
  originX?: number
  originY?: number
  wrapWidth?: number
}

/**
 * 水墨风文字（自动套用楷体栈）。默认 origin (0, 0.5)。
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
    bold = false,
    originX = 0,
    originY = 0.5,
    wrapWidth
  } = options

  const text = scene.add.text(x, y, content, {
    fontFamily: INK_FONT,
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal'
  })
  text.setOrigin(originX, originY)
  if (wrapWidth !== undefined) {
    text.setWordWrapWidth(wrapWidth, true)
  }
  return text
}

/**
 * 水平墨线。
 * parent 为容器时加入容器（x, y 为容器局部坐标）；为 null 时画进场景。
 */
export function inkRule(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container | null,
  x: number,
  y: number,
  width: number,
  alpha: number = 0.5
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  g.lineStyle(1, InkColor.ink, alpha)
  g.lineBetween(x, y, x + width, y)
  if (parent) parent.add(g)
  return g
}

/**
 * 分节标题：粗体标签 + 其右侧一条淡墨细线。
 * parent 为容器时加入容器（x, y 为容器局部坐标）；为 null 时画进场景。
 * 返回占用高度（24）。
 */
export function sectionHeader(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container | null,
  x: number,
  y: number,
  label: string,
  width: number
): number {
  const labelObj = inkText(scene, x, y + 12, label, {
    size: InkFontSize.md,
    color: InkText.wash,
    bold: true
  })
  if (parent) parent.add(labelObj)
  inkRule(scene, parent, x + labelObj.width + 12, y + 12, Math.max(0, width - labelObj.width - 12), 0.35)
  return 24
}

export interface InkButtonOptions {
  fill?: number
  hoverFill?: number
  textColor?: string
  fontSize?: number
  stroke?: number
  onClick?: () => void
  debounceMs?: number
}

/**
 * 页面头部横幅：左侧大标题 + 印章红方块 + 副标，下方一条墨线。
 * 与武将页页眉像素一致，供所有页面场景复用。
 */
export function renderPageHeader(
  scene: Phaser.Scene,
  title: string,
  subtitle?: string
): void {
  const L = InkSpacing.xl // 32，页边距

  const titleObj = inkText(scene, L, 40, title, {
    size: InkFontSize.title,
    color: InkText.strong,
    bold: true
  })
  // 印章红方块
  scene.add.rectangle(L + titleObj.width + 18, 40, 14, 14, InkColor.cinnabar)
  if (subtitle) {
    inkText(scene, L + titleObj.width + 36, 40, subtitle, {
      size: 18,
      color: InkText.faint
    })
  }

  inkRule(scene, null, L, 68, scene.cameras.main.width - L * 2, 0.4)
}

/**
 * 页面右上角返回按钮（中心 1192,40，112×36）。
 */
export function createPageBackButton(
  scene: Phaser.Scene,
  onClick: () => void
): Phaser.GameObjects.Container {
  return createInkButton(scene, 1192, 40, 112, 36, '返回', {
    fill: InkColor.paperPanel,
    hoverFill: InkColor.paperDeep,
    textColor: InkText.ink,
    fontSize: InkFontSize.md,
    stroke: InkColor.ink,
    onClick
  })
}

/**
 * 居中墨块消息提示：圆角墨底 + 纸色字，1.5 秒后自动销毁。
 * 返回容器（调用方可提前手动销毁）。
 */
export function inkToast(
  scene: Phaser.Scene,
  content: string,
  y: number = 626
): Phaser.GameObjects.Container {
  const toast = scene.add.container(scene.cameras.main.width / 2, y)
  toast.setDepth(InkDepth.toast)

  const text = inkText(scene, 0, 0, content, {
    size: InkFontSize.md,
    color: InkText.paper,
    originX: 0.5
  })
  const padX = 12
  const padY = 6
  const w = text.width + padX * 2
  const h = text.height + padY * 2
  const bg = scene.add.graphics()
  bg.fillStyle(InkColor.ink, 0.92)
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, InkRadius.sm)
  toast.add([bg, text])

  scene.time.delayedCall(1500, () => toast.destroy())
  return toast
}

export interface InkDialogOptions {
  fill?: number
  stroke?: number
  strokeWidth?: number
  radius?: number
}

export interface InkDialog {
  /** 淡墨遮罩（可交互，用于拦截点击；关闭时记得 destroy） */
  overlay: Phaser.GameObjects.Rectangle
  /** 居中面板容器，锚点为左上角（局部坐标从 0,0 起） */
  panel: Phaser.GameObjects.Container
}

/**
 * 模态对话框：淡墨遮罩 + 居中圆角面板。
 * 关闭时同时销毁 overlay 与 panel。
 */
export function createInkDialog(
  scene: Phaser.Scene,
  w: number,
  h: number,
  options: InkDialogOptions = {}
): InkDialog {
  const width = scene.cameras.main.width
  const height = scene.cameras.main.height

  const overlay = scene.add.rectangle(width / 2, height / 2, width, height, InkColor.ink, 0.2)
  overlay.setInteractive()
  overlay.setDepth(InkDepth.overlay)

  const panel = createPanel(scene, (width - w) / 2, (height - h) / 2, w, h, options)
  panel.setDepth(InkDepth.popup)

  return { overlay, panel }
}

/**
 * 水墨风按钮。(x, y) 为按钮中心。
 * 自带手型光标、悬停换色与点击回调。
 */
export function createInkButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  options: InkButtonOptions = {}
): Phaser.GameObjects.Container {
  const {
    fill = InkColor.paperPanel,
    hoverFill = InkColor.paperDeep,
    textColor = InkText.ink,
    fontSize = InkFontSize.md,
    stroke,
    onClick,
    debounceMs = 400
  } = options

  const btn = scene.add.container(x, y)

  const bg = scene.add.rectangle(0, 0, w, h, fill)
  if (stroke !== undefined) {
    bg.setStrokeStyle(1, stroke)
  }
  bg.setInteractive({ useHandCursor: true })

  const text = inkText(scene, 0, 0, label, {
    size: fontSize,
    color: textColor,
    bold: true,
    originX: 0.5
  })

  btn.add([bg, text])

  let isPointerDown = false
  let lastClickTime = 0

  bg.on('pointerover', () => bg.setFillStyle(hoverFill))
  bg.on('pointerout', () => {
    isPointerDown = false
    bg.setFillStyle(fill)
  })
  bg.on('pointerdown', () => {
    isPointerDown = true
    bg.setFillStyle(hoverFill)
  })
  bg.on('pointerup', () => {
    if (!isPointerDown) return
    isPointerDown = false
    bg.setFillStyle(hoverFill)

    const now = Date.now()
    if (now - lastClickTime < debounceMs) {
      return
    }
    lastClickTime = now

    try {
      onClick?.()
    } catch (err) {
      console.error('[InkButton] 点击执行异常:', err)
    }
  })

  return btn
}
