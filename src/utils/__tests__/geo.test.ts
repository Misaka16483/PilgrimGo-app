import {
  getDistance,
  getTotalDistance,
  getMinDistanceToPolylineMeters,
  formatDistance,
  formatDuration,
} from '@/utils/geo';
import type { GeoPoint } from '@/types';

// 构造 GeoPoint 的小助手（timestamp 为必填字段）
const pt = (latitude: number, longitude: number): GeoPoint => ({
  latitude,
  longitude,
  timestamp: 0,
});

describe('getDistance（Haversine 距离）', () => {
  it('同一点的距离为 0', () => {
    expect(getDistance(pt(35.31, 139.55), pt(35.31, 139.55))).toBe(0);
  });

  it('纬度相差 1° 约等于 111.2km', () => {
    const d = getDistance(pt(0, 0), pt(1, 0));
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('距离应对称：A→B == B→A', () => {
    const a = pt(35.308, 139.495); // 镰仓高校前
    const b = pt(35.319, 139.546); // 镰仓站
    expect(getDistance(a, b)).toBeCloseTo(getDistance(b, a), 6);
  });
});

describe('getTotalDistance（轨迹总长）', () => {
  it('空数组或单点的总距离为 0', () => {
    expect(getTotalDistance([])).toBe(0);
    expect(getTotalDistance([pt(35, 139)])).toBe(0);
  });

  it('多点总距离 == 各分段之和', () => {
    const a = pt(35.0, 139.0);
    const b = pt(35.001, 139.0);
    const c = pt(35.002, 139.0);
    expect(getTotalDistance([a, b, c])).toBeCloseTo(
      getDistance(a, b) + getDistance(b, c),
      6,
    );
  });
});

describe('getMinDistanceToPolylineMeters（偏离路径检测）', () => {
  it('空折线返回 Infinity', () => {
    expect(getMinDistanceToPolylineMeters(pt(35, 139), [])).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it('点落在线段上时距离≈0', () => {
    const line = [pt(35.0, 139.0), pt(35.0, 139.01)];
    const onLine = pt(35.0, 139.005);
    expect(getMinDistanceToPolylineMeters(onLine, line)).toBeLessThan(1);
  });

  it('点远离折线时距离为正且合理', () => {
    const line = [pt(35.0, 139.0), pt(35.0, 139.01)];
    const off = pt(35.01, 139.005); // 向北偏约 1.1km
    const d = getMinDistanceToPolylineMeters(off, line);
    expect(d).toBeGreaterThan(1_000);
    expect(d).toBeLessThan(1_200);
  });
});

// 边界值分析（对应《质量保证》PPT 的边界值测试方法）
describe('formatDistance 边界值', () => {
  it.each([
    [0, '0m'],
    [999, '999m'],
    [1000, '1.0km'],
    [1500, '1.5km'],
    [12345, '12.3km'],
  ])('%dm -> %s', (input, expected) => {
    expect(formatDistance(input)).toBe(expected);
  });
});

describe('formatDuration 边界值', () => {
  it.each([
    [0, '0min'],
    [59, '0min'],
    [60, '1min'],
    [3599, '59min'],
    [3600, '1h0min'],
    [3661, '1h1min'],
  ])('%ds -> %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});
