import Phaser from 'phaser'
import { TerrainType, TerrainArea } from '@/types'
import { TERRAIN_CONFIGS, getTerrainConfig } from '@/config/terrain.config'
import { InkColor, InkText, inkText } from '@/ui/InkTheme'

/**
 * 水墨山水地形渲染器（宋代青绿山水与舆图风格）
 * 
 * 依循《千里江山图》与《富春山居图》笔意：
 * - 山脉：无边界生硬框线，自宣纸中自然拔起。层峦叠嶂、斧劈皴擦、石青石绿矿物晕染、
 *         腰岚云气盘旋缠绕、崖顶古松与烽燧台、钤盖朱砂小印「嶺」。
 * - 河流：南北/东西向自然蜿蜒流动水体，渐变碧绿深邃水色，两岸浅渚沙洲与卵石，
 *         马远《水图》流动波纹，渚头芦荻，钤盖朱砂小印「川」。
 * - 森林：彻底移除生硬圆角矩形灰底，以自然墨点与苔色晕染为底，苍老虬曲古松（品字形茂密松云）
 *         与修竹幽篁错落分布，林下浮霭游动，钤盖朱砂小印「林」。
 */
export class TerrainRenderer {
  private scene: Phaser.Scene
  private tileSize: number = 256
  private terrainGroup: Phaser.GameObjects.Group

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.terrainGroup = scene.add.group()
  }

  /**
   * 渲染地形区域
   */
  renderTerrainAreas(areas: TerrainArea[], _mapWidth: number, _mapHeight: number): void {
    this.terrainGroup.clear(true, true)

    areas.forEach(area => {
      this.renderArea(area)
    })
  }

  /**
   * 渲染单个地形区域
   */
  private renderArea(area: TerrainArea): void {
    // 平原草地直接由宣纸底色承担
    if (area.type === 'grass') {
      return
    }

    this.drawInkTerrainArea(area)
  }

  /**
   * 水墨程序绘制地形区域
   */
  private drawInkTerrainArea(area: TerrainArea): void {
    const g = this.scene.add.graphics()
    g.setDepth(1)

    const rand = this.makeRand(area.area.x * 7919 + area.area.y * 104729 + area.area.width * 31)

    switch (area.type) {
      case 'mountain':
        this.drawMountains(g, area, rand)
        break
      case 'river':
        this.drawRiver(g, area, rand)
        break
      case 'forest':
        this.drawForest(g, area, rand)
        break
      case 'swamp':
        this.drawSwamp(g, area, rand)
        break
      default:
        this.drawGenericWash(g, area)
        break
    }

    this.terrainGroup.add(g)
  }

  /**
   * 山地：宋代青绿水墨群峦（无外框，自然崛起）
   */
  private drawMountains(
    g: Phaser.GameObjects.Graphics,
    area: TerrainArea,
    _rand: () => number
  ): void {
    const { x, y, width, height } = area.area
    const baseY = y + height

    // 1. 远岫层（极淡墨青远山，柔和圆弧山丘起伏，两端贴地）
    g.fillStyle(0x283838, 0.12)
    g.beginPath()
    g.moveTo(x - 20, baseY)
    this.drawBezier(g, x - 20, baseY, x + width * 0.15, y + height * 0.35, x + width * 0.25, y + height * 0.16, x + width * 0.38, y + height * 0.20)
    this.drawBezier(g, x + width * 0.38, y + height * 0.20, x + width * 0.50, y + height * 0.26, x + width * 0.65, y + height * 0.14, x + width * 0.78, y + height * 0.22)
    this.drawBezier(g, x + width * 0.78, y + height * 0.22, x + width * 0.90, y + height * 0.35, x + width + 10, y + height * 0.70, x + width + 20, baseY)
    g.closePath()
    g.fillPath()

    // 2. 中景主峰群（三峰耸立：西峰、主峰、东峰）
    const peaks = [
      // 西峰
      {
        leftX: x - 10,
        apexX: x + width * 0.22,
        apexY: y + height * 0.22,
        rightX: x + width * 0.48,
        ridgeY: y + height * 0.45
      },
      // 主峰（最高雄奇）
      {
        leftX: x + width * 0.18,
        apexX: x + width * 0.50,
        apexY: y + 4,
        rightX: x + width * 0.84,
        ridgeY: y + height * 0.38
      },
      // 东峰
      {
        leftX: x + width * 0.54,
        apexX: x + width * 0.78,
        apexY: y + height * 0.26,
        rightX: x + width + 15,
        ridgeY: y + height * 0.48
      }
    ]

    for (const pk of peaks) {
      // 山体墨底
      g.fillStyle(0x222e2a, 0.32)
      g.beginPath()
      g.moveTo(pk.leftX, baseY)
      g.lineTo(pk.apexX, pk.apexY)
      g.lineTo(pk.rightX, baseY)
      g.closePath()
      g.fillPath()

      // 阳坡（左侧）：石绿矿物晕染（仿《千里江山图》青绿重彩）
      g.fillStyle(0x356852, 0.42)
      g.beginPath()
      g.moveTo(pk.leftX, baseY)
      const midLX = (pk.leftX + pk.apexX) / 2 - 8
      const midLY = (baseY + pk.apexY) / 2
      g.lineTo(midLX, midLY)
      g.lineTo(pk.apexX, pk.apexY)
      g.lineTo(pk.apexX - 4, pk.apexY + 14)
      g.lineTo(pk.apexX - (pk.apexX - pk.leftX) * 0.25, baseY)
      g.closePath()
      g.fillPath()

      // 峰头抹石青（深蓝矿物色）
      g.fillStyle(0x205268, 0.35)
      g.beginPath()
      g.moveTo(pk.apexX - 18, pk.apexY + 22)
      g.lineTo(pk.apexX, pk.apexY)
      g.lineTo(pk.apexX + 10, pk.apexY + 16)
      g.closePath()
      g.fillPath()

      // 阴坡（右侧）：深浓墨色
      g.fillStyle(0x16221c, 0.45)
      g.beginPath()
      g.moveTo(pk.apexX, pk.apexY)
      const midRX = (pk.apexX + pk.rightX) / 2 + 6
      const midRY = (pk.apexY + baseY) / 2 - 8
      g.lineTo(midRX, midRY)
      g.lineTo(pk.rightX, baseY)
      g.lineTo(pk.apexX + (pk.rightX - pk.apexX) * 0.15, baseY)
      g.closePath()
      g.fillPath()

      // 斧劈皴擦墨笔（刚劲直率之斜笔）
      g.lineStyle(1.4, 0x121a15, 0.55)
      for (let s = 1; s <= 4; s++) {
        const sx = pk.apexX + s * 9
        const sy = pk.apexY + s * 16
        g.beginPath()
        g.moveTo(sx, sy)
        g.lineTo(sx + 14, sy + 20)
        g.strokePath()
      }
    }

    // 3. 岚烟流云（多团柔美白云环绕谷间，不直切山体）
    g.fillStyle(0xf6efe4, 0.78)
    // 左谷云团
    g.fillEllipse(x + width * 0.35, baseY - height * 0.30, width * 0.24, 16)
    g.fillEllipse(x + width * 0.28, baseY - height * 0.26, width * 0.18, 14)
    // 右谷云团
    g.fillEllipse(x + width * 0.68, baseY - height * 0.32, width * 0.25, 16)
    g.fillEllipse(x + width * 0.75, baseY - height * 0.24, width * 0.18, 14)
    // 山脚轻岚
    g.fillStyle(0xf6efe4, 0.60)
    g.fillEllipse(x + width * 0.50, baseY - 8, width * 0.45, 12)

    // 4. 主峰之巅烽燧古台（战火警报哨台）
    const beaconX = peaks[1].apexX + 2
    const beaconY = peaks[1].apexY - 1
    // 石质基座
    g.fillStyle(0x382c22, 0.95)
    g.fillRect(beaconX - 6, beaconY, 12, 7)
    // 烽燧石齿
    g.fillRect(beaconX - 6, beaconY - 3, 3.5, 3)
    g.fillRect(beaconX + 2.5, beaconY - 3, 3.5, 3)
    // 烽火铜盆火焰
    g.fillStyle(0xe87a20, 0.95)
    g.fillCircle(beaconX, beaconY - 3.5, 2.2)
    g.fillStyle(0xf5ba2a, 0.95)
    g.fillCircle(beaconX, beaconY - 4, 1.2)

    // 5. 西峰悬崖古松
    const pineX = peaks[0].apexX - 10
    const pineY = peaks[0].apexY + 22
    g.lineStyle(2.2, 0x1c1611, 0.9)
    g.beginPath()
    g.moveTo(pineX, pineY)
    g.lineTo(pineX - 10, pineY - 8)
    g.lineTo(pineX - 18, pineY - 6)
    g.strokePath()
    // 松云
    g.fillStyle(0x19281b, 0.9)
    g.fillEllipse(pineX - 19, pineY - 8, 9, 4.5)
    g.fillEllipse(pineX - 11, pineY - 11, 7, 3.5)

    // 6. 钤盖朱砂小印「嶺」
    this.drawMiniSeal(x + width - 14, y + 18, '嶺')
  }

  /**
   * 河流：沧浪清溪 · 碧水连波
   */
  private drawRiver(
    g: Phaser.GameObjects.Graphics,
    area: TerrainArea,
    _rand: () => number
  ): void {
    const { x, y, width, height } = area.area
    const isVertical = height >= width

    if (isVertical) {
      // 竖向河流（如第一关穿过战场的东来之水）
      const steps = 16
      const dy = height / steps

      const leftBank: { x: number; y: number }[] = []
      const rightBank: { x: number; y: number }[] = []

      for (let i = 0; i <= steps; i++) {
        const cy = y + i * dy
        const wobble1 = Math.sin((cy - y) / 45) * 12 + Math.cos((cy - y) / 80) * 5
        const wobble2 = Math.sin((cy - y) / 50 + 1.2) * 10 + Math.cos((cy - y) / 95) * 6
        leftBank.push({ x: x + 8 + wobble1, y: cy })
        rightBank.push({ x: x + width - 8 + wobble2, y: cy })
      }

      // 1. 清溪水体底层（青碧水色）
      g.fillStyle(0x23526d, 0.40)
      g.beginPath()
      g.moveTo(leftBank[0].x, leftBank[0].y)
      for (let i = 1; i < leftBank.length; i++) {
        g.lineTo(leftBank[i].x, leftBank[i].y)
      }
      for (let i = rightBank.length - 1; i >= 0; i--) {
        g.lineTo(rightBank[i].x, rightBank[i].y)
      }
      g.closePath()
      g.fillPath()

      // 2. 中泓深流水色（沉凝深蓝墨色）
      g.fillStyle(0x163445, 0.35)
      g.beginPath()
      g.moveTo(x + width * 0.36, y)
      for (let i = 1; i < leftBank.length; i++) {
        const cy = y + i * dy
        const wobble = Math.sin((cy - y) / 45) * 8
        g.lineTo(x + width * 0.36 + wobble, cy)
      }
      for (let i = rightBank.length - 1; i >= 0; i--) {
        const cy = y + i * dy
        const wobble = Math.sin((cy - y) / 45) * 8
        g.lineTo(x + width * 0.68 + wobble, cy)
      }
      g.closePath()
      g.fillPath()

      // 3. 岸边浅渚沙嘴（温暖沙褐砂泥与卵石）
      // 左侧中上游沙嘴
      const shoalY1 = y + height * 0.25
      g.fillStyle(0xc8b898, 0.70)
      g.beginPath()
      g.moveTo(x + 4, shoalY1 - 22)
      this.drawBezier(g, x + 4, shoalY1 - 22, x + width * 0.32, shoalY1 - 8, x + width * 0.32, shoalY1 + 10, x + 4, shoalY1 + 26)
      g.closePath()
      g.fillPath()
      // 沙嘴细卵石
      g.fillStyle(0x5a5042, 0.6)
      g.fillCircle(x + width * 0.18, shoalY1, 2)
      g.fillCircle(x + width * 0.24, shoalY1 + 4, 1.5)

      // 右侧下游沙洲
      const shoalY2 = y + height * 0.75
      g.fillStyle(0xc8b898, 0.70)
      g.beginPath()
      g.moveTo(x + width - 4, shoalY2 - 24)
      this.drawBezier(g, x + width - 4, shoalY2 - 24, x + width * 0.66, shoalY2 - 8, x + width * 0.68, shoalY2 + 12, x + width - 4, shoalY2 + 28)
      g.closePath()
      g.fillPath()
      g.fillStyle(0x5a5042, 0.6)
      g.fillCircle(x + width * 0.78, shoalY2, 2)

      // 4. 马远《水图》流动波纹（曲折起伏，富于律动）
      g.lineStyle(1.4, 0x4d809a, 0.50)
      for (let i = 0; i < steps; i++) {
        const cy = y + i * dy + dy * 0.5
        const lx = leftBank[i].x + 12
        const rx = rightBank[i].x - 12
        if (rx > lx + 14) {
          g.beginPath()
          g.moveTo(lx, cy)
          this.drawBezier(
            g,
            lx, cy,
            lx + (rx - lx) * 0.35, cy - 4,
            lx + (rx - lx) * 0.65, cy + 4,
            rx, cy + 1
          )
          g.strokePath()
        }
      }

      // 5. 渚头水草芦荻
      g.lineStyle(1.2, 0x2e4428, 0.75)
      this.drawReedTest(g, x + width * 0.22, shoalY1 - 4)
      this.drawReedTest(g, x + width * 0.18, shoalY1 + 8)
      this.drawReedTest(g, x + width * 0.74, shoalY2 - 6)
      this.drawReedTest(g, x + width * 0.78, shoalY2 + 10)

      // 岸边自然墨线
      g.lineStyle(1.3, InkColor.ink, 0.35)
      g.beginPath()
      g.moveTo(leftBank[0].x, leftBank[0].y)
      for (let i = 1; i < leftBank.length; i++) g.lineTo(leftBank[i].x, leftBank[i].y)
      g.strokePath()

      g.beginPath()
      g.moveTo(rightBank[0].x, rightBank[0].y)
      for (let i = 1; i < rightBank.length; i++) g.lineTo(rightBank[i].x, rightBank[i].y)
      g.strokePath()

    } else {
      // 横向河流
      const steps = 16
      const dx = width / steps
      const topBank: { x: number; y: number }[] = []
      const bottomBank: { x: number; y: number }[] = []

      for (let i = 0; i <= steps; i++) {
        const cx = x + i * dx
        const wobble1 = Math.sin((cx - x) / 45) * 10
        const wobble2 = Math.sin((cx - x) / 50 + 1.2) * 9
        topBank.push({ x: cx, y: y + 8 + wobble1 })
        bottomBank.push({ x: cx, y: y + height - 8 + wobble2 })
      }

      g.fillStyle(0x23526d, 0.40)
      g.beginPath()
      g.moveTo(topBank[0].x, topBank[0].y)
      for (let i = 1; i < topBank.length; i++) g.lineTo(topBank[i].x, topBank[i].y)
      for (let i = bottomBank.length - 1; i >= 0; i--) g.lineTo(bottomBank[i].x, bottomBank[i].y)
      g.closePath()
      g.fillPath()

      g.lineStyle(1.4, 0x4d809a, 0.50)
      for (let i = 0; i < steps; i++) {
        const cx = x + i * dx + dx * 0.5
        const ty = topBank[i].y + 10
        const by = bottomBank[i].y - 10
        if (by > ty + 12) {
          g.beginPath()
          g.moveTo(cx - dx * 0.4, ty + (by - ty) * 0.5)
          g.lineTo(cx + dx * 0.4, ty + (by - ty) * 0.5 + 2)
          g.strokePath()
        }
      }
    }

    // 朱砂小印「川」
    this.drawMiniSeal(x + 16, y + 20, '川')
  }

  /**
   * 绘制芦苇
   */
  private drawReedTest(g: Phaser.GameObjects.Graphics, rx: number, ry: number): void {
    g.beginPath()
    g.moveTo(rx, ry)
    g.lineTo(rx - 3.5, ry - 11)
    g.moveTo(rx + 2, ry)
    g.lineTo(rx + 1, ry - 14)
    g.moveTo(rx + 4, ry)
    g.lineTo(rx + 6.5, ry - 9)
    g.strokePath()
  }

  /**
   * 森林：万壑古松 · 幽篁修竹（无生硬外框，自然林荫地貌）
   */
  private drawForest(
    g: Phaser.GameObjects.Graphics,
    area: TerrainArea,
    rand: () => number
  ): void {
    const { x, y, width, height } = area.area

    // 1. 林下草苔墨韵（自然聚散的无规则苔晕，彻底移除方框）
    g.fillStyle(0x35482e, 0.18)
    const patchCount = 5
    for (let p = 0; p < patchCount; p++) {
      const cx = x + width * (0.2 + p * 0.16) + (rand() - 0.5) * 16
      const cy = y + height * 0.55 + (rand() - 0.5) * 20
      const rx = width * 0.22 + rand() * 15
      const ry = height * 0.35 + rand() * 10
      g.fillEllipse(cx, cy, rx, ry)
    }

    // 2. 苍松与幽竹树林（精雕中国画松树）
    const treeCols = Math.max(3, Math.floor(width / 44))
    const treeRows = Math.max(2, Math.floor(height / 40))

    for (let r = 0; r < treeRows; r++) {
      for (let c = 0; c < treeCols; c++) {
        const baseX = x + 16 + (c + 0.5) * ((width - 32) / treeCols) + (rand() - 0.5) * 16
        const baseY = y + 24 + (r + 0.5) * ((height - 38) / treeRows) + (rand() - 0.5) * 12
        const treeH = 26 + rand() * 12

        // 80% 老松，20% 修竹
        if (rand() > 0.22) {
          // 老松：盘根错节古干（自然弯曲）
          g.lineStyle(3.2, 0x1f1812, 0.95)
          const bendX = baseX + (rand() - 0.5) * 10
          g.beginPath()
          g.moveTo(baseX - 3, baseY)
          this.drawBezier(g, baseX - 3, baseY, baseX, baseY - treeH * 0.3, bendX, baseY - treeH * 0.6, bendX - 1, baseY - treeH * 0.85)
          g.strokePath()

          // 郁郁葱葱的古典松云叠盖
          const crownY = baseY - treeH * 0.85
          // 底层深浓青黑松顶
          g.fillStyle(0x132214, 0.95)
          g.fillEllipse(bendX, crownY + 3, 26, 12)
          // 顶层苍翠苍松
          g.fillStyle(0x234424, 0.90)
          g.fillEllipse(bendX - 2, crownY - 3, 30, 14)
          // 嫩梢高光
          g.fillStyle(0x386535, 0.80)
          g.fillEllipse(bendX - 2, crownY - 6, 20, 8)

          // 松针外缘墨点簇（点苔笔法）
          g.fillStyle(0x0f1c10, 0.85)
          for (let d = -12; d <= 12; d += 6) {
            g.fillCircle(bendX + d, crownY + 8, 1.8)
          }
        } else {
          // 修竹：瘦劲节干
          g.lineStyle(1.5, 0x1c2e19, 0.85)
          g.beginPath()
          g.moveTo(baseX, baseY)
          g.lineTo(baseX + 1.5, baseY - treeH * 0.5)
          g.lineTo(baseX + 0.5, baseY - treeH * 0.92)
          g.strokePath()

          // 竹节微环
          g.fillStyle(0x132011, 0.9)
          g.fillRect(baseX - 1.5, baseY - treeH * 0.45, 4, 1.2)
          g.fillRect(baseX - 1.5, baseY - treeH * 0.75, 4, 1.2)

          // 竹叶（个字形撇捺）
          g.fillStyle(0x284522, 0.82)
          const leafY = baseY - treeH * 0.88
          g.fillTriangle(baseX + 1, leafY, baseX - 8, leafY - 4, baseX - 5, leafY - 2)
          g.fillTriangle(baseX + 1, leafY, baseX + 9, leafY - 3, baseX + 6, leafY - 1)
          g.fillTriangle(baseX + 1, leafY - 3, baseX, leafY - 10, baseX + 2, leafY - 8)
        }
      }
    }

    // 3. 林下微岚薄霭（自然游动晨雾）
    const mistY = y + height * 0.72
    g.fillStyle(0xf6efe4, 0.65)
    g.beginPath()
    g.moveTo(x + 8, mistY)
    this.drawBezier(g, x + 8, mistY, x + width * 0.35, mistY - 8, x + width * 0.65, mistY + 8, x + width - 8, mistY - 2)
    g.lineTo(x + width - 8, mistY + 12)
    this.drawBezier(g, x + width - 8, mistY + 12, x + width * 0.65, mistY + 18, x + width * 0.35, mistY + 4, x + 8, mistY + 14)
    g.closePath()
    g.fillPath()

    // 朱砂小印「林」
    this.drawMiniSeal(x + width - 14, y + 18, '林')
  }

  /**
   * 沼泽
   */
  private drawSwamp(
    g: Phaser.GameObjects.Graphics,
    area: TerrainArea,
    _rand: () => number
  ): void {
    const { x, y, width, height } = area.area

    g.fillStyle(0x352b20, 0.30)
    g.fillRoundedRect(x + 4, y + 4, width - 8, height - 8, 8)

    g.fillStyle(0x283835, 0.40)
    g.fillEllipse(x + width * 0.4, y + height * 0.4, width * 0.25, height * 0.18)
    g.fillEllipse(x + width * 0.7, y + height * 0.65, width * 0.20, height * 0.15)

    this.drawMiniSeal(x + 16, y + 16, '澤')
  }

  /**
   * 其余地形兜底
   */
  private drawGenericWash(g: Phaser.GameObjects.Graphics, area: TerrainArea): void {
    const { x, y, width, height } = area.area
    const config = getTerrainConfig(area.type)

    g.fillStyle(config.color, 0.15)
    g.fillRoundedRect(x + 2, y + 2, width - 4, height - 4, 6)
    g.lineStyle(1, InkColor.ink, 0.22)
    g.strokeRoundedRect(x + 2, y + 2, width - 4, height - 4, 6)
  }

  /**
   * 钤盖精巧朱砂小印（方寸之间，尽显古画鉴藏风度）
   */
  private drawMiniSeal(x: number, y: number, char: string): void {
    const seal = this.scene.add.container(x, y)
    seal.setDepth(2)

    const bg = this.scene.add.graphics()
    bg.fillStyle(InkColor.cinnabar, 0.85)
    bg.fillRoundedRect(-9, -9, 18, 18, 3)
    bg.lineStyle(1, 0x781e18, 0.95)
    bg.strokeRoundedRect(-9, -9, 18, 18, 3)

    const txt = inkText(this.scene, 0, 0, char, {
      size: 11,
      color: InkText.paper,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    seal.add([bg, txt])
    this.terrainGroup.add(seal)
  }

  /**
   * 确定性伪随机（LCG）
   */
  private makeRand(seed: number): () => number {
    let s = seed >>> 0 || 1
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0
      return s / 4294967296
    }
  }

  /**
   * 渲染地形网格（调试）
   */
  renderDebugGrid(mapWidth: number, mapHeight: number): void {
    for (let row = 0; row <= mapHeight; row++) {
      const line = this.scene.add.line(
        0, row * this.tileSize,
        0, 0,
        mapWidth * this.tileSize, 0,
        InkColor.inkFaint
      )
      line.setAlpha(0.3)
      line.setDepth(100)
      this.terrainGroup.add(line)
    }

    for (let col = 0; col <= mapWidth; col++) {
      const line = this.scene.add.line(
        col * this.tileSize, 0,
        0, 0,
        0, mapHeight * this.tileSize,
        InkColor.inkFaint
      )
      line.setAlpha(0.3)
      line.setDepth(100)
      this.terrainGroup.add(line)
    }
  }

  /**
   * 高亮特定地形区域
   */
  highlightTerrainArea(x: number, y: number, _terrainType: TerrainType): Phaser.GameObjects.Rectangle {
    const highlight = this.scene.add.rectangle(
      x + this.tileSize / 2,
      y + this.tileSize / 2,
      this.tileSize,
      this.tileSize,
      InkColor.cinnabar,
      0.12
    )

    highlight.setStrokeStyle(2, InkColor.cinnabar)
    highlight.setDepth(1)
    return highlight
  }

  /**
   * 清除所有地形
   */
  clear(): void {
    this.terrainGroup.clear(true, true)
  }

  /**
   * 获取地形组
   */
  getTerrainGroup(): Phaser.GameObjects.Group {
    return this.terrainGroup
  }

  /**
   * 设置tile尺寸
   */
  setTileSize(size: number): void {
    this.tileSize = size
  }

  /**
   * 获取tile尺寸
   */
  getTileSize(): number {
    return this.tileSize
  }

  /**
   * 辅助绘制三次贝塞尔曲线段（采样转为折线点，兼容 Phaser Graphics）
   */
  private drawBezier(
    g: Phaser.GameObjects.Graphics,
    p0x: number,
    p0y: number,
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    p1x: number,
    p1y: number,
    steps: number = 8
  ): void {
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      const inv = 1 - t
      const cx = inv * inv * inv * p0x + 3 * inv * inv * t * cp1x + 3 * inv * t * t * cp2x + t * t * t * p1x
      const cy = inv * inv * inv * p0y + 3 * inv * inv * t * cp1y + 3 * inv * t * t * cp2y + t * t * t * p1y
      g.lineTo(cx, cy)
    }
  }
}
