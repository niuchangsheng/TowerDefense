/**
 * 【集成示例】把文字攻击特效接入真实战斗
 *
 * 本文件仅作演示，不参与编译运行。
 * 展示如何把 CharacterAttackFX 接到现有的
 *   HeroEntity.playAttackAnimation()
 *   HeroBattleManager.executeAttack()
 *
 * 依赖：src/effects/CharacterAttackFX.ts（已创建）
 */

import Phaser from 'phaser'
import { CharacterAttackFX } from '@/effects/CharacterAttackFX'

/* =====================================================================
 * 第 1 步：让英雄用"字"渲染（替换 HeroEntity 里的 Image）
 * =====================================================================
 *
 * 原来 HeroEntity 构造函数里是：
 *   this.heroImage = scene.add.image(0, 0, imageKey)
 *
 * 改成文字：
 */
// private heroText: Phaser.GameObjects.Text
//
// // 用英雄名字作为"字"，五行色描边
// this.heroText = scene.add.text(0, 0, hero.name, {
//   fontFamily: '"STKaiti","KaiTi","Noto Serif SC",serif',
//   fontSize: this.useFullbody ? '46px' : '30px',
//   color: '#f5f0e6',
//   fontStyle: 'bold',
//   stroke: this.getWuXingTextColor(hero.wuXing),  // 五行色描边区分属性
//   strokeThickness: 4
// }).setOrigin(0.5)
// this.add(this.heroText)

/* =====================================================================
 * 第 2 步：在 HeroEntity 里持有一个特效实例
 * ===================================================================== */
// private fx: CharacterAttackFX
//
// // 构造函数中：
// this.fx = new CharacterAttackFX(scene)

/* =====================================================================
 * 第 3 步：重写 playAttackAnimation()
 * =====================================================================
 * 根据英雄是"近战/远程"选择不同打法。
 * 这里用一个字段 attackStyle: 'melee' | 'ranged' 区分。
 */
// playAttackAnimation(targetPos?: { x: number; y: number }): void {
//   // 没有目标位置就只做本体动作
//   if (!targetPos) {
//     this.pulseSelf()
//     return
//   }
//
//   if (this.attackStyle === 'melee') {
//     // 近战：英雄"字"朝目标前冲
//     this.fx.lunge(this.heroText, targetPos, 18)
//     // 目标处出刀 + 墨迹（命中反馈交给 executeAttack 统一处理也可）
//     this.fx.slashArc(targetPos, 0xf5f0e6, 36)
//     this.fx.inkSplash(targetPos, 0x1a1a1a, 12)
//   } else {
//     // 远程：掷出英雄专属兵器"字"
//     const from = CharacterAttackFX.getWorldXY(this.heroText)
//     this.fx.shootCharacter({
//       from: { x: from.x, y: from.y - 10 },
//       to: targetPos,
//       char: this.projectileChar,   // 赵云→'枪'，黄忠→'箭'，关羽→'刀'
//       color: this.getWuXingTextColor(this.heroData.wuXing),
//       fontSize: 30,
//       arc: 50,
//       spin: true,
//       onHit: () => this.fx.inkSplash(targetPos, 0x1a1a1a, 10)
//     })
//   }
// }
//
// // 本体轻微律动（无论近战远程都可叠加，显得"活"）
// private pulseSelf(): void {
//   this.scene.tweens.add({
//     targets: this.heroText,
//     scale: 1.15,
//     duration: 90,
//     yoyo: true,
//     ease: 'Quad.easeOut'
//   })
// }

/* =====================================================================
 * 第 4 步：在 HeroBattleManager.executeAttack() 里
 *         把目标位置传给动画，并补伤害飘字 / 受击反馈
 * =====================================================================
 *
 * 现在 executeAttack 里是：
 *   hero.playAttackAnimation()
 *
 * 改成（拿到敌人世界坐标）：
 */
// const enemyWorld = CharacterAttackFX.getWorldXY(target.getWuXingText())
// //   —— 或在 EnemyEntity 上暴露一个 getWorldPosition() 辅助方法
//
// // 播放攻击动画（传入目标点）
// hero.playAttackAnimation(enemyWorld)
//
// // 伤害飘字 + 敌人受击抖动
// const fx = new CharacterAttackFX(this.scene)  // 或由 hero 暴露其 fx
// fx.damageText(enemyWorld, actualDamage, { crit: isCrit })
// fx.hitShake(target.getWuXingText(), isCrit ? 5 : 3)

/* =====================================================================
 * 第 5 步：主动技能用 skillBurst（AOE 视觉）
 * =====================================================================
 * 在 SkillExecutor.executeSkill() 里，对范围技叠加：
 */
// fx.skillBurst(skillCenter, ['刀', '枪', '剑', '戟'], wuXingColor, 90)

/* =====================================================================
 * 可选：攻击风格的配置位置
 * =====================================================================
 * 建议在 hero.config.ts / heroes data 里为每个英雄加：
 *   attackStyle: 'melee' | 'ranged'
 *   projectileChar: string   // 远程英雄发射的"字"
 *
 * 例：
 *   关羽  → melee,  char '刀'
 *   张飞  → melee,  char '矛'
 *   赵云  → melee,  char '枪'
 *   黄忠  → ranged, char '箭'
 *   诸葛亮→ ranged, char '阵'（法术）
 */

export {}
