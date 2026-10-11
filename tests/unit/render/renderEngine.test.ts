import { describe, it, expect, vi } from 'vitest'
import {
  INK_FONT,
  INK_FONT_RESOLUTION,
  InkColor,
  InkText,
  inkText,
  createWuXingSeal,
  getGemAffixQualityTag,
  drawAffixPercentileBar,
  createExclusiveBadge,
  drawUltimateBox,
  drawInkMeridianBody,
  drawBaguaWatermark,
  drawPracticeDummy,
  drawResonanceLeyline
} from '@/render'

describe('水墨表现渲染引擎 (Render Engine Architecture Tests)', () => {
  it('1. typography 子系统完整导出水墨字体栈与焦墨高对比度色板', () => {
    expect(INK_FONT).toContain('KaiTi')
    expect(INK_FONT_RESOLUTION).toBeGreaterThanOrEqual(2)
    expect(InkText.faint).toBe('#484236')
    expect(InkColor.inkFaint).toBe(0x484236)
  })

  it('2. inkText 工厂针对 <=14px 小字默认启用加粗字重与保底 3x 超采样', () => {
    let capturedStyle: any = null
    const mockScene: any = {
      add: {
        text: vi.fn((_x: number, _y: number, _content: string, style: any) => {
          capturedStyle = style
          return {
            setOrigin: vi.fn().mockReturnThis(),
            setWordWrapWidth: vi.fn().mockReturnThis(),
            setShadow: vi.fn().mockReturnThis()
          } as any
        })
      }
    }

    inkText(mockScene, 10, 20, '小字号测试', { size: 13 })
    expect(capturedStyle.fontSize).toBe('13px')
    expect(capturedStyle.fontStyle).toBe('bold')
    expect(capturedStyle.resolution).toBeGreaterThanOrEqual(3)
  })

  it('3. SealVisual 正确生成五行金石方印', () => {
    const mockContainer = {
      add: vi.fn().mockReturnThis()
    }
    const mockGfx = {
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis()
    }
    const mockTextObj = {
      setOrigin: vi.fn().mockReturnThis()
    }

    const mockScene: any = {
      add: {
        container: vi.fn().mockReturnValue(mockContainer),
        graphics: vi.fn().mockReturnValue(mockGfx),
        text: vi.fn().mockReturnValue(mockTextObj)
      }
    }

    const seal = createWuXingSeal(mockScene, 100, 200, 'wood', { size: 30 })
    expect(seal).toBeDefined()
    expect(mockScene.add.container).toHaveBeenCalledWith(100, 200)
    expect(mockContainer.add).toHaveBeenCalledTimes(2)
  })

  it('4. GemVisual 根据分位数准确评估品相并在 [0, 1] 区间正确打标', () => {
    expect(getGemAffixQualityTag(0.98).text).toContain('极品')
    expect(getGemAffixQualityTag(0.85).text).toContain('上品')
    expect(getGemAffixQualityTag(0.60).text).toContain('中品')
    expect(getGemAffixQualityTag(0.30).text).toContain('初品')
  })

  it('5. WeaponVisual 成功绘制专属腰牌和大招金朱宝匣', () => {
    const mockContainer = {
      add: vi.fn().mockReturnThis()
    }
    const mockRect = {
      setStrokeStyle: vi.fn().mockReturnThis()
    }
    const mockGfx = {
      lineStyle: vi.fn().mockReturnThis(),
      lineBetween: vi.fn().mockReturnThis()
    }
    const mockTextObj = {
      setOrigin: vi.fn().mockReturnThis()
    }

    const mockScene: any = {
      add: {
        container: vi.fn().mockReturnValue(mockContainer),
        rectangle: vi.fn().mockReturnValue(mockRect),
        graphics: vi.fn().mockReturnValue(mockGfx),
        text: vi.fn().mockReturnValue(mockTextObj)
      }
    }

    const badge = createExclusiveBadge(mockScene, 50, 50, '关羽')
    expect(badge).toBeDefined()

    const ultBox = drawUltimateBox(mockScene, 10, 20, 200, 100, '青龙偃月法相')
    expect(ultBox).toBeDefined()
  })

  it('6. figures 子系统正确绘制盘坐经脉轮廓、八卦暗纹与沙盒木人桩', () => {
    const mockGfx: any = {
      fillStyle: vi.fn().mockReturnThis(),
      lineStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      strokeCircle: vi.fn().mockReturnThis(),
      fillRect: vi.fn().mockReturnThis(),
      lineBetween: vi.fn().mockReturnThis()
    }

    drawInkMeridianBody(mockGfx, 215)
    expect(mockGfx.fillCircle).toHaveBeenCalled()
    expect(mockGfx.lineBetween).toHaveBeenCalled()

    const baguaGfx: any = {
      lineStyle: vi.fn().mockReturnThis(),
      strokeCircle: vi.fn().mockReturnThis(),
      lineBetween: vi.fn().mockReturnThis()
    }
    drawBaguaWatermark(baguaGfx, 215, 268)
    expect(baguaGfx.strokeCircle).toHaveBeenCalledTimes(2)

    const mockContainer = { add: vi.fn().mockReturnThis() }
    const mockRect = { setStrokeStyle: vi.fn().mockReturnThis() }
    const mockScene: any = {
      add: {
        rectangle: vi.fn().mockReturnValue(mockRect),
        text: vi.fn().mockReturnValue({ setOrigin: vi.fn().mockReturnThis() })
      }
    }

    drawPracticeDummy(mockScene, mockContainer as any, 130, 8)
    expect(mockScene.add.rectangle).toHaveBeenCalledWith(130, 8, 36, 52, 0x6d4c41, 1)
    expect(mockContainer.add).toHaveBeenCalled()
  })

  it('7. effects 子系统正确绘制 160px 相生阵脉双色流光与中点节点', () => {
    const mockGfx: any = {
      lineStyle: vi.fn().mockReturnThis(),
      beginPath: vi.fn().mockReturnThis(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      strokePath: vi.fn().mockReturnThis(),
      fillStyle: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      strokeCircle: vi.fn().mockReturnThis()
    }

    drawResonanceLeyline(
      mockGfx,
      { x: 100, y: 100, wuXing: 'water' },
      { x: 260, y: 100, wuXing: 'wood' }
    )

    // 底线 + 水前半段 + 木后半段
    expect(mockGfx.strokePath).toHaveBeenCalledTimes(3)
    // 中点金石节点圆
    expect(mockGfx.fillCircle).toHaveBeenCalledWith(180, 100, 7)
    expect(mockGfx.strokeCircle).toHaveBeenCalledWith(180, 100, 7)
  })
})

