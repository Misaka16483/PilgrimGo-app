import { uploadRoute, getRoutesByAnime, getRouteDetail, rateRoute, getRouteReviews } from '@/api/route';
import client from '@/api/client';
import type { GeoPoint } from '@/types';

// 隔离底层 HTTP：只验证录制上传/查询是否用对了方法、URL 与请求体
jest.mock('@/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedGet = (client as unknown as { get: jest.Mock }).get;
const mockedPost = (client as unknown as { post: jest.Mock }).post;

const pt = (lat: number, lon: number, ts = 0): GeoPoint => ({
  latitude: lat,
  longitude: lon,
  timestamp: ts,
});

describe('api/route 路径录制上传', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  it('uploadRoute 用 POST /routes 提交完整录制数据', async () => {
    const payload = {
      animeId: 1,
      title: '镰仓高手经典巡礼',
      description: '从镰仓站出发',
      trackPoints: [pt(35.319, 139.546, 1), pt(35.308, 139.495, 2)],
      waypoints: [
        { location: pt(35.315, 139.54), imageUrl: '', description: '右转', orderIndex: 1 },
      ],
      spotIds: [10, 11],
      checkInIds: [99],
    };
    mockedPost.mockResolvedValue({ code: 200, data: { id: 1 } });

    await uploadRoute(payload);

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost).toHaveBeenCalledWith('/routes', payload);
  });

  it('getRoutesByAnime 用 GET /routes 并注入 animeId 与排序参数', async () => {
    mockedGet.mockResolvedValue({ code: 200, data: { records: [], total: 0 } });

    await getRoutesByAnime(7, { sort: 'rating', page: 1, size: 12 });

    expect(mockedGet).toHaveBeenCalledWith('/routes', {
      params: { animeId: 7, sort: 'rating', page: 1, size: 12 },
    });
  });

  it('getRouteDetail 用 GET /routes/:id 拉取轨迹详情', async () => {
    mockedGet.mockResolvedValue({ code: 200, data: { id: 5 } });

    await getRouteDetail(5);

    expect(mockedGet).toHaveBeenCalledWith('/routes/5');
  });

  it('rateRoute 用 POST /routes/:id/rate 提交评分与评论', async () => {
    mockedPost.mockResolvedValue({ code: 200, data: { rating: 4.5, ratingCount: 2 } });

    await rateRoute(5, 5, '很还原，跟走很顺');

    expect(mockedPost).toHaveBeenCalledWith('/routes/5/rate', {
      score: 5,
      comment: '很还原，跟走很顺',
    });
  });

  it('rateRoute 纯打星时 comment 为 undefined', async () => {
    mockedPost.mockResolvedValue({ code: 200, data: { rating: 5, ratingCount: 1 } });

    await rateRoute(5, 5);

    expect(mockedPost).toHaveBeenCalledWith('/routes/5/rate', {
      score: 5,
      comment: undefined,
    });
  });

  it('getRouteReviews 用 GET /routes/:id/reviews 拉取评价列表', async () => {
    mockedGet.mockResolvedValue({ code: 200, data: [] });

    await getRouteReviews(5, { page: 0, size: 20 });

    expect(mockedGet).toHaveBeenCalledWith('/routes/5/reviews', {
      params: { page: 0, size: 20 },
    });
  });
});
