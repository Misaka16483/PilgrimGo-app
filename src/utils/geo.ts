import type { GeoPoint } from '@/types';

/**
 * 计算两个坐标点之间的距离（米）
 * 使用 Haversine 公式
 */
export function getDistance(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000; // 地球半径（米）
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function getBearing(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function projectMeters(p: GeoPoint, ref: GeoPoint) {
  const R = 6371000;
  const lat = toRad(p.latitude);
  const lon = toRad(p.longitude);
  const refLat = toRad(ref.latitude);
  const refLon = toRad(ref.longitude);
  const x = (lon - refLon) * Math.cos(refLat) * R;
  const y = (lat - refLat) * R;
  return { x, y, refLat, refLon };
}

function unprojectMeters(
  meters: { x: number; y: number; refLat: number; refLon: number }
): { latitude: number; longitude: number } {
  const R = 6371000;
  const lat = meters.refLat + meters.y / R;
  const lon = meters.refLon + meters.x / (R * Math.cos(meters.refLat));
  return { latitude: toDeg(lat), longitude: toDeg(lon) };
}

function distancePointToSegmentMeters(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

function closestPointOnSegmentMeters(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return { t: 0, cx: a.x, cy: a.y, distance: Math.sqrt(dx * dx + dy * dy) };
  }
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { t, cx, cy, distance: Math.sqrt(dx * dx + dy * dy) };
}

export function getMinDistanceToPolylineMeters(point: GeoPoint, polyline: GeoPoint[]) {
  if (polyline.length === 0) return Number.POSITIVE_INFINITY;
  if (polyline.length === 1) return getDistance(point, polyline[0]);

  const p = projectMeters(point, point);
  let min = Number.POSITIVE_INFINITY;

  for (let i = 1; i < polyline.length; i++) {
    const a = projectMeters(polyline[i - 1], point);
    const b = projectMeters(polyline[i], point);
    const d = distancePointToSegmentMeters(p, a, b);
    if (d < min) min = d;
  }

  return min;
}

export function getClosestPointOnPolyline(point: GeoPoint, polyline: GeoPoint[]) {
  if (polyline.length === 0) {
    return null;
  }
  if (polyline.length === 1) {
    return {
      closestPoint: polyline[0],
      distanceMeters: getDistance(point, polyline[0]),
      segmentIndex: 0,
      t: 0,
    };
  }

  const p0 = projectMeters(point, point);
  const p = { x: 0, y: 0 };
  let best:
    | { cx: number; cy: number; distance: number; segmentIndex: number; t: number }
    | null = null;

  for (let i = 1; i < polyline.length; i++) {
    const a = projectMeters(polyline[i - 1], point);
    const b = projectMeters(polyline[i], point);
    const r = closestPointOnSegmentMeters(p, a, b);
    if (!best || r.distance < best.distance) {
      best = { cx: r.cx, cy: r.cy, distance: r.distance, segmentIndex: i - 1, t: r.t };
    }
  }

  if (!best) return null;

  const { latitude, longitude } = unprojectMeters({
    x: best.cx,
    y: best.cy,
    refLat: p0.refLat,
    refLon: p0.refLon,
  });

  return {
    closestPoint: {
      latitude,
      longitude,
      altitude: point.altitude,
      timestamp: point.timestamp,
    },
    distanceMeters: best.distance,
    segmentIndex: best.segmentIndex,
    t: best.t,
  };
}

/**
 * 计算路径总距离（米）
 */
export function getTotalDistance(points: GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += getDistance(points[i - 1], points[i]);
  }
  return total;
}

/**
 * 格式化距离显示
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 格式化时长显示
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h${m}min`;
  }
  return `${m}min`;
}
