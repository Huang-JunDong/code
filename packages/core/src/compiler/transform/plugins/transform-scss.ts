import { Hooks, CompilerPluginParams } from '@/compiler/type';
import { compileString } from 'sass';

export async function transformSass(params: CompilerPluginParams): Promise<Error[] | undefined> {
  const { fileMap } = params;
  const files = Object.values(fileMap);
  const errors: Error[] = [];

  await Promise.all(
    files
      .filter(({ filename }) => filename.endsWith('.sass') || filename.endsWith('.scss'))
      .map(async (file) => {
        let { code } = file;

        try {
          code = (await compileString(code)).css;
          file.compiled.css = code;
        } catch (error) {
          errors.push(error as Error);
        }
      })
  );

  return errors.length ? errors : undefined;
}

export default function (hooks: Hooks) {
  hooks.hook('transform', transformSass);
}
