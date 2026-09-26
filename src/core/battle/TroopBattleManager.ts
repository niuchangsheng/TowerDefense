import Phaser from 'phaser'
import { EnemyEntity } from '@/entities/EnemyEntity'
import { TroopEntity } from '@/entities/TroopEntity'
import { DamageCalculator } from './DamageCalculator'
import { CharacterAttackFX } from '@/effects/CharacterAttackFX'
import { WeaponFX } from '@/effects/WeaponFX'

/**
 * 兵种战斗管理器
 * 仿 HeroBattleManager 的攻击循环，但兵种无技能、无五行：
 * 冷却 1000/攻速(次每秒) → 射程内取最近敌人 → 平伤 baseAttack →
 * 按攻击动作放武器特效（枪刺/刀砍/弓箭）+ 飘字/受击抖动。
 */
export class TroopBattleManager {
  private deployedTroops: Map<string, TroopEntity>
  private enemyManager: any  // EnemyManager类型，避免循环依赖

  private scene: Phaser.Scene
  private attackFX: CharacterAttackFX
  private weaponFX: WeaponFX

  constructor(scene: Phaser.Scene, enemyManager: any) {
    this.scene = scene
    this.deployedTroops = new Map()
    this.enemyManager = enemyManager
    this.attackFX = new CharacterAttackFX(scene)
    this.weaponFX = new WeaponFX(scene, this.attackFX)
    // 多单位高频攻击：命中顿帧节流，避免卡顿
    this.weaponFX.setHitStopGap(650)
  }

  /**
   * 添加兵种
   */
  addTroop(troopEntity: TroopEntity): void {
    const deployedData = troopEntity.getDeployedData()
    this.deployedTroops.set(deployedData.instanceId, troopEntity)
  }

  /**
   * 移除兵种
   */
  removeTroop(instanceId: string): TroopEntity | null {
    const troopEntity = this.deployedTroops.get(instanceId)
    if (troopEntity) {
      this.deployedTroops.delete(instanceId)
      return troopEntity
    }
    return null
  }

  /**
   * 更新所有兵种攻击
   * @param deltaTime 时间增量（毫秒）
   * @param currentTime 当前时间（毫秒）
   * @returns 死亡的敌人列表
   */
  update(deltaTime: number, currentTime: number): EnemyEntity[] {
    const killedEnemies: EnemyEntity[] = []

    for (const troopEntity of this.deployedTroops.values()) {
      const killed = this.checkAndAttack(troopEntity, currentTime)
      if (killed) {
        killedEnemies.push(killed)
      }
    }

    return killedEnemies
  }

  /**
   * 检查攻击条件并执行攻击
   */
  private checkAndAttack(troop: TroopEntity, currentTime: number): EnemyEntity | null {
    const troopData = troop.getTroopData()
    const deployedData = troop.getDeployedData()

    // 攻击间隔 = 1000 / 攻速(次每秒)
    const attackInterval = DamageCalculator.calculateAttackInterval(troopData.attackSpeed)
    if (currentTime - deployedData.lastAttackTime < attackInterval) {
      return null
    }

    // 射程内最近的敌人
    const target = this.enemyManager.getNearestEnemy(deployedData.position, troopData.attackRange)
    if (!target) {
      return null
    }

    const killed = this.executeAttack(troop, target)

    troop.updateLastAttackTime(currentTime)
    return killed
  }

  /**
   * 执行攻击（平伤：兵种无五行，不走克制倍率）
   */
  private executeAttack(troop: TroopEntity, target: EnemyEntity): EnemyEntity | null {
    const troopData = troop.getTroopData()
    const targetData = target.getEnemyData()

    const actualDamage = target.takeDamage(troopData.baseAttack)

    troop.playAttackAnimation()
    this.playWeaponFX(troop, target, actualDamage)

    if (targetData.currentHealth <= 0) {
      target.die()
      return target
    }

    return null
  }

  /**
   * 播放攻击特效（按攻击动作映射武器）
   *  - thrust → 长枪前刺（枪兵/骑兵）
   *  - slash  → 大刀挥砍（刀兵）
   *  - bow    → 拉弓放箭（弓兵）
   */
  private playWeaponFX(troop: TroopEntity, target: EnemyEntity, actualDamage: number): void {
    const troopData = troop.getTroopData()

    const from = CharacterAttackFX.getWorldXY(troop)
    const to = CharacterAttackFX.getWorldXY(target)

    // 近战前冲一点
    if (troopData.attackStyle !== 'bow') {
      this.attackFX.lunge(troop, to, 10)
    }

    const onHit = () => {
      if (target.active) target.hitShake()
      this.attackFX.damageText(to, actualDamage)
    }

    switch (troopData.attackStyle) {
      case 'thrust':
        this.weaponFX.spearThrustTo(from, to, onHit)
        break
      case 'slash': {
        const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
        this.weaponFX.bladeSlash(from, to, onHit, Math.max(0, dist - 132))
        break
      }
      case 'bow':
        this.weaponFX.bowShot(from, to, onHit)
        break
    }
  }

  /**
   * 获取兵种数量
   */
  getTroopCount(): number {
    return this.deployedTroops.size
  }

  /**
   * 重置所有兵种至基准变换（波次交替或防御阵型校验）
   */
  resetAllTroopTransforms(): void {
    for (const troop of this.deployedTroops.values()) {
      troop.resetToBaseTransform()
    }
  }

  /**
   * 重置
   */
  reset(): void {
    for (const troopEntity of this.deployedTroops.values()) {
      troopEntity.destroy()
    }
    this.deployedTroops.clear()
  }
}
