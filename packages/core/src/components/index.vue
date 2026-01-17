<script setup lang="ts">
import { watch, computed, ref, onUnmounted } from 'vue';
import { store } from '@/store';
import { atou } from '@/utils';
import { getTemplate, File } from '@/compiler';
import { OnlineEditorOptions, EditorExportFile } from '@/type';
import Toolbar from './toolbar/index.vue';
import Splitter from './splitter/index.vue';
import FileBar from './file-bar/index.vue';
import CodeEditor from './monaco-editor/index.vue';
import Preview from './preview/index.vue';
import Loading from './loading/index.vue';

const props = defineProps<{ options?: OnlineEditorOptions }>();
const emit = defineEmits<{
  (e: 'codeChange', files: EditorExportFile[]): void;
}>();

const loaded = ref(false);

const CodeSlotName = computed(() => (store.reverse ? 'right' : 'left'));
const PreviewSlotName = computed(() => (store.reverse ? 'left' : 'right'));

const exportFiles = computed<EditorExportFile[]>(() => {
  const files = store.files || {};
  return Object.keys(files).map((filename) => {
    const file = files[filename];
    return {
      filename,
      code: file?.code ?? '',
      isEntry: filename === store.entry,
      isActive: filename === store.activeFile,
    };
  });
});

let emitRafId = 0;
const scheduleEmit = () => {
  if (emitRafId) {
    cancelAnimationFrame(emitRafId);
  }
  emitRafId = requestAnimationFrame(() => {
    emitRafId = 0;
    emit('codeChange', exportFiles.value);
  });
};

watch(
  exportFiles,
  () => {
    scheduleEmit();
  },
  { immediate: true }
);

const handleReady = () => {
  loaded.value = true;
  window.removeEventListener('load', handleReady);
  document.removeEventListener('DOMContentLoaded', handleReady);
};

// 处理页面加载状态
if (document.readyState === 'complete') {
  handleReady();
} else {
  window.addEventListener('load', handleReady);
  document.addEventListener('DOMContentLoaded', handleReady);
}

onUnmounted(() => {
  if (emitRafId) {
    cancelAnimationFrame(emitRafId);
    emitRafId = 0;
  }
  window.removeEventListener('load', handleReady);
  document.removeEventListener('DOMContentLoaded', handleReady);
});

const init = () => {
  const params = new URLSearchParams(location.search);
  const options = props.options ?? {};
  for (const key in options) {
    if (key in store && options[key as keyof typeof options] !== undefined) {
      if (params.get(key) === null) {
        const value = options[key as keyof typeof options];
        (store as Record<string, unknown>)[key] = value;
      }
    }
  }

  if (store.showCode === false && store.showPreview === false) {
    store.showCode = true;
  }
  if (store.openConsole === true && store.showEruda === false) {
    store.showEruda = true;
  }
  if (store.showFileBar === false) {
    store.showMobileFileBar = false;
  }

  initFileSystem();
};

// 初始化文件系統
function initFileSystem() {
  // 依次根据 options.initFiles、serializedState、appType 初始化文件
  const params = new URLSearchParams(location.search);
  const options = props.options ?? {};
  const appType = params.get('appType') || options.appType || '';
  if (
    appType === 'vue2' &&
    params.get('vueVersion') === null &&
    options.vueVersion === undefined
  ) {
    store.vueVersion = 2;
  }
  let filesMap = getTemplate(appType) as Record<string, string>;
  if (options.initFiles && Object.keys(options.initFiles).length > 0) {
    filesMap = options.initFiles;
  } else if (location.hash) {
    try {
      const files = JSON.parse(atou(location.hash.slice(1)));
      if (files && typeof files === 'object') {
        filesMap = files as Record<string, string>;
      }
    } catch (e) {
      console.error('Failed to parse files from hash:', e);
    }
  }

  // 将键值对转换为虚拟文件
  const files: Record<string, File> = {};
  for (const filename in filesMap || {}) {
    const code = (filesMap as Record<string, unknown>)[filename];
    if (typeof code !== 'string') continue;
    files[filename] = new File(filename, code);
  }
  if (Object.keys(files).length === 0) {
    const fallback = getTemplate(appType);
    for (const filename in fallback) {
      files[filename] = new File(filename, fallback[filename]);
    }
  }
  store.files = files;

  // 初始化入口文件
  store.entry = params.get('entry') || options.entry || '';
  if (!files[store.entry]) {
    store.entry = Object.keys(files)[0];
  }
  store.activeFile =
    params.get('activeFile') || options.activeFile || store.entry;
  if (!files[store.activeFile]) {
    store.activeFile = store.entry;
  }
}

watch(
  () => props.options,
  () => {
    init();
  },
  {
    deep: true,
    immediate: true,
  }
);

watch(
  () => [store.isMobile, store.showCode, store.showPreview],
  () => {
    if (!store.isMobile) return;
    if (store.showCode === false && store.mobileView === 'code') {
      store.mobileView = 'preview';
    }
    if (store.showPreview === false && store.mobileView === 'preview') {
      store.mobileView = 'code';
    }
    if (store.showCode === false && store.showPreview === true) {
      store.mobileView = 'preview';
    } else if (store.showPreview === false && store.showCode === true) {
      store.mobileView = 'code';
    }
  },
  { immediate: true }
);

watch(
  () => [store.isMobile, store.showFileBar],
  () => {
    if (!store.isMobile) return;
    if (store.showFileBar === false) {
      store.showMobileFileBar = false;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="codeplayer-container"
    :class="{ 'is-mobile': store.isMobile, 'no-toolbar': !store.showToolbar }"
  >
    <Toolbar v-if="store.showToolbar" />
    <!-- 移动端布局 -->
    <template v-if="store.isMobile">
      <!-- 移动端选项卡 -->
      <div class="mobile-tabs">
        <button 
          v-if="store.showCode"
          class="mobile-tab" 
          :class="{ active: store.mobileView === 'code' }"
          @click="store.mobileView = 'code'"
        >
          <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
          </svg>
          <span>代码</span>
        </button>
        <button 
          v-if="store.showPreview"
          class="mobile-tab" 
          :class="{ active: store.mobileView === 'preview' }"
          @click="store.mobileView = 'preview'"
        >
          <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          <span>预览</span>
        </button>
      </div>
      <!-- 移动端文件栏抽屉 -->
      <div 
        v-if="store.showFileBar"
        class="mobile-file-drawer" 
        :class="{ open: store.showMobileFileBar }"
      >
        <div class="drawer-overlay" @click="store.showMobileFileBar = false"></div>
        <div class="drawer-content">
          <FileBar />
        </div>
      </div>
      <!-- 移动端内容区 -->
      <div class="mobile-content">
        <div
          v-if="store.showCode"
          class="mobile-panel"
          :class="{ active: store.mobileView === 'code' }"
        >
          <CodeEditor />
        </div>
        <div
          v-if="store.showPreview"
          class="mobile-panel"
          :class="{ active: store.mobileView === 'preview' }"
        >
          <Preview />
          <Loading v-if="!loaded" />
        </div>
      </div>
    </template>
    <!-- 桌面端布局 -->
    <template v-else>
      <div class="main-content main-content-top">
        <Splitter
          min="140px"
          max="300px"
          initSplit="160px"
          :showLeft="store.showFileBar"
        >
          <template #left>
            <FileBar />
          </template>
          <template #right>
            <Splitter
              class="main-splitter"
              min="0%"
              max="100%"
              :showLeft="store.reverse ? store.showPreview : store.showCode"
              :showRight="store.reverse ? store.showCode : store.showPreview"
            >
              <template v-slot:[CodeSlotName]>
                <CodeEditor />
              </template>
              <template v-slot:[PreviewSlotName]>
                <Preview />
                <Loading v-if="!loaded" />
              </template>
            </Splitter>
          </template>
        </Splitter>
      </div>
    </template>
  </div>
</template>

<style lang="less">
@import './index.less';

.codeplayer-container {
  color: var(--codeplayer-main-color);
}
</style>
