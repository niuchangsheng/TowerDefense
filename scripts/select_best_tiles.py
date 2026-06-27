#!/usr/bin/env python3
"""
地形Tile质量评估和选择脚本
自动分析每个tile的质量并选择最佳tile
"""

import os
from pathlib import Path
from PIL import Image
import json
from typing import List, Dict, Tuple

class TileQualityAnalyzer:
    """Tile质量分析器"""

    def __init__(self, tiles_dir: str):
        self.tiles_dir = Path(tiles_dir)

    def analyze_tile_quality(self, tile_path: Path) -> Dict:
        """分析单个tile的质量指标"""

        img = Image.open(tile_path)

        # 转换为RGB模式（如果是RGBA）
        if img.mode == 'RGBA':
            # 检查透明度占比
            alpha = img.split()[-1]
            transparent_pixels = sum(1 for p in alpha.getdata() if p < 128)
            total_pixels = img.width * img.height
            transparency_ratio = transparent_pixels / total_pixels
            img_rgb = img.convert('RGB')
        else:
            img_rgb = img
            transparency_ratio = 0

        # 计算质量指标
        quality_metrics = {
            'filename': tile_path.name,
            'width': img.width,
            'height': img.height,
            'transparency_ratio': transparency_ratio,
            'color_variance': self._calculate_color_variance(img_rgb),
            'edge_uniformity': self._calculate_edge_uniformity(img_rgb),
            'detail_score': self._calculate_detail_score(img_rgb),
            'overall_score': 0  # 稍后计算
        }

        # 计算综合得分
        # 权重：色彩多样性30%，边缘均匀性40%，细节丰富度30%
        quality_metrics['overall_score'] = (
            quality_metrics['color_variance'] * 0.3 +
            quality_metrics['edge_uniformity'] * 0.4 +
            quality_metrics['detail_score'] * 0.3
        )

        return quality_metrics

    def _calculate_color_variance(self, img: Image.Image) -> float:
        """计算色彩多样性（越大越好）"""
        pixels = list(img.getdata())

        # 计算RGB各通道的方差
        r_vals = [p[0] for p in pixels]
        g_vals = [p[1] for p in pixels]
        b_vals = [p[2] for p in pixels]

        # 使用方差作为多样性指标
        r_var = sum((r - sum(r_vals)/len(r_vals))**2 for r in r_vals) / len(r_vals)
        g_var = sum((g - sum(g_vals)/len(g_vals))**2 for g in g_vals) / len(g_vals)
        b_var = sum((b - sum(b_vals)/len(b_vals))**2 for b in b_vals) / len(b_vals)

        # 归一化到0-100范围
        variance = (r_var + g_var + b_var) / 3
        normalized_score = min(100, variance / 1000 * 100)

        return normalized_score

    def _calculate_edge_uniformity(self, img: Image.Image) -> float:
        """计算边缘均匀性（越均匀越好，适合平铺）"""
        width, height = img.size
        edge_size = 10  # 检查边缘10像素区域

        # 获取四边边缘区域
        top_edge = img.crop((0, 0, width, edge_size))
        bottom_edge = img.crop((0, height - edge_size, width, height))
        left_edge = img.crop((0, 0, edge_size, height))
        right_edge = img.crop((width - edge_size, 0, width, height))

        # 计算边缘颜色平均值
        edges = [
            self._get_avg_color(top_edge),
            self._get_avg_color(bottom_edge),
            self._get_avg_color(left_edge),
            self._get_avg_color(right_edge)
        ]

        # 计算边缘之间的颜色差异（越小越好）
        avg_diff = 0
        for i in range(len(edges)):
            for j in range(i + 1, len(edges)):
                diff = sum(abs(edges[i][k] - edges[j][k]) for k in range(3))
                avg_diff += diff

        avg_diff /= 6  # 6种组合
        uniformity_score = max(0, 100 - avg_diff / 255 * 100)

        return uniformity_score

    def _get_avg_color(self, img: Image.Image) -> Tuple[int, int, int]:
        """获取图片的平均颜色"""
        pixels = list(img.getdata())
        r_avg = sum(p[0] for p in pixels) // len(pixels)
        g_avg = sum(p[1] for p in pixels) // len(pixels)
        b_avg = sum(p[2] for p in pixels) // len(pixels)
        return (r_avg, g_avg, b_avg)

    def _calculate_detail_score(self, img: Image.Image) -> float:
        """计算细节丰富度"""
        # 使用简单的边缘检测来估算细节
        width, height = img.size
        pixels = img.load()

        edge_count = 0
        threshold = 30

        # 检测颜色变化边缘
        for y in range(height - 1):
            for x in range(width - 1):
                # 检查水平相邻像素差异
                diff_h = sum(abs(pixels[x, y][k] - pixels[x + 1, y][k]) for k in range(3))
                # 检查垂直相邻像素差异
                diff_v = sum(abs(pixels[x, y][k] - pixels[x, y + 1][k]) for k in range(3))

                if diff_h > threshold or diff_v > threshold:
                    edge_count += 1

        # 归一化到0-100
        max_edges = (width - 1) * height + width * (height - 1)
        detail_score = edge_count / max_edges * 100

        return detail_score

    def analyze_terrain(self, terrain_name: str) -> Dict:
        """分析某个地形的所有tile"""

        terrain_dir = self.tiles_dir / terrain_name

        if not terrain_dir.exists():
            return {'error': f'地形目录不存在: {terrain_name}'}

        tile_files = list(terrain_dir.glob("*.png"))

        if not tile_files:
            return {'error': f'该地形没有tile文件'}

        print(f"\n分析地形: {terrain_name} ({len(tile_files)}个tile)")

        tiles_metrics = []
        for tile_file in tile_files:
            metrics = self.analyze_tile_quality(tile_file)
            tiles_metrics.append(metrics)
            print(f"  {tile_file.name}: 得分={metrics['overall_score']:.2f}")

        # 按综合得分排序
        tiles_metrics.sort(key=lambda x: x['overall_score'], reverse=True)

        # 选择最佳tile
        best_tiles = tiles_metrics[:3]  # 选择前3个

        result = {
            'terrain': terrain_name,
            'total_tiles': len(tile_files),
            'best_tiles': [{
                'filename': t['filename'],
                'score': t['overall_score'],
                'color_variance': t['color_variance'],
                'edge_uniformity': t['edge_uniformity'],
                'detail_score': t['detail_score']
            } for t in best_tiles],
            'average_score': sum(t['overall_score'] for t in tiles_metrics) / len(tiles_metrics)
        }

        return result

    def analyze_all_terrains(self) -> List[Dict]:
        """分析所有地形"""

        print("=" * 70)
        print("地形Tile质量分析")
        print("=" * 70)

        results = []

        # 获取所有地形目录
        terrain_dirs = [d for d in self.tiles_dir.iterdir() if d.is_dir() and d.name not in ['.', '..']]

        for terrain_dir in sorted(terrain_dirs):
            result = self.analyze_terrain(terrain_dir.name)
            results.append(result)

        return results

    def generate_report(self, results: List[Dict]) -> str:
        """生成分析报告"""

        report = "# 地形Tile质量分析报告\n\n"
        report += "生成时间: 2026-06-28\n\n"
        report += "---\n\n"

        for result in results:
            if 'error' in result:
                report += f"## {result.get('terrain', 'Unknown')}\n\n"
                report += f"❌ {result['error']}\n\n"
                continue

            report += f"## {result['terrain']}\n\n"
            report += f"- 总tile数: {result['total_tiles']}\n"
            report += f"- 平均得分: {result['average_score']:.2f}\n\n"

            report += "### 推荐最佳Tile（前3名）\n\n"
            report += "| 排名 | 文件名 | 综合得分 | 色彩多样性 | 边缘均匀性 | 细节丰富度 |\n"
            report += "|------|--------|----------|-----------|-----------|------------|\n"

            for i, tile in enumerate(result['best_tiles'], 1):
                report += f"| {i} | {tile['filename']} | {tile['score']:.2f} | "
                report += f"{tile['color_variance']:.2f} | {tile['edge_uniformity']:.2f} | "
                report += f"{tile['detail_score']:.2f} |\n"

            report += "\n"

        report += "---\n\n"
        report += "## 评分说明\n\n"
        report += "- **色彩多样性**: 越高表示颜色变化丰富（适合有细节的地形）\n"
        report += "- **边缘均匀性**: 越高表示边缘颜色统一（适合平铺）\n"
        report += "- **细节丰富度**: 越高表示纹理细节多\n"
        report += "- **综合得分**: 加权平均 (色彩30% + 边缘40% + 细节30%)\n\n"

        report += "## 使用建议\n\n"
        report += "1. 对于需要平铺的地形，优先选择边缘均匀性高的tile\n"
        report += "2. 对于需要视觉丰富度的地形，优先选择色彩多样性高的tile\n"
        report += "3. 建议每种地形准备2-3个变体tile，用于增加视觉多样性\n\n"

        return report

    def save_best_tiles_config(self, results: List[Dict]) -> str:
        """保存最佳tile配置为JSON"""

        config = {}

        for result in results:
            if 'error' not in result:
                terrain = result['terrain']
                config[terrain] = {
                    'best_tiles': [t['filename'] for t in result['best_tiles']],
                    'recommended_primary': result['best_tiles'][0]['filename'],
                    'recommended_secondary': result['best_tiles'][1]['filename'] if len(result['best_tiles']) > 1 else result['best_tiles'][0]['filename']
                }

        return json.dumps(config, indent=2, ensure_ascii=False)


def main():
    """主函数"""

    tiles_dir = "/home/chang/TowerDefense/assets/images/terrains_tiles"
    output_dir = "/home/chang/TowerDefense/docs"

    # 创建分析器
    analyzer = TileQualityAnalyzer(tiles_dir)

    # 分析所有地形
    results = analyzer.analyze_all_terrains()

    # 生成报告
    report = analyzer.generate_report(results)

    # 保存报告
    report_path = Path(output_dir) / "Tile_Quality_Report.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"\n报告已保存: {report_path}")

    # 保存最佳tile配置
    config_json = analyzer.save_best_tiles_config(results)
    config_path = Path(output_dir) / "Best_Tiles_Config.json"
    with open(config_path, 'w', encoding='utf-8') as f:
        f.write(config_json)

    print(f"配置已保存: {config_path}")

    print("\n" + "=" * 70)
    print("分析完成！")
    print("=" * 70)

    return results


if __name__ == "__main__":
    main()