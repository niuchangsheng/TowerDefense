/**
 * Phaser BLP文件加载器
 * 支持在游戏中直接加载War3的BLP纹理
 */

import Phaser from 'phaser'
import { BLPConverter } from './BLPConverter'

/**
 * BLP加载器插件
 */
export class BLPLoaderPlugin extends Phaser.Loader.FileTypes.ImageFile {
  constructor(
    loader: Phaser.Loader.LoaderPlugin,
    key: string,
    url: string,
    frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig
  ) {
    super(loader, key, url, 'image', frameConfig)

    // 修改文件类型标识
    this.type = 'blp'
  }

  /**
   * 自定义加载处理
   */
  async onProcess(): void {
    try {
      // 获取原始ArrayBuffer数据
      const arrayBuffer = this.data as ArrayBuffer

      // 转换BLP为ImageData
      const imageData = BLPConverter.convertToImageData(arrayBuffer)

      // 转为PNG Blob
      const pngBlob = await BLPConverter.imageDataToPNG(imageData)

      // 创建图片URL
      const pngUrl = URL.createObjectURL(pngBlob)

      // 创建HTMLImageElement
      const image = new Image()
      image.src = pngUrl

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Failed to load converted PNG'))
      })

      // 替换data为Image对象
      this.data = image

      // 继续Phaser的标准处理流程
      this.onProcessComplete()

    } catch (error) {
      console.error(`BLP conversion error for ${this.key}:`, error)
      this.onProcessError()
    }
  }
}

/**
 * Phaser加载器扩展
 * 添加load.blp()方法
 */
declare module 'phaser' {
  namespace Loader {
    interface LoaderPlugin {
      blp(
        key: string,
        url: string,
        frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig
      ): LoaderPlugin
    }
  }
}

/**
 * 扩展Phaser.Loader.LoaderPlugin
 */
export function extendPhaserLoader(): void {
  Phaser.Loader.LoaderPlugin.prototype.blp = function(
    key: string,
    url: string,
    frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig
  ): Phaser.Loader.LoaderPlugin {
    // 创建BLP加载器实例
    const file = new BLPLoaderPlugin(this, key, url, frameConfig)

    // 添加到加载队列
    this.addFile(file)

    return this
  }
}

/**
 * 初始化加载器扩展
 * 在游戏启动前调用
 */
export function initBLPLoader(): void {
  extendPhaserLoader()
}

/**
 * 使用示例：
 *
 * // 在游戏配置中初始化
 * import { initBLPLoader } from '@/utils/PhaserBLPLoader'
 * initBLPLoader()
 *
 * // 在场景中加载
 * export class MyScene extends Phaser.Scene {
 *   preload() {
 *     // 加载单个BLP文件
 *     this.load.blp('grass', 'assets/war3/TerrainArt/Lordaeron/lordaeron_summer_grass.blp')
 *
 *     // 批量加载
 *     this.load.blp('forest', 'assets/war3/TerrainArt/Lordaeron/lordaeron_summer_forest.blp')
 *     this.load.blp('dirt', 'assets/war3/TerrainArt/Lordaeron/lordaeron_summer_dirt.blp')
 *   }
 *
 *   create() {
 *     // 正常使用sprite
 *     this.add.image(100, 100, 'grass')
 *   }
 * }
 */