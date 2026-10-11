import { describe, it, expect, vi } from 'vitest'
import { inkText, INK_FONT, INK_FONT_RESOLUTION, InkFontSize, InkColor, InkText } from '@/ui/InkTheme'

describe('水墨文字系统与高清晰度渲染测试 (InkTheme Typography & Sharpness)', () => {
  it('1. 基础字体栈 INK_FONT 具备完整的中英文字体回退且不为空', () => {
    expect(INK_FONT).toBeTruthy()
    expect(INK_FONT).toContain('KaiTi')
    expect(INK_FONT).toContain('楷体')
    expect(INK_FONT).toContain('serif')
  })

  it('2. INK_FONT_RESOLUTION 超采样分辨率保底 >= 2，确保高分屏清晰度', () => {
    expect(INK_FONT_RESOLUTION).toBeGreaterThanOrEqual(2)
    expect(INK_FONT_RESOLUTION).toBeLessThanOrEqual(3)
  })

  it('3. inkText 绝不会向 Phaser TextStyle 注入 undefined 的 stroke 或 strokeThickness（防止 NaN 导致文字消失）', () => {
    let capturedStyle: any = null
    let capturedX = -1
    let capturedY = -1

    const mockTextObj = {
      setOrigin: vi.fn().mockReturnThis(),
      setWordWrapWidth: vi.fn().mockReturnThis(),
      setShadow: vi.fn().mockReturnThis()
    }

    const mockScene: any = {
      add: {
        text: vi.fn((x: number, y: number, _content: string, style: any) => {
          capturedX = x
          capturedY = y
          capturedStyle = style
          return mockTextObj as any
        })
      }
    }

    // 调用默认参数的 inkText
    inkText(mockScene, 120.4, 250.8, '关羽·武圣')

    expect(capturedStyle).toBeDefined()
    // 核心断言：stroke 与 strokeThickness 必须未定义或为有效值，绝不能在对象中显式为 undefined
    expect('stroke' in capturedStyle).toBe(false)
    expect('strokeThickness' in capturedStyle).toBe(false)

    // 坐标必须对齐到整数像素
    expect(capturedX).toBe(120)
    expect(capturedY).toBe(251)

    // 字号必须为整数字号
    expect(capturedStyle.fontSize).toBe(`${InkFontSize.md}px`)
    expect(capturedStyle.fontSize).not.toContain('.')

    // 分辨率必须大于等于 2
    expect(capturedStyle.resolution).toBeGreaterThanOrEqual(2)

    // 保护内边距必须存在
    expect(capturedStyle.padding).toBeDefined()
    expect(capturedStyle.padding.left).toBeGreaterThan(0)
  })

  it('4. 小字号 (<=12px) 必须给予保底 3x 超采样，且浮点字号必须严格取整', () => {
    let capturedStyle: any = null

    const mockTextObj = {
      setOrigin: vi.fn().mockReturnThis(),
      setWordWrapWidth: vi.fn().mockReturnThis(),
      setShadow: vi.fn().mockReturnThis()
    }

    const mockScene: any = {
      add: {
        text: vi.fn((_x: number, _y: number, _content: string, style: any) => {
          capturedStyle = style
          return mockTextObj as any
        })
      }
    }

    // 传入浮点小字号 11.5px
    inkText(mockScene, 10, 10, '微型状态印章', { size: 11.5 })

    expect(capturedStyle).toBeDefined()
    // 11.5 应被圆整为 12px
    expect(capturedStyle.fontSize).toBe('12px')
    // <=14px 应获得保底 3x 高清超采样
    expect(capturedStyle.resolution).toBeGreaterThanOrEqual(3)
    // 小字号未显式指定 bold 时，默认字重加粗防发虚
    expect(capturedStyle.fontStyle).toBe('bold')
  })

  it('5. 显式提供描边时，描边属性正常透传且不产生 NaN', () => {
    let capturedStyle: any = null

    const mockTextObj = {
      setOrigin: vi.fn().mockReturnThis(),
      setWordWrapWidth: vi.fn().mockReturnThis(),
      setShadow: vi.fn().mockReturnThis()
    }

    const mockScene: any = {
      add: {
        text: vi.fn((_x: number, _y: number, _content: string, style: any) => {
          capturedStyle = style
          return mockTextObj as any
        })
      }
    }

    inkText(mockScene, 0, 0, '暴击飘字', {
      stroke: '#000000',
      strokeThickness: 2.5
    })

    expect(capturedStyle.stroke).toBe('#000000')
    expect(capturedStyle.strokeThickness).toBe(2.5)
    expect(isNaN(capturedStyle.strokeThickness)).toBe(false)
  })

  it('6. InkText.faint 与 InkColor.inkFaint 采用焦墨深褐，杜绝低对比度浅灰发虚', () => {
    expect(InkText.faint).toBe('#484236')
    expect(InkColor.inkFaint).toBe(0x484236)
  })

  it('7. inkText 小字号显式传入 bold: false 时尊重调用方设置', () => {
    let capturedStyle: any = null
    const mockTextObj = {
      setOrigin: vi.fn().mockReturnThis(),
      setWordWrapWidth: vi.fn().mockReturnThis(),
      setShadow: vi.fn().mockReturnThis()
    }
    const mockScene: any = {
      add: {
        text: vi.fn((_x: number, _y: number, _content: string, style: any) => {
          capturedStyle = style
          return mockTextObj as any
        })
      }
    }

    inkText(mockScene, 10, 10, '细体小字', { size: 12, bold: false })
    expect(capturedStyle.fontStyle).toBe('normal')
  })
})
