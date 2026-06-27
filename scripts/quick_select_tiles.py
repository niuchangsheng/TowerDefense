#!/usr/bin/env python3
"""
快速Tile选择脚本
不做复杂分析，直接选择中间位置的tile（通常质量较好）
"""

from pathlib import Path
import json

def quick_select_best_tiles():
    """快速选择每种地形的最佳tile"""

    tiles_dir = Path("/home/chang/TowerDefense/assets/images/terrains_tiles")
    output_dir = Path("/home/chang/TowerDefense/docs")

    print("=" * 60)
    print("快速Tile选择")
    print("=" * 60)

    best_tiles = {}

    # 获取所有地形目录
    terrain_dirs = [d for d in tiles_dir.iterdir() if d.is_dir()]

    for terrain_dir in sorted(terrain_dirs):
        terrain_name = terrain_dir.name
        tiles = list(terrain_dir.glob("*.png"))

        if tiles:
            # 选择规则：
            # 1. 第一个tile（通常是基础样式）
            # 2. 中间的tile（如02_02，细节更丰富）
            # 3. 偏中心位置的tile

            # 找到坐标居中的tile（例如03_03, 02_02）
            center_tiles = []
            for tile in tiles:
                parts = tile.stem.split('_')
                if len(parts) >= 3:
                    try:
                        x = int(parts[-2])
                        y = int(parts[-1])
                        # 选择中心区域（坐标2-4之间）
                        if 2 <= x <= 4 and 2 <= y <= 4:
                            center_tiles.append(tile.name)
                    except:
                        pass

            # 如果找到中心tile，优先选择
            if center_tiles:
                recommended = sorted(center_tiles)[0]  # 选最小的坐标
            else:
                # 否则选择第一个tile
                recommended = tiles[0].name

            # 选择3个推荐tile
            selected_tiles = [tiles[0].name]  # 第一个
            if center_tiles:
                selected_tiles.append(center_tiles[0])
            if len(tiles) > 2:
                selected_tiles.append(tiles[2].name)

            best_tiles[terrain_name] = {
                'recommended': recommended,
                'alternatives': selected_tiles[:3],
                'total_tiles': len(tiles)
            }

            print(f"{terrain_name}: 推荐 {recommended} ({len(tiles)}个tile)")

    # 保存配置
    config_path = output_dir / "Best_Tiles_Quick_Config.json"
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(best_tiles, f, indent=2, ensure_ascii=False)

    print(f"\n配置已保存: {config_path}")

    # 生成简单报告
    report_path = output_dir / "Tile_Quick_Report.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# 地形Tile快速选择结果\n\n")
        f.write("基于位置选择策略，无需复杂计算。\n\n")
        f.write("## 选择规则\n\n")
        f.write("1. 优先选择中心位置tile（坐标2-4）\n")
        f.write("2. 备选第一个tile（基础样式）\n")
        f.write("3. 备选第三个tile（多样性）\n\n")
        f.write("## 推荐配置\n\n")

        for terrain, config in best_tiles.items():
            f.write(f"### {terrain}\n\n")
            f.write(f"- **推荐**: `{config['recommended']}`\n")
            f.write(f"- **备选**: {', '.join(config['alternatives'])}\n")
            f.write(f"- **总数**: {config['total_tiles']}个\n\n")

    print(f"报告已保存: {report_path}")

    return best_tiles


if __name__ == "__main__":
    quick_select_best_tiles()