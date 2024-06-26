export const MAX_INT32 = 2147483647;

/**
 * 保留N位小数，移除末尾多余的0
 * @param num
 * @param len
 * @returns
 */
export function toFixed(num: number | string, len: number, groupSeparator?: string) {
  let str = (Number(num) || 0).toFixed(len);
  // if (!/^[-0-9.]+$/g.test(str)) return '0';
  if (groupSeparator) {
    // 返回千分位格式
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  }
  // 移除末尾多余的0
  while (str.includes('.') && (str.endsWith('.') || str.endsWith('0'))) {
    str = str.slice(0, -1);
  }
  return str;
}

export const transformOption = (options: Record<string, any>) => {
  const result = [];
  for (const key in options) {
    if (options.hasOwnProperty(key)) {
      const item = options[key];
      result.push({ label: key, value: item });
    }
  }
  return result;
};

export const keyLookup = (obj: any, path: string[] | string): any => {
  const parts = Array.isArray(path) ? path : path.split('.');
  let result = obj;
  for (let i = 0; i < parts.length && result !== undefined; ++i) {
    result = result[parts[i]];
  }
  return result;
};
