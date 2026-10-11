import Phaser from 'phaser'
import { Gem, WuXing } from '@/types'
import { gemNames } from '@/data/equipment/gems'

/**
 * 宝石品阶境界定义
 */
export const GEM_RARITY_LABELS: Record<number, string> = {
  1: '凡品·原石',
  2: '良品·凝晶',
  3: '珍品·灵玉',
  4: '绝品·天魄',
  5: '神品·圣髓'
}

/**
 * 宝石视觉意象与图腾描述
 */
export const GEM_LORE_MAP: Record<WuXing, Record<number, { lore: string; visual: string }>> = {
  metal: {
    1: { lore: '深山老矿初生的庚金原胚，形体钝重未削，破口初现寒芒。', visual: '不规则天然矿岩，铁灰哑光与破口冷银' },
    2: { lore: '经地脉真火洗去凡铁杂质，凝成八面双锥银晶，坚若冷钢。', visual: '规整八面晶柱，清冽冷月银辉' },
    3: { lore: '锋芒通灵化为玉质，色纯如朝阳烁金，折射斩金断玉之锐。', visual: '立面菱形金玉，中心透射十字星芒' },
    4: { lore: '汲取九天太白金星晨昏锐气而成的剑簇金晶，剑气纵横。', visual: '浮空三飞剑晶簇，环绕破军星轮' },
    5: { lore: '西方白虎神兽本命真髓，蕴藏开天辟地杀伐神力，号令万兵。', visual: '皇冠切工全反射神钻，白虎啸天金纹' }
  },
  wood: {
    1: { lore: '深幽林海古石，表面生有自然木藤干络，蕴藏初春生机。', visual: '深苔椭圆卵石，干藤裂纹渗出翠绿' },
    2: { lore: '千秋灵竹所化之晶体，内藏层叠年轮灵脉，青翠欲滴。', visual: '青竹立柱六棱晶，同心年轮灵纹' },
    3: { lore: '纯阳乙木真露凝固而成，正阳浓翠，蕴含枯木逢春之造化。', visual: '如意水滴正阳碧玉，卷草祥云雕纹' },
    4: { lore: '上古通天神树建木不朽灵心，连通天人两界，百木朝宗。', visual: '盛开通灵青莲晶，金色灵脉经络' },
    5: { lore: '东方青龙孟章神君龙魂温养之圣珠，枯荣由心，造化无尽。', visual: '翡翠青龙盘旋托珠，祥云龙魂升腾' }
  },
  water: {
    1: { lore: '寒泉深处常年受冲刷的冷水石，表面湿润经年不干。', visual: '深蓝青灰水磨冷石，晶莹水露光斑' },
    2: { lore: '奔腾流泉瞬间冰封而成的灵晶，静中有动，冰爽剔透。', visual: '凌厉三棱冰晶锥，内封流动水波' },
    3: { lore: '沧海月明珠有泪，吸纳万顷碧波与太阴月华，深邃沉静。', visual: '正圆无瑕明月宝珠，同心水波涟漪' },
    4: { lore: '极北极阴北冥万年玄冰核心，滴水成冰，可冻结千里波涛。', visual: '六芒对称雪花冰轮，层叠森森冰刃' },
    5: { lore: '北方玄武执明神君镇海至宝，海纳百川，镇守万界玄冥。', visual: '灵龟玄蛇交尾护持，镇海坎水玄珠' }
  },
  fire: {
    1: { lore: '火山口边缘喷发之火山石，石皮如炭，缝中微带余烬火星。', visual: '焦黑多棱火成岩，熔岩橙黄裂隙' },
    2: { lore: '纯净离火精矿受地脉高温结晶，色如朱砂石髓，炽烈刺目。', visual: '标准多切面红宝晶，跳跃火苗晶芯' },
    3: { lore: '纯阳血玉吸收大日九阳精芒，如一轮袖珍旭日，驱除万邪。', visual: '中空镂雕大日金乌玉璧，护体赤焰' },
    4: { lore: '天地离火与三昧真火凝练成莲，花开见真性，燃尽尘世业障。', visual: '重瓣琉璃红莲晶，纯金天火喷涌' },
    5: { lore: '南方朱雀神君浴火涅槃遗留的本命神髓，万火臣服，生生不灭。', visual: '朱雀展翅引吭，火羽环抱真火神心' }
  },
  earth: {
    1: { lore: '大岳深处沉淀万年的方解石，土质致密，沉重逾铁。', visual: '方钝厚重泥金沉积石，水平地质层理' },
    2: { lore: '聚八荒厚土之菁英，结成层阶金晶，若微缩重峦，稳重自持。', visual: '阶梯重叠山峦方晶，蜜蜡琥珀金纹' },
    3: { lore: '承载坤道厚德之纯阳玄黄宝玉，坚不可摧，化解万般冲击。', visual: '外方内圆坤卦天地方印，山峦浮雕' },
    4: { lore: '九州名山大岳龙脉地气汇聚而成的金晶群峰，镇压山河。', visual: '五岳拔地而起连峰晶群，金色龙脉' },
    5: { lore: '中土圣兽麒麟吐纳乾坤之无上圣物，聚万土息壤，德载八荒。', visual: '麒麟踏祥云皇家玉玺，九天玄黄法环' }
  }
}

/**
 * 五行宝石程序化矢量纹理渲染器
 */
export class GemIconRenderer {
  private static isInitialized = false

  /**
   * 初始化并注册全套 25 种宝石的图标纹理
   */
  public static init(scene: Phaser.Scene): void {
    if (this.isInitialized && scene.textures.exists('gem_icon_metal_1')) {
      return
    }

    const wuXings: WuXing[] = ['metal', 'wood', 'water', 'fire', 'earth']

    for (const wx of wuXings) {
      for (let level = 1; level <= 5; level++) {
        // 1. 卡片/列表用图标 (48x48)
        const iconKey = `gem_icon_${wx}_${level}`
        this.createTexture(scene, iconKey, 48, 48, (ctx) => {
          this.drawGem(ctx, wx, level, 48, 48, false)
        })

        // 2. 详情面板大徽章 (96x96)
        const largeKey = `gem_large_${wx}_${level}`
        this.createTexture(scene, largeKey, 96, 96, (ctx) => {
          this.drawGem(ctx, wx, level, 96, 96, true)
        })
      }
    }

    this.isInitialized = true
  }

  /**
   * 创建 Canvas 纹理
   */
  private static createTexture(
    scene: Phaser.Scene,
    key: string,
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D) => void
  ): void {
    if (scene.textures.exists(key)) {
      scene.textures.remove(key)
    }

    const canvasTexture = scene.textures.createCanvas(key, width, height)
    if (!canvasTexture) return

    const ctx = canvasTexture.getContext()
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    drawFn(ctx)
    ctx.restore()
    canvasTexture.refresh()
  }

  /**
   * 绘制宝石核心入口
   */
  private static drawGem(
    ctx: CanvasRenderingContext2D,
    wuXing: WuXing,
    level: number,
    w: number,
    h: number,
    isLarge: boolean
  ): void {
    const cx = w / 2
    const cy = h / 2
    const scale = w / 48

    // 1. 背景微光晕染
    this.drawBackgroundGlow(ctx, wuXing, level, cx, cy, scale, isLarge)

    // 2. 根据五行与等级分别绘制主体
    ctx.save()
    switch (wuXing) {
      case 'metal':
        this.drawMetalGem(ctx, level, cx, cy, scale)
        break
      case 'wood':
        this.drawWoodGem(ctx, level, cx, cy, scale)
        break
      case 'water':
        this.drawWaterGem(ctx, level, cx, cy, scale)
        break
      case 'fire':
        this.drawFireGem(ctx, level, cx, cy, scale)
        break
      case 'earth':
        this.drawEarthGem(ctx, level, cx, cy, scale)
        break
    }
    ctx.restore()

    // 3. 高等级外层法环与辉光
    if (level >= 4) {
      this.drawAuraRings(ctx, wuXing, level, cx, cy, scale, isLarge)
    }
  }

  // ==========================================
  // 底光与外环
  // ==========================================

  private static drawBackgroundGlow(
    ctx: CanvasRenderingContext2D,
    wuXing: WuXing,
    level: number,
    cx: number,
    cy: number,
    scale: number,
    isLarge: boolean
  ): void {
    const colors: Record<WuXing, string> = {
      metal: '#eceff1',
      wood: '#81c784',
      water: '#4fc3f7',
      fire: '#ff5252',
      earth: '#ffd54f'
    }

    const baseColor = colors[wuXing]
    const r = (16 + level * 2) * scale
    const grad = ctx.createRadialGradient(cx, cy, 2 * scale, cx, cy, r)
    grad.addColorStop(0, hexToRgba(baseColor, 0.15 + level * 0.05))
    grad.addColorStop(1, hexToRgba(baseColor, 0))

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    // 大图模式下绘制古典八角或圆形水墨底盘
    if (isLarge) {
      ctx.strokeStyle = hexToRgba(baseColor, 0.25)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, 40 * scale, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  private static drawAuraRings(
    ctx: CanvasRenderingContext2D,
    wuXing: WuXing,
    level: number,
    cx: number,
    cy: number,
    scale: number,
    isLarge: boolean
  ): void {
    const ringColors: Record<WuXing, string> = {
      metal: '#ffe082',
      wood: '#69f0ae',
      water: '#40c4ff',
      fire: '#ff6e40',
      earth: '#ffd740'
    }
    const color = ringColors[wuXing]

    // LV4: 虚线破军/星阵光环
    if (level === 4) {
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 1 * scale
      ctx.setLineDash([3 * scale, 3 * scale])
      ctx.beginPath()
      ctx.arc(cx, cy, 20 * scale, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // LV5: 八角金芒神光环
    if (level === 5) {
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2 * scale
      ctx.beginPath()
      ctx.arc(cx, cy, 21 * scale, 0, Math.PI * 2)
      ctx.stroke()

      // 四方星芒
      const len = 23 * scale
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5 * scale
      ctx.beginPath()
      ctx.moveTo(cx, cy - len); ctx.lineTo(cx, cy - len + 3 * scale)
      ctx.moveTo(cx, cy + len); ctx.lineTo(cx, cy + len - 3 * scale)
      ctx.moveTo(cx - len, cy); ctx.lineTo(cx - len + 3 * scale, cy)
      ctx.moveTo(cx + len, cy); ctx.lineTo(cx + len - 3 * scale, cy)
      ctx.stroke()
      ctx.restore()
    }
  }

  // ==========================================
  // 1. 金系宝石绘制（白虎·锐金）
  // ==========================================

  private static drawMetalGem(
    ctx: CanvasRenderingContext2D,
    level: number,
    cx: number,
    cy: number,
    s: number
  ): void {
    switch (level) {
      case 1: {
        // LV1 庚金璞石：粗砺多角原石，暗铁色与冷银破口
        ctx.fillStyle = '#455a64'
        ctx.strokeStyle = '#78909c'
        ctx.lineWidth = 1.5 * s
        ctx.beginPath()
        ctx.moveTo(cx - 10 * s, cy - 8 * s)
        ctx.lineTo(cx + 8 * s, cy - 11 * s)
        ctx.lineTo(cx + 12 * s, cy + 2 * s)
        ctx.lineTo(cx + 6 * s, cy + 11 * s)
        ctx.lineTo(cx - 9 * s, cy + 9 * s)
        ctx.lineTo(cx - 13 * s, cy - 1 * s)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // 破口银刃反光
        ctx.fillStyle = '#cfd8dc'
        ctx.beginPath()
        ctx.moveTo(cx - 4 * s, cy - 2 * s)
        ctx.lineTo(cx + 8 * s, cy - 11 * s)
        ctx.lineTo(cx + 2 * s, cy + 2 * s)
        ctx.closePath()
        ctx.fill()

        ctx.strokeStyle = '#eceff1'
        ctx.lineWidth = 1.2 * s
        ctx.beginPath()
        ctx.moveTo(cx - 2 * s, cy - 4 * s)
        ctx.lineTo(cx + 6 * s, cy - 9 * s)
        ctx.stroke()
        break
      }
      case 2: {
        // LV2 沉银玄晶：规整八面双锥晶，冷月亮银
        ctx.fillStyle = '#607d8b'
        ctx.strokeStyle = '#cfd8dc'
        ctx.lineWidth = 1.5 * s

        // 上半晶体
        ctx.beginPath()
        ctx.moveTo(cx, cy - 14 * s)
        ctx.lineTo(cx + 11 * s, cy)
        ctx.lineTo(cx - 11 * s, cy)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // 下半晶体
        ctx.fillStyle = '#455a64'
        ctx.beginPath()
        ctx.moveTo(cx, cy + 14 * s)
        ctx.lineTo(cx + 11 * s, cy)
        ctx.lineTo(cx - 11 * s, cy)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // 中轴明亮折射
        ctx.fillStyle = '#eceff1'
        ctx.beginPath()
        ctx.moveTo(cx, cy - 14 * s)
        ctx.lineTo(cx, cy + 14 * s)
        ctx.lineTo(cx - 11 * s, cy)
        ctx.closePath()
        ctx.fill()

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.moveTo(cx, cy - 14 * s)
        ctx.lineTo(cx, cy + 14 * s)
        ctx.stroke()
        break
      }
      case 3: {
        // LV3 曜金灵玉：立面菱形金玉，十字璀璨星芒
        ctx.fillStyle = '#ffb300'
        ctx.strokeStyle = '#fff8e1'
        ctx.lineWidth = 1.5 * s

        // 外菱形
        ctx.beginPath()
        ctx.moveTo(cx, cy - 13 * s)
        ctx.lineTo(cx + 13 * s, cy)
        ctx.lineTo(cx, cy + 13 * s)
        ctx.lineTo(cx - 13 * s, cy)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // 内部透光层
        ctx.fillStyle = '#ffd54f'
        ctx.beginPath()
        ctx.moveTo(cx, cy - 8 * s)
        ctx.lineTo(cx + 8 * s, cy)
        ctx.lineTo(cx, cy + 8 * s)
        ctx.lineTo(cx - 8 * s, cy)
        ctx.closePath()
        ctx.fill()

        // 十字星芒
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5 * s
        ctx.beginPath()
        ctx.moveTo(cx, cy - 15 * s); ctx.lineTo(cx, cy + 15 * s)
        ctx.moveTo(cx - 15 * s, cy); ctx.lineTo(cx + 15 * s, cy)
        ctx.stroke()
        break
      }
      case 4: {
        // LV4 太白金魄：三枚利剑晶簇拱卫，悬浮白金罡气
        // 左晶剑
        ctx.fillStyle = '#ffe082'
        ctx.strokeStyle = '#ffb300'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.moveTo(cx - 7 * s, cy - 8 * s)
        ctx.lineTo(cx - 4 * s, cy + 7 * s)
        ctx.lineTo(cx - 12 * s, cy + 3 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 右晶剑
        ctx.beginPath()
        ctx.moveTo(cx + 7 * s, cy - 8 * s)
        ctx.lineTo(cx + 12 * s, cy + 3 * s)
        ctx.lineTo(cx + 4 * s, cy + 7 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 中央主神剑晶
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#ffc107'
        ctx.lineWidth = 1.5 * s
        ctx.beginPath()
        ctx.moveTo(cx, cy - 15 * s)
        ctx.lineTo(cx + 5 * s, cy + 9 * s)
        ctx.lineTo(cx, cy + 13 * s)
        ctx.lineTo(cx - 5 * s, cy + 9 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 剑脊流光
        ctx.strokeStyle = '#ffeb3b'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.moveTo(cx, cy - 14 * s)
        ctx.lineTo(cx, cy + 11 * s)
        ctx.stroke()
        break
      }
      case 5: {
        // LV5 白虎神髓：皇冠金钻，白虎神印与八道斩天剑羽
        // 皇冠切工钻石外廓
        ctx.fillStyle = '#fffde7'
        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 1.8 * s

        ctx.beginPath()
        ctx.moveTo(cx, cy - 14 * s)
        ctx.lineTo(cx + 12 * s, cy - 5 * s)
        ctx.lineTo(cx + 8 * s, cy + 12 * s)
        ctx.lineTo(cx - 8 * s, cy + 12 * s)
        ctx.lineTo(cx - 12 * s, cy - 5 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 切面折线
        ctx.strokeStyle = '#ffe082'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.moveTo(cx - 7 * s, cy - 5 * s); ctx.lineTo(cx + 7 * s, cy - 5 * s)
        ctx.lineTo(cx, cy + 12 * s); ctx.lineTo(cx - 7 * s, cy - 5 * s)
        ctx.stroke()

        // 白虎额纹与王道神印
        ctx.strokeStyle = '#b78103'
        ctx.lineWidth = 1.5 * s
        ctx.beginPath()
        ctx.moveTo(cx - 3 * s, cy - 1 * s); ctx.lineTo(cx + 3 * s, cy - 1 * s)
        ctx.moveTo(cx - 4 * s, cy + 3 * s); ctx.lineTo(cx + 4 * s, cy + 3 * s)
        ctx.moveTo(cx, cy - 3 * s); ctx.lineTo(cx, cy + 5 * s)
        ctx.stroke()
        break
      }
    }
  }

  // ==========================================
  // 2. 木系宝石绘制（青龙·苍木）
  // ==========================================

  private static drawWoodGem(
    ctx: CanvasRenderingContext2D,
    level: number,
    cx: number,
    cy: number,
    s: number
  ): void {
    switch (level) {
      case 1: {
        // LV1 青藤原石：椭圆深苔卵石，天然藤蔓裂痕
        ctx.fillStyle = '#2e4c2f'
        ctx.strokeStyle = '#4caf50'
        ctx.lineWidth = 1.5 * s
        ctx.beginPath()
        ctx.ellipse(cx, cy, 11 * s, 10 * s, 0.2, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()

        // 表面生机嫩绿裂痕
        ctx.strokeStyle = '#81c784'
        ctx.lineWidth = 1.2 * s
        ctx.beginPath()
        ctx.moveTo(cx - 6 * s, cy - 4 * s)
        ctx.quadraticCurveTo(cx - 1 * s, cy + 1 * s, cx + 5 * s, cy - 2 * s)
        ctx.quadraticCurveTo(cx + 2 * s, cy + 5 * s, cx - 3 * s, cy + 7 * s)
        ctx.stroke()
        break
      }
      case 2: {
        // LV2 碧罗凝晶：立柱六棱青竹节，同心年轮
        ctx.fillStyle = '#388e3c'
        ctx.strokeStyle = '#a5d6a7'
        ctx.lineWidth = 1.5 * s

        ctx.beginPath()
        ctx.moveTo(cx, cy - 13 * s)
        ctx.lineTo(cx + 9 * s, cy - 6 * s)
        ctx.lineTo(cx + 9 * s, cy + 7 * s)
        ctx.lineTo(cx, cy + 13 * s)
        ctx.lineTo(cx - 9 * s, cy + 7 * s)
        ctx.lineTo(cx - 9 * s, cy - 6 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 中轴竹节晶线
        ctx.fillStyle = '#4caf50'
        ctx.beginPath()
        ctx.moveTo(cx, cy - 13 * s)
        ctx.lineTo(cx + 9 * s, cy - 6 * s)
        ctx.lineTo(cx, cy)
        ctx.lineTo(cx - 9 * s, cy - 6 * s)
        ctx.closePath()
        ctx.fill()

        ctx.strokeStyle = '#c8e6c9'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.moveTo(cx - 9 * s, cy); ctx.lineTo(cx + 9 * s, cy)
        ctx.stroke()
        break
      }
      case 3: {
        // LV3 苍灵翡翠：水滴如意玉佩，正阳浓翠
        ctx.fillStyle = '#1b5e20'
        ctx.strokeStyle = '#81c784'
        ctx.lineWidth = 1.6 * s

        // 水滴玉佩外形
        ctx.beginPath()
        ctx.moveTo(cx, cy - 13 * s)
        ctx.bezierCurveTo(cx + 10 * s, cy - 5 * s, cx + 12 * s, cy + 8 * s, cx, cy + 13 * s)
        ctx.bezierCurveTo(cx - 12 * s, cy + 8 * s, cx - 10 * s, cy - 5 * s, cx, cy - 13 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 内部温润翡翠光斑与如意卷纹
        ctx.fillStyle = '#4caf50'
        ctx.beginPath()
        ctx.ellipse(cx, cy + 3 * s, 6 * s, 6 * s, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#c8e6c9'
        ctx.lineWidth = 1.2 * s
        ctx.beginPath()
        ctx.arc(cx, cy + 2 * s, 3 * s, 0, Math.PI * 1.5)
        ctx.stroke()
        break
      }
      case 4: {
        // LV4 建木灵魄：通灵青莲晶体，金色灵脉经络
        ctx.fillStyle = '#047857'
        ctx.strokeStyle = '#6ee7b7'
        ctx.lineWidth = 1.5 * s

        // 莲花重瓣
        ctx.beginPath()
        ctx.moveTo(cx, cy - 14 * s)
        ctx.quadraticCurveTo(cx + 11 * s, cy - 1 * s, cx, cy + 13 * s)
        ctx.quadraticCurveTo(cx - 11 * s, cy - 1 * s, cx, cy - 14 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 金色树木经脉
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 1.2 * s
        ctx.beginPath()
        ctx.moveTo(cx, cy - 10 * s); ctx.lineTo(cx, cy + 9 * s)
        ctx.moveTo(cx, cy - 2 * s); ctx.lineTo(cx - 5 * s, cy - 6 * s)
        ctx.moveTo(cx, cy - 2 * s); ctx.lineTo(cx + 5 * s, cy - 6 * s)
        ctx.moveTo(cx, cy + 3 * s); ctx.lineTo(cx - 6 * s, cy + 1 * s)
        ctx.moveTo(cx, cy + 3 * s); ctx.lineTo(cx + 6 * s, cy + 1 * s)
        ctx.stroke()
        break
      }
      case 5: {
        // LV5 青龙圣珠：盘龙环抱至尊龙珠，苍翠瑞气
        // 核心浑圆龙珠
        ctx.fillStyle = '#00e676'
        ctx.strokeStyle = '#b9f6ca'
        ctx.lineWidth = 1.5 * s
        ctx.beginPath()
        ctx.arc(cx, cy, 9 * s, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()

        // 环绕盘龙身躯与龙首
        ctx.strokeStyle = '#2e7d32'
        ctx.lineWidth = 2.5 * s
        ctx.beginPath()
        ctx.arc(cx, cy, 12 * s, -Math.PI * 0.8, Math.PI * 0.7)
        ctx.stroke()

        // 龙首与龙角金色点缀
        ctx.fillStyle = '#fbbf24'
        ctx.beginPath()
        ctx.arc(cx + 9 * s, cy - 8 * s, 2.5 * s, 0, Math.PI * 2)
        ctx.fill()

        // 龙珠内部白绿高光
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(cx - 2 * s, cy - 2 * s, 3 * s, 0, Math.PI * 2)
        ctx.fill()
        break
      }
    }
  }

  // ==========================================
  // 3. 水系宝石绘制（玄武·玄水）
  // ==========================================

  private static drawWaterGem(
    ctx: CanvasRenderingContext2D,
    level: number,
    cx: number,
    cy: number,
    s: number
  ): void {
    switch (level) {
      case 1: {
        // LV1 凝露水石：扁平水磨冷石，水膜露珠
        ctx.fillStyle = '#1e3a5f'
        ctx.strokeStyle = '#0288d1'
        ctx.lineWidth = 1.5 * s
        ctx.beginPath()
        ctx.ellipse(cx, cy, 12 * s, 9 * s, 0, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()

        // 水润反光与露珠
        ctx.fillStyle = '#80d8ff'
        ctx.beginPath()
        ctx.arc(cx - 3 * s, cy - 2 * s, 2 * s, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#b3e5fc'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.arc(cx, cy - 1 * s, 7 * s, -Math.PI * 0.8, -Math.PI * 0.2)
        ctx.stroke()
        break
      }
      case 2: {
        // LV2 流泉寒晶：三棱冰晶锥，内部流动水波
        ctx.fillStyle = '#0277bd'
        ctx.strokeStyle = '#40c4ff'
        ctx.lineWidth = 1.5 * s

        // 主冰晶锥
        ctx.beginPath()
        ctx.moveTo(cx, cy - 13 * s)
        ctx.lineTo(cx + 10 * s, cy + 11 * s)
        ctx.lineTo(cx - 10 * s, cy + 11 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 棱面折射
        ctx.fillStyle = '#039be5'
        ctx.beginPath()
        ctx.moveTo(cx, cy - 13 * s)
        ctx.lineTo(cx, cy + 11 * s)
        ctx.lineTo(cx - 10 * s, cy + 11 * s)
        ctx.closePath()
        ctx.fill()

        // 内流波浪
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.moveTo(cx - 4 * s, cy + 2 * s)
        ctx.quadraticCurveTo(cx, cy - 1 * s, cx + 4 * s, cy + 2 * s)
        ctx.stroke()
        break
      }
      case 3: {
        // LV3 沧海明珠：深海夜明宝珠，同心水波涟漪
        // 外涟漪
        ctx.strokeStyle = '#00bcd4'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.arc(cx, cy, 14 * s, 0, Math.PI * 2)
        ctx.stroke()

        // 皎洁明珠
        ctx.fillStyle = '#006064'
        ctx.strokeStyle = '#80deea'
        ctx.lineWidth = 1.6 * s
        ctx.beginPath()
        ctx.arc(cx, cy, 9 * s, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()

        // 月华蔚蓝晕彩
        ctx.fillStyle = '#e0f7fa'
        ctx.beginPath()
        ctx.arc(cx - 2.5 * s, cy - 2.5 * s, 3 * s, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 4: {
        // LV4 玄冥冰魄：六角对称雪花冰轮，层叠冰刃
        ctx.fillStyle = '#0288d1'
        ctx.strokeStyle = '#e1f5fe'
        ctx.lineWidth = 1.2 * s

        // 六方冰刃
        for (let i = 0; i < 6; i++) {
          const rad = (i * Math.PI) / 3
          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(rad)
          ctx.beginPath()
          ctx.moveTo(0, -14 * s)
          ctx.lineTo(3 * s, -6 * s)
          ctx.lineTo(0, -2 * s)
          ctx.lineTo(-3 * s, -6 * s)
          ctx.closePath()
          ctx.fill(); ctx.stroke()
          ctx.restore()
        }

        // 冰心纯白
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(cx, cy, 3 * s, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 5: {
        // LV5 玄武神珠：玄武灵龟与蛇合抱，镇海巨珠
        // 核心水滴宝珠
        ctx.fillStyle = '#0077b6'
        ctx.strokeStyle = '#90e0ef'
        ctx.lineWidth = 1.6 * s

        ctx.beginPath()
        ctx.moveTo(cx, cy - 13 * s)
        ctx.bezierCurveTo(cx + 10 * s, cy - 3 * s, cx + 10 * s, cy + 9 * s, cx, cy + 13 * s)
        ctx.bezierCurveTo(cx - 10 * s, cy + 9 * s, cx - 10 * s, cy - 3 * s, cx, cy - 13 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 龟甲六边灵符
        ctx.strokeStyle = '#caf0f8'
        ctx.lineWidth = 1.2 * s
        ctx.beginPath()
        ctx.moveTo(cx, cy - 3 * s)
        ctx.lineTo(cx + 4 * s, cy)
        ctx.lineTo(cx + 4 * s, cy + 5 * s)
        ctx.lineTo(cx, cy + 8 * s)
        ctx.lineTo(cx - 4 * s, cy + 5 * s)
        ctx.lineTo(cx - 4 * s, cy)
        ctx.closePath()
        ctx.stroke()

        // 水滴高光
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(cx - 3 * s, cy - 4 * s, 2 * s, 0, Math.PI * 2)
        ctx.fill()
        break
      }
    }
  }

  // ==========================================
  // 4. 火系宝石绘制（朱雀·离火）
  // ==========================================

  private static drawFireGem(
    ctx: CanvasRenderingContext2D,
    level: number,
    cx: number,
    cy: number,
    s: number
  ): void {
    switch (level) {
      case 1: {
        // LV1 炽火砂石：焦炭黑石，熔岩橙黄裂隙
        ctx.fillStyle = '#3e2723'
        ctx.strokeStyle = '#d32f2f'
        ctx.lineWidth = 1.5 * s

        ctx.beginPath()
        ctx.moveTo(cx - 11 * s, cy - 7 * s)
        ctx.lineTo(cx + 7 * s, cy - 10 * s)
        ctx.lineTo(cx + 11 * s, cy + 3 * s)
        ctx.lineTo(cx + 4 * s, cy + 10 * s)
        ctx.lineTo(cx - 8 * s, cy + 8 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 岩浆裂纹
        ctx.strokeStyle = '#ff5722'
        ctx.lineWidth = 1.5 * s
        ctx.beginPath()
        ctx.moveTo(cx - 5 * s, cy - 3 * s)
        ctx.lineTo(cx, cy + 2 * s)
        ctx.lineTo(cx + 6 * s, cy)
        ctx.moveTo(cx, cy + 2 * s)
        ctx.lineTo(cx - 2 * s, cy + 7 * s)
        ctx.stroke()

        // 火星金点
        ctx.fillStyle = '#ffeb3b'
        ctx.beginPath()
        ctx.arc(cx, cy + 2 * s, 1.5 * s, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 2: {
        // LV2 熔火赤晶：标准多面红宝石，跳跃火苗晶心
        ctx.fillStyle = '#c62828'
        ctx.strokeStyle = '#ff8a80'
        ctx.lineWidth = 1.5 * s

        // 宝石外切面
        ctx.beginPath()
        ctx.moveTo(cx, cy - 13 * s)
        ctx.lineTo(cx + 12 * s, cy - 4 * s)
        ctx.lineTo(cx + 8 * s, cy + 12 * s)
        ctx.lineTo(cx - 8 * s, cy + 12 * s)
        ctx.lineTo(cx - 12 * s, cy - 4 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 内层亮红面
        ctx.fillStyle = '#e53935'
        ctx.beginPath()
        ctx.moveTo(cx, cy - 7 * s)
        ctx.lineTo(cx + 6 * s, cy)
        ctx.lineTo(cx, cy + 8 * s)
        ctx.lineTo(cx - 6 * s, cy)
        ctx.closePath()
        ctx.fill()

        // 中心金黄火苗
        ctx.fillStyle = '#ffeb3b'
        ctx.beginPath()
        ctx.arc(cx, cy, 2 * s, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 3: {
        // LV3 炎阳赤玉：中空金乌圆润玉璧，护体烈火
        // 外圈圆璧
        ctx.fillStyle = '#b71c1c'
        ctx.strokeStyle = '#ff5252'
        ctx.lineWidth = 1.6 * s
        ctx.beginPath()
        ctx.arc(cx, cy, 11 * s, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()

        // 内空与大日金乌
        ctx.fillStyle = '#ffab00'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.arc(cx, cy, 4 * s, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()

        // 四方赤焰芒
        ctx.strokeStyle = '#ff1744'
        ctx.lineWidth = 1.5 * s
        ctx.beginPath()
        ctx.moveTo(cx, cy - 14 * s); ctx.lineTo(cx, cy - 11 * s)
        ctx.moveTo(cx, cy + 14 * s); ctx.lineTo(cx, cy + 11 * s)
        ctx.moveTo(cx - 14 * s, cy); ctx.lineTo(cx - 11 * s, cy)
        ctx.moveTo(cx + 14 * s, cy); ctx.lineTo(cx + 11 * s, cy)
        ctx.stroke()
        break
      }
      case 4: {
        // LV4 三昧天火魄：琉璃红莲真晶，纯阳金焰喷涌
        ctx.fillStyle = '#d50000'
        ctx.strokeStyle = '#ff6e40'
        ctx.lineWidth = 1.5 * s

        // 莲花主瓣
        ctx.beginPath()
        ctx.moveTo(cx, cy - 14 * s)
        ctx.quadraticCurveTo(cx + 11 * s, cy - 3 * s, cx + 8 * s, cy + 10 * s)
        ctx.quadraticCurveTo(cx, cy + 14 * s, cx - 8 * s, cy + 10 * s)
        ctx.quadraticCurveTo(cx - 11 * s, cy - 3 * s, cx, cy - 14 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 内瓣火红
        ctx.fillStyle = '#ff3d00'
        ctx.beginPath()
        ctx.moveTo(cx, cy - 8 * s)
        ctx.lineTo(cx + 5 * s, cy + 6 * s)
        ctx.lineTo(cx - 5 * s, cy + 6 * s)
        ctx.closePath()
        ctx.fill()

        // 三昧金焰核心
        ctx.fillStyle = '#fff176'
        ctx.beginPath()
        ctx.arc(cx, cy + 1 * s, 2.5 * s, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 5: {
        // LV5 朱雀神髓：朱雀展翅引吭，火羽环抱真火神心
        // 朱雀双翼展翅廓
        ctx.fillStyle = '#b91c1c'
        ctx.strokeStyle = '#f87171'
        ctx.lineWidth = 1.6 * s

        ctx.beginPath()
        ctx.moveTo(cx, cy - 6 * s)
        ctx.quadraticCurveTo(cx + 14 * s, cy - 12 * s, cx + 11 * s, cy + 3 * s)
        ctx.quadraticCurveTo(cx, cy + 14 * s, cx - 11 * s, cy + 3 * s)
        ctx.quadraticCurveTo(cx - 14 * s, cy - 12 * s, cx, cy - 6 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 朱雀神禽金冠
        ctx.fillStyle = '#fef08a'
        ctx.beginPath()
        ctx.moveTo(cx, cy - 12 * s)
        ctx.lineTo(cx + 2 * s, cy - 7 * s)
        ctx.lineTo(cx - 2 * s, cy - 7 * s)
        ctx.closePath()
        ctx.fill()

        // 纯阳真火神心
        ctx.fillStyle = '#dc2626'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.arc(cx, cy + 3 * s, 4 * s, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()
        break
      }
    }
  }

  // ==========================================
  // 5. 土系宝石绘制（麒麟·皇土）
  // ==========================================

  private static drawEarthGem(
    ctx: CanvasRenderingContext2D,
    level: number,
    cx: number,
    cy: number,
    s: number
  ): void {
    switch (level) {
      case 1: {
        // LV1 厚土砾石：方钝泥金沉积岩，层理明显
        ctx.fillStyle = '#4e342e'
        ctx.strokeStyle = '#8d6e63'
        ctx.lineWidth = 1.5 * s

        ctx.beginPath()
        ctx.moveTo(cx - 10 * s, cy - 8 * s)
        ctx.lineTo(cx + 9 * s, cy - 7 * s)
        ctx.lineTo(cx + 11 * s, cy + 8 * s)
        ctx.lineTo(cx - 8 * s, cy + 10 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 地质沉积层线
        ctx.strokeStyle = '#bcaaa4'
        ctx.lineWidth = 1.2 * s
        ctx.beginPath()
        ctx.moveTo(cx - 9 * s, cy - 1 * s); ctx.lineTo(cx + 9 * s, cy)
        ctx.moveTo(cx - 7 * s, cy + 4 * s); ctx.lineTo(cx + 10 * s, cy + 5 * s)
        ctx.stroke()
        break
      }
      case 2: {
        // LV2 赭岩灵晶：阶梯山峦方晶，蜜蜡琥珀
        ctx.fillStyle = '#ff8f00'
        ctx.strokeStyle = '#ffe082'
        ctx.lineWidth = 1.5 * s

        // 第一阶大方体
        ctx.beginPath()
        ctx.rect(cx - 10 * s, cy - 3 * s, 20 * s, 14 * s)
        ctx.fill(); ctx.stroke()

        // 第二阶小方体
        ctx.fillStyle = '#ffa000'
        ctx.beginPath()
        ctx.rect(cx - 7 * s, cy - 10 * s, 14 * s, 8 * s)
        ctx.fill(); ctx.stroke()

        // 重岩地脉金折射
        ctx.fillStyle = '#ffecb3'
        ctx.beginPath()
        ctx.rect(cx - 4 * s, cy - 8 * s, 3 * s, 4 * s)
        ctx.fill()
        break
      }
      case 3: {
        // LV3 玄黄古玉：外方内圆坤卦方印，玄黄古玉
        ctx.fillStyle = '#f57f17'
        ctx.strokeStyle = '#fff9c4'
        ctx.lineWidth = 1.6 * s

        // 外方印
        ctx.beginPath()
        ctx.rect(cx - 11 * s, cy - 11 * s, 22 * s, 22 * s)
        ctx.fill(); ctx.stroke()

        // 内圆璧
        ctx.fillStyle = '#ffb300'
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1 * s
        ctx.beginPath()
        ctx.arc(cx, cy, 6 * s, 0, Math.PI * 2)
        ctx.fill(); ctx.stroke()

        // 坤卦符刻（上下断横）
        ctx.strokeStyle = '#4e342e'
        ctx.lineWidth = 1.2 * s
        ctx.beginPath()
        ctx.moveTo(cx - 3 * s, cy - 2 * s); ctx.lineTo(cx - 1 * s, cy - 2 * s)
        ctx.moveTo(cx + 1 * s, cy - 2 * s); ctx.lineTo(cx + 3 * s, cy - 2 * s)
        ctx.moveTo(cx - 3 * s, cy + 2 * s); ctx.lineTo(cx - 1 * s, cy + 2 * s)
        ctx.moveTo(cx + 1 * s, cy + 2 * s); ctx.lineTo(cx + 3 * s, cy + 2 * s)
        ctx.stroke()
        break
      }
      case 4: {
        // LV4 万岳龙魄：五岳连峰微缩金晶，金色龙脉
        ctx.fillStyle = '#e65100'
        ctx.strokeStyle = '#fff59d'
        ctx.lineWidth = 1.2 * s

        // 左峰
        ctx.beginPath()
        ctx.moveTo(cx - 10 * s, cy + 10 * s)
        ctx.lineTo(cx - 6 * s, cy - 4 * s)
        ctx.lineTo(cx - 2 * s, cy + 10 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 右峰
        ctx.beginPath()
        ctx.moveTo(cx + 2 * s, cy + 10 * s)
        ctx.lineTo(cx + 6 * s, cy - 4 * s)
        ctx.lineTo(cx + 10 * s, cy + 10 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 中央大主峰
        ctx.fillStyle = '#ff8f00'
        ctx.strokeStyle = '#ffd54f'
        ctx.lineWidth = 1.5 * s
        ctx.beginPath()
        ctx.moveTo(cx - 6 * s, cy + 11 * s)
        ctx.lineTo(cx, cy - 14 * s)
        ctx.lineTo(cx + 6 * s, cy + 11 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 龙脉金基座
        ctx.fillStyle = '#ffe082'
        ctx.beginPath()
        ctx.rect(cx - 11 * s, cy + 9 * s, 22 * s, 3 * s)
        ctx.fill()
        break
      }
      case 5: {
        // LV5 麒麟圣玉：八角皇家天子玉玺，麒麟踏云祥兽印
        ctx.fillStyle = '#d97706'
        ctx.strokeStyle = '#fef3c7'
        ctx.lineWidth = 1.8 * s

        // 八角大印外廓
        ctx.beginPath()
        ctx.moveTo(cx - 5 * s, cy - 13 * s)
        ctx.lineTo(cx + 5 * s, cy - 13 * s)
        ctx.lineTo(cx + 13 * s, cy - 5 * s)
        ctx.lineTo(cx + 13 * s, cy + 5 * s)
        ctx.lineTo(cx + 5 * s, cy + 13 * s)
        ctx.lineTo(cx - 5 * s, cy + 13 * s)
        ctx.lineTo(cx - 13 * s, cy + 5 * s)
        ctx.lineTo(cx - 13 * s, cy - 5 * s)
        ctx.closePath()
        ctx.fill(); ctx.stroke()

        // 麒麟祥云底纹
        ctx.strokeStyle = '#fef08a'
        ctx.lineWidth = 1.2 * s
        ctx.beginPath()
        ctx.arc(cx - 4 * s, cy + 4 * s, 3 * s, 0, Math.PI)
        ctx.arc(cx + 4 * s, cy + 4 * s, 3 * s, 0, Math.PI)
        ctx.stroke()

        // 仁兽麒麟金首
        ctx.fillStyle = '#fffbeb'
        ctx.beginPath()
        ctx.arc(cx, cy - 3 * s, 4 * s, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#b45309'
        ctx.beginPath()
        ctx.arc(cx, cy - 3 * s, 1.5 * s, 0, Math.PI * 2)
        ctx.fill()
        break
      }
    }
  }
}

/**
 * 辅助函数：HEX 转 RGBA 字符串
 */
function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '')
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('')
  }
  const num = parseInt(c, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r},${g},${b},${alpha})`
}
