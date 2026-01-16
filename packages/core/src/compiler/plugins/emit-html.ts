import { CompilerPluginParams, CompilerPluginResult } from '@/compiler';
import { Hooks } from '@/compiler/type';
import {
  modulesKey,
  exportKey,
  dynamicImportKey,
  nextKey,
  MapFile,
} from '@/constant';

// 使用 WeakMap 关联 iframe 与其执行状态，避免内存泄漏
const iframeStateMap = new WeakMap<
  HTMLIFrameElement,
  { count: number; nextIndex: number }
>();

function getIframeState(iframe: HTMLIFrameElement) {
  let state = iframeStateMap.get(iframe);
  if (!state) {
    state = { count: 0, nextIndex: 0 };
    iframeStateMap.set(iframe, state);
  }
  return state;
}

async function emitHtml(
  params: CompilerPluginParams,
  result: CompilerPluginResult
) {
  const { iframe, render, fileMap } = params;
  const importMap = fileMap[MapFile].code;
  const { html, links, modules, styles } = result;

  const state = getIframeState(iframe);
  state.count++;
  const currentCount = state.count;

  let iframeDoc = iframe.contentDocument as Document;
  let iframeWindow = iframe.contentWindow as any;

  if (!iframeDoc || !iframeWindow) {
    return;
  }

  // 重置 nextKey 数组，避免内存泄漏
  iframeWindow[nextKey] = [];

  if (render) {
    iframeDoc.write(html[0]);
    const importMapScript = document.createElement('script');
    importMapScript.setAttribute('type', 'importmap');
    importMapScript.innerHTML = `\n${importMap}\n`;
    iframeDoc.head.appendChild(importMapScript);
    iframeWindow.process = { env: {} };
    iframeWindow[modulesKey] = {};
    iframeWindow[exportKey] = (mod: Object, key: string, get: () => any) => {
      Object.defineProperty(mod, key, {
        enumerable: true,
        configurable: true,
        get,
      });
    };
    iframeWindow[dynamicImportKey] = (key: string) => {
      return Promise.resolve(iframeWindow[modulesKey][key]);
    };
  } else {
    iframeDoc.documentElement.innerHTML = html[0];
  }

  // remove old code
  const els = Array.from(iframeDoc.head.querySelectorAll('[replace]'));
  els.reverse().forEach((el) => {
    el.remove();
  });

  const map = flattenScopeMappings(JSON.parse(importMap));
  // links
  for (let link of links) {
    for (let key in map) {
      if (link === key || `${link}/` === key) {
        const styleEl = document.createElement('link');
        styleEl.setAttribute('href', map[key]);
        styleEl.setAttribute('rel', 'stylesheet');
        styleEl.setAttribute('type', 'text/css');
        styleEl.setAttribute('replace', 'true');
        iframeDoc.head.appendChild(styleEl);
        break;
      } else if (link.startsWith(key) && key.endsWith('/')) {
        const href = map[key] + link.replace(key, '');
        const styleEl = document.createElement('link');
        styleEl.setAttribute('href', href);
        styleEl.setAttribute('rel', 'stylesheet');
        styleEl.setAttribute('type', 'text/css');
        styleEl.setAttribute('replace', 'true');
        iframeDoc.head.appendChild(styleEl);
        break;
      }
    }
  }

  // css
  const styleEl = document.createElement('style');
  styleEl.setAttribute('replace', 'true');
  styleEl.innerHTML = styles.join('\n');
  iframeDoc.head.appendChild(styleEl);

  // 使用局部索引，避免全局状态污染
  let localIndex = 0;

  async function loadScript(i: number) {
    if (currentCount !== state.count || i >= modules.length) {
      return;
    }
    let script = modules[i];
    const scriptEl = document.createElement('script');
    scriptEl.setAttribute('type', 'module');
    scriptEl.setAttribute('replace', 'true');
    const currentIndex = localIndex;
    const done = new Promise((resolve) => {
      iframeWindow[nextKey][currentIndex] = function () {
        resolve(true);
      };
    });
    // send ok in the module script to ensure sequential evaluation
    // of multiple proxy.eval() calls
    scriptEl.innerHTML =
      script +
      `\nwindow.${nextKey}[${currentIndex}] && window.${nextKey}[${currentIndex}]();`;
    localIndex++;
    iframeDoc.head.appendChild(scriptEl);
    await done;
    loadScript(i + 1);
  }
  await loadScript(0);

  iframeDoc.close();
}

function flattenScopeMappings(importMap: any) {
  const flattenedMappings: Record<string, string> = {};

  const imports = importMap?.imports ?? {};
  const scopes = importMap?.scopes ?? {};

  for (let key in imports) {
    flattenedMappings[key] = imports[key];
  }

  for (const scopePrefix in scopes) {
    const scopeMappings = scopes[scopePrefix];
    for (const scopeModulePath in scopeMappings) {
      const fullPath = `${scopePrefix}${scopeModulePath}`;
      flattenedMappings[fullPath] = scopeMappings[scopeModulePath];
    }
  }

  return flattenedMappings;
}

export default function (hooks: Hooks) {
  hooks.hook('emit', emitHtml);
}
