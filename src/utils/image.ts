/**
 * Anitabi 返回的图片 URL 自带 ?plan=h160 缩略参数(封面与地标截图均如此),
 * 去掉 plan 参数即可拿到原图。非 Anitabi 的 URL(用户实拍、本地 file://)原样返回。
 */
export function getDisplayImageUrl(url?: string | null) {
  if (!url) {
    return undefined;
  }

  if (!url.includes('image.anitabi.cn/')) {
    return url;
  }

  return url
    .replace(/([?&])plan=[^&]*&/, '$1')
    .replace(/[?&]plan=[^&]*$/, '');
}
