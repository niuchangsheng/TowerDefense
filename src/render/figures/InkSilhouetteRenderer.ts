import Phaser from 'phaser'

/**
 * 水墨战阵兵人与冷兵器武姿程序化矢量纹理渲染器
 * 纯代码基于 HTML5 Canvas 绘制，零外部图片依赖，高清晰度矢量缩放
 */
export class InkSilhouetteRenderer {
  private static isInitialized = false

  /**
   * 初始化并注册全套水墨剪影纹理
   */
  public static init(scene: Phaser.Scene): void {
    if (this.isInitialized && scene.textures.exists('ink_troop_spearman')) {
      return
    }

    // 1. 注册兵种剪影 (64x64)
    this.createTexture(scene, 'ink_troop_spearman', 64, 64, (ctx, w, h) => this.drawSpearman(ctx, w, h))
    this.createTexture(scene, 'ink_troop_archer', 64, 64, (ctx, w, h) => this.drawArcher(ctx, w, h))
    this.createTexture(scene, 'ink_troop_cavalry', 64, 64, (ctx, w, h) => this.drawCavalry(ctx, w, h))
    this.createTexture(scene, 'ink_troop_swordsman', 64, 64, (ctx, w, h) => this.drawSwordsman(ctx, w, h))

    // 2. 注册敌军剪影 (64x64 / 80x80)
    this.createTexture(scene, 'ink_enemy_scout', 64, 64, (ctx, w, h) => this.drawEnemyScout(ctx, w, h))
    this.createTexture(scene, 'ink_enemy_elite', 64, 64, (ctx, w, h) => this.drawEnemyElite(ctx, w, h))
    this.createTexture(scene, 'ink_enemy_boss', 80, 80, (ctx, w, h) => this.drawEnemyBoss(ctx, w, h))

    // 3. 注册神将剪影 (72x72)
    this.createTexture(scene, 'ink_hero_zhaoyun', 72, 72, (ctx, w, h) => this.drawHeroZhaoYun(ctx, w, h))
    this.createTexture(scene, 'ink_hero_guanyu', 72, 72, (ctx, w, h) => this.drawHeroGuanYu(ctx, w, h))
    this.createTexture(scene, 'ink_hero_zhangfei', 72, 72, (ctx, w, h) => this.drawHeroZhangFei(ctx, w, h))
    this.createTexture(scene, 'ink_hero_huangzhong', 72, 72, (ctx, w, h) => this.drawHeroHuangZhong(ctx, w, h))
    this.createTexture(scene, 'ink_hero_machao', 72, 72, (ctx, w, h) => this.drawHeroMaChao(ctx, w, h))
    this.createTexture(scene, 'ink_hero_generic', 72, 72, (ctx, w, h) => this.drawHeroGeneric(ctx, w, h))

    // 4. 注册五行微芒灵魄 (32x32)
    this.createTexture(scene, 'ink_wisp_fire', 32, 32, (ctx, w, h) => this.drawWispFire(ctx, w, h))
    this.createTexture(scene, 'ink_wisp_water', 32, 32, (ctx, w, h) => this.drawWispWater(ctx, w, h))
    this.createTexture(scene, 'ink_wisp_wood', 32, 32, (ctx, w, h) => this.drawWispWood(ctx, w, h))
    this.createTexture(scene, 'ink_wisp_metal', 32, 32, (ctx, w, h) => this.drawWispMetal(ctx, w, h))
    this.createTexture(scene, 'ink_wisp_earth', 32, 32, (ctx, w, h) => this.drawWispEarth(ctx, w, h))

    this.isInitialized = true
  }

  private static createTexture(
    scene: Phaser.Scene,
    key: string,
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  ): void {
    if (scene.textures.exists(key)) {
      scene.textures.remove(key)
    }

    const canvasTexture = scene.textures.createCanvas(key, width, height)
    if (!canvasTexture) return

    const ctx = canvasTexture.getContext()
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    drawFn(ctx, width, height)
    ctx.restore()
    canvasTexture.refresh()
  }

  private static safeEllipse(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number = 0
  ): void {
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2)
    } else {
      ctx.save()
      ctx.translate(x, y)
      if (rotation !== 0) ctx.rotate(rotation)
      ctx.scale(1, ry / (rx || 1))
      ctx.arc(0, 0, rx, 0, Math.PI * 2)
      ctx.restore()
    }
  }

  // ==========================================
  // 1. 兵种剪影 (Spearman, Archer, Cavalry, Swordsman)
  // ==========================================

  /**
   * 枪兵：马步稳扎，双手持长枪斜刺，鲜红枪缨与寒芒枪刃
   */
  private static drawSpearman(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 4
    const cy = h / 2 + 2

    // 地面水墨微晕
    ctx.fillStyle = 'rgba(40, 32, 28, 0.15)'
    ctx.beginPath()
    this.safeEllipse(ctx, cx, cy + 24, 16, 4)
    ctx.fill()

    // 墨黑甲士双腿（稳实马步）
    ctx.strokeStyle = '#231d19'
    ctx.lineWidth = 4.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 5, cy + 8)
    ctx.lineTo(cx - 13, cy + 23)
    ctx.moveTo(cx + 4, cy + 8)
    ctx.lineTo(cx + 12, cy + 23)
    ctx.stroke()

    // 躯干皮甲与甲片横纹
    ctx.fillStyle = '#231d19'
    ctx.beginPath()
    ctx.moveTo(cx - 9, cy - 8)
    ctx.lineTo(cx + 9, cy - 8)
    ctx.lineTo(cx + 11, cy + 10)
    ctx.lineTo(cx - 11, cy + 10)
    ctx.closePath()
    ctx.fill()

    // 金铜束带
    ctx.strokeStyle = '#a0782f'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 10, cy + 1)
    ctx.lineTo(cx + 10, cy + 1)
    ctx.stroke()

    // 头部与兜鍪（头盔）
    ctx.fillStyle = '#231d19'
    ctx.beginPath()
    ctx.arc(cx, cy - 18, 7.5, 0, Math.PI * 2)
    ctx.fill()
    // 铜盔顶尖
    ctx.fillStyle = '#a0782f'
    ctx.beginPath()
    ctx.moveTo(cx - 4, cy - 20)
    ctx.lineTo(cx + 4, cy - 20)
    ctx.lineTo(cx, cy - 26)
    ctx.closePath()
    ctx.fill()

    // 双臂执枪
    ctx.strokeStyle = '#231d19'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy - 4)
    ctx.lineTo(cx + 2, cy - 2)
    ctx.stroke()

    // 长枪杆（深木色穿过身体斜指右上方）
    ctx.strokeStyle = '#4a3728'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - 20, cy + 22)
    ctx.lineTo(cx + 28, cy - 22)
    ctx.stroke()

    // 鲜红枪缨
    ctx.fillStyle = '#b2362e'
    ctx.beginPath()
    ctx.arc(cx + 21, cy - 15, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#7e1e17'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 寒光枪头（双刃菱形枪尖）
    ctx.fillStyle = '#f0f4f8'
    ctx.strokeStyle = '#231d19'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx + 23, cy - 17)
    ctx.lineTo(cx + 31, cy - 25)
    ctx.lineTo(cx + 27, cy - 28)
    ctx.lineTo(cx + 19, cy - 20)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  /**
   * 弓兵：侧身立定，挽弓如满月，雕翎箭待发
   */
  private static drawArcher(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 2
    const cy = h / 2 + 2

    // 阴影
    ctx.fillStyle = 'rgba(40, 32, 28, 0.15)'
    ctx.beginPath()
    this.safeEllipse(ctx, cx, cy + 24, 14, 4)
    ctx.fill()

    // 双腿（侧身开立）
    ctx.strokeStyle = '#231d19'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 4, cy + 8)
    ctx.lineTo(cx - 9, cy + 23)
    ctx.moveTo(cx + 2, cy + 8)
    ctx.lineTo(cx + 10, cy + 23)
    ctx.stroke()

    // 躯干与背上箭袋
    ctx.fillStyle = '#231d19'
    ctx.beginPath()
    ctx.moveTo(cx - 7, cy - 7)
    ctx.lineTo(cx + 7, cy - 7)
    ctx.lineTo(cx + 9, cy + 10)
    ctx.lineTo(cx - 9, cy + 10)
    ctx.closePath()
    ctx.fill()

    // 箭袋与羽箭露出
    ctx.strokeStyle = '#a0782f'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cx - 10, cy + 2)
    ctx.lineTo(cx - 16, cy - 14)
    ctx.stroke()
    // 箭羽
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 16, cy - 14)
    ctx.lineTo(cx - 19, cy - 20)
    ctx.moveTo(cx - 14, cy - 13)
    ctx.lineTo(cx - 16, cy - 19)
    ctx.stroke()

    // 头部（带帻巾）
    ctx.fillStyle = '#231d19'
    ctx.beginPath()
    ctx.arc(cx, cy - 17, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#5c4d3c'
    ctx.beginPath()
    ctx.arc(cx - 1, cy - 18, 7.5, Math.PI, Math.PI * 2)
    ctx.fill()

    // 弯弓与弓弦（反曲木弓）
    ctx.strokeStyle = '#5a3d28'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx + 14, cy - 4, 20, -Math.PI * 0.42, Math.PI * 0.42)
    ctx.stroke()

    // 弓弦（拉紧弦线）
    ctx.strokeStyle = 'rgba(230, 230, 230, 0.85)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(cx + 19, cy - 21)
    ctx.lineTo(cx + 3, cy - 4) // 弦被拉至手心
    ctx.lineTo(cx + 19, cy + 13)
    ctx.stroke()

    // 搭在弦上的箭矢
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx + 3, cy - 4)
    ctx.lineTo(cx + 28, cy - 4)
    ctx.stroke()
    // 箭簇
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.moveTo(cx + 28, cy - 7)
    ctx.lineTo(cx + 32, cy - 4)
    ctx.lineTo(cx + 28, cy - 1)
    ctx.closePath()
    ctx.fill()
  }

  /**
   * 骑兵：战马昂首扬蹄，铁骑横槊冲锋
   */
  private static drawCavalry(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 2
    const cy = h / 2 + 4

    // 扬蹄阴影
    ctx.fillStyle = 'rgba(40, 32, 28, 0.15)'
    ctx.beginPath()
    this.safeEllipse(ctx, cx - 4, cy + 22, 22, 5)
    ctx.fill()

    // 战马身躯（水墨俊马轮廓）
    ctx.fillStyle = '#2c221c'
    ctx.beginPath()
    // 马身中段
    this.safeEllipse(ctx, cx - 4, cy + 4, 16, 10, -0.15)
    ctx.fill()

    // 马颈与马头（扬起）
    ctx.beginPath()
    ctx.moveTo(cx + 4, cy)
    ctx.lineTo(cx + 15, cy - 16)
    ctx.lineTo(cx + 24, cy - 12)
    ctx.lineTo(cx + 12, cy + 6)
    ctx.closePath()
    ctx.fill()

    // 飞扬马鬃
    ctx.strokeStyle = '#18120e'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx + 10, cy - 6)
    ctx.lineTo(cx + 7, cy - 12)
    ctx.moveTo(cx + 14, cy - 12)
    ctx.lineTo(cx + 10, cy - 18)
    ctx.stroke()

    // 马前蹄（前扬）与后蹄（蹬地）
    ctx.strokeStyle = '#2c221c'
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    // 前蹄扬起
    ctx.moveTo(cx + 10, cy + 10)
    ctx.lineTo(cx + 18, cy + 17)
    ctx.lineTo(cx + 22, cy + 12)
    // 后蹄蹬地
    ctx.moveTo(cx - 14, cy + 10)
    ctx.lineTo(cx - 18, cy + 23)
    ctx.stroke()

    // 马上骑士
    ctx.fillStyle = '#1e1814'
    ctx.beginPath()
    ctx.moveTo(cx - 6, cy - 10)
    ctx.lineTo(cx + 5, cy - 10)
    ctx.lineTo(cx + 6, cy + 2)
    ctx.lineTo(cx - 7, cy + 2)
    ctx.closePath()
    ctx.fill()

    // 骑士头盔
    ctx.beginPath()
    ctx.arc(cx - 1, cy - 18, 6.5, 0, Math.PI * 2)
    ctx.fill()

    // 冲锋长矛横握
    ctx.strokeStyle = '#4a3728'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - 22, cy - 8)
    ctx.lineTo(cx + 30, cy - 8)
    ctx.stroke()
    // 矛尖
    ctx.fillStyle = '#f0f4f8'
    ctx.beginPath()
    ctx.moveTo(cx + 30, cy - 11)
    ctx.lineTo(cx + 36, cy - 8)
    ctx.lineTo(cx + 30, cy - 5)
    ctx.closePath()
    ctx.fill()
  }

  /**
   * 刀盾兵：手持圆形藤牌与环首刀，坚如磐石
   */
  private static drawSwordsman(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 2
    const cy = h / 2 + 2

    // 阴影
    ctx.fillStyle = 'rgba(40, 32, 28, 0.15)'
    ctx.beginPath()
    this.safeEllipse(ctx, cx, cy + 24, 16, 4)
    ctx.fill()

    // 双腿
    ctx.strokeStyle = '#231d19'
    ctx.lineWidth = 4.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 6, cy + 8)
    ctx.lineTo(cx - 12, cy + 23)
    ctx.moveTo(cx + 3, cy + 8)
    ctx.lineTo(cx + 10, cy + 23)
    ctx.stroke()

    // 重装铁甲躯干
    ctx.fillStyle = '#231d19'
    ctx.fillRect(cx - 10, cy - 8, 20, 18)

    // 头部重盔
    ctx.beginPath()
    ctx.arc(cx, cy - 17, 7.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#a0782f'
    ctx.fillRect(cx - 6, cy - 18, 12, 3)

    // 左侧持藤牌（圆形藤编盾牌）
    ctx.fillStyle = '#5c452d'
    ctx.strokeStyle = '#a0782f'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx - 12, cy + 1, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // 盾面藤条旋涡
    ctx.strokeStyle = '#3e2e1e'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx - 12, cy + 1, 7, 0, Math.PI * 2)
    ctx.stroke()

    // 右侧手持环首刀（扬起待斩）
    ctx.strokeStyle = '#4a3728'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx + 7, cy - 2)
    ctx.lineTo(cx + 15, cy - 8)
    ctx.stroke()

    // 刀身（钢色刀刃）
    ctx.fillStyle = '#e2e8f0'
    ctx.strokeStyle = '#231d19'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx + 15, cy - 8)
    ctx.lineTo(cx + 25, cy - 24)
    ctx.lineTo(cx + 28, cy - 22)
    ctx.lineTo(cx + 18, cy - 6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // 环首
    ctx.strokeStyle = '#a0782f'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx + 5, cy, 3, 0, Math.PI * 2)
    ctx.stroke()
  }

  // ==========================================
  // 2. 敌军剪影 (Scout, Elite, Boss)
  // ==========================================

  /**
   * 黄巾小卒/斥候：系鲜亮黄巾带，手持朴刀前倾行军
   */
  private static drawEnemyScout(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 2
    const cy = h / 2 + 2

    // 阴影
    ctx.fillStyle = 'rgba(40, 32, 28, 0.15)'
    ctx.beginPath()
    this.safeEllipse(ctx, cx, cy + 24, 14, 4)
    ctx.fill()

    // 双腿行军迈步（前倾）
    ctx.strokeStyle = '#28201a'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 3, cy + 8)
    ctx.lineTo(cx - 11, cy + 23)
    ctx.moveTo(cx + 4, cy + 8)
    ctx.lineTo(cx + 13, cy + 21)
    ctx.stroke()

    // 麻布粗衣躯干
    ctx.fillStyle = '#32261e'
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy - 7)
    ctx.lineTo(cx + 9, cy - 5)
    ctx.lineTo(cx + 11, cy + 10)
    ctx.lineTo(cx - 9, cy + 10)
    ctx.closePath()
    ctx.fill()

    // 头部与标志性黄巾
    ctx.fillStyle = '#28201a'
    ctx.beginPath()
    ctx.arc(cx + 2, cy - 16, 7.5, 0, Math.PI * 2)
    ctx.fill()

    // 黄巾包头布（明亮姜黄色）
    ctx.fillStyle = '#d49b29'
    ctx.beginPath()
    ctx.arc(cx + 2, cy - 18, 8, Math.PI * 0.85, Math.PI * 2.15)
    ctx.fill()
    // 飘拂的黄巾带尾
    ctx.strokeStyle = '#d49b29'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - 5, cy - 16)
    ctx.lineTo(cx - 15, cy - 13)
    ctx.lineTo(cx - 18, cy - 8)
    ctx.stroke()

    // 手持短朴刀
    ctx.strokeStyle = '#28201a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx + 6, cy - 2)
    ctx.lineTo(cx + 16, cy + 4)
    ctx.stroke()

    // 刀身微弯
    ctx.fillStyle = '#cbd5e1'
    ctx.strokeStyle = '#28201a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx + 16, cy + 4)
    ctx.quadraticCurveTo(cx + 26, cy - 4, cx + 24, cy - 16)
    ctx.lineTo(cx + 21, cy - 15)
    ctx.quadraticCurveTo(cx + 22, cy - 3, cx + 15, cy + 6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  /**
   * 黄巾精英首领：魁梧重躯，背负血色令旗，巨斧横挥
   */
  private static drawEnemyElite(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 2
    const cy = h / 2 + 1

    // 阴影
    ctx.fillStyle = 'rgba(40, 32, 28, 0.22)'
    ctx.beginPath()
    this.safeEllipse(ctx, cx, cy + 25, 18, 5)
    ctx.fill()

    // 背插血色小战旗
    ctx.strokeStyle = '#3e2723'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy + 2)
    ctx.lineTo(cx - 18, cy - 25)
    ctx.stroke()
    ctx.fillStyle = '#b2362e'
    ctx.beginPath()
    ctx.moveTo(cx - 18, cy - 25)
    ctx.lineTo(cx - 2, cy - 18)
    ctx.lineTo(cx - 14, cy - 12)
    ctx.closePath()
    ctx.fill()

    // 粗壮双腿
    ctx.strokeStyle = '#211813'
    ctx.lineWidth = 5.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 5, cy + 8)
    ctx.lineTo(cx - 13, cy + 24)
    ctx.moveTo(cx + 5, cy + 8)
    ctx.lineTo(cx + 14, cy + 24)
    ctx.stroke()

    // 宽厚躯干甲铠
    ctx.fillStyle = '#211813'
    ctx.fillRect(cx - 12, cy - 8, 24, 19)

    // 蛮角战盔
    ctx.beginPath()
    ctx.arc(cx, cy - 17, 8.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#d49b29'
    ctx.fillRect(cx - 9, cy - 19, 18, 4) // 黄巾额带

    // 双牛角角饰
    ctx.strokeStyle = '#a0782f'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx - 7, cy - 20)
    ctx.quadraticCurveTo(cx - 14, cy - 24, cx - 13, cy - 30)
    ctx.moveTo(cx + 7, cy - 20)
    ctx.quadraticCurveTo(cx + 14, cy - 24, cx + 13, cy - 30)
    ctx.stroke()

    // 双手重战斧
    ctx.strokeStyle = '#3e2e24'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(cx - 4, cy + 18)
    ctx.lineTo(cx + 22, cy - 16)
    ctx.stroke()
    // 巨大月牙斧刃
    ctx.fillStyle = '#cbd5e1'
    ctx.strokeStyle = '#211813'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx + 16, cy - 10)
    ctx.quadraticCurveTo(cx + 30, cy - 22, cx + 22, cy - 26)
    ctx.lineTo(cx + 18, cy - 18)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  /**
   * 敌军 Boss（天公将军·张角）：宽大道袍流苏，雷火法杖，周身暗墨气旋
   */
  private static drawEnemyBoss(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2
    const cy = h / 2 + 2

    // 煞气黑雾光圈
    const grad = ctx.createRadialGradient(cx, cy + 10, 10, cx, cy + 10, 32)
    grad.addColorStop(0, 'rgba(178, 54, 46, 0.25)')
    grad.addColorStop(1, 'rgba(30, 20, 16, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy + 10, 32, 0, Math.PI * 2)
    ctx.fill()

    // 宽大飘逸的道袍大氅（黄色道符墨染）
    ctx.fillStyle = '#1c1510'
    ctx.beginPath()
    ctx.moveTo(cx - 12, cy - 12)
    ctx.lineTo(cx + 12, cy - 12)
    ctx.lineTo(cx + 24, cy + 28)
    ctx.lineTo(cx - 24, cy + 28)
    ctx.closePath()
    ctx.fill()

    // 道袍金色符文滚边
    ctx.strokeStyle = '#d49b29'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 22, cy + 28)
    ctx.lineTo(cx, cy - 10)
    ctx.lineTo(cx + 22, cy + 28)
    ctx.stroke()

    // 头部道冠与长须
    ctx.fillStyle = '#1c1510'
    ctx.beginPath()
    ctx.arc(cx, cy - 20, 9, 0, Math.PI * 2)
    ctx.fill()

    // 飘逸长须
    ctx.strokeStyle = '#dedede'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 3, cy - 14)
    ctx.quadraticCurveTo(cx - 5, cy - 2, cx - 2, cy + 4)
    ctx.moveTo(cx + 3, cy - 14)
    ctx.quadraticCurveTo(cx + 5, cy - 2, cx + 2, cy + 4)
    ctx.stroke()

    // 黄巾法冠
    ctx.fillStyle = '#d49b29'
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy - 22)
    ctx.lineTo(cx + 8, cy - 22)
    ctx.lineTo(cx + 5, cy - 30)
    ctx.lineTo(cx - 5, cy - 30)
    ctx.closePath()
    ctx.fill()

    // 九节雷火天公仗
    ctx.strokeStyle = '#a0782f'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx + 18, cy + 28)
    ctx.lineTo(cx + 18, cy - 32)
    ctx.stroke()
    // 仗端龙头环与雷火宝珠
    ctx.strokeStyle = '#b2362e'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(cx + 18, cy - 32, 6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.arc(cx + 18, cy - 32, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // ==========================================
  // 3. 神将剪影 (Zhao Yun, Guan Yu, Zhang Fei, Generic)
  // ==========================================

  /**
   * 赵云：白袍银甲，双龙腾跃之姿，斜持亮银龙胆枪
   */
  private static drawHeroZhaoYun(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 2
    const cy = h / 2 + 3

    // 飘逸白袍披风（水墨碧蓝里衬）
    ctx.fillStyle = '#254a70'
    ctx.beginPath()
    ctx.moveTo(cx - 10, cy - 14)
    ctx.quadraticCurveTo(cx - 24, cy + 4, cx - 20, cy + 24)
    ctx.lineTo(cx - 8, cy + 18)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.moveTo(cx - 9, cy - 14)
    ctx.quadraticCurveTo(cx - 20, cy + 2, cx - 17, cy + 22)
    ctx.lineTo(cx - 8, cy + 17)
    ctx.closePath()
    ctx.fill()

    // 银铠双腿
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 4.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 5, cy + 8)
    ctx.lineTo(cx - 11, cy + 24)
    ctx.moveTo(cx + 4, cy + 8)
    ctx.lineTo(cx + 12, cy + 24)
    ctx.stroke()

    // 银色龙鳞铠甲
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(cx - 10, cy - 10, 20, 20)
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(cx - 7, cy - 7, 14, 14)

    // 亮银凤翅盔
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    ctx.arc(cx, cy - 19, 8, 0, Math.PI * 2)
    ctx.fill()
    // 白羽盔缨
    ctx.strokeStyle = '#f8fafc'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - 1, cy - 25)
    ctx.quadraticCurveTo(cx - 8, cy - 31, cx - 14, cy - 27)
    ctx.stroke()

    // 龙胆亮银枪（耀眼银芒斜跨）
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - 24, cy + 24)
    ctx.lineTo(cx + 28, cy - 26)
    ctx.stroke()

    // 双刃银枪尖
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(cx + 28, cy - 26)
    ctx.lineTo(cx + 34, cy - 32)
    ctx.lineTo(cx + 31, cy - 34)
    ctx.lineTo(cx + 24, cy - 29)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  /**
   * 关羽：青袍美髯，手提青龙偃月刀，威震华夏
   */
  private static drawHeroGuanYu(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 4
    const cy = h / 2 + 2

    // 墨绿战袍下摆
    ctx.fillStyle = '#1e3a2b'
    ctx.beginPath()
    ctx.moveTo(cx - 12, cy - 10)
    ctx.lineTo(cx + 12, cy - 10)
    ctx.lineTo(cx + 16, cy + 24)
    ctx.lineTo(cx - 14, cy + 24)
    ctx.closePath()
    ctx.fill()

    // 金甲吞兽护心镜
    ctx.fillStyle = '#a0782f'
    ctx.beginPath()
    ctx.arc(cx, cy - 2, 6, 0, Math.PI * 2)
    ctx.fill()

    // 头部重盔与标志性长髯（五虎美髯公）
    ctx.fillStyle = '#17251d'
    ctx.beginPath()
    ctx.arc(cx, cy - 18, 8, 0, Math.PI * 2)
    ctx.fill()

    // 三绺美髯（黑亮飘逸长胡须垂至胸前）
    ctx.strokeStyle = '#0f1712'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - 2, cy - 13)
    ctx.quadraticCurveTo(cx - 4, cy - 2, cx - 3, cy + 9)
    ctx.moveTo(cx + 2, cy - 13)
    ctx.quadraticCurveTo(cx + 4, cy - 2, cx + 3, cy + 9)
    ctx.stroke()

    // 青龙偃月刀（雄伟立于身后）
    ctx.strokeStyle = '#3e2723'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(cx + 10, cy + 26)
    ctx.lineTo(cx + 18, cy - 30)
    ctx.stroke()

    // 偃月巨型大刀身
    ctx.fillStyle = '#e2e8f0'
    ctx.strokeStyle = '#1e3a2b'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx + 18, cy - 16)
    ctx.quadraticCurveTo(cx + 34, cy - 26, cx + 24, cy - 38)
    ctx.lineTo(cx + 16, cy - 30)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // 龙纹吞口
    ctx.fillStyle = '#a0782f'
    ctx.beginPath()
    ctx.arc(cx + 18, cy - 17, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  /**
   * 张飞：狂须怒目，双臂力贯丈八蛇矛，猛张飞霸气
   */
  private static drawHeroZhangFei(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 2
    const cy = h / 2 + 2

    // 烈火红绦战裙
    ctx.fillStyle = '#7f1d1d'
    ctx.beginPath()
    ctx.moveTo(cx - 12, cy - 8)
    ctx.lineTo(cx + 12, cy - 8)
    ctx.lineTo(cx + 15, cy + 24)
    ctx.lineTo(cx - 15, cy + 24)
    ctx.closePath()
    ctx.fill()

    // 粗犷魁梧躯干
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(cx - 13, cy - 12, 26, 20)

    // 狂放张扬的落腮虎须
    ctx.fillStyle = '#0c0a09'
    ctx.beginPath()
    ctx.arc(cx, cy - 18, 9, 0, Math.PI * 2)
    ctx.fill()
    // 钢针倒竖胡须
    ctx.strokeStyle = '#0c0a09'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy - 14)
    ctx.lineTo(cx - 14, cy - 12)
    ctx.moveTo(cx + 8, cy - 14)
    ctx.lineTo(cx + 14, cy - 12)
    ctx.moveTo(cx - 5, cy - 10)
    ctx.lineTo(cx - 11, cy - 4)
    ctx.moveTo(cx + 5, cy - 10)
    ctx.lineTo(cx + 11, cy - 4)
    ctx.stroke()

    // 丈八蛇矛（弯曲蛇形矛尖）
    ctx.strokeStyle = '#292524'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(cx - 24, cy + 24)
    ctx.lineTo(cx + 26, cy - 24)
    ctx.stroke()

    // 蛇形曲折矛刃
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx + 26, cy - 24)
    ctx.lineTo(cx + 29, cy - 27)
    ctx.lineTo(cx + 27, cy - 29)
    ctx.lineTo(cx + 32, cy - 33)
    ctx.stroke()
  }

  /**
   * 黄忠：烈火老将，白须皓首，沉稳马步挽雕弓如满月，金矢烈焰蓄势待发
   */
  private static drawHeroHuangZhong(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 2
    const cy = h / 2 + 2

    // 烈火赤霞披风（深红水墨）
    ctx.fillStyle = '#7f1d1d'
    ctx.beginPath()
    ctx.moveTo(cx - 10, cy - 12)
    ctx.quadraticCurveTo(cx - 22, cy + 6, cx - 18, cy + 24)
    ctx.lineTo(cx - 6, cy + 18)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#b91c1c'
    ctx.beginPath()
    ctx.moveTo(cx - 9, cy - 12)
    ctx.quadraticCurveTo(cx - 18, cy + 4, cx - 15, cy + 22)
    ctx.lineTo(cx - 6, cy + 17)
    ctx.closePath()
    ctx.fill()

    // 双腿（稳健开弓侧立步）
    ctx.strokeStyle = '#1c1917'
    ctx.lineWidth = 4.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx - 6, cy + 8)
    ctx.lineTo(cx - 14, cy + 24)
    ctx.moveTo(cx + 3, cy + 8)
    ctx.lineTo(cx + 12, cy + 24)
    ctx.stroke()

    // 胴甲与玄铁胸甲
    ctx.fillStyle = '#292524'
    ctx.fillRect(cx - 11, cy - 10, 22, 19)
    ctx.fillStyle = '#b45309'
    ctx.beginPath()
    ctx.arc(cx - 1, cy - 1, 5, 0, Math.PI * 2)
    ctx.fill()

    // 头部重盔与白须老将
    ctx.fillStyle = '#1c1917'
    ctx.beginPath()
    ctx.arc(cx - 1, cy - 18, 7.5, 0, Math.PI * 2)
    ctx.fill()
    // 老将皓首白须（飘逸长长白胡须）
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.moveTo(cx - 1, cy - 13)
    ctx.quadraticCurveTo(cx - 3, cy - 3, cx - 5, cy + 8)
    ctx.moveTo(cx + 2, cy - 13)
    ctx.quadraticCurveTo(cx + 1, cy - 4, cx - 2, cy + 7)
    ctx.stroke()

    // 雕弓弓臂（紫铜曲木）
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx + 18, cy - 28)
    ctx.quadraticCurveTo(cx + 26, cy, cx + 18, cy + 28)
    ctx.stroke()

    // 金丝弓弦（拉满至腮侧）
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(cx + 18, cy - 28)
    ctx.lineTo(cx + 3, cy - 2)
    ctx.lineTo(cx + 18, cy + 28)
    ctx.stroke()

    // 烈焰金羽箭（搭在弓弦上向右前方瞄准）
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx + 2, cy - 2)
    ctx.lineTo(cx + 28, cy - 2)
    ctx.stroke()
    // 箭簇与火芒
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.moveTo(cx + 28, cy - 4)
    ctx.lineTo(cx + 33, cy - 2)
    ctx.lineTo(cx + 28, cy)
    ctx.closePath()
    ctx.fill()
  }

  /**
   * 马超：锦马超西凉骑将，白袍银甲金束带，狮蛮银盔，紧握虎头湛金枪
   */
  private static drawHeroMaChao(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2 - 2
    const cy = h / 2 + 2

    // 西凉白袍（金黄滚边）
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.moveTo(cx - 10, cy - 12)
    ctx.lineTo(cx + 10, cy - 12)
    ctx.lineTo(cx + 16, cy + 24)
    ctx.lineTo(cx - 16, cy + 24)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 亮银铠甲与兽面吞头护胸
    ctx.fillStyle = '#334155'
    ctx.fillRect(cx - 10, cy - 10, 20, 18)
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(cx - 7, cy - 8, 14, 14)
    // 黄金兽面吞头
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.arc(cx, cy - 1, 5, 0, Math.PI * 2)
    ctx.fill()

    // 锦面狮蛮银盔
    ctx.fillStyle = '#334155'
    ctx.beginPath()
    ctx.arc(cx, cy - 18, 8, 0, Math.PI * 2)
    ctx.fill()
    // 飘扬的西凉白羽长缨
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineWidth = 3.5
    ctx.beginPath()
    ctx.moveTo(cx, cy - 25)
    ctx.quadraticCurveTo(cx - 10, cy - 32, cx - 18, cy - 26)
    ctx.stroke()

    // 虎头湛金枪（斜横冲阵之势）
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - 24, cy + 25)
    ctx.lineTo(cx + 26, cy - 25)
    ctx.stroke()

    // 虎头吞口与金锐枪尖
    ctx.fillStyle = '#d97706'
    ctx.beginPath()
    ctx.arc(cx + 24, cy - 23, 4, 0, Math.PI * 2)
    ctx.fill()
    // 湛金枪尖（锋芒破甲）
    ctx.fillStyle = '#fbbf24'
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx + 25, cy - 24)
    ctx.lineTo(cx + 33, cy - 32)
    ctx.lineTo(cx + 31, cy - 34)
    ctx.lineTo(cx + 23, cy - 27)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  /**
   * 通用将领：大将风度，佩宝剑与将领羽冠
   */
  private static drawHeroGeneric(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2
    const cy = h / 2 + 2

    // 披风
    ctx.fillStyle = '#a0782f'
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy - 10)
    ctx.lineTo(cx - 18, cy + 22)
    ctx.lineTo(cx + 18, cy + 22)
    ctx.lineTo(cx + 8, cy - 10)
    ctx.closePath()
    ctx.fill()

    // 躯干
    ctx.fillStyle = '#231d19'
    ctx.fillRect(cx - 10, cy - 10, 20, 20)

    // 头盔
    ctx.beginPath()
    ctx.arc(cx, cy - 18, 7.5, 0, Math.PI * 2)
    ctx.fill()

    // 宝剑
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(cx - 14, cy + 18)
    ctx.lineTo(cx + 18, cy - 14)
    ctx.stroke()
  }

  // ==========================================
  // 4. 五行微芒灵魄 (Fire, Water, Wood, Metal, Earth)
  // ==========================================

  private static drawWispFire(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2
    const cy = h / 2
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(cx, cy + 2, 5, 0, Math.PI)
    ctx.quadraticCurveTo(cx - 4, cy - 4, cx, cy - 8)
    ctx.quadraticCurveTo(cx + 4, cy - 4, cx + 5, cy + 2)
    ctx.fill()
    ctx.fillStyle = '#fef08a'
    ctx.beginPath()
    ctx.arc(cx, cy + 1, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  private static drawWispWater(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2
    const cy = h / 2
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.arc(cx, cy + 2, 5, 0, Math.PI)
    ctx.quadraticCurveTo(cx + 5, cy - 2, cx, cy - 8)
    ctx.quadraticCurveTo(cx - 5, cy - 2, cx - 5, cy + 2)
    ctx.fill()
    ctx.fillStyle = '#e0f2fe'
    ctx.beginPath()
    ctx.arc(cx - 1, cy + 1, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  private static drawWispWood(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2
    const cy = h / 2
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    this.safeEllipse(ctx, cx, cy, 6, 3, -0.6)
    ctx.fill()
    ctx.fillStyle = '#86efac'
    ctx.beginPath()
    this.safeEllipse(ctx, cx, cy - 1, 3.5, 1.5, -0.6)
    ctx.fill()
  }

  private static drawWispMetal(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2
    const cy = h / 2
    ctx.fillStyle = '#eab308'
    ctx.beginPath()
    ctx.moveTo(cx, cy - 7)
    ctx.lineTo(cx + 6, cy)
    ctx.lineTo(cx, cy + 7)
    ctx.lineTo(cx - 6, cy)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  private static drawWispEarth(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const cx = w / 2
    const cy = h / 2
    ctx.fillStyle = '#b45309'
    ctx.beginPath()
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}
