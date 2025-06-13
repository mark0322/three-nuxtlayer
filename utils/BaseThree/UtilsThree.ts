import * as THREE from 'three'

import { CSS3DRenderer, CSS3DObject, CSS2DRenderer, CSS2DObject } from 'three/addons'
import type { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import type { Tick } from './Tick'
import type { WebGPURenderer } from 'three/webgpu'

export class UtilsThree {
  private dom: HTMLDivElement
  private renderer: THREE.WebGLRenderer | WebGPURenderer
  private camera: THREE.PerspectiveCamera
  private scene: THREE.Scene
  private tick: Tick

  private isOpenCss2D = false
  private isOpenCss3D = false
  private gui!: GUI
  private disposeCBList: (() => void)[] = []

  public _css3DRenderer!: CSS3DRenderer
  public _css2DRenderer!: CSS2DRenderer
  public raycaster = new THREE.Raycaster()

  constructor(
    dom: HTMLDivElement,
    renderder: THREE.WebGLRenderer | WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    tick: Tick
  ) {
    this.dom = dom
    this.renderer = renderder
    this.camera = camera
    this.scene = scene
    this.tick = tick
  }

  /**
   * 使用 Stats，显示 帧速率
   */
  public async showFps() {
    const { default: Stats } = await import('three/examples/jsm/libs/stats.module')

    const stats = new Stats()

    this.tick.add(() => {
      stats.update()
    })

    this.dom.appendChild(stats.dom)
  }

  /**
   * 根据 相对 画布的坐标，获取 meshList 中的 Mesh
   * @param param0
   * @param meshList
   */
  public rayCast([x, y]: [number, number], meshList: THREE.Object3D[]) {
    const pointer = new THREE.Vector2()

    pointer.x = ( x / this.dom.offsetWidth ) * 2 - 1
    pointer.y = - ( y / this.dom.offsetHeight ) * 2 + 1

    this.raycaster.setFromCamera(pointer, this.camera)

    return this.raycaster.intersectObjects(meshList)
  }

  /**
   * 创建一个 PlaneMesh，其内部的文字为 canvas 而成
   * @param text
   * @returns {THREE.Mesh & { updateText: (text: string) => void }} `updateText`函数的作用：更新 canvas 内的文本
   */
  public createLabel_CanvasMesh(text = '') {
    const canvasEle = document.createElement('canvas')
    const ctx = canvasEle.getContext('2d') as CanvasRenderingContext2D

    // 设置字体样式
    ctx.font = '30px Arial'
    // 设置文本对齐方式
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // 设置填充颜色
    ctx.fillStyle = '#eeeeee'
    ctx.fillText(text, 150, 75)

    const canvasTexture = new THREE.CanvasTexture(canvasEle)

    const material = new THREE.MeshBasicMaterial({
      map: canvasTexture,
      color: 0xffffff,
      transparent: true,
      // side: THREE.DoubleSide,
      depthTest: false
      // depthWrite: false
    })

    const geometry = new THREE.PlaneGeometry(3, 1.5)
    const mesh = new THREE.Mesh(geometry, material)

    function updateText(text: string) {
      const ctx = mesh.material.map?.image?.getContext('2d') as CanvasRenderingContext2D

      ctx.clearRect(0, 0, 300, 150)
      ctx.fillText(text, 150, 75)
      canvasTexture.needsUpdate = true
    }

    const result = mesh as MeshCanvasText
    result.updateText = updateText
    return result
  }

  /**
   * 创建 GUI 实例
   * @returns
   */
  public async getGUIInstance() {
    const { default: GUI } = await import('three/examples/jsm/libs/lil-gui.module.min')

    if (!this.gui) {
      this.gui = new GUI()
      this.disposeCBList.push(() => {
        this.gui.destroy()
      })
    }

    return this.gui
  }

  public async addGUIFolder(folderName: string) {
    const { default: GUI } = await import('three/examples/jsm/libs/lil-gui.module.min')

    // if (!this.gui) {
    //   this.gui = new GUI();
    //   this.disposeCBList.push(() => {
    //     this.gui.destroy()
    //   })
    // }
      const gui = new GUI()
      this.disposeCBList.push(() => {
        gui.destroy()
      })
    return gui.addFolder(folderName)
  }

  // 开启 css2D 渲染器（单例模式）
  private openCSS2DRenderer() {
    if (this.isOpenCss2D) return

    this.isOpenCss2D = true

    // 创建一个CSS2渲染器CSS2DRenderer
    const labelRenderer = new CSS2DRenderer()

    labelRenderer.setSize(this.dom.offsetWidth, this.dom.offsetHeight)
    labelRenderer.domElement.style.position = 'absolute'
    // 避免renderer.domElement影响HTMl标签定位，设置top为0px
    labelRenderer.domElement.style.top = '0px'
    labelRenderer.domElement.style.left = '0px'

    //设置.pointerEvents=none，以免模型标签HTML元素遮挡鼠标选择场景模型
    labelRenderer.domElement.style.pointerEvents = 'none'

    this.dom.appendChild(labelRenderer.domElement)

    this._css2DRenderer = labelRenderer

    this.tick.add(() => {
      labelRenderer.render(this.scene, this.camera)
    })
  }

  /**
   * 创建 CSS2D Label
   * @param text
   * @param pos 默认值 (0, 0, 0)
   * @param options 默认值 {
      padding: '5px 10px',
      color: '#fff',
      fontSize: '16px',
      position: 'absolute',
      backgroundColor: 'rgba(25,25,25,0.5)',
      borderRadius: '5px',
    }
    * @returns
  */
  public createLabel_CSS2D(text: string, pos = new THREE.Vector3(), options = {}) {

    options = Object.assign(
      {
        color: '#fff',
        fontSize: '16px',
        position: 'absolute'
      },
      options
    )

    const div = document.createElement('div')
    div.innerText = text

    Object.entries(options).forEach(([k, v]) => {
      ;(div.style as CSSStyleDeclaration & { [k: string]: any })[k] = v
    })

    const label = new CSS2DObject(div)
    label.position.copy(pos)

    this.openCSS2DRenderer()

    return label
  }

  // 开启 css3D 渲染器
  private openCSS3DRenderer() {
    if (this.isOpenCss3D) return

    this.isOpenCss3D = true

    const labelRenderer = new CSS3DRenderer()

    labelRenderer.setSize(this.dom.offsetWidth, this.dom.offsetHeight)
    labelRenderer.domElement.style.position = 'absolute'
    // 避免renderer.domElement影响HTMl标签定位，设置top为0px
    labelRenderer.domElement.style.top = '0px'
    labelRenderer.domElement.style.left = '0px'

    //设置.pointerEvents=none，以免模型标签HTML元素遮挡鼠标选择场景模型
    labelRenderer.domElement.style.pointerEvents = 'none'

    this.dom.appendChild(labelRenderer.domElement)

    this.tick.add(() => {
      labelRenderer.render(this.scene, this.camera)
    })

    this._css3DRenderer = labelRenderer
  }

  /**
   * 创建 CSS3D Label
   * @param text
   * @param pos 默认值 (0, 0, 0)
   * @param cssOptions 默认值 {
      padding: '5px 10px',
      color: '#fff',
      fontSize: '16px',
      position: 'absolute',
      backgroundColor: 'rgba(25,25,25,0.5)',
      borderRadius: '5px',
    }
    * @param { scale, rotateX }
    * @returns {CSS3DObject}
  */
  public createLabel_CSS3D(text: string, pos = new THREE.Vector3(), { scale, rotateX } = { scale: .05, rotateX: 0 }, cssOptions = {}) {
    cssOptions = Object.assign({
      padding: '5px 10px',
      color: '#fff',
      fontSize: '16px',
      position: 'absolute',
      backgroundColor: 'rgba(25,25,25,0.5)',
      borderRadius: '5px',
      pointerEvents: 'none' //避免HTML标签遮挡三维场景的鼠标事件
    }, cssOptions)

    const div = document.createElement('div')
    div.innerText = text

    Object.entries(cssOptions)
      .forEach(([k, v]) => {
        (div.style as CSSStyleDeclaration & { [k: string]: any })[k] = v
      })

    const label = new CSS3DObject(div)
    label.scale.setScalar(scale)
    label.rotateX(rotateX)
    label.position.copy(pos)

    this.openCSS3DRenderer()

    return label
  }

  public dispose() {
    this.disposeCBList.forEach(fn => fn())
  }
}

interface MeshCanvasText extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  /**
   * 更新 canvas 中的文字
   * @param text 要被更新的文字
   * @returns
   */
  updateText: (text: string) => void
}