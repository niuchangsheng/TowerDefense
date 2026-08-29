/**
 * HeroEntity精灵动画示例
 * 演示如何在你的塔防游戏中使用精灵图动画
 */

import Phaser from 'phaser'
import { Hero, DeployedHero } from '@/types'

/**
 * 支持精灵动画的英雄实体
 */
export class AnimatedHeroEntity extends Phaser.GameObjects.Container {
  private heroData: Hero
  private deployedData: DeployedHero
  private heroSprite: Phaser.GameObjects.Sprite  // 使用Sprite而不是Image
  private currentAnimation: string

  constructor(scene: Phaser.Scene, hero: Hero, deployed: DeployedHero) {
    super(scene, deployed.position.x, deployed.position.y)

    this.heroData = hero
    this.deployedData = deployed
    this.currentAnimation = 'stand'

    // 创建精灵（支持动画）
    const spriteKey = this.getHeroSpriteKey(hero.id)
    this.heroSprite = scene.add.sprite(0, 0, spriteKey)

    // 设置尺寸（匹配你的配置）
    this.heroSprite.setDisplaySize(120, 150)

    // 添加到容器
    this.add(this.heroSprite)

    // 播放默认站立动画
    this.playAnimation('stand')

    // 添加名称和五行标签（与原代码相同）
    const nameY = -85
    const nameText = scene.add.text(0, nameY, hero.name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5)
    this.add(nameText)

    const wuXingY = 85
    const wuXingText = scene.add.text(0, wuXingY, this.getWuXingText(hero.wuXing), {
      fontSize: '12px',
      color: this.getWuXingTextColor(hero.wuXing),
      backgroundColor: '#000000',
      padding: { x: 3, y: 1 }
    }).setOrigin(0.5)
    this.add(wuXingText)

    // 设置交互
    this.heroSprite.setInteractive({ useHandCursor: true })
    this.heroSprite.on('pointerover', () => this.onPointerOver())
    this.heroSprite.on('pointerout', () => this.onPointerOut())

    scene.add.existing(this)
  }

  /**
   * 获取精灵key
   */
  private getHeroSpriteKey(heroId: string): string {
    // 映射英雄ID到精灵图key
    const spriteKeyMap: Record<string, string> = {
      'dark_elf_beastmaster': 'hero_dark_elf_beastmaster_stand',
      'dark_elf_slavemaster': 'hero_dark_elf_slavemaster_stand',
      'demon_slavemaster': 'hero_demon_slavemaster_stand',
      'night_elf_lasher': 'hero_night_elf_lasher_stand',
    }

    return spriteKeyMap[heroId] || 'hero_default_stand'
  }

  /**
   * 播放动画
   */
  playAnimation(animName: string): void {
    const animKey = `${this.getHeroSpriteKey(this.heroData.id).replace('_stand', '')}_${animName}_anim`

    if (this.scene.anims.exists(animKey)) {
      this.heroSprite.play(animKey)
      this.currentAnimation = animName

      console.log(`播放动画: ${animKey}`)
    } else {
      console.warn(`动画不存在: ${animKey}`)
    }
  }

  /**
   * 播放攻击动画（一次）
   */
  playAttackAnimation(): void {
    this.playAnimation('attack')

    // 攻击动画结束后回到站立
    this.heroSprite.once('animationcomplete', (animation: Phaser.Animations.Animation) => {
      if (animation.key.includes('attack')) {
        this.playAnimation('stand')
      }
    })
  }

  /**
   * 播放施法动画（一次）
   */
  playSpellAnimation(): void {
    this.playAnimation('spell')

    this.heroSprite.once('animationcomplete', () => {
      this.playAnimation('stand')
    })
  }

  /**
   * 播放死亡动画（一次）
   */
  playDeathAnimation(): void {
    this.playAnimation('death')

    // 死亡动画结束后可以淡出或停留最后一帧
    this.heroSprite.once('animationcomplete', () => {
      // 停留在最后一帧
      this.heroSprite.anims.pause()
      // 或淡出
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 1000,
        onComplete: () => this.destroy()
      })
    })
  }

  private getWuXingText(wuXing: string): string {
    const wuXingMap: Record<string, string> = {
      wood: '木',
      fire: '火',
      earth: '土',
      metal: '金',
      water: '水'
    }
    return wuXingMap[wuXing] || wuXing
  }

  private getWuXingTextColor(wuXing: string): string {
    const colorMap: Record<string, string> = {
      wood: '#00ff00',
      fire: '#ff0000',
      earth: '#ffff00',
      metal: '#ffffff',
      water: '#0000ff'
    }
    return colorMap[wuXing] || '#ffffff'
  }

  private onPointerOver(): void {
    // 高亮效果
    this.heroSprite.setTint(0xdddddd)
  }

  private onPointerOut(): void {
    // 恢复正常
    this.heroSprite.clearTint()
  }
}

/**
 * 场景示例：如何加载和定义动画
 */
export class BattleSceneWithAnimations extends Phaser.Scene {
  preload(): void {
    // 加载Dark Elf Beastmaster的精灵图
    this.load.spritesheet(
      'hero_dark_elf_beastmaster_stand',
      'assets/sprites/hero_dark_elf/stand_spritesheet.png',
      { frameWidth: 120, frameHeight: 150 }
    )

    this.load.spritesheet(
      'hero_dark_elf_beastmaster_attack',
      'assets/sprites/hero_dark_elf/attack_spritesheet.png',
      { frameWidth: 120, frameHeight: 150 }
    )

    this.load.spritesheet(
      'hero_dark_elf_beastmaster_spell',
      'assets/sprites/hero_dark_elf/spell_spritesheet.png',
      { frameWidth: 120, frameHeight: 150 }
    )

    this.load.spritesheet(
      'hero_dark_elf_beastmaster_death',
      'assets/sprites/hero_dark_elf/death_spritesheet.png',
      { frameWidth: 120, frameHeight: 150 }
    )
  }

  create(): void {
    // 定义站立动画（循环）
    this.anims.create({
      key: 'hero_dark_elf_beastmaster_stand_anim',
      frames: this.anims.generateFrameNumbers('hero_dark_elf_beastmaster_stand', {
        start: 0,
        end: 7  // 8帧
      }),
      frameRate: 8,
      repeat: -1  // 无限循环
    })

    // 定义攻击动画（一次）
    this.anims.create({
      key: 'hero_dark_elf_beastmaster_attack_anim',
      frames: this.anims.generateFrameNumbers('hero_dark_elf_beastmaster_attack', {
        start: 0,
        end: 11  // 12帧
      }),
      frameRate: 12,
      repeat: 0  // 播放一次
    })

    // 定义施法动画（一次）
    this.anims.create({
      key: 'hero_dark_elf_beastmaster_spell_anim',
      frames: this.anims.generateFrameNumbers('hero_dark_elf_beastmaster_spell', {
        start: 0,
        end: 9  // 10帧
      }),
      frameRate: 10,
      repeat: 0
    })

    // 定义死亡动画（一次）
    this.anims.create({
      key: 'hero_dark_elf_beastmaster_death_anim',
      frames: this.anims.generateFrameNumbers('hero_dark_elf_beastmaster_death', {
        start: 0,
        end: 5  // 6帧
      }),
      frameRate: 8,
      repeat: 0
    })

    // 测试按钮：切换动画
    const testButton = this.add.text(100, 50, '测试攻击动画', {
      fontSize: '16px',
      backgroundColor: '#333',
      padding: { x: 10, y: 5 }
    })
    .setInteractive({ useHandCursor: true })

    // 创建英雄实例
    const hero: Hero = {
      id: 'dark_elf_beastmaster',
      name: '暗夜驯兽师',
      wuXing: 'earth',
      // ...其他属性
    } as Hero

    const deployed: DeployedHero = {
      heroId: 'dark_elf_beastmaster',
      position: { x: 400, y: 300 },
      // ...其他属性
    } as DeployedHero

    const heroEntity = new AnimatedHeroEntity(this, hero, deployed)

    // 点击按钮测试动画
    testButton.on('pointerdown', () => {
      heroEntity.playAttackAnimation()
    })
  }
}

/**
 * 使用说明
 *
 * 步骤1：创建精灵图
 * - 使用War3 Model Editor截图动画帧
 * - 使用create_spritesheet.py合并为精灵图
 *
 * 步骤2：放入assets目录
 * - assets/sprites/hero_dark_elf/stand_spritesheet.png
 * - assets/sprites/hero_dark_elf/attack_spritesheet.png
 * - ...
 *
 * 步骤3：在场景中加载和定义动画
 * - preload(): 加载精灵图
 * - create(): 定义动画
 *
 * 步骤4：在HeroEntity中使用
 * - 替换Image为Sprite
 * - 使用playAnimation()播放不同动画
 */