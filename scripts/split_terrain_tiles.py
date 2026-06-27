#!/usr/bin/env python3
"""
地形素材分割脚本
将大地形PNG图片分割为256x256的标准贴图tile
"""

import os
from pathlib import Path
from PIL import Image
import shutil

class TerrainTileSplitter:
    """地形贴图分割器"""

    def __init__(self, source_dir: str, output_dir: str, tile_size: int = 256):
        self.source_dir = Path(source_dir)
        self.output_dir = Path(output_dir)
        self.tile_size = tile_size

        # 清理输出目录并重新创建
        if self.output_dir.exists():
            shutil.rmtree(self.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def split_image(self, image_path: Path) -> dict:
        """分割单个图片为多个tile"""

        # 打开图片
        img = Image.open(image_path)
        width, height = img.size

        # 计算可以分割的tile数量
        tiles_x = width // self.tile_size
        tiles_y = height // self.tile_size

        result = {
            'source': image_path.name,
            'source_size': f"{width}x{height}",
            'tiles_generated': 0,
            'tiles_x': tiles_x,
            'tiles_y': tiles_y
        }

        # 如果图片尺寸不是tile_size的整数倍，跳过
        if tiles_x == 0 or tiles_y == 0:
            result['error'] = f"图片尺寸太小，无法分割为{self.tile_size}x{self.tile_size}"
            return result

        # 获取地形名称（去掉.png后缀）
        terrain_name = image_path.stem

        # 创建该地形的输出子目录
        terrain_output_dir = self.output_dir / terrain_name
        terrain_output_dir.mkdir(exist_ok=True)

        # 分割图片
        tile_count = 0
        for y in range(tiles_y):
            for x in range(tiles_x):
                # 计算tile的边界
                left = x * self.tile_size
                top = y * self.tile_size
                right = left + self.tile_size
                bottom = top + self.tile_size

                # 提取tile
                tile = img.crop((left, top, right, bottom))

                # 保存tile
                tile_filename = f"{terrain_name}_{x:02d}_{y:02d}.png"
                tile_path = terrain_output_dir / tile_filename
                tile.save(tile_path, 'PNG')

                tile_count += 1

        result['tiles_generated'] = tile_count
        result['output_dir'] = str(terrain_output_dir)

        return result

    def process_all_terrains(self) -> list:
        """处理所有地形图片"""

        print("=" * 70)
        print("地形素材分割脚本")
        print("=" * 70)
        print(f"源目录: {self.source_dir}")
        print(f"输出目录: {self.output_dir}")
        print(f"Tile尺寸: {self.tile_size}x{self.tile_size}")
        print()

        results = []

        # 获取所有PNG文件（排除README和汇总图）
        png_files = list(self.source_dir.glob("*.png"))
        png_files = [f for f in png_files if f.name not in ['README.md', '全地形.png']]

        print(f"发现 {len(png_files)} 个地形图片")
        print()

        for idx, png_file in enumerate(sorted(png_files), 1):
            print(f"[{idx}/{len(png_files)}] 处理: {png_file.name}")

            result = self.split_image(png_file)
            results.append(result)

            if 'error' in result:
                print(f"  ❌ {result['error']}")
            else:
                print(f"  ✅ 原始尺寸: {result['source_size']}")
                print(f"  ✅ 生成tile: {result['tiles_generated']}个 ({result['tiles_x']}x{result['tiles_y']})")
                print(f"  ✅ 输出到: {result['output_dir']}")

            print()

        return results

    def generate_summary(self, results: list):
        """生成分割总结"""

        print("\n" + "=" * 70)
        print("分割完成总结")
        print("=" * 70)

        total_tiles = sum(r['tiles_generated'] for r in results if 'error' not in r)
        successful = sum(1 for r in results if 'error' not in r)
        failed = sum(1 for r in results if 'error' in r)

        print(f"\n成功分割: {successful} 个地形")
        print(f"失败: {failed} 个地形")
        print(f"总生成tile: {total_tiles} 个")
        print(f"\n输出目录结构:")

        # 显示输出目录结构
        for terrain_dir in sorted(self.output_dir.iterdir()):
            if terrain_dir.is_dir():
                tile_count = len(list(terrain_dir.glob("*.png")))
                print(f"  {terrain_dir.name}/ ({tile_count} tiles)")

        print(f"\n输出根目录: {self.output_dir}")

        return {
            'total_tiles': total_tiles,
            'successful': successful,
            'failed': failed
        }


def main():
    """主函数"""

    # 源目录（已复制的大图）
    source_dir = "/home/chang/TowerDefense/assets/images/terrains"

    # 输出目录（分割后的tile）
    output_dir = "/home/chang/TowerDefense/assets/images/terrains_tiles"

    # 创建分割器
    splitter = TerrainTileSplitter(source_dir, output_dir, tile_size=256)

    # 处理所有地形
    results = splitter.process_all_terrains()

    # 生成总结
    summary = splitter.generate_summary(results)

    # 保存分割信息文档
    doc_path = Path(output_dir) / "TILES_INFO.md"
    with open(doc_path, 'w', encoding='utf-8') as f:
        f.write("# 地形Tile分割信息\n\n")
        f.write(f"- Tile尺寸: 256x256像素\n")
        f.write(f"- 总tile数: {summary['total_tiles']}\n")
        f.write(f"- 成功分割: {summary['successful']}个地形\n")
        f.write(f"- 失败: {summary['failed']}个地形\n\n")

        f.write("## 各地形详情\n\n")
        for r in results:
            if 'error' not in r:
                f.write(f"### {r['source']}\n")
                f.write(f"- 原始尺寸: {r['source_size']}\n")
                f.write(f"- Tile数量: {r['tiles_generated']}\n")
                f.write(f"- 输出目录: `{r['output_dir']}`\n\n")

    print(f"\n分割信息文档: {doc_path}")

    return results


if __name__ == "__main__":
    main()