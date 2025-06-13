import * as THREE from 'three'
import { OrbitControls } from 'three/addons'
import { Tick, oType } from './Tick'
import { UtilsThree } from './UtilsThree'
import { assign } from './utils/radash'
import { WebGPURenderer } from 'three/webgpu'

export * from './utils'

const defaultOptions: Options = {
  renderer: {
    type: 'webgl',
    openRender: true,
    antialias: true,
    preserveDrawingBuffer: false,
    logarithmicDepthBuffer: false,
    limitFPS: Infinity
  },

  camera: {
    near: 0.1,
    far: 10000,
    fov: 75
  }
}

export class BaseThree extends THREE.EventDispatcher {
  private tickId!: number
  private deltaFPS = 0 // 限制 刷新率时刷用
  private previousFrameTime = 0

  protected options: Options
  protected tick = new Tick() // 每一帧，执行一次
  protected dom!: HTMLDivElement
  protected renderer!: THREE.WebGLRenderer | WebGPURenderer
  protected camera!: THREE.PerspectiveCamera
  protected controls!: OrbitControls
  protected w!: number
  protected h!: number
  protected scene = new THREE.Scene()
  protected textureLoader = new THREE.TextureLoader()
  protected fileLoader = new THREE.FileLoader()
  protected utils: UtilsThree

  constructor(dom: HTMLDivElement, options: Options = { camera: {}, renderer: {}}) {
    super()
    // 初始默认值
    this.options = assign(defaultOptions, options)

    this.init(dom)

    this.utils = new UtilsThree(dom, this.renderer as any, this.scene, this.camera, this.tick)
  }

  // temp
  box(size = 1, color = 0xffffff) {
    const geometry = new THREE.BoxGeometry(size, size, size)
    const material = new THREE.MeshBasicMaterial({ color })
    return new THREE.Mesh(geometry, material)
  }

  // temp
  showCameraPos() {
    setInterval(() => {
      const cameraPos = this.camera.position
      console.log('cameraPos', cameraPos)
    }, 1000)
  }

  // temp
  addHelper(isShowGrid = true) {
    // 坐标轴
    const axesHelper = new THREE.AxesHelper(2000)
    axesHelper.position.z = 0.05
    this.scene.add(axesHelper)

    // grid
    if (isShowGrid) {
      const gridHelper = new THREE.GridHelper(10, 10)
      // gridHelper.rotateX(Math.PI / 2);
      this.scene.add(gridHelper)
    }
  }

  /**
   * 组件/路由 被销毁时
   * 需要 执行本函数，主动释放 所有被占用的 内存
   */
  public dispose() {
    // 清空释放 parent 下所有 内存
    const disposeChildren = (parent: THREE.Group | THREE.Scene) => {
      const disposeFn = (obj: { dispose?: () => void }) => {
        if (typeof obj.dispose === 'function') {
          obj.dispose()
        }
      }

      parent.traverse((ele) => {
        const obj = ele as THREE.Mesh<THREE.BufferGeometry, THREE.Material> & { dispose?: () => void }

        // light etc...
        disposeFn(obj)

        if (obj.geometry) {
          disposeFn(obj.geometry)
        }
        if (obj.material) {
          disposeFn(obj.material)
        }
      })

      parent.children = []
    }

    // 清空 tick 的内存
    (this.tick as unknown) = null as unknown

    window.removeEventListener('resize', this.onResize)

    cancelAnimationFrame(this.tickId)

    this.renderer.dispose()

    this.controls.dispose()

    disposeChildren(this.scene)
    this.scene.clear()

    this.utils.dispose()
  }

  // 屏幕 宽高 自适应
  private onResize = () => {
    this.w = this.dom.offsetWidth
    this.h = this.dom.offsetHeight

    this.camera.aspect = this.w / this.h

    // 更新摄像头的 投影矩阵
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(this.w, this.h)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.utils._css3DRenderer && this.utils._css3DRenderer.setSize(this.w, this.h)
    this.utils._css2DRenderer && this.utils._css2DRenderer.setSize(this.w, this.h)
  }

  /**
   * 初始化： Renderer + Camera + OrbitControls + tickLoop
   */
  private init(dom: HTMLDivElement) {
    this.dom = dom
    this.w = dom.offsetWidth
    this.h = dom.offsetHeight

    // 渲染器
    if (this.options.renderer?.type === 'webgl') {
      this.renderer = new THREE.WebGLRenderer(this.options?.renderer)
    } else {
      this.renderer = new WebGPURenderer(this.options?.renderer as any)
    }

    this.renderer.setSize(this.w, this.h)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    dom.appendChild(this.renderer.domElement)

    // 透视相机
    const { fov, near, far } = this.options.camera as CameraOptions
    this.camera = new THREE.PerspectiveCamera(fov, this.w / this.h, near, far)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)

    this.tickLoop(0)

    window.addEventListener('resize', this.onResize)
  }

  /**
   *
   * @param currentFrameTime 从 `new Base()` 开始以秒
   */
  private tickLoop = (currentFrameTime: number) => {
    this.tickId = requestAnimationFrame(this.tickLoop)

    // time
    currentFrameTime /= 1000
    const deltaTime = currentFrameTime - this.previousFrameTime
    this.previousFrameTime = currentFrameTime

    // 是否 限制 刷新率
    const fps = this.options.renderer!.limitFPS!
    if (fps < Infinity) {
      this.deltaFPS += deltaTime
      if (this.deltaFPS < 1 / fps) {
        return
      }
      this.deltaFPS = 0
    }

    // 每一帧执行一次 tick
    Object.values(this.tick[oType]).forEach((fns) => {
      fns.forEach((fn) => fn(deltaTime, currentFrameTime))
    })

    // 更新 轨道控制器 - OrbitControls
    this.controls.update()

    // 是否开启 渲染器
    if (this.options.renderer!.openRender) {
      this.options.renderer?.type === 'webgl'
        ? this.renderer.render(this.scene, this.camera)
        : (this.renderer as unknown as WebGPURenderer).renderAsync(this.scene, this.camera)
    }
  }

  /**
   * 摄像机 朝向 target物体，并返回 target 的 中心点/大小/包围盒
   * @param target 要看向的 物体
   * @returns {THREE.Box3}
   */
  public lookAt(target: THREE.Object3D) {
    const box3 = new THREE.Box3()
    box3.setFromObject(target)

    const v3Center = new THREE.Vector3()
    box3.getCenter(v3Center)
    const v3Size = new THREE.Vector3()
    box3.getSize(v3Size)

    this.controls.target.set(v3Center.x, v3Center.y, v3Center.z)
    this.camera.lookAt(v3Center)

    return {
      center: v3Center,
      size: v3Size,
      box3
    }
  }

}

// export default BaseThree

type Options = {
  camera?: CameraOptions;
  renderer?: RendererOptions
}

type CameraOptions = Partial<{
  /**
   * 相机的 near 值
   * @default 0.1
   */
  near: number;

  /**
   * 相机的 far 值
   * @default 10000
   */
  far: number;

  /**
   * 相机的 fov
   * @default 75
   */
  fov: number;
}>

type RendererOptions<T = THREE.WebGLRendererParameters | WebGPURenderer> = Partial<T & {
  /**
   * 渲染器使用 webgl 还是 webgpu
   * @default 'webgl'
   */
  type: 'webgl' | 'webgpu',

  /**
   * 限制刷新率 上限
   * @default Infinity  即不作限制
   */
    limitFPS: number

    /**
     * 是否 在浏览器 渲染每一帧时 执行 renderer.render(scene, camera);
     * @default true
     */
    openRender: boolean

    /**
     * 抗锯齿
     * @default true
     */
    antialias: boolean

    /**
     * 是否可执行 `保存图片` 功能
     * @default false
     */
    preserveDrawingBuffer: boolean

    /**
     * 深度空间，是否设为 对数（更精确，以 环节深度冲突）
     * @default false
     */
    logarithmicDepthBuffer: boolean
}>
