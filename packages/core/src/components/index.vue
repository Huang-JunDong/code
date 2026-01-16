<script setup lang="ts">
import { watch, computed, ref, onUnmounted } from 'vue';
import { store } from '@/store';
import { atou } from '@/utils';
import { getTemplate, File } from '@/compiler';
import { OnlineEditorOptions } from '@/type';
import Toolbar from './toolbar/index.vue';
import Splitter from './splitter/index.vue';
import FileBar from './file-bar/index.vue';
import CodeEditor from './monaco-editor/index.vue';
import Preview from './preview/index.vue';
import Loading from './loading/index.vue';

const props = defineProps<{ options?: OnlineEditorOptions }>();

const loaded = ref(false);

const CodeSlotName = computed(() => (store.reverse ? 'right' : 'left'));
const PreviewSlotName = computed(() => (store.reverse ? 'left' : 'right'));

const onLoadCallback = () => {
  loaded.value = true;
};

// 处理页面加载状态
if (document.readyState === 'complete') {
  onLoadCallback();
} else {
  // 同时监听 DOMContentLoaded 和 load 事件
  const handleReady = () => {
    onLoadCallback();
    window.removeEventListener('load', handleReady);
    document.removeEventListener('DOMContentLoaded', handleReady);
  };
  window.addEventListener('load', handleReady);
  document.addEventListener('DOMContentLoaded', handleReady);
}

onUnmounted(() => {
  window.removeEventListener('load', onLoadCallback);
  document.removeEventListener('DOMContentLoaded', onLoadCallback);
});

const init = () => {
  const params = new URLSearchParams(location.search);
  const options = props.options || {};
  for (let key in props.options) {
    if (key in store && options[key as keyof typeof options] !== undefined) {
      if (params.get(key) === null) {
        const value = options[key as keyof typeof options];
        (store as Record<string, unknown>)[key] = value;
      }
    }
  }

  initFileSystem();
};

// 初始化文件系統
function initFileSystem() {
  // 依次根据 options.initFiles、serializedState、appType 初始化文件
  const params = new URLSearchParams(location.search);
  const options = props.options || {};
  const appType = params.get('appType') || options.appType || '';
  if (appType === 'vue2') {
    store.vueVersion = 2;
  }
  let filesMap = getTemplate(appType) as Record<string, string>;
  if (options.initFiles) {
    filesMap = options.initFiles;
  } else if (location.hash) {
    try {
      const files = JSON.parse(atou(location.hash.slice(1)));
      filesMap = files;
    } catch (e) {
      console.error('Failed to parse files from hash:', e);
    }
  }

  // 将键值对转换为虚拟文件
  const files: Record<string, File> = {};
  for (const filename in filesMap) {
    files[filename] = new File(filename, filesMap[filename]);
  }
  store.files = files;

  // 初始化入口文件
  store.entry = params.get('entry') || options.entry || '';
  if (!files[store.entry]) {
    store.entry = Object.keys(files)[0];
  }
  store.activeFile =
    params.get('activeFile') || options.activeFile || store.entry;
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
</script>

<template>
  <div class="codeplayer-container" :class="{ 'is-mobile': store.isMobile }">
    <Toolbar />
    <!-- 移动端布局 -->
    <template v-if="store.isMobile">
      <!-- 移动端选项卡 -->
      <div class="mobile-tabs">
        <button 
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
        <div class="mobile-panel" :class="{ active: store.mobileView === 'code' }">
          <CodeEditor />
        </div>
        <div class="mobile-panel" :class="{ active: store.mobileView === 'preview' }">
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
