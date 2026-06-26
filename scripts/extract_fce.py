#!/usr/bin/env python3
"""
三国志11 FCE文件解包工具
将San11Face00.fce中的武将头像提取为PNG图片
"""
import struct
import os
import zlib

def read_fce_file(fce_path, output_dir):
    """解包FCE文件"""
    os.makedirs(output_dir, exist_ok=True)

    with open(fce_path, 'rb') as f:
        # 读取文件头
        header = f.read(8)
        magic = header[:4]

        if magic != b'FACE':
            print(f"错误：不是FCE格式文件，标识为 {magic}")
            return

        print(f"文件格式: FCE")
        print(f"开始解包...")

        # FCE文件格式：
        # 头部8字节：FACE + 版本信息
        # 紧接着是索引数据
        # 每个索引条目包含头像ID、偏移量、大小等信息

        # 读取剩余数据
        data = f.read()

        # 尝试直接查找图片数据（FCE中可能包含BMP格式）
        # 搜索BMP文件头：BM (0x42 0x4D)
        bmp_count = 0
        offset = 0

        while offset < len(data):
            # 搜索BMP标记
            if data[offset:offset+2] == b'BM':
                # 找到BMP文件
                # BMP文件头结构：
                # 0-2: BM
                # 2-6: 文件大小
                # 6-10: 保留
                # 10-14: 数据偏移

                try:
                    bmp_size = struct.unpack('<I', data[offset+2:offset+6])[0]

                    # 提取完整BMP数据
                    bmp_data = data[offset:offset+bmp_size]

                    # 保存为文件
                    bmp_filename = f"face_{bmp_count:04d}.bmp"
                    bmp_path = os.path.join(output_dir, bmp_filename)

                    with open(bmp_path, 'wb') as bmp_file:
                        bmp_file.write(bmp_data)

                    print(f"提取: {bmp_filename} (大小: {bmp_size} bytes)")
                    bmp_count += 1

                    # 移动到下一个位置
                    offset += bmp_size
                except:
                    offset += 1
            else:
                offset += 1

        print(f"\n完成！共提取 {bmp_count} 个BMP图片")
        print(f"输出目录: {output_dir}")

        if bmp_count == 0:
            print("\n警告：未找到BMP格式数据")
            print("可能需要使用专门的FCE解包工具")
            print("建议：尝试使用 3DModeller 或 San11FaceEditor")

if __name__ == '__main__':
    fce_path = 'assets/images/source/San11Face00.fce'
    output_dir = 'assets/images/heroes_extracted'

    read_fce_file(fce_path, output_dir)