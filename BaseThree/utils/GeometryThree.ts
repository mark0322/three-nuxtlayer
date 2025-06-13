import * as THREE from 'three'

export class GeometryThree {
  /**
   * 计算 target 的包围盒信息
   * @returns {{center: THREE.Vector3, size: THREE.Vector3, box3: THREE.Box3}}
   */
  static computeBox3(target: THREE.Object3D) {
    const box3 = new THREE.Box3()
    box3.setFromObject(target)

    const center = new THREE.Vector3()
    box3.getCenter(center)
    const size = new THREE.Vector3()
    box3.getSize(size)

    return {
      center,
      size,
      box3
    }
  }

  /**
   * 根据 给定的 points 和 材质 绘制 line
   * @param points
   * @param material
   * @returns
   */
  static createLine(points: number[], material = new THREE.LineBasicMaterial({ color: 0x3399eee })) {
    const pointsBuffer = new Float32Array(points)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(pointsBuffer, 3))
    return new THREE.Line(geometry, material)
  }

  /**
    * 根据两点坐标，创建 CatmullRomCurve3 曲线
    * @param start
    * @param end
    * @param options
    * @returns {THREE.Line}
    */
  static createCatmullRomCurve3(start: THREE.Vector3, end: THREE.Vector3, options: DrawCurveOptions = {}) {
    const { color, height, divisions } = {
      color: 0xffffff,
      divisions: 50,
      height: 5,
      ...options
    }
    const middle = new THREE.Vector3().add(start).add(end).divideScalar(2)
    middle.z += height // 线中间位置 凸起的高度

    const curve = new THREE.CatmullRomCurve3([start, middle, end])
    const points = curve.getPoints(divisions)
    const geometry = new THREE.BufferGeometry()
    geometry.setFromPoints(points)

    const material = new THREE.LineBasicMaterial({ color })

    return new THREE.Line(geometry, material)
  }

  /**
   * 使用 二维数据（[number, number][]） 绘制 THREE.Shape
   * @param coordinates
   * @returns {THREE.Shape}
   */
  static createShape(coordinates: [number, number][]) {
    const v2Coords = coordinates.map((coord2d) => {
      return new THREE.Vector2(...coord2d)
    })

    return new THREE.Shape(v2Coords)
  }

  /**
   * 创建一个工厂函数：以用 PlaneGeometry 显示 材质贴图
   * @param url 贴图路径
   * @returns 返回工厂函数，以便重复创建多个 PlaneGeometry
   */
  static createTexturePlaneFactory: CreateTexturePlaneFactory = (url, options) => {
    const { depthTest, depthWrite, planeWidth, planeHeight, side, color } = {
      depthTest: true,
      depthWrite: true,
      planeWidth: 1,
      planeHeight: 1,
      side: THREE.DoubleSide,
      color: 0xffffff,
      ...options
    }

    const material = new THREE.MeshBasicMaterial({
      map: new THREE.TextureLoader().load(url),
      transparent: true,
      side,
      depthTest,
      depthWrite,
      color
    })

    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight)

    return (size = 1, pos = new THREE.Vector3()) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(pos)
      mesh.scale.setScalar(size)

      return mesh
    }
  }

  /**
   * 将 path标签的 d属性值  转为 THREE.Shape 实例对象
   * @param pathStr string <path d="" /> d的属性值
   * @returns {THREE.Shape}
   *
   * https://github.com/asutherland/d3-threeD/blob/master/lib/d3-threeD.js
   */
  static transformSVGPath(pathStr: string) {
    const DEGS_TO_RADS = Math.PI / 180,
      DIGIT_0 = 48,
      DIGIT_9 = 57,
      COMMA = 44,
      SPACE = 32,
      PERIOD = 46,
      MINUS = 45

    const path = new THREE.Shape()

    const len = pathStr.length
    let idx = 1,
      activeCmd,
      x = 0,
      y = 0,
      nx = 0,
      ny = 0,
      firstX = null,
      firstY = null,
      x1 = 0,
      x2 = 0,
      y1 = 0,
      y2 = 0,
      rx = 0,
      ry = 0,
      xar = 0,
      laf = 0,
      sf = 0,
      cx,
      cy

    function eatNum() {
      let sidx,
        c,
        isFloat = false,
        s
      // eat delims
      while (idx < len) {
        c = pathStr.charCodeAt(idx)
        if (c !== COMMA && c !== SPACE) break
        idx++
      }
      if (c === MINUS) sidx = idx++
      else sidx = idx
      // eat number
      while (idx < len) {
        c = pathStr.charCodeAt(idx)
        if (DIGIT_0 <= c && c <= DIGIT_9) {
          idx++
          continue
        } else if (c === PERIOD) {
          idx++
          isFloat = true
          continue
        }

        s = pathStr.substring(sidx, idx)
        return isFloat ? parseFloat(s) : parseInt(s)
      }

      s = pathStr.substring(sidx)
      return isFloat ? parseFloat(s) : parseInt(s)
    }

    function nextIsNum() {
      let c
      // do permanently eat any delims...
      while (idx < len) {
        c = pathStr.charCodeAt(idx)
        if (c !== COMMA && c !== SPACE) break
        idx++
      }
      c = pathStr.charCodeAt(idx)
      return c === MINUS || (DIGIT_0 <= c && c <= DIGIT_9)
    }

    let canRepeat
    activeCmd = pathStr[0]
    while (idx <= len) {
      canRepeat = true
      switch (activeCmd) {
        // moveto commands, become lineto's if repeated
        case 'M':
          x = eatNum()
          y = eatNum()
          path.moveTo(x, y)
          activeCmd = 'L'
          break
        case 'm':
          x += eatNum()
          y += eatNum()
          path.moveTo(x, y)
          activeCmd = 'l'
          break
        case 'Z':
        case 'z':
          canRepeat = false
          if (x !== firstX || y !== firstY) path.lineTo(firstX!, firstY!)
          break
        // - lines!
        case 'L':
        case 'H':
        case 'V':
          nx = activeCmd === 'V' ? x : eatNum()
          ny = activeCmd === 'H' ? y : eatNum()
          path.lineTo(nx, ny)
          x = nx
          y = ny
          break
        case 'l':
        case 'h':
        case 'v':
          nx = activeCmd === 'v' ? x : x + eatNum()
          ny = activeCmd === 'h' ? y : y + eatNum()
          path.lineTo(nx, ny)
          x = nx
          y = ny
          break
        // - cubic bezier
        case 'C':
          x1 = eatNum()
          y1 = eatNum()
        case 'S':
          if (activeCmd === 'S') {
            x1 = 2 * x - x2
            y1 = 2 * y - y2
          }
          x2 = eatNum()
          y2 = eatNum()
          nx = eatNum()
          ny = eatNum()
          path.bezierCurveTo(x1, y1, x2, y2, nx, ny)
          x = nx
          y = ny
          break
        case 'c':
          x1 = x + eatNum()
          y1 = y + eatNum()
        case 's':
          if (activeCmd === 's') {
            x1 = 2 * x - x2
            y1 = 2 * y - y2
          }
          x2 = x + eatNum()
          y2 = y + eatNum()
          nx = x + eatNum()
          ny = y + eatNum()
          path.bezierCurveTo(x1, y1, x2, y2, nx, ny)
          x = nx
          y = ny
          break
        // - quadratic bezier
        case 'Q':
          x1 = eatNum()
          y1 = eatNum()
        case 'T':
          if (activeCmd === 'T') {
            x1 = 2 * x - x1
            y1 = 2 * y - y1
          }
          nx = eatNum()
          ny = eatNum()
          path.quadraticCurveTo(x1, y1, nx, ny)
          x = nx
          y = ny
          break
        case 'q':
          x1 = x + eatNum()
          y1 = y + eatNum()
        case 't':
          if (activeCmd === 't') {
            x1 = 2 * x - x1
            y1 = 2 * y - y1
          }
          nx = x + eatNum()
          ny = y + eatNum()
          path.quadraticCurveTo(x1, y1, nx, ny)
          x = nx
          y = ny
          break
        // - elliptical arc
        case 'A':
          rx = eatNum()
          ry = eatNum()
          xar = eatNum() * DEGS_TO_RADS
          laf = eatNum()
          sf = eatNum()
          nx = eatNum()
          ny = eatNum()
          if (rx !== ry) {
            console.warn('Forcing elliptical arc to be a circular one :(', rx, ry)
          }
          // SVG implementation notes does all the math for us! woo!
          // http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
          // step1, using x1 as x1'
          x1 = (Math.cos(xar) * (x - nx)) / 2 + (Math.sin(xar) * (y - ny)) / 2
          y1 = (-Math.sin(xar) * (x - nx)) / 2 + (Math.cos(xar) * (y - ny)) / 2
          // step 2, using x2 as cx'
          let norm = Math.sqrt(
            (rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) /
              (rx * rx * y1 * y1 + ry * ry * x1 * x1)
          )
          if (laf === sf) norm = -norm
          x2 = (norm * rx * y1) / ry
          y2 = (norm * -ry * x1) / rx
          // step 3
          cx = Math.cos(xar) * x2 - Math.sin(xar) * y2 + (x + nx) / 2
          cy = Math.sin(xar) * x2 + Math.cos(xar) * y2 + (y + ny) / 2

          const u = new THREE.Vector2(1, 0),
            v = new THREE.Vector2((x1 - x2) / rx, (y1 - y2) / ry)
          let startAng = Math.acos(u.dot(v) / u.length() / v.length())
          if (u.x * v.y - u.y * v.x < 0) startAng = -startAng

          // we can reuse 'v' from start angle as our 'u' for delta angle
          u.x = (-x1 - x2) / rx
          u.y = (-y1 - y2) / ry

          let deltaAng = Math.acos(v.dot(u) / v.length() / u.length())
          // This normalization ends up making our curves fail to triangulate...
          if (v.x * u.y - v.y * u.x < 0) deltaAng = -deltaAng
          if (!sf && deltaAng > 0) deltaAng -= Math.PI * 2
          if (sf && deltaAng < 0) deltaAng += Math.PI * 2

          path.absarc(cx, cy, rx, startAng, startAng + deltaAng, sf)
          x = nx
          y = ny
          break
        default:
          throw new Error('weird path command: ' + activeCmd)
      }
      if (firstX === null) {
        firstX = x
        firstY = y
      }
      // just reissue the command
      if (canRepeat && nextIsNum()) continue
      activeCmd = pathStr[idx++]
    }

    return path
  }
}

interface DrawCurveOptions {
  /**
   * 曲线颜色
   * @default 0xffffff
   */
  color?: number;

  /**
   * 曲线中间隆起高度
   * @default 5
   */
  height?: number;

  /**
   * 曲线分段数（段数越多，曲线越平滑）
   * @default 50
   */
  divisions?: number;
}

interface CreateTexturePlaneFactory {
  (url: string, options?: {
    /**
     * @default 0xffffff
     */
    color?: number;

    /**
     * @default true
     */
    depthTest?: boolean;

    /**
     * @default true
     */
    depthWrite?: boolean;

    /**
     * @default 1
     */
    planeWidth?: number;

    /**
     * @default 1
     */
    planeHeight?: number;

    /**
     * @default THREE.DoubleSide
     */
    side?: THREE.Side;
  }): (size?: number, pos?: THREE.Vector3) => THREE.Mesh
}