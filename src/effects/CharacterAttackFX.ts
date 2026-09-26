import Phaser from 'phaser'
import { Point } from '@/types'

/**
 * 文字攻击特效库（赵云与阿斗风格）
 *
 * 核心思想：把"字"当作游戏对象来做动画，无需任何图片素材。
 * 所有特效均为"生成 → 播放 → 自动销毁"，不产生内存泄漏。
 *
 * 提供 6 种基础能力，可自由组合：
 *  - lunge()          英雄本体前冲（近战）
 *  - shootCharacter() 发射一个"字"作为投射物（远程）
 *  - slashArc()       刀光/挥砍弧线（近战命中）
 *  - inkSplash()      墨迹飞溅粒子（命中反馈）
 *  - damageText()     伤害飘字
 *  - hitShake()       受击抖动 + 闪白（目标反馈）
 *  - skillBurst()     技能：环绕文字爆发
 */

/** 投射物配置 */
export interface ShootOptions {
  from: Point
  to: Point
  char: string                 // 发射的"字"（如 '枪' '箭' '刀' '龙'）
  color?: string               // 字的颜色（可用五行色）
  fontSize?: number
  duration?: number            // 飞行时长(ms)
  arc?: number                 // 抛物线高度，0=直线
  spin?: boolean               // 是否旋转飞行（像掷出的兵器）
  onHit?: () => void           // 命中回调（用来扣血/触发其他特效）
}

/** 伤害飘字配置 */
export interface DamageTextOptions {
  crit?: boolean               // 暴击（更大更亮）
  counter?: boolean            // 五行克制（金墨色加成）
  resisted?: boolean           // 五行被克（淡墨削减）
  color?: string               // 自定义颜色
  offsetX?: number             // 水平随机偏移，避免重叠
}

/** 可被 lunge/getWorldXY 处理的对象（文字或容器） */
export type LungeTarget = Phaser.GameObjects.Text | Phaser.GameObjects.Container

export class CharacterAttackFX {
  // 运行时生成的墨点纹理 key（懒加载，只生成一次）
  private static INK_TEXTURE_KEY = 'fx_ink_drop'

  constructor(private scene: Phaser.Scene) {}

  /* ------------------------------------------------------------------ *
   * 1. 英雄本体前冲（近战攻击起手式）
   *    让英雄的"字"/立像朝目标方向猛地一探，再弹回原位。
   *    高攻速下频繁触发时必须先 kill 既有补间并归位到基准坐标，杜绝位移叠加漂移
   * ------------------------------------------------------------------ */
  lunge(obj: LungeTarget, toward: Point, distance = 16): void {
    // 获取不可变的基准坐标：优先取 deployedData.position，其次取缓存的 homeX/homeY，兜底取当前 obj.x/y
    let baseX = (obj as any).deployedData?.position?.x
    let baseY = (obj as any).deployedData?.position?.y

    if (baseX === undefined || baseY === undefined) {
      if (obj.getData && obj.getData('homeX') !== undefined) {
        baseX = obj.getData('homeX')
        baseY = obj.getData('homeY')
      } else {
        baseX = obj.x
        baseY = obj.y
        if (obj.setData) {
          obj.setData('homeX', baseX)
          obj.setData('homeY', baseY)
        }
      }
    }

    // 终止可能仍在执行的旧位移补间，并瞬间强制归位到基准坐标
    this.scene.tweens.killTweensOf(obj)
    obj.setPosition(baseX, baseY)

    // 对象可能在容器内（局部坐标），先换算成世界坐标再算朝向
    const world = CharacterAttackFX.getWorldXY(obj)
    const angle = Phaser.Math.Angle.Between(world.x, world.y, toward.x, toward.y)
    const dx = Math.cos(angle) * distance
    const dy = Math.sin(angle) * distance

    this.scene.tweens.add({
      targets: obj,
      x: baseX + dx,
      y: baseY + dy,
      duration: 75,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (obj && obj.active) {
          obj.setPosition(baseX, baseY)
        }
      }
    })
  }

  /**
   * 计算对象的世界坐标（兼容被 Container 包裹的情况）
   * 只累加各级父容器的平移，满足"算朝向/算飞行起点"的需求。
   */
  static getWorldXY(obj: LungeTarget): Point {
    let x = obj.x
    let y = obj.y
    let parent = obj.parentContainer
    while (parent) {
      x += parent.x
      y += parent.y
      parent = parent.parentContainer
    }
    return { x, y }
  }

  /* ------------------------------------------------------------------ *
   * 2. 发射"字"作为投射物（远程攻击）
   *    复制一个"字"，沿抛物线飞向目标，命中时墨迹飞溅。
   * ------------------------------------------------------------------ */
  shootCharacter(opts: ShootOptions): void {
    const {
      from,
      to,
      char,
      color = '#1a1a1a',
      fontSize = 30,
      duration = 280,
      arc,
      spin = false,
      onHit
    } = opts

    const proj = this.scene.add
      .text(from.x, from.y, char, {
        fontFamily: '"STKaiti","KaiTi","Noto Serif SC",serif',
        fontSize: `${fontSize}px`,
        color,
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(40)

    const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)

    // 抛物线控制点：在中点沿法线方向抬升
    const arcHeight = arc ?? Math.min(46, dist * 0.2)
    const midX = (from.x + to.x) / 2
    const midY = (from.y + to.y) / 2
    const nx = -Math.sin(angle)
    const ny = Math.cos(angle)
    const cx = midX + nx * arcHeight
    const cy = midY + ny * arcHeight

    const progress = { t: 0 }
    this.scene.tweens.add({
      targets: progress,
      t: 1,
      duration,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        const t = progress.t
        // 二次贝塞尔曲线：起点→控制点→终点
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cx + t * t * to.x
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cy + t * t * to.y
        proj.setPosition(x, y)
        // 飞行中途略微放大，显得更有张力
        proj.setScale(1 + Math.sin(t * Math.PI) * 0.25)
        if (spin) proj.rotation += 0.35
      },
      onComplete: () => {
        proj.destroy()
        this.inkSplash(to, this.colorToNumber(color), 10)
        onHit?.()
      }
    })
  }

  /* ------------------------------------------------------------------ *
   * 3. 刀光/挥砍弧线（近战命中特效）
   *    在目标处画一道快速掠过的弧线，像大刀劈下。
   * ------------------------------------------------------------------ */
  slashArc(at: Point, color = 0xffffff, radius = 34): void {
    const g = this.scene.add.graphics().setDepth(42)
    const startAngle = Phaser.Math.FloatBetween(-Math.PI, Math.PI)
    const progress = { t: 0 }

    this.scene.tweens.add({
      targets: progress,
      t: 1,
      duration: 160,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        g.clear()
        g.lineStyle(4, color, 1 - progress.t * 0.5)
        // 扫过约 120° 的弧
        g.beginPath()
        g.arc(at.x, at.y, radius, startAngle, startAngle + progress.t * (Math.PI * 0.7))
        g.strokePath()
      },
      onComplete: () => g.destroy()
    })
  }

  /* ------------------------------------------------------------------ *
   * 4. 墨迹飞溅（命中粒子）
   *    零贴图：运行时用 Graphics 生成一颗白色软圆，再 tint 成目标色。
   * ------------------------------------------------------------------ */
  inkSplash(at: Point, color = 0x1a1a1a, count = 12): void {
    const key = this.ensureInkTexture()
    const emitter = this.scene.add.particles(at.x, at.y, key, {
      speed: { min: 60, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0x1a1a1a, color],
      lifespan: 380,
      gravityY: 180,
      emitting: false
    })
    emitter.setDepth(41)
    emitter.explode(count, at.x, at.y)
    this.scene.time.delayedCall(500, () => emitter.destroy())
  }

  /**
   * 敌人阵亡：水墨消散特效（墨散化烟）
   * 零贴图：向外扩散的淡墨粒子逐渐淡化入宣纸底色
   */
  inkDissolve(at: Point): void {
    const key = this.ensureInkTexture()
    // 墨烟粒子扩散（淡墨团徐徐膨胀并淡入宣纸）
    const emitter = this.scene.add.particles(at.x, at.y, key, {
      speed: { min: 20, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 1.8 },
      alpha: { start: 0.7, end: 0 },
      tint: [0x2a2a2a, 0x4a453a, 0x7a7567],
      lifespan: 550,
      gravityY: -30, // 墨烟轻盈升腾
      emitting: false
    })
    emitter.setDepth(35)
    emitter.explode(14, at.x, at.y)

    // 地面散开一圈水墨微漪
    const ring = this.scene.add.graphics()
    ring.setDepth(15)
    ring.lineStyle(1.5, 0x2a2a2a, 0.45)
    ring.strokeCircle(at.x, at.y, 14)
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.4,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => ring.destroy()
    })

    this.scene.time.delayedCall(600, () => emitter.destroy())
  }

  /* ------------------------------------------------------------------ *
   * 5. 伤害飘字（支持五行克制/微弱/暴击风格）
   *    墨色描边的数字向上飘起并淡出，克制金色微爆、微弱淡灰收敛。
   * ------------------------------------------------------------------ */
  damageText(at: Point, damage: number, opts: DamageTextOptions = {}): void {
    const { crit = false, counter = false, resisted = false, color, offsetX } = opts
    const jitterX = offsetX ?? Phaser.Math.Between(-8, 8)

    let displayStr = `-${damage}`
    let textColor = color ?? '#f5f0e6'
    let fontSize = '20px'
    let scaleTo = 1.0

    if (counter) {
      displayStr = `【克制】 -${damage}`
      textColor = '#d97706' // 金墨色
      fontSize = '22px'
      scaleTo = 1.25
    } else if (resisted) {
      displayStr = `【微弱】 -${damage}`
      textColor = '#8a8577' // 淡墨色
      fontSize = '18px'
      scaleTo = 0.95
    } else if (crit) {
      displayStr = `【暴击】 -${damage}`
      textColor = '#ffd24a'
      fontSize = '25px'
      scaleTo = 1.35
    }

    const text = this.scene.add
      .text(at.x + jitterX, at.y - 14, displayStr, {
        fontFamily: '"STKaiti","KaiTi","Noto Serif SC",serif',
        fontSize,
        color: textColor,
        fontStyle: 'bold',
        stroke: '#1a1a1a',
        strokeThickness: 3.5
      })
      .setOrigin(0.5)
      .setDepth(60)

    this.scene.tweens.add({
      targets: text,
      y: at.y - 54,
      alpha: 0,
      scale: scaleTo,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    })
  }

  /* ------------------------------------------------------------------ *
   * 6. 受击反馈：抖动 + 闪白
   *    目标"字"左右抖一下并短暂变白。
   * ------------------------------------------------------------------ */
  hitShake(text: Phaser.GameObjects.Text, strength = 3): void {
    const baseX = text.x
    const prevColor = text.style.color

    // 闪白（Text 不支持 tint，改色实现）
    text.setColor('#ffffff')
    this.scene.time.delayedCall(90, () => {
      if (text.active) text.setColor(prevColor)
    })

    // 抖动
    this.scene.tweens.add({
      targets: text,
      x: baseX + strength,
      duration: 40,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (text.active) text.setX(baseX)
      }
    })
  }

  /* ------------------------------------------------------------------ *
   * 7. 技能爆发：环绕文字扩散
   *    多个"字"从中心向外呈环形炸开并淡出（适合 AOE 大招）。
   * ------------------------------------------------------------------ */
  skillBurst(center: Point, chars: string[], color = '#f5f0e6', radius = 80): void {
    chars.forEach((c, i) => {
      const a = (i / chars.length) * Math.PI * 2 - Math.PI / 2
      const t = this.scene.add
        .text(center.x, center.y, c, {
          fontFamily: '"STKaiti","KaiTi","Noto Serif SC",serif',
          fontSize: '26px',
          color,
          fontStyle: 'bold'
        })
        .setOrigin(0.5)
        .setDepth(50)

      this.scene.tweens.add({
        targets: t,
        x: center.x + Math.cos(a) * radius,
        y: center.y + Math.sin(a) * radius,
        alpha: 0,
        scale: 1.6,
        duration: 480,
        ease: 'Cubic.easeOut',
        onComplete: () => t.destroy()
      })
    })

    // 中心一圈墨迹，强化冲击感
    this.inkSplash(center, 0x1a1a1a, 18)
  }

  /* ------------------------------------------------------------------ *
   * 内部：懒加载生成"墨点"纹理（零美术资源的关键）
   *    用 Graphics 画一个白色软圆 → generateTexture，供粒子反复使用。
   * ------------------------------------------------------------------ */
  private ensureInkTexture(): string {
    const key = CharacterAttackFX.INK_TEXTURE_KEY
    if (this.scene.textures.exists(key)) return key

    const size = 16
    const g = this.scene.add.graphics()
    // 三层同心圆模拟柔边（白色，便于后续 tint 任意色）
    g.fillStyle(0xffffff, 0.35)
    g.fillCircle(size / 2, size / 2, size / 2)
    g.fillStyle(0xffffff, 0.6)
    g.fillCircle(size / 2, size / 2, size / 2 * 0.62)
    g.fillStyle(0xffffff, 1)
    g.fillCircle(size / 2, size / 2, size / 2 * 0.3)
    g.generateTexture(key, size, size)
    g.destroy()
    return key
  }

  /**
   * 对外暴露"墨点"纹理 key（并确保已生成）
   * 供其他特效（如 WeaponFX 的箭尾迹）复用同一张运行时纹理。
   */
  getInkTextureKey(): string {
    return this.ensureInkTexture()
  }

  /** '#RRGGBB' → 0xRRGGBB */
  private colorToNumber(color: string): number {
    if (color.startsWith('#')) return parseInt(color.slice(1), 16)
    return 0x1a1a1a
  }
}
