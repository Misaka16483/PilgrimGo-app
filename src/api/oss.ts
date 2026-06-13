// 使用 legacy 命名空间：expo-file-system 19 把 uploadAsync 移到了 /legacy 子模块。
import * as FileSystem from 'expo-file-system/legacy';
import client from './client';
import type { ApiResponse } from '@/types';

export interface PresignVO {
  uploadUrl: string;
  publicUrl: string;
  contentType: string;
  objectKey: string;
  expiresAt: number;
}

/**
 * 找后端要一份预签名 PUT URL，前端可以直接 PUT 上传到 OSS。
 * 后端会把 object key 锁在 waypoints/{userId}/ 前缀下，避免越权。
 */
export function getWaypointPresignedUrl(ext: string, contentType: string) {
  return client.post<any, ApiResponse<PresignVO>>('/oss/presign', {
    ext,
    contentType,
  });
}

/**
 * 把本地图片 URI 直传到 OSS。返回最终公开访问 URL，写入 waypoint.imageUrl。
 * 注意：上传 PUT 时的 Content-Type 必须与签名时的一致，否则 OSS 会 403。
 */
export async function uploadWaypointPhoto(localUri: string): Promise<string> {
  const ext = inferExt(localUri);
  const contentType = inferContentType(ext);
  const res = await getWaypointPresignedUrl(ext, contentType);
  if (!res.data) {
    throw new Error(res.message ?? '获取上传地址失败，请检查后端配置');
  }
  const presign = res.data;

  const result = await FileSystem.uploadAsync(presign.uploadUrl, localUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': presign.contentType,
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`图片上传失败 (${result.status}): ${result.body?.slice(0, 200) ?? ''}`);
  }
  return presign.publicUrl;
}

function inferExt(uri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri);
  if (!match) return 'jpg';
  const ext = match[1].toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext) ? ext : 'jpg';
}

function inferContentType(ext: string): string {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}
