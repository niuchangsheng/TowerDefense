import { Area } from '@/types'
import { GRID, GridCell, cellKey, cellInBounds } from '@/config/constants'

/**
 * 部署格占位表
 * 战场按 80px 格子规划：兵种占 1 格，英雄横占 1×2 两格。
 * 负责：格子是否可部署（在部署区内）、是否被占、脚印合法性、首空位扫描。
 */
export class DeployGrid {
  /** cellKey -> 占用单位 instanceId */
  private occupied: Map<string, string>
  /** instanceId -> 占用格子（撤退时释放） */
  private footprintByInstance: Map<string, GridCell[]>
  private deployableAreas: Area[]

  constructor(deployableAreas: Area[]) {
    this.occupied = new Map()
    this.footprintByInstance = new Map()
    this.deployableAreas = deployableAreas
  }

  /**
   * 格子是否可部署：战场内任意格均可落子（占用另查）
   */
  isCellDeployable(cell: GridCell): boolean {
    return cellInBounds(cell)
  }

  /**
   * 格子是否已被占用
   */
  isOccupied(cell: GridCell): boolean {
    return this.occupied.has(cellKey(cell))
  }

  /**
   * 脚印是否可放置：全部格在界内、在部署区内且未被占用
   */
  canPlaceFootprint(cells: GridCell[]): boolean {
    return cells.every(c => this.isCellDeployable(c) && !this.isOccupied(c))
  }

  /**
   * 英雄 1×2 脚印：锚点格 + 优先右邻格，右邻不合法则试左邻。
   * 放不下返回 null。
   */
  heroFootprint(anchor: GridCell): GridCell[] | null {
    const right: GridCell[] = [
      { col: anchor.col, row: anchor.row },
      { col: anchor.col + 1, row: anchor.row }
    ]
    if (this.canPlaceFootprint(right)) return right

    const left: GridCell[] = [
      { col: anchor.col - 1, row: anchor.row },
      { col: anchor.col, row: anchor.row }
    ]
    if (this.canPlaceFootprint(left)) return left

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
   * 全图扫描首个放得下的脚印（行优先，英雄只试右邻）。
   * @param shape 'hero' = 1×2，'troop' = 1×1
   */
  findFirstFit(shape: 'hero' | 'troop'): GridCell[] | null {
    for (let r = 0; r < GRID.rows; r++) {
      for (let c = 0; c < GRID.cols; c++) {
        const anchor: GridCell = { col: c, row: r }
        if (shape === 'troop') {
          if (this.canPlaceFootprint([anchor])) return [anchor]
        } else {
          const cells: GridCell[] = [
            anchor,
            { col: c + 1, row: r }
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
