export class PolygonThree {
  /**
   * 判断 点(point) 是否位于 polygon 内
   * @param point
   * @param vs
   * @returns
   */
  static isPointInPolygon(point: PointCoord, vs: PointCoord[]) {
    const x = point[0],
      y = point[1]
    let inside = false
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0],
        yi = vs[i][1]
      const xj = vs[j][0],
        yj = vs[j][1]
      const intersect = ((yi > y) != (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  };

  /**
   * 在 Polygon 的密闭空间中，计算分布点(grid)坐标
   * @param edgeLine 边线坐标
   * @param option
   * @returns
   */
  static createGridByPolygon(edgeLine: PointCoord[], option: CreateGridByPolygonOption = {}) {
    const { rowNum, colNum } = {
      rowNum: 20,
      colNum: 10,
      ...option
    }

    const minX = Math.min(...Array.from(edgeLine, d => d[0])),
      minY = Math.min(...Array.from(edgeLine, d => d[1])),
      maxX = Math.max(...Array.from(edgeLine, d => d[0])),
      maxY = Math.max(...Array.from(edgeLine, d => d[1]))

    const rowStep = (maxX - minX) / rowNum,
        colStep = (maxY - minY) / colNum
    const gridList: PointCoord[] = []

    for (let rowIndex = 0; rowIndex <= rowNum; rowIndex++) {
      for (let colIndex = 0; colIndex <= colNum; colIndex++) {
        const x = minX + rowIndex * rowStep
        const y = minY + colIndex * colStep
        const isInPolygon = PolygonThree.isPointInPolygon([x, y], edgeLine)
        if (isInPolygon) {
          gridList.push([x, y])
        }
      }
    }

    return gridList
  }
}

type PointCoord = [number, number];
export interface CreateGridByPolygonOption {
  /**
   * 横向创建多少个 grid点
   * @default 20
   */
  rowNum?: number;

  /**
   * 列向创建多少个 grid点
   * @default 10
   */
  colNum?: number;
}
