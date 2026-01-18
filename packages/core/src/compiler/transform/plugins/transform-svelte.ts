import { Hooks, CompilerPluginParams } from '@/compiler/type';
import {
  createRemoteLoader,
  detectFramework,
  collectErrors,
  getErrorResult,
} from './utils';

// CDN 源配置（主源 + 备选源）
const SVELTE_COMPILER_URLS = [
  'https://esm.sh/svelte@4/compiler',
  'https://cdn.jsdelivr.net/npm/svelte@4/compiler/index.mjs',
  'https://unpkg.com/svelte@4/compiler/index.mjs',
];

// 使用工厂函数创建带缓存和容灾的加载器
const loadSvelteCompiler = createRemoteLoader<any>(
  SVELTE_COMPILER_URLS[0],
  SVELTE_COMPILER_URLS.slice(1)
);

export async function transformSvelte(params: CompilerPluginParams): Promise<Error[] | undefined> {
  // 使用统一的框架检测函数，与 Solid 保持一致
  if (!detectFramework(params, ['svelte'])) {
    return undefined;
  }

  const { fileMap } = params;
  const files = Object.values(fileMap);
  const svelteFiles = files.filter(({ filename }) => filename.endsWith('.svelte'));

  if (svelteFiles.length === 0) {
    return undefined;
  }

  const errors: Error[] = [];

  try {
    const compiler = await loadSvelteCompiler();

    await Promise.all(
      svelteFiles.map(async (file) => {
        const { code, filename } = file;

        try {
          const result = compiler.compile(code, {
            filename,
            generate: 'dom',
            dev: false,
            css: 'injected',
          });
          file.compiled.js = result.js.code;
          if (result.css?.code) {
            file.compiled.css = result.css.code;
          }
        } catch (error) {
          collectErrors(errors, error);
        }
      })
    );
  } catch (error) {
    collectErrors(errors, error);
  }

  return getErrorResult(errors);
}

export default function (hooks: Hooks) {
  hooks.hook('transform', transformSvelte);
}
