/**
 * MDX模型转换工具
 * 将War3的MDX 3D模型转换为Phaser可用的2D精灵图
 */

import fs from 'fs'
import path from 'path'

/**
 * 方案一：使用War3 Model Editor导出精灵图
 *
 * 步骤：
 * 1. 下载War3 Model Editor: https://www.hiveworkshop.com/threads/model-editor.130826/
 * 2. 打开MDX文件
 * 3. 设置相机角度（前视图、侧视图、3/4视图）
 * 4. 播放动画（Stand、Attack、Spell、Walk等）
 * 5. 使用"Export Sprites"功能导出PNG序列
 *
 * 推导出参数：
 * - 角度：Front view（正面）最适合塔防
 * - 尺寸：256x256 或 512x512
 * - 动画帧：每动作8-16帧
 * - 背景：透明
 */

/**
 * 方案二：使用Python脚本通过War3 Model Viewer截图
 */
const PYTHON_EXPORT_SCRIPT = `
#!/usr/bin/env python3
"""
MDX模型精灵图导出工具
使用War3 Model Viewer的命令行模式截图
"""

import subprocess
import os
from pathlib import Path

# 需要安装：War3 Model Viewer (支持命令行)
# Windows: War3ModelViewer.exe
# Linux: 可能需要wine

class MDXSpriteExporter:
    """MDX精灵图导出器"""

    def __init__(self, mdx_file: str, output_dir: str):
        self.mdx_file = Path(mdx_file)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # 默认相机角度（塔防游戏正面视角）
        self.camera_angles = [
            {'name': 'front', 'rotation_y': 0, 'rotation_x': 15},
            {'name': 'side', 'rotation_y': 90, 'rotation_x': 15},
            {'name': 'back', 'rotation_y': 180, 'rotation_x': 15},
        ]

        # 默认动画（War3标准动画名称）
        self.animations = [
            'Stand',      # 站立
            'Attack',     # 攻击
            'Spell',      # 施法
            'Walk',       # 行走
            'Death',      # 死亡
        ]

    def export_animation_frames(
        self,
        animation: str,
        num_frames: int = 12,
        width: int = 256,
        height: int = 256
    ):
        """
        导出指定动画的所有帧

        参数：
        - animation: 动画名称（Stand, Attack等）
        - num_frames: 帧数（8-16推荐）
        - width/height: 输出尺寸
        """

        # 假设使用War3 Model Viewer的命令行接口
        # 实际工具可能不同，这里只是示例

        frames_dir = self.output_dir / animation
        frames_dir.mkdir(exist_ok=True)

        print(f"导出动画: {animation} ({num_frames}帧)")

        for i in range(num_frames):
            output_file = frames_dir / f"frame_{i:03d}.png"

            # War3 Model Viewer命令行截图
            # 注意：这个命令是假设的，实际工具可能不同
            cmd = [
                'War3ModelViewer.exe',  # 或wine War3ModelViewer.exe
                '--model', str(self.mdx_file),
                '--animation', animation,
                '--frame', str(i),
                '--width', str(width),
                '--height', str(height),
                '--camera-y', '0',  # 正面视角
                '--camera-x', '15',  # 略微俯视
                '--transparent',  # 透明背景
                '--output', str(output_file)
            ]

            # subprocess.run(cmd)  # 实际执行需要安装工具
            print(f"  帧 {i}: {output_file.name}")

        # 生成sprite sheet
        self.create_sprite_sheet(frames_dir, animation, width, height)

    def create_sprite_sheet(
        self,
        frames_dir: Path,
        animation: str,
        width: int,
        height: int
    ):
        """
        将帧序列合并为单个sprite sheet PNG
        """

        try:
            from PIL import Image

            frames = sorted(frames_dir.glob('frame_*.png'))
            if not frames:
                print(f"⚠️  没有找到帧文件")
                return

            # 创建sprite sheet（横向排列）
            sheet_width = width * len(frames)
            sheet_height = height

            sheet = Image.new('RGBA', (sheet_width, sheet_height))

            for i, frame_file in enumerate(frames):
                frame = Image.open(frame_file)
                sheet.paste(frame, (i * width, 0))

            # 保存sprite sheet
            sheet_file = self.output_dir / f"{animation}_spritesheet.png"
            sheet.save(sheet_file, 'PNG')

            print(f"✅ Sprite sheet创建完成: {sheet_file}")
            print(f"   尺寸: {sheet_width}x{sheet_height}")
            print(f"   帧数: {len(frames)}")

            # 生成Phaser配置文件
            self.generate_phaser_config(animation, len(frames), width, height)

        except ImportError:
            print("❌ 需要安装Pillow: pip install pillow")

    def generate_phaser_config(
        self,
        animation: str,
        num_frames: int,
        width: int,
        height: int
    ):
        """
        生成Phaser加载配置
        """

        config = {
            'key': f'hero_{animation}',
            'type': 'spritesheet',
            'url': f'assets/sprites/{animation}_spritesheet.png',
            'frameConfig': {
                'frameWidth': width,
                'frameHeight': height,
                'startFrame': 0,
                'endFrame': num_frames - 1,
                'margin': 0,
                'spacing': 0
            }
        }

        config_file = self.output_dir / f"{animation}_config.json"
        import json
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)

        print(f"✅ Phaser配置已生成: {config_file}")

        # 生成TypeScript代码片段
        ts_code = f'''
// 在preload()中加载精灵图
this.load.spritesheet(
  '{config['key']}',
  '{config['url']}',
  {json.dumps(config['frameConfig'])}
)

// 在create()中播放动画
const hero = this.add.sprite(x, y, '{config['key']}')
hero.anims.play('hero_{animation}_anim')

// 定义动画
this.anims.create({
  key: 'hero_{animation}_anim',
  frames: this.anims.generateFrameNumbers('{config['key']}', {{
    start: 0,
    end: {num_frames - 1}
  }}),
  frameRate: 12,
  repeat: -1  // 循环播放
})
'''

        ts_file = self.output_dir / f"{animation}_usage.ts"
        ts_file.write_text(ts_code)

        print(f"✅ TypeScript代码已生成: {ts_file}")


def main():
    import sys

    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    mdx_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else './sprites'

    exporter = MDXSpriteExporter(mdx_file, output_dir)

    print(f"输入: {mdx_file}")
    print(f"输出: {output_dir}")
    print("=" * 50)

    # 导出所有动画
    for anim in exporter.animations:
        exporter.export_animation_frames(anim, num_frames=12)

    print("\\n全部完成！")
    print(f"请将 {output_dir} 目录复制到 assets/sprites/")
`

/**
 * 方案三：在线工具截图（最简单）
 */
const ONLINE_TOOL_GUIDE = `
# 使用在线工具导出精灵图

## HiveWorkshop模型查看器
https://www.hiveworkshop.com/

步骤：
1. 上传MDX文件或输入模型ID
2. 设置视角：
   - Rotation Y: 0° (正面)
   - Rotation X: 15° (略微俯视，塔防最佳角度)
3. 播放动画
4. 截图（使用浏览器截图工具或printscreen）
5. 在图片编辑器中裁剪、调整尺寸
6. 保存为PNG（透明背景）

推荐工具：
- ShareX（Windows）：支持连续截图，可录制动画
- GIMP：批量处理透明背景
- Photoshop：专业精灵图制作

## War3 Model Editor (Windows)
https://www.hiveworkshop.com/threads/model-editor.130826/

功能：
- 导入MDX文件
- 播放所有动画
- 调整相机角度
- 导出PNG序列
- 批量渲染精灵图

## Blender + MDX Importer
（如果熟悉Blender）

1. 安装Blender MDX插件
2. 导入MDX模型
3. 设置相机和渲染参数
4. 渲染动画序列
5. 导出为PNG
`

/**
 * 方案四：我帮你写一个简单的截图脚本
 */
const SCREENSHOT_SCRIPT_TS = `
/**
 * MDX模型截图脚本
 * 使用Three.js渲染MDX并截图
 * 需要安装：npm install three mdx-parser
 */

import * as THREE from 'three'
import { MDXLoader } from 'mdx-parser' // 假设的库，实际可能需要找专门的MDX解析器
import fs from 'fs'
import path from 'path'

export class MDXScreenshotRenderer {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera

  constructor(width: number = 256, height: number = 256) {
    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // 透明背景
      preserveDrawingBuffer: true // 保留缓冲区用于截图
    })
    this.renderer.setSize(width, height)
    this.renderer.setClearColor(0x000000, 0) // 透明背景

    // 创建场景
    this.scene = new THREE.Scene()

    // 创建相机（塔防正面视角）
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    this.camera.position.set(0, 1.5, 3) // 略微俯视
    this.camera.lookAt(0, 0, 0)

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(2, 2, 2)
    this.scene.add(directionalLight)
  }

  async loadMDX(mdxPath: string, texturePath?: string) {
    const loader = new MDXLoader()

    // 加载MDX模型
    const model = await loader.loadAsync(mdxPath)

    // 如果有纹理，加载纹理
    if (texturePath) {
      const textureLoader = new THREE.TextureLoader()
      const texture = await textureLoader.loadAsync(texturePath)
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.map = texture
          child.material.needsUpdate = true
        }
      })
    }

    this.scene.add(model)
    return model
  }

  screenshot(outputPath: string) {
    // 渲染
    this.renderer.render(this.scene, this.camera)

    // 获取canvas数据
    const canvas = this.renderer.domElement
    const dataUrl = canvas.toDataURL('image/png')

    // 保存为文件
    const base64Data = dataUrl.replace(/^data:image\\/png;base64,/, '')
    fs.writeFileSync(outputPath, base64Data, 'base64')

    console.log(\`Screenshot saved: \${outputPath}\`)
  }

  renderAnimation(
    animationName: string,
    numFrames: number,
    outputDir: string
  ) {
    fs.mkdirSync(outputDir, { recursive: true })

    for (let i = 0; i < numFrames; i++) {
      // 设置动画帧
      // model.setAnimationFrame(animationName, i)

      // 截图
      const filename = path.join(outputDir, \`frame_\${i.toString().padStart(3, '0')}.png\`)
      this.screenshot(filename)
    }
  }
}

// 使用示例
const renderer = new MDXScreenshotRenderer(256, 256)
renderer.loadMDX(
  '/tmp/war3_preview/Elf Lashers/Dark Elf Beastmaster hero/Dark_Elf_Beastmaster_hero_opt.mdx',
  '/tmp/war3_preview/Elf Lashers/Dark Elf Beastmaster hero/Beastmaster.blp'
)
.then(() => {
  // 截图正面站立姿态
  renderer.screenshot('./output/hero_stand.png')

  // 或导出整个动画序列
  renderer.renderAnimation('Stand', 12, './output/stand_frames')
})
`

/**
 * 为你的项目生成具体方案
 */
export function generateHeroSpriteSheetConfig(heroId: string) {
  /**
   * 基于你的HeroEntity.ts，生成精灵图配置
   */

  const config = {
    // 英雄精灵图配置
    hero: {
      size: {
        width: 120,  // 匹配你的useFullbody尺寸
        height: 150
      },
      animations: {
        stand: {
          frames: 8,
          frameRate: 8,
          repeat: -1
        },
        attack: {
          frames: 12,
          frameRate: 12,
          repeat: 0  // 播放一次
        },
        spell: {
          frames: 10,
          frameRate: 10,
          repeat: 0
        },
        death: {
          frames: 6,
          frameRate: 8,
          repeat: 0
        }
      }
    }
  }

  return config
}

console.log(PYTHON_EXPORT_SCRIPT)
console.log('\\n' + '='.repeat(60) + '\\n')
console.log(ONLINE_TOOL_GUIDE)