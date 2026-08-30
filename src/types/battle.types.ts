import { DeployedHero } from './hero.types'
import { Enemy } from './enemy.types'

// 战斗状态
export type BattleStatus = 'preparing' | 'running' | 'paused' | 'victory' | 'defeat'

// 战斗数据
export interface BattleState {
  status: BattleStatus
  levelId: string
  currentWave: number
  totalWaves: number
  currentCost: number        // 当前部署费用
  playerHealth: number       // 玩家剩余生命
  deployedHeroes: DeployedHero[]
  activeEnemies: Enemy[]
  elapsedTime: number        // 已用时间（毫秒）
}

// 战斗结果
export interface BattleResult {
  levelId: string
  isVictory: boolean
  elapsedTime: number
  remainingHealth: number
  wavesCompleted: number
  deployedHeroIds: string[]  // 上场的英雄ID列表
  rewards: {
    soulStones: { heroId: string; amount: number }[]
    equipment: string[]
    gems: string[]
    gold: number
    experience: number
  }
}

// 放置英雄请求
export interface PlaceHeroRequest {
  heroId: string
  position: { x: number; y: number }
}

// 放置英雄结果
export interface PlaceHeroResult {
  success: boolean
  reason?: 'insufficientCost' | 'invalidPosition' | 'heroNotUnlocked' | 'cellOccupied'
  remainingCost?: number
}

// 撤退英雄结果
export interface RetreatHeroResult {
  success: boolean
  returnedCost: number  // 返还的部署费用
}