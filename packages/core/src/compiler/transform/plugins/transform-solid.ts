import * as Babel from '@babel/standalone';
import { Hooks, CompilerPluginParams } from '@/compiler/type';
import { createRemoteLoader, detectFramework, collectErrors, getErrorResult } from './utils';

// CDN 源配置（主源 + 备选源）
const SOLID_PRESET_URLS = [
  'https://esm.sh/babel-preset-solid@1.8.6',
  'https://cdn.jsdelivr.net/npm/babel-preset-solid@1.8.6/+esm',
  'https://unpkg.com/babel-preset-solid@1.8.6?module',
];

// 使用工厂函数创建带缓存和容灾的加载器
const loadSolidPreset = createRemoteLoader<any>(SOLID_PRESET_URLS[0], SOLID_PRESET_URLS.slice(1));

let presetRegistered = false;
let presetRegistering: Promise<void> | null = null;

async function ensureSolidPreset(): Promise<void> {
  if (presetRegistered) return;
  if (presetRegistering) return presetRegistering;

  presetRegistering = (async () => {
    const solidPreset = await loadSolidPreset();
    Babel.registerPreset('solid', solidPreset);
    presetRegistered = true;
  })().finally(() => {
    presetRegistering = null;
  });

  return presetRegistering;
}

export async function transformSolid(params: CompilerPluginParams): Promise<Error[] | undefined> {
  // 使用统一的框架检测函数
  if (!detectFramework(params, ['solid-js'])) {
    return undefined;
  }

  const { fileMap } = params;
  const files = Object.values(fileMap);
  const solidFiles = files.filter(
    ({ filename }) => filename.endsWith('.tsx') || filename.endsWith('.jsx')
  );

  if (solidFiles.length === 0) {
    return undefined;
  }

  const errors: Error[] = [];

  try {
    await ensureSolidPreset();

    await Promise.all(
      solidFiles.map(async (file) => {
        const { code, filename } = file;

        try {
          const result = Babel.transform(code, {
            filename,
            presets: [['typescript', { isTSX: true, allExtensions: true }], 'solid'],
          });
          file.compiled.js = result?.code || '';
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
  hooks.hook('transform', transformSolid);
}
