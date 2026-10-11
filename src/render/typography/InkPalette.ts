import { WuXing, Rarity, WuXingNames } from '@/types'

/**
 * 水墨国风调色板 (Ink Palette)
 *
 * 遵循《芥子园画谱》古典设色，严格保证在宣纸底色上的可读性与对比度。
 */

// ===== 宣纸与墨韵色板 (十六进制数值，供 Graphics / Rectangle 使用) =====
export const InkColor = {
  paper: 0xe8e0cf,        // 宣纸底色（页面背景）
  paperPanel: 0xded4bd,   // 面板、卡片底色
  paperDeep: 0xd2c6a9,    // 悬停、按钮、槽位底色
  ink: 0x2a2a2a,          // 墨色（描边、进度条）
  inkStrong: 0x1a1a1a,    // 浓墨（主标题、强调数值）
  inkFaint: 0x484236,     // 焦墨淡褐（高对比度次要信息，对宣纸底色对比度 >= 6:1）
  inkWash: 0x3a352a,      // 墨晕（分节标题、次要标题）
  cinnabar: 0x9e2b25      // 印章朱砂红（选中、确认强调）
} as const

// ===== 宣纸与墨韵色板 (CSS 字符串，供 TextStyle.color 使用) =====
export const InkText = {
  ink: '#2a2a2a',
  strong: '#1a1a1a',
  faint: '#484236',       // 焦墨深褐，对比度达 6:1+，保证宣纸底色上小字绝对清晰
  wash: '#3a352a',        // 墨晕深褐
  paper: '#e8e0cf',       // 宣纸反白文字
  cinnabar: '#9e2b25',    // 朱砂红
  gold: '#a0782f',        // 泥金 / 星级 / 传说
  green: '#5f7a4a'        // 石绿 / 可升星 / 成功
} as const

// ===== 尺寸与间距常量 =====
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

// ===== 五行国风色谱 (纸面友好的雅致色) =====
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

// ===== 稀有度国风色谱 =====
export interface InkRarityStyle {
  text: string    // 文字色（CSS）
  border: number  // 描边色
  tint: number    // 浅底色（弹窗列表行）
}

export const INK_RARITY: Record<Rarity, InkRarityStyle> = {
  common:    { text: '#504a3e', border: 0x9a9384, tint: 0xded6c4 },
  rare:      { text: '#3f5f7a', border: 0x5a7a94, tint: 0xd6dde2 },
  epic:      { text: '#6d5a7d', border: 0x8a7399, tint: 0xdfd8e2 },
  legendary: { text: '#a0782f', border: 0xa0782f, tint: 0xe6dcc3 }
} as const

/** 0xRRGGBB → '#rrggbb' */
export function cssColor(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`
}
