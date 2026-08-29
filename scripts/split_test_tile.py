#!/usr/bin/env python3
"""
快速测试tile分割脚本
将测试图片分割为256x256的tile用于平铺测试
"""

from PIL import Image
from pathlib import Path

def split_test_tile():
    """分割测试图片"""

    source_path = Path("/home/chang/TowerDefense/assets/images/test_tile/test_plains.png")
    output_dir = Path("/home/chang/TowerDefense/assets/images/test_tile/tiles")

    output_dir.mkdir(exist_ok=True)

    # 打开图片
    img = Image.open(source_path)
    width, height = img.size

    print(f"源图片尺寸: {width}x{height}")

    tile_size = 256
    tiles_x = width // tile_size
    tiles_y = height // tile_size

    print(f"可分割tile数: {tiles_x}x{tiles_y} = {tiles_x * tiles_y}个")

    # 分割tile
    for y in range(tiles_y):
        for x in range(tiles_x):
            left = x * tile_size
            top = y * tile_size
            right = left + tile_size
            bottom = top + tile_size

            tile = img.crop((left, top, right, bottom))

            tile_path = output_dir / f"tile_{x:02d}_{y:02d}.png"
            tile.save(tile_path, 'PNG')

    print(f"分割完成！输出到: {output_dir}")

    return tiles_x, tiles_y

if __name__ == "__main__":
    split_test_tile()