/**
 * 标签颜色管理工具
 * 为标签自动分配和生成颜色
 */

// 预定义的标签颜色方案（柔和色调）
const TAG_COLORS = [
  // 蓝色系
  '#e3f2fd', '#bbdefb', '#90caf9',
  // 紫色系
  '#f3e5f5', '#e1bee7', '#ce93d8',
  // 绿色系
  '#e8f5e9', '#c8e6c9', '#a5d6a7',
  // 橙色系
  '#fff3e0', '#ffe0b2', '#ffcc80',
  // 红色系
  '#ffebee', '#ffcdd2', '#ef9a9a',
  // 青色系
  '#e0f2f1', '#b2dfdb', '#80cbc4',
  // 黄色系
  '#fffde7', '#fff9c4', '#fff59d',
  // 灰色系
  '#f5f5f5', '#eeeeee', '#e0e0e0',
  // 粉色系
  '#fce4ec', '#f8bbd0', '#f48fb1'
];

/**
 * 根据标签名生成稳定的颜色
 * 相同的标签名总是生成相同的颜色
 */
export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

/**
 * 根据标签背景色选择合适的文字颜色
 * 返回黑色或白色，确保对比度足够
 */
export function getTagTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // 计算亮度
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000' : '#fff';
}

/**
 * 为标签数组生成颜色映射
 */
export function getTagColors(tags: string[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  for (const tag of tags) {
    colorMap.set(tag, getTagColor(tag));
  }
  return colorMap;
}

/**
 * 生成边框颜色（比背景色深一些）
 */
export function getTagBorderColor(bgColor: string): string {
  const hex = bgColor.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 40);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 40);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 40);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
