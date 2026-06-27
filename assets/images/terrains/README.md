# 地形素材目录结构说明

## 目录位置
`/home/chang/TowerDefense/assets/images/terrains/`

## 建议的子目录结构

```
terrains/
├── grass/           # 平原
│   ├── grass_01.png
│   ├── grass_02.png
│   └── ...
├── forest/          # 森林
│   ├── forest_01.png
│   └── ...
├── mountain/        # 山地
│   ├── mountain_01.png
│   └── ...
├── river/           # 河流
│   ├── river_01.png
│   └── ...
├── swamp/           # 湿地
│   ├── swamp_01.png
│   └── ...
├── road/            # 道路
│   ├── road_01.png
│   └── ...
├── bridge/          # 桥梁
│   ├── bridge_01.png
│   └── ...
├── fortress/        # 城塞
│   ├── fortress_01.png
│   └── ...
├── snow/            # 雪地
│   ├── snow_01.png
│   └── ...
├── desert/          # 沙漠
│   ├── desert_01.png
│   └── ...
└── raw/             # 原始素材（未处理）
    └── ...
```

## 文件命名规范

### 格式
```
{地形类型}_{变体编号}.png
```

### 示例
- `grass_01.png` - 平原第1种变体
- `grass_02.png` - 平原第2种变体
- `forest_dense.png` - 密集森林
- `forest_sparse.png` - 稀疏森林
- `mountain_high.png` - 高山
- `mountain_low.png` - 低山

## 技术要求

### 必须满足
- ✅ 格式：PNG
- ✅ 背景：透明
- ✅ 尺寸：256x256像素（推荐）或 512x512像素
- ✅ 平铺：无缝衔接

### 推荐属性
- 🎨 色调：参考三国志11配色
- 🎨 风格：中国古典水墨风格
- 🎨 视角：45度俯视角

## 快速整理脚本

### Windows -> Linux 复制命令

如果你在Windows上生成了素材，可以用以下方式复制到项目：

**方法1：手动复制**
```
从：C:\Users\chang\Codes\dixing
到：\\wsl$\\Ubuntu\home\chang\TowerDefense\assets\images\terrains\
```

**方法2：WSL命令**
```bash
cp -r /mnt/c/Users/chang/Codes/dixing/* \
      /home/chang/TowerDefense/assets/images/terrains/
```

## 分类整理建议

### 按地形类型分类
将生成的素材按照地形类型分别放入对应的子文件夹

### 按风格分类（可选）
如果有多种风格版本：
```
terrains/
├── style_ink/       # 水墨风格
├── style_realistic/ # 写实风格
└── style_minimal/   # 简约风格
```

## 与代码集成

生成的地形素材路径会被代码引用：

**代码位置：** `src/config/terrain.config.ts`

**示例引用：**
```typescript
grass: {
  type: 'grass',
  name: '平原',
  color: 0x4a7c4e,
  imagePath: 'assets/images/terrains/grass/grass_01.png', // 新增
  ...
}
```

---

**创建日期：** 2026-06-27