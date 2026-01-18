<template>
  <div class="codeplayer-monaco-editor-outer">
    <div ref="containerRef" class="codeplayer-monaco-editor"></div>
    <div class="code-tools">
      <FormatIcon @click="formatCode" />
      <CopyIcon />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, shallowRef, nextTick, watch, computed } from 'vue';
import * as monaco from 'monaco-editor';
import { disposeLanguageTools, initMonaco, loadWasm } from './env';
import { getOrCreateModel } from './utils';
import { loadGrammars } from 'monaco-volar';
import { darkPlus, lightPlus } from './themes';
import { store } from '@/store';
import { getFileLanguage, getFileExtraName } from '@/compiler';
import CopyIcon from '@/components/toolbar/icons/copy.vue';
import FormatIcon from '@/components/toolbar/icons/format.vue';

const containerRef = ref<HTMLDivElement>();
const ready = ref(false);
const editor = shallowRef<monaco.editor.IStandaloneCodeEditor>();
const tempJsModel = shallowRef<monaco.editor.ITextModel | null>(null);
const tempTsModel = shallowRef<monaco.editor.ITextModel | null>(null);
const tempJsxModel = shallowRef<monaco.editor.ITextModel | null>(null);
const tempTsxModel = shallowRef<monaco.editor.ITextModel | null>(null);
const tempCssModel = shallowRef<monaco.editor.ITextModel | null>(null);
const tempHtmlModel = shallowRef<monaco.editor.ITextModel | null>(null);
const tempJsonModel = shallowRef<monaco.editor.ITextModel | null>(null);

initMonaco(store);

const formatCode = () => {
  editor.value?.getAction('editor.action.formatDocument')?.run();
};

const lang = computed(() =>
  ['css', 'less', 'sass', 'scss'].includes(getFileExtraName(store.activeFile))
    ? 'css'
    : 'javascript'
);

const projectMode = computed<'vue' | 'jsx' | 'none'>(() => {
  const filenames = Object.keys(store.files || {});
  if (filenames.some((name) => name.endsWith('.vue'))) return 'vue';
  if (filenames.some((name) => name.endsWith('.tsx') || name.endsWith('.jsx'))) return 'jsx';
  return 'none';
});

onMounted(async () => {
  // 创建临时 model 以激活语言服务
  // JavaScript
  tempJsModel.value = getOrCreateModel(
    monaco.Uri.parse(`inmemory://model/temp.js`),
    'javascript',
    'let temp = 1'
  );

  // TypeScript
  tempTsModel.value = getOrCreateModel(
    monaco.Uri.parse(`inmemory://model/temp.ts`),
    'typescript',
    'let temp: number = 1'
  );

  // JSX
  tempJsxModel.value = getOrCreateModel(
    monaco.Uri.parse(`inmemory://model/temp.jsx`),
    'javascript',
    'const App = () => <div />'
  );

  // TSX
  tempTsxModel.value = getOrCreateModel(
    monaco.Uri.parse(`inmemory://model/temp.tsx`),
    'typescript',
    'const App: React.FC = () => <div />'
  );

  // 创建临时 CSS model 以激活 CSS 语言服务
  tempCssModel.value = getOrCreateModel(
    monaco.Uri.parse(`inmemory://model/temp.css`),
    'css',
    'body { color: red; }'
  );

  // 创建临时 HTML model 以激活 HTML 语言服务
  tempHtmlModel.value = getOrCreateModel(
    monaco.Uri.parse(`inmemory://model/temp.html`),
    'html',
    '<!DOCTYPE html><html></html>'
  );

  // 创建临时 JSON model 以激活 JSON 语言服务
  tempJsonModel.value = getOrCreateModel(
    monaco.Uri.parse(`inmemory://model/temp.json`),
    'json',
    '{}'
  );

  monaco.editor.defineTheme('vs-code-dark-plus', darkPlus);
  monaco.editor.defineTheme('vs-code-light-plus', lightPlus);

  ready.value = true;
  await nextTick();

  if (!containerRef.value) {
    throw new Error('Cannot find containerRef');
  }

  const editorInstance = monaco.editor.create(containerRef.value, {
    value: store.files[store.activeFile]?.code || '',
    language: lang.value,
    fontSize: 13,
    theme: store.theme === 'light' ? 'vs-code-light-plus' : 'vs-code-dark-plus',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    minimap: {
      enabled: false,
    },
    inlineSuggest: {
      enabled: false,
    },
    // 启用快速建议（智能提示）
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true,
    },
    suggestOnTriggerCharacters: true,
    wordBasedSuggestions: true,
    'semanticHighlighting.enabled': true,
    fixedOverflowWidgets: true,
    // 移动端滚动条优化
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      useShadows: false,
      verticalScrollbarSize: store.isMobile ? 6 : 10,
      horizontalScrollbarSize: store.isMobile ? 6 : 10,
      arrowSize: 0,
      // 移动端优化：快速滚动
      scrollByPage: false,
    },
    // 移动端触控滚动优化
    mouseWheelScrollSensitivity: store.isMobile ? 2 : 1,
    fastScrollSensitivity: store.isMobile ? 10 : 5,
    // 移动端禁用拖放避免冲突
    dragAndDrop: !store.isMobile,
    // 移动端优化：减少渲染开销
    renderWhitespace: 'none',
    smoothScrolling: true,
  });
  editor.value = editorInstance;

  watch(
    () => store.activeFile,
    async (_, oldFilename) => {
      if (!editorInstance) return;
      const file = store.files[store.activeFile];
      if (!file) return null;

      const model = getOrCreateModel(
        monaco.Uri.parse(`file:///${store.activeFile}`),
        getFileLanguage(store.activeFile),
        file.code
      );

      const oldFile = oldFilename ? store.files[oldFilename] : null;
      if (oldFile) {
        oldFile.editorViewState = editorInstance.saveViewState();
      }

      editorInstance.setModel(model);

      if (file.editorViewState) {
        editorInstance.restoreViewState(file.editorViewState);
        editorInstance.focus();
      }
    },
    { immediate: true }
  );

  await loadWasm();
  await loadGrammars(monaco as any, editorInstance as any);

  editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    // ignore save event
  });

  editorInstance.onDidChangeModelContent(() => {
    store.files[store.activeFile].code = editorInstance.getValue();
  });

  let lastMode: 'vue' | 'jsx' | 'none' | null = null;
  watch(
    projectMode,
    (mode) => {
      if (mode === lastMode) return;
      lastMode = mode;
      if (mode === 'vue') {
        store.reloadLanguageTools(true);
      } else if (mode === 'jsx') {
        store.reloadLanguageTools(false);
      } else {
        disposeLanguageTools();
      }
    },
    { immediate: true }
  );

  watch(
    () => store.codeSize,
    () => {
      editorInstance.updateOptions({
        fontSize: store.codeSize,
      });
    },
    {
      immediate: true,
    }
  );

  watch(
    () => store.theme,
    (n) => {
      editorInstance.updateOptions({
        theme: n === 'light' ? 'vs-code-light-plus' : 'vs-code-dark-plus',
      });
    },
    { immediate: true }
  );
});

onBeforeUnmount(() => {
  editor.value?.dispose();
  // 清理临时 model
  tempJsModel.value?.dispose();
  tempJsModel.value = null;
  tempTsModel.value?.dispose();
  tempTsModel.value = null;
  tempJsxModel.value?.dispose();
  tempJsxModel.value = null;
  tempTsxModel.value?.dispose();
  tempTsxModel.value = null;
  tempCssModel.value?.dispose();
  tempCssModel.value = null;
  tempHtmlModel.value?.dispose();
  tempHtmlModel.value = null;
  tempJsonModel.value?.dispose();
  tempJsonModel.value = null;
});
</script>

<style scoped lang="less">
@import '@/style/base.less';
.codeplayer-monaco-editor-outer {
  position: relative;
  height: 100%;
  .codeplayer-monaco-editor {
    position: relative;
    height: 100%;
    overflow: hidden;
  }
  .code-tools {
    position: absolute;
    right: 0px;
    top: 0px;
    z-index: 999;
    display: none;

    :deep(.toolbar-icon) {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--codeplayer-copy-icon-color);
      box-shadow: var(--codeplayer-copy-shadow);
      border-radius: 0;
      cursor: pointer;
      height: 24px;
      &:hover {
        color: var(--codeplayer-brand-active);
      }
    }
    :deep(.toolbar-icon:first-child) {
      border-bottom-left-radius: 4px;
    }
  }
  &:hover {
    .code-tools {
      display: flex;
    }
  }
}
</style>
