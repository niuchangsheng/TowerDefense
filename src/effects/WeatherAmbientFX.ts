import Phaser from 'phaser'
import { WeatherType } from '@/types/militarySituation'
import { InkColor } from '@/ui/InkTheme'

/**
 * 战场水墨天候环境特效渲染器
 * 零外置素材依赖，采用 Phaser 原生图形与粒子现场合成
 */
export class WeatherAmbientFX {
  private static FOG_TEXTURE_KEY = 'fx_weather_fog_puff'
  private static RAIN_TEXTURE_KEY = 'fx_weather_rain_drop'
  private static WIND_TEXTURE_KEY = 'fx_weather_wind_dash'

  private scene: Phaser.Scene
  private currentWeather: WeatherType = 'clear'
  private activeEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null
  private ambientOverlay: Phaser.GameObjects.Graphics | null = null
  private ambientTween: Phaser.Tweens.Tween | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.ensureTextures()
  }

  private ensureTextures(): void {
    // 1. 雾气团纹理：羽化边缘圆形墨雾
    if (!this.scene.textures.exists(WeatherAmbientFX.FOG_TEXTURE_KEY)) {
      const g = this.scene.make.graphics({ x: 0, y: 0 })
      g.fillStyle(0xffffff, 0.4)
      g.fillCircle(32, 32, 32)
      g.fillStyle(0xffffff, 0.8)
      g.fillCircle(32, 32, 20)
      g.generateTexture(WeatherAmbientFX.FOG_TEXTURE_KEY, 64, 64)
      g.destroy()
    }

    // 2. 雨丝纹理：倾斜细密雨滴
    if (!this.scene.textures.exists(WeatherAmbientFX.RAIN_TEXTURE_KEY)) {
      const g = this.scene.make.graphics({ x: 0, y: 0 })
      g.fillStyle(0xffffff, 0.9)
      g.fillRect(0, 0, 2, 14)
      g.generateTexture(WeatherAmbientFX.RAIN_TEXTURE_KEY, 2, 14)
      g.destroy()
    }

    // 3. 疾风沙尘纹理：狭长墨线
    if (!this.scene.textures.exists(WeatherAmbientFX.WIND_TEXTURE_KEY)) {
      const g = this.scene.make.graphics({ x: 0, y: 0 })
      g.fillStyle(0xffffff, 0.8)
      g.fillRect(0, 0, 24, 2)
      g.generateTexture(WeatherAmbientFX.WIND_TEXTURE_KEY, 24, 2)
      g.destroy()
    }
  }

  /**
   * 切换天候环境
   */
  setWeather(weather: WeatherType): void {
    if (this.currentWeather === weather) return
    this.clearCurrent()
    this.currentWeather = weather

    const width = this.scene.cameras.main.width
    const height = this.scene.cameras.main.height

    switch (weather) {
      case 'fog':
        this.createFogWeather(width, height)
        break
      case 'rain':
        this.createRainWeather(width, height)
        break
      case 'sun':
        this.createSunWeather(width, height)
        break
      case 'wind':
        this.createWindWeather(width, height)
        break
      case 'clear':
      default:
        // 晴朗常态无额外粒子，保持画面干爽
        break
    }
  }

  /**
   * 江雾：浓淡相生的写意水墨重烟徐徐横向漂移
   */
  private createFogWeather(width: number, height: number): void {
    this.activeEmitter = this.scene.add.particles(0, 0, WeatherAmbientFX.FOG_TEXTURE_KEY, {
      x: { min: -50, max: width + 50 },
      y: { min: 40, max: height - 100 },
      speedX: { min: 12, max: 28 },
      speedY: { min: -3, max: 3 },
      scale: { start: 1.5, end: 2.8 },
      alpha: { start: 0, end: 0.16, ease: 'Sine.easeInOut' },
      tint: [InkColor.ink, 0x5a554a, 0x8a8577],
      lifespan: 5500,
      frequency: 240,
      maxParticles: 35
    })
    this.activeEmitter.setDepth(4) // 处于地表之上、建筑与单位之下
  }

  /**
   * 暴雨：倾斜密集的水墨雨丝
   */
  private createRainWeather(width: number, height: number): void {
    this.activeEmitter = this.scene.add.particles(0, 0, WeatherAmbientFX.RAIN_TEXTURE_KEY, {
      x: { min: -100, max: width + 200 },
      y: -20,
      speedX: { min: -140, max: -80 },
      speedY: { min: 450, max: 650 },
      scale: { start: 1.0, end: 1.0 },
      alpha: { start: 0.45, end: 0.15 },
      tint: [0x2f3640, 0x4b6584, InkColor.ink],
      lifespan: 1200,
      frequency: 25,
      maxParticles: 120
    })
    this.activeEmitter.setDepth(25) // 覆盖战场上方
  }

  /**
   * 烈日：温润的水墨琥珀暖阳晕染与热浪微光
   */
  private createSunWeather(width: number, height: number): void {
    this.ambientOverlay = this.scene.add.graphics()
    this.ambientOverlay.fillStyle(0xd97706, 0.05)
    this.ambientOverlay.fillRect(0, 0, width, height)
    this.ambientOverlay.setDepth(3)

    this.ambientTween = this.scene.tweens.add({
      targets: this.ambientOverlay,
      alpha: { from: 0.6, to: 1.0 },
      duration: 2500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  /**
   * 疾风：飞沙走石墨线掠影
   */
  private createWindWeather(width: number, height: number): void {
    this.activeEmitter = this.scene.add.particles(0, 0, WeatherAmbientFX.WIND_TEXTURE_KEY, {
      x: width + 30,
      y: { min: 60, max: height - 120 },
      speedX: { min: -400, max: -240 },
      speedY: { min: 10, max: 30 },
      scale: { start: 0.8, end: 1.4 },
      alpha: { start: 0.35, end: 0.05 },
      tint: [InkColor.ink, 0x8a785d],
      lifespan: 2200,
      frequency: 180,
      maxParticles: 20
    })
    this.activeEmitter.setDepth(15)
  }

  /**
   * 清除当前天候特效
   */
  private clearCurrent(): void {
    if (this.activeEmitter) {
      this.activeEmitter.destroy()
      this.activeEmitter = null
    }
    if (this.ambientTween) {
      this.ambientTween.stop()
      this.ambientTween = null
    }
    if (this.ambientOverlay) {
      this.ambientOverlay.destroy()
      this.ambientOverlay = null
    }
  }

  /**
   * 场景销毁时清理资源
   */
  destroy(): void {
    this.clearCurrent()
  }
}
