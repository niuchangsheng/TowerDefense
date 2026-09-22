/**
 * 零素材音效：全部用 WebAudio 现场合成，不依赖任何音频文件。
 * 与"字/武器特效"一脉相承的零资源思路。
 *
 * 浏览器自动播放策略要求"先有用户手势才能出声"，
 * 因此在场景 create() 里调用一次 SoundFX.unlock() 即可，
 * 它会在首次点击/按键时自动 resume AudioContext。
 */
export class SoundFX {
  private static ctx: AudioContext | null = null

  /** 懒加载 AudioContext；若处于 suspended 则尝试唤醒 */
  private static ensureCtx(): AudioContext | null {
    if (!SoundFX.ctx) {
      const w = window as unknown as {
        AudioContext?: typeof AudioContext
        webkitAudioContext?: typeof AudioContext
      }
      const AC = w.AudioContext ?? w.webkitAudioContext
      if (!AC) return null
      SoundFX.ctx = new AC()
    }
    if (SoundFX.ctx.state === 'suspended') void SoundFX.ctx.resume()
    return SoundFX.ctx
  }

  private static isUnlocked = false

  /**
   * 在场景 create() 调用一次。
   * 监听首次用户手势（点击/触摸/按键）并 resume，解除浏览器静音。
   */
  static unlock(): void {
    if (SoundFX.isUnlocked) return
    const ctx = SoundFX.ensureCtx()
    if (!ctx) return
    if (ctx.state === 'running') {
      SoundFX.isUnlocked = true
      return
    }
    const unlockOnce = () => {
      SoundFX.isUnlocked = true
      void ctx.resume()
      window.removeEventListener('pointerdown', unlockOnce)
      window.removeEventListener('touchstart', unlockOnce)
      window.removeEventListener('keydown', unlockOnce)
    }
    window.addEventListener('pointerdown', unlockOnce, { once: true, passive: true })
    window.addEventListener('touchstart', unlockOnce, { once: true, passive: true })
    window.addEventListener('keydown', unlockOnce, { once: true, passive: true })
  }

  /** 生成一小段白噪声 buffer（用于"啪/哆"等瞬态） */
  private static noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds))
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  /**
   * 弓弦崩 —— 一声"嘣"。
   *  = 高频带通噪声的瞬态"啪"（弦弹开的脆响）
   *  + 低频振荡器快速滑音 150Hz→46Hz 的"嘣"（弦与弓臂共鸣）
   */
  static bowSnap(volume = 0.5): void {
    const ctx = SoundFX.ensureCtx()
    if (!ctx) return
    const t0 = ctx.currentTime

    // 1) 瞬态"啪"
    const noise = ctx.createBufferSource()
    noise.buffer = SoundFX.noiseBuffer(ctx, 0.06)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1900
    bp.Q.value = 0.8
    const nGain = ctx.createGain()
    nGain.gain.setValueAtTime(volume * 0.7, t0)
    nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05)
    noise.connect(bp)
    bp.connect(nGain)
    nGain.connect(ctx.destination)
    noise.start(t0)
    noise.stop(t0 + 0.07)

    // 2) 低频"嘣"主体（频率下坠 + 指数衰减）
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(150, t0)
    osc.frequency.exponentialRampToValueAtTime(46, t0 + 0.16)
    const oGain = ctx.createGain()
    oGain.gain.setValueAtTime(0.0001, t0)
    oGain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012)
    oGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.24)
    osc.connect(oGain)
    oGain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.26)
  }

  /**
   * 命中"哆"：箭/兵器钉中木桩的闷响，短促低沉。
   * 配合顿帧一起把打击感做足（不需要可不调用）。
   */
  static thud(volume = 0.4): void {
    const ctx = SoundFX.ensureCtx()
    if (!ctx) return
    const t0 = ctx.currentTime

    // 噪声"嚓"（低通过滤，偏闷）
    const noise = ctx.createBufferSource()
    noise.buffer = SoundFX.noiseBuffer(ctx, 0.05)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const nGain = ctx.createGain()
    nGain.gain.setValueAtTime(volume * 0.5, t0)
    nGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05)
    noise.connect(lp)
    lp.connect(nGain)
    nGain.connect(ctx.destination)
    noise.start(t0)
    noise.stop(t0 + 0.06)

    // 低频"哆"
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, t0)
    osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.1)
    const oGain = ctx.createGain()
    oGain.gain.setValueAtTime(0.0001, t0)
    oGain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01)
    oGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13)
    osc.connect(oGain)
    oGain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.15)
  }
}
