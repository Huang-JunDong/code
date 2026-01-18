import less from 'less';
import { Hooks, CompilerPluginParams } from '@/compiler/type';

export async function transformLess(params: CompilerPluginParams): Promise<Error[] | undefined> {
  const { fileMap } = params;
  const files = Object.values(fileMap);
  const errors: Error[] = [];

  await Promise.all(
    files
      .filter((file) => file.filename.endsWith('.less'))
      .map(async (file) => {
        let { code } = file;

        try {
          code = (await less.render(code)).css;
          file.compiled.css = code;
        } catch (error) {
          errors.push(error as Error);
        }
      })
  );

  return errors.length ? errors : undefined;
}

export default function (hooks: Hooks) {
  hooks.hook('transform', transformLess);
}
