#!/usr/bin/env python3
"""
三国志11 FCE文件解包工具（改进版）
FCE文件结构：
- 头部：FACE标识 + 索引表大小
- 索引表：每个武将的索引信息
- 数据区：头像图片数据（可能是压缩的）
"""
import struct
import os
from PIL import Image
import io

def parse_fce_v2(fce_path, output_dir):
    """解析FCE文件版本2"""
    os.makedirs(output_dir, exist_ok=True)

    with open(fce_path, 'rb') as f:
        # 读取文件头（12字节）
        magic = f.read(4)
        if magic != b'FACE':
            print(f"错误：不是FCE文件")
            return

        # 跳过文件头其他部分
        f.seek(12)

        # 读取数据区开始位置
        # FCE索引表通常有固定数量的条目（如800+武将）
        # 每个条目包含：ID、偏移、大小

        # 读取整个文件
        f.seek(0)
        all_data = f.read()

        # 尝试解析索引
        # 从第8字节开始是索引数据
        index_start = 8

        # 三国志11每个武将头像大小约为 96x96 或更小
        # 尝试按固定大小切割

        # 方法：按索引条目解析（假设每条3字节）
        print("尝试解析索引表...")

        # 读取文件总大小
        file_size = len(all_data)

        # 假设索引区大小（根据文件大小估算）
        # 三国志11大约有600-800个武将
        num_faces = 725  # 三国志11武将数量

        # 每个索引条目假设为12字节（ID + offset + size）
        index_size = num_faces * 12
        index_end = 8 + index_size

        print(f"假设索引区: 8 - {index_end}")
        print(f"数据区开始: {index_end}")

        # 读取索引表
        faces = []
        f.seek(8)

        # 尝试读取索引条目
        for i in range(min(num_faces, 800)):
            try:
                # 每条索引：可能包含 ID(2) + offset(4) + size(4) + reserved(2)
                entry = f.read(12)
                if len(entry) < 12:
                    break

                # 解析（尝试不同的格式）
                face_id = struct.unpack('<H', entry[0:2])[0]
                offset = struct.unpack('<I', entry[2:6])[0]
                size = struct.unpack('<I', entry[6:10])[0]

                if offset > 0 and size > 0 and offset < file_size:
                    faces.append({
                        'id': face_id,
                        'offset': offset,
                        'size': size
                    })
            except:
                break

        print(f"解析到 {len(faces)} 个索引条目")

        # 提取图片
        extracted = 0
        for face in faces:  # 提取全部
            try:
                f.seek(face['offset'])
                img_data = f.read(face['size'])

                # 尝试解析为图片（可能是BMP、PNG或原始像素）
                if img_data[:2] == b'BM':
                    # BMP格式
                    img = Image.open(io.BytesIO(img_data))
                    img_path = os.path.join(output_dir, f"face_{face['id']:04d}.png")
                    img.save(img_path)
                    extracted += 1
                    print(f"提取: face_{face['id']:04d} (BMP)")
                else:
                    # 可能是原始像素数据，尝试按96x96解析
                    # 三国志11头像通常是96x96像素，24位色
                    width = 96
                    height = 96
                    expected_size = width * height * 3

                    if face['size'] >= expected_size:
                        try:
                            img = Image.frombytes('RGB', (width, height), img_data[:expected_size])
                            img_path = os.path.join(output_dir, f"face_{face['id']:04d}.png")
                            img.save(img_path)
                            extracted += 1
                            print(f"提取: face_{face['id']:04d} (原始像素)")
                        except Exception as e:
                            print(f"无法解析 face_{face['id']}: {e}")
            except Exception as e:
                print(f"提取失败: {e}")

        print(f"\n成功提取 {extracted} 个头像")

if __name__ == '__main__':
    import sys
    sys.path.insert(0, '.venv/lib/python3.12/site-packages')

    fce_path = 'assets/images/source/San11Face00.fce'
    output_dir = 'assets/images/heroes_extracted'

    parse_fce_v2(fce_path, output_dir)