import { jsDelivrUriBase } from '@volar/cdn';
import * as volar from '@volar/monaco';
import { editor, languages, Uri } from 'monaco-editor';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
// 直接导入语言模式设置函数，绕过 onLanguage 回调机制
// Monaco 的 onLanguage 回调在打包后可能不会被正确触发
import { setupMode as setupCssMode } from 'monaco-editor/esm/vs/language/css/cssMode';
import { setupMode as setupHtmlMode } from 'monaco-editor/esm/vs/language/html/htmlMode';
import { setupMode as setupJsonMode } from 'monaco-editor/esm/vs/language/json/jsonMode';
// @ts-ignore - 模块存在但没有类型声明
import { setupTypeScript, setupJavaScript } from 'monaco-editor/esm/vs/language/typescript/tsMode';
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
  
  // Svelte 文件直接使用 HTML 语言服务（在 getFileLanguage 中映射为 'html'）
  // 这样可以获得完整的 HTML 语法高亮和智能提示

  // 启用 CSS/LESS/SCSS 智能提示
  monaco.languages.css.cssDefaults.setOptions({
    validate: true,
    lint: {
      compatibleVendorPrefixes: 'ignore',
      vendorPrefix: 'warning',
      duplicateProperties: 'warning',
      emptyRules: 'warning',
      importStatement: 'ignore',
      boxModel: 'ignore',
      universalSelector: 'ignore',
      zeroUnits: 'ignore',
      fontFaceProperties: 'warning',
      hexColorLength: 'error',
      argumentsInColorFunction: 'error',
      unknownProperties: 'warning',
      ieHack: 'ignore',
      unknownVendorSpecificProperties: 'ignore',
      propertyIgnoredDueToDisplay: 'warning',
    },
  });

  monaco.languages.css.lessDefaults.setOptions({
    validate: true,
  });

  monaco.languages.css.scssDefaults.setOptions({
    validate: true,
  });

  store.reloadLanguageTools = () => reloadLanguageTools(store);
  languages.onLanguage('vue', () => store.reloadLanguageTools!());
  
  // 手动设置语言模式，确保智能提示工作
  // Monaco 的 onLanguage 回调在打包后可能不会被正确触发
  // 这会影响所有非 Vue 项目的独立 CSS/HTML/JSON 文件（Solid、React、Svelte 等）
  
  // CSS/LESS/SCSS 语言模式
  setupCssMode(monaco.languages.css.cssDefaults);
  setupCssMode(monaco.languages.css.lessDefaults);
  setupCssMode(monaco.languages.css.scssDefaults);
  
  // HTML 语言模式（包括 Handlebars 和 Razor）
  setupHtmlMode(monaco.languages.html.htmlDefaults);
  
  // JSON 语言模式
  setupJsonMode(monaco.languages.json.jsonDefaults);
  
  // TypeScript/JavaScript 语言模式
  // 手动激活，确保在 js/jsx/ts/tsx 文件中智能提示正常工作
  setupTypeScript(monaco.languages.typescript.typescriptDefaults);
  setupJavaScript(monaco.languages.typescript.javascriptDefaults);
  
  // 通过 setModeConfiguration 确保 completionItems 被启用
  monaco.languages.css.cssDefaults.setModeConfiguration({
    completionItems: true,
    hovers: true,
    documentSymbols: true,
    definitions: true,
    references: true,
    documentHighlights: true,
    rename: true,
    colors: true,
    foldingRanges: true,
    diagnostics: true,
    selectionRanges: true,
    documentFormattingEdits: true,
    documentRangeFormattingEdits: true,
  });
  
  monaco.languages.css.lessDefaults.setModeConfiguration({
    completionItems: true,
    hovers: true,
    documentSymbols: true,
    definitions: true,
    references: true,
    documentHighlights: true,
    rename: true,
    colors: true,
    foldingRanges: true,
    diagnostics: true,
    selectionRanges: true,
    documentFormattingEdits: true,
    documentRangeFormattingEdits: true,
  });
  
  monaco.languages.css.scssDefaults.setModeConfiguration({
    completionItems: true,
    hovers: true,
    documentSymbols: true,
    definitions: true,
    references: true,
    documentHighlights: true,
    rename: true,
    colors: true,
    foldingRanges: true,
    diagnostics: true,
    selectionRanges: true,
    documentFormattingEdits: true,
    documentRangeFormattingEdits: true,
  });
  
  // HTML 模式配置
  monaco.languages.html.htmlDefaults.setModeConfiguration({
    completionItems: true,
    hovers: true,
    documentSymbols: true,
    links: true,
    documentHighlights: true,
    rename: true,
    colors: true,
    foldingRanges: true,
    selectionRanges: true,
    diagnostics: true,
    documentFormattingEdits: true,
    documentRangeFormattingEdits: true,
  });
  
  // JSON 模式配置
  monaco.languages.json.jsonDefaults.setModeConfiguration({
    completionItems: true,
    hovers: true,
    documentSymbols: true,
    tokens: true,
    colors: true,
    foldingRanges: true,
    diagnostics: true,
    selectionRanges: true,
    documentFormattingEdits: true,
    documentRangeFormattingEdits: true,
  });
  
  // TypeScript/JavaScript 语言配置
  // 为 js/jsx/ts/tsx 文件启用完整的语言支持
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
  
  // TypeScript 编译器选项
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: true,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    esModuleInterop: true,
    strict: true,
    noEmit: true,
    isolatedModules: true,
  });
  
  // JavaScript 编译器选项
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: true,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    esModuleInterop: true,
    noEmit: true,
  });
  
  // 启用诊断（错误提示）
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });
  
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });
}
