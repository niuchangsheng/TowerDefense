import { Area, Point } from '@/types'
import { GRID, GridCell, cellKey, cellInBounds } from '@/config/constants'

/**
 * 部署格占位表
 * 战场按 40px 格子规划：兵种占 1 格（40×40），英雄占 2×2 田字 4 格（80×80）。
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
   * 英雄 2×2 田字脚印：
   * 优先以锚点格为左上角 (anchor, right, bottom, bottomRight)，
   * 若靠边或被阻挡则尝试偏移试探，放不下返回 null。
   */
  heroFootprint(anchor: GridCell): GridCell[] | null {
    const makeQuad = (c: number, r: number): GridCell[] => [
      { col: c, row: r },
      { col: c + 1, row: r },
      { col: c, row: r + 1 },
      { col: c + 1, row: r + 1 }
    ]

    // 1. 优先：以 anchor 为左上角
    const quadTL = makeQuad(anchor.col, anchor.row)
    if (this.canPlaceFootprint(quadTL)) return quadTL

    // 2. 备选：以 anchor 为右上角（往左移1格）
    const quadTR = makeQuad(anchor.col - 1, anchor.row)
    if (this.canPlaceFootprint(quadTR)) return quadTR

    // 3. 备选：以 anchor 为左下角（往上移1格）
    const quadBL = makeQuad(anchor.col, anchor.row - 1)
    if (this.canPlaceFootprint(quadBL)) return quadBL

    // 4. 备选：以 anchor 为右下角（往左上各移1格）
    const quadBR = makeQuad(anchor.col - 1, anchor.row - 1)
    if (this.canPlaceFootprint(quadBR)) return quadBR

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
   * @param shape 'hero' = 2×2 田字格，'troop' = 1×1 单格
   */
  findFirstFit(shape: 'hero' | 'troop'): GridCell[] | null {
    for (let r = 0; r < GRID.rows; r++) {
      for (let c = 0; c < GRID.cols; c++) {
        const anchor: GridCell = { col: c, row: r }
        if (shape === 'troop') {
          if (this.canPlaceFootprint([anchor])) return [anchor]
        } else {
          const cells: GridCell[] = [
            { col: c, row: r },
            { col: c + 1, row: r },
            { col: c, row: r + 1 },
            { col: c + 1, row: r + 1 }
          ]
          if (this.canPlaceFootprint(cells)) return cells
        }
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
