/**
 * 成员A - User API 单元测试
 * 验证 user.ts 中各函数是否正确构造 HTTP 请求（URL、参数）
 * 参考 anime.test.ts 模式：mock @/api/client，不实际联网
 */
import { getUserStats, getMyRoutes, getMyCheckIns } from '@/api/user';
import client from '@/api/client';

// Mock 底层 HTTP client
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

describe('api/user', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  // ==================== getUserStats ====================

  describe('getUserStats', () => {
    it('应 GET /user/me/stats 并返回巡礼统计数据', async () => {
      const fake = {
        code: 200,
        data: {
          totalAnimes: 3,
          totalSpots: 12,
          totalRoutes: 5,
          totalDistance: 42.5,
          totalDuration: 1800,
          currentStreak: 7,
          monthlyStats: [
            { month: '2026-06', checkInCount: 8, distance: 15.2 },
            { month: '2026-05', checkInCount: 4, distance: 27.3 },
          ],
        },
      };
      mockedGet.mockResolvedValue(fake);

      const res = await getUserStats();

      expect(mockedGet).toHaveBeenCalledWith('/user/me/stats');
      expect(res).toBe(fake);
      expect(res.data.totalAnimes).toBe(3);
      expect(res.data.monthlyStats).toHaveLength(2);
    });

    it('应正确返回空统计数据', async () => {
      const fake = {
        code: 200,
        data: {
          totalAnimes: 0,
          totalSpots: 0,
          totalRoutes: 0,
          totalDistance: 0,
          totalDuration: 0,
          currentStreak: 0,
          monthlyStats: [],
        },
      };
      mockedGet.mockResolvedValue(fake);

      const res = await getUserStats();

      expect(res.data.totalRoutes).toBe(0);
      expect(res.data.monthlyStats).toEqual([]);
    });
  });

  // ==================== getMyRoutes ====================

  describe('getMyRoutes', () => {
    it('应 GET /user/me/routes 并透传分页参数', async () => {
      const fake = {
        code: 200,
        data: {
          records: [{ id: 1, title: '秋叶原巡礼路线', animeTitle: 'Steins;Gate' }],
          total: 1,
          totalElements: 1,
          totalPages: 1,
          number: 0,
          page: 1,
          size: 10,
        },
      };
      mockedGet.mockResolvedValue(fake);

      const res = await getMyRoutes({ page: 1, size: 10 });

      expect(mockedGet).toHaveBeenCalledWith('/user/me/routes', {
        params: { page: 1, size: 10 },
      });
      expect(res).toBe(fake);
    });

    it('应支持不传分页参数（使用后端默认值）', async () => {
      mockedGet.mockResolvedValue({ code: 200, data: { content: [], totalElements: 0 } });

      await getMyRoutes();

      expect(mockedGet).toHaveBeenCalledWith('/user/me/routes', { params: undefined });
    });

    it('应返回空列表', async () => {
      const fake = {
        code: 200,
        data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 },
      };
      mockedGet.mockResolvedValue(fake);

      const res = await getMyRoutes({ page: 1, size: 20 });

      expect(res.data.content).toEqual([]);
      expect(res.data.totalElements).toBe(0);
    });
  });

  // ==================== getMyCheckIns ====================

  describe('getMyCheckIns', () => {
    it('应 GET /user/me/checkins 并透传分页参数', async () => {
      const fake = {
        code: 200,
        data: {
          content: [
            {
              id: 1,
              spotId: 5,
              animeId: 2,
              animeTitle: '你的名字',
              spotName: '须贺神社',
              spotImageUrl: 'https://img.example/spot.jpg',
              photoUrl: 'https://img.example/photo.jpg',
              likeCount: 10,
              createdAt: '2026-06-01 12:00:00',
            },
          ],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
        },
      };
      mockedGet.mockResolvedValue(fake);

      const res = await getMyCheckIns({ page: 1, size: 20 });

      expect(mockedGet).toHaveBeenCalledWith('/user/me/checkins', {
        params: { page: 1, size: 20 },
      });
      expect(res.data.content).toHaveLength(1);
      expect(res.data.content[0].spotName).toBe('须贺神社');
    });

    it('应支持不传分页参数', async () => {
      mockedGet.mockResolvedValue({ code: 200, data: { records: [], total: 0 } });

      await getMyCheckIns();

      expect(mockedGet).toHaveBeenCalledWith('/user/me/checkins', { params: undefined });
    });
  });
});
