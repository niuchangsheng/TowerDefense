#!/usr/bin/env python3
"""
精灵图合并工具
将多个帧PNG合并为单个精灵图，并生成Phaser配置

使用方法：
python3 create_spritesheet.py --input ./screenshots --output ./sprites --frames 12
"""

import argparse
from pathlib import Path
from PIL import Image
import json


class SpriteSheetCreator:
    """精灵图创建器"""

    def __init__(self, input_dir: Path, output_dir: Path, name: str, num_frames: int):
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.name = name
        self.num_frames = num_frames

    def create_horizontal_spritesheet(self, frame_width: int, frame_height: int):
        """
        创建横向精灵图（推荐用于Phaser）
        """

        # 查找所有帧文件
        frame_files = sorted(self.input_dir.glob('*.png'))

        if not frame_files:
            print(f"❌ 未找到PNG文件: {self.input_dir}")
            return

        # 只取指定数量的帧
        frame_files = frame_files[:self.num_frames]

        print(f"找到 {len(frame_files)} 帧")
        print(f"创建精灵图: {self.name}")

        # 创建精灵图canvas（横向排列）
        sheet_width = frame_width * len(frame_files)
        sheet_height = frame_height

        spritesheet = Image.new('RGBA', (sheet_width, sheet_height))

        # 粘贴每个帧
        for i, frame_file in enumerate(frame_files):
            frame = Image.open(frame_file)

            # 调整尺寸
            if frame.size != (frame_width, frame_height):
                frame = frame.resize((frame_width, frame_height), Image.LANCZOS)

            # 粘贴到精灵图
            x_offset = i * frame_width
            spritesheet.paste(frame, (x_offset, 0))

            print(f"  帧 {i}: {frame_file.name}")

        # 保存精灵图
        output_file = self.output_dir / f"{self.name}_spritesheet.png"
        spritesheet.save(output_file, 'PNG', optimize=True)

        print(f"\n✅ 精灵图已保存: {output_file}")
        print(f"   尺寸: {sheet_width}x{sheet_height}")
        print(f"   帧数: {len(frame_files)}")

        # 生成Phaser配置
        self.generate_phaser_config(len(frame_files), frame_width, frame_height)

        return output_file

    def create_grid_spritesheet(self, frame_width: int, frame_height: int, cols: int = 4):
        """
        创建网格精灵图（适用于大量帧）
        """

        frame_files = sorted(self.input_dir.glob('*.png'))[:self.num_frames]

        if not frame_files:
            return

        rows = (len(frame_files) + cols - 1) // cols

        sheet_width = frame_width * cols
        sheet_height = frame_height * rows

        spritesheet = Image.new('RGBA', (sheet_width, sheet_height))

        for i, frame_file in enumerate(frame_files):
            frame = Image.open(frame_file)
            if frame.size != (frame_width, frame_height):
                frame = frame.resize((frame_width, frame_height), Image.LANCZOS)

            col = i % cols
            row = i // cols
            x_offset = col * frame_width
            y_offset = row * frame_height

            spritesheet.paste(frame, (x_offset, y_offset))

        output_file = self.output_dir / f"{self.name}_grid_spritesheet.png"
        spritesheet.save(output_file, 'PNG')

        print(f"✅ 网格精灵图已保存: {output_file}")
        print(f"   尺寸: {sheet_width}x{sheet_height}")
        print(f"   列数: {cols}, 行数: {rows}")

    def generate_phaser_config(self, num_frames: int, width: int, height: int):
        """
        生成Phaser加载配置
        """

        # JSON配置
        config = {
            'key': f'hero_{self.name}',
            'type': 'spritesheet',
            'url': f'assets/sprites/{self.name}_spritesheet.png',
            'frameConfig': {
                'frameWidth': width,
                'frameHeight': height,
                'startFrame': 0,
                'endFrame': num_frames - 1,
                'margin': 0,
                'spacing': 0
            }
        }

        config_file = self.output_dir / f"{self.name}_config.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)

        print(f"\n✅ Phaser配置已生成: {config_file}")

        # TypeScript代码
        ts_code = f'''/**
 * {self.name}动画配置
 * 精灵图尺寸: {width}x{height}, {num_frames}帧
 */

// 在preload()中加载
preload() {{
  this.load.spritesheet(
    '{config['key']}',
    '{config['url']}',
    {{
      frameWidth: {width},
      frameHeight: {height}
    }}
  )
}}

// 在create()中定义动画
create() {{
  this.anims.create({
    key: '{config['key']}_anim',
    frames: this.anims.generateFrameNumbers('{config['key']}', {{
      start: 0,
      end: {num_frames - 1}
    }}),
    frameRate: {num_frames},  // 调整帧率以达到理想速度
    repeat: -1  // -1表示循环播放, 0表示播放一次
  })
}}

// 在HeroEntity中使用
const sprite = this.add.sprite(x, y, '{config['key']}')
sprite.play('{config['key']}_anim')

// 动画事件
sprite.on('animationcomplete', () => {{
  console.log('动画播放完成')
}})
'''

        ts_file = self.output_dir / f"{self.name}_usage.ts"
        ts_file.write_text(ts_code)

        print(f"✅ TypeScript代码已生成: {ts_file}")

        # JSON动画数据（用于Phaser动画管理器）
        anim_data = {
            'key': f'{config['key']}_anim',
            'type': 'frame',
            'frames': [
                {'key': config['key'], 'frame': i} for i in range(num_frames)
            ],
            'frameRate': num_frames,
            'duration': None,
            'skipMissedFrames': False,
            'repeat': -1,
            'repeatDelay': 0,
            'yoyo': False,
            'showOnStart': False,
            'hideOnComplete': False,
            'startFrame': 0
        }

        anim_file = self.output_dir / f"{self.name}_animation.json"
        with open(anim_file, 'w', encoding='utf-8') as f:
            json.dump(anim_data, f, indent=2)

        print(f"✅ 动画数据已生成: {anim_file}")


def main():
    parser = argparse.ArgumentParser(description='创建精灵图')
    parser.add_argument('--input', required=True, help='输入PNG帧目录')
    parser.add_argument('--output', required=True, help='输出目录')
    parser.add_argument('--name', required=True, help='精灵图名称（如stand, attack）')
    parser.add_argument('--frames', type=int, default=12, help='帧数量')
    parser.add_argument('--width', type=int, default=120, help='帧宽度（匹配你的英雄尺寸）')
    parser.add_argument('--height', type=int, default=150, help='帧高度')
    parser.add_argument('--grid', action='store_true', help='创建网格精灵图')

    args = parser.parse_args()

    creator = SpriteSheetCreator(
        Path(args.input),
        Path(args.output),
        args.name,
        args.frames
    )

    if args.grid:
        creator.create_grid_spritesheet(args.width, args.height, cols=4)
    else:
        creator.create_horizontal_spritesheet(args.width, args.height)

    print("\n" + "=" * 60)
    print("全部完成！")
    print(f"请将 {args.output} 目录复制到 assets/sprites/")
    print("=" * 60)


if __name__ == '__main__':
    main()