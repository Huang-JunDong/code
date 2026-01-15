import { Hooks, CompilerPluginParams } from '@/compiler/type';

export async function transformCSS(
  params: CompilerPluginParams
): Promise<Error[] | undefined> {
  const { fileMap } = params;
  const files = Object.values(fileMap);

  files
    .filter((file) => file.filename.endsWith('.css'))
    .forEach((file) => {
      const { code } = file;
      file.compiled.css = code;
    });

  return;
}

export default function (hooks: Hooks) {
  hooks.hook('transform', transformCSS);
}
