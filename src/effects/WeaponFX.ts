import Phaser from 'phaser'
import { Point } from '@/types'
import { CharacterAttackFX } from './CharacterAttackFX'
import { SoundFX } from './SoundFX'

/**
 * 武器特效库（零图片素材）
 *
 * 思路：用 Phaser.Graphics 现场把武器"画"成纹理，再当成 Image 使用，
 *       于是就能对它做旋转、挥动、飞行等补间动画。
 *       与赵云与阿斗一致：全程无美术资源。
 *
 * 所有武器绘制时统一"朝右(+x)"，原点设在握柄/中心，
 * 这样 setRotation(朝向目标的角度) 即可自然指向敌人。
 *
 * 提供：
 *  - createWeaponImage()  生成一个静态武器（用于待机手持）
 *  - spearThrust()        长矛前刺（赵云）
 *  - spearSweep()         长矛横扫
 *  - bladeSlash()         大刀挥砍（关羽）
 *  - bowShot()            拉弓放箭（黄忠），箭带尾迹、随弹道翻转
 */

export type WeaponType = 'spear' | 'bow' | 'arrow' | 'blade'

export class WeaponFX {
  // 武器纹理 key（懒加载，只生成一次）
  private static KEYS: Record<WeaponType, string> = {
    spear: 'w_spear',
    bow: 'w_bow',
    arrow: 'w_arrow',
    blade: 'w_blade'
  }

  /** 是否正处于命中顿帧（防止短时间多次命中重复暂停） */
  private hitStopping = false
  /** 两次顿帧的最小间隔（战斗中多英雄同时攻击时用来节流，0=不节流） */
  private hitStopGap = 0
  private lastHitStopAt = -1e9

  /** 复用水墨命中特效（墨迹/飘字/受击） */
  constructor(
    private scene: Phaser.Scene,
    private fx: CharacterAttackFX
  ) {}

  /**
   * 设置顿帧节流间隔（毫秒）。
   * 战斗里多个英雄高频攻击，若每次命中都顿帧会一直卡顿，
   * 设一个间隔（如 600）让顿帧只在"少数几次命中"上出现。传 0 关闭节流。
   */
  setHitStopGap(ms: number): void {
    this.hitStopGap = ms
  }

  /* ==================================================================== *
   * 命中顿帧（打击感的最后一步）
   *   命中瞬间把整个场景暂停 ~90ms：暂停只停"更新"、不停"渲染"，
   *   画面会定格在命中那一帧，形成格斗游戏式的打击停顿。
   *   用真实时间 setTimeout 恢复，避免恢复逻辑本身也被冻结。
   * ==================================================================== */
  private hitStop(ms = 90): void {
    if (this.hitStopping) return
    // 节流：距上次顿帧不足 gap 就跳过（战斗场景用）
    const now = performance.now()
    if (this.hitStopGap > 0 && now - this.lastHitStopAt < this.hitStopGap) return

    this.hitStopping = true
    this.lastHitStopAt = now
    const sys = this.scene.sys
    sys.pause()
    window.setTimeout(() => {
      // 场景可能已切换/销毁：仅在仍处于暂停态时恢复，避免"复活"已关场的场景
      try {
        if (sys.getStatus() === 6) sys.resume() // 6 === Phaser Scene PAUSED
      } catch {
        /* 场景已销毁，忽略 */
      }
      this.hitStopping = false
    }, ms)
  }

  /* ==================================================================== *
   * 生成静态武器图片（待机时"手持"用）
   * ==================================================================== */
  createWeaponImage(type: WeaponType, x: number, y: number, angle = 0): Phaser.GameObjects.Image {
    this.ensureTexture(type)
    const img = this.scene.add.image(x, y, WeaponFX.KEYS[type])
    // 长矛/大刀原点在握柄(左端)，弓/箭在中心
    img.setOrigin(type === 'spear' || type === 'blade' ? 0 : 0.5, 0.5)
    img.setRotation(angle)
    img.setDepth(20)
    return img
  }

  /* ==================================================================== *
   * 长矛前刺（赵云）
   *   握柄固定在英雄处，矛身朝目标方向猛地探出再收回。
   * ==================================================================== */
  spearThrust(from: Point, to: Point, onHit?: () => void): void {
    this.ensureTexture('spear')
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)
    const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    const reach = Math.min(dist * 0.55, 80) // 前探距离

    const spear = this.scene.add
      .image(from.x, from.y, WeaponFX.KEYS.spear)
      .setOrigin(0, 0.5)
      .setRotation(angle)
      .setDepth(35)

    // 先收回来一点，再刺出去，再收回（用 yoyo 完成往返）
    const backX = from.x - Math.cos(angle) * 14
    const backY = from.y - Math.sin(angle) * 14
    const tipX = from.x + Math.cos(angle) * reach
    const tipY = from.y + Math.sin(angle) * reach
    spear.setPosition(backX, backY)

    let hitDone = false
    this.scene.tweens.add({
      targets: spear,
      x: tipX,
      y: tipY,
      duration: 110,
      ease: 'Quad.easeOut',
      yoyo: true,
      onYoyo: () => {
        // 刺到最前端时命中
        if (!hitDone) {
          hitDone = true
          const hitX = from.x + Math.cos(angle) * Math.min(dist * 0.7, reach + 20)
          const hitY = from.y + Math.sin(angle) * Math.min(dist * 0.7, reach + 20)
          this.fx.inkSplash({ x: hitX, y: hitY }, 0x1a1a1a, 12)
          SoundFX.thud()
          onHit?.()
          this.hitStop()
        }
      },
      onComplete: () => spear.destroy()
    })
  }

  /* ==================================================================== *
   * 长矛前刺 —— 战斗版：枪尖真正够到目标
   *   与 spearThrust 同构，但按距离把握柄前推，让枪尖（握柄+矛长）
   *   正好"扎"到敌人身上，适配战斗中较远的攻击距离(150~200px)。
   * ==================================================================== */
  spearThrustTo(from: Point, to: Point, onHit?: () => void): void {
    this.ensureTexture('spear')
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)
    const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    const SPEAR_LEN = 88
    // 握柄前推距离：使枪尖越过目标约 10px，看起来像"扎进"了敌人
    const reach = Math.max(0, dist - SPEAR_LEN + 10)

    const spear = this.scene.add
      .image(from.x, from.y, WeaponFX.KEYS.spear)
      .setOrigin(0, 0.5)
      .setRotation(angle)
      .setDepth(35)

    const backX = from.x - Math.cos(angle) * 14
    const backY = from.y - Math.sin(angle) * 14
    const tipX = from.x + Math.cos(angle) * reach
    const tipY = from.y + Math.sin(angle) * reach
    spear.setPosition(backX, backY)

    // 距离越远出枪略慢，但夹在 110~170ms 内保持"快、脆"的手感
    const dur = Phaser.Math.Clamp(90 + dist * 0.25, 110, 170)

    let hitDone = false
    this.scene.tweens.add({
      targets: spear,
      x: tipX,
      y: tipY,
      duration: dur,
      ease: 'Quad.easeOut',
      yoyo: true,
      onYoyo: () => {
        if (!hitDone) {
          hitDone = true
          this.fx.inkSplash(to, 0x1a1a1a, 12)
          SoundFX.thud()
          onHit?.()
          this.hitStop()
        }
      },
      onComplete: () => spear.destroy()
    })
  }

  /* ==================================================================== *
   * 长矛横扫
   *   长矛绕英雄从 angle-spread 扫到 angle+spread。
   * ==================================================================== */
  spearSweep(center: Point, towardAngle: number, spread = Math.PI / 3, onHit?: () => void): void {
    this.ensureTexture('spear')
    const spear = this.scene.add
      .image(center.x, center.y, WeaponFX.KEYS.spear)
      .setOrigin(0, 0.5)
      .setRotation(towardAngle - spread)
      .setDepth(35)

    this.scene.tweens.add({
      targets: spear,
      rotation: towardAngle + spread,
      duration: 200,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.fx.inkSplash(center, 0x1a1a1a, 10)
        spear.destroy()
        onHit?.()
        this.hitStop()
      }
    })
  }

  /* ==================================================================== *
   * 大刀挥砍（关羽）
   *   一柄大刀从上方抡下，扫过目标，配刀光。
   *   advance>0 时，挥砍支点沿目标方向前移（战斗里攻击距离较远，
   *   把刀"送到"敌人跟前再抡），并淡入出现避免突兀。
   * ==================================================================== */
  bladeSlash(from: Point, to: Point, onHit?: () => void, advance = 0): void {
    this.ensureTexture('blade')
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)

    const ax = from.x + Math.cos(angle) * advance
    const ay = from.y + Math.sin(angle) * advance

    const blade = this.scene.add
      .image(ax, ay, WeaponFX.KEYS.blade)
      .setOrigin(0, 0.5)
      .setRotation(angle - Math.PI / 2.2) // 起始：高举
      .setDepth(36)
      .setAlpha(advance > 0 ? 0 : 0.95)

    if (advance > 0) {
      this.scene.tweens.add({ targets: blade, alpha: 0.95, duration: 60 })
    }

    this.scene.tweens.add({
      targets: blade,
      rotation: angle + Math.PI / 3, // 挥到目标前下方
      duration: 180,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.fx.slashArc(to, 0xf5f0e6, 42)
        this.fx.inkSplash(to, 0x1a1a1a, 14)
        blade.destroy()
        SoundFX.thud()
        onHit?.()
        this.hitStop()
      }
    })
  }

  /* ==================================================================== *
   * 拉弓放箭（黄忠）
   *   弓臂 + 弓弦用 Graphics 逐帧绘制，可表现"拉满 → 松手弓弦崩弹"：
   *   拉弓时弦被拽向身后、弓臂微弯；松手瞬间弦猛地弹回并越过静息位，
   *   再小幅余振，就是"弓弦崩"的手感。箭离弦后沿抛物线飞行。
   * ==================================================================== */
  bowShot(from: Point, to: Point, onHit?: () => void): void {
    this.ensureTexture('arrow')
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)

    // 用容器承载弓，旋转朝向目标（容器内 +x 即射击方向）
    const rig = this.scene.add.container(from.x, from.y).setRotation(angle).setDepth(35)
    const g = this.scene.add.graphics()
    rig.add(g)
    rig.setAlpha(0)
    this.scene.tweens.add({ targets: rig, alpha: 1, duration: 60 })

    const state = { draw: 0 } // 0=静息, 1=拉满, 负值=弦崩弹越过静息位
    let released = false
    const redraw = () => this.drawBow(g, state.draw, released)
    redraw()

    // 1) 拉弓（弦后拽、弓臂微弯）
    this.scene.tweens.add({
      targets: state,
      draw: 1,
      duration: 210,
      ease: 'Quad.easeOut',
      onUpdate: redraw,
      onComplete: () => {
        // 2) 短暂屏息后松手
        this.scene.time.delayedCall(70, () => {
          released = true
          redraw()
          // 弓弦崩：一声"嘣"（松手瞬间弦崩弹）
          SoundFX.bowSnap()
          // 箭离弦
          const sx = from.x + Math.cos(angle) * 22
          const sy = from.y + Math.sin(angle) * 22
          this.fireArrow({ x: sx, y: sy }, to, onHit)

          // 3) 弓弦崩：弦猛地弹回并越过静息位（-0.35），再衰减余振
          this.scene.tweens.add({
            targets: state,
            draw: -0.35,
            duration: 55,
            ease: 'Quad.easeOut',
            onUpdate: redraw,
            onComplete: () => {
              this.scene.tweens.add({
                targets: state,
                draw: 0.14,
                duration: 70,
                ease: 'Sine.easeInOut',
                onUpdate: redraw,
                onComplete: () => {
                  this.scene.tweens.add({
                    targets: state,
                    draw: 0,
                    duration: 90,
                    ease: 'Sine.easeOut',
                    onUpdate: redraw
                  })
                }
              })
            }
          })
        })
      }
    })

    // 4) 收尾：淡出整把弓
    this.scene.time.delayedCall(720, () => {
      this.scene.tweens.add({
        targets: rig,
        alpha: 0,
        duration: 160,
        onComplete: () => rig.destroy()
      })
    })
  }

  /**
   * 逐帧绘制弓（容器局部坐标，+x 为射击方向）
   * @param draw 拉弓程度：0 静息 / 1 拉满 / 负值 弦崩弹越过静息位
   * @param released 是否已松手（松手后不再画搭在弦上的箭）
   */
  private drawBow(g: Phaser.GameObjects.Graphics, draw: number, released: boolean): void {
    g.clear()

    // 弓臂：随拉弓微微后弯（tipX 后移、弧度增大）
    const arcCx = -5
    const tipX = 3 - draw * 1.6
    const dx = tipX - arcCx
    const arcR = Math.sqrt(dx * dx + 13 * 13)
    const theta = Math.atan2(13, dx)
    g.lineStyle(4, 0x7a4a21, 1)
    g.beginPath()
    g.arc(arcCx, 0, arcR, -theta, theta)
    g.strokePath()

    // 弓弦：静息位 braceX，拉满时后拽到 drawnX，崩弹时越过 braceX 向前
    const braceX = 2
    const drawnX = -9
    const nockX = braceX + draw * (drawnX - braceX)
    g.lineStyle(2, 0xd9c9a3, 1)
    g.beginPath()
    g.moveTo(tipX, -13)
    g.lineTo(nockX, 0)
    g.lineTo(tipX, 13)
    g.strokePath()

    // 未松手时，箭搭在弦上
    if (!released) {
      g.lineStyle(3, 0x8a5a2b, 1)
      g.lineBetween(nockX, 0, nockX + 24, 0)
      g.fillStyle(0xdcdcdc, 1)
      g.fillTriangle(nockX + 24, -3, nockX + 24, 3, nockX + 32, 0)
    }
  }

  /** 箭飞行：抛物线 + 切线翻转 + 尾迹 */
  private fireArrow(from: Point, to: Point, onHit?: () => void): void {
    const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    const angle = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y)

    const arrow = this.scene.add
      .image(from.x, from.y, WeaponFX.KEYS.arrow)
      .setOrigin(0.5, 0.5)
      .setRotation(angle)
      .setDepth(38)

    // 抛物线控制点（法线方向抬升）
    const arcHeight = Math.min(60, dist * 0.22)
    const midX = (from.x + to.x) / 2
    const midY = (from.y + to.y) / 2
    const nx = -Math.sin(angle)
    const ny = Math.cos(angle)
    const cx = midX + nx * arcHeight
    const cy = midY + ny * arcHeight

    // 尾迹粒子（跟随箭移动）
    const trail = this.scene.add.particles(0, 0, this.fx.getInkTextureKey(), {
      speed: { min: 0, max: 12 },
      scale: { start: 0.28, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xd9c9a3,
      lifespan: 180,
      frequency: 18,
      emitting: true
    })
    trail.setDepth(37)

    const progress = { t: 0 }
    const duration = Math.max(260, dist * 0.9) // 距离越远飞越久
    this.scene.tweens.add({
      targets: progress,
      t: 1,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const t = progress.t
        // 位置：二次贝塞尔
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cx + t * t * to.x
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cy + t * t * to.y
        arrow.setPosition(x, y)
        trail.setPosition(x, y)
        // 朝向：弹道切线，让箭头始终指向飞行方向
        const dx = 2 * (1 - t) * (cx - from.x) + 2 * t * (to.x - cx)
        const dy = 2 * (1 - t) * (cy - from.y) + 2 * t * (to.y - cy)
        arrow.setRotation(Math.atan2(dy, dx))
      },
      onComplete: () => {
        // —— 箭"钉"进木桩：把轴心换到箭头(嵌入点)，原位不动 ——
        const rot = arrow.rotation
        const tipX = arrow.x + Math.cos(rot) * 20 // 箭长40、原轴心在中点，箭头在+20
        const tipY = arrow.y + Math.sin(rot) * 20
        arrow.setOrigin(1, 0.5) // 轴心移到箭头尖端
        arrow.setPosition(tipX, tipY)
        trail.stop() // 尾迹不再产生新粒子

        // 尾杆振动：箭杆像刚钉入一样左右甩几下（绕箭头旋转）
        this.scene.tweens.add({
          targets: arrow,
          rotation: rot + 0.09,
          duration: 46,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => arrow.setRotation(rot)
        })

        this.fx.inkSplash(to, 0x1a1a1a, 12)
        SoundFX.thud()
        onHit?.()
        this.hitStop()

        // —— 钉在木桩上停留 0.5s，再淡出消失 ——
        this.scene.time.delayedCall(500, () => {
          trail.destroy()
          if (!arrow.active) return
          this.scene.tweens.add({
            targets: arrow,
            alpha: 0,
            duration: 160,
            onComplete: () => arrow.destroy()
          })
        })
      }
    })
  }

  /* ==================================================================== *
   * 纹理生成：把武器画成 texture（零美术资源的关键）
   * ==================================================================== */
  private ensureTexture(type: WeaponType): void {
    const key = WeaponFX.KEYS[type]
    if (this.scene.textures.exists(key)) return

    const g = this.scene.add.graphics()

    if (type === 'spear') {
      // 长矛：杆 + 红缨 + 银色枪尖，总长 88，握柄在左
      g.fillStyle(0x7a4a21, 1)
      g.fillRect(0, 8, 62, 4) // 矛杆
      g.fillStyle(0xc0392b, 1)
      g.fillCircle(60, 10, 5) // 红缨
      g.fillStyle(0xdcdcdc, 1)
      g.fillTriangle(62, 4, 62, 16, 88, 10) // 枪尖
      g.generateTexture(key, 88, 20)
    } else if (type === 'bow') {
      // 弓：向右开口的"Ｄ"形——弧形弓臂 + 竖直弓弦，40x40
      g.lineStyle(4, 0x7a4a21, 1)
      g.beginPath()
      g.arc(9, 20, 21, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70))
      g.strokePath()
      g.lineStyle(2, 0xd9c9a3, 0.9)
      g.lineBetween(16, 2, 16, 38) // 弓弦
      g.generateTexture(key, 40, 40)
    } else if (type === 'arrow') {
      // 箭：箭杆 + 箭头 + 箭羽，总长 40，中心对齐
      g.lineStyle(3, 0x8a5a2b, 1)
      g.lineBetween(2, 4, 30, 4) // 箭杆
      g.fillStyle(0xdcdcdc, 1)
      g.fillTriangle(28, 0, 28, 8, 40, 4) // 箭头
      g.lineStyle(2, 0xc0392b, 1)
      g.lineBetween(3, 4, 9, 0) // 上箭羽
      g.lineBetween(3, 4, 9, 8) // 下箭羽
      g.generateTexture(key, 40, 8)
    } else if (type === 'blade') {
      // 青龙偃月刀：弯月刀身 + 刀头回钩 + 刀背歧刃(锯齿) + 柄首红缨
      const W = 150
      const H = 60

      // --- 刀柄 ---
      g.fillStyle(0x6b4423, 1)
      g.fillRect(0, 27, 46, 6)

      // --- 刀身（偃月：上下两缘同向弯曲、腹部下坠、刀尖上挑，形如卧月）---
      //   刃口＝下缘大弧（腹部），刀脊＝上缘，刀尖在上（偃月的"月角"）
      const STEPS = 16
      const cutting: number[][] = [] // 刃口（下缘，腹部下坠的优雅大弧）
      const spine: number[][] = [] // 刀脊（上缘，同向微弯）
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS
        // 刃口：从柄端(46,34)到刀尖(132,14)，中部向下坠成弯月腹
        cutting.push([
          46 + (132 - 46) * t,
          34 + (14 - 34) * t + 15 * Math.sin(Math.PI * t)
        ])
        // 刀脊：从刀尖(132,14)回到柄端(46,22)，同向下坠但幅度小
        spine.push([
          132 + (46 - 132) * t,
          14 + (22 - 14) * t + 5 * Math.sin(Math.PI * t)
        ])
      }
      g.fillStyle(0xd8d8d8, 1)
      g.beginPath()
      g.moveTo(cutting[0][0], cutting[0][1])
      for (let i = 1; i < cutting.length; i++) g.lineTo(cutting[i][0], cutting[i][1])
      for (let i = 0; i < spine.length; i++) g.lineTo(spine[i][0], spine[i][1])
      g.closePath()
      g.fillPath()

      // --- 血槽（刀身中线的一道暗痕）---
      g.lineStyle(2, 0x9a9a9a, 0.8)
      g.beginPath()
      g.moveTo(54, 29)
      g.lineTo(114, 20)
      g.strokePath()

      // --- 刀背歧刃：刀脊上的锯齿状利刃（朝上突出，可回拖勾挂）---
      g.fillStyle(0xc9c9c9, 1)
      ;[5, 8, 11].forEach((i) => {
        const [x, y] = spine[i]
        g.fillTriangle(x - 4, y, x + 4, y, x, y - 9)
      })

      // --- 刀头回钩：刀尖(月角)上方向后勾的利钩 ---
      g.fillStyle(0xe8e8e8, 1)
      g.fillTriangle(131, 13, 124, 3, 114, 9)

      // --- 红缨：柄与刀身交接处的红色流苏 ---
      g.fillStyle(0xc0392b, 1)
      g.fillCircle(47, 30, 4) // 缨结
      g.lineStyle(2, 0xc0392b, 1)
      g.lineBetween(47, 33, 40, 47)
      g.lineBetween(48, 33, 44, 48)
      g.lineBetween(49, 34, 49, 49)
      g.lineBetween(46, 33, 37, 44)

      g.generateTexture(key, W, H)
    }

    g.destroy()
  }
}
