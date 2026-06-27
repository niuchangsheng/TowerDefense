# AI 生成武将全身模型 Prompt 指南

## 🎯 素材需求说明

### 当前需求
- **站立状态**：武将全身立绘，部署后显示
- **攻击动作**：攻击时的动态帧（可做成动画）

### 素材规格建议
- **分辨率**：256x256 或 512x512（适合游戏显示）
- **格式**：PNG（带透明背景）
- **风格**：三国志11画风（中国古风水墨风格）

---

## 📝 Prompt 模板

### 1. 关羽全身模型

#### 站立状态
```
Chinese ancient general Guan Yu full body character sprite,
Three Kingdoms era warrior,
wearing green traditional Chinese armor with dragon patterns,
holding long blue dragon glaive weapon (Guandao),
standing pose facing right,
heroic posture with red face and long black beard,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
high quality 2D game character
```

#### 攻击动作（横向挥刀）
```
Chinese ancient general Guan Yu attacking action sprite,
Three Kingdoms era warrior,
wearing green traditional Chinese armor,
swinging blue dragon glaive weapon horizontally,
dynamic attacking pose facing right,
action frame with weapon trail effect,
red face and long black beard,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
action animation frame
```

---

### 2. 张飞全身模型

#### 站立状态
```
Chinese ancient general Zhang Fei full body character sprite,
Three Kingdoms era warrior,
wearing black traditional Chinese armor,
holding long spear weapon,
standing pose facing right,
fierce warrior posture with round black face,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
high quality 2D game character
```

#### 攻击动作（竖劈）
```
Chinese ancient general Zhang Fei attacking action sprite,
Three Kingdoms era warrior,
wearing black traditional Chinese armor,
thrusting spear weapon forward,
dynamic attacking pose facing right,
action frame with weapon glow,
round black face fierce expression,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
action animation frame
```

---

### 3. 赵云全身模型

#### 站立状态
```
Chinese ancient general Zhao Yun full body character sprite,
Three Kingdoms era warrior,
wearing white silver traditional Chinese armor,
holding long spear weapon,
standing pose facing right,
young heroic warrior posture,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
high quality 2D game character
```

#### 攻击动作（快速突刺）
```
Chinese ancient general Zhao Yun attacking action sprite,
Three Kingdoms era warrior,
wearing white silver traditional Chinese armor,
rapid spear thrust attack forward,
dynamic attacking pose facing right,
action frame with speed lines,
young heroic expression,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
action animation frame
```

---

### 4. 吕布全身模型

#### 站立状态
```
Chinese ancient general Lu Bu full body character sprite,
Three Kingdoms era supreme warrior,
wearing luxurious gold and red traditional Chinese armor with feathered helmet,
holding dual halberd weapons,
standing pose facing right,
dominant warrior posture,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
high quality 2D game character
```

#### 攻击动作（双戟交叉斩）
```
Chinese ancient general Lu Bu attacking action sprite,
Three Kingdoms era supreme warrior,
wearing luxurious gold and red armor with feathered helmet,
cross-slash attack with dual halberd weapons,
dynamic attacking pose facing right,
action frame with powerful impact effect,
dominant fierce expression,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
action animation frame
```

---

### 5. 诸葛亮全身模型

#### 站立状态
```
Chinese ancient strategist Zhuge Liang full body character sprite,
Three Kingdoms era advisor,
wearing blue traditional Chinese scholar robe,
holding feather fan,
standing pose facing right,
calm wise strategist posture,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
high quality 2D game character
```

#### 攻击/施法动作（扇风施法）
```
Chinese ancient strategist Zhuge Liang casting spell sprite,
Three Kingdoms era advisor,
wearing blue traditional Chinese scholar robe,
waving feather fan casting magic,
dynamic spellcasting pose facing right,
action frame with magical aura effect,
calm wise expression,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
action animation frame
```

---

## 🎨 Prompt 关键词解析

### 风格关键词（必须包含）
```
Chinese ink painting style      # 中国水墨画风
Three Kingdoms 11 game style    # 三国志11游戏风格
game asset                      # 游戏素材
game sprite                     # 游戏精灵图
transparent background PNG      # 透明背景PNG
```

### 角色特征关键词
```
full body character             # 全身角色
standing pose                   # 站立姿势
attacking pose                  # 攻击姿势
facing right                    # 朝向右侧（游戏需要）
dynamic action                  # 动态动作
```

### 武将特征关键词（按角色调整）
```
red face + long beard           # 关羽：红脸长须
black face + fierce             # 张飞：黑脸凶猛
white armor + young             # 赵云：白甲年轻
gold armor + feathered helmet   # 吕布：金甲雉尾
scholar robe + feather fan      # 诸葛亮：儒袍羽扇
```

### 武器关键词
```
blue dragon glaive (Guandao)    # 青龙偃月刀
long spear                      # 长枪
dual halberd                    # 双戟
feather fan                     # 羽扇
```

---

## 💡 使用建议

### 生成动画帧的方法

#### 方式1：多帧序列生成
在 prompt 后添加：
```
animation frames sequence,
frame 1 idle pose,
frame 2 attack preparation,
frame 3 attack execution,
frame 4 attack recovery,
4 frames in one image
```

#### 方式2：单帧单独生成
为每个动作单独生成一张图：
- 站立帧
- 攻击准备帧
- 攻击执行帧
- 攻击恢复帧

然后在游戏中组合成动画。

---

## 🔧 后期处理

生成后的素材需要：

1. **去背景**
   - 使用 remove.bg 或 Photoshop
   - 确保完全透明背景

2. **统一尺寸**
   - 调整为 256x256 或 512x512
   - 保持角色居中

3. **裁剪动画帧**
   - 如果生成了多帧序列，裁剪为独立帧
   - 每帧保存为独立文件

4. **命名规范**
```
hero_guanyu_stand.png       # 站立状态
hero_guanyu_attack_1.png    # 攻击帧1
hero_guanyu_attack_2.png    # 攻击帧2
hero_guanyu_attack_3.png    # 攻击帧3
```

---

## 📋 Prompt 调整技巧

### 如果生成效果不理想

#### 太写实了？
添加：
```
stylized game art,
semi-realistic 2D,
flat shading
```

#### 太卡通了？
添加：
```
semi-realistic,
detailed shading,
classical Chinese art style
```

#### 背景不透明？
添加：
```
isolated on transparent background,
clean cutout,
no background
```

#### 武器不明显？
添加：
```
clearly visible weapon,
weapon prominently displayed,
weapon in hand
```

---

## 🎯 推荐的 AI 工具

| 工具 | 优势 | 适用场景 |
|-----|------|---------|
| **Midjourney** | 艺术风格强，质量高 | 最终成品生成 |
| **Stable Diffusion** | 可本地运行，免费 | 大量素材生成 |
| **DALL-E 3** | Prompt理解好 | 复杂描述生成 |
| **Leonardo AI** | 游戏素材专用 | 批量游戏资产 |

---

## 📝 完整示例（关羽站立）

### Midjourney Prompt
```
Chinese ancient general Guan Yu full body character sprite,
Three Kingdoms era warrior,
wearing green traditional Chinese armor with dragon patterns,
holding long blue dragon glaive weapon,
standing pose facing right,
heroic posture with red face and long black beard,
Chinese ink painting style game asset,
Three Kingdoms 11 game style,
transparent background PNG,
game sprite 256x256 pixels,
high quality 2D game character --v 6 --style raw
```

### Stable Diffusion Prompt
```
Positive:
Chinese ancient general Guan Yu full body character sprite, Three Kingdoms era warrior, wearing green traditional Chinese armor with dragon patterns, holding long blue dragon glaive weapon, standing pose facing right, heroic posture with red face and long black beard, Chinese ink painting style game asset, Three Kingdoms 11 game style, transparent background PNG, game sprite 256x256 pixels, high quality 2D game character

Negative:
realistic photo, 3D render, western style, modern clothing, background scenery, blurry, low quality
```

---

## 💾 保存路径建议

生成后保存到项目：
```
/home/chang/TowerDefense/assets/images/heroes/fullbody/
├── guanyu/
│   ├── stand.png
│   ├── attack_1.png
│   ├── attack_2.png
│   └── attack_3.png
├── zhangfei/
│   ├── stand.png
│   ├── attack_1.png
│   ├── attack_2.png
│   └── attack_3.png
└── zhaoyun/
    ├── stand.png
    ├── attack_1.png
    ├── attack_2.png
    └── attack_3.png
```

---

**生成优先级建议：**
1. 先生成关羽、张飞、赵云（当前已有配置）
2. 再生成吕布、诸葛亮（热门武将）
3. 其他武将按需生成

---

**更新日期：** 2026-06-27