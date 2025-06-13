/* 注：使用 geoMercator 需要 沿 x 轴 旋转 90°
  import { geoMercator } from "d3";
  const mercatorProjection =  d3.geoMercator()
    .center([121.49131393432617, 31.232206344604492]) // 其中一个坐标
    .translate([0, 0])
    .scale(10000);
*/

export class GeoThree {
  /**
   * 将经纬度坐标 转为 墨卡托投影坐标
   */
  static mercatorProjection([E, N]: [number, number]) {
    const x = E * 20037508.34 / 180
    let y = Math.log(Math.tan((90 + N) * Math.PI / 360)) / (Math.PI / 180)
    y = y * 20037508.34 / 180
    return [x, y]
  }

  /**
   * 经纬度坐标转为 3D球面空间 坐标
   * @param 地球半径 R
   * @param 经度(角度值) longitude
   * @param 纬度(角度值) latitude
   * @returns 3D空间坐标 [x, y, z]
   */
  static gps2xyz(R: number, longitude: number, latitude: number): [number, number, number] {
    let lon = longitude * Math.PI / 180//转弧度值
    const lat = latitude * Math.PI / 180//转弧度值
    lon = -lon// three.js坐标系z坐标轴对应经度-90度，而不是90度

    // 经纬度坐标转球面坐标计算公式
    const x = R * Math.cos(lat) * Math.cos(lon)
    const y = R * Math.sin(lat)
    const z = R * Math.cos(lat) * Math.sin(lon)

    // 返回球面坐标
    return [x, y, z]
  }
}
