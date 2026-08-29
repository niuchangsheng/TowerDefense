# War3 MDX模型集成指南

## 🎯 目标

将MDX 3D模型转换为你的塔防游戏可用的2D精灵图

---

## 方案一：手动截图法（最简单✅）

### 步骤1：使用War3 Model Editor查看模型

**下载工具：**
https://www.hiveworkshop.com/threads/model-editor.130826/

**操作步骤：**

```
1. 打开 War3 Model Editor
2. File → Open → 选择MDX文件
   路径：/tmp/war3_preview/Elf Lashers/Dark Elf Beastmaster hero/Dark_Elf_Beastmaster_hero_opt.mdx

3. 设置相机角度（塔防最佳视角）：
   - Camera → Rotation Y: 0° (正面)
   - Camera → Rotation X: 15° (略微俯视)
   - Camera → Distance: 300 (适中距离)

4. 播放动画：
   - Animations → Stand (站立)
   - Animations → Attack (攻击)
   - Animations → Spell (施法)
```

### 步骤2：截图并保存

**使用工具截图：**

```
Windows推荐工具：
- ShareX (免费): https://getsharex.com/
  支持连续截图，可以录制动画帧

- Snipaste (免费): https://www.snipaste.com/
  支持精确截图，贴图功能

操作：
1. 播放"Stand"动画
2. 使用ShareX的"屏幕录制"或"连续截图"
3. 每帧截一张图（共8-12帧）
4. 保存为PNG（确保透明背景）
```

### 步骤3：制作精灵图

**使用工具合并帧：**

```
推荐工具：
- TexturePacker (专业): https://www.codeandweb.com/texturepacker
  自动生成Phaser配置文件

- ShoeBox (免费): http://renderhjs.net/shoebox/
  快速制作精灵图

- Python脚本 (我提供):
  见下方的create_spritesheet.py
```

---

## 方案二：自动化脚本（推荐）

### 创建精灵图脚本

```bash
# 使用我提供的Python脚本
cd /home/chang/TowerDefense
python3 scripts/create_spritesheet.py \
  --input /tmp/war3_preview/screenshots \
  --output assets/sprites/hero_dark_elf \
  --name stand attack spell \
  --frames 12
```

---

## 方案三：使用Blender渲染（专业）

### Blender MDX导入插件

```
1. 安装Blender: https://www.blender.org/
2. 安装MDX Importer插件: https://github.com/mewhh/blender-mdx-importer

3. 导入MDX：
   File → Import → Warcraft 3 MDX (.mdx)

4. 设置渲染：
   - 相机：正面视角，略微俯视
   - 背景：透明
   - 渲染引擎：Eevee（快速）或Cycles（高质量）

5. 渲染动画：
   Render → Render Animation
   输出格式：PNG, 256x256, 透明背景
```

---

## 集成到你的项目

### 修改HeroEntity.ts

```typescript
// 修改getHeroImageKey()方法
private getHeroImageKey(heroId: string): string {
  // 返回精灵图key
  return `hero_${heroId}_stand`
}

// 加载精灵图
preload() {
  // 在场景中加载
  this.load.spritesheet('hero_dark_elf_stand',
    'assets/sprites/hero_dark_elf/stand.png',
    { frameWidth: 120, frameHeight: 150 }
  )
  this.load.spritesheet('hero_dark_elf_attack',
    'assets/sprites/hero_dark_elf/attack.png',
    { frameWidth: 120, frameHeight: 150 }
  )
}

// 定义动画
create() {
  this.anims.create({
    key: 'hero_dark_elf_stand_anim',
    frames: this.anims.generateFrameNumbers('hero_dark_elf_stand', { start: 0, end: 7 }),
    frameRate: 8,
    repeat: -1
  })

  this.anims.create({
    key: 'hero_dark_elf_attack_anim',
    frames: this.anims.generateFrameNumbers('hero_dark_elf_attack', { start: 0, end: 11 }),
    frameRate: 12,
    repeat: 0
  })
}

// 在HeroEntity中播放
constructor(scene: Phaser.Scene, hero: Hero, deployed: DeployedHero) {
  // ...

  // 播放站立动画
  this.heroImage = scene.add.sprite(0, 0, `hero_${hero.id}_stand`)
  this.heroImage.play(`hero_${hero.id}_stand_anim`)
}

// 攻击时切换动画
playAttackAnimation() {
  this.heroImage.play(`hero_${this.heroData.id}_attack_anim`)
  // 攻击结束后回到站立
  this.heroImage.once('animationcomplete', () => {
    this.heroImage.play(`hero_${this.heroData.id}_stand_anim`)
  })
}
```

---

## 推荐的精灵图规格

基于你的HeroEntity.ts（全身模型120x150）：

```json
{
  "stand": {
    "frames": 8,
    "frameWidth": 120,
    "frameHeight": 150,
    "frameRate": 8,
    "repeat": -1
  },
  "attack": {
    "frames": 12,
    "frameWidth": 120,
    "frameHeight": 150,
    "frameRate": 12,
    "repeat": 0
  },
  "spell": {
    "frames": 10,
    "frameWidth": 120,
    "frameHeight": 150,
    "frameRate": 10,
    "repeat": 0
  },
  "death": {
    "frames": 6,
    "frameWidth": 120,
    "frameHeight": 150,
    "frameRate": 8,
    "repeat": 0
  }
}
```

---

## 下一步

选择你想用的方案：

1. **手动截图**（最简单）→ 我帮你写精灵图合并脚本
2. **自动化脚本**（推荐）→ 需要你先用工具截图
3. **Blender渲染**（专业）→ 我帮你写Blender配置

告诉我你选择哪个方案，我来帮你完成！