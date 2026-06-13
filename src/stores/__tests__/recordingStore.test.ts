import { useRecordingStore } from '@/stores/recordingStore';
import type { GeoPoint, Spot, Waypoint } from '@/types';

const get = () => useRecordingStore.getState();

const pt = (lat: number, lon: number, ts = 0): GeoPoint => ({
  latitude: lat,
  longitude: lon,
  timestamp: ts,
});

const makeSpot = (id: number): Spot => ({
  id,
  animeId: 1,
  animeTitle: '某番剧',
  name: `取景地${id}`,
  latitude: 0,
  longitude: 0,
  animeImageUrl: '',
});

const makeWaypoint = (orderIndex: number): Omit<Waypoint, 'id'> => ({
  location: pt(0, 0),
  imageUrl: '',
  description: `转折点${orderIndex}`,
  orderIndex,
});

// store 是单例，每个用例前清空，避免互相污染
beforeEach(() => {
  get().reset();
});

describe('recordingStore 初始状态', () => {
  it('未录制、各集合为空', () => {
    const s = get();
    expect(s.isRecording).toBe(false);
    expect(s.animeId).toBeNull();
    expect(s.startTime).toBeNull();
    expect(s.trackPoints).toEqual([]);
    expect(s.waypoints).toEqual([]);
    expect(s.targetSpots).toEqual([]);
    expect(s.alertedSpotIds).toEqual([]);
    expect(s.checkInIds).toEqual([]);
  });
});

describe('startRecording', () => {
  it('置为录制中、记录开始时间、清空上一轮轨迹与标注', () => {
    get().addTrackPoint(pt(35, 139)); // 上一轮残留
    get().addWaypoint(makeWaypoint(1));
    get().markSpotAlerted(5);

    get().startRecording();

    const s = get();
    expect(s.isRecording).toBe(true);
    expect(typeof s.startTime).toBe('number');
    expect(s.trackPoints).toEqual([]);
    expect(s.waypoints).toEqual([]);
    expect(s.alertedSpotIds).toEqual([]);
    expect(s.checkInIds).toEqual([]);
  });

  it('保留开录前预选的目标取景地', () => {
    get().setTargetSpots([makeSpot(1), makeSpot(2)]);

    get().startRecording();

    expect(get().targetSpots).toHaveLength(2);
  });

  it('startTime 取自 Date.now()', () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    get().startRecording();
    expect(get().startTime).toBe(1_700_000_000_000);
    spy.mockRestore();
  });
});

describe('addTrackPoint', () => {
  it('按采样顺序依次追加', () => {
    get().startRecording();
    get().addTrackPoint(pt(35.0, 139.0, 1));
    get().addTrackPoint(pt(35.1, 139.1, 2));
    get().addTrackPoint(pt(35.2, 139.2, 3));

    const tps = get().trackPoints;
    expect(tps).toHaveLength(3);
    expect(tps.map((p) => p.timestamp)).toEqual([1, 2, 3]);
  });
});

describe('stopRecording', () => {
  it('停止录制但保留轨迹（用于结束后压缩与上传）', () => {
    get().startRecording();
    get().addTrackPoint(pt(35, 139, 1));
    get().addTrackPoint(pt(35.1, 139.1, 2));

    get().stopRecording();

    expect(get().isRecording).toBe(false);
    expect(get().trackPoints).toHaveLength(2);
  });
});

describe('markSpotAlerted（邻近提醒去重）', () => {
  it('同一 spot 只记录一次', () => {
    get().markSpotAlerted(5);
    get().markSpotAlerted(5);
    get().markSpotAlerted(8);
    expect(get().alertedSpotIds).toEqual([5, 8]);
  });
});

describe('addCheckInId（录制期间打卡回填）', () => {
  it('打卡 id 去重累积', () => {
    get().addCheckInId(99);
    get().addCheckInId(99);
    get().addCheckInId(100);
    expect(get().checkInIds).toEqual([99, 100]);
  });
});

describe('setAnimeId（切换作品）', () => {
  it('切换到不同作品时清空预选取景地与提醒标记', () => {
    get().setAnimeId(1);
    get().setTargetSpots([makeSpot(1)]);
    get().markSpotAlerted(1);

    get().setAnimeId(2);

    const s = get();
    expect(s.animeId).toBe(2);
    expect(s.targetSpots).toEqual([]);
    expect(s.alertedSpotIds).toEqual([]);
  });

  it('设为相同作品时保留已选取景地', () => {
    get().setAnimeId(1);
    get().setTargetSpots([makeSpot(1)]);

    get().setAnimeId(1);

    expect(get().targetSpots).toHaveLength(1);
  });
});

describe('reset', () => {
  it('清空全部录制状态', () => {
    get().setAnimeId(1);
    get().setTargetSpots([makeSpot(1)]);
    get().startRecording();
    get().addTrackPoint(pt(35, 139, 1));
    get().addWaypoint(makeWaypoint(1));
    get().addCheckInId(7);

    get().reset();

    const s = get();
    expect(s).toMatchObject({
      isRecording: false,
      animeId: null,
      startTime: null,
      trackPoints: [],
      waypoints: [],
      targetSpots: [],
      alertedSpotIds: [],
      checkInIds: [],
    });
  });
});
