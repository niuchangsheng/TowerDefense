// 游戏常量

// 游戏尺寸
export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 720

// ===== 战场格子系统 =====
// 整个战场按格子规划：路径逐格行进，部署按格占位（兵占1格、将占2格）
export const GRID = {
  cellSize: 80,               // 格子边长
  cols: 16,                   // 列数（1280 / 80）
  rows: 9                     // 行数（720 / 80）
} as const

/** 格子坐标（col: 0 起左→右，row: 0 起上→下） */
export interface GridCell {
  col: number
  row: number
}

/** 格子中心点像素坐标 */
export function cellCenter(cell: GridCell): { x: number; y: number } {
  return {
    x: cell.col * GRID.cellSize + GRID.cellSize / 2,
    y: cell.row * GRID.cellSize + GRID.cellSize / 2
  }
}

/** 像素坐标 → 格子坐标（越界返回 null） */
export function cellAt(x: number, y: number): GridCell | null {
  if (x < 0 || y < 0 || x >= GAME_WIDTH || y >= GAME_HEIGHT) return null
  return {
    col: Math.floor(x / GRID.cellSize),
    row: Math.floor(y / GRID.cellSize)
  }
}

/** 格子唯一键 */
export function cellKey(cell: GridCell): string {
  return `${cell.col},${cell.row}`
}

/** 格子是否在网格内 */
export function cellInBounds(cell: GridCell): boolean {
  return cell.col >= 0 && cell.col < GRID.cols && cell.row >= 0 && cell.row < GRID.rows
}

// 游戏标题
export const GAME_TITLE = '三国五行塔防'

// 资源路径
export const ASSETS_PATH = '/assets/'

// 费用系统
export const COST_CONFIG = {
  startCost: 20,              // 初始费用
  normalEnemyReward: 1,       // 普通敌人奖励
  eliteEnemyReward: 3,        // 精英敌人奖励
  bossEnemyReward: 10,        // Boss奖励
  retreatReturnRate: 0.5      // 撤退返还比例（50%）
}

// 英雄等级配置
export const HERO_LEVEL_CONFIG = {
  maxLevel: 60,
  baseExpRequired: 100,
  expMultiplier: 1.5          // 每级经验需求倍数
}

// 英雄星级配置
export const HERO_STAR_CONFIG = {
  maxStar: 5,
  upgradeRequirements: [10, 20, 30, 50]  // 2星到5星需要的魂石数量
}

// 玩家生命
export const PLAYER_HEALTH_CONFIG = {
  defaultStartHealth: 20,
  bossLevelHealth: 30
}

// 五行克制倍率
export const WUXING_COUNTER_MULTIPLIER = 1.5

// 攻击系统
export const ATTACK_CONFIG = {
  projectileSpeed: 300,       // 攻击投射物速度
  maxTargetsPerAttack: 1      // 每次攻击最多目标数
}

// UI配置
export const UI_CONFIG = {
  heroPanelWidth: 200,
  costDisplayHeight: 50,
  waveIndicatorHeight: 40
}