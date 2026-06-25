# 技术架构设计 - 三国五行塔防

## 概述

基于PRD文档，设计一个基于 Phaser 3 + TypeScript 的塔防游戏技术架构。

## 架构目标

- **可维护性**：模块化设计，清晰的职责边界
- **可测试性**：核心逻辑与渲染分离，易于单元测试
- **可扩展性**：支持后续增加更多英雄、关卡、功能
- **性能优化**：合理的渲染策略，避免性能瓶颈

---

## 项目目录结构

```
TowerDefense/
├── docs/                      # 文档
│   └── PRD.md                 # 产品需求文档
│
├── src/                       # 源代码
│   ├── main.ts                # 入口文件
│   ├── config/                # 配置文件
│   │   ├── game.config.ts     # Phaser游戏配置
│   │   ├── constants.ts       # 游戏常量
│   │   └── wuxing.config.ts   # 五行配置
│   │
│   ├── core/                  # 核心系统模块
│   │   ├── battle/            # 战斗系统
│   │   │   ├── BattleSystem.ts        # 战斗主控制器
│   │   │   ├── WaveManager.ts         # 波次管理
│   │   │   ├── CostManager.ts         # 费用管理
│   │   │   ├── DamageCalculator.ts    # 伤害计算
│   │   │   └── PlacementValidator.ts  # 放置验证
│   │   │
│   │   ├── hero/              # 英雄系统
│   │   │   ├── HeroManager.ts         # 英雄管理
│   │   │   ├── Hero.ts                # 英雄实体类
│   │   │   ├── HeroFactory.ts         # 英雄工厂
│   │   │   ├── HeroStatsCalculator.ts # 属性计算
│   │   │   └── SkillManager.ts        # 技能管理
│   │   │
│   │   ├── enemy/             # 敌人系统
│   │   │   ├── EnemyManager.ts        # 敌人管理
│   │   │   ├── Enemy.ts               # 敌人实体类
│   │   │   ├── EnemyFactory.ts        # 敌人工厂
│   │   │   └── EnemySpawner.ts        # 敌人生成器
│   │   │
│   │   ├── level/             # 关卡系统
│   │   │   ├── LevelManager.ts        # 关卡管理
│   │   │   ├── ChapterManager.ts      # 章节管理
│   │   │   ├── LevelConfig.ts         # 关卡配置类
│   │   │   └── PathFinder.ts          # 路径计算
│   │   │
│   │   ├── inventory/         # 库存系统
│   │   │   ├── InventoryManager.ts    # 库存管理
│   │   │   ├── SoulStoneManager.ts    # 魂石管理
│   │   │   ├── EquipmentManager.ts    # 装备管理
│   │   │   ├── GemManager.ts          # 宝石管理
│   │   │   └ GemSynthesizer.ts        # 宝石合成
│   │   │
│   │   └── save/              # 存档系统
│   │       ├── SaveManager.ts         # 存档管理
│   │       ├── SaveData.ts            # 存档数据结构
│   │       └ StorageAdapter.ts        # 存储适配器
│   │
│   ├── scenes/                # Phaser场景
│   │   ├── BootScene.ts       # 启动场景
│   │   ├── PreloadScene.ts    # 资源加载场景
│   │   ├── TitleScene.ts      # 标题场景
│   │   ├── LevelSelectScene.ts# 关卡选择场景
│   │   ├── BattleScene.ts     # 战斗场景
│   │   ├── HeroManageScene.ts # 英雄管理场景
│   │   └── EquipmentScene.ts  # 装备场景
│   │
│   ├── ui/                    # UI控制器
│   │   ├── UIManager.ts               # UI总控制器
│   │   ├── components/                # UI组件
│   │   │   ├── HeroPanel.ts           # 英雄面板
│   │   │   ├── CostDisplay.ts         # 费用显示
│   │   │   ├── WaveIndicator.ts       # 波次指示器
│   │   │   ├── HealthBar.ts           # 血条
│   │   │   ├── SkillButton.ts         # 技能按钮
│   │   │   ├── ResultScreen.ts        # 结算画面
│   │   │   └── GemSynthesisUI.ts      # 宝石合成界面
│   │   └
│   ├── entities/              # 游戏实体（Phaser对象）
│   │   ├── HeroEntity.ts              # 英雄渲染实体
│   │   ├── EnemyEntity.ts             # 敌人渲染实体
│   │   ├── ProjectileEntity.ts        # 攻击投射物
│   │   └ SkillEffectEntity.ts         # 技能特效
│   │
│   ├── data/                  # 游戏数据
│   │   ├── heroes/            # 英雄数据
│   │   │   ├── index.ts               # 英雄索引
│   │   │   ├── guanyu.ts              # 关羽数据
│   │   │   ├── zhangfei.ts            # 张飞数据
│   │   │   └── ...                    # 其他英雄
│   │   │
│   │   ├── enemies/           # 敌人数据
│   │   │   ├── index.ts               # 敌人索引
│   │   │   ├── normal.ts              # 普通敌人
│   │   │   ├── elite.ts               # 精英敌人
│   │   │   └ boss.ts                  # Boss数据
│   │   │   └ SpecialEnemies.ts        # 特殊敌人
│   │   │
│   │   ├── levels/            # 关卡数据
│   │   │   ├── index.ts               # 关卡索引
│   │   │   ├── chapter1/              # 第一章
│   │   │   │   ├── level1.ts
│   │   │   │   ├── level2.ts
│   │   │   │   └ ...
│   │   │   ├── chapter2/              # 第二章
│   │   │   ├── chapter3/              # 第三章
│   │   │   └ sideLevels.ts            # 番外关卡
│   │   │
│   │   ├── equipment/         # 装备数据
│   │   │   ├── index.ts               # 装备索引
│   │   │   ├── weapons.ts             # 武器数据
│   │   │   ├── artifacts.ts           # 神器数据
│   │   │
│   │   ├── gems/              # 宝石数据
│   │   │   ├── index.ts               # 宝石索引
│   │   │   ├── gemLevels.ts           # 宝石等级数据
│   │   │
│   │   └ skills/              # 技能数据
│   │   │   ├── index.ts               # 技能索引
│   │   │   ├── passiveSkills.ts       # 被动技能
│   │   │   ├── activeSkills.ts        # 主动技能
│   │   │
│   ├── utils/                 # 工具类
│   │   ├── MathUtils.ts               # 数学工具
│   │   ├── WuxingUtils.ts             # 五行计算工具
│   │   ├── RandomUtils.ts             # 随机工具
│   │   ├── TimeUtils.ts               # 时间工具
│   │
│   └── types/                 # TypeScript类型定义
│   │   ├── hero.types.ts              # 英雄类型
│   │   ├── enemy.types.ts             # 敌人类型
│   │   ├── equipment.types.ts         # 装备类型
│   │   ├── level.types.ts             # 关卡类型
│   │   ├── skill.types.ts             # 技能类型
│   │   ├── wuxing.types.ts            # 五行类型
│   │   ├── battle.types.ts            # 战斗类型
│   │   └ common.types.ts              # 公共类型
│   │
├── assets/                    # 游戏资源
│   ├── images/                # 图片
│   │   ├── heroes/            # 英雄图片
│   │   ├── enemies/           # 敌人图片
│   │   ├── ui/                # UI图片
│   │   ├── maps/              # 地图背景
│   │   ├── effects/           # 特效图片
│   │
│   ├── audio/                 # 音效（后续）
│   │
├── tests/                     # 测试
│   ├── unit/                  # 单元测试
│   │   ├── battle/
│   │   ├── hero/
│   │   ├── inventory/
│   │   ├── wuxing/
│   │
│   ├── integration/           # 集成测试
│   │
├── dist/                      # 构建输出
│
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript配置
├── vite.config.ts             # Vite构建配置
├── .eslintrc.js               # ESLint配置
├── .prettierrc                # Prettier配置
└── README.md                  # 项目说明
```

---

## 核心模块架构

### 1. 战斗系统 (BattleSystem)

**职责**：战斗流程的总控制器

**接口设计**：
```typescript
class BattleSystem {
  // 初始化战斗
  startBattle(levelConfig: LevelConfig): void

  // 英雄操作
  placeHero(heroId: string, position: Point): boolean
  retreatHero(heroId: string): number  // 返回返还的费用

  // 技能触发
  triggerSkill(heroId: string): void

  // 战斗更新（每帧调用）
  update(deltaTime: number): void

  // 状态查询
  getState(): BattleState
  isVictory(): boolean
  isDefeat(): boolean

  // 事件
  onBattleEnd(callback: (result: BattleResult) => void): void
}
```

**依赖模块**：
- WaveManager：波次管理
- CostManager：费用管理
- DamageCalculator：伤害计算
- HeroManager：英雄实例管理
- EnemyManager：敌人实例管理

---

### 2. 英雄管理 (HeroManager)

**职责**：管理玩家的英雄阵容、解锁、升级

**接口设计**：
```typescript
class HeroManager {
  // 英雄查询
  getHero(heroId: string): Hero | undefined
  getAllHeroes(): Hero[]
  getUnlockedHeroes(): Hero[]

  // 英雄解锁/升星
  unlockHero(heroId: string): boolean
  upgradeStar(heroId: string): boolean

  // 英雄升级
  levelUp(heroId: string, exp: number): void

  // 装备管理
  equipItem(heroId: string, itemId: string, slot: EquipmentSlot): boolean
  unequipItem(heroId: string, slot: EquipmentSlot): Equipment | null

  // 宝石镶嵌
  socketGem(heroId: string, artifactId: string, gemId: string): boolean

  // 属性计算
  calculateStats(heroId: string): HeroStats
}
```

---

### 3. 关卡管理 (LevelManager)

**职责**：关卡配置、解锁状态、进度追踪

**接口设计**：
```typescript
class LevelManager {
  // 关卡查询
  getLevel(levelId: string): LevelConfig
  getChapter(chapterId: string): ChapterConfig

  // 进度管理
  getChapterProgress(chapterId: string): ChapterProgress
  unlockLevel(levelId: string): void

  // 解锁判断
  canPlayLevel(levelId: string): boolean
  getNextLevel(currentLevelId: string): string | null
}
```

---

### 4. 库存管理 (InventoryManager)

**职责**：管理魂石、装备、宝石

**接口设计**：
```typescript
class InventoryManager {
  // 魂石
  getSoulStones(heroId: string): number
  addSoulStones(heroId: string, amount: number): void
  consumeSoulStones(heroId: string, amount: number): boolean

  // 装备
  getEquipment(itemId: string): Equipment
  addEquipment(equipment: Equipment): void
  removeEquipment(itemId: string): Equipment | null

  // 宝石
  getGem(gemId: string): Gem
  addGem(gem: Gem): void
  removeGem(gemId: string): Gem | null

  // 宝石合成
  synthesizeGem(lowGemIds: string[]): Gem | null
}
```

---

### 5. 存档系统 (SaveManager)

**职责**：游戏进度保存和加载

**接口设计**：
```typescript
class SaveManager {
  // 存档操作
  saveGame(): void
  loadGame(): SaveData | null
  resetGame(): void

  // 自动存档
  enableAutoSave(interval: number): void
}
```

---

## 数据流架构

### 状态管理流程

```
用户操作 → UI Controller → 核心模块 → 状态更新 → 渲染更新
```

### 战斗数据流

```
BattleScene
  ↓ 调用
BattleSystem.startBattle(levelConfig)
  ↓ 创建
WaveManager.spawnWave()
  ↓ 生成
EnemyFactory.createEnemy(enemyConfig)
  ↓ 返回
EnemyEntity (渲染)
  ↓ 添加到
BattleScene

用户点击放置英雄
  ↓
UI Controller捕获
  ↓
BattleSystem.placeHero(heroId, position)
  ↓ 验证
PlacementValidator.validate()
  ↓ 扣费
CostManager.consumeCost(heroCost)
  ↓ 创建
HeroFactory.createHero(heroId)
  ↓ 返回
HeroEntity (渲染)
  ↓ 添加到
BattleScene

每帧update
  ↓
BattleSystem.update(dt)
  ↓ 遍历
HeroEntity自动攻击
  ↓ 计算
DamageCalculator.calculate(hero, enemy)
  ↓ 应用
EnemyEntity.takeDamage(damage)
  ↓ 死亡
EnemyManager.removeEnemy()
  ↓ 奖励
CostManager.addCost(reward)
InventoryManager.addReward(drop)
```

---

## TypeScript类型设计

### 核心类型

```typescript
// 五行类型
type WuXing = 'metal' | 'wood' | 'water' | 'fire' | 'earth'

// 英雄属性
interface HeroStats {
  attack: number
  attackSpeed: number
  attackRange: number
}

// 英雄实体
interface Hero {
  id: string
  name: string
  wuXing: WuXing
  rarity: Rarity
  level: number
  star: number
  experience: number
  deploymentCost: number
  baseStats: HeroStats
  passiveSkill: Skill
  activeSkill: Skill
  equipment: {
    weapon: Equipment | null
    artifact: Artifact | null
  }
}

// 敌人实体
interface Enemy {
  id: string
  name: string
  wuXing: WuXing
  type: EnemyType
  health: number
  maxHealth: number
  speed: number
  rewardCost: number
  dropTable: DropItem[]
}

// 装备
interface Equipment {
  id: string
  name: string
  type: 'weapon' | 'artifact'
  rarity: Rarity
  bonuses: Partial<HeroStats>
}

// 神器（带宝石槽）
interface Artifact extends Equipment {
  type: 'artifact'
  gemSocket: {
    requiredWuXing: WuXing
    currentGem: Gem | null
  }
  activatedEffect: SkillEffect | null
}

// 宝石
interface Gem {
  id: string
  wuXing: WuXing
  level: number  // 1-5
}

// 技能
interface Skill {
  id: string
  name: string
  type: 'passive' | 'active'
  effect: SkillEffect
  cooldown?: number  // 主动技能才有
}

// 战斗状态
interface BattleState {
  currentWave: number
  totalWaves: number
  currentCost: number
  maxCost: number
  playerHealth: number
  deployedHeroes: Map<string, DeployedHero>
  activeEnemies: Enemy[]
  isPaused: boolean
}

// 关卡配置
interface LevelConfig {
  id: string
  chapterId: string
  name: string
  type: 'main' | 'side'
  map: {
    path: Point[]
    spawnPoint: Point
    exitPoint: Point
    deployableAreas: Area[]
  }
  waves: WaveConfig[]
  boss?: EnemyConfig
  rewards: RewardConfig
}
```

---

## Phaser场景架构

### 场景流程

```
BootScene (系统初始化)
  ↓
PreloadScene (加载资源)
  ↓
TitleScene (主菜单)
  ↓ 用户选择
LevelSelectScene (关卡选择)
  ↓ 选择关卡
BattleScene (战斗)
  ↓ 战斗结束
ResultScreen (结算)
  ↓ 返回
LevelSelectScene

TitleScene → HeroManageScene (英雄管理)
TitleScene → EquipmentScene (装备管理)
```

### BattleScene职责

- **渲染**：地图、英雄、敌人、特效、UI
- **输入**：点击放置、撤退、技能触发
- **协调**：调用BattleSystem，响应状态变化

```typescript
class BattleScene extends Phaser.Scene {
  private battleSystem: BattleSystem
  private heroEntities: Map<string, HeroEntity>
  private enemyEntities: EnemyEntity[]
  private uiManager: UIManager

  // Phaser生命周期
  init(data: { levelId: string }): void
  create(): void
  update(time: number, delta: number): void

  // 用户输入处理
  onPointerDown(pointer: Pointer): void
  onHeroSelected(heroId: string): void
  onHeroRetreat(heroId: string): void
  onSkillTrigger(heroId: string): void
}
```

---

## 构建配置

### package.json

```json
{
  "name": "tower-defense",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "phaser": "^3.70.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@core/*": ["core/*"],
      "@scenes/*": ["scenes/*"],
      "@data/*": ["data/*"],
      "@types/*": ["types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@data': resolve(__dirname, 'src/data'),
      '@types': resolve(__dirname, 'src/types')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

---

## 开发优先级

### Phase 1: 项目初始化 + 基础框架（第1-2天）

1. 创建项目目录结构
2. 配置 TypeScript、Vite、ESLint、Prettier
3. 设置 Phaser 游戏配置
4. 创建基础场景框架（BootScene、PreloadScene、TitleScene）
5. 定义核心类型（types目录）

### Phase 2: 核心战斗系统（第3-7天）

1. 实现 BattleSystem 主控制器
2. 实现 CostManager（费用系统）
3. 实现 HeroFactory + HeroEntity（英雄放置）
4. 实现 EnemySpawner + EnemyEntity（敌人生成）
5. 实现基础攻击逻辑（自动攻击）
6. 实现胜负判定

### Phase 3: 五行系统 + 技能（第8-12天）

1. 实现 WuxingUtils（五行克制计算）
2. 实现 DamageCalculator（伤害计算含克制）
3. 实现 SkillManager（技能系统）
4. 实现主动技能触发和自动模式
5. 添加技能特效渲染

### Phase 4: 英雄成长系统（第13-17天）

1. 实现 HeroManager（英雄管理）
2. 实现解锁/升星逻辑
3. 实现等级系统
4. 实现 EquipmentManager（装备管理）
5. 实现宝石合成

### Phase 5: 关卡系统（第18-22天）

1. 实现 LevelManager（关卡管理）
2. 实现波次配置和生成
3. 设计15关主线配置
4. 设计2-3个番外关卡
5. 实现关卡选择场景

### Phase 6: UI完善 + 存档（第23-27天）

1. 实现完整UI组件（英雄面板、费用显示、波次指示器等）
2. 实现结算画面
3. 实现英雄管理场景
4. 实现装备管理场景
5. 实现存档系统
6. 测试和优化

---

## 测试策略

### 单元测试重点

1. **五行计算**：WuxingUtils的克制倍率、相生关系
2. **伤害计算**：DamageCalculator的完整计算流程
3. **费用系统**：CostManager的费用消耗和返还
4. **宝石合成**：GemSynthesizer的合成规则
5. **英雄属性**：HeroStatsCalculator的属性叠加

### 测试框架

使用 Vitest，示例：

```typescript
import { describe, it, expect } from 'vitest'
import { WuxingUtils } from '@/utils/WuxingUtils'

describe('五行克制计算', () => {
  it('金克木应返回1.5倍', () => {
    expect(WuxingUtils.getCounterMultiplier('metal', 'wood')).toBe(1.5)
  })

  it('木不克金应返回1.0倍', () => {
    expect(WuxingUtils.getCounterMultiplier('wood', 'metal')).toBe(1.0)
  })
})
```

---

## 验证方案

### 开发阶段验证

1. **Phase 2完成后**：运行战斗场景，验证英雄放置、敌人生成、基础攻击
2. **Phase 3完成后**：验证五行克制效果、技能触发
3. **Phase 4完成后**：验证英雄解锁流程、装备效果
4. **Phase 5完成后**：完整运行15关，验证关卡流程
5. **Phase 6完成后**：完整游戏流程测试、存档测试

### 测试命令

```bash
# 开发模式
npm run dev

# 单元测试
npm run test

# 构建
npm run build

# 预览构建版本
npm run preview
```

---

## 文件清单

**本次创建的文件**：

1. `package.json` - 项目配置
2. `tsconfig.json` - TypeScript配置
3. `vite.config.ts` - Vite构建配置
4. `.eslintrc.js` - ESLint配置
5. `.prettierrc` - Prettier配置
6. `src/main.ts` - 入口文件
7. `src/config/game.config.ts` - Phaser配置
8. `src/config/constants.ts` - 游戏常量
9. `src/config/wuxing.config.ts` - 五行配置
10. `src/types/*.ts` - 所有类型定义文件

**后续实现**：

按Phase顺序逐步实现各模块和场景。