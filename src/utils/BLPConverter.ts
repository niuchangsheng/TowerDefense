/**
 * BLP纹理加载器
 * 暴雪BLP格式转PNG
 *
 * BLP格式说明：
 * - BLP0: 未压缩
 * - BLP1: War3使用的主要格式（DXT压缩或未压缩）
 * - BLP2: WoW使用的格式（更复杂的压缩）
 */

export interface BLPHeader {
  magic: string           // 'BLP2' 或 'BLP1'
  format: number          // 压缩类型
  alphaDepth: number      // Alpha位深度
  alphaEncoding: number   // Alpha编码方式
  hasMipmaps: number      // 是否有Mipmap
  width: number
  height: number
  mipmaps: MipmapInfo[]
}

export interface MipmapInfo {
  offset: number
  size: number
}

export class BLPConverter {
  /**
   * 解析BLP文件头
   */
  static parseHeader(data: ArrayBuffer): BLPHeader {
    const view = new DataView(data)

    // 读取magic
    const magicBytes = new Uint8Array(data, 0, 4)
    const magic = new TextDecoder().decode(magicBytes)

    if (magic !== 'BLP1' && magic !== 'BLP2') {
      throw new Error(`Invalid BLP magic: ${magic}`)
    }

    // BLP1格式（War3）
    if (magic === 'BLP1') {
      const format = view.getUint32(4, true)
      const alphaDepth = view.getUint8(8)
      const alphaEncoding = view.getUint8(9)
      const hasMipmaps = view.getUint8(10)
      const width = view.getUint32(11, true)
      const height = view.getUint32(15, true)

      const mipmaps: MipmapInfo[] = []
      for (let i = 0; i < 16; i++) {
        const offset = view.getUint32(19 + i * 8, true)
        const size = view.getUint32(23 + i * 8, true)
        if (offset > 0 && size > 0) {
          mipmaps.push({ offset, size })
        }
      }

      return {
        magic,
        format,
        alphaDepth,
        alphaEncoding,
        hasMipmaps,
        width,
        height,
        mipmaps
      }
    }

    // BLP2格式（WoW）- 结构略有不同
    throw new Error('BLP2 format not yet supported. Use BLP1 (War3) textures.')
  }

  /**
   * 解压DXT纹理
   * War3主要使用DXT1, DXT3, DXT5
   */
  static decompressDXT(
    data: Uint8Array,
    width: number,
    height: number,
    format: number
  ): ImageData {
    // 创建canvas用于渲染
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(width, height)

    // DXT格式类型
    const dxtFormat = format & 0xFF

    // DXT解压缩算法
    // DXT1: 4x4块，8字节，无Alpha或1-bit Alpha
    // DXT3: 4x4块，16字节，4-bit Alpha
    // DXT5: 4x4块，16字节， interpolated Alpha

    const blockSize = dxtFormat === 1 ? 8 : 16
    const blockWidth = Math.ceil(width / 4)
    const blockHeight = Math.ceil(height / 4)

    let dataOffset = 0

    for (let by = 0; by < blockHeight; by++) {
      for (let bx = 0; bx < blockWidth; bx++) {
        // 解压缩一个4x4块
        const block = this.decodeDXTBlock(
          data.slice(dataOffset, dataOffset + blockSize),
          dxtFormat
        )

        // 将块像素写入imageData
        for (let py = 0; py < 4; py++) {
          for (let px = 0; px < 4; px++) {
            const x = bx * 4 + px
            const y = by * 4 + py
            if (x < width && y < height) {
              const pixelIndex = (y * width + x) * 4
              const blockPixelIndex = (py * 4 + px) * 4

              imageData.data[pixelIndex] = block[blockPixelIndex]     // R
              imageData.data[pixelIndex + 1] = block[blockPixelIndex + 1] // G
              imageData.data[pixelIndex + 2] = block[blockPixelIndex + 2] // B
              imageData.data[pixelIndex + 3] = block[blockPixelIndex + 3] // A
            }
          }
        }

        dataOffset += blockSize
      }
    }

    return imageData
  }

  /**
   * 解码DXT块
   */
  private static decodeDXTBlock(blockData: Uint8Array, format: number): Uint8Array {
    const pixels = new Uint8Array(16 * 4) // 4x4 = 16像素，每像素RGBA

    if (format === 1) {
      // DXT1: 8字节
      // 前2字节: color0 (16-bit RGB)
      // 后2字节: color1
      // 4字节: 索引表（每像素2-bit索引）

      const color0 = blockData[0] | (blockData[1] << 8)
      const color1 = blockData[2] | (blockData[3] << 8)

      // 解码16-bit颜色为RGB
      const c0 = this.decodeRGB16(color0)
      const c1 = this.decodeRGB16(color1)

      // 计算中间颜色
      const c2 = format === 1 && color0 > color1
        ? [ // 4色模式
            (2 * c0[0] + c1[0]) / 3,
            (2 * c0[1] + c1[1]) / 3,
            (2 * c0[2] + c1[2]) / 3
          ]
        : [ // 3色模式 + 透明
            (c0[0] + c1[0]) / 2,
            (c0[1] + c1[1]) / 2,
            (c0[2] + c1[2]) / 2
          ]

      // 解码索引
      const indices = blockData.slice(4, 8)
      for (let i = 0; i < 16; i++) {
        const byteIndex = i / 4
        const bitOffset = (i % 4) * 2
        const index = (indices[byteIndex] >> bitOffset) & 0x03

        const color = [c0, c1, c2, c0][index] // 选择颜色
        pixels[i * 4] = color[0]
        pixels[i * 4 + 1] = color[1]
        pixels[i * 4 + 2] = color[2]
        pixels[i * 4 + 3] = (format === 1 && color0 <= color1 && index === 3) ? 0 : 255
      }

    } else if (format === 3) {
      // DXT3: 16字节
      // 前8字节: 4-bit Alpha
      // 后8字节: DXT1颜色块

      // 解码Alpha（4-bit per pixel）
      const alphaData = blockData.slice(0, 8)
      for (let i = 0; i < 16; i++) {
        const byteIndex = i / 2
        const isHigh = i % 2
        const alpha = isHigh
          ? (alphaData[byteIndex] >> 4) * 17
          : (alphaData[byteIndex] & 0x0F) * 17
        pixels[i * 4 + 3] = alpha
      }

      // 解码颜色（复用DXT1逻辑）
      const colorBlock = this.decodeDXTBlock(blockData.slice(8, 16), 1)
      for (let i = 0; i < 16; i++) {
        pixels[i * 4] = colorBlock[i * 4]
        pixels[i * 4 + 1] = colorBlock[i * 4 + 1]
        pixels[i * 4 + 2] = colorBlock[i * 4 + 2]
      }

    } else if (format === 5) {
      // DXT5: 16字节
      // 前8字节: interpolated Alpha
      // 后8字节: DXT1颜色块

      const alpha0 = blockData[0]
      const alpha1 = blockData[1]
      const alphaIndices = blockData.slice(2, 8)

      // 计算Alpha中间值
      const alphas = alpha0 > alpha1
        ? [
            alpha0,
            alpha1,
            (6 * alpha0 + alpha1) / 7,
            (5 * alpha0 + 2 * alpha1) / 7,
            (4 * alpha0 + 3 * alpha1) / 7,
            (3 * alpha0 + 4 * alpha1) / 7,
            (2 * alpha0 + 5 * alpha1) / 7,
            (alpha0 + 6 * alpha1) / 7
          ]
        : [
            alpha0,
            alpha1,
            (4 * alpha0 + alpha1) / 5,
            (3 * alpha0 + 2 * alpha1) / 5,
            (2 * alpha0 + 3 * alpha1) / 5,
            (alpha0 + 4 * alpha1) / 5,
            0,
            255
          ]

      // 解码Alpha索引
      // 3-bit per pixel, packed into 6 bytes
      let alphaIndexBits = 0
      for (let i = 0; i < 6; i++) {
        alphaIndexBits |= alphaIndices[i] << (i * 8)
      }

      for (let i = 0; i < 16; i++) {
        const index = (alphaIndexBits >> (i * 3)) & 0x07
        pixels[i * 4 + 3] = alphas[index]
      }

      // 解码颜色
      const colorBlock = this.decodeDXTBlock(blockData.slice(8, 16), 1)
      for (let i = 0; i < 16; i++) {
        pixels[i * 4] = colorBlock[i * 4]
        pixels[i * 4 + 1] = colorBlock[i * 4 + 1]
        pixels[i * 4 + 2] = colorBlock[i * 4 + 2]
      }
    }

    return pixels
  }

  /**
   * 解码16-bit RGB颜色（5-6-5格式）
   */
  private static decodeRGB16(color: number): [number, number, number] {
    const r = ((color >> 11) & 0x1F) * 255 / 31
    const g = ((color >> 5) & 0x3F) * 255 / 63
    const b = (color & 0x1F) * 255 / 31
    return [r, g, b]
  }

  /**
   * 转换BLP为PNG ImageData
   */
  static convertToImageData(blpData: ArrayBuffer): ImageData {
    const header = this.parseHeader(blpData)

    // 获取最大尺寸的mipmap（第一个）
    const mainMipmap = header.mipmaps[0]
    if (!mainMipmap) {
      throw new Error('No mipmaps found in BLP file')
    }

    const textureData = new Uint8Array(
      blpData,
      mainMipmap.offset,
      mainMipmap.size
    )

    // 根据format解码
    // format = 0: 未压缩paletted
    // format = 1: DXT1
    // format = 2: DXT3
    // format = 3: DXT5

    if (header.format === 0) {
      // 未压缩格式（paletted）
      return this.decompressPaletted(textureData, header.width, header.height, blpData)
    } else {
      // DXT压缩格式
      return this.decompressDXT(textureData, header.width, header.height, header.format)
    }
  }

  /**
   * 解压Paletted格式
   */
  private static decompressPaletted(
    data: Uint8Array,
    width: number,
    height: number,
    fullData: ArrayBuffer
  ): ImageData {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(width, height)

    // BLP1的palette在文件头的后面（256 * 4字节）
    const view = new DataView(fullData)
    const paletteOffset = 148 // 标准BLP1 palette位置
    const palette: number[][] = []

    for (let i = 0; i < 256; i++) {
      const b = view.getUint8(paletteOffset + i * 4)
      const g = view.getUint8(paletteOffset + i * 4 + 1)
      const r = view.getUint8(paletteOffset + i * 4 + 2)
      const a = view.getUint8(paletteOffset + i * 4 + 3)
      palette.push([r, g, b, a])
    }

    // 每像素1字节索引
    for (let i = 0; i < width * height; i++) {
      const index = data[i]
      const color = palette[index]
      imageData.data[i * 4] = color[0]
      imageData.data[i * 4 + 1] = color[1]
      imageData.data[i * 4 + 2] = color[2]
      imageData.data[i * 4 + 3] = color[3]
    }

    return imageData
  }

  /**
   * 将ImageData转为PNG Blob
   */
  static imageDataToPNG(imageData: ImageData): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!)
      }, 'image/png')
    })
  }
}