import { COST_CONFIG } from '@/config/constants'

/**
 * 费用管理器
 * 管理战斗中的部署费用系统
 */
export class CostManager {
  private currentCost: number
  private maxCost: number

  /**
   * 构造函数
   * @param startCost 初始费用
   * @param maxCost 最大军费存储上限（默认采用 COST_CONFIG.maxCost，即 9999）
   */
  constructor(
    startCost: number = COST_CONFIG.startCost,
    maxCost: number = COST_CONFIG.maxCost
  ) {
    this.currentCost = startCost
    this.maxCost = maxCost
  }

  /**
   * 获取当前费用
   */
  getCurrentCost(): number {
    return this.currentCost
  }

  /**
   * 获取最大费用上限
   */
  getMaxCost(): number {
    return this.maxCost
  }

  /**
   * 设置最大费用上限
   */
  setMaxCost(maxCost: number): void {
    this.maxCost = maxCost
    if (this.currentCost > this.maxCost) {
      this.currentCost = this.maxCost
    }
  }

  /**
   * 消耗费用
   * @param amount 消耗数量
   * @returns 是否成功消耗（费用不足则失败）
   */
  consumeCost(amount: number): boolean {
    if (this.currentCost >= amount) {
      this.currentCost -= amount
      return true
    }
    return false
  }

  /**
   * 添加费用（击杀敌人奖励）
   * @param amount 添加数量
   */
  addCost(amount: number): void {
    this.currentCost = Math.min(this.currentCost + amount, this.maxCost)
  }

  /**
   * 撤退返还费用
   * @param deploymentCost 英雄的部署费用
   * @returns 返还的费用数量
   */
  returnCost(deploymentCost: number): number {
    const returnedAmount = Math.floor(deploymentCost * COST_CONFIG.retreatReturnRate)
    this.addCost(returnedAmount)
    return returnedAmount
  }

  /**
   * 重置费用
   * @param startCost 新的初始费用
   * @param maxCost 新的上限
   */
  reset(
    startCost: number = COST_CONFIG.startCost,
    maxCost: number = COST_CONFIG.maxCost
  ): void {
    this.currentCost = startCost
    this.maxCost = maxCost
  }

  /**
   * 判断是否有足够费用
   * @param amount 需要的费用
   */
  hasEnoughCost(amount: number): boolean {
    return this.currentCost >= amount
  }
}