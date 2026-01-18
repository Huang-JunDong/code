<script setup lang="ts">
import { ref, Ref, onMounted, onUnmounted, watch } from 'vue';
import { store } from '@/store';
import { MapFile } from '@/constant';
import { Compiler } from '@/compiler';
import Loading from '../loading/index.vue';
import { Hooks, ComplierPluginParams, ComplierPluginResult } from '@/compiler/type';

const errors = ref<Error[]>([]);
const previewDOM = ref() as Ref<HTMLDivElement>;
const iframe = ref<HTMLIFrameElement>();
const loading = ref(true);
let loadingTimer: ReturnType<typeof setTimeout> | null = null;
let runId = 0;
let erudaResizeObserver: ResizeObserver | null = null;
let consoleSafeAreaRafId: number | null = null;
let lastConsoleSafeAreaHeight = -1;

function ensureConsoleSafeAreaStyle(doc: Document) {
  const styleId = '__codeplayer_console_safe_area_style__';
  if (doc.getElementById(styleId)) return;
  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent = `
body {
  padding-bottom: var(--codeplayer-console-safe-area, 0px) !important;
}
`.trim();
  (doc.head || doc.documentElement).appendChild(style);
}

function scheduleSetConsoleSafeArea(height: number) {
  const nextHeight = Math.max(0, Math.floor(height));
  if (nextHeight === lastConsoleSafeAreaHeight) return;

  if (consoleSafeAreaRafId !== null) {
    cancelAnimationFrame(consoleSafeAreaRafId);
    consoleSafeAreaRafId = null;
  }

  consoleSafeAreaRafId = requestAnimationFrame(() => {
    consoleSafeAreaRafId = null;
    if (nextHeight === lastConsoleSafeAreaHeight) return;
    lastConsoleSafeAreaHeight = nextHeight;
    setConsoleSafeArea(nextHeight);
  });
}

function setConsoleSafeArea(height: number) {
  const doc = iframe.value?.contentDocument;
  if (!doc) return;
  ensureConsoleSafeAreaStyle(doc);
  doc.documentElement.style.setProperty(
    '--codeplayer-console-safe-area',
    `${Math.max(0, Math.floor(height))}px`
  );
}

function getErudaDevtoolsElement() {
  const eruda = (iframe.value?.contentWindow as any)?.__eruda;
  return (eruda?._shadowRoot?.querySelector?.('.eruda-dev-tools') ?? null) as HTMLElement | null;
}

function updateConsoleSafeArea() {
  if (!store.openConsole) {
    scheduleSetConsoleSafeArea(0);
    return;
  }
  const devtools = getErudaDevtoolsElement();
  if (!devtools) return;
  const view = devtools.ownerDocument.defaultView;
  const display = view ? view.getComputedStyle(devtools).display : '';
  if (display === 'none') {
    scheduleSetConsoleSafeArea(0);
    return;
  }
  scheduleSetConsoleSafeArea(devtools.getBoundingClientRect().height);
}

function installConsoleSafeAreaObserver() {
  erudaResizeObserver?.disconnect();
  erudaResizeObserver = null;
  const devtools = getErudaDevtoolsElement();
  if (!devtools) return;
  if (typeof ResizeObserver === 'undefined') {
    updateConsoleSafeArea();
    return;
  }
  erudaResizeObserver = new ResizeObserver((entries) => {
    if (!store.openConsole) {
      scheduleSetConsoleSafeArea(0);
      return;
    }
    const entry = entries[0];
    const target = entry?.target as HTMLElement | undefined;
    if (!target) return;
    const view = target.ownerDocument.defaultView;
    const display = view ? view.getComputedStyle(target).display : '';
    if (display === 'none') {
      scheduleSetConsoleSafeArea(0);
      return;
    }
    scheduleSetConsoleSafeArea(entry.contentRect?.height ?? target.getBoundingClientRect().height);
  });
  erudaResizeObserver.observe(devtools);
  updateConsoleSafeArea();
}

function beginLoading(delay = 0) {
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  if (delay <= 0) {
    loading.value = true;
    return;
  }
  loadingTimer = setTimeout(() => {
    loading.value = true;
    loadingTimer = null;
  }, delay);
}

function endLoading() {
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  loading.value = false;
}

// 防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 300;

// 防抖刷新函数
function debouncedRefresh() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    refreshSandbox();
  }, DEBOUNCE_DELAY);
}

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  erudaResizeObserver?.disconnect();
  erudaResizeObserver = null;
  if (consoleSafeAreaRafId !== null) {
    cancelAnimationFrame(consoleSafeAreaRafId);
    consoleSafeAreaRafId = null;
  }
  lastConsoleSafeAreaHeight = -1;
});

const erudaPlugin = (hooks: Hooks) => {
  if (store.showEruda === false) {
    return;
  }
  hooks.hook('before-emit', (_: ComplierPluginParams, items: ComplierPluginResult) => {
    items.modules.unshift(
      `import eruda from 'https://esm.sh/eruda@3.0.1';
if (window.__eruda) {
  window.__eruda.destroy();
}
window.__eruda = eruda;
eruda.init();`.trim()
    );
  });

  hooks.hook('after-emit', () => {
    const checkEruda = () => {
      const eruda = (iframe.value?.contentWindow as any)?.__eruda;
      if (eruda) {
        if (eruda._entryBtn) {
          eruda._entryBtn.hide();
        }
        if (store.openConsole) {
          eruda.show();
        }
        installConsoleSafeAreaObserver();
        eruda._entryBtn?._events?.click?.push(() => {
          // eruda transition is 0.3s
          setTimeout(() => {
            const devtools = eruda?._shadowRoot?.querySelector?.(
              '.eruda-dev-tools'
            ) as HTMLElement | null;
            const display = (devtools as any)?.computedStyleMap?.()?.get?.('display')?.value;
            store.openConsole = display === 'block';
            updateConsoleSafeArea();
          }, 300);
        });
        return true;
      }
      return false;
    };

    if (!checkEruda()) {
      const timer = setInterval(() => {
        if (checkEruda()) {
          clearInterval(timer);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(timer);
      }, 10000);
    }
  });
};

const compiler = new Compiler({
  plugins: [erudaPlugin],
  vueVersion: store.vueVersion,
});

watch(
  () => store.openConsole,
  (val) => {
    const eruda = (iframe.value?.contentWindow as any)?.__eruda;
    if (eruda) {
      if (val) {
        eruda.show();
      } else {
        eruda.hide();
      }
    }
    setTimeout(() => {
      installConsoleSafeAreaObserver();
    }, 350);
  }
);

onMounted(() => {
  renderSandbox();
});

// watch edit file
watch(
  () => [store.activeFile, store.files[store.activeFile]?.code],
  (newV, oldV) => {
    if (newV?.[0] !== oldV?.[0]) {
      return;
    }
    if (store.activeFile === MapFile) {
      renderSandbox();
    } else {
      debouncedRefresh();
    }
  },
  { deep: true }
);

// watch add a new file or delete a file
watch(
  () => store.files,
  (newV, oldV) => {
    const newFiles = Object.keys(newV).sort();
    const oldFiles = Object.keys(oldV).sort();
    if (
      newFiles.length === oldFiles.length &&
      newFiles.every((file, index) => file === oldFiles[index])
    ) {
      return;
    }
    refreshSandbox();
  },
  { deep: true }
);

watch(() => store.rerenderID, renderSandbox);

async function renderSandbox() {
  if (!previewDOM.value) {
    return;
  }

  const currentRunId = ++runId;
  beginLoading();

  // 建立一个新的 iframe
  erudaResizeObserver?.disconnect();
  erudaResizeObserver = null;
  if (consoleSafeAreaRafId !== null) {
    cancelAnimationFrame(consoleSafeAreaRafId);
    consoleSafeAreaRafId = null;
  }
  lastConsoleSafeAreaHeight = -1;
  iframe.value?.remove();
  iframe.value = document.createElement('iframe');
  iframe.value.className = 'codeplayer-iframe';
  previewDOM.value.append(iframe.value);

  const result: { errors: Error[] } = { errors: [] };
  try {
    await compiler.run({
      fileMap: store.files,
      result,
      entry: store.entry,
      iframe: iframe.value as HTMLIFrameElement,
      render: true,
    });
    errors.value = result.errors;
  } catch (e) {
    errors.value = [e as Error];
  } finally {
    if (currentRunId === runId) {
      endLoading();
    }
  }
}

async function refreshSandbox() {
  if (!previewDOM.value) {
    return;
  }
  if (!iframe.value) {
    return;
  }

  const currentRunId = ++runId;
  beginLoading(1500);

  // 建立一个新的 iframe
  const result: { errors: Error[] } = { errors: [] };
  try {
    await compiler.run({
      fileMap: store.files,
      result,
      entry: store.entry,
      iframe: iframe.value as HTMLIFrameElement,
      render: false,
    });
    errors.value = result.errors;
  } catch (e) {
    errors.value = [e as Error];
  } finally {
    if (currentRunId === runId) {
      endLoading();
    }
  }
}
</script>

<template>
  <div class="codeplayer-iframe-container">
    <div ref="previewDOM" class="codeplayer-iframe-host"></div>
    <Loading v-if="loading" />
  </div>
</template>
