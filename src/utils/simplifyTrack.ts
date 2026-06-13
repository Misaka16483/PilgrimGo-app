import type { GeoPoint } from '@/types';

/**
 * Douglas-Peucker 轨迹压缩。epsilon 单位为米，默认 5m（对应步行/骑行档）。
 * 通过把经纬度等距投影到本地米坐标后再算垂距，避免高纬度下经度方向被压扁。
 * 返回原 GeoPoint 引用的子集，保留 timestamp / altitude。
 */
export function simplifyTrack(points: GeoPoint[], epsilonMeters = 5): GeoPoint[] {
  if (points.length <= 2) return points.slice();

  const latRef = points[0].latitude;
  const cosLat = Math.cos((latRef * Math.PI) / 180);
  const M_PER_DEG = 111320;

  const project = (p: GeoPoint): [number, number] => [
    p.longitude * M_PER_DEG * cosLat,
    p.latitude * M_PER_DEG,
  ];

  const xy = points.map(project);
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  // 迭代式 RDP，避免长轨迹递归爆栈
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    if (end - start < 2) continue;

    const [ax, ay] = xy[start];
    const [bx, by] = xy[end];
    const dx = bx - ax;
    const dy = by - ay;
    const segLen2 = dx * dx + dy * dy;

    let maxDist = 0;
    let maxIdx = -1;

    for (let i = start + 1; i < end; i++) {
      const [px, py] = xy[i];
      let d: number;
      if (segLen2 === 0) {
        const ex = px - ax;
        const ey = py - ay;
        d = Math.sqrt(ex * ex + ey * ey);
      } else {
        // 点到线段两端连成的直线的垂直距离
        const num = Math.abs(dy * px - dx * py + bx * ay - by * ax);
        d = num / Math.sqrt(segLen2);
      }
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }

    if (maxDist > epsilonMeters && maxIdx !== -1) {
      keep[maxIdx] = 1;
      stack.push([start, maxIdx]);
      stack.push([maxIdx, end]);
    }
  }

  const out: GeoPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (keep[i]) out.push(points[i]);
  }
  // 防御：极端 epsilon 下退化到 < 2 时回退原始数组（后端 MIN_TRACK_POINTS=2）
  return out.length >= 2 ? out : points.slice();
}
