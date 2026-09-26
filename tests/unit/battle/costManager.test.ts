import { describe, it, expect, beforeEach } from 'vitest'
import { CostManager } from '@/core/battle/CostManager'
import { COST_CONFIG } from '@/config/constants'

describe('CostManager 军费/粮草管理器测试', () => {
  let costManager: CostManager

  beforeEach(() => {
    costManager = new CostManager(35)
  })

  it('初始费用正确，默认上限为 9999 而非 2 倍初始值 (70)', () => {
    expect(costManager.getCurrentCost()).toBe(35)
    expect(costManager.getMaxCost()).toBe(9999)
  })

  it('军费突破 70 限制，持续累积至高波次大军蓄粮', () => {
    // 增加 100 费用
    costManager.addCost(100)
    expect(costManager.getCurrentCost()).toBe(135)

    // 继续增加，确保越过 70
    costManager.addCost(500)
    expect(costManager.getCurrentCost()).toBe(635)
  })

  it('军费达到设置的最大上限时正确截断', () => {
    const customManager = new CostManager(20, 200)
    expect(customManager.getMaxCost()).toBe(200)

    customManager.addCost(300)
    expect(customManager.getCurrentCost()).toBe(200)
  })

  it('消费费用：费用充足扣除成功，不足扣除失败', () => {
    expect(costManager.hasEnoughCost(20)).toBe(true)
    expect(costManager.consumeCost(20)).toBe(true)
    expect(costManager.getCurrentCost()).toBe(15)

    expect(costManager.hasEnoughCost(20)).toBe(false)
    expect(costManager.consumeCost(20)).toBe(false)
    expect(costManager.getCurrentCost()).toBe(15)
  })

  it('撤退返还费用按 50% 比例入库', () => {
    costManager.consumeCost(35)
    expect(costManager.getCurrentCost()).toBe(0)

    const returned = costManager.returnCost(20)
    expect(returned).toBe(10)
    expect(costManager.getCurrentCost()).toBe(10)
  })

  it('动态调整上限并自动校验当前军费', () => {
    costManager.addCost(500)
    expect(costManager.getCurrentCost()).toBe(535)

    costManager.setMaxCost(300)
    expect(costManager.getMaxCost()).toBe(300)
    expect(costManager.getCurrentCost()).toBe(300)
  })

  it('重置费用后恢复配置数值', () => {
    costManager.addCost(100)
    costManager.reset(20, 500)
    expect(costManager.getCurrentCost()).toBe(20)
    expect(costManager.getMaxCost()).toBe(500)
  })
})
