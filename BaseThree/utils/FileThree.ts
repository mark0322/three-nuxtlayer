import type * as THREE from 'three'
import type { GLTFLoader, GLTFExporter } from 'three/addons'

let dracoLoader: GLTFLoader
let gltfLoader: GLTFLoader
let anchorElement: HTMLAnchorElement
let gltfExporter: GLTFExporter

export class FileThree {
  /**
   * 加载 被 draco 压缩后的 gltf 文件
   */
  static async loadDracoGLTF(url: string) {
    if (!dracoLoader) {
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader')
      const _dracoLoader = new DRACOLoader()
      _dracoLoader.setDecoderPath('/draco/')
      // _dracoLoader.setDecoderConfig({ type: "js" });
      _dracoLoader.preload()

      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader')
      dracoLoader = new GLTFLoader()
      dracoLoader.setDRACOLoader(_dracoLoader)
    }
    return dracoLoader.loadAsync(url)
  }

  /**
   *  加载 gltf模型，以 Promise实例对象的形式返回
   * @param url
   * @returns {Promise}
   */
  static async loadGLTF(url: string) {
    if (!gltfLoader) {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader')
      gltfLoader = new GLTFLoader()
    }
    return gltfLoader.loadAsync(url) // 返回的是一个 promise
  }

  /**
   * 将 场景导出为 `glb` 格式的文件
   * @param fileName
   */
  static async exportGltf(scene: THREE.Scene, fileName = 'file') {
    if (!gltfExporter) {
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter')

      gltfExporter = new GLTFExporter()
    }

    gltfExporter.parse(
      scene,
      (result) => {
        if (!anchorElement) {
          anchorElement = document.createElement('a')
        }
        const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' })
        anchorElement.href = URL.createObjectURL(blob)
        anchorElement.download = `${fileName}.glb`
        anchorElement.click()
      },
      (err) => {
        console.error(`导出失败！${err}`)
      },
      { binary: true }
    )
  }

  /**
   * 保存画布保存在 图片
   * 注：渲染器必须开启：preserveDrawingBuffer: true
   */
  static saveAsPNG(canvas: HTMLCanvasElement, imgName = 'img') {
    // 创建一个超链接元素，用来下载保存数据的文件
    if (!anchorElement) {
      anchorElement = document.createElement('a')
    }

    // 通过超链接herf属性，设置要保存到文件中的数据
    anchorElement.href = canvas.toDataURL('image/png')
    anchorElement.download = `${imgName}.png` //下载文件名
    anchorElement.click()
  }
}
