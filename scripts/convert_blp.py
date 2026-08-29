#!/usr/bin/env python3
"""
BLP批量转换工具
将War3的BLP文件批量转换为PNG

依赖安装:
pip install blp pillow

使用方法:
python convert_blp.py <input_dir> <output_dir>

示例:
python convert_blp.py ./war3_textures ./converted_png
"""

import os
import sys
from pathlib import Path

try:
    from blp import convert_blp_to_png
    from PIL import Image
except ImportError:
    print("需要安装依赖:")
    print("pip install blp pillow")
    sys.exit(1)


def convert_blp_file(input_path: Path, output_path: Path) -> bool:
    """
    转换单个BLP文件
    """
    try:
        # 使用blp库转换
        convert_blp_to_png(str(input_path), str(output_path))

        print(f"✅ 转换成功: {input_path.name} -> {output_path.name}")
        return True

    except Exception as e:
        print(f"❌ 转换失败: {input_path.name} - {e}")
        return False


def batch_convert(input_dir: Path, output_dir: Path) -> tuple[int, int]:
    """
    批量转换目录中的所有BLP文件
    """
    # 创建输出目录
    output_dir.mkdir(parents=True, exist_ok=True)

    # 查找所有BLP文件
    blp_files = list(input_dir.glob("**/*.blp"))

    if not blp_files:
        print(f"⚠️  未找到BLP文件: {input_dir}")
        return 0, 0

    print(f"找到 {len(blp_files)} 个BLP文件")
    print(f"开始转换...")

    success_count = 0
    fail_count = 0

    for blp_file in blp_files:
        # 保持相对路径结构
        relative_path = blp_file.relative_to(input_dir)
        output_path = output_dir / relative_path.with_suffix('.png')

        # 创建子目录
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # 转换文件
        if convert_blp_file(blp_file, output_path):
            success_count += 1
        else:
            fail_count += 1

    print(f"\n转换完成:")
    print(f"  成功: {success_count}")
    print(f"  失败: {fail_count}")

    return success_count, fail_count


def optimize_png(png_path: Path) -> None:
    """
    优化PNG文件大小
    """
    try:
        img = Image.open(png_path)

        # 如果是256x256的tile，可以进一步优化
        if img.size == (256, 256):
            # 转为RGBA确保兼容性
            if img.mode != 'RGBA':
                img = img.convert('RGBA')

            # 保存优化版本
            img.save(png_path, 'PNG', optimize=True, compress_level=9)

            print(f"🔧 已优化: {png_path.name}")

    except Exception as e:
        print(f"⚠️  优化失败: {png_path.name} - {e}")


def generate_tileset_mapping(input_dir: Path, output_file: Path) -> None:
    """
    生成地形配置映射文件
    用于替换terrain.config.ts中的tileImages路径
    """
    png_files = list(input_dir.glob("**/*.png"))

    mapping = {}

    for png_file in png_files:
        # War3地形命名规则映射
        name = png_file.stem.lower()

        # 自动识别地形类型
        terrain_mapping = {
            'grass': 'grass',
            'dirt': 'road',
            'forest': 'forest',
            'rock': 'mountain',
            'mountain': 'mountain',
            'swamp': 'swamp',
            'water': 'river',
            'river': 'river',
            'bridge': 'bridge',
            'snow': 'snow',
            'ice': 'snow',
            'sand': 'desert',
            'desert': 'desert',
            'city': 'fortress',
            'wall': 'fortress',
            'fortress': 'fortress'
        }

        # 匹配地形类型
        terrain_type = None
        for key, value in terrain_mapping.items():
            if key in name:
                terrain_type = value
                break

        if terrain_type:
            if terrain_type not in mapping:
                mapping[terrain_type] = []
            mapping[terrain_type].append(str(png_file.relative_to(input_dir)))

    # 写入JSON映射文件
    import json
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)

    print(f"\n📋 已生成映射文件: {output_file}")
    print(f"包含 {len(mapping)} 种地形类型")


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    input_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])

    if not input_dir.exists():
        print(f"❌ 输入目录不存在: {input_dir}")
        sys.exit(1)

    print(f"输入目录: {input_dir}")
    print(f"输出目录: {output_dir}")
    print("-" * 50)

    # 批量转换
    success, fail = batch_convert(input_dir, output_dir)

    # 优化PNG
    if success > 0:
        print("\n优化PNG文件...")
        png_files = list(output_dir.glob("**/*.png"))
        for png_file in png_files[:10]:  # 只优化前10个作为示例
            optimize_png(png_file)

    # 生成映射文件
    generate_tileset_mapping(output_dir, output_dir / 'terrain_mapping.json')

    print("\n全部完成!")


if __name__ == '__main__':
    main()