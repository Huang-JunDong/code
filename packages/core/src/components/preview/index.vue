<script setup lang="ts">
import { ref, Ref, onMounted, onUnmounted, watch } from 'vue';
import { store } from '@/store';
import { MapFile } from '@/constant';
import { Compiler } from '@/compiler';
import {
  Hooks,
  ComplierPluginParams,
  ComplierPluginResult,
} from '@/compiler/type';

const errors = ref<Error[]>([]);
const previewDOM = ref() as Ref<HTMLDivElement>;
const iframe = ref<HTMLIFrameElement>();

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
});

const erudaPlugin = (hooks: Hooks) => {
  if (store.showEruda === false) {
    return;
  }
  hooks.hook(
    'before-emit',
    (_: ComplierPluginParams, items: ComplierPluginResult) => {
      items.modules.unshift(
        `import eruda from 'https://esm.sh/eruda@3.0.1';
if (window.__eruda) {
  window.__eruda.destroy();
}
window.__eruda = eruda;
eruda.init();`.trim()
      );
    }
  );

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
        eruda._entryBtn?._events?.click?.push(() => {
          // eruda transition is 0.3s
          setTimeout(() => {
            const devtools = eruda?._shadowRoot?.querySelector?.(
              '.eruda-dev-tools'
            ) as HTMLElement | null;
            const display = (devtools as any)?.computedStyleMap?.()?.get?.('display')?.value;
            store.openConsole = display === 'block';
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

  // 建立一个新的 iframe
  iframe.value?.remove();
  iframe.value = document.createElement('iframe');
  iframe.value.className = 'codeplayer-iframe';
  previewDOM.value.append(iframe.value);

  const result: { errors: Error[] } = { errors: [] };
  await compiler.run({
    fileMap: store.files,
    result,
    entry: store.entry,
    iframe: iframe.value as HTMLIFrameElement,
    render: true,
  });
  errors.value = result.errors;
}

async function refreshSandbox() {
  if (!previewDOM.value) {
    return;
  }
  // 建立一个新的 iframe
  const result: { errors: Error[] } = { errors: [] };
  await compiler.run({
    fileMap: store.files,
    result,
    entry: store.entry,
    iframe: iframe.value as HTMLIFrameElement,
    render: false,
  });
  errors.value = result.errors;
}
</script>

<template>
  <div class="codeplayer-iframe-container" ref="previewDOM"></div>
</template>
