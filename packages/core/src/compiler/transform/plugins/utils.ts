import { CompilerPluginParams } from '@/compiler/type';

/**
 * 远程模块加载器工厂
 * 解决重复的动态加载逻辑，提供缓存和容灾能力
 */
export function createRemoteLoader<T>(
  primaryUrl: string,
  fallbackUrls: string[] = [],
  timeout = 10000
) {
  let cached: T | null = null;
  let loading: Promise<T> | null = null;

  async function loadFromUrl(url: string): Promise<T> {
    // 使用 Promise.race 实现超时控制
    const importPromise = import(/* @vite-ignore */ url).then((module) => module.default || module);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Load timeout: ${url}`)), timeout);
    });

    return Promise.race([importPromise, timeoutPromise]);
  }

  return async function load(): Promise<T> {
    if (cached) return cached;
    if (loading) return loading;

    loading = (async () => {
      const urls = [primaryUrl, ...fallbackUrls];

      for (let i = 0; i < urls.length; i++) {
        try {
          cached = await loadFromUrl(urls[i]);
          return cached;
        } catch (error) {
          if (i === urls.length - 1) {
            throw new Error(`Failed to load module from all sources: ${urls.join(', ')}`);
          }
        }
      }

      throw new Error('No URLs provided for remote loader');
    })();

    try {
      return await loading;
    } finally {
      loading = null;
    }
  };
}

/**
 * 解析 import-map.json 并检测框架类型
 */
export function detectFramework(params: CompilerPluginParams, frameworkKeys: string[]): boolean {
  const { fileMap } = params;
  const importMapFile = Object.values(fileMap).find((f) => f.filename === 'import-map.json');

  if (!importMapFile) return false;

  try {
    const importMap = JSON.parse(importMapFile.code);
    if (!importMap.imports) return false;

    return Object.keys(importMap.imports).some((key) =>
      frameworkKeys.some((fk) => key === fk || key.startsWith(fk + '/'))
    );
  } catch {
    return false;
  }
}

/**
 * 收集编译错误的辅助函数
 */
export function collectErrors(errors: Error[], error: unknown): void {
  if (error instanceof Error) {
    errors.push(error);
  } else {
    errors.push(new Error(String(error)));
  }
}

/**
 * 返回错误结果或 undefined
 */
export function getErrorResult(errors: Error[]): Error[] | undefined {
  return errors.length > 0 ? errors : undefined;
}
