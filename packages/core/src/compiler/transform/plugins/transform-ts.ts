import { transform } from 'sucrase';
import { Hooks, CompilerPluginParams } from '@/compiler/type';

export async function transformTS(params: CompilerPluginParams): Promise<Error[] | undefined> {
  const { fileMap } = params;
  const files = Object.values(fileMap);
  const errors: Error[] = [];

  await Promise.all(
    files
      .filter(({ filename }) => filename.endsWith('.ts') || filename.endsWith('.js'))
      .map(async (file) => {
        const { filename } = file;
        let { code } = file;

        try {
          if (filename.endsWith('.ts')) {
            code = await transform(code, {
              transforms: ['typescript'],
            }).code;
          }

          file.compiled.js = code;
        } catch (error) {
          errors.push(error as Error);
        }
      })
  );

  return errors.length ? errors : undefined;
}

export default function (hooks: Hooks) {
  hooks.hook('transform', transformTS);
}
