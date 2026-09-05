import Phaser from 'phaser'
import { BattleSystem } from '@/core/battle/BattleSystem'
import { level1Config } from '@/data/levels/chapter1'
import { TerrainManager } from '@/core/terrain/TerrainManager'
import { PathRenderer } from '@/core/terrain/PathRenderer'
import { DeploymentZoneRenderer } from '@/core/terrain/DeploymentZoneRenderer'
import { Hero, TroopConfig } from '@/types'
import { GridCell, cellAt, cellInBounds } from '@/config/constants'
import { troops } from '@/data/troops'
import { SaveManager } from '@/core/save/SaveManager'
import { SoundFX } from '@/effects/SoundFX'
import { HeroEntity } from '@/entities/HeroEntity'
import { TroopEntity } from '@/entities/TroopEntity'
import {
  InkColor,
  InkText,
  InkRadius,
  INK_WUXING,
  inkText,
  createInkButton,
  inkToast,
  drawPaperBackground
} from '@/ui/InkTheme'

type RangeUnit = HeroEntity | TroopEntity

type DragPayload =
  | { kind: 'hero'; hero: Hero }
  | { kind: 'troop'; troop: TroopConfig }

/** 已部署单位的按住/拖拽状态 */
interface UnitDrag {
  unit: RangeUnit
  kind: 'hero' | 'troop'
  instanceId: string
  originalFootprint: GridCell[]
  startX: number
  startY: number
  dragging: boolean       // 是否已越过拖拽阈值（否则视为"按住查看"）
  originalDepth: number
}

/** 底部栏武将槽位（上阵后置灰） */
interface DockHeroItem {
  image: Phaser.GameObjects.Image
  nameText: Phaser.GameObjects.Text
  costText: Phaser.GameObjects.Text
}

/** 底部栏兵种槽位（冷却时变暗） */
interface DockTroopItem {
  charText: Phaser.GameObjects.Text
  nameText: Phaser.GameObjects.Text
  costText: Phaser.GameObjects.Text
}

/**
 * 战斗场景
 * 游戏核心战斗界面
 */
export default class BattleScene extends Phaser.Scene {
  private levelId: string = ''
  private battleSystem!: BattleSystem

  // 地形系统
  private terrainManager!: TerrainManager
  private pathRenderer!: PathRenderer
  private deploymentZoneRenderer!: DeploymentZoneRenderer

  // UI元素
  private costText!: Phaser.GameObjects.Text
  private healthText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private deployDock!: Phaser.GameObjects.Container
  private dockHeight = 96

  // 拖拽部署
  private dragPayload: DragPayload | null = null
  private dragGhost: Phaser.GameObjects.Container | null = null

  // 已部署单位射程（同一时间只展示一个）
  private rangeUnit: RangeUnit | null = null

  // 已部署单位拖拽重定位（按住看射程 → 拖动移位 → 拖回底栏撤下）
  private unitDrag: UnitDrag | null = null

  // 按住时展示的属性卡
  private unitInfoContainer: Phaser.GameObjects.Container | null = null

  // 底部栏槽位（武将上阵后置灰；部署冷却时整体变暗）
  private dockHeroItems: Map<string, DockHeroItem> = new Map()
  private dockTroopItems: Map<string, DockTroopItem> = new Map()
  private dockHintText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'BattleScene' })
  }

  /**
   * 场景初始化
   */
  init(data: { levelId: string }): void {
    this.levelId = data.levelId || 'chapter1_level1'
    console.log(`BattleScene: 进入关卡 ${this.levelId}`)
  }

  /**
   * 创建场景内容
   */
  create(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    this.dragPayload = null
    this.dragGhost = null
    this.rangeUnit = null
    this.unitDrag = null
    this.unitInfoContainer = null
    this.dockHeroItems.clear()
    this.dockTroopItems.clear()

    // 0. 解锁零素材音效（首次点击/按键后 WebAudio 才能出声）
    SoundFX.unlock()

    // 0.5 宣纸底（纸色 + 淡墨晕染），地形在其上以水墨程序绘制
    drawPaperBackground(this)

    // 1. 创建地形系统
    this.createTerrainSystem()

    // 2. 渲染地形
    this.terrainManager.renderTerrain()

    // 3. 渲染路径
    this.pathRenderer.renderStaticPath()

    // 4. 渲染路径格网（任意格可部署）
    this.deploymentZoneRenderer.renderDeploymentZones()

    // 5. 初始化战斗系统（使用存档中的武将数据）
    const saveManager = SaveManager.getInstance()
    const heroes = saveManager.loadHeroes()
    this.battleSystem = new BattleSystem(this, level1Config, heroes)

    // 6. 创建UI（覆盖在最上层）
    this.createUI(width, height)

    // 7. 注册战斗事件回调
    this.registerBattleCallbacks()

    // 8. 注册拖拽部署与点击射程
    this.registerDeploymentInteraction()

    // 9. 启动战斗
    this.battleSystem.startBattle()

    console.log('BattleScene: 战斗系统初始化完成')
  }

  /**
   * 创建地形系统
   */
  private createTerrainSystem(): void {
    const mapConfig = level1Config.map

    this.terrainManager = new TerrainManager(
      this,
      mapConfig.terrainAreas || [],
      mapConfig.defaultTerrain || 'grass'
    )

    this.pathRenderer = new PathRenderer(this, mapConfig.path)

    this.deploymentZoneRenderer = new DeploymentZoneRenderer(this, mapConfig.deployableAreas)
  }

  /**
   * 部署交互：
   * - 从底部栏拖到任意格子部署
   * - 按住已部署单位 → 显示攻击范围与属性；拖动 → 重定位；拖回底栏 → 撤下；松开 → 恢复
   */
  private registerDeploymentInteraction(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.unitDrag) {
        this.updateUnitDrag(pointer)
        return
      }
      if (this.dragPayload) {
        this.updateDrag(pointer)
        return
      }

      const cell = this.deploymentZoneRenderer.cellAtPoint({ x: pointer.x, y: pointer.y })
      if (cell && !this.isPointerOverDock(pointer)) {
        this.deploymentZoneRenderer.highlightCell(cell)
      } else {
        this.deploymentZoneRenderer.clearCellHighlight()
      }
    })

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.unitDrag) {
        this.endUnitDrag(pointer)
        return
      }
      if (this.dragPayload) {
        this.endDrag(pointer)
        return
      }
      // 松开：收起射程与属性卡
      this.hideRange()
      this.hideUnitInfo()
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.dragPayload || this.unitDrag) return
      if (this.isPointerOverDock(pointer)) return
      const hits = this.input.hitTestPointer(pointer)
      const hitDeployed = hits.some(obj => obj instanceof HeroEntity || obj instanceof TroopEntity)
      if (hitDeployed) return
      this.hideRange()
      this.hideUnitInfo()
    })
  }

  /**
   * 从底部栏开始拖拽（部署冷却中 / 武将已上阵时拒绝）
   */
  private beginDrag(payload: DragPayload, pointer: Phaser.Input.Pointer): void {
    const cooling = this.battleSystem.getDeployCooldownRemaining()
    if (cooling > 0) {
      this.showTemporaryMessage(`部署冷却中 ${(cooling / 1000).toFixed(1)}s`)
      return
    }
    if (payload.kind === 'hero' && this.battleSystem.isHeroDeployed(payload.hero.id)) {
      this.showTemporaryMessage('该武将已上阵，拖回底栏可撤下')
      return
    }

    this.hideRange()
    this.hideUnitInfo()
    this.dragPayload = payload
    this.dragGhost = this.createDragGhost(payload)
    this.dragGhost.setPosition(pointer.x, pointer.y)
    this.updateDrag(pointer)
  }

  /**
   * 拖拽中：幽灵跟随指针，高亮落点脚印
   */
  private updateDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.dragGhost || !this.dragPayload) return

    this.dragGhost.setPosition(pointer.x, pointer.y)

    if (this.isPointerOverDock(pointer)) {
      this.deploymentZoneRenderer.clearCellHighlight()
      this.dragGhost.setAlpha(0.35)
      return
    }

    this.dragGhost.setAlpha(0.85)
    const preview = this.getDropPreview(pointer, this.dragPayload.kind)
    if (!preview) {
      this.deploymentZoneRenderer.clearCellHighlight()
      return
    }
    this.deploymentZoneRenderer.highlightDropPreview(preview.cells, preview.valid)
  }

  /**
   * 松手：合法格则部署，否则取消
   */
  private endDrag(pointer: Phaser.Input.Pointer): void {
    const payload = this.dragPayload
    this.clearDragGhost()
    this.dragPayload = null
    this.deploymentZoneRenderer.clearCellHighlight()

    if (!payload) return
    if (this.isPointerOverDock(pointer)) return

    const preview = this.getDropPreview(pointer, payload.kind)
    if (!preview) {
      this.showTemporaryMessage('请放到战场格子上')
      return
    }

    if (payload.kind === 'hero') {
      this.tryPlaceHero(payload.hero, preview.cells[0])
    } else {
      this.tryPlaceTroop(payload.troop, preview.cells[0])
    }
  }

  /**
   * 当前指针对应的落点脚印与是否可放
   */
  private getDropPreview(
    pointer: Phaser.Input.Pointer,
    shape: 'hero' | 'troop'
  ): { cells: GridCell[]; valid: boolean } | null {
    const cell = cellAt(pointer.x, pointer.y)
    if (!cell) return null

    const grid = this.battleSystem.getDeployGrid()

    if (shape === 'troop') {
      return { cells: [cell], valid: grid.canPlaceFootprint([cell]) }
    }

    const footprint = grid.heroFootprint(cell)
    if (footprint) {
      return { cells: footprint, valid: true }
    }

    const right: GridCell = { col: cell.col + 1, row: cell.row }
    const intended = cellInBounds(right) ? [cell, right] : [cell]
    return { cells: intended, valid: false }
  }

  /**
   * 拖拽幽灵（头像或兵种单字）
   */
  private createDragGhost(payload: DragPayload): Phaser.GameObjects.Container {
    const ghost = this.add.container(0, 0)
    ghost.setDepth(40)
    ghost.setAlpha(0.85)

    if (payload.kind === 'hero') {
      const imageKey = this.getHeroImageKey(payload.hero.id)
      if (this.textures.exists(imageKey)) {
        const img = this.add.image(0, 0, imageKey)
        img.setDisplaySize(64, 64)
        ghost.add(img)
      }
      const name = inkText(this, 0, 42, payload.hero.name, {
        size: 12,
        color: InkText.ink,
        originX: 0.5
      })
      ghost.add(name)
    } else {
      const chip = this.add.graphics()
      chip.fillStyle(InkColor.paperPanel, 0.92)
      chip.fillRoundedRect(-28, -28, 56, 56, InkRadius.sm)
      chip.lineStyle(1, InkColor.ink, 0.55)
      chip.strokeRoundedRect(-28, -28, 56, 56, InkRadius.sm)
      ghost.add(chip)

      const charText = inkText(this, 0, 0, payload.troop.displayChar, {
        size: 28,
        color: payload.troop.color,
        bold: true,
        originX: 0.5
      })
      ghost.add(charText)
    }

    return ghost
  }

  private clearDragGhost(): void {
    if (this.dragGhost) {
      this.dragGhost.destroy()
      this.dragGhost = null
    }
  }

  private isPointerOverDock(pointer: Phaser.Input.Pointer): boolean {
    return pointer.y >= this.cameras.main.height - this.dockHeight
  }

  /**
   * 部署英雄（横占 1×2）
   */
  private tryPlaceHero(hero: Hero, cell: GridCell): void {
    const result = this.battleSystem.placeHero(hero.id, cell)

    if (result.success) {
      console.log(`成功在格子(${cell.col},${cell.row})部署英雄 ${hero.name}`)
    } else {
      console.log(`部署失败: ${result.reason}`)
      this.showTemporaryMessage(this.deployFailMessage(result.reason, '英雄需横占相邻两格'))
    }
  }

  /**
   * 部署兵种（占 1 格）
   */
  private tryPlaceTroop(troop: TroopConfig, cell: GridCell): void {
    const result = this.battleSystem.placeTroop(troop.id, cell)

    if (result.success) {
      console.log(`成功在格子(${cell.col},${cell.row})部署兵种 ${troop.name}`)
    } else {
      console.log(`部署失败: ${result.reason}`)
      this.showTemporaryMessage(this.deployFailMessage(result.reason, '该格已被占用'))
    }
  }

  /**
   * 已部署单位按住交互：
   * 按下 → 显示攻击范围 + 属性卡；拖动越过阈值 → 重定位；拖回底栏 → 撤下；松开 → 恢复
   */
  private wireUnitPress(unit: RangeUnit): void {
    const kind: 'hero' | 'troop' = unit instanceof HeroEntity ? 'hero' : 'troop'

    unit.on('pointerdown', (
      pointer: Phaser.Input.Pointer,
      _lx: number,
      _ly: number,
      event: Phaser.Types.Input.EventData
    ) => {
      if (this.dragPayload || this.unitDrag) return
      event.stopPropagation()

      // 按住即显示射程与属性（松开恢复）
      this.hideRange()
      unit.showRangeIndicator()
      this.rangeUnit = unit
      this.showUnitInfo(unit)

      // 预备拖拽重定位：先释放格子占用（松开未拖动时恢复）
      const instanceId = unit.getDeployedData().instanceId
      const footprint = this.battleSystem.beginUnitDrag(instanceId)
      if (!footprint) return

      this.unitDrag = {
        unit,
        kind,
        instanceId,
        originalFootprint: footprint,
        startX: pointer.x,
        startY: pointer.y,
        dragging: false,
        originalDepth: unit.depth
      }
    })
  }

  private hideRange(): void {
    this.rangeUnit?.hideRangeIndicator()
    this.rangeUnit = null
  }

  /**
   * 单位拖拽中：越过阈值后实体跟随指针，落点脚印实时预览
   */
  private updateUnitDrag(pointer: Phaser.Input.Pointer): void {
    const drag = this.unitDrag
    if (!drag) return

    if (!drag.dragging) {
      const dist = Phaser.Math.Distance.Between(drag.startX, drag.startY, pointer.x, pointer.y)
      if (dist < 8) return  // 未越过阈值：视为"按住查看射程"
      drag.dragging = true
      this.hideUnitInfo()   // 拖动中收起属性卡
      drag.unit.setDepth(40)
      drag.unit.setAlpha(0.85)
    }

    drag.unit.setPosition(pointer.x, pointer.y)

    if (this.isPointerOverDock(pointer)) {
      this.deploymentZoneRenderer.clearCellHighlight()
      return
    }

    const preview = this.getDropPreview(pointer, drag.kind)
    if (!preview) {
      this.deploymentZoneRenderer.clearCellHighlight()
      return
    }
    this.deploymentZoneRenderer.highlightDropPreview(preview.cells, preview.valid)
  }

  /**
   * 松开：未拖动 → 恢复占用；拖到底栏 → 撤下；拖到格子 → 重定位
   */
  private endUnitDrag(pointer: Phaser.Input.Pointer): void {
    const drag = this.unitDrag
    this.unitDrag = null
    if (!drag) return

    this.hideRange()
    this.hideUnitInfo()
    this.deploymentZoneRenderer.clearCellHighlight()
    drag.unit.setDepth(drag.originalDepth)
    drag.unit.setAlpha(1)

    // 未越过拖拽阈值：视为按住查看，恢复占用即可
    if (!drag.dragging) {
      this.battleSystem.cancelUnitDrag(drag.instanceId, drag.originalFootprint)
      return
    }

    // 拖回底部栏：撤下单位（返还费用，武将可重新上阵）
    if (this.isPointerOverDock(pointer)) {
      this.retreatUnitToDock(drag)
      return
    }

    const cell = cellAt(pointer.x, pointer.y)
    if (!cell) {
      this.battleSystem.cancelUnitDrag(drag.instanceId, drag.originalFootprint)
      this.showTemporaryMessage('请放到战场格子上')
      return
    }

    const result = this.battleSystem.dropUnitOnCell(drag.instanceId, cell, drag.originalFootprint)
    if (!result.success) {
      this.battleSystem.cancelUnitDrag(drag.instanceId, drag.originalFootprint)
      this.showTemporaryMessage(result.reason === 'cellOccupied'
        ? (drag.kind === 'hero' ? '英雄需横占相邻两格' : '该格已被占用')
        : '无法移动到该格')
    }
  }

  /**
   * 拖回底栏撤下单位（复用撤退逻辑：返还全额费用、销毁实体、释放占位）
   */
  private retreatUnitToDock(drag: UnitDrag): void {
    if (drag.kind === 'hero') {
      const result = this.battleSystem.retreatHero(drag.instanceId)
      if (result.success) {
        this.showTemporaryMessage(`武将已撤回，返还费用 ${result.returnedCost}`)
      }
    } else {
      const result = this.battleSystem.retreatTroop(drag.instanceId)
      if (result.success) {
        this.showTemporaryMessage(`兵种已撤回，返还费用 ${result.returnedCost}`)
      }
    }
  }

  /**
   * 属性卡：单位头顶的宣纸小片（按住时显示）
   */
  private showUnitInfo(unit: RangeUnit): void {
    this.hideUnitInfo()

    let title: string
    let line: string
    if (unit instanceof HeroEntity) {
      const hero = unit.getHeroData()
      const stats = unit.getEffectiveStats()
      const wuxing = INK_WUXING[hero.wuXing]
      title = `${hero.name} · Lv.${hero.level} · ${wuxing.label}`
      line = `攻 ${stats.attack} · 速 ${stats.attackSpeed.toFixed(1)}/秒 · 程 ${stats.attackRange}`
    } else {
      const troop = unit.getTroopData()
      title = `${troop.name} · ${troop.displayChar}`
      line = `攻 ${troop.baseAttack} · 速 ${troop.attackSpeed.toFixed(1)}/秒 · 程 ${troop.attackRange}`
    }

    const width = this.cameras.main.width
    const offsetY = unit instanceof HeroEntity ? 92 : 50
    const cx = Phaser.Math.Clamp(unit.x, 110, width - 110)
    const c = this.add.container(cx, unit.y - offsetY)
    c.setDepth(45)

    const titleText = inkText(this, 0, -9, title, {
      size: 12,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    })
    const lineText = inkText(this, 0, 9, line, {
      size: 11,
      color: InkText.ink,
      originX: 0.5
    })
    const w = Math.max(titleText.width, lineText.width) + 20
    const h = 40

    const bg = this.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.94)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, InkRadius.sm)
    bg.lineStyle(1, InkColor.ink, 0.55)
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, InkRadius.sm)
    c.add([bg, titleText, lineText])

    this.unitInfoContainer = c
  }

  private hideUnitInfo(): void {
    this.unitInfoContainer?.destroy()
    this.unitInfoContainer = null
  }

  /**
   * 底部栏状态：武将上阵置灰、部署冷却倒计时与变暗
   */
  private updateDockState(): void {
    const coolingMs = this.battleSystem.getDeployCooldownRemaining()
    const cooling = coolingMs > 0

    if (cooling) {
      this.dockHintText.setText(`部署冷却 ${(coolingMs / 1000).toFixed(1)}s`)
      this.dockHintText.setColor(InkText.cinnabar)
    } else {
      this.dockHintText.setText('拖拽部署 · 按住单位看射程 · 拖回底栏撤下')
      this.dockHintText.setColor(InkText.faint)
    }

    for (const [heroId, item] of this.dockHeroItems) {
      const deployed = this.battleSystem.isHeroDeployed(heroId)
      const textAlpha = deployed ? 0.4 : cooling ? 0.6 : 1
      item.image.setAlpha(deployed ? 0.3 : cooling ? 0.55 : 1)
      item.image.setTint(deployed ? 0x8a8a8a : 0xffffff)
      item.nameText.setAlpha(textAlpha)
      item.costText.setAlpha(textAlpha)
    }

    for (const item of this.dockTroopItems.values()) {
      item.charText.setAlpha(cooling ? 0.55 : 1)
      item.nameText.setAlpha(cooling ? 0.6 : 1)
      item.costText.setAlpha(cooling ? 0.6 : 1)
    }
  }

  /**
   * 部署失败文案
   */
  private deployFailMessage(reason: string | undefined, occupiedHint: string): string {
    switch (reason) {
      case 'insufficientCost': return '费用不足'
      case 'heroNotUnlocked': return '尚未解锁'
      case 'invalidPosition': return '无法部署到该格'
      case 'cellOccupied': return occupiedHint
      case 'deployCooling': return '部署冷却中，请稍候'
      case 'heroAlreadyDeployed': return '该武将已上阵'
      default: return '部署失败'
    }
  }

  /**
   * 显示临时消息（顶部墨块提示）
   */
  private showTemporaryMessage(message: string): void {
    inkToast(this, message, 100)
  }

  /**
   * 画一个宣纸圆角小片（HUD 文字底衬，保证地形上可读）
   */
  private drawHudChip(x: number, y: number, w: number, h: number): void {
    const g = this.add.graphics()
    g.setDepth(20)
    g.fillStyle(InkColor.paperPanel, 0.85)
    g.fillRoundedRect(x, y, w, h, InkRadius.sm)
    g.lineStyle(1, InkColor.ink, 0.6)
    g.strokeRoundedRect(x, y, w, h, InkRadius.sm)
  }

  /**
   * 创建UI
   */
  private createUI(width: number, height: number): void {
    // 费用显示
    this.drawHudChip(20, 12, 160, 32)
    this.costText = inkText(this, 34, 28, '费用: 20', {
      size: 18,
      color: InkText.ink
    })
    this.costText.setDepth(20)

    // 生命显示
    this.drawHudChip(20, 50, 160, 32)
    this.healthText = inkText(this, 34, 66, '生命: 20', {
      size: 18,
      color: InkText.ink
    })
    this.healthText.setDepth(20)

    // 波次显示
    this.drawHudChip(width - 190, 12, 170, 32)
    this.waveText = inkText(this, width - 176, 28, '波次: 0/3', {
      size: 18,
      color: InkText.ink
    })
    this.waveText.setDepth(20)

    // 关卡名称（顶部中间，纸片底衬）
    this.drawHudChip(width / 2 - 140, 10, 280, 38)
    inkText(this, width / 2, 29, level1Config.name, {
      size: 24,
      color: InkText.strong,
      bold: true,
      originX: 0.5
    }).setDepth(20)

    this.createDeployDock(width, height)
  }

  /**
   * 底部拖拽栏：武将 + 兵种
   */
  private createDeployDock(width: number, height: number): void {
    const dockY = height - this.dockHeight / 2
    this.deployDock = this.add.container(0, 0)
    this.deployDock.setDepth(35)

    const bg = this.add.rectangle(width / 2, dockY, width, this.dockHeight, InkColor.paperPanel, 0.94)
    bg.setStrokeStyle(1, InkColor.ink)
    bg.setInteractive()
    this.deployDock.add(bg)

    const backBtn = createInkButton(this, 80, dockY, 120, 40, '返回', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 18,
      stroke: InkColor.ink,
      onClick: () => {
        this.scene.start('TitleScene')
      }
    })
    this.deployDock.add(backBtn)

    const saveManager = SaveManager.getInstance()
    const heroes = Array.from(saveManager.loadHeroes().values())

    let x = 180
    this.dockHintText = inkText(this, x, dockY - 32, '拖拽部署 · 按住单位看射程 · 拖回底栏撤下', {
      size: 11,
      color: InkText.faint
    })

    for (const hero of heroes) {
      this.addDockHero(hero, x, dockY)
      x += 86
    }

    const divider = this.add.rectangle(x + 4, dockY, 1, 64, InkColor.ink, 0.25)
    this.deployDock.add(divider)
    x += 28

    for (const troop of troops) {
      this.addDockTroop(troop, x, dockY)
      x += 72
    }
  }

  private addDockHero(hero: Hero, x: number, y: number): void {
    const imageKey = this.getHeroImageKey(hero.id)
    if (this.textures.exists(imageKey)) {
      const heroImage = this.add.image(x, y - 8, imageKey)
      heroImage.setDisplaySize(48, 48)
      heroImage.setInteractive({ useHandCursor: true })
      heroImage.on('pointerover', () => heroImage.setScale(heroImage.scaleX * 1.08))
      heroImage.on('pointerout', () => heroImage.setDisplaySize(48, 48))
      heroImage.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.beginDrag({ kind: 'hero', hero }, pointer)
      })
      this.deployDock.add(heroImage)

      const nameText = inkText(this, x, y + 24, hero.name, {
        size: 11,
        color: InkText.ink,
        originX: 0.5
      })
      const costText = inkText(this, x, y + 38, `${hero.deploymentCost}`, {
        size: 10,
        color: InkText.gold,
        originX: 0.5
      })
      this.deployDock.add(nameText)
      this.deployDock.add(costText)

      this.dockHeroItems.set(hero.id, { image: heroImage, nameText, costText })
    }
  }

  private addDockTroop(troop: TroopConfig, x: number, y: number): void {
    const charText = inkText(this, x, y - 10, troop.displayChar, {
      size: 26,
      color: troop.color,
      bold: true,
      originX: 0.5
    })
    charText.setInteractive({ useHandCursor: true })
    charText.on('pointerover', () => charText.setScale(1.15))
    charText.on('pointerout', () => charText.setScale(1))
    charText.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.beginDrag({ kind: 'troop', troop }, pointer)
    })

    const nameText = inkText(this, x, y + 18, troop.name, {
      size: 11,
      color: InkText.ink,
      originX: 0.5
    })
    const costText = inkText(this, x, y + 32, `${troop.deploymentCost}`, {
      size: 10,
      color: InkText.gold,
      originX: 0.5
    })
    this.deployDock.add(charText)
    this.deployDock.add(nameText)
    this.deployDock.add(costText)

    this.dockTroopItems.set(troop.id, { charText, nameText, costText })
  }

  /**
   * 获取英雄头像图片key
   */
  private getHeroImageKey(heroId: string): string {
    const imageKeyMap: Record<string, string> = {
      'hero_guanyu': 'hero_guanyu',
      'hero_zhangfei': 'hero_zhangfei',
      'hero_zhaoyun': 'hero_zhaoyun'
    }
    return imageKeyMap[heroId] || 'hero_placeholder'
  }

  /**
   * 注册战斗事件回调
   */
  private registerBattleCallbacks(): void {
    this.battleSystem.onEnemyKilled((enemy) => {
      console.log(`敌人 ${enemy.getEnemyData().name} 被击杀`)
    })

    this.battleSystem.onEnemyReachedExit((enemy) => {
      console.log(`敌人 ${enemy.getEnemyData().name} 到达终点`)
      this.showTemporaryMessage('敌人突破了防线！')
    })

    this.battleSystem.onWaveStart((wave) => {
      console.log(`波次 ${wave} 开始`)
      this.showTemporaryMessage(`波次 ${wave} 开始！`)
    })

    this.battleSystem.onBattleEnd((result) => {
      this.time.delayedCall(1000, () => {
        this.scene.start('SettlementScene', { battleResult: result })
      })
    })

    this.battleSystem.onHeroPlaced((hero) => {
      this.wireUnitPress(hero)
    })

    this.battleSystem.onTroopPlaced((troop) => {
      this.wireUnitPress(troop)
    })
  }

  /**
   * 场景更新（每帧调用）
   */
  update(_time: number, delta: number): void {
    if (!this.battleSystem) return

    this.battleSystem.update(delta)
    this.updateUI()
  }

  /**
   * 更新UI
   */
  private updateUI(): void {
    const state = this.battleSystem.getState()

    this.costText.setText(`费用: ${state.currentCost}`)
    this.healthText.setText(`生命: ${state.playerHealth}`)
    this.waveText.setText(`波次: ${state.currentWave}/${state.totalWaves}`)
    this.updateDockState()
  }
}
