import Phaser from 'phaser'

export const WUXING_CYCLE_SVG_RAW = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 560" width="100%" height="100%" style="background: #1c1d22; border-radius: 12px; font-family: 'STKaiti', 'KaiTi', 'SimKai', 'Noto Serif SC', serif;">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
    <filter id="black-line-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#ffffff" flood-opacity="0.35"/>
    </filter>
    <marker id="arrow-white" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 1 2 L 11 6 L 1 10 z" fill="#ffffff" stroke="#ffffff" stroke-width="1"/>
    </marker>
    <marker id="arrow-black" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 1 2 L 11 6 L 1 10 z" fill="#000000" stroke="#ffffff" stroke-width="1"/>
    </marker>
  </defs>

  <text x="270" y="36" fill="#f0ede6" font-size="20" font-weight="bold" text-anchor="middle" letter-spacing="2">五行相生相克图</text>
  <text x="270" y="58" fill="#a09d96" font-size="12" text-anchor="middle">外圆顺时针为相生（白线） · 内星隔位指引为相克（黑线）</text>

  <circle cx="270" cy="275" r="170" fill="none" stroke="#2c2d36" stroke-width="1.5" stroke-dasharray="4 4"/>
  <circle cx="270" cy="275" r="105" fill="#24252d" fill-opacity="0.6"/>

  <g id="overcoming-star" filter="url(#black-line-glow)">
    <line x1="281" y1="135" x2="359" y2="373" stroke="#000000" stroke-width="3" marker-end="url(#arrow-black)"/>
    <line x1="341" y1="389" x2="136" y2="239" stroke="#000000" stroke-width="3" marker-end="url(#arrow-black)"/>
    <line x1="140" y1="222" x2="398" y2="222" stroke="#000000" stroke-width="3" marker-end="url(#arrow-black)"/>
    <line x1="404" y1="239" x2="199" y2="389" stroke="#000000" stroke-width="3" marker-end="url(#arrow-black)"/>
    <line x1="181" y1="373" x2="259" y2="135" stroke="#000000" stroke-width="3" marker-end="url(#arrow-black)"/>
  </g>

  <g id="generating-circle">
    <path d="M 317 112 A 170 170 0 0 1 411 180" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow-white)"/>
    <path d="M 440 263 A 170 170 0 0 1 404 380" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow-white)"/>
    <path d="M 328 435 A 170 170 0 0 1 212 435" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow-white)"/>
    <path d="M 136 380 A 170 170 0 0 1 100 263" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow-white)"/>
    <path d="M 129 180 A 170 170 0 0 1 223 112" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" marker-end="url(#arrow-white)"/>
  </g>

  <g id="node-metal" transform="translate(270, 105)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="28" fill="#eef2f7" stroke="#ffd700" stroke-width="3"/>
    <text x="0" y="7" fill="#212121" font-size="20" font-weight="bold" text-anchor="middle">金</text>
    <text x="0" y="-35" fill="#ffd700" font-size="12" font-weight="bold" text-anchor="middle">白虎 · 锋芒</text>
  </g>

  <g id="node-water" transform="translate(432, 222)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="28" fill="#0d47a1" stroke="#40c4ff" stroke-width="3"/>
    <text x="0" y="7" fill="#ffffff" font-size="20" font-weight="bold" text-anchor="middle">水</text>
    <text x="44" y="5" fill="#40c4ff" font-size="12" font-weight="bold" text-anchor="start">玄武 · 润泽</text>
  </g>

  <g id="node-wood" transform="translate(370, 413)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="28" fill="#1b5e20" stroke="#00e676" stroke-width="3"/>
    <text x="0" y="7" fill="#ffffff" font-size="20" font-weight="bold" text-anchor="middle">木</text>
    <text x="38" y="24" fill="#00e676" font-size="12" font-weight="bold" text-anchor="start">青龙 · 繁茂</text>
  </g>

  <g id="node-fire" transform="translate(170, 413)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="28" fill="#b71c1c" stroke="#ff5252" stroke-width="3"/>
    <text x="0" y="7" fill="#ffffff" font-size="20" font-weight="bold" text-anchor="middle">火</text>
    <text x="-38" y="24" fill="#ff5252" font-size="12" font-weight="bold" text-anchor="end">朱雀 · 燎原</text>
  </g>

  <g id="node-earth" transform="translate(108, 222)" filter="url(#shadow)">
    <circle cx="0" cy="0" r="28" fill="#4e342e" stroke="#ffb74d" stroke-width="3"/>
    <text x="0" y="7" fill="#ffffff" font-size="20" font-weight="bold" text-anchor="middle">土</text>
    <text x="-44" y="5" fill="#ffb74d" font-size="12" font-weight="bold" text-anchor="end">麒麟 · 厚重</text>
  </g>

  <g id="legend" transform="translate(270, 510)">
    <line x1="-190" y1="0" x2="-140" y2="0" stroke="#ffffff" stroke-width="3" marker-end="url(#arrow-white)"/>
    <text x="-130" y="5" fill="#f0ede6" font-size="13" text-anchor="start">白色圆弧：<tspan font-weight="bold" fill="#ffffff">五行相生</tspan>（金生水、水生木、木生火、火生土、土生金）</text>
    <line x1="-190" y1="24" x2="-140" y2="24" stroke="#000000" stroke-width="3" marker-end="url(#arrow-black)"/>
    <text x="-130" y="29" fill="#f0ede6" font-size="13" text-anchor="start">黑色星线：<tspan font-weight="bold" fill="#ffd700">五行相克</tspan>（金克木、木克土、土克水、水克火、火克金）</text>
  </g>
</svg>`

export const WUXING_DIAGRAM_TEXTURE_KEY = 'wuxing_cycle_diagram'

/**
 * 确保五行相生相克图纹理就绪
 */
export function ensureWuxingDiagramTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(WUXING_DIAGRAM_TEXTURE_KEY)) {
    return
  }

  // 若已在资源中加载了 wuxing_cycle 纹理，则直接映射复用
  if (scene.textures.exists('wuxing_cycle')) {
    return
  }

  // 浏览器环境下使用 Image 加载 SVG Blob
  if (typeof window !== 'undefined' && typeof Image !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      const blob = new Blob([WUXING_CYCLE_SVG_RAW], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.onload = () => {
        if (!scene.textures.exists(WUXING_DIAGRAM_TEXTURE_KEY)) {
          scene.textures.addImage(WUXING_DIAGRAM_TEXTURE_KEY, img)
        }
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        fallbackCanvasTexture(scene)
      }
      img.src = url
      return
    } catch {
      fallbackCanvasTexture(scene)
      return
    }
  }

  fallbackCanvasTexture(scene)
}

/**
 * Node/测试环境或图片加载异常时的 Canvas 备用渲染纹理
 */
function fallbackCanvasTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(WUXING_DIAGRAM_TEXTURE_KEY)) return

  const canvasTexture = scene.textures.createCanvas(WUXING_DIAGRAM_TEXTURE_KEY, 540, 560)
  if (!canvasTexture) return
  const ctx = canvasTexture.getContext()

  ctx.fillStyle = '#1c1d22'
  ctx.fillRect(0, 0, 540, 560)

  // 标头
  ctx.fillStyle = '#f0ede6'
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('五行相生相克图', 270, 36)

  ctx.fillStyle = '#a09d96'
  ctx.font = '12px sans-serif'
  ctx.fillText('外圆顺时针为相生（白线） · 内星隔位指引为相克（黑线）', 270, 58)

  // 圆环
  ctx.strokeStyle = '#2c2d36'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(270, 275, 170, 0, Math.PI * 2)
  ctx.stroke()

  // 五大节点
  const nodes = [
    { name: '金', x: 270, y: 105, color: '#ffd700', bg: '#eef2f7' },
    { name: '水', x: 432, y: 222, color: '#40c4ff', bg: '#0d47a1' },
    { name: '木', x: 370, y: 413, color: '#00e676', bg: '#1b5e20' },
    { name: '火', x: 170, y: 413, color: '#ff5252', bg: '#b71c1c' },
    { name: '土', x: 108, y: 222, color: '#ffb74d', bg: '#4e342e' }
  ]

  for (const n of nodes) {
    ctx.fillStyle = n.bg
    ctx.beginPath()
    ctx.arc(n.x, n.y, 28, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = n.color
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(n.name, n.x, n.y)
  }

  canvasTexture.refresh()
}
