import { Area, Point } from '@/types'
import { GRID, GridCell, cellKey, cellInBounds } from '@/config/constants'

/**
 * 部署格占位表
 * 战场按 40px 格子规划：兵种与武将均占 1 格（40×40）。
 * 负责：格子是否可部署（必须在界内且绝不能在行军路线上）、是否被占、脚印合法性、首空位扫描。
 */
export class DeployGrid {
  /** cellKey -> 占用单位 instanceId */
  private occupied: Map<string, string>
  /** instanceId -> 占用格子（撤退时释放） */
  private footprintByInstance: Map<string, GridCell[]>
  private deployableAreas: Area[]
  /** 行军路线经过的所有格子（禁止布防） */
  private pathCells: Set<string>

  constructor(deployableAreas: Area[], path?: Point[]) {
    this.occupied = new Map()
    this.footprintByInstance = new Map()
    this.deployableAreas = deployableAreas
    this.pathCells = new Set()
    if (path && path.length > 0) {
      this.initPathCells(path)
    }
  }

  /**
   * 将行军路线折线映射并注册为路径禁止布防格
   */
  private initPathCells(path: Point[]): void {
    const addCell = (col: number, row: number) => {
      if (col >= 0 && col < GRID.cols && row >= 0 && row < GRID.rows) {
        this.pathCells.add(`${col},${row}`)
      }
    }

    for (let i = 0; i < path.length - 1; i++) {
      const p0 = path[i]
      const p1 = path[i + 1]
      const dx = p1.x - p0.x
      const dy = p1.y - p0.y
      const dist = Math.hypot(dx, dy)
      const steps = Math.max(1, Math.ceil(dist / 5))

      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const x = p0.x + dx * t
        const y = p0.y + dy * t
        const col = Math.min(GRID.cols - 1, Math.max(0, Math.floor(x / GRID.cellSize)))
        const row = Math.min(GRID.rows - 1, Math.max(0, Math.floor(y / GRID.cellSize)))
        addCell(col, row)
      }
    }
  }

  /**
   * 格子是否为行军路径格
   */
  isPathCell(cell: GridCell): boolean {
    return this.pathCells.has(cellKey(cell))
  }

  /**
   * 格子是否可部署：界内且绝不能在行军路线上
   */
  isCellDeployable(cell: GridCell): boolean {
    return cellInBounds(cell) && !this.isPathCell(cell)
  }

  /**
   * 格子是否已被占用
   */
  isOccupied(cell: GridCell): boolean {
    return this.occupied.has(cellKey(cell))
  }

  /**
   * 脚印是否可放置：全部格在界内、未被占用且不在行军路线上
   */
  canPlaceFootprint(cells: GridCell[]): boolean {
    return cells.every(c => this.isCellDeployable(c) && !this.isOccupied(c))
  }

  /**
   * 英雄 1 格脚印：
   * 校验目标格是否可放置，合法返回 [anchor]，放不下返回 null。
   */
  heroFootprint(anchor: GridCell): GridCell[] | null {
    if (this.canPlaceFootprint([anchor])) {
      return [anchor]
    }
    return null
  }

  /**
   * 查询某单位占用的脚印（返回副本；未占用返回 undefined）
   */
  getFootprint(instanceId: string): GridCell[] | undefined {
    const cells = this.footprintByInstance.get(instanceId)
    return cells ? cells.map(c => ({ ...c })) : undefined
  }

  /**
   * 占用脚印
   */
  occupy(cells: GridCell[], instanceId: string): void {
    for (const cell of cells) {
      this.occupied.set(cellKey(cell), instanceId)
    }
    this.footprintByInstance.set(instanceId, cells.map(c => ({ ...c })))
  }

  /**
   * 释放某单位占用的所有格子
   */
  release(instanceId: string): void {
    const cells = this.footprintByInstance.get(instanceId)
    if (!cells) return

    for (const cell of cells) {
      this.occupied.delete(cellKey(cell))
    }
    this.footprintByInstance.delete(instanceId)
  }

  /**
   * 全图扫描首个放得下的脚印（行优先）。
   * @param shape 'hero' | 'troop' 均占 1 格
   */
  findFirstFit(_shape?: 'hero' | 'troop'): GridCell[] | null {
    for (let r = 0; r < GRID.rows; r++) {
      for (let c = 0; c < GRID.cols; c++) {
        const anchor: GridCell = { col: c, row: r }
        if (this.canPlaceFootprint([anchor])) return [anchor]
      }
    }
    return null
  }

  /**
   * 重置占位
   */
  reset(): void {
    this.occupied.clear()
    this.footprintByInstance.clear()
  }
}
