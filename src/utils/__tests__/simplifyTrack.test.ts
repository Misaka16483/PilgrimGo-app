import { simplifyTrack } from '@/utils/simplifyTrack';
import type { GeoPoint } from '@/types';

const pt = (lat: number, lon: number, ts = 0): GeoPoint => ({
  latitude: lat,
  longitude: lon,
  timestamp: ts,
});

describe('simplifyTrack（Douglas-Peucker 轨迹压缩）', () => {
  it('点数 <= 2 时原样返回，且为副本（不改原数组）', () => {
    const single = [pt(0, 0)];
    expect(simplifyTrack(single)).toEqual(single);
    expect(simplifyTrack(single)).not.toBe(single);

    const two = [pt(0, 0), pt(0, 0.001)];
    expect(simplifyTrack(two)).toHaveLength(2);
  });

  it('共线的中间点被压缩，只保留首尾', () => {
    const line = [pt(0, 0), pt(0, 0.0005), pt(0, 0.001), pt(0, 0.0015)];
    const r = simplifyTrack(line, 5);
    expect(r).toHaveLength(2);
    expect(r[0]).toBe(line[0]); // 返回原 GeoPoint 引用
    expect(r[1]).toBe(line[line.length - 1]);
  });

  it('偏离超过 epsilon 的拐点被保留', () => {
    const a = pt(0, 0);
    const corner = pt(0.001, 0.0005); // 偏离首尾连线约 111m
    const c = pt(0, 0.001);
    const r = simplifyTrack([a, corner, c], 5);
    expect(r).toHaveLength(3);
    expect(r).toContain(corner);
  });

  it('保留点的 timestamp / altitude（返回原引用，不丢字段）', () => {
    const p0: GeoPoint = { latitude: 0, longitude: 0, altitude: 10, timestamp: 111 };
    const p2: GeoPoint = { latitude: 0, longitude: 0.001, altitude: 12, timestamp: 333 };
    const r = simplifyTrack([p0, pt(0, 0.0005), p2], 5);
    expect(r[0]).toBe(p0);
    expect(r[r.length - 1]).toBe(p2);
    expect(r[0].timestamp).toBe(111);
    expect(r[0].altitude).toBe(10);
  });

  it('极大 epsilon 下仍至少返回 2 点（满足后端 MIN_TRACK_POINTS=2）', () => {
    const r = simplifyTrack([pt(0, 0), pt(0, 0.0005), pt(0, 0.001)], 1e9);
    expect(r.length).toBeGreaterThanOrEqual(2);
  });
});
