import { getAnimeList, getAnimeDetail, getAnimeSpots, syncExternalAnime } from '@/api/anime';
import client from '@/api/client';

// 把底层 HTTP client 整个替换掉：单元测试只验证 API 模块是否
// 用正确的 URL 和参数发起请求，不真正联网、也不依赖 AsyncStorage 等原生模块。
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

describe('api/anime', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
  });

  it('getAnimeList 请求 /anime 并透传分页/搜索参数', async () => {
    const fake = { code: 200, data: { records: [], total: 0 } };
    mockedGet.mockResolvedValue(fake);

    const res = await getAnimeList({ page: 1, size: 12, keyword: '灌篮高手' });

    expect(mockedGet).toHaveBeenCalledWith('/anime', {
      params: { page: 1, size: 12, keyword: '灌篮高手' },
    });
    expect(res).toBe(fake);
  });

  it('getAnimeDetail 把 id 拼进路径', async () => {
    mockedGet.mockResolvedValue({ code: 200, data: { id: 42 } });

    await getAnimeDetail(42);

    expect(mockedGet).toHaveBeenCalledWith('/anime/42');
  });

  it('getAnimeSpots 请求作品对应的取景地列表', async () => {
    mockedGet.mockResolvedValue({ code: 200, data: [] });

    await getAnimeSpots(7);

    expect(mockedGet).toHaveBeenCalledWith('/anime/7/spots');
  });

  it('syncExternalAnime 用 POST 触发一键收录', async () => {
    mockedPost.mockResolvedValue({ code: 200, data: { id: 42 } });

    await syncExternalAnime(42);

    expect(mockedPost).toHaveBeenCalledWith('/anime/42/sync');
  });
});
