import Phaser from 'phaser'
import { BattleSystem } from '@/core/battle/BattleSystem'
import { level1Config } from '@/data/levels/chapter1'
import { getLevelConfig } from '@/data/levels'
import { TerrainManager } from '@/core/terrain/TerrainManager'
import { PathRenderer } from '@/core/terrain/PathRenderer'
import { DeploymentZoneRenderer } from '@/core/terrain/DeploymentZoneRenderer'
import { Hero, TroopConfig, LevelConfig } from '@/types'
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
import { InkSilhouetteRenderer } from '@/rendering/InkSilhouetteRenderer'
import { EnergyGaugeBar } from '@/ui/EnergyGaugeBar'
import { AugmentSelectModal } from '@/ui/AugmentSelectModal'
import { WeatherAmbientFX } from '@/effects/WeatherAmbientFX'
import { MilitarySituationModal } from '@/ui/MilitarySituationModal'
import { MilitarySituationDetailModal } from '@/ui/MilitarySituationDetailModal'
import { AugmentStatusModal } from '@/ui/AugmentStatusModal'
import { MilitarySituation } from '@/types/militarySituation'
import { EndlessModeManager } from '@/core/level/EndlessModeManager'

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
  icon: Phaser.GameObjects.Image
  nameText: Phaser.GameObjects.Text
  costText: Phaser.GameObjects.Text
}

/**
 * 战斗场景
 * 游戏核心战斗界面
 */
export default class BattleScene extends Phaser.Scene {
  private levelId: string = ''
  private currentLevelConfig: LevelConfig = level1Config
  private battleSystem!: BattleSystem

  // 地形系统
  private terrainManager!: TerrainManager
  private pathRenderer!: PathRenderer
  private deploymentZoneRenderer!: DeploymentZoneRenderer

  // UI元素
  private costText!: Phaser.GameObjects.Text
  private healthText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private speedBtnText!: Phaser.GameObjects.Text
  private pauseBtnText!: Phaser.GameObjects.Text
  private earlyWaveBtn!: Phaser.GameObjects.Container
  private energyGaugeBar!: EnergyGaugeBar
  private augmentStatusBtnText!: Phaser.GameObjects.Text
  private augmentModal: AugmentSelectModal | null = null
  private augmentStatusModal: AugmentStatusModal | null = null
  private militaryModal: MilitarySituationModal | null = null
  private militaryDetailModal: MilitarySituationDetailModal | null = null
  private militaryBadgeContainer?: Phaser.GameObjects.Container
  private militarySealBg?: Phaser.GameObjects.Rectangle
  private militarySealText?: Phaser.GameObjects.Text
  private lastMilitaryTacticId: string | null = null
  private readonly speedOptions: number[] = [1.0, 2.0, 3.0, 5.0]
  private startWave: number = 1
  private weatherFX!: WeatherAmbientFX
  private leylineGraphics!: Phaser.GameObjects.Graphics
  private pauseOverlay: Phaser.GameObjects.Container | null = null
  private wave15ChoiceModal: Phaser.GameObjects.Container | null = null
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
  init(data: { levelId: string; startWave?: number }): void {
    this.levelId = data.levelId || 'chapter1_level1'
    this.currentLevelConfig = getLevelConfig(this.levelId) || level1Config
    const isEndless =
      this.currentLevelConfig.chapterId === 'endless' ||
      this.currentLevelConfig.id === 'level_endless_tower'
    if (typeof data.startWave === 'number' && data.startWave >= 1) {
      this.startWave = data.startWave
    } else if (isEndless) {
      this.startWave = SaveManager.getInstance().getEndlessCurrentWave()
    } else {
      const savedMapWave = SaveManager.getInstance().getMapHighestWave(this.levelId)
      this.startWave = savedMapWave >= 15 ? Math.max(16, savedMapWave) : 1
    }
    console.log(`BattleScene: 进入关卡 ${this.levelId} (${this.currentLevelConfig.name}), 起始波次: ${this.startWave}`)
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
    this.militaryModal = null
    this.wave15ChoiceModal = null
    this.dockHeroItems.clear()
    this.dockTroopItems.clear()

    // 0. 解锁零素材音效（首次点击/按键后 WebAudio 才能出声）
    SoundFX.unlock()

    // 0.5 宣纸底（纸色 + 淡墨晕染），地形在其上以水墨程序绘制
    drawPaperBackground(this)
    InkSilhouetteRenderer.init(this)

    // 初始化水墨天候环境特效
    this.weatherFX = new WeatherAmbientFX(this)
    this.events.once('shutdown', () => {
      this.weatherFX?.destroy()
    })

    // 1. 创建地形系统
    this.createTerrainSystem()

    // 2. 渲染地形
    this.terrainManager.renderTerrain()

    // 3. 渲染路径
    this.pathRenderer.renderStaticPath()

    // 4. 渲染路径格网（任意格可部署）
    this.deploymentZoneRenderer.renderDeploymentZones()

    // 4.5 160px 五行相生阵脉连线图层（位于地面之上、单位之下）
    this.leylineGraphics = this.add.graphics()
    this.leylineGraphics.setDepth(8)

    // 5. 初始化战斗系统（使用存档中的武将数据）
    const saveManager = SaveManager.getInstance()
    const heroes = saveManager.loadHeroes()
    this.battleSystem = new BattleSystem(this, this.currentLevelConfig, heroes, this.startWave)

    // 6. 创建UI（覆盖在最上层）
    this.createUI(width, height)

    // 7. 注册战斗事件回调
    this.registerBattleCallbacks()

    // 8. 注册拖拽部署与点击射程
    this.registerDeploymentInteraction()

    // 8.5 注册键盘快捷施法 (1, 2, 3 键强令施法)
    this.registerSkillShortcuts()

    // 9. 启动战斗
    this.battleSystem.startBattle()

    console.log('BattleScene: 战斗系统初始化完成')
  }

  /**
   * 创建地形系统
   */
  private createTerrainSystem(): void {
    const mapConfig = this.currentLevelConfig.map

    this.terrainManager = new TerrainManager(
      this,
      mapConfig.terrainAreas || [],
      mapConfig.defaultTerrain || 'grass'
    )

    this.pathRenderer = new PathRenderer(this, mapConfig.path, true, this.terrainManager)

    this.deploymentZoneRenderer = new DeploymentZoneRenderer(this, mapConfig.deployableAreas, mapConfig.path)
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

      // 常态下无拖拽操作时保持战场清爽，不随鼠标全图漫游高亮
      this.deploymentZoneRenderer.clearCellHighlight()
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
      this.deploymentZoneRenderer.setGridVisible(false)
      this.deploymentZoneRenderer.clearCellHighlight()
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
   * 注册键盘快捷施法监听 (1, 2, 3 键分别触发第 1, 2, 3 位已上阵名将的大招)
   */
  private registerSkillShortcuts(): void {
    if (!this.input.keyboard) return

    this.input.keyboard.on('keydown-ONE', () => this.tryManualCastSkill(0))
    this.input.keyboard.on('keydown-TWO', () => this.tryManualCastSkill(1))
    this.input.keyboard.on('keydown-THREE', () => this.tryManualCastSkill(2))
    this.input.keyboard.on('keydown-FOUR', () => this.tryManualCastSkill(3))
    this.input.keyboard.on('keydown-FIVE', () => this.tryManualCastSkill(4))
  }

  /**
   * 快捷键或点击触发武将主动绝技
   */
  private tryManualCastSkill(heroIdentifier: string | number): void {
    const heroBattleManager = this.battleSystem.getHeroBattleManager()
    if (!heroBattleManager) return

    const success = heroBattleManager.manualCastSkill(heroIdentifier)
    if (success) {
      SoundFX.bowSnap(0.25)
      inkToast(this, '军师强令 · 绝技破阵！', 100)
    }
  }

  /**
   * 从底部栏开始拖拽（武将已上阵时拒绝）
   */
  private beginDrag(payload: DragPayload, pointer: Phaser.Input.Pointer): void {
    if (payload.kind === 'hero' && this.battleSystem.isHeroDeployed(payload.hero.id)) {
      this.showTemporaryMessage('该武将已上阵，拖回底栏可撤下')
      return
    }

    this.hideRange()
    this.hideUnitInfo()
    this.dragPayload = payload
    this.dragGhost = this.createDragGhost(payload)
    this.dragGhost.setPosition(pointer.x, pointer.y)
    // 动态唤起战场网格
    this.deploymentZoneRenderer.setGridVisible(true)
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
    this.deploymentZoneRenderer.setGridVisible(false)

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
   * 当前指针对应的落点脚印与是否可放（武将与士兵均占 1 格）
   */
  private getDropPreview(
    pointer: Phaser.Input.Pointer,
    _shape: 'hero' | 'troop'
  ): { cells: GridCell[]; valid: boolean } | null {
    const cell = cellAt(pointer.x, pointer.y)
    if (!cell) return null

    const grid = this.battleSystem.getDeployGrid()
    return { cells: [cell], valid: grid.canPlaceFootprint([cell]) }
  }

  /**
   * 拖拽幽灵（神将立像或兵人剪影）
   */
  private createDragGhost(payload: DragPayload): Phaser.GameObjects.Container {
    const ghost = this.add.container(0, 0)
    ghost.setDepth(40)
    ghost.setAlpha(0.85)

    if (payload.kind === 'hero') {
      const imageKey = this.getHeroImageKey(payload.hero.id)
      if (this.textures.exists(imageKey)) {
        const img = this.add.image(0, 0, imageKey)
        img.setDisplaySize(36, 36)
        ghost.add(img)
      }
      const name = inkText(this, 0, 24, payload.hero.name, {
        size: 9,
        color: InkText.ink,
        bold: true,
        originX: 0.5
      })
      ghost.add(name)
    } else {
      const textureKey = this.getTroopTextureKey(payload.troop.type)
      if (this.textures.exists(textureKey)) {
        const img = this.add.image(0, 0, textureKey)
        img.setDisplaySize(36, 36)
        ghost.add(img)
      }
      const name = inkText(this, 0, 26, payload.troop.name, {
        size: 10,
        color: InkText.ink,
        bold: true,
        originX: 0.5
      })
      ghost.add(name)
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
   * 部署英雄（占 1 格）
   */
  private tryPlaceHero(hero: Hero, cell: GridCell): void {
    const result = this.battleSystem.placeHero(hero.id, cell)

    if (result.success) {
      console.log(`成功在格子(${cell.col},${cell.row})部署英雄 ${hero.name}`)
    } else {
      console.log(`部署失败: ${result.reason}`)
      this.showTemporaryMessage(this.deployFailMessage(result.reason, '该格已被占用'))
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
   * 按下 → 显示攻击范围 + 五维属性卡；
   * 波间布阵期拖动越过阈值 → 重定位；拖回底栏 → 撤下；
   * 交火期（场上有敌军行军）锁定位置，点击英雄直接触发绝技或查看射程。
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

      // 交火期锁定阵位：不允许拖拽换位，点击武将直接尝试施放主动绝技
      if (!this.battleSystem.canRepositionUnits()) {
        if (kind === 'hero') {
          this.tryManualCastSkill(unit.getDeployedData().instanceId)
        }
        return
      }

      // 波间布阵期预备拖拽重定位：先释放格子占用（松开未拖动时恢复）
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
      this.deploymentZoneRenderer.setGridVisible(true)
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
    this.deploymentZoneRenderer.setGridVisible(false)
    drag.unit.setDepth(drag.originalDepth)
    drag.unit.setAlpha(1)

    // 未越过拖拽阈值：视为按住查看，恢复占用即可；若为武将且大招就绪，触发强令施法！
    if (!drag.dragging) {
      this.battleSystem.cancelUnitDrag(drag.instanceId, drag.originalFootprint)
      if (drag.kind === 'hero') {
        this.tryManualCastSkill(drag.instanceId)
      }
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
      this.showTemporaryMessage(
        result.reason === 'onPath'
          ? '行军路线上不可布防'
          : (result.reason === 'cellOccupied'
              ? '该格已被占用'
              : '无法移动到该格')
      )
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
   * 属性卡：单位头顶的宣纸小片（按住时显示五维属性与相生阵脉状态）
   */
  private showUnitInfo(unit: RangeUnit): void {
    this.hideUnitInfo()

    let title: string
    let line: string
    if (unit instanceof HeroEntity) {
      const hero = unit.getHeroData()
      const stats = unit.getEffectiveStats()
      const wuxing = INK_WUXING[hero.wuXing]
      const partner = this.battleSystem.getHeroBattleManager().getHeroLeylinePartner(unit.getDeployedData().instanceId)
      const leylineTag = partner ? ` · 【脉:${partner.getHeroData().name}】` : ''
      title = `${hero.name} (${hero.star ?? 1}★ Lv.${hero.level}) · ${wuxing.label}${leylineTag}`
      const critR = Math.round((stats.critRate ?? 0.1) * 100)
      const critD = Math.round((stats.critDamage ?? 0.5) * 100)
      line = `攻 ${stats.attack} · 速 ${stats.attackSpeed.toFixed(1)}/s · 程 ${stats.attackRange} · 暴 ${critR}%/+${critD}%`
    } else {
      const troop = unit.getTroopData()
      title = `${troop.name} · ${troop.displayChar}`
      line = `攻 ${troop.baseAttack} · 速 ${troop.attackSpeed.toFixed(1)}/秒 · 程 ${troop.attackRange}`
    }

    const width = this.cameras.main.width
    const offsetY = unit instanceof HeroEntity ? 92 : 50
    const cx = Phaser.Math.Clamp(unit.x, 140, width - 140)
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
   * 底部栏状态：已上阵武将置灰
   */
  private updateDockState(): void {
    this.dockHintText.setText('拖拽部署 · 按住单位看射程 · 拖回底栏撤下')
    this.dockHintText.setColor(InkText.faint)

    for (const [heroId, item] of this.dockHeroItems) {
      const deployed = this.battleSystem.isHeroDeployed(heroId)
      const textAlpha = deployed ? 0.4 : 1
      item.image.setAlpha(deployed ? 0.3 : 1)
      item.image.setTint(deployed ? 0x8a8a8a : 0xffffff)
      item.nameText.setAlpha(textAlpha)
      item.costText.setAlpha(textAlpha)
    }

    for (const item of this.dockTroopItems.values()) {
      item.icon.setAlpha(1)
      item.nameText.setAlpha(1)
      item.costText.setAlpha(1)
    }
  }

  /**
   * 部署失败文案
   */
  private deployFailMessage(reason: string | undefined, occupiedHint: string): string {
    switch (reason) {
      case 'insufficientCost': return '费用不足'
      case 'heroNotUnlocked': return '尚未解锁'
      case 'onPath': return '行军路线上不可布防'
      case 'invalidPosition': return '无法部署到该格'
      case 'cellOccupied': return occupiedHint
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
   * 创建中军令台（顶部整合水墨长卷式 HUD，分区排布杜绝文字重叠）
   */
  private createTopCommandBar(width: number): void {
    const barHeight = 52
    const bar = this.add.container(0, 0)
    bar.setDepth(25)

    // 1. 底衬：宣纸微透长卷 + 底部浓墨双边线 + 墨韵端头
    const bg = this.add.graphics()
    bg.fillStyle(InkColor.paperPanel, 0.95)
    bg.fillRect(0, 0, width, barHeight)
    // 底部墨线
    bg.lineStyle(1.5, InkColor.ink, 0.6)
    bg.beginPath()
    bg.moveTo(0, barHeight)
    bg.lineTo(width, barHeight)
    bg.strokePath()

    // 左右端头朱砂印方块
    bg.fillStyle(InkColor.cinnabar, 0.85)
    bg.fillRect(10, 19, 10, 14)
    bg.fillRect(width - 20, 19, 10, 14)

    // 竖向淡墨分隔线（按 7 大功能区精准对齐）
    const drawDivider = (x: number) => {
      bg.lineStyle(1, InkColor.ink, 0.18)
      bg.beginPath()
      bg.moveTo(x, 14)
      bg.lineTo(x, barHeight - 14)
      bg.strokePath()
    }
    drawDivider(146)
    drawDivider(266)
    drawDivider(512)
    drawDivider(774)
    drawDivider(900)
    drawDivider(1040)
    bar.add(bg)

    // 2. 左区：军费 (粮草) 模块 (x: 23 ~ 138)
    this.createBadgeInBar(bar, 36, 26, '粮', 0xdadfc9, 0x5f7a4a)
    this.costText = inkText(this, 54, 26, '军费 20', {
      size: 15,
      color: InkText.strong,
      bold: true,
      originY: 0.5
    })
    bar.add(this.costText)

    // 3. 左中区：帅营 (生命) 模块 (x: 153 ~ 258)
    this.createBadgeInBar(bar, 166, 26, '帅', 0xe6d2ca, InkColor.cinnabar)
    this.healthText = inkText(this, 184, 26, '帅营 20', {
      size: 15,
      color: InkText.strong,
      bold: true,
      originY: 0.5
    })
    bar.add(this.healthText)

    // 3.5 军令进度条 (x: 277 ~ 427)
    this.energyGaugeBar = new EnergyGaugeBar(
      this,
      368,
      26,
      this.battleSystem.getAugmentManager(),
      () => this.openAugmentModal()
    )
    bar.add(this.energyGaugeBar)

    // 3.6 军师锦囊叠加状态总览按钮 (x: 432 ~ 504)
    const augmentBtn = createInkButton(this, 468, 26, 72, 28, '锦囊 (0)', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 12,
      stroke: InkColor.ink,
      onClick: () => this.openAugmentStatusModal()
    })
    bar.add(augmentBtn)
    const augmentTxt = augmentBtn.getAt(1) as Phaser.GameObjects.Text
    if (augmentTxt) this.augmentStatusBtnText = augmentTxt

    // 4. 中央：关卡名称 + 印章 (x: 516 ~ 770)
    const levelTitle = this.currentLevelConfig?.name || level1Config.name
    const titleCenterX = 634
    const title = inkText(this, titleCenterX, 26, levelTitle, {
      size: 17,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    bar.add(title)
    const sealX = Math.min(760, titleCenterX + title.width / 2 + 14)
    const seal = this.add.rectangle(sealX, 26, 15, 15, InkColor.cinnabar)
    bar.add(seal)
    const sealChar = inkText(this, sealX, 26, '战', {
      size: 10,
      color: InkText.paper,
      originX: 0.5,
      originY: 0.5
    })
    bar.add(sealChar)

    // 4.5 军机令印（天候战况详略，常驻可点，x: 782 ~ 894）
    this.createMilitaryBadge(bar, width)

    // 5. 右区：波次模块 (x: 909 ~ 1034)
    this.createBadgeInBar(bar, 922, 26, '阵', InkColor.paperDeep, InkColor.ink)
    this.waveText = inkText(this, 940, 26, '波次 1/15', {
      size: 15,
      color: InkText.strong,
      bold: true,
      originY: 0.5
    })
    bar.add(this.waveText)

    // 6. 击鼓迎敌按钮 (x: 1049 ~ 1135)
    this.earlyWaveBtn = createInkButton(this, 1092, 26, 86, 30, '击鼓迎敌', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb53a32,
      textColor: InkText.paper,
      fontSize: 12,
      onClick: () => this.handleEarlyWave()
    })
    this.earlyWaveBtn.setDepth(26)

    // 7. 倍速控制按钮 (1X / 2X / 3X / 5X) (x: 1144 ~ 1192)
    const speedBtn = createInkButton(this, 1168, 26, 48, 30, '1X', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 13,
      stroke: InkColor.ink,
      onClick: () => this.toggleSpeed()
    })
    speedBtn.setDepth(26)
    const speedTxt = speedBtn.getAt(1) as Phaser.GameObjects.Text
    if (speedTxt) this.speedBtnText = speedTxt

    // 8. 暂停控制按钮 (⏸ / ▶) (x: 1200 ~ 1242)
    const pauseBtn = createInkButton(this, 1221, 26, 42, 30, '⏸', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 14,
      stroke: InkColor.ink,
      onClick: () => this.togglePause()
    })
    pauseBtn.setDepth(26)
    const pauseTxt = pauseBtn.getAt(1) as Phaser.GameObjects.Text
    if (pauseTxt) this.pauseBtnText = pauseTxt
  }

  /**
   * 中军令台徽章图标小方块
   */
  private createBadgeInBar(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string,
    bgColor: number,
    borderColor: number
  ): void {
    const size = 26
    const g = this.add.graphics()
    g.fillStyle(bgColor, 1)
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 4)
    g.lineStyle(1.5, borderColor, 0.9)
    g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 4)
    container.add(g)

    const label = inkText(this, x, y, text, {
      size: 13,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    container.add(label)
  }

  /**
   * 切换战斗速度 (1X / 2X / 3X / 5X)
   */
  private toggleSpeed(): void {
    const current = this.battleSystem.getTimeScale()
    let idx = this.speedOptions.findIndex(s => Math.abs(s - current) < 0.1)
    if (idx === -1) idx = 0
    const next = this.speedOptions[(idx + 1) % this.speedOptions.length]
    this.battleSystem.setTimeScale(next)
    if (this.speedBtnText) {
      this.speedBtnText.setText(`${next}X`)
    }
    inkToast(this, `战速已调整为 ${next}X`, 60)
  }

  /**
   * 切换暂停 / 继续
   */
  private togglePause(): void {
    const paused = this.battleSystem.togglePause()
    if (this.pauseBtnText) {
      this.pauseBtnText.setText(paused ? '▶' : '⏸')
    }
    if (paused) {
      this.showPauseOverlay()
    } else {
      this.hidePauseOverlay()
    }
  }

  /**
   * 显示暂停状态幕帘
   */
  private showPauseOverlay(): void {
    if (this.pauseOverlay) return
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const c = this.add.container(0, 0)
    c.setDepth(50)

    const mask = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.25)
    mask.setInteractive()
    mask.on('pointerdown', () => this.togglePause())
    c.add(mask)

    const box = this.add.graphics()
    box.fillStyle(InkColor.paperPanel, 0.96)
    box.fillRoundedRect(width / 2 - 140, height / 2 - 45, 280, 90, 8)
    box.lineStyle(2, InkColor.ink, 0.75)
    box.strokeRoundedRect(width / 2 - 140, height / 2 - 45, 280, 90, 8)
    c.add(box)

    const title = inkText(this, width / 2, height / 2 - 15, '战局休整 · 暂停中', {
      size: 20,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const tip = inkText(this, width / 2, height / 2 + 18, '点击屏幕任意处或右上角继续战斗', {
      size: 13,
      color: InkText.faint,
      originX: 0.5,
      originY: 0.5
    })
    c.add([title, tip])

    this.pauseOverlay = c
  }

  private hidePauseOverlay(): void {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy()
      this.pauseOverlay = null
    }
  }

  /**
   * 开启军师锦囊三选一弹窗
   */
  private openAugmentModal(): void {
    if (this.augmentModal) return
    this.battleSystem.setPaused(true)

    this.augmentModal = new AugmentSelectModal(
      this,
      this.battleSystem.getAugmentManager(),
      this.battleSystem.getDeployedHeroIds(),
      this.battleSystem.getDeployedWuXing(),
      (selected) => {
        this.augmentModal = null
        this.battleSystem.setPaused(false)
        this.energyGaugeBar.updateProgress()
        inkToast(this, `【获锦囊】${selected.name}：${selected.subtitle || ''}`, 90)
      },
      () => {
        this.augmentModal = null
        this.battleSystem.setPaused(false)
        this.energyGaugeBar.updateProgress()
      }
    )
  }

  /**
   * 击鼓迎敌：提前召唤下一波敌人
   */
  private handleEarlyWave(): void {
    const res = this.battleSystem.callNextWaveEarly()
    if (res.success) {
      inkToast(this, `擂鼓迎敌！士气大振，赏银 +${res.bonusCost}`, 120)
    } else {
      inkToast(this, '尚未到迎敌时机', 60)
    }
  }

  /**
   * 创建UI
   */
  private createUI(width: number, height: number): void {
    this.createTopCommandBar(width)
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

    const backBtn = createInkButton(this, 76, dockY, 108, 40, '返回', {
      fill: InkColor.paperDeep,
      hoverFill: InkColor.paper,
      textColor: InkText.ink,
      fontSize: 17,
      stroke: InkColor.ink,
      onClick: () => {
        this.scene.start('TitleScene')
      }
    })
    this.deployDock.add(backBtn)

    const saveManager = SaveManager.getInstance()
    const heroes = Array.from(saveManager.loadHeroes().values())

    let x = 176
    for (const hero of heroes) {
      this.addDockHero(hero, x, dockY)
      x += 82
    }

    const divider = this.add.rectangle(x - 16, dockY, 1, 64, InkColor.ink, 0.25)
    this.deployDock.add(divider)
    x += 18

    for (const troop of troops) {
      this.addDockTroop(troop, x, dockY)
      x += 74
    }

    // 右侧布防操作指引（放置在右侧独立宣纸底框内，杜绝覆盖武将槽位）
    const hintW = 280
    const hintH = 34
    const hintX = width - 175
    const hintBg = this.add.rectangle(hintX, dockY, hintW, hintH, InkColor.paperDeep, 0.5)
    hintBg.setStrokeStyle(1, InkColor.inkFaint, 0.4)
    this.deployDock.add(hintBg)

    this.dockHintText = inkText(this, hintX, dockY, '拖拽部署 · 按住看射程 · 拖回撤阵', {
      size: 11,
      color: InkText.wash,
      originX: 0.5,
      originY: 0.5
    })
    this.deployDock.add(this.dockHintText)
  }

  private addDockHero(hero: Hero, x: number, y: number): void {
    const imageKey = this.getHeroImageKey(hero.id)
    if (this.textures.exists(imageKey)) {
      const heroImage = this.add.image(x, y - 14, imageKey)
      heroImage.setDisplaySize(40, 40)
      heroImage.setInteractive({ useHandCursor: true })
      heroImage.on('pointerover', () => heroImage.setScale(heroImage.scaleX * 1.08))
      heroImage.on('pointerout', () => heroImage.setDisplaySize(40, 40))
      heroImage.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.beginDrag({ kind: 'hero', hero }, pointer)
      })
      this.deployDock.add(heroImage)

      const nameText = inkText(this, x, y + 16, hero.name, {
        size: 12,
        color: InkText.ink,
        bold: true,
        originX: 0.5,
        originY: 0.5
      })
      const effectiveCost = this.battleSystem.getEffectiveHeroDeploymentCost(hero)
      const costText = inkText(this, x, y + 32, `粮 ${effectiveCost}`, {
        size: 11,
        color: InkText.gold,
        originX: 0.5,
        originY: 0.5
      })
      this.deployDock.add(nameText)
      this.deployDock.add(costText)

      this.dockHeroItems.set(hero.id, { image: heroImage, nameText, costText })
    }
  }

  private addDockTroop(troop: TroopConfig, x: number, y: number): void {
    const textureKey = this.getTroopTextureKey(troop.type)
    const troopIcon = this.add.image(x, y - 14, textureKey)
    troopIcon.setDisplaySize(36, 36)
    troopIcon.setInteractive({ useHandCursor: true })
    troopIcon.on('pointerover', () => troopIcon.setScale(troopIcon.scaleX * 1.12))
    troopIcon.on('pointerout', () => troopIcon.setDisplaySize(36, 36))
    troopIcon.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.beginDrag({ kind: 'troop', troop }, pointer)
    })

    const nameText = inkText(this, x, y + 16, troop.name, {
      size: 12,
      color: InkText.ink,
      originX: 0.5,
      originY: 0.5
    })
    const costText = inkText(this, x, y + 32, `粮 ${troop.deploymentCost}`, {
      size: 11,
      color: InkText.gold,
      originX: 0.5,
      originY: 0.5
    })
    this.deployDock.add(troopIcon)
    this.deployDock.add(nameText)
    this.deployDock.add(costText)

    this.dockTroopItems.set(troop.id, { icon: troopIcon, nameText, costText })
  }

  /**
   * 获取兵种剪影纹理key
   */
  private getTroopTextureKey(type: string): string {
    const map: Record<string, string> = {
      spearman: 'ink_troop_spearman',
      archer: 'ink_troop_archer',
      cavalry: 'ink_troop_cavalry',
      swordsman: 'ink_troop_swordsman'
    }
    return map[type] || 'ink_troop_spearman'
  }

  /**
   * 获取英雄头像图片key（优先使用水墨将魂剪影）
   */
  private getHeroImageKey(heroId: string): string {
    const silhouetteMap: Record<string, string> = {
      'hero_guanyu': 'ink_hero_guanyu',
      'hero_zhangfei': 'ink_hero_zhangfei',
      'hero_zhaoyun': 'ink_hero_zhaoyun',
      'hero_huangzhong': 'ink_hero_huangzhong',
      'hero_machao': 'ink_hero_machao'
    }

    const key = silhouetteMap[heroId]
    if (key && this.textures.exists(key)) {
      return key
    }

    if (this.textures.exists('ink_hero_generic')) {
      return 'ink_hero_generic'
    }

    return 'hero_placeholder'
  }

  /**
   * 注册战斗事件回调
   */
  private registerBattleCallbacks(): void {
    this.battleSystem.onEnemyKilled((enemy) => {
      console.log(`敌人 ${enemy.getEnemyData().name} 被击杀`)
    })

    this.battleSystem.onEnemyReachedExit((enemy) => {
      const data = enemy.getEnemyData()
      if (data.type === 'boss') {
        this.showTemporaryMessage(`【大营沦陷 · 斩将夺旗】统帅 ${data.name} 突破防线！`)
      } else if (data.type === 'elite') {
        this.showTemporaryMessage(`精英【${data.name}】突破防线，帅营 -3！`)
      } else {
        this.showTemporaryMessage('敌兵突破防线，帅营 -1！')
      }
    })

    this.battleSystem.onWaveStart((wave) => {
      const ws = this.battleSystem.getWeatherSystem()
      const weather = ws.getCurrentWeather()
      const secWeather = ws.getCurrentSecondaryWeather()
      if (wave === 16 || wave === 26 || wave === 36) {
        const beacon = EndlessModeManager.getBeaconTierInfo(wave)
        this.showTemporaryMessage(
          `【${beacon.icon} ${beacon.title}】${beacon.mechanicSummary} · 灵石保底 +${Math.round(beacon.gemMinRollPercentile * 100)}%`
        )
      } else if (secWeather) {
        this.showTemporaryMessage(`第 ${wave} 波来袭 · 双象天时【${weather.name} + ${secWeather.name}】`)
      } else {
        this.showTemporaryMessage(`第 ${wave} 波来袭 · 天时【${weather.name}】`)
      }
    })

    // 无弹窗动态天时轮转监听
    this.battleSystem.onWeatherChanged((weather, wave) => {
      this.updateMilitaryBadge()
      this.weatherFX.setWeather(weather.ambientWeatherKey || 'clear')
      const secWeather = this.battleSystem.getWeatherSystem().getCurrentSecondaryWeather()
      if (secWeather) {
        inkToast(
          this,
          `【双象疾电 · 第${wave}波】${weather.name} + ${secWeather.name}：敌军享双天时五维增幅！`,
          130
        )
      } else {
        inkToast(this, `【观星天时 · 第${wave}波】${weather.name}：${weather.description}`, 120)
      }
    })

    // 第 15 波通关抉择：【🏆 凯旋班师】 vs 【🔥 乘胜北伐 · 踏入无尽烽火 (Wave 16+)】
    this.battleSystem.onCampaignWave15Choice(() => {
      this.showCampaignWave15ChoiceModal()
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

    // 监听军师锦囊就绪事件
    this.battleSystem.getAugmentManager().setCallbacks({
      onStratagemReady: (count) => {
        this.energyGaugeBar?.updateProgress()
        inkToast(this, `【天命锦囊已就绪 ×${count}】点击上方军令台开启三选一`, 120)
      }
    })

    this.battleSystem.onMilitarySituation((situation) => {
      this.openMilitarySituationModal(situation)
    })
  }

  /**
   * 弹出第 15 波关底统帅击败后的水墨抉择：
   * [🏆 凯旋班师] 或 [🔥 乘胜北伐 · 踏入无尽烽火 (Wave 16+)]
   */
  private showCampaignWave15ChoiceModal(): void {
    if (this.wave15ChoiceModal) {
      this.wave15ChoiceModal.destroy()
      this.wave15ChoiceModal = null
    }

    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const modal = this.add.container(0, 0)
    modal.setDepth(60)

    const mask = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55)
    mask.setInteractive()
    modal.add(mask)

    const cardW = 540
    const cardH = 290
    const cardX = width / 2 - cardW / 2
    const cardY = height / 2 - cardH / 2

    const box = this.add.graphics()
    box.fillStyle(InkColor.paperPanel, 0.98)
    box.fillRoundedRect(cardX, cardY, cardW, cardH, 10)
    box.lineStyle(2.5, InkColor.cinnabar, 0.9)
    box.strokeRoundedRect(cardX, cardY, cardW, cardH, 10)
    box.lineStyle(1, InkColor.ink, 0.35)
    box.strokeRoundedRect(cardX + 6, cardY + 6, cardW - 12, cardH - 12, 8)
    modal.add(box)

    const title = inkText(this, width / 2, cardY + 42, '【大捷 · 十五波镇守主帅授首】', {
      size: 22,
      color: InkText.cinnabar,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })
    const desc = inkText(
      this,
      width / 2,
      cardY + 106,
      '主公已涤荡十五波敌军、击破关底统帅五行铁壁！\n今可凯旋班师领取全额功勋，或率当前阵脉与五策锦囊乘胜北伐，\n踏入第 16 波无尽烽火（掉落灵石词条保底分位逐层跃升）！',
      {
        size: 14,
        color: InkText.ink,
        originX: 0.5,
        originY: 0.5
      }
    )
    desc.setAlign('center')
    modal.add([title, desc])

    const triumphBtn = createInkButton(this, width / 2 - 135, cardY + 225, 220, 46, '🏆 凯旋班师（通关结算）', {
      fill: InkColor.inkStrong,
      hoverFill: InkColor.ink,
      textColor: InkText.paper,
      fontSize: 15,
      onClick: () => {
        modal.destroy()
        this.wave15ChoiceModal = null
        this.battleSystem.confirmCampaignVictory()
      }
    })

    const endlessBtn = createInkButton(this, width / 2 + 135, cardY + 225, 235, 46, '🔥 乘胜北伐 (Wave 16+)', {
      fill: InkColor.cinnabar,
      hoverFill: 0xb53a32,
      textColor: InkText.paper,
      fontSize: 15,
      onClick: () => {
        modal.destroy()
        this.wave15ChoiceModal = null
        inkToast(this, '【乘胜北伐】大军开拔！踏入第 16 波无尽烽火！', 140)
        this.battleSystem.continueToEndlessNorthExpedition()
      }
    })

    modal.add([triumphBtn, endlessBtn])
    this.wave15ChoiceModal = modal
  }

  /**
   * 渲染地面 160px 五行相生阵脉连线（水墨流光双线 + 阵脉交叠提示）
   */
  private renderGeneratingLeylines(): void {
    if (!this.leylineGraphics || !this.battleSystem) return
    this.leylineGraphics.clear()

    const heroMgr = this.battleSystem.getHeroBattleManager()
    const connections = heroMgr.getLeylineConnections()
    if (connections.length === 0) return

    const heroes = heroMgr.getDeployedHeroes()
    const heroMap = new Map<string, HeroEntity>()
    for (const h of heroes) {
      heroMap.set(h.getDeployedData().instanceId, h)
    }

    for (const conn of connections) {
      const h1 = heroMap.get(conn.sourceHeroId)
      const h2 = heroMap.get(conn.targetHeroId)
      if (!h1 || !h2) continue

      const x1 = h1.x
      const y1 = h1.y
      const x2 = h2.x
      const y2 = h2.y

      const c1 = INK_WUXING[conn.sourceWuXing]?.border ?? InkColor.cinnabar
      const c2 = INK_WUXING[conn.targetWuXing]?.border ?? InkColor.cinnabar

      // 外层水墨晕染底线
      this.leylineGraphics.lineStyle(6, InkColor.ink, 0.18)
      this.leylineGraphics.beginPath()
      this.leylineGraphics.moveTo(x1, y1)
      this.leylineGraphics.lineTo(x2, y2)
      this.leylineGraphics.strokePath()

      // 双色五行相生流光连线
      this.leylineGraphics.lineStyle(2.5, c1, 0.78)
      this.leylineGraphics.beginPath()
      this.leylineGraphics.moveTo(x1, y1)
      this.leylineGraphics.lineTo((x1 + x2) / 2, (y1 + y2) / 2)
      this.leylineGraphics.strokePath()

      this.leylineGraphics.lineStyle(2.5, c2, 0.78)
      this.leylineGraphics.beginPath()
      this.leylineGraphics.moveTo((x1 + x2) / 2, (y1 + y2) / 2)
      this.leylineGraphics.lineTo(x2, y2)
      this.leylineGraphics.strokePath()

      // 连线中点阵脉金环节点
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2
      this.leylineGraphics.fillStyle(InkColor.paperPanel, 0.92)
      this.leylineGraphics.fillCircle(mx, my, 7)
      this.leylineGraphics.lineStyle(1.5, InkColor.cinnabar, 0.85)
      this.leylineGraphics.strokeCircle(mx, my, 7)
    }
  }

  /**
   * 打开军机密信水墨文书弹窗
   */
  private openMilitarySituationModal(situation: MilitarySituation): void {
    if (this.militaryModal) {
      this.militaryModal.destroy()
      this.militaryModal = null
    }

    this.militaryModal = new MilitarySituationModal(this, situation, (type) => {
      this.battleSystem.applyMilitaryTactic(type)
      const tactic = this.battleSystem.getMilitarySituationManager().getActiveTactic()
      if (tactic) {
        inkToast(this, `【军机决断 · ${tactic.name}】已启奏全军`, 120)
        this.weatherFX.setWeather(situation.weather)
        this.updateMilitaryBadge()
      }
      this.militaryModal = null
    })
  }

  /**
   * 创建顶部令台右侧【观星台·天时】令印徽章（x: 838，点击可查看当前与下段天时预告）
   */
  private createMilitaryBadge(bar: Phaser.GameObjects.Container, _width: number): void {
    this.militaryBadgeContainer = this.add.container(838, 26)
    this.militaryBadgeContainer.setVisible(true)

    this.militarySealBg = this.add.rectangle(0, 0, 96, 28, InkColor.paperDeep, 0.95)
    this.militarySealBg.setStrokeStyle(1.2, InkColor.ink)
    this.militarySealBg.setInteractive({ useHandCursor: true })
    this.militarySealBg.on('pointerdown', () => {
      const ws = this.battleSystem.getWeatherSystem()
      const cur = ws.getCurrentWeather()
      const sec = ws.getCurrentSecondaryWeather()
      const next = ws.getNextSegmentWeather(this.battleSystem.getState().currentWave || 1)
      const secNote = sec ? ` + 伴生【${sec.name}】` : ''
      inkToast(
        this,
        `【观星台】当前：${cur.name}${secNote}（${cur.description}）｜下段预告：${next.name}`,
        140
      )
    })

    this.militarySealText = inkText(this, 0, 0, '天时·晴空', {
      size: 12,
      color: InkText.strong,
      bold: true,
      originX: 0.5,
      originY: 0.5
    })

    this.militaryBadgeContainer.add([this.militarySealBg, this.militarySealText])
    bar.add(this.militaryBadgeContainer)
  }

  /**
   * 打开军机密报战况详情弹窗
   */
  private openMilitaryDetailModal(): void {
    if (this.militaryDetailModal) {
      this.militaryDetailModal.destroy()
      this.militaryDetailModal = null
    }
    const mgr = this.battleSystem.getMilitarySituationManager()
    this.militaryDetailModal = new MilitarySituationDetailModal(
      this,
      mgr.getActiveSituation(),
      mgr.getActiveTactic(),
      () => {
        this.militaryDetailModal = null
      }
    )
  }

  /**
   * 打开已激活锦囊叠加状态总览弹窗
   */
  private openAugmentStatusModal(): void {
    if (this.augmentStatusModal) {
      this.augmentStatusModal.destroy()
      this.augmentStatusModal = null
    }
    this.augmentStatusModal = new AugmentStatusModal(
      this,
      this.battleSystem.getAugmentManager(),
      () => {
        this.augmentStatusModal = null
      }
    )
  }

  /**
   * 刷新观星台天时徽章显示
   */
  private updateMilitaryBadge(): void {
    if (!this.militaryBadgeContainer || !this.militarySealBg || !this.militarySealText) return
    const ws = this.battleSystem.getWeatherSystem()
    const weather = ws.getCurrentWeather()
    const secWeather = ws.getCurrentSecondaryWeather()
    const weatherKey = secWeather ? `${weather.id}+${secWeather.id}` : weather.id

    if (weatherKey === this.lastMilitaryTacticId) return
    this.lastMilitaryTacticId = weatherKey

    const shortName = weather.name.slice(0, 2)
    const label = secWeather
      ? `双象·${shortName}/${secWeather.name.slice(0, 2)}`
      : `天时·${shortName}`

    if (weather.element) {
      const wxColor = INK_WUXING[weather.element]?.border ?? InkColor.cinnabar
      this.militarySealBg.setFillStyle(wxColor, 0.9)
      this.militarySealBg.setSize(secWeather ? 112 : 96, 28)
      this.militarySealText.setColor('#ffffff')
      this.militarySealText.setText(label)
    } else {
      this.militarySealBg.setFillStyle(InkColor.paperDeep, 0.95)
      this.militarySealBg.setSize(96, 28)
      this.militarySealText.setColor(InkText.strong)
      this.militarySealText.setText(label)
    }
  }

  /**
   * 场景更新（每帧调用）
   */
  update(_time: number, delta: number): void {
    if (!this.battleSystem) return

    this.battleSystem.update(delta)
    this.renderGeneratingLeylines()
    this.updateUI()
  }

  /**
   * 更新UI
   */
  private updateUI(): void {
    const state = this.battleSystem.getState()

    this.costText.setText(`军费 ${state.currentCost}`)
    this.healthText.setText(`帅营 ${state.playerHealth}`)

    // 无尽模式显示【三重烽火】标识 + 当前波次，普通模式显示 15 波进度
    if (this.battleSystem.isEndlessMode()) {
      const beacon = EndlessModeManager.getBeaconTierInfo(state.currentWave)
      this.waveText.setText(`${beacon.icon} 第 ${state.currentWave} 波`)
    } else {
      this.waveText.setText(`波次 ${state.currentWave}/${state.totalWaves}`)
    }

    // 动态刷新锦囊徽章已获得数量
    const augmentCount = this.battleSystem.getAugmentManager().getActiveAugments().length
    if (this.augmentStatusBtnText) {
      this.augmentStatusBtnText.setText(`锦囊 (${augmentCount})`)
    }

    this.energyGaugeBar?.updateProgress()
    this.updateDockState()
    this.updateMilitaryBadge()

    // 动态更新击鼓迎敌按钮状态
    const canEarly = this.battleSystem.canCallNextWaveEarly()
    this.earlyWaveBtn.setVisible(canEarly)
  }
}
