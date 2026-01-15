import { jsDelivrUriBase } from '@volar/cdn';
import * as volar from '@volar/monaco';
import { editor, languages, Uri } from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import * as onigasm from 'onigasm';
import onigasmWasm from 'onigasm/lib/onigasm.wasm?url';
import { watchEffect } from 'vue';
import { getOrCreateModel } from './utils';
import { Store } from '@/store';
import type { CreateData } from './vue.worker';
import vueWorker from './vue.worker?worker';
import { getFileLanguage } from '@/compiler';

let initted = false;

export function initMonaco(store: Store) {
  if (initted) return;
  loadMonacoEnv(store);
  loadWasm();

  watchEffect(() => {
    // create a model for each file in the store
    for (const filename in store.files || {}) {
      const file = store.files[filename];
      if (editor.getModel(Uri.parse(`file:///${filename}`))) continue;
      getOrCreateModel(
        Uri.parse(`file:///${filename}`),
        getFileLanguage(file.filename),
        file.code
      );
    }

    // dispose of any models that are not in the store
    for (const model of editor.getModels()) {
      const uri = model.uri.toString();
      if (store.files[uri.substring('file:///'.length)]) continue;
      if (uri.startsWith(jsDelivrUriBase + '/')) continue;
      if (uri.startsWith('inmemory://')) continue;

      model.dispose();
    }
  });

  // Support for go to definition
  editor.registerEditorOpener({
    openCodeEditor(_, resource) {
      if (resource.toString().startsWith(jsDelivrUriBase + '/')) {
        const uri = resource.toString();
        if (cdnFileCache.has(uri)) {
          getOrCreateModel(resource, undefined, cdnFileCache.get(uri)!);
        }
        return true;
      }

      const path = resource.path;
      if (/^\//.test(path)) {
        const fileName = path.replace('/', '');
        if (fileName !== store.activeFile) {
          store.activeFile = fileName;
          return true;
        }
      }

      return false;
    },
  });

  initted = true;
}

export function loadWasm() {
  return onigasm.loadWASM(onigasmWasm);
}

const cdnFileCache = new Map<string, string>();

export class WorkerHost {
  onFetchCdnFile(uri: string, text: string) {
    cdnFileCache.set(uri, text);
  }
}

let disposeVue: undefined | (() => void);
export async function reloadLanguageTools(store: Store) {
  disposeVue?.();

  let dependencies: Record<string, string> = {
    // ...store.state.dependencyVersion,
  };

  if (store.vueVersion) {
    const version = store.vueVersion.toString() === '2' ? '2.7.15' : '3.3.6';
    dependencies = {
      ...dependencies,
      vue: version,
      '@vue/compiler-core': version,
      '@vue/compiler-dom': version,
      '@vue/compiler-sfc': version,
      '@vue/compiler-ssr': version,
      '@vue/reactivity': version,
      '@vue/runtime-core': version,
      '@vue/runtime-dom': version,
      '@vue/shared': version,
      '@types/react': '18.0.0',
    };
  }

  if (store.typescriptVersion) {
    dependencies = {
      ...dependencies,
      typescript: store.typescriptVersion,
    };
  }

  const worker = editor.createWebWorker<any>({
    moduleId: 'vs/language/vue/vueWorker',
    label: 'vue',
    host: new WorkerHost(),
    createData: {
      // tsconfig: store.getTsConfig?.() || {},
      tsconfig: {
        compilerOptions: {
          allowImportingTsExtensions: true,
          allowJs: true,
          checkJs: true,
          // @ts-ignore
          jsx: 'Preserve',
          // @ts-ignore
          module: 'ESNext',
          // @ts-ignore
          moduleResolution: 'Bundler',
          // @ts-ignore
          target: 'ESNext',
          baseUrl: '/',
          paths: {
            '*/': ['/node_modules/*'],
            'element-plus': ['/node_modules/element-plus'],
          },
        },
      },
      dependencies,
    } satisfies CreateData,
  });
  const languageId = ['vue', 'javascript', 'typescript'];
  const getSyncUris = () =>
    Object.keys(store.files).map((filename) =>
      Uri.parse(`file:///${filename}`)
    );
  const { dispose: disposeMarkers } = volar.editor.activateMarkers(
    worker,
    languageId,
    'vue',
    getSyncUris,
    editor as any
  );
  const { dispose: disposeAutoInsertion } = volar.editor.activateAutoInsertion(
    worker,
    languageId,
    getSyncUris,
    editor as any
  );
  const { dispose: disposeProvides } = await volar.languages.registerProvides(
    worker,
    languageId,
    getSyncUris,
    languages
  );

  disposeVue = () => {
    disposeMarkers();
    disposeAutoInsertion();
    disposeProvides();
    worker.dispose();
  };
}

export interface WorkerMessage {
  event: 'init';
  tsVersion: string;
  tsLocale?: string;
}

export function loadMonacoEnv(store: Store) {
  (self as any).MonacoEnvironment = {
    async getWorker(_: any, label: string) {
      if (label === 'vue') {
        const worker = new vueWorker();
        const init = new Promise<void>((resolve) => {
          worker.addEventListener('message', (data) => {
            if (data.data === 'inited') {
              resolve();
            }
          });
          worker.postMessage({
            event: 'init',
            tsVersion: store.typescriptVersion,
            // tsLocale: store.state.typescriptLocale || store.state.locale,
          } satisfies WorkerMessage);
        });
        await init;
        return worker;
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return new cssWorker();
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new htmlWorker();
      }
      if (label === 'json') {
        return new jsonWorker();
      }
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };

  languages.register({ id: 'vue', extensions: ['.vue'] });
  languages.register({ id: 'javascript', extensions: ['.js', '.jsx'] });
  languages.register({ id: 'typescript', extensions: ['.ts', '.tsx'] });
  languages.register({ id: 'html', extensions: ['.html'] });
  languages.register({ id: 'css', extensions: ['.css'] });
  languages.register({ id: 'less', extensions: ['.less'] });
  languages.register({ id: 'scss', extensions: ['.scss'] });
  languages.register({ id: 'sass', extensions: ['.sass'] });
  languages.register({ id: 'json', extensions: ['.json'] });

  store.reloadLanguageTools = () => reloadLanguageTools(store);
  languages.onLanguage('vue', () => store.reloadLanguageTools!());
}
