// 游戏常量

// 游戏尺寸
export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 720

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