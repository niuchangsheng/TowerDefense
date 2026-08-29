# War3 BLP纹理加载指南

## 📋 概述

BLP是暴雪游戏（War3、WoW）使用的纹理格式，浏览器无法直接加载。本指南提供两种方案：

## 🎯 方案选择

### 方案一：预转换（推荐）
**优点：** 加载快、性能好、无运行时开销
**缺点：** 需要提前处理素材

### 方案二：运行时转换
**优点：** 无需预处理、直接加载BLP
**缺点：** 加载慢、消耗CPU、首次加载卡顿

---

## 方案一：预转换流程

### 1️⃣ 提取War3 BLP文件

**使用Ladik's MPQ Editor：**

```bash
# War3安装目录（你的路径）
cd /mnt/c/Program\ Files/San11pk\ Tc/

# 打开war3.mpq文件
# 路径：TerrainArt/Lordaeron/
```

**常用地形贴图路径：**

| 地形类型 | BLP路径 |
|---------|---------|
| 平原 | `TerrainArt/Lordaeron/Lordaeron_Summer_Grass.blp` |
| 道路 | `TerrainArt/Lordaeron/Lordaeron_Summer_Dirt.blp` |
| 森林 | `TerrainArt/Lordaeron/Lordaeron_Summer_Forest.blp` |
| 山地 | `TerrainArt/Lordaeron/Lordaeron_Summer_Rock.blp` |
| 雪地 | `TerrainArt/Northrend/Northrend_Snow.blp` |
| 沙漠 | `TerrainArt/Outland/Outland_Dark.blp` |

### 2️⃣ 批量转换BLP → PNG

```bash
# 安装Python依赖
pip install blp pillow

# 运行转换脚本
cd /home/chang/TowerDefense
python scripts/convert_blp.py ./extracted_blp ./assets/images/war3_tiles

# 输出结果：
# ✅ 转换成功: Lordaeron_Summer_Grass.blp -> Lordaeron_Summer_Grass.png
# ✅ 转换成功: Lordaeron_Summer_Dirt.blp -> Lordaeron_Summer_Dirt.png
# ...
# 📋 已生成映射文件: terrain_mapping.json
```

### 3️⃣ 更新地形配置

转换脚本会自动生成 `terrain_mapping.json`，根据它更新 [terrain.config.ts](src/config/terrain.config.ts)：

```typescript
// 替换tileImages路径
grass: {
  tileImages: [
    'assets/images/war3_tiles/lordaeron_grass_00.png',
    'assets/images/war3_tiles/lordaeron_grass_01.png',
    'assets/images/war3_tiles/lordaeron_grass_02.png',
  ]
}
```

### 4️⃣ 正常加载PNG

```typescript
// scenes/GameScene.ts
preload() {
  // 正常加载PNG（无需特殊处理）
  this.load.image('grass', 'assets/images/war3_tiles/lordaeron_grass_00.png')
}
```

---

## 方案二：运行时转换

### 1️⃣ 初始化加载器

```typescript
// main.ts 或 game.ts
import { initBLPLoader } from '@/utils/PhaserBLPLoader'

// 在创建Phaser.Game之前调用
initBLPLoader()

const game = new Phaser.Game(config)
```

### 2️⃣ 在场景中加载BLP

```typescript
// scenes/MyScene.ts
export class MyScene extends Phaser.Scene {
  preload() {
    // 直接加载BLP文件（自动转换）
    this.load.blp('grass', 'assets/war3/lordaeron_grass.blp')
    this.load.blp('forest', 'assets/war3/lordaeron_forest.blp')
    this.load.blp('mountain', 'assets/war3/lordaeron_rock.blp')

    // 显示加载进度
    this.load.on('progress', (value: number) => {
      console.log(`加载进度: ${Math.round(value * 100)}%`)
    })
  }

  create() {
    // 正常使用（已自动转换为PNG）
    this.add.image(100, 100, 'grass')
    this.add.image(200, 100, 'forest')
  }
}
```

### ⚠️ 性能警告

- **首次加载慢**：每个BLP需要解码DXT压缩（约50-200ms）
- **建议批量加载**：在loading场景一次性加载所有BLP
- **不适合大量素材**：超过100个BLP建议预转换

---

## 🛠️ War3地图编辑器方案

### 使用World Editor制作地图

**优点：**
- 专业地形编辑器
- 自动处理地形过渡
- 可以绘制完整关卡

**缺点：**
- 导出格式 `.w3x` 需转换
- 需要写解析工具

### 转换.w3x地图

```typescript
// 需要实现.w3x解析器
// 提取地形数据 → 转为你的关卡配置格式

// .w3x文件结构：
// - 地形高度图
// - 地形类型图
// - 装饰物位置
// - 单位/建筑位置
```

---

## 📦 推荐工作流程

### 完整流程（适合大量素材）

```
1. MPQ Editor提取BLP → extracted_blp/
2. Python脚本批量转换 → assets/images/war3_tiles/
3. 更新terrain.config.ts配置
4. 正常加载PNG素材
```

### 快速测试流程（适合少量素材）

```
1. HiveWorkshop下载现成PNG
2. 直接放入assets/images/目录
3. 立即可用
```

---

## 🔗 有用的资源

### 下载War3素材
- **HiveWorkshop**: https://www.hiveworkshop.com/
- **OpenGameArt**: https://opengameart.org/
- **itch.io**: https://itch.io/game-assets/free

### MPQ工具
- **Ladik's MPQ Editor**: https://www.hiveworkshop.com/threads/mpq-editor.128374/
- **StormLib**: C++ MPQ库

### BLP工具
- **Python blp库**: https://pypi.org/project/blp/
- **BLP2PNG**: Windows GUI工具

---

## ❓ FAQ

**Q: BLP转换后颜色不对？**
A: War3使用特殊调色板，转换脚本已处理。如果仍有问题，手动调整色阶。

**Q: 地形无缝拼接不自然？**
A: War3 tile专门设计为无缝，转换后保持原特性。注意边缘处理。

**Q: 版权问题？**
A: 个人学习可用。商业项目建议使用免费素材站资源。

**Q: 运行时转换太慢？**
A: 使用预转换方案。或只转换必需素材，其他保持PNG。

---

## 📝 文件说明

| 文件 | 用途 |
|------|------|
| [BLPConverter.ts](src/utils/BLPConverter.ts) | BLP格式解码器（DXT解压缩） |
| [PhaserBLPLoader.ts](src/utils/PhaserBLPLoader.ts) | Phaser加载器插件 |
| [convert_blp.py](scripts/convert_blp.py) | Python批量转换工具 |

---

**下一步：** 你想选择哪种方案？我可以帮你：
1. 提取War3的BLP素材
2. 运行转换脚本
3. 更新地形配置