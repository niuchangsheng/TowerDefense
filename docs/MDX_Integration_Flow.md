# MDX模型集成完整流程

## ✅ 已完成的工具

我已为你创建以下工具和文档：

1. **[MDX_Integration_Guide.md](docs/MDX_Integration_Guide.md)** - 完整集成指南
2. **[create_spritesheet.py](scripts/create_spritesheet.py)** - 精灵图合并工具
3. **[AnimatedHeroEntity.example.ts](src/entities/examples/AnimatedHeroEntity.example.ts)** - 代码示例

---

## 🎯 下一步操作流程

### 第1步：截图动画帧（必需）

**选择工具（推荐War3 Model Editor）：**

```bash
# 下载地址
https://www.hiveworkshop.com/threads/model-editor.130826/

# 或使用在线查看器
https://www.hiveworkshop.com/
```

**操作步骤：**

1. 打开MDX文件：`/tmp/war3_preview/Elf Lashers/Dark Elf Beastmaster hero/Dark_Elf_Beastmaster_hero_opt.mdx`

2. 设置视角（塔防最佳）：
   - 正面视角（Rotation Y = 0°）
   - 略微俯视（Rotation X = 15°）

3. 截图每个动画：
   ```
   Stand动画：8-12帧
   Attack动画：10-15帧
   Spell动画：8-12帧
   Death动画：6-8帧
   ```

4. 保存到目录：
   ```
   /tmp/war3_preview/screenshots/stand/frame_001.png
   /tmp/war3_preview/screenshots/stand/frame_002.png
   ...
   /tmp/war3_preview/screenshots/attack/frame_001.png
   ...
   ```

---

### 第2步：合并精灵图

**运行精灵图工具：**

```bash
cd /home/chang/TowerDefense

# 创建stand精灵图
python3 scripts/create_spritesheet.py \
  --input /tmp/war3_preview/screenshots/stand \
  --output assets/sprites/hero_dark_elf \
  --name stand \
  --frames 12 \
  --width 120 \
  --height 150

# 创建attack精灵图
python3 scripts/create_spritesheet.py \
  --input /tmp/war3_preview/screenshots/attack \
  --output assets/sprites/hero_dark_elf \
  --name attack \
  --frames 12

# 创建spell精灵图
python3 scripts/create_spritesheet.py \
  --input /tmp/war3_preview/screenshots/spell \
  --output assets/sprites/hero_dark_elf \
  --name spell \
  --frames 10

# 创建death精灵图
python3 scripts/create_spritesheet.py \
  --input /tmp/war3_preview/screenshots/death \
  --output assets/sprites/hero_dark_elf \
  --name death \
  --frames 6
```

**输出文件：**

```
assets/sprites/hero_dark_elf/
├── stand_spritesheet.png       ✅ 精灵图
├── stand_config.json           ✅ Phaser配置
├── stand_usage.ts              ✅ TypeScript代码
├── stand_animation.json        ✅ 动画数据
├── attack_spritesheet.png
├── attack_config.json
...
```

---

### 第3步：集成到游戏

**修改BattleScene.ts：**

```typescript
preload() {
  // 加载精灵图（参考生成的_config.json）
  this.load.spritesheet(
    'hero_dark_elf_beastmaster_stand',
    'assets/sprites/hero_dark_elf/stand_spritesheet.png',
    { frameWidth: 120, frameHeight: 150 }
  )

  this.load.spritesheet(
    'hero_dark_elf_beastmaster_attack',
    'assets/sprites/hero_dark_elf/attack_spritesheet.png',
    { frameWidth: 120, frameHeight: 150 }
  )
}

create() {
  // 定义动画（参考生成的_animation.json）
  this.anims.create({
    key: 'hero_dark_elf_beastmaster_stand_anim',
    frames: this.anims.generateFrameNumbers('hero_dark_elf_beastmaster_stand', { start: 0, end: 11 }),
    frameRate: 8,
    repeat: -1
  })

  this.anims.create({
    key: 'hero_dark_elf_beastmaster_attack_anim',
    frames: this.anims.generateFrameNumbers('hero_dark_elf_beastmaster_attack', { start: 0, end: 11 }),
    frameRate: 12,
    repeat: 0
  })
}
```

**修改HeroEntity.ts：**

```typescript
// 参考AnimatedHeroEntity.example.ts
// 将Image改为Sprite，添加动画支持
```

---

## 📦 素材文件位置

```
原始素材：/tmp/war3_preview/Elf Lashers/
├── Dark Elf Beastmaster hero/
│   ├── Dark_Elf_Beastmaster_hero_opt.mdx  (MDX模型)
│   └── Beastmaster.blp                     (纹理)
├── Dark Elf Beastmaster icon/
│   ├── beastmaster.png                     ✅ 可直接使用
│   └── BTNbeastmaster.blp                  (需转换)
```

---

## 🎨 视觉效果对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **精灵图（推荐）** | ✅ 性能好<br>✅ 与现有架构兼容<br>✅ 实现简单 | ⚠️ 需手动截图<br>⚠️ 角度固定 |
| **3D实时渲染** | ✅ 支持旋转<br>✅ 角度可调 | ❌ 性能开销大<br>❌ 实现复杂 |
| **纯BLP纹理** | ✅ 直接加载 | ❌ 无动画<br>❌ 只能做头像 |

---

## ⏱️ 时间估算

| 步骤 | 时间 |
|------|------|
| 截图动画帧（1个英雄） | 30分钟 |
| 合并精灵图 | 5分钟 |
| 集成到代码 | 10分钟 |
| **总计** | **45分钟/英雄** |

---

## 🚀 快速开始

**现在立即开始：**

```bash
# 1. 查看已有的PNG图标（可直接用）
ls /tmp/war3_preview/Elf Lashers/*/icon/*.png

# 2. 在浏览器打开预览（已启动HTTP服务器）
# http://localhost:8888/simple_preview.html

# 3. 下一步：下载War3 Model Editor截图动画帧
```

---

## 💡 推荐方案

**对于你的塔防游戏，我推荐：**

1. **立即使用PNG图标** → 已可以直接加载到游戏
2. **精灵图用于英雄动画** → 需截图后用我的工具转换
3. **暂时跳过MDX 3D渲染** → 除非需要实时旋转

**你想先做什么？**

- ✅ 使用PNG图标（最简单，立即可用）
- ⚠️ 创建精灵图动画（需要你先截图）
- ❌ MDX实时3D渲染（复杂，不推荐）

告诉我你的选择，我继续帮你！