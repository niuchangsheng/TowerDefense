import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('phaser', () => ({
  default: {
    Scene: class {},
    GameObjects: {
      Container: class {
        add() {}
        setDepth() { return this }
        setAlpha() { return this }
        setPosition() { return this }
        destroy() {}
      },
      Text: class {
        setOrigin() { return this }
        setDepth() { return this }
        destroy() {}
      },
      Graphics: class {
        lineStyle() { return this }
        beginPath() { return this }
        moveTo() { return this }
        lineTo() { return this }
        strokePath() { return this }
        fillStyle() { return this }
        fillCircle() { return this }
        fillRoundedRect() { return this }
        strokeRoundedRect() { return this }
        clear() { return this }
        destroy() {}
        setDepth() { return this }
      },
      Rectangle: class {},
      Image: class {}
    },
    Math: {
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1)
      },
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
    }
  }
}))

vi.mock('@/effects/CharacterAttackFX', () => ({
  CharacterAttackFX: class {}
}))
vi.mock('@/effects/WeaponFX', () => ({
  WeaponFX: class {
    setHitStopGap() {}
  }
}))
vi.mock('@/effects/SoundFX', () => ({
  SoundFX: {
    unlock: () => {},
    play: () => {}
  }
}))

import { BattleSystem } from '@/core/battle/BattleSystem'
import { level1Config } from '@/data/levels/chapter1/level1'
import { heroes } from '@/data/heroes'
import { Hero } from '@/types'

describe('战前部署环节单元测试（Deployment Phase）', () => {
  let heroMap: Map<string, Hero>
  let mockScene: any

  beforeEach(() => {
    heroMap = new Map()
    for (const h of heroes) {
      heroMap.set(h.id, { ...h, isUnlocked: true })
    }

    const objProxy: any = new Proxy({}, {
      get: () => () => objProxy
    })

    mockScene = {
      add: new Proxy(
        {
          graphics: () => ({
            lineStyle: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            strokePath: () => {},
            fillStyle: () => {},
            fillCircle: () => {},
            fillRoundedRect: () => {},
            strokeRoundedRect: () => {},
            clear: () => {},
            destroy: () => {},
            setDepth: () => {},
            setAlpha: () => {}
          }),
          text: () => objProxy,
          container: () => objProxy,
          image: () => objProxy,
          existing: () => objProxy
        },
        {
          get(target, prop) {
            if (prop in target) return (target as any)[prop]
            return () => objProxy
          }
        }
      ),
      tweens: {
        add: () => {},
        killTweensOf: () => {}
      },
      textures: {
        exists: () => false,
        createCanvas: () => {
          const mockGrad = { addColorStop: () => {} }
          const proxyCtx = new Proxy(
            {
              fillStyle: '',
              strokeStyle: '',
              lineWidth: 1,
              lineCap: 'round',
              lineJoin: 'round',
              globalAlpha: 1,
              createRadialGradient: () => mockGrad,
              createLinearGradient: () => mockGrad
            },
            {
              get(target, prop) {
                if (prop in target) return (target as any)[prop]
                if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
                  return () => ({ addColorStop: () => {} })
                }
                return () => {}
              },
              set(target, prop, value) {
                (target as any)[prop] = value
                return true
              }
            }
          )
          return {
            getContext: () => proxyCtx,
            refresh: () => {}
          }
        }
      }
    }
  })

  it('1. 初始化部署阶段后，处于 preparing 状态，且尚未出兵 (isRunning 为 false)', () => {
    const battle = new BattleSystem(mockScene, level1Config, heroMap, 1)
    battle.initDeploymentPhase()

    expect(battle.isPreparing()).toBe(true)
    expect(battle.getState().status).toBe('preparing')
    expect(battle.getState().currentWave).toBe(0)
    expect(battle.canRepositionUnits()).toBe(true)
    expect(battle.canCallNextWaveEarly()).toBe(false)
  })

  it('2. 战前部署阶段 update 不推进出兵与波次', () => {
    const battle = new BattleSystem(mockScene, level1Config, heroMap, 1)
    battle.initDeploymentPhase()

    // 模拟若干秒时间流逝
    battle.update(1000)
    battle.update(3000)

    // 敌人数量仍为 0，波次仍未开始
    expect(battle.getState().activeEnemies.length).toBe(0)
    expect(battle.getState().currentWave).toBe(0)
    expect(battle.getState().elapsedTime).toBe(0)
  })

  it('3. 部署阶段开放开局锦囊与自由布防调阵', () => {
    const battle = new BattleSystem(mockScene, level1Config, heroMap, 1)
    battle.initDeploymentPhase()

    // 开局锦囊已就绪
    expect(battle.getAugmentManager().getReadyCount()).toBe(1)

    // 自由调位布阵校验
    expect(battle.canRepositionUnits()).toBe(true)
  })

  it('4. 点击开始出兵 (startBattle) 后，结束部署环节，正式启动第 1 波与出兵行军', () => {
    const battle = new BattleSystem(mockScene, level1Config, heroMap, 1)
    battle.initDeploymentPhase()

    expect(battle.isPreparing()).toBe(true)

    // 玩家完成部署，点击开始出兵
    battle.startBattle()

    expect(battle.isPreparing()).toBe(false)
    expect(battle.getState().status).toBe('running')
    expect(battle.getState().currentWave).toBe(1)

    // 驱动更新，波次计时开始流转
    battle.update(500)
    expect(battle.getState().elapsedTime).toBe(500)
  })
})
