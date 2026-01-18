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
let wasmPromise: Promise<void> | undefined;

export function initMonaco(store: Store) {
  if (initted) return;
  loadMonacoEnv(store);
  void loadWasm();

  watchEffect(() => {
    const jsxRuntime = detectJsxRuntime(store);
    applyTsCompilerOptions(jsxRuntime);
    if (jsxRuntime === 'react') {
      const deps = readImportMapDependencies(store);
      const reactVersion = deps.react;
      let typesMajor = '18';
      if (reactVersion) {
        const major = reactVersion.split('.')[0];
        typesMajor = /^\d+$/.test(major) ? major : 'latest';
      }
      void ensureReactTypeLibs(typesMajor);
    } else if (jsxRuntime === 'solid') {
      const deps = readImportMapDependencies(store);
      void ensureSolidTypeLibs(deps['solid-js'] || 'latest');
    }

    // create a model for each file in the store
    for (const filename in store.files || {}) {
      const file = store.files[filename];
      if (editor.getModel(Uri.parse(`file:///${filename}`))) continue;
      getOrCreateModel(Uri.parse(`file:///${filename}`), getFileLanguage(file.filename), file.code);
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
  wasmPromise ??= onigasm.loadWASM(onigasmWasm);
  return wasmPromise;
}

const cdnFileCache = new Map<string, string>();

export class WorkerHost {
  onFetchCdnFile(uri: string, text: string) {
    cdnFileCache.set(uri, text);
  }
}

const extraLibCache = new Map<string, string>();
const extraLibDisposablesTs = new Map<string, monaco.IDisposable>();
const extraLibDisposablesJs = new Map<string, monaco.IDisposable>();

async function fetchText(url: string) {
  const cached = extraLibCache.get(url);
  if (cached != null) return cached;
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const text = await res.text();
    extraLibCache.set(url, text);
    return text;
  } catch {
    return;
  }
}

async function addExtraLibFromUrl(filePath: string, url: string) {
  if (extraLibDisposablesTs.has(filePath)) return;
  const text = await fetchText(url);
  if (!text) return;
  extraLibDisposablesTs.set(
    filePath,
    monaco.languages.typescript.typescriptDefaults.addExtraLib(text, filePath)
  );
  extraLibDisposablesJs.set(
    filePath,
    monaco.languages.typescript.javascriptDefaults.addExtraLib(text, filePath)
  );
}

function readImportMapImports(store: Store): Record<string, unknown> | null {
  const importMap = store.files?.['import-map.json']?.code;
  if (!importMap) return null;
  try {
    const parsed = JSON.parse(importMap) as { imports?: Record<string, unknown> };
    return parsed?.imports || null;
  } catch {
    return null;
  }
}

type JsxRuntime = 'react' | 'solid' | 'default';
let lastAppliedJsxRuntime: JsxRuntime | null = null;
function detectJsxRuntime(store: Store): JsxRuntime {
  const imports = readImportMapImports(store);
  if (imports) {
    if (typeof imports['solid-js'] === 'string' || typeof imports['solid-js/'] === 'string') {
      return 'solid';
    }
    if (typeof imports.react === 'string' || typeof imports['react/'] === 'string') {
      return 'react';
    }
  }

  const files = store.files || {};
  if (Object.keys(files).some((name) => name.endsWith('.tsx') || name.endsWith('.jsx'))) {
    return 'react';
  }

  return 'default';
}

function applyTsCompilerOptions(jsxRuntime: JsxRuntime) {
  if (lastAppliedJsxRuntime === jsxRuntime) return;
  lastAppliedJsxRuntime = jsxRuntime;

  const commonTsCompilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: false,
    esModuleInterop: true,
    strict: false,
    skipLibCheck: true,
    noImplicitAny: false,
    noEmit: true,
    isolatedModules: true,
  } satisfies monaco.languages.typescript.CompilerOptions;

  const commonJsCompilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: false,
    esModuleInterop: true,
    noEmit: true,
    skipLibCheck: true,
  } satisfies monaco.languages.typescript.CompilerOptions;

  if (jsxRuntime === 'solid') {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      ...commonTsCompilerOptions,
      jsx: monaco.languages.typescript.JsxEmit.Preserve,
      jsxImportSource: 'solid-js',
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      ...commonJsCompilerOptions,
      jsx: monaco.languages.typescript.JsxEmit.Preserve,
      jsxImportSource: 'solid-js',
    });
    return;
  }

  if (jsxRuntime === 'react') {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      ...commonTsCompilerOptions,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    });
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      ...commonJsCompilerOptions,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    });
    return;
  }

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...commonTsCompilerOptions,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
  });
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    ...commonJsCompilerOptions,
    jsx: monaco.languages.typescript.JsxEmit.Preserve,
  });
}

function isReactLikeProject(store: Store) {
  const files = store.files || {};
  if (Object.keys(files).some((name) => name.endsWith('.tsx') || name.endsWith('.jsx'))) {
    return true;
  }
  const imports = readImportMapImports(store);
  if (!imports) return false;
  return typeof imports.react === 'string' || typeof imports['react/'] === 'string';
}

let reactTypeLibsLoaded = false;
let reactTypeLibsLoading: Promise<void> | null = null;
async function ensureReactTypeLibs() {
  if (reactTypeLibsLoaded) return;
  if (reactTypeLibsLoading) return reactTypeLibsLoading;

  reactTypeLibsLoading = (async () => {
    await Promise.all([
      addExtraLibFromUrl(
        'file:///node_modules/@types/react/index.d.ts',
        'https://cdn.jsdelivr.net/npm/@types/react@18/index.d.ts'
      ),
      addExtraLibFromUrl(
        'file:///node_modules/@types/react/jsx-runtime.d.ts',
        'https://cdn.jsdelivr.net/npm/@types/react@18/jsx-runtime.d.ts'
      ),
      addExtraLibFromUrl(
        'file:///node_modules/@types/react/jsx-dev-runtime.d.ts',
        'https://cdn.jsdelivr.net/npm/@types/react@18/jsx-dev-runtime.d.ts'
      ),
      addExtraLibFromUrl(
        'file:///node_modules/@types/react-dom/index.d.ts',
        'https://cdn.jsdelivr.net/npm/@types/react-dom@18/index.d.ts'
      ),
      addExtraLibFromUrl(
        'file:///node_modules/@types/react-dom/client.d.ts',
        'https://cdn.jsdelivr.net/npm/@types/react-dom@18/client.d.ts'
      ),
      addExtraLibFromUrl(
        'file:///node_modules/@types/scheduler/index.d.ts',
        'https://cdn.jsdelivr.net/npm/@types/scheduler/index.d.ts'
      ),
      addExtraLibFromUrl(
        'file:///node_modules/@types/scheduler/tracing.d.ts',
        'https://cdn.jsdelivr.net/npm/@types/scheduler/tracing.d.ts'
      ),
      addExtraLibFromUrl(
        'file:///node_modules/@types/prop-types/index.d.ts',
        'https://cdn.jsdelivr.net/npm/@types/prop-types/index.d.ts'
      ),
      addExtraLibFromUrl(
        'file:///node_modules/csstype/index.d.ts',
        'https://cdn.jsdelivr.net/npm/csstype/index.d.ts'
      ),
    ]);

    if (extraLibDisposablesTs.size > 0) {
      reactTypeLibsLoaded = true;
    }
  })().finally(() => {
    reactTypeLibsLoading = null;
  });

  return reactTypeLibsLoading;
}

const jsDelivrListCache = new Map<string, Promise<string[]>>();
async function listJsDelivrFiles(pkgName: string, version: string) {
  const key = `${pkgName}@${version}`;
  let cached = jsDelivrListCache.get(key);
  if (cached) return cached;

  cached = (async () => {
    const url = `https://data.jsdelivr.com/v1/package/npm/${encodeURIComponent(pkgName)}@${encodeURIComponent(version)}/flat`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { files?: Array<{ name?: string }> };
    const names = (json.files || [])
      .map((f) => f?.name)
      .filter((n): n is string => typeof n === 'string');
    return names;
  })();

  jsDelivrListCache.set(key, cached);
  return cached;
}

let solidTypeLibsLoaded = false;
let solidTypeLibsLoading: Promise<void> | null = null;
async function ensureSolidTypeLibs(version: string) {
  if (solidTypeLibsLoaded) return;
  if (solidTypeLibsLoading) return solidTypeLibsLoading;

  solidTypeLibsLoading = (async () => {
    const pkgName = 'solid-js';
    const files = await listJsDelivrFiles(pkgName, version);
    const dtsFiles = files.filter(
      (name) =>
        name.includes('/types/') &&
        (name.endsWith('.d.ts') || name.endsWith('.d.mts') || name.endsWith('.d.cts'))
    );

    await Promise.all([
      addExtraLibFromUrl(
        'file:///node_modules/csstype/index.d.ts',
        'https://cdn.jsdelivr.net/npm/csstype/index.d.ts'
      ),
      ...dtsFiles.map((name) => {
        const normalized = name.startsWith('/') ? name : `/${name}`;
        const filePath = `file:///node_modules/${pkgName}${normalized}`;
        const url = `https://cdn.jsdelivr.net/npm/${pkgName}@${version}${normalized}`;
        return addExtraLibFromUrl(filePath, url);
      }),
    ]);

    if (extraLibDisposablesTs.has('file:///node_modules/solid-js/types/jsx.d.ts')) {
      solidTypeLibsLoaded = true;
    } else if (dtsFiles.length > 0) {
      solidTypeLibsLoaded = true;
    }
  })().finally(() => {
    solidTypeLibsLoading = null;
  });

  return solidTypeLibsLoading;
}

function parseEsmShDep(url: string): { name: string; version: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname !== 'esm.sh') return null;

  const path = u.pathname.replace(/^\/+/, '');
  if (!path) return null;

  const segments = path.split('/').filter(Boolean);
  if (!segments.length) return null;

  if (segments[0].startsWith('@')) {
    const scope = segments[0];
    const rest = segments[1];
    if (!rest) return null;
    const atIndex = rest.lastIndexOf('@');
    if (atIndex <= 0) {
      return { name: `${scope}/${rest}`, version: 'latest' };
    }
    const pkg = rest.slice(0, atIndex);
    const version = rest.slice(atIndex + 1) || 'latest';
    if (!pkg) return null;
    return { name: `${scope}/${pkg}`, version };
  }

  const first = segments[0];
  const atIndex = first.lastIndexOf('@');
  if (atIndex <= 0) {
    return { name: first, version: 'latest' };
  }
  const name = first.slice(0, atIndex);
  const version = first.slice(atIndex + 1) || 'latest';
  if (!name) return null;
  return { name, version };
}

function readImportMapDependencies(store: Store): Record<string, string> {
  const file = store.files?.['import-map.json'];
  if (!file?.code) return {};

  try {
    const parsed = JSON.parse(file.code) as { imports?: Record<string, unknown> };
    const imports = parsed?.imports;
    if (!imports) return {};

    const deps: Record<string, string> = {};
    for (const value of Object.values(imports)) {
      if (typeof value !== 'string') continue;
      const dep = parseEsmShDep(value);
      if (!dep) continue;
      deps[dep.name] = dep.version;
    }
    return deps;
  } catch {
    return {};
  }
}

let disposeVue: undefined | (() => void);
export function disposeLanguageTools() {
  disposeVue?.();
  disposeVue = undefined;
}
export async function reloadLanguageTools(store: Store, withMarkers = true) {
  disposeVue?.();

  let dependencies: Record<string, string> = readImportMapDependencies(store);

  if (store.vueVersion) {
    const version = store.vueVersion.toString() === '2' ? '2.7.15' : '3.5.26';
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
    };
  }

  if (store.typescriptVersion) {
    dependencies = {
      ...dependencies,
      typescript: store.typescriptVersion,
    };
  }

  if (dependencies.react) {
    const major = dependencies.react.split('.')[0];
    const typesMajor = /^\d+$/.test(major) ? major : 'latest';
    dependencies = {
      ...dependencies,
      '@types/react': typesMajor,
      '@types/react-dom': typesMajor,
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
          checkJs: false,
          // @ts-ignore
          jsx: 'Preserve',
          // @ts-ignore
          module: 'ESNext',
          // @ts-ignore
          moduleResolution: 'Bundler',
          // @ts-ignore
          target: 'ESNext',
          strict: false,
          skipLibCheck: true,
          noImplicitAny: false,
          types: dependencies.react ? ['react', 'react-dom'] : [],
          typeRoots: ['/node_modules/@types'],
          baseUrl: '/',
          paths: {
            '*': ['/node_modules/*'],
          },
        },
      },
      dependencies,
    } satisfies CreateData,
  });
  const languageId = ['vue', 'javascript', 'typescript'];
  const getSyncUris = () =>
    Object.keys(store.files).map((filename) => Uri.parse(`file:///${filename}`));
  const disposeMarkers = withMarkers
    ? volar.editor.activateMarkers(worker, languageId, 'vue', getSyncUris, editor as any).dispose
    : () => {};
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

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
  });
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

  store.reloadLanguageTools = (withMarkers = true) => reloadLanguageTools(store, withMarkers);
  languages.onLanguage('vue', () => store.reloadLanguageTools!(true));

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
  applyTsCompilerOptions(detectJsxRuntime(store));

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true,
    noSuggestionDiagnostics: true,
  });
}
