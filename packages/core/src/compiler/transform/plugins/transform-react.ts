import { transform } from 'sucrase';
import { Hooks, CompilerPluginParams } from '@/compiler/type';
import { detectFramework, collectErrors, getErrorResult } from './utils';

export async function transformReact(params: CompilerPluginParams): Promise<Error[] | undefined> {
  // 检测是否为 React 项目（需要包含 'react' 在 import-map 中）
  // Solid 项目由 transform-solid 处理，通过插件顺序保证 Solid 在 React 之前
  if (!detectFramework(params, ['react'])) {
    return undefined;
  }

  const { fileMap } = params;
  const files = Object.values(fileMap);
  const errors: Error[] = [];

  await Promise.all(
    files
      .filter(({ filename }) => filename.endsWith('.tsx') || filename.endsWith('.jsx'))
      .map(async (file) => {
        let { code } = file;

        try {
          code = transform(code, {
            transforms: ['typescript', 'jsx'],
            production: true,
          }).code;
          file.compiled.js = code;
        } catch (error) {
          collectErrors(errors, error);
        }
      })
  );

  return getErrorResult(errors);
}

export default function (hooks: Hooks) {
  hooks.hook('transform', transformReact);
}
